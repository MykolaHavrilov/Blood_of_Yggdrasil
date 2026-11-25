// ============================================================
// expedition.js — ЕКСПЕДИЦІЇ (запуск з мапи: бойові локації, Шахта, Лісопилка)
//
// Група з 3 або 6 героїв (гравець обирає, хто йде) обраний час (1–8 год, v0.9.7; раніше завжди 4) безперервно б'ється з ворогами локації — окрім босів.
// На бій з чемпіоном погоджується сама. Здобич — як у звичайних боях (rollLoot, трофеї чемпіонів, нагорода гільдії,
// завдання на вбивства, ключі данжу), досвід — як у боях групи (бонус групи, Джерело Велеса, руни, Сфера Богів).
// Шахта й Лісопилка (data/enemies.js → LOCATIONS, type "mine" / "sawmill") ще й дають за кожен виграний бій
// 1–3 кожного ресурсу свого світу (loc.yields).
//
// Кожен «бій» експедиції — прохід лабіринту (maze.js → simulateMaze; етап 8, Лабіринт_задум.md): нова карта, бої зон, між зонами —
// автозілля (якщо ввімкнено). Нагорода — як на локації: досвід і здобич з усіх зон разом, лише коли пройдено Б; поразка — кінець
// експедиції. Прохід триває EXP_BATTLE_MS за кожен бій зони (не менше одного).
// Час — реальний, гра може бути закрита: проходи «доганяються» при відкритті гри (expeditionTick, game-common.js → requireSave
// і щосекундний таймер). Після проходу, якщо в когось менше EXP_REST_BELOW HP, група стає на привал
// і відновлюється (звичайне відновлення + EXP_CAMP_PCT за кожні 10 с), доки всі не матимуть EXP_REST_UNTIL HP.
// Автозілля: якщо в Налаштуваннях увімкнено автозілля (core.js → getAutoPotion), після кожного бою герої експедиції
// п'ють зілля з інвентаря за тими самими правилами (character.js → autoPotion), ще до привалу. Випите — e.potions.
// Кінець: минув обраний час, гравець відкликав групу, або загинули всі герої експедиції.
//   Полеглі (і при поразці всієї групи — усі) після повернення лежать полеглими, як після звичайного бою: молитва в Храмі.
//   Поразка всієї групи: штраф досвіду кожному (як у звичайному бою, без втрати речей). Якщо вдома теж ніхто не стоїть
//   на ногах — усі прокидаються в Храмі (як після звичайної загибелі групи).
// Здобич лежить у мішку експедиції (e.bag), доки гравець її не забере (collectExpedition) — в інвентар (що влізе).
// Кілька експедицій одночасно: поки одна в дорозі, можна відправити ще одну з тих героїв, що лишились удома
// (3 або 6 вільних героїв; у групі до 6, тож у дорозі буває до двох експедицій по 3). Мішків зі здобиччю, які ще
// не забрали, — не більше EXP_MAX_BAGS: спершу заберіть здобич, потім відправляйте нову.
// Поки експедиція триває, її герої «у від'їзді»: не б'ються вдома (party.js → aliveMembers), не відновлюються звичайним
// відновленням (його рахує експедиція), не міняють речей (character.js → equipItem / unequipItem) і їх не звільнити.
// Уся гра в цей час — майже як у дорозі: лише «Персонаж», «Інвентар», «Мапа», «Налаштування» і «Головне меню» (game-common.js → requireSave),
// переходити між локаціями не можна (travel.js → startTravel); з Мапи можна відправити другу експедицію.
//
// Стан: save.expeditions = [{ id, loc, members: [id], start, end, at, runs, battles, wins, champions, done, reason, finishedAt,
//                          runs — проходів лабіринту, battles / wins — боїв зон (усіх) і виграних;
//                          по закінченні — запис-підсумок у журнал подій (journal.js, kind "expedition");
//                          bag: { gold, items: [ref], stacks: { id: qty }, filtered, exp: { id: n }, levels: { id: [from, to] } },
//                          fallen: [id] }]  (старий сейв: одна save.expedition — переноситься в масив, expList)
//   id героя: "main" — головний, інакше id напарника з save.party.
// Підключається ПІСЛЯ party.js, battle.js, quests.js, dungeon.js, rarity.js.
// ============================================================

(function (RPG) {
  const EXP_DURATION_MS = 4 * 60 * 60 * 1000;   // тривалість за замовчуванням — 4 години
  // Гравець обирає тривалість повзунком: від EXP_HOURS_MIN до EXP_HOURS_MAX цілих годин (v0.9.7)
  const EXP_HOURS_MIN = 1, EXP_HOURS_MAX = 8, EXP_HOURS_DEFAULT = 4;
  const expHours = h => Math.min(EXP_HOURS_MAX, Math.max(EXP_HOURS_MIN, Math.round(Number(h) || EXP_HOURS_DEFAULT)));
  const EXP_BATTLE_MS = 60 * 1000;               // один бій зони лабіринту разом із ходою (прохід — стільки × боїв зон)
  const EXP_TICK_MS = 10 * 1000;                 // тік відновлення (як у грі)
  const EXP_CAMP_PCT = 0.05;                     // привал: +5% HP і MP за тік понад звичайне відновлення
  const EXP_REST_BELOW = 0.5;                    // привал, якщо в когось HP нижче 50%
  const EXP_REST_UNTIL = 0.8;                    // …до 80% HP у всіх
  const EXP_SIZES = [3, 6];
  const EXP_MAX_STEPS = 2000;                    // запобіжник для одного виклику
  const EXP_MAX_BAGS = 3;                        // скільки повернених експедицій з незабраною здобиччю може чекати
  // Сила ворогів експедиції (здоров'я, атака, магія, захисти — monstergear.js → spec.power) за світом.
  // Ворогів у бою — стільки ж, скільки героїв, і 4 години боїв поспіль (з чемпіонами) без цього не пережити;
  // підібрано симуляцією так, щоб група з 3 героїв свого рівня доживала до кінця приблизно в половині експедицій,
  // група з 6 — майже завжди (Гардарика й Темний ліс — Селяни в синіх/фіолетових речах; Альвгейм — професії в повному сеті; Ванагейм — так само, 31–34 рівень).
  const EXP_POWER = { start: 0.5, dark: 0.32, alf: 0.37, van: 0.38, svart: 0.38, jot: 0.38, musp: 0.38, asg: 0.38, nifl: 0.38 };

  // ---------- Герої ----------
  function memberIdOf(save, ms) {
    const idx = ms.memberIndex || 0;
    return idx ? save.party?.[idx - 1]?.id : "main";
  }
  function viewById(save, id) {
    if (id === "main") return save;
    const i = (save.party || []).findIndex(m => m.id === id);
    return i >= 0 ? RPG.memberSave(save, i + 1) : null;
  }
  // Усі експедиції сейву (у дорозі й повернені зі здобиччю). Старий сейв з однією save.expedition — переноситься.
  function expList(save) {
    let root = save;
    while (root && root.memberIndex) root = Object.getPrototypeOf(root);   // «вигляд» напарника → спільний сейв
    if (!root) return [];
    if (root.expedition && !Array.isArray(root.expedition)) {
      root.expeditions ??= [];
      root.expedition.id ??= "e" + (root.expedition.start || Date.now()).toString(36);
      root.expeditions.push(root.expedition);
      delete root.expedition;
    }
    root.expeditions ??= [];
    return root.expeditions;
  }
  const activeList = save => expList(save).filter(e => !e.done);
  function expById(save, eid) {
    const list = expList(save);
    return eid ? list.find(e => e.id === eid) || null : list[0] || null;
  }
  function expeditionActive(save) {
    return activeList(save).length > 0;
  }
  // Чи герой (вигляд з party.js → memberSave або сам save) зараз в експедиції
  function isAway(ms) {
    if (!ms) return false;
    const idx = ms.memberIndex || 0;
    const id = idx ? ms.party?.[idx - 1]?.id : "main";
    const list = ms.expeditions || (ms.expedition ? [ms.expedition] : []);
    return list.some(e => !e.done && e.members.includes(id));
  }
  function expMembers(save, e) {
    return (e?.members || []).map(id => viewById(save, id)).filter(Boolean);
  }
  const isDown = ms => !!ms.character.dead || ms.character.hp <= 0;

  // ---------- Локації експедицій ----------
  function isExpeditionLoc(locId) {
    const loc = RPG.LOCATIONS[locId];
    return !!loc && (loc.type === "combat" || loc.type === "mine" || loc.type === "sawmill") && (loc.enemies || []).some(id => !RPG.ENEMIES[id]?.boss);
  }
  // Чи можна відправити цих героїв (ids) у цю локацію: { ok, reason }
  function canStartExpedition(save, locId, ids) {
    const loc = RPG.LOCATIONS[locId];
    if (!isExpeditionLoc(locId)) return { ok: false, reason: "Сюди експедицію не відправити." };
    if (expList(save).filter(e => e.done).length >= EXP_MAX_BAGS) return { ok: false, reason: `Спершу заберіть здобич повернених експедицій (чекають ${EXP_MAX_BAGS}).` };
    if (RPG.isTraveling?.(save)) return { ok: false, reason: "Ви в дорозі — експедицію можна відправити, коли дійдете." };
    if (save.dungeon) return { ok: false, reason: "Група в данжі — спершу завершіть його." };
    if (!EXP_SIZES.includes(ids.length)) return { ok: false, reason: "В експедицію йдуть 3 або 6 героїв." };
    if (new Set(ids).size !== ids.length) return { ok: false, reason: "Кожного героя можна вибрати лише раз." };
    for (const id of ids) {
      const ms = viewById(save, id);
      if (!ms) return { ok: false, reason: "Такого героя в групі немає." };
      if (isDown(ms)) return { ok: false, reason: `${ms.character.name} поліг — спершу помоліться за нього в Храмі.` };
      if (isAway(ms)) return { ok: false, reason: `${ms.character.name} уже в іншій експедиції.` };
      if (loc.minLevel && ms.character.level < loc.minLevel) return { ok: false, reason: `${loc.name}: експедиція — з ${loc.minLevel} рівня кожного героя (${ms.character.name} — ${ms.character.level}).` };
    }
    const lvl = Math.min(...ids.map(id => viewById(save, id).character.level));
    const can = RPG.canEnterLocation(locId, Math.max(lvl, loc.minLevel || 1), save);
    if (!can.ok) return can;
    return { ok: true };
  }

  // hours — тривалість у цілих годинах (1–8); без неї — 4 години, як було
  function startExpedition(save, locId, ids, now = Date.now(), hours = EXP_HOURS_DEFAULT) {
    const can = canStartExpedition(save, locId, ids);
    if (!can.ok) return can;
    const h = expHours(hours);
    const e = {
      id: "e" + now.toString(36) + Math.floor(Math.random() * 1000),
      loc: locId, members: ids.slice(), start: now, end: now + h * 60 * 60 * 1000, at: now, hours: h,
      battles: 0, wins: 0, champions: 0, done: false, reason: "", finishedAt: 0,
      bag: { gold: 0, items: [], stacks: {}, filtered: 0, exp: {}, levels: {} }, fallen: [], potions: {}
    };
    expList(save).push(e);
    for (const ms of expMembers(save, e)) {
      ms.character.regenAt = now;
      e.bag.levels[memberIdOf(save, ms)] = [ms.character.level, ms.character.level];
    }
    return { ok: true, end: e.end, id: e.id, hours: h };
  }

  // ---------- Один прохід лабіринту ----------
  function bagAddRef(bag, ref) { bag.items.push(ref); }
  function bagAddStack(bag, id, qty) { if (qty > 0) bag.stacks[id] = (bag.stacks[id] || 0) + qty; }
  // Річ з рідкістю: рідкість, руна Даждьбог (rarityUp), фільтр здобичі — як у character.js → applyReward
  function bagAddLootItem(save, bag, id, qty, rarityUp) {
    if (!RPG.hasRarity(id)) { bagAddStack(bag, id, qty); return; }
    if (RPG.ITEMS[id]?.rarityFixed) { for (let i = 0; i < qty; i++) bagAddRef(bag, RPG.makeItem(id)); return; }   // артефакт
    const filterOn = RPG.lootFilterActive?.(save);
    for (let i = 0; i < qty; i++) {
      let r = RPG.rollRarity(save);
      if (rarityUp && r !== "legendary" && Math.random() * 100 < rarityUp) r = RPG.RARITY_ORDER[RPG.RARITY_ORDER.indexOf(r) + 1];
      if (filterOn && RPG.isFilteredOut(save, r)) { bag.filtered++; continue; }
      bagAddRef(bag, RPG.makeItem(id, r));
    }
  }

  function fightOne(save, e) {
    const loc = RPG.LOCATIONS[e.loc];
    const team = expMembers(save, e).filter(ms => !isDown(ms));
    if (!team.length) return "wiped";
    const lvl = Math.max(...team.map(ms => ms.character.level));
    const power = EXP_POWER[loc?.region || "start"] ?? 1;
    // вороги зони: n (живих героїв) з пулу локації, без босів, із силою експедиції
    const pickFoes = (zone, n) => {
      const out = [];
      for (let i = 0; i < n; i++) { const id = RPG.pickEnemy(e.loc, lvl, { noBoss: true }); if (id) out.push({ id, champion: RPG.rollChampion(id), power }); }
      return out;
    };
    const cfg = RPG.getAutoPotion ? RPG.getAutoPotion() : null;
    const onPotion = H => {
      if (!cfg || !(cfg.hp.on || cfg.mp.on) || !RPG.autoPotion) return [];
      H.forEach((h, k) => { team[k].character.hp = h.hp; team[k].character.mp = h.mp; });
      const pr = RPG.autoPotion(save, cfg, team.filter((ms, k) => !H[k].dead));
      e.potions ??= {};
      for (const [id, n] of Object.entries(pr.used || {})) e.potions[id] = (e.potions[id] || 0) + n;
      H.forEach((h, k) => { if (!h.dead) { h.hp = team[k].character.hp; h.mp = team[k].character.mp; } });
      return pr.lines;
    };
    const run = RPG.simulateMaze(team, RPG.makeMaze({}), { pickFoes, onPotion });
    const zb = run.parts.filter(p => p.type === "battle");
    if (!zb.length) return "empty";
    e.runs = (e.runs || 0) + 1;
    e.battles += zb.length;
    const dur = EXP_BATTLE_MS * zb.length;
    const last = zb[zb.length - 1];
    const specs = run.win ? zb.flatMap(p => p.specs) : [];
    // зведений результат (як від simulatePartyBattle): вороги всіх зон — лише коли прохід пройдено
    const result = { win: run.win, hel: run.hel, heroes: run.heroes,
      enemies: run.win ? zb.flatMap(p => p.result.enemies) : [],
      enemyIds: run.win ? zb.flatMap(p => p.result.enemyIds || []) : (last.result.enemyIds || []) };
    result.heroes.forEach((h, k) => { team[k].character.hp = Math.max(0, h.hp); team[k].character.mp = Math.max(0, h.mp); if (h.dead) team[k].character.hp = 0; });
    if (result.win) {
      e.wins += zb.filter(p => p.result.win).length;
      const bag = e.bag;
      // досвід — як у page-game.js: пул з бонусом групи, ділиться між тими, хто вижив
      const totalExp = result.enemies.reduce((s, x) => s + (x.exp || 0), 0);
      const survivors = team.filter((ms, k) => !result.heroes[k].dead);
      const spring = RPG.springExpMult ? RPG.springExpMult(save) : 1;
      const orb = RPG.godsOrb?.(save);
      const orbMult = orb ? 1 + orb.expPct / 100 : 1;
      const pool = Math.round(totalExp * (1 + (RPG.PARTY_EXP_BONUS || 0) / 100 * (team.length - 1)) * spring * orbMult);
      const expEach = Math.floor(pool / Math.max(1, survivors.length));
      for (const ms of survivors) {
        const rp = RPG.runeTotals ? (RPG.runeTotals(ms).eco.exp || 0) : 0;
        const add = expEach + Math.round(expEach * rp / 100);
        RPG.addExp(ms, add);
        const id = memberIdOf(save, ms);
        bag.exp[id] = (bag.exp[id] || 0) + add;
        if (bag.levels[id]) bag.levels[id][1] = ms.character.level;
      }
      // золото й здобич
      const runeEco = RPG.teamRuneEco ? RPG.teamRuneEco(team) : { gold: 0, lootRarity: 0 };
      for (const en of result.enemies) {
        const lootOrb = RPG.godsOrb?.(save);
        const loot = RPG.rollLoot(en.id, lootOrb ? lootOrb.lootPct / 100 : 0);
        for (const r of RPG.rollRunes?.(en.id, { champion: en.champion, expedition: true }) || []) loot.items.push({ id: r, qty: 1 });   // руни — удвічі рідше
        for (const bp of RPG.rollTierBlueprints?.(en.id) || []) loot.items.push({ id: bp, qty: 1 });   // креслення тірів 3–7 і Штормової сталі
        let gold = loot.gold || 0;
        if (runeEco.gold && gold) gold = Math.round(gold * (1 + runeEco.gold / 100));
        bag.gold += gold;
        for (const it of loot.items) bagAddLootItem(save, bag, it.id, it.qty, runeEco.lootRarity);
        for (const ms of team) ms.character.kills = (ms.character.kills || 0) + 1;   // кожному, хто бився
        RPG.questOnKill?.(save, en.id);
        if (en.champion) {
          e.champions++;
          const drop = RPG.rollChampionDrop?.(en.id);
          if (drop) {
            if (RPG.lootFilterActive?.(save) && RPG.isFilteredOut(save, drop.r)) bag.filtered++;
            else bagAddRef(bag, RPG.makeItem(drop.id, drop.r));
          }
          RPG.addChampionBounty?.(save, en.id);
        }
      }
      // ключі данжу (якщо локація з данжем) — одразу в кишеню для ключів
      RPG.rollKeyDrops?.(save, e.loc, result.enemyIds);
      RPG.noteVictory?.(save, e.loc, result.enemyIds);   // загальний лічильник ворогів і найскладніша локація
      // володіння зброєю
      if (RPG.masteryGainFor && RPG.addMasteryExp) {
        team.forEach((ms, k) => {
          if (result.heroes[k].dead) return;
          const g = RPG.masteryGainFor(save, ms, specs);
          if (g.type && g.gain) RPG.addMasteryExp(ms, g.type, g.gain);
        });
      }
      // ресурси Шахти й Лісопилки
      for (const id of loc.yields || []) bagAddStack(bag, id, RPG.randInt(1, 3));
      // трави (Лісопилка) і мінерали (Шахта) для алхімії — alchemy.js → alchYields, 8–12 кожного
      for (const id of RPG.alchYields?.(loc) || []) bagAddStack(bag, id, RPG.randInt(RPG.ALCH_YIELD[0], RPG.ALCH_YIELD[1]));
    }
    if (!result.win) return { wiped: true, enemyIds: result.enemyIds, hel: !!result.hel, dur };   // поразка (зокрема Хелла після ліміту раундів)
    return { win: true, dur };
  }

  // ---------- Привал між боями: скільки часу треба, щоб усі живі мали EXP_REST_UNTIL HP ----------
  function healStep(ms, ticks) {
    const s = RPG.calcStats(ms), per = RPG.regenPerTick(ms), ch = ms.character;
    if (isDown(ms)) return;
    ch.hp = Math.min(s.hp, ch.hp + (per.hp + s.hp * EXP_CAMP_PCT) * ticks);
    ch.mp = Math.min(s.mp, ch.mp + (per.mp + s.mp * EXP_CAMP_PCT) * ticks);
  }
  function restTicks(team) {
    let need = 0;
    for (const ms of team) {
      const s = RPG.calcStats(ms), per = RPG.regenPerTick(ms), ch = ms.character;
      if (ch.hp / s.hp >= EXP_REST_BELOW) continue;
      const heal = per.hp + s.hp * EXP_CAMP_PCT;
      need = Math.max(need, Math.ceil((s.hp * EXP_REST_UNTIL - ch.hp) / Math.max(1, heal)));
    }
    return need;
  }

  // ---------- Кінець ----------
  function finishExpedition(save, e, reason, now = Date.now(), wipeIds = null) {
    if (!e || e.done) return false;
    e.done = true; e.reason = reason; e.finishedAt = now;
    if (reason === "time") RPG.noteExpedition?.(save, e.loc);   // рахунок гри: експедиція відходила весь час
    const team = expMembers(save, e);
    const fallen = team.filter(isDown);
    e.fallen = fallen.map(ms => memberIdOf(save, ms));
    if (reason === "wiped") {
      // штраф досвіду кожному (як у звичайному бою, без втрати речей)
      const expSum = (wipeIds || []).reduce((s, id) => s + (RPG.getEnemy(id)?.exp || 0), 0);
      e.penalty = {};
      for (const ms of team) {
        const d = RPG.deathExpPenalty(ms, expSum * (RPG.DEATH_EXP_MULT || 10));
        e.penalty[memberIdOf(save, ms)] = d.expLost;
        ms.character.deaths = (ms.character.deaths || 0) + 1;
        RPG.loseLife?.(ms);                        // смертельний режим: −1 життя (party.js → hardcoreResolve)
      }
      // удома теж ніхто не стоїть на ногах (і немає інших експедицій у дорозі) — усі прокидаються в Храмі
      const homeAlive = RPG.partyMembers(save).filter(ms => !e.members.includes(memberIdOf(save, ms)) && !isDown(ms));
      if (!homeAlive.length) {
        for (const ms of RPG.partyMembers(save)) {
          const s = RPG.calcStats(ms);
          ms.character.dead = false;
          ms.character.hp = Math.max(1, Math.ceil(s.hp * (RPG.RESPAWN_HP_PCT || 0.1)));
          ms.character.mp = 0;
        }
        save.location.map = RPG.RESPAWN_LOCATION || "temple";
        delete save.travel;
        e.temple = true;
        e.fallen = [];
      } else {
        for (const ms of team) { ms.character.hp = 0; ms.character.mp = 0; ms.character.dead = true; }
      }
    } else {
      for (const ms of fallen) { ms.character.hp = 0; ms.character.mp = 0; ms.character.dead = true; ms.character.deaths = (ms.character.deaths || 0) + 1; RPG.loseLife?.(ms); }
    }
    for (const ms of team) ms.character.regenAt = now;
    journalExpedition(save, e, team);
    return true;
  }
  // Запис-підсумок у журнал подій (journal.js): де, хто, скільки проходів і боїв, досвід, здобич, загибель
  function journalExpedition(save, e, team) {
    if (!RPG.journalAdd) return;
    const loc = RPG.LOCATIONS[e.loc]?.name || e.loc;
    const title = e.reason === "wiped" ? "Експедиція загинула" : e.reason === "recalled" ? "Групу відкликано з експедиції" : "Експедиція повернулась";
    const bag = e.bag || { exp: {}, gold: 0, items: [], stacks: {} };
    const lines = [["title", `${title}: ${loc}`, e.reason === "wiped" ? "lose" : "win"],
      ["info", `${team.map(ms => ms.character.name).join(", ")}. Проходів лабіринту ${e.runs || 0}, боїв ${e.battles}, перемог ${e.wins}` +
        (e.champions ? `, чемпіонів ${e.champions}` : "") + "."],
      ["info", team.map(ms => `${ms.character.name}: +${bag.exp[memberIdOf(save, ms)] || 0} EXP` +
        (e.penalty?.[memberIdOf(save, ms)] > 0 ? `, штраф −${e.penalty[memberIdOf(save, ms)]} EXP` : "")).join(" · ")],
      ["info", `Здобич у мішку експедиції: ${bag.gold || 0} золота, речей ${bag.items.length}, ресурсів ${Object.values(bag.stacks).reduce((a, b) => a + b, 0)}.`]];
    if (e.temple) lines.push(["info", "Уся група полягла — герої прокинулись у Храмі."]);
    else if (e.fallen?.length) lines.push(["info", `Полягли: ${team.filter(ms => e.fallen.includes(memberIdOf(save, ms))).map(ms => ms.character.name).join(", ")} — помоліться за них у Храмі.`]);
    const rec = RPG.journalAdd(save, { kind: "expedition", lines });
    if (rec) rec.at = e.finishedAt || rec.at;
  }
  // Відкликати групу достроково
  function recallExpedition(save, eid, now = Date.now()) {
    const e = expById(save, eid);
    if (!e || e.done) return { ok: false, reason: "Експедиції немає." };
    expeditionTick(save, now);
    if (e.done) return { ok: true };
    finishExpedition(save, e, "recalled", now);
    return { ok: true };
  }

  // ---------- «Доганяння» боїв до поточного часу. Повертає true, якщо щось змінилось ----------
  function expeditionTick(save, now = Date.now()) {
    if (!RPG.simulateMaze) return false;
    let changed = false;
    for (const e of activeList(save)) changed = tickOne(save, e, now) || changed;
    return changed;
  }
  function tickOne(save, e, now) {
    const limit = Math.min(now, e.end);
    let changed = false, steps = 0;
    // новий прохід починається, якщо до кінця експедиції лишився хоч один бій; триває EXP_BATTLE_MS × боїв зон
    // (результат рахується одразу — як і на локації)
    while (!e.done && e.at + EXP_BATTLE_MS <= limit && steps++ < EXP_MAX_STEPS) {
      const r = fightOne(save, e);
      changed = true;
      const dur = Math.max(EXP_BATTLE_MS, r?.dur || EXP_BATTLE_MS);
      if (r === "wiped" || r?.wiped) { finishExpedition(save, e, "wiped", Math.min(e.end, e.at + dur), r?.enemyIds); break; }
      e.at += dur;
      // автозілля (якщо ввімкнено в Налаштуваннях), потім відновлення за час проходу, а коли треба — привал
      const team = expMembers(save, e).filter(ms => !isDown(ms));
      const cfg = RPG.getAutoPotion ? RPG.getAutoPotion() : null;
      if (cfg && (cfg.hp.on || cfg.mp.on) && RPG.autoPotion && team.length) {
        const pr = RPG.autoPotion(save, cfg, team);
        e.potions ??= {};
        for (const [id, n] of Object.entries(pr.used || {})) e.potions[id] = (e.potions[id] || 0) + n;
      }
      for (const ms of team) healStep(ms, dur / EXP_TICK_MS - 1);
      const ticks = restTicks(team);
      if (ticks > 0) {
        const can = Math.max(0, Math.floor((e.end - e.at) / EXP_TICK_MS));
        const t = Math.min(ticks, can);
        for (const ms of team) healStep(ms, t);
        e.at += t * EXP_TICK_MS;
      }
    }
    if (!e.done && e.at + EXP_BATTLE_MS > e.end && now >= e.end) { finishExpedition(save, e, "time", Math.max(e.end, Math.min(e.at, now))); changed = true; }
    return changed;
  }

  // ---------- Здобич ----------
  function bagEmpty(bag) {
    return !bag || (!bag.gold && !bag.items.length && !Object.keys(bag.stacks).length);
  }
  // Забрати здобич (лише після повернення): золото, матеріали й речі — в інвентар, що влізе. Решта лишається в мішку.
  function removeExp(save, e) {
    const list = expList(save), i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
  }
  function collectExpedition(save, eid) {
    const e = expById(save, eid);
    if (!e) return { ok: false, reason: "Експедиції немає." };
    if (!e.done) return { ok: false, reason: "Група ще в експедиції." };
    const bag = e.bag, got = { gold: bag.gold, stacks: {}, items: [] };
    save.character.gold += bag.gold;
    bag.gold = 0;
    for (const [id, qty] of Object.entries(bag.stacks)) {
      const k = RPG.fitQty(save, id, qty);
      if (k) { RPG.addItem(save, id, k); got.stacks[id] = k; }
      if (qty - k > 0) bag.stacks[id] = qty - k; else delete bag.stacks[id];
    }
    const left = [];
    for (const ref of bag.items) {
      if (RPG.invFree(save)) { save.inventory.push(ref); got.items.push(ref); } else left.push(ref);
    }
    bag.items = left;
    const empty = bagEmpty(bag);
    if (empty) removeExp(save, e);
    return { ok: true, got, empty, left: left.length + Object.values(bag.stacks || {}).reduce((a, b) => a + b, 0) };
  }
  // Викинути решту здобичі (якщо інвентар повний і решта не потрібна)
  function dropExpeditionLoot(save, eid) {
    const e = expById(save, eid);
    if (!e || !e.done) return { ok: false, reason: "Група ще в експедиції." };
    removeExp(save, e);
    return { ok: true };
  }

  // Короткий стан для показу: { active, done, loc, leftMs, battles, wins, alive, total, bag }
  function expeditionInfo(save, eid = null, now = Date.now()) {
    const e = expById(save, eid);
    if (!e) return null;
    const team = expMembers(save, e);
    return { id: e.id,
      active: !e.done, done: e.done, reason: e.reason, loc: RPG.LOCATIONS[e.loc], locId: e.loc,
      leftMs: Math.max(0, e.end - now), elapsedMs: Math.min(now, e.end) - e.start,
      runs: e.runs || 0, battles: e.battles, wins: e.wins, champions: e.champions,
      team, alive: team.filter(ms => !isDown(ms)).length, total: team.length,
      bag: e.bag, fallen: e.fallen || [], temple: !!e.temple, penalty: e.penalty || null, potions: e.potions || {}
    };
  }

  Object.assign(RPG, {
    EXP_DURATION_MS, EXP_HOURS_MIN, EXP_HOURS_MAX, EXP_HOURS_DEFAULT, EXP_BATTLE_MS, EXP_POWER, EXP_SIZES, EXP_REST_BELOW, EXP_REST_UNTIL, EXP_CAMP_PCT, EXP_MAX_BAGS,
    expeditionList: expList, expeditionActive, isAway, memberIdOf, viewById, isExpeditionLoc, canStartExpedition, startExpedition,
    expeditionTick, recallExpedition, finishExpedition, collectExpedition, dropExpeditionLoot, expeditionInfo
  });
})(window.RPG);

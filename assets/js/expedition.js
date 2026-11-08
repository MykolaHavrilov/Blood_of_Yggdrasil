// ============================================================
// expedition.js — ЕКСПЕДИЦІЇ (запуск з мапи: бойові локації, Шахта, Лісопилка)
//
// Група з 3 або 6 героїв (гравець обирає, хто йде) 4 години безперервно б'ється з ворогами локації — окрім босів.
// На бій з чемпіоном погоджується сама. Здобич — як у звичайних боях (rollLoot, трофеї чемпіонів, нагорода гільдії,
// завдання на вбивства, ключі данжу), досвід — як у боях групи (бонус групи, Джерело Велеса, руни, Сфера Богів).
// Шахта й Лісопилка (data/enemies.js → LOCATIONS, type "mine" / "sawmill") ще й дають за кожен виграний бій
// 1–3 кожного ресурсу свого світу (loc.yields).
//
// Час — реальний, гра може бути закрита: бої «доганяються» при відкритті гри (expeditionTick, game-common.js → requireSave
// і щосекундний таймер). Один бій — EXP_BATTLE_MS; після бою, якщо в когось менше EXP_REST_BELOW HP, група стає на привал
// і відновлюється (звичайне відновлення + EXP_CAMP_PCT за кожні 10 с), доки всі не матимуть EXP_REST_UNTIL HP.
// Автозілля: якщо в Налаштуваннях увімкнено автозілля (core.js → getAutoPotion), після кожного бою герої експедиції
// п'ють зілля з інвентаря за тими самими правилами (character.js → autoPotion), ще до привалу. Випите — e.potions.
// Кінець: минуло 4 години, гравець відкликав групу, або загинули всі герої експедиції.
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
// Стан: save.expeditions = [{ id, loc, members: [id], start, end, at, battles, wins, champions, done, reason, finishedAt,
//                          bag: { gold, items: [ref], stacks: { id: qty }, filtered, exp: { id: n }, levels: { id: [from, to] } },
//                          fallen: [id] }]  (старий сейв: одна save.expedition — переноситься в масив, expList)
//   id героя: "main" — головний, інакше id напарника з save.party.
// Підключається ПІСЛЯ party.js, battle.js, quests.js, dungeon.js, rarity.js.
// ============================================================

(function (RPG) {
  const EXP_DURATION_MS = 4 * 60 * 60 * 1000;   // 4 години
  const EXP_BATTLE_MS = 40 * 1000;               // один бій разом із підходом до наступної групи ворогів
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
  // група з 6 — майже завжди (Гардарика й Темний ліс — Селяни в синіх/фіолетових речах; Альвгейм — професії в повному сеті).
  const EXP_POWER = { start: 0.5, dark: 0.32, alf: 0.37 };

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

  function startExpedition(save, locId, ids, now = Date.now()) {
    const can = canStartExpedition(save, locId, ids);
    if (!can.ok) return can;
    const e = {
      id: "e" + now.toString(36) + Math.floor(Math.random() * 1000),
      loc: locId, members: ids.slice(), start: now, end: now + EXP_DURATION_MS, at: now,
      battles: 0, wins: 0, champions: 0, done: false, reason: "", finishedAt: 0,
      bag: { gold: 0, items: [], stacks: {}, filtered: 0, exp: {}, levels: {} }, fallen: [], potions: {}
    };
    expList(save).push(e);
    for (const ms of expMembers(save, e)) {
      ms.character.regenAt = now;
      e.bag.levels[memberIdOf(save, ms)] = [ms.character.level, ms.character.level];
    }
    return { ok: true, end: e.end, id: e.id };
  }

  // ---------- Один бій ----------
  function rollGroup(save, locId, team) {
    const range = RPG.enemyGroupRange(team);
    const n = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
    const lvl = Math.max(...team.map(ms => ms.character.level));
    const power = EXP_POWER[RPG.LOCATIONS[locId]?.region || "start"] ?? 1;
    const specs = [];
    for (let i = 0; i < n; i++) {
      const id = RPG.pickEnemy(locId, lvl, { noBoss: true });
      if (id) specs.push({ id, champion: RPG.rollChampion(id), power });
    }
    if (RPG.equipFoes) RPG.equipFoes(specs, team);
    return specs;
  }
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
    const specs = rollGroup(save, e.loc, team);
    if (!specs.length) return "empty";
    const result = RPG.simulatePartyBattle(team, specs);
    e.battles++;
    result.heroes.forEach((h, k) => { team[k].character.hp = Math.max(0, h.hp); team[k].character.mp = Math.max(0, h.mp); if (h.dead) team[k].character.hp = 0; });
    if (result.win) {
      e.wins++;
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
        let gold = loot.gold || 0;
        if (runeEco.gold && gold) gold = Math.round(gold * (1 + runeEco.gold / 100));
        bag.gold += gold;
        for (const it of loot.items) bagAddLootItem(save, bag, it.id, it.qty, runeEco.lootRarity);
        save.character.kills = (save.character.kills || 0) + 1;
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
    }
    if (!result.win && !result.draw) return { wiped: true, enemyIds: result.enemyIds };
    return result.win ? "win" : "draw";
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
      for (const ms of fallen) { ms.character.hp = 0; ms.character.mp = 0; ms.character.dead = true; ms.character.deaths = (ms.character.deaths || 0) + 1; }
    }
    for (const ms of team) ms.character.regenAt = now;
    return true;
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
    if (!RPG.simulatePartyBattle) return false;
    let changed = false;
    for (const e of activeList(save)) changed = tickOne(save, e, now) || changed;
    return changed;
  }
  function tickOne(save, e, now) {
    const limit = Math.min(now, e.end);
    let changed = false, steps = 0;
    while (!e.done && e.at + EXP_BATTLE_MS <= limit && steps++ < EXP_MAX_STEPS) {
      const r = fightOne(save, e);
      changed = true;
      if (r === "wiped" || r?.wiped) { finishExpedition(save, e, "wiped", e.at + EXP_BATTLE_MS, r?.enemyIds); break; }
      e.at += EXP_BATTLE_MS;
      // автозілля (якщо ввімкнено в Налаштуваннях), потім відновлення за час бою, а коли треба — привал
      const team = expMembers(save, e).filter(ms => !isDown(ms));
      const cfg = RPG.getAutoPotion ? RPG.getAutoPotion() : null;
      if (cfg && (cfg.hp.on || cfg.mp.on) && RPG.autoPotion && team.length) {
        const pr = RPG.autoPotion(save, cfg, team);
        e.potions ??= {};
        for (const [id, n] of Object.entries(pr.used || {})) e.potions[id] = (e.potions[id] || 0) + n;
      }
      for (const ms of team) healStep(ms, EXP_BATTLE_MS / EXP_TICK_MS - 1);
      const ticks = restTicks(team);
      if (ticks > 0) {
        const can = Math.max(0, Math.floor((e.end - e.at) / EXP_TICK_MS));
        const t = Math.min(ticks, can);
        for (const ms of team) healStep(ms, t);
        e.at += t * EXP_TICK_MS;
      }
    }
    if (!e.done && e.at + EXP_BATTLE_MS > e.end && now >= e.end) { finishExpedition(save, e, "time", e.end); changed = true; }
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
      battles: e.battles, wins: e.wins, champions: e.champions,
      team, alive: team.filter(ms => !isDown(ms)).length, total: team.length,
      bag: e.bag, fallen: e.fallen || [], temple: !!e.temple, penalty: e.penalty || null, potions: e.potions || {}
    };
  }

  Object.assign(RPG, {
    EXP_DURATION_MS, EXP_BATTLE_MS, EXP_POWER, EXP_SIZES, EXP_REST_BELOW, EXP_REST_UNTIL, EXP_CAMP_PCT, EXP_MAX_BAGS,
    expeditionList: expList, expeditionActive, isAway, memberIdOf, viewById, isExpeditionLoc, canStartExpedition, startExpedition,
    expeditionTick, recallExpedition, finishExpedition, collectExpedition, dropExpeditionLoot, expeditionInfo
  });
})(window.RPG);

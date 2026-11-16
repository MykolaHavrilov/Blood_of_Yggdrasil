// ============================================================
// dungeon.js — ДАНЖІ (опис данжів — data/enemies.js → DUNGEONS)
//
// Стан данжу в сейві: save.dungeon = { id, stage: 1..3, foes: ["slime", ...] }
//   stage — номер бою, foes — ID ворогів поточного бою.
//   Поки save.dungeon є — зілля пити не можна (character.js → useItem) і відновлення
//   HP/MP з часом не працює (character.js → applyRegen); лікують лише навички,
//   а сторінка локації показує данж замість звичайних боїв.
// Вихід із локації, загибель, втеча ворогів або перемога в 3-му бою — данж закінчується.
//
// КИШЕНЯ ДЛЯ КЛЮЧІВ: ключі не займають клітинок інвентаря, а лежать окремо:
//   save.keys = { key_cave_secret: 12, ... } — до KEY_MAX (1000) кожного виду.
//   Коли ключів 1000, нові не випадають, поки їх не стане 999 або менше.
//   Показ — вікно «Кишеня для ключів» на сторінці інвентаря (game.js → showKeyPocket).
//
// Підключається ПІСЛЯ data/enemies.js і character.js, ДО game.js.
// ============================================================

(function (RPG) {
  const STAGES = 3;
  const KEY_MAX = 1000;            // найбільше ключів одного виду в кишені

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function getDungeon(id) { return RPG.DUNGEONS[id] ? { id, ...RPG.DUNGEONS[id] } : null; }

  // Данж локації або null
  function locationDungeon(locId) {
    const id = RPG.LOCATIONS[locId]?.dungeon;
    return id ? getDungeon(id) : null;
  }

  // ---------- Кишеня для ключів ----------
  function keyAmount(save, keyId) { return Math.max(0, Math.floor((save.keys || {})[keyId] || 0)); }

  function keyCount(save, dungeonId) {
    const d = RPG.DUNGEONS[dungeonId];
    return d ? keyAmount(save, d.key) : 0;
  }

  // Додати ключі (не більше KEY_MAX). Повертає, скільки реально додано
  function addKeys(save, keyId, n = 1) {
    const keys = save.keys || (save.keys = {});
    const have = keyAmount(save, keyId);
    const add = Math.max(0, Math.min(n, KEY_MAX - have));
    if (add) keys[keyId] = have + add;
    return add;
  }

  function useKey(save, keyId) {
    const have = keyAmount(save, keyId);
    if (have < 1) return false;
    save.keys[keyId] = have - 1;
    return true;
  }

  // Усі ключі для вікна кишені: [{ id, name, count, dungeon, location }]
  function keyPocket(save) {
    return Object.entries(RPG.DUNGEONS).map(([dId, d]) => ({
      id: d.key, name: RPG.ITEMS[d.key]?.name || d.key, count: keyAmount(save, d.key),
      dungeon: d.name, location: RPG.LOCATIONS[d.location]?.name || d.location, explore: d.explore
    }));
  }

  // Старі сейви: ключі з інвентаря й скринь переїжджають у кишеню
  function migrateKeys(save) {
    save.keys = (save.keys && typeof save.keys === "object") ? save.keys : {};
    const isKey = e => e && RPG.ITEMS[e.id]?.pocket === "keys";
    const move = list => {
      if (!Array.isArray(list)) return list;
      for (const e of list) if (isKey(e)) addKeys(save, e.id, e.qty || 1);
      return list.filter(e => !isKey(e));
    };
    save.inventory = move(save.inventory);
    for (const sid in save.chests || {}) save.chests[sid] = move(save.chests[sid]);
  }

  // ---------- ТЕМНА ДУША — ЗРАДНИК (задум — H:\Game_NEW\WORLDS_4-7.md, рішення користувача 2026-11-10 / 2026-11-14) ----------
  // Коли данж світу fromWorld і далі відкривають ключем, з шансом chance замість боса в 3-му бою — Темна душа
  // (жереб — у save.dungeon.darkSoul, перезавантаження його не змінює). Вона — копія боса цього данжу:
  // здоров'я, мана, атака, магія й обидва захисти ×statMult, досвід ×expMult; решта — як у боса.
  // Перемога над нею НЕ рахується як перемога над босом (ні світи, ні літопис). Зброя Зрадника ламається одразу;
  // жарина Небесного горна: перша душа — напевно, далі emberBase, після кожної душі без жарини +emberStep (до 100%),
  // після жарини — знову emberBase. Лічильники — save.darkSouls = { kills, embers, misses }.
  // Вороги: ENEMIES["dark_soul_<id данжу>"] (по одному на данж), спільна картинка й сторінка бестіарію — "dark_soul".
  const DARK_SOUL = { chance: 0.1, fromWorld: 4, statMult: 2, expMult: 5, emberBase: 0.2, emberStep: 0.1,
    statKeys: ["hp", "mp", "attack", "magic", "defense", "magicDefense"], name: "Темна душа — Зрадник" };
  const darkSoulId = dungeonId => `dark_soul_${dungeonId}`;
  function makeDarkSoul(boss) {
    const stats = { ...boss.stats };
    for (const k of DARK_SOUL.statKeys) if (stats[k]) stats[k] = Math.round(stats[k] * DARK_SOUL.statMult);
    return {
      ...boss, name: DARK_SOUL.name, stats, exp: Math.round(boss.exp * DARK_SOUL.expMult), loot: [],
      boss: true, noChampion: true, undead: true, darkSoul: true, spriteFile: "dark_soul", bestiaryId: "dark_soul",
      move: { ...(boss.move || {}), name: "Удар рунного меча" }, verb: "рубає рунним мечем",
      skills: (boss.skills || []).map(s => ({ ...s, name: { magic: "Зелене полум'я Хелли", stun: "Удар понівеченого меча", heal: "Мертве світло рун" }[s.kind] || s.name }))
    };
  }
  // світ данжу: worlds.js (на сторінці гри підключений раніше), інакше — запасна таблиця (інші сторінки його не мають або мають пізніше)
  const REGION_WORLD = { start: 1, city: 1, dark: 2, alf: 3, van: 4, svartgard: 5, svart: 5, jot: 6 };
  const worldOfDungeon = d => { const r = RPG.LOCATIONS?.[d.location]?.region || "start"; return RPG.worldOfRegion?.(r) || REGION_WORLD[r] || 0; };
  for (const [dId, d] of Object.entries(RPG.DUNGEONS || {})) {
    const boss = RPG.ENEMIES[d.boss];
    if (!boss || worldOfDungeon(d) < DARK_SOUL.fromWorld) continue;
    RPG.ENEMIES[darkSoulId(dId)] = makeDarkSoul(boss);
    // сторінка бестіарію — одна на всіх (перший данж світу fromWorld)
    if (!RPG.ENEMIES.dark_soul) RPG.ENEMIES.dark_soul = { ...RPG.ENEMIES[darkSoulId(dId)], bestiaryOnly: true };
  }
  function darkSoulPossible(dungeonId) { return !!RPG.ENEMIES[darkSoulId(dungeonId)]; }
  const isDarkSoul = enemyId => !!RPG.ENEMIES[enemyId]?.darkSoul;
  // Шанс жарини з наступної душі
  function emberChance(save) {
    const s = save.darkSouls || {};
    if (!s.kills) return 1;
    return Math.min(1, DARK_SOUL.emberBase + DARK_SOUL.emberStep * (s.misses || 0));
  }
  // Перемога над душею: { ember, text } — лічильники оновлюються; саму жарину кладе page-game.js у здобич
  function darkSoulReward(save) {
    const s = (save.darkSouls ??= { kills: 0, embers: 0, misses: 0 });
    const ember = Math.random() < emberChance(save);
    s.kills++;
    if (ember) { s.embers++; s.misses = 0; } else s.misses = (s.misses || 0) + 1;
    return { ember, text: ember
      ? "Зброя Темної душі ламається зі смертю її власника та дає Жарину Небесного горна."
      : "Жарина небесного горна, що випала зі зброї, згасла й розвіялась по вітру." };
  }

  // ID ворогів для бою stage
  // n — живих героїв у бою: ворогів не менше, ніж героїв (бій 1 — n, бій 2 — не менше 3; бос — один, але сильніший за групу)
  function stageFoes(d, stage, n = 1, darkSoul = false) {
    n = Math.max(1, Math.min(6, n || 1));
    if (stage === 1) return Array.from({ length: n }, () => pick(d.pool));
    if (stage === 2) {
      const size = Math.max(3, n);
      const list = shuffle(d.pool).slice(0, size);
      while (list.length < size) list.push(pick(d.pool));
      return shuffle(list);
    }
    return [darkSoul && RPG.ENEMIES[darkSoulId(d.id)] ? darkSoulId(d.id) : d.boss];
  }
  const fighters = save => (RPG.aliveMembers ? RPG.aliveMembers(save).length : 1);

  // Поточний данж (або null). Якщо герой уже не на локації данжу — данж скасовується.
  function activeDungeon(save) {
    const s = save.dungeon;
    if (!s) return null;
    const d = getDungeon(s.id);
    if (!d || save.location?.map !== d.location || !(s.stage >= 1 && s.stage <= STAGES)) {
      delete save.dungeon;
      return null;
    }
    if (!Array.isArray(s.foes) || !s.foes.length) s.foes = stageFoes(d, s.stage, fighters(save), s.darkSoul);
    return { ...d, stage: s.stage, stages: STAGES, foes: s.foes, darkSoul: !!s.darkSoul };
  }

  // Відчинити ворота: −1 ключ, бій 1
  function openDungeon(save, dungeonId) {
    const d = getDungeon(dungeonId);
    if (!d) return { ok: false, reason: "Такого данжу немає." };
    if (save.location?.map !== d.location) return { ok: false, reason: "Ворота данжу — в іншій локації." };
    if (save.dungeon) return { ok: false, reason: "Ви вже в данжі." };
    if (!RPG.aliveMembers(save).length) return { ok: false, reason: RPG.expeditionActive?.(save) ? "Удома немає героїв, готових до бою: решта — в експедиції або полягла." : "Усі герої групи полягли — помоліться за них у Храмі." };
    if (d.minLevel && save.character.level < d.minLevel) {
      return { ok: false, reason: `Бій у данжі «${d.name}» — з ${d.minLevel} рівня персонажа.` };
    }
    if (!useKey(save, d.key)) {
      return { ok: false, reason: `Потрібен ${RPG.ITEMS[d.key].name}. Його можна знайти під час «${d.explore}» (шанс ${Math.round(d.keyChance * 100)}% з кожного ворога).` };
    }
    save.dungeon = { id: d.id, stage: 1, foes: stageFoes(d, 1, fighters(save)) };
    if (darkSoulPossible(d.id) && Math.random() < DARK_SOUL.chance) save.dungeon.darkSoul = true;   // жереб — одразу, у сейві
    return { ok: true };
  }

  // Перемога в бою: наступний бій або кінець данжу. Повертає { done, stage }
  function advanceDungeon(save) {
    const s = save.dungeon;
    if (!s) return { done: true, stage: 0 };
    if (s.stage >= STAGES) { delete save.dungeon; return { done: true, stage: STAGES }; }
    s.stage++;
    s.foes = stageFoes(getDungeon(s.id), s.stage, fighters(save), s.darkSoul);
    return { done: false, stage: s.stage };
  }

  function leaveDungeon(save) { delete save.dungeon; }

  // Множник сили ВСІХ ворогів данжу (боїв 1–3) за розміром групи — живих героїв у бою:
  // здоров'я, атака, магія, захисти × множник (monstergear.js → equipFoes).
  // Підібрано симуляцією (листопад 2026, після перерахунку ворогів): увесь данж (3 бої поспіль без зілля,
  // по ворогу на кожного героя в 1-му бою, не менше 3 — у 2-му) проходять ≈35% спроб за будь-якого розміру групи.
  // Герої: Темний ліс і Печера — Селяни рівня боса в синіх/фіолетових речах; Альвгейм — різні професії
  // в повному професійному сеті (броня + зброя). Соло — < 1, бо бої 1–2 перед босом виснажують героя.
  const ALF_POWER = { 1: 0.57, 2: 1.06, 3: 1.37, 4: 1.52, 5: 1.56, 6: 1.63 };
  const VAN_POWER = { 1: 0.57, 2: 1.05, 3: 1.36, 4: 1.52, 5: 1.54, 6: 1.63 };   // Ванагейм (світ 4)
  const SVART_POWER = VAN_POWER;                                               // Свартальвгейм (світ 5) — поки як у Ванагеймі
  const JOT_POWER = VAN_POWER;                                                 // Йотунгейм (світ 6) — поки як у Ванагеймі
  const GROUP_POWER = {
    cave_secret: { 1: 0.82, 2: 1.3,  3: 1.7,  4: 1.9,  5: 2.1,  6: 2.15 },
    web_nest:    { 1: 0.48, 2: 0.71, 3: 0.88, 4: 0.92, 5: 0.93, 6: 0.94 },
    dark_throne: { 1: 0.54, 2: 0.78, 3: 0.96, 4: 1.04, 5: 1.07, 6: 1.08 },
    alf_moth_nest: ALF_POWER, alf_lake_depths: ALF_POWER, alf_rot_garden: ALF_POWER,
    alf_dawn_spire: ALF_POWER, alf_freyr_throne: ALF_POWER, alf_beli_barrow: ALF_POWER,
    van_ghost_ship: VAN_POWER, van_volva_hut: VAN_POWER, van_mead_cellar: VAN_POWER,
    van_pyre_heart: VAN_POWER, van_inner_shrine: VAN_POWER, van_ran_hall: VAN_POWER,
    svart_matriarch_cocoon: SVART_POWER, svart_andvari_hoard: SVART_POWER, svart_obsidian_spire: SVART_POWER, svart_stone_hall: SVART_POWER, 
    svart_sealed_forge: SVART_POWER, svart_rune_well: SVART_POWER, svart_clay_heart: SVART_POWER,
    jot_troll_cave: JOT_POWER, jot_eagle_nest: JOT_POWER, jot_angrboda_lair: JOT_POWER, jot_thrym_hoard: JOT_POWER,
    jot_stone_heart: JOT_POWER, jot_hall_of_illusions: JOT_POWER, jot_hymir_cauldron: JOT_POWER, jot_serpent_ring: JOT_POWER
  };
  function groupPower(dungeonId, size) {
    const row = (RPG.DUNGEON_GROUP_POWER || GROUP_POWER)[dungeonId];
    if (!row) return 1;
    const n = Math.max(1, Math.min(6, size || 1));
    return row[n] ?? 1;
  }

  // Опис бою stage для гравця
  function dungeonStageText(d, stage) {
    const names = d.pool.map(id => RPG.ENEMIES[id].name);
    if (stage === 1) return `випадкові вороги (${names.join(" / ")}) — по одному на кожного героя, з GS як у вашої групи`;
    if (stage === 2) return `три вороги або більше — не менше, ніж героїв (${names.join(", ")}), з GS як у вашої групи`;
    return `бос «${RPG.ENEMIES[d.boss].name}»`;
  }

  // Специфікації ворогів поточного бою данжу для battle.js:
  // у боях 1–2 вороги мають речі з GS, рівним GS групи (dungeonGs), бос — за звичайними правилами боса
  function dungeonSpecs(save) {
    const a = activeDungeon(save);
    if (!a) return [];
    return a.foes.map(id => ({ id, champion: false, dungeonGs: !RPG.ENEMIES[id]?.boss, dungeon: a.id }));
  }

  // Ключі зі «Обстеження»: шанс keyChance з кожного переможеного ворога з pool — у кишеню.
  // Якщо ключів уже KEY_MAX — не випадають (full: true). Повертає { got, full, name }
  function rollKeyDrops(save, locId, enemyIds) {
    const d = locationDungeon(locId);
    const out = { got: 0, full: false, name: d ? RPG.ITEMS[d.key].name : "" };
    if (!d || save.dungeon) return out;
    for (const id of enemyIds || []) {
      if (keyAmount(save, d.key) >= KEY_MAX) { out.full = true; break; }
      if (!d.pool.includes(id) || Math.random() >= d.keyChance) continue;
      out.got += addKeys(save, d.key, 1);
    }
    return out;
  }

  Object.assign(RPG, {
    DUNGEON_STAGES: STAGES, KEY_MAX, keyAmount, addKeys, useKey, keyPocket, migrateKeys, DUNGEON_GROUP_POWER: GROUP_POWER, dungeonGroupPower: groupPower, DUNGEON_POOL_TEXT: dungeonStageText, getDungeon, locationDungeon, keyCount, activeDungeon, openDungeon,
    advanceDungeon, leaveDungeon, dungeonSpecs, rollKeyDrops,
    DARK_SOUL, darkSoulId, darkSoulPossible, isDarkSoul, emberChance, darkSoulReward
  });
})(window.RPG);

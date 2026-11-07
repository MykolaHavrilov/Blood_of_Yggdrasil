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

  // ID ворогів для бою stage
  // n — живих героїв у бою: ворогів не менше, ніж героїв (бій 1 — n, бій 2 — не менше 3; бос — один, але сильніший за групу)
  function stageFoes(d, stage, n = 1) {
    n = Math.max(1, Math.min(6, n || 1));
    if (stage === 1) return Array.from({ length: n }, () => pick(d.pool));
    if (stage === 2) {
      const size = Math.max(3, n);
      const list = shuffle(d.pool).slice(0, size);
      while (list.length < size) list.push(pick(d.pool));
      return shuffle(list);
    }
    return [d.boss];
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
    if (!Array.isArray(s.foes) || !s.foes.length) s.foes = stageFoes(d, s.stage, fighters(save));
    return { ...d, stage: s.stage, stages: STAGES, foes: s.foes };
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
    return { ok: true };
  }

  // Перемога в бою: наступний бій або кінець данжу. Повертає { done, stage }
  function advanceDungeon(save) {
    const s = save.dungeon;
    if (!s) return { done: true, stage: 0 };
    if (s.stage >= STAGES) { delete save.dungeon; return { done: true, stage: STAGES }; }
    s.stage++;
    s.foes = stageFoes(getDungeon(s.id), s.stage, fighters(save));
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
  const GROUP_POWER = {
    cave_secret: { 1: 0.82, 2: 1.3,  3: 1.7,  4: 1.9,  5: 2.1,  6: 2.15 },
    web_nest:    { 1: 0.48, 2: 0.71, 3: 0.88, 4: 0.92, 5: 0.93, 6: 0.94 },
    dark_throne: { 1: 0.54, 2: 0.78, 3: 0.96, 4: 1.04, 5: 1.07, 6: 1.08 },
    alf_moth_nest: ALF_POWER, alf_lake_depths: ALF_POWER, alf_rot_garden: ALF_POWER,
    alf_dawn_spire: ALF_POWER, alf_freyr_throne: ALF_POWER, alf_beli_barrow: ALF_POWER
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
    advanceDungeon, leaveDungeon, dungeonSpecs, rollKeyDrops
  });
})(window.RPG);

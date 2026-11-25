// ============================================================
// ДОВІДНИК ВОРОГІВ ТА ЛОКАЦІЙ
// stats: hp, mp, attack, magic, defense, magicDefense, speed (рахується зі світу й рівня — enemySpeed нижче),
//        crit (%), blockPhys (%), blockMag (%)
// exp  — скільки досвіду дає КОЖЕН убитий ворог: 3 × рівень²; з 31 рівня — ще ×1,1 за кожен рівень понад 30 (enemyExp нижче)
//        (і від нього ж рахується штраф при загибелі героя: exp × 10)
// gold — [мін, макс]
// loot — chance — шанс від 0 до 1, qty — [мін, макс]
//        Чим вищий рівень ворога, тим кращі речі та більші зілля.
// sprite — номер кадру у спрайт-листі ворогів assets/images/ENEMIES_1 (256×256, відступ 2 px)
// verb  — як ворог б'є (у журналі бою), за замовчуванням «кусає»
// spell — магічна атака: { name, mp, mult, chance } — сила магії × mult проти маг. захисту,
//         використовується з шансом chance, якщо вистачає мани
// skills — унікальні навички (бос): по черзі, кожен 3-й власний хід ворога.
//          kind: "magic" (шкода), "heal" (лікує healPct від макс. HP), "stun" (шкода + герой пропускає хід)
// range — дальність атаки ворога: 1 — ближній бій, 2 — середній, 3 — дальній
//         (бій починається з відстані 3; хто не дістає — підходить на 1 за хід)
// move  — власний прийом ворога: { name, mult, chance } — фізичний удар attack × mult;
//         якщо не вказано — береться типовий прийом за дальністю (MONSTER_MOVES)
// noChampion — не може стати чемпіоном; boss — показується як бос
// undead — нежить підземного світу (скелети, привиди, утопленики, гулі); Йотуни й звірі — ні
//         (бос має випадкові речі з середнім GS = GS першого героя / 2 — monstergear.js)
// humanoid — гуманоїд (руки, ноги, голова): перед боєм вдягає приховане спорядження
//         під GS групи героїв (monstergear.js); ці речі ніколи не випадають
// weapons — (лише гуманоїди) з якої зброї ворог обирає перед боєм, випадково з однаковою вагою
//         (повтор у списку = частіше): sword, axe, dagger, bow, staff або none (кулаки/кігті).
//         Зброя визначає дальність, як у героя: лук — 3, посох у чаклуна — 2 (або природна
//         range, якщо вона більша), решта — 1; range ворога тоді не діє (monstergear.js)
// spawnWeight — множник шансу зустрічі (1 — звичайно, 0.1 — у 10 разів рідше)
// role — роль у бою: tank (танк), melee (дамагер ближній), ranged (дамагер дальній, фізичний), caster (маг), healer (хілер).
//        Хілер кожен 3-й свій хід лікує найпораненішого монстра групи (battle.js → enemyTurn, ENEMY_HEAL).
//
// ПЕРЕРАХУНОК ЗА РОЛЯМИ (листопад 2026, таблиця «Професії й монстри - перерахунок.xlsx»):
//   характеристика = A × рівень^b × множник ролі (× множник боса); A і b підібрано під попередніх монстрів окремо
//   для Гардарики (рів. 1–10) і для Темного лісу та Альвгейму. Множники ролей (hp / атака / захист / маг. захист / швидкість):
//     танк 1,75 / 0,85 / 1,8 / 1,25 / 0,6; ближній 1; дальній 0,85 / 1 / 0,8 / 0,9 / 0,9;
//     маг 1 / 0,55 / 0,9 / 1,5 / 0,75 (+ сила магії й мана); хілер 0,9 / 0,4 / 0,9 / 1,4 / 0,8 (мана ×1,3, магія ×0,8).
//   Боси — ще ×{hp 3,0, атака 1,14, захист 1,26}; магія й мана боса — за кривою мага, блоки — обидва.
//   Блок фіз. — танкам, блок маг. — магам і хілерам; ухилення — лише тим, у кого воно було.
//   Здоров'я — ще ×1.11 (Гардарика) / ×1.10 (далі): настільки зросла шкода героїв від нових ваг атрибутів (classes.js → dmgAttrs).
//
// АТАКА БОСІВ (25.11.2026, рішення користувача): атака й магія кожного боса (разом, ролі як були) підняті так, щоб
//   кінцеве число (з прихованими речами) було ×1,5 від медіани звичайних ворогів його світу й рівня ±3, а у фінальних
//   босів світів (брама наступного світу, data/worlds.js → gate.boss, і остання форма Хелли) — ×2. Сильніших не знижено,
//   здоров'я не змінено. Множники данжів НЕ перепідбирались — данжі навмисно стали важчими.
//
// ТРЕТІЙ ПЕРЕРАХУНОК (25.11.2026 — слоти характеристик речей, сила величин за світом, межі: ухилення 70%, крит 100%,
//   сила криту 500%, блок 50%, захист зменшує шкоду до 70%): здоров'я, атака, магія й обидва захисти всіх ворогів світу
//   помножено на множник світу (ролі й ріст за рівнем — як були): Ванагейм і Свартальфгейм ×1,4, Йотунгейм ×1,6,
//   Муспельгейм ×1,65, Асгард і Нифльгейм ×2,1; світи 1–3 — без змін. Еталон — герої свого рівня, з 3 світу в епічних речах
//   зі слотами (по черзі професійний сет і речі тіру); ціль — група 3 ≈ 70% (tools/balance.js --maze).
//
// ДРУГИЙ ПЕРЕРАХУНОК (листопад 2026, v0.3.9 — після комплектів професій, межі швидкості 250/350/450 і сили криту):
//   кожному ворогу підібрано множник здоров'я, мани, атаки й магії симуляцією «1 герой рівня ворога проти 1 ворога»
//   (герой — з навичками своєї зброї/професії, з володінням зброєю; ворог — у прихованих речах під GS героя, monstergear.js):
//     Гардарика (1–9)  — Селянин у білих/синіх речах: ≥ 90% перемог (тут вороги лише слабшали, сильнішими не ставали);
//     Темний ліс (10–25) — Селянин у синіх і фіолетових речах порівну: ≈ 85% перемог;
//     Альвгейм (25–30) — професії (воїн, лицар, мисливець, розбійник, маг вогню, жрець) у повному професійному сеті
//                        (броня + зброя), решта речей сині/фіолетові: ≈ 80% (без сету ≈ 60–75%);
//     боси — ті самі герої: ≈ 45% в окремому бою (данжі — dungeon.js → GROUP_POWER).
//   Альвгеймські вороги через це в ~2,5–4 рази сильніші, ніж були.
// ============================================================

(function (RPG) {
  // Спрайт-лист ворогів: 5 стовпців × 2 рядки, кадр 256×256, відступ 2 px
  const ENEMY_SHEET = { file: "assets/images/ENEMIES_1", ext: ".webp", cols: 5, rows: 2, size: 256, gap: 2 };

  // Типові прийоми монстрів за дальністю атаки
  const MONSTER_MOVES = {
    1: { name: "Шматування",        mult: 1.6,  chance: 0.25 },   // ближній бій
    2: { name: "Удар з наскоку",     mult: 1.35, chance: 0.30 },   // середня дистанція
    3: { name: "Прицільний постріл", mult: 1.45, chance: 0.30 }    // дальній бій
  };
  const RANGE_NAMES = { 1: "ближній бій", 2: "середня дистанція", 3: "дальній бій" };

  // Перерахунок під нові межі характеристик (stats.js → CAP: крит 100%, ухилення 60%, швидкість 250, блок 95%):
//   крит і блок ростуть поступово з рівнем: до 5 рівня — як були, на 25-му — ×1,67 і ×1,9 (пропорційно новим межам);
//   швидкість ×1,1 на 10 рівні → ×1,3 на 25-му (до 10 рівня — як була);
//   ухилення — лише спритним (щури, вовки, павуки, тіні, привиди, вершники, лучники): 3% на 1 рівні → 20% на 25-му; важким — 0.
const ENEMIES = {
    // ---------- Щури (1–3 рівень) ----------
    rat: {
      name: "Щур з льоху",
      range: 1, move: { name: "Сказений укус", mult: 1.5, chance: 0.25 },
      sprite: 0,
      level: 1,
      role: "melee",
      stats: { hp: 27, mp: 0, attack: 6, defense: 1, magicDefense: 0, crit: 3, dodge: 3 },
      exp: 2,
      gold: [0, 2],
      loot: [
        { id: "rat_tail",         chance: 0.5, qty: [1, 1] },
        { id: "potion_hp_small",  chance: 0.06, qty: [1, 1] },
        { id: "linen_legs",       chance: 0.01, qty: [1, 1] },
        { id: "sword_t1",         chance: 0.006, qty: [1, 1] }
      ]
    },
    rat2: {
      name: "Щур з поля",
      range: 1, move: { name: "Сказений укус", mult: 1.5, chance: 0.25 },
      sprite: 1,
      level: 2,
      role: "melee",
      stats: { hp: 58, mp: 0, attack: 11, defense: 2, magicDefense: 1, crit: 4, dodge: 4 },
      exp: 6,
      gold: [1, 4],
      loot: [
        { id: "rat_tail",         chance: 0.55, qty: [1, 2] },
        { id: "rat_skin",         chance: 0.25, qty: [1, 1] },
        { id: "potion_hp_small",  chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_small",  chance: 0.04, qty: [1, 1] },
        { id: "linen_head",       chance: 0.012, qty: [1, 1] },
        { id: "dagger_t1",        chance: 0.01, qty: [1, 1] },
        { id: "knife_t1",         chance: 0.006, qty: [1, 1] }
      ]
    },
    rat3: {
      name: "Щур з підвалу",
      range: 1, move: { name: "Сказений укус", mult: 1.55, chance: 0.28 },
      sprite: 2,
      level: 3,
      role: "melee",
      stats: { hp: 90, mp: 0, attack: 16, defense: 4, magicDefense: 1, crit: 6, dodge: 5 },
      exp: 20,
      gold: [3, 8],
      loot: [
        { id: "rat_tail",         chance: 0.6, qty: [1, 2] },
        { id: "rat_skin",         chance: 0.35, qty: [1, 1] },
        { id: "potion_hp_small",  chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_small",  chance: 0.06, qty: [1, 1] },
        { id: "potion_hp_medium", chance: 0.02, qty: [1, 1] },
        { id: "ring_t1",          chance: 0.01, qty: [1, 1] },
        { id: "linen_hands",      chance: 0.012, qty: [1, 1] },
        { id: "linen_chest",      chance: 0.01, qty: [1, 1] },
        { id: "axe_t1",           chance: 0.008, qty: [1, 1] },
        { id: "bow_t1",           chance: 0.008, qty: [1, 1] }
      ]
    },

    // ---------- Вовки (4–6 рівень) ----------
    wolf: {
      name: "Сірий вовк",
      range: 1, move: { name: "Розірвати горлянку", mult: 1.6, chance: 0.25 },
      sprite: 3,
      level: 4,
      role: "melee",
      stats: { hp: 123, mp: 0, attack: 20, defense: 5, magicDefense: 2, crit: 7, dodge: 5 },
      exp: 40,
      gold: [5, 12],
      loot: [
        { id: "wolf_pelt",        chance: 0.45, qty: [1, 1] },
        { id: "wolf_fang",        chance: 0.25, qty: [1, 1] },
        { id: "potion_hp_small",  chance: 0.08, qty: [1, 1] },
        { id: "potion_hp_medium", chance: 0.05, qty: [1, 1] },
        { id: "potion_mp_medium", chance: 0.025, qty: [1, 1] },
        { id: "linen_feet",       chance: 0.012, qty: [1, 1] },
        { id: "axe_t1",           chance: 0.01, qty: [1, 1] },
        { id: "shield_t1",        chance: 0.008, qty: [1, 1] },
        { id: "quiver_t1",        chance: 0.008, qty: [1, 1] },
        { id: "amulet_t1",        chance: 0.006, qty: [1, 1] },
        { id: "earring_t1",       chance: 0.006, qty: [1, 1] },
        { id: "potion_magic",     chance: 0.003, qty: [1, 1] }
      ]
    },
    wolf2: {
      name: "Чорний вовк",
      range: 1, move: { name: "Розірвати горлянку", mult: 1.65, chance: 0.28 },
      sprite: 4,
      level: 5,
      role: "melee",
      stats: { hp: 157, mp: 0, attack: 25, defense: 7, magicDefense: 3, crit: 8, dodge: 6 },
      exp: 60,
      gold: [8, 18],
      loot: [
        { id: "wolf_pelt",        chance: 0.5, qty: [1, 2] },
        { id: "wolf_fang",        chance: 0.35, qty: [1, 1] },
        { id: "potion_hp_medium", chance: 0.07, qty: [1, 1] },
        { id: "potion_mp_medium", chance: 0.045, qty: [1, 1] },
        { id: "potion_hp_large",  chance: 0.008, qty: [1, 1] },
        { id: "linen_head",       chance: 0.012, qty: [1, 1] },
        { id: "staff_t1",         chance: 0.008, qty: [1, 1] },
        { id: "orb_t1",           chance: 0.008, qty: [1, 1] },
        { id: "ring_t1",          chance: 0.006, qty: [1, 1] },
        { id: "amulet_t1",        chance: 0.008, qty: [1, 1] },
        { id: "earring_t1",       chance: 0.006, qty: [1, 1] },
        { id: "leather_hands",    chance: 0.003, qty: [1, 1] },
        { id: "potion_magic",     chance: 0.005, qty: [1, 1] }
      ]
    },
    wolf3: {
      name: "Білий вовк",
      range: 1, move: { name: "Розірвати горлянку", mult: 1.65, chance: 0.28 },
      sprite: 5,
      level: 6,
      role: "melee",
      stats: { hp: 191, mp: 0, attack: 29, defense: 8, magicDefense: 4, crit: 9, dodge: 6 },
      exp: 90,
      gold: [12, 25],
      loot: [
        { id: "white_pelt",       chance: 0.45, qty: [1, 1] },
        { id: "wolf_fang",        chance: 0.4, qty: [1, 2] },
        { id: "potion_hp_medium", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_medium", chance: 0.05, qty: [1, 1] },
        { id: "potion_hp_large",  chance: 0.015, qty: [1, 1] },
        { id: "potion_mp_large",  chance: 0.01, qty: [1, 1] },
        { id: "linen_chest",      chance: 0.01, qty: [1, 1] },
        { id: "bow_t1",           chance: 0.008, qty: [1, 1] },
        { id: "dagger_t1",        chance: 0.008, qty: [1, 1] },
        { id: "earring_t1",       chance: 0.008, qty: [1, 1] },
        { id: "leather_chest",    chance: 0.004, qty: [1, 1] },
        { id: "sword_t2",         chance: 0.002, qty: [1, 1] },
        { id: "shield_t2",        chance: 0.002, qty: [1, 1] },
        { id: "potion_magic",     chance: 0.008, qty: [1, 1] }
      ]
    },
    // ---------- Слайми (6–8 рівень) та Король слайм (Печера в лісі) ----------
    slime: {
      name: "Зелений слайм",
      range: 2, move: { name: "Стрибок слизу", mult: 1.35, chance: 0.25 },
      sprite: 6, verb: "хлюпає",
      level: 6,
      role: "caster",
      stats: { hp: 191, mp: 40, attack: 16, magic: 26, defense: 7, magicDefense: 5, crit: 6, blockMag: 4 },
      spell: { name: "Кислотний плювок", mp: 10, mult: 1.3, chance: 0.4 },
      exp: 100,
      gold: [10, 22],
      loot: [
        { id: "slime_gel",        chance: 0.6, qty: [1, 2] },
        { id: "potion_mp_small",  chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_medium", chance: 0.05, qty: [1, 1] },
        { id: "potion_hp_medium", chance: 0.05, qty: [1, 1] },
        { id: "slime_ring",       chance: 0.012, qty: [1, 1] },
        { id: "slime_earring",    chance: 0.01, qty: [1, 1] },
        { id: "slime_amulet",     chance: 0.008, qty: [1, 1] },
        { id: "orb_t1",           chance: 0.008, qty: [1, 1] }
      ]
    },
    slime2: {
      name: "Синій слайм",
      range: 2, move: { name: "Стрибок слизу", mult: 1.35, chance: 0.25 },
      sprite: 7, verb: "хлюпає",
      level: 7,
      role: "caster",
      stats: { hp: 226, mp: 59, attack: 18, magic: 33, defense: 9, magicDefense: 7, crit: 6, blockMag: 7 },
      spell: { name: "Крижаний бризок", mp: 12, mult: 1.4, chance: 0.4 },
      exp: 140,
      gold: [14, 28],
      loot: [
        { id: "slime_gel",        chance: 0.65, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 1] },
        { id: "potion_hp_medium", chance: 0.06, qty: [1, 1] },
        { id: "potion_mp_large",  chance: 0.01, qty: [1, 1] },
        { id: "slime_ring",       chance: 0.015, qty: [1, 1] },
        { id: "slime_earring",    chance: 0.012, qty: [1, 1] },
        { id: "slime_amulet",     chance: 0.01, qty: [1, 1] },
        { id: "staff_t1",         chance: 0.008, qty: [1, 1] }
      ]
    },
    slime3: {
      name: "Фіолетовий слайм",
      range: 2, move: { name: "Стрибок слизу", mult: 1.35, chance: 0.25 },
      sprite: 8, verb: "хлюпає",
      level: 8,
      role: "caster",
      stats: { hp: 261, mp: 81, attack: 20, magic: 40, defense: 11, magicDefense: 8, crit: 7, blockMag: 10 },
      spell: { name: "Отруйна хмара", mp: 15, mult: 1.5, chance: 0.45 },
      exp: 190,
      gold: [18, 35],
      loot: [
        { id: "slime_gel",        chance: 0.7, qty: [1, 3] },
        { id: "potion_mp_medium", chance: 0.1, qty: [1, 1] },
        { id: "potion_hp_large",  chance: 0.015, qty: [1, 1] },
        { id: "potion_mp_large",  chance: 0.015, qty: [1, 1] },
        { id: "slime_ring",       chance: 0.018, qty: [1, 1] },
        { id: "slime_earring",    chance: 0.015, qty: [1, 1] },
        { id: "slime_amulet",     chance: 0.012, qty: [1, 1] },
        { id: "orb_t2",           chance: 0.004, qty: [1, 1] },
        { id: "potion_magic",     chance: 0.008, qty: [1, 1] }
      ]
    },
    slime_king: {
      name: "Король слайм",
      range: 2, move: { name: "Удар хвилею слизу", mult: 1.5, chance: 0.25 },
      sprite: 9, verb: "розчавлює вагою",
      level: 10,
      boss: true, noChampion: true, spawnWeight: 0.1,
      // У 5–6 разів сильніший за зеленого слайма: HP ×6, атака й магія ×1,6
      role: "caster",
      stats: { hp: 953, mp: 282, attack: 27, magic: 54, defense: 18, magicDefense: 12, crit: 7, blockPhys: 10, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Золотий потоп", mp: 40, mult: 2.2 },
        { kind: "heal",  name: "Королівське желе", mp: 50, healPct: 0.12 },
        { kind: "stun",  name: "Липкі кайдани", mp: 30, mult: 1.0 }
      ],
      exp: 1000,
      gold: [80, 150],
      loot: [
        { id: "slime_gel",        chance: 1, qty: [3, 6] },
        { id: "potion_mp_large",  chance: 0.25, qty: [1, 2] },
        { id: "potion_hp_large",  chance: 0.2, qty: [1, 1] },
        { id: "potion_magic",     chance: 0.1, qty: [1, 1] },
        { id: "slime_ring",       chance: 0.15, qty: [1, 1] },
        { id: "slime_earring",    chance: 0.15, qty: [1, 1] },
        { id: "slime_amulet",     chance: 0.12, qty: [1, 1] },
        { id: "orb_t2",           chance: 0.04, qty: [1, 1] },
        { id: "staff_t2",         chance: 0.04, qty: [1, 1] }
      ]
    },

    // ---------- ТЕМНИЙ ЛІС (10–25 рівень) — за Центральною брамою; картинки: assets/images/enemies/<id>.webp ----------
    shadow_wolf: {
      name: "Тіньовий вовк",
      range: 1, move: { name: "Укус із тіні", mult: 1.50, chance: 0.25 },
      verb: "кусає",
      level: 10,
      role: "melee",
      stats: { hp: 798, mp: 0, attack: 91, defense: 41, magicDefense: 46, crit: 12, dodge: 10 },
      exp: 300,
      gold: [23, 44],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.04, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.03, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    rot_boar: {
      name: "Гнилий кабан",
      range: 1, move: { name: "Таранний удар", mult: 1.51, chance: 0.25 },
      verb: "б'є іклами",
      level: 11,
      role: "tank",
      stats: { hp: 1245, mp: 0, attack: 72, defense: 79, magicDefense: 62, crit: 8, blockPhys: 10 },
      exp: 363,
      gold: [25, 48],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.04, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.03, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    forest_spider: {
      name: "Лісовий павук",
      range: 2, move: { name: "Плювок отрутою", mult: 1.52, chance: 0.25 },
      verb: "кусає",
      level: 12,
      role: "ranged",
      stats: { hp: 836, mp: 0, attack: 121, defense: 37, magicDefense: 47, crit: 15, dodge: 12 },
      exp: 432,
      gold: [28, 53],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.04, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.03, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    bog_leech: {
      name: "Болотяна п'явка",
      range: 1, move: { name: "Висмоктати кров", mult: 1.52, chance: 0.25 },
      verb: "присмоктується",
      level: 12,
      role: "melee",
      stats: { hp: 994, mp: 0, attack: 123, defense: 46, magicDefense: 52, crit: 13 },
      exp: 432,
      gold: [28, 53],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.04, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.03, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    drowner: {
      name: "Утопленик",
      undead: true,                // нежить підземного світу (Промінь світла жерця +50%)
      humanoid: true,
      weapons: ["none", "none", "dagger", "axe"],
      range: 1, move: { name: "Мертва хватка", mult: 1.53, chance: 0.25 },
      verb: "дряпає",
      level: 13,
      role: "tank",
      stats: { hp: 1033, mp: 0, attack: 63, defense: 87, magicDefense: 69, crit: 9, blockPhys: 11 },
      exp: 507,
      gold: [30, 57],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.04, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.03, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    will_wisp: {
      name: "Блукаючий вогник",
      range: 2, move: { name: "Спалах", mult: 1.54, chance: 0.25 },
      verb: "обпікає",
      level: 14,
      role: "caster",
      stats: { hp: 995, mp: 162, attack: 72, magic: 100, defense: 45, magicDefense: 86, crit: 10, dodge: 12, blockMag: 11 },
      spell: { name: "Мертвецьке полум'я", mp: 17, mult: 1.4, chance: 0.4 },
      exp: 588,
      gold: [32, 62],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.04, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.03, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    skeleton_archer: {            // id лишається старий (сейви, квести); скелет-воїн: меч, сокира або лук (weapons)
      name: "Скелет-воїн",
      undead: true,                // нежить підземного світу (Промінь світла жерця +50%)
      humanoid: true,
      weapons: ["sword", "sword", "axe", "bow"],
      range: 1, move: { name: "Удар іржавого меча", mult: 1.54, chance: 0.25 },
      verb: "рубає",
      level: 14,
      role: "melee",
      stats: { hp: 794, mp: 0, attack: 105, defense: 50, magicDefense: 58, crit: 15, dodge: 12 },
      exp: 588,
      gold: [32, 62],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.04, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.03, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    ghost: {
      name: "Привид",
      undead: true,                // нежить підземного світу (Промінь світла жерця +50%)
      range: 2, move: { name: "Холодний дотик", mult: 1.55, chance: 0.25 },
      verb: "торкається",
      level: 15,
      role: "caster",
      stats: { hp: 1044, mp: 176, attack: 78, magic: 109, defense: 47, magicDefense: 90, crit: 10, dodge: 13, blockMag: 12 },
      spell: { name: "Крижаний стогін", mp: 18, mult: 1.4, chance: 0.4 },
      exp: 675,
      gold: [34, 66],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    ghoul: {
      name: "Гуль",
      undead: true,                // нежить підземного світу (Промінь світла жерця +50%)
      humanoid: true,
      weapons: ["none", "none", "dagger"],
      range: 1, move: { name: "Трупні пазурі", mult: 1.56, chance: 0.25 },
      verb: "шматує",
      level: 16,
      role: "melee",
      stats: { hp: 952, mp: 0, attack: 133, defense: 55, magicDefense: 63, crit: 17 },
      exp: 768,
      gold: [37, 70],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    web_hunter: {
      name: "Павук-мисливець",
      range: 1, move: { name: "Отруйне жало", mult: 1.56, chance: 0.25 },
      verb: "жалить",
      level: 16,
      role: "melee",
      stats: { hp: 1027, mp: 0, attack: 144, defense: 55, magicDefense: 63, crit: 17, dodge: 14 },
      exp: 768,
      gold: [37, 70],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    web_weaver: {
      name: "Павук-ткач",
      range: 2, move: { name: "Липка сітка", mult: 1.57, chance: 0.25 },
      verb: "кусає",
      level: 17,
      role: "ranged",
      stats: { hp: 1007, mp: 0, attack: 170, defense: 45, magicDefense: 59, crit: 19, dodge: 16 },
      exp: 867,
      gold: [39, 75],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    spider_queen: {
      name: "Королева павуків",
      range: 2, move: { name: "Отруйний укус", mult: 1.58, chance: 0.25 },
      verb: "кусає",
      level: 18,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "ranged",
      stats: { hp: 3104, mp: 472, attack: 379, magic: 254, defense: 59, magicDefense: 65, crit: 18, dodge: 17, blockPhys: 13, blockMag: 11 },
      skills: [
        { kind: "magic", name: "Отруйна злива", mp: 40, mult: 2.0 },
        { kind: "stun", name: "Кокон", mp: 30, mult: 1.0 },
        { kind: "heal", name: "Пожерти здобич", mp: 50, healPct: 0.12 }
      ],
      exp: 4860,
      gold: [205, 395],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "sword_t2", chance: 0.04, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.04, qty: [1, 1] },
        { id: "axe_t2", chance: 0.04, qty: [1, 1] },
        { id: "bow_t2", chance: 0.04, qty: [1, 1] },
        { id: "staff_t2", chance: 0.04, qty: [1, 1] },
        { id: "shield_t2", chance: 0.04, qty: [1, 1] },
        { id: "quiver_t2", chance: 0.04, qty: [1, 1] },
        { id: "orb_t2", chance: 0.04, qty: [1, 1] },
        { id: "knife_t2", chance: 0.04, qty: [1, 1] },
        { id: "leather_head", chance: 0.04, qty: [1, 1] },
        { id: "leather_chest", chance: 0.04, qty: [1, 1] },
        { id: "leather_legs", chance: 0.04, qty: [1, 1] },
        { id: "leather_hands", chance: 0.04, qty: [1, 1] },
        { id: "leather_feet", chance: 0.04, qty: [1, 1] },
        { id: "ring_t2", chance: 0.04, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.04, qty: [1, 1] },
        { id: "earring_t2", chance: 0.04, qty: [1, 1] }
      ]
    },
    werewolf: {
      name: "Вовкулака",
      humanoid: true,
      weapons: ["none"],
      range: 1, move: { name: "Розшматувати", mult: 1.58, chance: 0.25 },
      verb: "роздирає",
      level: 18,
      role: "melee",
      stats: { hp: 949, mp: 0, attack: 139, defense: 59, magicDefense: 68, crit: 18, dodge: 15 },
      exp: 972,
      gold: [41, 79],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    pack_leader: {
      name: "Ватажок зграї",
      range: 1, move: { name: "Удар ватажка", mult: 1.59, chance: 0.25 },
      verb: "б'є",
      level: 19,
      role: "tank",
      stats: { hp: 1617, mp: 0, attack: 118, defense: 109, magicDefense: 88, crit: 13, dodge: 8, blockPhys: 13 },
      exp: 1083,
      gold: [44, 84],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    shadow_beast: {
      name: "Тіньовий звір",
      range: 2, move: { name: "Тіньовий кіготь", mult: 1.60, chance: 0.25 },
      verb: "рве",
      level: 20,
      role: "caster",
      stats: { hp: 1392, mp: 266, attack: 118, magic: 161, defense: 56, magicDefense: 109, crit: 13, dodge: 16, blockMag: 13 },
      spell: { name: "Тіньовий подих", mp: 24, mult: 1.4, chance: 0.4 },
      exp: 1200,
      gold: [46, 88],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    cultist: {
      name: "Культист",
      humanoid: true,
      weapons: ["staff", "staff", "dagger", "bow"],
      range: 2, move: { name: "Ритуальний ніж", mult: 1.60, chance: 0.25 },
      verb: "б'є ножем",
      level: 20,
      role: "healer",
      stats: { hp: 1154, mp: 319, attack: 80, magic: 118, defense: 56, magicDefense: 102, crit: 8, blockMag: 13 },
      spell: { name: "Чорне прокляття", mp: 24, mult: 1.4, chance: 0.4 },
      exp: 1200,
      gold: [46, 88],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    witch: {
      name: "Лісова відьма",
      humanoid: true,
      weapons: ["staff"],
      range: 3, move: { name: "Удар патерицею", mult: 1.61, chance: 0.25 },
      verb: "вдаряє патерицею",
      level: 21,
      role: "caster",
      stats: { hp: 1123, mp: 220, attack: 97, magic: 132, defense: 58, magicDefense: 112, crit: 14, blockMag: 14 },
      spell: { name: "Відьомський вогонь", mp: 25, mult: 1.4, chance: 0.4 },
      exp: 1323,
      gold: [48, 92],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    stone_golem: {
      name: "Кам'яний голем",
      range: 1, move: { name: "Кам'яний кулак", mult: 1.62, chance: 0.25 },
      verb: "трощить",
      level: 22,
      role: "tank",
      stats: { hp: 2330, mp: 0, attack: 182, defense: 119, magicDefense: 97, crit: 14, blockPhys: 14 },
      exp: 1452,
      gold: [51, 97],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    ancient_treant: {
      name: "Древній лісовик",
      range: 2, move: { name: "Удар корінням", mult: 1.63, chance: 0.25 },
      verb: "хльоскає",
      level: 23,
      role: "tank",
      stats: { hp: 2355, mp: 0, attack: 188, defense: 122, magicDefense: 99, crit: 15, blockPhys: 14 },
      exp: 1587,
      gold: [53, 101],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    black_rider: {
      name: "Чорний вершник",
      humanoid: true,
      weapons: ["sword", "axe", "bow"],
      range: 1, move: { name: "Наскок вершника", mult: 1.64, chance: 0.25 },
      verb: "рубає",
      level: 24,
      role: "melee",
      stats: { hp: 1337, mp: 0, attack: 224, defense: 69, magicDefense: 82, crit: 23, dodge: 18 },
      exp: 1728,
      gold: [55, 106],
      loot: [
        { id: "potion_hp_medium", chance: 0.12, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.08, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.06, qty: [1, 1] },
        { id: "potion_magic", chance: 0.01, qty: [1, 1] },
        { id: "leather_head", chance: 0.004, qty: [1, 1] },
        { id: "leather_chest", chance: 0.004, qty: [1, 1] },
        { id: "leather_legs", chance: 0.004, qty: [1, 1] },
        { id: "leather_hands", chance: 0.004, qty: [1, 1] },
        { id: "leather_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t2", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.003, qty: [1, 1] },
        { id: "axe_t2", chance: 0.003, qty: [1, 1] },
        { id: "bow_t2", chance: 0.003, qty: [1, 1] },
        { id: "staff_t2", chance: 0.003, qty: [1, 1] },
        { id: "shield_t2", chance: 0.003, qty: [1, 1] },
        { id: "orb_t2", chance: 0.003, qty: [1, 1] },
        { id: "ring_t2", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.004, qty: [1, 1] },
        { id: "earring_t2", chance: 0.004, qty: [1, 1] }
      ]
    },
    forest_lord: {
      name: "Володар Темного лісу",
      humanoid: true,
      weapons: ["staff", "sword", "axe"],
      range: 2, move: { name: "Гнів лісу", mult: 1.65, chance: 0.25 },
      verb: "б'є",
      level: 25,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 4696, mp: 700, attack: 527, magic: 346, defense: 89, magicDefense: 89, crit: 21, blockPhys: 15, blockMag: 14 },
      skills: [
        { kind: "magic", name: "Темне коріння", mp: 60, mult: 2.4 },
        { kind: "heal", name: "Подих лісу", mp: 70, healPct: 0.1 },
        { kind: "stun", name: "Обійми коріння", mp: 45, mult: 1.1 }
      ],
      exp: 9375,
      gold: [285, 550],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "sword_t2", chance: 0.04, qty: [1, 1] },
        { id: "dagger_t2", chance: 0.04, qty: [1, 1] },
        { id: "axe_t2", chance: 0.04, qty: [1, 1] },
        { id: "bow_t2", chance: 0.04, qty: [1, 1] },
        { id: "staff_t2", chance: 0.04, qty: [1, 1] },
        { id: "shield_t2", chance: 0.04, qty: [1, 1] },
        { id: "quiver_t2", chance: 0.04, qty: [1, 1] },
        { id: "orb_t2", chance: 0.04, qty: [1, 1] },
        { id: "knife_t2", chance: 0.04, qty: [1, 1] },
        { id: "leather_head", chance: 0.04, qty: [1, 1] },
        { id: "leather_chest", chance: 0.04, qty: [1, 1] },
        { id: "leather_legs", chance: 0.04, qty: [1, 1] },
        { id: "leather_hands", chance: 0.04, qty: [1, 1] },
        { id: "leather_feet", chance: 0.04, qty: [1, 1] },
        { id: "ring_t2", chance: 0.04, qty: [1, 1] },
        { id: "amulet_t2", chance: 0.04, qty: [1, 1] },
        { id: "earring_t2", chance: 0.04, qty: [1, 1] }
      ]
    },
    // ---------- АЛЬВГЕЙМ (світ 3, 25–30 рівень) — за коренем Іггдрасиля в Серці Темного лісу; картинки: assets/images/enemies/<id>.webp ----------
    alf_wisp: {
      name: "Блукаючий вогник",
      range: 2, move: { name: "Сліпучий спалах", mult: 1.4, chance: 0.25 },
      verb: "обпікає",
      level: 25,
      role: "caster",
      stats: { hp: 4239, mp: 894, attack: 398, magic: 531, defense: 64, magicDefense: 126, crit: 16, dodge: 19, blockMag: 15 },
      spell: { name: "Блудне світло", mp: 22, mult: 1.35, chance: 0.4 },
      exp: 1875,
      gold: [57, 110],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] }
      ]
    },
    alf_moth: {
      name: "Сутінковий мотиль",
      range: 2, move: { name: "Сріблястий пилок", mult: 1.45, chance: 0.25 },
      verb: "б'є крилами",
      level: 25,
      role: "melee",
      stats: { hp: 4240, mp: 0, attack: 722, defense: 71, magicDefense: 84, crit: 24, dodge: 19 },
      exp: 1875,
      gold: [57, 110],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] }
      ]
    },
    alf_feral_archer: {
      name: "Здичавілий альв-лучник",
      humanoid: true,
      weapons: ["bow"],
      range: 3, move: { name: "Подвійна стріла", mult: 1.5, chance: 0.25 },
      verb: "стріляє",
      level: 26,
      role: "ranged",
      stats: { hp: 3565, mp: 0, attack: 729, defense: 58, magicDefense: 77, crit: 27, dodge: 22 },
      exp: 2028,
      gold: [60, 114],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "ash_wood", chance: 0.02, qty: [1, 1] }
      ]
    },
    alf_boss_moths: {
      name: "Матір мотилів",
      range: 2, move: { name: "Удар крил", mult: 1.6, chance: 0.25 },
      verb: "шмагає крилами",
      level: 27,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 10230, mp: 1577, attack: 849, magic: 1005, defense: 84, magicDefense: 140, crit: 15, dodge: 21, blockPhys: 16, blockMag: 14 },
      skills: [
        { kind: "magic", name: "Отруйний рій", mp: 45, mult: 2.1 },
        { kind: "stun", name: "Сріблястий кокон", mp: 35, mult: 1.0 },
        { kind: "heal", name: "Нектар місяця", mp: 55, healPct: 0.12 }
      ],
      exp: 10935,
      gold: [308, 594],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "iron_head", chance: 0.04, qty: [1, 1] },
        { id: "iron_chest", chance: 0.04, qty: [1, 1] },
        { id: "iron_legs", chance: 0.04, qty: [1, 1] },
        { id: "iron_hands", chance: 0.04, qty: [1, 1] },
        { id: "iron_feet", chance: 0.04, qty: [1, 1] },
        { id: "sword_t3", chance: 0.04, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.04, qty: [1, 1] },
        { id: "axe_t3", chance: 0.04, qty: [1, 1] },
        { id: "bow_t3", chance: 0.04, qty: [1, 1] },
        { id: "staff_t3", chance: 0.04, qty: [1, 1] },
        { id: "shield_t3", chance: 0.04, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.04, qty: [1, 1] },
        { id: "orb_t3", chance: 0.04, qty: [1, 1] },
        { id: "knife_t3", chance: 0.04, qty: [1, 1] },
        { id: "ring_t3", chance: 0.04, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.04, qty: [1, 1] },
        { id: "earring_t3", chance: 0.04, qty: [1, 1] },
        { id: "flax", chance: 0.25, qty: [1, 3] },
        { id: "gem", chance: 0.25, qty: [1, 3] }
      ]
    },
    alf_nixie: {
      name: "Нікса",
      range: 2, move: { name: "Обійми глибини", mult: 1.45, chance: 0.25 },
      verb: "хапає",
      level: 26,
      role: "healer",
      stats: { hp: 5440, mp: 1686, attack: 418, magic: 615, defense: 65, magicDefense: 120, crit: 10, blockMag: 15 },
      spell: { name: "Крижана хвиля", mp: 24, mult: 1.4, chance: 0.4 },
      exp: 2028,
      gold: [60, 114],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] }
      ]
    },
    alf_reflection: {
      name: "Тіньове відображення",
      humanoid: true,
      weapons: ["sword", "dagger"],
      range: 1, move: { name: "Дзеркальний удар", mult: 1.55, chance: 0.25 },
      verb: "б'є",
      level: 26,
      role: "melee",
      stats: { hp: 3883, mp: 0, attack: 674, defense: 73, magicDefense: 86, crit: 25, dodge: 20 },
      exp: 2028,
      gold: [60, 114],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] }
      ]
    },
    alf_crystal_toad: {
      name: "Кришталева жаба",
      range: 1, move: { name: "Кришталевий язик", mult: 1.5, chance: 0.25 },
      verb: "кусає",
      level: 27,
      role: "tank",
      stats: { hp: 7209, mp: 0, attack: 616, defense: 134, magicDefense: 110, crit: 16, blockPhys: 16 },
      exp: 2187,
      gold: [62, 119],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "glass", chance: 0.02, qty: [1, 1] }
      ]
    },
    alf_boss_necken: {
      name: "Неккен, володар озера",
      range: 3, move: { name: "Удар смичком", mult: 1.55, chance: 0.25 },
      verb: "б'є смичком",
      level: 28,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 10058, mp: 1576, attack: 827, magic: 975, defense: 86, magicDefense: 144, crit: 15, dodge: 22, blockPhys: 16, blockMag: 14 },
      skills: [
        { kind: "magic", name: "Пісня глибин", mp: 50, mult: 2.3 },
        { kind: "stun", name: "Зачарована мелодія", mp: 40, mult: 1.0 },
        { kind: "heal", name: "Вода життя", mp: 60, healPct: 0.12 }
      ],
      exp: 11760,
      gold: [319, 616],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "iron_head", chance: 0.04, qty: [1, 1] },
        { id: "iron_chest", chance: 0.04, qty: [1, 1] },
        { id: "iron_legs", chance: 0.04, qty: [1, 1] },
        { id: "iron_hands", chance: 0.04, qty: [1, 1] },
        { id: "iron_feet", chance: 0.04, qty: [1, 1] },
        { id: "sword_t3", chance: 0.04, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.04, qty: [1, 1] },
        { id: "axe_t3", chance: 0.04, qty: [1, 1] },
        { id: "bow_t3", chance: 0.04, qty: [1, 1] },
        { id: "staff_t3", chance: 0.04, qty: [1, 1] },
        { id: "shield_t3", chance: 0.04, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.04, qty: [1, 1] },
        { id: "orb_t3", chance: 0.04, qty: [1, 1] },
        { id: "knife_t3", chance: 0.04, qty: [1, 1] },
        { id: "ring_t3", chance: 0.04, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.04, qty: [1, 1] },
        { id: "earring_t3", chance: 0.04, qty: [1, 1] },
        { id: "glass", chance: 0.25, qty: [1, 3] },
        { id: "lapis", chance: 0.25, qty: [1, 3] },
        { id: "pearl", chance: 0.25, qty: [1, 2] },
        { id: "amber", chance: 0.15, qty: [1, 1] }
      ]
    },
    alf_thornbush: {
      name: "Ожилий терен",
      range: 2, move: { name: "Колючі батоги", mult: 1.5, chance: 0.25 },
      verb: "шмагає",
      level: 27,
      role: "tank",
      stats: { hp: 7118, mp: 0, attack: 608, defense: 134, magicDefense: 110, crit: 16, blockPhys: 16 },
      exp: 2187,
      gold: [62, 119],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "oak_wood", chance: 0.02, qty: [1, 1] }
      ]
    },
    alf_poison_bloom: {
      name: "Отруйна квітка",
      range: 3, move: { name: "Укус пелюсток", mult: 1.4, chance: 0.25 },
      verb: "плює отрутою",
      level: 27,
      role: "caster",
      stats: { hp: 4291, mp: 935, attack: 416, magic: 551, defense: 67, magicDefense: 132, crit: 16, blockMag: 16 },
      spell: { name: "Отруйний пилок", mp: 25, mult: 1.4, chance: 0.45 },
      exp: 2187,
      gold: [62, 119],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] }
      ]
    },
    alf_gardener: {
      name: "Зачарований альв-садівник",
      humanoid: true,
      weapons: ["dagger", "axe"],
      range: 1, move: { name: "Ножиці-клинки", mult: 1.55, chance: 0.25 },
      verb: "ріже",
      level: 28,
      role: "melee",
      stats: { hp: 3765, mp: 0, attack: 674, defense: 76, magicDefense: 90, crit: 26, dodge: 21 },
      exp: 2352,
      gold: [64, 123],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] }
      ]
    },
    alf_boss_gardener: {
      name: "Тлінний садівник",
      range: 1, move: { name: "Іржава коса", mult: 1.7, chance: 0.25 },
      verb: "косить",
      level: 29,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 12334, mp: 1121, attack: 983, magic: 754, defense: 176, magicDefense: 122, crit: 16, dodge: 11, blockPhys: 16, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Тлінні спори", mp: 50, mult: 2.2 },
        { kind: "stun", name: "Коріння тліну", mp: 40, mult: 1.1 },
        { kind: "heal", name: "Гнилий сік", mp: 60, healPct: 0.1 }
      ],
      exp: 12615,
      gold: [331, 638],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "iron_head", chance: 0.04, qty: [1, 1] },
        { id: "iron_chest", chance: 0.04, qty: [1, 1] },
        { id: "iron_legs", chance: 0.04, qty: [1, 1] },
        { id: "iron_hands", chance: 0.04, qty: [1, 1] },
        { id: "iron_feet", chance: 0.04, qty: [1, 1] },
        { id: "sword_t3", chance: 0.04, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.04, qty: [1, 1] },
        { id: "axe_t3", chance: 0.04, qty: [1, 1] },
        { id: "bow_t3", chance: 0.04, qty: [1, 1] },
        { id: "staff_t3", chance: 0.04, qty: [1, 1] },
        { id: "shield_t3", chance: 0.04, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.04, qty: [1, 1] },
        { id: "orb_t3", chance: 0.04, qty: [1, 1] },
        { id: "knife_t3", chance: 0.04, qty: [1, 1] },
        { id: "ring_t3", chance: 0.04, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.04, qty: [1, 1] },
        { id: "earring_t3", chance: 0.04, qty: [1, 1] },
        { id: "oak_wood", chance: 0.25, qty: [1, 3] },
        { id: "onyx", chance: 0.25, qty: [1, 3] },
        { id: "yew_wood", chance: 0.25, qty: [1, 3] },
        { id: "amber", chance: 0.1, qty: [1, 1] }
      ]
    },
    alf_elf_mage: {
      name: "Альв-маг",
      humanoid: true,
      weapons: ["staff"],
      range: 3, move: { name: "Удар посохом", mult: 1.5, chance: 0.25 },
      verb: "б'є посохом",
      level: 27,
      role: "caster",
      stats: { hp: 3890, mp: 848, attack: 377, magic: 500, defense: 67, magicDefense: 132, crit: 16, blockMag: 16 },
      spell: { name: "Промінь світанку", mp: 26, mult: 1.45, chance: 0.45 },
      exp: 2187,
      gold: [62, 119],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "gem", chance: 0.02, qty: [1, 1] }
      ]
    },
    alf_light_sentinel: {
      name: "Світляний вартовий",
      range: 1, move: { name: "Спис світла", mult: 1.55, chance: 0.25 },
      verb: "б'є списом",
      level: 28,
      role: "tank",
      stats: { hp: 7410, mp: 0, attack: 644, defense: 137, magicDefense: 113, crit: 17, blockPhys: 16 },
      exp: 2352,
      gold: [64, 123],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "pearl", chance: 0.01, qty: [1, 1] }
      ]
    },
    alf_herald_owl: {
      name: "Сова-вісник",
      range: 2, move: { name: "Рунний дзьоб", mult: 1.5, chance: 0.25 },
      verb: "дзьобає",
      level: 27,
      role: "ranged",
      stats: { hp: 4065, mp: 0, attack: 843, defense: 59, magicDefense: 79, crit: 28, dodge: 22 },
      exp: 2187,
      gold: [62, 119],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] }
      ]
    },
    alf_boss_high_mage: {
      name: "Верховний маг ліосальвів",
      range: 3, move: { name: "Посох сонця", mult: 1.55, chance: 0.25 },
      verb: "б'є посохом",
      level: 29,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 9772, mp: 1554, attack: 828, magic: 981, defense: 88, magicDefense: 147, crit: 16, dodge: 23, blockPhys: 16, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Сонячне коло", mp: 55, mult: 2.5 },
        { kind: "stun", name: "Руни сліпоти", mp: 40, mult: 1.0 },
        { kind: "heal", name: "Ореол світанку", mp: 65, healPct: 0.12 }
      ],
      exp: 12615,
      gold: [331, 638],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "iron_head", chance: 0.04, qty: [1, 1] },
        { id: "iron_chest", chance: 0.04, qty: [1, 1] },
        { id: "iron_legs", chance: 0.04, qty: [1, 1] },
        { id: "iron_hands", chance: 0.04, qty: [1, 1] },
        { id: "iron_feet", chance: 0.04, qty: [1, 1] },
        { id: "sword_t3", chance: 0.04, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.04, qty: [1, 1] },
        { id: "axe_t3", chance: 0.04, qty: [1, 1] },
        { id: "bow_t3", chance: 0.04, qty: [1, 1] },
        { id: "staff_t3", chance: 0.04, qty: [1, 1] },
        { id: "shield_t3", chance: 0.04, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.04, qty: [1, 1] },
        { id: "orb_t3", chance: 0.04, qty: [1, 1] },
        { id: "knife_t3", chance: 0.04, qty: [1, 1] },
        { id: "ring_t3", chance: 0.04, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.04, qty: [1, 1] },
        { id: "earring_t3", chance: 0.04, qty: [1, 1] },
        { id: "gem", chance: 0.25, qty: [1, 3] },
        { id: "gold_ore", chance: 0.25, qty: [1, 3] },
        { id: "amber", chance: 0.25, qty: [1, 2] },
        { id: "platinum_ore", chance: 0.15, qty: [1, 2] }
      ]
    },
    alf_wild_boar: {
      name: "Дикий вепр",
      range: 1, move: { name: "Удар іклами", mult: 1.6, chance: 0.25 },
      verb: "б'є іклами",
      level: 28,
      role: "tank",
      stats: { hp: 7396, mp: 0, attack: 643, defense: 137, magicDefense: 113, crit: 17, blockPhys: 16 },
      exp: 2352,
      gold: [64, 123],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "leather_strap", chance: 0.02, qty: [1, 1] }
      ]
    },
    alf_elf_knight: {
      name: "Альв-лицар",
      humanoid: true,
      weapons: ["sword", "axe"],
      range: 1, move: { name: "Удар щитом", mult: 1.5, chance: 0.25 },
      verb: "б'є",
      level: 29,
      role: "tank",
      stats: { hp: 6380, mp: 0, attack: 563, defense: 139, magicDefense: 115, crit: 17, dodge: 11, blockPhys: 16 },
      exp: 2523,
      gold: [67, 128],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "sword_t4", chance: 0.0009, qty: [1, 1] },
        { id: "axe_t4", chance: 0.0009, qty: [1, 1] },
        { id: "dagger_t4", chance: 0.0009, qty: [1, 1] },
        { id: "bow_t4", chance: 0.0009, qty: [1, 1] },
        { id: "staff_t4", chance: 0.0009, qty: [1, 1] },
        { id: "shield_t4", chance: 0.0009, qty: [1, 1] },
        { id: "knife_t4", chance: 0.0009, qty: [1, 1] },
        { id: "quiver_t4", chance: 0.0009, qty: [1, 1] },
        { id: "orb_t4", chance: 0.0009, qty: [1, 1] },
        { id: "steel_head", chance: 0.0012, qty: [1, 1] },
        { id: "steel_chest", chance: 0.0012, qty: [1, 1] },
        { id: "steel_legs", chance: 0.0012, qty: [1, 1] },
        { id: "steel_hands", chance: 0.0012, qty: [1, 1] },
        { id: "steel_feet", chance: 0.0012, qty: [1, 1] },
        { id: "ring_t4", chance: 0.0012, qty: [1, 1] },
        { id: "amulet_t4", chance: 0.0012, qty: [1, 1] },
        { id: "earring_t4", chance: 0.0012, qty: [1, 1] },
        { id: "iron_ore", chance: 0.02, qty: [1, 1] },
        { id: "platinum_ore", chance: 0.015, qty: [1, 1] }
      ]
    },
    alf_huntsman: {
      name: "Ловчий",
      humanoid: true,
      weapons: ["bow", "sword"],
      range: 1, move: { name: "Мисливський постріл", mult: 1.5, chance: 0.25 },
      verb: "б'є",
      level: 28,
      role: "melee",
      stats: { hp: 3749, mp: 0, attack: 671, defense: 76, magicDefense: 90, crit: 26, dodge: 21 },
      exp: 2352,
      gold: [64, 123],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "seal_leather", chance: 0.015, qty: [1, 1] }
      ]
    },
    alf_boss_gullinbursti: {
      name: "Тінь Гуллінбурсті",
      range: 1, move: { name: "Золоті ікла", mult: 1.75, chance: 0.25 },
      verb: "б'є іклами",
      level: 30,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 8553, mp: 1382, attack: 895, magic: 579, defense: 100, magicDefense: 100, crit: 25, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Сонячна грива", mp: 55, mult: 2.3 },
        { kind: "stun", name: "Таран", mp: 40, mult: 1.2 },
        { kind: "heal", name: "Світло Фрейра", mp: 65, healPct: 0.1 }
      ],
      exp: 13500,
      gold: [342, 660],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "iron_head", chance: 0.04, qty: [1, 1] },
        { id: "iron_chest", chance: 0.04, qty: [1, 1] },
        { id: "iron_legs", chance: 0.04, qty: [1, 1] },
        { id: "iron_hands", chance: 0.04, qty: [1, 1] },
        { id: "iron_feet", chance: 0.04, qty: [1, 1] },
        { id: "sword_t3", chance: 0.04, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.04, qty: [1, 1] },
        { id: "axe_t3", chance: 0.04, qty: [1, 1] },
        { id: "bow_t3", chance: 0.04, qty: [1, 1] },
        { id: "staff_t3", chance: 0.04, qty: [1, 1] },
        { id: "shield_t3", chance: 0.04, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.04, qty: [1, 1] },
        { id: "orb_t3", chance: 0.04, qty: [1, 1] },
        { id: "knife_t3", chance: 0.04, qty: [1, 1] },
        { id: "ring_t3", chance: 0.04, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.04, qty: [1, 1] },
        { id: "earring_t3", chance: 0.04, qty: [1, 1] },
        { id: "sword_t4", chance: 0.01, qty: [1, 1] },
        { id: "axe_t4", chance: 0.01, qty: [1, 1] },
        { id: "dagger_t4", chance: 0.01, qty: [1, 1] },
        { id: "bow_t4", chance: 0.01, qty: [1, 1] },
        { id: "staff_t4", chance: 0.01, qty: [1, 1] },
        { id: "shield_t4", chance: 0.01, qty: [1, 1] },
        { id: "knife_t4", chance: 0.01, qty: [1, 1] },
        { id: "quiver_t4", chance: 0.01, qty: [1, 1] },
        { id: "orb_t4", chance: 0.01, qty: [1, 1] },
        { id: "steel_head", chance: 0.01, qty: [1, 1] },
        { id: "steel_chest", chance: 0.01, qty: [1, 1] },
        { id: "steel_legs", chance: 0.01, qty: [1, 1] },
        { id: "steel_hands", chance: 0.01, qty: [1, 1] },
        { id: "steel_feet", chance: 0.01, qty: [1, 1] },
        { id: "ring_t4", chance: 0.01, qty: [1, 1] },
        { id: "amulet_t4", chance: 0.01, qty: [1, 1] },
        { id: "earring_t4", chance: 0.01, qty: [1, 1] },
        { id: "gold_ore", chance: 0.25, qty: [1, 3] },
        { id: "leather_strap", chance: 0.25, qty: [1, 3] },
        { id: "seal_leather", chance: 0.25, qty: [1, 3] },
        { id: "yew_wood", chance: 0.15, qty: [1, 2] }
      ]
    },
    alf_dead_giant: {
      name: "Мертвий йотун-поплічник",
      undead: true,
      range: 1, move: { name: "Кам'яна палиця", mult: 1.6, chance: 0.25 },
      verb: "б'є палицею",
      level: 30,
      role: "tank",
      stats: { hp: 7545, mp: 0, attack: 677, defense: 142, magicDefense: 118, crit: 18, blockPhys: 16 },
      exp: 2700,
      gold: [69, 132],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "sword_t4", chance: 0.0018, qty: [1, 1] },
        { id: "axe_t4", chance: 0.0018, qty: [1, 1] },
        { id: "dagger_t4", chance: 0.0018, qty: [1, 1] },
        { id: "bow_t4", chance: 0.0018, qty: [1, 1] },
        { id: "staff_t4", chance: 0.0018, qty: [1, 1] },
        { id: "shield_t4", chance: 0.0018, qty: [1, 1] },
        { id: "knife_t4", chance: 0.0018, qty: [1, 1] },
        { id: "quiver_t4", chance: 0.0018, qty: [1, 1] },
        { id: "orb_t4", chance: 0.0018, qty: [1, 1] },
        { id: "steel_head", chance: 0.0024, qty: [1, 1] },
        { id: "steel_chest", chance: 0.0024, qty: [1, 1] },
        { id: "steel_legs", chance: 0.0024, qty: [1, 1] },
        { id: "steel_hands", chance: 0.0024, qty: [1, 1] },
        { id: "steel_feet", chance: 0.0024, qty: [1, 1] },
        { id: "ring_t4", chance: 0.0024, qty: [1, 1] },
        { id: "amulet_t4", chance: 0.0024, qty: [1, 1] },
        { id: "earring_t4", chance: 0.0024, qty: [1, 1] },
        { id: "flint", chance: 0.02, qty: [1, 1] },
        { id: "yew_wood", chance: 0.02, qty: [1, 2] }
      ]
    },
    alf_stag_spirit: {
      name: "Дух оленя",
      undead: true,
      range: 2, move: { name: "Удар рогами", mult: 1.5, chance: 0.25 },
      verb: "б'є рогами",
      level: 29,
      role: "healer",
      stats: { hp: 4820, mp: 1568, attack: 391, magic: 564, defense: 70, magicDefense: 129, crit: 11, blockMag: 16 },
      spell: { name: "Фіолетовий вогонь", mp: 27, mult: 1.45, chance: 0.45 },
      exp: 2523,
      gold: [67, 128],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "sword_t4", chance: 0.0009, qty: [1, 1] },
        { id: "axe_t4", chance: 0.0009, qty: [1, 1] },
        { id: "dagger_t4", chance: 0.0009, qty: [1, 1] },
        { id: "bow_t4", chance: 0.0009, qty: [1, 1] },
        { id: "staff_t4", chance: 0.0009, qty: [1, 1] },
        { id: "shield_t4", chance: 0.0009, qty: [1, 1] },
        { id: "knife_t4", chance: 0.0009, qty: [1, 1] },
        { id: "quiver_t4", chance: 0.0009, qty: [1, 1] },
        { id: "orb_t4", chance: 0.0009, qty: [1, 1] },
        { id: "steel_head", chance: 0.0012, qty: [1, 1] },
        { id: "steel_chest", chance: 0.0012, qty: [1, 1] },
        { id: "steel_legs", chance: 0.0012, qty: [1, 1] },
        { id: "steel_hands", chance: 0.0012, qty: [1, 1] },
        { id: "steel_feet", chance: 0.0012, qty: [1, 1] },
        { id: "ring_t4", chance: 0.0012, qty: [1, 1] },
        { id: "amulet_t4", chance: 0.0012, qty: [1, 1] },
        { id: "earring_t4", chance: 0.0012, qty: [1, 1] },
        { id: "amber", chance: 0.01, qty: [1, 1] }
      ]
    },
    alf_rot_warrior: {
      name: "Тлінний альв-воїн",
      humanoid: true,
      weapons: ["sword", "axe"],
      undead: true,
      range: 1, move: { name: "Тлінний удар", mult: 1.55, chance: 0.25 },
      verb: "б'є",
      level: 29,
      role: "melee",
      stats: { hp: 4199, mp: 0, attack: 765, defense: 77, magicDefense: 92, crit: 27, dodge: 21 },
      exp: 2523,
      gold: [67, 128],
      loot: [
        { id: "potion_hp_medium", chance: 0.1, qty: [1, 2] },
        { id: "potion_mp_medium", chance: 0.07, qty: [1, 2] },
        { id: "potion_hp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.07, qty: [1, 1] },
        { id: "potion_magic", chance: 0.015, qty: [1, 1] },
        { id: "iron_head", chance: 0.004, qty: [1, 1] },
        { id: "iron_chest", chance: 0.004, qty: [1, 1] },
        { id: "iron_legs", chance: 0.004, qty: [1, 1] },
        { id: "iron_hands", chance: 0.004, qty: [1, 1] },
        { id: "iron_feet", chance: 0.004, qty: [1, 1] },
        { id: "sword_t3", chance: 0.003, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.003, qty: [1, 1] },
        { id: "axe_t3", chance: 0.003, qty: [1, 1] },
        { id: "bow_t3", chance: 0.003, qty: [1, 1] },
        { id: "staff_t3", chance: 0.003, qty: [1, 1] },
        { id: "shield_t3", chance: 0.003, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.003, qty: [1, 1] },
        { id: "orb_t3", chance: 0.003, qty: [1, 1] },
        { id: "knife_t3", chance: 0.003, qty: [1, 1] },
        { id: "ring_t3", chance: 0.004, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.004, qty: [1, 1] },
        { id: "earring_t3", chance: 0.004, qty: [1, 1] },
        { id: "sword_t4", chance: 0.0009, qty: [1, 1] },
        { id: "axe_t4", chance: 0.0009, qty: [1, 1] },
        { id: "dagger_t4", chance: 0.0009, qty: [1, 1] },
        { id: "bow_t4", chance: 0.0009, qty: [1, 1] },
        { id: "staff_t4", chance: 0.0009, qty: [1, 1] },
        { id: "shield_t4", chance: 0.0009, qty: [1, 1] },
        { id: "knife_t4", chance: 0.0009, qty: [1, 1] },
        { id: "quiver_t4", chance: 0.0009, qty: [1, 1] },
        { id: "orb_t4", chance: 0.0009, qty: [1, 1] },
        { id: "steel_head", chance: 0.0012, qty: [1, 1] },
        { id: "steel_chest", chance: 0.0012, qty: [1, 1] },
        { id: "steel_legs", chance: 0.0012, qty: [1, 1] },
        { id: "steel_hands", chance: 0.0012, qty: [1, 1] },
        { id: "steel_feet", chance: 0.0012, qty: [1, 1] },
        { id: "ring_t4", chance: 0.0012, qty: [1, 1] },
        { id: "amulet_t4", chance: 0.0012, qty: [1, 1] },
        { id: "earring_t4", chance: 0.0012, qty: [1, 1] },
        { id: "iron_ore", chance: 0.02, qty: [1, 1] },
        { id: "seal_leather", chance: 0.015, qty: [1, 1] }
      ]
    },
    alf_boss_beli: {
      name: "Белі",
      range: 1, move: { name: "Бронзова сокира", mult: 1.8, chance: 0.25 },
      verb: "рубає сокирою",
      level: 30,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 12972, mp: 1198, attack: 1242, magic: 947, defense: 179, magicDefense: 125, crit: 16, dodge: 12, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Дим Хелли", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Удар велетня", mp: 45, mult: 1.3 },
        { kind: "heal", name: "Рана від рогу", mp: 70, healPct: 0.1 }
      ],
      exp: 17550,
      gold: [445, 858],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "iron_head", chance: 0.04, qty: [1, 1] },
        { id: "iron_chest", chance: 0.04, qty: [1, 1] },
        { id: "iron_legs", chance: 0.04, qty: [1, 1] },
        { id: "iron_hands", chance: 0.04, qty: [1, 1] },
        { id: "iron_feet", chance: 0.04, qty: [1, 1] },
        { id: "sword_t3", chance: 0.04, qty: [1, 1] },
        { id: "dagger_t3", chance: 0.04, qty: [1, 1] },
        { id: "axe_t3", chance: 0.04, qty: [1, 1] },
        { id: "bow_t3", chance: 0.04, qty: [1, 1] },
        { id: "staff_t3", chance: 0.04, qty: [1, 1] },
        { id: "shield_t3", chance: 0.04, qty: [1, 1] },
        { id: "quiver_t3", chance: 0.04, qty: [1, 1] },
        { id: "orb_t3", chance: 0.04, qty: [1, 1] },
        { id: "knife_t3", chance: 0.04, qty: [1, 1] },
        { id: "ring_t3", chance: 0.04, qty: [1, 1] },
        { id: "amulet_t3", chance: 0.04, qty: [1, 1] },
        { id: "earring_t3", chance: 0.04, qty: [1, 1] },
        { id: "sword_t4", chance: 0.01, qty: [1, 1] },
        { id: "axe_t4", chance: 0.01, qty: [1, 1] },
        { id: "dagger_t4", chance: 0.01, qty: [1, 1] },
        { id: "bow_t4", chance: 0.01, qty: [1, 1] },
        { id: "staff_t4", chance: 0.01, qty: [1, 1] },
        { id: "shield_t4", chance: 0.01, qty: [1, 1] },
        { id: "knife_t4", chance: 0.01, qty: [1, 1] },
        { id: "quiver_t4", chance: 0.01, qty: [1, 1] },
        { id: "orb_t4", chance: 0.01, qty: [1, 1] },
        { id: "steel_head", chance: 0.01, qty: [1, 1] },
        { id: "steel_chest", chance: 0.01, qty: [1, 1] },
        { id: "steel_legs", chance: 0.01, qty: [1, 1] },
        { id: "steel_hands", chance: 0.01, qty: [1, 1] },
        { id: "steel_feet", chance: 0.01, qty: [1, 1] },
        { id: "ring_t4", chance: 0.01, qty: [1, 1] },
        { id: "amulet_t4", chance: 0.01, qty: [1, 1] },
        { id: "earring_t4", chance: 0.01, qty: [1, 1] },
        { id: "iron_ingot", chance: 0.25, qty: [1, 3] },
        { id: "gold_ingot", chance: 0.25, qty: [1, 3] },
        { id: "gem", chance: 0.25, qty: [1, 3] },
        { id: "platinum_ore", chance: 0.25, qty: [1, 3] },
        { id: "pearl", chance: 0.15, qty: [1, 2] }
      ]
    },

    // ---------- ВАНАГЕЙМ (світ 4) — вороги 31–35 рівня ----------
    // Зі світу 4 спорядження з ворогів не падає (worlds.js → CRAFT_ONLY_FROM) — лише матеріали 4 виду, зілля, ключі й артефакти.
    // Баланс — як в Альвгеймі: герой із професією у повному сеті свого рівня перемагає ≈80%, босів — ≈45%.
    van_draugr_sailor: {
      name: "Драугр-мореплавець",
      humanoid: true,
      weapons: ["sword", "axe"],
      undead: true,
      range: 1, move: { name: "Іржава сокира", mult: 1.55, chance: 0.25 },
      verb: "рубає",
      level: 31,
      role: "melee",
      stats: { hp: 6664, mp: 0, attack: 1196, defense: 111, magicDefense: 132, crit: 27, dodge: 22 },
      exp: 2883,
      gold: [71, 136],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "seal_leather", chance: 0.04, qty: [1, 1] },
        { id: "iron_ore", chance: 0.03, qty: [1, 1] }
      ]
    },
    van_shore_crab: {
      name: "Береговий краб",
      range: 1, move: { name: "Удар клешнею", mult: 1.5, chance: 0.25 },
      verb: "щипає клешнею",
      level: 31,
      role: "tank",
      stats: { hp: 11115, mp: 0, attack: 959, defense: 200, magicDefense: 165, crit: 17, blockPhys: 17 },
      exp: 2883,
      gold: [71, 136],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "seal_leather", chance: 0.04, qty: [1, 1] },
        { id: "iron_ore", chance: 0.03, qty: [1, 1] }
      ]
    },
    van_gull_harpy: {
      name: "Чайка-гарпія",
      range: 2, move: { name: "Пікірування", mult: 1.5, chance: 0.25 },
      verb: "б'є кігтями",
      level: 31,
      role: "ranged",
      stats: { hp: 6793, mp: 0, attack: 1394, defense: 87, magicDefense: 115, crit: 29, dodge: 23 },
      exp: 2883,
      gold: [71, 136],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "seal_leather", chance: 0.04, qty: [1, 1] },
        { id: "iron_ore", chance: 0.03, qty: [1, 1] }
      ]
    },
    van_boss_draugr_captain: {
      name: "Капітан драугрів",
      undead: true,
      range: 1, move: { name: "Абордажна сокира", mult: 1.7, chance: 0.25 },
      verb: "рубає сокирою",
      level: 32,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 20485, mp: 1333, attack: 1644, magic: 1256, defense: 259, magicDefense: 181, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Могильний туман", mp: 60, mult: 2.3 },
        { kind: "stun", name: "Удар якорем", mp: 45, mult: 1.1 },
        { kind: "heal", name: "Кров утоплених", mp: 70, healPct: 0.1 }
      ],
      exp: 15360,
      gold: [365, 704],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "platinum_ingot", chance: 0.25, qty: [1, 3] },
        { id: "gem", chance: 0.25, qty: [1, 3] },
        { id: "seal_leather", chance: 0.3, qty: [1, 3] }
      ]
    },
    van_volva_witch: {
      name: "Відьма-вьольва",
      humanoid: true,
      weapons: ["staff"],
      range: 3, move: { name: "Удар посохом", mult: 1.45, chance: 0.25 },
      verb: "б'є посохом",
      level: 32,
      role: "caster",
      stats: { hp: 6615, mp: 1037, attack: 645, magic: 855, defense: 101, magicDefense: 195, crit: 17, blockMag: 17 },
      spell: { name: "Прокляття сейду", mp: 26, mult: 1.45, chance: 0.4 },
      exp: 3072,
      gold: [74, 141],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "yew_wood", chance: 0.03, qty: [1, 1] },
        { id: "amber", chance: 0.015, qty: [1, 1] }
      ]
    },
    van_toad_shapeshifter: {
      name: "Жаба-перевертень",
      range: 1, move: { name: "Липкий язик", mult: 1.5, chance: 0.25 },
      verb: "б'є язиком",
      level: 31,
      role: "tank",
      stats: { hp: 12391, mp: 0, attack: 1070, defense: 200, magicDefense: 165, crit: 17, blockPhys: 17 },
      exp: 2883,
      gold: [71, 136],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "yew_wood", chance: 0.03, qty: [1, 1] },
        { id: "amber", chance: 0.015, qty: [1, 1] }
      ]
    },
    van_marsh_light: {
      name: "Болотяний блудний вогонь",
      range: 2, move: { name: "Болотяний спалах", mult: 1.4, chance: 0.25 },
      verb: "обпікає",
      level: 31,
      role: "caster",
      stats: { hp: 7664, mp: 1201, attack: 748, magic: 991, defense: 99, magicDefense: 192, crit: 17, blockMag: 17 },
      spell: { name: "Блудний вогонь", mp: 24, mult: 1.4, chance: 0.4 },
      exp: 2883,
      gold: [71, 136],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "yew_wood", chance: 0.03, qty: [1, 1] },
        { id: "amber", chance: 0.015, qty: [1, 1] }
      ]
    },
    van_boss_the_old_volva: {
      name: "Стара вьольва",
      range: 3, move: { name: "Кістяний посох", mult: 1.55, chance: 0.25 },
      verb: "б'є посохом",
      level: 33,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 15834, mp: 1776, attack: 1455, magic: 1714, defense: 129, magicDefense: 216, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Пророцтво загибелі", mp: 60, mult: 2.4 },
        { kind: "stun", name: "Сейдові пута", mp: 45, mult: 1.0 },
        { kind: "heal", name: "Зілля з мочарів", mp: 70, healPct: 0.12 }
      ],
      exp: 16335,
      gold: [376, 726],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "platinum_ingot", chance: 0.25, qty: [1, 3] },
        { id: "gem", chance: 0.25, qty: [1, 3] },
        { id: "yew_wood", chance: 0.3, qty: [1, 3] }
      ]
    },
    van_enchanted_beast: {
      name: "Зачарований звір",
      range: 1, move: { name: "Скажений стрибок", mult: 1.55, chance: 0.25 },
      verb: "рве іклами",
      level: 32,
      role: "melee",
      stats: { hp: 7342, mp: 0, attack: 1317, defense: 112, magicDefense: 133, crit: 27, dodge: 22 },
      exp: 3072,
      gold: [74, 141],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "yew_wood", chance: 0.04, qty: [1, 1] },
        { id: "amber", chance: 0.02, qty: [1, 1] }
      ]
    },
    van_eavesdropping_shade: {
      name: "Підслуховувач-тінь",
      range: 2, move: { name: "Дотик тіні", mult: 1.4, chance: 0.25 },
      verb: "б'є тінню",
      level: 32,
      role: "caster",
      stats: { hp: 8072, mp: 1266, attack: 787, magic: 1043, defense: 101, magicDefense: 195, crit: 17, blockMag: 17 },
      spell: { name: "Украдене слово", mp: 26, mult: 1.45, chance: 0.4 },
      exp: 3072,
      gold: [74, 141],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "yew_wood", chance: 0.04, qty: [1, 1] },
        { id: "amber", chance: 0.02, qty: [1, 1] }
      ]
    },
    van_forest_troll: {
      name: "Лісовий троль",
      range: 1, move: { name: "Удар стовбуром", mult: 1.6, chance: 0.25 },
      verb: "б'є кийком",
      level: 33,
      role: "tank",
      stats: { hp: 12680, mp: 0, attack: 1095, defense: 207, magicDefense: 171, crit: 17, blockPhys: 17 },
      exp: 3267,
      gold: [76, 145],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "yew_wood", chance: 0.04, qty: [1, 1] },
        { id: "amber", chance: 0.02, qty: [1, 1] }
      ]
    },
    van_boss_fjalar_and_galar: {
      name: "Фьялар і Галар",
      range: 1, move: { name: "Два ножі", mult: 1.75, chance: 0.25 },
      verb: "ріжуть ножами",
      level: 33,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 13118, mp: 1521, attack: 1705, magic: 1105, defense: 150, magicDefense: 150, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Отруєний мед", mp: 60, mult: 2.3 },
        { kind: "stun", name: "Удар жорном", mp: 45, mult: 1.2 },
        { kind: "heal", name: "Ковток меду поезії", mp: 70, healPct: 0.1 }
      ],
      exp: 16335,
      gold: [376, 726],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "platinum_ingot", chance: 0.25, qty: [1, 3] },
        { id: "gem", chance: 0.25, qty: [1, 3] },
        { id: "amber", chance: 0.3, qty: [1, 3] }
      ]
    },
    van_gold_spirit: {
      name: "Золотий дух",
      undead: true,
      range: 2, move: { name: "Золотий спалах", mult: 1.4, chance: 0.25 },
      verb: "обпікає",
      level: 33,
      role: "caster",
      stats: { hp: 7876, mp: 1235, attack: 769, magic: 1019, defense: 102, magicDefense: 197, crit: 17, blockMag: 17 },
      spell: { name: "Жага золота", mp: 26, mult: 1.45, chance: 0.4 },
      exp: 3267,
      gold: [76, 145],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "coal", chance: 0.04, qty: [1, 1] },
        { id: "platinum_ore", chance: 0.02, qty: [1, 1] }
      ]
    },
    van_burnt_cultist: {
      name: "Обпалений культист",
      humanoid: true,
      weapons: ["dagger", "axe"],
      range: 1, move: { name: "Палаючий кинджал", mult: 1.55, chance: 0.25 },
      verb: "ріже",
      level: 33,
      role: "melee",
      stats: { hp: 6591, mp: 0, attack: 1184, defense: 113, magicDefense: 136, crit: 27, dodge: 22 },
      exp: 3267,
      gold: [76, 145],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "coal", chance: 0.04, qty: [1, 1] },
        { id: "platinum_ore", chance: 0.02, qty: [1, 1] }
      ]
    },
    van_barrow_guard: {
      name: "Сторожа кургану",
      humanoid: true,
      weapons: ["sword", "axe"],
      undead: true,
      range: 1, move: { name: "Удар щитом", mult: 1.55, chance: 0.25 },
      verb: "б'є",
      level: 33,
      role: "tank",
      stats: { hp: 11057, mp: 0, attack: 955, defense: 207, magicDefense: 171, crit: 17, blockPhys: 17 },
      exp: 3267,
      gold: [76, 145],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "coal", chance: 0.04, qty: [1, 1] },
        { id: "platinum_ore", chance: 0.02, qty: [1, 1] }
      ]
    },
    van_boss_gullveig_the_thrice_burned: {
      name: "Гулльвейг Тричі Спалена",
      range: 3, move: { name: "Золотий посох", mult: 1.6, chance: 0.25 },
      verb: "б'є посохом",
      level: 34,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 17370, mp: 1948, attack: 1423, magic: 1676, defense: 130, magicDefense: 218, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Полум'я трьох вогнищ", mp: 60, mult: 2.5 },
        { kind: "stun", name: "Золота лихоманка", mp: 45, mult: 1.0 },
        { kind: "heal", name: "Третє відродження", mp: 70, healPct: 0.12 }
      ],
      exp: 17340,
      gold: [388, 748],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "platinum_ingot", chance: 0.25, qty: [1, 3] },
        { id: "gem", chance: 0.25, qty: [1, 3] },
        { id: "gold_ingot", chance: 0.3, qty: [1, 3] }
      ]
    },
    van_vanir_priest: {
      name: "Жрець-ван",
      humanoid: true,
      weapons: ["staff"],
      range: 2, move: { name: "Удар жезлом", mult: 1.5, chance: 0.25 },
      verb: "б'є жезлом",
      level: 34,
      role: "healer",
      stats: { hp: 7932, mp: 1778, attack: 622, magic: 917, defense: 104, magicDefense: 193, crit: 11, blockMag: 17 },
      spell: { name: "Гнів ванів", mp: 28, mult: 1.45, chance: 0.4 },
      exp: 3468,
      gold: [78, 150],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "amber", chance: 0.03, qty: [1, 1] },
        { id: "pearl", chance: 0.01, qty: [1, 1] }
      ]
    },
    van_freyjas_forest_cat: {
      name: "Лісовий кіт Фреї",
      range: 1, move: { name: "Стрибок із гілля", mult: 1.6, chance: 0.25 },
      verb: "рве кігтями",
      level: 33,
      role: "melee",
      stats: { hp: 7161, mp: 0, attack: 1287, defense: 113, magicDefense: 136, crit: 27, dodge: 22 },
      exp: 3267,
      gold: [76, 145],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "amber", chance: 0.03, qty: [1, 1] },
        { id: "pearl", chance: 0.01, qty: [1, 1] }
      ]
    },
    van_seidr_guardian: {
      name: "Сейдовий вартовий",
      humanoid: true,
      weapons: ["sword"],
      range: 1, move: { name: "Рунний клинок", mult: 1.55, chance: 0.25 },
      verb: "рубає",
      level: 34,
      role: "tank",
      stats: { hp: 11645, mp: 0, attack: 1005, defense: 210, magicDefense: 172, crit: 17, blockPhys: 17 },
      exp: 3468,
      gold: [78, 150],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "amber", chance: 0.03, qty: [1, 1] },
        { id: "pearl", chance: 0.01, qty: [1, 1] }
      ]
    },
    van_boss_high_priestess_of_the_vanir: {
      name: "Верховна жриця ванів",
      range: 3, move: { name: "Жезл Фреї", mult: 1.6, chance: 0.25 },
      verb: "б'є жезлом",
      level: 35,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 17234, mp: 1933, attack: 1464, magic: 1724, defense: 133, magicDefense: 223, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Сейд ванів", mp: 60, mult: 2.5 },
        { kind: "stun", name: "Сльози Фреї", mp: 45, mult: 1.1 },
        { kind: "heal", name: "Благословення Ньйорда", mp: 70, healPct: 0.12 }
      ],
      exp: 18375,
      gold: [399, 770],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "platinum_ingot", chance: 0.25, qty: [1, 3] },
        { id: "gem", chance: 0.25, qty: [1, 3] },
        { id: "amber", chance: 0.3, qty: [1, 3] }
      ]
    },
    van_wave_daughter: {
      name: "Донька-хвиля",
      range: 2, move: { name: "Удар хвилі", mult: 1.45, chance: 0.25 },
      verb: "накриває хвилею",
      level: 34,
      role: "healer",
      stats: { hp: 9213, mp: 2065, attack: 722, magic: 1065, defense: 104, magicDefense: 193, crit: 11, blockMag: 17 },
      spell: { name: "Солона хвиля", mp: 28, mult: 1.45, chance: 0.4 },
      exp: 3468,
      gold: [78, 150],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "seal_leather", chance: 0.04, qty: [1, 1] },
        { id: "pearl", chance: 0.025, qty: [1, 1] }
      ]
    },
    van_drowned_warrior: {
      name: "Утоплений воїн",
      humanoid: true,
      weapons: ["sword", "axe"],
      undead: true,
      range: 1, move: { name: "Удар з глибини", mult: 1.55, chance: 0.25 },
      verb: "б'є",
      level: 34,
      role: "melee",
      stats: { hp: 7214, mp: 0, attack: 1295, defense: 116, magicDefense: 137, crit: 27, dodge: 22 },
      exp: 3468,
      gold: [78, 150],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "seal_leather", chance: 0.04, qty: [1, 1] },
        { id: "pearl", chance: 0.025, qty: [1, 1] }
      ]
    },
    van_deep_eel: {
      name: "Глибинний вугор",
      range: 2, move: { name: "Розряд", mult: 1.5, chance: 0.25 },
      verb: "б'є струмом",
      level: 34,
      role: "ranged",
      stats: { hp: 7255, mp: 0, attack: 1488, defense: 91, magicDefense: 120, crit: 29, dodge: 23 },
      exp: 3468,
      gold: [78, 150],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "seal_leather", chance: 0.04, qty: [1, 1] },
        { id: "pearl", chance: 0.025, qty: [1, 1] }
      ]
    },
    van_boss_ran_mistress_of_the_drowned: {
      name: "Ран, володарка утоплених",
      range: 3, move: { name: "Сіть Ран", mult: 1.7, chance: 0.25 },
      verb: "б'є сіттю",
      level: 35,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 17343, mp: 1945, attack: 1932, magic: 2273, defense: 133, magicDefense: 223, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Дев'ята хвиля", mp: 60, mult: 2.7 },
        { kind: "stun", name: "Сіть утоплених", mp: 45, mult: 1.3 },
        { kind: "heal", name: "Данина моря", mp: 70, healPct: 0.1 }
      ],
      exp: 23888,
      gold: [519, 1001],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "platinum_ingot", chance: 0.25, qty: [1, 3] },
        { id: "gem", chance: 0.25, qty: [1, 3] },
        { id: "pearl", chance: 0.3, qty: [1, 3] }
      ]
    },
    // ---------- СВАРТАЛЬВГЕЙМ І НІДАВЕЛЛІР (світ 5) — вороги 35–40 рівня ----------
    // Спорядження з ворогів не падає (worlds.js → CRAFT_ONLY_FROM) — лише матеріали 5 виду, зілля й ключі.
    // Баланс підібрано симуляцією (tools/balance.js, листопад 2026): герой із професією в повному епічному спорядженні свого рівня
    // перемагає звичайного ворога ≈70%, боса — ≈35% (той самий герой у Ванагеймі: 77% і 32%).
    svart_cave_spider: {
      name: "Печерний павук",
      range: 1, move: { name: "Отруйний укус", mult: 1.55, chance: 0.25 },
      verb: "кусає",
      level: 35,
      role: "melee",
      stats: { hp: 9953, mp: 0, attack: 1681, defense: 118, magicDefense: 140, crit: 27, dodge: 22 },
      exp: 3675,
      gold: [81, 154],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.04, qty: [1, 1] },
        { id: "iron_ore", chance: 0.03, qty: [1, 1] }
      ]
    },
    svart_stone_worm: {
      name: "Кам'яний черв",
      range: 1, move: { name: "Удар з-під землі", mult: 1.5, chance: 0.25 },
      verb: "таранить",
      level: 35,
      role: "tank",
      stats: { hp: 14249, mp: 0, attack: 1338, defense: 214, magicDefense: 176, crit: 17, blockPhys: 17 },
      exp: 3675,
      gold: [81, 154],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.04, qty: [1, 1] },
        { id: "iron_ore", chance: 0.03, qty: [1, 1] }
      ]
    },
    svart_blood_bat: {
      name: "Кажан-кровопивця",
      range: 2, move: { name: "Пікірування", mult: 1.5, chance: 0.25 },
      verb: "впивається іклами в",
      level: 35,
      role: "ranged",
      stats: { hp: 8910, mp: 0, attack: 1837, defense: 92, magicDefense: 122, crit: 29, dodge: 23 },
      exp: 3675,
      gold: [81, 154],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.04, qty: [1, 1] },
        { id: "iron_ore", chance: 0.03, qty: [1, 1] }
      ]
    },
    svart_boss_cave_spider_matriarch: {
      name: "Матка печерних павуків",
      range: 1, move: { name: "Удар жвалами", mult: 1.7, chance: 0.25 },
      verb: "рве жвалами",
      level: 36,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 14356, mp: 1662, attack: 2087, magic: 1354, defense: 157, magicDefense: 157, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Плювок отрути", mp: 60, mult: 2.3 },
        { kind: "stun", name: "Липка павутина", mp: 45, mult: 1.2 },
        { kind: "heal", name: "Пожирання кокона", mp: 70, healPct: 0.1 }
      ],
      exp: 19440,
      gold: [410, 792],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.25, qty: [1, 2] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "rock_crystal", chance: 0.25, qty: [1, 3] },
        { id: "lizard_leather", chance: 0.3, qty: [1, 3] }
      ]
    },
    svart_cursed_pike: {
      name: "Проклята щука",
      range: 2, move: { name: "Кидок із води", mult: 1.5, chance: 0.25 },
      verb: "хапає зубами",
      level: 35,
      role: "ranged",
      stats: { hp: 8539, mp: 0, attack: 1842, defense: 92, magicDefense: 122, crit: 29, dodge: 23 },
      exp: 3675,
      gold: [81, 154],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.04, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.015, qty: [1, 1] }
      ]
    },
    svart_water_troll: {
      name: "Водяний троль",
      range: 1, move: { name: "Удар каменюкою", mult: 1.5, chance: 0.25 },
      verb: "гатить",
      level: 36,
      role: "tank",
      stats: { hp: 15711, mp: 0, attack: 1252, defense: 217, magicDefense: 179, crit: 17, blockPhys: 17 },
      exp: 3888,
      gold: [83, 158],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.04, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.015, qty: [1, 1] }
      ]
    },
    svart_greedy_kobold: {
      name: "Жадібний кобольд",
      humanoid: true,
      weapons: ["dagger"],
      range: 1, move: { name: "Підлий удар", mult: 1.55, chance: 0.25 },
      verb: "штрикає",
      level: 36,
      role: "melee",
      stats: { hp: 9041, mp: 0, attack: 1516, defense: 119, magicDefense: 143, crit: 27, dodge: 22 },
      exp: 3888,
      gold: [83, 158],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.04, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.015, qty: [1, 1] }
      ]
    },
    svart_boss_andvari: {
      name: "Андварі",
      range: 3, move: { name: "Удар проклятим перснем", mult: 1.55, chance: 0.25 },
      verb: "б'є перснем",
      level: 37,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 15046, mp: 2061, attack: 1834, magic: 2156, defense: 137, magicDefense: 230, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Прокляття золота", mp: 60, mult: 2.4 },
        { kind: "stun", name: "Золоті пута", mp: 45, mult: 1 },
        { kind: "heal", name: "Подоба щуки", mp: 70, healPct: 0.12 }
      ],
      exp: 20535,
      gold: [422, 814],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.25, qty: [1, 2] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "rock_crystal", chance: 0.25, qty: [1, 3] }
      ]
    },
    svart_shadow_assassin: {
      name: "Тіньовий вбивця",
      humanoid: true,
      weapons: ["dagger"],
      range: 1, move: { name: "Удар у спину", mult: 1.55, chance: 0.25 },
      verb: "б'є кинджалом",
      level: 36,
      role: "melee",
      stats: { hp: 8932, mp: 0, attack: 1536, defense: 119, magicDefense: 143, crit: 27, dodge: 22 },
      exp: 3888,
      gold: [83, 158],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "ironwood", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.015, qty: [1, 1] }
      ]
    },
    svart_venom_archer: {
      name: "Отруйна лучниця",
      humanoid: true,
      weapons: ["bow"],
      range: 3, move: { name: "Отруйна стріла", mult: 1.5, chance: 0.25 },
      verb: "стріляє в",
      level: 37,
      role: "ranged",
      stats: { hp: 7806, mp: 0, attack: 1576, defense: 95, magicDefense: 126, crit: 29, dodge: 23 },
      exp: 4107,
      gold: [85, 163],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "ironwood", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.015, qty: [1, 1] }
      ]
    },
    svart_shadow_mage: {
      name: "Маг тіней",
      humanoid: true,
      weapons: ["staff"],
      range: 3, move: { name: "Удар посохом", mult: 1.5, chance: 0.25 },
      verb: "б'є посохом",
      level: 37,
      role: "caster",
      stats: { hp: 7641, mp: 1373, attack: 801, magic: 1061, defense: 109, magicDefense: 210, crit: 17, blockMag: 17 },
      spell: { name: "Стріла мороку", mp: 28, mult: 1.45, chance: 0.4 },
      exp: 4107,
      gold: [85, 163],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "ironwood", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.015, qty: [1, 1] }
      ]
    },
    svart_boss_prince_of_the_dark_elves: {
      name: "Князь свартальвів",
      range: 1, move: { name: "Танець клинків", mult: 1.7, chance: 0.25 },
      verb: "рубає клинками",
      level: 38,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 15212, mp: 1763, attack: 2151, magic: 1394, defense: 162, magicDefense: 162, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Чорне полум'я", mp: 60, mult: 2.4 },
        { kind: "stun", name: "Тіньові пута", mp: 45, mult: 1.2 },
        { kind: "heal", name: "Темне причастя", mp: 70, healPct: 0.1 }
      ],
      exp: 21660,
      gold: [433, 836],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.25, qty: [1, 2] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "rock_crystal", chance: 0.25, qty: [1, 3] },
        { id: "ironwood", chance: 0.3, qty: [1, 3] }
      ]
    },
    svart_stone_sentinel: {
      name: "Кам'яний вартовий",
      range: 1, move: { name: "Кам'яний кулак", mult: 1.5, chance: 0.25 },
      verb: "б'є кулаком",
      level: 37,
      role: "tank",
      stats: { hp: 14610, mp: 0, attack: 1387, defense: 220, magicDefense: 182, crit: 17, blockPhys: 17 },
      exp: 4107,
      gold: [85, 163],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.015, qty: [1, 1] }
      ]
    },
    svart_traitor_dwarf: {
      name: "Карлик-зрадник",
      humanoid: true,
      weapons: ["axe"],
      range: 1, move: { name: "Удар сокирою", mult: 1.55, chance: 0.25 },
      verb: "рубає",
      level: 37,
      role: "melee",
      stats: { hp: 9248, mp: 0, attack: 1651, defense: 122, magicDefense: 144, crit: 27, dodge: 22 },
      exp: 4107,
      gold: [85, 163],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.015, qty: [1, 1] }
      ]
    },
    svart_rune_warden: {
      name: "Рунний вартовий",
      range: 2, move: { name: "Удар руною", mult: 1.5, chance: 0.25 },
      verb: "б'є руною",
      level: 38,
      role: "caster",
      stats: { hp: 8366, mp: 1415, attack: 896, magic: 1187, defense: 111, magicDefense: 214, crit: 17, blockMag: 17 },
      spell: { name: "Сліпуча руна", mp: 28, mult: 1.45, chance: 0.4 },
      exp: 4332,
      gold: [87, 167],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.015, qty: [1, 1] }
      ]
    },
    svart_boss_alvis_the_all_knowing: {
      name: "Альвіс Всезнаючий",
      range: 3, move: { name: "Удар посохом мудреця", mult: 1.55, chance: 0.25 },
      verb: "б'є посохом",
      level: 38,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 15532, mp: 2123, attack: 1812, magic: 2137, defense: 139, magicDefense: 234, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Слово-блискавка", mp: 60, mult: 2.5 },
        { kind: "stun", name: "Загадка без відповіді", mp: 45, mult: 1 },
        { kind: "heal", name: "Знання всіх світів", mp: 70, healPct: 0.12 }
      ],
      exp: 21660,
      gold: [433, 836],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.25, qty: [1, 2] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "rock_crystal", chance: 0.25, qty: [1, 3] },
        { id: "rune_gem", chance: 0.3, qty: [1, 3] }
      ]
    },
    svart_living_anvil: {
      name: "Ожиле ковадло",
      range: 1, move: { name: "Падіння ковадла", mult: 1.5, chance: 0.25 },
      verb: "чавить",
      level: 38,
      role: "tank",
      stats: { hp: 15994, mp: 0, attack: 1361, defense: 224, magicDefense: 185, crit: 17, blockPhys: 17 },
      exp: 4332,
      gold: [87, 167],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "coal", chance: 0.04, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.02, qty: [1, 1] }
      ]
    },
    svart_fire_salamander: {
      name: "Вогняна саламандра",
      range: 2, move: { name: "Удар хвостом", mult: 1.5, chance: 0.25 },
      verb: "б'є хвостом",
      level: 38,
      role: "caster",
      stats: { hp: 8634, mp: 1415, attack: 937, magic: 1242, defense: 111, magicDefense: 214, crit: 17, blockMag: 17 },
      spell: { name: "Плювок полум'ям", mp: 28, mult: 1.45, chance: 0.4 },
      exp: 4332,
      gold: [87, 167],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "coal", chance: 0.04, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.02, qty: [1, 1] }
      ]
    },
    svart_forged_boar: {
      name: "Кований вепр",
      range: 1, move: { name: "Залізні ікла", mult: 1.55, chance: 0.25 },
      verb: "б'є іклами",
      level: 38,
      role: "melee",
      stats: { hp: 10576, mp: 0, attack: 1767, defense: 123, magicDefense: 147, crit: 27, dodge: 22 },
      exp: 4332,
      gold: [87, 167],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "coal", chance: 0.04, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.02, qty: [1, 1] }
      ]
    },
    svart_boss_hels_forged_guardian: {
      name: "Кований страж Хелли",
      range: 1, move: { name: "Удар молотом", mult: 1.7, chance: 0.25 },
      verb: "б'є молотом",
      level: 39,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 20798, mp: 1639, attack: 2048, magic: 1566, defense: 290, magicDefense: 202, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Розплавлений метал", mp: 60, mult: 2.4 },
        { kind: "stun", name: "Удар ковадла", mp: 45, mult: 1.1 },
        { kind: "heal", name: "Перековування", mp: 70, healPct: 0.1 }
      ],
      exp: 22815,
      gold: [445, 858],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.25, qty: [1, 2] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "rock_crystal", chance: 0.25, qty: [1, 3] }
      ]
    },
    svart_rune_spirit: {
      name: "Рунний дух",
      range: 2, move: { name: "Дотик руни", mult: 1.5, chance: 0.25 },
      verb: "торкається",
      level: 38,
      role: "caster",
      stats: { hp: 8383, mp: 1415, attack: 893, magic: 1184, defense: 111, magicDefense: 214, crit: 17, blockMag: 17 },
      spell: { name: "Руна болю", mp: 28, mult: 1.45, chance: 0.4 },
      exp: 4332,
      gold: [87, 167],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "rune_gem", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.02, qty: [1, 1] }
      ]
    },
    svart_masters_ghost: {
      name: "Привид майстра",
      undead: true,
      range: 2, move: { name: "Примарний молот", mult: 1.5, chance: 0.25 },
      verb: "б'є примарним молотом",
      level: 39,
      role: "healer",
      stats: { hp: 9110, mp: 2228, attack: 710, magic: 1046, defense: 112, magicDefense: 209, crit: 11, blockMag: 17 },
      spell: { name: "Прокляття ремесла", mp: 30, mult: 1.45, chance: 0.4 },
      exp: 4563,
      gold: [90, 172],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "rune_gem", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.02, qty: [1, 1] }
      ]
    },
    svart_crystal_golem: {
      name: "Кришталевий голем",
      range: 1, move: { name: "Кришталевий кулак", mult: 1.5, chance: 0.25 },
      verb: "б'є кулаком",
      level: 39,
      role: "tank",
      stats: { hp: 15071, mp: 0, attack: 1301, defense: 228, magicDefense: 188, crit: 17, blockPhys: 17 },
      exp: 4563,
      gold: [90, 172],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "rune_gem", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.02, qty: [1, 1] }
      ]
    },
    svart_boss_keeper_of_the_runes: {
      name: "Хранитель рун",
      range: 3, move: { name: "Удар рунічним жезлом", mult: 1.55, chance: 0.25 },
      verb: "б'є жезлом",
      level: 40,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 19769, mp: 2253, attack: 1605, magic: 1891, defense: 144, magicDefense: 241, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Руна загибелі", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Руна мовчання", mp: 45, mult: 1.1 },
        { kind: "heal", name: "Руна відновлення", mp: 70, healPct: 0.12 }
      ],
      exp: 24000,
      gold: [456, 880],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.25, qty: [1, 2] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "rock_crystal", chance: 0.25, qty: [1, 3] },
        { id: "rune_gem", chance: 0.3, qty: [1, 3] }
      ]
    },
    svart_clay_golem: {
      name: "Глиняний голем",
      range: 1, move: { name: "Глиняний кулак", mult: 1.5, chance: 0.25 },
      verb: "б'є кулаком",
      level: 39,
      role: "tank",
      stats: { hp: 16537, mp: 0, attack: 1355, defense: 228, magicDefense: 188, crit: 17, blockPhys: 17 },
      exp: 4563,
      gold: [90, 172],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "ironwood", chance: 0.04, qty: [1, 1] },
        { id: "rune_gem", chance: 0.02, qty: [1, 1] }
      ]
    },
    svart_iron_draugr: {
      name: "Залізний драугр",
      humanoid: true,
      weapons: ["sword", "axe"],
      undead: true,
      range: 1, move: { name: "Іржавий клинок", mult: 1.55, chance: 0.25 },
      verb: "рубає",
      level: 40,
      role: "melee",
      stats: { hp: 11040, mp: 0, attack: 1945, defense: 127, magicDefense: 151, crit: 27, dodge: 22 },
      exp: 4800,
      gold: [92, 176],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "ironwood", chance: 0.04, qty: [1, 1] },
        { id: "rune_gem", chance: 0.02, qty: [1, 1] }
      ]
    },
    svart_overseer_dwarf: {
      name: "Карлик-наглядач",
      humanoid: true,
      weapons: ["dagger"],
      range: 2, move: { name: "Удар батогом", mult: 1.5, chance: 0.25 },
      verb: "шмагає",
      level: 40,
      role: "ranged",
      stats: { hp: 10205, mp: 0, attack: 2094, defense: 101, magicDefense: 133, crit: 29, dodge: 23 },
      exp: 4800,
      gold: [92, 176],
      loot: [
        { id: "potion_hp_large", chance: 0.12, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.08, qty: [1, 1] },
        { id: "potion_magic", chance: 0.02, qty: [1, 1] },
        { id: "ironwood", chance: 0.04, qty: [1, 1] },
        { id: "rune_gem", chance: 0.02, qty: [1, 1] }
      ]
    },
    svart_boss_mokkurkalfi: {
      name: "Мьоккуркальві",
      range: 1, move: { name: "Кулак велетня", mult: 1.75, chance: 0.25 },
      verb: "гатить кулаком",
      level: 40,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 28314, mp: 1689, attack: 2566, magic: 1962, defense: 294, magicDefense: 204, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Глиняна лавина", mp: 60, mult: 2.7 },
        { kind: "stun", name: "Важкий крок", mp: 45, mult: 1.3 },
        { kind: "heal", name: "Серце кобили", mp: 70, healPct: 0.1 }
      ],
      exp: 31200,
      gold: [593, 1144],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.25, qty: [1, 2] },
        { id: "steel_ingot", chance: 0.25, qty: [1, 3] },
        { id: "rock_crystal", chance: 0.25, qty: [1, 3] },
        { id: "ironwood", chance: 0.3, qty: [1, 3] }
      ]
    },
    // ---------- ЙОТУНГЕЙМ (світ 6) — вороги 40–45 рівня ----------
    // Спорядження з ворогів не падає (worlds.js → CRAFT_ONLY_FROM) — лише матеріали 5 виду, біла вовча шкура, зілля й ключі.
    // Баланс підібрано симуляцією (tools/balance.js, листопад 2026): герой із професією в повному епічному спорядженні свого рівня
    // перемагає звичайного ворога ≈65%, боса — ≈30% (світ 5: 70% і 35%).
    jot_mountain_troll: {
      name: "Гірський троль",
      range: 1, move: { name: "Удар брилою", mult: 1.5, chance: 0.25 },
      verb: "гатить брилою",
      level: 40,
      role: "tank",
      stats: { hp: 23962, mp: 0, attack: 1963, defense: 291, magicDefense: 240, crit: 17, blockPhys: 17 },
      exp: 4800,
      gold: [92, 176],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.06, qty: [1, 1] },
        { id: "iron_ore", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_snow_wolf: {
      name: "Сніговий вовк",
      range: 1, move: { name: "Хватка заметілі", mult: 1.55, chance: 0.25 },
      verb: "рве іклами",
      level: 40,
      role: "melee",
      stats: { hp: 14264, mp: 0, attack: 2512, defense: 155, magicDefense: 184, crit: 27, dodge: 22 },
      exp: 4800,
      gold: [92, 176],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_pelt", chance: 0.08, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.02, qty: [1, 1] }
      ]
    },
    jot_frost_scout: {
      name: "Інеїстий розвідник",
      humanoid: true,
      weapons: ["bow"],
      range: 3, move: { name: "Крижаний спис", mult: 1.5, chance: 0.25 },
      verb: "метає спис у",
      level: 41,
      role: "ranged",
      stats: { hp: 12125, mp: 0, attack: 2490, defense: 122, magicDefense: 162, crit: 29, dodge: 23 },
      exp: 5043,
      gold: [94, 180],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "iron_ore", chance: 0.05, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_boss_troll_chieftain: {
      name: "Троль-ватажок",
      range: 1, move: { name: "Удар палицею", mult: 1.7, chance: 0.25 },
      verb: "гатить палицею",
      level: 41,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 32392, mp: 1721, attack: 4023, magic: 3079, defense: 400, magicDefense: 278, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Лавина з вершини", mp: 60, mult: 2.5 },
        { kind: "stun", name: "Рев ватажка", mp: 45, mult: 1.2 },
        { kind: "heal", name: "Троляча шкура", mp: 70, healPct: 0.1 }
      ],
      exp: 25215,
      gold: [467, 902],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "white_pelt", chance: 0.3, qty: [1, 2] },
        { id: "rock_crystal", chance: 0.35, qty: [1, 3] },
        { id: "rune_gem", chance: 0.2, qty: [1, 2] }
      ]
    },
    jot_giant_hunter: {
      name: "Йотун-мисливець",
      humanoid: true,
      weapons: ["bow"],
      range: 3, move: { name: "Важка стріла", mult: 1.5, chance: 0.25 },
      verb: "стріляє в",
      level: 41,
      role: "ranged",
      stats: { hp: 12125, mp: 0, attack: 2490, defense: 122, magicDefense: 162, crit: 29, dodge: 23 },
      exp: 5043,
      gold: [94, 180],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.06, qty: [1, 1] },
        { id: "white_pelt", chance: 0.04, qty: [1, 1] }
      ]
    },
    jot_snow_lynx: {
      name: "Снігова рись",
      range: 1, move: { name: "Стрибок зі скелі", mult: 1.55, chance: 0.25 },
      verb: "дере кігтями",
      level: 41,
      role: "melee",
      stats: { hp: 14598, mp: 0, attack: 2571, defense: 160, magicDefense: 190, crit: 27, dodge: 22 },
      exp: 5043,
      gold: [94, 180],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_pelt", chance: 0.08, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_ski_archer: {
      name: "Лучник на лижах",
      humanoid: true,
      weapons: ["bow"],
      range: 3, move: { name: "Постріл на ходу", mult: 1.5, chance: 0.25 },
      verb: "стріляє в",
      level: 41,
      role: "ranged",
      stats: { hp: 12125, mp: 0, attack: 2490, defense: 122, magicDefense: 162, crit: 29, dodge: 23 },
      exp: 5043,
      gold: [94, 180],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ironwood", chance: 0.05, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_boss_thjazi_in_eagle_form: {
      name: "Тьяцці в подобі орла",
      range: 1, move: { name: "Орлині пазурі", mult: 1.7, chance: 0.25 },
      verb: "шматує пазурями",
      level: 42,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 23645, mp: 1851, attack: 3926, magic: 2547, defense: 232, magicDefense: 232, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Буревій крил", mp: 60, mult: 2.4 },
        { kind: "stun", name: "Політ із бранцем", mp: 45, mult: 1.2 },
        { kind: "heal", name: "Яблука Ідунн", mp: 70, healPct: 0.1 }
      ],
      exp: 26460,
      gold: [479, 924],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "white_pelt", chance: 0.3, qty: [1, 2] },
        { id: "lizard_leather", chance: 0.35, qty: [1, 3] },
        { id: "rune_gem", chance: 0.2, qty: [1, 2] }
      ]
    },
    jot_ironwood_wolf: {
      name: "Вовк Ярнвіду",
      range: 1, move: { name: "Залізні ікла", mult: 1.55, chance: 0.25 },
      verb: "рве іклами",
      level: 41,
      role: "melee",
      stats: { hp: 14598, mp: 0, attack: 2571, defense: 160, magicDefense: 190, crit: 27, dodge: 22 },
      exp: 5043,
      gold: [94, 180],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_pelt", chance: 0.08, qty: [1, 1] },
        { id: "ironwood", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_troll_witch: {
      name: "Тролиця-відьма",
      humanoid: true,
      weapons: ["staff"],
      range: 3, move: { name: "Удар клюкою", mult: 1.5, chance: 0.25 },
      verb: "б'є клюкою",
      level: 42,
      role: "caster",
      stats: { hp: 10936, mp: 1415, attack: 1186, magic: 1573, defense: 142, magicDefense: 277, crit: 17, blockMag: 17 },
      spell: { name: "Вовче прокляття", mp: 28, mult: 1.45, chance: 0.4 },
      exp: 5292,
      gold: [97, 185],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ironwood", chance: 0.06, qty: [1, 1] },
        { id: "rune_gem", chance: 0.025, qty: [1, 1] }
      ]
    },
    jot_wolf_man: {
      name: "Вовкулака Залізного лісу",
      range: 1, move: { name: "Шалений стрибок", mult: 1.55, chance: 0.25 },
      verb: "шматує",
      level: 42,
      role: "melee",
      stats: { hp: 15251, mp: 0, attack: 2686, defense: 168, magicDefense: 200, crit: 27, dodge: 22 },
      exp: 5292,
      gold: [97, 185],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_pelt", chance: 0.08, qty: [1, 1] },
        { id: "ironwood", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_boss_angrboda: {
      name: "Ангрбода",
      range: 3, move: { name: "Удар залізним гіллям", mult: 1.55, chance: 0.25 },
      verb: "б'є гіллям",
      level: 42,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 27362, mp: 2366, attack: 3357, magic: 3954, defense: 187, magicDefense: 314, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Мати вовків", mp: 60, mult: 2.5 },
        { kind: "stun", name: "Залізне коріння", mp: 45, mult: 1.1 },
        { kind: "heal", name: "Сейд Ярнвіду", mp: 70, healPct: 0.12 }
      ],
      exp: 26460,
      gold: [479, 924],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "white_pelt", chance: 0.3, qty: [1, 2] },
        { id: "ironwood", chance: 0.35, qty: [1, 3] },
        { id: "rune_gem", chance: 0.2, qty: [1, 2] }
      ]
    },
    jot_giant_warrior: {
      name: "Йотун-воїн",
      humanoid: true,
      weapons: ["axe"],
      range: 1, move: { name: "Розмах сокирою", mult: 1.55, chance: 0.25 },
      verb: "рубає",
      level: 42,
      role: "melee",
      stats: { hp: 13035, mp: 0, attack: 2296, defense: 157, magicDefense: 186, crit: 27, dodge: 22 },
      exp: 5292,
      gold: [97, 185],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "iron_ore", chance: 0.06, qty: [1, 1] },
        { id: "rune_gem", chance: 0.02, qty: [1, 1] }
      ]
    },
    jot_troll_guard: {
      name: "Троль-охоронець",
      humanoid: true,
      weapons: ["sword"],
      range: 1, move: { name: "Удар щитом", mult: 1.5, chance: 0.25 },
      verb: "б'є",
      level: 42,
      role: "tank",
      stats: { hp: 20803, mp: 0, attack: 1706, defense: 288, magicDefense: 237, crit: 17, blockPhys: 17 },
      exp: 5292,
      gold: [97, 185],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "iron_ore", chance: 0.05, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_giant_skald: {
      name: "Скальд велетнів",
      humanoid: true,
      weapons: ["staff"],
      range: 2, move: { name: "Удар арфою", mult: 1.5, chance: 0.25 },
      verb: "б'є арфою",
      level: 42,
      role: "healer",
      stats: { hp: 11534, mp: 2228, attack: 901, magic: 1325, defense: 141, magicDefense: 262, crit: 11, blockMag: 17 },
      spell: { name: "Пісня глуму", mp: 30, mult: 1.45, chance: 0.4 },
      exp: 5292,
      gold: [97, 185],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.05, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_boss_thrym_king_of_the_thurses: {
      name: "Трим, король турсів",
      range: 1, move: { name: "Удар золотим скіпетром", mult: 1.7, chance: 0.25 },
      verb: "б'є скіпетром",
      level: 43,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 36378, mp: 1721, attack: 3945, magic: 3013, defense: 438, magicDefense: 306, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Гнів короля турсів", mp: 60, mult: 2.5 },
        { kind: "stun", name: "Схований молот", mp: 45, mult: 1.2 },
        { kind: "heal", name: "Чаша меду", mp: 70, healPct: 0.1 }
      ],
      exp: 27735,
      gold: [490, 946],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "white_pelt", chance: 0.3, qty: [1, 2] },
        { id: "rune_gem", chance: 0.35, qty: [1, 3] },
        { id: "rock_crystal", chance: 0.25, qty: [1, 2] }
      ]
    },
    jot_stone_giant: {
      name: "Кам'яний велетень",
      range: 2, move: { name: "Кидок валуна", mult: 1.5, chance: 0.25 },
      verb: "жбурляє каменем у",
      level: 42,
      role: "ranged",
      stats: { hp: 14272, mp: 0, attack: 2930, defense: 133, magicDefense: 176, crit: 29, dodge: 23 },
      exp: 5292,
      gold: [97, 185],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.06, qty: [1, 1] },
        { id: "iron_ore", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_rock_troll: {
      name: "Скельний троль",
      range: 1, move: { name: "Кам'яний кулак", mult: 1.55, chance: 0.25 },
      verb: "гатить кулаком",
      level: 43,
      role: "melee",
      stats: { hp: 15690, mp: 0, attack: 2763, defense: 170, magicDefense: 200, crit: 27, dodge: 22 },
      exp: 5547,
      gold: [99, 189],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "iron_ore", chance: 0.06, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_living_boulder: {
      name: "Ожилий валун",
      range: 1, move: { name: "Накат", mult: 1.5, chance: 0.25 },
      verb: "котиться на",
      level: 43,
      role: "tank",
      stats: { hp: 24906, mp: 0, attack: 2042, defense: 320, magicDefense: 264, crit: 17, blockPhys: 17 },
      exp: 5547,
      gold: [99, 189],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.06, qty: [1, 1] },
        { id: "rune_gem", chance: 0.02, qty: [1, 1] }
      ]
    },
    jot_boss_hrungnir: {
      name: "Грунгнір",
      range: 1, move: { name: "Кремінне точило", mult: 1.7, chance: 0.25 },
      verb: "жбурляє точило в",
      level: 44,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 33989, mp: 1721, attack: 3881, magic: 2965, defense: 432, magicDefense: 301, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Серце з каменю", mp: 60, mult: 2.5 },
        { kind: "stun", name: "Удар точилом", mp: 45, mult: 1.2 },
        { kind: "heal", name: "Глиняний побратим", mp: 70, healPct: 0.1 }
      ],
      exp: 29040,
      gold: [502, 968],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "white_pelt", chance: 0.3, qty: [1, 2] },
        { id: "rock_crystal", chance: 0.35, qty: [1, 3] },
        { id: "rune_gem", chance: 0.2, qty: [1, 2] }
      ]
    },
    jot_logi: {
      name: "Логі",
      range: 2, move: { name: "Язик полум'я", mult: 1.5, chance: 0.25 },
      verb: "обпікає",
      level: 43,
      role: "caster",
      stats: { hp: 12678, mp: 1415, attack: 1374, magic: 1824, defense: 155, magicDefense: 299, crit: 17, blockMag: 17 },
      spell: { name: "Всепожирне полум'я", mp: 28, mult: 1.45, chance: 0.4 },
      exp: 5547,
      gold: [99, 189],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.05, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_hugi: {
      name: "Гуґі",
      range: 1, move: { name: "Швидкий, як думка", mult: 1.55, chance: 0.25 },
      verb: "б'є",
      level: 44,
      role: "melee",
      stats: { hp: 15370, mp: 0, attack: 2707, defense: 173, magicDefense: 205, crit: 27, dodge: 22 },
      exp: 5808,
      gold: [101, 194],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.05, qty: [1, 1] },
        { id: "rune_gem", chance: 0.025, qty: [1, 1] }
      ]
    },
    jot_elli: {
      name: "Еллі",
      humanoid: true,
      weapons: ["staff"],
      range: 3, move: { name: "Обійми старості", mult: 1.5, chance: 0.25 },
      verb: "стискає",
      level: 44,
      role: "caster",
      stats: { hp: 11256, mp: 1415, attack: 1221, magic: 1619, defense: 152, magicDefense: 293, crit: 17, blockMag: 17 },
      spell: { name: "Тягар літ", mp: 28, mult: 1.45, chance: 0.4 },
      exp: 5808,
      gold: [101, 194],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.05, qty: [1, 1] },
        { id: "ironwood", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_boss_utgarda_loki: {
      name: "Утгарда-Локі",
      range: 3, move: { name: "Удар ілюзії", mult: 1.55, chance: 0.25 },
      verb: "вражає мороком",
      level: 44,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 27306, mp: 2366, attack: 3384, magic: 3991, defense: 194, magicDefense: 325, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Ріг, що п'є море", mp: 60, mult: 2.5 },
        { kind: "stun", name: "Кіт, що є Змієм", mp: 45, mult: 1.1 },
        { kind: "heal", name: "Морок і омана", mp: 70, healPct: 0.12 }
      ],
      exp: 29040,
      gold: [502, 968],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "white_pelt", chance: 0.3, qty: [1, 2] },
        { id: "rune_gem", chance: 0.35, qty: [1, 3] },
        { id: "rock_crystal", chance: 0.25, qty: [1, 2] }
      ]
    },
    jot_sea_troll: {
      name: "Морський троль",
      range: 1, move: { name: "Удар веслом", mult: 1.5, chance: 0.25 },
      verb: "гатить веслом",
      level: 44,
      role: "tank",
      stats: { hp: 24867, mp: 0, attack: 2038, defense: 330, magicDefense: 270, crit: 17, blockPhys: 17 },
      exp: 5808,
      gold: [101, 194],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.06, qty: [1, 1] },
        { id: "iron_ore", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_giant_walrus: {
      name: "Морж-велетень",
      range: 1, move: { name: "Удар іклами", mult: 1.55, chance: 0.25 },
      verb: "б'є іклами",
      level: 44,
      role: "melee",
      stats: { hp: 15370, mp: 0, attack: 2707, defense: 173, magicDefense: 205, crit: 27, dodge: 22 },
      exp: 5808,
      gold: [101, 194],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_pelt", chance: 0.07, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.04, qty: [1, 1] }
      ]
    },
    jot_draugr_fisher: {
      name: "Драугр-рибалка",
      humanoid: true,
      weapons: ["dagger"],
      undead: true,
      range: 2, move: { name: "Кидок гарпуна", mult: 1.5, chance: 0.25 },
      verb: "кидає гарпун у",
      level: 44,
      role: "ranged",
      stats: { hp: 13765, mp: 0, attack: 2826, defense: 134, magicDefense: 178, crit: 29, dodge: 23 },
      exp: 5808,
      gold: [101, 194],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.05, qty: [1, 1] },
        { id: "rune_gem", chance: 0.025, qty: [1, 1] }
      ]
    },
    jot_boss_hymir: {
      name: "Гюмір",
      range: 1, move: { name: "Крижаний кулак", mult: 1.7, chance: 0.25 },
      verb: "гатить кулаком",
      level: 45,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 23114, mp: 1851, attack: 3265, magic: 2121, defense: 242, magicDefense: 242, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Погляд, що трощить колони", mp: 60, mult: 2.5 },
        { kind: "stun", name: "Удар казаном", mp: 45, mult: 1.2 },
        { kind: "heal", name: "Улов із глибини", mp: 70, healPct: 0.1 }
      ],
      exp: 30375,
      gold: [513, 990],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "white_pelt", chance: 0.3, qty: [1, 2] },
        { id: "lizard_leather", chance: 0.35, qty: [1, 3] },
        { id: "rune_gem", chance: 0.2, qty: [1, 2] }
      ]
    },
    jot_serpent_spawn: {
      name: "Зміїне породження",
      range: 1, move: { name: "Отруйний укус", mult: 1.55, chance: 0.25 },
      verb: "кусає",
      level: 44,
      role: "melee",
      stats: { hp: 15370, mp: 0, attack: 2707, defense: 173, magicDefense: 205, crit: 27, dodge: 22 },
      exp: 5808,
      gold: [101, 194],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.06, qty: [1, 1] },
        { id: "rune_gem", chance: 0.025, qty: [1, 1] }
      ]
    },
    jot_venom_jellyfish: {
      name: "Отруйна медуза",
      range: 2, move: { name: "Жалкі щупальця", mult: 1.5, chance: 0.25 },
      verb: "жалить",
      level: 45,
      role: "caster",
      stats: { hp: 13752, mp: 1415, attack: 1491, magic: 1978, defense: 168, magicDefense: 326, crit: 17, blockMag: 17 },
      spell: { name: "Хмара отрути", mp: 28, mult: 1.45, chance: 0.4 },
      exp: 6075,
      gold: [103, 198],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.05, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_serpent_cultist: {
      name: "Культист Змія",
      humanoid: true,
      weapons: ["staff"],
      range: 2, move: { name: "Удар жезлом", mult: 1.5, chance: 0.25 },
      verb: "б'є жезлом",
      level: 45,
      role: "healer",
      stats: { hp: 11606, mp: 2228, attack: 904, magic: 1333, defense: 150, magicDefense: 278, crit: 11, blockMag: 17 },
      spell: { name: "Шепіт глибини", mp: 30, mult: 1.45, chance: 0.4 },
      exp: 6075,
      gold: [103, 198],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.05, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.03, qty: [1, 1] }
      ]
    },
    jot_boss_jormungandr: {
      name: "Йормунганд",
      range: 3, move: { name: "Удар хвоста", mult: 1.75, chance: 0.25 },
      verb: "б'є хвостом",
      level: 45,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 25917, mp: 2366, attack: 3712, magic: 4375, defense: 192, magicDefense: 322, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Отрута Світового Змія", mp: 60, mult: 2.7 },
        { kind: "stun", name: "Кільця, що оперізують світ", mp: 45, mult: 1.3 },
        { kind: "heal", name: "Скинута шкіра", mp: 70, healPct: 0.12 }
      ],
      exp: 39488,
      gold: [667, 1287],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.45, qty: [1, 2] },
        { id: "white_pelt", chance: 0.3, qty: [1, 2] },
        { id: "lizard_leather", chance: 0.35, qty: [1, 3] },
        { id: "rune_gem", chance: 0.2, qty: [1, 2] },
        { id: "ironwood", chance: 0.3, qty: [1, 3] }
      ]
    },
    // ---------- МУСПЕЛЬГЕЙМ (світ 7) — вороги 45–50 рівня ----------
    // Спорядження з ворогів не падає (worlds.js → CRAFT_ONLY_FROM) — матеріали 5 виду, зілля й ключі; з босів зрідка — матеріали 6 виду (на запас:
    // кувати тір 6 можна лише з відкритим світом 8). Сила — від ворогів Йотунгейму тієї ж ролі (tools/balance.js musp_ --rarity epic).
    musp_fire_hound: {
      name: "Вогняний гончак",
      range: 1, move: { name: "Палаючі ікла", mult: 1.55, chance: 0.25 },
      verb: "рве палаючими іклами",
      level: 45,
      role: "melee",
      stats: { hp: 15358, mp: 0, attack: 2719, defense: 180, magicDefense: 215, crit: 27, dodge: 22 },
      exp: 6075,
      gold: [103, 198],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.07, qty: [1, 1] },
        { id: "ironwood", chance: 0.035, qty: [1, 1] }
      ]
    },
    musp_salamander: {
      name: "Саламандра",
      range: 3, move: { name: "Вогняний плювок", mult: 1.55, chance: 0.25 },
      verb: "плює вогнем у",
      level: 45,
      role: "ranged",
      stats: { hp: 14479, mp: 0, attack: 2987, defense: 140, magicDefense: 185, crit: 29, dodge: 23 },
      exp: 6075,
      gold: [103, 198],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.091, qty: [1, 1] },
        { id: "ironwood", chance: 0.035, qty: [1, 1] }
      ]
    },
    musp_ash_spirit: {
      name: "Попелястий дух",
      range: 3, move: { name: "Попелястий вихор", mult: 1.55, chance: 0.25 },
      verb: "засипає попелом",
      level: 46,
      role: "caster",
      stats: { hp: 14466, mp: 1429, attack: 1576, magic: 2091, defense: 175, magicDefense: 340, crit: 17, blockMag: 17 },
      spell: { name: "Задушливий попіл", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 6348,
      gold: [106, 202],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.07, qty: [1, 1] },
        { id: "ironwood", chance: 0.046, qty: [1, 1] }
      ]
    },
    musp_boss_hound_packleader: {
      name: "Ватажок гончаків",
      range: 1, move: { name: "Хватка ватажка", mult: 1.7, chance: 0.25 },
      verb: "рве іклами",
      level: 46,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 25285, mp: 1870, attack: 4161, magic: 2701, defense: 252, magicDefense: 252, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Полум'яне виття", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Стрибок зграї", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Жар із нори", mp: 70, healPct: 0.1 }
      ],
      exp: 31740,
      gold: [524, 1012],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "lizard_leather", chance: 0.35, qty: [1, 3] },
        { id: "ironwood", chance: 0.3, qty: [1, 2] },
        { id: "rune_gem", chance: 0.2, qty: [1, 2] },
        { id: "celestial_ore", chance: 0.06, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.04, qty: [1, 1] }
      ]
    },
    musp_magma_elemental: {
      name: "Магмовий елементаль",
      range: 1, move: { name: "Удар магмою", mult: 1.5, chance: 0.25 },
      verb: "б'є розпеченою брилою",
      level: 46,
      role: "tank",
      stats: { hp: 26681, mp: 0, attack: 2208, defense: 348, magicDefense: 285, crit: 17, blockPhys: 17 },
      exp: 6348,
      gold: [106, 202],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.07, qty: [1, 1] },
        { id: "iron_ore", chance: 0.05, qty: [1, 1] }
      ]
    },
    musp_lava_worm: {
      name: "Лавовий черв",
      range: 1, move: { name: "Розпечена паща", mult: 1.55, chance: 0.25 },
      verb: "вгризається в",
      level: 46,
      role: "melee",
      stats: { hp: 15665, mp: 0, attack: 2787, defense: 183, magicDefense: 216, crit: 27, dodge: 22 },
      exp: 6348,
      gold: [106, 202],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.091, qty: [1, 1] },
        { id: "iron_ore", chance: 0.05, qty: [1, 1] }
      ]
    },
    musp_fire_serpent: {
      name: "Вогняна змія",
      range: 3, move: { name: "Плювок лави", mult: 1.55, chance: 0.25 },
      verb: "плює лавою в",
      level: 46,
      role: "ranged",
      stats: { hp: 14769, mp: 0, attack: 3061, defense: 142, magicDefense: 188, crit: 29, dodge: 23 },
      exp: 6348,
      gold: [106, 202],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.07, qty: [1, 1] },
        { id: "iron_ore", chance: 0.065, qty: [1, 1] }
      ]
    },
    musp_boss_lava_serpent: {
      name: "Лавовий змій",
      range: 3, move: { name: "Удар хвоста", mult: 1.7, chance: 0.25 },
      verb: "б'є хвостом",
      level: 47,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 31078, mp: 2438, attack: 3619, magic: 4262, defense: 206, magicDefense: 347, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Ріка вогню", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Кільця магми", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Нова луска", mp: 70, healPct: 0.1 }
      ],
      exp: 33135,
      gold: [536, 1034],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "rock_crystal", chance: 0.35, qty: [1, 3] },
        { id: "iron_ore", chance: 0.3, qty: [1, 2] },
        { id: "rune_gem", chance: 0.2, qty: [1, 2] },
        { id: "celestial_ore", chance: 0.06, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.04, qty: [1, 1] }
      ]
    },
    musp_fire_giant_smith: {
      name: "Вогняний велетень-коваль",
      humanoid: true,
      weapons: ["axe"],
      range: 1, move: { name: "Удар молота", mult: 1.55, chance: 0.25 },
      verb: "гатить молотом",
      level: 46,
      role: "melee",
      stats: { hp: 14883, mp: 0, attack: 2647, defense: 183, magicDefense: 216, crit: 27, dodge: 22 },
      exp: 6348,
      gold: [106, 202],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "iron_ore", chance: 0.07, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.025, qty: [1, 1] }
      ]
    },
    musp_living_iron: {
      name: "Ожиле залізо",
      range: 1, move: { name: "Залізний кулак", mult: 1.5, chance: 0.25 },
      verb: "б'є залізним кулаком",
      level: 47,
      role: "tank",
      stats: { hp: 27213, mp: 0, attack: 2264, defense: 353, magicDefense: 289, crit: 17, blockPhys: 17 },
      exp: 6627,
      gold: [108, 207],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "iron_ore", chance: 0.091, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.025, qty: [1, 1] }
      ]
    },
    musp_glowing_golem: {
      name: "Розжарений голем",
      range: 1, move: { name: "Розжарені обійми", mult: 1.55, chance: 0.25 },
      verb: "палить дотиком",
      level: 47,
      role: "melee",
      stats: { hp: 15979, mp: 0, attack: 2856, defense: 185, magicDefense: 219, crit: 27, dodge: 22 },
      exp: 6627,
      gold: [108, 207],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "iron_ore", chance: 0.07, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.033, qty: [1, 1] }
      ]
    },
    musp_boss_master_smith_of_muspel: {
      name: "Майстер-коваль Муспелля",
      range: 1, move: { name: "Удар ковальського молота", mult: 1.7, chance: 0.25 },
      verb: "гатить молотом",
      level: 47,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 38008, mp: 1791, attack: 4249, magic: 3245, defense: 474, magicDefense: 330, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Розплавлений метал", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Удар по ковадлу", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Гартування", mp: 70, healPct: 0.1 }
      ],
      exp: 33135,
      gold: [536, 1034],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "iron_ore", chance: 0.35, qty: [1, 3] },
        { id: "rune_gem", chance: 0.2, qty: [1, 2] },
        { id: "celestial_ore", chance: 0.06, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.04, qty: [1, 1] }
      ]
    },
    musp_fire_knight: {
      name: "Вогняний лицар",
      humanoid: true,
      weapons: ["sword"],
      range: 1, move: { name: "Палаючий клинок", mult: 1.55, chance: 0.25 },
      verb: "рубає палаючим мечем",
      level: 47,
      role: "melee",
      stats: { hp: 15180, mp: 0, attack: 2713, defense: 185, magicDefense: 219, crit: 27, dodge: 22 },
      exp: 6627,
      gold: [108, 207],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.07, qty: [1, 1] },
        { id: "rune_gem", chance: 0.03, qty: [1, 1] }
      ]
    },
    musp_flame_mage: {
      name: "Маг полум'я",
      humanoid: true,
      weapons: ["staff"],
      range: 3, move: { name: "Удар посохом", mult: 1.55, chance: 0.25 },
      verb: "б'є посохом",
      level: 47,
      role: "caster",
      stats: { hp: 14017, mp: 1443, attack: 1535, magic: 2036, defense: 178, magicDefense: 345, crit: 17, blockMag: 17 },
      spell: { name: "Вогняна куля", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 6627,
      gold: [108, 207],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.091, qty: [1, 1] },
        { id: "rune_gem", chance: 0.03, qty: [1, 1] }
      ]
    },
    musp_obsidian_sentinel: {
      name: "Обсидіановий вартовий",
      range: 1, move: { name: "Удар обсидіановим щитом", mult: 1.5, chance: 0.25 },
      verb: "б'є щитом",
      level: 48,
      role: "tank",
      stats: { hp: 27758, mp: 0, attack: 2320, defense: 356, magicDefense: 292, crit: 17, blockPhys: 17 },
      exp: 6912,
      gold: [110, 211],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.07, qty: [1, 1] },
        { id: "rune_gem", chance: 0.039, qty: [1, 1] }
      ]
    },
    musp_boss_fortress_commander: {
      name: "Комендант фортеці",
      range: 1, move: { name: "Удар булавою", mult: 1.7, chance: 0.25 },
      verb: "гатить булавою",
      level: 48,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 38768, mp: 1809, attack: 4101, magic: 3132, defense: 480, magicDefense: 335, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Вогняний наказ", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Удар обсидіанового щита", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Друге дихання", mp: 70, healPct: 0.1 }
      ],
      exp: 34560,
      gold: [547, 1056],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "rock_crystal", chance: 0.35, qty: [1, 3] },
        { id: "rune_gem", chance: 0.3, qty: [1, 2] },
        { id: "celestial_ore", chance: 0.06, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.04, qty: [1, 1] }
      ]
    },
    musp_flame_priestess: {
      name: "Жриця полум'я",
      humanoid: true,
      weapons: ["staff"],
      range: 2, move: { name: "Удар жезлом", mult: 1.55, chance: 0.25 },
      verb: "б'є жезлом",
      level: 48,
      role: "healer",
      stats: { hp: 12066, mp: 2296, attack: 954, magic: 1406, defense: 160, magicDefense: 297, crit: 11, blockMag: 17 },
      spell: { name: "Молитва вогню", mp: 30, mult: 1.5, chance: 0.4 },
      exp: 6912,
      gold: [110, 211],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.05, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.04, qty: [1, 1] }
      ]
    },
    musp_fire_bird: {
      name: "Вогняний птах",
      range: 3, move: { name: "Палаюче перо", mult: 1.55, chance: 0.25 },
      verb: "метає палаючі пера в",
      level: 48,
      role: "ranged",
      stats: { hp: 15365, mp: 0, attack: 3216, defense: 145, magicDefense: 191, crit: 29, dodge: 23 },
      exp: 6912,
      gold: [110, 211],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.065, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.04, qty: [1, 1] }
      ]
    },
    musp_chest_guardian: {
      name: "Сторож скрині",
      range: 1, move: { name: "Удар окутим кулаком", mult: 1.5, chance: 0.25 },
      verb: "б'є кулаком",
      level: 48,
      role: "tank",
      stats: { hp: 27758, mp: 0, attack: 2320, defense: 356, magicDefense: 292, crit: 17, blockPhys: 17 },
      exp: 6912,
      gold: [110, 211],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.05, qty: [1, 1] },
        { id: "lizard_leather", chance: 0.052, qty: [1, 1] }
      ]
    },
    musp_boss_sinmara: {
      name: "Сінмара",
      range: 3, move: { name: "Удар жаровнею", mult: 1.7, chance: 0.25 },
      verb: "б'є жаровнею",
      level: 49,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 32333, mp: 2487, attack: 3472, magic: 4094, defense: 211, magicDefense: 355, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Полум'я Леватейна", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Дев'ять замків", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Тепло домашнього вогнища", mp: 70, healPct: 0.1 }
      ],
      exp: 36015,
      gold: [559, 1078],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "rune_gem", chance: 0.35, qty: [1, 3] },
        { id: "lizard_leather", chance: 0.3, qty: [1, 2] },
        { id: "celestial_ore", chance: 0.06, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.04, qty: [1, 1] }
      ]
    },
    musp_steam_spirit: {
      name: "Паровий дух",
      range: 3, move: { name: "Обпікаюча пара", mult: 1.55, chance: 0.25 },
      verb: "обпікає парою",
      level: 48,
      role: "caster",
      stats: { hp: 15050, mp: 1458, attack: 1657, magic: 2196, defense: 180, magicDefense: 348, crit: 17, blockMag: 17 },
      spell: { name: "Гарячий туман", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 6912,
      gold: [110, 211],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.06, qty: [1, 1] },
        { id: "white_pelt", chance: 0.05, qty: [1, 1] }
      ]
    },
    musp_frost_shade: {
      name: "Інеїста тінь",
      range: 1, move: { name: "Крижаний дотик", mult: 1.55, chance: 0.25 },
      verb: "морозить дотиком",
      level: 49,
      role: "melee",
      stats: { hp: 16625, mp: 0, attack: 3001, defense: 190, magicDefense: 224, crit: 27, dodge: 22 },
      exp: 7203,
      gold: [113, 216],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.078, qty: [1, 1] },
        { id: "white_pelt", chance: 0.05, qty: [1, 1] }
      ]
    },
    musp_chaos_spirit: {
      name: "Дух первісного хаосу",
      range: 3, move: { name: "Удар порожнечі", mult: 1.55, chance: 0.25 },
      verb: "б'є порожнечею",
      level: 49,
      role: "caster",
      stats: { hp: 15352, mp: 1472, attack: 1698, magic: 2251, defense: 182, magicDefense: 353, crit: 17, blockMag: 17 },
      spell: { name: "Подих Гіннунгагапу", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 7203,
      gold: [113, 216],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "rock_crystal", chance: 0.06, qty: [1, 1] },
        { id: "white_pelt", chance: 0.065, qty: [1, 1] }
      ]
    },
    musp_boss_echo_of_ymir: {
      name: "Відлуння Іміра",
      range: 1, move: { name: "Удар першого велетня", mult: 1.7, chance: 0.25 },
      verb: "гатить кулаком",
      level: 49,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 39544, mp: 1827, attack: 4346, magic: 3321, defense: 485, magicDefense: 338, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Лід і полум'я", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Крок першого велетня", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Кров, що стала морем", mp: 70, healPct: 0.1 }
      ],
      exp: 36015,
      gold: [559, 1078],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.3, qty: [1, 2] },
        { id: "rock_crystal", chance: 0.35, qty: [1, 3] },
        { id: "white_pelt", chance: 0.3, qty: [1, 2] },
        { id: "rune_gem", chance: 0.2, qty: [1, 2] },
        { id: "celestial_ore", chance: 0.06, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.04, qty: [1, 1] }
      ]
    },
    musp_son_of_muspel: {
      name: "Син Муспелля",
      humanoid: true,
      weapons: ["sword"],
      range: 1, move: { name: "Удар вогняним мечем", mult: 1.55, chance: 0.25 },
      verb: "рубає вогняним мечем",
      level: 49,
      role: "melee",
      stats: { hp: 15794, mp: 0, attack: 2851, defense: 190, magicDefense: 224, crit: 27, dodge: 22 },
      exp: 7203,
      gold: [113, 216],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.035, qty: [1, 1] }
      ]
    },
    musp_fire_drake: {
      name: "Вогняний дракон",
      range: 3, move: { name: "Вогняний подих", mult: 1.55, chance: 0.25 },
      verb: "дихає вогнем на",
      level: 50,
      role: "ranged",
      stats: { hp: 15985, mp: 0, attack: 3379, defense: 149, magicDefense: 196, crit: 29, dodge: 23 },
      exp: 7500,
      gold: [115, 220],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.039, qty: [1, 1] },
        { id: "rune_gem", chance: 0.035, qty: [1, 1] }
      ]
    },
    musp_surtrs_guard: {
      name: "Гвардієць Сурта",
      humanoid: true,
      weapons: ["axe"],
      range: 1, move: { name: "Удар сокири", mult: 1.5, chance: 0.25 },
      verb: "рубає сокирою",
      level: 50,
      role: "tank",
      stats: { hp: 27436, mp: 0, attack: 2317, defense: 365, magicDefense: 300, crit: 17, blockPhys: 17 },
      exp: 7500,
      gold: [115, 220],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.03, qty: [1, 1] },
        { id: "rune_gem", chance: 0.046, qty: [1, 1] }
      ]
    },
    musp_boss_surtr: {
      name: "Сурт",
      range: 1, move: { name: "Удар вогняного меча", mult: 1.8, chance: 0.25 },
      verb: "рубає вогняним мечем",
      level: 50,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 29560, mp: 1945, attack: 5432, magic: 3527, defense: 264, magicDefense: 264, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Полум'я Рагнарьоку", mp: 60, mult: 2.8 },
        { kind: "stun", name: "Меч, що яскравіший за сонце", mp: 45, mult: 1.35 },
        { kind: "heal", name: "Жар Муспельгейму", mp: 70, healPct: 0.12 }
      ],
      exp: 48750,
      gold: [741, 1430],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "darksteel_ingot", chance: 0.45, qty: [1, 2] },
        { id: "rune_gem", chance: 0.3, qty: [1, 2] },
        { id: "celestial_ore", chance: 0.15, qty: [1, 2] },
        { id: "sun_gold_ingot", chance: 0.1, qty: [1, 1] }
      ]
    },
    // ---------- АСГАРД (світ 8) — вороги 50–56 рівня, фінальна боса Хелла — 60 ----------
    // Спорядження з ворогів не падає (worlds.js → CRAFT_ONLY_FROM) — матеріали 6 виду, зілля й ключі; з босів зрідка — матеріали 7 виду
    // (на запас: кувати тір 7 можна лише з відкритим світом 9). Сила — від ворогів Йотунгейму тієї ж ролі з ростом за рівень (tools/balance.js asg_ --rarity epic).
    asg_draugr_stormtrooper: {
      name: "Драуг-штурмовик",
      range: 1, move: { name: "Штурмовий удар", mult: 1.55, chance: 0.25 },
      verb: "рубає з розгону",
      level: 50,
      role: "melee",
      stats: { hp: 24171, mp: 0, attack: 4385, defense: 244, magicDefense: 288, crit: 27, dodge: 22 },
      exp: 7500,
      gold: [115, 220],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.07, qty: [1, 1] },
        { id: "bifrost_shard", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_hels_rider: {
      name: "Вершник Хелли",
      range: 1, move: { name: "Мертвий наскок", mult: 1.55, chance: 0.25 },
      verb: "топче мертвим конем",
      level: 50,
      role: "melee",
      stats: { hp: 24171, mp: 0, attack: 4385, defense: 244, magicDefense: 288, crit: 27, dodge: 22 },
      exp: 7500,
      gold: [115, 220],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.091, qty: [1, 1] },
        { id: "bifrost_shard", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_dead_man_of_naglfar: {
      name: "Мрець з Нагльфара",
      range: 1, move: { name: "Удар веслом", mult: 1.5, chance: 0.25 },
      verb: "гамселить важким веслом",
      level: 50,
      role: "tank",
      stats: { hp: 41166, mp: 0, attack: 3476, defense: 464, magicDefense: 382, crit: 17, blockPhys: 17 },
      exp: 7500,
      gold: [115, 220],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.07, qty: [1, 1] },
        { id: "bifrost_shard", chance: 0.046, qty: [1, 1] }
      ]
    },
    asg_boss_hrym: {
      name: "Хрюм",
      range: 1, move: { name: "Крижаний молот", mult: 1.7, chance: 0.25 },
      verb: "трощить кригою",
      level: 51,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 60417, mp: 1864, attack: 5869, magic: 4491, defense: 632, magicDefense: 441, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Подих інею", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Крижаний міст", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Стерно Нагльфара", mp: 70, healPct: 0.1 }
      ],
      exp: 39015,
      gold: [581, 1122],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "celestial_ingot", chance: 0.3, qty: [1, 2] },
        { id: "celestial_ore", chance: 0.35, qty: [1, 3] },
        { id: "bifrost_shard", chance: 0.3, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "mimir_water", chance: 0.04, qty: [1, 1] }
      ]
    },
    asg_bog_corpse: {
      name: "Болотяний мрець",
      range: 1, move: { name: "Мулова хватка", mult: 1.5, chance: 0.25 },
      verb: "тягне в мул",
      level: 51,
      role: "tank",
      stats: { hp: 41990, mp: 0, attack: 3562, defense: 470, magicDefense: 386, crit: 17, blockPhys: 17 },
      exp: 7803,
      gold: [117, 224],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_ash", chance: 0.07, qty: [1, 1] },
        { id: "eagle_feather", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_seidkona_witch: {
      name: "Відьма-сейдкона",
      range: 3, move: { name: "Чари сейду", mult: 1.55, chance: 0.25 },
      verb: "насилає сейд на",
      level: 51,
      role: "caster",
      stats: { hp: 22766, mp: 1502, attack: 2543, magic: 3371, defense: 237, magicDefense: 460, crit: 17, blockMag: 17 },
      spell: { name: "Нитка прокляття", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 7803,
      gold: [117, 224],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_ash", chance: 0.091, qty: [1, 1] },
        { id: "eagle_feather", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_bog_viper: {
      name: "Болотяна гадюка",
      range: 3, move: { name: "Отруйний плювок", mult: 1.55, chance: 0.25 },
      verb: "плює отрутою в",
      level: 51,
      role: "ranged",
      stats: { hp: 23243, mp: 0, attack: 4937, defense: 191, magicDefense: 254, crit: 29, dodge: 23 },
      exp: 7803,
      gold: [117, 224],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_ash", chance: 0.07, qty: [1, 1] },
        { id: "eagle_feather", chance: 0.046, qty: [1, 1] }
      ]
    },
    asg_boss_angrboda_hel_empowered_form: {
      name: "Ангрбода (посилена Хеллою)",
      range: 3, move: { name: "Вовче прокляття", mult: 1.7, chance: 0.25 },
      verb: "насилає вовчу тьму на",
      level: 52,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 50390, mp: 2562, attack: 5439, magic: 6409, defense: 279, magicDefense: 468, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Пряжа Хелли", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Болотяні пута", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Материнська гниль", mp: 70, healPct: 0.1 }
      ],
      exp: 40560,
      gold: [593, 1144],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "celestial_ingot", chance: 0.3, qty: [1, 2] },
        { id: "white_ash", chance: 0.35, qty: [1, 3] },
        { id: "eagle_feather", chance: 0.3, qty: [1, 2] },
        { id: "bifrost_shard", chance: 0.2, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "mimir_water", chance: 0.04, qty: [1, 1] }
      ]
    },
    asg_fenrirs_wolf: {
      name: "Вовк Фенріра",
      range: 1, move: { name: "Вовча хватка", mult: 1.55, chance: 0.25 },
      verb: "рве іклами",
      level: 51,
      role: "melee",
      stats: { hp: 24654, mp: 0, attack: 4494, defense: 246, magicDefense: 292, crit: 27, dodge: 22 },
      exp: 7803,
      gold: [117, 224],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "eagle_feather", chance: 0.07, qty: [1, 1] },
        { id: "white_ash", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_skoll: {
      name: "Скьоль",
      range: 1, move: { name: "Погоня за Сонцем", mult: 1.55, chance: 0.25 },
      verb: "вгризається в",
      level: 52,
      role: "melee",
      stats: { hp: 25148, mp: 0, attack: 4605, defense: 250, magicDefense: 296, crit: 27, dodge: 22 },
      exp: 8112,
      gold: [120, 229],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "eagle_feather", chance: 0.091, qty: [1, 1] },
        { id: "white_ash", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_hati: {
      name: "Хаті",
      range: 3, move: { name: "Місячне виття", mult: 1.55, chance: 0.25 },
      verb: "виє місячною тьмою на",
      level: 52,
      role: "caster",
      stats: { hp: 23222, mp: 1517, attack: 2606, magic: 3457, defense: 239, magicDefense: 466, crit: 17, blockMag: 17 },
      spell: { name: "Затемнення Місяця", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 8112,
      gold: [120, 229],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "eagle_feather", chance: 0.07, qty: [1, 1] },
        { id: "white_ash", chance: 0.046, qty: [1, 1] }
      ]
    },
    asg_boss_fenrir: {
      name: "Фенрір",
      range: 1, move: { name: "Паща Фенріра", mult: 1.7, chance: 0.25 },
      verb: "розриває пащею",
      level: 52,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 41817, mp: 1985, attack: 6227, magic: 4043, defense: 344, magicDefense: 344, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Виття Рагнарьоку", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Порвані пута", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Голод вовка", mp: 70, healPct: 0.1 }
      ],
      exp: 40560,
      gold: [593, 1144],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "celestial_ingot", chance: 0.3, qty: [1, 2] },
        { id: "eagle_feather", chance: 0.35, qty: [1, 3] },
        { id: "white_ash", chance: 0.3, qty: [1, 2] },
        { id: "bifrost_shard", chance: 0.2, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "mimir_water", chance: 0.04, qty: [1, 1] }
      ]
    },
    asg_utgard_giant: {
      name: "Велетень Утгарда",
      range: 1, move: { name: "Удар брилою", mult: 1.5, chance: 0.25 },
      verb: "трощить брилою",
      level: 52,
      role: "tank",
      stats: { hp: 42830, mp: 0, attack: 3652, defense: 477, magicDefense: 391, crit: 17, blockPhys: 17 },
      exp: 8112,
      gold: [120, 229],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.07, qty: [1, 1] },
        { id: "bifrost_shard", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_stone_troll: {
      name: "Кам'яний троль",
      range: 1, move: { name: "Кам'яний кулак", mult: 1.55, chance: 0.25 },
      verb: "гамселить кулаком",
      level: 52,
      role: "melee",
      stats: { hp: 25148, mp: 0, attack: 4605, defense: 250, magicDefense: 296, crit: 27, dodge: 22 },
      exp: 8112,
      gold: [120, 229],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.091, qty: [1, 1] },
        { id: "bifrost_shard", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_storm_spirit: {
      name: "Грозовий дух",
      range: 3, move: { name: "Розряд", mult: 1.55, chance: 0.25 },
      verb: "б'є блискавкою в",
      level: 53,
      role: "caster",
      stats: { hp: 23686, mp: 1532, attack: 2671, magic: 3543, defense: 244, magicDefense: 470, crit: 17, blockMag: 17 },
      spell: { name: "Ланцюг блискавок", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 8427,
      gold: [122, 233],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.07, qty: [1, 1] },
        { id: "bifrost_shard", chance: 0.046, qty: [1, 1] }
      ]
    },
    asg_boss_hrungnir_hel_empowered_form: {
      name: "Хрунґнір (посилений Хеллою)",
      range: 1, move: { name: "Кам'яне точило", mult: 1.7, chance: 0.25 },
      verb: "трощить точилом",
      level: 53,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 62857, mp: 1901, attack: 6018, magic: 4599, defense: 649, magicDefense: 452, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Уламки точила", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Кам'яне серце", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Гниль у тріщинах", mp: 70, healPct: 0.1 }
      ],
      exp: 42135,
      gold: [604, 1166],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "celestial_ingot", chance: 0.3, qty: [1, 2] },
        { id: "celestial_ore", chance: 0.35, qty: [1, 3] },
        { id: "bifrost_shard", chance: 0.3, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "mimir_water", chance: 0.04, qty: [1, 1] }
      ]
    },
    asg_enthralled_einherjar: {
      name: "Полонений ейнгерій",
      range: 1, move: { name: "Удар ейнгерія", mult: 1.55, chance: 0.25 },
      verb: "рубає мечем",
      level: 53,
      role: "melee",
      stats: { hp: 25652, mp: 0, attack: 4721, defense: 252, magicDefense: 300, crit: 27, dodge: 22 },
      exp: 8427,
      gold: [122, 233],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.035, qty: [1, 1] },
        { id: "eagle_feather", chance: 0.07, qty: [1, 1] }
      ]
    },
    asg_dead_valkyrie: {
      name: "Мертва валькірія",
      range: 2, move: { name: "Удар списом", mult: 1.55, chance: 0.25 },
      verb: "колить списом",
      level: 53,
      role: "healer",
      stats: { hp: 19990, mp: 2413, attack: 1619, magic: 2388, defense: 216, magicDefense: 401, crit: 11, blockMag: 17 },
      spell: { name: "Підняти полеглого", mp: 30, mult: 1.5, chance: 0.4 },
      exp: 8427,
      gold: [122, 233],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.046, qty: [1, 1] },
        { id: "eagle_feather", chance: 0.07, qty: [1, 1] }
      ]
    },
    asg_shadow_raven: {
      name: "Тіньовий ворон",
      range: 3, move: { name: "Дзьоб тіні", mult: 1.55, chance: 0.25 },
      verb: "клює тінню",
      level: 53,
      role: "ranged",
      stats: { hp: 24182, mp: 0, attack: 5187, defense: 197, magicDefense: 260, crit: 29, dodge: 23 },
      exp: 8427,
      gold: [122, 233],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.035, qty: [1, 1] },
        { id: "eagle_feather", chance: 0.091, qty: [1, 1] }
      ]
    },
    asg_boss_hlokk: {
      name: "Хльок",
      range: 3, move: { name: "Бойовий клич", mult: 1.7, chance: 0.25 },
      verb: "оглушує криком",
      level: 54,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 52424, mp: 2614, attack: 5026, magic: 5926, defense: 286, magicDefense: 481, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Шум битви", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Вибір полеглих", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Мед мертвих", mp: 70, healPct: 0.1 }
      ],
      exp: 43740,
      gold: [616, 1188],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "celestial_ingot", chance: 0.3, qty: [1, 2] },
        { id: "sun_gold_ingot", chance: 0.35, qty: [1, 3] },
        { id: "eagle_feather", chance: 0.3, qty: [1, 2] },
        { id: "bifrost_shard", chance: 0.2, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "mimir_water", chance: 0.04, qty: [1, 1] }
      ]
    },
    asg_dark_soul_envoy: {
      name: "Темна душа-посланець",
      range: 3, move: { name: "Темний наказ", mult: 1.55, chance: 0.25 },
      verb: "кидає темряву в",
      level: 54,
      role: "caster",
      stats: { hp: 24158, mp: 1548, attack: 2738, magic: 3631, defense: 246, magicDefense: 477, crit: 17, blockMag: 17 },
      spell: { name: "Вість Хелли", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 8748,
      gold: [124, 238],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_ash", chance: 0.07, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_dark_soul_archer: {
      name: "Темна душа-лучник",
      range: 3, move: { name: "Тіньова стріла", mult: 1.55, chance: 0.25 },
      verb: "стріляє тінню в",
      level: 54,
      role: "ranged",
      stats: { hp: 24665, mp: 0, attack: 5317, defense: 200, magicDefense: 263, crit: 29, dodge: 23 },
      exp: 8748,
      gold: [124, 238],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_ash", chance: 0.091, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_dark_priestess: {
      name: "Темна жриця",
      range: 2, move: { name: "Чорна молитва", mult: 1.55, chance: 0.25 },
      verb: "проклинає",
      level: 54,
      role: "healer",
      stats: { hp: 20391, mp: 2437, attack: 1659, magic: 2447, defense: 221, magicDefense: 407, crit: 11, blockMag: 17 },
      spell: { name: "Темне зцілення", mp: 30, mult: 1.5, chance: 0.4 },
      exp: 8748,
      gold: [124, 238],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "white_ash", chance: 0.07, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.046, qty: [1, 1] }
      ]
    },
    asg_boss_gullveig_hel_empowered_form: {
      name: "Гулльвейг (посилена Хеллою)",
      range: 3, move: { name: "Золотий жар", mult: 1.7, chance: 0.25 },
      verb: "палить золотим жаром",
      level: 55,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 53472, mp: 2640, attack: 4979, magic: 5874, defense: 290, magicDefense: 485, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Четверте полум'я", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Спрага золота", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Попіл, що оживає", mp: 70, healPct: 0.1 }
      ],
      exp: 45375,
      gold: [627, 1210],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "celestial_ingot", chance: 0.3, qty: [1, 2] },
        { id: "white_ash", chance: 0.35, qty: [1, 3] },
        { id: "sun_gold_ingot", chance: 0.3, qty: [1, 2] },
        { id: "bifrost_shard", chance: 0.2, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "mimir_water", chance: 0.04, qty: [1, 1] }
      ]
    },
    asg_draugr_jarl: {
      name: "Драуг-ярл",
      range: 1, move: { name: "Удар ярла", mult: 1.5, chance: 0.25 },
      verb: "рубає важкою сокирою",
      level: 54,
      role: "tank",
      stats: { hp: 44560, mp: 0, attack: 3837, defense: 487, magicDefense: 399, crit: 17, blockPhys: 17 },
      exp: 8748,
      gold: [124, 238],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "bifrost_shard", chance: 0.07, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_dark_soul: {
      name: "Темна душа",
      range: 1, move: { name: "Тіньовий клинок", mult: 1.55, chance: 0.25 },
      verb: "ріже тінню",
      level: 55,
      role: "melee",
      stats: { hp: 26687, mp: 0, attack: 4960, defense: 258, magicDefense: 307, crit: 27, dodge: 22 },
      exp: 9075,
      gold: [126, 242],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "bifrost_shard", chance: 0.091, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.035, qty: [1, 1] }
      ]
    },
    asg_bone_skald: {
      name: "Кістяний скальд",
      range: 3, move: { name: "Пісня кісток", mult: 1.55, chance: 0.25 },
      verb: "співає смерть для",
      level: 55,
      role: "caster",
      stats: { hp: 24644, mp: 1563, attack: 2806, magic: 3721, defense: 248, magicDefense: 483, crit: 17, blockMag: 17 },
      spell: { name: "Драпа загибелі", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 9075,
      gold: [126, 242],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "bifrost_shard", chance: 0.07, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.046, qty: [1, 1] }
      ]
    },
    asg_boss_shadow_of_loki: {
      name: "Тінь Локі",
      range: 1, move: { name: "Підступний удар", mult: 1.7, chance: 0.25 },
      verb: "б'є з тіні",
      level: 55,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 44377, mp: 2045, attack: 5940, magic: 3855, defense: 357, magicDefense: 357, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Сміх обманщика", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Тіньовий двійник", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Отрута змія", mp: 70, healPct: 0.1 }
      ],
      exp: 45375,
      gold: [627, 1210],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "celestial_ingot", chance: 0.3, qty: [1, 2] },
        { id: "bifrost_shard", chance: 0.35, qty: [1, 3] },
        { id: "celestial_ore", chance: 0.3, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "mimir_water", chance: 0.04, qty: [1, 1] }
      ]
    },
    asg_hels_elite_swordsman: {
      name: "Еліта Хелли — мечник",
      range: 1, move: { name: "Чорний клинок", mult: 1.55, chance: 0.25 },
      verb: "рубає чорним мечем",
      level: 55,
      role: "melee",
      stats: { hp: 26687, mp: 0, attack: 4960, defense: 258, magicDefense: 307, crit: 27, dodge: 22 },
      exp: 9075,
      gold: [126, 242],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.05, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.05, qty: [1, 1] }
      ]
    },
    asg_hels_elite_shieldbearer: {
      name: "Еліта Хелли — щитоносець",
      range: 1, move: { name: "Удар щитом", mult: 1.5, chance: 0.25 },
      verb: "б'є щитом",
      level: 56,
      role: "tank",
      stats: { hp: 46360, mp: 0, attack: 4030, defense: 500, magicDefense: 410, crit: 17, blockPhys: 17 },
      exp: 9408,
      gold: [129, 246],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.065, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.05, qty: [1, 1] }
      ]
    },
    asg_hels_elite_sorcerer: {
      name: "Еліта Хелли — чаклун",
      range: 3, move: { name: "Мертве полум'я", mult: 1.55, chance: 0.25 },
      verb: "палить мертвим вогнем",
      level: 56,
      role: "caster",
      stats: { hp: 25135, mp: 1579, attack: 2877, magic: 3814, defense: 252, magicDefense: 489, crit: 17, blockMag: 17 },
      spell: { name: "Зелена смерть", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 9408,
      gold: [129, 246],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.05, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.065, qty: [1, 1] }
      ]
    },
    asg_boss_utgarda_loki_hel_empowered_form: {
      name: "Утгарда-Локі (посилений Хеллою)",
      range: 3, move: { name: "Ілюзія", mult: 1.7, chance: 0.25 },
      verb: "обманює ілюзією",
      level: 56,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 54543, mp: 2666, attack: 5068, magic: 5973, defense: 294, magicDefense: 491, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Поразка, що здається правдою", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Велетень-марево", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Чари Утгарда", mp: 70, healPct: 0.1 }
      ],
      exp: 47040,
      gold: [638, 1232],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "celestial_ingot", chance: 0.3, qty: [1, 2] },
        { id: "sun_gold_ingot", chance: 0.35, qty: [1, 3] },
        { id: "celestial_ore", chance: 0.3, qty: [1, 2] },
        { id: "bifrost_shard", chance: 0.2, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "mimir_water", chance: 0.04, qty: [1, 1] }
      ]
    },
    asg_hels_royal_guard_swordsman: {
      name: "Вартовий Хелли — мечник",
      range: 1, move: { name: "Клинок варти", mult: 1.55, chance: 0.25 },
      verb: "рубає мечем варти",
      level: 56,
      role: "melee",
      stats: { hp: 27220, mp: 0, attack: 5084, defense: 263, magicDefense: 311, crit: 27, dodge: 22 },
      exp: 9408,
      gold: [129, 246],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.05, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.05, qty: [1, 1] }
      ]
    },
    asg_hels_royal_guard_witch: {
      name: "Вартова Хелли — чаклунка",
      range: 3, move: { name: "Чари варти", mult: 1.55, chance: 0.25 },
      verb: "насилає чари на",
      level: 56,
      role: "caster",
      stats: { hp: 25135, mp: 1579, attack: 2877, magic: 3814, defense: 252, magicDefense: 489, crit: 17, blockMag: 17 },
      spell: { name: "Подих Гельгейму", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 9408,
      gold: [129, 246],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.065, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.05, qty: [1, 1] }
      ]
    },
    asg_hels_guard_beast: {
      name: "Звір варти Хелли",
      range: 1, move: { name: "Мертва паща", mult: 1.5, chance: 0.25 },
      verb: "рве мертвою пащею",
      level: 56,
      role: "tank",
      stats: { hp: 46360, mp: 0, attack: 4030, defense: 500, magicDefense: 410, crit: 17, blockPhys: 17 },
      exp: 9408,
      gold: [129, 246],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "celestial_ore", chance: 0.05, qty: [1, 1] },
        { id: "sun_gold_ingot", chance: 0.065, qty: [1, 1] }
      ]
    },
    asg_boss_hel_on_odins_throne: {
      name: "Хелла (Глідскьяльв)",
      range: 3, move: { name: "Дотик смерті", mult: 1.8, chance: 0.25 },
      verb: "торкається смертю",
      level: 60,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 66123, mp: 2774, attack: 6754, magic: 7965, defense: 307, magicDefense: 517, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Погляд з престолу", mp: 60, mult: 2.8 },
        { kind: "stun", name: "Половина мерця", mp: 45, mult: 1.35 },
        { kind: "heal", name: "Жнива дев'яти світів", mp: 70, healPct: 0.12 }
      ],
      exp: 70200,
      gold: [889, 1716],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "celestial_ingot", chance: 0.45, qty: [1, 2] },
        { id: "celestial_ore", chance: 0.35, qty: [1, 3] },
        { id: "sun_gold_ingot", chance: 0.3, qty: [1, 2] },
        { id: "bifrost_shard", chance: 0.2, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.15, qty: [1, 2] },
        { id: "mimir_water", chance: 0.1, qty: [1, 1] }
      ]
    },
    // ---------- НІФЛЬГЕЙМ І ХЕЛЬГЕЙМ (світ 9) — вороги 57–60 рівня, фінальна Хелла — 65 (навмисно вище межі героя 60) ----------
    // Матеріали 7 виду (Іггдрасиль), зілля й ключі; спорядження не падає (worlds.js → CRAFT_ONLY_FROM).
    // Сила — від ворогів Йотунгейму тієї ж ролі з ростом за рівень (tools/balance.js nifl_ --rarity epic).
    nifl_mist_wraith: {
      name: "Туманна примара",
      range: 3, move: { name: "Холодний дотик", mult: 1.55, chance: 0.25 },
      verb: "огортає мрякою",
      level: 57,
      role: "caster",
      stats: { hp: 25639, mp: 1594, attack: 2948, magic: 3910, defense: 254, magicDefense: 494, crit: 17, blockMag: 17 },
      spell: { name: "Крижаний туман", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 9747,
      gold: [131, 251],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_root", chance: 0.078, qty: [1, 1] },
        { id: "ygg_bark", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_ice_wolf: {
      name: "Крижаний вовк",
      range: 1, move: { name: "Крижані ікла", mult: 1.55, chance: 0.25 },
      verb: "рве крижаними іклами",
      level: 57,
      role: "melee",
      stats: { hp: 27766, mp: 0, attack: 5212, defense: 265, magicDefense: 313, crit: 27, dodge: 22 },
      exp: 9747,
      gold: [131, 251],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_root", chance: 0.06, qty: [1, 1] },
        { id: "ygg_bark", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_warden_of_the_mist: {
      name: "Вартовий Мряки",
      range: 1, move: { name: "Удар з туману", mult: 1.7, chance: 0.25 },
      verb: "б'є з туману",
      level: 58,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 69401, mp: 1998, attack: 7731, magic: 5904, defense: 689, magicDefense: 479, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Подих Ніфльгейму", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Сліпа мряка", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Туман загоює", mp: 70, healPct: 0.1 }
      ],
      exp: 50460,
      gold: [661, 1276],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_root", chance: 0.35, qty: [1, 3] },
        { id: "ygg_bark", chance: 0.3, qty: [1, 2] },
        { id: "ygg_heartwood", chance: 0.2, qty: [1, 2] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_rime_thurs: {
      name: "Рімтурс",
      range: 1, move: { name: "Крижаний кулак", mult: 1.5, chance: 0.25 },
      verb: "гамселить крижаним кулаком",
      level: 57,
      role: "tank",
      stats: { hp: 47288, mp: 0, attack: 4131, defense: 506, magicDefense: 414, crit: 17, blockPhys: 17 },
      exp: 9747,
      gold: [131, 251],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_bark", chance: 0.078, qty: [1, 1] },
        { id: "ygg_root", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_ice_serpent: {
      name: "Крижаний змій",
      range: 3, move: { name: "Крижаний плювок", mult: 1.55, chance: 0.25 },
      verb: "плює кригою в",
      level: 58,
      role: "ranged",
      stats: { hp: 26699, mp: 0, attack: 5870, defense: 208, magicDefense: 275, crit: 29, dodge: 23 },
      exp: 10092,
      gold: [133, 255],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "ygg_root", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_bergelmir: {
      name: "Бергельмір",
      range: 1, move: { name: "Удар велетня", mult: 1.7, chance: 0.25 },
      verb: "трощить крижаною палицею",
      level: 58,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 47093, mp: 2107, attack: 7418, magic: 4815, defense: 370, magicDefense: 370, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Кров Іміра", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Крижаний потоп", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Інеєва шкура", mp: 70, healPct: 0.1 }
      ],
      exp: 50460,
      gold: [661, 1276],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.35, qty: [1, 3] },
        { id: "ygg_root", chance: 0.3, qty: [1, 2] },
        { id: "ygg_heartwood", chance: 0.2, qty: [1, 2] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_steam_spirit: {
      name: "Паровий дух",
      range: 3, move: { name: "Окріп", mult: 1.55, chance: 0.25 },
      verb: "обпікає парою",
      level: 58,
      role: "caster",
      stats: { hp: 26151, mp: 1610, attack: 3022, magic: 4007, defense: 258, magicDefense: 500, crit: 17, blockMag: 17 },
      spell: { name: "Кипучий вихор", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 10092,
      gold: [133, 255],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_root", chance: 0.078, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_water_serpentine: {
      name: "Водяний змієвик",
      range: 3, move: { name: "Водяний батіг", mult: 1.55, chance: 0.25 },
      verb: "хльоскає струменем",
      level: 58,
      role: "ranged",
      stats: { hp: 26699, mp: 0, attack: 5870, defense: 208, magicDefense: 275, crit: 29, dodge: 23 },
      exp: 10092,
      gold: [133, 255],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_root", chance: 0.06, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_grabakr: {
      name: "Ґрабак",
      range: 1, move: { name: "Укус Ґрабака", mult: 1.7, chance: 0.25 },
      verb: "вгризається в",
      level: 59,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 48033, mp: 2128, attack: 7577, magic: 4915, defense: 374, magicDefense: 374, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Отрута джерела", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Кільця змія", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Сік кореня", mp: 70, healPct: 0.1 }
      ],
      exp: 52215,
      gold: [673, 1298],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_root", chance: 0.35, qty: [1, 3] },
        { id: "ygg_heartwood", chance: 0.2, qty: [1, 2] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_rotten_sprout: {
      name: "Гнилий паросток",
      range: 2, move: { name: "Гнилий батіг", mult: 1.55, chance: 0.25 },
      verb: "хльоскає гнилим пагоном",
      level: 58,
      role: "healer",
      stats: { hp: 22071, mp: 2536, attack: 1831, magic: 2701, defense: 231, magicDefense: 426, crit: 11, blockMag: 17 },
      spell: { name: "Сік гнилі", mp: 30, mult: 1.5, chance: 0.4 },
      exp: 10092,
      gold: [133, 255],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_bark", chance: 0.078, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_root_worm: {
      name: "Кореневий черв",
      range: 1, move: { name: "Обвиття", mult: 1.5, chance: 0.25 },
      verb: "обвиває й душить",
      level: 58,
      role: "tank",
      stats: { hp: 48233, mp: 0, attack: 4234, defense: 510, magicDefense: 420, crit: 17, blockPhys: 17 },
      exp: 10092,
      gold: [133, 255],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_goinn_and_moinn: {
      name: "Ґоїн і Моїн",
      range: 1, move: { name: "Подвійний укус", mult: 1.7, chance: 0.25 },
      verb: "кусають удвох",
      level: 59,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 48033, mp: 2128, attack: 7524, magic: 4881, defense: 374, magicDefense: 374, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Гниль кореня", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Подвійні кільця", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Сік Дерева", mp: 70, healPct: 0.1 }
      ],
      exp: 52215,
      gold: [673, 1298],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.35, qty: [1, 3] },
        { id: "ygg_heartwood", chance: 0.2, qty: [1, 2] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_night_harpy: {
      name: "Нічна гарпія",
      range: 3, move: { name: "Кігті з темряви", mult: 1.55, chance: 0.25 },
      verb: "пікірує на",
      level: 58,
      role: "ranged",
      stats: { hp: 26699, mp: 0, attack: 5870, defense: 208, magicDefense: 275, crit: 29, dodge: 23 },
      exp: 10092,
      gold: [133, 255],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.078, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_stone_draugr: {
      name: "Кам'яний драуг",
      range: 1, move: { name: "Кам'яний удар", mult: 1.5, chance: 0.25 },
      verb: "б'є кам'яним кулаком",
      level: 59,
      role: "tank",
      stats: { hp: 49199, mp: 0, attack: 4341, defense: 517, magicDefense: 424, crit: 17, blockPhys: 17 },
      exp: 10443,
      gold: [136, 260],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.06, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_svafnir_and_ofnir: {
      name: "Свавнір і Офнір",
      range: 3, move: { name: "Шепіт змія", mult: 1.7, chance: 0.25 },
      verb: "шепочуть прокляття на",
      level: 59,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 57880, mp: 2747, attack: 6575, magic: 7754, defense: 305, magicDefense: 510, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Прокляття Дерева", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Сон змія", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Скинута шкура", mp: 70, healPct: 0.1 }
      ],
      exp: 52215,
      gold: [673, 1298],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_heartwood", chance: 0.3, qty: [1, 2] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_dragon_hatchling: {
      name: "Драконовий виводок",
      range: 1, move: { name: "Гострі зуби", mult: 1.55, chance: 0.25 },
      verb: "кусає",
      level: 59,
      role: "melee",
      stats: { hp: 28888, mp: 0, attack: 5475, defense: 271, magicDefense: 321, crit: 27, dodge: 22 },
      exp: 10443,
      gold: [136, 260],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.078, qty: [1, 1] },
        { id: "ygg_bark", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_corpse_eater: {
      name: "Трупоїд",
      range: 1, move: { name: "Ненажерливий укус", mult: 1.55, chance: 0.25 },
      verb: "рве гнилими зубами",
      level: 59,
      role: "melee",
      stats: { hp: 28888, mp: 0, attack: 5475, defense: 271, magicDefense: 321, crit: 27, dodge: 22 },
      exp: 10443,
      gold: [136, 260],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.06, qty: [1, 1] },
        { id: "ygg_bark", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_nidhogg: {
      name: "Нідгьоґ",
      range: 1, move: { name: "Паща Нідгьоґа", mult: 1.7, chance: 0.25 },
      verb: "рве драконячою пащею",
      level: 60,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 72204, mp: 2038, attack: 7655, magic: 5849, defense: 706, magicDefense: 491, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Подих гнилі", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Удар хвоста", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Трупна учта", mp: 70, healPct: 0.1 }
      ],
      exp: 54000,
      gold: [684, 1320],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_heartwood", chance: 0.35, qty: [1, 3] },
        { id: "ygg_bark", chance: 0.3, qty: [1, 2] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_drowned_soul: {
      name: "Утоплена душа",
      range: 3, move: { name: "Холодна вода", mult: 1.55, chance: 0.25 },
      verb: "тягне під воду",
      level: 59,
      role: "caster",
      stats: { hp: 26674, mp: 1627, attack: 3098, magic: 4108, defense: 260, magicDefense: 506, crit: 17, blockMag: 17 },
      spell: { name: "Плач Ґйолля", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 10443,
      gold: [136, 260],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.078, qty: [1, 1] },
        { id: "ygg_root", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_bridge_warden: {
      name: "Мостовий вартовий",
      humanoid: true,
      weapons: ["axe"],
      range: 1, move: { name: "Удар сокири", mult: 1.5, chance: 0.25 },
      verb: "рубає сокирою",
      level: 59,
      role: "tank",
      stats: { hp: 46738, mp: 0, attack: 4122, defense: 517, magicDefense: 424, crit: 17, blockPhys: 17 },
      exp: 10443,
      gold: [136, 260],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.06, qty: [1, 1] },
        { id: "ygg_root", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_modgud: {
      name: "Модгуд",
      range: 3, move: { name: "Ім'я мерця", mult: 1.7, chance: 0.25 },
      verb: "кличе на ім'я",
      level: 60,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 59039, mp: 2774, attack: 6422, magic: 7578, defense: 307, magicDefense: 517, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Дзвін мосту", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Крок у Ґйолль", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Плата мерців", mp: 70, healPct: 0.1 }
      ],
      exp: 54000,
      gold: [684, 1320],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_root", chance: 0.3, qty: [1, 2] },
        { id: "ygg_heartwood", chance: 0.2, qty: [1, 2] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_hellhound: {
      name: "Пекельний пес",
      range: 1, move: { name: "Вогняні ікла", mult: 1.55, chance: 0.25 },
      verb: "рве палаючими іклами",
      level: 59,
      role: "melee",
      stats: { hp: 28888, mp: 0, attack: 5475, defense: 271, magicDefense: 321, crit: 27, dodge: 22 },
      exp: 10443,
      gold: [136, 260],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.078, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_bone_hound: {
      name: "Кістяний гончак",
      range: 1, move: { name: "Кістяна хватка", mult: 1.55, chance: 0.25 },
      verb: "вчіплюється кістяними щелепами в",
      level: 60,
      role: "melee",
      stats: { hp: 29465, mp: 0, attack: 5613, defense: 275, magicDefense: 326, crit: 27, dodge: 22 },
      exp: 10800,
      gold: [138, 264],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.06, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_garm: {
      name: "Гарм",
      range: 1, move: { name: "Паща Гарма", mult: 1.7, chance: 0.25 },
      verb: "рве закривавленою пащею",
      level: 60,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 48995, mp: 2149, attack: 7539, magic: 4896, defense: 380, magicDefense: 380, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Виття Гарма", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Зірваний ланцюг", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Кров на грудях", mp: 70, healPct: 0.1 }
      ],
      exp: 54000,
      gold: [684, 1320],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_heartwood", chance: 0.35, qty: [1, 3] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_draugr_gatekeeper: {
      name: "Драуг-брамник",
      humanoid: true,
      weapons: ["axe"],
      range: 1, move: { name: "Удар брами", mult: 1.5, chance: 0.25 },
      verb: "рубає важкою сокирою",
      level: 60,
      role: "tank",
      stats: { hp: 47672, mp: 0, attack: 4225, defense: 523, magicDefense: 431, crit: 17, blockPhys: 17 },
      exp: 10800,
      gold: [138, 264],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_bark", chance: 0.078, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_bone_knight: {
      name: "Кістяний лицар",
      humanoid: true,
      weapons: ["sword"],
      range: 1, move: { name: "Кістяний клинок", mult: 1.55, chance: 0.25 },
      verb: "рубає мечем",
      level: 60,
      role: "melee",
      stats: { hp: 27991, mp: 0, attack: 5332, defense: 275, magicDefense: 326, crit: 27, dodge: 22 },
      exp: 10800,
      gold: [138, 264],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_bark", chance: 0.06, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_gatekeeper_of_helgrind: {
      name: "Брамник Хельгринду",
      range: 1, move: { name: "Залізна брама", mult: 1.7, chance: 0.25 },
      verb: "трощить залізною рукою",
      level: 60,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "tank",
      stats: { hp: 72204, mp: 2038, attack: 7604, magic: 5810, defense: 706, magicDefense: 491, crit: 17, dodge: 12, blockPhys: 17, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Зачинена брама", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Ключ мерців", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Кам'яна шкура", mp: 70, healPct: 0.1 }
      ],
      exp: 54000,
      gold: [684, 1320],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_bark", chance: 0.35, qty: [1, 3] },
        { id: "ygg_heartwood", chance: 0.3, qty: [1, 2] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_dark_soul_swordsman: {
      name: "Темна душа — мечник",
      humanoid: true,
      weapons: ["sword"],
      range: 1, move: { name: "Клинок зради", mult: 1.55, chance: 0.25 },
      verb: "б'є в спину",
      level: 60,
      role: "melee",
      stats: { hp: 27991, mp: 0, attack: 5332, defense: 275, magicDefense: 326, crit: 27, dodge: 22 },
      exp: 10800,
      gold: [138, 264],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_root", chance: 0.078, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_dark_soul_archer: {
      name: "Темна душа — лучник",
      humanoid: true,
      weapons: ["bow"],
      range: 3, move: { name: "Отруйна стріла", mult: 1.55, chance: 0.25 },
      verb: "стріляє отруєною стрілою в",
      level: 60,
      role: "ranged",
      stats: { hp: 26389, mp: 0, attack: 5857, defense: 214, magicDefense: 281, crit: 29, dodge: 23 },
      exp: 10800,
      gold: [138, 264],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_root", chance: 0.06, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_the_first_traitor: {
      name: "Перший Зрадник",
      range: 1, move: { name: "Порушена клятва", mult: 1.7, chance: 0.25 },
      verb: "зраджує й б'є",
      level: 60,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "melee",
      stats: { hp: 48995, mp: 2149, attack: 7583, magic: 4925, defense: 380, magicDefense: 380, crit: 26, dodge: 24, blockPhys: 18, blockMag: 16 },
      skills: [
        { kind: "magic", name: "Отрута з даху", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Ніж у спину", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Чуже життя", mp: 70, healPct: 0.1 }
      ],
      exp: 54000,
      gold: [684, 1320],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_root", chance: 0.35, qty: [1, 3] },
        { id: "ygg_heartwood", chance: 0.3, qty: [1, 2] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_captive_einherjar: {
      name: "Полонений ейнгерій",
      humanoid: true,
      weapons: ["sword","axe"],
      range: 1, move: { name: "Удар полоненого", mult: 1.55, chance: 0.25 },
      verb: "б'є без волі",
      level: 60,
      role: "melee",
      stats: { hp: 27991, mp: 0, attack: 5332, defense: 275, magicDefense: 326, crit: 27, dodge: 22 },
      exp: 10800,
      gold: [138, 264],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.078, qty: [1, 1] },
        { id: "ygg_root", chance: 0.03, qty: [1, 1] }
      ]
    },
    nifl_servant_of_hel: {
      name: "Слуга Хелли",
      humanoid: true,
      weapons: ["staff"],
      range: 2, move: { name: "Удар жезлом", mult: 1.55, chance: 0.25 },
      verb: "б'є жезлом",
      level: 60,
      role: "healer",
      stats: { hp: 21815, mp: 2587, attack: 1829, magic: 2696, defense: 235, magicDefense: 437, crit: 11, blockMag: 17 },
      spell: { name: "Молитва Хеллі", mp: 30, mult: 1.5, chance: 0.4 },
      exp: 10800,
      gold: [138, 264],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.06, qty: [1, 1] },
        { id: "ygg_root", chance: 0.039, qty: [1, 1] }
      ]
    },
    nifl_boss_ganglati_and_ganglot: {
      name: "Ґанґлаті й Ґанґлот",
      range: 3, move: { name: "Повільна смерть", mult: 1.7, chance: 0.25 },
      verb: "повільно душать",
      level: 60,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 59039, mp: 2774, attack: 6235, magic: 7358, defense: 307, magicDefense: 517, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Прихід Хелли", mp: 60, mult: 2.6 },
        { kind: "stun", name: "Застиглий час", mp: 45, mult: 1.25 },
        { kind: "heal", name: "Служба мертвим", mp: 70, healPct: 0.1 }
      ],
      exp: 54000,
      gold: [684, 1320],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.3, qty: [1, 2] },
        { id: "ygg_heartwood", chance: 0.35, qty: [1, 3] },
        { id: "ygg_root", chance: 0.3, qty: [1, 2] },
        { id: "mimir_water", chance: 0.08, qty: [1, 1] },
        { id: "star_spark", chance: 0.06, qty: [1, 1] }
      ]
    },
    nifl_hel_guard_knight: {
      name: "Хельська гвардія — лицар",
      humanoid: true,
      weapons: ["sword"],
      range: 1, move: { name: "Клинок гвардії", mult: 1.5, chance: 0.25 },
      verb: "рубає мечем гвардії",
      level: 60,
      role: "tank",
      stats: { hp: 47672, mp: 0, attack: 4225, defense: 523, magicDefense: 431, crit: 17, blockPhys: 17 },
      exp: 10800,
      gold: [138, 264],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.065, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.05, qty: [1, 1] }
      ]
    },
    nifl_hel_guard_witch: {
      name: "Хельська гвардія — чаклунка",
      humanoid: true,
      weapons: ["staff"],
      range: 3, move: { name: "Удар посохом", mult: 1.55, chance: 0.25 },
      verb: "б'є посохом",
      level: 60,
      role: "caster",
      stats: { hp: 25847, mp: 1643, attack: 3016, magic: 4001, defense: 265, magicDefense: 512, crit: 17, blockMag: 17 },
      spell: { name: "Подих Хельгейму", mp: 28, mult: 1.5, chance: 0.4 },
      exp: 10800,
      gold: [138, 264],
      loot: [
        { id: "potion_hp_large", chance: 0.14, qty: [1, 1] },
        { id: "potion_mp_large", chance: 0.1, qty: [1, 1] },
        { id: "potion_magic", chance: 0.03, qty: [1, 1] },
        { id: "ygg_heartwood", chance: 0.05, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.065, qty: [1, 1] }
      ]
    },
    nifl_boss_hel_final_form: {
      name: "Хелла (фінальна форма)",
      range: 3, move: { name: "Дотик смерті", mult: 1.9, chance: 0.25 },
      verb: "торкається смертю",
      level: 65,
      boss: true, noChampion: true, spawnWeight: 0.1,
      role: "caster",
      stats: { hp: 310269, mp: 2916, attack: 9878, magic: 11651, defense: 326, magicDefense: 548, crit: 16, dodge: 23, blockPhys: 17, blockMag: 15 },
      skills: [
        { kind: "magic", name: "Жнива дев'яти світів", mp: 60, mult: 2.9 },
        { kind: "stun", name: "Половина мерця", mp: 45, mult: 1.4 },
        { kind: "heal", name: "Трон Хельгейму", mp: 70, healPct: 0.12 }
      ],
      exp: 92950,
      gold: [1112, 2145],
      loot: [
        { id: "potion_hp_large", chance: 0.35, qty: [1, 2] },
        { id: "potion_mp_large", chance: 0.3, qty: [1, 2] },
        { id: "potion_magic", chance: 0.15, qty: [1, 1] },
        { id: "ygg_sap", chance: 0.5, qty: [1, 2] },
        { id: "ygg_heartwood", chance: 0.35, qty: [1, 3] },
        { id: "mimir_water", chance: 0.35, qty: [1, 2] },
        { id: "star_spark", chance: 0.3, qty: [1, 2] }
      ]
    }
  };

  // ---------- Локації ----------
  // type:
  //   "home"   — Домівка: битися заборонено, скриня, +5% HP/MP кожні 10 с
  //   "temple" — Храм: тут відроджуються загиблі, молитва за полеглих у групі
  //   "tavern" — Шинок: торговець (shop — що він продає)
  //   "city"   — Дубова Застава з районами (districts); Гільдія авантюристів — у Південному
  //   "combat" — бойова локація (enemies — хто трапляється)
  // locked: true — «Закрито — відкриється згодом»
  // minLevel: N — вхід лише з N рівня героя
  // chest: "<id сховища>" — у локації стоїть скриня (character.js → CHEST_STORAGES).
  //   Скрині з однаковим id пов'язані — у них спільний вміст; новий id — окрема скриня.
  // ID локацій НЕ перейменовувати (вони в сейвах). village_start — це Ферма.
  // edge — краї поля бою (game.js → fieldEdges): "trees" дерева, "rocks" скелі, "walls" стіни, "water" вода.
  //   Рядок — однакові з усіх боків; масив [верх, право, низ, ліво] — різні (сторони поля на ПК;
  //   на телефоні поле повернуте, і краї повертаються разом з ним). Без edge — дерева.
  // cover — перешкоди на полі бою (battle.js → makeObstacles): { block: ["tree"|"rock"|"wall"], low: ["bush"|"stone"] }.
  //   Без cover — за краями: дерева → дерева й кущі, скелі → скелі й каміння, стіни → стіни й каміння.
  //   В DUNGEONS edge / cover теж можна задати — тоді в данжі вони замінюють локаційні.
  const LOCATIONS = {
    home: {
      name: "Домівка",
      type: "home",
      chest: "main",
      description: "Рідна хата. Тут не б'ються: можна перепочити, розібрати речі й сховати цінне в скриню."
    },
    temple: {
      name: "Храм",
      type: "temple",
      description: "Сюди повертаються полеглі. Молитва тут відроджує загиблих побратимів."
    },
    village_start: {
      name: "Ферма",
      type: "combat",
      description: "Звідки беруться ці щури — з льоху під коморою, з підвалу під амбаром чи з поля? Тут водяться лише вони, а от за полем, у лісі, вже виють вовки…",
      enemies: ["rat", "rat2", "rat3"],
      edge: ["trees", "water", "trees", "trees"]   // поле між гаями, з одного боку — річка
    },
    tavern: {
      name: "Шинок біля млина",
      type: "tavern",
      description: "Пахне хлібом і пивом. Шинкар купує все, але дешево, а продає — дорожче.",
      merchant: "Шинкар Остап",
      shop: [
        "potion_hp_small", "potion_hp_medium", "potion_mp_small", "potion_mp_medium",
        "sword_t1", "dagger_t1", "staff_t1", "shield_t1",
        "linen_head", "linen_chest", "linen_legs", "linen_hands", "linen_feet"
      ]
    },
    // Південні ворота Дубової Застави на стартовій мапі (region "start"): дійшовши сюди, герой одразу входить у Дубову Заставу
    south_gate: {
      name: "Південний район",
      type: "citygate", city: "city", district: "south",
      description: "Південні ворота Дубової Застави. За ними — Південний район з Гільдією авантюристів, а далі — інші райони Застави."
    },
    // Дубова Застава — окрема мапа (region "city"): герой ходить між районами (save.location.district)
    city: {
      name: "Дубова Застава",
      type: "city", region: "city",
      description: "Дубові частоколи, кам'яні мури, дзвони й гамір вулиць — остання фортеця, що тримається проти Хелли. Застава ділиться на райони: у Південному стоїть Гільдія авантюристів, а в Центральному — Мерія з Дошкою оголошень (варта пускає туди з 6 рівня).",
      // Райони Дубової Застави. locked: true — «Закрито — відкриється згодом»
      districts: [
        { id: "center", name: "Центральний район", building: "Мерія", locked: true,
          description: "Площа з фонтаном і кам'яна Мерія, де вирішуються справи Застави." },
        { id: "trade", name: "Торговий район", building: "Гільдія ремісників · Торгова гільдія", locked: true,   // з професією — Гільдія ремісників, з 20 рівня — і Торгова гільдія (character.js → isDistrictOpen)
          description: "Крамниці, майстерні й склади. У Гільдії ремісників коваль Кузьма продає знаряддя для кузні; Торгова гільдія Скруджа — найкраще залізо в Заставі, для поважних гостей." },
        { id: "south", name: "Південний район", building: "Гільдія авантюристів", locked: false,
          description: "Галасливий квартал найманців. У Гільдії авантюристів дають завдання, торгують зброєю й навчають бою." },
        { id: "north", name: "Північний район", building: "Центральна брама", locked: true,
          description: "Велика брама, крізь яку йдуть каравани та загони до далеких земель." },
        { id: "rest", name: "Спальний район", building: "Доми на околиці", locked: true,   // після квесту Мерії «Збір вугілля» (character.js → isDistrictOpen)
          description: "Тихі вулички ремісників і купців. На околиці управитель продає доми — при власному домі можна збудувати кузню й склад." }
      ]
    },
    forest_path: {
      name: "Лісова стежка",
      type: "combat",
      minLevel: 3,
      description: "Вузька стежка між темних ялин. Тут полюють вовки — сірі, чорні, а подекуди й білі. Новачкам сюди зарано.",
      enemies: ["wolf", "wolf2", "wolf3"],
      edge: "trees"
    },
    forest_cave: {
      name: "Печера в лісі",
      type: "combat",
      minLevel: 6,
      description: "Волога темна печера, де стіни блищать від слизу. Тут живуть зелені, сині й фіолетові слайми, а в глибині, кажуть, сидить сам Король слайм.",
      enemies: ["slime", "slime2", "slime3", "slime_king"],
      dungeon: "cave_secret",
      edge: "rocks"
    },

    // Власний дім у Спальному районі Дубової Застави (character.js → HOUSES). Як Домівка: відпочинок
    // і та сама спільна скриня (chest "main"); назву показує та, яку дав гравець. region "city" — з дому
    // ходять по районах Застави, як зі Спального району.
    house_oak: {
      name: "Власний дім", type: "home", region: "city", chest: "main", house: "oak",
      description: "Ваш дім на околиці Спального району. Тут можна відпочити, а скриня — та сама, що в Домівці."
    },

    // ---------- ТЕМНИЙ ЛІС (region: "dark") — за Центральною брамою Дубової Застави ----------
    // Пускають лише після квесту капітана варти «Варта Центральної брами» (quests.js → GATE).
    dark_gate: {
      name: "Зворотний бік брами",
      type: "gate", region: "dark",
      description: "Висока скеля, а в ній — зворотний бік Центральної брами Дубової Застави. Варта тримає її зачиненою, але для своїх відчиняє. Далі на північ — лише Темний ліс."
    },
    dk_edge: {
      name: "Похмуре узлісся", type: "combat", region: "dark", minLevel: 10,
      description: "Сухі сірі дерева, коріння, що чіпляється за ноги, і очі, які світяться в глибині. Тут Темний ліс тільки починається.",
      enemies: ["shadow_wolf", "rot_boar", "forest_spider"],
      edge: "trees"
    },
    dk_marsh: {
      name: "Туманні болота", type: "combat", region: "dark", minLevel: 10,
      description: "Чорна вода, гнилі кладки й бліді вогники в тумані. Хто зійшов зі стежки — той лишився тут назавжди.",
      enemies: ["bog_leech", "drowner", "will_wisp"],
      edge: ["water", "trees", "water", "water"]
    },
    dk_grave: {
      name: "Старе кладовище", type: "combat", region: "dark", minLevel: 10,
      description: "Покинуті могили, розкриті склепи й зруйнована каплиця. Мертві тут не сплять.",
      enemies: ["skeleton_archer", "ghost", "ghoul"],
      edge: ["walls", "trees", "walls", "trees"]   // мур кладовища й мертві дерева
    },
    dk_webs: {
      name: "Ліс павутини", type: "combat", region: "dark", minLevel: 15,
      description: "Велетенські дерева, обплетені павутинням, і кокони на гілках. Десь у глибині — гніздо Королеви павуків.",
      enemies: ["web_hunter", "web_weaver", "spider_queen"],
      dungeon: "web_nest",
      edge: "trees"
    },
    dk_ravine: {
      name: "Вовкулачий яр", type: "combat", region: "dark", minLevel: 17,
      description: "Глибокий кам'янистий яр, обгризені кістки й сліди пазурів на скелях. Уночі тут виють не вовки.",
      enemies: ["werewolf", "pack_leader", "shadow_beast"],
      edge: "rocks"
    },
    dk_ruins: {
      name: "Руїни відьминої вежі", type: "combat", region: "dark", minLevel: 19,
      description: "Розвалена вежа на пагорбі, фіолетове сяйво й свічки на уламках. Культисти досі служать тут своїй господині.",
      enemies: ["cultist", "witch", "stone_golem"],
      edge: ["walls", "rocks", "walls", "rocks"]   // уламки вежі на кам'янистому пагорбі
    },
    dk_heart: {
      name: "Серце Темного лісу", type: "combat", region: "dark", minLevel: 20,
      description: "Коло замшілих каменів і велетенське мертве дерево, що світиться зсередини. Тут править Володар Темного лісу.",
      enemies: ["ancient_treant", "black_rider", "forest_lord"],
      dungeon: "dark_throne",
      edge: ["rocks", "trees", "rocks", "trees"],   // коло каменів у лісі
      // Корінь Іггдрасиля під мертвим деревом: після першої перемоги над Володарем — шлях в Альвгейм (світ 3)
      portal: { to: "alf_gate", world: 3, title: "Корінь Іггдрасиля",
                text: "Під мертвим деревом із землі виходить велетенський корінь, що світиться золотом. Після загибелі Володаря він більше не спить — крізь нього видно сади Альвгейму.",
                button: "Пройти корінням в Альвгейм" }
    },

    // ---------- АЛЬВГЕЙМ (region: "alf", світ 3) — за коренем Іггдрасиля в Серці Темного лісу ----------
    // Відкривається після першої перемоги над Володарем Темного лісу (книга рун у бібліотеці — save.books.runes).
    // Кожна локація — данж зі своїм босом; мапа — assets/images/map/map_alfheim.webp.
    alf_gate: {
      name: "Корінь Іггдрасиля", type: "portal", region: "alf",
      description: "Велетенський корінь Світового дерева виходить із землі на краю Альвгейму й світиться золотом. Звідси — стежка до всіх місць світу світлих альвів, а корінням можна повернутися в Темний ліс.",
      portal: { to: "dk_heart", title: "Шлях назад", text: "Корінь веде вниз, у Серце Темного лісу.", button: "Повернутися в Темний ліс" }
    },
    alf_grove: {
      name: "Сріблястий гай", type: "combat", region: "alf", minLevel: 25,
      description: "Берези зі срібною корою й блукаючі вогники між ними. Колись тут гуляли альви — тепер вони здичавіли й стріляють у кожного чужинця.",
      enemies: ["alf_wisp", "alf_moth", "alf_feral_archer", "alf_boss_moths"],
      dungeon: "alf_moth_nest",
      edge: "trees"
    },
    alf_lake: {
      name: "Дзеркальне озеро", type: "combat", region: "alf", minLevel: 26,
      description: "Вода тут гладенька, мов дзеркало, і відбиває чуже небо. Із глибини виходять нікси, а з відображень — тіні тих, хто в них задивився.",
      enemies: ["alf_nixie", "alf_reflection", "alf_crystal_toad", "alf_boss_necken"],
      dungeon: "alf_lake_depths",
      edge: "water"
    },
    alf_gardens: {
      name: "Сади вічної весни", type: "combat", region: "alf", minLevel: 27,
      description: "Тераси квітів і білий фонтан. Половина саду ще цвіте, а друга гниє від подиху Хелли, і квіти тут кусаються.",
      enemies: ["alf_thornbush", "alf_poison_bloom", "alf_gardener", "alf_boss_gardener"],
      dungeon: "alf_rot_garden",
      edge: ["walls", "trees", "walls", "trees"]   // мури терас і квітучі дерева
    },
    alf_towers: {
      name: "Вежі світанку", type: "combat", region: "alf", minLevel: 27,
      description: "Дві білі вежі на скелі ловлять перше проміння сонця. Тут вчилися магії світлі альви — тепер їхні маги служать комусь іншому.",
      enemies: ["alf_elf_mage", "alf_light_sentinel", "alf_herald_owl", "alf_boss_high_mage"],
      dungeon: "alf_dawn_spire",
      edge: ["walls", "rocks", "walls", "rocks"]   // білі мури на скелі
    },
    alf_freyr: {
      name: "Чертог Фрейра", type: "combat", region: "alf", minLevel: 28,
      description: "Золотий чертог серед старих дубів, вирізьблений вепрами й снопами. Трон господаря світу порожній, а його лицарі й ловчі нікого не пускають.",
      enemies: ["alf_wild_boar", "alf_elf_knight", "alf_huntsman", "alf_boss_gullinbursti"],
      dungeon: "alf_freyr_throne",
      edge: "trees"
    },
    alf_beli: {
      name: "Поле Белі", type: "combat", region: "alf", minLevel: 29,
      description: "Давнє поле бою під фіолетовим небом, кістки й скелі, схожі на оленячі роги. Тут Фрейр колись убив велетня Белі — і тут Хелла підняла його з мертвих.",
      enemies: ["alf_dead_giant", "alf_stag_spirit", "alf_rot_warrior", "alf_boss_beli"],
      dungeon: "alf_beli_barrow",
      edge: "rocks",
      // Розколотий курган Белі: після першої перемоги над велетнем — шлях у Ванагейм (світ 4)
      portal: { to: "van_gate", world: 4, title: "Гілка Іггдрасиля",
                text: "У розколі кургану Белі з-під землі виходить гілка Світового дерева, мокра від морської води. Після загибелі велетня вона більше не спить — крізь неї чути прибій Ванагейму.",
                button: "Пройти гілкою у Ванагейм" }
    },

    // ---------- ВАНАГЕЙМ (region: "van", світ 4) — за гілкою Іггдрасиля на Полі Белі ----------
    // Відкривається після першої перемоги над Белі (save.bossKills.alf_boss_beli). Мапа — assets/images/map/map_vanaheim.webp.
    // Кожна локація — данж зі своїм босом; дорога одна: берег → мочари → ліс → курган → храм → бухта.
    van_gate: {
      name: "Розбитий драккар", type: "portal", region: "van", typeLabel: "Гілка Іггдрасиля",   // підпис на мапі (page-maps.js)
      description: "Гілка Світового дерева виходить із піску біля розбитого драккара на південному березі Ванагейму. Звідси стежка веде вздовж моря до Ноатуну, а гілкою можна повернутися в Альвгейм.",
      portal: { to: "alf_beli", title: "Шлях назад", text: "Гілка веде вниз, на Поле Белі.", button: "Повернутися в Альвгейм" }
    },
    van_shore: {
      name: "Берег Ноатуну", type: "combat", region: "van", minLevel: 30,
      description: "Корабельна гавань Ньйорда: причали, щогли й сіті на вітрі. Кораблі давно не виходять у море — на їхніх палубах господарюють драугри, а на піску клацають клешнями краби.",
      enemies: ["van_draugr_sailor", "van_shore_crab", "van_gull_harpy", "van_boss_draugr_captain"],
      dungeon: "van_ghost_ship",
      edge: "water"
    },
    van_marsh: {
      name: "Туманні мочари", type: "combat", region: "van", minLevel: 31,
      description: "Хатини вьольв на палях серед туману й очерету. Тут ворожать на кістках і варять зілля, а блудні вогні заводять подорожніх у трясовину.",
      enemies: ["van_volva_witch", "van_toad_shapeshifter", "van_marsh_light", "van_boss_the_old_volva"],
      dungeon: "van_volva_hut",
      edge: ["water", "trees", "water", "trees"]
    },
    van_kvasir: {
      name: "Ліс Квасіра", type: "combat", region: "van", minLevel: 32,
      description: "Старий ліс, де кожне дерево пам'ятає слова наймудрішого з ванів. Тут його вбили двоє двергів — і досі тіні підслуховують кожну розмову.",
      enemies: ["van_enchanted_beast", "van_eavesdropping_shade", "van_forest_troll", "van_boss_fjalar_and_galar"],
      dungeon: "van_mead_cellar",
      edge: "trees"
    },
    van_barrow: {
      name: "Курган Гулльвейг", type: "combat", region: "van", minLevel: 33,
      description: "Обвуглений пагорб, де аси тричі палили чаклунку Гулльвейг — і тричі вона виходила з вогню. Попіл тут досі теплий, а в ньому блищить золото.",
      enemies: ["van_gold_spirit", "van_burnt_cultist", "van_barrow_guard", "van_boss_gullveig_the_thrice_burned"],
      dungeon: "van_pyre_heart",
      edge: "rocks"
    },
    van_temple: {
      name: "Храм ванів", type: "combat", region: "van", minLevel: 33,
      description: "Білий храм серед квітучих садів, присвячений Ньйорду, Фрейру й Фреї. Жерці досі служать тут — але чужинців зустрічають сейдом і кігтями священних котів.",
      enemies: ["van_vanir_priest", "van_freyjas_forest_cat", "van_seidr_guardian", "van_boss_high_priestess_of_the_vanir"],
      dungeon: "van_inner_shrine",
      edge: ["walls", "trees", "walls", "trees"]
    },
    van_ran: {
      name: "Бухта Ран", type: "combat", region: "van", minLevel: 34,
      description: "Чорна бухта під скелями, де море викидає на берег уламки кораблів. Велетка Ран ловить моряків у свою сіть — і ніхто з утоплених не повертається додому.",
      enemies: ["van_wave_daughter", "van_drowned_warrior", "van_deep_eel", "van_boss_ran_mistress_of_the_drowned"],
      dungeon: "van_ran_hall",
      edge: "water",
      // Затоплена штольня над бухтою: після першої перемоги над Ран — шлях у місто Свартгард (світ 5)
      portal: { to: "svartgard", district: "flooded", world: 5, title: "Затоплена штольня",
                text: "У скелі над бухтою, куди не дістають хвилі, відкрився вхід у стару штольню. Поки Ран тримала тут свою сіть, його не було видно; тепер із темряви тягне димом ковальських горнів — штольня веде у Свартгард, підземне місто двергів.",
                button: "Спуститися у Свартгард" }
    },

    // ---------- СВАРТАЛЬВГЕЙМ (region: "svart", світ 5) — за Затопленою штольнею в Бухті Ран ----------
    // Відкривається після першої перемоги над Ран (save.bossKills.van_boss_ran_mistress_of_the_drowned). Мапа — assets/images/map/map_svartalfheim.webp.
    // Дорога одна: копальні → водоспад → Чорні квартали → чертог Альвіса → кузні → глибини → кузня Мьоккуркальві.
    // Фонів боїв і іконок ключів ще немає — гра показує тло теми й назву ключа (промти — «Свартальвгейм - фони боїв та іконки ключів (промти).txt»).
    // Брама Свартгарда з боку копалень (region "svart"): дійшовши сюди, герой одразу входить у місто (як south_gate у Дубову Заставу)
    svart_gate: {
      name: "Брама Сутінкових копалень", type: "citygate", region: "svart", city: "svartgard", district: "mines_gate",
      typeLabel: "Вхід у Свартгард", image: "svartgard",
      description: "Кована брама Свартгарда з боку копалень. За нею — підземне місто свартальвів і двергів; перед нею — рейки, що ведуть у Сутінкові копальні."
    },
    // Свартгард — місто-локація, як Дубова Застава (окрема мапа, region "svartgard"): герой ходить між районами (save.location.district).
    // Вхід — із Бухти Ран Затопленою штольнею (район flooded), вихід у світ 5 — Брама Сутінкових копалень (район mines_gate → svart_gate).
    // locked: true без власного правила в character.js → isDistrictOpen — «Закрито — відкриється згодом» (вмісту ще немає; задум — H:\Game_NEW\WORLDS_4-7.md).
    // exit — кнопка виходу з міста в цьому районі; image — свій фон району (locations/loc_<image>.webp).
    svartgard: {
      name: "Свартгард", type: "city", region: "svartgard", defaultDistrict: "flooded",
      description: "Останнє вільне місто під корінням Іггдрасиля. Його вирубали в одній велетенській печері два народи, що споконвіку не терпіли один одного: свартальви, які ріжуть камінь і тінь, і дверги-ковалі, які приборкали вогонь. Сонця тут немає — світять кришталі на склепінні й ріки розплавленого металу на вулицях.",
      districts: [
        { id: "flooded", name: "Брама затопленої шахти", building: "Затоплена штольня", locked: false, image: "svart_gate",
          description: "Сюди виходить Затоплена штольня з Ванагейму. Вода стоїть по коліна, варта — по пояс у ній.",
          exit: { to: "van_ran", button: "Піднятися штольнею до Бухти Ран" } },
        { id: "artisans", name: "Будинки ремісників", building: "Спальний район", locked: true,
          description: "Тихі вулиці, вирубані в скелі. Тут живуть ті, хто кує, ріже й рахує. Кажуть, один дім стоїть порожній." },
        { id: "forges", name: "Кузні «Свартгарда»", building: "Знаряддя двергів", locked: false,
          description: "Сто горнів під одним склепінням. Тільки тут продають знаряддя, яких не знайти нагорі." },
        { id: "brokk", name: "Кузня Брокка й Ейтрі", building: "Небесна кузня", locked: true,
          description: "Покої й кузня братів-двергів, найкращих ковалів дев'яти світів. У глибині — Небесна кузня, яку Брокк і Ейтрі стережуть для Сварога: там стоїть його горно." },
        { id: "mines_gate", name: "Брама Сутінкових копалень", building: "Вихід у Свартальвгейм", locked: false,
          description: "Вихід із міста в копальні, де починається земля, яку Хелла вже вважає своєю.",
          exit: { to: "svart_gate", button: "Вийти до Сутінкових копалень" } },
        { id: "palace", name: "Палац королів", building: "Чотири вежі", locked: true,
          description: "Чотири вежі, чотири прапори. Тут вирішують, хто будує, хто копає й кого пускати далі." },
        { id: "thrones", name: "Тронні зали королів", building: "Чотири трони", locked: true,
          description: "Велика зала на чотири трони. Королі говорять лише з тими, хто заслужив." }
      ]
    },
    svart_mines: {
      name: "Сутінкові копальні", type: "combat", region: "svart", minLevel: 34,
      description: "Покинуті штольні двергів, де вже сто років не чути кайла. Рейки ведуть у темряву, вагонетки стоять там, де їх кинули, а між кріпленнями висять кокони завбільшки з людину.",
      enemies: ["svart_cave_spider", "svart_stone_worm", "svart_blood_bat", "svart_boss_cave_spider_matriarch"],
      dungeon: "svart_matriarch_cocoon",
      edge: "walls"
    },
    svart_falls: {
      name: "Водоспад Андварі", type: "combat", region: "svart", minLevel: 35,
      description: "Підземний водоспад падає з темряви в чорне озеро, на дні якого блищить золото. Це скарб карлика Андварі — і прокляття, яке він наклав на кожну монету, досі чинне.",
      enemies: ["svart_cursed_pike", "svart_water_troll", "svart_greedy_kobold", "svart_boss_andvari"],
      dungeon: "svart_andvari_hoard",
      edge: "water"
    },
    svart_quarters: {
      name: "Чорні квартали", type: "combat", region: "svart", minLevel: 36,
      description: "Частина Свартгарда, яку Хелла забрала собі. Горна тут згасли, на ковадлах лежить іній, а у вікнах шпилів горить недобре фіолетове світло. Свартальви, що лишилися, служать уже не своїм королям.",
      enemies: ["svart_shadow_assassin", "svart_venom_archer", "svart_shadow_mage", "svart_boss_prince_of_the_dark_elves"],
      dungeon: "svart_obsidian_spire",
      edge: "walls"
    },
    svart_alvis: {
      name: "Чертог Альвіса", type: "combat", region: "svart", minLevel: 36,
      description: "Зала, повна двергів, що скам'яніли посеред розмови. Карлик Альвіс знав імена всіх речей у дев'яти світах — і так довго ними хвалився, що схід сонця застав його зненацька. Один промінь досі падає крізь тріщину в склепінні.",
      enemies: ["svart_stone_sentinel", "svart_traitor_dwarf", "svart_rune_warden", "svart_boss_alvis_the_all_knowing"],
      dungeon: "svart_stone_hall",
      edge: "walls"
    },
    svart_forges: {
      name: "Кузні Брокка й Ейтрі", type: "combat", region: "svart", minLevel: 37,
      description: "Тут брати Брокк і Ейтрі викували Мйольнір, Драупнір і золотого вепра. Міхи ще дихають, метал ще тече каналами — але самих братів немає, а біля запечатаних дверей стоїть страж, якого вони не кували.",
      enemies: ["svart_living_anvil", "svart_fire_salamander", "svart_forged_boar", "svart_boss_hels_forged_guardian"],
      dungeon: "svart_sealed_forge",
      edge: "walls"
    },
    svart_runes: {
      name: "Рунічні глибини", type: "combat", region: "svart", minLevel: 38,
      description: "Уступ над прірвою без дна. Її стіни списані рунами згори донизу: дверги записували тут усе, що знали про ремесло, і кожен майстер перед смертю додавав свій рядок. Руни досі світяться — і досі читають самі себе.",
      enemies: ["svart_rune_spirit", "svart_masters_ghost", "svart_crystal_golem", "svart_boss_keeper_of_the_runes"],
      dungeon: "svart_rune_well",
      edge: "rocks"
    },
    svart_mokkur: {
      name: "Кузня Мьоккуркальві", type: "combat", region: "svart", minLevel: 39,
      description: "Край велетенської печі, де кипить залізо й глина. Колись йотуни зліпили тут глиняного велетня Мьоккуркальві й дали йому серце кобили — і він здригнувся від страху, щойно побачив Тора. Хелла ліпить його заново. Цього разу серце буде інше.",
      enemies: ["svart_clay_golem", "svart_iron_draugr", "svart_overseer_dwarf", "svart_boss_mokkurkalfi"],
      dungeon: "svart_clay_heart",
      edge: "rocks",
      // Витяжна шахта двергів: після першої перемоги над Мьоккуркальві — шлях у Йотунгейм (світ 6)
      portal: { to: "jot_gate", world: 6, title: "Витяжна шахта",
                text: "Коли глиняний велетень упав, у склепінні кузні тріснула стара кладка — і відкрилася витяжна шахта двергів. Звідти дме крижаний вітер і пахне снігом: шахта веде нагору, у Йотунгейм, землю велетнів.",
                button: "Піднятися в Йотунгейм" }
    },

    // ---------- ЙОТУНГЕЙМ (region: "jot", світ 6) — за Витяжною шахтою в Кузні Мьоккуркальві ----------
    // Відкривається після першої перемоги над Мьоккуркальві (save.bossKills.svart_boss_mokkurkalfi). Мапа — assets/images/map/map_jotunheim.webp.
    // Дорога одна: перевали → Тримгейм → Залізний ліс → двір Трима → пустка → Утгард → чертог Гюміра → берег Змія.
    jot_gate: {
      name: "Витяжна шахта", type: "portal", region: "jot", typeLabel: "Шахта двергів",   // підпис на мапі (page-maps.js)
      description: "Стара витяжна шахта двергів виходить на поверхню серед засніжених скель Йотунгейму. Знизу, з Кузні Мьоккуркальві, ще тягне теплом горнів, а тут дме крижаний вітер велетнів. Звідси стежка веде на Крижані перевали.",
      portal: { to: "svart_mokkur", title: "Шлях назад", text: "Шахта веде вниз, у Кузню Мьоккуркальві.", button: "Спуститися у Свартальвгейм" }
    },
    jot_passes: {
      name: "Крижані перевали", type: "combat", region: "jot", minLevel: 40,
      description: "Вузькі стежки над прірвами, де вітер зриває сніг зі скель. Тут починаються володіння велетнів — і першими чужинців зустрічають гірські тролі та вовки, білі, як заметіль.",
      enemies: ["jot_mountain_troll", "jot_snow_wolf", "jot_frost_scout", "jot_boss_troll_chieftain"],
      dungeon: "jot_troll_cave",
      edge: "rocks"
    },
    jot_thrymheim: {
      name: "Тримгейм", type: "combat", region: "jot", minLevel: 40,
      description: "Орлина скеля над хмарами, де колись жив велетень Тьяцці. Мисливці-йотуни досі полюють тут на лижах, а сам господар, кажуть, повертається додому в подобі велетенського орла.",
      enemies: ["jot_giant_hunter", "jot_snow_lynx", "jot_ski_archer", "jot_boss_thjazi_in_eagle_form"],
      dungeon: "jot_eagle_nest",
      edge: "rocks"
    },
    jot_ironwood: {
      name: "Залізний ліс", type: "combat", region: "jot", minLevel: 41,
      description: "Ярнвід — ліс чорних дерев із залізним листям. Тут живе велетка Ангрбода, мати вовків, і з-за кожного стовбура за мандрівником стежать жовті очі її дітей.",
      enemies: ["jot_ironwood_wolf", "jot_troll_witch", "jot_wolf_man", "jot_boss_angrboda"],
      dungeon: "jot_angrboda_lair",
      edge: "trees"
    },
    jot_thrym: {
      name: "Двір Трима", type: "combat", region: "jot", minLevel: 41,
      description: "Коло різьблених каменів і довгі лави для бенкету. Тут король турсів Трим колись сховав Мйольнір і вимагав за нього Фрейю — а дочекався Тора під весільним покривалом. Відтоді Трим не довіряє гостям.",
      enemies: ["jot_giant_warrior", "jot_troll_guard", "jot_giant_skald", "jot_boss_thrym_king_of_the_thurses"],
      dungeon: "jot_thrym_hoard",
      edge: "walls"
    },
    jot_waste: {
      name: "Кам'яна пустка", type: "combat", region: "jot", minLevel: 42,
      description: "Рівнина валунів, серед яких лежить кам'яна голова велетня, більша за хату. Тут Тор бився з Грунгніром, у якого серце й голова з каменю, — і уламки його кремінного точила досі розкидані по пустці.",
      enemies: ["jot_stone_giant", "jot_rock_troll", "jot_living_boulder", "jot_boss_hrungnir"],
      dungeon: "jot_stone_heart",
      edge: "rocks"
    },
    jot_utgard: {
      name: "Утгард", type: "combat", region: "jot", minLevel: 43,
      description: "Брама, вирубана в скелі між двома кам'яними обличчями. За нею — чертог Утгарда-Локі, де ніщо не є тим, чим здається: тут Тор пив з рогу, що сягав моря, а Тьяльві біг наввипередки з думкою.",
      enemies: ["jot_logi", "jot_hugi", "jot_elli", "jot_boss_utgarda_loki"],
      dungeon: "jot_hall_of_illusions",
      edge: "walls"
    },
    jot_hymir: {
      name: "Чертог Гюміра", type: "combat", region: "jot", minLevel: 43,
      description: "Замерзла затока, де з криги стирчать китові ребра й лежить перекинутий човен. Тут велетень Гюмір рибалив із Тором — і досі ловить на бичачу голову те, що краще не витягати з глибини.",
      enemies: ["jot_sea_troll", "jot_giant_walrus", "jot_draugr_fisher", "jot_boss_hymir"],
      dungeon: "jot_hymir_cauldron",
      edge: "water"
    },
    jot_serpent: {
      name: "Берег Світового Змія", type: "combat", region: "jot", minLevel: 44,
      description: "Край світу, де чорне море б'ється об скелі, а з хвиль виринають луски завбільшки зі щит. Йормунганд, що оперізує Мідгард, піднімає голову — і Хелла вже нашіптує йому, що час Рагнарьоку близько.",
      enemies: ["jot_serpent_spawn", "jot_venom_jellyfish", "jot_serpent_cultist", "jot_boss_jormungandr"],
      dungeon: "jot_serpent_ring",
      edge: "water",
      // Нагльфар: після першої перемоги над Йормунгандом — шлях у Муспельгейм (світ 7)
      portal: { to: "musp_gate", world: 7, title: "Нагльфар",
                text: "Коли Йормунганд пірнув у глибину, з туману виплив корабель із нігтів мерців — Нагльфар. Його ніхто не веде, але він пливе туди, куди треба Хеллі: на південь, через море, у Муспельгейм.",
                button: "Піднятися на Нагльфар" }
    },

    // ---------- МУСПЕЛЬГЕЙМ (region: "musp", світ 7) — за морем, кораблем Нагльфар з Берега Світового Змія ----------
    // Відкривається після першої перемоги над Йормунгандом (save.bossKills.jot_boss_jormungandr). Мапа — assets/images/map/map_muspelheim.webp.
    // Дорога одна: рівнини → лавові ріки → кузні → фортеця → чертог Сінмари → межа Гіннунгагапу → трон Сурта.
    musp_gate: {
      name: "Попеляста межа", type: "portal", region: "musp", typeLabel: "Причал Нагльфара",   // підпис на мапі (page-maps.js)
      description: "Нагльфар, корабель із нігтів мерців, пристав до сірого попелястого берега. Попереду — земля вогню: мертві чорні дерева, стежка старих слідів у попелі, а на обрії — червоне сяйво великого вулкана.",
      portal: { to: "jot_serpent", title: "Нагльфар", text: "Нагльфар чекає біля берега — він відвезе назад, на Берег Світового Змія в Йотунгеймі.", button: "Повернутися в Йотунгейм" }
    },
    musp_ash: {
      name: "Попелясті рівнини", type: "combat", region: "musp", minLevel: 45,
      description: "Сіре поле попелу, з неба сиплеться ще. Обгорілі пні, кістки, у попелі тліють сліди лап — вогняні гончаки Сурта чують чужинця за милю й женуть його, доки той не впаде.",
      enemies: ["musp_fire_hound", "musp_salamander", "musp_ash_spirit", "musp_boss_hound_packleader"],
      dungeon: "musp_hound_lair",
      edge: "rocks"
    },
    musp_lava: {
      name: "Лавові ріки", type: "combat", region: "musp", minLevel: 45,
      description: "Базальтовий острів між двома руслами розпеченої лави. Міст із застиглого каменю тріщить під ногами, а з лави виринають ті, кому вогонь — домівка.",
      enemies: ["musp_magma_elemental", "musp_lava_worm", "musp_fire_serpent", "musp_boss_lava_serpent"],
      dungeon: "musp_serpent_nest",
      edge: "rocks"
    },
    musp_forges: {
      name: "Кузні синів Муспелля", type: "combat", region: "musp", minLevel: 46,
      description: "Обсидіановий поміст серед велетенських ковадл. Тут сини Муспелля кують зброю для Рагнарьоку — мечі завдовжки з корабель і списи, що не гаснуть. Ковалі не люблять, коли їм заважають.",
      enemies: ["musp_fire_giant_smith", "musp_living_iron", "musp_glowing_golem", "musp_boss_master_smith_of_muspel"],
      dungeon: "musp_sons_forge",
      edge: "walls"
    },
    musp_fortress: {
      name: "Обсидіанова фортеця", type: "combat", region: "musp", minLevel: 47,
      description: "Порожній двір перед чорними склистими мурами й шипастими вежами. У вузьких вікнах горить червоне світло, а варта Сурта не питає, хто йде, — вона просто стріляє.",
      enemies: ["musp_fire_knight", "musp_flame_mage", "musp_obsidian_sentinel", "musp_boss_fortress_commander"],
      dungeon: "musp_citadel_vaults",
      edge: "walls"
    },
    musp_sinmara: {
      name: "Чертог Сінмари", type: "combat", region: "musp", minLevel: 47,
      description: "Площа з темно-червоного каменю, бронзові жаровні й скриня на дев'ять замків. Сінмара, дружина Сурта, береже в ній Леватейн — і кожен, хто зазирне, згорить раніше, ніж побачить.",
      enemies: ["musp_flame_priestess", "musp_fire_bird", "musp_chest_guardian", "musp_boss_sinmara"],
      dungeon: "musp_sinmara_vault",
      edge: "walls"
    },
    musp_ginnungagap: {
      name: "Межа Гіннунгагапу", type: "combat", region: "musp", minLevel: 48,
      description: "Уступ над бездонною прірвою: ліворуч — вогонь, праворуч — лід і крижаний туман, а там, де вони сходяться, з порожнечі здіймається пара. Тут колись народився Імір — і щось від нього лишилося.",
      enemies: ["musp_steam_spirit", "musp_frost_shade", "musp_chaos_spirit", "musp_boss_echo_of_ymir"],
      dungeon: "musp_ymir_abyss",
      edge: "rocks"
    },
    musp_surtr: {
      name: "Трон Сурта", type: "combat", region: "musp", minLevel: 49,
      description: "Рівнина в кратері вулкана, лава стікає стінами з усіх боків. На чорному троні сидить Сурт, а поруч у камінь встромлено палаючий меч. Хелла обіцяла йому світ — і він чекає лише сигналу.",
      enemies: ["musp_son_of_muspel", "musp_fire_drake", "musp_surtrs_guard", "musp_boss_surtr"],
      dungeon: "musp_volcano_heart",
      edge: "rocks",
      // Біфрест: після першої перемоги над Суртом — шлях в Асгард (світ 8)
      portal: { to: "asg_gate", world: 8, title: "Біфрест",
                text: "Сурт упав, а його полум'яний меч так і не торкнувся моста. Над кратером, крізь дим, проступає райдуга — Біфрест цілий, і він веде вгору, в Асгард, де вже стоїть армія Хелли.",
                button: "Піднятися Біфростом" }
    },

    // ---------- АСГАРД (region: "asg", світ 8) — Біфростом з кратера Сурта ----------
    // Відкривається після першої перемоги над Суртом (save.bossKills.musp_boss_surtr). Мапа — assets/images/map/map_asgard.webp.
    // Дорога одна: Хімінбйорг → Фенсалір → Брейдаблік → Бількірнір → Валгалла → (брама фортеці) → Вінґольв → Гладсгейм → площа → Глідскьяльв.
    asg_gate: {
      name: "Кінець Біфросту", type: "portal", region: "asg", typeLabel: "Райдужний міст",   // підпис на мапі (page-maps.js)
      description: "Райдужний міст Біфрест виходить із хмар просто до стін Асгарду. Попереду — золоті дахи й мури, а вдалині вже здіймається стовп зеленого диму.",
      portal: { to: "musp_surtr", title: "Біфрест", text: "Міст веде назад, у кратер вулкана, до Трону Сурта в Муспельгеймі.", button: "Повернутися в Муспельгейм" }
    },
    asg_himinbjorg: {
      name: "Хімінбйорг", type: "combat", region: "asg", minLevel: 50,
      description: "Кінець Біфросту біля сторожової фортеці Хеймдалля. Третина мурів розбита й горить зеленим вогнем, на камінні лежить розколотий ріг Гьяллархорн, а з півночі повзе іній — це йде Хрюм.",
      enemies: ["asg_draugr_stormtrooper", "asg_hels_rider", "asg_dead_man_of_naglfar", "asg_boss_hrym"],
      dungeon: "asg_himinbjorg_watch",
      edge: "rocks"
    },
    asg_fensalir: {
      name: "Фенсалір", type: "combat", region: "asg", minLevel: 50,
      description: "Сухий луг серед болотяних озер біля туманного чертогу Фрігг. Очерет шепоче, а по воді розповзається зелена гниль: Ангрбода, мати вовків, прийшла сюди з благословення Хелли.",
      enemies: ["asg_bog_corpse", "asg_seidkona_witch", "asg_bog_viper", "asg_boss_angrboda_hel_empowered_form"],
      dungeon: "asg_fensalir_halls",
      edge: "water"
    },
    asg_breidablik: {
      name: "Брейдаблік", type: "combat", region: "asg", minLevel: 50,
      description: "Колись сяйливий луг Бальдра в білих квітах. Тепер його розорали вовчі кігті, а чисте світло тьмяніє в диму. Фенрір вирвався з пут і веде сюди свою зграю.",
      enemies: ["asg_fenrirs_wolf", "asg_skoll", "asg_hati", "asg_boss_fenrir"],
      dungeon: "asg_breidablik_meadow",
      edge: "trees"
    },
    asg_bilskirnir: {
      name: "Бількірнір", type: "combat", region: "asg", minLevel: 50,
      description: "Кам'яне подвір'я перед величезним чертогом Тора, над ним грозові хмари й блискавки. Посеред двору — уламок точила Хрунґніра, і з тріщин у камені повзе зелена гниль.",
      enemies: ["asg_utgard_giant", "asg_stone_troll", "asg_storm_spirit", "asg_boss_hrungnir_hel_empowered_form"],
      dungeon: "asg_bilskirnir_hall",
      edge: "walls"
    },
    asg_valhalla: {
      name: "Валгалла", type: "combat", region: "asg", minLevel: 50,
      description: "Подвір'я перед чертогом, вкритим золотими щитами, а крокви в ньому — списи. Щити й списи розкидано боєм, на розбитій стіні горить зелений вогонь. Ейнгерії, що мали стати за Одіна, тепер служать Хеллі.",
      enemies: ["asg_enthralled_einherjar", "asg_dead_valkyrie", "asg_shadow_raven", "asg_boss_hlokk"],
      dungeon: "asg_valhalla_shields",
      edge: "walls"
    },
    asg_vingolf: {
      name: "Вінґольв", type: "combat", region: "asg", minLevel: 50,
      description: "Сад перед чертогом богинь за брамою Великої фортеці. Білі квіти в'януть, крізь сад тягнуться жарини й зелений дим. Гулльвейг, яку тричі палили й тричі вона поверталась, повернулася вчетверте — з Хеллою.",
      enemies: ["asg_dark_soul_envoy", "asg_dark_soul_archer", "asg_dark_priestess", "asg_boss_gullveig_hel_empowered_form"],
      dungeon: "asg_vingolf_garden",
      edge: "trees"
    },
    asg_gladsheim: {
      name: "Гладсгейм", type: "combat", region: "asg", minLevel: 50,
      description: "Кругле подвір'я, оточене дванадцятьма високими тронами богів. Золоте світло тьмяніє — підлогою повзе темрява. На одному з тронів хтось сидить, хоч там нікого немає: це Тінь Локі.",
      enemies: ["asg_draugr_jarl", "asg_dark_soul", "asg_bone_skald", "asg_boss_shadow_of_loki"],
      dungeon: "asg_gladsheim_thrones",
      edge: "walls"
    },
    asg_square: {
      name: "Головна площа Асгарду", type: "combat", region: "asg", minLevel: 50,
      description: "Найбільша площа міста, вимощена білим каменем. Між колонами стоять чорні прапори армії Хелли, у жаровнях горить зелений вогонь. Тут Утгарда-Локі, володар ілюзій, збирає еліту Хелли для останнього штурму.",
      enemies: ["asg_hels_elite_swordsman", "asg_hels_elite_shieldbearer", "asg_hels_elite_sorcerer", "asg_boss_utgarda_loki_hel_empowered_form"],
      dungeon: "asg_square_heart",
      edge: "walls"
    },
    asg_hlidskjalf: {
      name: "Глідскьяльв", type: "combat", region: "asg", minLevel: 50,
      description: "Мармуровий майданчик на вершині найвищої вежі. На краю — престол Одіна, з якого видно всі дев'ять світів, поруч дві темні статуї воронів, а в небі крутиться зелена буря. На престолі сидить Хелла.",
      enemies: ["asg_hels_royal_guard_swordsman", "asg_hels_royal_guard_witch", "asg_hels_guard_beast", "asg_boss_hel_on_odins_throne"],
      dungeon: "asg_hlidskjalf_throne",
      edge: "walls",
      // Портал Хелли: після першої перемоги над нею — шлях у Ніфльгейм (світ 9)
      portal: { to: "nifl_gate", world: 9, title: "Портал Хелли",
                text: "Там, де впала з престолу Хелла, у повітрі досі висить зелено-чорний портал. Звідти тягне холодом і гниллю — шлях у Ніфльгейм, а за ним у Хельгейм.",
                button: "Ступити в портал" }
    },

    // ---------- НІФЛЬГЕЙМ І ХЕЛЬГЕЙМ (region: "nifl", світ 9) — порталом Хелли з Глідскьяльва ----------
    // Відкривається після першої перемоги над Хеллою в Глідскьяльві (save.bossKills.asg_boss_hel_on_odins_throne).
    // Мапа — assets/images/map/map_niflheim_helheim.webp. Дорога одна: Туманна межа → … → Ельвюднір → Трон Хелли.
    // Перемога над Хеллою на троні (GAME_END_BOSS) завершує гру: епілог і титри (game-common.js → showEnding).
    nifl_gate: {
      name: "Портал Хелли", type: "portal", region: "nifl", typeLabel: "Зелено-чорний портал",
      description: "Зелено-чорний портал, яким утекла Хелла. За ним — вічний туман Ніфльгейму, крижані ріки й дорога вниз, у Хельгейм.",
      portal: { to: "asg_hlidskjalf", title: "Портал Хелли", text: "Портал веде назад в Асгард, на вершину Глідскьяльва.", button: "Повернутися в Асгард" }
    },
    nifl_border: {
      name: "Туманна межа", type: "combat", region: "nifl", minLevel: 50,
      description: "Портал Хелли викидає на крижаний уступ, де кінчається світ живих. Туман тут густий, як молоко, і в ньому ходять примари, а вовки чують тепло живого за милю.",
      enemies: ["nifl_mist_wraith", "nifl_ice_wolf", "nifl_boss_warden_of_the_mist"],
      dungeon: "nifl_border_mist",
      edge: "rocks"
    },
    nifl_elivagar: {
      name: "Елівагар", type: "combat", region: "nifl", minLevel: 50,
      description: "Крижані ріки, що течуть з Ніфльгейму від початку часів. Їхня вода отруйна й холодна, а на берегах сидять рімтурси — інеєві велетні, нащадки Іміра.",
      enemies: ["nifl_rime_thurs", "nifl_ice_serpent", "nifl_boss_bergelmir"],
      dungeon: "nifl_elivagar_rivers",
      edge: "water"
    },
    nifl_hvergelmir: {
      name: "Ґвергельмір", type: "combat", region: "nifl", minLevel: 50,
      description: "Кипуче джерело під коренем Іггдрасиля, з якого витікають усі ріки світу. Над водою клубочиться пара, і в ній живуть духи, а змії гризуть корінь знизу.",
      enemies: ["nifl_steam_spirit", "nifl_water_serpentine", "nifl_boss_grabakr"],
      dungeon: "nifl_hvergelmir_spring",
      edge: "water"
    },
    nifl_roots: {
      name: "Корені Дерева", type: "combat", region: "nifl", minLevel: 50,
      description: "Тут із криги виходить корінь Іггдрасиля — товщий за будь-яку фортецю. Кора гниє, з ран тече золотий сік, а з гнилі проростають паростки Хелли.",
      enemies: ["nifl_rotten_sprout", "nifl_root_worm", "nifl_boss_goinn_and_moinn"],
      dungeon: "nifl_roots_deep",
      edge: "trees"
    },
    nifl_nidafjoll: {
      name: "Нідафйолл", type: "combat", region: "nifl", minLevel: 50,
      description: "Темні гори на півночі, де ніколи не світає. Над скелями кружляють нічні гарпії, а в ущелинах стоять кам'яні драуги — мерці, що забули, як лягти.",
      enemies: ["nifl_night_harpy", "nifl_stone_draugr", "nifl_boss_svafnir_and_ofnir"],
      dungeon: "nifl_nidafjoll_peaks",
      edge: "rocks"
    },
    nifl_nidhogg: {
      name: "Гніздо Нідгьоґа", type: "combat", region: "nifl", minLevel: 50,
      description: "Кістки й луска завбільшки з щит, а під ними — гніздо. Тут Нідгьоґ гризе корінь Дерева й трупи зрадників, а його виводок підростає на тому ж.",
      enemies: ["nifl_dragon_hatchling", "nifl_corpse_eater", "nifl_boss_nidhogg"],
      dungeon: "nifl_nidhogg_nest",
      edge: "rocks"
    },
    nifl_gjallarbru: {
      name: "Міст Ґйаллабру", type: "combat", region: "nifl", minLevel: 50,
      description: "Золотий міст над рікою Ґйолль, яким мертві йдуть у Хельгейм. Під мостом пливуть кригою утоплені душі, а на мосту стоять вартові: живим тут не раді.",
      enemies: ["nifl_drowned_soul", "nifl_bridge_warden", "nifl_boss_modgud"],
      dungeon: "nifl_gjallarbru_bridge",
      edge: "water"
    },
    nifl_gnipahellir: {
      name: "Гніпахеллір", type: "combat", region: "nifl", minLevel: 50,
      description: "Печера біля брами Хельгейму, з якої віє зеленим вогнем. Біля входу висять розірвані ланцюги, а довкола нишпорять пекельні пси й кістяні гончаки.",
      enemies: ["nifl_hellhound", "nifl_bone_hound", "nifl_boss_garm"],
      dungeon: "nifl_gnipahellir_cave",
      edge: "rocks"
    },
    nifl_helgrind: {
      name: "Хельгринд", type: "combat", region: "nifl", minLevel: 50,
      description: "Брама Хельгейму — чорне залізо між двома кам'яними мерцями. Мертві проходять крізь неї й не повертаються, а драуги-брамники стоять тут від першої смерті.",
      enemies: ["nifl_draugr_gatekeeper", "nifl_bone_knight", "nifl_boss_gatekeeper_of_helgrind"],
      dungeon: "nifl_helgrind_gate",
      edge: "walls"
    },
    nifl_nastrond: {
      name: "Наструнд", type: "combat", region: "nifl", minLevel: 50,
      description: "Берег мерців, далеко від сонця. Двері тут дивляться на північ, з даху капає отрута, а по березі блукають темні душі зрадників і клятвопорушників.",
      enemies: ["nifl_dark_soul_swordsman", "nifl_dark_soul_archer", "nifl_boss_the_first_traitor"],
      dungeon: "nifl_nastrond_shore",
      edge: "water"
    },
    nifl_eljudnir: {
      name: "Ельвюднір", type: "combat", region: "nifl", minLevel: 50,
      description: "Чертог Хелли з чорними стягами й зеленим полум'ям у вікнах. Тут полонені ейнгерії прислуговують мертвим, а слуги Хелли стережуть кожні двері.",
      enemies: ["nifl_captive_einherjar", "nifl_servant_of_hel", "nifl_boss_ganglati_and_ganglot"],
      dungeon: "nifl_eljudnir_hall",
      edge: "walls"
    },
    nifl_throne: {
      name: "Трон Хелли", type: "combat", region: "nifl", minLevel: 50,
      description: "Серце Хельгейму: мертвий сад із сухим деревом, кістками велетня й блідими квітами, що ростуть без сонця. Тут Хелла зібрала останню варту — і тут кінчається її шлях.",
      enemies: ["nifl_hel_guard_knight", "nifl_hel_guard_witch", "nifl_boss_hel_final_form"],
      dungeon: "nifl_throne_hall",
      edge: "walls"
    }
  };
  const DEFAULT_LOCATION = "home";

  // Темний ліс — трофей з усіх звичайних ворогів локації (не з босів): 20%, 1–2 шт. (доручення Відреченого — quests.js → SHAMAN)
  const DARK_LOC_MAT = { dk_edge: "shadow_fur", dk_marsh: "bog_moss", dk_grave: "grave_bone", dk_webs: "spider_silk",
                         dk_ravine: "werewolf_fang", dk_ruins: "witch_ash", dk_heart: "black_bark" };
  for (const [loc, mat] of Object.entries(DARK_LOC_MAT)) {
    for (const id of LOCATIONS[loc].enemies) {
      const e = ENEMIES[id];
      if (!e || e.boss || e.loot.some(l => l.id === mat)) continue;
      e.loot.unshift({ id: mat, chance: 0.2, qty: [1, 2] });
    }
  }

  // Швидкість ворогів (смуги швидкості бою — battle.js → speedBand: до 100 / 100–199 / від 200).
  // Не пишеться руками: плавно зростає від min (45) у світі 1 до max (210) у світі 9.
  // Кожен світ має рівну частку цього проміжку; усередині світу — за рівнем ворога (від найнижчого рівня ворогів світу до найвищого).
  // Світ ворога — за регіоном його локацій (ENEMY_SPEED.worlds; локація без регіону — світ 1).
  // Спорядження ворога швидкість не піднімає (gearMult 1, надлишок іде в здоров'я — monstergear.js → applyGear).
  // cap — ТИМЧАСОВА межа (24.11.2026, етап 9): поки в героїв немає речей зі швидкістю, вороги не швидші за 99
  // (смуга 1 — ходять раз за раунд, як більшість героїв). Коли речі зі швидкістю з'являться — прибрати cap і перебалансувати.
  const ENEMY_SPEED = {
    min: 45, max: 210, cap: 99, gearMult: 1,
    worlds: ["start", "dark", "alf", "van", "svart", "jot", "musp", "asg", "nifl"]
  };
  const enemyWorld = {};                       // id ворога → номер світу (0…8)
  const worldLevels = ENEMY_SPEED.worlds.map(() => [Infinity, -Infinity]);
  for (const loc of Object.values(LOCATIONS)) {
    const w = Math.max(0, ENEMY_SPEED.worlds.indexOf(loc.region));
    for (const id of loc.enemies || []) {
      const e = ENEMIES[id];
      if (!e) continue;
      enemyWorld[id] = Math.max(enemyWorld[id] ?? 0, w);
    }
  }
  for (const [id, w] of Object.entries(enemyWorld)) {
    const lv = worldLevels[w], l = ENEMIES[id].level || 1;
    lv[0] = Math.min(lv[0], l); lv[1] = Math.max(lv[1], l);
  }
  // world — 0…8, level — рівень ворога; без світу — за рівнем серед усіх світів
  function enemySpeed(world, level) {
    const n = ENEMY_SPEED.worlds.length, step = (ENEMY_SPEED.max - ENEMY_SPEED.min) / n;
    const [lo, hi] = worldLevels[world] || [level, level];
    const inWorld = hi > lo ? Math.max(0, Math.min(1, (level - lo) / (hi - lo))) : 0.5;
    return Math.round(ENEMY_SPEED.min + step * (world + inWorld));
  }
  for (const [id, e] of Object.entries(ENEMIES)) e.stats.speed = Math.min(ENEMY_SPEED.cap || Infinity, enemySpeed(enemyWorld[id] ?? 0, e.level || 1));

  // ---------- ШАХТА Й ЛІСОПИЛКА (експедиції — expedition.js) ----------
  // На мапі кожного світу без дороги до них: з мапи лише відправляють туди експедицію (3 або 6 героїв на 4 години).
  // Вороги — усі звичайні (не боси) вороги бойових локацій свого світу. За кожен виграний бій — 1–3 кожного ресурсу з yields.
  // image — фон локації (assets/images/locations/loc_<image>.webp), у кожного світу свій (v171).
  const EXPEDITION_SITES = {
    start: {
      mine:    { minLevel: 5, image: "mine_start", yields: ["copper_ore", "coal"],
                 description: "Стара мідна шахта в скелях над Гардарикою. Хутірські рудокопи покинули її, коли зі штолень полізли щури й вовки, — та мідь і вугілля там ще є." },
      sawmill: { minLevel: 5, image: "sawmill_start", yields: ["oak_wood", "ash_wood", "flax"],
                 description: "Хутірська лісопилка на узліссі: дубові й ясеневі колоди, а на полі поруч — льон. Звірі з лісу вважають ці місця своїми." }
    },
    dark: {
      mine:    { minLevel: 10, image: "mine_dark", yields: ["silver_ore", "iron_ore"],
                 description: "Штольні під скелями біля Центральної брами. Срібло й залізо Темного лісу варті ризику — якщо вийти живим з туману." },
      sawmill: { minLevel: 10, image: "sawmill_dark", yields: ["oak_wood", "ash_wood"],
                 description: "Покинута лісопилка вартових посеред Темного лісу. Пили ще гострі, колоди ще лежать, а з-поміж дерев дивляться жовті очі." }
    },
    alf: {
      mine:    { minLevel: 25, image: "mine_alf", yields: ["gold_ore", "platinum_ore"],
                 description: "Копальні альвів у світлих горах Альвгейму. Золото й платина тут виходять просто на поверхню, але тлін Хелли дістався й сюди." },
      sawmill: { minLevel: 25, image: "sawmill_alf", yields: ["yew_wood"],
                 description: "Тисовий гай альвів, де колись різали дерево на луки. Здичавілі альви досі стережуть кожен стовбур." }
    },
    van: {
      mine:    { minLevel: 30, image: "mine_van", yields: ["iron_ore", "platinum_ore"],
                 description: "Копальні ванів у прибережних скелях Ноатуну. Залізо й біла платина лежать тут поруч із морем — і з тими, кого море викинуло на берег." },
      sawmill: { minLevel: 30, image: "sawmill_van", yields: ["yew_wood"],
                 description: "Вирубка в Лісі Квасіра, де вани брали темний тис на щогли й луки. Тролі й зачаровані звірі вважають ці дерева своїми." }
    },
    svart: {
      mine:    { minLevel: 35, image: "mine_svart", yields: ["iron_ore", "rock_crystal"],
                 description: "Копальні двергів під Сутінковими штольнями. Залізо тут лежить поруч із гірським кришталем — і з тими, хто не встиг вийти, коли згасли ліхтарі." },
      sawmill: { minLevel: 35, image: "sawmill_svart", yields: ["ironwood"],
                 description: "Гай залізного дерева серед велетенських печерних грибів. Його стовбури тверді, як кований метал, а в тіні грибних шапок полюють ті, кому не потрібне світло." }
    },
    jot: {
      mine:    { minLevel: 40, image: "mine_jot", yields: ["iron_ore", "rock_crystal"],
                 description: "Копальня велетнів у схилі льодовика. Залізна руда тут лежить брилами, які йотуни вивертали голими руками, а між ними блищить гірський кришталь." },
      sawmill: { minLevel: 40, image: "sawmill_jot", yields: ["ironwood"],
                 description: "Вирубка на краю Залізного лісу. Стовбури тут тверді, як ковадло, а вовки Ангрбоди вважають кожне повалене дерево своїм." }
    },
    musp: {
      mine:    { minLevel: 45, image: "mine_musp", yields: ["iron_ore", "rock_crystal"],
                 description: "Обсидіанова копальня біля лавових рік. Залізна руда тут спечена в брили, а гірський кришталь виростає з жару — тільки встигай вибирати, поки з лави не вилізли її господарі." },
      sawmill: { minLevel: 45, image: "sawmill_musp", yields: ["ironwood"],
                 description: "Обгорілий гай залізного дерева на краю попелястих рівнин. Вогонь його не бере — тільки чорнить кору, а вогняні гончаки вважають ці стовбури своїми." }
    },
    asg: {
      mine:    { minLevel: 50, image: "mine_asgard", yields: ["celestial_ore", "bifrost_shard"],
                 description: "Небесна копальня на краю хмар під мурами Асгарду. Небесна руда тут виходить просто на скелі, а з тріщин світять уламки Біфросту — тільки армія Хелли вже знає, де копати." },
      sawmill: { minLevel: 50, image: "sawmill_asgard", yields: ["white_ash", "eagle_feather"],
                 description: "Гай білого ясеня на схилі під Брейдабліком. Деревина тут світла й легка, як пір'я, а орли з вершин скидають на землю свої пера — та вовки Фенріра вже нишпорять між стовбурами." }
    },
    nifl: {
      mine:    { minLevel: 50, image: "mine_hel", yields: ["ygg_heartwood", "star_spark"],
                 description: "Копальня в кризі під коренем Дерева. Тут із льоду вибивають окам'янілу серцевину Іггдрасиля, а в темряві часом блищать зоряні іскри — та туманні примари не люблять стуку кайла." },
      sawmill: { minLevel: 50, image: "sawmill_hel", yields: ["ygg_bark", "ygg_root"],
                 description: "Мертвий гай біля коріння, де відмерлі пагони Іггдрасиля стоять, як дерева. Кору й коріння тут можна брати, не ранячи Дерева, — якщо встигнеш до кореневих червів." }
    }
  };
  const SITE_NAMES = { mine: "Шахта", sawmill: "Лісопилка" };
  for (const [region, sites] of Object.entries(EXPEDITION_SITES)) {
    const pool = [...new Set(Object.values(LOCATIONS)
      .filter(l => (l.region || "start") === region && l.type === "combat")
      .flatMap(l => l.enemies || []))].filter(id => !ENEMIES[id]?.boss);
    for (const [type, s] of Object.entries(sites)) {
      LOCATIONS[`${type}_${region}`] = { name: SITE_NAMES[type], type, region, minLevel: s.minLevel, image: s.image,
        description: s.description, yields: s.yields, enemies: pool, expeditionOnly: true };
    }
  }

  // ---------- ДАНЖІ (логіка — dungeon.js) ----------
  // Локація з полем dungeon має два режими:
  //   explore — «Обстеження»: звичайні бої без боса; з кожного переможеного ворога з pool
  //             з шансом keyChance випадає ключ key;
  //   dungeon — данж: вхід лише з ключем (1 спроба = 1 ключ), 3 бої поспіль без зілля:
  //             1) випадкові вороги з pool — по одному на кожного живого героя, 2) три вороги (або стільки, скільки героїв,
  //                якщо їх більше) — усі види з pool (решта — випадкові),
  //             3) бос. Вороги боїв 1–2 мають речі з GS, рівним GS групи героїв.
  //             Досвід і здобич — лише за перемогу в 3-му бою (з боса).
  const DUNGEONS = {
    cave_secret: {
      name: "Таємниці печери", explore: "Обстеження печери", location: "forest_cave",
      key: "key_cave_secret", keyChance: 0.01, boss: "slime_king", pool: ["slime", "slime2", "slime3"],
      edge: "walls",   // кам'яні зали за воротами (краї поля в данжі; без edge — як у локації)
      description: "Важкі кам'яні ворота в глибині печери. За ними — три зали, повні слизу, і трон Короля слайма. Зілля й відпочинок там не допоможуть — лише навички лікування."
    },
    web_nest: {
      name: "Гніздо Королеви", explore: "Обстеження глибин лісу", location: "dk_webs",
      key: "key_web_nest", keyChance: 0.01, boss: "spider_queen", pool: ["web_hunter", "web_weaver"],
      edge: "rocks",
      description: "Прохід у кокон завбільшки з будинок. Усередині — мисливці й ткачі, а в самому серці гнізда — Королева павуків."
    },
    dark_throne: {
      name: "Трон Володаря", explore: "Обстеження Серця лісу", location: "dk_heart",
      key: "key_dark_throne", keyChance: 0.01, boss: "forest_lord", pool: ["ancient_treant", "black_rider"],
      minLevel: 22,   // фінальний бій з Володарем (данж) — з 22 рівня персонажа; обстеження Серця — з 20
      edge: "trees",
      description: "Коло каменів розступається, відкриваючи стежку до мертвого дерева. Його вартують лісовики й вершники, а на троні з коріння чекає Володар Темного лісу."
    },
    alf_moth_nest: {
      name: "Гніздо мотилів", explore: "Обстеження гаю", location: "alf_grove",
      key: "key_alf_grove", keyChance: 0.01, boss: "alf_boss_moths", pool: ["alf_wisp", "alf_moth", "alf_feral_archer"],
      edge: "trees",
      description: "Найстаріша береза гаю порожниста всередині, і в її дуплі шелестять тисячі крил. Там, у срібному пилу, живе Матір мотилів."
    },
    alf_lake_depths: {
      name: "Глибини озера", explore: "Обстеження берегів", location: "alf_lake",
      key: "key_alf_lake", keyChance: 0.01, boss: "alf_boss_necken", pool: ["alf_nixie", "alf_reflection", "alf_crystal_toad"],
      edge: "water",
      description: "Сходи з білого каменю ведуть просто у воду, і вона розступається. На дні грає на скрипці Неккен — і ніхто, хто чув його пісню, не повертався сам."
    },
    alf_rot_garden: {
      name: "Тлінна оранжерея", explore: "Обстеження садів", location: "alf_gardens",
      key: "key_alf_gardens", keyChance: 0.01, boss: "alf_boss_gardener", pool: ["alf_thornbush", "alf_poison_bloom", "alf_gardener"],
      edge: "walls",
      description: "Скляна оранжерея на нижній терасі заросла гнилим цвітом. Її доглядає Тлінний садівник — і він не любить гостей."
    },
    alf_dawn_spire: {
      name: "Вершина світанку", explore: "Обстеження веж", location: "alf_towers",
      key: "key_alf_towers", keyChance: 0.01, boss: "alf_boss_high_mage", pool: ["alf_elf_mage", "alf_light_sentinel", "alf_herald_owl"],
      edge: "walls",
      description: "Сходи в найвищій вежі ведуть до зали, де сходить сонце. Там, у колі рун, чекає Верховний маг ліосальвів."
    },
    alf_freyr_throne: {
      name: "Трон Фрейра", explore: "Обстеження чертогу", location: "alf_freyr",
      key: "key_alf_freyr", keyChance: 0.01, boss: "alf_boss_gullinbursti", pool: ["alf_wild_boar", "alf_elf_knight", "alf_huntsman"],
      edge: "trees",
      description: "Двері тронної зали відчиняються, і в золотому світлі піднімається Тінь Гуллінбурсті — вепра Фрейра, наполовину зі світла, наполовину з диму."
    },
    alf_beli_barrow: {
      name: "Курган Белі", explore: "Обстеження поля", location: "alf_beli",
      key: "key_alf_beli", keyChance: 0.01, boss: "alf_boss_beli", pool: ["alf_dead_giant", "alf_stag_spirit", "alf_rot_warrior"],
      minLevel: 30,   // фінальний бій світу 3 — з 30 рівня
      edge: "rocks",
      description: "Курган посеред поля розколовся, і з нього виходить Белі — велетень, якого Фрейр колись убив рогом оленя. Хелла дала йому друге життя."
    },
    // Данжі Ванагейму (світ 4)
    van_ghost_ship: {
      name: "Корабель мерців", explore: "Обстеження берега", location: "van_shore",
      key: "key_van_shore", keyChance: 0.01, boss: "van_boss_draugr_captain", pool: ["van_draugr_sailor", "van_shore_crab", "van_gull_harpy"],
      edge: "water",
      description: "Найбільший драккар у гавані стоїть із піднятим вітрилом, хоч вітру немає. На його кормі чекає Капітан драугрів — і його команда ще не списана на берег."
    },
    van_volva_hut: {
      name: "Хатина на кістках", explore: "Обстеження мочарів", location: "van_marsh",
      key: "key_van_marsh", keyChance: 0.01, boss: "van_boss_the_old_volva", pool: ["van_volva_witch", "van_toad_shapeshifter", "van_marsh_light"],
      edge: "water",
      description: "У серці мочарів стоїть хатина на палях із китових ребер. Стара вьольва бачила ваш прихід ще до того, як ви народилися, — і вже зварила для вас зілля."
    },
    van_mead_cellar: {
      name: "Медовий льох", explore: "Обстеження лісу", location: "van_kvasir",
      key: "key_van_kvasir", keyChance: 0.01, boss: "van_boss_fjalar_and_galar", pool: ["van_enchanted_beast", "van_eavesdropping_shade", "van_forest_troll"],
      edge: "trees",
      description: "Під корінням найстарішого дуба — льох із трьома казанами. Дверги Фьялар і Галар досі стережуть мед, зварений із крові Квасіра, і свідків не лишають."
    },
    van_pyre_heart: {
      name: "Серце вогнища", explore: "Обстеження кургану", location: "van_barrow",
      key: "key_van_barrow", keyChance: 0.01, boss: "van_boss_gullveig_the_thrice_burned", pool: ["van_gold_spirit", "van_burnt_cultist", "van_barrow_guard"],
      edge: "rocks",
      description: "У глибині кургану досі тліє вогнище, на якому аси тричі палили чаклунку. З попелу підводиться Гулльвейг — і вогонь їй більше не страшний."
    },
    van_inner_shrine: {
      name: "Внутрішнє святилище", explore: "Обстеження храму", location: "van_temple",
      key: "key_van_temple", keyChance: 0.01, boss: "van_boss_high_priestess_of_the_vanir", pool: ["van_vanir_priest", "van_freyjas_forest_cat", "van_seidr_guardian"],
      edge: "walls",
      description: "За завісою з квітів — зала з трьома вівтарями, куди не ступав жоден чужинець. Верховна жриця ванів не пробачає тим, хто порушив тишу святилища."
    },
    van_ran_hall: {
      name: "Чертог Ран", explore: "Обстеження бухти", location: "van_ran",
      key: "key_van_ran", keyChance: 0.01, boss: "van_boss_ran_mistress_of_the_drowned", pool: ["van_wave_daughter", "van_drowned_warrior", "van_deep_eel"],
      minLevel: 35,   // фінальний бій світу 4 — з 35 рівня
      edge: "water",
      description: "У відплив море розступається й відкриває сходи до підводного чертога, освітленого золотом утоплених. Там, серед сітей, чекає Ран — володарка всіх, кого забрало море."
    },
    // Данжі Свартальвгейму (світ 5)
    svart_matriarch_cocoon: {
      name: "Кокон Матки", explore: "Обстеження копалень", location: "svart_mines",
      key: "key_svart_mines", keyChance: 0.01, boss: "svart_boss_cave_spider_matriarch", pool: ["svart_cave_spider", "svart_stone_worm", "svart_blood_bat"],
      edge: "walls",
      description: "Найглибша штольня затягнута павутинням від підлоги до склепіння. У її кінці, над купою порожніх обладунків, висить кокон, у якому ворушиться Матка печерних павуків."
    },
    svart_andvari_hoard: {
      name: "Скарбниця Андварі", explore: "Обстеження водоспаду", location: "svart_falls",
      key: "key_svart_falls", keyChance: 0.01, boss: "svart_boss_andvari", pool: ["svart_cursed_pike", "svart_water_troll", "svart_greedy_kobold"],
      edge: "water",
      description: "За стіною води — грот, завалений золотом по коліна. Андварі стереже його в подобі щуки й у подобі карлика, і жодна монета ще не покинула цю печеру без його прокляття."
    },
    svart_obsidian_spire: {
      name: "Обсидіановий шпиль", explore: "Обстеження кварталів", location: "svart_quarters",
      key: "key_svart_quarters", keyChance: 0.01, boss: "svart_boss_prince_of_the_dark_elves", pool: ["svart_shadow_assassin", "svart_venom_archer", "svart_shadow_mage"],
      edge: "walls",
      description: "Найвищий шпиль Чорних кварталів витесаний з одного шматка обсидіану. На його вершині Князь свартальвів присягнув Хеллі — і відтоді не спускався до свого народу."
    },
    svart_stone_hall: {
      name: "Скам'яніла зала", explore: "Обстеження чертогу", location: "svart_alvis",
      key: "key_svart_alvis", keyChance: 0.01, boss: "svart_boss_alvis_the_all_knowing", pool: ["svart_stone_sentinel", "svart_traitor_dwarf", "svart_rune_warden"],
      edge: "walls",
      description: "У глибині чертогу, куди не дістає світло, камінь знову став плоттю. Альвіс Всезнаючий чекає на того, хто відповість на його питання, — а тих, хто не відповів, додає до своїх статуй."
    },
    svart_sealed_forge: {
      name: "Запечатане горно", explore: "Обстеження кузень", location: "svart_forges",
      key: "key_svart_forges", keyChance: 0.01, boss: "svart_boss_hels_forged_guardian", pool: ["svart_living_anvil", "svart_fire_salamander", "svart_forged_boar"],
      edge: "walls",
      description: "За дверима з рунами — горно, яке не гасло від створення світів. Хелла поставила біля нього власного стража, викуваного з уламків зброї полеглих, і замкнула братів усередині."
    },
    svart_rune_well: {
      name: "Колодязь рун", explore: "Обстеження глибин", location: "svart_runes",
      key: "key_svart_runes", keyChance: 0.01, boss: "svart_boss_keeper_of_the_runes", pool: ["svart_rune_spirit", "svart_masters_ghost", "svart_crystal_golem"],
      edge: "rocks",
      description: "На дні прірви руни сходяться в одне коло. Хранитель стежить, щоб жодна з них не була прочитана чужинцем, — і вже забув, кому колись служив."
    },
    svart_clay_heart: {
      name: "Глиняне серце", explore: "Обстеження кузні", location: "svart_mokkur",
      key: "key_svart_mokkur", keyChance: 0.01, boss: "svart_boss_mokkurkalfi", pool: ["svart_clay_golem", "svart_iron_draugr", "svart_overseer_dwarf"],
      minLevel: 40,   // фінальний бій світу 5 — з 40 рівня
      edge: "rocks",
      description: "У грудях недоліпленого велетня — порожнина, де має битися серце. Карлики-наглядачі вже несуть туди те, що наказала Хелла. Якщо Мьоккуркальві встане, спинити його буде нікому."
    },
    // Данжі Йотунгейму (світ 6)
    jot_troll_cave: {
      name: "Троляча печера", explore: "Обстеження перевалів", location: "jot_passes",
      key: "key_jot_passes", keyChance: 0.01, boss: "jot_boss_troll_chieftain", pool: ["jot_mountain_troll", "jot_snow_wolf", "jot_frost_scout"],
      edge: "rocks",
      description: "Під перевалом — печера, де тролі складають кістки тих, хто не дійшов до Йотунгейму. У найглибшій залі, на купі награбованого, сидить їхній ватажок."
    },
    jot_eagle_nest: {
      name: "Орлине гніздо", explore: "Обстеження скелі", location: "jot_thrymheim",
      key: "key_jot_thrymheim", keyChance: 0.01, boss: "jot_boss_thjazi_in_eagle_form", pool: ["jot_giant_hunter", "jot_snow_lynx", "jot_ski_archer"],
      edge: "rocks",
      description: "На вершині орлиної скелі — гніздо з поламаних щогл і списів. Сюди Тьяцці приніс Ідунн з її яблуками — і сюди він повертається щоразу, коли хтось сміє полювати на його землі."
    },
    jot_angrboda_lair: {
      name: "Лігво Ангрбоди", explore: "Обстеження лісу", location: "jot_ironwood",
      key: "key_jot_ironwood", keyChance: 0.01, boss: "jot_boss_angrboda", pool: ["jot_ironwood_wolf", "jot_troll_witch", "jot_wolf_man"],
      edge: "trees",
      description: "У самому серці Ярнвіду, де залізні дерева сплелися в склепіння, — лігво Ангрбоди. Тут вона виростила Фенріра, Йормунганда й Хеллу — і тут чекає онуків."
    },
    jot_thrym_hoard: {
      name: "Скарбниця Трима", explore: "Обстеження двору", location: "jot_thrym",
      key: "key_jot_thrym", keyChance: 0.01, boss: "jot_boss_thrym_king_of_the_thurses", pool: ["jot_giant_warrior", "jot_troll_guard", "jot_giant_skald"],
      edge: "walls",
      description: "Під двором — скарбниця, де Трим ховав Мйольнір на вісім верст під землею. Молота там давно немає, але король турсів досі стереже порожнє місце."
    },
    jot_stone_heart: {
      name: "Кам'яне серце", explore: "Обстеження пустки", location: "jot_waste",
      key: "key_jot_waste", keyChance: 0.01, boss: "jot_boss_hrungnir", pool: ["jot_stone_giant", "jot_rock_troll", "jot_living_boulder"],
      edge: "rocks",
      description: "У грудях поваленого велетня — порожнина, де б'ється кам'яне серце на три кути. Грунгнір устав знову, і цього разу Тора поруч немає."
    },
    jot_hall_of_illusions: {
      name: "Чертог ілюзій", explore: "Обстеження Утгарда", location: "jot_utgard",
      key: "key_jot_utgard", keyChance: 0.01, boss: "jot_boss_utgarda_loki", pool: ["jot_logi", "jot_hugi", "jot_elli"],
      edge: "walls",
      description: "За брамою Утгарда — чертог, де стіни рухаються, а гості змагаються з тим, чого не можна перемогти. Утгарда-Локі сміється з кожного, хто повірив власним очам."
    },
    jot_hymir_cauldron: {
      name: "Казан Гюміра", explore: "Обстеження затоки", location: "jot_hymir",
      key: "key_jot_hymir", keyChance: 0.01, boss: "jot_boss_hymir", pool: ["jot_sea_troll", "jot_giant_walrus", "jot_draugr_fisher"],
      edge: "water",
      description: "У крижаній печері над затокою висить казан на милю завглибшки — той, по який колись приходив Тор. Гюмір не віддасть його вдруге."
    },
    jot_serpent_ring: {
      name: "Кільце Змія", explore: "Обстеження берега", location: "jot_serpent",
      key: "key_jot_serpent", keyChance: 0.01, boss: "jot_boss_jormungandr", pool: ["jot_serpent_spawn", "jot_venom_jellyfish", "jot_serpent_cultist"],
      minLevel: 45,   // фінальний бій світу 6 — з 45 рівня
      edge: "water",
      description: "Там, де Змій кусає власний хвіст, кільце його тіла замикає море. Хелла кличе Йормунганда на берег — і якщо він вийде, Мідгард не встоїть."
    },
    // Данжі Муспельгейму (світ 7)
    musp_hound_lair: {
      name: "Лігво вогняних псів", explore: "Обстеження рівнин", location: "musp_ash",
      key: "key_musp_ash", keyChance: 0.01, boss: "musp_boss_hound_packleader", pool: ["musp_fire_hound", "musp_salamander", "musp_ash_spirit"],
      edge: "rocks",
      description: "Під шаром попелу — нори, де гончаки виводять цуценят у жарі. Ватажок зграї не любить гостей."
    },
    musp_serpent_nest: {
      name: "Гніздо Лавового змія", explore: "Обстеження русла", location: "musp_lava",
      key: "key_musp_lava", keyChance: 0.01, boss: "musp_boss_lava_serpent", pool: ["musp_magma_elemental", "musp_lava_worm", "musp_fire_serpent"],
      edge: "rocks",
      description: "Там, де дві ріки лави сходяться, у кипучому вирі звився Лавовий змій. Його луска — застигла магма, його подих — сама ріка."
    },
    musp_sons_forge: {
      name: "Горно синів Муспелля", explore: "Обстеження кузень", location: "musp_forges",
      key: "key_musp_forges", keyChance: 0.01, boss: "musp_boss_master_smith_of_muspel", pool: ["musp_fire_giant_smith", "musp_living_iron", "musp_glowing_golem"],
      edge: "walls",
      description: "У серці кузень палає горно, де метал плавиться від самого погляду. Майстер-коваль Муспелля кує тут меч, яким колись спалять світ."
    },
    musp_citadel_vaults: {
      name: "Підземелля цитаделі", explore: "Обстеження фортеці", location: "musp_fortress",
      key: "key_musp_fortress", keyChance: 0.01, boss: "musp_boss_fortress_commander", pool: ["musp_fire_knight", "musp_flame_mage", "musp_obsidian_sentinel"],
      edge: "walls",
      description: "Під фортецею — склепи, де Сурт тримає полонених і зброю. Комендант знає кожен коридор, а коридори знають його."
    },
    musp_sinmara_vault: {
      name: "Скарбниця Сінмари", explore: "Обстеження чертогу", location: "musp_sinmara",
      key: "key_musp_sinmara", keyChance: 0.01, boss: "musp_boss_sinmara", pool: ["musp_flame_priestess", "musp_fire_bird", "musp_chest_guardian"],
      edge: "walls",
      description: "За дев'ятьма замками — скарбниця, де Сінмара ховає те, що дорожче за вогонь. Вона не віддасть ключ ні богам, ні велетням."
    },
    musp_ymir_abyss: {
      name: "Безодня Іміра", explore: "Обстеження прірви", location: "musp_ginnungagap",
      key: "key_musp_ginnungagap", keyChance: 0.01, boss: "musp_boss_echo_of_ymir", pool: ["musp_steam_spirit", "musp_frost_shade", "musp_chaos_spirit"],
      edge: "rocks",
      description: "На дні Гіннунгагапу, де вогонь і лід ще досі б'ються, блукає відлуння першого велетня. Воно пам'ятає, як боги розірвали його на світ."
    },
    musp_volcano_heart: {
      name: "Серце вулкана", explore: "Обстеження кратера", location: "musp_surtr",
      key: "key_musp_surtr", keyChance: 0.01, boss: "musp_boss_surtr", pool: ["musp_son_of_muspel", "musp_fire_drake", "musp_surtrs_guard"],
      minLevel: 50,   // фінальний бій світу 7 — з 50 рівня
      edge: "rocks",
      description: "У самому серці вулкана Сурт піднімається з трону. Якщо він дійде до Біфросту, міст згорить — і Асгард залишиться без захисту."
    },
    // Данжі Асгарду (світ 8) — звуться як локації (рішення 2026-11-21)
    asg_himinbjorg_watch: {
      name: "Хімінбйорг", explore: "Обстеження варти", location: "asg_himinbjorg",
      key: "key_asg_himinbjorg", keyChance: 0.01, boss: "asg_boss_hrym", pool: ["asg_draugr_stormtrooper", "asg_hels_rider", "asg_dead_man_of_naglfar"],
      edge: "rocks",
      description: "У підвалах сторожової вежі Хрюм, стерновий Нагльфара, зводить крижаний міст для армії мерців. Поки він тут — Біфрост належить Хеллі."
    },
    asg_fensalir_halls: {
      name: "Фенсалір", explore: "Обстеження боліт", location: "asg_fensalir",
      key: "key_asg_fensalir", keyChance: 0.01, boss: "asg_boss_angrboda_hel_empowered_form", pool: ["asg_bog_corpse", "asg_seidkona_witch", "asg_bog_viper"],
      edge: "water",
      description: "У залитих залах Фрігг Ангрбода пряде нитку долі навиворіт. Сила Хелли зробила її вдвічі страшнішою."
    },
    asg_breidablik_meadow: {
      name: "Брейдаблік", explore: "Обстеження лугу", location: "asg_breidablik",
      key: "key_asg_breidablik", keyChance: 0.01, boss: "asg_boss_fenrir", pool: ["asg_fenrirs_wolf", "asg_skoll", "asg_hati"],
      edge: "trees",
      description: "Посеред лугу лежать порвані пута Ґлейпнір. Фенрір чекає поруч — і пам'ятає кожного бога, що сміявся з нього."
    },
    asg_bilskirnir_hall: {
      name: "Бількірнір", explore: "Обстеження подвір'я", location: "asg_bilskirnir",
      key: "key_asg_bilskirnir", keyChance: 0.01, boss: "asg_boss_hrungnir_hel_empowered_form", pool: ["asg_utgard_giant", "asg_stone_troll", "asg_storm_spirit"],
      edge: "walls",
      description: "Тор пішов битися на Біфрост, і в його чертог вліз Хрунґнір — кам'яне серце, кам'яна голова, а тепер ще й сила Хелли."
    },
    asg_valhalla_shields: {
      name: "Валгалла", explore: "Обстеження подвір'я", location: "asg_valhalla",
      key: "key_asg_valhalla", keyChance: 0.01, boss: "asg_boss_hlokk", pool: ["asg_enthralled_einherjar", "asg_dead_valkyrie", "asg_shadow_raven"],
      edge: "walls",
      description: "У залі бенкетів, де ейнгерії пили мед, валькірія Хльок збирає мертвих не для Одіна, а для Хелли."
    },
    asg_vingolf_garden: {
      name: "Вінґольв", explore: "Обстеження саду", location: "asg_vingolf",
      key: "key_asg_vingolf", keyChance: 0.01, boss: "asg_boss_gullveig_hel_empowered_form", pool: ["asg_dark_soul_envoy", "asg_dark_soul_archer", "asg_dark_priestess"],
      edge: "trees",
      description: "У глибині саду Гулльвейг роздмухує жар, у якому її колись палили. Тепер горять не вона — горять квіти богинь."
    },
    asg_gladsheim_thrones: {
      name: "Гладсгейм", explore: "Обстеження тронів", location: "asg_gladsheim",
      key: "key_asg_gladsheim", keyChance: 0.01, boss: "asg_boss_shadow_of_loki", pool: ["asg_draugr_jarl", "asg_dark_soul", "asg_bone_skald"],
      edge: "walls",
      description: "Тінь Локі сміється з порожніх тронів. Справжній Локі ще скутий, але його тінь давно вільна — і вона служить Хеллі, своїй доньці."
    },
    asg_square_heart: {
      name: "Головна площа Асгарду", explore: "Обстеження площі", location: "asg_square",
      key: "key_asg_square", keyChance: 0.01, boss: "asg_boss_utgarda_loki_hel_empowered_form", pool: ["asg_hels_elite_swordsman", "asg_hels_elite_shieldbearer", "asg_hels_elite_sorcerer"],
      edge: "walls",
      description: "Посеред площі Утгарда-Локі показує богам їхню поразку — так правдиво, що декотрі вже повірили. Сила Хелли зробила його ілюзії гострими, як сталь."
    },
    asg_hlidskjalf_throne: {
      name: "Глідскьяльв", explore: "Обстеження вежі", location: "asg_hlidskjalf",
      key: "key_asg_hlidskjalf", keyChance: 0.01, boss: "asg_boss_hel_on_odins_throne", pool: ["asg_hels_royal_guard_swordsman", "asg_hels_royal_guard_witch", "asg_hels_guard_beast"],
      edge: "walls",
      description: "Хелла сидить на престолі Одіна й дивиться на всі світи разом. Її варта стоїть на сходах, а за її спиною в небі вже відкривається зелено-чорний портал."
    },
    // Данжі Ніфльгейму й Хельгейму (світ 9) — звуться як локації (рішення 2026-11-21)
    nifl_border_mist: {
      name: "Туманна межа", explore: "Обстеження мряки", location: "nifl_border",
      key: "key_nifl_border", keyChance: 0.01, boss: "nifl_boss_warden_of_the_mist", pool: ["nifl_mist_wraith", "nifl_ice_wolf"],
      edge: "rocks",
      description: "Посеред туману стоїть Вартовий Мряки — той, хто вирішує, кого пропустити вниз, до Хелли. Живих він не пропускає ніколи."
    },
    nifl_elivagar_rivers: {
      name: "Елівагар", explore: "Обстеження рік", location: "nifl_elivagar",
      key: "key_nifl_elivagar", keyChance: 0.01, boss: "nifl_boss_bergelmir", pool: ["nifl_rime_thurs", "nifl_ice_serpent"],
      edge: "water",
      description: "Бергельмір — єдиний інеєвий велетень, що пережив потоп крові Іміра. Він пам'ятає, як боги вбили його діда, і чекав саме цієї війни."
    },
    nifl_hvergelmir_spring: {
      name: "Ґвергельмір", explore: "Обстеження джерела", location: "nifl_hvergelmir",
      key: "key_nifl_hvergelmir", keyChance: 0.01, boss: "nifl_boss_grabakr", pool: ["nifl_steam_spirit", "nifl_water_serpentine"],
      edge: "water",
      description: "На дні джерела лежить Ґрабак — змій, що гризе корінь Дерева разом із Нідгьоґом. Хелла пообіцяла йому, що Дерево скоро впаде."
    },
    nifl_roots_deep: {
      name: "Корені Дерева", explore: "Обстеження коріння", location: "nifl_roots",
      key: "key_nifl_roots", keyChance: 0.01, boss: "nifl_boss_goinn_and_moinn", pool: ["nifl_rotten_sprout", "nifl_root_worm"],
      edge: "trees",
      description: "У глибині коріння двоє зміїв, Ґоїн і Моїн, прогризають хід до самого серця Дерева. Ще трохи — і Іггдрасиль захитається."
    },
    nifl_nidafjoll_peaks: {
      name: "Нідафйолл", explore: "Обстеження гір", location: "nifl_nidafjoll",
      key: "key_nifl_nidafjoll", keyChance: 0.01, boss: "nifl_boss_svafnir_and_ofnir", pool: ["nifl_night_harpy", "nifl_stone_draugr"],
      edge: "rocks",
      description: "У найглибшій ущелині ховаються Свавнір і Офнір — змії-чаклуни, що шепочуть прокляття самому Дереву."
    },
    nifl_nidhogg_nest: {
      name: "Гніздо Нідгьоґа", explore: "Обстеження гнізда", location: "nifl_nidhogg",
      key: "key_nifl_nidhogg", keyChance: 0.01, boss: "nifl_boss_nidhogg", pool: ["nifl_dragon_hatchling", "nifl_corpse_eater"],
      edge: "rocks",
      description: "Нідгьоґ, дракон-трупоїд, підняв голову від кореня. Він давно чекав кінця світу — і не хоче, щоб хтось його зупинив."
    },
    nifl_gjallarbru_bridge: {
      name: "Міст Ґйаллабру", explore: "Обстеження мосту", location: "nifl_gjallarbru",
      key: "key_nifl_gjallarbru", keyChance: 0.01, boss: "nifl_boss_modgud", pool: ["nifl_drowned_soul", "nifl_bridge_warden"],
      edge: "water",
      description: "Модгуд стереже міст, скільки існує смерть. Вона питає кожного ім'я — і для живого в неї є лише одна відповідь."
    },
    nifl_gnipahellir_cave: {
      name: "Гніпахеллір", explore: "Обстеження печери", location: "nifl_gnipahellir",
      key: "key_nifl_gnipahellir", keyChance: 0.01, boss: "nifl_boss_garm", pool: ["nifl_hellhound", "nifl_bone_hound"],
      edge: "rocks",
      description: "Гарм, пес Хелли, зірвався з ланцюга. Його виття чути на всі дев'ять світів — і він знає запах кожного, хто ступив у Хельгейм живим."
    },
    nifl_helgrind_gate: {
      name: "Хельгринд", explore: "Обстеження брами", location: "nifl_helgrind",
      key: "key_nifl_helgrind", keyChance: 0.01, boss: "nifl_boss_gatekeeper_of_helgrind", pool: ["nifl_draugr_gatekeeper", "nifl_bone_knight"],
      edge: "walls",
      description: "Брамник Хельгринду тримає ключ від брами в кістяній руці. Щоб пройти до Хелли, доведеться забрати його силою."
    },
    nifl_nastrond_shore: {
      name: "Наструнд", explore: "Обстеження берега", location: "nifl_nastrond",
      key: "key_nifl_nastrond", keyChance: 0.01, boss: "nifl_boss_the_first_traitor", pool: ["nifl_dark_soul_swordsman", "nifl_dark_soul_archer"],
      edge: "water",
      description: "Тут чекає Перший Зрадник — той, хто першим порушив клятву в дев'яти світах. Хелла зробила його начальником над усіма, хто прийшов слідом."
    },
    nifl_eljudnir_hall: {
      name: "Ельвюднір", explore: "Обстеження чертогу", location: "nifl_eljudnir",
      key: "key_nifl_eljudnir", keyChance: 0.01, boss: "nifl_boss_ganglati_and_ganglot", pool: ["nifl_captive_einherjar", "nifl_servant_of_hel"],
      edge: "walls",
      description: "Ґанґлаті й Ґанґлот, слуга й служниця Хелли, такі повільні, що здаються нерухомими. Та коли гість чужий — вони стають швидкими."
    },
    nifl_throne_hall: {
      name: "Трон Хелли", explore: "Обстеження трону", location: "nifl_throne",
      key: "key_nifl_throne", keyChance: 0.01, boss: "nifl_boss_hel_final_form", pool: ["nifl_hel_guard_knight", "nifl_hel_guard_witch"],
      edge: "walls",
      description: "Хелла більше не тікає. На своєму троні, у своєму світі, вона сильніша, ніж будь-де — половина живої, половина мертвої, володарка всіх, хто помер не в бою."
    }
  };

  // Торговець Гільдії авантюристів (Дубова Застава): зброя 1–2 виду, шкіряна броня (2 вид), малі й середні зілля
  const GUILD_SHOP = [
    "potion_hp_small", "potion_hp_medium", "potion_mp_small", "potion_mp_medium",
    "sword_t1", "dagger_t1", "axe_t1", "bow_t1", "staff_t1",
    "shield_t1", "quiver_t1", "orb_t1", "knife_t1",
    "sword_t2", "dagger_t2", "axe_t2", "bow_t2", "staff_t2",
    "shield_t2", "quiver_t2", "orb_t2", "knife_t2",
    "leather_head", "leather_chest", "leather_legs", "leather_hands", "leather_feet"
  ];
  const RESPAWN_LOCATION = "temple";

  // ---------- Чемпіони ----------
  // З шансом 5% замість звичайного ворога з'являється чемпіон (золота рамка, попередження):
  //   показники ×3 (здоров'я, мана, атака, магія, захист, маг. захист;
  //   відсоткові шанси і швидкість — як у звичайного),
  //   Гільдія авантюристів платить за нього нагороду ×5 (досвід і золото ворога),
  //   з нього випадає ОДНА річ: спершу перевірка легендарної (5%), якщо ні —
  //   епічної (25%), якщо ні — магічної (50%).
  const CHAMPION = {
    chance: 0.05,
    statMult: 3,
    bountyMult: 5,
    statKeys: ["hp", "mp", "attack", "magic", "defense", "magicDefense"],
    drops: [["legendary", 0.05], ["epic", 0.25], ["magic", 0.50]]
  };

  // enemyId — якщо ворог не може бути чемпіоном (noChampion, напр. Король слайм), завжди false
  function rollChampion(enemyId) {
    if (enemyId && ENEMIES[enemyId]?.noChampion) return false;
    return Math.random() < CHAMPION.chance;
  }

  // champion = true — повертає посилену копію ворога
  // Дальність атаки й прийом ворога
  function enemyRange(e) { return e?.range || 1; }
  function enemyMove(e) { return e?.move || MONSTER_MOVES[enemyRange(e)]; }

  // Досвід за ворога рівня level: 3 × рівень² (так пораховані всі вороги 1–30 рівня);
  // з 31 рівня — ще ×1,1 за кожен рівень понад 30, щоб на рівень 31–50 треба було ~8 тис. боїв, а не 8→44 тис.
  // (таблиця досвіду 31–50 росте ×1,15 — data/levels.js). mult — для босів (зазвичай ×5–6,5).
  // Вороги нових світів (31+): exp: enemyExp(35) → 5919, enemyExp(40) → 12450, enemyExp(45) → 25377, enemyExp(50) → 50456.
  // (Оголошення функції піднімається — її можна викликати й усередині ENEMIES вище; тому числа тут, а не в const.)
  function enemyExp(level, mult = 1) {
    const extra = level > 30 ? Math.pow(1.1, level - 30) : 1;
    return Math.round(3 * level * level * extra * mult);
  }

  function getEnemy(id, champion = false) {
    const base = ENEMIES[id];
    if (!base || !champion || base.noChampion) return base || null;
    const stats = { ...base.stats };
    for (const k of CHAMPION.statKeys) if (stats[k]) stats[k] = Math.round(stats[k] * CHAMPION.statMult);
    return { ...base, stats, champion: true, baseName: base.name, name: `Чемпіон: ${base.name}` };
  }

  // Трофей чемпіона: { id, r } або null. Річ береться зі здобичі цього ворога
  // (зброя/броня/біжутерія), а якщо такої немає — будь-яка річ 1 виду.
  function rollChampionDrop(enemyId) {
    if (isCraftOnlyEnemy(enemyId)) return null;     // з 4-го світу трофеїв-речей немає (нагорода гільдії лишається)
    let r = null;
    for (const [rarity, chance] of CHAMPION.drops) {
      if (Math.random() < chance) { r = rarity; break; }
    }
    if (!r) return null;
    let pool = (ENEMIES[enemyId]?.loot || []).map(d => d.id).filter(id => RPG.hasRarity(id));
    if (!pool.length) pool = Object.keys(RPG.ITEMS).filter(id => RPG.hasRarity(id) && RPG.ITEMS[id].tier === 1);
    return { id: pool[Math.floor(Math.random() * pool.length)], r };
  }

  // Нагорода гільдії за чемпіона: ×5 від досвіду та середнього золота ворога
  function championBounty(enemyId) {
    const e = ENEMIES[enemyId];
    if (!e) return { exp: 0, gold: 0 };
    return {
      exp: e.exp * CHAMPION.bountyMult,
      gold: Math.round((e.gold[0] + e.gold[1]) / 2 * CHAMPION.bountyMult)
    };
  }

  // Вороги з окремою картинкою assets/images/enemies/<id>.webp (додати ID, коли з'явиться файл)
  const ENEMY_FILES = new Set([
    "dark_soul",   // додано tools/add-image.js
    "ancient_treant", "black_rider", "bog_leech", "cultist", "drowner", "forest_lord",
    "forest_spider", "ghost", "ghoul", "pack_leader", "rot_boar", "shadow_beast",
    "shadow_wolf", "skeleton_archer", "spider_queen", "stone_golem", "web_hunter", "web_weaver",
    "werewolf", "will_wisp", "witch",
    // Альвгейм (світ 3)
    "alf_wisp", "alf_moth", "alf_feral_archer", "alf_boss_moths", "alf_nixie", "alf_reflection",
    "alf_crystal_toad", "alf_boss_necken", "alf_thornbush", "alf_poison_bloom", "alf_gardener", "alf_boss_gardener",
    "alf_elf_mage", "alf_light_sentinel", "alf_herald_owl", "alf_boss_high_mage", "alf_wild_boar", "alf_elf_knight",
    "alf_huntsman", "alf_boss_gullinbursti", "alf_dead_giant", "alf_stag_spirit", "alf_rot_warrior", "alf_boss_beli",
    // Ванагейм (світ 4)
    "van_draugr_sailor", "van_shore_crab", "van_gull_harpy", "van_boss_draugr_captain",
    "van_volva_witch", "van_toad_shapeshifter", "van_marsh_light", "van_boss_the_old_volva",
    "van_enchanted_beast", "van_eavesdropping_shade", "van_forest_troll", "van_boss_fjalar_and_galar",
    "van_gold_spirit", "van_burnt_cultist", "van_barrow_guard", "van_boss_gullveig_the_thrice_burned",
    "van_vanir_priest", "van_freyjas_forest_cat", "van_seidr_guardian", "van_boss_high_priestess_of_the_vanir",
    "van_wave_daughter", "van_drowned_warrior", "van_deep_eel", "van_boss_ran_mistress_of_the_drowned",
    // Свартальвгейм (світ 5)
    "svart_cave_spider", "svart_stone_worm", "svart_blood_bat", "svart_boss_cave_spider_matriarch",
    "svart_cursed_pike", "svart_water_troll", "svart_greedy_kobold", "svart_boss_andvari",
    "svart_shadow_assassin", "svart_venom_archer", "svart_shadow_mage", "svart_boss_prince_of_the_dark_elves",
    "svart_stone_sentinel", "svart_traitor_dwarf", "svart_rune_warden", "svart_boss_alvis_the_all_knowing",
    "svart_living_anvil", "svart_fire_salamander", "svart_forged_boar", "svart_boss_hels_forged_guardian",
    "svart_rune_spirit", "svart_masters_ghost", "svart_crystal_golem", "svart_boss_keeper_of_the_runes",
    "svart_clay_golem", "svart_iron_draugr", "svart_overseer_dwarf", "svart_boss_mokkurkalfi",
    // Йотунгейм (світ 6)
    "jot_mountain_troll", "jot_snow_wolf", "jot_frost_scout", "jot_boss_troll_chieftain",
    "jot_giant_hunter", "jot_snow_lynx", "jot_ski_archer", "jot_boss_thjazi_in_eagle_form",
    "jot_ironwood_wolf", "jot_troll_witch", "jot_wolf_man", "jot_boss_angrboda",
    "jot_giant_warrior", "jot_troll_guard", "jot_giant_skald", "jot_boss_thrym_king_of_the_thurses",
    "jot_stone_giant", "jot_rock_troll", "jot_living_boulder", "jot_boss_hrungnir",
    "jot_logi", "jot_hugi", "jot_elli", "jot_boss_utgarda_loki",
    "jot_sea_troll", "jot_giant_walrus", "jot_draugr_fisher", "jot_boss_hymir",
    "jot_serpent_spawn", "jot_venom_jellyfish", "jot_serpent_cultist", "jot_boss_jormungandr",
    // Муспельгейм (світ 7)
    "musp_fire_hound", "musp_salamander", "musp_ash_spirit", "musp_boss_hound_packleader",
    "musp_magma_elemental", "musp_lava_worm", "musp_fire_serpent", "musp_boss_lava_serpent",
    "musp_fire_giant_smith", "musp_living_iron", "musp_glowing_golem", "musp_boss_master_smith_of_muspel",
    "musp_fire_knight", "musp_flame_mage", "musp_obsidian_sentinel", "musp_boss_fortress_commander",
    "musp_flame_priestess", "musp_fire_bird", "musp_chest_guardian", "musp_boss_sinmara",
    "musp_steam_spirit", "musp_frost_shade", "musp_chaos_spirit", "musp_boss_echo_of_ymir",
    "musp_son_of_muspel", "musp_fire_drake", "musp_surtrs_guard", "musp_boss_surtr",
    // Асгард (світ 8)
    "asg_draugr_stormtrooper", "asg_hels_rider", "asg_dead_man_of_naglfar", "asg_boss_hrym",
    "asg_bog_corpse", "asg_seidkona_witch", "asg_bog_viper", "asg_boss_angrboda_hel_empowered_form",
    "asg_fenrirs_wolf", "asg_skoll", "asg_hati", "asg_boss_fenrir",
    "asg_utgard_giant", "asg_stone_troll", "asg_storm_spirit", "asg_boss_hrungnir_hel_empowered_form",
    "asg_enthralled_einherjar", "asg_dead_valkyrie", "asg_shadow_raven", "asg_boss_hlokk",
    "asg_dark_soul_envoy", "asg_dark_soul_archer", "asg_dark_priestess", "asg_boss_gullveig_hel_empowered_form",
    "asg_draugr_jarl", "asg_dark_soul", "asg_bone_skald", "asg_boss_shadow_of_loki",
    "asg_hels_elite_swordsman", "asg_hels_elite_shieldbearer", "asg_hels_elite_sorcerer", "asg_boss_utgarda_loki_hel_empowered_form",
    "asg_hels_royal_guard_swordsman", "asg_hels_royal_guard_witch", "asg_hels_guard_beast", "asg_boss_hel_on_odins_throne",
    // Ніфльгейм і Хельгейм (світ 9)
    "nifl_mist_wraith", "nifl_ice_wolf", "nifl_boss_warden_of_the_mist",
    "nifl_rime_thurs", "nifl_ice_serpent", "nifl_boss_bergelmir",
    "nifl_steam_spirit", "nifl_water_serpentine", "nifl_boss_grabakr",
    "nifl_rotten_sprout", "nifl_root_worm", "nifl_boss_goinn_and_moinn",
    "nifl_night_harpy", "nifl_stone_draugr", "nifl_boss_svafnir_and_ofnir",
    "nifl_dragon_hatchling", "nifl_corpse_eater", "nifl_boss_nidhogg",
    "nifl_drowned_soul", "nifl_bridge_warden", "nifl_boss_modgud",
    "nifl_hellhound", "nifl_bone_hound", "nifl_boss_garm",
    "nifl_draugr_gatekeeper", "nifl_bone_knight", "nifl_boss_gatekeeper_of_helgrind",
    "nifl_dark_soul_swordsman", "nifl_dark_soul_archer", "nifl_boss_the_first_traitor",
    "nifl_captive_einherjar", "nifl_servant_of_hel", "nifl_boss_ganglati_and_ganglot",
    "nifl_hel_guard_knight", "nifl_hel_guard_witch", "nifl_boss_hel_final_form"
  ]);
  // Заглушка, поки картинки немає: темний силует з очима
  const ENEMY_PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<defs><radialGradient id="g" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="#2b3a2e"/><stop offset="1" stop-color="#2b3a2e" stop-opacity="0"/></radialGradient></defs>' +
    '<ellipse cx="50" cy="58" rx="42" ry="36" fill="url(#g)"/>' +
    '<path d="M22 86 C20 60 30 34 50 30 C70 34 80 60 78 86 Z" fill="#0d120e" opacity=".92"/>' +
    '<path d="M30 40 L24 22 L38 34 Z M70 40 L76 22 L62 34 Z" fill="#0d120e"/>' +
    '<ellipse cx="41" cy="48" rx="4" ry="2.4" fill="#d6ff7a"/><ellipse cx="59" cy="48" rx="4" ry="2.4" fill="#d6ff7a"/></svg>');

  // CSS-стиль кадру ворога (для квадратного елемента)
  function enemySpriteStyle(id) {
    const e = ENEMIES[id];
    if (e && e.sprite === undefined) {
      const file = e.spriteFile || id;           // spriteFile — спільна картинка (Темна душа в усіх данжах)
      const url = ENEMY_FILES.has(file) ? RPG.asset(`assets/images/enemies/${file}.webp`) : ENEMY_PLACEHOLDER;
      return { backgroundImage: `url("${url}")`, backgroundSize: "contain", backgroundPosition: "center bottom", backgroundRepeat: "no-repeat" };
    }
    const sh = ENEMY_SHEET;
    return RPG.spriteStyle(RPG.asset(sh.file + sh.ext), sh.cols, sh.rows, sh.size, sh.gap, ENEMIES[id]?.sprite ?? 0);
  }

  function getLocation(id) {
    return LOCATIONS[id] || LOCATIONS[DEFAULT_LOCATION];
  }

  // Чи можна на локації битися
  function isCombatLocation(id) {
    const loc = getLocation(id);
    return loc.type === "combat" && !loc.locked && (loc.enemies || []).length > 0;
  }

  // Чи пускають героя на локацію: { ok, reason }. save — для Темного лісу (чи відчинена брама)
  // Альвгейм (світ 3): відкритий шлях у Темний ліс + перша перемога над Володарем (книга рун — save.books.runes)
  function isAlfheimOpen(save) {
    return !!(save && RPG.isGateOpen?.(save) && save.books?.runes);
  }

  // Ванагейм (світ 4): відкритий Альвгейм + перша перемога над Белі (save.bossKills — page-game.js → нагорода)
  function isVanaheimOpen(save) {
    return !!(isAlfheimOpen(save) && save.bossKills?.alf_boss_beli);
  }

  // Свартальвгейм (світ 5): відкритий Ванагейм + перша перемога над Ран
  function isSvartalfheimOpen(save) {
    return !!(isVanaheimOpen(save) && save.bossKills?.van_boss_ran_mistress_of_the_drowned);
  }

  // Йотунгейм (світ 6): відкритий Свартальвгейм + перша перемога над Мьоккуркальві
  function isJotunheimOpen(save) {
    return !!(isSvartalfheimOpen(save) && save.bossKills?.svart_boss_mokkurkalfi);
  }

  // Муспельгейм (світ 7): відкритий Йотунгейм + перша перемога над Йормунгандом (Нагльфар на Березі Світового Змія)
  function isMuspelheimOpen(save) {
    return !!(isJotunheimOpen(save) && save.bossKills?.jot_boss_jormungandr);
  }

  // Хелла в Глідскьяльві (фінал світу 8): перша перемога — вона тікає в портал (page-game.js → підсумок бою), шлях у світ 9 — data/worlds.js
  const HEL_ESCAPE_BOSS = "asg_boss_hel_on_odins_throne";
  const HEL_ESCAPE_TEXT = "Хелла хитається, падає з престолу Одіна — і, поранена, кидається в зелено-чорний портал. Він закривається за нею. Хелла втекла в Ніфльгейм, і шлях туди тепер відкритий.";

  // Ніфльгейм і Хельгейм (світ 9): відкритий Асгард + перша перемога над Хеллою в Глідскьяльві (портал Хелли)
  function isNiflheimOpen(save) {
    return !!(isAsgardOpen(save) && save.bossKills?.[HEL_ESCAPE_BOSS]);
  }
  // Кінець гри: перша перемога над Хеллою на її троні (page-game.js → save.story.gameWon, game-common.js → showEnding)
  const GAME_END_BOSS = "nifl_boss_hel_final_form";
  const ENDING = {
    title: "Перемога",
    epilogue: [
      "Хелла падає з трону — і цього разу не тікає. Зелене полум'я в чертогах Ельвюдніра гасне одне за одним, а туман над Хельгеймом вперше за віки розходиться.",
      "Корені Іггдрасиля перестають гнити. Золотий сік загоює рани Дерева, і по всіх дев'яти світах проходить тихий подих — ніби Дерево видихнуло.",
      "Мертві повертаються на свої місця, армія Хелли розсипається на прах, а в Асгарді над Глідскьяльвом знову світить сонце.",
      "Рагнарок не настав. Кров Іггдрасиля знову тече чисто — і скальди ще довго співатимуть про героїв, що пройшли дев'ять світів і повернулися."
    ],
    thanks: "Дякуємо, що пройшли гру!",
    stay: "Збереження лишається — можна повернутися й далі ходити дев'ятьма світами.",
    menu: "Головне меню",
    creditsTitle: "Титри",
    credits: [   // як на сторінці «Про автора» (pages/about.html)
      ["Розробник", "DerekUa"],
      ["Редактор, локалізатор", "Deztraf"],
      ["Тестувальники", "Deztraf, Kvantoom, Danaec"],
      ["Інструменти створення", "Claude, ChatGPT"]
    ]
  };

  // Асгард (світ 8): відкритий Муспельгейм + перша перемога над Суртом (Біфрест із Трону Сурта)
  function isAsgardOpen(save) {
    return !!(isMuspelheimOpen(save) && save.bossKills?.musp_boss_surtr);
  }

  function canEnterLocation(id, heroLevel = 1, save = null) {
    const loc = LOCATIONS[id];
    if (!loc) return { ok: false, reason: "Такої локації немає." };
    if (loc.locked) return { ok: false, reason: "Закрито — відкриється згодом." };
    if (loc.region === "dark" && save && !RPG.isGateOpen(save)) {
      return { ok: false, reason: "Центральна брама зачинена — спершу поговоріть з капітаном варти (Дубова Застава, Північний район)." };
    }
    if (loc.region === "alf" && save && !isAlfheimOpen(save)) {
      return { ok: false, reason: "Шлях в Альвгейм відкриється після першої перемоги над Володарем Темного лісу (корінь Іггдрасиля в Серці Темного лісу)." };
    }
    if (loc.region === "van" && save && !isVanaheimOpen(save)) {
      return { ok: false, reason: "Шлях у Ванагейм відкриється після першої перемоги над Белі (гілка Іггдрасиля на Полі Белі, Альвгейм)." };
    }
    if ((loc.region === "svart" || loc.region === "svartgard") && save && !isSvartalfheimOpen(save)) {
      return { ok: false, reason: "Шлях у Свартальвгейм відкриється після першої перемоги над Ран (Затоплена штольня в Бухті Ран, Ванагейм)." };
    }
    if (loc.region === "jot" && save && !isJotunheimOpen(save)) {
      return { ok: false, reason: "Шлях у Йотунгейм відкриється після першої перемоги над Мьоккуркальві (Витяжна шахта в Кузні Мьоккуркальві, Свартальвгейм)." };
    }
    if (loc.region === "musp" && save && !isMuspelheimOpen(save)) {
      return { ok: false, reason: "Шлях у Муспельгейм відкриється після першої перемоги над Йормунгандом (Нагльфар біля Берега Світового Змія, Йотунгейм)." };
    }
    if (loc.region === "nifl" && save && !isNiflheimOpen(save)) {
      return { ok: false, reason: "Портал Хелли в Ніфльгейм відкриється після першої перемоги над нею в Глідскьяльві (Асгард)." };
    }
    if (loc.region === "asg" && save && !isAsgardOpen(save)) {
      return { ok: false, reason: "Біфрест в Асгард відкриється після першої перемоги над Суртом (Трон Сурта, Муспельгейм)." };
    }
    if (loc.minLevel && heroLevel < loc.minLevel) {
      return { ok: false, reason: `${loc.name}: вхід з ${loc.minLevel} рівня персонажа.` };
    }
    return { ok: true };
  }

  // Випадковий ворог для локації.
  // Вороги близького до героя рівня трапляються частіше, а набагато
  // сильніші — рідко (але трапляються, тож обережно!).
  function enemyWeight(enemyLevel, heroLevel) {
    const diff = enemyLevel - heroLevel;
    if (diff >= 3) return 0.08;
    if (diff === 2) return 0.3;
    if (diff <= -3) return 0.3;
    return 1;
  }

  // У локації з данжем боса немає серед звичайних боїв — він чекає в данжі
  // opts.noBoss — без босів (замінник другого боса в одному бою)
  function pickEnemy(locationId, heroLevel = 1, opts = {}) {
    const loc = getLocation(locationId);
    const list = (loc.enemies || []).filter(id => !((loc.dungeon || opts.noBoss) && ENEMIES[id]?.boss));
    if (!list.length) return null;
    const weights = list.map(id => enemyWeight(ENEMIES[id].level, heroLevel) * (ENEMIES[id].spawnWeight ?? 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  // Випадкова здобич після перемоги: { gold, items: [{id, qty}] }
  // chanceAdd — скільки додати до шансу випадіння кожного предмета (частка: 0.1 = +10 пунктів; Сфера Богів),
  // не більше 100%. На рідкість речі не впливає — її визначає rarity.js окремо.
  // Регіони, де трапляється ворог (локації + данжі) — для правила «лише ремесло» з 4-го світу (worlds.js).
  let enemyRegionsCache = null;
  function enemyRegions(enemyId) {
    if (!enemyRegionsCache) {
      enemyRegionsCache = {};
      const add = (id, region) => { if (id && region) (enemyRegionsCache[id] ??= new Set()).add(region); };
      for (const L of Object.values(LOCATIONS)) for (const id of L.enemies || []) add(id, L.region);
      for (const D of Object.values(DUNGEONS)) {
        const region = LOCATIONS[D.location]?.region;
        add(D.boss, region);
        for (const id of D.pool || []) add(id, region);
      }
    }
    return enemyRegionsCache[enemyId] || new Set();
  }
  // Ворог зі світу «лише ремесла»: усі його регіони — зі світів від RPG.CRAFT_ONLY_FROM (з 4-го).
  function isCraftOnlyEnemy(enemyId) {
    const regs = [...enemyRegions(enemyId)];
    return !!RPG.isCraftOnlyRegion && regs.length > 0 && regs.every(r => RPG.isCraftOnlyRegion(r));
  }
  const GEAR_TYPES = new Set(["weapon", "armor", "accessory", "shield", "offhand"]);

  function rollLoot(enemyId, chanceAdd = 0) {
    const enemy = ENEMIES[enemyId];
    if (!enemy) return { gold: 0, items: [] };
    const items = [];
    const craftOnly = isCraftOnlyEnemy(enemyId);      // з 4-го світу спорядження не падає — лише кування
    for (const drop of enemy.loot) {
      if (craftOnly && GEAR_TYPES.has(RPG.ITEMS[drop.id]?.type)) continue;
      if (Math.random() < Math.min(1, drop.chance + chanceAdd)) {
        items.push({ id: drop.id, qty: RPG.randInt(drop.qty[0], drop.qty[1]) });
      }
    }
    // Артефакт професії — з ворогів від 31 рівня, з малим шансом (data/artifacts.js)
    const art = RPG.rollArtifactDrop ? RPG.rollArtifactDrop(enemyId) : null;
    if (art) items.push({ id: art, qty: 1 });
    return { gold: RPG.randInt(enemy.gold[0], enemy.gold[1]), items };
  }

  Object.assign(RPG, { ENEMY_SPEED, enemySpeed, enemyWorld,
    MONSTER_MOVES, RANGE_NAMES, enemyRange, enemyMove,
    ENEMIES, LOCATIONS, DUNGEONS, DEFAULT_LOCATION, RESPAWN_LOCATION, GUILD_SHOP, isAlfheimOpen, isVanaheimOpen, isSvartalfheimOpen, isJotunheimOpen, isMuspelheimOpen, isAsgardOpen, isNiflheimOpen, HEL_ESCAPE_BOSS, HEL_ESCAPE_TEXT, GAME_END_BOSS, ENDING, DARK_LOC_MAT,
    CHAMPION, rollChampion, rollChampionDrop, championBounty,
    getEnemy, enemyExp, enemySpriteStyle, getLocation, isCombatLocation, canEnterLocation, pickEnemy, rollLoot, isCraftOnlyEnemy, enemyRegions
  });
})(window.RPG);

// ============================================================
// ДОВІДНИК ВОРОГІВ ТА ЛОКАЦІЙ
// stats: hp, mp, attack, magic, defense, magicDefense, speed,
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
      stats: { hp: 30, mp: 0, attack: 7, defense: 1, magicDefense: 0, speed: 4, crit: 3, dodge: 3 },
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
      stats: { hp: 45, mp: 0, attack: 10, defense: 2, magicDefense: 1, speed: 5, crit: 4, dodge: 4 },
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
      stats: { hp: 65, mp: 0, attack: 14, defense: 3, magicDefense: 1, speed: 6, crit: 5, dodge: 4 },
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
      stats: { hp: 110, mp: 0, attack: 20, defense: 5, magicDefense: 2, speed: 8, crit: 6, dodge: 5, blockPhys: 3 },
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
      stats: { hp: 150, mp: 0, attack: 26, defense: 7, magicDefense: 3, speed: 9, crit: 8, dodge: 6, blockPhys: 4 },
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
      stats: { hp: 200, mp: 0, attack: 32, defense: 9, magicDefense: 4, speed: 10, crit: 10, dodge: 7, blockPhys: 5 },
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
      stats: { hp: 170, mp: 40, attack: 22, magic: 26, defense: 7, magicDefense: 10, speed: 7, crit: 4, blockMag: 4 },
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
      stats: { hp: 220, mp: 60, attack: 25, magic: 33, defense: 8, magicDefense: 14, speed: 8, crit: 5, blockMag: 7 },
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
      stats: { hp: 270, mp: 80, attack: 29, magic: 40, defense: 9, magicDefense: 16, speed: 9, crit: 7, blockMag: 9 },
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
      stats: { hp: 1020, mp: 300, attack: 35, magic: 42, defense: 14, magicDefense: 20, speed: 9, crit: 9, blockPhys: 6, blockMag: 12 },
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
      stats: { hp: 823, mp: 0, attack: 113, defense: 42, magicDefense: 50, speed: 20, crit: 14, dodge: 9 },
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
      stats: { hp: 1398, mp: 0, attack: 96, defense: 78, magicDefense: 62, speed: 12, crit: 8, blockPhys: 10 },
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
      stats: { hp: 1029, mp: 0, attack: 112, defense: 54, magicDefense: 54, speed: 16, crit: 9, dodge: 11 },
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
      stats: { hp: 874, mp: 0, attack: 123, defense: 46, magicDefense: 54, speed: 21, crit: 15 },
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
      stats: { hp: 1481, mp: 0, attack: 105, defense: 84, magicDefense: 67, speed: 14, crit: 10, blockPhys: 11 },
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
      stats: { hp: 923, mp: 168, attack: 73, magic: 106, defense: 46, magicDefense: 87, speed: 17, crit: 10, dodge: 12, blockMag: 11 },
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
      stats: { hp: 1086, mp: 0, attack: 122, defense: 58, magicDefense: 58, speed: 17, crit: 10, dodge: 12 },
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
      stats: { hp: 947, mp: 180, attack: 76, magic: 111, defense: 48, magicDefense: 90, speed: 19, crit: 11, dodge: 13, blockMag: 12 },
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
      stats: { hp: 970, mp: 0, attack: 146, defense: 53, magicDefense: 62, speed: 26, crit: 18 },
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
      stats: { hp: 970, mp: 0, attack: 146, defense: 53, magicDefense: 62, speed: 26, crit: 18, dodge: 14 },
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
      stats: { hp: 1167, mp: 0, attack: 137, defense: 64, magicDefense: 64, speed: 19, crit: 11, dodge: 14 },
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
      stats: { hp: 3101, mp: 450, attack: 136, magic: 120, defense: 73, magicDefense: 73, speed: 21, crit: 13, dodge: 15, blockPhys: 13, blockMag: 13 },
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
      stats: { hp: 1014, mp: 0, attack: 157, defense: 56, magicDefense: 66, speed: 28, crit: 20, dodge: 15 },
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
      stats: { hp: 1705, mp: 0, attack: 133, defense: 102, magicDefense: 82, speed: 17, crit: 13, dodge: 16, blockPhys: 13 },
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
      stats: { hp: 1079, mp: 240, attack: 99, magic: 140, defense: 56, magicDefense: 105, speed: 22, crit: 14, dodge: 16, blockMag: 13 },
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
      stats: { hp: 1079, mp: 240, attack: 99, magic: 140, defense: 56, magicDefense: 105, speed: 22, crit: 14, blockMag: 13 },
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
      stats: { hp: 1122, mp: 252, attack: 109, magic: 150, defense: 58, magicDefense: 108, speed: 22, crit: 14, blockMag: 14 },
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
      stats: { hp: 1917, mp: 0, attack: 180, defense: 111, magicDefense: 89, speed: 19, crit: 14, blockPhys: 14 },
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
      stats: { hp: 1947, mp: 0, attack: 185, defense: 114, magicDefense: 91, speed: 20, crit: 16, blockPhys: 14 },
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
      stats: { hp: 1201, mp: 0, attack: 234, defense: 66, magicDefense: 78, speed: 35, crit: 24, dodge: 19 },
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
      stats: { hp: 3727, mp: 625, attack: 208, magic: 169, defense: 88, magicDefense: 88, speed: 26, crit: 17, blockPhys: 15, blockMag: 15 },
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
      stats: { hp: 1313, mp: 295, attack: 128, magic: 175, defense: 68, magicDefense: 126, speed: 24, crit: 15, blockMag: 15, dodge: 18 },
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
      stats: { hp: 1062, mp: 0, attack: 243, defense: 69, magicDefense: 81, speed: 36, crit: 24, dodge: 22 },
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
      stats: { hp: 1299, mp: 0, attack: 253, defense: 71, magicDefense: 84, speed: 36, crit: 25, dodge: 20 },
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
      stats: { hp: 4608, mp: 669, attack: 202, magic: 178, defense: 108, magicDefense: 108, speed: 31, crit: 16, dodge: 18, blockPhys: 16, blockMag: 16 },
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
      stats: { hp: 1365, mp: 307, attack: 133, magic: 182, defense: 71, magicDefense: 131, speed: 24, crit: 16, blockMag: 16 },
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
      stats: { hp: 1299, mp: 0, attack: 253, defense: 71, magicDefense: 84, speed: 36, crit: 25, dodge: 20 },
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
      stats: { hp: 2332, mp: 0, attack: 219, defense: 135, magicDefense: 108, speed: 22, crit: 16, blockPhys: 16 },
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
      stats: { hp: 4816, mp: 699, attack: 211, magic: 232, defense: 113, magicDefense: 113, speed: 31, crit: 16, dodge: 18, blockPhys: 16, blockMag: 16 },
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
        { id: "lapis", chance: 0.25, qty: [1, 3] }
      ]
    },
    alf_thornbush: {
      name: "Ожилий терен",
      range: 2, move: { name: "Колючі батоги", mult: 1.5, chance: 0.25 },
      verb: "шмагає",
      level: 27,
      stats: { hp: 2332, mp: 0, attack: 219, defense: 135, magicDefense: 108, speed: 22, crit: 16, blockPhys: 16 },
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
      stats: { hp: 1420, mp: 319, attack: 138, magic: 190, defense: 73, magicDefense: 137, speed: 25, crit: 16, blockMag: 16 },
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
      stats: { hp: 1405, mp: 0, attack: 274, defense: 77, magicDefense: 91, speed: 37, crit: 25, dodge: 20 },
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
      stats: { hp: 5787, mp: 730, attack: 221, magic: 156, defense: 142, magicDefense: 118, speed: 31, crit: 16, dodge: 18, blockPhys: 16, blockMag: 16 },
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
        { id: "onyx", chance: 0.25, qty: [1, 3] }
      ]
    },
    alf_elf_mage: {
      name: "Альв-маг",
      humanoid: true,
      weapons: ["staff"],
      range: 3, move: { name: "Удар посохом", mult: 1.5, chance: 0.25 },
      verb: "б'є посохом",
      level: 27,
      stats: { hp: 1420, mp: 319, attack: 138, magic: 190, defense: 73, magicDefense: 137, speed: 25, crit: 16, blockMag: 16 },
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
      stats: { hp: 2426, mp: 0, attack: 228, defense: 140, magicDefense: 136, speed: 22, crit: 16, blockPhys: 16 },
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
    alf_herald_owl: {
      name: "Сова-вісник",
      range: 2, move: { name: "Рунний дзьоб", mult: 1.5, chance: 0.25 },
      verb: "дзьобає",
      level: 27,
      stats: { hp: 1216, mp: 0, attack: 263, defense: 74, magicDefense: 88, speed: 36, crit: 25, dodge: 21 },
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
      stats: { hp: 4529, mp: 730, attack: 221, magic: 254, defense: 118, magicDefense: 118, speed: 31, crit: 16, dodge: 18, blockPhys: 16, blockMag: 16 },
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
        { id: "gold_ore", chance: 0.25, qty: [1, 3] }
      ]
    },
    alf_wild_boar: {
      name: "Дикий вепр",
      range: 1, move: { name: "Удар іклами", mult: 1.6, chance: 0.25 },
      verb: "б'є іклами",
      level: 28,
      stats: { hp: 2426, mp: 0, attack: 228, defense: 140, magicDefense: 113, speed: 22, crit: 16, blockPhys: 16 },
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
      stats: { hp: 2524, mp: 0, attack: 197, defense: 151, magicDefense: 121, speed: 22, crit: 16, dodge: 19, blockPhys: 16 },
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
        { id: "iron_ore", chance: 0.02, qty: [1, 1] }
      ]
    },
    alf_huntsman: {
      name: "Ловчий",
      humanoid: true,
      weapons: ["bow", "sword"],
      range: 1, move: { name: "Мисливський постріл", mult: 1.5, chance: 0.25 },
      verb: "б'є",
      level: 28,
      stats: { hp: 1405, mp: 0, attack: 274, defense: 77, magicDefense: 91, speed: 37, crit: 25, dodge: 20 },
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
    alf_boss_gullinbursti: {
      name: "Тінь Гуллінбурсті",
      range: 1, move: { name: "Золоті ікла", mult: 1.75, chance: 0.25 },
      verb: "б'є іклами",
      level: 30,
      boss: true, noChampion: true, spawnWeight: 0.1,
      stats: { hp: 5259, mp: 763, attack: 266, magic: 173, defense: 124, magicDefense: 124, speed: 32, crit: 17, dodge: 19, blockPhys: 17, blockMag: 17 },
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
        { id: "leather_strap", chance: 0.25, qty: [1, 3] }
      ]
    },
    alf_dead_giant: {
      name: "Мертвий йотун-поплічник",
      undead: true,
      range: 1, move: { name: "Кам'яна палиця", mult: 1.6, chance: 0.25 },
      verb: "б'є палицею",
      level: 30,
      stats: { hp: 3018, mp: 0, attack: 246, defense: 152, magicDefense: 122, speed: 23, crit: 16, blockPhys: 16 },
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
        { id: "flint", chance: 0.02, qty: [1, 1] }
      ]
    },
    alf_stag_spirit: {
      name: "Дух оленя",
      undead: true,
      range: 2, move: { name: "Удар рогами", mult: 1.5, chance: 0.25 },
      verb: "б'є рогами",
      level: 29,
      stats: { hp: 1536, mp: 345, attack: 149, magic: 205, defense: 79, magicDefense: 148, speed: 26, crit: 16, blockMag: 16 },
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
        { id: "earring_t4", chance: 0.0012, qty: [1, 1] }
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
      stats: { hp: 1461, mp: 0, attack: 285, defense: 80, magicDefense: 95, speed: 38, crit: 26, dodge: 20 },
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
        { id: "iron_ore", chance: 0.02, qty: [1, 1] }
      ]
    },
    alf_boss_beli: {
      name: "Белі",
      range: 1, move: { name: "Бронзова сокира", mult: 1.8, chance: 0.25 },
      verb: "рубає сокирою",
      level: 30,
      boss: true, noChampion: true, spawnWeight: 0.1,
      stats: { hp: 7100, mp: 763, attack: 277, magic: 204, defense: 149, magicDefense: 143, speed: 32, crit: 17, dodge: 19, blockPhys: 17, blockMag: 17 },
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
        { id: "gem", chance: 0.25, qty: [1, 3] }
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
      type: "citygate",
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
      edge: "rocks"
    }
  };
  const DEFAULT_LOCATION = "home";

  // ---------- ДАНЖІ (логіка — dungeon.js) ----------
  // Локація з полем dungeon має два режими:
  //   explore — «Обстеження»: звичайні бої без боса; з кожного переможеного ворога з pool
  //             з шансом keyChance випадає ключ key;
  //   dungeon — данж: вхід лише з ключем (1 спроба = 1 ключ), 3 бої поспіль без зілля:
  //             1) випадковий ворог з pool, 2) три вороги — усі види з pool (решта — випадкові),
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
    "ancient_treant", "black_rider", "bog_leech", "cultist", "drowner", "forest_lord",
    "forest_spider", "ghost", "ghoul", "pack_leader", "rot_boar", "shadow_beast",
    "shadow_wolf", "skeleton_archer", "spider_queen", "stone_golem", "web_hunter", "web_weaver",
    "werewolf", "will_wisp", "witch",
    // Альвгейм (світ 3)
    "alf_wisp", "alf_moth", "alf_feral_archer", "alf_boss_moths", "alf_nixie", "alf_reflection",
    "alf_crystal_toad", "alf_boss_necken", "alf_thornbush", "alf_poison_bloom", "alf_gardener", "alf_boss_gardener",
    "alf_elf_mage", "alf_light_sentinel", "alf_herald_owl", "alf_boss_high_mage", "alf_wild_boar", "alf_elf_knight",
    "alf_huntsman", "alf_boss_gullinbursti", "alf_dead_giant", "alf_stag_spirit", "alf_rot_warrior", "alf_boss_beli"
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
      const url = ENEMY_FILES.has(id) ? RPG.asset(`assets/images/enemies/${id}.webp`) : ENEMY_PLACEHOLDER;
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
  function rollLoot(enemyId, chanceAdd = 0) {
    const enemy = ENEMIES[enemyId];
    if (!enemy) return { gold: 0, items: [] };
    const items = [];
    for (const drop of enemy.loot) {
      if (Math.random() < Math.min(1, drop.chance + chanceAdd)) {
        items.push({ id: drop.id, qty: RPG.randInt(drop.qty[0], drop.qty[1]) });
      }
    }
    return { gold: RPG.randInt(enemy.gold[0], enemy.gold[1]), items };
  }

  Object.assign(RPG, {
    MONSTER_MOVES, RANGE_NAMES, enemyRange, enemyMove,
    ENEMIES, LOCATIONS, DUNGEONS, DEFAULT_LOCATION, RESPAWN_LOCATION, GUILD_SHOP, isAlfheimOpen,
    CHAMPION, rollChampion, rollChampionDrop, championBounty,
    getEnemy, enemyExp, enemySpriteStyle, getLocation, isCombatLocation, canEnterLocation, pickEnemy, rollLoot
  });
})(window.RPG);

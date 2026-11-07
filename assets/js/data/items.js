// ============================================================
// ДОВІДНИК ПРЕДМЕТІВ
// Тут лише опис речей. У сейві зберігається тільки ID (ключ).
// ID (ключ об'єкта) НІКОЛИ не перейменовуй — інакше старі сейви
// не знайдуть предмет. Назву, картинку, характеристики міняй вільно.
//
// stats   — бонуси, коли річ вдягнена. Можна вказувати і бойові
//           характеристики (attack, defense...), і атрибути (str, agi...).
// price   — базова вартість. Торговець продає за 150%, купує за 50%.
// noShop  — торговець цю річ НЕ продає (лише здобич з ворогів).
// rarity  — "rare" підсвічується в інвентарі.
// maxStack — скільки штук в одній клітинці: ресурси (матеріали) — MATERIAL_STACK = 10 000, зілля — POTION_STACK = 5 000.
//           Ті самі ліміти і в інвентарі, і в усіх скринях (character.js → CHEST_DEFAULTS, CRAFT_CHESTS).
// tier    — вид/клас речі: 1 — дерев'яна/лляна/мідна (з 1 рівня, біжутерія з 2),
//           2 — кам'яна/шкіряна/срібна (з 10 рівня), 3 — залізна/золота (з 20 рівня),
//           4 — сталева/платинова (з 30), 5 — двергська/самоцвітна (з 40), 6 — асгардська/сонячна (з 50),
//           7 — Іггдрасилева/зоряна (з 60).
// weaponType — тип основної зброї: sword, dagger, axe, bow, staff (див. data/skills.js).
//           Зброя 2 виду потребує володіння 10, 3–7 виду — володіння 20 (максимум).
// offType — річ для лівої руки: shield, quiver, orb, knife.
//           Що з чим можна тримати — див. OFFHAND_RULES нижче.
// icon    — іконка зі спрайт-листа: ["назва листа", номер клітинки].
//           Номер рахується зліва направо, згори вниз, починаючи з 0.
//           Немає icon — показується заглушка з назвою та кольором рідкості.
//           Рідкість (зламана…легендарна) малюється рамкою/світінням у CSS,
//           окремих картинок для рідкості не потрібно.
// effect  — для зілля: healHp / healMp (одиниці),
//           healHpPct / healMpPct (частка від максимуму: 0.5 = 50%).
// ============================================================

(function (RPG) {
const MATERIAL_STACK = 10000;   // ресурсів в одній клітинці (інвентар і скрині)
const POTION_STACK = 5000;     // зілля в одній клітинці (інвентар і скрині)
// Папка зі спрайт-листами предметів (шлях рахує core.js від кореня гри)
const IMG_BASE = RPG.asset("assets/img/items/");

// ---------- СПРАЙТ-ЛИСТИ ПРЕДМЕТІВ ----------
// Кожна клітинка 128×128 px, між клітинками 2 px. cols/rows — сітка листа.
// Новий предмет: домалюй іконку в потрібний лист і вкажи її номер у полі icon.
const ICON_SIZE = 128;
const ICON_GAP = 2;
const ICON_EXT = ".webp";
const ICON_SHEETS = {
  weapon_mainHand: { cols: 6, rows: 3 },   // мечі, кинджали / сокири, луки / посохи
  weapon_offHand:  { cols: 4, rows: 3 },   // щити, колчани, сфери, малі кинджали
  armor:           { cols: 5, rows: 3 },   // рядки: льон, шкіра, залізо; стовпці: голова…взуття
  accessory:       { cols: 3, rows: 4 },   // рядки: кільця, амулети, сережки, комплект слизу; стовпці: мідь, срібло, золото
  material:        { cols: 3, rows: 2 },
  consumable:      { cols: 4, rows: 2 }
};

// CSS для показу однієї клітинки спрайт-листа в КВАДРАТНОМУ елементі будь-якого розміру
// (відсотки, тож працює і в слоті інвентаря, і в маленькій іконці).
function spriteStyle(url, cols, rows, size, gap, index) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const w = cols * size + (cols - 1) * gap;
  const h = rows * size + (rows - 1) * gap;
  const px = w > size ? (col * (size + gap)) / (w - size) * 100 : 0;
  const py = h > size ? (row * (size + gap)) / (h - size) * 100 : 0;
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: `${(w / size) * 100}% ${(h / size) * 100}%`,
    backgroundPosition: `${px}% ${py}%`,
    backgroundRepeat: "no-repeat"
  };
}

// Слоти екіпірування
// Слоти екіпірування (12) — у такому порядку показуються в грі
const SLOTS = {
  mainHand: "Права рука (зброя)",
  offHand: "Ліва рука",
  head: "Голова",
  chest: "Тіло",
  legs: "Штани",
  hands: "Наручі",
  feet: "Взуття",
  earring1: "Сережка 1",
  ring1: "Кільце 1",
  amulet: "Амулет",
  ring2: "Кільце 2",
  earring2: "Сережка 2"
};
// Кільця й сережки можна носити по дві: slot предмета → слоти персонажа
const SLOT_GROUPS = {
  ring: ["ring1", "ring2"],
  earring: ["earring1", "earring2"]
};
function slotsFor(itemSlot) {
  return SLOT_GROUPS[itemSlot] || (itemSlot ? [itemSlot] : []);
}

// Назви характеристик для відображення в інтерфейсі
const STAT_NAMES = {
  hp: "Здоров'я",
  mp: "Мана",
  attack: "Атака",
  magic: "Сила магії",
  defense: "Захист",
  magicDefense: "Магічний захист",
  speed: "Швидкість",
  crit: "Шанс криту, %",
  critDmg: "Сила криту, %",
  blockPhys: "Блок фіз. шкоди, %",
  blockMag: "Блок маг. шкоди, %",
  attackSpeedPct: "Швидкість атаки (володіння), %",
  skillPct: "Сила навичок, %",
  dodge: "Ухилення, %",
  hpRegen: "Відновлення HP за 10 с",
  mpRegen: "Відновлення MP за 10 с",
  str: "Сила",
  agi: "Спритність",
  int: "Інтелект",
  vit: "Витривалість",
  spi: "Дух"
};

// ---------- ПРАВА + ЛІВА РУКА ----------
// Що можна тримати в лівій руці залежно від зброї в правій.
// Ключ — weaponType зброї в правій руці (none — права рука вільна).
// Ліва рука завжди може бути вільною.
const OFFHAND_RULES = {
  sword:  ["shield", "knife"],
  axe:    ["shield", "knife"],
  dagger: ["orb", "knife"],
  bow:    ["quiver"],
  staff:  ["orb", "knife"],
  none:   ["shield", "quiver", "orb", "knife"]
};
const OFF_TYPE_NAMES = { shield: "щит", quiver: "колчан", orb: "сферу", knife: "малий кинджал", axe: "другу сокиру" };
const MAIN_WITH_NAMES = {
  sword: "З мечем", axe: "Із сокирою", dagger: "З кинджалом",
  bow: "З луком", staff: "З посохом", none: "З вільною правою рукою"
};

// Чи можна тримати річ типу offType у лівій руці, коли в правій mainType
function offHandAllowed(mainType, offType) {
  const allowed = OFFHAND_RULES[mainType || "none"];
  return !allowed || allowed.includes(offType);   // невідомий тип зброї — без обмежень
}

// Пояснення для гравця, напр. "З луком у лівій руці можна тримати лише колчан."
function offHandRuleText(mainType) {
  const key = mainType || "none";
  const names = (OFFHAND_RULES[key] || []).map(t => OFF_TYPE_NAMES[t] || t);
  const list = names.length > 1 ? names.slice(0, -1).join(", ") + " або " + names[names.length - 1] : names[0];
  return `${MAIN_WITH_NAMES[key] || "З цією зброєю"} у лівій руці можна тримати лише ${list}.`;
}

// Необов'язкове поле classes: ["knight"] — предмет лише для цих професій.
// Без нього предмет підходить усім.

const ITEMS = {
  // ---------- ОСНОВНА ЗБРОЯ (права рука) ----------
  sword_t1: {
    name: "Дерев'яний меч", icon: ["weapon_mainHand", 0],
    type: "weapon", slot: "mainHand", tier: 1, levelReq: 1, price: 12, weaponType: "sword",
    stats: { attack: 5, crit: 1 },
    description: "Тренувальний меч зі звичайного дерева."
  },
  sword_t2: {
    name: "Кам'яний меч", icon: ["weapon_mainHand", 1],
    type: "weapon", slot: "mainHand", tier: 2, levelReq: 10, price: 180, weaponType: "sword",
    stats: { attack: 20, crit: 2 },
    description: "Важкий меч із тесаного каменю."
  },
  sword_t3: {
    name: "Залізний меч", icon: ["weapon_mainHand", 2],
    type: "weapon", slot: "mainHand", tier: 3, levelReq: 20, price: 900, weaponType: "sword", noShop: true,
    stats: { attack: 40, crit: 3 },
    description: "Надійний залізний клинок."
  },
  dagger_t1: {
    name: "Дерев'яний кинджал", icon: ["weapon_mainHand", 3],
    type: "weapon", slot: "mainHand", tier: 1, levelReq: 1, price: 12, weaponType: "dagger",
    stats: { attack: 4, crit: 3, speed: 1 },
    description: "Легкий дерев'яний кинджал."
  },
  dagger_t2: {
    name: "Кам'яний кинджал", icon: ["weapon_mainHand", 4],
    type: "weapon", slot: "mainHand", tier: 2, levelReq: 10, price: 170, weaponType: "dagger",
    stats: { attack: 15, crit: 5, speed: 2 },
    description: "Гострий кремінний кинджал."
  },
  dagger_t3: {
    name: "Залізний кинджал", icon: ["weapon_mainHand", 5],
    type: "weapon", slot: "mainHand", tier: 3, levelReq: 20, price: 850, weaponType: "dagger", noShop: true,
    stats: { attack: 30, crit: 8, speed: 3 },
    description: "Залізний кинджал — швидкий і підступний."
  },
  axe_t1: {
    name: "Дерев'яна сокира", icon: ["weapon_mainHand", 6],
    type: "weapon", slot: "mainHand", tier: 1, levelReq: 1, price: 14, weaponType: "axe",
    stats: { attack: 7, str: 1, speed: -1 },
    description: "Груба дерев'яна сокира — б'є сильно, але повільно."
  },
  axe_t2: {
    name: "Кам'яна сокира", icon: ["weapon_mainHand", 7],
    type: "weapon", slot: "mainHand", tier: 2, levelReq: 10, price: 190, weaponType: "axe",
    stats: { attack: 26, str: 2, speed: -1 },
    description: "Кам'яна сокира з важким обухом."
  },
  axe_t3: {
    name: "Залізна сокира", icon: ["weapon_mainHand", 8],
    type: "weapon", slot: "mainHand", tier: 3, levelReq: 20, price: 950, weaponType: "axe", noShop: true,
    stats: { attack: 50, str: 3, speed: -2 },
    description: "Залізна сокира лісоруба-воїна."
  },
  bow_t1: {
    name: "Дерев'яний лук", icon: ["weapon_mainHand", 9],
    type: "weapon", slot: "mainHand", tier: 1, levelReq: 1, price: 14, weaponType: "bow",
    stats: { attack: 5, crit: 2, speed: 1 },
    description: "Простий дерев'яний лук."
  },
  bow_t2: {
    name: "Кам'яний лук", icon: ["weapon_mainHand", 10],
    type: "weapon", slot: "mainHand", tier: 2, levelReq: 10, price: 190, weaponType: "bow",
    stats: { attack: 19, crit: 3, speed: 2 },
    description: "Лук із кам'яними вістрями стріл."
  },
  bow_t3: {
    name: "Залізний лук", icon: ["weapon_mainHand", 11],
    type: "weapon", slot: "mainHand", tier: 3, levelReq: 20, price: 950, weaponType: "bow", noShop: true,
    stats: { attack: 38, crit: 4, speed: 3 },
    description: "Лук, окутий залізом."
  },
  staff_t1: {
    name: "Дерев'яний посох", icon: ["weapon_mainHand", 12],
    type: "weapon", slot: "mainHand", tier: 1, levelReq: 1, price: 14, weaponType: "staff",
    stats: { attack: 1, magic: 6, mp: 10, int: 1 },
    description: "Дерев'яний посох учня. Чари — лише ті, що стоять у черзі дій; інакше б'є як палиця."
  },
  staff_t2: {
    name: "Кам'яний посох", icon: ["weapon_mainHand", 13],
    type: "weapon", slot: "mainHand", tier: 2, levelReq: 10, price: 190, weaponType: "staff",
    stats: { attack: 3, magic: 22, mp: 30, int: 2 },
    description: "Кам'яний посох з рунами."
  },
  staff_t3: {
    name: "Залізний посох", icon: ["weapon_mainHand", 14],
    type: "weapon", slot: "mainHand", tier: 3, levelReq: 20, price: 950, weaponType: "staff", noShop: true,
    stats: { attack: 6, magic: 44, mp: 60, int: 3 },
    description: "Залізний посох бойового мага."
  },

  // ---------- ДРУГА РУКА ----------
  shield_t1: {
    name: "Дерев'яний щит", icon: ["weapon_offHand", 0],
    type: "shield", slot: "offHand", tier: 1, levelReq: 1, price: 12, offType: "shield",
    stats: { defense: 3, blockPhys: 8 },
    description: "Легкий щит із дощок."
  },
  shield_t2: {
    name: "Шкіряний щит", icon: ["weapon_offHand", 1],
    type: "shield", slot: "offHand", tier: 2, levelReq: 10, price: 160, offType: "shield",
    stats: { defense: 12, blockPhys: 12 },
    description: "Щит, обтягнутий товстою шкірою."
  },
  shield_t3: {
    name: "Залізний щит", icon: ["weapon_offHand", 2],
    type: "shield", slot: "offHand", tier: 3, levelReq: 20, price: 800, offType: "shield", noShop: true,
    stats: { defense: 24, blockPhys: 16 },
    description: "Важкий залізний щит."
  },
  quiver_t1: {
    name: "Полотняний колчан", icon: ["weapon_offHand", 3],
    type: "offhand", slot: "offHand", tier: 1, levelReq: 1, price: 10, offType: "quiver",
    stats: { attack: 2, speed: 1 },
    description: "Колчан для стріл. Тримають з луком або з вільною правою рукою."
  },
  quiver_t2: {
    name: "Шкіряний колчан", icon: ["weapon_offHand", 4],
    type: "offhand", slot: "offHand", tier: 2, levelReq: 10, price: 150, offType: "quiver",
    stats: { attack: 7, speed: 2 },
    description: "Шкіряний колчан — стріли під рукою. З луком або з вільною правою рукою."
  },
  quiver_t3: {
    name: "Окутий колчан", icon: ["weapon_offHand", 5],
    type: "offhand", slot: "offHand", tier: 3, levelReq: 20, price: 750, offType: "quiver", noShop: true,
    stats: { attack: 14, speed: 3 },
    description: "Окутий колчан для бойових стріл. З луком або з вільною правою рукою."
  },
  orb_t1: {
    name: "Скляна сфера", icon: ["weapon_offHand", 6],
    type: "offhand", slot: "offHand", tier: 1, levelReq: 1, price: 12, offType: "orb",
    stats: { magic: 3, mp: 10, mpRegen: 0.5 },
    description: "Скляна куля, що тихо світиться."
  },
  orb_t2: {
    name: "Лазурна сфера", icon: ["weapon_offHand", 7],
    type: "offhand", slot: "offHand", tier: 2, levelReq: 10, price: 160, offType: "orb",
    stats: { magic: 11, mp: 30, mpRegen: 1 },
    description: "Лазурна сфера з магічними рунами."
  },
  orb_t3: {
    name: "Оніксова сфера", icon: ["weapon_offHand", 8],
    type: "offhand", slot: "offHand", tier: 3, levelReq: 20, price: 800, offType: "orb", noShop: true,
    stats: { magic: 22, mp: 60, mpRegen: 2 },
    description: "Оніксова сфера в залізній оправі."
  },
  knife_t1: {
    name: "Дерев'яний малий кинджал", icon: ["weapon_offHand", 9],
    type: "offhand", slot: "offHand", tier: 1, levelReq: 1, price: 10, offType: "knife",
    stats: { attack: 2, crit: 2 },
    description: "Короткий клинок для лівої руки."
  },
  knife_t2: {
    name: "Кам'яний малий кинджал", icon: ["weapon_offHand", 10],
    type: "offhand", slot: "offHand", tier: 2, levelReq: 10, price: 150, offType: "knife",
    stats: { attack: 8, crit: 3 },
    description: "Кремінний ніж для лівої руки."
  },
  knife_t3: {
    name: "Залізний малий кинджал", icon: ["weapon_offHand", 11],
    type: "offhand", slot: "offHand", tier: 3, levelReq: 20, price: 750, offType: "knife", noShop: true,
    stats: { attack: 16, crit: 5 },
    description: "Залізний малий кинджал для лівої руки."
  },

  // ---------- БРОНЯ ----------
  linen_head: {
    name: "Лляна шапка", icon: ["armor", 0],
    type: "armor", slot: "head", tier: 1, levelReq: 1, price: 6, set: "linen",
    stats: { defense: 1, hp: 5 },
    description: "Частина лляного комплекту."
  },
  linen_chest: {
    name: "Лляна сорочка", icon: ["armor", 1],
    type: "armor", slot: "chest", tier: 1, levelReq: 1, price: 10, set: "linen",
    stats: { defense: 2, hp: 10 },
    description: "Частина лляного комплекту."
  },
  linen_legs: {
    name: "Лляні штани", icon: ["armor", 2],
    type: "armor", slot: "legs", tier: 1, levelReq: 1, price: 8, set: "linen",
    stats: { defense: 1, hp: 5 },
    description: "Частина лляного комплекту."
  },
  linen_hands: {
    name: "Лляні наручі", icon: ["armor", 3],
    type: "armor", slot: "hands", tier: 1, levelReq: 1, price: 6, set: "linen",
    stats: { defense: 1, attack: 1 },
    description: "Частина лляного комплекту."
  },
  linen_feet: {
    name: "Лляні черевики", icon: ["armor", 4],
    type: "armor", slot: "feet", tier: 1, levelReq: 1, price: 8, set: "linen",
    stats: { defense: 1, speed: 1 },
    description: "Частина лляного комплекту."
  },
  leather_head: {
    name: "Шкіряна шапка", icon: ["armor", 5],
    type: "armor", slot: "head", tier: 2, levelReq: 10, price: 90, set: "leather",
    stats: { defense: 5, hp: 20 },
    description: "Частина шкіряного комплекту."
  },
  leather_chest: {
    name: "Шкіряна куртка", icon: ["armor", 6],
    type: "armor", slot: "chest", tier: 2, levelReq: 10, price: 150, set: "leather",
    stats: { defense: 9, hp: 35 },
    description: "Частина шкіряного комплекту."
  },
  leather_legs: {
    name: "Шкіряні штани", icon: ["armor", 7],
    type: "armor", slot: "legs", tier: 2, levelReq: 10, price: 110, set: "leather",
    stats: { defense: 6, hp: 25 },
    description: "Частина шкіряного комплекту."
  },
  leather_hands: {
    name: "Шкіряні наручі", icon: ["armor", 8],
    type: "armor", slot: "hands", tier: 2, levelReq: 10, price: 90, set: "leather",
    stats: { defense: 4, attack: 3 },
    description: "Частина шкіряного комплекту."
  },
  leather_feet: {
    name: "Шкіряні чоботи", icon: ["armor", 9],
    type: "armor", slot: "feet", tier: 2, levelReq: 10, price: 100, set: "leather",
    stats: { defense: 4, speed: 2 },
    description: "Частина шкіряного комплекту."
  },
  iron_head: {
    name: "Залізний шолом", icon: ["armor", 10],
    type: "armor", slot: "head", tier: 3, levelReq: 20, price: 450, set: "iron", noShop: true,
    stats: { defense: 10, hp: 40 },
    description: "Частина залізного комплекту."
  },
  iron_chest: {
    name: "Залізна кіраса", icon: ["armor", 11],
    type: "armor", slot: "chest", tier: 3, levelReq: 20, price: 750, set: "iron", noShop: true,
    stats: { defense: 18, hp: 70 },
    description: "Частина залізного комплекту."
  },
  iron_legs: {
    name: "Залізні поножі", icon: ["armor", 12],
    type: "armor", slot: "legs", tier: 3, levelReq: 20, price: 550, set: "iron", noShop: true,
    stats: { defense: 12, hp: 50 },
    description: "Частина залізного комплекту."
  },
  iron_hands: {
    name: "Залізні наручі", icon: ["armor", 13],
    type: "armor", slot: "hands", tier: 3, levelReq: 20, price: 450, set: "iron", noShop: true,
    stats: { defense: 8, attack: 6 },
    description: "Частина залізного комплекту."
  },
  iron_feet: {
    name: "Залізні чоботи", icon: ["armor", 14],
    type: "armor", slot: "feet", tier: 3, levelReq: 20, price: 500, set: "iron", noShop: true,
    stats: { defense: 8, speed: 3 },
    description: "Частина залізного комплекту."
  },

  // ---------- БІЖУТЕРІЯ ----------
  ring_t1: {
    name: "Мідне кільце", icon: ["accessory", 0],
    type: "accessory", slot: "ring", tier: 1, levelReq: 2, price: 30, noShop: true,
    stats: { crit: 2 },
    description: "Кільце з невеликим бонусом. Можна носити два кільця."
  },
  ring_t2: {
    name: "Срібне кільце", icon: ["accessory", 1],
    type: "accessory", slot: "ring", tier: 2, levelReq: 10, price: 250, noShop: true,
    stats: { crit: 3, str: 2 },
    description: "Кільце з невеликим бонусом. Можна носити два кільця."
  },
  ring_t3: {
    name: "Золоте кільце", icon: ["accessory", 2],
    type: "accessory", slot: "ring", tier: 3, levelReq: 20, price: 1200, noShop: true,
    stats: { crit: 5, str: 4 },
    description: "Кільце з невеликим бонусом. Можна носити два кільця."
  },
  amulet_t1: {
    name: "Мідний амулет", icon: ["accessory", 3],
    type: "accessory", slot: "amulet", tier: 1, levelReq: 2, price: 30, noShop: true,
    stats: { hp: 15, spi: 1 },
    description: "Амулет на шиї."
  },
  amulet_t2: {
    name: "Срібний амулет", icon: ["accessory", 4],
    type: "accessory", slot: "amulet", tier: 2, levelReq: 10, price: 250, noShop: true,
    stats: { hp: 50, spi: 3 },
    description: "Амулет на шиї."
  },
  amulet_t3: {
    name: "Золотий амулет", icon: ["accessory", 5],
    type: "accessory", slot: "amulet", tier: 3, levelReq: 20, price: 1200, noShop: true,
    stats: { hp: 100, spi: 5 },
    description: "Амулет на шиї."
  },
  earring_t1: {
    name: "Мідна сережка", icon: ["accessory", 6],
    type: "accessory", slot: "earring", tier: 1, levelReq: 2, price: 30, noShop: true,
    stats: { mp: 10, dodge: 1 },
    description: "Сережка з невеликим бонусом. Можна носити дві сережки."
  },
  earring_t2: {
    name: "Срібна сережка", icon: ["accessory", 7],
    type: "accessory", slot: "earring", tier: 2, levelReq: 10, price: 250, noShop: true,
    stats: { mp: 30, dodge: 2 },
    description: "Сережка з невеликим бонусом. Можна носити дві сережки."
  },
  earring_t3: {
    name: "Золота сережка", icon: ["accessory", 8],
    type: "accessory", slot: "earring", tier: 3, levelReq: 20, price: 1200, noShop: true,
    stats: { mp: 60, dodge: 4 },
    description: "Сережка з невеликим бонусом. Можна носити дві сережки."
  },

  // ---------- РЕЧІ 4–7 ВИДУ (30 / 40 / 50 / 60 рівень) ----------
  // 4 — сталь ванів (Ванагейм), 5 — двергська сталь (Свартальвгейм), 6 — небесний метал Асгарду,
  // 7 — серцевина Іггдрасиля. Основні характеристики — від 3 виду ×1,6 / ×2,3 / ×3,1 / ×4;
  // крит, швидкість, ухилення, реген мани, інтелект — +1 за кожен вид понад 3 (крит кинджала +2, блок щита +2).
  // Лише здобич (4 вид — вороги й боси 29–30 рівня Альвгейму; 5–7 — вороги майбутніх світів).
  // Іконки — assets/images/items/icon_<id>.webp (ICON_FILES нижче); промти — H:\Game_NEW\Предмети t4-t7 - *.txt.
  // --- 4 вид: Сталь ванів (30 рівень) ---
  sword_t4: {
    name: "Сталевий меч",
    type: "weapon", slot: "mainHand", tier: 4, levelReq: 30, price: 2700, weaponType: "sword", noShop: true,
    stats: { attack: 64, crit: 4 },
    description: "Клинок ванських ковалів, загартований у морській воді Ноатуну. По лезу біжать хвилясті візерунки, мов брижі на воді."
  },
  axe_t4: {
    name: "Сталева сокира",
    type: "weapon", slot: "mainHand", tier: 4, levelReq: 30, price: 2850, weaponType: "axe", noShop: true,
    stats: { attack: 80, str: 5, speed: -2 },
    description: "Бородата сокира ванів: нею рубали дуби на кораблі Ньорда. Лезо прикрашене колоссям Фрейра."
  },
  dagger_t4: {
    name: "Сталевий кинджал",
    type: "weapon", slot: "mainHand", tier: 4, levelReq: 30, price: 2550, weaponType: "dagger", noShop: true,
    stats: { attack: 48, crit: 10, speed: 4 },
    description: "Вузький клинок-листок мисливців Ванагейму — тонкий, як очеретина з Туманних мочарів."
  },
  bow_t4: {
    name: "Сталевий лук",
    type: "weapon", slot: "mainHand", tier: 4, levelReq: 30, price: 2850, weaponType: "bow", noShop: true,
    stats: { attack: 61, crit: 5, speed: 4 },
    description: "Тисовий лук зі сталевими накладками. Ванські ловчі б'ють із нього крізь морський туман."
  },
  staff_t4: {
    name: "Сталевий посох",
    type: "weapon", slot: "mainHand", tier: 4, levelReq: 30, price: 2850, weaponType: "staff", noShop: true,
    stats: { attack: 10, magic: 70, mp: 96, int: 4 },
    description: "Посох ванських вельв із плавника, окутий сталевими кільцями. У навершя — пагін, що не в'яне."
  },
  shield_t4: {
    name: "Сталевий щит",
    type: "shield", slot: "offHand", tier: 4, levelReq: 30, price: 2400, offType: "shield", noShop: true,
    stats: { defense: 38, blockPhys: 18 },
    description: "Круглий щит з умбоном, кований на березі Ноатуну. Його сталевий край витримує удар хвилі."
  },
  knife_t4: {
    name: "Сталевий малий кинджал",
    type: "offhand", slot: "offHand", tier: 4, levelReq: 30, price: 2250, offType: "knife", noShop: true,
    stats: { attack: 26, crit: 6 },
    description: "Короткий сакс для лівої руки: ваніри беруть його і на полювання, і на жнива."
  },
  quiver_t4: {
    name: "Сталевий колчан",
    type: "offhand", slot: "offHand", tier: 4, levelReq: 30, price: 2250, offType: "quiver", noShop: true,
    stats: { attack: 22, speed: 4 },
    description: "Колчан, окутий сталевими смугами. Стріли в ньому оперені пір'ям чайок із Бухти Ран."
  },
  orb_t4: {
    name: "Бурштинова сфера",
    type: "offhand", slot: "offHand", tier: 4, levelReq: 30, price: 2400, offType: "orb", noShop: true,
    stats: { magic: 35, mp: 96, mpRegen: 3 },
    description: "Сфера з бурштину — застиглих сліз Фрейї, що шукала свого чоловіка. Усередині мерехтить тепле світло."
  },
  steel_head: {
    name: "Сталевий шолом",
    type: "armor", slot: "head", tier: 4, levelReq: 30, price: 1350, set: "steel", noShop: true,
    stats: { defense: 16, hp: 64 },
    description: "Шолом із наносником, як у вартових Бухти Ран. Частина сталевого комплекту ванів."
  },
  steel_chest: {
    name: "Сталева кольчуга",
    type: "armor", slot: "chest", tier: 4, levelReq: 30, price: 2250, set: "steel", noShop: true,
    stats: { defense: 29, hp: 112 },
    description: "Дрібне сталеве плетиво під накидкою кольору морської хвилі — легша за залізну кірасу, а тримає краще. Частина сталевого комплекту ванів."
  },
  steel_legs: {
    name: "Сталеві поножі",
    type: "armor", slot: "legs", tier: 4, levelReq: 30, price: 1650, set: "steel", noShop: true,
    stats: { defense: 19, hp: 80 },
    description: "Кольчужні поножі з наколінниками-мушлями. Частина сталевого комплекту ванів."
  },
  steel_hands: {
    name: "Сталеві наручі",
    type: "armor", slot: "hands", tier: 4, levelReq: 30, price: 1350, set: "steel", noShop: true,
    stats: { defense: 13, attack: 10 },
    description: "Сталеві наручі з хвилястим карбуванням. Частина сталевого комплекту ванів."
  },
  steel_feet: {
    name: "Сталеві чоботи",
    type: "armor", slot: "feet", tier: 4, levelReq: 30, price: 1500, set: "steel", noShop: true,
    stats: { defense: 13, speed: 4 },
    description: "Чоботи зі сталевими пластинами, просочені смолою від морської води. Частина сталевого комплекту ванів."
  },
  ring_t4: {
    name: "Платинове кільце",
    type: "accessory", slot: "ring", tier: 4, levelReq: 30, price: 3600, noShop: true,
    stats: { crit: 6, str: 6 },
    description: "Кільце з білої платини, що її ваніри добувають на дні моря. Можна носити два кільця."
  },
  amulet_t4: {
    name: "Платиновий амулет",
    type: "accessory", slot: "amulet", tier: 4, levelReq: 30, price: 3600, noShop: true,
    stats: { hp: 160, spi: 8 },
    description: "Платиновий амулет із колоском і хвилею — знаками Фрейра й Ньорда."
  },
  earring_t4: {
    name: "Платинова сережка",
    type: "accessory", slot: "earring", tier: 4, levelReq: 30, price: 3600, noShop: true,
    stats: { mp: 96, dodge: 5 },
    description: "Платинова сережка з перлиною з Бухти Ран. Можна носити дві сережки."
  },
  // --- 5 вид: Двергська сталь (40 рівень) ---
  sword_t5: {
    name: "Двергський меч",
    type: "weapon", slot: "mainHand", tier: 5, levelReq: 40, price: 6750, weaponType: "sword", noShop: true,
    stats: { attack: 92, crit: 5 },
    description: "Чорна сталь із кузень Брокка й Ейтрі. Руни на лезі розжарюються, мов горно, коли меч рубає."
  },
  axe_t5: {
    name: "Двергська сокира",
    type: "weapon", slot: "mainHand", tier: 5, levelReq: 40, price: 7100, weaponType: "axe", noShop: true,
    stats: { attack: 115, str: 7, speed: -2 },
    description: "Важка двосічна сокира свартальвів. Кажуть, її гартували в тій самій печі, де народився Мйольнір."
  },
  dagger_t5: {
    name: "Двергський кинджал",
    type: "weapon", slot: "mainHand", tier: 5, levelReq: 40, price: 6400, weaponType: "dagger", noShop: true,
    stats: { attack: 69, crit: 12, speed: 5 },
    description: "Кинджал підземних майстрів, гострий настільки, що ріже камінь, як сир."
  },
  bow_t5: {
    name: "Двергський лук",
    type: "weapon", slot: "mainHand", tier: 5, levelReq: 40, price: 7100, weaponType: "bow", noShop: true,
    stats: { attack: 87, crit: 6, speed: 5 },
    description: "Короткий лук із рогу й чорної сталі: свартальви стріляють із нього в тісних штольнях."
  },
  staff_t5: {
    name: "Двергський посох",
    type: "weapon", slot: "mainHand", tier: 5, levelReq: 40, price: 7100, weaponType: "staff", noShop: true,
    stats: { attack: 14, magic: 101, mp: 138, int: 5 },
    description: "Посох рунних майстрів Нідавелліру. У кованій клітці навершя жевріє самоцвіт, у якому ще живе вогонь горна."
  },
  shield_t5: {
    name: "Двергський щит",
    type: "shield", slot: "offHand", tier: 5, levelReq: 40, price: 6000, offType: "shield", noShop: true,
    stats: { defense: 55, blockPhys: 20 },
    description: "Щит із чорної сталі в колі рун захисту, з молотом і ковадлом посередині. Важкий, як гірська брила, і такий самий надійний."
  },
  knife_t5: {
    name: "Двергський малий кинджал",
    type: "offhand", slot: "offHand", tier: 5, levelReq: 40, price: 5600, offType: "knife", noShop: true,
    stats: { attack: 37, crit: 7 },
    description: "Ніж-кайло гірника: ним свартальви виколупують самоцвіти з породи, а в бою — щілини в броні."
  },
  quiver_t5: {
    name: "Двергський колчан",
    type: "offhand", slot: "offHand", tier: 5, levelReq: 40, price: 5600, offType: "quiver", noShop: true,
    stats: { attack: 32, speed: 5 },
    description: "Колчан зі шкіри печерного ящура на мідних заклепках. Наконечники стріл покриті рунами."
  },
  orb_t5: {
    name: "Криштальна сфера",
    type: "offhand", slot: "offHand", tier: 5, levelReq: 40, price: 6000, offType: "orb", noShop: true,
    stats: { magic: 51, mp: 138, mpRegen: 4 },
    description: "Гірський кришталь із печер Андварі. У його гранях застиг холодний блиск підземних скарбів."
  },
  dwarf_head: {
    name: "Двергський шолом",
    type: "armor", slot: "head", tier: 5, levelReq: 40, price: 3400, set: "dwarf", noShop: true,
    stats: { defense: 23, hp: 92 },
    description: "Шолом із масивним наличником і рунною смугою над очима. Частина двергського комплекту."
  },
  dwarf_chest: {
    name: "Двергська кіраса",
    type: "armor", slot: "chest", tier: 5, levelReq: 40, price: 5600, set: "dwarf", noShop: true,
    stats: { defense: 41, hp: 161 },
    description: "Пластини чорної сталі на золотих заклепках. Свартальви кажуть: вона перекує удар на тиху луну. Частина двергського комплекту."
  },
  dwarf_legs: {
    name: "Двергські поножі",
    type: "armor", slot: "legs", tier: 5, levelReq: 40, price: 4100, set: "dwarf", noShop: true,
    stats: { defense: 28, hp: 115 },
    description: "Ковані поножі з вогнетривкої сталі. Частина двергського комплекту."
  },
  dwarf_hands: {
    name: "Двергські наручі",
    type: "armor", slot: "hands", tier: 5, levelReq: 40, price: 3400, set: "dwarf", noShop: true,
    stats: { defense: 18, attack: 14 },
    description: "Латні наручі коваля з мідними кісточками. Частина двергського комплекту."
  },
  dwarf_feet: {
    name: "Двергські чоботи",
    type: "armor", slot: "feet", tier: 5, levelReq: 40, price: 3750, set: "dwarf", noShop: true,
    stats: { defense: 18, speed: 5 },
    description: "Важкі чоботи з окутими носками, щоб не боятися ні каменю, ні лави. Частина двергського комплекту."
  },
  ring_t5: {
    name: "Самоцвітне кільце",
    type: "accessory", slot: "ring", tier: 5, levelReq: 40, price: 9000, noShop: true,
    stats: { crit: 7, str: 9 },
    description: "Перстень із червоним самоцвітом із глибин Нідавелліру. Можна носити два кільця."
  },
  amulet_t5: {
    name: "Самоцвітний амулет",
    type: "accessory", slot: "amulet", tier: 5, levelReq: 40, price: 9000, noShop: true,
    stats: { hp: 230, spi: 12 },
    description: "Самоцвіт у кованій золотій оправі зі знаком молота — оберіг двергів."
  },
  earring_t5: {
    name: "Самоцвітна сережка",
    type: "accessory", slot: "earring", tier: 5, levelReq: 40, price: 9000, noShop: true,
    stats: { mp: 138, dodge: 6 },
    description: "Сережка з крапелькою смарагду, добутого при світлі горна. Можна носити дві сережки."
  },
  // --- 6 вид: Небесний метал Асгарду (50 рівень) ---
  sword_t6: {
    name: "Асгардський меч",
    type: "weapon", slot: "mainHand", tier: 6, levelReq: 50, price: 14850, weaponType: "sword", noShop: true,
    stats: { attack: 124, crit: 6 },
    description: "Клинок ейнгер'їв Валгалли, кований з небесного металу. Сяє, мов промінь над Біфростом."
  },
  axe_t6: {
    name: "Асгардська сокира",
    type: "weapon", slot: "mainHand", tier: 6, levelReq: 50, price: 15700, weaponType: "axe", noShop: true,
    stats: { attack: 155, str: 9, speed: -2 },
    description: "Сокира вартових Валгалли з вороном Одіна на лезі. Небесний метал ніколи не тупиться."
  },
  dagger_t6: {
    name: "Асгардський кинджал",
    type: "weapon", slot: "mainHand", tier: 6, levelReq: 50, price: 14000, weaponType: "dagger", noShop: true,
    stats: { attack: 93, crit: 14, speed: 6 },
    description: "Тонкий клинок із Фенсаліру, чертогу Фрігг. Кажуть, він завжди знаходить шлях до правди."
  },
  bow_t6: {
    name: "Асгардський лук",
    type: "weapon", slot: "mainHand", tier: 6, levelReq: 50, price: 15700, weaponType: "bow", noShop: true,
    stats: { attack: 118, crit: 7, speed: 6 },
    description: "Лук із білого ясена й небесного срібла. З такого Улль стріляє з самого неба."
  },
  staff_t6: {
    name: "Асгардський посох",
    type: "weapon", slot: "mainHand", tier: 6, levelReq: 50, price: 15700, weaponType: "staff", noShop: true,
    stats: { attack: 19, magic: 136, mp: 186, int: 6 },
    description: "Посох провидців Гладсгейму, увінчаний крилами ворона, що обіймають світлий кристал. Сповнений мудрості Одіна."
  },
  shield_t6: {
    name: "Асгардський щит",
    type: "shield", slot: "offHand", tier: 6, levelReq: 50, price: 13200, offType: "shield", noShop: true,
    stats: { defense: 74, blockPhys: 22 },
    description: "Щит воїнів Валгалли — з таких складено дах чертогу Одіна."
  },
  knife_t6: {
    name: "Асгардський малий кинджал",
    type: "offhand", slot: "offHand", tier: 6, levelReq: 50, price: 12400, offType: "knife", noShop: true,
    stats: { attack: 50, crit: 8 },
    description: "Короткий клинок валькірій, легкий, як перо з їхніх крил."
  },
  quiver_t6: {
    name: "Асгардський колчан",
    type: "offhand", slot: "offHand", tier: 6, levelReq: 50, price: 12400, offType: "quiver", noShop: true,
    stats: { attack: 43, speed: 6 },
    description: "Колчан із білої шкіри з золотим тисненням. Стріли оперені пір'ям орла з вершини Іггдрасиля."
  },
  orb_t6: {
    name: "Райдужна сфера",
    type: "offhand", slot: "offHand", tier: 6, levelReq: 50, price: 13200, offType: "orb", noShop: true,
    stats: { magic: 68, mp: 186, mpRegen: 5 },
    description: "Уламок Біфросту, райдужного мосту до Асгарду. У ньому переливаються всі барви неба."
  },
  asgard_head: {
    name: "Асгардський шолом",
    type: "armor", slot: "head", tier: 6, levelReq: 50, price: 7400, set: "asgard", noShop: true,
    stats: { defense: 31, hp: 124 },
    description: "Крилатий шолом із небесного металу. Частина асгардського комплекту."
  },
  asgard_chest: {
    name: "Асгардський нагрудник",
    type: "armor", slot: "chest", tier: 6, levelReq: 50, price: 12400, set: "asgard", noShop: true,
    stats: { defense: 56, hp: 217 },
    description: "Білі лати з золотим сонцем на грудях. Їх дають лише тим, кого обрали валькірії. Частина асгардського комплекту."
  },
  asgard_legs: {
    name: "Асгардські поножі",
    type: "armor", slot: "legs", tier: 6, levelReq: 50, price: 9100, set: "asgard", noShop: true,
    stats: { defense: 37, hp: 155 },
    description: "Поножі з білого металу з золотими крилами на наколінниках. Частина асгардського комплекту."
  },
  asgard_hands: {
    name: "Асгардські наручі",
    type: "armor", slot: "hands", tier: 6, levelReq: 50, price: 7400, set: "asgard", noShop: true,
    stats: { defense: 25, attack: 19 },
    description: "Наручі з крилами орла, що розгортаються при замаху. Частина асгардського комплекту."
  },
  asgard_feet: {
    name: "Асгардські чоботи",
    type: "armor", slot: "feet", tier: 6, levelReq: 50, price: 8250, set: "asgard", noShop: true,
    stats: { defense: 25, speed: 6 },
    description: "Чоботи, у яких не зісковзнеш навіть із Біфросту. Частина асгардського комплекту."
  },
  ring_t6: {
    name: "Сонячне кільце",
    type: "accessory", slot: "ring", tier: 6, levelReq: 50, price: 19800, noShop: true,
    stats: { crit: 8, str: 12 },
    description: "Кільце, у яке вплетено промінь Соль, що щодня веде колісницю сонця. Можна носити два кільця."
  },
  amulet_t6: {
    name: "Сонячний амулет",
    type: "accessory", slot: "amulet", tier: 6, levelReq: 50, price: 19800, noShop: true,
    stats: { hp: 310, spi: 16 },
    description: "Золотий сонячний диск-оберіг. Поки сонце не наздогнав вовк Сколль, він гріє і зцілює."
  },
  earring_t6: {
    name: "Сонячна сережка",
    type: "accessory", slot: "earring", tier: 6, levelReq: 50, price: 19800, noShop: true,
    stats: { mp: 186, dodge: 7 },
    description: "Сережка-промінчик із сонячного золота. Можна носити дві сережки."
  },
  // --- 7 вид: Серце Іггдрасиля (60 рівень) ---
  sword_t7: {
    name: "Іггдрасилів меч",
    type: "weapon", slot: "mainHand", tier: 7, levelReq: 60, price: 29700, weaponType: "sword", noShop: true,
    stats: { attack: 160, crit: 7 },
    description: "Клинок із серцевини Світового Дерева, твердішої за будь-яку сталь. У прожилках тече золотий сік — кров Іггдрасиля."
  },
  axe_t7: {
    name: "Іггдрасилева сокира",
    type: "weapon", slot: "mainHand", tier: 7, levelReq: 60, price: 31350, weaponType: "axe", noShop: true,
    stats: { attack: 200, str: 12, speed: -2 },
    description: "Гілка, що впала з Дерева, коли Нідгьоґ гриз його корінь, і сама стала сокирою. Вона пам'ятає, кому мститись."
  },
  dagger_t7: {
    name: "Іггдрасилів кинджал",
    type: "weapon", slot: "mainHand", tier: 7, levelReq: 60, price: 28050, weaponType: "dagger", noShop: true,
    stats: { attack: 120, crit: 16, speed: 7 },
    description: "Шип зі стовбура Світового Дерева, гострий, як жало. Рана від нього не гоїться, доки на неї не впаде роса з джерела Урд."
  },
  bow_t7: {
    name: "Іггдрасилів лук",
    type: "weapon", slot: "mainHand", tier: 7, levelReq: 60, price: 31350, weaponType: "bow", noShop: true,
    stats: { attack: 152, crit: 8, speed: 7 },
    description: "Лук, що виріс сам: жива гілка ясеня, на кінцях якої досі розпускається листя."
  },
  staff_t7: {
    name: "Іггдрасилів посох",
    type: "weapon", slot: "mainHand", tier: 7, levelReq: 60, price: 31350, weaponType: "staff", noShop: true,
    stats: { attack: 24, magic: 176, mp: 240, int: 7 },
    description: "Корінь Світового Дерева, що п'є з джерела Мімира. Хто тримає його — чує шепіт дев'яти світів."
  },
  shield_t7: {
    name: "Іггдрасилів щит",
    type: "shield", slot: "offHand", tier: 7, levelReq: 60, price: 26400, offType: "shield", noShop: true,
    stats: { defense: 96, blockPhys: 24 },
    description: "Щит із кори Світового Дерева. Його не прорубає навіть вогняний меч Сурта."
  },
  knife_t7: {
    name: "Іггдрасилів малий кинджал",
    type: "offhand", slot: "offHand", tier: 7, levelReq: 60, price: 24750, offType: "knife", noShop: true,
    stats: { attack: 64, crit: 9 },
    description: "Тонкий шип-гілочка: легкий, як листок, і гострий, як іній Ніфльгейму."
  },
  quiver_t7: {
    name: "Іггдрасилів колчан",
    type: "offhand", slot: "offHand", tier: 7, levelReq: 60, price: 24750, offType: "quiver", noShop: true,
    stats: { attack: 56, speed: 7 },
    description: "Колчан із дупла Світового Дерева. Стріли в ньому — прямі пагони, що ніколи не ламаються."
  },
  orb_t7: {
    name: "Мімирова сфера",
    type: "offhand", slot: "offHand", tier: 7, levelReq: 60, price: 26400, offType: "orb", noShop: true,
    stats: { magic: 88, mp: 240, mpRegen: 6 },
    description: "Крапля з джерела Мімира під коренем Іггдрасиля. За ковток із нього Одін віддав око."
  },
  ygg_head: {
    name: "Іггдрасилів шолом",
    type: "armor", slot: "head", tier: 7, levelReq: 60, price: 14850, set: "ygg", noShop: true,
    stats: { defense: 40, hp: 160 },
    description: "Шолом із кори й переплетеного коріння, увінчаний молодими пагонами. Частина комплекту Іггдрасиля."
  },
  ygg_chest: {
    name: "Іггдрасилів обладунок",
    type: "armor", slot: "chest", tier: 7, levelReq: 60, price: 24750, set: "ygg", noShop: true,
    stats: { defense: 72, hp: 280 },
    description: "Кора Світового Дерева, що сама наросла на тіло обраного. Золотий сік у її тріщинах загоює рани. Частина комплекту Іггдрасиля."
  },
  ygg_legs: {
    name: "Іггдрасилеві поножі",
    type: "armor", slot: "legs", tier: 7, levelReq: 60, price: 18150, set: "ygg", noShop: true,
    stats: { defense: 48, hp: 200 },
    description: "Поножі з коріння, що обвило ноги, мов живе. Частина комплекту Іггдрасиля."
  },
  ygg_hands: {
    name: "Іггдрасилеві наручі",
    type: "armor", slot: "hands", tier: 7, levelReq: 60, price: 14850, set: "ygg", noShop: true,
    stats: { defense: 32, attack: 24 },
    description: "Наручі з кори з золотими жилками соку. Частина комплекту Іггдрасиля."
  },
  ygg_feet: {
    name: "Іггдрасилеві чоботи",
    type: "armor", slot: "feet", tier: 7, levelReq: 60, price: 16500, set: "ygg", noShop: true,
    stats: { defense: 32, speed: 7 },
    description: "Чоботи з коріння: хто їх узув, стоїть твердо, як Дерево в бурю. Частина комплекту Іггдрасиля."
  },
  ring_t7: {
    name: "Зоряне кільце",
    type: "accessory", slot: "ring", tier: 7, levelReq: 60, price: 39600, noShop: true,
    stats: { crit: 9, str: 16 },
    description: "Кільце з іскри Муспельгейму, яку боги колись прибили до неба зорею. Можна носити два кільця."
  },
  amulet_t7: {
    name: "Зоряний амулет",
    type: "accessory", slot: "amulet", tier: 7, levelReq: 60, price: 39600, noShop: true,
    stats: { hp: 400, spi: 20 },
    description: "Уламок нічного неба: у ньому видно всі дев'ять світів на гілках Дерева."
  },
  earring_t7: {
    name: "Зоряна сережка",
    type: "accessory", slot: "earring", tier: 7, levelReq: 60, price: 39600, noShop: true,
    stats: { mp: 240, dodge: 8 },
    description: "Сережка-зірочка, що світить навіть у мороці Хельгейму. Можна носити дві сережки."
  },

  // ---------- КОМПЛЕКТ СЛИЗУ (здобич зі слаймів, див. ITEM_SETS) ----------
  slime_ring: {
    name: "Слизове кільце", icon: ["accessory", 9],
    type: "accessory", slot: "ring", tier: 1, levelReq: 6, price: 140, noShop: true, set: "slime",
    stats: { mp: 15, magic: 2, crit: 1 },
    description: "Холодне й трохи липке. Частина комплекту слизу."
  },
  slime_amulet: {
    name: "Слизовий амулет", icon: ["accessory", 10],
    type: "accessory", slot: "amulet", tier: 1, levelReq: 6, price: 160, noShop: true, set: "slime",
    stats: { hp: 25, mp: 25, spi: 2 },
    description: "Усередині повільно переливається желе. Частина комплекту слизу."
  },
  slime_earring: {
    name: "Слизова сережка", icon: ["accessory", 11],
    type: "accessory", slot: "earring", tier: 1, levelReq: 6, price: 140, noShop: true, set: "slime",
    stats: { mp: 20, magicDefense: 2, dodge: 1 },
    description: "Крапля застиглого слизу. Частина комплекту слизу."
  },

  // ---------- ЗІЛЛЯ ----------
  // Малі та середні продає шинкар; великі та чарівне — лише з ворогів.
  potion_hp_small: {
    name: "Мале зілля здоров'я", icon: ["consumable", 0],
    type: "consumable", price: 5, stackable: true, maxStack: POTION_STACK,
    effect: { healHp: 30 },
    description: "Відновлює 30 здоров'я."
  },
  potion_hp_medium: {
    name: "Середнє зілля здоров'я", icon: ["consumable", 1],
    type: "consumable", price: 15, stackable: true, maxStack: POTION_STACK,
    effect: { healHp: 80 },
    description: "Відновлює 80 здоров'я."
  },
  potion_hp_large: {
    name: "Велике зілля здоров'я", icon: ["consumable", 2],
    type: "consumable", price: 45, stackable: true, maxStack: POTION_STACK, noShop: true,
    effect: { healHp: 200 },
    description: "Відновлює 200 здоров'я. Торговці таким не торгують."
  },
  potion_mp_small: {
    name: "Мале зілля мани", icon: ["consumable", 3],
    type: "consumable", price: 6, stackable: true, maxStack: POTION_STACK,
    effect: { healMp: 20 },
    description: "Відновлює 20 мани."
  },
  potion_mp_medium: {
    name: "Середнє зілля мани", icon: ["consumable", 4],
    type: "consumable", price: 18, stackable: true, maxStack: POTION_STACK,
    effect: { healMp: 50 },
    description: "Відновлює 50 мани."
  },
  potion_mp_large: {
    name: "Велике зілля мани", icon: ["consumable", 5],
    type: "consumable", price: 50, stackable: true, maxStack: POTION_STACK, noShop: true,
    effect: { healMp: 120 },
    description: "Відновлює 120 мани. Торговці таким не торгують."
  },
  potion_magic: {
    name: "Чарівне зілля", icon: ["consumable", 6],
    type: "consumable", price: 150, stackable: true, maxStack: POTION_STACK, noShop: true, rarity: "rare",
    effect: { healHpPct: 0.5, healMpPct: 0.3 },
    description: "Дуже рідкісне. Відновлює 50% здоров'я та 30% мани."
  },

  // ---------- МАТЕРІАЛИ (здобич з ворогів) ----------
  rat_tail: {
    name: "Щурячий хвіст", icon: ["material", 0],
    type: "material", price: 2, stackable: true, maxStack: MATERIAL_STACK,
    description: "Трофей з льоху. Торговці купують за мідяк."
  },
  rat_skin: {
    name: "Щуряча шкурка", icon: ["material", 1],
    type: "material", price: 3, stackable: true, maxStack: MATERIAL_STACK,
    description: "Дрібна, але шкірник візьме."
  },
  wolf_pelt: {
    name: "Вовча шкура", icon: ["material", 2],
    type: "material", price: 6, stackable: true, maxStack: MATERIAL_STACK,
    description: "Можна продати торговцю."
  },
  wolf_fang: {
    name: "Вовче ікло", icon: ["material", 3],
    type: "material", price: 5, stackable: true, maxStack: MATERIAL_STACK,
    description: "Гостре. Згодиться на амулет."
  },
  white_pelt: {
    name: "Біла вовча шкура", icon: ["material", 4],
    type: "material", price: 12, stackable: true, maxStack: MATERIAL_STACK,
    description: "Рідкісне хутро, за нього добре платять."
  },
  slime_gel: {
    name: "Слиз", icon: ["material", 5],
    type: "material", price: 2, stackable: true, maxStack: MATERIAL_STACK,
    description: "Липкий і трохи світиться."
  },

  // ---------- Темний ліс — трофеї ворогів (по одному на локацію; data/enemies.js → DARK_LOC_MAT) ----------
  // Потрібні для доручень Відреченого (quests.js → SHAMAN), а так — на продаж. Іконки поки позичені.
  shadow_fur: {
    name: "Тіньове хутро", g: "n", icon: ["material", 2],
    type: "material", price: 14, stackable: true, maxStack: MATERIAL_STACK,
    description: "Хутро звірів Похмурого узлісся — темніше за ніч, і тінь від нього не падає."
  },
  bog_moss: {
    name: "Болотяний мох", g: "m", iconFile: "flax",
    type: "material", price: 14, stackable: true, maxStack: MATERIAL_STACK,
    description: "Сивий мох із Туманних боліт. Кажуть, він пам'ятає кожного утопленого."
  },
  grave_bone: {
    name: "Могильна кістка", g: "f", icon: ["material", 3],
    type: "material", price: 16, stackable: true, maxStack: MATERIAL_STACK,
    description: "Кістка зі Старого кладовища, холодна навіть у руці біля вогню."
  },
  spider_silk: {
    name: "Павутинна нитка", g: "f", iconFile: "flax",
    type: "material", price: 18, stackable: true, maxStack: MATERIAL_STACK,
    description: "Нитка з Лісу павутини, міцніша за сухожилля. Ткачі й шамани дають за неї добру ціну."
  },
  werewolf_fang: {
    name: "Ікло вовкулаки", g: "n", icon: ["material", 3],
    type: "material", price: 20, stackable: true, maxStack: MATERIAL_STACK,
    description: "Ікло з Вовкулачого яру. У ньому досі живе лють звіра."
  },
  witch_ash: {
    name: "Відьмин попіл", g: "m", iconFile: "coal",
    type: "material", price: 22, stackable: true, maxStack: MATERIAL_STACK,
    description: "Попіл з Руїн відьминої вежі — те, що лишається від чужих прокльонів."
  },
  black_bark: {
    name: "Чорна кора", g: "f", iconFile: "oak_wood",
    type: "material", price: 24, stackable: true, maxStack: MATERIAL_STACK,
    description: "Кора дерев Серця лісу, почорніла від подиху Хелли."
  },

  // ---------- Мішечки на пояс (група «мішечок на пояс», type: "pouch") ----------
  // Вішаються в слоти пояса (5 слотів, character.js → BELT_SLOTS) і додають комірки до інвентаря: bag — скільки.
  // Падають лише з босів (1%, окремо від звичайної здобичі — character.js → rollPouchDrop). Картинок поки немає.
  pouch_small: {
    name: "Малий мішечок на пояс", type: "pouch", bag: 5, price: 1500, noShop: true,
    description: "Шкіряний мішечок на ремінці. На поясі додає 5 комірок до інвентаря."
  },
  pouch_medium: {
    name: "Мішечок на пояс", type: "pouch", bag: 10, price: 4000, noShop: true,
    description: "Міцний мішечок з подвійним швом. На поясі додає 10 комірок до інвентаря."
  },
  pouch_large: {
    name: "Великий мішечок на пояс", type: "pouch", bag: 15, price: 10000, noShop: true,
    description: "Глибокий мішечок, окутий мідними кільцями. На поясі додає 15 комірок до інвентаря."
  },

  // ---------- Квестові предмети: ключі від данжів (data/enemies.js → DUNGEONS) ----------
  // quest: true — не продається торговцю. pocket: "keys" — лежить не в інвентарі,
  // а в окремій кишені для ключів (dungeon.js, до 1000 кожного виду). Картинки немає.
  key_cave_secret: {
    name: "Ключ «Таємниця печери»",
    type: "quest", quest: true, pocket: "keys", price: 0, noShop: true,
    description: "Слизький кам'яний ключ. Відчиняє ворота данжу «Таємниці печери» (Печера в лісі). Одна спроба — один ключ."
  },
  key_web_nest: {
    name: "Ключ «Гніздо павуків»",
    type: "quest", quest: true, pocket: "keys", price: 0, noShop: true,
    description: "Ключ, обплетений павутинням. Відчиняє данж «Гніздо Королеви» (Ліс павутини). Одна спроба — один ключ."
  },
  // Квест «Долоні Велеса» (quests.js → VELES): незнайомець підкидає героєві на 12 рівні
  orb_veles: {
    name: "Дивна сфера", iconFile: "orb_t1",
    type: "quest", quest: true, price: 0, noShop: true,
    description: "Важка куля з темного каменю, тепла на дотик. На одному боці — глибоке заглиблення у формі ромба. " +
      "Її підкинув незнайомець у запиленому плащі й зник у натовпі."
  },
  key_dark_throne: {
    name: "Ключ «Трон Володаря»",
    type: "quest", quest: true, pocket: "keys", price: 0, noShop: true,
    description: "Ключ із темного кореня. Відчиняє данж «Трон Володаря» (Серце Темного лісу). Одна спроба — один ключ."
  },
  // Ключі данжів Альвгейму (світ 3) — іконки icon_key_alf_<локація>.webp
  key_alf_grove: {
    name: "Ключ «Гніздо мотилів»",
    type: "quest", quest: true, pocket: "keys", price: 0, noShop: true,
    description: "Срібна гілочка з пилком на крилах-зубцях. Відчиняє данж «Гніздо мотилів» (Сріблястий гай). Одна спроба — один ключ."
  },
  key_alf_lake: {
    name: "Ключ «Глибини озера»",
    type: "quest", quest: true, pocket: "keys", price: 0, noShop: true,
    description: "Холодний ключ із перламутру, завжди мокрий. Відчиняє данж «Глибини озера» (Дзеркальне озеро). Одна спроба — один ключ."
  },
  key_alf_gardens: {
    name: "Ключ «Тлінна оранжерея»",
    type: "quest", quest: true, pocket: "keys", price: 0, noShop: true,
    description: "Ключ, обвитий терном і зів'ялими пелюстками. Відчиняє данж «Тлінна оранжерея» (Сади вічної весни). Одна спроба — один ключ."
  },
  key_alf_towers: {
    name: "Ключ «Вершина світанку»",
    type: "quest", quest: true, pocket: "keys", price: 0, noShop: true,
    description: "Білий ключ, що теплішає на сонці. Відчиняє данж «Вершина світанку» (Вежі світанку). Одна спроба — один ключ."
  },
  key_alf_freyr: {
    name: "Ключ «Трон Фрейра»",
    type: "quest", quest: true, pocket: "keys", price: 0, noShop: true,
    description: "Важкий ключ із вирізьбленим вепром. Відчиняє данж «Трон Фрейра» (Чертог Фрейра). Одна спроба — один ключ."
  },
  key_alf_beli: {
    name: "Ключ «Курган Белі»",
    type: "quest", quest: true, pocket: "keys", price: 0, noShop: true,
    description: "Ключ з оленячого рогу, оповитий фіолетовим димом. Відчиняє данж «Курган Белі» (Поле Белі). Одна спроба — один ключ."
  },

  // ---------- Предмет адміністратора (для тестування прогресу) ----------
  // Діє на ВСЮ групу, поки лежить в інвентарі (character.js → godsOrb): +800% досвіду (бої й квести),
  // +600% досвіду володіння зброєю, вампіризм 55% (частка завданої шкоди лікує героя, battle.js),
  // переміщення між будь-якими локаціями за 3 с (travel.js → travelSeconds), +10% до шансу випадіння кожного предмета
  // з ворогів — додається до шансу: 20% → 30% (data/enemies.js → rollLoot); рідкість речі не змінюється.
  // locked: true — не продається, не викидається, не розбирається; покласти можна лише в спільну скриню «main»
  // (Домівка). Видається кодом god.mod у рядку «Код» на сторінці «Налаштування» (одна на збереження). Іконка — магічна сфера 3 виду.
  orb_gods: {
    name: "Сфера Богів", iconFile: "orb_t3",
    type: "admin", locked: true, price: 0, noShop: true,
    gods: { expPct: 800, masteryPct: 600, lifestealPct: 55, travelSec: 3, lootPct: 10 },
    description: "Сфера Богів - з'явилась для тестування прогресу гри, предмет адміністратора"
  }
};

// ---------- МАТЕРІАЛИ РЕМЕСЛА (Книга «Небесна кузня») ----------
// Нові матеріали для крафту. Іконок поки немає — у клітинці показується назва.
// craftTier — тір речей, для яких матеріал потрібен; g — рід назви (m/f/n/pl) для «Магічний/-на/-не/-ні».
// Мідь, срібло, залізо й золото — це матеріали (руда → злиток у горні), а не гроші: золоті монети — окрема валюта.
const CRAFT_MATERIALS = {
  coal:        { name: "Вугілля",          g: "n",  craftTier: 3, price: 5,  description: "Тепло для горна й для зими. Мерія Дубової Застави завжди його потребує." },
  oak_wood:    { name: "Дубова деревина",  g: "f",  craftTier: 1, price: 2,  description: "Міцне дерево Перуна — на руків'я, щити й дерев'яну зброю." },
  ash_wood:    { name: "Ясенова деревина", g: "f",  craftTier: 1, price: 2,  description: "Гнучкий ясен — на луки й посохи." },
  flax:        { name: "Льон",             g: "m",  craftTier: 1, price: 2,  description: "Волокно для лляного одягу й полотняних колчанів." },
  leather_strap:{ name: "Ремінь",          g: "m",  craftTier: 1, price: 3,  description: "Шкіряний ремінь — обмотка руків'я, кріплення броні." },
  glass:       { name: "Скло",             g: "n",  craftTier: 1, price: 4,  description: "Для скляних сфер чародіїв." },
  flint:       { name: "Кремінь",          g: "m",  craftTier: 2, price: 6,  description: "Твердий камінь для кам'яної зброї." },
  lapis:       { name: "Лазурит",          g: "m",  craftTier: 2, price: 15, description: "Синій камінь — серце лазурних сфер." },
  onyx:        { name: "Онікс",            g: "m",  craftTier: 3, price: 40, description: "Чорний камінь для оніксових сфер." },
  gem:         { name: "Самоцвіт",         g: "m",  craftTier: 3, price: 60, description: "Камінь для золотих прикрас." },
  copper_ore:  { name: "Мідна руда",       g: "f",  craftTier: 1, price: 3,  description: "Переплавляється в горні на мідні злитки." },
  copper_ingot:{ name: "Мідний злиток",    g: "m",  craftTier: 1, price: 8,  description: "Мідь для перших прикрас." },
  silver_ore:  { name: "Срібна руда",      g: "f",  craftTier: 2, price: 10, description: "Переплавляється в горні на срібні злитки." },
  silver_ingot:{ name: "Срібний злиток",   g: "m",  craftTier: 2, price: 25, description: "Срібло для прикрас тіру 2." },
  iron_ore:    { name: "Залізна руда",     g: "f",  craftTier: 3, price: 12, description: "Переплавляється в горні на залізні злитки." },
  iron_ingot:  { name: "Залізний злиток",  g: "m",  craftTier: 3, price: 30, description: "Залізо для зброї й броні тіру 3." },
  gold_ore:    { name: "Золота руда",      g: "f",  craftTier: 3, price: 30, description: "Переплавляється в горні на золоті злитки." },
  gold_ingot:  { name: "Золотий злиток",   g: "m",  craftTier: 3, price: 75, description: "Золото для прикрас тіру 3. Не плутати з монетами." },
  // ---------- Альвгейм — матеріали комплектів професій (data/profsets.js) ----------
  // Перші шість падають з усіх ворогів своєї локації Альвгейму, рідкісні — лише з її боса (зі зменшеним шансом)
  silver_pollen: { name: "Сріблястий пилок", g: "m", craftTier: 3, price: 40, description: "Пилок з крил сутінкових мотилів Сріблястого гаю. Ним просочують тканину й шкіру комплектів професій." },
  mirror_scale:  { name: "Дзеркальна луска", g: "f", craftTier: 3, price: 40, description: "Луска з Дзеркального озера, у якій видно чуже небо. Пластини й оздоби комплектів професій." },
  spring_shoot:  { name: "Пагін вічної весни", g: "m", craftTier: 3, price: 40, description: "Живий пагін із Садів вічної весни, що не в'яне навіть зірваним. Переплетення й держаки." },
  dawn_shard:    { name: "Уламок світанку",  g: "m", craftTier: 3, price: 40, description: "Застиглий промінь із Веж світанку. Світиться в темряві; ним гартують метал і сфери." },
  golden_bristle:{ name: "Золота щетина",    g: "f", craftTier: 3, price: 40, description: "Щетина вепрів Чертогу Фрейра, тверда й блискуча, як золото. Обшивки, тятиви, ремені." },
  stag_antler:   { name: "Оленячий ріг",     g: "m", craftTier: 3, price: 40, description: "Ріг з Поля Белі — таким рогом колись Фрейр здолав велетня. Руків'я, накладки, амулети броні." },
  moth_wing:     { name: "Крило Матері мотилів", g: "n", craftTier: 3, price: 400, description: "Рідкісний трофей Матері мотилів: крило, з якого досі сиплеться сонний пил. Серце комплектів розбійника й мисливця." },
  necken_string: { name: "Струна Неккена",   g: "f", craftTier: 3, price: 400, description: "Рідкісний трофей Неккена: струна його скрипки, що й досі тихо співає. Серце комплектів мага води й мага вітру." },
  rot_rose:      { name: "Тлінна троянда",   g: "f", craftTier: 3, price: 400, description: "Рідкісний трофей Тлінного садівника: троянда, що цвіте й гниє водночас. Серце комплектів мага землі й монаха." },
  dawn_eye:      { name: "Око світанку",     g: "n", craftTier: 3, price: 400, description: "Рідкісний трофей Верховного мага ліосальвів: кришталь із серця рунного кола. Серце комплектів мага вогню й жерця." },
  gullin_tusk:   { name: "Ікло Гуллінбурсті", g: "n", craftTier: 3, price: 400, description: "Рідкісний трофей Тіні Гуллінбурсті: ікло, наполовину зі світла, наполовину з диму. Серце комплектів лицаря й паладина." },
  beli_bronze:   { name: "Бронза Белі",      g: "f", craftTier: 3, price: 400, description: "Рідкісний трофей Белі: уламок його бронзової сокири, ще теплий від Хеллиного диму. Серце комплектів воїна, берсерка й шамана." },
  // ---------- Тір 4 — сталь ванів (Ванагейм) ----------
  steel_ingot:   { name: "Сталевий злиток",   g: "m", craftTier: 4, price: 90,  description: "Залізо, двічі перепалене з вугіллям і загартоване в морській воді, як учать ванські ковалі. Переплавка: 2 залізні злитки + 2 вугілля." },
  platinum_ore:  { name: "Платинова руда",    g: "f", craftTier: 4, price: 50,  description: "Біла руда з морського дна біля Ноатуну. Переплавляється на платинові злитки." },
  platinum_ingot:{ name: "Платиновий злиток", g: "m", craftTier: 4, price: 130, description: "Біла платина для прикрас тіру 4." },
  yew_wood:      { name: "Тисова деревина",   g: "f", craftTier: 4, price: 20,  description: "Темний пружний тис Ванагейму — на луки, посохи й держаки сокир." },
  seal_leather:  { name: "Тюленяча шкіра",    g: "f", craftTier: 4, price: 40,  description: "Шкіра з узбережжя Бухти Ран, не боїться солоної води. Обмотки руків'їв, ремені броні, колчани." },
  amber:         { name: "Бурштин",           g: "m", craftTier: 4, price: 90,  description: "Застиглі сльози Фрейї, що шукала свого чоловіка Ода. Серце бурштинових сфер." },
  pearl:         { name: "Перлина",           g: "f", craftTier: 4, price: 110, description: "Біла перлина з Бухти Ран — для платинових прикрас." },
  // ---------- Тір 5 — двергська сталь (Свартальвгейм) ----------
  darksteel_ingot:{ name: "Злиток двергської сталі", g: "m", craftTier: 5, price: 250, description: "Чорна сталь із кузень Брокка й Ейтрі. Переплавка: 2 сталеві злитки + 3 вугілля в рунному горні." },
  ironwood:      { name: "Залізне дерево",    g: "n", craftTier: 5, price: 60,  description: "Деревина з підземних гаїв Нідавелліру, важка й тверда, як метал. Держаки, посохи, луки." },
  lizard_leather:{ name: "Шкіра печерного ящура", g: "f", craftTier: 5, price: 120, description: "Луската шкіра, що не горить у жарі горна. Обмотки, ремені й колчани двергів." },
  rock_crystal:  { name: "Гірський кришталь", g: "m", craftTier: 5, price: 220, description: "Чистий кришталь із печер Андварі. Серце криштальних сфер." },
  rune_gem:      { name: "Рунний самоцвіт",   g: "m", craftTier: 5, price: 300, description: "Самоцвіт із глибин Нідавелліру, у якому дверги вирізали руну. Для прикрас і навершя посохів." },
  // ---------- Тір 6 — небесний метал Асгарду ----------
  celestial_ore: { name: "Небесна руда",      g: "f", craftTier: 6, price: 250, description: "Уламки, що падають з неба над Асгардом. Переплавляється на злитки небесного металу." },
  celestial_ingot:{ name: "Злиток небесного металу", g: "m", craftTier: 6, price: 600, description: "Білий метал зі світлом усередині — з нього кують зброю ейнгер'їв." },
  sun_gold_ingot:{ name: "Злиток сонячного золота", g: "m", craftTier: 6, price: 400, description: "Золото, переплавлене під небесним ковадлом у промені Соль. Переплавка: 3 золоті злитки." },
  white_ash:     { name: "Білий ясен",        g: "m", craftTier: 6, price: 150, description: "Світла деревина з гаїв Гладсгейму — на луки, посохи й держаки." },
  eagle_feather: { name: "Орлине перо",       g: "n", craftTier: 6, price: 200, description: "Перо з крила орла, що сидить на вершині Іггдрасиля. Оперення стріл, оздоби луків і посохів." },
  bifrost_shard: { name: "Уламок Біфросту",   g: "m", craftTier: 6, price: 700, description: "Шматочок райдужного мосту між Мідгардом і Асгардом. Серце райдужних сфер і сонячних прикрас." },
  // ---------- Тір 7 — Іггдрасиль ----------
  ygg_heartwood: { name: "Серцевина Іггдрасиля", g: "f", craftTier: 7, price: 1500, description: "Окам'яніла серцевина Світового Дерева, твердіша за будь-який метал. З неї вирізають зброю." },
  ygg_bark:      { name: "Кора Іггдрасиля",   g: "f", craftTier: 7, price: 900,  description: "Кора Світового Дерева, яку не прорубає навіть меч Сурта. Броня й щити." },
  ygg_root:      { name: "Корінь Іггдрасиля", g: "m", craftTier: 7, price: 900,  description: "Живий корінь, що досі шукає воду. Посохи, ремені й переплетення броні." },
  ygg_sap:       { name: "Золотий сік Іггдрасиля", g: "m", craftTier: 7, price: 1200, description: "Кров Іггдрасиля — золотий сік, що загоює рани Дерева. Скріплює кожну річ тіру 7." },
  mimir_water:   { name: "Вода з джерела Мімира", g: "f", craftTier: 7, price: 2500, description: "Крапля мудрості з-під кореня Дерева, за ковток якої Одін віддав око. Серце Мімирових сфер." },
  star_spark:    { name: "Зоряна іскра",      g: "f", craftTier: 7, price: 3000, description: "Іскра Муспельгейму, яку боги колись прибили до неба зорею. Для зоряних прикрас." }
};
for (const [id, m] of Object.entries(CRAFT_MATERIALS)) {
  ITEMS[id] = { name: m.name, g: m.g, craftTier: m.craftTier, type: "material", price: m.price,
                stackable: true, maxStack: MATERIAL_STACK, noShop: true, description: m.description };
}
// Небесна іскра — лише легендарна, без інших рідкостей
ITEMS.heavenly_spark = {
  name: "Небесна іскра", type: "material", grade: "legendary", noGrades: true, price: 1000,
  stackable: true, maxStack: MATERIAL_STACK, noShop: true,
  description: "Вогник з горна Сварога. Без нього легендарна річ майже не народжується. Згоряє при куванні."
};

// Рід назв наявних матеріалів (для назв магічних/епічних/легендарних стопок)
Object.assign(ITEMS.rat_tail, { g: "m" }); Object.assign(ITEMS.rat_skin, { g: "f" });
Object.assign(ITEMS.wolf_pelt, { g: "f" }); Object.assign(ITEMS.wolf_fang, { g: "n" });
Object.assign(ITEMS.white_pelt, { g: "f" }); Object.assign(ITEMS.slime_gel, { g: "m" });

// ---------- РІДКІСТЬ МАТЕРІАЛІВ ----------
// Кожен матеріал має 4 рідкості — 4 окремі стопки: <id> (звичайна), <id>_magic, <id>_epic, <id>_legendary.
// Зламаних матеріалів немає. Рідкість показує рамка клітинки (як у речей) і колір назви.
const MATERIAL_GRADES = {
  magic:     { mult: 2.5, adj: { m: "Магічний",    f: "Магічна",    n: "Магічне",    pl: "Магічні" } },
  epic:      { mult: 6,   adj: { m: "Епічний",     f: "Епічна",     n: "Епічне",     pl: "Епічні" } },
  legendary: { mult: 20,  adj: { m: "Легендарний", f: "Легендарна", n: "Легендарне", pl: "Легендарні" } }
};
const lowerFirst = s => s.charAt(0).toLowerCase() + s.slice(1);
for (const [id, base] of Object.entries(ITEMS)) {
  if (base.type !== "material" || base.noGrades || base.gradeOf) continue;
  base.grade = "common";
  for (const [gr, conf] of Object.entries(MATERIAL_GRADES)) {
    ITEMS[`${id}_${gr}`] = {
      ...base, grade: gr, gradeOf: id,
      name: `${conf.adj[base.g || "m"]} ${lowerFirst(base.name)}`,
      price: Math.ceil(base.price * conf.mult), noShop: true
    };
  }
}
// Базовий матеріал за ID будь-якої рідкості: "iron_ingot_epic" → "iron_ingot"
function materialBase(id) { return ITEMS[id]?.gradeOf || id; }
// ID матеріалу потрібної рідкості: materialOfGrade("iron_ingot", "epic") → "iron_ingot_epic"
function materialOfGrade(id, grade) {
  const base = materialBase(id);
  return !grade || grade === "common" ? base : (ITEMS[`${base}_${grade}`] ? `${base}_${grade}` : base);
}

// ---------- КОМПЛЕКТИ (бонус за кілька вдягнених речей одного set) ----------
// pieces — скільки речей комплекту треба вдягнути (кільця/сережки рахуються кожна);
// bonusPct — відсоткові бонуси поверх уже підрахованих характеристик
//            (mpRegen: 50 — відновлення мани ×1,5).
const ITEM_SETS = {
  slime: {
    name: "Комплект слизу",
    pieces: 3,
    bonusPct: { mpRegen: 50 },
    text: "+50% до відновлення мани"
  }
};

// Скільки речей кожного комплекту вдягнено: { slime: 2, ... }
function equippedSetCounts(save) {
  const counts = {};
  for (const slot in save.equipment || {}) {
    const ref = save.equipment[slot];
    const id = ref && (typeof ref === "string" ? ref : ref.id);
    const set = ITEMS[id]?.set;
    if (set) counts[set] = (counts[set] || 0) + 1;
  }
  return counts;
}

// ---------- Допоміжні функції ----------

// Повертає опис предмета або null, якщо такого ID немає
function getItem(id) {
  return ITEMS[id] || null;
}

// Окремі іконки (assets/images/items/icon_<id>.webp, 256×256) — мають перевагу над спрайт-листом.
// Інші файли даних можуть додавати свої (data/runes.js → іконки рун icon_rune_<знак>.webp).
const ICON_FILES = new Set(["sword", "dagger", "axe", "bow", "staff", "shield", "quiver", "orb", "knife"]
  .flatMap(w => [1, 2, 3, 4, 5, 6, 7].map(t => `${w}_t${t}`)));
// Речі 4–7 виду: броня й прикраси (зброя — вище). Іконки — new_assets/*_T4_T7_all_assets.zip, вирівняні під розмір 1–3 виду
["steel", "dwarf", "asgard", "ygg"].forEach(m => ["head", "chest", "legs", "hands", "feet"].forEach(s => ICON_FILES.add(`${m}_${s}`)));
["ring", "amulet", "earring"].forEach(k => [4, 5, 6, 7].forEach(t => ICON_FILES.add(`${k}_t${t}`)));
// Мішечки, ключі данжів і матеріали кузні (спрайт-листи items_2: new_assets/new_assets/items/Items_2-1…3.png)
["pouch_small", "pouch_medium", "pouch_large", "key_cave_secret", "key_web_nest", "key_dark_throne",
 "heavenly_spark", "coal", "gem", "glass", "oak_wood", "ash_wood", "flax", "leather_strap", "flint", "lapis", "onyx",
 "copper_ore", "copper_ingot", "silver_ore", "silver_ingot", "iron_ore", "iron_ingot", "gold_ore", "gold_ingot",
 "key_alf_grove", "key_alf_lake", "key_alf_gardens", "key_alf_towers", "key_alf_freyr", "key_alf_beli",
 // матеріали тірів 4–7 (спрайт-лист new_assets/new_assets/items/Items_mats_t4-7.png)
 "steel_ingot", "platinum_ore", "platinum_ingot", "yew_wood", "seal_leather", "amber", "pearl", "darksteel_ingot", "ironwood", "lizard_leather", "rock_crystal", "rune_gem",
 "celestial_ore", "celestial_ingot", "sun_gold_ingot", "white_ash", "eagle_feather", "bifrost_shard", "ygg_heartwood", "ygg_bark", "ygg_root", "ygg_sap", "mimir_water", "star_spark"]
  .forEach(id => ICON_FILES.add(id));
const ICON_FILE_BASE = RPG.asset("assets/images/items/icon_");

// Стиль іконки предмета (окремий файл або клітинка спрайт-листа); null — іконки немає (буде заглушка)
function itemIconStyle(id) {
  const file = ITEMS[id]?.iconFile;                 // квестовий предмет може брати іконку іншої речі
  if (file && ICON_FILES.has(file)) id = file;
  // Магічний / епічний / легендарний матеріал — іконка звичайного (рідкість видно з рамки комірки)
  if (!ICON_FILES.has(id) && ITEMS[id]?.gradeOf && ICON_FILES.has(ITEMS[id].gradeOf)) id = ITEMS[id].gradeOf;
  if (ICON_FILES.has(id)) {
    return { backgroundImage: `url("${ICON_FILE_BASE}${id}.webp")`, backgroundSize: "100% 100%",
             backgroundPosition: "0 0", backgroundRepeat: "no-repeat" };
  }
  const icon = ITEMS[id]?.icon;
  const sheet = icon && ICON_SHEETS[icon[0]];
  if (!sheet) return null;
  return spriteStyle(IMG_BASE + icon[0] + ICON_EXT, sheet.cols, sheet.rows, ICON_SIZE, ICON_GAP, icon[1]);
}

// Старі ID предметів (до нового списку) → нові. Застосовується при завантаженні сейву.
const ITEM_RENAMES = {
  sword_wood: "sword_t1", sword_iron: "sword_t1", sword_steel: "sword_t1",
  dagger_rusty: "dagger_t1", club_spiked: "axe_t1",
  staff_oak: "staff_t1", staff_moon: "staff_t1",
  shield_wood: "shield_t1", shield_iron: "shield_t1",
  cap_leather: "linen_head", hood_wolf: "linen_head",
  shirt_linen: "linen_chest", armor_leather: "linen_chest", armor_wolf: "linen_chest",
  pants_linen: "linen_legs", pants_leather: "linen_legs",
  boots_simple: "linen_feet", boots_leather: "linen_feet",
  ring_copper: "ring_t1", ring_silver: "ring_t1", amulet_fang: "amulet_t1"
};

// Чи можна вдягнути предмет
function isEquippable(id) {
  return !!ITEMS[id]?.slot;
}

// Ціни торговця: продає за 150%, купує за 50% (мінімум 1 золотий)
const SHOP_SELL_RATE = 1.5;
const SHOP_BUY_RATE = 0.5;
function shopSellPrice(id) { return Math.ceil((ITEMS[id]?.price || 0) * SHOP_SELL_RATE); }
function shopBuyPrice(id)  { return Math.max(1, Math.floor((ITEMS[id]?.price || 0) * SHOP_BUY_RATE)); }

Object.assign(RPG, { MATERIAL_STACK, POTION_STACK,
  SLOTS, SLOT_GROUPS, slotsFor, ITEM_RENAMES, STAT_NAMES, ITEMS, getItem, ITEM_ICON_FILES: ICON_FILES, CRAFT_MATERIALS, MATERIAL_GRADES, materialBase, materialOfGrade, itemIconStyle, spriteStyle, ICON_SHEETS, isEquippable,
  OFFHAND_RULES, OFF_TYPE_NAMES, offHandAllowed, offHandRuleText, ITEM_SETS, equippedSetCounts,
  SHOP_SELL_RATE, SHOP_BUY_RATE, shopSellPrice, shopBuyPrice
});
})(window.RPG);

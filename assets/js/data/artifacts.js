// ============================================================
// data/artifacts.js — АРТЕФАКТИ професій (категорія «Артефакт», тип "artifact")
//
// Пасивні бонуси, поки артефакт вдягнений. Комірки — 4 у кожного героя з професією (тір 2+; Селянин — без них):
// data/items.js → SLOTS artifact1…artifact4, slot "artifact". Носить лише своя професія (classes).
// Однакові артефакти можна вдягати в кілька комірок (хоч усі 4) — бонуси всіх складаються (character.js → calcStats).
//
// На кожну професію — 8 видів (KINDS), рідкість у кожного виду фіксована: 2 звичайні, 2 магічні, 2 епічні, 2 легендарні.
// Який бонус і яка характеристика — задано для виду (CLASS_ART, MAIN); числа випадають при появі артефакта (RANGES):
//   звичайний   — один основний бонус: атака % (і сила магії), або шанс криту %, або сила криту %;
//   магічний    — те саме + одна основна характеристика (Сила / Спритність / Інтелект / Витривалість / Дух);
//   епічний     — те саме + одна другорядна характеристика в % (ухилення, блок, сила навичок);
//   легендарний — як епічний, але всі числа більші.
// «Атака, %» (attackPct) — character.js → calcStats множить на неї атаку й силу магії.
//
// Падають з ворогів від 31 рівня (світ 4 і далі), з малим шансом (DROP; data/enemies.js → rollLoot).
// Рідкість — завжди своя (фільтр здобичі й лічильник удачі їх не чіпають). Без гнізд під руни.
// GS — як у речей (gearscore.js: «Атака, %» — основна група), рівень для GS — 31 (gsLevel).
// Іконки — icon_artifact_<1…8>.webp (одна на вид, спільна для всіх професій) — додаються в ITEM_ICON_FILES,
// коли з'являться файли (ICON_READY); промти — H:\Game_NEW\Артефакти - іконки (промти).txt
// (варіант А — 8 спільних icon_artifact_<n>; варіант Б — свої icon_art_<клас>_<n>: тоді ICON_FILES.add(id) для кожного).
// Підключається після data/profsets.js (бере назви професій звідти).
// ============================================================

(function (RPG) {
  const EN = RPG.lang === "en";
  const L = (uk, en) => EN ? en : uk;

  const SLOT_COUNT = 4;
  const MIN_LEVEL = 31;                       // вороги якого рівня можуть дати артефакт
  const DROP = {
    chance: 0.004,                            // звичайний ворог — 0,4%
    boss: 0.05,                               // бос — 5%
    weights: { common: 55, magic: 28, epic: 13, legendary: 4 }   // яка рідкість випаде (з 8 видів професії)
  };
  // Межі чисел за рідкістю
  const RANGES = {
    main: { common: [2, 4], magic: [3, 6], epic: [5, 8], legendary: [7, 12] },   // атака % / шанс криту % / сила криту %
    attr: { magic: [2, 6], epic: [4, 8], legendary: [6, 10] },                   // основна характеристика
    sec:  { epic: [1, 5], legendary: [4, 8] }                                    // другорядна, %
  };
  const PRICE = { common: 300, magic: 800, epic: 2000, legendary: 5000 };

  // 8 видів: рідкість, назва-предмет, опис (іконка — icon_artifact_<номер>)
  const KINDS = [
    { r: "common", noun: L("Оберіг", "Charm"),
      desc: L("Вузлик із вовни й трав, зав'язаний на добру долю.", "A knot of wool and herbs tied for good fortune.") },
    { r: "common", noun: L("Кістяний талісман", "Bone Talisman"),
      desc: L("Різьблена кісточка на шкіряному шнурку зі слідами давніх замовлянь.", "A carved bone on a leather cord, marked with old charms.") },
    { r: "magic", noun: L("Рунний камінь", "Runestone"),
      desc: L("Гладкий камінь із вирізаною руною, теплий у долоні.", "A smooth stone with a carved rune, warm in the palm.") },
    { r: "magic", noun: L("Срібна ладанка", "Silver Locket"),
      desc: L("Ладанка з дрібкою рідної землі — тримає дух міцним.", "A locket holding a pinch of native soil — it keeps the spirit strong.") },
    { r: "epic", noun: L("Тотем", "Totem"),
      desc: L("Вирізьблена фігурка звіра-покровителя. Уночі здається, що вона дихає.", "A carved figure of a guardian beast. At night it seems to breathe.") },
    { r: "epic", noun: L("Печатка", "Seal"),
      desc: L("Важка печатка зі знаком богів-покровителів цього шляху.", "A heavy seal bearing the sign of the patron gods of this path.") },
    { r: "legendary", noun: L("Око", "Eye"),
      desc: L("Камінь-око, що бачить на крок уперед. У бою іноді це все.", "A stone eye that sees one step ahead. In battle, sometimes that is everything.") },
    { r: "legendary", noun: L("Серце", "Heart"),
      desc: L("Застигле серце давнього героя цього шляху. Б'ється, коли ти в бою.", "The stilled heart of an ancient hero of this path. It beats when you fight.") }
  ];
  // Основний бонус кожного з 8 видів
  const MAIN = ["attackPct", "crit", "critDmg", "attackPct", "crit", "critDmg", "attackPct", "critDmg"];
  // Професії: основні характеристики (вид 1, 3, 5, 7 — перша; 2, 4, 6, 8 — друга) і другорядні для епічних / легендарних
  const CLASS_ART = {
    warrior:    { attrs: ["str", "vit"], sec: ["blockPhys", "dodge"] },
    knight:     { attrs: ["vit", "str"], sec: ["blockPhys", "blockMag"] },
    berserker:  { attrs: ["str", "agi"], sec: ["dodge", "skillPct"] },
    rogue:      { attrs: ["agi", "str"], sec: ["dodge", "skillPct"] },
    hunter:     { attrs: ["agi", "str"], sec: ["dodge", "skillPct"] },
    mage_fire:  { attrs: ["int", "spi"], sec: ["skillPct", "blockMag"] },
    mage_water: { attrs: ["int", "spi"], sec: ["skillPct", "blockMag"] },
    mage_wind:  { attrs: ["int", "agi"], sec: ["dodge", "skillPct"] },
    mage_earth: { attrs: ["int", "vit"], sec: ["blockPhys", "skillPct"] },
    paladin:    { attrs: ["str", "spi"], sec: ["blockMag", "blockPhys"] },
    priest:     { attrs: ["spi", "int"], sec: ["skillPct", "blockMag"] },
    monk:       { attrs: ["agi", "spi"], sec: ["dodge", "skillPct"] },
    shaman:     { attrs: ["int", "spi"], sec: ["skillPct", "dodge"] }
  };
  // Іконки артефактів, що вже є у assets/images/items (icon_artifact_<n>.webp) — дописати номери, коли з'являться файли
  const ICON_READY = [];

  const ART_IDS = [];                         // усі артефакти
  const BY_CLASS = {};                        // професія → [id × 8]
  for (const [cls, conf] of Object.entries(CLASS_ART)) {
    const set = RPG.PROF_SETS?.[cls];
    const of = set?.of || RPG.CLASSES?.[cls]?.name || cls;
    const clsName = RPG.CLASSES?.[cls]?.name || cls;
    BY_CLASS[cls] = [];
    KINDS.forEach((k, i) => {
      const id = `art_${cls}_${i + 1}`;
      RPG.ITEMS[id] = {
        name: EN ? `${k.noun} of ${of}` : `${k.noun} ${of}`,
        type: "artifact", slot: "artifact", classes: [cls], kind: i + 1,
        rarityFixed: k.r, gsLevel: MIN_LEVEL,
        artifact: { main: MAIN[i], attr: k.r === "common" ? null : conf.attrs[i % 2], sec: k.r === "epic" || k.r === "legendary" ? conf.sec[i % 2] : null },
        price: PRICE[k.r], noShop: true,
        iconFile: ICON_READY.includes(i + 1) ? `artifact_${i + 1}` : undefined,
        description: k.desc + " " + L(`Артефакт професії «${clsName}»: бонуси діють, поки він вдягнений.`,
                                      `An artifact of the ${set?.cls || cls} profession: its bonuses work while it is worn.`)
      };
      ART_IDS.push(id);
      BY_CLASS[cls].push(id);
    });
  }
  for (const n of ICON_READY) RPG.ITEM_ICON_FILES?.add(`artifact_${n}`);

  const rnd = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
  // Числа нового артефакта (rarity.js → makeItem): { attackPct | crit | critDmg, [атрибут], [другорядна] }
  function rollArtifactAffixes(id) {
    const it = RPG.ITEMS[id];
    if (!it?.artifact) return {};
    const r = it.rarityFixed, a = it.artifact, aff = {};
    aff[a.main] = rnd(RANGES.main[r]);
    if (a.attr) aff[a.attr] = rnd(RANGES.attr[r]);
    if (a.sec) aff[a.sec] = rnd(RANGES.sec[r]);
    return aff;
  }

  // Чи є в героя комірки артефактів: лише з професією (тір 2 і вище)
  function hasArtifactSlots(save) {
    return (RPG.getClass(save.character.classId).tier || 1) >= 2;
  }

  // Артефакт зі здобичі ворога (data/enemies.js → rollLoot): id або null
  function rollArtifactDrop(enemyId) {
    const e = RPG.ENEMIES?.[enemyId];
    if (!e || e.level < MIN_LEVEL) return null;
    if (Math.random() >= (e.boss ? DROP.boss : DROP.chance)) return null;
    const total = Object.values(DROP.weights).reduce((a, b) => a + b, 0);
    let x = Math.random() * total, r = "common";
    for (const [k, w] of Object.entries(DROP.weights)) { x -= w; if (x <= 0) { r = k; break; } }
    const pool = ART_IDS.filter(id => RPG.ITEMS[id].rarityFixed === r);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  Object.assign(RPG, {
    ARTIFACTS: { SLOT_COUNT, MIN_LEVEL, DROP, RANGES, KINDS, MAIN, CLASS_ART, IDS: ART_IDS, BY_CLASS },
    rollArtifactAffixes, hasArtifactSlots, rollArtifactDrop
  });
})(window.RPG);

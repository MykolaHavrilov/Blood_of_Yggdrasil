// ============================================================
// rarity.js — РІДКІСТЬ ЗБРОЇ ТА БРОНІ
//
// Рідкість мають зброя, щити, броня, каблучки та амулети.
// У каблучок/амулетів «основа» — усі їхні власні бонуси (зламана: ×0.7, без додаткових).
// 1 broken    — сірі, «Зламана»:   лише атака/захист (×0.7)
// 2 common    — білі, «Звичайна»:  атака/захист + власні бонуси речі
//                                    (з бою: може додатися 1 атрибут і 1 другорядна)
// 3 magic     — сині, «Магічна»:   ×1.15; 1 атрибут більшого значення
//                                    АБО 2 атрибути + 1 другорядна
// 4 epic      — фіолетові, «Епічна»: ×1.3; 2 випадкові атрибути + 2–3 другорядні
// 5 legendary — помаранчеві, «Легендарна»: ×1.5; 2–3 атрибути + 3–4 другорядні,
//                                    крит/ухилення/швидкість додаються після першого ліміту (остаточні межі 100% / 70% / 250–450 — і для них)
//
// «Сила криту, %» (critDmg) випадає лише на зброї та сережках (SECONDARY → only); межа — 500% (stats.js).
// Швидкість (speed) — лише взуття (там завжди один з бонусів), рукавиці, каблучки й амулет.
//
// Однакові бонуси, що випали двічі, складаються.
//
// Предмет у сейві (інвентар, скриня, екіпірування):
//   { id: "sword_iron", qty: 1, r: "magic", aff: { str: 2, crit: 1 } }
//   r   — рідкість, aff — випадкові бонуси (для common з магазину — немає)
//
// Шанси випадіння + прихований лічильник удачі: save.lootLuck
//   на кожні 200 білих речей — 30–40 синіх, 10–15 фіолетових і мінімум 1 легендарна.
//   Після легендарної лічильник легендарних починається спочатку, але
//   базовий мізерний шанс діє завжди (тож 2–3 легендарні підряд можливі).
//
// Підключається ПІСЛЯ items.js і stats.js, ДО save.js і character.js.
// ============================================================

(function (RPG) {
  const RARITY_ORDER = ["broken", "common", "magic", "epic", "legendary"];

  const RARITIES = {
    broken:    { level: 1, name: "Зламана",    color: "#9a9a9a", coreMult: 0.7,  priceMult: 0.4 },
    common:    { level: 2, name: "Звичайна",   color: "#e8e8e8", coreMult: 1.0,  priceMult: 1 },
    magic:     { level: 3, name: "Магічна",    color: "#4f8dff", coreMult: 1.15, priceMult: 2.5 },
    epic:      { level: 4, name: "Епічна",     color: "#b265ff", coreMult: 1.3,  priceMult: 6 },
    legendary: { level: 5, name: "Легендарна", color: "#ff9d2e", coreMult: 1.5,  priceMult: 20 }
  };

  // Базові шанси (відносні ваги) для кожної речі, що випала з ворога
  // ≈ 50% / 40% / 7% / 2,5% / 0,1% — на 200 білих ≈ 35 синіх, 12 фіолетових, 1 легендарна
  const DROP_WEIGHTS = { broken: 50, common: 40, magic: 7, epic: 2.5, legendary: 0.1 };

  // Прихований лічильник
  const LUCK = {
    window: 200,          // вікно — 200 білих речей
    magic: [30, 40],      // скільки синіх має бути у вікні
    epic: [10, 15],       // скільки фіолетових
    legendaryEvery: 200   // гарантована легендарна не пізніше ніж через 200 білих
  };

  // Які предмети мають рідкість
  const RARITY_TYPES = ["weapon", "shield", "offhand", "armor", "accessory", "artifact"];

  // «Параметри атаки/захисту» — те, що лишається навіть у зламаної речі
  const CORE_KEYS = {
    weapon: ["attack", "magic"],
    shield: ["defense", "blockPhys"],
    armor:  ["defense"],
    offhand: "all",    // колчан / сфера / малий кинджал: усі власні бонуси — основа
    accessory: "all"   // каблучки/амулети/сережки: усі їхні власні бонуси — основа речі
  };
  // Відсоткові та дробові характеристики округлюємо до десятих
  const DECIMAL_KEYS = ["crit", "dodge", "blockPhys", "blockMag", "hpRegen", "mpRegen"];

  // Основні характеристики (атрибути) і другорядні
  const ATTR_KEYS = ["str", "agi", "int", "vit", "spi"];
  const SPEED_SLOTS = ["feet", "hands", "ring", "amulet"];
  const SECONDARY = {
    // [мін, макс] для рівнів сили бонусу 1..4; scale — чи росте з рівнем речі
    hp:           { tiers: [[5, 8], [10, 15], [15, 25], [25, 40]], scale: true },
    mp:           { tiers: [[4, 6], [8, 12], [12, 20], [20, 30]], scale: true },
    magicDefense: { tiers: [[1, 2], [2, 3], [3, 5], [5, 8]], scale: true },
    crit:         { tiers: [[1, 1], [1, 2], [2, 3], [3, 5]] },
    dodge:        { tiers: [[1, 1], [1, 2], [2, 3], [3, 5]] },
    // Швидкість: лише взуття (там — обов'язково, rollAffixes), рукавиці, каблучки й амулет
    speed:        { tiers: [[1, 1], [1, 2], [2, 3], [3, 4]], only: it => SPEED_SLOTS.includes(it.slot) },
    blockPhys:    { tiers: [[1, 2], [2, 3], [3, 4], [4, 6]] },
    blockMag:     { tiers: [[1, 2], [2, 3], [3, 4], [4, 6]] },
    skillPct:     { tiers: [[1, 2], [2, 3], [3, 5], [5, 8]] },   // Сила навичок, %: і фізичні, і магічні навички, і лікування (battle.js → skillMul)
    hpRegen:      { tiers: [[0.5, 0.5], [0.5, 1], [1, 1.5], [1.5, 2.5]], step: 0.5 },
    mpRegen:      { tiers: [[0.5, 0.5], [0.5, 1], [1, 1.5], [1.5, 2.5]], step: 0.5 },
    // Сила криту, %: лише зброя (і в лівій руці: друга зброя, малий кинджал) та сережки;
    // на щитах, сферах, сагайдаках, броні, каблучках й амулетах не випадає (only)
    critDmg:      { tiers: [[2, 4], [4, 7], [7, 11], [11, 16]], only: it => it.type === "weapon" || it.offType === "knife" || it.slot === "earring" }
  };
  const ATTR_TIERS = [[1, 1], [2, 2], [2, 3], [3, 5]];

  // Характеристики, ліміт яких може перевищити лише легендарна річ
  const LEGEND_OVERCAP = ["crit", "dodge", "speed"];

  // ---------- Допоміжне ----------
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function refId(ref) { return typeof ref === "string" ? ref : ref?.id; }

  function hasRarity(id) {
    return RARITY_TYPES.includes(RPG.ITEMS[id]?.type);
  }

  function rarityOf(ref) {
    if (!ref || typeof ref === "string") return "common";
    return RARITIES[ref.r] ? ref.r : "common";
  }

  function levelScale(id) {
    return 1 + ((RPG.ITEMS[id]?.levelReq || 1) - 1) * 0.15;
  }

  function rollRange([min, max], step = 1) {
    const n = Math.round((max - min) / step);
    return min + Math.floor(Math.random() * (n + 1)) * step;
  }

  function addTo(obj, key, val) {
    obj[key] = Math.round(((obj[key] || 0) + val) * 10) / 10;
  }

  function rollAttr(aff, id, tier) {
    const v = Math.max(1, Math.round(rollRange(ATTR_TIERS[tier - 1]) * levelScale(id)));
    addTo(aff, pick(ATTR_KEYS), v);
  }

  // force — саме цей бонус (швидкість на взутті); інакше — випадковий з дозволених для цієї речі.
  // Обмеження only стосується лише свого бонусу: решта другорядних випадає, як і раніше
  function rollSecondary(aff, id, tier, force = null) {
    const it = RPG.ITEMS[id] || {};
    const key = force || pick(Object.keys(SECONDARY).filter(k => !SECONDARY[k].only || SECONDARY[k].only(it)));
    const def = SECONDARY[key];
    let v = rollRange(def.tiers[tier - 1], def.step || 1);
    if (def.scale) v = Math.max(1, Math.round(v * levelScale(id)));
    addTo(aff, key, v);
  }

  // Випадкові бонуси для рідкості. fromShop — магазинна біла річ без сюрпризів.
  function rollAffixes(id, r, fromShop = false) {
    const aff = {};
    // Взуття: перший другорядний бонус — завжди швидкість (у білого взуття з бою — завжди є)
    const first = RPG.ITEMS[id]?.slot === "feet" ? "speed" : null;
    switch (r) {
      case "common":
        if (!fromShop) {
          if (Math.random() < 0.3) rollAttr(aff, id, 1);
          if (first || Math.random() < 0.3) rollSecondary(aff, id, 1, first);
        }
        break;
      case "magic":
        if (Math.random() < 0.5) rollAttr(aff, id, 2);          // 1 атрибут, але більший
        else { rollAttr(aff, id, 1); rollAttr(aff, id, 1); }    // або одразу 2
        rollSecondary(aff, id, 1, first);
        break;
      case "epic":
        rollAttr(aff, id, 3); rollAttr(aff, id, 3);
        for (let i = RPG.randInt(2, 3); i > 0; i--) rollSecondary(aff, id, 2, i === 1 ? first : null);
        break;
      case "legendary":
        for (let i = RPG.randInt(2, 3); i > 0; i--) rollAttr(aff, id, 4);
        for (let i = RPG.randInt(3, 4); i > 0; i--) rollSecondary(aff, id, 3, i === 1 ? first : null);
        break;
    }
    return aff;
  }

  // ---------- Гнізда під руни (оновлення рун; Книга Сварога · друга) ----------
  // Шанс на гнізда кожна річ отримує одразу, коли з'являється (бій, кузня, магазин); старі речі — один раз
  // при завантаженні сейву (normalizeRef). Гравець бачить гнізда лише після прочитання книги рун (save.books.runesRead).
  //   ref.sockets — скільки гнізд (0 — немає), ref.runes — [id руни | null, …] довжиною sockets
  const SOCKETS = { chance: 0.40, count: { broken: [1, 1], common: [1, 1], magic: [1, 2], epic: [3, 3], legendary: [4, 4] } };
  function rollSockets(ref) {
    const [lo, hi] = SOCKETS.count[RARITIES[ref.r] ? ref.r : "common"];
    const n = Math.random() < SOCKETS.chance ? lo + Math.floor(Math.random() * (hi - lo + 1)) : 0;
    ref.sockets = n;
    if (n) ref.runes = Array(n).fill(null);
    else delete ref.runes;
    return ref;
  }

  // ---------- Слоти характеристик (рішення користувача 2026-11-25; таблиця «Речі — характеристики за рідкістю.xlsx» → data/itemslots.js) ----------
  // Слотів: зламана 1, звичайна 4 (слоти 2–4 — кожен з шансом 45%, лише з бою чи кузні; з магазину — тільки слот 1),
  // магічна 5, епічна 7, легендарна 9. Сила величин — за світом речі (рівень речі levelReq), а не за рідкістю
  // (рішення користувача 2026-11-25): світи 1–2 (рівні 1–24) — 1, 3–5 (25–39) — 2, 6–7 (40–49) — 3, 8–9 (50+) — 4.
  // Слот 1 — випадковий вид зі свого списку; величина — число речі (атака / захист…), а для відсоткових — з таблиці.
  // Однакові значення слотів 2–9 складаються в одне (ref.aff); слот 1 — окремо (ref.s1, ref.s1v).
  //   { id: "sword_t1", qty: 1, r: "epic", s1: "attack", aff: { crit: 25, hp: 18 } }
  // Професійні комплекти — теж зі слотами. Речі зі старих сейвів (без s1) лишаються на старих правилах.
  const SLOT_COUNT = { broken: 1, common: 4, magic: 5, epic: 7, legendary: 9 };
  const SLOT_POWER_BY_LEVEL = [[50, 4], [40, 3], [25, 2], [1, 1]];     // [від рівня речі, сила]
  const PROF_POWER_CHANCE3 = 0.5;   // комплекти професій: шанс сили 3 (інакше 2)
  function slotPower(id) {
    const lvl = RPG.ITEMS[id]?.levelReq || 1;
    return SLOT_POWER_BY_LEVEL.find(([from]) => lvl >= from)[1];
  }
  const COMMON_SLOT_CHANCE = 0.45;
  const MAIN_FLAT = ["attack", "magic", "defense", "magicDefense", "hp", "mp"];
  // Відсоткові характеристики (у підказці — зі знаком %; гартування — +0,5 за рівень)
  const PCT_KEYS = ["crit", "dodge", "blockPhys", "blockMag", "skillPct", "critDmg", "attackPct",
                    "atkPct", "magicPct", "defensePct", "magicDefensePct", "hpPct", "hpRegenPct", "mpRegenPct"];
  // Гартування до +25 (v0.9.24): слот 1 — +4% (число) або +0,4 (відсоток) за рівень понад звичайне гартування (на +25 — +100% / +10)
  const TEMPER_SLOT_FLAT = 4;     // слот 1, число: +4% за рівень гартування (понад звичайне гартування)
  const TEMPER_SLOT_PCT = 0.4;    // слот 1, відсоток: +0,4% за рівень
  const isPctKey = k => PCT_KEYS.includes(k);
  const roundKey = (k, v) => (isPctKey(k) || DECIMAL_KEYS.includes(k)) ? Math.round(v * 10) / 10 : Math.round(v);

  function slotKind(id) {
    const it = RPG.ITEMS[id];
    if (!it || !RPG.ITEM_SLOT_POOLS || it.rarityFixed) return null;
    const k = it.type === "weapon" ? it.weaponType : it.type === "shield" ? "shield"
      : it.type === "offhand" ? it.offType : (it.type === "armor" || it.type === "accessory") ? it.slot : null;
    return RPG.ITEM_SLOT_POOLS[k] ? k : null;
  }
  function slotPools(id) { const k = slotKind(id); return k ? RPG.ITEM_SLOT_POOLS[k] : null; }
  function usesSlots(ref) { return !!slotKind(refId(ref)) && (typeof ref === "string" || !!ref?.s1); }
  // «Число речі» — найбільше з атаки / сили магії / захисту / магічного захисту
  function mainNumber(item) {
    const st = item.stats || {};
    return Math.max(0, ...["attack", "magic", "defense", "magicDefense"].map(k => st[k] || 0));
  }
  // Величина слоту 1 з числа речі (null — береться з таблиці)
  function s1Base(id, key) {
    const item = RPG.ITEMS[id];
    if (!item || !MAIN_FLAT.includes(key)) return null;
    return (item.stats?.[key] || 0) > 0 ? item.stats[key] : Math.max(1, mainNumber(item));
  }
  function slotRoll(key, power, id, low = false) {
    const def = RPG.ITEM_SLOT_VALUES?.[key];
    if (!def) return 0;
    const [a, b] = def.tiers[Math.max(1, Math.min(4, power)) - 1];
    const step = (a % 1 || b % 1) ? 0.1 : 1;
    let v = low ? a : rollRange([a, b], step);
    if (def.grow) v *= levelScale(id);
    return Math.max(step, roundKey(key, v));
  }
  function rollSlots(entry, opts) {
    const pools = slotPools(entry.id);
    const r = entry.r;
    // Комплект професії (рішення користувача 2026-11-25): сила величин — 2 або 3 з шансом 50/50, кидається раз на річ (ref.sp)
    const pw = RPG.ITEMS[entry.id]?.profSet ? (entry.sp = Math.random() < PROF_POWER_CHANCE3 ? 3 : 2) : slotPower(entry.id);
    entry.s1 = opts.fromShop ? pools[0][0] : pick(pools[0]);
    if (s1Base(entry.id, entry.s1) == null) entry.s1v = slotRoll(entry.s1, pw, entry.id, !!opts.fromShop);
    if (r === "broken" || opts.fromShop) return entry;
    const aff = {};
    // Комплект професії: «свої» характеристики (data/profsets.js → PROF_SLOT_FAVOR) — у PROF_SLOT_FAVOR_WEIGHT разів частіше
    const item = RPG.ITEMS[entry.id];
    const favor = item?.profSet ? new Set(RPG.PROF_SLOT_FAVOR?.[(item.classes || [])[0]] || []) : null;
    const pickSlot = pool => {
      if (!favor || !favor.size || !pool.some(k => favor.has(k))) return pick(pool);
      const w = RPG.PROF_SLOT_FAVOR_WEIGHT || 4, ws = pool.map(k => favor.has(k) ? w : 1);
      let x = Math.random() * ws.reduce((a, b) => a + b, 0);
      for (let i = 0; i < pool.length; i++) if ((x -= ws[i]) < 0) return pool[i];
      return pool[pool.length - 1];
    };
    for (let s = 1; s < SLOT_COUNT[r]; s++) {
      if (r === "common" && Math.random() >= COMMON_SLOT_CHANCE) continue;
      const key = pickSlot(pools[s]);
      addTo(aff, key, slotRoll(key, pw, entry.id));
    }
    if (Object.keys(aff).length) entry.aff = aff;
    return entry;
  }

  // Створити екземпляр речі (для інвентаря/скрині)
  function makeItem(id, r = "common", opts = {}) {
    if (!hasRarity(id)) return { id, qty: 1 };
    // Артефакт (data/artifacts.js): рідкість — своя, числа — свої, гнізд немає
    if (RPG.ITEMS[id].type === "artifact") {
      const aff = RPG.rollArtifactAffixes ? RPG.rollArtifactAffixes(id) : {};
      return { id, qty: 1, r: RPG.ITEMS[id].rarityFixed || "common", aff, sockets: 0 };
    }
    if (!RARITIES[r]) r = "common";
    const entry = { id, qty: 1, r };
    if (slotKind(id)) rollSlots(entry, opts);
    else {
      const aff = rollAffixes(id, r, opts.fromShop);
      if (Object.keys(aff).length) entry.aff = aff;
    }
    rollSockets(entry);
    return entry;
  }

  // ---------- Шанс рідкості + прихований лічильник ----------
  function newLuck() {
    return { commons: 0, magic: 0, epic: 0, sinceLegendary: 0 };
  }

  function weightedRarity() {
    const total = RARITY_ORDER.reduce((s, r) => s + DROP_WEIGHTS[r], 0);
    let x = Math.random() * total;
    for (const r of RARITY_ORDER) {
      x -= DROP_WEIGHTS[r];
      if (x <= 0) return r;
    }
    return "common";
  }

  function rollRarity(save) {
    const L = save.lootLuck = Object.assign(newLuck(), save.lootLuck || {});
    let r;
    if (L.sinceLegendary >= LUCK.legendaryEvery) {
      r = "legendary";                                   // гарантована
    } else {
      r = weightedRarity();
      const progress = L.commons / LUCK.window;
      // Верхня межа у вікні: зайві сині / фіолетові стають білими
      if (r === "magic" && L.magic >= LUCK.magic[1]) r = "common";
      if (r === "epic" && L.epic >= LUCK.epic[1]) r = "common";
      // Захист від невдачі: якщо синіх/фіолетових менше, ніж має бути
      if (r === "broken" || r === "common") {
        if (L.epic < Math.round(LUCK.epic[0] * progress)) r = "epic";
        else if (L.magic < Math.round(LUCK.magic[0] * progress)) r = "magic";
      }
    }

    if (r === "common") { L.commons++; L.sinceLegendary++; }
    if (r === "magic") L.magic++;
    if (r === "epic") L.epic++;
    if (r === "legendary") L.sinceLegendary = 0;      // таймер легендарних — спочатку
    if (L.commons >= LUCK.window) { L.commons = 0; L.magic = 0; L.epic = 0; }
    return r;
  }

  // ---------- Гартування в Горні Сварога (рішення користувача 2026-11-17; дії — craft.js → temperItem) ----------
  // ref.up = 1…25 (0 — не пишеться), ref.upB = { характеристика: скільки разів влучила віха (1…4) } — віхи +4, +8, +12, +16, +20, +24.
  // Приріст за рівень росте рівномірно від +2% (на +1) до +8% (на +10): разом на +10 — +50% до основи.
  // Основа: зброя — атака / сила магії; броня й щит — захист; прикраси — магічний захист;
  // предмет у другу руку — атака / магія, а без них — захист чи магічний захист.
  // Гартування +1…+25 (рішення користувача 2026-11-28; до v0.9.24 — +1…+10, +10 = +50%, віхи +3/+6/+10).
  // Основа речі: +1…+24 — плавно, кожен рівень дає трохи більше за попередній (від +1% до ≈ +4,8%), разом +70% на +24;
  // +25 — стрибок до +100%. Віхи — кожні 4 рівні: бонус до випадкової характеристики речі (рішення користувача 2026-11-28):
  // разом до основи характеристики за 1 / 2 / 3 / 4 влучання — +50% / +100% / +200% / +400%; після 4-го влучання
  // характеристика більше не розігрується (temperMilestoneKeys).
  const TEMPER_MAX = 25, TEMPER_TOP = 24, TEMPER_TOP_PCT = 70, TEMPER_MAX_PCT = 100;
  const TEMPER_STEP = Array.from({ length: TEMPER_MAX }, (_, i) => i < TEMPER_TOP
    ? 1 + (2 * TEMPER_TOP_PCT / TEMPER_TOP - 2) * i / (TEMPER_TOP - 1)
    : TEMPER_MAX_PCT - TEMPER_TOP_PCT);                                                       // % за рівень i+1
  const TEMPER_TOTAL = TEMPER_STEP.map((_, i) => Math.round(TEMPER_STEP.slice(0, i + 1).reduce((a, b) => a + b, 0) * 10) / 10);
  const TEMPER_MILESTONES = [4, 8, 12, 16, 20, 24];
  const TEMPER_MILESTONE_PCT = [50, 100, 200, 400];        // разом за 1…4 влучання в одну характеристику, % до основи
  const TEMPER_MILESTONE_CAP = TEMPER_MILESTONE_PCT.length;
  const milestonePct = n => (n > 0 ? TEMPER_MILESTONE_PCT[Math.min(n, TEMPER_MILESTONE_CAP) - 1] : 0);
  // Характеристики, у які ще може влучити віха: додатні й ще не мають 4 влучань
  function temperMilestoneKeys(ref) {
    const upB = (ref && typeof ref === "object" && ref.upB) || {};
    return Object.entries(itemStats(ref)).filter(([k, v]) => v > 0 && (upB[k] || 0) < TEMPER_MILESTONE_CAP).map(([k]) => k);
  }
  // Прибрати зайві влучання понад 4 (сейви до v0.9.25): надлишок переходить в інші характеристики
  function capTemperRef(ref, rng = Math.random) {
    if (!ref || typeof ref !== "object" || !ref.upB) return false;
    let extra = 0;
    for (const k in ref.upB) if (ref.upB[k] > TEMPER_MILESTONE_CAP) { extra += ref.upB[k] - TEMPER_MILESTONE_CAP; ref.upB[k] = TEMPER_MILESTONE_CAP; }
    while (extra-- > 0) {
      const keys = temperMilestoneKeys(ref);
      if (!keys.length) break;
      const k = keys[Math.floor(rng() * keys.length) % keys.length];
      ref.upB[k] = (ref.upB[k] || 0) + 1;
    }
    return true;
  }
  // Перерахунок віх речі за новими правилами (міграція сейву, save.js): старі ref.upB прибираються,
  // і для кожної віхи до поточного рівня — нове влучання в одну випадкову додатну характеристику
  function retemperRef(ref, rng = Math.random) {
    if (!ref || typeof ref !== "object" || !(ref.up > 0 || ref.upB)) return false;
    ref.up = Math.max(0, Math.min(TEMPER_MAX, ref.up | 0));
    delete ref.upB;
    const n = TEMPER_MILESTONES.filter(m => m <= ref.up).length;
    if (!n) return true;
    ref.upB = {};
    for (let i = 0; i < n; i++) {
      const keys = temperMilestoneKeys(ref);
      if (!keys.length) break;
      const k = keys[Math.floor(rng() * keys.length) % keys.length];
      ref.upB[k] = (ref.upB[k] || 0) + 1;
    }
    return true;
  }
  function temperLevel(ref) { return typeof ref === "object" && ref ? Math.max(0, Math.min(TEMPER_MAX, ref.up | 0)) : 0; }
  function temperPct(level) { return level > 0 ? TEMPER_TOTAL[Math.min(TEMPER_MAX, level) - 1] : 0; }
  function temperKeys(id) {
    if (id && typeof id === "object") { if (usesSlots(id)) return [id.s1]; id = id.id; }
    const item = RPG.ITEMS[id];
    if (!item) return [];
    const st = item.stats || {};
    const has = keys => keys.filter(k => (st[k] || 0) > 0);
    if (item.type === "weapon") return has(["attack", "magic"]);
    if (item.type === "armor" || item.type === "shield") return ["defense"];
    if (item.type === "accessory") return ["magicDefense"];
    if (item.type === "offhand") { const k = has(["attack", "magic"]); return k.length ? k : has(["defense", "magicDefense"]); }
    return [];
  }
  function canTemper(id) { const i = refId(id); return hasRarity(i) && (!!slotKind(i) || temperKeys(i).length > 0); }
  function addTemper(out, ref) {
    const up = temperLevel(ref);
    if (!up && !ref?.upB) return out;
    const base = { ...out };
    const p = temperPct(up) / 100;
    for (const k of temperKeys(refId(ref))) {
      if (!(k in out)) continue;
      const v = base[k] * (1 + p);
      out[k] = DECIMAL_KEYS.includes(k) ? Math.round(v * 10) / 10 : Math.round(v);
    }
    for (const [k, n] of Object.entries(ref.upB || {})) {
      if (!base[k]) continue;
      const add = base[k] * milestonePct(n) / 100;
      out[k] = DECIMAL_KEYS.includes(k) ? Math.round((out[k] + add) * 10) / 10 : Math.round(out[k] + add);
    }
    return out;
  }

  // ---------- Підсумкові характеристики речі ----------
  // Повертає { stats } — усі бонуси речі з урахуванням рідкості
  // Нові речі (слоти): частини окремо — слот 1 і складені слоти 2–9, з гартуванням
  //   { s1: { key, value, gain }, rest: { key: value }, restGain: { key: gain } }
  function slotParts(ref) {
    const id = refId(ref);
    const item = RPG.ITEMS[id];
    const r = rarityOf(ref);
    const obj = typeof ref === "object" ? ref : null;
    const key = obj ? ref.s1 : slotPools(id)[0][0];
    const b = s1Base(id, key);
    let v0 = b != null ? b * RARITIES[r].coreMult
      : (obj && ref.s1v != null ? ref.s1v * (r === "broken" ? RARITIES.broken.coreMult : 1) : slotRoll(key, (obj && ref.sp) || slotPower(id), id, true));
    v0 = b != null ? Math.max(1, Math.round(v0)) : roundKey(key, v0);
    const up = temperLevel(ref);
    let v = v0;
    if (up) {
      const p = temperPct(up) / 100;
      v = isPctKey(key) ? v0 * (1 + p) + TEMPER_SLOT_PCT * up : v0 * (1 + p + TEMPER_SLOT_FLAT * up / 100);
      v = roundKey(key, v);
    }
    const rest = {};
    if (obj && r !== "broken") for (const k in ref.aff || {}) addTo(rest, k, ref.aff[k]);
    const restGain = {};
    let s1gain = v - v0;
    // Віхи +4 / +8 / … / +24: +50% / +100% / +200% / +400% до основи обраної характеристики (основа — без гартування)
    for (const [k, n] of Object.entries(obj?.upB || {})) {
      if (k === key) { const add = roundKey(k, v0 * milestonePct(n) / 100); v = roundKey(k, v + add); s1gain = roundKey(k, s1gain + add); }
      else if (rest[k]) { const add = roundKey(k, rest[k] * milestonePct(n) / 100); rest[k] = roundKey(k, rest[k] + add); restGain[k] = add; }
    }
    return { s1: { key, value: v, gain: roundKey(key, s1gain) }, rest, restGain, item };
  }

  // Рядки опису речі: [{ key, value, gain }] — слот 1 першим, далі решта; gain — скільки додало гартування
  function itemStatLines(ref) {
    if (usesSlots(ref)) {
      const p = slotParts(ref);
      return [p.s1, ...Object.entries(p.rest).map(([key, value]) => ({ key, value, gain: p.restGain[key] || 0 }))];
    }
    const now = itemStats(ref);
    const plain = typeof ref === "object" && ref ? itemStats({ ...ref, up: 0, upB: undefined }) : now;
    return Object.entries(now).map(([key, value]) => ({ key, value, gain: roundKey(key, value - (plain[key] || 0)) }));
  }

  function itemStats(ref) {
    const id = refId(ref);
    const item = RPG.ITEMS[id];
    if (!item) return {};
    const base = item.stats || {};
    if (!hasRarity(id)) return { ...base };
    if (usesSlots(ref)) {
      const p = slotParts(ref);
      const out = { ...p.rest };
      addTo(out, p.s1.key, p.s1.value);
      return out;
    }

    const r = rarityOf(ref);
    const core = CORE_KEYS[item.type] || [];
    const out = {};
    for (const key in base) {
      if (core === "all" || core.includes(key)) {
        const v = base[key] * RARITIES[r].coreMult;
        if (DECIMAL_KEYS.includes(key)) out[key] = Math.max(base[key] > 0 ? 0.5 : -Infinity, Math.round(v * 10) / 10);
        else out[key] = base[key] > 0 ? Math.max(1, Math.round(v)) : Math.round(v);
      } else if (r !== "broken") {
        out[key] = base[key];                 // власні бонуси речі (не в зламаної)
      }
    }
    if (r !== "broken" && typeof ref === "object") {
      for (const key in ref.aff || {}) addTo(out, key, ref.aff[key]);
    }
    // Старі правила: hpRegen / mpRegen речі й бонусів записані «за 10 с» — відновлення тепер за 1 с (2026-11-25), ділимо на 10
    for (const k of ["hpRegen", "mpRegen"]) if (out[k] > 0) out[k] = Math.max(0.1, Math.round(out[k]) / 10);
    return typeof ref === "object" ? addTemper(out, ref) : out;
  }

  function itemName(ref) {
    const item = RPG.ITEMS[refId(ref)];
    const up = temperLevel(ref);
    return item ? item.name + (up ? ` +${up}` : "") : "???";
  }

  // «Залізний меч [Магічна]» — рідкість показуємо для зброї/броні
  function itemFullName(ref) {
    const id = refId(ref);
    if (!hasRarity(id)) return itemName(ref);
    return `${itemName(ref)} [${RARITIES[rarityOf(ref)].name}]`;
  }

  // Іконка: одна й та сама клітинка спрайт-листа для всіх рідкостей.
  // Рідкість показує CSS (рамка .rarity-*, сіра «зламана» .ri-broken).
  // null — іконки немає, буде заглушка з назвою.
  function itemIconRef(ref) {
    return RPG.itemIconStyle(refId(ref));
  }

  // Ціна продажу: ціна речі × рідкість + за кожну руну в гніздах — ціна продажу руни (половина її ціни; рідкісніша руна дорожча)
  function refSellPrice(ref) {
    const id = refId(ref);
    const base = RPG.shopBuyPrice(id);
    if (!hasRarity(id)) return base;
    return Math.max(1, Math.round(base * RARITIES[rarityOf(ref)].priceMult)) + runesSellPrice(ref);
  }
  function runesSellPrice(ref) {
    if (!ref || typeof ref !== "object" || !Array.isArray(ref.runes)) return 0;
    return ref.runes.reduce((n, rid) => n + (rid && RPG.ITEMS[rid] ? RPG.shopBuyPrice(rid) : 0), 0);
  }

  // Привести запис екіпірування / інвентаря до формату { id, qty, r }
  function normalizeRef(ref) {
    if (!ref) return null;
    if (typeof ref === "string") ref = { id: ref, qty: 1 };
    if (hasRarity(ref.id)) {
      if (!RARITIES[ref.r]) ref.r = "common";
      if (RPG.ITEMS[ref.id].rarityFixed) { ref.r = RPG.ITEMS[ref.id].rarityFixed; ref.sockets = 0; delete ref.runes; }
      ref.qty = 1;
      if (typeof ref.sockets !== "number") rollSockets(ref);          // речі зі старих сейвів — один розіграш
      else if (ref.sockets > 0) {
        if (!Array.isArray(ref.runes)) ref.runes = [];
        ref.runes = ref.runes.slice(0, ref.sockets).map(x => (RPG.ITEMS[x]?.type === "rune" ? x : null));
        while (ref.runes.length < ref.sockets) ref.runes.push(null);
      }
    }
    return ref;
  }

  // ---------- Фільтр здобичі (save.lootFilter) ----------
  // Речі обраних рідкостей, що випали в бою, одразу викидаються й не займають інвентар.
  //   save.lootFilter = { on: false, drop: { broken: true, common: false, ... } }
  // Вікно налаштування — кнопка-воронка на сторінці інвентаря (game.js → showLootFilter).
  function lootFilter(save) {
    const f = save.lootFilter = Object.assign({ on: false }, save.lootFilter || {});
    f.drop = Object.assign({}, f.drop || {});
    for (const r of RARITY_ORDER) f.drop[r] = !!f.drop[r];
    f.on = !!f.on;
    return f;
  }
  // true — річ цієї рідкості фільтр викидає (лише коли фільтр увімкнено)
  function isFilteredOut(save, r) {
    const f = save.lootFilter;
    return !!(f && f.on && f.drop && f.drop[r]);
  }
  // Чи фільтр щось реально викидає (увімкнено й обрано хоча б одну рідкість)
  function lootFilterActive(save) {
    const f = save.lootFilter;
    return !!(f && f.on && RARITY_ORDER.some(r => f.drop?.[r]));
  }

  Object.assign(RPG, {
    lootFilter, isFilteredOut, lootFilterActive,
    RARITY_ORDER, RARITIES, DROP_WEIGHTS, LUCK, LEGEND_OVERCAP, CORE_KEYS,
    refId, hasRarity, rarityOf, makeItem, rollRarity, newLuck,
    itemStats, itemStatLines, itemName, itemFullName,
    SLOT_COUNT, SLOT_POWER_BY_LEVEL, slotPower, COMMON_SLOT_CHANCE, PCT_KEYS, TEMPER_SLOT_FLAT, TEMPER_SLOT_PCT, slotKind, usesSlots, isPctKey,
    TEMPER_MAX, TEMPER_STEP, TEMPER_TOTAL, TEMPER_MILESTONES, TEMPER_MILESTONE_PCT, TEMPER_MILESTONE_CAP, temperMilestonePct: milestonePct, temperMilestoneKeys, capTemperRef, retemperRef, temperLevel, temperPct, temperKeys, canTemper, itemIconRef, refSellPrice, runesSellPrice, normalizeRef, SOCKETS, rollSockets
  });
})(window.RPG);

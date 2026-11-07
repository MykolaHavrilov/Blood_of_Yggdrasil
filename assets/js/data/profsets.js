// ============================================================
// data/profsets.js — КОМПЛЕКТИ БРОНІ ПРОФЕСІЙ (попередня версія)
//
// 12 професій × 5 частин (шолом, нагрудник, штани, наручі, чоботи), тір 3, з 25 рівня;
// + секретна (Шаман потойбіччя): креслення з Володаря Темного лісу, лише коли в групі є Шаман.
// Зброя професій — окремі комплекти з 2 речей (зброя + ліва рука), WEAPON_SETS нижче; креслення — з тих самих босів.
// Носить лише своя професія (classes), кує будь-хто — але лише за вивченим кресленням.
// Іконки — assets/images/items/icon_<id>.webp (prof_<клас>_<слот>, profw_<клас>_main / _off), додаються в ITEM_ICON_FILES;
// промти — H:\Game_NEW\Комплекти професій - броня і зброя (промти).txt. Поле icon лишається запасним (листи броні).
// Креслення (type "blueprint") падає з босів Альвгейму: кожен бос — 2 професії (BLUEPRINT_DROPS).
// «Використати» креслення в інвентарі — рецепт назавжди відкривається в кузні (save.story.blueprints).
// Бонуси комплекту — за 3 і 5 вдягнених частин (ITEM_SETS[…].steps; character.js → calcStats).
//
// Для зміни балансу: WEIGHT (база броні за вагою), EXTRA (додатки професії), SETS (бонуси),
// BLUEPRINT_CHANCE (шанс креслення з боса), ARMOR_MATS / WEAPON_MATS / LOC_MAT / BOSS_MAT / DROP (матеріали рецептів і їх здобич).
// Підключається після даних і словника (i18n/en.js), перед i18n.js; на сторінці гри — після data/recipes.js (додає ITEMS, ITEM_SETS, RECIPES).
// ============================================================

(function (RPG) {
  // Назви й описи складаються тут же, тому англійські варіанти — поруч (L(укр, англ), мова — core.js → RPG.lang)
  const EN = RPG.lang === "en";
  const L = (uk, en) => EN ? en : uk;
  const SLOTS = ["head", "chest", "legs", "hands", "feet"];
  const SLOT_MULT = { head: 1, chest: 1.6, legs: 1.2, hands: 0.9, feet: 0.9 };
  const LEVEL = 25, TIER = 3;

  // База за вагою броні (на шолом; інші частини — × SLOT_MULT). hp на наручах і чоботах немає.
  const WEIGHT = {
    heavy:  { defense: 13, hp: 55, price: 700, icon: 10, noun: L({ head: "Шолом", chest: "Кіраса", legs: "Поножі", hands: "Наручі", feet: "Чоботи" }, { head: "Helm", chest: "Cuirass", legs: "Greaves", hands: "Vambraces", feet: "Boots" }) },
    medium: { defense: 9,  hp: 38, price: 650, icon: 5,  noun: L({ head: "Каптур", chest: "Куртка", legs: "Штани", hands: "Рукавиці", feet: "Чоботи" }, { head: "Hood", chest: "Jacket", legs: "Trousers", hands: "Gloves", feet: "Boots" }) },
    cloth:  { defense: 6,  hp: 26, price: 650, icon: 0,  noun: L({ head: "Вінець", chest: "Шати", legs: "Поли", hands: "Нарукавники", feet: "Черевики" }, { head: "Circlet", chest: "Robe", legs: "Skirts", hands: "Sleeves", feet: "Shoes" }) }
  };
  // Додатки професії (на шолом; × SLOT_MULT, відсотки — щонайменше 1)
  const EXTRA = {
    warrior:    { attack: 4, crit: 0.5 },
    knight:     { hp: 15, magicDefense: 3, blockPhys: 0.5 },
    berserker:  { attack: 5, crit: 0.8 },
    rogue:      { attack: 3, crit: 0.8, dodge: 0.8 },
    hunter:     { attack: 4, speed: 1 },
    mage_fire:  { magic: 5, mp: 20 },
    mage_water: { magic: 3, mp: 30, mpRegen: 0.3 },
    mage_wind:  { magic: 4, mp: 20, speed: 1 },
    mage_earth: { magic: 4, mp: 20, defense: 2 },
    paladin:    { attack: 2, magic: 2, magicDefense: 3 },
    priest:     { magic: 3, mp: 25, magicDefense: 3 },
    monk:       { attack: 3, dodge: 0.8, speed: 1 },
    shaman:     { attack: 3, magic: 3, mp: 15, magicDefense: 2 }
  };
  const DECIMAL = ["crit", "dodge", "blockPhys", "blockMag", "mpRegen", "hpRegen"];

  // Комплекти: професія, вага, назва, власник у родовому відмінку (для назв частин), бос, бонуси
  //   steps: [{ pieces, pct: {стат: %}, add: {стат: +число}, text }]
  const SETS = {
    warrior: { weight: "heavy", name: L("Обладунок Перунового дружинника", "Harness of Perun's Retinue"), of: L("Перунового дружинника", "Perun's Retinue"), cls: L(null, "warrior"), boss: "alf_boss_beli",
      steps: [{ pieces: 3, pct: { attack: 8 }, text: L("+8% до атаки", "+8% attack") }, { pieces: 5, pct: { hp: 10 }, add: { crit: 4 }, text: L("+10% до здоров'я, +4% до шансу крит. удару", "+10% health, +4% critical hit chance") }] },
    knight: { weight: "heavy", name: L("Лати Дубової Варти", "Plate of the Oak Watch"), of: L("Дубової Варти", "the Oak Watch"), cls: L(null, "knight"), boss: "alf_boss_gullinbursti",
      steps: [{ pieces: 3, pct: { defense: 10 }, text: L("+10% до захисту", "+10% defence") }, { pieces: 5, pct: { hp: 12 }, add: { blockPhys: 5 }, text: L("+12% до здоров'я, +5% до блоку фізичної шкоди", "+12% health, +5% physical damage block") }] },
    berserker: { weight: "heavy", name: L("Вовча шкура Ульфгеднара", "Wolfskin of the Úlfheðinn"), of: L("Ульфгеднара", "the Úlfheðinn"), cls: L(null, "berserker"), boss: "alf_boss_beli",
      steps: [{ pieces: 3, pct: { attack: 10 }, text: L("+10% до атаки", "+10% attack") }, { pieces: 5, pct: { speed: 5 }, add: { crit: 5 }, text: L("+5% до швидкості, +5% до шансу крит. удару", "+5% speed, +5% critical hit chance") }] },
    rogue: { weight: "medium", name: L("Вбрання Нічного лиса", "Garb of the Night Fox"), of: L("Нічного лиса", "the Night Fox"), cls: L(null, "rogue"), boss: "alf_boss_moths",
      steps: [{ pieces: 3, add: { crit: 4 }, text: L("+4% до шансу крит. удару", "+4% critical hit chance") }, { pieces: 5, pct: { attack: 8 }, add: { dodge: 5 }, text: L("+8% до атаки, +5% до ухилення", "+8% attack, +5% dodge") }] },
    hunter: { weight: "medium", name: L("Спорядження Уллрового лучника", "Gear of Ullr's Archer"), of: L("Уллрового лучника", "Ullr's Archer"), cls: L(null, "hunter"), boss: "alf_boss_moths",
      steps: [{ pieces: 3, pct: { attack: 8 }, text: L("+8% до атаки", "+8% attack") }, { pieces: 5, pct: { speed: 8 }, add: { crit: 3 }, text: L("+8% до швидкості, +3% до шансу крит. удару", "+8% speed, +3% critical hit chance") }] },
    mage_fire: { weight: "cloth", name: L("Шати Сварожича", "Robes of the Svarozhych"), of: L("Сварожича", "the Svarozhych"), cls: L(null, "fire mage"), boss: "alf_boss_high_mage",
      steps: [{ pieces: 3, pct: { magic: 8 }, text: L("+8% до сили магії", "+8% magic power") }, { pieces: 5, add: { skillPct: 8, crit: 3 }, text: L("+8% до сили навичок, +3% до шансу крит. удару", "+8% skill power, +3% critical hit chance") }] },
    mage_water: { weight: "cloth", name: L("Шати Дани", "Robes of Dana"), of: L("Дани", "Dana"), cls: L(null, "water mage"), boss: "alf_boss_necken",
      steps: [{ pieces: 3, pct: { mp: 12 }, text: L("+12% до мани", "+12% mana") }, { pieces: 5, pct: { magic: 8, mpRegen: 30 }, text: L("+8% до сили магії, +30% до відновлення мани", "+8% magic power, +30% mana regeneration") }] },
    mage_wind: { weight: "cloth", name: L("Шати Стрибожого вихору", "Robes of Stryboh's Whirlwind"), of: L("Стрибожого вихору", "Stryboh's Whirlwind"), cls: L(null, "wind mage"), boss: "alf_boss_necken",
      steps: [{ pieces: 3, pct: { speed: 6 }, text: L("+6% до швидкості", "+6% speed") }, { pieces: 5, pct: { magic: 8 }, add: { dodge: 4 }, text: L("+8% до сили магії, +4% до ухилення", "+8% magic power, +4% dodge") }] },
    mage_earth: { weight: "cloth", name: L("Шати Мокоші", "Robes of Mokosh"), of: L("Мокоші", "Mokosh"), cls: L(null, "earth mage"), boss: "alf_boss_gardener",
      steps: [{ pieces: 3, pct: { defense: 10 }, text: L("+10% до захисту", "+10% defence") }, { pieces: 5, pct: { magic: 8, hp: 10 }, text: L("+8% до сили магії, +10% до здоров'я", "+8% magic power, +10% health") }] },
    paladin: { weight: "heavy", name: L("Лати Даждьбожого лицаря", "Plate of Dazhboh's Knight"), of: L("Даждьбожого лицаря", "Dazhboh's Knight"), cls: L(null, "paladin"), boss: "alf_boss_gullinbursti",
      steps: [{ pieces: 3, pct: { defense: 8 }, text: L("+8% до захисту", "+8% defence") }, { pieces: 5, pct: { attack: 6, magic: 6 }, add: { blockMag: 5 }, text: L("+6% до атаки й сили магії, +5% до блоку магічної шкоди", "+6% attack and magic power, +5% magic damage block") }] },
    priest: { weight: "cloth", name: L("Ризи Волхва Велеса", "Vestments of the Magus of Veles"), of: L("Волхва Велеса", "the Magus of Veles"), cls: L(null, "priest"), boss: "alf_boss_high_mage",
      steps: [{ pieces: 3, pct: { mp: 12 }, text: L("+12% до мани", "+12% mana") }, { pieces: 5, pct: { magicDefense: 10 }, add: { skillPct: 10 }, text: L("+10% до сили навичок і лікування, +10% до магічного захисту", "+10% skill power and healing, +10% magic defence") }] },
    monk: { weight: "medium", name: L("Одіж Білобожого послушника", "Garments of Bilobog's Novice"), of: L("Білобожого послушника", "Bilobog's Novice"), cls: L(null, "monk"), boss: "alf_boss_gardener",
      steps: [{ pieces: 3, add: { dodge: 4 }, text: L("+4% до ухилення", "+4% dodge") }, { pieces: 5, pct: { speed: 6, hp: 8 }, text: L("+6% до швидкості, +8% до здоров'я", "+6% speed, +8% health") }] },
    // Секретна професія (quests.js → SHAMAN): як і всі, з 25 рівня професії; креслення — з Володаря Темного лісу і лише тоді,
    // коли в групі є Шаман потойбіччя (secret) — інакше про комплект ніхто не дізнається
    shaman: { weight: "medium", secret: true, matLoc: "alf_beli", name: L("Убрання Відреченого", "Garb of the Renouncer"), of: L("Відреченого", "the Renouncer"), cls: L(null, "shaman of the beyond"), boss: "forest_lord",
      steps: [{ pieces: 3, pct: { attack: 6, magic: 6 }, text: L("+6% до атаки й сили магії", "+6% attack and magic power") }, { pieces: 5, pct: { hp: 8 }, add: { skillPct: 10 }, text: L("+10% до сили навичок, +8% до здоров'я", "+10% skill power, +8% health") }] }
  };

  // ---------- Матеріали рецептів: усе — з Альвгейму ----------
  // з Шахти й Лісопилки Альвгейму (експедиції): золото, платина (руда → злиток), тис;
  // LOC_MAT — матеріал, що падає з усіх ворогів локації боса комплекту; BOSS_MAT — рідкісний, лише з цього боса.
  // Шаман бере матеріали Поля Белі (matLoc), хоч креслення — з Володаря Темного лісу.
  const LOC_MAT = { alf_grove: "silver_pollen", alf_lake: "mirror_scale", alf_gardens: "spring_shoot",
                    alf_towers: "dawn_shard", alf_freyr: "golden_bristle", alf_beli: "stag_antler" };
  const BOSS_OF_LOC = { alf_grove: "alf_boss_moths", alf_lake: "alf_boss_necken", alf_gardens: "alf_boss_gardener",
                        alf_towers: "alf_boss_high_mage", alf_freyr: "alf_boss_gullinbursti", alf_beli: "alf_boss_beli" };
  const BOSS_MAT = { alf_boss_moths: "moth_wing", alf_boss_necken: "necken_string", alf_boss_gardener: "rot_rose",
                     alf_boss_high_mage: "dawn_eye", alf_boss_gullinbursti: "gullin_tusk", alf_boss_beli: "beli_bronze" };
  const DROP = { loc: { chance: 0.15, qty: [1, 2] }, locBoss: { chance: 0.6, qty: [2, 4] }, rare: { chance: 0.2, qty: [1, 1] } };
  const PART_Q = { head: 1, chest: 1.6, legs: 1.2, hands: 0.8, feet: 0.8 };
  const c = v => Math.max(1, Math.ceil(v));
  // [матеріал, кількість] без локального й рідкісного (їх додає matsFor)
  const ARMOR_MATS = {
    heavy:  q => [["platinum_ingot", c(3 * q)], ["gold_ingot", c(q)]],
    medium: q => [["yew_wood", c(2 * q)], ["gold_ingot", c(q)], ["platinum_ingot", 1]],
    cloth:  q => [["gold_ingot", c(q)], ["yew_wood", 1]]
  };
  const ARMOR_LOC = { heavy: 4, medium: 5, cloth: 6 };
  const ARMOR_TOOLS = { heavy: ["bellows"], medium: ["leatherwork"], cloth: [] };
  const WEAPON_MATS = {
    sword: [["platinum_ingot", 4], ["yew_wood", 2], ["gold_ingot", 1]], axe: [["platinum_ingot", 4], ["yew_wood", 2], ["gold_ingot", 1]],
    axe2: [["platinum_ingot", 4], ["yew_wood", 2], ["gold_ingot", 1]], dagger: [["platinum_ingot", 2], ["yew_wood", 1], ["gold_ingot", 1]],
    knife: [["platinum_ingot", 2], ["yew_wood", 1], ["gold_ingot", 1]], bow: [["yew_wood", 6], ["platinum_ingot", 1], ["gold_ingot", 1]],
    staff: [["yew_wood", 5], ["gold_ingot", 2]], shield: [["platinum_ingot", 4], ["yew_wood", 2]],
    quiver: [["yew_wood", 1], ["gold_ingot", 1]], orb: [["gold_ingot", 2], ["platinum_ingot", 1]]
  };
  const matLocOf = set => set.matLoc || Object.keys(BOSS_OF_LOC).find(l => BOSS_OF_LOC[l] === set.boss);
  function matsFor(set, base, locQty) {
    const loc = matLocOf(set);
    return [...base, [LOC_MAT[loc], c(locQty)], [BOSS_MAT[BOSS_OF_LOC[loc]], 1]];
  }
  // Здобич: матеріал локації — з усіх її ворогів (бос — більше), рідкісний — лише з боса
  for (const [loc, mat] of Object.entries(LOC_MAT)) {
    for (const id of RPG.LOCATIONS?.[loc]?.enemies || []) {
      const e = RPG.ENEMIES[id];
      if (!e || e.loot.some(d => d.id === mat)) continue;
      const boss = id === BOSS_OF_LOC[loc];
      e.loot.push({ id: mat, ...(boss ? DROP.locBoss : DROP.loc) });
      if (boss) e.loot.push({ id: BOSS_MAT[id], ...DROP.rare });
    }
  }

  // Шанс, що бос дасть креслення (одне; спершу — ще не вивчене й не з інвентаря)
  const BLUEPRINT_CHANCE = 0.4;
  const BLUEPRINT_DROPS = {};      // { бос: [id креслень] }

  const r1 = v => Math.round(v * 10) / 10;
  // Креслення до рецепта речі id: blueprint_<id речі без «prof_»> (напр. blueprint_warrior_head, blueprint_w_warrior_main)
  function addBlueprint(cls, set, id, name, tab) {
    const bp = "blueprint_" + id.replace(/^profw_/, "w_").replace(/^prof_/, "");
    RPG.ITEMS[bp] = {
      name: L(`Креслення: ${name}`, `Blueprint: ${name}`),
      type: "blueprint", recipe: id, stackable: true, maxStack: 99, price: 300, noShop: true, secretFor: set.secret ? cls : undefined,
      description: L(`Креслення ковальського рецепта. Використайте — і «${name}» назавжди з'явиться у вашій кузні (вкладка «${tab}», тір 3). ` +
        `Падає з боса «${RPG.ENEMIES[set.boss]?.name || set.boss}».`,
        `A smith's recipe blueprint. Use it — and "${name}" will appear in your forge for good (the "${tab}" tab, tier 3). ` +
        `Dropped by the boss "${RPG.I18N?.en?.phrases?.[RPG.ENEMIES[set.boss]?.name] || set.boss}".`)
    };
    (BLUEPRINT_DROPS[set.boss] ||= []).push(bp);
  }
  for (const [cls, set] of Object.entries(SETS)) {
    if (!RPG.CLASSES[cls]) continue;
    const w = WEIGHT[set.weight];
    const setId = "prof_" + cls;
    RPG.ITEM_SETS[setId] = { name: set.name, steps: set.steps, profession: cls };
    SLOTS.forEach((slot, i) => {
      const m = SLOT_MULT[slot];
      const stats = { defense: Math.round(w.defense * m) };
      if (slot === "head" || slot === "chest" || slot === "legs") stats.hp = Math.round(w.hp * m);
      for (const [k, v] of Object.entries(EXTRA[cls])) {
        const val = DECIMAL.includes(k) ? Math.max(1, r1(v * m)) : Math.max(1, Math.round(v * m));
        stats[k] = (stats[k] || 0) + val;
      }
      const id = `${setId}_${slot}`;
      const name = L(`${w.noun[slot]} ${set.of}`, `${w.noun[slot]} of ${set.of}`);
      RPG.ITEMS[id] = {
        name, icon: ["armor", w.icon + i],
        type: "armor", slot, tier: TIER, levelReq: set.level || LEVEL, price: Math.round(w.price * m * (set.level ? 1.2 : 1)), set: setId, noShop: true,
        classes: [cls], profSet: true, stats,
        description: L(`Частина комплекту «${set.name}». Носить лише ${RPG.CLASSES[cls].name.toLowerCase()}.`,
          `Part of the "${set.name}" set. Only ${/^[aeiou]/.test(set.cls) ? "an" : "a"} ${set.cls} can wear it.`)
      };
      RPG.ITEM_ICON_FILES?.add(id);           // своя іконка комплекту
      const q = PART_Q[slot];
      if (RPG.RECIPES) RPG.RECIPES[id] = { tier: TIER, mats: matsFor(set, ARMOR_MATS[set.weight](q), ARMOR_LOC[set.weight] * q),
                                          tools: ARMOR_TOOLS[set.weight], blueprint: true };   // recipes.js є лише на сторінці гри
      addBlueprint(cls, set, id, name, L("Броня", "Armour"));
    });
  }


  // ---------- Комплекти зброї професій: зброя + ліва рука (окремий бонус за 2 речі) ----------
  // base — залізна річ тіру 3, від якої беруться характеристики (× WEAPON_MULT) і знаряддя кузні; матеріали — WEAPON_MATS
  const WEAPON_MULT = 1.2;
  const W_NOUN = L(
    { sword: "Меч", axe: "Сокира", axe2: "Топірець", dagger: "Кинджал", bow: "Лук", staff: "Посох", shield: "Щит", quiver: "Сагайдак", orb: "Сфера", knife: "Малий кинджал" },
    { sword: "Sword", axe: "Axe", axe2: "Hatchet", dagger: "Dagger", bow: "Bow", staff: "Staff", shield: "Shield", quiver: "Quiver", orb: "Orb", knife: "Parrying Dagger" });
  const W_BASE = { sword: "sword_t3", axe: "axe_t3", axe2: "axe_t3", dagger: "dagger_t3", bow: "bow_t3", staff: "staff_t3",
                   shield: "shield_t3", quiver: "quiver_t3", orb: "orb_t3", knife: "knife_t3" };
  //   main / off — види речей; extra — додаток професії до кожної з двох речей; step — бонус за 2 речі
  const WEAPON_SETS = {
    warrior:    { main: "sword", off: "shield", extra: { crit: 1 },          step: { pct: { attack: 6 }, add: { crit: 2 }, text: L("+6% до атаки, +2% до шансу крит. удару", "+6% attack, +2% critical hit chance") } },
    knight:     { main: "sword", off: "shield", extra: { hp: 40 },           step: { pct: { defense: 8 }, add: { blockPhys: 4 }, text: L("+8% до захисту, +4% до блоку фізичної шкоди", "+8% defence, +4% physical damage block") } },
    berserker:  { main: "axe", off: "axe2", extra: { crit: 1 },              step: { pct: { attack: 8 }, add: { crit: 3 }, text: L("+8% до атаки, +3% до шансу крит. удару", "+8% attack, +3% critical hit chance") } },
    rogue:      { main: "dagger", off: "knife", extra: { dodge: 1 },         step: { add: { crit: 4, dodge: 2 }, text: L("+4% до шансу крит. удару, +2% до ухилення", "+4% critical hit chance, +2% dodge") } },
    hunter:     { main: "bow", off: "quiver", extra: { attack: 4 },          step: { pct: { attack: 6, speed: 5 }, text: L("+6% до атаки, +5% до швидкості", "+6% attack, +5% speed") } },
    mage_fire:  { main: "staff", off: "orb", extra: { crit: 1 },             step: { pct: { magic: 8 }, text: L("+8% до сили магії", "+8% magic power") } },
    mage_water: { main: "staff", off: "orb", extra: { mp: 30 },              step: { pct: { magic: 5, mpRegen: 30 }, text: L("+5% до сили магії, +30% до відновлення мани", "+5% magic power, +30% mana regeneration") } },
    mage_wind:  { main: "staff", off: "orb", extra: { speed: 1 },            step: { pct: { magic: 6, speed: 4 }, text: L("+6% до сили магії, +4% до швидкості", "+6% magic power, +4% speed") } },
    mage_earth: { main: "staff", off: "orb", extra: { defense: 4 },          step: { pct: { magic: 6, defense: 6 }, text: L("+6% до сили магії, +6% до захисту", "+6% magic power, +6% defence") } },
    paladin:    { main: "sword", off: "shield", extra: { magic: 6 },         step: { pct: { attack: 5, magic: 5 }, text: L("+5% до атаки й сили магії", "+5% attack and magic power") } },
    priest:     { main: "staff", off: "orb", extra: { magicDefense: 4 },     step: { add: { skillPct: 8 }, text: L("+8% до сили навичок і лікування", "+8% skill power and healing") } },
    monk:       { main: "staff", off: "knife", extra: { dodge: 1 },          step: { pct: { speed: 5 }, add: { dodge: 3 }, text: L("+5% до швидкості, +3% до ухилення", "+5% speed, +3% dodge") } },
    shaman:     { main: "sword", off: "orb", extra: { magic: 4 },            step: { pct: { magic: 6 }, add: { skillPct: 5 }, text: L("+6% до сили магії, +5% до сили навичок", "+6% magic power, +5% skill power") } }
  };
  for (const [cls, ws] of Object.entries(WEAPON_SETS)) {
    const set = SETS[cls];
    if (!set || !RPG.CLASSES[cls]) continue;
    const setId = "profw_" + cls;
    const setName = L(`Зброя ${set.of}`, `Arms of ${set.of}`);
    RPG.ITEM_SETS[setId] = { name: setName, steps: [{ pieces: 2, ...ws.step }], profession: cls };
    for (const [part, kind] of [["main", ws.main], ["off", ws.off]]) {
      const base = RPG.ITEMS[W_BASE[kind]];
      const stats = {};
      for (const [k, v] of Object.entries(base.stats)) stats[k] = v < 0 ? v : DECIMAL.includes(k) ? r1(v * WEAPON_MULT) : Math.round(v * WEAPON_MULT);
      for (const [k, v] of Object.entries(ws.extra)) stats[k] = (stats[k] || 0) + v;
      const id = `${setId}_${part}`;
      const name = L(`${W_NOUN[kind]} ${set.of}`, `${W_NOUN[kind]} of ${set.of}`);
      const { name: _n, description: _d, stats: _s, ...fields } = base;
      RPG.ITEMS[id] = {
        ...fields, name, levelReq: LEVEL, price: Math.round(base.price * 1.4), set: setId, noShop: true,
        classes: [cls], profSet: true, stats,
        description: L(`Частина комплекту «${setName}». Носить лише ${RPG.CLASSES[cls].name.toLowerCase()}.`,
          `Part of the "${setName}" set. Only ${/^[aeiou]/.test(set.cls) ? "an" : "a"} ${set.cls} can wear it.`)
      };
      RPG.ITEM_ICON_FILES?.add(id);           // своя іконка комплекту
      const br = RPG.RECIPES?.[W_BASE[kind]];
      if (br) RPG.RECIPES[id] = { tier: TIER, mats: matsFor(set, WEAPON_MATS[kind], part === "main" ? 6 : 4), tools: br.tools, blueprint: true };
      addBlueprint(cls, set, id, name, L("Зброя", "Weapon"));
    }
  }

  // ---------- Креслення ----------
  const learned = save => (save.story ||= {}, save.story.blueprints ||= {});
  function knowsRecipe(save, itemId) {
    return !RPG.ITEMS[itemId]?.profSet || !!save.story?.blueprints?.[itemId];
  }
  // Чи є в групі герой цієї професії (для секретних креслень)
  const partyHas = (save, cls) => (RPG.partyMembers ? RPG.partyMembers(save) : [save]).some(ms => ms.character?.classId === cls);
  // Вивчити креслення з інвентаря
  function learnBlueprint(save, bpId) {
    const bp = RPG.ITEMS[bpId];
    if (bp?.type !== "blueprint") return { ok: false, reason: "Це не креслення." };
    if (knowsRecipe(save, bp.recipe)) return { ok: false, reason: `Рецепт «${RPG.ITEMS[bp.recipe].name}» уже є у вашій кузні.` };
    if (!RPG.removeItem(save, bpId, 1)) return { ok: false, reason: "Креслення немає в інвентарі." };
    learned(save)[bp.recipe] = true;
    return { ok: true, recipe: bp.recipe };
  }
  // Креслення з боса: id або null. Спершу — ті, яких ще немає ні в кузні, ні в інвентарі
  function rollBlueprintDrop(save, enemyId) {
    const pool = (BLUEPRINT_DROPS[enemyId] || []).filter(id => !RPG.ITEMS[id].secretFor || partyHas(save, RPG.ITEMS[id].secretFor));
    if (!pool.length || Math.random() >= BLUEPRINT_CHANCE) return null;
    const inBag = id => (save.inventory || []).some(x => x && x.id === id);
    const fresh = pool.filter(id => !knowsRecipe(save, RPG.ITEMS[id].recipe) && !inBag(id));
    const from = fresh.length ? fresh : pool;
    return from[Math.floor(Math.random() * from.length)];
  }
  // Звідки креслення рецепта (для підказки в кузні)
  function blueprintSource(itemId) {
    const set = SETS[(RPG.ITEMS[itemId]?.set || "").replace(/^profw?_/, "")];
    return set ? RPG.ENEMIES[set.boss]?.name || set.boss : "";
  }

  // Секретний комплект показується в кузні, лише коли в групі є його професія або вивчено хоч одне креслення
  function blueprintVisible(save, itemId) {
    const set = SETS[(RPG.ITEMS[itemId]?.set || "").replace(/^profw?_/, "")];
    if (!set?.secret) return true;
    const cls = RPG.ITEMS[itemId].classes[0];
    return partyHas(save, cls) || Object.keys(save.story?.blueprints || {}).some(id => RPG.ITEMS[id]?.classes?.[0] === cls);
  }

  Object.assign(RPG, { blueprintVisible, PROF_SETS: SETS, BLUEPRINT_DROPS, BLUEPRINT_CHANCE, knowsRecipe, learnBlueprint, rollBlueprintDrop, blueprintSource });
})(window.RPG);

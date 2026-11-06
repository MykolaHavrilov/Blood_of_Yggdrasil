// ============================================================
// data/profsets.js — КОМПЛЕКТИ БРОНІ ПРОФЕСІЙ (попередня версія)
//
// 12 професій × 5 частин (шолом, нагрудник, штани, наручі, чоботи), тір 3, з 25 рівня;
// + секретна (Шаман потойбіччя): з 30 рівня, креслення з Володаря Темного лісу, лише коли в групі є Шаман.
// Носить лише своя професія (classes), кує будь-хто — але лише за вивченим кресленням.
// Креслення (type "blueprint") падає з босів Альвгейму: кожен бос — 2 професії (BLUEPRINT_DROPS).
// «Використати» креслення в інвентарі — рецепт назавжди відкривається в кузні (save.story.blueprints).
// Бонуси комплекту — за 3 і 5 вдягнених частин (ITEM_SETS[…].steps; character.js → calcStats).
//
// Для зміни балансу: WEIGHT (база броні за вагою), EXTRA (додатки професії), SETS (бонуси),
// BLUEPRINT_CHANCE (шанс креслення з боса), MATS (матеріали рецептів).
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
    // Секретна професія (quests.js → SHAMAN): з 30 рівня; креслення — з Володаря Темного лісу і лише тоді,
    // коли в групі є Шаман потойбіччя (secret) — інакше про комплект ніхто не дізнається
    shaman: { weight: "medium", level: 30, secret: true, name: L("Убрання Відреченого", "Garb of the Renouncer"), of: L("Відреченого", "the Renouncer"), cls: L(null, "shaman of the beyond"), boss: "forest_lord",
      steps: [{ pieces: 3, pct: { attack: 6, magic: 6 }, text: L("+6% до атаки й сили магії", "+6% attack and magic power") }, { pieces: 5, pct: { hp: 8 }, add: { skillPct: 10 }, text: L("+10% до сили навичок, +8% до здоров'я", "+10% skill power, +8% health") }] }
  };

  // Матеріали рецептів (тір 3) за вагою й частиною
  const MATS = {
    heavy:  { tools: ["bellows"], mats: s => [["iron_ingot", { head: 5, chest: 8, legs: 6, hands: 4, feet: 4 }[s]], ["coal", 4], ["leather_strap", 2], ["gold_ingot", 1]] },
    medium: { tools: ["leatherwork", "bellows"], mats: s => [["white_pelt", { head: 3, chest: 6, legs: 5, hands: 3, feet: 4 }[s]], ["leather_strap", 3], ["iron_ingot", 2], ["gold_ingot", 1]] },
    cloth:  { tools: ["crucible"], mats: s => [["flax", { head: 5, chest: 9, legs: 7, hands: 4, feet: 5 }[s]], ["onyx", 2], ["gold_ingot", 1], ["white_pelt", 1]] }
  };

  // Шанс, що бос дасть креслення (одне; спершу — ще не вивчене й не з інвентаря)
  const BLUEPRINT_CHANCE = 0.4;
  const BLUEPRINT_DROPS = {};      // { бос: [id креслень] }

  const r1 = v => Math.round(v * 10) / 10;
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
      const mat = MATS[set.weight];
      if (RPG.RECIPES) RPG.RECIPES[id] = { tier: TIER, mats: mat.mats(slot), tools: mat.tools, blueprint: true };   // recipes.js є лише на сторінці гри
      const bp = `blueprint_${cls}_${slot}`;
      RPG.ITEMS[bp] = {
        name: L(`Креслення: ${name}`, `Blueprint: ${name}`),
        type: "blueprint", recipe: id, stackable: true, maxStack: 99, price: 300, noShop: true, secretFor: set.secret ? cls : undefined,
        description: L(`Креслення ковальського рецепта. Використайте — і «${name}» назавжди з'явиться у вашій кузні (вкладка «Броня», тір 3). ` +
          `Падає з боса «${RPG.ENEMIES[set.boss]?.name || set.boss}».`,
          `A smith's recipe blueprint. Use it — and "${name}" will appear in your forge for good (the "Armour" tab, tier 3). ` +
          `Dropped by the boss "${RPG.I18N?.en?.phrases?.[RPG.ENEMIES[set.boss]?.name] || set.boss}".`)
      };
      (BLUEPRINT_DROPS[set.boss] ||= []).push(bp);
    });
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
    const set = SETS[(RPG.ITEMS[itemId]?.set || "").replace(/^prof_/, "")];
    return set ? RPG.ENEMIES[set.boss]?.name || set.boss : "";
  }

  // Секретний комплект показується в кузні, лише коли в групі є його професія або вивчено хоч одне креслення
  function blueprintVisible(save, itemId) {
    const set = SETS[(RPG.ITEMS[itemId]?.set || "").replace(/^prof_/, "")];
    if (!set?.secret) return true;
    const cls = RPG.ITEMS[itemId].classes[0];
    return partyHas(save, cls) || SLOTS.some(sl => save.story?.blueprints?.[`prof_${cls}_${sl}`]);
  }

  Object.assign(RPG, { blueprintVisible, PROF_SETS: SETS, BLUEPRINT_DROPS, BLUEPRINT_CHANCE, knowsRecipe, learnBlueprint, rollBlueprintDrop, blueprintSource });
})(window.RPG);

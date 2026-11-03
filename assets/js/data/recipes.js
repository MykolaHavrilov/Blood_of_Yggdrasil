// ============================================================
// data/recipes.js — РЕЦЕПТИ КУЗНІ (план крафту, етап 7; книга «Небесна кузня. Настанова»)
//
// RECIPES[<id речі>] = { tier, mats: [[id матеріалу, кількість], …], tools: [id знаряддя, …] }
//   tier  — 1…7: потрібен рівень майстерності ВИДУ (Зброя / Броня / Ювелір) CRAFT_TIER_LEVEL[tier] (1 / 10 / 20 / 30 / 40 / 50 / 60)
//   mats  — базові ID матеріалів; підходить будь-яка рідкість (craft.js сам підбирає стопки)
//   tools — знаряддя понад обов'язкові (горно, ковадло, молот, кліщі, діжка — потрібні завжди)
// SMELT[<id злитка>] = { ore, oreQty, coal, tools } — переплавка руди в горні (завжди вдається).
// Кувати можна будь-які речі — незалежно від професії героя.
// Підключається ПІСЛЯ data/items.js, ДО craft.js.
// ============================================================

(function (RPG) {
  // Тір відкривається рівнем майстерності свого виду (рівень виду — до 60, craft.js → CAT_MAX_LEVEL).
  const CRAFT_TIER_LEVEL = { 1: 1, 2: 10, 3: 20, 4: 30, 5: 40, 6: 50, 7: 60 };

  const RECIPES = {
    // ---------- Тір 1 (дерево, льон, мідь) ----------
    sword_t1:   { tier: 1, mats: [["oak_wood", 4], ["leather_strap", 1]], tools: ["carving"] },
    dagger_t1:  { tier: 1, mats: [["oak_wood", 2], ["leather_strap", 1]], tools: ["carving"] },
    axe_t1:     { tier: 1, mats: [["oak_wood", 5], ["leather_strap", 1]], tools: ["carving"] },
    bow_t1:     { tier: 1, mats: [["ash_wood", 4], ["flax", 2]], tools: ["carving"] },
    staff_t1:   { tier: 1, mats: [["ash_wood", 4], ["glass", 1], ["slime_gel", 2]], tools: ["carving"] },
    shield_t1:  { tier: 1, mats: [["oak_wood", 6], ["leather_strap", 2]], tools: ["carving"] },
    quiver_t1:  { tier: 1, mats: [["flax", 4], ["rat_tail", 3]], tools: [] },
    orb_t1:     { tier: 1, mats: [["glass", 3], ["slime_gel", 3]], tools: [] },
    knife_t1:   { tier: 1, mats: [["oak_wood", 2], ["leather_strap", 1]], tools: ["carving"] },
    linen_head:  { tier: 1, mats: [["flax", 3], ["rat_skin", 1]], tools: [] },
    linen_chest: { tier: 1, mats: [["flax", 6], ["rat_skin", 2]], tools: [] },
    linen_legs:  { tier: 1, mats: [["flax", 5], ["rat_skin", 2]], tools: [] },
    linen_hands: { tier: 1, mats: [["flax", 3], ["rat_skin", 1]], tools: [] },
    linen_feet:  { tier: 1, mats: [["flax", 4], ["rat_skin", 2]], tools: [] },
    ring_t1:    { tier: 1, mats: [["copper_ingot", 2], ["slime_gel", 1]], tools: ["crucible"] },
    amulet_t1:  { tier: 1, mats: [["copper_ingot", 3], ["slime_gel", 1]], tools: ["crucible"] },
    earring_t1: { tier: 1, mats: [["copper_ingot", 1], ["slime_gel", 1]], tools: ["crucible"] },

    // ---------- Тір 2 (камінь, шкіра, срібло) ----------
    sword_t2:   { tier: 2, mats: [["flint", 6], ["oak_wood", 2], ["leather_strap", 2]], tools: [] },
    dagger_t2:  { tier: 2, mats: [["flint", 3], ["leather_strap", 1]], tools: [] },
    axe_t2:     { tier: 2, mats: [["flint", 7], ["oak_wood", 3]], tools: [] },
    bow_t2:     { tier: 2, mats: [["ash_wood", 5], ["flint", 2], ["wolf_pelt", 1]], tools: ["carving"] },
    staff_t2:   { tier: 2, mats: [["ash_wood", 4], ["lapis", 2], ["slime_gel", 3]], tools: ["carving"] },
    shield_t2:  { tier: 2, mats: [["oak_wood", 4], ["wolf_pelt", 4]], tools: ["leatherwork"] },
    quiver_t2:  { tier: 2, mats: [["wolf_pelt", 3], ["leather_strap", 2]], tools: ["leatherwork"] },
    orb_t2:     { tier: 2, mats: [["lapis", 3], ["slime_gel", 4]], tools: [] },
    knife_t2:   { tier: 2, mats: [["flint", 2], ["leather_strap", 1]], tools: [] },
    leather_head:  { tier: 2, mats: [["wolf_pelt", 3], ["leather_strap", 1]], tools: ["leatherwork"] },
    leather_chest: { tier: 2, mats: [["wolf_pelt", 6], ["leather_strap", 2]], tools: ["leatherwork"] },
    leather_legs:  { tier: 2, mats: [["wolf_pelt", 5], ["leather_strap", 2]], tools: ["leatherwork"] },
    leather_hands: { tier: 2, mats: [["wolf_pelt", 3], ["wolf_fang", 2]], tools: ["leatherwork"] },
    leather_feet:  { tier: 2, mats: [["wolf_pelt", 4], ["leather_strap", 2]], tools: ["leatherwork"] },
    ring_t2:    { tier: 2, mats: [["silver_ingot", 2], ["slime_gel", 1]], tools: ["crucible"] },
    amulet_t2:  { tier: 2, mats: [["silver_ingot", 3], ["wolf_fang", 2]], tools: ["crucible"] },
    earring_t2: { tier: 2, mats: [["silver_ingot", 1], ["slime_gel", 1]], tools: ["crucible"] },

    // ---------- Тір 3 (залізо, онікс, золото) ----------
    sword_t3:   { tier: 3, mats: [["iron_ingot", 6], ["coal", 4], ["leather_strap", 2]], tools: ["bellows"] },
    dagger_t3:  { tier: 3, mats: [["iron_ingot", 3], ["coal", 2], ["leather_strap", 1]], tools: ["bellows"] },
    axe_t3:     { tier: 3, mats: [["iron_ingot", 7], ["coal", 4], ["oak_wood", 2]], tools: ["bellows"] },
    bow_t3:     { tier: 3, mats: [["ash_wood", 5], ["iron_ingot", 2], ["white_pelt", 1]], tools: ["carving", "bellows"] },
    staff_t3:   { tier: 3, mats: [["ash_wood", 3], ["iron_ingot", 2], ["onyx", 2]], tools: ["carving", "bellows"] },
    shield_t3:  { tier: 3, mats: [["iron_ingot", 6], ["coal", 3], ["oak_wood", 2]], tools: ["bellows"] },
    quiver_t3:  { tier: 3, mats: [["white_pelt", 2], ["iron_ingot", 2], ["leather_strap", 2]], tools: ["leatherwork", "bellows"] },
    orb_t3:     { tier: 3, mats: [["onyx", 3], ["iron_ingot", 1]], tools: ["bellows"] },
    knife_t3:   { tier: 3, mats: [["iron_ingot", 2], ["coal", 1], ["leather_strap", 1]], tools: ["bellows"] },
    iron_head:  { tier: 3, mats: [["iron_ingot", 4], ["coal", 2], ["white_pelt", 1]], tools: ["bellows"] },
    iron_chest: { tier: 3, mats: [["iron_ingot", 8], ["coal", 4], ["white_pelt", 1]], tools: ["bellows"] },
    iron_legs:  { tier: 3, mats: [["iron_ingot", 6], ["coal", 3], ["white_pelt", 1]], tools: ["bellows"] },
    iron_hands: { tier: 3, mats: [["iron_ingot", 4], ["coal", 2], ["white_pelt", 1]], tools: ["bellows"] },
    iron_feet:  { tier: 3, mats: [["iron_ingot", 5], ["coal", 2], ["white_pelt", 1]], tools: ["bellows"] },
    ring_t3:    { tier: 3, mats: [["gold_ingot", 2], ["gem", 1]], tools: ["crucible"] },
    amulet_t3:  { tier: 3, mats: [["gold_ingot", 3], ["gem", 1]], tools: ["crucible"] },
    earring_t3: { tier: 3, mats: [["gold_ingot", 1], ["gem", 1]], tools: ["crucible"] },

    // ---------- Тір 4 (сталь ванів, бурштин, платина) — знаряддя: міхи + гартівна ванна ванів ----------
    sword_t4:   { tier: 4, mats: [["steel_ingot", 6], ["coal", 4], ["seal_leather", 2]], tools: ["bellows", "vanir_quench"] },
    dagger_t4:  { tier: 4, mats: [["steel_ingot", 3], ["coal", 2], ["seal_leather", 1]], tools: ["bellows", "vanir_quench"] },
    axe_t4:     { tier: 4, mats: [["steel_ingot", 7], ["coal", 4], ["yew_wood", 2]], tools: ["bellows", "vanir_quench"] },
    bow_t4:     { tier: 4, mats: [["yew_wood", 5], ["steel_ingot", 2], ["seal_leather", 1]], tools: ["carving", "bellows", "vanir_quench"] },
    staff_t4:   { tier: 4, mats: [["yew_wood", 3], ["steel_ingot", 2], ["amber", 1]], tools: ["carving", "bellows", "vanir_quench"] },
    shield_t4:  { tier: 4, mats: [["steel_ingot", 6], ["coal", 3], ["yew_wood", 2]], tools: ["bellows", "vanir_quench"] },
    quiver_t4:  { tier: 4, mats: [["seal_leather", 3], ["steel_ingot", 2], ["leather_strap", 2]], tools: ["leatherwork", "bellows", "vanir_quench"] },
    orb_t4:     { tier: 4, mats: [["amber", 3], ["steel_ingot", 1]], tools: ["bellows", "vanir_quench"] },
    knife_t4:   { tier: 4, mats: [["steel_ingot", 2], ["coal", 1], ["seal_leather", 1]], tools: ["bellows", "vanir_quench"] },
    steel_head:  { tier: 4, mats: [["steel_ingot", 4], ["coal", 2], ["seal_leather", 1]], tools: ["bellows", "vanir_quench"] },
    steel_chest: { tier: 4, mats: [["steel_ingot", 8], ["coal", 4], ["seal_leather", 2]], tools: ["bellows", "vanir_quench"] },
    steel_legs:  { tier: 4, mats: [["steel_ingot", 6], ["coal", 3], ["seal_leather", 1]], tools: ["bellows", "vanir_quench"] },
    steel_hands: { tier: 4, mats: [["steel_ingot", 4], ["coal", 2], ["seal_leather", 1]], tools: ["bellows", "vanir_quench"] },
    steel_feet:  { tier: 4, mats: [["steel_ingot", 5], ["coal", 2], ["seal_leather", 1]], tools: ["bellows", "vanir_quench"] },
    ring_t4:    { tier: 4, mats: [["platinum_ingot", 2], ["pearl", 1]], tools: ["crucible"] },
    amulet_t4:  { tier: 4, mats: [["platinum_ingot", 3], ["pearl", 1], ["amber", 1]], tools: ["crucible"] },
    earring_t4: { tier: 4, mats: [["platinum_ingot", 1], ["pearl", 1]], tools: ["crucible"] },

    // ---------- Тір 5 (двергська сталь, кришталь, рунні самоцвіти) — знаряддя: міхи + рунне горно ----------
    sword_t5:   { tier: 5, mats: [["darksteel_ingot", 6], ["coal", 4], ["lizard_leather", 2]], tools: ["bellows", "rune_forge"] },
    dagger_t5:  { tier: 5, mats: [["darksteel_ingot", 3], ["coal", 2], ["lizard_leather", 1]], tools: ["bellows", "rune_forge"] },
    axe_t5:     { tier: 5, mats: [["darksteel_ingot", 7], ["coal", 4], ["ironwood", 2]], tools: ["bellows", "rune_forge"] },
    bow_t5:     { tier: 5, mats: [["ironwood", 4], ["darksteel_ingot", 2], ["lizard_leather", 2]], tools: ["carving", "bellows", "rune_forge"] },
    staff_t5:   { tier: 5, mats: [["ironwood", 3], ["darksteel_ingot", 2], ["rune_gem", 1]], tools: ["carving", "bellows", "rune_forge"] },
    shield_t5:  { tier: 5, mats: [["darksteel_ingot", 7], ["coal", 3], ["gold_ingot", 1]], tools: ["bellows", "rune_forge"] },
    quiver_t5:  { tier: 5, mats: [["lizard_leather", 3], ["darksteel_ingot", 1], ["copper_ingot", 2]], tools: ["leatherwork", "bellows", "rune_forge"] },
    orb_t5:     { tier: 5, mats: [["rock_crystal", 3], ["gold_ingot", 1]], tools: ["bellows", "rune_forge"] },
    knife_t5:   { tier: 5, mats: [["darksteel_ingot", 2], ["coal", 1], ["gold_ingot", 1]], tools: ["bellows", "rune_forge"] },
    dwarf_head:  { tier: 5, mats: [["darksteel_ingot", 4], ["coal", 2], ["lizard_leather", 1]], tools: ["bellows", "rune_forge"] },
    dwarf_chest: { tier: 5, mats: [["darksteel_ingot", 8], ["coal", 4], ["lizard_leather", 2], ["gold_ingot", 1]], tools: ["bellows", "rune_forge"] },
    dwarf_legs:  { tier: 5, mats: [["darksteel_ingot", 6], ["coal", 3], ["lizard_leather", 1]], tools: ["bellows", "rune_forge"] },
    dwarf_hands: { tier: 5, mats: [["darksteel_ingot", 4], ["coal", 2], ["copper_ingot", 2]], tools: ["bellows", "rune_forge"] },
    dwarf_feet:  { tier: 5, mats: [["darksteel_ingot", 5], ["coal", 2], ["lizard_leather", 1]], tools: ["bellows", "rune_forge"] },
    ring_t5:    { tier: 5, mats: [["gold_ingot", 3], ["rune_gem", 1]], tools: ["crucible", "rune_forge"] },
    amulet_t5:  { tier: 5, mats: [["gold_ingot", 4], ["rune_gem", 1]], tools: ["crucible", "rune_forge"] },
    earring_t5: { tier: 5, mats: [["gold_ingot", 2], ["rune_gem", 1]], tools: ["crucible", "rune_forge"] },

    // ---------- Тір 6 (небесний метал, сонячне золото, Біфрост) — знаряддя: міхи + небесне ковадло ----------
    sword_t6:   { tier: 6, mats: [["celestial_ingot", 6], ["sun_gold_ingot", 1], ["white_pelt", 2]], tools: ["bellows", "sky_anvil"] },
    dagger_t6:  { tier: 6, mats: [["celestial_ingot", 3], ["sun_gold_ingot", 1], ["white_pelt", 1]], tools: ["bellows", "sky_anvil"] },
    axe_t6:     { tier: 6, mats: [["celestial_ingot", 7], ["white_ash", 2], ["sun_gold_ingot", 1]], tools: ["bellows", "sky_anvil"] },
    bow_t6:     { tier: 6, mats: [["white_ash", 5], ["celestial_ingot", 2], ["eagle_feather", 2]], tools: ["carving", "bellows", "sky_anvil"] },
    staff_t6:   { tier: 6, mats: [["white_ash", 3], ["celestial_ingot", 2], ["eagle_feather", 2], ["rock_crystal", 1]], tools: ["carving", "bellows", "sky_anvil"] },
    shield_t6:  { tier: 6, mats: [["celestial_ingot", 6], ["sun_gold_ingot", 2], ["white_ash", 2]], tools: ["bellows", "sky_anvil"] },
    quiver_t6:  { tier: 6, mats: [["white_pelt", 3], ["eagle_feather", 4], ["sun_gold_ingot", 1]], tools: ["leatherwork", "bellows", "sky_anvil"] },
    orb_t6:     { tier: 6, mats: [["bifrost_shard", 3], ["sun_gold_ingot", 1]], tools: ["bellows", "sky_anvil"] },
    knife_t6:   { tier: 6, mats: [["celestial_ingot", 2], ["eagle_feather", 1], ["sun_gold_ingot", 1]], tools: ["bellows", "sky_anvil"] },
    asgard_head:  { tier: 6, mats: [["celestial_ingot", 4], ["sun_gold_ingot", 1], ["white_pelt", 1]], tools: ["bellows", "sky_anvil"] },
    asgard_chest: { tier: 6, mats: [["celestial_ingot", 8], ["sun_gold_ingot", 2], ["white_pelt", 2]], tools: ["bellows", "sky_anvil"] },
    asgard_legs:  { tier: 6, mats: [["celestial_ingot", 6], ["sun_gold_ingot", 1], ["white_pelt", 1]], tools: ["bellows", "sky_anvil"] },
    asgard_hands: { tier: 6, mats: [["celestial_ingot", 4], ["sun_gold_ingot", 1], ["eagle_feather", 1]], tools: ["bellows", "sky_anvil"] },
    asgard_feet:  { tier: 6, mats: [["celestial_ingot", 5], ["sun_gold_ingot", 1], ["white_pelt", 1]], tools: ["bellows", "sky_anvil"] },
    ring_t6:    { tier: 6, mats: [["sun_gold_ingot", 2], ["bifrost_shard", 1]], tools: ["crucible", "sky_anvil"] },
    amulet_t6:  { tier: 6, mats: [["sun_gold_ingot", 3], ["bifrost_shard", 1]], tools: ["crucible", "sky_anvil"] },
    earring_t6: { tier: 6, mats: [["sun_gold_ingot", 1], ["bifrost_shard", 1]], tools: ["crucible", "sky_anvil"] },

    // ---------- Тір 7 (серцевина, кора, корінь і сік Іггдрасиля) — знаряддя: різці + різець Іггдрасиля ----------
    sword_t7:   { tier: 7, mats: [["ygg_heartwood", 6], ["ygg_sap", 2], ["ygg_root", 1]], tools: ["carving", "ygg_chisel"] },
    dagger_t7:  { tier: 7, mats: [["ygg_heartwood", 3], ["ygg_sap", 1], ["ygg_root", 1]], tools: ["carving", "ygg_chisel"] },
    axe_t7:     { tier: 7, mats: [["ygg_heartwood", 7], ["ygg_sap", 2], ["ygg_bark", 1]], tools: ["carving", "ygg_chisel"] },
    bow_t7:     { tier: 7, mats: [["ygg_heartwood", 4], ["ygg_root", 2], ["ygg_sap", 2]], tools: ["carving", "ygg_chisel"] },
    staff_t7:   { tier: 7, mats: [["ygg_root", 4], ["ygg_sap", 2], ["mimir_water", 1]], tools: ["carving", "ygg_chisel"] },
    shield_t7:  { tier: 7, mats: [["ygg_bark", 6], ["ygg_sap", 2], ["ygg_root", 2]], tools: ["carving", "ygg_chisel"] },
    quiver_t7:  { tier: 7, mats: [["ygg_bark", 3], ["ygg_heartwood", 2], ["ygg_root", 1]], tools: ["carving", "ygg_chisel"] },
    orb_t7:     { tier: 7, mats: [["mimir_water", 3], ["ygg_root", 1]], tools: ["carving", "ygg_chisel"] },
    knife_t7:   { tier: 7, mats: [["ygg_heartwood", 2], ["ygg_sap", 1], ["ygg_root", 1]], tools: ["carving", "ygg_chisel"] },
    ygg_head:  { tier: 7, mats: [["ygg_bark", 4], ["ygg_sap", 1], ["ygg_root", 1]], tools: ["carving", "ygg_chisel"] },
    ygg_chest: { tier: 7, mats: [["ygg_bark", 8], ["ygg_sap", 3], ["ygg_root", 2]], tools: ["carving", "ygg_chisel"] },
    ygg_legs:  { tier: 7, mats: [["ygg_bark", 6], ["ygg_sap", 2], ["ygg_root", 2]], tools: ["carving", "ygg_chisel"] },
    ygg_hands: { tier: 7, mats: [["ygg_bark", 4], ["ygg_sap", 1], ["ygg_root", 1]], tools: ["carving", "ygg_chisel"] },
    ygg_feet:  { tier: 7, mats: [["ygg_bark", 5], ["ygg_sap", 2], ["ygg_root", 1]], tools: ["carving", "ygg_chisel"] },
    ring_t7:    { tier: 7, mats: [["star_spark", 1], ["celestial_ingot", 2], ["ygg_sap", 1]], tools: ["crucible", "ygg_chisel"] },
    amulet_t7:  { tier: 7, mats: [["star_spark", 1], ["celestial_ingot", 3], ["mimir_water", 1]], tools: ["crucible", "ygg_chisel"] },
    earring_t7: { tier: 7, mats: [["star_spark", 1], ["celestial_ingot", 1]], tools: ["crucible", "ygg_chisel"] }
  };

  // Переплавка: 2 руди (+ вугілля для заліза) → 1 злиток тієї ж рідкості.
  // Сталь, двергська сталь і сонячне золото — не з руди, а з нижчих злитків (ore — ID злитка).
  const SMELT = {
    copper_ingot: { ore: "copper_ore", oreQty: 2, coal: 0, tools: [] },
    silver_ingot: { ore: "silver_ore", oreQty: 2, coal: 0, tools: [] },
    iron_ingot:   { ore: "iron_ore",   oreQty: 2, coal: 1, tools: ["bellows"] },
    gold_ingot:   { ore: "gold_ore",   oreQty: 2, coal: 0, tools: [] },
    steel_ingot:     { ore: "iron_ingot",     oreQty: 2, coal: 2, tools: ["bellows", "vanir_quench"] },
    platinum_ingot:  { ore: "platinum_ore",   oreQty: 2, coal: 0, tools: [] },
    darksteel_ingot: { ore: "steel_ingot",    oreQty: 2, coal: 3, tools: ["bellows", "rune_forge"] },
    celestial_ingot: { ore: "celestial_ore",  oreQty: 2, coal: 2, tools: ["bellows", "sky_anvil"] },
    sun_gold_ingot:  { ore: "gold_ingot",     oreQty: 3, coal: 0, tools: ["sky_anvil"] }
  };

  // Види ремесла = вкладки кузні. У кожного виду — свій рівень майстерності 1–60 (craft.js → craftCat):
  // він відкриває вищі тіри цього виду. Нові види речей додаються сюди за типом предмета (types).
  //   weapon — уся зброя, і для правої, і для лівої руки (щити, колчани, сфери, малі кинджали)
  //   armor  — уся броня; jewel — кільця, амулети, сережки
  const RECIPE_GROUPS = [
    { id: "weapon", name: "Зброя", master: "Зброяр", types: ["weapon", "shield", "offhand"] },
    { id: "armor", name: "Броня", master: "Бронник", types: ["armor"] },
    { id: "jewel", name: "Ювелір", master: "Ювелір", types: ["accessory"] }
  ];
  // Тір доступний для кування лише тоді, коли відкрито світ із його ресурсами (data/worlds.js → isWorldOpen).
  // Закритий тір видно в кузні (сірим), рецепти можна переглянути, але кувати й переплавляти його злитки не можна.
  //   тіри 1–3 — Мідгард (завжди); 4 — Альвгейм (там падають матеріали тіру 4); 5 — Свартальвгейм (кузні двергів);
  //   6 — Асгард (небесний метал); 7 — Ніфльгейм і Хельгейм (коріння Іггдрасиля).
  const CRAFT_TIER_WORLD = { 4: 3, 5: 5, 6: 8, 7: 9 };
  // { ok, world, reason } — чи відкритий тір для кування
  function craftTierOpen(save, tier) {
    const n = CRAFT_TIER_WORLD[tier];
    if (!n || !RPG.isWorldOpen) return { ok: true };
    if (RPG.isWorldOpen(save, n).ok) return { ok: true, world: n };
    const w = (RPG.WORLDS || []).find(x => x.n === n);
    const name = w ? `«${w.name}»` : `№${n}`;
    return { ok: false, world: n, reason: `Ресурси тіру ${tier} — у світі ${name}, а шлях туди ще закритий.` };
  }

  // Вид ремесла речі (id групи) або null
  function recipeGroupOf(itemId) {
    const t = RPG.ITEMS[itemId]?.type;
    return RECIPE_GROUPS.find(g => g.types.includes(t))?.id || null;
  }

  Object.assign(RPG, { CRAFT_TIER_LEVEL, CRAFT_TIER_WORLD, craftTierOpen, RECIPES, SMELT, RECIPE_GROUPS, recipeGroupOf });
})(window.RPG);

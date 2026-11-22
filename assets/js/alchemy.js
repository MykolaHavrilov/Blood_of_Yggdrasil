// ============================================================
// alchemy.js — АЛХІМІЧНИЙ СТАНОК І РІВНІ АЛХІМІЇ (дані — «Зілля — проєкт.xlsx», рішення користувача 2026-11-22)
//
// Станок стоїть у Гільдії ремісників (Дубова Застава, Торговий район) і в Храмі. У кожного станка — СВІЙ казан
// (save.alchemy[станок]): можна варити в обох одночасно.
// Варить лише зілля здоров'я й мани, 8 тірів (ALCH_TIERS):
//   пряма варка — 6 матеріалів тіру N + порожня колба тіру N;
//   покращення  — 3 зілля тіру N−1 того ж виду + колба тіру N + 1 матеріал тіру N (у тіру 1 немає).
// Тір відкривається рівнем Алхімії (ALCH_TIER_LEVEL) і світом (ALCH_TIER_WORLD, data/worlds.js → isWorldOpen).
// Варка не псується. Інгредієнти беруться з інвентаря та скринь складу власних домів (скрині для матеріалів і для зілля).
//
// Час — реальний, гра може бути закрита: у сейві лише start / end. Одне зілля — brewMs(тір, рівень):
//   тір 1: 10 с на 0 рівні → 3 с на 40; тір 8: 45 с на 35 рівні (з нього відкривається) → 30 с на 40;
//   між ними — порівну за тірами, а за рівнем — лінійно від рівня, що відкриває тір, до 40.
// Готове зілля лежить у казані, доки його не заберуть (collectBrew) — лише в інвентар; що не влізло — лишається в казані.
// Досвід Алхімії — як у кузні: 10 × (рівень + 1)² до наступного рівня, за зілля тіру 1…8 — ALCH_EXP; нараховується,
// коли забирають зварене (уперше). Рівень Алхімії — у головного героя: save.character.alchemy = { level, exp }.
// Підключається ПІСЛЯ character.js, data/items.js, data/worlds.js.
// ============================================================

(function (RPG) {
  const MAX_LEVEL = 40;
  const MAX_BATCH = 100;                                  // зілль за одну варку (повзунок 1…100)
  const ALCH_TIER_LEVEL = { 1: 0, 2: 5, 3: 10, 4: 20, 5: 25, 6: 30, 7: 35, 8: 35 };
  const ALCH_TIER_WORLD = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 5, 6: 7, 7: 8, 8: 9 };
  const ALCH_EXP = { 1: 15, 2: 40, 3: 100, 4: 250, 5: 600, 6: 1400, 7: 3000, 8: 5000 };
  // Час одного зілля (с): на рівні, що відкриває тір, і на 40-му — від тіру 1 (10 → 3) до тіру 8 (45 → 30) порівну
  const T_START = [10, 45], T_END = [3, 30];
  const expToNext = lvl => lvl >= MAX_LEVEL ? Infinity : 10 * (lvl + 1) * (lvl + 1);

  // Тіри: зілля здоров'я / мани, матеріал, колба
  const ALCH_TIERS = [
    { tier: 1, hp: "potion_hp_small",  mp: "potion_mp_small",  herb: "alch_plantain",      mineral: "alch_blue_salt" },
    { tier: 2, hp: "potion_hp_medium", mp: "potion_mp_medium", herb: "alch_st_johns_wort", mineral: "alch_silver_dust" },
    { tier: 3, hp: "potion_hp_large",  mp: "potion_mp_large",  herb: "alch_alf_chamomile", mineral: "alch_moonstone" },
    { tier: 4, hp: "potion_hp_t4", mp: "potion_mp_t4", herb: "alch_sea_grass",     mineral: "alch_mist_quartz" },
    { tier: 5, hp: "potion_hp_t5", mp: "potion_mp_t5", herb: "alch_cave_mushroom", mineral: "alch_crystal_dust" },
    { tier: 6, hp: "potion_hp_t6", mp: "potion_mp_t6", herb: "alch_ash_root",      mineral: "alch_ember_sulfur" },
    { tier: 7, hp: "potion_hp_t7", mp: "potion_mp_t7", herb: "alch_idunn_blossom", mineral: "alch_bifrost_dust" },
    { tier: 8, hp: "potion_hp_t8", mp: "potion_mp_t8", herb: "alch_ice_moss",      mineral: "alch_nifl_ice" }
  ].map(t => ({ ...t, flask: `alch_flask_${t.tier}` }));

  const ALCH_STATIONS = {
    guild:  { name: "Алхімічний станок Гільдії ремісників", place: "Дубова Застава, Торговий район" },
    temple: { name: "Алхімічний станок Храму", place: "Храм" }
  };

  // Трави й мінерали з Лісопилок і Шахт (expedition.js): 8–12 кожного за виграний бій —
  // ~90 боїв за годину експедиції → ~900 штук → ~150 зілль за годину (рішення користувача 2026-11-22)
  const ALCH_YIELD = [8, 12];
  const ALCH_SITE_TIERS = { start: [1, 2], dark: [2, 3], alf: [4], van: [4], svart: [5], jot: [5], musp: [6], asg: [7], nifl: [8] };
  function alchYields(loc) {
    const tiers = loc && ALCH_SITE_TIERS[loc.region || "start"];
    if (!tiers || (loc.type !== "sawmill" && loc.type !== "mine")) return [];
    return tiers.map(t => ALCH_TIERS[t - 1][loc.type === "sawmill" ? "herb" : "mineral"]);
  }

  // ---------- Рівень Алхімії ----------
  function alchState(save) {
    const ch = RPG.rootSave(save).character;
    ch.alchemy ??= { level: 0, exp: 0 };
    return ch.alchemy;
  }
  function addAlchExp(save, amount) {
    const st = alchState(save), ups = [];
    if (st.level >= MAX_LEVEL) { st.exp = 0; return ups; }
    st.exp += Math.max(0, Math.floor(amount));
    while (st.level < MAX_LEVEL && st.exp >= expToNext(st.level)) {
      st.exp -= expToNext(st.level);
      st.level++;
      ups.push(st.level);
    }
    if (st.level >= MAX_LEVEL) st.exp = 0;
    return ups;
  }

  // ---------- Час варки ----------
  function brewSec(tier, level) {
    const k = (tier - 1) / 7;
    const start = T_START[0] + (T_START[1] - T_START[0]) * k, end = T_END[0] + (T_END[1] - T_END[0]) * k;
    const from = ALCH_TIER_LEVEL[tier] || 0;
    const p = Math.min(1, Math.max(0, (level - from) / (MAX_LEVEL - from)));
    return Math.round((start - (start - end) * p) * 10) / 10;
  }
  const brewMs = (tier, level) => Math.round(brewSec(tier, level) * 1000);

  // ---------- Рецепти ----------
  // { id, potion, mode: "direct" | "upgrade", tier, kind: "hp" | "mp", need: [[id, qty], …] } — need без колби, колба — flask
  function recipeOf(potion, mode = "direct") {
    const t = ALCH_TIERS.find(x => x.hp === potion || x.mp === potion);
    if (!t || (mode === "upgrade" && t.tier === 1)) return null;
    const kind = t.hp === potion ? "hp" : "mp", mat = kind === "hp" ? t.herb : t.mineral;
    const need = mode === "upgrade" ? [[ALCH_TIERS[t.tier - 2][kind], 3], [mat, 1]] : [[mat, 6]];
    return { id: `${potion}:${mode}`, potion, mode, tier: t.tier, kind, need, flask: t.flask };
  }
  function alchRecipes() {
    const out = [];
    for (const kind of ["hp", "mp"]) for (const t of ALCH_TIERS) {
      out.push(recipeOf(t[kind], "direct"));
      if (t.tier > 1) out.push(recipeOf(t[kind], "upgrade"));
    }
    return out;
  }
  // Чи відкритий тір: { ok, reason }
  function alchTierOpen(save, tier) {
    const lvl = alchState(save).level, need = ALCH_TIER_LEVEL[tier] || 0;
    const n = ALCH_TIER_WORLD[tier];
    if (n > 1 && RPG.isWorldOpen && !RPG.isWorldOpen(save, n).ok) {
      const w = (RPG.WORLDS || []).find(x => x.n === n);
      return { ok: false, reason: `Матеріали тіру ${tier} — у світі ${w ? `«${w.name}»` : `№${n}`}, а шлях туди ще закритий.` };
    }
    if (lvl < need) return { ok: false, reason: `Потрібен ${need} рівень Алхімії (у вас ${lvl}).` };
    return { ok: true };
  }

  // ---------- Інгредієнти: інвентар + скрині складу власних домів (матеріали й зілля) ----------
  function stockChests(save) {
    const root = RPG.rootSave(save), out = [];
    for (const h of root.houses || []) {
      if (!h.warehouse) continue;
      for (const type of ["mat", "pot"]) for (let n = 1; n <= (h.chests?.[type] || 0); n++) out.push(`${h.id}:${type}:${n}`);
    }
    return out;
  }
  function countIng(save, id) {
    return RPG.countItem(save, id) + stockChests(save).reduce((n, sid) => n + RPG.countInList(RPG.chestList(save, sid), id), 0);
  }
  function takeIng(save, id, qty) {
    if (countIng(save, id) < qty) return false;
    const inv = Math.min(qty, RPG.countItem(save, id));     // спершу з інвентаря, решта — зі скринь
    if (inv) { RPG.removeItem(save, id, inv); qty -= inv; }
    for (const sid of stockChests(save)) {
      if (!qty) break;
      const list = RPG.chestList(save, sid), take = Math.min(qty, RPG.countInList(list, id));
      if (take) { RPG.removeFromList(list, id, take); qty -= take; }
    }
    return true;
  }
  // Скільки зілль цього рецепта вистачить інгредієнтів (не більше MAX_BATCH)
  function alchMaxCount(save, rec) {
    if (!rec) return 0;
    let n = MAX_BATCH;
    for (const [id, q] of [...rec.need, [rec.flask, 1]]) n = Math.min(n, Math.floor(countIng(save, id) / q));
    return Math.max(0, n);
  }

  // ---------- Казан станка ----------
  // save.alchemy[station] = { potion, mode, count, unitMs, start, end, left, exp, expGiven }
  function brewOf(save, station) {
    const root = RPG.rootSave(save);
    root.alchemy ??= {};
    return root.alchemy[station] || null;
  }
  // { state: "idle" | "brewing" | "ready", brew, leftMs, done }
  function brewStatus(save, station, now = Date.now()) {
    const b = brewOf(save, station);
    if (!b) return { state: "idle", brew: null, leftMs: 0, done: 0 };
    if (now < b.end) {
      const done = Math.min(b.count, Math.floor((now - b.start) / b.unitMs));
      return { state: "brewing", brew: b, leftMs: b.end - now, done };
    }
    return { state: "ready", brew: b, leftMs: 0, done: b.count };
  }
  function startBrew(save, station, recipeId, count, now = Date.now()) {
    if (!ALCH_STATIONS[station]) return { ok: false, reason: "Тут немає алхімічного станка." };
    if (brewOf(save, station)) return { ok: false, reason: "Казан зайнятий: дочекайтеся кінця варки й заберіть зілля." };
    const [potion, mode] = String(recipeId || "").split(":");
    const rec = recipeOf(potion, mode);
    if (!rec) return { ok: false, reason: "Такого рецепта немає." };
    const open = alchTierOpen(save, rec.tier);
    if (!open.ok) return open;
    count = Math.floor(Number(count));
    if (!(count >= 1 && count <= MAX_BATCH)) return { ok: false, reason: `Варити можна від 1 до ${MAX_BATCH} зілль за раз.` };
    if (alchMaxCount(save, rec) < count) return { ok: false, reason: "Не вистачає інгредієнтів." };
    for (const [id, q] of [...rec.need, [rec.flask, 1]]) takeIng(save, id, q * count);
    const unitMs = brewMs(rec.tier, alchState(save).level);
    RPG.rootSave(save).alchemy[station] = { potion, mode, count, unitMs, start: now, end: now + unitMs * count,
      left: count, exp: ALCH_EXP[rec.tier] * count, expGiven: false };
    return { ok: true, potion, count, ms: unitMs * count, unitMs };
  }
  // Забрати зварене в інвентар (що влізе). Досвід — при першому забиранні.
  function collectBrew(save, station, now = Date.now()) {
    const st = brewStatus(save, station, now);
    if (st.state !== "ready") return { ok: false, reason: st.state === "idle" ? "Казан порожній." : "Зілля ще вариться." };
    const b = st.brew;
    let levelUps = [], exp = 0;
    if (!b.expGiven) { exp = b.exp; levelUps = addAlchExp(save, exp); b.expGiven = true; }
    const fit = RPG.fitQty(save, b.potion, b.left);
    if (fit) { RPG.addItem(save, b.potion, fit); b.left -= fit; }
    const left = b.left;
    if (!left) delete RPG.rootSave(save).alchemy[station];
    return { ok: true, potion: b.potion, taken: fit, left, full: left > 0, exp, levelUps };
  }

  // ---------- Порожні колби: Торгова гільдія (Дубова Застава) і її філіал у Свартгарді ----------
  // Ціна — як у таблиці (ITEMS[id].price), без націнки; колба тіру продається, коли відкрито світ цього тіру.
  // Рівень 20 Торгової гільдії на колби не діє — їх продають усім.
  const FLASK_SHOPS = ["city", "svartgard"];
  function flaskStock(save) {
    return ALCH_TIERS.filter(t => ALCH_TIER_WORLD[t.tier] <= 1 || !RPG.isWorldOpen || RPG.isWorldOpen(save, ALCH_TIER_WORLD[t.tier]).ok)
      .map(t => t.flask);
  }
  // Інші торговці (Шинкар, торговець Гільдії авантюристів — рішення користувача 2026-11-22) продають лише колби тих тірів,
  // які вже відкриті Алхімією героя (alchTierOpen: рівень Алхімії + світ), за тією самою ціною.
  const flaskStockByLevel = save => ALCH_TIERS.filter(t => alchTierOpen(save, t.tier).ok).map(t => t.flask);
  const flaskPrice = id => RPG.ITEMS[id]?.price || 0;
  function buyFlask(save, id, qty = 1) {
    const atGuild = FLASK_SHOPS.includes(save.location?.map);
    const atMerchant = RPG.getLocation?.(save.location?.map)?.type === "tavern";
    if (!atGuild && !atMerchant) return { ok: false, reason: "Тут колб не продають." };
    if (!RPG.ITEMS[id]?.alchFlask) return { ok: false, reason: "Це не колба." };
    if (!(atGuild ? flaskStock(save) : flaskStockByLevel(save)).includes(id))
      return { ok: false, reason: atGuild ? "Колби цього тіру продають, коли відкрито його світ." : "Колби цього тіру ще не відкриті вашою Алхімією." };
    qty = Math.floor(Number(qty));
    if (!(qty >= 1 && qty <= RPG.BUY_MAX)) return { ok: false, reason: `Вкажіть кількість від 1 до ${RPG.BUY_MAX}.` };
    const unit = flaskPrice(id), price = unit * qty;
    if (save.character.gold < price) return { ok: false, reason: `Не вистачає золота (потрібно ${price}).` };
    if (RPG.fitQty(save, id, qty) < qty) return { ok: false, reason: "Інвентар повний — звільніть місце." };
    save.character.gold -= price;
    RPG.addItem(save, id, qty);
    return { ok: true, price, qty, unit };
  }

  Object.assign(RPG, {
    ALCH_FLASK_SHOPS: FLASK_SHOPS, alchFlaskStock: flaskStock, alchFlaskStockByLevel: flaskStockByLevel, alchFlaskPrice: flaskPrice, alchBuyFlask: buyFlask,
    ALCH_MAX_LEVEL: MAX_LEVEL, ALCH_MAX_BATCH: MAX_BATCH, ALCH_TIER_LEVEL, ALCH_TIER_WORLD, ALCH_EXP, ALCH_TIERS, ALCH_STATIONS,
    ALCH_YIELD, alchYields, alchState, alchExpToNext: expToNext, addAlchExp, alchBrewSec: brewSec, alchBrewMs: brewMs,
    alchRecipe: recipeOf, alchRecipes, alchTierOpen, alchCountIng: countIng, alchMaxCount,
    alchBrew: brewOf, alchBrewStatus: brewStatus, alchStartBrew: startBrew, alchCollect: collectBrew
  });
})(window.RPG);

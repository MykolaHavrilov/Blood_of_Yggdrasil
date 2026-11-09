// ============================================================
// page-maps.js — Екран «Мапа»: три частини світу.
// Частина колишнього game.js: спільне беремо з game-common.js (RPG.ui), запуск — game-main.js.
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, setBar, fmtNum, fmtDate, fmtStat, MSG_SEC, toastParent, raiseToasts, clearToasts, toastHost, showMsg, showNoGame, requireSave, showKeyPocket, showLootFilter, renderFilterBtn, whenNoDialog, queueDialog, noticeClose, noticeDialog, showNotice, journalReward, meetStranger, showParchment, BOOK, bookMotionOff, bookWide, bookBlobs, bookAnimUrl, playBookAnim, dropBookAnim, chronicleSection, showChronicle, forgeBookTable, forgeBookAuto, forgeBookSection, dataBookSection, openLibraryBook, showDataBook, showForgeBook, fieldLootAdd, showFieldLoot, TRAVEL_HREFS, blockLink, lockNavForTravel, unlockNavAfterTravel, showTravelBanner, startRegenTimer, itemLabel, rarityName, itemIcon, rarityTextClass, miniPlaceholder, fillItemCell, socketMarks, SLOT_SHORT, fillEquipCell, smallIcon, slotClass, renderHeroDoll, renderHeroGs, miniBar, renderPartyList, memberTabs, groupMemberTabs, renderHeroBars, expInfo, bindExpInfo, describeStats, describeEffect, useResultText, locImage, TYPE_NAMES, RARITY_NAMES, itemInfo, MSG_MAX } = RPG.ui;

  // МАПА: частини світу (data/routes.js → MAP_REGIONS), переміщення з часом (travel.js)
  // ============================================================
  const TYPE_LABEL = { home: "Безпечно", temple: "Безпечно", tavern: "Торговець", city: "Гільдія", combat: "Бої", gate: "Брама", citygate: "Вхід у Дубову Заставу", portal: "Корінь Іггдрасиля",
    mine: "Експедиція · руда", sawmill: "Експедиція · деревина" };
  // Шахта й Лісопилка на мапі кожного світу (data/enemies.js → EXPEDITION_SITES): без дороги, лише експедиція.
  // x, y — центр, w, h — зона кліку в % мапи
  const SITE_ZONES = {
    start: { mine_start: { x: 82, y: 20, w: 7, h: 11 }, sawmill_start: { x: 8, y: 32, w: 7, h: 11 } },
    dark:  { mine_dark:  { x: 15, y: 86, w: 7, h: 11 }, sawmill_dark:  { x: 45, y: 45, w: 7, h: 11 } },
    alf:   { mine_alf:   { x: 75, y: 9,  w: 7, h: 11 }, sawmill_alf:   { x: 38, y: 86, w: 7, h: 11 } }
  };
  const SITE_ICON = {
    mine: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7 Q12 1 20 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 4 L12 22" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    sawmill: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="18" height="6" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="16" r="1.6" fill="currentColor"/><path d="M5 10 L19 10 M6 10 l1 -2 M9 10 l1 -2 M12 10 l1 -2 M15 10 l1 -2 M18 10 l1 -2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
  };
  const isSite = id => !!RPG.LOCATIONS[id]?.expeditionOnly;
  // Будівлі Шахти й Лісопилки (assets/images/map/bld_<id>.webp) — у центрі SITE_ZONES, ширина в % мапи.
  // Значок (кирка / пила) лишається маленьким у кутку: туди лише експедиція.
  const SITE_BLD_W = 6.8;      // ~68% від першої версії (10)
  const SITE_BUILDINGS = new Set(["mine_start", "sawmill_start", "mine_dark", "sawmill_dark", "mine_alf", "sawmill_alf"]);
  // Порядок місць у списку під мапою
  const REGION_ORDER = {
    start: ["home", "temple", "village_start", "tavern", "south_gate", "forest_path", "forest_cave"],
    city: ["south", "center", "trade", "rest", "north"],
    dark: ["dark_gate", "dk_edge", "dk_marsh", "dk_grave", "dk_webs", "dk_ravine", "dk_ruins", "dk_heart"],
    alf: ["alf_gate", "alf_grove", "alf_lake", "alf_gardens", "alf_towers", "alf_freyr", "alf_beli"]
  };
  // Зони кліку (x, y — центр; w, h — розмір у % мапи). Стартова мапа — за картинками будівель (map_layout.js):
  // Дубова Застава на ній — це вхід south_gate («Південний район»).
  const CITY_ZONES = {                       // під картинку city_map.webp (з Town_1.png)
    south:  { x: 50.0, y: 79.0, w: 56, h: 28 },
    center: { x: 50.0, y: 51.0, w: 32, h: 28 },
    north:  { x: 50.0, y: 20.0, w: 56, h: 30 },
    trade:  { x: 16.5, y: 50.0, w: 32, h: 36 },
    rest:   { x: 83.0, y: 51.0, w: 32, h: 36 }
  };
  const DARK_ZONES = {                       // під картинку map_dark_forest.webp
    dark_gate: { x: 48.5, y: 78.0, w: 14.0, h: 18.0 },
    dk_edge:   { x: 24.0, y: 64.0, w: 12.0, h: 14.0 },
    dk_marsh:  { x: 13.0, y: 43.0, w: 15.0, h: 15.0 },
    dk_grave:  { x: 31.0, y: 25.0, w: 14.0, h: 16.0 },
    dk_webs:   { x: 70.0, y: 40.0, w: 16.0, h: 16.0 },
    dk_ravine: { x: 91.0, y: 67.0, w: 12.0, h: 16.0 },
    dk_ruins:  { x: 91.0, y: 11.0, w: 9.0,  h: 16.0 },
    dk_heart:  { x: 55.5, y: 9.5,  w: 14.0, h: 16.0 }
  };
  const ALF_ZONES = {                        // під картинку map_alfheim.webp (галявини світу 3)
    alf_gate:    { x: 7.0,  y: 90.0, w: 10.0, h: 15.0 },
    alf_grove:   { x: 16.5, y: 77.0, w: 13.0, h: 14.0 },
    alf_lake:    { x: 42.0, y: 64.0, w: 13.0, h: 14.0 },
    alf_gardens: { x: 72.0, y: 72.0, w: 14.0, h: 14.0 },
    alf_towers:  { x: 86.0, y: 36.0, w: 11.0, h: 14.0 },
    alf_freyr:   { x: 53.0, y: 28.0, w: 13.0, h: 14.0 },
    alf_beli:    { x: 22.0, y: 14.0, w: 14.0, h: 14.0 }
  };
  // Картинки локацій поверх галявин (assets/images/map/bld_<id>.webp): x, y — центр, w — ширина в % мапи
  const REGION_BUILDINGS = {
    alf: { alf_grove: { x: 16.5, y: 74.5, w: 11 }, alf_lake: { x: 42, y: 61.5, w: 11 }, alf_gardens: { x: 72, y: 69.5, w: 11 },
           alf_towers: { x: 86, y: 33.5, w: 10 }, alf_freyr: { x: 53, y: 25.5, w: 11 }, alf_beli: { x: 22, y: 11.5, w: 11 } }
  };
  function startZones() {
    const b = (RPG.MAP_LAYOUT && RPG.MAP_LAYOUT.buildings) || {};
    const z = {};
    for (const id of REGION_ORDER.start) z[id] = b[id === "south_gate" ? "city" : id];
    return z;
  }

  // Фігурка героя на мапі (assets/images/map/map_hero_*.webp): 1 герой — чоловік / жінка (стать головного героя),
  // 2 герої — 2 фігурки, 3 і більше — 3. Рахуються герої, що зараз удома (не в експедиції). Намальовані обличчям праворуч;
  // коли дорога веде ліворуч, фігурка дзеркалиться (клас is-left).
  function heroFigure(save) {
    const n = RPG.partyMembers(save).filter(ms => !RPG.isAway?.(ms)).length;
    const key = n >= 3 ? "3" : n === 2 ? "2" : RPG.heroGender(save) === "f" ? "1f" : "1m";
    const wrap = el("span", "hero-fig");
    const img = el("img");
    img.src = RPG.asset(`assets/images/map/map_hero_${key}.webp`);
    img.alt = "";
    img.decoding = "async";
    wrap.append(img);
    return wrap;
  }

  async function pageMaps() {
    const save = await requireSave();
    if (!save) return;
    const grid = $("loc-list");
    const details = $("loc-details");
    const mapBox = $("world-map");
    const t0 = RPG.travelState(save);
    const here = RPG.whereIs(save);
    // maps.html?region=… — переглянути інший відкритий світ (вкладки світів над мапою) і вирушити туди одразу (далека дорога)
    const want = new URLSearchParams(location.search).get("region");
    const view = !t0 && want && RPG.MAP_REGIONS[want] && RPG.REGION_CHAIN.includes(want) && RPG.isRegionOpen(save, want) ? want : here.region;
    const region = t0 ? t0.region : view;
    const away = !t0 && region !== here.region;   // інший світ: героя тут немає, дорога — через брами
    const R = RPG.MAP_REGIONS[region];
    const ZONES = Object.assign({}, region === "city" ? CITY_ZONES : region === "dark" ? DARK_ZONES : region === "alf" ? ALF_ZONES : startZones(), SITE_ZONES[region] || {});
    const districts = RPG.LOCATIONS.city.districts || [];
    const ids = REGION_ORDER[region].filter(id => ZONES[id] && R.spots[id]).concat(Object.keys(SITE_ZONES[region] || {}).filter(id => RPG.LOCATIONS[id]));
    let selected = t0 ? t0.to : away ? (ids.find(id => !isSite(id)) || ids[0]) : here.spot;
    let tipPinned = false;   // опис місця на мапі — лише після натискання гравця (спершу видно тільки фігурку й ім'я героя)
    let travelTimer = null;
    // Музика мапи: регіон світу; на мапі Дубової Застави — тема району, куди йде (або де стоїть) герой
    RPG.audio?.scene({ screen: "map", region, district: region === "city" ? selected : null });

    // Опис місця регіону: { name, desc, loc? (LOCATIONS), district? }
    function place(id) {
      if (region === "city") {
        const d = districts.find(x => x.id === id);
        return { name: d.name, desc: `${d.building}. ${d.description}`, district: d, typeLabel: d.building };
      }
      const loc = RPG.LOCATIONS[id];
      return { name: loc.name, desc: loc.description, loc, typeLabel: TYPE_LABEL[loc.type] + (loc.minLevel ? ` · від ${loc.minLevel} рів.` : "") };
    }

    // here | open | closed | road (поки герой у дорозі)
    function placeState(id) {
      if (isSite(id)) {
        const can = RPG.canEnterLocation(id, RPG.LOCATIONS[id].minLevel || 1, save);
        return can.ok ? { kind: "site", text: "Без дороги — лише експедиція (3 або 6 героїв, 4 год)" } : { kind: "closed", text: can.reason };
      }
      const tr = RPG.travelState(save);
      if (tr) {
        if (tr.to !== id) return { kind: "closed", text: "Ви в дорозі" };
        return tr.next ? { kind: "here", text: `Звідси — далі: ${RPG.regionName(tr.next.region)}` } : { kind: "here", text: "Сюди прямуєте" };
      }
      if (away) {                                  // інший світ — маршрут складеться через брами
        const p = RPG.planTrip(save, region, id);
        if (!p.ok) return { kind: "closed", text: p.reason };
        return { kind: "open", text: `Час у дорозі: ${RPG.fmtLeft(p.seconds * 1000)}`, seconds: p.seconds, trip: p };
      }
      if (here.spot === id) return { kind: "here", text: "Ви тут" };
      const can = RPG.canGo(save, region, id);
      if (!can.ok) return { kind: "closed", text: can.reason };
      const r = RPG.route(region, here.spot, id);
      if (!r) return { kind: "closed", text: "Туди немає дороги." };
      const sec = RPG.travelSeconds(r.cells, region, save);
      return { kind: "open", text: `Час у дорозі: ${RPG.fmtLeft(sec * 1000)}`, cells: r.cells, seconds: sec };
    }

    function shortText(s, n = 130) {
      return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
    }

    // ---------- Картинка мапи ----------
    const h2 = mapBox.closest(".panel")?.querySelector("h2");
    if (h2) {
      h2.textContent = `Мапа: ${R.name}`;
      // Короткий опис регіону під заголовком (data/routes.js → MAP_REGIONS[…].desc)
      const head = h2.closest(".map-head") || h2;   // заголовок разом із кнопкою-глобусом
      let sub = head.nextElementSibling;
      if (!sub || !sub.classList.contains("map-desc")) {
        sub = el("p", "note map-desc", "");
        head.after(sub);
      }
      sub.textContent = R.desc ? `(${R.desc})` : "";
      sub.hidden = !R.desc;
    }
    // Вкладки світів: переглянути мапу іншого відкритого світу (у дорозі — лише показують, де герой)
    mapBox.parentElement.querySelector(".map-worlds")?.remove();
    const tabs = el("div", "map-worlds");
    tabs.setAttribute("role", "group");
    tabs.setAttribute("aria-label", "Світи");
    for (const r of RPG.REGION_CHAIN) {
      if (!RPG.MAP_REGIONS[r]) continue;
      const open = RPG.isRegionOpen(save, r);
      const cls = "map-world" + (r === region ? " is-active" : "") + (r === here.region ? " is-here" : "") + (open ? "" : " is-locked");
      let tab;
      if (open && !t0 && r !== region) {
        tab = el("a", cls, RPG.MAP_REGIONS[r].name);
        tab.href = r === here.region ? "maps.html" : `maps.html?region=${r}`;
      } else {
        tab = el("span", cls, RPG.MAP_REGIONS[r].name);
        if (!open) tab.title = "Закрито";
        if (r === region) tab.setAttribute("aria-current", "page");
      }
      if (r === here.region) tab.setAttribute("aria-label", `${RPG.MAP_REGIONS[r].name} — ви тут`);
      tabs.append(tab);
    }
    mapBox.before(tabs);
    const img = mapBox.querySelector(".map-img");
    img.src = RPG.asset(R.image);
    img.width = R.w; img.height = R.h;
    img.alt = `Мапа: ${R.name}`;
    mapBox.classList.add("region-" + region);
    if (region === "start" && RPG.MAP_LAYOUT) {
      const layer = el("div", "map-buildings");
      for (const [id, b] of Object.entries(RPG.MAP_LAYOUT.buildings || {})) {
        const bi = el("img", "map-building");
        bi.src = RPG.asset(`assets/images/map/bld_${id}.webp`);
        bi.alt = "";
        Object.assign(bi.style, { left: b.x + "%", top: b.y + "%", width: b.w + "%", height: b.h + "%" });
        layer.append(bi);
      }
      img.after(layer);
    }
    if (REGION_BUILDINGS[region]) {
      const layer = el("div", "map-buildings");
      for (const [id, b] of Object.entries(REGION_BUILDINGS[region])) {
        const bi = el("img", "map-building");
        bi.src = RPG.asset(`assets/images/map/bld_${id}.webp`);
        bi.alt = "";
        Object.assign(bi.style, { left: b.x + "%", top: b.y + "%", width: b.w + "%", height: (b.w * R.w / R.h) + "%" });
        layer.append(bi);
      }
      img.after(layer);
    }
    const siteBlds = Object.keys(SITE_ZONES[region] || {}).filter(id => RPG.LOCATIONS[id] && SITE_BUILDINGS.has(id));
    if (siteBlds.length) {
      const layer = el("div", "map-buildings");
      for (const id of siteBlds) {
        const z = SITE_ZONES[region][id], bi = el("img", "map-building");
        bi.src = RPG.asset(`assets/images/map/bld_${id}.webp`);
        bi.alt = "";
        Object.assign(bi.style, { left: z.x + "%", top: z.y + "%", width: SITE_BLD_W + "%", height: (SITE_BLD_W * R.w / R.h) + "%" });
        layer.append(bi);
      }
      img.after(layer);
    }
    // Лінія маршруту (видно під час дороги)
    const pathLayer = el("div", "map-route");
    img.after(pathLayer);

    let tip = null, hero = null, timerTag = null;
    for (const id of ids) {
      const pos = ZONES[id], p = place(id);
      const spot = button("", "map-spot" + (region === "city" ? " map-district" : "") + (isSite(id) ? " map-site" : ""));
      spot.dataset.loc = id;
      if (isSite(id)) spot.innerHTML = `<span class="site-badge">${SITE_ICON[RPG.LOCATIONS[id].type]}</span>`;
      Object.assign(spot.style, { left: pos.x + "%", top: pos.y + "%", width: pos.w + "%", height: pos.h + "%" });
      if (SITE_BUILDINGS.has(id)) {           // зона кліку — по будівлі
        const w = SITE_BLD_W * 0.8;
        spot.classList.add("has-bld");
        Object.assign(spot.style, { width: w + "%", height: (w * R.w / R.h) + "%" });
      }
      spot.setAttribute("aria-label", p.name);
      spot.addEventListener("mouseenter", () => showTip(id));
      spot.addEventListener("focus", () => showTip(id));
      spot.addEventListener("mouseleave", restTip);
      spot.addEventListener("blur", restTip);
      spot.addEventListener("click", () => { selected = id; tipPinned = true; render(); });
      spot.addEventListener("dblclick", () => isSite(id) ? showExpeditionDialog(id) : go(id));
      mapBox.append(spot);
    }
    tip = el("div", "map-tip");
    tip.hidden = true;
    mapBox.append(tip);
    hero = el("div", "map-hero");
    hero.append(heroFigure(save));
    hero.append(el("span", "hero-tag", save.character.name));
    timerTag = el("span", "hero-timer");
    timerTag.hidden = true;
    hero.append(timerTag);
    mapBox.append(hero);

    function setHero(x, y) {
      hero.style.left = x + "%";
      hero.style.top = y + "%";
    }

    function showTip(id) {
      mapBox.querySelectorAll(".map-spot").forEach(s => {
        s.classList.toggle("is-selected", s.dataset.loc === selected);
        const st = placeState(s.dataset.loc);
        s.classList.toggle("is-closed", st.kind === "closed");
      });
      const pos = ZONES[id];
      if (!pos) { tip.hidden = true; return; }
      const p = place(id), st = placeState(id);
      tip.innerHTML = "";
      tip.append(el("strong", null, p.name), el("div", `tip-status tip-${st.kind}`, st.text),
                 el("div", "tip-desc", shortText(p.desc)));
      let below = pos.y < 45;
      tip.style.left = Math.min(82, Math.max(18, pos.x)) + "%";
      tip.style.top = (below ? pos.y + pos.h / 2 : pos.y - pos.h / 2) + "%";
      tip.style.transform = "";
      tip.classList.toggle("tip-below", below);
      tip.hidden = false;
      // Маленька мапа (телефон): підказка не повинна вилазити за край — міряємо й зсуваємо
      const mh = mapBox.clientHeight, th = tip.offsetHeight, gap = 6;
      if (mh > 40 && th) {
        const topPx = (pos.y - pos.h / 2) / 100 * mh, botPx = (pos.y + pos.h / 2) / 100 * mh;
        const fitsAbove = topPx - th - gap >= 0, fitsBelow = botPx + gap + th <= mh;
        if (below && !fitsBelow && fitsAbove) below = false;
        else if (!below && !fitsAbove && fitsBelow) below = true;
        const y = Math.max(0, Math.min(mh - th, below ? botPx + gap : topPx - th - gap));
        tip.style.top = y + "px";
        const mw = mapBox.clientWidth, tw = tip.offsetWidth;
        tip.style.left = Math.max(tw / 2, Math.min(mw - tw / 2, pos.x / 100 * mw)) + "px";
        tip.style.transform = "translateX(-50%)";
      }
    }

    // ---------- Дорога ----------
    function drawRoute(pts) {
      const line = pts.map(p => p.join(",")).join(" ");
      pathLayer.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${line}"/></svg>`;
    }

    let lastX = null;
    function tick() {
      const tr = RPG.travelState(save);
      if (!tr) return;
      // Куди йде фігурка: ліворуч — дзеркально (на початку — за напрямком усієї дороги)
      const dx = lastX == null ? tr.pts[tr.pts.length - 1][0] - tr.pts[0][0] : tr.pos.x - lastX;
      if (Math.abs(dx) > 0.02) hero.classList.toggle("is-left", dx < 0);
      lastX = tr.pos.x;
      setHero(tr.pos.x, tr.pos.y);
      timerTag.textContent = RPG.fmtLeft(tr.totalLeftMs);
      if (tr.leftMs > 0) return;
      clearInterval(travelTimer);
      RPG.finishTravel(save);
      // Далека дорога: відрізок скінчився — брама позаду, мапа змінюється на наступний світ
      RPG.saveGame(save).then(() => { location.replace(RPG.isTraveling(save) ? "maps.html" : "game.html"); });
    }

    function followTravel() {
      const tr = RPG.travelState(save);
      if (!tr) return;
      document.body.classList.add("is-traveling");
      lockNavForTravel();
      drawRoute(tr.pts);
      hero.classList.add("is-walking", "on-road");
      hero.classList.add("no-anim");
      setHero(tr.pos.x, tr.pos.y);
      void hero.offsetWidth;
      hero.classList.remove("no-anim");
      timerTag.hidden = false;
      tick();
      travelTimer = setInterval(tick, 250);
    }

    async function go(id) {
      if (RPG.isTraveling(save)) return;
      const can = away ? RPG.planTrip(save, region, id) : RPG.canGo(save, region, id);
      if (can.ok && (away || RPG.route(region, here.spot, id)) && save.fieldLoot) await showFieldLoot(save);   // здобич поля бою — перед дорогою
      const r = RPG.startTravel(save, id, Date.now(), away ? region : null);
      if (!r.ok) { selected = id; render(); showMsg($("map-msg"), r.reason, true); return; }
      await RPG.saveGame(save);
      if (away) { location.replace("maps.html"); return; }   // далека дорога: мапа першого відрізка
      selected = id;
      render();
      followTravel();
    }

    // ---------- Список місць і опис ----------
    // Без наведення: підказка обраного місця — лише якщо гравець сам натиснув на місце
    // (на початку видно тільки фігурку героя з ім'ям; у дорозі підказка схована, щоб не закривати фігурку)
    function restTip() {
      showTip(selected);
      if (!tipPinned || RPG.isTraveling(save)) tip.hidden = true;
    }

    function render() {
      restTip();
      grid.innerHTML = "";
      for (const id of ids) {
        const p = place(id), st = placeState(id);
        const cell = button("", "wf loc-card " + (st.kind === "closed" ? "wf-locked" : "wf-link"));
        cell.append(el("strong", null, p.name));
        cell.append(el("span", "loc-desc", st.kind === "open" || st.kind === "site" ? p.typeLabel
          : st.kind === "closed" && !RPG.isTraveling(save) ? "Закрито" : st.text));
        if (selected === id) cell.classList.add("is-selected");
        if (st.kind === "closed") cell.setAttribute("aria-disabled", "true");
        cell.addEventListener("click", () => { selected = id; tipPinned = true; render(); });
        grid.append(cell);
      }
      renderDetails();
    }

    function renderDetails() {
      const p = place(selected), st = placeState(selected);
      details.innerHTML = "";
      const banner = el("div", "place-banner info-anchor");
      banner.style.setProperty("--loc-img", locImage(region === "city" ? "city" : selected));
      banner.append(el("h2", null, p.name));
      details.append(banner);
      details.append(noteP(p.desc));
      if (RPG.expeditionList(save).length) {
        const panel = RPG.ui.expeditionPanel(save, () => render());
        if (panel) details.prepend(panel);
      }
      if (p.loc && isSite(selected)) {
        details.append(el("p", "note keep", "Видобуток за кожен виграний бій: " + p.loc.yields.map(id => `${RPG.ITEMS[id].name} 1–3`).join(", ") + "."));
        const pool = p.loc.enemies.map(e => RPG.getEnemy(e)).sort((a, b) => a.level - b.level);
        details.append(noteP("Вороги — з усього світу (без босів): " + pool.map(e => `${e.name} (рів. ${e.level})`).join(", ")));
      }
      if (p.loc && p.loc.type === "combat") {
        const enemies = (p.loc.enemies || []).map(e => `${RPG.getEnemy(e).name} (рів. ${RPG.getEnemy(e).level})` +
          (p.loc.dungeon && RPG.ENEMIES[e]?.boss ? ` — лише в данжі «${RPG.DUNGEONS[p.loc.dungeon].name}»` : "")).join(", ");
        details.append(noteP("Вороги: " + enemies));
      }
      const tr = RPG.travelState(save);
      if (tr) {
        if (!tr.dest || (tr.dest.region === tr.region && !tr.next)) {
          details.append(el("p", "status", `Ви в дорозі до «${tr.destName}». Переміщення не скасувати — дочекайтеся прибуття.`));
          return;
        }
        const path = [tr.region, ...(tr.legs || []).map(l => l.region)].map(RPG.regionName).join(" → ");
        details.append(el("p", "status", `Ви в дорозі до «${tr.destName}» (${RPG.regionName(tr.dest.region)}). Дорога: ${path}. ` +
          `Брами герой пройде сам. Переміщення не скасувати — дочекайтеся прибуття.`));
        return;
      }
      if (away) {                                  // інший світ: лише далека дорога
        if (st.kind === "open") {
          const path = [...new Set(st.trip.legs.map(l => l.region))].map(RPG.regionName).join(" → ");
          details.append(button(`Вирушити · ${RPG.fmtLeft(st.seconds * 1000)}`, "wf wf-button", () => go(selected)));
          details.append(noteP(`Дорога: ${path}. Брами й корінь Іггдрасиля герой пройде сам, а час — як пішки всіма відрізками дороги. Переміщення не можна скасувати.`));
        } else if (st.kind === "site") {
          details.append(el("p", "status", "Експедицію сюди відправляють, коли ви в цьому світі."));
        } else {
          details.append(el("p", "status", st.text));
        }
        return;
      }
      // Експедиція: бойові локації (вороги без босів), Шахта й Лісопилка
      if (p.loc && RPG.isExpeditionLoc?.(selected)) {
        if (st.kind === "closed" && isSite(selected)) { details.append(el("p", "status", st.text)); return; }
        const b = button("Відправити експедицію · 4 год", "wf " + (isSite(selected) ? "wf-button" : "wf-secondary"), () => showExpeditionDialog(selected));
        const freeN = RPG.partyMembers(save).filter(ms => !RPG.isMemberDead(ms) && !RPG.isAway(ms)).length;
        const bags = RPG.expeditionList(save).filter(e => e.done).length;
        if (bags >= RPG.EXP_MAX_BAGS) { b.disabled = true; b.title = "Спершу заберіть здобич повернених експедицій."; }
        else if (RPG.expeditionActive(save) && freeN < RPG.EXP_SIZES[0]) { b.disabled = true; b.title = `Удома лишилось ${freeN} вільних героїв — для ще однієї експедиції треба ${RPG.EXP_SIZES[0]}.`; }
        details.append(b);
        if (isSite(selected)) { details.append(noteP("До Шахти й Лісопилки немає дороги: туди лише відправляють експедицію з мапи.")); return; }
      }
      if (RPG.expeditionActive(save)) {
        const freeHome = RPG.partyMembers(save).filter(ms => !RPG.isMemberDead(ms) && !RPG.isAway(ms)).length;
        details.append(el("p", "status", "Поки експедиція в дорозі, переходити між локаціями не можна — доступні лише «Персонаж», «Інвентар», «Мапа», «Налаштування» і «Головне меню»." +
          (freeHome >= RPG.EXP_SIZES[0] ? ` Удома лишилось вільних героїв: ${freeHome} — з них можна відправити ще одну експедицію (оберіть бойову локацію, Шахту чи Лісопилку).` : "")));
        return;
      }
      if (st.kind === "here") {
        details.append(link("Ви тут — відкрити локацію", "game.html"));
        if (region === "city" && selected === "south") {
          details.append(button("Вийти з Дубової Застави", "wf wf-secondary", async () => {
            RPG.leaveCityToStart(save);
            await RPG.saveGame(save);
            location.reload();
          }));
        }
        return;
      }
      if (st.kind === "open") {
        details.append(button(`Вирушити · ${RPG.fmtLeft(st.seconds * 1000)}`, "wf wf-button", () => go(selected)));
        details.append(noteP("Переміщення не можна скасувати; у дорозі доступні лише «Персонаж», «Інвентар» і «Мапа»."));
      } else {
        details.append(el("p", "status", st.text));
      }
    }

    // ---------- Вікно експедиції: 3 або 6 героїв на 4 години ----------
    function showExpeditionDialog(locId) {
      const loc = RPG.LOCATIONS[locId];
      const members = RPG.partyMembers(save).map((ms, i) => ({ ms, id: RPG.memberIdOf(save, ms), i }));
      const why = m => RPG.isMemberDead(m.ms) ? "полеглий" : RPG.isAway(m.ms) ? "в експедиції"
        : loc.minLevel && m.ms.character.level < loc.minLevel ? `потрібен ${loc.minLevel} рів.` : "";
      const ok = members.filter(m => !why(m));
      let size = ok.length >= 6 ? 6 : 3;
      const chosen = new Set(ok.slice(0, size).map(m => m.id));
      const { dlg, closeBtn } = noticeDialog("exp-dialog");
      const draw = () => {
        dlg.innerHTML = "";
        dlg.append(closeBtn(), el("h3", null, `Експедиція: ${loc.name}`));
        dlg.append(el("p", null, "Група 4 години безперервно б'ється з ворогами локації (без босів). На бої з чемпіонами погоджується сама. " +
          "Здобич — як у звичайних боях" + (loc.yields ? `, а ще за кожен виграний бій: ${loc.yields.map(id => RPG.ITEMS[id].name.toLowerCase() + " 1–3").join(", ")}` : "") + ". " +
          "Експедиція повертається, коли мине час або коли загинуть усі її герої. Між боями група стає на привал."));
        const ap = RPG.getAutoPotion?.();
        dlg.append(el("p", "note keep", ap && (ap.hp.on || ap.mp.on)
          ? `Автозілля ввімкнено (Налаштування): після кожного бою герої п'ють зілля з інвентаря за тими ж правилами${ap.hp.on ? ` — HP нижче ${ap.hp.below}% до ${ap.hp.upTo}%` : ""}${ap.mp.on ? `${ap.hp.on ? "," : " —"} MP нижче ${ap.mp.below}% до ${ap.mp.upTo}%` : ""}. Зілля спільні з тими, хто лишився вдома.`
          : "Автозілля вимкнено (Налаштування) — в експедиції зілля не п'ють, лише привал."));
        dlg.append(el("p", "note keep", "Поки експедиція в дорозі, переходити між локаціями не можна — доступні лише «Персонаж», «Інвентар», «Мапа», «Налаштування» і «Головне меню». Її герої не міняють речей і їх не можна звільнити. " +
          "З тих, хто лишився вдома, можна відправити ще одну експедицію (одночасно — дві по 3 героя або одна на 6). Будьте обережні: чемпіони (утричі сильніші) трапляються часто, а полеглі до кінця експедиції не встають."));
        const sizes = el("div", "row exp-sizes");
        for (const n of RPG.EXP_SIZES) {
          const b = button(`${n} героїв`, "wf " + (size === n ? "wf-button" : "wf-link"), () => {
            size = n; chosen.clear(); ok.slice(0, n).forEach(m => chosen.add(m.id)); draw();
          });
          if (ok.length < n) { b.disabled = true; b.title = `Потрібно ${n} героїв, що можуть піти (зараз ${ok.length}).`; }
          sizes.append(b);
        }
        dlg.append(sizes);
        const list = el("div", "stack exp-heroes");
        for (const m of members) {
          const w = why(m);
          const row = el("label", "exp-hero" + (w ? " is-off" : ""));
          const cb = el("input"); cb.type = "checkbox"; cb.disabled = !!w || size === 6; cb.checked = chosen.has(m.id);
          cb.addEventListener("change", () => {
            if (cb.checked) { if (chosen.size >= size) { cb.checked = false; return; } chosen.add(m.id); } else chosen.delete(m.id);
            draw();
          });
          row.append(cb, el("span", null, `${m.ms.character.name} — ${RPG.getClass(m.ms.character.classId).name}, рів. ${m.ms.character.level}` + (w ? ` (${w})` : "")));
          list.append(row);
        }
        dlg.append(list);
        const ids = [...chosen];
        const can = RPG.canStartExpedition(save, locId, ids);
        const go = button(`Відправити (${ids.length}/${size})`, "wf wf-button", async () => {
          const r = RPG.startExpedition(save, locId, ids);
          if (!r.ok) { showMsg($("map-msg"), r.reason, true); return; }
          await RPG.saveGame(save);
          dlg.close();
          render();
          showMsg($("map-msg"), `Експедиція вирушила: ${loc.name}. Повернеться за 4 години.`);
        });
        go.disabled = ids.length !== size || !can.ok;
        dlg.append(go);
        if (ids.length === size && !can.ok) dlg.append(el("p", "status", can.reason));
        if (ok.length < 3) dlg.append(el("p", "status", `Для експедиції потрібно щонайменше 3 героїв, що можуть піти (зараз ${ok.length}). Напарників наймають на Дошці оголошень біля Мерії.`));
      };
      draw();
      document.body.append(dlg);
      dlg.showModal();
    }

    // Експедиція: бої йдуть і поки відкрита мапа
    setInterval(async () => {
      if (!RPG.expeditionActive(save)) return;
      if (RPG.expeditionTick(save)) { RPG.ui.hardcoreCheck(save); await RPG.saveGame(save).catch(e => console.error(e)); }
      if (!document.querySelector("dialog[open]")) renderDetails();
    }, 15000);

    $("globe-btn")?.addEventListener("click", () => showGlobeMap(save));

    if (t0) {
      followTravel();
    } else if (away) {
      hero.hidden = true;                          // героя в цьому світі немає
    } else {
      const s = R.spots[here.spot] || R.spots[ids[0]];
      hero.classList.add("no-anim");
      setHero(s.x, s.y);
    }
    render();
  }

  // ---------- Глобальна мапа дев'яти світів (кнопка-глобус на сторінці «Мапа», дані — data/worlds.js) ----------
  // Одна велика картина всіх світів із точками локацій. Світ відкритий лише тоді, коли до нього відкрито шлях
  // (data/worlds.js → isWorldOpen); закритий світ затемнений сірим по своїй межі, усі його точки сірі.
  // У відкритому світі точка кольорова, якщо в локацію можна зайти. Фігурка — там, де зараз герой
  // (у дорозі — між точками дороги; у Дубовій Заставі — біля її брами в Гардариці).
  function globeWorlds(save) {
    const lvl = save.character.level;
    return (RPG.WORLDS || []).map(w => {
      const path = RPG.isWorldOpen ? RPG.isWorldOpen(save, w.n) : { ok: !!w.region };
      let spots;
      if (!path.ok) {                              // шлях у світ закритий — усі точки сірі
        const list = w.region && w.at ? (REGION_ORDER[w.region] || Object.keys(w.at)).filter(id => w.at[id])
          .map(id => ({ id, name: id === "south_gate" ? "Дубова Застава" : (RPG.LOCATIONS[id]?.name || id), x: w.at[id][0], y: w.at[id][1] }))
          : (w.spots || []);
        spots = list.map(s => ({ ...s, open: false, reason: path.reason }));
      } else if (w.region && w.at) {
        spots = (REGION_ORDER[w.region] || Object.keys(w.at)).filter(id => w.at[id]).map(id => {
          const loc = RPG.LOCATIONS[id];
          const can = id === "south_gate" ? { ok: true } : RPG.canEnterLocation(id, lvl, save);
          return { id, name: id === "south_gate" ? "Дубова Застава" : (loc?.name || id), x: w.at[id][0], y: w.at[id][1],
                   open: can.ok, reason: can.reason || "" };
        });
      } else {
        spots = (w.spots || []).map(s => ({ ...s, open: false, reason: "Закрито — світ відкриється згодом." }));
      }
      return { ...w, spots, open: path.ok, lockReason: path.reason || "" };
    });
  }

  // Де герой на глобальній картині: { n — номер світу, x, y — % картини, spot? }
  function globeHero(save, worlds) {
    const tr = RPG.travelState(save);
    const region = tr ? tr.region : RPG.whereIs(save).region;
    if (region === "city") {                       // Дубова Застава — біля її брами на мапі Гардарики
      const w = worlds.find(x => x.region === "start");
      return w?.at?.south_gate ? { n: w.n, x: w.at.south_gate[0], y: w.at.south_gate[1], spot: "south_gate" } : null;
    }
    const w = worlds.find(x => x.region === region);
    if (!w?.at) return null;
    if (tr) {                                      // у дорозі: між точками «звідки» й «куди»
      const a = w.at[tr.from], b = w.at[tr.to];
      if (!a || !b) return null;
      const k = tr.progress;
      return { n: w.n, x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, left: b[0] < a[0] };
    }
    const spot = RPG.whereIs(save).spot, p = w.at[spot];
    return p ? { n: w.n, x: p[0], y: p[1], spot } : null;
  }

  function showGlobeMap(save) {
    document.querySelector(".globe-dialog")?.remove();
    const M = RPG.WORLD_MAP;
    if (!M) return;
    const worlds = globeWorlds(save);
    const hero = globeHero(save, worlds);

    const dlg = el("dialog", "globe-dialog");
    dlg.setAttribute("aria-label", "Мапа дев'яти світів");
    const head = el("div", "globe-head");
    head.append(el("h2", null, "Дев'ять світів Іггдрасиля"));
    const legend = el("div", "globe-legend");
    const leg = (cls, text) => { const s = el("span", "globe-leg"); s.append(el("i", cls), document.createTextNode(text)); return s; };
    legend.append(leg("globe-dot is-open", "доступно"), leg("globe-dot is-closed", "закрито"), leg("globe-leg-hero", "ви тут"));
    const close = button("×", "globe-close", () => dlg.close());
    close.setAttribute("aria-label", "Закрити");
    head.append(legend, close);

    const scroll = el("div", "globe-scroll");
    const board = el("div", "globe-board");
    board.style.aspectRatio = `${M.w} / ${M.h}`;
    scroll.append(board);

    const base = el("img", "globe-img");
    base.src = RPG.asset(M.image);
    base.alt = "Мапа дев'яти світів";
    board.append(base);
    // Закриті світи — та сама картина в сірих тонах, обрізана по межі світу
    for (const w of worlds) {
      if (w.open || !w.area) continue;
      const fog = el("img", "globe-fog");
      fog.src = base.src;
      fog.alt = "";
      fog.style.clipPath = `polygon(${w.area.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
      board.append(fog);
    }

    const tip = el("div", "map-tip globe-tip");
    tip.hidden = true;
    let tipFor = null, tipPin = null;   // tipPin — точка, на яку натиснули: підказка з кнопкою «Вирушити» не ховається
    function showTip(dot, w, s, here) {
      tipFor = dot;
      tip.innerHTML = "";
      // Далека дорога: у відкриту точку будь-якого відкритого світу — одразу, маршрут через брами складеться сам
      const trip = !here && s.open && w.region && !RPG.isTraveling(save) ? RPG.planTrip(save, w.region, s.id) : null;
      const st = here ? ["here", "Ви тут"] : !s.open ? ["closed", s.reason || "Закрито"]
        : trip && !trip.ok && trip.reason !== "Ви вже тут." ? ["closed", trip.reason] : ["open", "Доступно"];
      tip.append(el("strong", null, s.name), el("div", "tip-desc", `Світ ${w.n} · ${w.name}`),
                 el("div", `tip-status tip-${st[0]}`, st[1]));
      tip.classList.toggle("has-go", !!trip?.ok);
      if (trip?.ok) {
        tip.append(button(`Вирушити · ${RPG.fmtLeft(trip.seconds * 1000)}`, "wf wf-button globe-go", async ev => {
          ev.stopPropagation();
          if (save.fieldLoot) await showFieldLoot(save);          // здобич поля бою — перед дорогою
          const r = RPG.startTravel(save, s.id, Date.now(), w.region);
          if (!r.ok) { tip.querySelector(".tip-status").textContent = r.reason; return; }
          await RPG.saveGame(save);
          location.replace("maps.html");
        }));
      }
      tip.hidden = false;
      const br = board.getBoundingClientRect(), dr = dot.getBoundingClientRect();
      const x = dr.left + dr.width / 2 - br.left, top = dr.top - br.top;
      const below = top < tip.offsetHeight + 12;
      tip.classList.toggle("tip-below", below);
      tip.style.top = (below ? top + dr.height : top) + "px";
      const half = tip.offsetWidth / 2;
      tip.style.left = Math.max(half + 4, Math.min(br.width - half - 4, x)) + "px";
    }
    function hideTip(dot) {
      if (dot && tipPin) return;                   // натиснута точка — підказка лишається, доки не клікнуть деінде
      if (!dot || tipFor === dot) { tip.hidden = true; tipFor = null; tipPin = null; }
    }

    for (const w of worlds) {
      if (w.label) {
        const label = el("div", "globe-label" + (w.open ? "" : " is-locked") + (hero?.n === w.n ? " is-current" : ""));
        label.style.left = w.label.x + "%";
        label.style.top = w.label.y + "%";
        label.append(el("strong", null, `${w.n} · ${w.name}`), el("span", null, w.open ? (w.sub || "") : "Закрито"));
        board.append(label);
      }
      for (const s of w.spots) {
        const here = hero && hero.n === w.n && hero.spot && hero.spot === s.id;
        const dot = button("", "globe-dot " + (s.open ? "is-open" : "is-closed") + (here ? " is-here" : ""));
        dot.style.left = s.x + "%";
        dot.style.top = s.y + "%";
        dot.setAttribute("aria-label", `${s.name} — ${here ? "ви тут" : s.open ? "доступно" : "закрито"}`);
        dot.addEventListener("mouseenter", () => { if (!tipPin) showTip(dot, w, s, here); });
        dot.addEventListener("focus", () => { if (!tipPin) showTip(dot, w, s, here); });
        dot.addEventListener("click", () => { tipPin = dot; showTip(dot, w, s, here); });
        dot.addEventListener("mouseleave", () => hideTip(dot));
        dot.addEventListener("blur", () => hideTip(dot));
        board.append(dot);
      }
    }
    let heroEl = null;
    if (hero) {
      heroEl = el("div", "globe-hero");
      heroEl.append(heroFigure(save));
      heroEl.classList.toggle("is-left", !!hero.left);
      heroEl.append(el("span", "hero-tag", save.character.name));
      heroEl.style.left = hero.x + "%";
      heroEl.style.top = hero.y + "%";
      board.append(heroEl);
    }
    board.append(tip);
    board.addEventListener("click", ev => { if (!ev.target.closest(".globe-dot, .globe-tip")) hideTip(); });

    dlg.append(head, scroll);
    document.body.append(dlg);
    dlg.addEventListener("close", () => dlg.remove());
    dlg.addEventListener("click", ev => { if (ev.target === dlg) dlg.close(); });   // клік по затемненню — закрити
    dlg.showModal();
    // Вузький екран (картина ширша за вікно): прокрутити до героя
    if (heroEl && scroll.scrollWidth > scroll.clientWidth) {
      scroll.scrollLeft = heroEl.offsetLeft - scroll.clientWidth / 2;
      scroll.scrollTop = heroEl.offsetTop - scroll.clientHeight / 2;
    }
  }

  // ---------- Запуск ----------

  RPG.pages.pageMaps = pageMaps;
})(window.RPG);

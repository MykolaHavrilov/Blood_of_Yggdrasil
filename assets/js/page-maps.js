// ============================================================
// page-maps.js — Екран «Мапа»: три частини світу.
// Частина колишнього game.js: спільне беремо з game-common.js (RPG.ui), запуск — game-main.js.
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, setBar, fmtNum, fmtDate, fmtStat, MSG_SEC, toastParent, raiseToasts, clearToasts, toastHost, showMsg, showNoGame, requireSave, showKeyPocket, showLootFilter, renderFilterBtn, whenNoDialog, queueDialog, noticeClose, noticeDialog, showNotice, journalReward, meetStranger, showParchment, BOOK, bookMotionOff, bookWide, bookBlobs, bookAnimUrl, playBookAnim, dropBookAnim, chronicleSection, showChronicle, forgeBookTable, forgeBookAuto, forgeBookSection, dataBookSection, openLibraryBook, showDataBook, showForgeBook, fieldLootAdd, showFieldLoot, TRAVEL_HREFS, blockLink, lockNavForTravel, unlockNavAfterTravel, showTravelBanner, startRegenTimer, itemLabel, rarityName, itemIcon, rarityTextClass, miniPlaceholder, fillItemCell, socketMarks, SLOT_SHORT, fillEquipCell, smallIcon, slotClass, renderHeroDoll, renderHeroGs, miniBar, renderPartyList, memberTabs, groupMemberTabs, renderHeroBars, expInfo, bindExpInfo, describeStats, describeEffect, useResultText, locImage, TYPE_NAMES, RARITY_NAMES, itemInfo, MSG_MAX } = RPG.ui;

  // МАПА: три частини світу (data/routes.js → MAP_REGIONS), переміщення з часом (travel.js)
  // ============================================================
  const TYPE_LABEL = { home: "Безпечно", temple: "Безпечно", tavern: "Торговець", city: "Гільдія", combat: "Бої", gate: "Брама", citygate: "Вхід у Дубову Заставу" };
  // Порядок місць у списку під мапою
  const REGION_ORDER = {
    start: ["home", "temple", "village_start", "tavern", "south_gate", "forest_path", "forest_cave"],
    city: ["south", "center", "trade", "rest", "north"],
    dark: ["dark_gate", "dk_edge", "dk_marsh", "dk_grave", "dk_webs", "dk_ravine", "dk_ruins", "dk_heart"]
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
  function startZones() {
    const b = (RPG.MAP_LAYOUT && RPG.MAP_LAYOUT.buildings) || {};
    const z = {};
    for (const id of REGION_ORDER.start) z[id] = b[id === "south_gate" ? "city" : id];
    return z;
  }

  // Фігурка героя (SVG)
  const HERO_FIGURE = `<svg viewBox="0 0 24 40" aria-hidden="true">
    <circle cx="12" cy="6" r="5" fill="#f4d3a6" stroke="#3a2a14" stroke-width="1.2"/>
    <path d="M6 13 h12 l2 13 h-4 l-1 13 h-3 l-0.5 -9 h-1 l-0.5 9 h-3 l-1 -13 h-4 z" fill="#2f6fd6" stroke="#10213f" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M7 15 l-4 9" stroke="#f4d3a6" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M17 15 l3 6 l1 -7" stroke="#8a5a2b" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`;

  async function pageMaps() {
    const save = await requireSave();
    if (!save) return;
    const grid = $("loc-list");
    const details = $("loc-details");
    const mapBox = $("world-map");
    const t0 = RPG.travelState(save);
    const here = RPG.whereIs(save);
    const region = t0 ? t0.region : here.region;
    const R = RPG.MAP_REGIONS[region];
    const ZONES = region === "city" ? CITY_ZONES : region === "dark" ? DARK_ZONES : startZones();
    const districts = RPG.LOCATIONS.city.districts || [];
    const ids = REGION_ORDER[region].filter(id => ZONES[id] && R.spots[id]);
    let selected = t0 ? t0.to : here.spot;
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
      const tr = RPG.travelState(save);
      if (tr) return tr.to === id ? { kind: "here", text: "Сюди прямуєте" } : { kind: "closed", text: "Ви в дорозі" };
      if (here.spot === id) return { kind: "here", text: "Ви тут" };
      const can = RPG.canGo(save, region, id);
      if (!can.ok) return { kind: "closed", text: can.reason };
      const r = RPG.route(region, here.spot, id);
      if (!r) return { kind: "closed", text: "Туди немає дороги." };
      return { kind: "open", text: `Час у дорозі: ${RPG.fmtLeft(RPG.travelSeconds(r.cells, region, save) * 1000)}`, cells: r.cells };
    }

    function shortText(s, n = 130) {
      return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
    }

    // ---------- Картинка мапи ----------
    const h2 = mapBox.closest(".panel")?.querySelector("h2");
    if (h2) {
      h2.textContent = `Мапа: ${R.name}`;
      // Короткий опис регіону під заголовком (data/routes.js → MAP_REGIONS[…].desc)
      let sub = h2.nextElementSibling;
      if (!sub || !sub.classList.contains("map-desc")) {
        sub = el("p", "note map-desc", "");
        h2.after(sub);
      }
      sub.textContent = R.desc ? `(${R.desc})` : "";
      sub.hidden = !R.desc;
    }
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
    // Лінія маршруту (видно під час дороги)
    const pathLayer = el("div", "map-route");
    img.after(pathLayer);

    let tip = null, hero = null, timerTag = null;
    for (const id of ids) {
      const pos = ZONES[id], p = place(id);
      const spot = button("", "map-spot" + (region === "city" ? " map-district" : ""));
      spot.dataset.loc = id;
      Object.assign(spot.style, { left: pos.x + "%", top: pos.y + "%", width: pos.w + "%", height: pos.h + "%" });
      spot.setAttribute("aria-label", p.name);
      spot.addEventListener("mouseenter", () => showTip(id));
      spot.addEventListener("focus", () => showTip(id));
      spot.addEventListener("mouseleave", restTip);
      spot.addEventListener("blur", restTip);
      spot.addEventListener("click", () => { selected = id; render(); });
      spot.addEventListener("dblclick", () => go(id));
      mapBox.append(spot);
    }
    tip = el("div", "map-tip");
    tip.hidden = true;
    mapBox.append(tip);
    hero = el("div", "map-hero");
    hero.innerHTML = HERO_FIGURE;
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

    function tick() {
      const tr = RPG.travelState(save);
      if (!tr) return;
      setHero(tr.pos.x, tr.pos.y);
      timerTag.textContent = RPG.fmtLeft(tr.leftMs);
      if (tr.leftMs > 0) return;
      clearInterval(travelTimer);
      RPG.finishTravel(save);
      RPG.saveGame(save).then(() => { location.href = "game.html"; });
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
      const can = RPG.canGo(save, region, id);
      if (can.ok && RPG.route(region, here.spot, id) && save.fieldLoot) await showFieldLoot(save);   // здобич поля бою — перед дорогою
      const r = RPG.startTravel(save, id);
      if (!r.ok) { selected = id; render(); showMsg($("map-msg"), r.reason, true); return; }
      await RPG.saveGame(save);
      selected = id;
      render();
      followTravel();
    }

    // ---------- Список місць і опис ----------
    // Без наведення: підказка обраного місця (у дорозі — схована, щоб не закривати фігурку)
    function restTip() {
      showTip(selected);
      if (RPG.isTraveling(save)) tip.hidden = true;
    }

    function render() {
      restTip();
      grid.innerHTML = "";
      for (const id of ids) {
        const p = place(id), st = placeState(id);
        const cell = button("", "wf loc-card " + (st.kind === "closed" ? "wf-locked" : "wf-link"));
        cell.append(el("strong", null, p.name));
        cell.append(el("span", "loc-desc", st.kind === "open" ? p.typeLabel
          : st.kind === "closed" && !RPG.isTraveling(save) ? "Закрито" : st.text));
        if (selected === id) cell.classList.add("is-selected");
        if (st.kind === "closed") cell.setAttribute("aria-disabled", "true");
        cell.addEventListener("click", () => { selected = id; render(); });
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
      if (p.loc && p.loc.type === "combat") {
        const enemies = (p.loc.enemies || []).map(e => `${RPG.getEnemy(e).name} (рів. ${RPG.getEnemy(e).level})` +
          (p.loc.dungeon && RPG.ENEMIES[e]?.boss ? ` — лише в данжі «${RPG.DUNGEONS[p.loc.dungeon].name}»` : "")).join(", ");
        details.append(noteP("Вороги: " + enemies));
      }
      const tr = RPG.travelState(save);
      if (tr) {
        details.append(el("p", "status", `Ви в дорозі до «${place(tr.to).name}». Переміщення не скасувати — дочекайтеся прибуття.`));
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
        details.append(button(`Вирушити · ${RPG.fmtLeft(RPG.travelSeconds(st.cells, region, save) * 1000)}`, "wf wf-button", () => go(selected)));
        details.append(noteP("Переміщення не можна скасувати; у дорозі доступні лише «Персонаж», «Інвентар» і «Мапа»."));
      } else {
        details.append(el("p", "status", st.text));
      }
    }

    if (t0) {
      followTravel();
    } else {
      const s = R.spots[here.spot] || R.spots[ids[0]];
      hero.classList.add("no-anim");
      setHero(s.x, s.y);
    }
    render();
  }

  // ---------- Запуск ----------

  RPG.pages.pageMaps = pageMaps;
})(window.RPG);

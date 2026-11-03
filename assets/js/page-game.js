// ============================================================
// page-game.js — Екран локації: бій, Домівка, Храм, Шинок, данжі.
// Частина колишнього game.js: спільне беремо з game-common.js (RPG.ui), запуск — game-main.js.
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, setBar, fmtNum, fmtDate, fmtStat, MSG_SEC, toastParent, raiseToasts, clearToasts, toastHost, showMsg, showNoGame, requireSave, showKeyPocket, showLootFilter, renderFilterBtn, whenNoDialog, queueDialog, noticeClose, noticeDialog, showNotice, journalReward, meetStranger, showParchment, BOOK, bookMotionOff, bookWide, bookBlobs, bookAnimUrl, playBookAnim, dropBookAnim, chronicleSection, showChronicle, forgeBookTable, forgeBookAuto, forgeBookSection, dataBookSection, openLibraryBook, showDataBook, showForgeBook, fieldLootAdd, showFieldLoot, TRAVEL_HREFS, blockLink, lockNavForTravel, unlockNavAfterTravel, showTravelBanner, startRegenTimer, itemLabel, rarityName, itemIcon, rarityTextClass, miniPlaceholder, fillItemCell, socketMarks, SLOT_SHORT, fillEquipCell, smallIcon, slotClass, renderHeroDoll, renderHeroGs, miniBar, renderPartyList, memberTabs, groupMemberTabs, renderHeroBars, expInfo, bindExpInfo, describeStats, describeEffect, useResultText, locImage, TYPE_NAMES, RARITY_NAMES, itemInfo, MSG_MAX } = RPG.ui;

  // ЕКРАН ЛОКАЦІЇ (бій, Домівка, Храм, Шинок)
  // ============================================================
  async function pageGame() {
    const save = await requireSave();
    if (!save) return;

    const msg = $("msg");

    // Посилання «game.html?loc=…» / «?district=…» — герой не телепортується, а вирушає туди дорогою (travel.js)
    const params = new URLSearchParams(location.search);
    const locParam = params.get("loc");
    const distParam = params.get("district");
    let enterError = null;
    let target = null;
    if (save.location.map === "city" && distParam && distParam !== (save.location.district || "south")) target = distParam;
    else if (locParam && RPG.LOCATIONS[locParam] && save.location.map !== locParam && locParam !== "city") target = locParam;
    if (target) {
      if (save.fieldLoot) await showFieldLoot(save);
      const r = RPG.startTravel(save, target);
      if (r.ok) {
        await RPG.saveGame(save);
        location.replace("maps.html");
        return;
      }
      enterError = r.reason;
    }
    if (locParam || distParam) history.replaceState(null, "", "game.html");
    if (RPG.velesStrangerDue(save)) setTimeout(() => meetStranger(save).then(() => renderAll()), 300);
    if (save.fieldLoot && save.fieldLoot.loc !== save.location.map) setTimeout(() => showFieldLoot(save), 0);
    const locId = save.location.map;
    const locData = RPG.getLocation(locId);
    // Власний дім показується з назвою, яку дав гравець
    const placeName = locData.house ? (RPG.houseHere(save)?.name || locData.name) : locData.name;
    $("location-name").textContent = placeName;
    $("location-desc").textContent = locData.description;
    // Фон локації (assets/images/locations/loc_<id>.webp) — за портретами та в банері.
    // Якщо картинки ще немає, лишається фон теми.
    document.body.style.setProperty("--loc-img", locImage(locId));
    document.body.dataset.loc = locId;

    const combat = RPG.isCombatLocation(locId);
    // Телефон, бойова локація: кнопка локації (перехід на мапу) — над портретами героя й ворога
    if (combat) {
      const locLink = document.querySelector("a.location");
      const home = locLink.parentElement, battleBox = document.querySelector(".battle");
      const phone = window.matchMedia("(max-width: 700px)");
      const place = () => { if (phone.matches) battleBox.before(locLink); else home.prepend(locLink); };
      place();
      phone.addEventListener("change", place);
    }
    $("enemy-col").hidden = !combat;
    $("combat-ui").hidden = !combat;
    $("place-panel").hidden = combat;
    document.querySelector(".battle").classList.toggle("no-enemy", !combat);

    let fighting = false;
    let queueMember = 0;        // обраний герой групи: його чергу дій налаштовуємо, йому — зілля (0 — головний)
    // Чий портрет, смужки HP/MP і швидкий доступ показуємо: обраного героя,
    // а під час показу бою — завжди головного (анімація бою пише в його смужки)
    function heroView() {
      if (!combat || fighting) return save;
      if (queueMember >= RPG.partySize(save)) queueMember = 0;
      return RPG.memberSave(save, queueMember);
    }
    function drawHero() {
      const v = heroView();
      renderHeroBars(v);
      renderPartyList(save, v.memberIndex || 0, combat && !fighting && RPG.partySize(save) > 1 ? pickMember : null);
    }
    // Обрали іншого героя групи (вкладки над чергою дій або клік по рядку групи)
    function pickMember(i) {
      queueMember = i;
      if (fighting) { renderQueue(); return; }
      renderAll();
    }
    // Данж локації (dungeon.js): режим «explore» — звичайні бої, «dungeon» — данж
    const dungeonInfo = combat ? RPG.locationDungeon(locId) : null;
    // Бойова локація з порталом (Серце Темного лісу → Альвгейм): картка над вкладками данжу (картка — renderPortal…)
    let portalBox = null;
    let mode = dungeonInfo && RPG.activeDungeon(save) ? "dungeon" : "explore";
    const dungeonOn = () => mode === "dungeon" && !!RPG.activeDungeon(save);
    // Музика локації: бій — під тип локації (останній бій данжу — тема боса), Дубова Застава — під район
    function playLocationMusic() {
      if (!RPG.audio) return;
      const dun = dungeonOn() ? RPG.activeDungeon(save) : null;
      if (combat) RPG.audio.scene({ screen: "combat", location: locId, region: locData.region, boss: !!(dun && dun.stage === dun.stages) });
      else if (locData.type === "city") RPG.audio.scene({ screen: "city", district: save.location.district || "south" });
      else if (locData.type === "citygate") RPG.audio.scene({ screen: "city", district: "south" });
      else RPG.audio.scene({ screen: "map", region: locData.region || "start" });
    }
    playLocationMusic();
    if (enterError) setTimeout(() => showMsg(msg, enterError + " Ви залишились тут.", true), 0);

    function renderQuickSlots() {
      const box = $("quick-slots");
      box.innerHTML = "";
      for (let i = 0; i < 12; i++) {
        const entry = save.inventory[i];
        if (!entry) { box.append(el("div", "wf wf-slot slot-empty", "")); continue; }
        const item = RPG.ITEMS[entry.id];
        const cell = fillItemCell(button("", slotClass(entry)), entry, entry.qty);
        cell.removeAttribute("title");
        cell.setAttribute("aria-label", itemLabel(entry));
        const usable = item.type === "consumable";
        const ms = heroView();   // зілля п'є обраний герой групи
        const who = RPG.partySize(save) > 1 ? `${ms.character.name}: ` : "";
        const use = async () => {
          if (fighting) return;
          const r = RPG.useItem(ms, entry.id);
          if (!r.ok) { showMsg(msg, who + r.reason, true); return; }
          showMsg(msg, who + useResultText(item, r));
          await RPG.saveGame(save);
          renderAll();
        };
        if (usable) {
          cell.classList.add("slot-usable");
          cell.addEventListener("dblclick", () => { RPG.popover.hide(); use(); });
        } else {
          cell.classList.add("slot-passive");
        }
        RPG.bindTip(cell, () => itemInfo(entry, entry.qty, ms), () => [
          usable && { text: "Використати", className: "wf-button", onClick: use },
          { text: "Інвентар", className: "wf-link", onClick: () => { location.href = "inventory.html"; } }
        ]);
        box.append(cell);
      }
      $("gold").textContent = `Золото: ${fmtNum(save.character.gold)}`;
      const qt = $("quick-title");
      if (qt) qt.textContent = RPG.partySize(save) > 1 ? `Швидкий доступ · ${heroView().character.name}` : "Швидкий доступ";
    }

    // ---------- Мирні локації ----------
    const place = $("place-panel");

    function renderPlace() {
      place.innerHTML = "";
      const banner = el("div", "place-banner info-anchor");
      banner.append(el("h2", null, placeName));
      place.append(banner);
      if (locData.type === "home") renderHome();
      else if (locData.type === "temple") renderTemple();
      else if (locData.type === "tavern") renderTavern();
      else if (locData.type === "city") renderCity();
      else if (locData.type === "gate") renderDarkGate();
      else if (locData.type === "citygate") renderCityGate();
      else if (locData.type === "portal") renderPortalPlace();
      // Скриня в іншій (не Домівка) локації — пов'язана або окрема, див. character.js → CHEST_STORAGES
      if (locData.chest && locData.type !== "home") {
        const used = RPG.chestList(save, locData.chest).length;
        place.append(noteP(`Скриня: ${used}/${RPG.chestConf(locData.chest).size} клітинок зайнято.`));
        place.append(link("Інвентар і скриня", "inventory.html"));
      }
    }

    function renderHome() {
      const per = RPG.regenPerTick(save);
      place.append(noteP("Тут битися заборонено — монстри сюди не заходять."));
      place.append(noteP(
        `Відпочинок: додатково +${Math.round(RPG.HOME_REGEN_PCT * 100)}% здоров'я та мани кожні 10 секунд ` +
        `понад звичайне відновлення. Зараз: +${per.hp.toFixed(1)} HP і +${per.mp.toFixed(1)} MP за 10 с.`));
      const sid = RPG.chestHere(save) || RPG.DEFAULT_CHEST;
      const used = RPG.chestList(save, sid).length;
      place.append(noteP(`Скриня: ${used}/${RPG.chestConf(sid).size} клітинок зайнято. Речі в скрині не зникають, навіть якщо герой загине.`));
      const row = el("div", "row");
      row.append(link("Інвентар і скриня", "inventory.html"), link("Вирушити (Мапа)", "maps.html"));
      place.append(row);
      if (locData.house) { renderHouseExtras(); return; }
      // Обірваний пергамент — шматок Прологу з книги «Предки…» (data/chronicle.js → PARCHMENT)
      // Після прочитання пергамент іде в торбу (save.story.parchment = "have") — кнопка зникає
      if (RPG.CHRONICLE && !RPG.parchmentState(save)) {
        const P = RPG.CHRONICLE.PARCHMENT;
        const box = el("div", "stack parchment-hint");
        box.append(el("p", "parchment-text", P.hint));
        box.append(button("Прочитати пергамент", "wf wf-link", async () => {
          (save.story ??= {}).parchment = "have";
          await RPG.saveGame(save).catch(e => console.error(e));
          showParchment();
          renderPlace();
        }));
        place.append(box);
      }
    }

    // Власний дім: добудови (кузня, склад — наступні етапи) і вихід у Спальний район
    function renderHouseExtras() {
      const key = locData.house, h = RPG.houseOf(save, key);
      const box = el("div", "stack house-panel");
      box.append(el("h3", null, "Добудови"));
      // Склад і скрині ремесла
      const wh = el("div", "stack house-build");
      if (!h?.warehouse) {
        wh.append(el("p", null, `Склад — місце для скринь ремесла: матеріалів, зілля й речей. Добудова — ${fmtNum(RPG.WAREHOUSE_PRICE)} золота.`));
        const b = button(`Збудувати склад за ${fmtNum(RPG.WAREHOUSE_PRICE)} золота`, "wf wf-button", async () => {
          const r = RPG.buildWarehouse(save, key);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Склад збудовано! −${fmtNum(r.price)} золота. Тепер можна купувати скрині ремесла.`);
          renderAll();
        });
        b.disabled = save.character.gold < RPG.WAREHOUSE_PRICE;
        wh.append(b);
      } else {
        wh.append(el("strong", null, "Склад"));
        // Куплені до максимуму скрині з переліку покупок зникають; коли куплено все — лишається тільки підсумок
        const chestTypes = Object.entries(RPG.CRAFT_CHESTS);
        const left = chestTypes.filter(([type, t]) => (h.chests?.[type] || 0) < t.max);
        if (!left.length) wh.append(el("small", "shop-lvl", "Усі скрині ремесла куплено: " +
          chestTypes.map(([, t]) => `${t.name.replace("Скриня ", "").toLowerCase()} ×${t.max}`).join(", ") + "."));
        for (const [type, t] of left) {
          const have = h.chests?.[type] || 0;
          const r = el("div", "shop-row house-chest");
          r.append(el("span", "shop-name", `${t.name}: ${have}/${t.max}`),
            el("small", "shop-lvl", `${t.size} клітинок · ${RPG.CRAFT_CHEST_ALLOW_TEXT[type]}${type === "item" ? "" : `, до ${fmtNum(t.stack)} шт.`}`));
          const b = button(`Купити · ${fmtNum(t.price)} зол.`, "wf wf-button", async () => {
            const res = RPG.buyCraftChest(save, key, type);
            if (!res.ok) { showMsg(msg, res.reason, true); return; }
            await RPG.saveGame(save);
            showMsg(msg, `${res.name} №${res.n} стоїть на складі. −${fmtNum(res.price)} золота.`);
            renderAll();
          });
          b.disabled = save.character.gold < t.price;
          r.append(b);
          wh.append(r);
        }
        wh.append(link("Відкрити скрині (Інвентар)", "inventory.html"));
      }
      box.append(wh);
      // Кузня
      const fg = el("div", "stack house-build");
      if (!h?.forge) {
        fg.append(el("p", null, `Кузня — тут куватимете й розбиратимете речі. Добудова — ${fmtNum(RPG.FORGE_PRICE)} золота. ` +
          "Знаряддя для неї продає коваль Кузьма в Гільдії ремісників (Торговий район)."));
        const b = button(`Збудувати кузню за ${fmtNum(RPG.FORGE_PRICE)} золота`, "wf wf-button", async () => {
          const r = RPG.buildForge(save, key);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Кузню збудовано! −${fmtNum(r.price)} золота. Тепер купіть знаряддя в коваля Кузьми.`);
          renderAll();
        });
        b.disabled = save.character.gold < RPG.FORGE_PRICE;
        fg.append(b);
      } else {
        fg.append(el("strong", null, "Кузня"));
        // Знаряддя: показуємо лише те, чого ще бракує; коли куплено все — перелік зникає
        const lacking = Object.entries(RPG.FORGE_TOOLS).filter(([id]) => !h.forge.tools[id]);
        if (lacking.length) {
          const tools = el("div", "tool-grid");
          for (const [, t] of lacking) tools.append(el("span", "tool-chip" + (t.need ? " is-need" : ""), "✗ " + t.name));
          fg.append(el("small", "shop-lvl", "Ще не куплено:"), tools);
        }
        const miss = RPG.forgeMissing(h);
        if (miss.length) fg.append(el("p", "house-soon",
          `Щоб почати кувати, бракує: ${miss.map(id => RPG.FORGE_TOOLS[id].name.toLowerCase()).join(", ")}. Знаряддя — у коваля Кузьми (Торговий район).`));
        if (!RPG.hasCraftAccess(save)) fg.append(el("p", "house-soon", "Кувати й купувати знаряддя можна, коли головний герой має професію."));
        if (RPG.craftState && RPG.hasCraftAccess(save)) {
          const st = RPG.craftState(save);
          const book = RPG.hasForgeBook(save);
          if (!book) fg.append(el("p", "house-soon", `Першу науку коваля — книгу «${RPG.FORGE_BOOK.title}» — продає Кузьма в Гільдії ремісників (Торговий район). Без неї кувати не вийде.`));
          fg.append(el("p", "forge-mastery", `Майстерність коваля: ${st.level} (${craftRank(st.level)}) · шанс успіху ${pct(RPG.craftSuccessChance(save, h))}`));
          fg.append(el("p", "forge-cat", RPG.RECIPE_GROUPS.map(g => `${g.name} ${RPG.craftCat(save, g.id).level}/${RPG.craftCatMaxLevel(g.id)}`).join(" · ")));
          const row = el("div", "row forge-open-row");
          const open = button("Кувати", "wf wf-button", () => showForge());
          open.disabled = !!miss.length || !book;
          row.append(open);
          if (book) row.append(button("Книга «Небесна кузня»", "wf wf-secondary", () => showForgeBook(save)));
          fg.append(row);
        }
      }
      box.append(fg);
      // Бібліотека: усі знайдені за сюжетом і куплені книги (data/books.js → LIBRARY)
      if (RPG.libraryBooks) {
        const lib = el("div", "stack house-build house-library");
        lib.append(el("strong", null, "Бібліотека"));
        const books = RPG.libraryBooks(save);
        if (!books.length) lib.append(el("p", "house-soon", "Полиці ще порожні. Сюди ляже кожна книга, яку ви знайдете в мандрах чи купите в торговців."));
        for (const bk of books) {
          const r = el("div", "shop-row tool-row library-row");
          const info = el("div", "tool-info");
          info.append(el("strong", null, `«${bk.title}»`), el("small", null, bk.note));
          r.append(info, button("Читати", "wf wf-secondary", () => openLibraryBook(save, bk.id)));
          lib.append(r);
        }
        box.append(lib);
      }
      const row = el("div", "row");
      row.append(button("Вийти в Спальний район", "wf wf-secondary", async () => {
        RPG.enterCity(save, RPG.HOUSES[locData.house].district);
        await RPG.saveGame(save);
        location.href = "game.html";
      }));
      box.append(row);
      place.append(box);
    }

    // ---------- Кузня: кування і переплавка (craft.js, data/recipes.js) ----------
    const pct = x => `${Math.round(x * 100)}%`;
    function craftRank(lvl) {
      return lvl >= 30 ? "Небесний коваль" : lvl >= 20 ? "Майстер" : lvl >= 10 ? "Підмайстер" : "Учень";
    }
    const RARITY_LABEL = { broken: "зламана", common: "звичайна", magic: "магічна", epic: "епічна", legendary: "легендарна" };
    // Підвищення рівнів після кування/розбору: загальна майстерність і майстерність виду
    function craftUpsText(r) {
      const parts = [];
      if (r.levelUps?.length) parts.push(`Майстерність ${r.levelUps.at(-1)}!`);
      const g = RPG.RECIPE_GROUPS.find(x => x.id === r.cat);
      if (g && r.catUps?.length) parts.push(`${g.name}: рівень ${r.catUps.at(-1)}!`);
      return parts.length ? ". " + parts.join(" ") : ".";
    }
    let forgeTab = "weapon", forgePreferRare = false, forgeSpark = false, forgeResult = null, disConfirm = null;
    function showForge() {
      document.querySelector(".forge-dialog")?.remove();
      const { dlg, closeBtn } = noticeDialog("forge-dialog", () => { forgeResult = null; disConfirm = null; renderAll(); });
      const draw = () => {
        dlg.innerHTML = "";
        const close = closeBtn("Закрити кузню");
        const st = RPG.craftState(save);
        const house = RPG.houseHere(save);
        const next = RPG.craftExpToNext(st.level);
        dlg.append(close, el("h3", null, "Кузня"));
        dlg.append(el("p", "forge-mastery", `Майстерність ${st.level} — ${craftRank(st.level)}` +
          (st.level < RPG.CRAFT_MAX_LEVEL ? ` · досвід ${fmtNum(st.exp)}/${fmtNum(next)}` : "") +
          ` · успіх ${pct(RPG.craftSuccessChance(save, house))}`));
        if (forgeResult) dlg.append(el("p", "forge-result" + (forgeResult.error ? " is-error" : ""), forgeResult.text));
        const tabs = el("div", "row npc-tabs forge-tabs");
        for (const gr of [...RPG.RECIPE_GROUPS, { id: "smelt", name: "Переплавка" }, { id: "dis", name: "Розбір" }]) {
          tabs.append(button(gr.name, "wf " + (forgeTab === gr.id ? "wf-button" : "wf-link"), () => { forgeTab = gr.id; forgeResult = null; disConfirm = null; draw(); }));
        }
        dlg.append(tabs);
        // рівень майстерності виду (відкриває тіри); загальна майстерність — лише шанс успіху й рідкість
        const curGroup = RPG.RECIPE_GROUPS.find(x => x.id === forgeTab);
        if (curGroup) {
          const cs = RPG.craftCat(save, curGroup.id), cmax = RPG.craftCatMaxLevel(curGroup.id);
          dlg.append(el("p", "forge-cat", `${curGroup.name}: рівень ${cs.level}/${cmax}` +
            (cs.level < cmax ? ` · досвід ${fmtNum(cs.exp)}/${fmtNum(RPG.craftExpToNext(cs.level))}` : " · максимум") +
            ` · відкрито тір ${RPG.craftCatOpenTier(cs.level)}`));
        }
        if (forgeTab === "smelt") { drawSmelt(); return; }
        if (forgeTab === "dis") { drawDis(); return; }
        // параметри
        const optRow = el("div", "forge-opts");
        const cb = (label, val, set) => {
          const l = el("label", "forge-opt");
          const i = el("input"); i.type = "checkbox"; i.checked = val;
          i.addEventListener("change", () => { set(i.checked); draw(); });
          l.append(i, document.createTextNode(" " + label));
          return l;
        };
        optRow.append(cb("Спершу рідкісніші матеріали (кращі шанси)", forgePreferRare, v => forgePreferRare = v));
        const sparks = RPG.craftCountMat(save, "heavenly_spark");
        if (sparks) optRow.append(cb(`Додати Небесну іскру (до +10% до легендарної; є ${sparks})`, forgeSpark, v => forgeSpark = v));
        else forgeSpark = false;
        dlg.append(optRow);
        if (RPG.chestsHere(save).some(id => RPG.parseCraftChest(id)?.type === "mat"))
          dlg.append(el("small", "forge-why", "Матеріали беруться з інвентаря і скринь для матеріалів цього дому."));
        const group = RPG.RECIPE_GROUPS.find(x => x.id === forgeTab);
        const list = el("div", "stack forge-list");
        for (const [id, rc] of Object.entries(RPG.RECIPES).sort((a, b) => a[1].tier - b[1].tier)) {
          const item = RPG.ITEMS[id];
          if (!item || !group.types.includes(item.type)) continue;
          const info = RPG.recipeInfo(save, id);
          const row = el("div", "forge-row" + (info.levelOk ? "" : " is-locked"));
          const head = el("div", "forge-head");
          head.append(smallIcon(id), el("strong", null, item.name), el("small", "forge-tier", `тір ${rc.tier}`));
          row.append(head);
          const mats = el("div", "forge-mats");
          for (const m of info.mats) mats.append(el("span", "forge-mat" + (m.have >= m.need ? " is-ok" : " is-short"), `${RPG.ITEMS[m.id].name} ${fmtNum(m.have)}/${m.need}`));
          for (const t of info.tools) mats.append(el("span", "forge-mat" + (t.have ? " is-ok" : " is-short"), `знаряддя: ${RPG.FORGE_TOOLS[t.id].name}`));
          row.append(mats);
          if (info.levelOk) {
            const odds = RPG.craftOdds(save, id, { preferRare: forgePreferRare, spark: forgeSpark });
            row.append(el("p", "forge-odds", ["broken", "common", "magic", "epic", "legendary"]
              .filter(r => odds[r] >= 0.005).map(r => `${RARITY_LABEL[r]} ${pct(odds[r])}`).join(" · ")));
          }
          const b = button(info.levelOk ? "Кувати" : `${group.name} ${info.tierLevel}`, "wf wf-button forge-btn", async () => {
            const r = RPG.craftItem(save, id, { preferRare: forgePreferRare, spark: forgeSpark });
            if (!r.ok) { forgeResult = { text: r.reason, error: true }; draw(); return; }
            await RPG.saveGame(save);
            forgeResult = { text: `Викувано: ${RPG.itemFullName(r.ref)} (${RARITY_LABEL[r.rarity]}). +${r.exp} досвіду майстерності` +
              (r.spark ? ", Небесна іскра згоріла" : "") + craftUpsText(r) };
            draw();
          });
          b.disabled = !info.canCraft;
          if (!info.canCraft && info.reason) b.title = info.reason;
          row.append(b);
          if (!info.canCraft && info.levelOk) row.append(el("small", "forge-why", info.reason));
          list.append(row);
        }
        dlg.append(list);
      };
      const drawSmelt = () => {
        const list = el("div", "stack forge-list");
        list.append(el("p", "forge-why", "Переплавка завжди вдається: руда (а для сталі, двергської сталі й сонячного золота — нижчі злитки) → 1 злиток тієї ж рідкості; скільки треба — біля кожного злитка. +1 досвіду за злиток. " +
          "Руда й вугілля беруться і зі скринь для матеріалів; злитки, що не влізли в інвентар, лягають туди ж."));
        for (const ingot of Object.keys(RPG.SMELT)) {
          const info = RPG.smeltInfo(save, ingot);
          const row = el("div", "forge-row");
          const head = el("div", "forge-head");
          head.append(smallIcon(ingot), el("strong", null, RPG.ITEMS[ingot].name));
          row.append(head);
          const mats = el("div", "forge-mats");
          const oreTotal = info.byGrade.reduce((n, b) => n + RPG.craftCountMat(save, b.ore), 0);
          mats.append(el("span", "forge-mat" + (oreTotal >= info.s.oreQty ? " is-ok" : " is-short"), `${RPG.ITEMS[info.s.ore].name} ×${info.s.oreQty}: є ${fmtNum(oreTotal)}`));
          if (info.s.coal) mats.append(el("span", "forge-mat" + (info.coalHave >= info.s.coal ? " is-ok" : " is-short"), `Вугілля ×${info.s.coal}: є ${fmtNum(info.coalHave)}`));
          for (const t of info.s.tools) mats.append(el("span", "forge-mat" + (RPG.houseHere(save)?.forge?.tools?.[t] ? " is-ok" : " is-short"), `знаряддя: ${RPG.FORGE_TOOLS[t].name}`));
          row.append(mats);
          const btns = el("div", "row forge-smelt-btns");
          for (const n of [1, 10, info.max]) {
            if (n < 1 || (n === info.max && (n === 1 || n === 10))) continue;
            const b = button(n === info.max ? `Усе (${fmtNum(n)})` : `×${n}`, "wf wf-button", async () => {
              const r = RPG.smelt(save, ingot, n);
              if (!r.ok) { forgeResult = { text: r.reason, error: true }; draw(); return; }
              await RPG.saveGame(save);
              forgeResult = { text: `Переплавлено: ${RPG.ITEMS[ingot].name} ×${fmtNum(r.made)}. +${r.exp} досвіду майстерності` + (r.levelUps.length ? `. Майстерність ${r.levelUps.at(-1)}!` : ".") };
              draw();
            });
            b.disabled = !info.ready.ok || info.max < n;
            btns.append(b);
          }
          if (!info.ready.ok) row.append(el("small", "forge-why", info.ready.reason));
          row.append(btns);
          list.append(row);
        }
        dlg.append(list);
      };
      // Розбір речей з інвентаря (craft.js → disassemble). Вдягнені речі не показуються.
      const drawDis = () => {
        const list = el("div", "stack forge-list");
        list.append(el("p", "forge-why", "Розбір повертає частину матеріалів рецепта: зламана річ — 25%, звичайна — 40%, магічна — 50% + 1 магічний матеріал, " +
          "епічна — 60% + 1 епічний, легендарна — 70% + Небесна іскра. Досвід — за кожен матеріал: 1 / 3 / 8 / 25. Розбираються лише речі з інвентаря — рецепт не потрібен; вдягнені спершу зніміть, зі скринь — заберіть в інвентар."));
        const ready = RPG.craftForgeReady(save);
        if (!ready.ok) list.append(el("small", "forge-why", ready.reason));
        let any = false;
        save.inventory.forEach((ref, index) => {
          const info = RPG.disassembleInfo(save, index);
          if (!info) return;
          any = true;
          const row = el("div", "forge-row");
          const head = el("div", "forge-head");
          head.append(smallIcon(ref), el("strong", "forge-dis-name" + rarityTextClass(ref), RPG.itemFullName(ref)),
            el("small", "forge-tier", `${RARITY_LABEL[info.rarity]} · ${pct(info.share)}`));
          row.append(head);
          const mats = el("div", "forge-mats");
          for (const [id, q] of info.mats) mats.append(el("span", "forge-mat is-ok", `${RPG.ITEMS[id].name} ×${q}`));
          if (info.bonus === "spark") mats.append(el("span", "forge-mat is-ok rt-legendary", "Небесна іскра ×1"));
          else if (info.bonus) mats.append(el("span", "forge-mat is-ok rt-" + info.bonus, `+1 ${info.bonus === "magic" ? "магічний" : "епічний"} матеріал`));
          mats.append(el("span", "forge-mat", `+${info.exp} досвіду`));
          row.append(mats);
          const asking = disConfirm === index;
          const b = button(asking ? "Так, розібрати" : "Розібрати", "wf " + (asking ? "wf-danger" : "wf-button") + " forge-btn", async () => {
            if (info.confirm && !asking) { disConfirm = index; forgeResult = { text: `${RPG.itemFullName(ref)} — ${RARITY_LABEL[info.rarity]} річ. Натисніть ще раз, щоб розібрати.`, error: true }; draw(); return; }
            disConfirm = null;
            const r = RPG.disassemble(save, index);
            if (!r.ok) { forgeResult = { text: r.reason, error: true }; draw(); return; }
            await RPG.saveGame(save);
            forgeResult = { text: `Розібрано: ${r.name}. Отримано: ${r.got.map(([id, q]) => `${RPG.ITEMS[id].name} ×${q}`).join(", ")}. +${r.exp} досвіду майстерності` +
              craftUpsText(r) };
            draw();
          });
          b.disabled = !ready.ok;
          row.append(b);
          if (asking) row.append(button("Скасувати", "wf wf-link", () => { disConfirm = null; forgeResult = null; draw(); }));
          list.append(row);
        });
        if (!any) list.append(el("p", "house-soon", "В інвентарі немає речей, які можна розібрати. Розбираються зброя, щити, броня й прикраси, що лежать в інвентарі (не в скринях)."));
        dlg.append(list);
      };
      document.body.append(dlg);
      draw();
      dlg.showModal();
    }

    // Вікно з полем для назви дому — лише при купівлі (назву дають один раз)
    function askHouseName(current, onOk, opts = {}) {
      const { dlg, closeBtn } = noticeDialog("house-dialog");
      dlg.append(closeBtn(), el("h3", null, opts.title || "Назва дому"));
      if (opts.text) dlg.append(el("p", null, opts.text));
      const label = el("label", "field", "Назва дому");
      const input = el("input");
      Object.assign(input, { type: "text", maxLength: RPG.HOUSE_NAME_MAX, value: current, placeholder: "Напр. «Дубовий двір»" });
      label.append(input);
      const ok = button(opts.okText || "Зберегти", "wf wf-button", () => { const v = input.value; dlg.close(); onOk(v); });
      input.addEventListener("keydown", e => { if (e.key === "Enter") ok.click(); });
      dlg.append(label, el("p", "note keep", `До ${RPG.HOUSE_NAME_MAX} символів. Назву дають лише раз — змінити її потім не можна. ` +
        "Згодом доми будуть і в інших містах — назва допоможе їх розрізняти."), ok);
      document.body.append(dlg);
      dlg.showModal();
      input.focus();
    }

    // --- Спальний район: управитель продає дім на околиці ---
    function renderRestDistrict(box) {
      renderNpc(box, "rest_steward");
      const key = "oak", conf = RPG.HOUSES[key], h = RPG.houseOf(save, key);
      const card = el("div", "stack house-card");
      if (!h) {
        card.append(el("p", null, `Дім на околиці Спального району — ${fmtNum(conf.price)} золота. У вас: ${fmtNum(save.character.gold)}.`));
        const buy = button(`Купити дім за ${fmtNum(conf.price)} золота`, "wf wf-button", () => askHouseName("", async name => {
          const r = RPG.buyHouse(save, key, name);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Дім «${r.house.name}» тепер ваш! −${fmtNum(r.price)} золота.`);
          renderAll();
        }, { title: "Купівля дому", okText: `Купити за ${fmtNum(conf.price)} золота`,
             text: "Як назвете свій дім? Оберіть уважно: назва дається один раз." }));
        buy.disabled = save.character.gold < conf.price;
        card.append(buy);
      } else {
        card.append(el("p", null, `Ваш дім: «${h.name}».`));
        card.append(button(`Увійти в дім «${h.name}»`, "wf wf-button", async () => {
          const r = RPG.enterHouse(save, key);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          location.href = "game.html";
        }));
      }
      box.append(card);
    }

    // Темний ліс: зворотний бік Центральної брами
    function renderDarkGate() {
      place.append(noteP(locData.description));
      place.append(noteP("Тут не б'ються. Звідси — дороги до всіх місць Темного лісу (Мапа). Щоб повернутися в Дубову Заставу, гукніть капітана варти."));
      renderNpc(place, "captain");
      const row = el("div", "row");
      row.append(link("Мапа Темного лісу", "maps.html"));
      place.append(row);
    }

    // ---------- Корінь Іггдрасиля: миттєвий перехід між світами (data/enemies.js → LOCATIONS[…].portal) ----------
    // Портал видно, лише якщо в місце призначення вже можна зайти (canEnterLocation): у Серці Темного лісу —
    // після першої перемоги над Володарем, в Альвгеймі — завжди (шлях назад).
    function portalOpen(pt) {
      return !!pt && RPG.canEnterLocation(pt.to, save.character.level, save).ok;
    }
    async function usePortal(pt) {
      if (fighting) return;
      if (RPG.isTraveling(save)) { showMsg(msg, "Ви в дорозі — дочекайтеся прибуття.", true); return; }
      if (RPG.activeDungeon(save)) { showMsg(msg, "Спершу пройдіть або покиньте данж.", true); return; }
      const can = RPG.canEnterLocation(pt.to, save.character.level, save);
      if (!can.ok) { showMsg(msg, can.reason, true); return; }
      if (save.fieldLoot) await showFieldLoot(save);         // здобич поля бою — перед переходом
      delete save.travel;
      delete save.formationAt;
      save.location.map = pt.to;
      await RPG.saveGame(save);
      location.href = "game.html";
    }
    function portalCard(pt) {
      const card = el("div", "panel stack explore-card portal-card");
      card.append(el("h3", null, pt.title), noteP(pt.text));
      const row = el("div", "row");
      row.append(button(pt.button, "wf wf-button", () => usePortal(pt)));
      card.append(row);
      return card;
    }
    // Мирна локація-портал (Корінь Іггдрасиля в Альвгеймі)
    function renderPortalPlace() {
      place.append(noteP(locData.description));
      place.append(noteP("Тут не б'ються. Звідси — стежка до всіх місць світу (Мапа)."));
      if (portalOpen(locData.portal)) place.append(portalCard(locData.portal));
      const row = el("div", "row");
      row.append(link(`Мапа: ${RPG.MAP_REGIONS[locData.region]?.name || "світ"}`, "maps.html"));
      place.append(row);
    }

    // Стартова мапа: Південні ворота Дубової Застави
    function renderCityGate() {
      place.append(noteP("Тут не б'ються. Крізь ворота — Південний район Дубової Застави з Гільдією авантюристів."));
      const row = el("div", "row");
      row.append(button("Увійти в Дубову Заставу", "wf wf-button", async () => {
        RPG.enterCity(save, "south");
        await RPG.saveGame(save);
        location.reload();
      }), link("Мапа", "maps.html"));
      place.append(row);
    }

    function renderTemple() {
      place.append(noteP(
        `Сюди повертаються загиблі. Відроджені мають ${Math.round(RPG.RESPAWN_HP_PCT * 100)}% здоров'я та 0% мани — ` +
        "відновіться зіллям або вирушайте відпочити в Домівку."));
      renderNpc(place, "nun");
      if (RPG.velesState(save).stage >= 4) renderCourtyard(place);
      const row = el("div", "row");
      row.append(link("Мапа", "maps.html"));
      place.append(row);
    }

    // --- Внутрішній двір Храму: статуя Велеса й джерело (квест «Долоні Велеса») ---
    let springWaking = false;      // сферу щойно поклали — 5 секунд «нічого не відбувається»
    function renderCourtyard(box) {
      const V = RPG.VELES;
      const st = RPG.velesState(save);
      const card = el("div", "stack explore-card");
      card.append(el("h3", null, "Внутрішній двір Храму"));
      if (springWaking) {
        card.append(el("p", null, "Ви кладете сферу на долоні статуї. Камінь лягає в ромбовидний виступ, мов там і був…"));
        card.append(el("p", "rt-magic", "Нічого не відбувається."));
      } else if (st.stage < 5) {
        card.append(el("p", null, "Посеред двору — висохлий кам'яний фонтан. Над ним — статуя Велеса, що береже мудрість поколінь, " +
          "з глечиком біля ніг. На розкритих долонях статуї — невеликий виступ у формі ромба."));
        const put = button("Покласти сферу на долоні статуї", "wf wf-button", async () => {
          const r = RPG.velesPlaceOrb(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          springWaking = true;
          npcNode.nun = "start"; npcResult.nun = null;     // Ївга мовчить, поки джерело прокидається
          renderAll();
          setTimeout(() => {
            springWaking = false;
            showMsg(msg, "Раптом з глечика біля ніг статуї починає сочитися блакитна вода. Вона тече все швидше, дзюрчить по каменю — " +
              "і висохлий фонтан наповнюється сяйливою блакиттю. Джерело Велеса прокинулося!");
            if (RPG.audio?.jingle) RPG.audio.jingle("levelup");
            renderAll();
          }, V.waitMs);
        });
        put.disabled = RPG.countItem(save, "orb_veles") < 1;
        card.append(put);
      } else {
        card.append(el("p", null, "Над фонтаном височіє статуя Велеса зі сферою на долонях. З глечика біля його ніг тече блакитна вода, " +
          "і чаша фонтана повна до країв. Це чарівне джерело: хто нап'ється — тому кожен бій дає втричі більше досвіду " +
          `(+${V.expBonusPct}% до досвіду групи) протягом ${V.durationMs / 60000} хвилин. Потім вода годину набирає силу знову.`));
        const left = RPG.springLeft(save);
        const wait = RPG.springCooldown(save);
        if (left) card.append(el("p", "rt-magic", `Сила джерела ще з вами — близько ${Math.ceil(left / 60000)} хв. ` +
          `Після цього вода набиратиме силу ще ${RPG.VELES.cooldownMs / 60000} хв.`));
        else if (wait) card.append(el("p", "rt-magic", `Вода в чаші ще не набрала сили — пити знову можна буде за ${Math.ceil(wait / 60000)} хв.`));
        const drink = button("Випити з джерела", "wf wf-button", async () => {
          const r = RPG.drinkSpring(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          journalReward(save, "Джерело Велеса", `Група напилася з чарівного джерела: +${V.expBonusPct}% досвіду за бої на ${r.minutes} хвилин.`);
          await RPG.saveGame(save);
          showMsg(msg, `Вода холодна й солодка, як весняний дощ. Уся група відчуває, як світ стає яснішим: +${V.expBonusPct}% досвіду ` +
            `за бої на ${r.minutes} хвилин.`);
          renderAll();
        });
        drink.disabled = !!wait;
        card.append(drink);
      }
      box.append(card);
    }

    // ---------- Розмови з NPC (data/npcs.js) ----------
    const npcNode = {};      // на якому вузлі розмова з кожним NPC
    const npcResult = {};    // відповідь на останню дію (молитва, оплата…)
    const npcCtx = { member: 0 };

    const NPC_ACTIONS = {
      async pray() {
        const r = RPG.pray(save);
        if (!r.ok) return { text: r.reason, error: true };
        await RPG.saveGame(save);
        return { text: r.revived.length
          ? `Сестра Ївга довго молиться над полеглими. Відроджено: ${r.revived.join(", ")}.`
          : "«У твоїй групі немає полеглих. Хай так буде й надалі.»" };
      },
      async grace() {
        const r = RPG.buyGrace(save);
        if (!r.ok) return { text: `«${r.reason}»`, error: true, to: "grace" };
        await RPG.saveGame(save);
        return { text: `Сестра Ївга читає Молитву благодаті${r.count > 1 ? " над усією групою" : ""}. Пожертва: ${fmtNum(r.cost)} золота. Благодать діятиме 10 хвилин.` };
      },
      async gate_start() {
        const r = RPG.startGate(save);
        if (!r.ok) return { text: `«${r.reason}»`, error: true };
        await RPG.saveGame(save);
        return { text: "Квест «Варта Центральної брами» взято. Прогрес — у журналі квестів на сторінці «Персонаж».", to: "progress" };
      },
      async gate_turn() {
        const r = RPG.turnInGate(save);
        if (!r.ok) return { text: `«${r.reason}»`, error: true, to: "progress" };
        await RPG.saveGame(save);
        if (!r.finished) return { text: "Капітан задоволено киває. «Добре. Тепер — припаси.»", to: "progress" };
        const dot = t => (t.endsWith("!") ? t : t + ".");
        journalReward(save, "Завдання «Варта Центральної брами» виконано", dot(`Нагорода: досвід — ${r.expText}`));
        await RPG.saveGame(save);
        return { text: dot(`Капітан віддає наказ відчинити браму. «Ти з наших. Темний ліс чекає.» Досвід — ${r.expText}`) };
      },
      async gate_go() {
        if (!RPG.isGateOpen(save)) return { text: "«Брама зачинена.»", error: true };
        save.location.map = "dark_gate";               // крізь браму — одразу, без дороги
        await RPG.saveGame(save);
        location.href = "game.html";
        return { text: "Брама відчиняється…" };
      },
      async gate_back() {
        RPG.enterCity(save, "north");
        await RPG.saveGame(save);
        location.href = "game.html";
        return { text: "Варта відчиняє хвіртку в брамі…" };
      },
      // Квест «Долоні Велеса» (quests.js → VELES)
      async veles_ask(npcId) {
        if (!RPG.velesAdvance(save, 1)) return { text: "«Не розумію, про що ти.»", error: true };
        await RPG.saveGame(save);
        return { text: npcId === "steward"
          ? "Захар крутить сферу в пальцях, підносить до вікна й хитає головою. «У наших записах такого нема. Але знаєш що — " +
            "спитай Остапа в шинку біля млина. До нього хто тільки не заходить: путівники, путівниці, купці з усіх земель. " +
            "Хтось та й бачив подібне.»"
          : "Сестра Ївга обережно бере сферу, проводить пальцем по ромбовидному заглибленню й довго мовчить. «Щось знайоме… " +
            "та не пригадаю. Спитай Остапа в шинку біля млина — до нього заходять мандрівники й путівниці з далеких країв. " +
            "Може, хтось із них щось підкаже.»" };
      },
      async veles_ostap() {
        if (!RPG.velesAdvance(save, 2)) return { text: `«Щось я не второпаю, ${RPG.gw(save, "мандрівнику", "мандрівнице")}.»`, error: true };
        await RPG.saveGame(save);
        return { text: "Остап відставляє кухоль і стишує голос. «Ромб, кажеш? Була тут торік одна путівниця з півдня, сива вся, " +
          "хоч і молода на лице. Розповідала, що колись у Храмі Перуна під вівтарем било джерело, і стерегли його Велесові долоні. " +
          "А потім вода пішла, і про те забули. Сходи до сестри Ївги — вона в Храмі найдовше, мо' пригадає.»" };
      },
      async veles_nun() {
        if (!RPG.velesAdvance(save, 3)) return { text: "«Про що ти, дитино?»", error: true };
        await RPG.saveGame(save);
        return { text: "Ївга завмирає, і її очі ширшають. «Велесові долоні… Ну звісно! Як я могла забути. Ходімо.» " +
          "Вона веде вас за вівтар, у внутрішній двір Храму. Посеред двору — висохлий кам'яний фонтан, а над ним статуя Велеса, " +
          "що береже мудрість поколінь, з глечиком біля ніг. Ви придивляєтеся: на його розкритих долонях — невеликий виступ у формі ромба.",
          to: "veles_yard" };
      },
      // Квест «Збір вугілля» (quests.js → COAL)
      async coal_start() {
        const r = RPG.startCoal(save);
        if (!r.ok) return { text: `«${r.reason}»`, error: true };
        await RPG.saveGame(save);
        return { text: "Завдання «Збір вугілля» взято. Прогрес — у журналі квестів на сторінці «Персонаж»." };
      },
      async coal_turn() {
        const r = RPG.turnInCoal(save);
        if (!r.ok) return { text: `«${r.reason}»`, error: true };
        await RPG.saveGame(save);
        return { text: `Вози з вугіллям рушають до складів Мерії. Срібні злитки ×${RPG.COAL.reward.items[0].qty}. ` +
          `Спальний район відкрито. Досвід — ${r.expText}${r.expText.endsWith("!") ? "" : "."}` };
      },
      // Віддати Захару обірваний пергамент — книга відновлюється
      async parchment_give() {
        if (RPG.parchmentState(save) !== "have") return { text: "«У вас нічого такого немає.»", error: true };
        save.story.parchment = "given";
        await RPG.saveGame(save);
        showChronicle(save, "prologue", { restoring: true });
        return { text: "Захар прикладає обгорілий клапоть до місця, де бракує сторінок. Пергамент тепліє, краї зростаються, " +
          "і по них пробігає золоте сяйво. Коли світло згасає, сторінка вже вшита назад — ніби ніколи й не була вирвана. " +
          `«Велес бачить… — шепоче Захар. — Книга знову ціла. Дякую ${RPG.gw(save, "тобі, друже", "тобі, подруго")}».` };
      },
      async chronicle() {
        // герой побачив літопис — його список з'являється в бібліотеці власного дому
        if (RPG.addToLibrary?.(save, "chronicle")) await RPG.saveGame(save);
        showChronicle(save);
        return { text: "Захар обережно розгортає перед вами книгу. Від пергаменту пахне димом і старим дубом." };
      },
      async reset() {
        const ms = RPG.memberSave(save, npcCtx.member);
        const r = RPG.resetAttrs(ms);
        if (!r.ok) return { text: `«${r.reason}»`, error: true, to: "reset" };
        await RPG.saveGame(save);
        return { text: `Захар Вергун переписує записи. ${ms.character.name}: повернуто ${r.points} очок атрибутів, мито — ${fmtNum(r.cost)} золота. ` +
          "Розподілити очки знову можна на сторінці «Персонаж»." };
      }
    };

    function renderNpc(box, npcId) {
      const npc = RPG.NPCS[npcId];
      const node = npc.nodes[npcNode[npcId]] || npc.nodes.start;
      const wrap = el("div", "npc-dialog");
      const head = el("div", "npc-head");
      const img = new Image();
      img.className = "npc-portrait";
      img.alt = "";
      img.addEventListener("error", () => img.remove());
      img.src = RPG.asset(`assets/images/npc/${npc.portrait}.webp`);
      head.append(img, el("strong", "npc-name", npc.name));
      wrap.append(head);
      const res = npcResult[npcId];
      if (res) wrap.append(el("p", "npc-result" + (res.error ? " is-error" : ""), res.text));
      const text = typeof node.text === "function" ? node.text(save, npcCtx) : node.text;
      wrap.append(el("p", "npc-line", text));
      const replies = el("div", "npc-replies");
      for (const r of node.replies) {
        if (r.show && !r.show(save, npcCtx)) continue;
        const label = typeof r.text === "function" ? r.text(save, npcCtx) : r.text;
        replies.append(button("➤ " + label, "wf wf-link npc-reply", async () => {
          npcResult[npcId] = null;
          if (r.action) {
            const out = await NPC_ACTIONS[r.action](npcId);
            npcResult[npcId] = out;
            npcNode[npcId] = out.to || r.to || "start";
          } else {
            npcNode[npcId] = r.to || "start";
          }
          renderAll();
        }));
      }
      wrap.append(replies);
      box.append(wrap);
    }

    function renderTavern() {
      renderNpc(place, "ostap");
      place.append(noteP(
        `${locData.merchant || "Торговець"} продає за ${Math.round(RPG.SHOP_SELL_RATE * 100)}% вартості, ` +
        `а купує за ${Math.round(RPG.SHOP_BUY_RATE * 100)}%. Великі та чарівні зілля тут не купиш — лише здобути в бою.`));
      renderShop(place, locData.shop || []);
      const row = el("div", "row");
      row.append(link("Мапа", "maps.html"));
      place.append(row);
    }

    // Купівля / продаж (Шинок, торговець Гільдії)
    // Після покупки кнопки «Купити» на пів секунди вимикаються — щоб не купити двічі випадково
    const BUY_PAUSE_MS = 500;
    let buyLockUntil = 0;
    function lockBuyButtons() {
      document.body.classList.add("buy-locked");
      setTimeout(() => document.body.classList.remove("buy-locked"), BUY_PAUSE_MS);
    }
    // opts: { priceOf(id), buy(save, id, qty), stock: true — продавати й речі з позначкою noShop }
    function renderShop(box, shopIds, opts = {}) {
      const priceOf = opts.priceOf || RPG.shopSellPrice;
      const buyFn = opts.buy || RPG.buyItem;
      box.append(el("p", "status shop-gold", `Ваше золото: ${fmtNum(save.character.gold)}`));

      const cols = el("div", "row shop");
      const buyBox = el("div", "stack shop-list");
      buyBox.append(el("h3", null, "Купити"));
      for (const id of shopIds) {
        const item = RPG.ITEMS[id];
        if (!item || (item.noShop && !opts.stock)) continue;
        const price = priceOf(id);
        const r = el("button", "shop-row shop-info");
        r.type = "button";
        r.append(smallIcon(id), el("span", "shop-name", item.name));
        if (item.levelReq > 1) r.append(el("small", "shop-lvl", `рів. ${item.levelReq}`));
        r.append(el("span", "shop-price" + (save.character.gold < price ? " is-short" : ""), `${fmtNum(price)} зол.`));
        const buy = async (qty = 1) => {
          if (Date.now() < buyLockUntil) return;          // пауза після покупки
          buyLockUntil = Date.now() + BUY_PAUSE_MS;
          lockBuyButtons();
          const res = buyFn(save, id, qty);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Куплено: ${item.name}${res.qty > 1 ? ` × ${res.qty}` : ""} за ${fmtNum(res.price)} золота.`);
          renderAll();
        };
        const stack = item.stackable ? (item.maxStack || 99) : 0;
        // Вікно покупки: опис + вибір кількості
        const build = () => {
          const box = itemInfo(id, 1, save);
          const most = Math.max(1, Math.min(RPG.BUY_MAX, Math.floor(save.character.gold / price)));
          const buyRow = el("div", "sell-qty");
          const minus = button("−", "wf wf-secondary qty-btn");
          const plus = button("+", "wf wf-secondary qty-btn");
          const qtyInput = el("input", "shop-qty");
          Object.assign(qtyInput, { type: "number", min: 1, max: RPG.BUY_MAX, step: 1, value: 1, inputMode: "numeric" });
          qtyInput.setAttribute("aria-label", `Кількість: ${item.name}`);
          const buySome = button("", "wf wf-button buy-btn", () => {
            const n = Math.floor(Number(qtyInput.value));
            if (!(n >= 1 && n <= RPG.BUY_MAX)) { showMsg(msg, `Вкажіть кількість від 1 до ${RPG.BUY_MAX}.`, true); return; }
            RPG.popover.hide();
            buy(n);
          });
          const upd = () => {
            const n = Math.min(RPG.BUY_MAX, Math.max(1, Math.floor(Number(qtyInput.value)) || 1));
            buySome.textContent = `Купити ${n} · ${fmtNum(price * n)} зол.`;
            buySome.disabled = save.character.gold < price * n;
          };
          const step = d => { qtyInput.value = Math.min(RPG.BUY_MAX, Math.max(1, (Number(qtyInput.value) || 1) + d)); upd(); };
          minus.addEventListener("click", () => step(-1));
          plus.addEventListener("click", () => step(1));
          qtyInput.addEventListener("input", upd);
          qtyInput.addEventListener("keydown", e => { if (e.key === "Enter") buySome.click(); });
          upd();
          buyRow.append(minus, qtyInput, plus);
          box.append(buyRow, buySome);
          if (most > 1) box.append(noteP(`На ваше золото — до ${fmtNum(most)} шт.`));
          return box;
        };
        RPG.bindTip(r, build, () => [
          stack && { text: `Повна комірка (${stack} шт.) · ${fmtNum(price * stack)} зол.`, className: "wf-secondary buy-btn",
            onClick: () => buy(stack), disabled: save.character.gold < price * stack,
            title: save.character.gold < price * stack ? "Не вистачає золота" : "" }
        ].filter(Boolean));
        buyBox.append(r);
      }

      const sellBox = el("div", "stack shop-list");
      sellBox.append(el("h3", null, "Продати (з інвентаря)"));
      if (!save.inventory.length) sellBox.append(el("p", "status", "Інвентар порожній. Вдягнені речі спершу зніміть."));
      save.inventory.forEach((entry, index) => {
        const item = RPG.ITEMS[entry.id];
        const unit = RPG.refSellPrice(entry);
        const r = el("button", "shop-row shop-info");
        r.type = "button";
        const label = el("span", "shop-name", itemLabel(entry));
        if (RPG.hasRarity(entry.id)) label.classList.add("rt-" + RPG.rarityOf(entry));
        r.append(smallIcon(entry), label, el("span", "shop-price is-sell", `+${fmtNum(unit)} зол.`));

        async function sell(qty) {
          RPG.popover.hide();
          const res = RPG.sellItem(save, index, qty);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Продано: ${RPG.itemFullName(entry)}${res.qty > 1 ? ` × ${res.qty}` : ""} за ${fmtNum(res.price)} золота.`);
          renderAll();
        }

        // Вікно продажу: опис + (для стопки) вибір кількості
        const build = () => {
          const box = itemInfo(entry, entry.qty, save);
          if (entry.qty > 1) {
            const sellRow = el("div", "sell-qty");
            const minus = button("−", "wf wf-secondary qty-btn");
            const plus = button("+", "wf wf-secondary qty-btn");
            const qtyInput = el("input", "shop-qty");
            Object.assign(qtyInput, { type: "number", min: 1, max: entry.qty, step: 1, value: 1, inputMode: "numeric" });
            qtyInput.setAttribute("aria-label", `Кількість: ${item.name}`);
            const sellSome = button("", "wf wf-button", () => {
              const n = Math.floor(Number(qtyInput.value));
              if (!(n >= 1 && n <= entry.qty)) { showMsg(msg, `Вкажіть кількість від 1 до ${entry.qty}.`, true); return; }
              sell(n);
            });
            const upd = () => {
              const n = Math.min(entry.qty, Math.max(1, Math.floor(Number(qtyInput.value)) || 1));
              sellSome.textContent = `Продати ${n} · +${fmtNum(unit * n)} зол.`;
            };
            const step = d => { qtyInput.value = Math.min(entry.qty, Math.max(1, (Number(qtyInput.value) || 1) + d)); upd(); };
            minus.addEventListener("click", () => step(-1));
            plus.addEventListener("click", () => step(1));
            qtyInput.addEventListener("input", upd);
            qtyInput.addEventListener("keydown", e => { if (e.key === "Enter") sellSome.click(); });
            upd();
            sellRow.append(minus, qtyInput, plus);
            box.append(sellRow, sellSome);
          }
          return box;
        };
        RPG.bindTip(r, build, () => entry.qty > 1
          ? [{ text: `Продати все (${entry.qty}) · +${fmtNum(unit * entry.qty)} зол.`, className: "wf-secondary", onClick: () => sell(entry.qty) }]
          : [{ text: `Продати · +${fmtNum(unit)} зол.`, className: "wf-button", onClick: () => sell(1) }]);
        sellBox.append(r);
      });

      cols.append(buyBox, sellBox);
      box.append(cols);
    }

    // ---------- Дубова Застава: райони та Гільдія авантюристів ----------
    // Центральний район — з 6 рівня; Дошка оголошень біля Мерії — після особливого завдання «Час дослідити»
    const districtLocked = d => !RPG.isDistrictOpen(save, d);
    // Район, де зараз герой (переходи між районами — дорогою по мапі Дубової Застави)
    const cityDistrict = save.location.district || "south";
    let guildNpc = "admin";         // admin | trader | trainer
    let trainMember = 0;            // кого навчає Тренер (герой групи)

    function renderCity() {
      place.append(noteP(locData.description));
      const grid = el("div", "district-grid");
      for (const d of locData.districts || []) {
        const locked = districtLocked(d);
        const card = button("", "wf loc-card " + (locked ? "wf-locked" : "wf-link"));
        card.append(el("strong", null, d.name), el("span", "loc-desc", locked ? "Закрито" : d.building));
        if (cityDistrict === d.id) { card.classList.add("is-selected"); card.append(el("span", "loc-desc", "Ви тут")); }
        card.addEventListener("click", async () => {
          if (cityDistrict === d.id) return;
          if (locked) { showMsg(msg, RPG.districtLockText(d), true); return; }
          const r = RPG.startTravel(save, d.id);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          location.href = "maps.html";
        });
        grid.append(card);
      }
      place.append(grid);

      const d = (locData.districts || []).find(x => x.id === cityDistrict);
      if (d) {
        const box = el("div", "stack district");
        box.append(el("h3", null, `${d.name} — ${d.building}`), noteP(d.description));
        if (districtLocked(d)) box.append(el("p", "status", RPG.districtLockText(d)));
        else if (d.id === "south") {
          renderGuild(box);
          box.append(button("Вийти з Дубової Застави", "wf wf-secondary", async () => {
            RPG.leaveCityToStart(save);
            await RPG.saveGame(save);
            location.reload();
          }));
        }
        else if (d.id === "trade") renderTradeDistrict(box);
        else if (d.id === "north") renderNpc(box, "captain");
        else if (d.id === "center") renderTownHall(box);
        else if (d.id === "rest") renderRestDistrict(box);
        place.append(box);
      }
      const row = el("div", "row");
      row.append(link("Мапа", "maps.html"));
      place.append(row);
    }

    // --- Торговий район: Торгова гільдія, управляючий Скрудж ---
    // Торговий район: Гільдія ремісників (Кузьма — з професією) і Торгова гільдія (Скрудж — з 20 рівня)
    let tradeNpc = "kuzma";
    function renderTradeDistrict(box) {
      const tabs = el("div", "row npc-tabs");
      for (const [id, name] of [["kuzma", "Гільдія ремісників"], ["scrooge", "Торгова гільдія"]]) {
        tabs.append(button(name, "wf " + (tradeNpc === id ? "wf-button" : "wf-link"), () => { tradeNpc = id; renderPlace(); }));
      }
      box.append(tabs);
      if (tradeNpc === "scrooge") {
        if (save.character.level < RPG.TRADE_MIN_LEVEL) {
          box.append(el("p", "status", `Торгова гільдія Скруджа приймає лише поважних гостей — з ${RPG.TRADE_MIN_LEVEL} рівня.`));
          return;
        }
        renderTradeGuild(box);
        return;
      }
      renderNpc(box, "kuzma");
      // Горно Сварога — всередині Гільдії ремісників (data/runes.js → RUNE_FORGE); з'являється лише після знахідки
      // другої книги Сварога «Руни Небесної Кузні» (save.books.runes)
      if (RPG.RUNE_FORGE && save.books?.runes) {
        const fr = el("div", "shop-row tool-row fbook-row rune-forge-row");
        const info = el("div", "tool-info");
        info.append(el("strong", null, "Горно Сварога"),
          el("small", null, `Шість рун у вогонь — одна нова з попелу. Данина за кожне розпалювання — ${fmtNum(RPG.RUNE_FORGE.fee)} золота.`));
        fr.append(info, button("До Горна Сварога", "wf wf-button", () => showRuneForge()));
        box.append(fr);
      }
      if (!RPG.hasCraftAccess(save)) return;
      renderToolShop(box);
    }

    // Знаряддя від Кузьми — одразу стають у кузню вашого дому
    // ---------- Горно Сварога: 6 рун → 1 нова (data/runes.js → runeForge) ----------
    function showRuneForge() {
      document.querySelector(".rune-forge-dialog")?.remove();
      const F = RPG.RUNE_FORGE;
      const { dlg, closeBtn } = noticeDialog("rune-forge-dialog", () => renderAll());
      let picked = [], note = null;
      const left = id => RPG.countItem(save, id) - picked.filter(x => x === id).length;
      const draw = () => {
        dlg.innerHTML = "";
        const close = closeBtn("Закрити горно");
        dlg.append(close, el("h3", null, "Горно Сварога"));
        dlg.append(noteP(`Покладіть у горно ${F.count} будь-яких рун, зламані теж. Сварог переплавить їх в одну нову — від звичайної до епічної. Якщо всі шість одного виду, нова руна буде того ж виду. Данина — ${fmtNum(F.fee)} золота (у вас ${fmtNum(save.character.gold)}).`));
        if (note) dlg.append(el("p", "forge-result" + (note.error ? " is-error" : ""), note.text));
        // 6 слотів горна
        const slots = el("div", "belt-slots rune-forge-slots");
        for (let i = 0; i < F.count; i++) {
          const id = picked[i];
          const cell = button("", "wf wf-slot belt-slot" + (id ? " is-filled" : ""), () => { if (id) { picked.splice(i, 1); note = null; draw(); } });
          if (id) { fillItemCell(cell, id, 1); cell.title = `${RPG.ITEMS[id].name} — натисніть, щоб вийняти`; }
          else cell.append(el("span", "belt-empty", "порожньо"));
          slots.append(cell);
        }
        dlg.append(slots);
        if (picked.length) {
          const o = RPG.runeForgeOdds(picked);
          const k = o.kind ? RPG.RUNE_KIND_NAME[o.kind].toLowerCase() : "будь-яка з 28";
          dlg.append(el("p", "forge-odds", (picked.length < F.count ? `Ще ${F.count - picked.length} — і горно готове. ` : "") +
            `Вийде: ${F.out.filter(g => o[g] >= 0.005).map(g => `${RPG.RUNE_GRADES[g].prefix.replace(/ руна$/, "").replace(/^Руна$/, "звичайна").toLowerCase()} ${Math.round(o[g] * 100 * (F.count / picked.length))}%`).join(" · ")} · ${k}`));
        }
        const go = button(`Розпалити горно · ${fmtNum(F.fee)} зол.`, "wf wf-button", async () => {
          const r = RPG.runeForge(save, picked);
          if (!r.ok) { note = { text: r.reason, error: true }; draw(); return; }
          await RPG.saveGame(save);
          picked = [];
          note = { text: `З попелу народилася нова руна: ${RPG.ITEMS[r.id].name}! −${fmtNum(r.price)} золота данини.` };
          draw();
        });
        go.disabled = picked.length !== F.count || save.character.gold < F.fee;
        const row = el("div", "row");
        row.append(go);
        if (picked.length) row.append(button("Вийняти все", "wf wf-secondary", () => { picked = []; note = null; draw(); }));
        dlg.append(row);
        // руни з інвентаря
        const stacks = [];
        for (const e of save.inventory) if (RPG.ITEMS[e.id]?.type === "rune" && !stacks.includes(e.id)) stacks.push(e.id);
        const list = el("div", "rune-forge-list");
        if (!stacks.length) list.append(el("p", "house-soon", "В інвентарі немає рун."));
        for (const id of stacks) {
          const n = left(id);
          const b = button("", "wf wf-slot rune-forge-pick" + (n ? "" : " is-empty"), () => {
            if (picked.length >= F.count || left(id) < 1) return;
            picked.push(id); note = null; draw();
          });
          fillItemCell(b, id, n);
          b.disabled = !n || picked.length >= F.count;
          list.append(b);
        }
        dlg.append(el("strong", null, "Ваші руни — натисніть, щоб покласти в горно:"), list);
      };
      document.body.append(dlg);
      draw();
      dlg.showModal();
    }

    function renderToolShop(box) {
      const h = RPG.forgeHouse(save);
      const wrap = el("div", "stack tool-shop");
      wrap.append(el("p", "status shop-gold", `Ваше золото: ${fmtNum(save.character.gold)}`));
      // Книга «Небесна кузня. Настанова» — перша наука коваля (data/books.js)
      if (RPG.FORGE_BOOK) {
        const B = RPG.FORGE_BOOK, has = RPG.hasForgeBook(save);
        const r = el("div", "shop-row tool-row fbook-row");
        const info = el("div", "tool-info");
        info.append(el("strong", null, `Книга «${B.title}»`),
          el("small", null, has ? "Перша наука коваля вже ваша. Перечитувати можна тут і в бібліотеці свого дому."
            : "Перша наука коваля від Сварога, Брокка й Ейтрі. Без неї не викувати й не розібрати жодної речі."));
        r.append(info);
        const btns = el("div", "row fbook-btns");
        if (has) btns.append(el("span", "shop-price tool-have", "✓ ваша"));
        else {
          const b = button(`Купити · ${fmtNum(B.price)} зол.`, "wf wf-button", async () => {
            const res = RPG.buyForgeBook(save);
            if (!res.ok) { showMsg(msg, res.reason, true); return; }
            await RPG.saveGame(save);
            showMsg(msg, `Куплено книгу «${res.name}». −${fmtNum(res.price)} золота. Кузьма радить почати з Прологу.`);
            renderAll();
            showForgeBook(save);
          });
          b.disabled = !RPG.hasCraftAccess(save) || save.character.gold < B.price;
          btns.append(b);
        }
        btns.append(button(has ? "Читати" : "Погортати", "wf wf-secondary", () => showForgeBook(save, has ? "prologue" : "toc")));
        r.append(btns);
        wrap.append(r);
      }
      wrap.append(el("h3", null, "Знаряддя для кузні"));
      const toolsLeft = Object.entries(RPG.FORGE_TOOLS).filter(([id]) => !h?.forge?.tools?.[id]);
      if (!h) wrap.append(el("p", "tool-hint", "Спершу збудуйте кузню при своєму домі в Спальному районі — Кузьма поставить знаряддя туди."));
      else if (!toolsLeft.length) wrap.append(el("p", "tool-hint", `Усі знаряддя вже стоять у кузні «${h.name}».`));
      else wrap.append(el("p", "tool-hint", `Куплене Кузьма поставить у кузню дому «${h.name}».`));
      // уже куплені знаряддя з переліку зникають
      for (const [id, t] of toolsLeft) {
        const r = el("div", "shop-row tool-row");
        const info = el("div", "tool-info");
        info.append(el("strong", null, t.name + (t.need ? " · обов'язкове" : "")),
          el("small", null, t.text + (t.for ? ` Потрібне для: ${t.for}.` : "")));
        r.append(info);
        const b = button(`Купити · ${fmtNum(t.price)} зол.`, "wf wf-button", async () => {
          const res = RPG.buyForgeTool(save, id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Куплено: ${res.name}. Кузьма поставив у кузню «${res.house}». −${fmtNum(res.price)} золота.`);
          renderAll();
        });
        b.disabled = !h || save.character.gold < t.price;
        r.append(b);
        wrap.append(r);
      }
      box.append(wrap);
    }

    function renderTradeGuild(box) {
      renderNpc(box, "scrooge");
      box.append(noteP(`Скрудж продає речі 3 виду (з ${RPG.TRADE_MIN_LEVEL} рівня, для зброї — володіння 20) ` +
        `за ${RPG.TRADE_PRICE_MULT}× від їхньої вартості, а купує будь-що за ${Math.round(RPG.SHOP_BUY_RATE * 100)}%.`));
      renderShop(box, RPG.tradeStock(), { priceOf: RPG.tradePrice, buy: RPG.buyFromTrade, stock: true });
    }

    // --- Мерія: Дошка оголошень (найм у групу) ---
    let hallNpc = RPG.isHiringOpen(save) ? "board" : "steward";     // board | steward
    function renderTownHall(box) {
      // Захар доступний завжди (книга «Предки…»); перерозподіл атрибутів — з RPG.STEWARD_MIN_LEVEL рівня
      {
        const tabs = el("div", "row npc-tabs");
        for (const [id, name] of [["board", "Дошка оголошень"], ["steward", "Розпорядник Захар"]]) {
          tabs.append(button(name, "wf " + (hallNpc === id ? "wf-button" : "wf-link"), () => { hallNpc = id; renderPlace(); }));
        }
        box.append(tabs);
      }
      if (hallNpc === "steward") {
        if (npcCtx.member >= RPG.partySize(save)) npcCtx.member = 0;
        if (RPG.partySize(save) > 1) {
          const mt = el("div", "row member-tabs");
          memberTabs(mt, save, npcCtx.member, i => { npcCtx.member = i; npcResult.steward = null; renderPlace(); });
          box.append(mt);
        }
        renderNpc(box, "steward");
        // Книга «Кров Іггдрасиля — Боги пантеонів» — продається власникам дому (data/books.js → GODS_BOOK)
        if (RPG.GODS_BOOK) {
          const B = RPG.GODS_BOOK, has = RPG.hasGodsBook(save), owner = (save.houses || []).length > 0;
          const r = el("div", "shop-row tool-row fbook-row");
          const info = el("div", "tool-info");
          info.append(el("strong", null, `Книга «${B.title}»`), el("small", null, has
            ? "Книга ваша — читати її можна в бібліотеці свого дому."
            : owner ? "Довідник Мерії про богів Ірію, Асгарду й сили темряви. Ляже на полицю бібліотеки у вашому домі."
            : "Мерія продає цей довідник лише власникам дому в Заставі (Спальний район)."));
          r.append(info);
          if (has) r.append(el("span", "shop-price tool-have", "✓ ваша"));
          else {
            const b = button(`Купити · ${fmtNum(B.price)} зол.`, "wf wf-button", async () => {
              const res = RPG.buyGodsBook(save);
              if (!res.ok) { showMsg(msg, res.reason, true); return; }
              await RPG.saveGame(save);
              showMsg(msg, `Куплено книгу «${res.name}». −${fmtNum(res.price)} золота. Вона вже на полиці бібліотеки вашого дому.`);
              renderAll();
            });
            b.disabled = !owner || save.character.gold < B.price;
            r.append(b);
          }
          box.append(r);
        }
        return;
      }
      if (!RPG.isHiringOpen(save)) {
        box.append(el("p", "board-closed", "Біля Мерії стоїть Дошка оголошень: авантюристи шукають собі напарників. Та чужинцеві тут ніхто не довіряє — " +
          `спершу доведіть, що на вас можна покластися: особливе завдання «${RPG.EXPLORE.name}» в Артеміди, адміністратора Гільдії авантюристів ` +
          `(з ${RPG.EXPLORE.minLevel} рівня). А поки зазирніть до Розпорядника Захара.`));
        return;
      }
      const size = RPG.partySize(save);
      box.append(noteP("Біля Мерії стоїть Дошка оголошень: авантюристи шукають собі напарників, щоб об'єднатися в групу. " +
        `За кожного нового члена групи Мерія бере внесок. У групі може бути до ${RPG.MAX_PARTY} героїв.`));

      box.append(el("h3", null, `Ваша група: ${size} / ${RPG.MAX_PARTY}`));
      RPG.partyMembers(save).forEach((ms, i) => {
        const r = el("div", "shop-row");
        const dead = RPG.isMemberDead(ms);
        r.append(el("span", "shop-name", `${ms.character.name} — ${RPG.getClass(ms.character.classId).name}, рівень ${ms.character.level}` +
          (i === 0 ? (RPG.heroGender(ms) === "f" ? " · головна героїня" : " · головний герой") : "") +
          (dead ? (RPG.heroGender(ms) === "f" ? " · полегла" : " · полеглий") : "")));
        if (i > 0) {
          r.append(button("Відпустити", "wf wf-secondary", async () => {
            if (!confirm(`Відпустити ${ms.character.name}? ${RPG.gw(ms, "Його", "Її")} речі перейдуть у спільний інвентар, внесок не повертається.`)) return;
            const res = RPG.dismissMember(save, i);
            await RPG.saveGame(save);
            showMsg(msg, res.ok ? `${res.name} покидає групу. ${RPG.gw(ms, "Його", "Її")} речі — в інвентарі.` : res.reason, !res.ok);
            renderAll();
          }));
        }
        box.append(r);
      });

      box.append(el("h3", null, "Дошка оголошень"));
      const cost = RPG.nextHireCost(save);
      if (cost == null) { box.append(el("p", "status", "Група вже повна.")); return; }
      box.append(el("p", "status", `Внесок у Мерію за наступного (${size + 1}-го) героя групи: ${fmtNum(cost)} золота. ` +
        `Далі — ${RPG.HIRE_COSTS.slice(size).map(fmtNum).join(" → ")} золота. Новачки починають з 1 рівня.`));
      const can = RPG.canHire(save);
      if (!can.ok) box.append(el("p", "status", can.reason));
      for (const name of RPG.boardState(save)) {
        const r = el("div", "shop-row");
        r.append(el("span", "shop-name", `«Шукаю групу. ${name}, ${RPG.getClass(RPG.DEFAULT_CLASS).name}, 1 рівень.»`));
        const b = button(`Найняти (${fmtNum(cost)} зол.)`, "wf wf-button", async () => {
          const res = RPG.hireMember(save, name);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `${name} приєднується до групи! Внесок у Мерію: ${fmtNum(res.cost)} золота. ` +
            "Налаштувати спорядження — в Інвентарі, атрибути — на сторінці «Персонаж».");
          renderAll();
        });
        b.disabled = !can.ok;
        r.append(b);
        box.append(r);
      }
      box.append(button("Оновити оголошення", "wf wf-link", async () => {
        RPG.refreshBoard(save);
        await RPG.saveGame(save);
        renderAll();
      }));
    }

    function renderGuild(box) {
      const tabs = el("div", "row npc-tabs");
      const guildTabs = [["admin", "Адміністратор Артеміда"], ["trader", "Торговець Тадеуш"], ["trainer", "Тренер Брут"]];
      if (RPG.IFRIT) guildTabs.push(["ifrit", "Іфрит (тест)"]);      // ТЕСТ: прибрати разом з блоком IFRIT у character.js
      for (const [id, name] of guildTabs) {
        tabs.append(button(name, "wf " + (guildNpc === id ? "wf-button" : "wf-link"), () => { guildNpc = id; renderPlace(); }));
      }
      box.append(tabs);
      const npc = el("div", "stack npc-panel");
      // Шапка з портретом (assets/images/npc/<файл>.webp; поки картинки немає — лише ім'я)
      const GUILD_NPC = { admin: ["npc_guild_admin", "Артеміда, адміністратор гільдії"],
                          trader: ["npc_guild_trader", "Тадеуш, торговець гільдії"],
                          trainer: ["npc_trainer", "Брут, тренер гільдії"],
                          ifrit: ["npc_ifrit", "Іфрит — тестовий торговець ресурсами"] };
      if (!GUILD_NPC[guildNpc] || (guildNpc === "ifrit" && !RPG.IFRIT)) guildNpc = "admin";
      const [pic, who] = GUILD_NPC[guildNpc];
      const head = el("div", "npc-head");
      const img = new Image();
      img.className = "npc-portrait"; img.alt = "";
      img.addEventListener("error", () => img.remove());
      img.src = RPG.asset(`assets/images/npc/${pic}.webp`);
      head.append(img, el("strong", "npc-name", who));
      npc.append(head);
      if (guildNpc === "admin") renderQuestBoard(npc);
      else if (guildNpc === "trader") {
        npc.append(noteP(
          `Тадеуш, торговець гільдії, продає зброю 1–2 виду, шкіряну броню (2 вид), малі й середні зілля (за ${Math.round(RPG.SHOP_SELL_RATE * 100)}% вартості), ` +
          `а купує будь-що за ${Math.round(RPG.SHOP_BUY_RATE * 100)}%.`));
        renderShop(npc, RPG.GUILD_SHOP || []);
      } else if (guildNpc === "ifrit") {
        // ТЕСТ: Іфрит не належить до лору — продає ресурси, які ще не падають і не добуваються
        npc.append(el("p", "ifrit-note", "Тестовий персонаж (не з лору гри). Продає ресурси ремесла, які поки ніде не падають і не добуваються. " +
          `За одну покупку — до ${fmtNum(RPG.BUY_MAX)} шт.`));
        renderShop(npc, RPG.IFRIT.stock, { priceOf: RPG.ifritPrice, buy: RPG.buyFromIfrit, stock: true });
      } else renderTrainer(npc);
      box.append(npc);
    }

    // --- Адміністратор гільдії: завдання ---
    function renderQuestBoard(box) {
      const before = RPG.questState(save).offers.length;
      RPG.fillOffers(save);
      if (RPG.questState(save).offers.length !== before) RPG.saveGame(save).catch(e => console.error(e));
      const qs = RPG.questState(save);
      renderExplore(box);
      renderProfession(box);
      box.append(noteP(
        `«Роботи вистачає — беріть до ${RPG.questMaxActive(save)} завдань одночасно.» Виконано завдань: ${qs.done}.` +
        (RPG.partySize(save) > 1 ? " Досвід за завдання отримує кожен герой групи — повністю, ще й з бонусами (група, тимчасові ефекти, руни й речі)." : "")));

      // «Здати все»: разом усі виконані завдання гільдії та нагороди за чемпіонів
      if (qs.active.length || qs.bounties.length) {
        const readyCount = qs.active.filter(q => RPG.isQuestComplete(save, q)).length + qs.bounties.length;
        const all = button(readyCount ? `Здати все (${readyCount})` : "Здати все", "wf wf-button turn-in-all", async () => {
          let exp = 0, gold = 0, quests = 0, bounties = 0, lastLevel = null;
          const items = {};
          const bountyExp = {};   // досвід (чемпіони й завдання) — кожному герою окремо, з бонусами
          const noteLevel = lv => { if (lv.length) lastLevel = lv[lv.length - 1]; };
          for (const bounty of [...qs.bounties]) {
            const res = RPG.claimBounty(save, bounty.id);
            if (!res.ok) continue;
            bounties++;
            gold += bounty.gold;
            for (const h of res.heroes) bountyExp[h.name] = (bountyExp[h.name] || 0) + h.exp;
            noteLevel(res.levelUps);
            journalReward(save, `Гільдія: переможено чемпіона «${bounty.name}»`, RPG.bountyRewardText(res));
          }
          for (const quest of qs.active.filter(q => RPG.isQuestComplete(save, q))) {
            const res = RPG.turnInQuest(save, quest.id);
            if (!res.ok) continue;
            quests++;
            gold += quest.reward.gold;
            for (const it of quest.reward.items) items[it.id] = (items[it.id] || 0) + it.qty;
            for (const h of res.heroes) bountyExp[h.name] = (bountyExp[h.name] || 0) + h.exp;
            noteLevel(res.levelUps);
            const t = `Нагорода: ${RPG.describeReward({ ...quest.reward, exp: null })}; досвід — ${res.expText}`;
            journalReward(save, `Завдання «${RPG.questTitle(quest)}» здано`, t.endsWith("!") ? t : t + ".");
          }
          if (!quests && !bounties) { showMsg(msg, "Немає виконаних завдань.", true); return; }
          const reward = RPG.describeReward({ exp: null, gold, items: Object.entries(items).map(([id, qty]) => ({ id, qty })) });
          const what = [quests ? `завдань: ${quests}` : "", bounties ? `нагород за чемпіонів: ${bounties}` : ""].filter(Boolean).join(", ");
          const names = Object.keys(bountyExp);
          const bTxt = names.length ? ` Досвід${names.length > 1 ? " кожному" : ""}: ` +
            names.map(n => names.length > 1 ? `${n} +${fmtNum(bountyExp[n])}` : `+${fmtNum(bountyExp[n])}`).join(", ") + " EXP (з бонусами)." : "";
          const txt = `Здано ${what}. Нагорода: ${reward}.${bTxt}` + (lastLevel ? ` Новий рівень: ${lastLevel}!` : "");
          await RPG.saveGame(save);
          showMsg(msg, txt);
          renderAll();
        });
        all.disabled = !readyCount;
        const allRow = el("div", "row");
        allRow.append(all);
        box.append(allRow);
      }

      if (qs.bounties.length) {
        box.append(el("h3", null, "Нагороди за чемпіонів"));
        for (const bounty of qs.bounties) {
          const r = el("div", "shop-row quest-row quest-done champion-row");
          const info = el("span", "shop-name", `Переможено чемпіона: ${bounty.name}`);
          const many = RPG.partySize(save) > 1;
          info.append(el("small", null, ` · ${bounty.exp} EXP${many ? " кожному герою" : ""} + бонуси, ${bounty.gold} золота (×${RPG.CHAMPION.bountyMult})`));
          r.append(info, button("Отримати", "wf wf-button", async () => {
            const res = RPG.claimBounty(save, bounty.id);
            if (!res.ok) { showMsg(msg, res.reason, true); return; }
            const txt = RPG.bountyRewardText(res);
            journalReward(save, `Гільдія: переможено чемпіона «${bounty.name}»`, txt);
            await RPG.saveGame(save);
            showMsg(msg, txt);
            renderAll();
          }));
          box.append(r);
        }
      }

      box.append(el("h3", null, "Ваші завдання"));
      if (!qs.active.length) box.append(el("p", "status", "Немає взятих завдань."));
      for (const quest of qs.active) {
        const done = RPG.isQuestComplete(save, quest);
        const r = el("div", "shop-row quest-row" + (done ? " quest-done" : ""));
        const info = el("span", "shop-name", `${RPG.questTitle(quest)} — ${RPG.questProgress(save, quest)}/${quest.need}`);
        info.append(el("small", null, ` · нагорода: ${RPG.describeReward(quest.reward)}`));
        const turnIn = button("Здати", "wf wf-button", async () => {
          const res = RPG.turnInQuest(save, quest.id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          const t = `Завдання виконано! Нагорода: ${RPG.describeReward({ ...quest.reward, exp: null })}; досвід — ${res.expText}`;
          const txt = t.endsWith("!") ? t : t + ".";
          journalReward(save, `Завдання «${RPG.questTitle(quest)}» здано`, txt);
          await RPG.saveGame(save);
          showMsg(msg, txt);
          renderAll();
        });
        turnIn.disabled = !done;
        const drop = button("Відмовитись", "wf wf-secondary", async () => {
          if (!confirm(`Відмовитися від завдання «${RPG.questTitle(quest)}»?`)) return;
          RPG.abandonQuest(save, quest.id);
          await RPG.saveGame(save);
          renderAll();
        });
        r.append(info, turnIn, drop);
        box.append(r);
      }

      box.append(el("h3", null, "Нові завдання"));
      for (const quest of qs.offers) {
        const r = el("div", "shop-row quest-row");
        const info = el("span", "shop-name", RPG.questTitle(quest));
        info.append(el("small", null, ` · нагорода: ${RPG.describeReward(quest.reward)}`));
        const take = button("Взяти", "wf wf-button", async () => {
          const res = RPG.acceptQuest(save, quest.id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Взято завдання: ${RPG.questTitle(quest)}.`);
          renderAll();
        });
        take.disabled = qs.active.length >= RPG.questMaxActive(save);
        r.append(info, take);
        box.append(r);
      }
    }

    // --- Особливе завдання «Час дослідити» (у Адміністратора) ---
    function renderExplore(box) {
      const info = RPG.exploreInfo(save);
      const E = RPG.EXPLORE;
      if (!info) {
        box.append(noteP(`Особливе завдання «${E.name}» Артеміда доручає героям від ${E.minLevel} рівня.`));
        return;
      }
      // Виконано: один раз показуємо повідомлення про відкриття Дошки оголошень, далі поле приховане
      if (info.done) {
        if (!info.st.announced) {
          info.st.announced = true;
          RPG.saveGame(save).catch(e => console.error(e));
          showExploreUnlocked();
        }
        return;
      }
      const card = el("div", "stack explore-card");
      card.append(el("h3", null, `Особливе завдання: «${E.name}»`));
      if (info.canStart) {
        card.append(noteP(`«Ви вже ${RPG.gw(save, "досвідчений авантюрист", "досвідчена авантюристка")}. Час дослідити світ далі — але спершу допоможіть нам. ` +
          `Завдання з ${info.total} частин, кожна відкривається після попередньої.»`));
        card.append(button("Взяти завдання", "wf wf-button", async () => {
          const r = RPG.startExplore(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Взято особливе завдання «${E.name}». Частина 1: ${E.parts[0].title}.`);
          renderAll();
        }));
      } else {
        card.append(el("p", null, `Частина ${info.index} з ${info.total}: ${info.part.title}`));
        card.append(noteP(info.part.text));
        for (const pr of info.progress) {
          card.append(el("div", pr.have >= pr.need ? "rt-magic" : null, `${pr.label}: ${pr.have} / ${pr.need}`));
        }
        card.append(el("p", "status", "Нагорода: " + RPG.describeExploreReward(info.part)));
        const b = button(info.index < info.total ? "Здати частину" : "Завершити завдання", "wf wf-button", async () => {
          const r = RPG.turnInExplore(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          const rest = RPG.describeExploreReward(r.part || info.part, true);
          const up = [rest, r.expText ? `досвід — ${r.expText}` : ""].filter(Boolean).join("; ");
          const upTxt = up ? ` Нагорода: ${up}${up.endsWith("!") ? "" : "."}` : "";
          journalReward(save, r.finished ? `Завдання «${E.name}» виконано` : `«${E.name}»: частину ${info.index} з ${info.total} здано`,
            upTxt.trim() || "Нагороди немає.");
          if (r.finished) RPG.storyState(save).announced = true;
          await RPG.saveGame(save);
          if (r.finished) showExploreUnlocked(upTxt);
          else showMsg(msg, `Частину виконано!${upTxt} Далі: ${E.parts[RPG.storyState(save).part - 1].title}.`);
          renderAll();
        });
        b.disabled = !info.complete;
        card.append(b);
      }
      box.append(card);
    }

    // Повідомлення: «Час дослідити» виконано — відкрито Дошку оголошень біля Мерії
    function showExploreUnlocked(up = "") {
      const E = RPG.EXPLORE;
      const go = link("До Центрального району (Мерія)", "game.html?district=center", "wf wf-button");
      showNotice("Відкрито доступ: Дошка оголошень", [
        `Особливе завдання «${E.name}» виконано!${up}`,
        E.finale,
        "Дошка оголошень біля Мерії (Центральний район) тепер відкрита — можна наймати героїв у групу.",
        go
      ]);
    }

    // --- Квест «Шлях професії» (з 12 рівня Селянина; 3 гілки по 10 завдань; професія — на 15 рівні) ---
    // Кожен герой групи проходить шлях сам (quests.js → professionState): картка на кожного,
    // умови й професія — за його власними атрибутами. ms — «вигляд» героя (party.js → memberSave).
    function renderProfession(box) {
      const members = RPG.partyMembers(save);
      const group = members.length > 1;
      const waiting = [];
      for (const ms of members) {
        if (!renderProfessionFor(box, ms, group) && ms.character.classId === RPG.DEFAULT_CLASS) waiting.push(ms);
      }
      if (waiting.length) {
        const who = group ? waiting.map(ms => `${ms.character.name} (${ms.character.level} рів.)`).join(", ") + " — " : "";
        box.append(noteP(`${who}квест «${RPG.PROFESSION.name}» — зміна професії — Артеміда дає Селянину з ${RPG.PROFESSION_QUEST_LEVEL} рівня.`));
      }
    }
    // Картка квесту одного героя. Повертає false, якщо квест йому ще не доступний
    function renderProfessionFor(box, ms, group) {
      const info = RPG.professionInfo(ms);
      const name = RPG.professionName(ms);
      const who = group ? `${ms.character.name}: ` : "";
      if (!info) return false;
      const card = el("div", "stack explore-card");
      card.append(el("h3", null, `${group ? ms.character.name + " — к" : "К"}вест: «${name}»`));
      const levelTxt = lv => lv.length ? ` Новий рівень: ${lv[lv.length - 1]}!` : "";
      if (info.done) {
        card.append(el("p", null, `${group ? ms.character.name + " — професія" : "Ваша професія"}: ${RPG.getClass(ms.character.classId).name}.`));
      } else if (info.canStart) {
        card.append(noteP("«Ти переріс селянське життя. Пройди десять випробувань — і на 15 рівні я скажу, ким тобі судилося стати. " +
          "Яким шляхом ти підеш, залежить від того, що ти в собі розвивав.»"));
        if (!info.branches.length) card.append(el("p", "rt-magic", RPG.PROFESSION_REFUSE));
        const take = async branch => {
          const r = RPG.startProfession(ms, branch);
          if (r.choose) {
            const pick = el("div", "stack");
            pick.append(el("p", null, "«Перед тобою кілька шляхів. Обери, яким підеш, — назад дороги не буде.»"));
            for (const id of r.choose) {
              const B = RPG.PROFESSION_BRANCHES[id];
              pick.append(button(B.name, "wf wf-button", () => take(id)));
              pick.append(el("p", null, "Професії: " + B.classes.map(c => RPG.getClass(c).name).join(", ") + "."));
            }
            takeBtn.replaceWith(pick);
            return;
          }
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          const B = RPG.PROFESSION_BRANCHES[r.branch];
          showMsg(msg, `${who ? who + "в" : "В"}зято квест «${B.name}». ${B.intro} Завдання 1: ${B.parts[0].title}.`);
          renderAll();
        };
        const takeBtn = button("Взяти квест", "wf wf-button", () => take(null));
        card.append(takeBtn);
      } else if (info.final) {
        card.append(el("p", null, "Усі десять випробувань пройдено. «Ти довів, на що здатен. Час дізнатися, ким ти станеш.»"));
        card.append(el("p", null, "Нагорода за шлях: ???"));
        const finish = async classId => {
          const r = RPG.turnInProfession(ms, classId);
          if (r.choose) {
            if (r.choose.length === 1) return finish(r.choose[0]);
            const pick = el("div", "stack");
            pick.append(el("p", null, "«Перед тобою кілька шляхів — обери свій. Маг сам вирішує, якій стихії служити.» " +
              "Вибір не можна буде змінити."));
            for (const id of r.choose) {
              const c = RPG.getClass(id);
              const w = (c.weapons || []).map(t => RPG.WEAPON_TYPES[t]?.name || t).join(" / ");
              pick.append(button(`${c.name} — ${w}`, "wf wf-button", () => finish(id)));
              pick.append(el("p", null, c.description));
            }
            b.replaceWith(pick);
            return;
          }
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          const c = RPG.getClass(r.classId);
          journalReward(save, `${who}Шлях професії пройдено`, `Нагорода за шлях: ${r.exp ? fmtNum(r.exp) + " EXP (15 рівень) і " : ""}нова професія — ${c.name}.`);
          await RPG.saveGame(save);
          showMsg(msg, `${who ? who + "н" : "Н"}агорода за шлях: ${r.exp ? fmtNum(r.exp) + " EXP (15 рівень) і " : ""}нова професія — ${c.name}! ${c.description} ` +
            `Рівень професії почався з 1, а бонуси Селянина лишилися. Тренер Брут навчить новим навичкам.` +
            (r.change?.removed?.length ? " Зброю, якою ця професія не користується, знято в інвентар." : ""));
          renderAll();
        };
        const b = button("Завершити шлях і отримати професію", "wf wf-button", () => finish(null));
        card.append(b);
      } else {
        card.append(el("p", null, `Завдання ${info.index} з ${info.total}: ${info.part.title}`));
        card.append(noteP(info.part.text));
        for (const pr of info.progress) {
          card.append(el("div", pr.have >= pr.need ? "rt-magic" : null, `${pr.label}: ${pr.have} / ${pr.need}`));
        }
        card.append(el("div", null, "Нагорода: досвід — скільки, дізнаєтесь при здачі."));
        const b = button("Здати завдання", "wf wf-button", async () => {
          const r = RPG.turnInProfession(ms);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          journalReward(save, `${who}Шлях професії: завдання ${info.index} з ${info.total} здано`,
            `Нагорода: ${fmtNum(r.exp)} EXP.${levelTxt(r.levelUps)}`);
          await RPG.saveGame(save);
          const next = RPG.professionInfo(ms);
          showMsg(msg, `${who ? who + "з" : "З"}авдання виконано! Нагорода: ${fmtNum(r.exp)} EXP.${levelTxt(r.levelUps)} ` +
            (r.allDone ? "Усі десять випробувань пройдено — поверніться до Артеміди по нагороду за шлях."
                       : `Далі: ${next.part.title}.`));
          renderAll();
        });
        b.disabled = !info.complete;
        card.append(b);
      }
      box.append(card);
      return true;
    }

    // --- Тренер: володіння зброєю та навички ---
    function masteryBonusText(type, lvl) {
      const parts = [];
      for (const [k, max] of Object.entries(RPG.MASTERY_BONUS[type] || {})) {
        const v = Math.round(max * lvl / RPG.MASTERY_MAX * 10) / 10;
        parts.push(`${RPG.STAT_NAMES[k] || k} +${v}`);
      }
      return parts.join(", ");
    }

    function renderTrainer(box) {
      if (trainMember >= RPG.partySize(save)) trainMember = 0;
      const tabs = el("div", "row member-tabs");
      memberTabs(tabs, save, trainMember, i => { trainMember = i; renderPlace(); });
      box.append(tabs);
      const tms = RPG.memberSave(save, trainMember);
      const type = RPG.weaponTypeOf(tms);
      const cap = RPG.masteryCap(tms);
      box.append(noteP("«Володіння приходить у бою, а не за золото. За кожен виграний бій росте вміння тією зброєю, " +
        "що в правій руці. Хочеш швидше — потренуйся зі мною.»"));
      box.append(noteP(
        `Межа володіння зараз: ${cap}` + (cap < RPG.MASTERY_MAX ? " (з 10 рівня персонажа — 20)." : ".") +
        " Володіння 10 відкриває зброю 2 виду, 20 — 3 виду. Більше досвіду володіння — за кількох ворогів, чемпіонів, босів, " +
        "сильніших ворогів і з Джерелом Велеса; за ворогів, слабших на 10+ рівнів, — нічого."));

      // Тренування: +1 досвіду володіння за кожен виграний бій для всієї групи на 30 хв; лише одне активне
      const TB = RPG.TRAINER_BOOST;
      const left = RPG.trainerBoostLeft(save);
      const boost = el("div", "shop-row skill-row" + (left ? " is-current" : ""));
      const bInfo = el("span", "shop-name", `Тренування з Брутом: +${TB.flat} досвіду володіння за кожен виграний бій`);
      bInfo.append(el("small", null, left
        ? ` · діє ще ${Math.ceil(left / 60000)} хв для всієї групи`
        : ` · для всієї групи на ${TB.durationMs / 60000} хв`));
      const bBtn = button(left ? "Триває" : `Тренуватися (${fmtNum(TB.cost)} зол.)`, "wf wf-button", async () => {
        const res = RPG.buyTrainerBoost(save);
        if (!res.ok) { showMsg(msg, res.reason, true); return; }
        journalReward(save, "Тренування з Брутом", `+${TB.flat} досвіду володіння за кожен виграний бій для всієї групи на ${res.minutes} хв (−${fmtNum(res.cost)} золота).`);
        await RPG.saveGame(save);
        showMsg(msg, `Брут ганяє вас до сьомого поту. ${res.minutes} хв уся група отримує +${TB.flat} досвіду володіння за кожен виграний бій (−${fmtNum(res.cost)} золота).`);
        renderAll();
      });
      bBtn.disabled = !!left || (save.character.gold || 0) < TB.cost;
      boost.append(bInfo, bBtn);
      box.append(boost);

      box.append(el("h3", null, "Володіння зброєю"));
      for (const [t, wt] of Object.entries(RPG.WEAPON_TYPES)) {
        const pr = RPG.masteryProgress(tms, t);
        const lvl = pr.level;
        const r = el("div", "shop-row skill-row" + (t === type ? " is-current" : ""));
        const expTxt = pr.need ? ` · досвід ${Math.floor(pr.exp)}/${pr.need}` + (lvl >= cap ? " (межа)" : "") : " · найвищий рівень";
        const info = el("span", "shop-name", `${wt.mastery}: ${lvl}/${cap}` + (t === type ? " · у руках" : "") + expTxt);
        info.append(el("small", null, lvl ? ` · ${masteryBonusText(t, lvl)}` : ` · на 20: ${masteryBonusText(t, RPG.MASTERY_MAX)}`));
        r.append(info);
        box.append(r);
      }

      box.append(el("h3", null, "Навички, заклинання та пасивні вміння"));
      const ids = RPG.trainerSkills(tms);
      if (!ids.length) { box.append(el("p", "status", "Вдягніть зброю, щоб тренер показав навички для неї.")); return; }
      const KIND = { buff: "Баф", heal: "Лікування", passive: "Пасивне" };
      const wName = sk => (Array.isArray(sk.weapon) ? sk.weapon : [sk.weapon]).map(t => RPG.WEAPON_TYPES[t].name.toLowerCase()).join(" / ");
      for (const id of ids) {
        const sk = RPG.SKILLS[id];
        const lvl = RPG.skillLevel(tms, id);
        const mastery = RPG.skillMastery(tms, sk);
        const r = el("div", "shop-row skill-row" + (sk.cls ? " is-class" : ""));
        const icon = el("img", "skill-icon");
        icon.alt = "";
        icon.onerror = () => icon.remove();
        icon.src = RPG.asset(`assets/images/skills/${id}.webp`);
        const kind = KIND[sk.kind] || (sk.magic ? "Заклинання" : "Навичка");
        const info = el("span", "shop-name", `${kind}: ${sk.name} — ${lvl}/${RPG.SKILL_MAX}`);
        info.append(el("small", null, ` · ${sk.desc} ${RPG.describeSkill(id, Math.max(1, lvl))}` +
          (sk.school ? ` · школа: ${RPG.SCHOOLS[sk.school].name}` : "") +
          (sk.weapon && !RPG.skillWeaponOk(sk, type) ? ` · потрібна зброя: ${wName(sk)}` : "") +
          (sk.req && mastery < sk.req ? ` · потрібно володіння ${sk.req}` : "")));
        const cost = RPG.skillCost(lvl + 1);
        const cap = RPG.skillCap(tms, id);
        const label = lvl >= RPG.SKILL_MAX ? "Максимум" : `${lvl ? "Покращити" : "Вивчити"} (${fmtNum(cost)} зол.)`;
        const b = button(label, "wf wf-button", async () => {
          const res = RPG.learnSkill(tms, id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `«${sk.name}»: рівень ${res.level} (−${fmtNum(res.cost)} золота).` +
            (sk.kind === "passive" ? " Бонус діє постійно." : " Додайте навичку в чергу дій у бою."));
          renderAll();
        });
        b.disabled = lvl >= cap || mastery < (sk.req || 0) || tms.character.gold < cost;
        if (b.disabled && lvl >= cap && lvl < RPG.SKILL_MAX) {
          b.title = sk.kind === "passive" ? "Пасивне вміння — до половини рівня персонажа" : "Рівень навички не може перевищувати рівень володіння зброєю";
        }
        r.append(icon, info, b);
        box.append(r);
      }
    }

    // ---------- Бій ----------
    const startBtn = $("start-btn");
    const rerollBtn = $("reroll-btn");
    const saveBtn = $("save-btn");
    const logBox = $("battle-log");
    let foes = [];              // вороги наступного бою: [{ id, champion }]
    const fighters = () => RPG.aliveMembers(save);
    // Від половини групи до розміру групи (макс. 6) — випадково (RPG.enemyGroupRange); данж — без змін
    let champWarn = false;      // показати вікно-попередження про чемпіона
    // Кут поля, де з'являться герої в наступному бою (battle.js → corner 0…3);
    // з кожною новою групою ворогів — інший кут, вороги — у протилежному
    // Краї поля (EDGE_TYPES) і перешкоди за краями (EDGE_COVER) — див. «Краї поля» нижче (fieldEdges, fieldCover).
    // Оголошені тут, бо nextEnemy() кличе fieldCover() ще до того місця.
    const EDGE_TYPES = { trees: "Дерева", rocks: "Скелі", walls: "Стіни", water: "Вода" };
    const EDGE_COVER = { trees: ["tree", "bush"], rocks: ["rock", "stone"], walls: ["wall", "stone"] };
    let corner = RPG.randomCorner();
    let obstacles = [];         // перешкоди наступного бою (battle.js → makeObstacles), нові з кожною групою ворогів
    let foePositions = [];      // стартові місця ворогів (battle.js → placeFoesFree): будь-де на полі, купою або врозкид
    function nextEnemy() {
      corner = RPG.randomCorner(corner);
      obstacles = RPG.makeObstacles(fieldCover(), corner);
      pickFoes();
      foePositions = RPG.placeFoesFree(foes, corner, obstacles);
    }
    function pickFoes() {
      if (mode === "dungeon") {
        // У данжі вороги задані наперед; поки ворота зачинені — показуємо боса
        foes = dungeonOn() ? RPG.dungeonSpecs(save) : [{ id: dungeonInfo.boss, champion: false }];
        RPG.equipFoes(foes, fighters());
        champWarn = false;
        return;
      }
      foes = RPG.rollEnemyGroup(locId, save.character.level, RPG.enemyGroupRange(fighters()), fighters());
      champWarn = foes.some(f => f.champion);
    }

    // Перемикач «Обстеження / Данж» і панель воріт данжу
    const leaveBtn = $("leave-btn");
    function renderMode() {
      const tabs = $("mode-tabs"), panel = $("dungeon-panel");
      if (!dungeonInfo) { tabs.hidden = panel.hidden = true; return; }
      const active = RPG.activeDungeon(save);
      tabs.hidden = false;
      tabs.innerHTML = "";
      const keys = RPG.keyCount(save, dungeonInfo.id);
      [["explore", dungeonInfo.explore], ["dungeon", `${dungeonInfo.name} · ключів: ${keys}`]].forEach(([m, text]) => {
        const b = button(text, "wf member-tab " + (m === mode ? "wf-button" : "wf-link"), () => {
          if (fighting || m === mode) return;
          if (active && m === "explore") { showMsg(msg, "Спершу пройдіть або покиньте данж.", true); return; }
          mode = m;
          nextEnemy();
          renderMode();
          renderEnemy();
          showReady();
        });
        if (m === mode) b.setAttribute("aria-pressed", "true");
        tabs.append(b);
      });

      const inGate = mode === "dungeon" && !active;
      panel.hidden = !inGate;
      rerollBtn.hidden = mode === "dungeon";
      startBtn.hidden = inGate;
      leaveBtn.hidden = !(mode === "dungeon" && active);
      startBtn.textContent = active && mode === "dungeon" ? `Почати бій ${active.stage} з ${active.stages}` : "Почати бій";
      if (!inGate) return;
      panel.innerHTML = "";
      panel.append(el("h3", null, `Данж «${dungeonInfo.name}»`), noteP(dungeonInfo.description));
      panel.append(noteP(
        `3 бої поспіль: 1) ${RPG.DUNGEON_POOL_TEXT(dungeonInfo, 1)}; 2) ${RPG.DUNGEON_POOL_TEXT(dungeonInfo, 2)}; ` +
        `3) бос «${RPG.ENEMIES[dungeonInfo.boss].name}». Зілля й відновлення HP/MP у данжі не діють — ` +
        "лікують лише навички. Досвід і здобич — тільки за перемогу над босом."));
      panel.append(el("p", "note" + (keys ? "" : " is-neg"),
        `${RPG.ITEMS[dungeonInfo.key].name} у кишені для ключів: ${keys}. Одна спроба — один ключ (зникає при вході). ` +
        `Ключ можна знайти під час «${dungeonInfo.explore}» — шанс ${Math.round(dungeonInfo.keyChance * 100)}% з кожного ворога.`));
      if (dungeonInfo.minLevel) panel.append(el("p", "note" + (save.character.level < dungeonInfo.minLevel ? " is-neg" : ""),
        `Бій у данжі — з ${dungeonInfo.minLevel} рівня персонажа.`));
      const open = button("Відчинити ворота (−1 ключ)", "wf wf-button", async () => {
        if (fighting) return;
        if (!confirm(`Відчинити ворота? ${RPG.ITEMS[dungeonInfo.key].name} зникне, навіть якщо данж не вдасться пройти.`)) return;
        const r = RPG.openDungeon(save, dungeonInfo.id);
        if (!r.ok) { showMsg(msg, r.reason, true); return; }
        await RPG.saveGame(save);
        showMsg(msg, "Ворота відчинено. Бій 1 з 3 — зілля й відновлення тут не діють.");
        nextEnemy();
        renderMode();
        renderEnemy();
        showReady();
        renderQuickSlots();
      });
      open.disabled = !keys || !fighters().length;
      panel.append(open);
    }
    // Вікно «Увага, чемпіон!» — з'являється, коли серед ворогів є чемпіон
    // Показується в черзі вікон (queueDialog): після «Незнайомця» та інших повідомлень, а не поверх них
    function showChampionWarning() { queueDialog(openChampionWarning); }
    function openChampionWarning() {
      if (fighting || !foes.some(f => f.champion)) return null;   // поки чекали — ворога вже змінили
      let dlg = $("champion-dialog");
      if (!dlg) {
        dlg = el("dialog", "champion-dialog");
        dlg.id = "champion-dialog";
        document.body.append(dlg);
      }
      const i = foes.findIndex(f => f.champion);
      const e = curEnemy(i);
      dlg.innerHTML = "";
      const face = el("span", "champion-face");
      Object.assign(face.style, RPG.enemySpriteStyle(foes[i].id));
      dlg.append(el("div", "champion-badge", "Увага — чемпіон!"), face,
        el("h3", null, `${e.name} · рівень ${e.level}`),
        el("p", null, "Утричі сильніший за звичайного: здоров'я, мана, атака, магія й захист ×3. " +
          "За перемогу — трофей рідкісної якості й нагорода ×5 в Артеміди, адміністратора гільдії."));
      const row = el("div", "row dialog-actions");
      row.append(
        button("Прийняти виклик", "wf wf-button", () => dlg.close()),
        button("Шукати іншого ворога", "wf wf-link", () => { dlg.close(); $("reroll-btn")?.click(); }));
      dlg.append(row);
      if (!dlg.open) dlg.showModal();
      return dlg;
    }
    function curEnemy(i = 0) { return RPG.enemyFromSpec(foes[i]); }
    const gsText = e => (e.gs ? ` · GS ${e.gs}` : "");
    // Зброя гуманоїда і його дальність (monstergear.js)
    const weaponText = e => (e.weaponName ? ` · ${e.weaponName} (дальн. ${RPG.enemyRange(e)})` : "");
    const anyChampion = () => foes.some(f => f.champion);
    if (combat) nextEnemy();

    // Ворог(и): великий портрет — перший; якщо їх кілька — список з HP / MP кожного
    function renderEnemy() {
      if (champWarn) { champWarn = false; setTimeout(showChampionWarning, 50); }
      if (!fighting) renderField();
      const enemy = curEnemy(0);
      const champ = foes[0].champion;
      $("enemy-img").closest("figure").classList.toggle("is-champion", champ);
      $("enemy-col").classList.toggle("is-champion", anyChampion());
      Object.assign($("enemy-img").style, RPG.enemySpriteStyle(foes[0].id));
      $("enemy-img").setAttribute("aria-label", enemy.name);
      $("enemy-name").textContent = `${enemy.name} (рівень ${enemy.level}${gsText(enemy)})` + (foes.length > 1 ? ` + ще ${foes.length - 1}` : "");
      setBar($("enemy-hp"), enemy.stats.hp, enemy.stats.hp);
      const mpBar = $("enemy-mp");
      mpBar.hidden = !enemy.stats.mp;
      if (enemy.stats.mp) setBar(mpBar, enemy.stats.mp, enemy.stats.mp);

      const list = $("enemy-list");
      if (!list) return;
      list.innerHTML = "";
      list.hidden = foes.length < 2;
      if (foes.length < 2) return;
      list.append(el("div", "party-title", `Ворогів: ${foes.length}`));
      foes.forEach((f, i) => {
        const e = curEnemy(i);
        const row = el("div", "party-row" + (f.champion ? " is-champion" : ""));
        const face = el("span", "party-face");
        Object.assign(face.style, RPG.enemySpriteStyle(f.id));
        const info = el("div", "party-info");
        info.append(el("strong", null, `${e.name} · рів. ${e.level}${gsText(e)}${f.champion ? " · чемпіон" : ""}${e.boss ? " · бос" : ""}${weaponText(e)}`));
        const hp = miniBar("bar-hp", "HP", "foe-hp-" + i);
        setBar(hp, e.stats.hp, e.stats.hp);
        info.append(hp);
        if (e.stats.mp) {
          const mp = miniBar("bar-mp", "MP", "foe-mp-" + i);
          setBar(mp, e.stats.mp, e.stats.mp);
          info.append(mp);
        }
        row.append(face, info);
        list.append(row);
      });
    }

    // ---------- Поле бою 15 × 30 (battle.js → BATTLE_FIELD, fieldPos, placeHeroes, placeFoes) ----------
    // Логічно поле 15 рядків × 30 стовпців. На ПК показується так само (широке),
    // на телефоні (≤ 700 px) — повернуте: 30 рядків × 15 стовпців (високе).
    // Герої стоять у куті corner (зона 3 × 3), вороги — будь-де на полі (купою або врозкид),
    // але не ближче ніж на хід руху до героїв (battle.js → placeFoesFree).
    // Розстановку героїв обирає гравець (вікно розстановки) — ВІДНОСНО своєї зони 3 × 3
    // (c 2 — передній ряд), і вона зберігається в save.formation:
    // { main: { r, c }, <id напарника>: { r, c } }. Якщо для всіх героїв групи вона вже є —
    // використовується щоразу, у будь-якому куті; інакше вікно з'являється перед першим боєм.
    const FIELD = RPG.BATTLE_FIELD;
    const fieldBox = $("bfield");
    const fieldTokens = { hero: [], enemy: [] };
    const mobileField = window.matchMedia ? window.matchMedia("(max-width: 700px)") : { matches: false };
    // Повернули телефон / змінили ширину вікна — перемалювати поле під новий вигляд (не під час бою)
    mobileField.addEventListener?.("change", () => { if (combat && !fighting) renderField(); });
    const memberKey = ms => (ms.memberIndex ? (save.party[ms.memberIndex - 1]?.id || "m" + ms.memberIndex) : "main");
    function formationOf(team) {
      const f = save.formation || {};
      return RPG.placeHeroes(team, team.map(ms => f[memberKey(ms)]));
    }
    function storeFormation(team, pos) {
      save.formation = {};
      team.forEach((ms, i) => { if (pos[i]) save.formation[memberKey(ms)] = { r: pos[i].r, c: pos[i].c }; });
      save.formationAt = locId;
    }
    // Чи вже є розстановка для всіх, хто йде в бій (нового напарника треба поставити)
    const inZone = p => p && p.r >= 0 && p.r < FIELD.zone && p.c >= 0 && p.c < FIELD.zone;
    const placedHere = () => {
      const f = save.formation || {};
      const team = fighters();
      return team.length > 0 && team.every(ms => inZone(f[memberKey(ms)]));
    };

    // Як клітинка (r, c) стоїть на екрані: box.bfView = { rows, cols, map(p) → { row, col }, scale }
    function setView(box, rows, cols, map, scale = 1) {
      box.bfView = { rows, cols, map, scale };
      box.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      box.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
      box.style.setProperty("--bf-ar", cols / rows);
    }
    function addCell(box, p, cls) {
      const v = box.bfView.map(p);
      const cell = el("div", "bf-cell " + cls);
      cell.dataset.r = p.r;
      cell.dataset.c = p.c;
      cell.style.gridRow = v.row + 1;
      cell.style.gridColumn = v.col + 1;
      box.append(cell);
      return cell;
    }
    // ---------- Краї поля: дерева / скелі / стіни / вода (data/enemies.js → LOCATIONS / DUNGEONS → edge) ----------
    // Поле обгортається рамкою .bf-frame з чотирма смугами .bf-edge (суто для вигляду, на бій не впливають).
    // Логічні краї [верх, право, низ, ліво] поточної локації (у данжі — краї данжу, якщо задані)
    function fieldEdges() {
      const src = (mode === "dungeon" && dungeonInfo?.edge) || locData?.edge || "trees";
      const arr = Array.isArray(src) ? src : [src, src, src, src];
      return [0, 1, 2, 3].map(i => (EDGE_TYPES[arr[i]] ? arr[i] : "trees"));
    }
    // Які перешкоди бувають на полі: з LOCATIONS / DUNGEONS → cover = { block: [...], low: [...] },
    // а без нього — за краями: дерева → дерева й кущі, скелі → скелі й каміння, стіни → стіни й уламки-каміння
    function fieldCover() {
      const own = (mode === "dungeon" && dungeonInfo?.cover) || locData?.cover;
      if (own) return own;
      const kinds = [...new Set(fieldEdges())].filter(k => EDGE_COVER[k]);
      if (!kinds.length) kinds.push("trees");                  // лише вода — тоді дерева й кущі
      return { block: kinds.map(k => EDGE_COVER[k][0]), low: [...new Set(kinds.map(k => EDGE_COVER[k][1]))] };
    }
    const OBST_TITLES = {
      tree: "Дерево — не пройти й не видно ціль", rock: "Скеля — не пройти й не видно ціль", wall: "Стіна — не пройти й не видно ціль",
      bush: "Кущ — не стати, але ціль видно (лук, заклинання)", stone: "Каміння — не стати, але ціль видно (лук, заклинання)"
    };
    let fieldFrame = null;
    function frameField(mob) {
      if (!fieldBox) return;
      if (!fieldFrame) {
        fieldFrame = el("div", "bf-frame");
        fieldBox.parentNode.insertBefore(fieldFrame, fieldBox);
        fieldFrame.append(fieldBox);
        for (const side of ["top", "right", "bottom", "left"]) fieldFrame.append(el("div", "bf-edge bf-edge-" + side));
      }
      const [t, r, b, l] = fieldEdges();
      // На телефоні поле повернуте (рядок ↔ стовпець): логічний лівий край стає верхнім,
      // нижній — правим, правий — нижнім, верхній — лівим
      const shown = mob ? [l, b, r, t] : [t, r, b, l];
      fieldFrame.className = "bf-frame" + (mob ? " is-mobile" : "") + (locData?.region === "dark" ? " is-dark" : "");
      ["top", "right", "bottom", "left"].forEach((side, i) => {
        const strip = fieldFrame.querySelector(".bf-edge-" + side);
        strip.className = `bf-edge bf-edge-${side} edge-${shown[i]}`;
        strip.title = EDGE_TYPES[shown[i]];
      });
    }

    // Велике поле: 450 клітинок, підсвічені зони кутів героїв і ворогів
    function fieldGrid(box, heroCorner = corner, obst = obstacles) {
      box.innerHTML = "";
      const mob = mobileField.matches;
      if (box === fieldBox) frameField(mob);
      box.className = "bfield bf-big" + (mob ? " is-mobile" : "");
      setView(box, mob ? FIELD.cols : FIELD.rows, mob ? FIELD.rows : FIELD.cols,
        mob ? p => ({ row: p.c, col: p.r }) : p => ({ row: p.r, col: p.c }), 1.3);
      const zone = {};
      for (const z of RPG.zoneCells(heroCorner)) zone[z.r + ":" + z.c] = "bf-hero" + (z.front ? " bf-front" : "");
      const ob = {};
      for (const o of obst || []) ob[o.r + ":" + o.c] = o;
      for (let r = 0; r < FIELD.rows; r++) {
        for (let c = 0; c < FIELD.cols; c++) {
          const o = ob[r + ":" + c];
          const cell = addCell(box, { r, c }, o ? `bf-gap bf-obst ob-${o.kind}${o.block ? " is-block" : " is-low"}` : (zone[r + ":" + c] || "bf-gap"));
          if (o) cell.title = OBST_TITLES[o.kind] || "";
        }
      }
    }
    // Вікно розстановки: лише своя зона 3 × 3 і смуга «у бік поля» з боку переднього ряду
    // (на ПК — праворуч, на телефоні — знизу)
    function zoneGrid(box, extra = "") {
      box.innerHTML = "";
      const mob = mobileField.matches;
      box.className = "bfield bf-zone" + (mob ? " is-mobile" : "") + (extra ? " " + extra : "");
      const n = FIELD.zone;
      setView(box, mob ? n + 1 : n, mob ? n : n + 1,
        mob ? p => ({ row: p.c, col: p.r }) : p => ({ row: p.r, col: p.c }));
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) addCell(box, { r, c }, "bf-hero" + (c === n - 1 ? " bf-front" : ""));
      const toward = el("div", "bf-toward", mob ? "↓ у бік поля ↓" : "у бік поля →");
      if (mob) { toward.style.gridRow = n + 1; toward.style.gridColumn = "1 / -1"; }
      else { toward.style.gridColumn = n + 1; toward.style.gridRow = "1 / -1"; }
      box.append(toward);
    }
    // Іконка учасника: портрет + маленькі смужки HP / MP
    function fieldToken(kind, name, sprite, extra = "") {
      const t = el("div", "bf-unit is-" + kind + (extra ? " " + extra : ""));
      t.dataset.name = name;
      const face = el("span", "bf-face");
      Object.assign(face.style, sprite);
      const bars = el("span", "bf-bars");
      for (const cls of ["bf-bar-hp", "bf-bar-mp"]) {
        const b = el("span", "bf-bar " + cls);
        b.append(el("i"));
        bars.append(b);
      }
      t.append(face, bars);
      return t;
    }
    // Іконка на клітинці p (логічні r, c) поля box; scale > 1 — трохи більша за клітинку (по центру)
    function tokenPos(t, p, box = fieldBox) {
      const v = box?.bfView;
      if (!p || !v) return;
      const q = v.map(p), k = v.scale || 1;
      t.style.width = (k * 100 / v.cols) + "%";
      t.style.height = (k * 100 / v.rows) + "%";
      t.style.left = ((q.col - (k - 1) / 2) * 100 / v.cols) + "%";
      t.style.top = ((q.row - (k - 1) / 2) * 100 / v.rows) + "%";
    }
    function tokenBars(t, hp, maxHp, mp, maxMp) {
      const [h, m] = t.querySelectorAll(".bf-bar i");
      h.style.width = Math.max(0, Math.min(100, hp / Math.max(1, maxHp) * 100)) + "%";
      m.parentElement.hidden = !maxMp;
      if (maxMp) m.style.width = Math.max(0, Math.min(100, mp / maxMp * 100)) + "%";
      t.classList.toggle("is-dead", hp <= 0);
      const label = `${t.dataset.name} — HP ${Math.max(0, Math.round(hp))} / ${Math.round(maxHp)}` + (maxMp ? `, MP ${Math.round(mp)} / ${Math.round(maxMp)}` : "");
      t.title = label;
      t.setAttribute("aria-label", label);
    }
    const heroTokenFor = ms => fieldToken("hero", ms.character.name, RPG.heroSpriteStyle(ms.character.classId));
    const foeTokenFor = (f, e) => fieldToken("enemy", e.name + weaponText(e), RPG.enemySpriteStyle(f.id),
      (f.champion ? "is-champion" : "") + (e.boss ? " is-boss" : ""));

    // Поле над журналом: як стоятимуть герої й вороги в наступному бою.
    // heroPos / foePos / team / maxStats — для показу бою (інакше — поточна розстановка)
    function renderField(opts = {}) {
      if (!fieldBox) return;
      const team = opts.team || fighters();
      const hc = Number.isInteger(opts.corner) ? opts.corner : corner;
      const heroPos = opts.heroPos || formationOf(team).map(p => RPG.fieldPos(p, hc));
      if (foePositions.length !== foes.length) foePositions = RPG.placeFoesFree(foes, corner, obstacles);
      const foePos = opts.foePos || foePositions;
      fieldGrid(fieldBox, hc, opts.obstacles || obstacles);
      fieldTokens.hero = team.map((ms, k) => {
        const t = heroTokenFor(ms);
        const st = opts.maxStats?.[k] || RPG.calcStats(ms);
        tokenPos(t, heroPos[k]);
        tokenBars(t, ms.character.hp, st.hp, ms.character.mp, st.mp);
        fieldBox.append(t);
        return t;
      });
      fieldTokens.enemy = foes.map((f, i) => {
        const e = curEnemy(i);
        const t = foeTokenFor(f, e);
        tokenPos(t, foePos[i]);
        tokenBars(t, e.stats.hp, e.stats.hp, e.stats.mp || 0, e.stats.mp || 0);
        fieldBox.append(t);
        return t;
      });
    }
    // Подія бою на полі: позиції, смужки, хто діє, по кому влучили
    function fieldEvent(ev, prev, team, maxStats) {
      (ev.heroes || []).forEach((h, k) => {
        const t = fieldTokens.hero[k];
        if (!t) return;
        tokenPos(t, h.pos);
        tokenBars(t, h.hp, maxStats[k].hp, h.mp, maxStats[k].mp);
        const was = prev?.heroes?.[k];
        if (was && was.hp !== h.hp) RPG.fx.hit(t, h.hp - was.hp, ev.crit ? "crit" : "");
      });
      (ev.enemies || []).forEach((st, i) => {
        const t = fieldTokens.enemy[i];
        if (!t) return;
        const e = curEnemy(i);
        tokenPos(t, st.pos);
        tokenBars(t, st.hp, e.stats.hp, st.mp, e.stats.mp || 0);
        const was = prev?.enemies?.[i];
        if (was && was.hp !== st.hp) RPG.fx.hit(t, st.hp - was.hp, ev.crit ? "crit" : "");
      });
      fieldBox.querySelectorAll(".is-acting, .is-target").forEach(n => n.classList.remove("is-acting", "is-target"));
      const pick = r => (r ? fieldTokens[r.side]?.[r.i] : null);
      const a = pick(ev.actor), tg = pick(ev.target);
      if (a) { a.classList.add("is-acting"); RPG.fx.act(a); }
      if (tg && tg !== a) tg.classList.add("is-target");
    }

    // ---------- Вікно розстановки героїв ----------
    // Перетягнути портрет на клітинку своєї зони або натиснути героя, потім клітинку.
    // onDone() — що робити після «Готово» (наприклад, почати бій)
    function openFormation(onDone = null) {
      if (document.querySelector("dialog[open]:not(#formation-dialog)")) { queueDialog(() => { openFormation(onDone); return $("formation-dialog"); }); return; }
      const team = fighters();
      if (!team.length) { showMsg(msg, "Усі герої групи полягли — розставляти нікого.", true); return; }
      const f = save.formation || {};
      // Хто вже має збережене місце — стоїть на ньому; інші чекають унизу
      const auto = RPG.placeHeroes(team, team.map(ms => f[memberKey(ms)]));
      let pos = team.map((ms, i) => (f[memberKey(ms)] ? auto[i] : null));
      let selected = null;

      let dlg = $("formation-dialog");
      if (!dlg) {
        dlg = el("dialog", "formation-dialog");
        dlg.id = "formation-dialog";
        document.body.append(dlg);
      }
      dlg.innerHTML = "";
      const close = noticeClose("Закрити", () => dlg.close());
      const field = el("div", "bfield bf-zone");
      const tray = el("div", "bf-tray");
      tray.setAttribute("aria-label", "Герої, яких ще не розставлено");
      const hint = el("p", "bf-hint");
      const btnAuto = button("Розставити автоматично", "wf wf-link", () => {
        pos = RPG.placeHeroes(team, pos.map(p => p || undefined));
        selected = null;
        draw();
      });
      const btnOk = button(onDone ? "До бою!" : "Готово", "wf wf-button", async () => {
        if (pos.some(p => !p)) return;
        storeFormation(team, pos);
        await RPG.saveGame(save);
        dlg.close();
        renderField();
        if (onDone) onDone();
        else showMsg(msg, "Розстановку збережено.");
      });
      const row = el("div", "row dialog-actions");
      row.append(btnOk, btnAuto, button("Скасувати", "wf wf-link", () => dlg.close()));
      dlg.append(close, el("h3", null, "Розстановка героїв"),
        noteP("Ваша зона — 3×3 клітинки. У кожному бою група з'являється в іншому куті поля, " +
          "а вороги — будь-де на полі (купою або врозкид), але не ближче ніж на хід руху. Розстановка задається відносно " +
          "кута: передній ряд (виділений) дивиться в бік поля. " +
          "Перетягніть героя на клітинку або натисніть на героя, а потім на клітинку. " +
          "Дальність: ближній бій — 1 клітинка, посох (заклинання) — 2, лук — 3. Схема збережеться для наступних боїв і локацій."),
        field, tray, hint, row);

      function placeAt(i, p) {
        const j = pos.findIndex((q, k) => k !== i && q && q.r === p.r && q.c === p.c);
        if (j >= 0) pos[j] = pos[i] ? { ...pos[i] } : null;   // обмін місцями (або той іде вниз)
        pos[i] = { r: p.r, c: p.c };
      }
      function tokenClick(i) {
        if (selected !== null && selected !== i && pos[i]) { placeAt(selected, pos[i]); selected = null; }
        else selected = selected === i ? null : i;
        draw();
      }
      function cellClick(cell) {
        const p = { r: +cell.dataset.r, c: +cell.dataset.c };
        if (selected === null) return;
        placeAt(selected, p);
        selected = null;
        draw();
      }
      // Перетягування мишею й пальцем (pointer events); короткий дотик без руху — це клік
      function bindDrag(node, i) {
        node.tabIndex = 0;
        node.setAttribute("role", "button");
        node.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tokenClick(i); } });
        node.addEventListener("pointerdown", ev => {
          if (ev.button > 0) return;
          ev.preventDefault();
          const sx = ev.clientX, sy = ev.clientY;
          let ghost = null, over = null;
          try { node.setPointerCapture(ev.pointerId); } catch (e) { /* без захоплення теж працює */ }
          const cellAt = (x, y) => document.elementFromPoint(x, y)?.closest(".bf-cell.bf-hero");
          const move = e => {
            if (!ghost && Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
            if (!ghost) {
              ghost = node.cloneNode(true);
              ghost.className = "bf-unit is-hero bf-ghost";
              ghost.style.width = node.offsetWidth + "px";
              ghost.style.height = node.offsetHeight + "px";
              document.body.append(ghost);
              node.classList.add("is-dragging");
            }
            ghost.style.left = e.clientX + "px";
            ghost.style.top = e.clientY + "px";
            const c = cellAt(e.clientX, e.clientY);
            if (c !== over) { over?.classList.remove("is-over"); over = c; over?.classList.add("is-over"); }
          };
          const end = (e, cancel) => {
            node.removeEventListener("pointermove", move);
            node.removeEventListener("pointerup", up);
            node.removeEventListener("pointercancel", cancelUp);
            over?.classList.remove("is-over");
            node.classList.remove("is-dragging");
            if (!ghost) { if (!cancel) tokenClick(i); return; }
            ghost.remove();
            if (cancel) return;
            const cell = cellAt(e.clientX, e.clientY);
            if (cell) placeAt(i, { r: +cell.dataset.r, c: +cell.dataset.c });
            else if (document.elementFromPoint(e.clientX, e.clientY)?.closest(".bf-tray")) pos[i] = null;
            selected = null;
            draw();
          };
          const up = e => end(e, false);
          const cancelUp = e => end(e, true);
          node.addEventListener("pointermove", move);
          node.addEventListener("pointerup", up);
          node.addEventListener("pointercancel", cancelUp);
        });
      }

      function draw() {
        zoneGrid(field, "is-setup" + (selected !== null ? " has-pick" : ""));
        field.querySelectorAll(".bf-cell.bf-hero").forEach(cell => {
          cell.addEventListener("click", () => cellClick(cell));
        });
        tray.innerHTML = "";
        team.forEach((ms, i) => {
          const st = RPG.calcStats(ms);
          const t = heroTokenFor(ms);
          tokenBars(t, ms.character.hp, st.hp, ms.character.mp, st.mp);
          const w = RPG.ITEMS[RPG.refId(ms.equipment.mainHand)];
          const reach = RPG.actionRange(w?.weaponType || null, w?.weaponType === "staff");
          t.append(el("span", "bf-name", `${ms.character.name} · ${reach}`));
          t.title += ` · дальність ${reach}`;
          if (i === selected) t.classList.add("is-picked");
          bindDrag(t, i);
          if (pos[i]) { tokenPos(t, pos[i], field); field.append(t); }
          else { t.classList.add("in-tray"); tray.append(t); }
        });
        tray.classList.toggle("is-empty", !tray.children.length);
        if (!tray.children.length) tray.append(el("span", "bf-tray-empty", "Усі герої на полі. Перетягніть сюди, щоб прибрати з клітинки."));
        const left = pos.filter(p => !p).length;
        btnOk.disabled = left > 0;
        hint.textContent = left
          ? `Ще не розставлено: ${left}. ${selected !== null ? "Тепер натисніть клітинку своєї зони." : ""}`
          : selected !== null ? "Натисніть клітинку своєї зони або іншого героя, щоб помінятися місцями." : "Усі на місцях — можна в бій.";
      }
      draw();
      if (!dlg.open) dlg.showModal();
    }

    function renderQueue() {
      const box = $("queue");
      box.innerHTML = "";
      if (queueMember >= RPG.partySize(save)) queueMember = 0;
      const qms = RPG.memberSave(save, queueMember);
      memberTabs($("queue-member"), save, queueMember, pickMember);
      const weaponRef = qms.equipment.mainHand;
      const weaponItem = RPG.ITEMS[RPG.refId(weaponRef)];
      const weaponSt = weaponItem ? RPG.itemStats(weaponRef) : {};
      const magicWeapon = weaponItem && (weaponSt.magic || 0) > (weaponSt.attack || 0);
      // Варіанти для кожної клітинки: порожньо, звичайний удар, вивчені навички цієї зброї
      const wtype = weaponItem?.weaponType || null;
      const options = [["", "—"], ["attack", "Удар"]];
      if (weaponItem?.weaponType === "staff") options.push(["spell", "Іскра (4 MP)"]);
      if (wtype) {
        for (const id of RPG.skillsForWeapon(wtype, qms.character.classId)) {
          if (RPG.skillLevel(qms, id) > 0) options.push([id, `${RPG.SKILLS[id].name} (${RPG.SKILLS[id].mp} MP)`]);
        }
      }
      for (let i = 0; i < RPG.QUEUE_SIZE; i++) {
        const action = qms.battleQueue[i] || "";
        const sel = el("select", "wf wf-slot queue-select" + (action ? "" : " slot-empty"));
        sel.title = `Дія ${i + 1}`;
        sel.setAttribute("aria-label", `Дія ${i + 1} у черзі`);
        const opts = options.slice();
        if (action && !opts.some(o => o[0] === action)) {
          const sk = RPG.SKILLS[action];
          opts.push([action, sk ? `${sk.name} (недоступна — буде удар)` : (action === "spell" ? "Іскра (лише з посохом)" : action)]);
        }
        for (const [val, text] of opts) {
          const o = el("option", null, `${i + 1}. ${text}`);
          o.value = val;
          if (val === action) o.selected = true;
          sel.append(o);
        }
        sel.addEventListener("change", async () => {
          if (fighting) return;
          qms.battleQueue[i] = sel.value;
          for (let k = 0; k < RPG.QUEUE_SIZE; k++) qms.battleQueue[k] ??= "";
          qms.battleQueue.length = RPG.QUEUE_SIZE;
          if (!qms.battleQueue.some(Boolean)) qms.battleQueue[0] = "attack";
          await RPG.saveGame(save);
          renderQueue();
        });
        // Невеличке зображення навички зліва в клітинці (assets/images/skills/<id>.webp), якщо воно є;
        // для удару, «Іскри» й порожньої клітинки — без зображення
        const cell = el("div", "queue-cell");
        if (RPG.SKILLS[action]) {
          const icon = el("img", "queue-icon");
          icon.alt = "";
          icon.onerror = () => { icon.remove(); cell.classList.remove("has-icon"); };
          icon.src = RPG.asset(`assets/images/skills/${action}.webp`);
          cell.classList.add("has-icon");
          cell.append(icon);
        }
        cell.append(sel);
        box.append(cell);
      }
      const who = RPG.partySize(save) > 1 ? `${qms.character.name}: ` : "";
      $("weapon-info").textContent = who + (weaponItem
        ? `Зброя: ${RPG.itemFullName(weaponRef)} · дальність ${RPG.actionRange(weaponItem.weaponType, false)}${weaponItem.weaponType === "staff" ? " (заклинання — 2)" : ""}`
        : "Зброя: немає (бій кулаками)");
    }

    function renderCombatPortal() {
      if (!combat || !locData.portal) return;
      if (!portalOpen(locData.portal)) { portalBox?.remove(); portalBox = null; return; }
      const card = portalCard(locData.portal);
      if (portalBox) portalBox.replaceWith(card); else $("mode-tabs").before(card);
      portalBox = card;
    }

    function renderAll() {
      renderCombatPortal();
      drawHero();
      renderQuickSlots();
      if (combat) renderQueue();
      if (combat && !fighting) renderField();
      else renderPlace();
    }

    // Короткий стан бою (logBox): заголовок і рядки. Повний журнал — у вікні (journal.js).
    // Під час показу бою (liveLines) рядки ще й ідуть у відкрите вікно журналу.
    let liveLines = null;     // рядки бою, що зараз показується
    let liveEntry = null;     // його запис у save.battleLog (у вікні не показуємо, поки бій іде)
    let journalCtl = null;    // відкрите вікно журналу
    function statusAppend(line) {
      logBox.append(RPG.logLi(line));   // смужка на 2 рядки: видно початок (головне), решта — у журналі
    }
    function setArena(title, lines, state = "") {
      logBox.innerHTML = "";
      const all = [["title", title, state], ...(lines || []).map(l => ["info", l])];
      all.forEach(statusAppend);
      if (liveLines) all.forEach(l => { liveLines.push(l); journalCtl?.append(l); });
    }

    const foesText = () => foes.map((f, i) => { const e = curEnemy(i); return `${e.name} (рівень ${e.level})`; }).join(", ");

    function showReady() {
      if (mode === "dungeon") {
        const a = RPG.activeDungeon(save);
        logBox.innerHTML = "";
        if (!a) {
          setArena(`Данж «${dungeonInfo.name}»`, [`Ворота зачинені. Попереду чекає бос: ${foesText()}.`,
            "Відчиніть ворота ключем (панель вище)."], "ready");
          return;
        }
        const lines = [`Бій ${a.stage} з ${a.stages}: ${foesText()}.`,
          "Зілля й відновлення в данжі не діють — лікують лише навички."];
        if (a.stage < a.stages) lines.push("За цей бій нагороди немає — досвід і здобич дає лише бос.");
        else lines.push("Це БОС! Кожен третій свій хід він застосовує особливу навичку. Перемога — нагорода за весь данж.");
        if (!fighters().length) lines.push("Усі герої групи полягли.");
        setArena(a.stage < a.stages ? `Данж: бій ${a.stage} з ${a.stages}` : "Данж: бос!", lines, "ready");
        return;
      }
      const lvl = save.character.level;
      const strong = foes.some((f, i) => curEnemy(i).level >= lvl + 2);
      const lines = [`Попереду: ${foesText()}.${strong ? " Обережно: серед них є значно сильніші!" : ""}`];
      if (foes.length > 1) lines.push(`Ворогів: ${foes.length}, у вашій групі живих героїв: ${fighters().length}.`);
      if (anyChampion()) lines.push("Серед них рідкісний ЧЕМПІОН: утричі сильніший! За перемогу — трофей і нагорода ×5 у Гільдії авантюристів.");
      if (foes.some((f, i) => curEnemy(i).boss)) lines.push("Це БОС! Кожен третій свій хід він застосовує особливу навичку.");
      if (!fighters().length) lines.push("Усі герої групи полягли — помоліться за них у Храмі.");
      lines.push("Натисніть «Почати бій» або пошукайте іншого суперника.");
      logBox.innerHTML = "";
      setArena(anyChampion() ? "Чемпіон!" : "Готові до бою", lines, anyChampion() ? "champion" : "ready");
    }

    // Рядок журналу: позначка «хто діє» + текст, числа виділені (RPG.logLi).
    // Під час бою в короткому стані — заголовок бою й лише останній рядок.
    function addLogLine(ev) {
      const line = RPG.journalPack(ev);
      if (!liveLines) { statusAppend(line); return; }
      liveLines.push(line);
      journalCtl?.append(line);
      logBox.querySelector(".log-live")?.remove();
      const li = RPG.logLi(line);
      li.classList.add("log-live");
      logBox.append(li);
    }

    // Ефекти: хто діє — спалах; у кого змінилось HP — число над портретом
    let lastSnap = null;
    const heroFig = () => $("hero-img").closest("figure");
    const enemyFig = () => $("enemy-img").closest("figure");
    function rowOf(id) { const b = $(id); return b ? b.closest(".party-row") : null; }
    function battleFx(ev, team) {
      if (ev.who === "hero") RPG.fx.act(heroFig());
      else if (ev.who === "enemy") RPG.fx.act(enemyFig());
      if (lastSnap) {
        team.forEach((ms, k) => {
          const now = ev.heroes?.[k], was = lastSnap.heroes?.[k];
          if (!now || !was) return;
          const i = ms.memberIndex || 0;
          const target = i === 0 ? heroFig() : rowOf("party-hp-" + i);
          if (now.hp !== was.hp) RPG.fx.hit(target, now.hp - was.hp, ev.crit ? "crit" : "");
        });
        (ev.enemies || []).forEach((now, i) => {
          const was = lastSnap.enemies?.[i];
          if (!was || now.hp === was.hp) return;
          RPG.fx.hit(i === 0 ? enemyFig() : rowOf("foe-hp-" + i), now.hp - was.hp, ev.crit ? "crit" : "");
        });
      }
      lastSnap = ev;
    }

    // Смужки під час показу бою. team — герої, що б'ються; maxStats — їхні максимуми
    function applyEventToBars(ev, team, maxStats) {
      team.forEach((ms, k) => {
        const h = ev.heroes?.[k];
        if (!h) return;
        const i = ms.memberIndex || 0;
        if (i === 0) {
          setBar($("hero-hp"), h.hp, maxStats[k].hp);
          setBar($("hero-mp"), h.mp, maxStats[k].mp);
        } else {
          setBar($("party-hp-" + i), h.hp, maxStats[k].hp);
          setBar($("party-mp-" + i), h.mp, maxStats[k].mp);
        }
      });
      foes.forEach((f, i) => {
        const e = curEnemy(i), st = ev.enemies?.[i];
        if (!st) return;
        if (i === 0) {
          setBar($("enemy-hp"), st.hp, e.stats.hp);
          if (e.stats.mp) setBar($("enemy-mp"), st.mp, e.stats.mp);
        }
        setBar($("foe-hp-" + i), st.hp, e.stats.hp);
        if (e.stats.mp) setBar($("foe-mp-" + i), st.mp, e.stats.mp);
      });
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function setFighting(on) {
      fighting = on;
      startBtn.disabled = rerollBtn.disabled = saveBtn.disabled = on;
      document.body.classList.toggle("is-fighting", on);
      drawHero();          // на час бою — портрет головного героя, після — знову обраного
      renderQuickSlots();
      if (!on) renderField();   // поле — під наступний бій
      const fb = $("formation-btn");
      if (fb) fb.disabled = on;
    }

    // Автозілля (налаштування на пристрої — core.js → getAutoPotion; пиття — character.js → autoPotion):
    // перед боєм і після бою. «Немає зілля» пишемо один раз, поки зілля цього виду знову не з'явиться.
    const potionWarned = { hp: false, mp: false };
    function runAutoPotion() {
      const cfg = RPG.getAutoPotion();
      const r = RPG.autoPotion(save, cfg);
      const lines = r.lines.slice();
      for (const stat of ["hp", "mp"]) {
        const set = RPG.AUTO_POTIONS[stat];
        if (["small", "medium", "large"].some(k => RPG.countItem(save, set[k]) > 0)) potionWarned[stat] = false;
        if (cfg[stat].on && r.missing[stat] && !potionWarned[stat]) {
          potionWarned[stat] = true;
          lines.push(`Автозілля: в інвентарі закінчилось ${stat === "hp" ? "зілля здоров'я" : "зілля мани"}.`);
        }
      }
      return lines;
    }

    async function startBattle() {
      if (fighting) return;
      const team = fighters();
      if (!team.length) { showMsg(msg, "Усі герої групи полягли — помоліться за них у Храмі.", true); return; }
      if (mode === "dungeon" && !dungeonOn()) { showMsg(msg, "Спершу відчиніть ворота данжу ключем.", true); return; }
      const dun = dungeonOn() ? RPG.activeDungeon(save) : null;   // бій у данжі: { stage, stages, ... }
      const rewarded = !dun || dun.stage === dun.stages;          // нагорода — лише за боса данжу
      // Автозілля перед боєм (у данжі не діє — character.js → autoPotion)
      const prePotion = runAutoPotion().map(l => l.replace(/^Автозілля:/, "Автозілля перед боєм:"));
      setFighting(true);
      renderEnemy();
      logBox.innerHTML = "";

      const maxStats = team.map(ms => RPG.calcStats(ms));
      RPG.equipFoes(foes, team);   // GS групи міг змінитися (перевдягнулись) — речі ворогів під нього
      renderEnemy();
      const result = RPG.simulatePartyBattle(team, foes, { heroPos: formationOf(team), corner, obstacles, foePos: foePositions });
      const group = team.length > 1;

      // Результат застосовуємо і зберігаємо ОДРАЗУ — щоб не можна було
      // уникнути поразки, просто закривши сторінку під час показу бою
      const summary = [];
      const levelLines = [];
      const got = {}, lost = {}, filtered = {};   // речі цього бою (для підсумку поля бою); filtered — викинув фільтр
      const freeBefore = RPG.invFree(save);
      let battleGold = 0, battleExp = 0;
      result.heroes.forEach((h, k) => { team[k].character.hp = h.hp; team[k].character.mp = h.mp; });
      let deaths = null;
      if (result.win && !rewarded) {
        result.heroes.forEach((h, k) => {
          if (h.dead) { RPG.markFallen(team[k]); summary.push(`${team[k].character.name} полягає (відродіть у Храмі)`); }
        });
      } else if (result.win) {
        // Полеглі в переможному бою лишаються мертвими до молитви в Храмі
        result.heroes.forEach((h, k) => {
          if (h.dead) { RPG.markFallen(team[k]); summary.push(`${team[k].character.name} полягає (відродіть у Храмі)`); }
        });
        const totalExp = result.enemies.reduce((sum, e) => sum + (e.exp || 0), 0);
        // Перемоги над босами (перша — з датою): відкривають світи й межу рівня (character.js → levelCap).
        // Записуємо ДО досвіду — досвід за Белі вже йде під нову межу 50.
        const capWasOpen = RPG.levelCapOpen(save);
        for (const e of result.enemies) if (RPG.ENEMIES[e.id]?.boss) (save.bossKills ??= {})[e.id] ??= Date.now();
        if (!capWasOpen && RPG.levelCapOpen(save)) {
          summary.push(`⭐ Белі повалено! Межа рівня для героїв з професією відтепер — ${RPG.LEVEL_CAP_PROFESSION} (Селянин лишається до ${RPG.LEVEL_CAP_BASE}).`);
        }
        let gold = 0;
        const runeEco = RPG.teamRuneEco ? RPG.teamRuneEco(team) : { gold: 0, lootRarity: 0 };   // руни Феху й Даждьбог усієї групи
        for (const e of result.enemies) {
          const lootOrb = RPG.godsOrb(save);              // Сфера Богів: +10 пунктів до шансу кожного предмета (20% → 30%)
          const loot = RPG.rollLoot(e.id, lootOrb ? lootOrb.lootPct / 100 : 0);
          if (runeEco.gold && loot.gold) loot.gold = Math.round(loot.gold * (1 + runeEco.gold / 100));
          if (runeEco.lootRarity) loot.rarityUp = runeEco.lootRarity;
          RPG.applyReward(save, 0, loot);                // золото й речі — у спільний інвентар
          gold += loot.gold || 0;
          for (const it of loot.items) {
            if (it.refs) it.refs.forEach(ref => { const n = RPG.itemFullName(ref); summary.push(n); got[n] = (got[n] || 0) + 1; });
            else if (it.got) { const n = RPG.ITEMS[it.id].name; summary.push(`${n} ×${it.got}`); got[n] = (got[n] || 0) + it.got; }
            if (it.lost) { const n = RPG.ITEMS[it.id].name; lost[n] = (lost[n] || 0) + it.lost; }
            if (it.filtered) it.filtered.forEach(ref => { const n = RPG.itemFullName(ref); filtered[n] = (filtered[n] || 0) + 1; });
          }
          save.character.kills = (save.character.kills || 0) + 1;
          summary.push(...RPG.questOnKill(save, e.id).map(s => "Завдання: " + s));
          if (e.champion) {
            // Трофей чемпіона: одна річ (легендарна 5% → епічна 25% → магічна 50%)
            const drop = RPG.rollChampionDrop(e.id);
            if (drop && RPG.isFilteredOut(save, drop.r)) {
              const n = RPG.itemFullName(RPG.makeItem(drop.id, drop.r));
              filtered[n] = (filtered[n] || 0) + 1;
              summary.push(`Трофей чемпіона: ${n} — викинуто фільтром`);
            } else if (drop && !RPG.invFree(save)) {
              const n = RPG.itemFullName(RPG.makeItem(drop.id, drop.r));
              lost[n] = (lost[n] || 0) + 1;
              summary.push(`Трофей чемпіона: ${n} — пропав, інвентар повний!`);
            } else if (drop) {
              const ref = RPG.makeItem(drop.id, drop.r);
              save.inventory.push(ref);
              summary.push(`Трофей чемпіона: ${RPG.itemFullName(ref)}`);
              got[RPG.itemFullName(ref)] = (got[RPG.itemFullName(ref)] || 0) + 1;
            } else {
              summary.push("Трофей чемпіона: цього разу нічого");
            }
            const b = RPG.addChampionBounty(save, e.id);
            summary.push(`Гільдія авантюристів заплатить ${b.exp} EXP${group ? " кожному герою" : ""} (+ бонуси) і ${b.gold} золота (нагорода ×5)`);
          }
          // Книга «Руни Небесної Кузні»: після ПЕРШОЇ перемоги над Володарем Темного лісу — у бібліотеку дому
          if (e.id === "forest_lord" && RPG.RUNE_BOOK && RPG.addToLibrary(save, "runes")) {
            summary.push(`📜 Серед трофеїв Володаря — книга Сварога «${RPG.RUNE_BOOK.title}»! Вона чекатиме в бібліотеці вашого дому (Спальний район Дубової Застави).`);
          }
          // Мішечок на пояс: 1% з кожного переможеного боса, окремо від звичайної здобичі
          const pouch = RPG.rollPouchDrop?.(e.id);
          if (pouch) {
            const n = RPG.ITEMS[pouch].name;
            if (RPG.invFree(save)) {
              save.inventory.push({ id: pouch, qty: 1 });
              summary.push(`Рідкісний трофей боса: ${n}!`);
              got[n] = (got[n] || 0) + 1;
            } else {
              summary.push(`Рідкісний трофей боса: ${n} — пропав, інвентар повний!`);
              lost[n] = (lost[n] || 0) + 1;
            }
          }
        }
        // Досвід (рішення 2б): +PARTY_EXP_BONUS% (25%) за кожного героя групи понад першого (party.js),
        // і вся сума ділиться порівну між тими, хто вижив
        const survivors = team.filter((ms, k) => !result.heroes[k].dead);
        const spring = RPG.springExpMult(save);          // Джерело Велеса: ×3 до досвіду групи
        const orb = RPG.godsOrb(save);                     // Сфера Богів (предмет адміністратора): +800% досвіду
        const orbMult = orb ? 1 + orb.expPct / 100 : 1;
        const pool = Math.round(totalExp * (1 + RPG.PARTY_EXP_BONUS / 100 * (team.length - 1)) * spring * orbMult);
        const expEach = Math.floor(pool / Math.max(1, survivors.length));
        const runeExpLines = [];
        for (const ms of survivors) {
          const rp = RPG.runeTotals ? (RPG.runeTotals(ms).eco.exp || 0) : 0;   // руна Вуньо — кожному свої
          const extra = Math.round(expEach * rp / 100);
          if (extra) runeExpLines.push(`${group ? ms.character.name + ": " : ""}руни +${extra} EXP (+${rp}%)`);
          const ups = RPG.addExp(ms, expEach + extra);
          if (ups.length) levelLines.push(`${ms.character.name}: новий рівень ${ups[ups.length - 1]}!`);
        }
        const springTxt = (spring > 1 ? `, Джерело Велеса +${RPG.VELES.expBonusPct}%` : "") + (orb ? `, Сфера Богів +${orb.expPct}%` : "");
        summary.unshift(group
          ? `+${expEach} EXP кожному, хто вижив (усього ${pool}, бонус групи +${(team.length - 1) * RPG.PARTY_EXP_BONUS}%${springTxt})`
          : `+${expEach} EXP${springTxt ? ` (${springTxt.slice(2)})` : ""}`);
        if (gold) summary.splice(1, 0, `+${gold} золота` + (runeEco.gold ? ` (руни +${runeEco.gold}%)` : ""));
        if (runeExpLines.length) summary.splice(1, 0, ...runeExpLines);
        if (Object.keys(filtered).length) summary.push(`Фільтр викинув: ${Object.entries(filtered).map(([k, n]) => n > 1 ? `${k} ×${n}` : k).join(", ")}`);
        if (Object.keys(lost).length) summary.push(`Не вмістилось в інвентар: ${Object.entries(lost).map(([k, n]) => `${k} ×${n}`).join(", ")}`);
        battleGold = gold;
        battleExp = group ? expEach : totalExp;
        // «Обстеження» локації з данжем: шанс знайти ключ з кожного переможеного ворога
        const keys = RPG.rollKeyDrops(save, locId, result.enemyIds);
        if (keys.got) { summary.push(`${keys.name} ×${keys.got} — у кишеню для ключів!`); got[keys.name] = (got[keys.name] || 0) + keys.got; }
        if (keys.full) summary.push(`Кишеня для ключів: ${keys.name} — уже ${RPG.KEY_MAX}/${RPG.KEY_MAX}, нові не випадають, поки не використаєте хоча б один.`);
      } else if (!result.draw) {
        // Уся група загинула: штраф кожному, відродження в Храмі
        deaths = team.map(ms => ({ ms, d: RPG.applyDeath(ms, result.enemyIds) }));
        RPG.pray(save);   // ті, хто поліг раніше, теж прокидаються в Храмі
      }
      // Данж: перемога — наступний бій (або кінець), поразка чи втеча ворогів — данж провалено
      // Досвід володіння зброєю (data/skills.js → masteryGainFor / addMasteryExp): кожному живому герою за виграний бій
      const masteryLines = [];
      if (result.win) {
        const fmtM = v => (Math.round(v * 10) / 10).toString().replace(".", ",");
        team.forEach((ms, k) => {
          if (result.heroes[k].dead) return;
          const g = RPG.masteryGainFor(save, ms, foes);
          if (!g.type || !g.gain) return;
          const r = RPG.addMasteryExp(ms, g.type, g.gain);
          const wt = RPG.WEAPON_TYPES[g.type];
          const prog = r.need ? ` (рівень ${r.level}, ${fmtM(r.exp)}/${r.need}${r.capped ? " — межа" : ""})` : ` (рівень ${r.level} — найвищий)`;
          masteryLines.push(`${group ? ms.character.name + ": " : ""}${wt.mastery.toLowerCase()} +${fmtM(g.gain)}` +
            (g.parts.length ? ` [${g.parts.join(", ")}]` : "") + prog +
            (r.levelUps.length ? ` — новий рівень володіння ${r.levelUps.at(-1)}!` : ""));
        });
      }
      let dunNext = null;
      let chron = null;   // запис у книзі «Предки…» (перша перемога над босом данжу)
      if (dun) {
        if (result.win) dunNext = RPG.advanceDungeon(save);
        else RPG.leaveDungeon(save);
        if (result.win && dunNext.done && RPG.chronicleRecord) chron = RPG.chronicleRecord(save, dun.id, team, result);
      }
      if (!result.draw || result.win) fieldLootAdd(save, { win: result.win, exp: battleExp, gold: battleGold, items: got, lost, filtered });
      // Автозілля після бою (не після загибелі всієї групи; у данжі між боями не діє)
      const postPotion = deaths ? [] : runAutoPotion();

      // Підсумок бою (заголовок + рядки) — рахуємо одразу, щоб записати в журнал разом із ходом бою
      let outcome;
      if (deaths) {
        const lines = deaths.map(({ ms, d }) =>
          `${group ? ms.character.name + ": " : ""}штраф досвіду −${d.expPct}% (${fmtNum(d.expLost)} EXP)` +
          (d.levelDown ? `, рівень знижено до ${d.newLevel}${d.pointsLost ? ` (−${d.pointsLost} очок атрибутів)` : ""}` : "") +
          (d.lostItems.length ? `, втрачено: ${d.lostItems.map(ref => RPG.itemFullName(ref)).join(", ")}` : ""));
        lines.push(`${group ? "Уся група відродилася" : "Ви відродилися"} в Храмі з ${Math.round(RPG.RESPAWN_HP_PCT * 100)}% здоров'я і без мани.`);
        outcome = { title: group ? "Група загинула" : "Загибель", lines, state: "lose" };
      } else if (dun && result.win && !dunNext.done) {
        const lines = [`Бій ${dun.stage} з ${dun.stages} виграно. Нагороди за нього немає — лише за боса.`];
        if (summary.length) lines.push(summary.join(" · "));
        lines.push("Зілля й відновлення тут не діють — HP переходить у наступний бій як є (лікують лише навички).");
        outcome = { title: `Данж: бій ${dun.stage} з ${dun.stages} — перемога`, lines, state: "win" };
      } else if (result.win) {
        const lines = [summary.join(" · ")];
        for (const l of levelLines) lines.push(l + " Здоров'я та мана відновлені, є нові вільні очки атрибутів (сторінка «Персонаж»).");
        lines.push(`Переможено ворогів: ${save.character.kills}`);
        if (chron?.first) lines.push(`📜 У книзі «${RPG.CHRONICLE.TITLE}» з'явився новий запис` +
          (chron.chapterDone ? ` — «${chron.chapter.title}» завершено!` : ` («${chron.chapter.title}»).`) +
          " Попросіть Розпорядника Захара в Мерії показати книгу.");
        outcome = { title: dun ? `Данж «${dun.name}» пройдено!` : "Перемога!", lines, state: "win" };
      } else if (dun) {
        outcome = { title: foes.length > 1 ? "Вороги втекли — данж провалено" : "Ворог утік — данж провалено",
          lines: ["Ворота зачинилися. Нагороди немає, ключ використано."], state: "draw" };
      } else {
        outcome = { title: foes.length > 1 ? "Вороги втекли" : "Ворог утік", lines: ["Нагороди немає."], state: "draw" };
      }
      if (masteryLines.length) outcome.lines.push("Володіння: " + masteryLines.join("; "));
      outcome.lines.push(...prePotion, ...postPotion);
      const fightTitle = `${team.map(ms => ms.character.name).join(", ")} проти: ${foesText()}`;
      // Журнал бою (journal.js): увесь хід бою + підсумок; найстаріший запис понад 100 затирається
      liveEntry = RPG.journalAdd(save, { kind: "battle", lines: [
        ["title", fightTitle, "fight"], ...result.events.map(RPG.journalPack),
        ["title", outcome.title, outcome.state], ...outcome.lines.map(l => ["info", l])] });
      await RPG.saveGame(save).catch(e => console.error(e));

      // Показ бою (у вікні журналу цей бій з'являється рядок за рядком, без спойлера підсумку)
      const stepByStep = RPG.getSettings().battleView !== "result";
      liveLines = [];
      journalCtl?.refresh({ skip: liveEntry, live: liveLines });
      setArena(fightTitle, [], "fight");
      lastSnap = null;
      // Поле бою: розстановка цього бою, смужки — зі стану на початку
      renderField({ team, heroPos: result.heroPos, foePos: result.foePos, corner: result.corner, obstacles: result.obstacles, maxStats });
      fieldEvent(result.events[0], null, team, maxStats);
      if (stepByStep) {
        let prevEv = null;
        for (const ev of result.events) {
          addLogLine(ev);
          applyEventToBars(ev, team, maxStats);
          battleFx(ev, team);
          RPG.audio?.battleSound(ev);
          fieldEvent(ev, prevEv, team, maxStats);
          prevEv = ev;
          await sleep(ev.who === "info" ? 400 : 550);
        }
      } else {
        result.events.forEach(addLogLine);
        applyEventToBars(result.events[result.events.length - 1], team, maxStats);
        fieldEvent(result.events[result.events.length - 1], null, team, maxStats);
      }

      // Підсумок: коротка мелодія, далі знову музика локації
      if (RPG.audio) {
        if (deaths) RPG.audio.jingle("defeat");
        else if (result.win && levelLines.length) RPG.audio.jingle("levelup");
        else if (result.win) RPG.audio.jingle("victory");
      }
      // Бій показано — у журналі тепер повний запис (з підсумком)
      liveLines = liveEntry = null;
      journalCtl?.refresh({ skip: null, live: null });
      setArena(outcome.title, outcome.lines, outcome.state);
      if (deaths) {
        const wake = el("li", "log-action");
        wake.append(link("Прокинутися в Храмі", "game.html"));
        logBox.append(wake);
        logBox.scrollTop = logBox.scrollHeight;
        document.body.classList.remove("is-fighting");
        fighting = false;
        drawHero();
        renderQuickSlots();
        startBtn.disabled = rerollBtn.disabled = true;   // бій звідси вже неможливий
        saveBtn.disabled = false;
        return;
      }

      // Наступні суперники
      nextEnemy();
      renderMode();
      const nextDun = dungeonOn() ? RPG.activeDungeon(save) : null;
      addLogLine({ who: "info", text: nextDun
        ? `Далі — бій ${nextDun.stage} з ${nextDun.stages}: ${foesText()}.`
        : mode === "dungeon" ? `Щоб повторити данж, потрібен новий ключ. Бос: ${foesText()}.`
        : `Далі на вас чекає: ${foesText()}.` + (anyChampion() ? " Серед них рідкісний ЧЕМПІОН!" : "") });
      renderEnemy();

      renderAll();
      setFighting(false);
      // Данж перейшов до бою з босом (або завершився) — після джингла грає відповідна тема
      if (RPG.audio && dun) setTimeout(playLocationMusic, 5500);
      if (!fighters().length) startBtn.disabled = true;
      // Герой досяг 12 рівня — підходить незнайомець зі сферою (квест «Долоні Велеса»)
      if (RPG.velesStrangerDue(save)) setTimeout(() => meetStranger(save).then(renderAll), 800);
      // Інвентар заповнився (або щось уже пропало) — окреме повідомлення, щоб не пропустити
      if (result.win && (Object.keys(lost).length || (freeBefore > 0 && !RPG.invFree(save)))) {
        showNotice("Інвентар заповнено!", [
          `Усі ${RPG.invSize(save)} клітинок інвентаря зайняті. Нові речі та ресурси, яким немає місця, пропадатимуть — ` +
          "доповнюються лише неповні стопки.",
          Object.keys(lost).length ? `Уже пропало: ${Object.entries(lost).map(([k, n]) => `${k} ×${n}`).join(", ")}.` : "",
          "Продайте зайве торговцю або покладіть у скриню в Домівці."
        ].filter(Boolean), "is-warn");
      }
    }

    // Не даємо піти зі сторінки посеред показу бою без попередження
    document.querySelectorAll("nav a, a.wf").forEach(a => {
      a.addEventListener("click", ev => {
        if (fighting && !confirm("Бій ще показується. Результат уже збережено. Вийти?")) { ev.preventDefault(); return; }
        // Вихід із локації посеред данжу — данж втрачено (dungeon.js скасує його на іншій локації)
        if (!fighting && RPG.activeDungeon(save) && a.getAttribute("href") === "maps.html" &&
            !confirm("Ви в данжі. Якщо підете з локації — данж буде втрачено разом із ключем. Піти?")) ev.preventDefault();
      });
    });

    // Журнал бою: останні 100 подій в окремому вікні (journal.js); під час бою — поточний бій наживо.
    // Кнопка є і в бойових локаціях (біля «Почати бій»), і в мирних (біля «Зберегти гру»)
    const openJournal = () => { journalCtl = RPG.openJournal(save, liveLines ? { skip: liveEntry, live: liveLines } : {}); };
    document.querySelectorAll(".journal-btn").forEach(b => b.addEventListener("click", openJournal));
    // Коротка смужка стану (2 рядки) — клік відкриває повний журнал
    logBox.title = "Натисніть, щоб відкрити журнал бою";
    logBox.addEventListener("click", openJournal);
    const placeJournal = $("journal-btn-place");
    if (placeJournal) placeJournal.hidden = !!combat;

    saveBtn.addEventListener("click", async () => {
      try {
        await RPG.saveGame(save);
        showMsg(msg, `Гру збережено (${fmtDate(save.savedAt)}).`);
      } catch (e) {
        showMsg(msg, "Не вдалося зберегти: " + e.message, true);
      }
    });

    if (combat) {
      // Після прибуття на локацію перед першим боєм — вікно розстановки героїв
      startBtn.addEventListener("click", () => { if (fighting) return; if (placedHere()) startBattle(); else openFormation(startBattle); });
      $("formation-btn")?.addEventListener("click", () => { if (!fighting) openFormation(); });

      rerollBtn.addEventListener("click", () => {
        if (fighting || mode === "dungeon") return;
        nextEnemy();
        renderEnemy();
        showReady();
      });
      leaveBtn.addEventListener("click", async () => {
        if (fighting || !RPG.activeDungeon(save)) return;
        if (!confirm("Покинути данж? Ключ уже використано, прогрес буде втрачено.")) return;
        RPG.leaveDungeon(save);
        await RPG.saveGame(save);
        nextEnemy();
        renderMode();
        renderEnemy();
        showReady();
        showMsg(msg, "Ви покинули данж.");
      });
      renderMode();
      renderEnemy();
      showReady();
      if (!fighters().length) startBtn.disabled = true;
    }

    renderAll();
    // У мирних локаціях не перемальовуємо панель щосекунди — лише смужки героя
    startRegenTimer(save, () => { drawHero(); }, () => fighting);
  }

  // ============================================================

  RPG.pages.pageGame = pageGame;
})(window.RPG);

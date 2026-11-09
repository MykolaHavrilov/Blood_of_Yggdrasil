// ============================================================
// page-inventory.js — Екран «Інвентар» і скриня.
// Частина колишнього game.js: спільне беремо з game-common.js (RPG.ui), запуск — game-main.js.
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, setBar, fmtNum, fmtDate, fmtStat, MSG_SEC, toastParent, raiseToasts, clearToasts, toastHost, showMsg, showNoGame, requireSave, showKeyPocket, showLootFilter, renderFilterBtn, whenNoDialog, queueDialog, noticeClose, noticeDialog, showNotice, journalReward, meetStranger, showParchment, BOOK, bookMotionOff, bookWide, bookBlobs, bookAnimUrl, playBookAnim, dropBookAnim, chronicleSection, showChronicle, forgeBookTable, forgeBookAuto, forgeBookSection, dataBookSection, openLibraryBook, showDataBook, showForgeBook, fieldLootAdd, showFieldLoot, TRAVEL_HREFS, blockLink, lockNavForTravel, unlockNavAfterTravel, showTravelBanner, startRegenTimer, itemLabel, rarityName, itemIcon, rarityTextClass, miniPlaceholder, fillItemCell, socketMarks, lockMark, lockButton, SLOT_SHORT, fillEquipCell, smallIcon, slotClass, renderHeroDoll, renderHeroGs, miniBar, renderPartyList, memberTabs, groupMemberTabs, renderHeroBars, expInfo, bindExpInfo, describeStats, describeEffect, useResultText, locImage, TYPE_NAMES, RARITY_NAMES, itemInfo, MSG_MAX } = RPG.ui;

  // ІНВЕНТАР + СУНДУК
  // ============================================================
  async function pageInventory() {
    const save = await requireSave();
    if (!save) return;

    // Герой групи, якого зараз налаштовуємо (0 — головний). ms — його «вигляд» сейву:
    // своє спорядження й атрибути, а інвентар, скриня й золото — спільні.
    let memberIndex = 0;
    let ms = save;
    const members = groupMemberTabs(save, {
      get: () => memberIndex,
      set: (i, v) => { memberIndex = i; ms = v; if (typeof selected !== "undefined") selected = null; },
      redraw: () => render(),
    });
    function renderMemberTabs() {
      members.tabs();
      const t = $("equip-title"); if (t) t.textContent = RPG.partySize(save) > 1 ? `Спорядження: ${ms.character.name}` : "Спорядження";
    }

    const msg = $("msg");
    // Дії з предметами — лише у спливаючому вікні. Кнопки створюються
    // «в пам'яті» (не на сторінці): вікно бере з них назву, стан і дію.
    const desc = el("div", "item-desc");
    const btnEquip = button("Вдягнути", "wf wf-button");
    const btnUnequip = button("Зняти", "wf wf-button");
    const btnUse = button("Використати", "wf wf-button");
    const btnDrop = button("Викинути", "wf wf-danger");
    const btnToChest = button("У скриню", "wf wf-secondary");
    const btnFromChest = button("Забрати зі скрині", "wf wf-secondary");
    // Частина стопки: вікно з кількістю (напр. 25 слизу з 200)
    const btnToChestPart = button("У скриню: частину…", "wf wf-secondary");
    const btnFromChestPart = button("Забрати частину…", "wf wf-secondary");
    // Гнізда під руни: вкласти / вийняти (data/runes.js → insertRune / removeRune)
    const btnRunes = button("Руни в гніздах…", "wf wf-secondary");
    // Скриня поточної локації (або основна — тоді її можна лише переглянути)
    // У власному домі зі складом — ще й скрині ремесла (вкладки над скринею)
    const storages = RPG.chestsHere(ms);
    const atHome = storages.length > 0;
    let viewChest = storages[0] || RPG.DEFAULT_CHEST;
    const chestOf = () => RPG.chestList(ms, viewChest);

    // selected: { kind: "inv", index } | { kind: "eq", slot } | { kind: "chest", index }
    let selected = null;

    function gridOf(list, minCells, kind, box) {
      box.innerHTML = "";
      const total = Math.max(minCells, list.length);
      for (let i = 0; i < total; i++) {
        const entry = list[i];
        if (!entry) { box.append(el("div", "wf wf-slot slot-empty", "")); continue; }
        const cell = fillItemCell(button("", slotClass(entry)), entry, entry.qty);
        const lm = lockMark(entry);
        if (lm) cell.append(lm);
        cell.removeAttribute("title");
        cell.setAttribute("aria-label", itemLabel(entry));
        cell.dataset.key = kind + ":" + i;
        if (selected?.kind === kind && selected.index === i) cell.classList.add("is-selected");
        RPG.bindTip(cell, () => itemInfo(entry, entry.qty, ms, { onLock }), null,
          { onOpen: () => { pick({ kind, index: i }, cell.dataset.key); return false; } });
        box.append(cell);
      }
    }

    function render() {
      renderMemberTabs();
      // Вдягнене — навколо картинки героя, як на «Персонажі» (game-common.js → DOLL_SLOTS); герой перемальовується з речами
      const artOpen = !!RPG.hasArtifactSlots?.(ms);
      const dollCol = (box, list) => {
        box.innerHTML = "";
        for (const slot of list) {
          const ref = ms.equipment[slot];
          const item = RPG.ITEMS[RPG.refId(ref)];
          const cell = button("", item ? slotClass(ref, "equip-cell") : "wf wf-slot equip-cell slot-empty");
          fillEquipCell(cell, ref, slot);
          const lm = item && lockMark(ref);
          if (lm) cell.append(lm);
          if (selected?.kind === "eq" && selected.slot === slot) cell.classList.add("is-selected");
          cell.dataset.key = "eq:" + slot;
          if (item) {
            RPG.bindTip(cell, () => itemInfo(ref, 1, ms, { onLock }), null,
              { onOpen: () => { pick({ kind: "eq", slot }, cell.dataset.key); return false; } });
          } else {
            const locked = slot.startsWith("artifact") && !artOpen;   // артефакти — з професією
            if (locked) { cell.classList.add("is-locked"); cell.title = "Комірки артефактів відкриваються з професією."; }
            cell.addEventListener("click", () => { selected = null; RPG.popover.hide(); render(); });
          }
          box.append(cell);
        }
      };
      dollCol($("doll-left"), RPG.DOLL_SLOTS.left);
      dollCol($("doll-right"), RPG.DOLL_SLOTS.right);
      const heroImg = $("hero-img");
      if (heroImg) renderHeroDoll(heroImg, ms);
      const heroName = $("hero-name");
      if (heroName) heroName.textContent = `${ms.character.name} — ${RPG.getClass(ms.character.classId).name}`;

      gridOf(ms.inventory, RPG.invSize(ms), "inv", $("item-grid"));
      const conf = RPG.chestConf(viewChest);
      const chest = chestOf();
      $("chest-title").textContent = conf.name;
      const cc = RPG.parseCraftChest(viewChest);
      $("chest-note").textContent = `Клітинок: ${chest.length}/${conf.size} · ` + (cc
        ? `${RPG.CRAFT_CHEST_ALLOW_TEXT[cc.type]}${cc.type === "item" ? "" : `, до ${fmtNum(RPG.CRAFT_CHESTS[cc.type].stack)} шт. в клітинці`}. Скриня ремесла цього дому.`
        : atHome
        ? `Матеріали — до ${fmtNum(conf.stack.material)} шт., зілля — до ${fmtNum(conf.stack.consumable)} шт. в клітинці. Речі тут не зникають навіть після загибелі. Ця скриня спільна для Домівки й усіх ваших домів.`
        : `Скриня стоїть тут: ${RPG.chestPlaces(viewChest).join(", ") || "Домівка"} — звідси її можна лише переглянути.`);
      renderChestTabs();
      $("chest-note").classList.toggle("is-full", chest.length >= conf.size);
      gridOf(chest, conf.size, "chest", $("chest-grid"));

      $("gold").textContent = `Клітинок: ${ms.inventory.length}/${RPG.invSize(ms)} · Золото: ${fmtNum(ms.character.gold)}`;
      const beltBtn = $("belt-btn");
      if (beltBtn) {
        const bonus = RPG.beltBonus(ms);
        beltBtn.title = `Пояс: мішечки (+${bonus} комірок)`;
        beltBtn.classList.toggle("is-on", bonus > 0);
        beltBtn.onclick = () => showBelt();
      }
      renderDeathBagBtn();
      const pocketBtn = $("key-pocket-btn");
      if (pocketBtn) pocketBtn.onclick = () => showKeyPocket(save);
      const filterBtn = $("loot-filter-btn");
      renderFilterBtn(filterBtn, save);
      if (filterBtn) filterBtn.onclick = () => showLootFilter(save, () => renderFilterBtn(filterBtn, save));
      $("gold").classList.toggle("is-full", !RPG.invFree(ms));
      renderDesc();
    }

    // «Мішок загиблого» (смертельний режим, party.js → deathBag): речі полеглого напарника, що не влізли в інвентар.
    // Кожна річ чекає 30 хв від загибелі, потім пропадає.
    const leftText = until => { const m = Math.max(0, Math.ceil((until - Date.now()) / 60000)); return `${m} хв`; };
    function renderDeathBagBtn() {
      const b = $("death-bag-btn");
      if (!b) return;
      const bag = RPG.deathBag ? RPG.deathBag(save) : [];
      b.hidden = !bag.length;
      if (!bag.length) return;
      b.textContent = `Мішок загиблого: ${bag.length} · ще ${leftText(Math.min(...bag.map(e => e.until)))}`;
      b.onclick = () => showDeathBag();
    }
    function showDeathBag() {
      const { dlg, closeBtn } = RPG.ui.noticeDialog("death-bag-dialog");
      const draw = () => {
        dlg.innerHTML = "";
        dlg.append(closeBtn(), el("h3", null, "Мішок загиблого"));
        const bag = RPG.deathBag(save);
        if (!bag.length) { dlg.append(el("p", null, "Мішок порожній.")); return; }
        dlg.append(el("p", "note", `Речі полеглих напарників, що не влізли в інвентар. Кожна пропаде через 30 хвилин після загибелі. Вільних клітинок в інвентарі: ${RPG.invFree(save)}.`));
        const list = el("div", "stack death-bag-list");
        bag.forEach((e, i) => {
          const row = el("div", "row death-bag-row");
          const cell = fillItemCell(el("div", slotClass(e.ref, "equip-cell")), e.ref);
          const info = el("div", "stack");
          info.append(rarityName(e.ref), el("span", "note", `${e.from} · пропаде за ${leftText(e.until)}`));
          row.append(cell, info, button("Забрати", "wf wf-button", () => take(i)));
          list.append(row);
        });
        dlg.append(list);
        dlg.append(button("Забрати все, що влізе", "wf wf-secondary", () => take(null)));
      };
      const take = async i => {
        const r = RPG.takeFromDeathBag(save, i);
        if (!r.ok) showMsg(msg, r.reason, true);
        await RPG.saveGame(save).catch(e => console.error(e));
        render();
        draw();
      };
      draw();
      document.body.append(dlg);
      dlg.showModal();
    }
    setInterval(() => { if (save.deathBag?.length) renderDeathBagBtn(); }, 30000);

    // Вкладки сховищ (спільна скриня + скрині ремесла складу) і «Розкласти все»
    function renderChestTabs() {
      const box = $("chest-tabs");
      if (!box) return;
      box.innerHTML = "";
      box.hidden = storages.length < 2;
      if (box.hidden) return;
      for (const sid of storages) {
        const conf = RPG.chestConf(sid);
        const used = RPG.chestList(ms, sid).length;
        box.append(button(`${conf.name} · ${used}/${conf.size}`, "wf " + (sid === viewChest ? "wf-button" : "wf-link") + " chest-tab",
          () => { viewChest = sid; selected = null; RPG.popover.hide(); render(); }));
      }
      if (storages.some(sid => ["mat", "pot"].includes(RPG.parseCraftChest(sid)?.type))) {
        box.append(button("Розкласти все", "wf wf-secondary chest-tab", async () => {
          const r = RPG.sortToCraftChests(ms);
          selected = null;
          await commit(r.moved ? `Розкладено по скринях ремесла: ${fmtNum(r.moved)} шт. матеріалів і зілля.` : "Нічого розкладати: матеріалів і зілля в інвентарі немає або скрині повні.", !r.moved);
        }));
      }
    }

    // Замок перемкнули в описі речі: зберегти й оновити позначки замків на клітинках (вікно опису лишається відкритим)
    async function onLock() {
      await RPG.saveGame(save).catch(e => console.error(e));
      for (const cell of document.querySelectorAll("[data-key]")) {
        const [kind, k] = cell.dataset.key.split(":");
        const ref = kind === "eq" ? ms.equipment[k] : kind === "chest" ? chestOf()[Number(k)] : ms.inventory[Number(k)];
        cell.querySelector(".item-lock")?.remove();
        const lm = ref && lockMark(ref);
        if (lm) cell.append(lm);
      }
      renderDesc();
      // відкрите вікно опису — перебудувати, щоб кнопки дій (напр. «Викинути») відповідали новому замку
      const open = document.querySelector(".popover:not([hidden]):not(.is-preview)");
      const cell = openKey && document.querySelector(`[data-key="${CSS.escape(openKey)}"]`);
      const ref = selectedRef();
      if (open && cell && ref) {
        const box = itemInfo(ref, ref.qty || 1, ms, { onLock });
        const diff = desc.querySelector(".item-diff");
        if (diff) box.append(diff.cloneNode(true));
        RPG.popover.show(cell, box, { actions: invActions() });
      }
    }

    // Клік по предмету: виділити його і показати вікно з описом та діями.
    // Повторний клік по тому ж предмету — закрити вікно.
    let openKey = null;
    function pick(sel, key) {
      const popOpen = document.querySelector(".popover:not([hidden]):not(.is-preview)");
      if (popOpen && openKey === key) { RPG.popover.hide(); openKey = null; return; }
      selected = sel;
      render();
      const cell = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
      const ref = selectedRef();
      if (!cell || !ref) return;
      const box = itemInfo(ref, ref.qty || 1, ms, { onLock });
      const diff = desc.querySelector(".item-diff");
      if (diff) box.append(diff.cloneNode(true));
      RPG.popover.show(cell, box, { actions: invActions() });
      openKey = key;
    }

    // Кнопки дій у вікні — дублюють активні кнопки під інвентарем
    function invActions() {
      return [
        [btnEquip, "wf-button"], [btnUnequip, "wf-button"], [btnUse, "wf-button"], [btnRunes, "wf-secondary"],
        [btnToChest, "wf-secondary"], [btnToChestPart, "wf-secondary"], [btnFromChest, "wf-secondary"], [btnFromChestPart, "wf-secondary"],
        [btnDrop, "wf-danger"]
      ].filter(([b]) => !b.disabled)
        .map(([b, cls]) => ({ text: b.textContent, className: cls, onClick: () => { openKey = null; b.click(); } }));
    }

    // Обраний запис: екземпляр речі (з рідкістю) або стопка
    function selectedRef() {
      if (!selected) return null;
      if (selected.kind === "eq") return ms.equipment[selected.slot] || null;
      if (selected.kind === "chest") return chestOf()[selected.index] || null;
      return ms.inventory[selected.index] || null;
    }

    function selectedItemId() {
      return RPG.refId(selectedRef()) || null;
    }

    function renderDesc() {
      const id = selectedItemId();
      desc.innerHTML = "";
      for (const b of [btnEquip, btnUnequip, btnUse, btnDrop, btnToChest, btnFromChest, btnToChestPart, btnFromChestPart, btnRunes]) b.disabled = true;
      btnToChest.title = btnFromChest.title = atHome ? "" : "Доступно лише біля скрині";
      if (!id) {
        desc.append(el("div", null, "Оберіть предмет, щоб побачити опис."));
        return;
      }
      const ref = selectedRef();
      const item = RPG.ITEMS[id];
      desc.append(itemInfo(ref, ref.qty || 1, ms, { onLock }));

      if (selected.kind === "inv" && item.slot) {
        const diff = RPG.previewEquip(ms, selected.index);
        const txt = Object.entries(diff).map(([k, v]) => `${RPG.STAT_NAMES[k] || k} ${v > 0 ? "+" : ""}${v}`).join(", ");
        desc.append(el("div", "item-diff", "Якщо вдягнути: " + (txt || "без змін")));
        const check = RPG.canEquip(ms, id);
        btnEquip.disabled = !check.ok;
        btnEquip.title = check.ok ? "" : check.reason;
      }
      if (selected.kind === "eq") btnUnequip.disabled = false;
      if (selected.kind === "inv" && (item.type === "consumable" || item.type === "blueprint" || item.adminPanel)) btnUse.disabled = false;
      btnUse.textContent = item.adminPanel ? "Відкрити" : "Використати";   // Печатка Адміністратора — вікно адміністрування
      if (selected.kind === "inv") {
        const e = ms.inventory[selected.index];
        btnDrop.disabled = !!RPG.ITEMS[e?.id]?.locked || RPG.isItemLocked(e);   // Сфера Богів і речі під замком не викидаються
        btnDrop.title = RPG.isItemLocked(e) ? RPG.LOCKED_REASON : "";
      }
      if (selected.kind === "inv" && atHome) btnToChest.disabled = false;
      if (selected.kind === "chest" && atHome) btnFromChest.disabled = false;
      if (RPG.uiRunesSeen && (selected.kind === "inv" || selected.kind === "eq") && ref.sockets > 0) btnRunes.disabled = false;
      const isStack = !ref.r && item.stackable && (ref.qty || 1) > 1;
      if (isStack && selected.kind === "inv" && atHome) btnToChestPart.disabled = false;
      if (isStack && selected.kind === "chest" && atHome) btnFromChestPart.disabled = false;
    }

    // Вікно адміністрування (Печатка Адміністратора, data/items.js → admin_seal):
    // рівень будь-якого героя групи, заміна вже обраної професії, миттєве переміщення в будь-яке місце,
    // повний комплект зброї й броні на вибір (character.js → adminGiveGear).
    function showAdminPanel() {
      document.querySelector(".admin-dialog")?.remove();
      const { dlg, closeBtn } = noticeDialog("admin-dialog", () => { selected = null; RPG.popover.hide(); render(); });
      let who = memberIndex, note = null;
      let gearPick = null, gearWeapon = null, gearRarity = "legendary", gearEquip = true;   // пункт 4 — що обрано
      const T = x => (RPG.t ? RPG.t(x) : x);
      const done = async (r, text) => {
        note = { text: r.ok ? text : r.reason, error: !r.ok };
        if (r.ok) await RPG.saveGame(save).catch(e => console.error(e));
        draw();
      };
      const field = (label, ...nodes) => { const row = el("div", "admin-row"); row.append(el("span", "admin-label", label), ...nodes); return row; };
      const select = (opts, value) => {
        const sel = el("select", "admin-select");
        for (const o of opts) {
          if (o.group) { const g = document.createElement("optgroup"); g.label = o.group; for (const x of o.items) g.append(option(x)); sel.append(g); }
          else sel.append(option(o));
        }
        sel.value = value;
        return sel;
      };
      const option = o => { const op = el("option", null, o.text); op.value = o.value; return op; };
      const draw = () => {
        dlg.innerHTML = "";
        dlg.append(closeBtn("Закрити"), el("h3", null, "Адміністрування"));
        if (note) {
          const p = el("p", "forge-result" + (note.error ? " is-error" : ""));
          const lines = Array.isArray(note.text) ? note.text : [note.text];
          lines.forEach((l, i) => p.append(...(i ? [" "] : []), el("span", null, l)));   // кожне речення — окремо (переклад)
          dlg.append(p);
        }
        const members = RPG.partyMembers(save);
        if (!members[who]) who = 0;
        const m = members[who], ch = m.character, cls = RPG.getClass(ch.classId);

        // Герой групи
        const heroSel = select(members.map((x, i) => ({ value: String(i),
          text: `${x.character.name} · ${RPG.getClass(x.character.classId).name}, ${x.character.level} рівень` })), String(who));
        heroSel.addEventListener("change", () => { who = Number(heroSel.value); note = null; draw(); });
        dlg.append(field("Герой групи", heroSel));

        // 1) Рівень
        const cap = RPG.levelCap(m);
        const lvl = el("input", "admin-num");
        Object.assign(lvl, { type: "number", min: 1, max: cap, step: 1, value: ch.level, inputMode: "numeric" });
        const lvlBox = el("div", "panel stack admin-sec");
        lvlBox.append(el("h4", null, "Рівень"), field(`Рівень (1–${cap})`, lvl,
          button("Встановити", "wf wf-button", () => {
            const r = RPG.adminSetLevel(m, lvl.value);
            done(r, `${ch.name}: рівень ${r.old} → ${r.level}.`);
          })));
        dlg.append(lvlBox);

        // 2) Професія (лише для героя, що вже обрав професію)
        const clsBox = el("div", "panel stack admin-sec");
        clsBox.append(el("h4", null, "Професія"));
        if ((cls.tier || 1) < 2) {
          clsBox.append(noteP(`${ch.name} ще без професії — змінити можна лише вже обрану професію.`));
        } else {
          const list = Object.entries(RPG.CLASSES).filter(([id, c]) => c.tier === cls.tier && id !== ch.classId)
            .map(([id, c]) => ({ value: id, text: c.name }));
          const clsSel = select(list, list[0]?.value || "");
          clsBox.append(field(`Зараз: ${cls.name}`, clsSel, button("Змінити", "wf wf-button", () => {
            const r = RPG.adminSetClass(m, clsSel.value);
            const extra = r.ok && (r.removed.length || r.dropped.length)
              ? ` ${r.removed.length ? `Знято в інвентар: ${r.removed.map(x => RPG.itemFullName(x)).join(", ")}.` : ""}${r.dropped.length ? ` Навички старої професії зникли: ${r.dropped.length}.` : ""}` : "";
            const lines = [`${ch.name}: тепер ${RPG.getClass(clsSel.value).name}.${extra}`];
            if (r.ok && r.mastery) {                    // володіння основною зброєю перейшло на зброю нової професії
              const wn = t => T(RPG.WEAPON_TYPES[t]?.name || t).toLowerCase();
              lines.push(r.mastery.moved
                ? `Володіння зброєю: ${wn(r.mastery.from)} → ${wn(r.mastery.to)}, рівень ${r.mastery.level}; ${wn(r.mastery.from)} — 0.`
                : `Володіння зброєю (${wn(r.mastery.to)}) вже прокачане — лишається рівень ${r.mastery.level}.`);
            }
            done(r, lines);
          })));
          clsBox.append(noteP("Рівень і досвід лишаються. Якщо основна зброя нової професії ще не прокачана — на неї переноситься володіння старої (стара — 0); якщо прокачана — лишається як є. Навички старої професії зникають, а речі, яких нова професія не носить, переходять в інвентар."));
        }
        dlg.append(clsBox);

        // 3) Переміщення — миттєво, у будь-яке місце
        const here = RPG.whereIs(save);
        const groups = RPG.REGION_CHAIN.filter(r => RPG.MAP_REGIONS[r]).map(r => ({
          group: RPG.regionName(r),
          items: Object.keys(RPG.MAP_REGIONS[r].spots).map(id => ({ value: `${r}|${id}`,
            text: RPG.spotName(r, id) + (r === here.region && id === here.spot ? " — ви тут" : "") }))
        }));
        const placeSel = select(groups, `${here.region}|${here.spot}`);
        const goBox = el("div", "panel stack admin-sec");
        goBox.append(el("h4", null, "Переміщення"), field("Куди", placeSel, button("Перемістити", "wf wf-button", async () => {
          const [r, id] = placeSel.value.split("|");
          const res = RPG.adminTeleport(save, r, id);
          if (!res.ok) { note = { text: res.reason, error: true }; draw(); return; }
          await RPG.saveGame(save);
          location.href = "game.html";
        })));
        goBox.append(noteP("Миттєво, без дороги й без перевірок рівня та брам. Дорога, якщо герой був у дорозі, скасовується."));
        dlg.append(goBox);

        // 4) Повний комплект зброї й броні
        const gearBox = el("div", "panel stack admin-sec");
        const tiers = RPG.ADMIN_ARMOR_SETS.map(t => ({ value: `tier|${t.tier}`,
          text: `Вид ${t.tier} · ${t.name} і зброя (з ${RPG.ITEMS[`${t.set}_chest`]?.levelReq || 1} рівня)` }));
        const profList = Object.keys(RPG.CLASSES).filter(id => RPG.ITEM_SETS[`prof_${id}`])
          .map(id => ({ value: `prof|${id}`, text: `${T(RPG.ITEM_SETS[`prof_${id}`].name)} — ${T(RPG.getClass(id).name)}` }));
        if (!gearPick) {
          const own = RPG.ITEM_SETS[`prof_${ch.classId}`] ? `prof|${ch.classId}` : null;
          const fit = [...RPG.ADMIN_ARMOR_SETS].reverse().find(t => (RPG.ITEMS[`${t.set}_chest`]?.levelReq || 1) <= ch.level) || RPG.ADMIN_ARMOR_SETS[0];
          gearPick = own || `tier|${fit.tier}`;
        }
        const setSel = select([{ group: "Броня й зброя за видом", items: tiers }, { group: "Комплекти професій", items: profList }], gearPick);
        const wTypes = RPG.adminWeaponTypes(m);
        if (!wTypes.includes(gearWeapon)) gearWeapon = wTypes[0];
        const wSel = select(wTypes.map(t => ({ value: t, text: RPG.WEAPON_TYPES[t]?.name || t })), gearWeapon);
        const rSel = select(["common", "magic", "epic", "legendary"].map(r => ({ value: r, text: RPG.RARITIES[r].name })), gearRarity);
        const eq = el("input"); eq.type = "checkbox"; eq.checked = gearEquip;
        const eqLabel = el("label", "choice admin-check"); eqLabel.append(eq, document.createTextNode(" Одразу вдягнути на героя"));
        const syncW = () => { wSel.disabled = setSel.value.startsWith("prof|"); };
        setSel.addEventListener("change", () => { gearPick = setSel.value; syncW(); });
        wSel.addEventListener("change", () => { gearWeapon = wSel.value; });
        rSel.addEventListener("change", () => { gearRarity = rSel.value; });
        eq.addEventListener("change", () => { gearEquip = eq.checked; });
        syncW();
        gearBox.append(el("h4", null, "Комплект зброї й броні"), field("Комплект", setSel), field("Зброя (для броні за видом)", wSel),
          field("Рідкість", rSel), eqLabel, button("Отримати", "wf wf-button", () => {
            const [kind, key] = setSel.value.split("|");
            const r = RPG.adminGiveGear(m, kind, key, { weaponType: wSel.value, rarity: rSel.value, equip: eq.checked });
            // назви речей і причини перекладаються одразу (англійська мова гри), речення — шаблонами i18n
            const names = list => list.map(x => T(RPG.ITEMS[x.ref.id].name) + (x.reason ? ` (${T(x.reason).replace(/\.$/, "").toLowerCase()})` : "")).join(", ");
            const lines = [];
            if (r.ok) {
              lines.push(`${ch.name}: отримано ${r.refs.length} речей (${T(RPG.RARITIES[rSel.value].name).toLowerCase()}).`);
              if (eq.checked && r.equipped.length) lines.push(`Вдягнуто: ${r.equipped.length}.`);
              if (eq.checked && r.left.length) lines.push(`В інвентарі (не вдягаються зараз): ${names(r.left)}.`);
            }
            done(r, lines);
          }));
        gearBox.append(noteP("Броня за видом — 5 частин, зброя обраного типу й річ лівої руки до неї; комплект професії — 5 частин і зброя професії. Речі, які герой ще не може вдягнути (рівень, професія), лишаються в інвентарі."));
        dlg.append(gearBox);
      };
      document.body.append(dlg);
      draw();
      dlg.showModal();
    }

    // Пояс: 5 слотів для мішечків (character.js → putOnBelt / takeFromBelt). Порожній слот — вибрати мішечок з інвентаря.
    function showBelt() {
      document.querySelector(".belt-dialog")?.remove();
      const { dlg, closeBtn } = noticeDialog("belt-dialog", () => { selected = null; RPG.popover.hide(); render(); });
      let pick = null, note = null;
      const draw = () => {
        dlg.innerHTML = "";
        const close = closeBtn("Закрити пояс");
        dlg.append(close, el("h3", null, "Пояс"));
        dlg.append(el("p", "belt-sum", `Інвентар: ${RPG.invSize(ms)} комірок (36 + ${RPG.beltBonus(ms)} від мішечків) · зайнято ${ms.inventory.length}`));
        if (note) dlg.append(el("p", "forge-result" + (note.error ? " is-error" : ""), note.text));
        const slots = el("div", "belt-slots");
        RPG.beltOf(ms).forEach((id, i) => {
          const cell = button("", "wf wf-slot belt-slot" + (id ? " is-filled" : "") + (pick === i ? " is-pick" : ""), () => {
            if (id) {
              const r = RPG.takeFromBelt(ms, i);
              note = { text: r.ok ? `Знято: ${RPG.ITEMS[r.id].name}.` : r.reason, error: !r.ok };
              if (r.ok) RPG.saveGame(save).catch(e => console.error(e));
              pick = null;
            } else pick = pick === i ? null : i;
            draw();
          });
          if (id) {
            cell.append(el("span", "belt-name", RPG.ITEMS[id].name), el("b", "belt-bag", `+${RPG.ITEMS[id].bag}`));
            cell.title = `${RPG.ITEMS[id].name}: +${RPG.ITEMS[id].bag} комірок. Натисніть, щоб зняти.`;
          } else {
            cell.append(el("span", "belt-empty", "порожньо"));
            cell.title = "Порожній слот — натисніть і виберіть мішечок";
          }
          slots.append(cell);
        });
        dlg.append(slots);
        if (pick !== null) {
          const pouches = ms.inventory.map((e, idx) => ({ e, idx })).filter(x => RPG.ITEMS[x.e.id]?.type === "pouch");
          const box = el("div", "stack belt-pick");
          box.append(el("strong", null, `Слот ${pick + 1}: виберіть мішечок`));
          if (!pouches.length) box.append(el("p", "house-soon", "В інвентарі немає мішечків. Їх можна вибити з босів — шанс 1% з кожного переможеного боса."));
          for (const { e, idx } of pouches) {
            box.append(button(`${RPG.ITEMS[e.id].name} · +${RPG.ITEMS[e.id].bag} комірок`, "wf wf-button", () => {
              const r = RPG.putOnBelt(ms, idx, pick);
              note = { text: r.ok ? `На поясі: ${RPG.ITEMS[r.id].name} (+${RPG.ITEMS[r.id].bag} комірок).` : r.reason, error: !r.ok };
              if (r.ok) { RPG.saveGame(save).catch(e => console.error(e)); pick = null; }
              draw();
            }));
          }
          dlg.append(box);
        } else dlg.append(noteP("Натисніть порожній слот, щоб повісити мішечок з інвентаря, або зайнятий — щоб зняти його."));
      };
      document.body.append(dlg);
      draw();
      dlg.showModal();
    }

    // Вікно «Скільки перекласти?»: число + швидкі кнопки. Повертає Promise<кількість | null>
    function askQty(title, max) {
      return new Promise(resolve => {
        let done = false;
        const { dlg, closeBtn } = noticeDialog("qty-dialog", () => { if (!done) { done = true; resolve(null); } });
        const finish = v => { if (done) return; done = true; resolve(v); dlg.close(); };
        const close = closeBtn("Скасувати", () => finish(null));
        dlg.append(close, el("h3", null, title));
        const label = el("label", "field", `Кількість (є ${fmtNum(max)})`);
        const input = el("input");
        Object.assign(input, { type: "number", min: 1, max, step: 1, value: Math.min(max, Math.max(1, Math.floor(max / 2))), inputMode: "numeric" });
        label.append(input);
        dlg.append(label);
        const quick = el("div", "row qty-quick");
        for (const [t, v] of [["1", 1], ["10", 10], ["25", 25], ["100", 100], ["½", Math.floor(max / 2)], ["Усе", max]]) {
          if (v < 1 || v > max) continue;
          quick.append(button(t, "wf wf-link", () => { input.value = v; input.focus(); }));
        }
        dlg.append(quick);
        const ok = button("Перекласти", "wf wf-button", () => {
          const n = Math.floor(Number(input.value));
          if (!(n >= 1)) { input.focus(); return; }
          finish(Math.min(n, max));
        });
        input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); ok.click(); } });
        const row = el("div", "row");
        row.append(ok, button("Скасувати", "wf wf-secondary", () => finish(null)));
        dlg.append(row);
        document.body.append(dlg);
        dlg.showModal();
        input.select();
      });
    }

    async function commit(text, isError) {
      if (!isError) await RPG.saveGame(save);
      showMsg(msg, text, isError);
      render();
    }

    btnEquip.addEventListener("click", async () => {
      const ref = selectedRef();
      const slot = RPG.equipSlotFor(ms, ref.id);
      const old = ms.equipment[slot];
      if (old && !confirm(`Замінити «${RPG.itemFullName(old)}» на «${RPG.itemFullName(ref)}»?`)) return;
      const r = RPG.equipItem(ms, selected.index);
      selected = r.ok ? { kind: "eq", slot } : selected;
      const extra = r.ok && r.removed?.length ? ` Знято з лівої руки: ${r.removed.map(x => RPG.itemFullName(x)).join(", ")}.` : "";
      await commit(r.ok ? `Вдягнено: ${RPG.itemFullName(ref)}.${extra}` : r.reason, !r.ok);
    });

    btnUnequip.addEventListener("click", async () => {
      const r = RPG.unequipItem(ms, selected.slot);
      selected = null;
      await commit(r.ok ? `Знято: ${RPG.itemFullName(r.ref)}` : r.reason, !r.ok);
    });

    btnUse.addEventListener("click", async () => {
      const id = selectedItemId();
      if (RPG.ITEMS[id]?.adminPanel) { showAdminPanel(); return; }
      const r = RPG.useItem(ms, id);
      if (!ms.inventory[selected.index] || ms.inventory[selected.index].id !== id) selected = null;
      await commit(r.ok ? useResultText(RPG.ITEMS[id], r) : r.reason, !r.ok);
    });

    btnDrop.addEventListener("click", async () => {
      const entry = ms.inventory[selected.index];
      const item = RPG.ITEMS[entry.id];
      if (item?.locked) { await commit(`«${item.name}» — предмет адміністратора, його не можна викинути.`, true); return; }
      if (RPG.isItemLocked(entry)) { await commit(RPG.LOCKED_REASON, true); return; }
      if (!confirm(`Викинути «${RPG.itemFullName(entry)}»${entry.qty > 1 ? ` ×${entry.qty}` : ""}?`)) return;
      ms.inventory.splice(selected.index, 1);
      selected = null;
      await commit(`Викинуто: ${item.name}`);
    });

    btnToChest.addEventListener("click", async () => {
      const r = RPG.moveToChest(ms, selected.index, viewChest);
      selected = null;
      await commit(r.ok ? `У скриню: ${RPG.ITEMS[r.id].name}${r.qty > 1 ? ` ×${r.qty}` : ""}` +
        (r.left ? `. Не влізло ${r.left} шт. — скриня повна.` : "") : r.reason, !r.ok);
    });

    btnRunes.addEventListener("click", () => {
      const ref = selectedRef();
      if (ref) showSocketDialog(ref);
    });
    // Вікно гнізд речі: вільне гніздо — вибір руни з інвентаря, що пасує; зайняте — руна й «Вийняти» (руна трісне)
    function showSocketDialog(ref) {
      document.querySelector(".socket-dialog")?.remove();
      const { dlg, closeBtn } = noticeDialog("socket-dialog", () => { RPG.popover.hide(); render(); });
      let pick = null, note = null, warn = null;   // warn — руна понад ліміт (Манназ — 5 на героя): чекаємо підтвердження
      const draw = () => {
        dlg.innerHTML = "";
        const close = closeBtn();
        dlg.append(close, el("h3", null, `Гнізда: ${RPG.itemFullName(ref)}`));
        dlg.append(noteP("Руни зброї лягають у зброю та речі лівої руки, руни броні — у броню, універсальні — у будь-що. Вийнята з гнізда руна тріскається і стає зламаною."));
        if (note) dlg.append(el("p", "forge-result" + (note.error ? " is-error" : ""), note.text));
        if (warn) {
          // Шоста руна «Манназ»: попередження й вибір
          const box = el("div", "socket-warn");
          box.append(el("p", "forge-result is-error", warn.reason));
          const row = el("div", "socket-warn-actions");
          row.append(button("Так, вкласти", "wf wf-danger", async () => {
            const r = RPG.insertRune(ms, ref, warn.slot, warn.rid, { force: true });
            warn = null;
            if (!r.ok) { note = { text: r.reason, error: true }; draw(); return; }
            await RPG.saveGame(save);
            selected = null;
            dlg.close();
            showNotice("Руна вийшла з-під контролю", [r.text]);
          }), button("Ні, не вкладати", "wf wf-secondary", () => { warn = null; draw(); }));
          box.append(row);
          dlg.append(box);
        }
        const slots = el("div", "socket-slots");
        ref.runes.forEach((rid, i) => {
          const row = el("div", "socket-row" + (pick === i ? " is-pick" : ""));
          if (rid) {
            row.append(smallIcon(rid, "tip-socket-icon"));
            const t = el("div", "socket-text");
            t.append(el("strong", rarityTextClass(rid).trim() || null, RPG.ITEMS[rid].name), el("small", null, RPG.runeEffectText(rid)));
            row.append(t, button("Вийняти", "wf wf-danger", async () => {
              const r = RPG.removeRune(ms, ref, i);
              note = { text: r.ok ? `${RPG.ITEMS[r.id].name} тріснула — в інвентарі ${RPG.ITEMS[r.broken].name.toLowerCase()}.` : r.reason, error: !r.ok };
              if (r.ok) await RPG.saveGame(save);
              draw();
            }));
          } else {
            row.append(el("span", "tip-socket-empty"), el("span", "socket-text", "Вільне гніздо"),
              button(pick === i ? "Скасувати" : "Вкласти руну", "wf " + (pick === i ? "wf-secondary" : "wf-button"), () => { pick = pick === i ? null : i; note = null; draw(); }));
          }
          slots.append(row);
        });
        dlg.append(slots);
        if (pick !== null) {
          // Список рун, що лягають у цю річ: згори донизу — руна за руною (порядок книги рун),
          // а в межах руни — від нижчої рідкості до вищої. Рядок: назва й рідкість, нижче — що дає.
          const keyOrder = Object.keys(RPG.RUNES);
          const fits = [];
          // зламані руни не діють — у списку їх немає (вони лише паливо для Горна Сварога)
          for (const e of ms.inventory) if (RPG.runeFits(ref.id, e.id) && RPG.ITEMS[e.id].grade !== "broken" && !fits.includes(e.id)) fits.push(e.id);
          fits.sort((a, b) => {
            const A = RPG.ITEMS[a], B = RPG.ITEMS[b];
            return keyOrder.indexOf(A.rune) - keyOrder.indexOf(B.rune) ||
              RPG.RUNE_GRADE_ORDER.indexOf(A.grade) - RPG.RUNE_GRADE_ORDER.indexOf(B.grade);
          });
          if (!fits.length) dlg.append(el("p", "house-soon", "В інвентарі немає рун, що лягають у цю річ."));
          const box = el("div", "rune-pick-list");
          for (const rid of fits) {
            const it = RPG.ITEMS[rid];
            const b = button("", "rune-pick-row", async () => {
              const r = RPG.insertRune(ms, ref, pick, rid);
              if (r.overLimit) { warn = { reason: r.reason, slot: pick, rid }; note = null; draw(); return; }
              note = { text: r.ok ? `${RPG.ITEMS[r.id].name} лягла в гніздо.` : r.reason, error: !r.ok };
              if (r.ok) { pick = null; await RPG.saveGame(save); }
              draw();
            });
            const text = el("span", "rune-pick-text");
            const head = el("span", "rune-pick-head");
            head.append(el("strong", rarityTextClass(rid).trim() || null, RPG.RUNES[it.rune].name),
              el("span", "rune-pick-grade rt-" + it.grade, RARITY_NAMES[it.grade] || ""));
            text.append(head, el("small", "rune-pick-fx", "– " + RPG.runeEffectText(rid)));
            b.append(smallIcon(rid, "rune-pick-icon"), text, el("span", "rune-pick-qty", `×${fmtNum(RPG.countItem(ms, rid))}`));
            b.title = `Вкласти: ${it.name}`;
            box.append(b);
          }
          if (fits.length) dlg.append(el("strong", null, `Гніздо ${pick + 1}: виберіть руну`), box);
        }
      };
      document.body.append(dlg);
      draw();
      dlg.showModal();
    }

    btnToChestPart.addEventListener("click", async () => {
      const entry = ms.inventory[selected?.index];
      if (!entry) return;
      const n = await askQty(`У скриню: ${RPG.ITEMS[entry.id].name}`, entry.qty);
      if (!n) return;
      const r = RPG.moveToChest(ms, selected.index, viewChest, n);
      selected = null;
      await commit(r.ok ? `У скриню: ${RPG.ITEMS[r.id].name} ×${r.qty}` +
        (r.left ? `. Не влізло ${r.left} шт. — скриня повна.` : "") : r.reason, !r.ok);
    });

    btnFromChestPart.addEventListener("click", async () => {
      const entry = chestOf()[selected?.index];
      if (!entry) return;
      const n = await askQty(`Забрати: ${RPG.ITEMS[entry.id].name}`, entry.qty);
      if (!n) return;
      const r = RPG.takeFromChest(ms, selected.index, viewChest, n);
      selected = null;
      await commit(r.ok ? `Забрано зі скрині: ${RPG.ITEMS[r.id].name} ×${r.qty}` +
        (r.left ? `. Не влізло ${r.left} шт. — інвентар повний.` : "") : r.reason, !r.ok);
    });

    btnFromChest.addEventListener("click", async () => {
      const r = RPG.takeFromChest(ms, selected.index, viewChest);
      selected = null;
      await commit(r.ok ? `Забрано зі скрині: ${RPG.ITEMS[r.id].name}${r.qty > 1 ? ` ×${r.qty}` : ""}` +
        (r.left ? `. У скрині лишилось ${r.left} шт. — інвентар повний.` : "") : r.reason, !r.ok);
    });

    render();
  }

  // ============================================================

  RPG.pages.pageInventory = pageInventory;
})(window.RPG);

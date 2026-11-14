// ============================================================
// page-game-home.js — Екран локації: Домівка, власний дім (кузня, склад, бібліотека), Спальний район.
// Частина page-game.js: RPG.gameParts.home(G) викликається з pageGame() і повертає те, що потрібне іншим частинам.
// G — спільне екрана локації: save, msg, place, locData і функції з page-game.js та інших частин
// (G.renderAll, G.renderPlace, G.renderShop…); G.fighting — чи показується бій. Спільні помічники — RPG.ui (game-common.js).
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, fmtNum, showMsg, noticeDialog, showParchment, openLibraryBook, showForgeBook, rarityTextClass, lockMark, smallIcon } = RPG.ui;
  RPG.gameParts = RPG.gameParts || {};

  RPG.gameParts.home = function (G) {
    const { save, place, locData, msg } = G;
    // Функції з page-game.js та інших частин — через G (частини підключаються по черзі, тому не напряму)
    const renderPlace = (...args) => G.renderPlace(...args);
    const renderAll = (...args) => G.renderAll(...args);
    const renderNpc = (...args) => G.renderNpc(...args);

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
    const forgeTier = {};       // вибраний тір на кожній вкладці кузні: { weapon: 4, armor: 2, … }
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
            ` · відкрито тір ${(() => { let t = RPG.craftCatOpenTier(cs.level); while (t > 1 && RPG.craftTierOpen && !RPG.craftTierOpen(save, t).ok) t--; return t; })()}`));
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
        // Фільтр тірів: кнопка на кожен тір цього виду. Закритий тір (світ із ресурсами не відкрито) — сірий:
        // рецепти видно, але кувати не можна (data/recipes.js → craftTierOpen)
        const tiers = [...new Set(Object.entries(RPG.RECIPES).filter(([id]) => group.types.includes(RPG.ITEMS[id]?.type)).map(([, r]) => r.tier))].sort((a, b) => a - b);
        const catLevel = RPG.craftCat(save, group.id).level;
        const tierOpen = t => RPG.craftTierOpen ? RPG.craftTierOpen(save, t) : { ok: true };
        if (!tiers.includes(forgeTier[group.id])) {
          const usable = tiers.filter(t => tierOpen(t).ok && catLevel >= RPG.CRAFT_TIER_LEVEL[t]);
          forgeTier[group.id] = usable.length ? usable.at(-1) : tiers[0];
        }
        const curTier = forgeTier[group.id];
        const tierRow = el("div", "forge-tiers");
        for (const t of tiers) {
          const open = tierOpen(t);
          const lvlOk = catLevel >= RPG.CRAFT_TIER_LEVEL[t];
          const tb = button(`Тір ${t}`, "wf " + (t === curTier ? "wf-button" : "wf-link") + (open.ok ? "" : " is-closed"), () => { forgeTier[group.id] = t; forgeResult = null; draw(); });
          tb.title = !open.ok ? open.reason : lvlOk ? `Тір ${t} відкрито` : `Тір ${t} — з рівня «${group.name}» ${RPG.CRAFT_TIER_LEVEL[t]}`;
          tierRow.append(tb);
        }
        dlg.append(tierRow);
        const curOpen = tierOpen(curTier);
        if (!curOpen.ok) dlg.append(el("p", "forge-closed-note", curOpen.reason + " Рецепти можна переглянути, але кувати — ні."));
        const list = el("div", "stack forge-list");
        // Комплекти професій (data/profsets.js): у списку — лише вивчені за кресленнями
        const bpAll = Object.entries(RPG.RECIPES).filter(([id, rc]) => rc.blueprint && rc.tier === curTier && group.types.includes(RPG.ITEMS[id]?.type) && RPG.blueprintVisible(save, id));
        if (bpAll.length) {
          const known = bpAll.filter(([id]) => RPG.knowsRecipe(save, id)).length;
          list.append(el("p", "forge-why", `Комплекти професій: вивчено креслень ${known} з ${bpAll.length}. ` +
            "Креслення падають з босів Альвгейму; використайте креслення в інвентарі — і рецепт з'явиться тут."));
        }
        for (const [id, rc] of Object.entries(RPG.RECIPES)) {
          const item = RPG.ITEMS[id];
          if (!item || !group.types.includes(item.type) || rc.tier !== curTier) continue;
          if (rc.blueprint && !RPG.knowsRecipe(save, id)) continue;
          const info = RPG.recipeInfo(save, id);
          const row = el("div", "forge-row" + (!info.tierOpen ? " is-closed" : info.levelOk ? "" : " is-locked"));
          const head = el("div", "forge-head");
          head.append(smallIcon(id), el("strong", null, item.name), el("small", "forge-tier", `тір ${rc.tier}`));
          row.append(head);
          const mats = el("div", "forge-mats");
          for (const m of info.mats) mats.append(el("span", "forge-mat" + (m.have >= m.need ? " is-ok" : " is-short"), `${RPG.ITEMS[m.id].name} ${fmtNum(m.have)}/${m.need}`));
          for (const t of info.tools) mats.append(el("span", "forge-mat" + (t.have ? " is-ok" : " is-short"), `знаряддя: ${RPG.FORGE_TOOLS[t.id].name}`));
          row.append(mats);
          if (info.levelOk && info.tierOpen) {
            const odds = RPG.craftOdds(save, id, { preferRare: forgePreferRare, spark: forgeSpark });
            row.append(el("p", "forge-odds", ["broken", "common", "magic", "epic", "legendary"]
              .filter(r => odds[r] >= 0.005).map(r => `${RARITY_LABEL[r]} ${pct(odds[r])}`).join(" · ")));
          }
          const b = button(!info.tierOpen ? "Закрито" : info.levelOk ? "Кувати" : `${group.name} ${info.tierLevel}`, "wf wf-button forge-btn", async () => {
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
          if (!info.canCraft && info.levelOk && info.tierOpen) row.append(el("small", "forge-why", info.reason));
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
          const row = el("div", "forge-row" + (info.ready.closed ? " is-closed" : ""));
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
          for (const n of [...new Set([1, 10, info.max])]) {
            if (n < 1) continue;
            const b = button(n === info.max && n !== 1 && n !== 10 ? `Усе (${fmtNum(n)})` : `×${n}`, "wf wf-button", async () => {
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
        // «Розібрати все» — усе з відкритим замком; що не влізло (немає місця для матеріалів) — лишається
        const allIdx = RPG.disassembleAllCandidates(save);
        const allBtn = button(`Розібрати все (${allIdx.length})`, "wf wf-danger forge-btn forge-all-btn", async () => {
          const q = `Розібрати всі речі з відкритим замком (${allIdx.length})? Речі під замком не чіпаються. Цю дію не можна скасувати.`;
          if (!confirm(RPG.t ? RPG.t(q) : q)) return;
          disConfirm = null;
          const r = RPG.disassembleAll(save);
          if (!r.ok) { forgeResult = { text: r.reason, error: true }; draw(); return; }
          await RPG.saveGame(save);
          const got = Object.entries(r.got).map(([id, q]) => `${RPG.ITEMS[id].name} ×${fmtNum(q)}`).join(", ");
          const ups = craftUpsText({ levelUps: r.levelUps, cat: null, catUps: [] });
          forgeResult = { text: `Розібрано речей: ${r.done}. Отримано: ${got}. +${fmtNum(r.exp)} досвіду майстерності` + ups +
            (r.left ? ` Не вистачило місця для матеріалів — лишилось нерозібраними: ${r.left}.` : ""), error: r.left > 0 };
          draw();
        });
        allBtn.disabled = !ready.ok || !allIdx.length;
        allBtn.title = allIdx.length ? "" : "Немає речей з відкритим замком, які можна розібрати.";
        list.append(allBtn);
        let any = false;
        save.inventory.forEach((ref, index) => {
          const info = RPG.disassembleInfo(save, index);
          if (!info) return;
          any = true;
          const row = el("div", "forge-row" + (info.locked ? " is-locked" : ""));
          const head = el("div", "forge-head");
          const lm = lockMark(ref);
          head.append(smallIcon(ref), el("strong", "forge-dis-name" + rarityTextClass(ref), RPG.itemFullName(ref)),
            el("small", "forge-tier", `${RARITY_LABEL[info.rarity]} · ${pct(info.share)}`));
          if (lm) head.append(lm);
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
          b.disabled = !ready.ok || info.locked;
          if (info.locked) { b.textContent = "Під замком"; b.title = RPG.LOCKED_REASON; }
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

    return { renderHome, renderRestDistrict };
  };
})(window.RPG);

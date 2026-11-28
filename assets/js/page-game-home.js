// ============================================================
// page-game-home.js — Екран локації: Домівка, власний дім (кузня, склад, бібліотека), Спальний район.
// Частина page-game.js: RPG.gameParts.home(G) викликається з pageGame() і повертає те, що потрібне іншим частинам.
// G — спільне екрана локації: save, msg, place, locData і функції з page-game.js та інших частин
// (G.renderAll, G.renderPlace, G.renderShop…); G.fighting — чи показується бій. Спільні помічники — RPG.ui (game-common.js).
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, fmtNum, guildFeeRange, showMsg, noticeDialog, showParchment, openLibraryBook, showForgeBook, rarityTextClass, lockMark, smallIcon, slotClass, fillItemCell } = RPG.ui;
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
    let forgeTab = "weapon", forgeSpark = false, forgeResult = null, disConfirm = null;
    const forgeTier = {};       // вибраний тір на кожній вкладці кузні: { weapon: 4, armor: 2, armor: "4+", … }
    // Ковадло: вибраний рецепт на кожній вкладці, рідкість матеріалів і покладені креслення для кожного рецепта, кількість підряд
    const forgePick = {}, forgeGrades = {}, forgeBp = {};
    let forgeCount = 1, forgeShowAll = false, matPick = null;   // matPick — клітинка, для якої відкрито вибір: id матеріалу або "bp"
    const STORM_CAT_LEVEL = 45;
    const tierKey = rc => rc.catLevel ? `${rc.tier}+` : rc.tier;          // «Тір 4+» — Штормова сталь (рецепти з catLevel)
    const GRADE_LABEL = { common: "Звичайні", magic: "Магічні", epic: "Епічні", legendary: "Легендарні" };
    const gradeIds = base => RPG.CRAFT_GRADES.map(g => ({ grade: g, id: RPG.materialOfGrade(base, g) })).filter(g => g.grade === "common" || g.id !== RPG.materialBase(base));
    const fmtPct = x => (Math.round(x * 1000) / 10).toLocaleString("uk-UA") + "%";
    function showForge() {
      document.querySelector(".forge-dialog")?.remove();
      const { dlg, closeBtn } = noticeDialog("forge-dialog", () => { forgeResult = null; disConfirm = null; matPick = null; renderAll(); });
      const draw = () => {
        const top = dlg.scrollTop;
        queueMicrotask(() => { dlg.scrollTop = top; });   // після перемальовування прокрутка лишається на місці
        dlg.innerHTML = "";
        const close = closeBtn("Закрити кузню");
        const st = RPG.craftState(save);
        const house = RPG.craftHouse(save);       // власний дім або Горно Сварога (craft.js → craftHouse)
        const next = RPG.craftExpToNext(st.level);
        dlg.append(close, el("h3", null, house?.svarog ? "Горно Сварога — кування" : house?.guild ? "Кузня Гільдії ремісників" : "Кузня"));
        if (house?.svarog) dlg.append(el("p", "forge-why", "Знаряддя Брокка й Ейтрі — усі на місці; вогонь Сварога додає +5% до легендарної."));
        if (house?.guild) dlg.append(el("p", "forge-why", `Знаряддя Кузьми — усі на місці. Плата гільдії за кожне кування — за тіром і видом речі: ${guildFeeRange()} золота (тір 1–7) ` +
          `і +${Math.round(RPG.GUILD_FORGE.extraPct * 100)}% кожного матеріалу понад рецепт (щонайменше +${RPG.GUILD_FORGE.extraMin} шт., матеріалів з босів — +${RPG.GUILD_FORGE.extraMinBoss}). Переплавка й розбір — без плати.`));
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
        drawAnvil(curGroup);
      };
      // ---------- Ковадло (v0.6.27): вибір рецепта → кількість → матеріали під ковадлом → креслення ліворуч → «Кувати» ----------
      // Над ковадлом — рецепти вибраного тіру (спершу ті, на які є все потрібне); під ковадлом — клітинки матеріалів
      // (заповнюються самі, рідкість кожної можна змінити — але не сам матеріал); ліворуч — клітинка креслень-дублікатів (лише вручну).
      const drawAnvil = group => {
        const tiers = [...new Set(Object.entries(RPG.RECIPES).filter(([id]) => group.types.includes(RPG.ITEMS[id]?.type)).map(([, r]) => tierKey(r)))]
          .sort((a, b) => parseFloat(a) - parseFloat(b) || String(a).length - String(b).length);
        const catLevel = RPG.craftCat(save, group.id).level;
        const tierOpen = t => RPG.craftTierOpen ? RPG.craftTierOpen(save, parseInt(t, 10)) : { ok: true };
        const tierNeed = t => String(t).endsWith("+") ? STORM_CAT_LEVEL : RPG.CRAFT_TIER_LEVEL[parseInt(t, 10)];
        if (!tiers.includes(forgeTier[group.id])) {
          const usable = tiers.filter(t => tierOpen(t).ok && catLevel >= tierNeed(t));
          forgeTier[group.id] = usable.length ? usable.at(-1) : tiers[0];
        }
        const curTier = forgeTier[group.id];
        const tierRow = el("div", "forge-tiers");
        for (const t of tiers) {
          const open = tierOpen(t);
          const lvlOk = catLevel >= tierNeed(t);
          const tb = button(`Тір ${t}`, "wf " + (t === curTier ? "wf-button" : "wf-link") + (open.ok ? "" : " is-closed"), () => { forgeTier[group.id] = t; forgeResult = null; forgePick[group.id] = null; matPick = null; draw(); });
          tb.title = !open.ok ? open.reason : lvlOk ? `Тір ${t} відкрито` : `Тір ${t} — з рівня «${group.name}» ${tierNeed(t)}`;
          tierRow.append(tb);
        }
        dlg.append(tierRow);
        const curOpen = tierOpen(curTier);
        if (!curOpen.ok) dlg.append(el("p", "forge-closed-note", curOpen.reason + " Рецепти можна переглянути, але кувати — ні."));
        // Креслення: скільки вивчено (комплекти професій, сталь ванів, Штормова сталь)
        const inTier = Object.entries(RPG.RECIPES).filter(([id, rc]) => tierKey(rc) === curTier && group.types.includes(RPG.ITEMS[id]?.type));
        const bpNote = (list, text) => {
          if (!list.length) return;
          const known = list.filter(([id]) => RPG.knowsRecipe(save, id)).length;
          dlg.append(el("p", "forge-why", text(known, list.length)));
        };
        bpNote(inTier.filter(([id, rc]) => rc.blueprint && RPG.ITEMS[id]?.profSet && RPG.blueprintVisible(save, id)),
          (k, n) => `Комплекти професій: вивчено креслень ${k} з ${n}. Креслення падають з босів Альвгейму; використайте креслення в інвентарі — і рецепт з'явиться тут.`);
        for (const def of Object.values(RPG.TIER_BLUEPRINTS || {})) {
          bpNote(inTier.filter(([id]) => RPG.tierBlueprintDef(id) === def),
            (k, n) => `${def.label}: вивчено креслень ${k} з ${n}. Креслення падають ${def.where} (звичайні вороги — 0,5%, боси — 5%, боси данжів — 10%); використайте креслення в інвентарі — і рецепт з'явиться тут.`);
        }
        // Рецепти над ковадлом: вивчені; спершу ті, на які є все потрібне
        const recipes = inTier.filter(([id, rc]) => !rc.blueprint || RPG.knowsRecipe(save, id)).map(([id]) => ({ id, info: RPG.recipeInfo(save, id) }));
        const ready = recipes.filter(r => r.info.canCraft || r.info.bagFull);
        const shown = forgeShowAll ? recipes : ready;
        const head = el("div", "anvil-recipes-head");
        head.append(el("strong", null, ready.length ? `Оберіть рецепт (доступно ${ready.length} з ${recipes.length}):` : "Оберіть рецепт:"));
        if (recipes.length > ready.length) {
          const l = el("label", "forge-opt");
          const i = el("input"); i.type = "checkbox"; i.checked = forgeShowAll;
          i.addEventListener("change", () => { forgeShowAll = i.checked; draw(); });
          l.append(i, document.createTextNode(" показати й ті, на які бракує матеріалів"));
          head.append(l);
        }
        dlg.append(head);
        if (!forgePick[group.id] || !shown.some(r => r.id === forgePick[group.id])) forgePick[group.id] = shown[0]?.id || null;
        const pickId = forgePick[group.id];
        const grid = el("div", "anvil-recipes");
        if (!shown.length) grid.append(el("p", "forge-why", recipes.length ? "Немає рецептів, на які вистачає матеріалів. Позначте «показати й ті, на які бракує матеріалів», щоб глянути, чого бракує." : "У цьому тірі ще немає вивчених рецептів."));
        for (const { id, info } of shown) {
          const b = button("", "anvil-recipe" + (id === pickId ? " is-selected" : "") + (info.canCraft || info.bagFull ? " is-ready" : " is-short"), () => { forgePick[group.id] = id; matPick = null; forgeResult = null; draw(); });
          b.append(smallIcon(id), el("span", "anvil-recipe-name", RPG.ITEMS[id].name));
          b.title = info.canCraft ? RPG.ITEMS[id].name : `${RPG.ITEMS[id].name} — ${info.reason}`;
          grid.append(b);
        }
        dlg.append(grid);
        if (!pickId) return;
        drawAnvilBench(group, pickId);
      };
      // Ковадло з вибраним рецептом
      const drawAnvilBench = (group, id) => {
        const item = RPG.ITEMS[id], rc = RPG.RECIPES[id];
        const info = RPG.recipeInfo(save, id);
        const rmats = RPG.craftMats(save, id);   // у Гільдії ремісників — з доплатою матеріалів
        const grades = (forgeGrades[id] ??= {});
        // клітинки матеріалів заповнюються самі: найдешевша рідкість, якої вистачає (інакше — звичайна)
        for (const [base, need] of rmats) {
          if (grades[base] && gradeIds(base).some(g => g.grade === grades[base])) continue;
          const ok = gradeIds(base).find(g => RPG.craftCountMat(save, g.id) >= need);
          grades[base] = ok ? ok.grade : "common";
        }
        const slot = RPG.blueprintSlot(save, id);
        if (slot) forgeBp[id] = Math.min(forgeBp[id] || 0, slot.have); else delete forgeBp[id];
        const bpPut = forgeBp[id] || 0;
        const usable = info.canCraft || info.bagFull;
        const max = usable ? RPG.craftMaxCount(save, id, { grades }) : 0;
        const bench = el("div", "anvil-bench");
        // ліворуч — креслення-дублікати
        const bpBox = el("div", "anvil-bp");
        const bpCell = button("", "wf wf-slot anvil-bp-cell" + (bpPut ? " is-filled" : " is-empty") + (matPick === "bp" ? " is-active" : ""), () => { matPick = matPick === "bp" ? null : "bp"; draw(); });
        if (slot && bpPut) fillItemCell(bpCell, slot.id, bpPut);
        bpCell.title = !slot ? "Для цього рецепта креслень немає" : bpPut ? `Покладено креслень: ${bpPut}` : "Покладіть креслення-дублікати цього рецепта";
        bpCell.disabled = !slot;
        bpBox.append(bpCell, el("small", "anvil-bp-label", !slot ? "Креслення не потрібне" : bpPut ? `Креслень: ${bpPut} · +${fmtPct(Math.min(bpPut, RPG.BLUEPRINT_MAX) * RPG.BLUEPRINT_LEGEND_BONUS)} до легендарної` : `Креслення (є ${slot.have})`));
        // посередині — ковадло з річчю
        const anvil = el("div", "anvil");
        const on = el("div", "anvil-item");
        on.append(smallIcon(id));
        anvil.append(on, el("strong", "anvil-name", item.name), el("small", "anvil-tier", `тір ${tierKey(rc)} · рівень ${item.levelReq || 1}`));
        bench.append(bpBox, anvil);
        dlg.append(bench);
        // під ковадлом — матеріали
        const mats = el("div", "anvil-mats");
        for (const [base, need] of rmats) {
          const gid = RPG.materialOfGrade(base, grades[base]);
          const have = RPG.craftCountMat(save, gid);
          const cell = button("", slotClass(gid, "anvil-mat" + (have >= need ? " is-ok" : " is-short") + (matPick === base ? " is-active" : "")), () => { matPick = matPick === base ? null : base; draw(); });
          fillItemCell(cell, gid, 1);
          cell.append(el("span", "anvil-mat-qty", `${fmtNum(have)}/${need}`));
          cell.title = `${RPG.ITEMS[gid].name}: є ${fmtNum(have)}, треба ${need} на річ — натисніть, щоб змінити рідкість`;
          mats.append(cell);
        }
        for (const t of info.tools.filter(t => !t.have)) mats.append(el("span", "forge-mat is-short", `знаряддя: ${RPG.FORGE_TOOLS[t.id].name}`));
        dlg.append(mats);
        // вибір рідкості матеріалу / кількості креслень
        if (matPick === "bp" && slot) {
          const row = el("div", "anvil-choose");
          row.append(el("span", null, `Креслення на ковадлі: ${bpPut} з ${slot.have}. Кожне кування бере до ${RPG.BLUEPRINT_MAX}.`));
          const set = n => () => { forgeBp[id] = Math.max(0, Math.min(slot.have, n)); draw(); };
          row.append(button("−1", "wf wf-link", set(bpPut - 1)), button("+1", "wf wf-link", set(bpPut + 1)), button("+10", "wf wf-link", set(bpPut + 10)),
            button("Усі", "wf wf-link", set(slot.have)), button("Забрати", "wf wf-link", set(0)));
          dlg.append(row);
        } else if (matPick && rmats.some(([b]) => b === matPick)) {
          const need = rmats.find(([b]) => b === matPick)[1];
          const row = el("div", "anvil-choose");
          row.append(el("span", null, `${RPG.ITEMS[matPick].name} — рідкість:`));
          for (const g of gradeIds(matPick)) {
            const n = RPG.craftCountMat(save, g.id);
            const b = button(`${GRADE_LABEL[g.grade]} · ${fmtNum(n)}`, "wf " + (grades[matPick] === g.grade ? "wf-button" : "wf-link") + " anvil-grade rt-" + g.grade, () => { grades[matPick] = g.grade; matPick = null; draw(); });
            if (n < need) b.classList.add("is-short");
            row.append(b);
          }
          dlg.append(row);
        }
        // кількість за одне натискання
        const cnt = el("div", "anvil-count");
        cnt.append(el("span", null, "Кувати підряд:"));
        for (const c of RPG.CRAFT_BATCH) {
          const label = c === "all" ? `Усі (${max})` : String(c);
          const b = button(label, "wf " + (forgeCount === c ? "wf-button" : "wf-link"), () => { forgeCount = c; draw(); });
          cnt.append(b);
        }
        dlg.append(cnt);
        // Небесна іскра та шанси
        const sparks = RPG.craftCountMat(save, "heavenly_spark");
        if (sparks) {
          const l = el("label", "forge-opt");
          const i = el("input"); i.type = "checkbox"; i.checked = forgeSpark;
          i.addEventListener("change", () => { forgeSpark = i.checked; draw(); });
          l.append(i, document.createTextNode(` Додати Небесну іскру в кожне кування (до +10% до легендарної; є ${sparks})`));
          dlg.append(l);
        } else forgeSpark = false;
        if (info.levelOk && info.tierOpen) {
          const odds = RPG.craftOdds(save, id, { grades, spark: forgeSpark, blueprints: Math.min(bpPut, RPG.BLUEPRINT_MAX) });
          dlg.append(el("p", "forge-odds", (bpPut ? "Перше кування: " : "") + ["broken", "common", "magic", "epic", "legendary"]
            .filter(r => odds[r] >= 0.005).map(r => `${RARITY_LABEL[r]} ${fmtPct(odds[r])}`).join(" · ")));
        }
        if (info.fee) dlg.append(el("p", "forge-why", `Плата Гільдії ремісників: ${fmtNum(info.fee)} золота за кожне кування (у вас ${fmtNum(RPG.rootSave(save).character.gold)}).`));
        if (RPG.chestsHere(save).some(cid => RPG.parseCraftChest(cid)?.type === "mat"))
          dlg.append(el("small", "forge-why", "Матеріали беруться з інвентаря і скринь для матеріалів цього дому."));
        const n = forgeCount === "all" ? max : Math.min(forgeCount, Math.max(max, 1));
        const go = button(usable ? `Кувати ×${forgeCount === "all" ? max : forgeCount}` : !info.tierOpen ? "Закрито" : info.levelOk ? "Кувати" : `${group.name} ${info.tierLevel}`, "wf wf-button forge-btn anvil-go", async () => {
          const r = RPG.craftBatch(save, id, forgeCount, { grades, spark: forgeSpark, blueprints: forgeBp[id] || 0 });
          if (!r.ok) {
            forgeResult = { text: r.reason, error: true };
            draw();   // спершу перемалювати: повідомлення лягає у вікно кузні, і перемальовування його б стерло
            if (r.stop === "full") showMsg(msg, "Інвентар повний — немає місця для нових речей.", true);
            return;
          }
          await RPG.saveGame(save);
          forgeBp[id] = Math.max(0, (forgeBp[id] || 0) - r.blueprints);
          const by = {};
          for (const m of r.made) by[m.rarity] = (by[m.rarity] || 0) + 1;
          const parts = ["legendary", "epic", "magic", "common", "broken"].filter(k => by[k]).map(k => `${RARITY_LABEL[k]} ×${by[k]}`);
          const one = r.made.length === 1 ? RPG.itemFullName(r.made[0].ref) : `${item.name} ×${r.made.length}`;
          forgeResult = { text: `Викувано: ${one} (${parts.join(", ")}). +${fmtNum(r.exp)} досвіду майстерності` +
            (r.sparks ? `, Небесних іскор згоріло: ${r.sparks}` : "") + (r.blueprints ? `, креслень витрачено: ${r.blueprints}` : "") +
            (r.fee ? `, плата гільдії −${fmtNum(r.fee)} золота` : "") +
            craftUpsText({ levelUps: r.levelUps, catUps: r.catUps, cat: r.cat }) + (r.stop === "full" ? " Інвентар повний — кування зупинено." : r.stop === "mats" ? ` ${r.reason}` : "") };
          draw();
          if (r.stop === "full") showMsg(msg, `Інвентар повний — викувано ${r.made.length}, кування зупинено.`, true);
        });
        go.disabled = !usable || !n;
        if (!usable && info.reason) go.title = info.reason;
        dlg.append(go);
        if (!info.canCraft && info.levelOk && info.tierOpen) dlg.append(el("small", "forge-why", info.reason));
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
          for (const t of info.s.tools) mats.append(el("span", "forge-mat" + (RPG.craftHouse(save)?.forge?.tools?.[t] ? " is-ok" : " is-short"), `знаряддя: ${RPG.FORGE_TOOLS[t].name}`));
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
          "епічна — 60% + 1 епічний, легендарна — 70% + Небесна іскра. Досвід — за кожен матеріал: 1 / 3 / 8 / 25. Руни з гнізд коваль спершу виймає — вони тріскаються й повертаються зламаними. Розбираються лише речі з інвентаря — рецепт не потрібен; вдягнені спершу зніміть, зі скринь — заберіть в інвентар."));
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
          const runeN = {};                                        // руни з гнізд — зламаними, однакові разом
          for (const id of info.runes) runeN[id] = (runeN[id] || 0) + 1;
          for (const [id, q] of Object.entries(runeN)) mats.append(el("span", "forge-mat is-ok forge-rune", `${RPG.ITEMS[id].name} ×${q}`));
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

    return { renderHome, renderRestDistrict, showForge };
  };
})(window.RPG);

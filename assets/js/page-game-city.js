// ============================================================
// page-game-city.js — Екран локації: Дубова Застава — райони, Торговий район, Горно Сварога, знаряддя кузні, Мерія.
// Частина page-game.js: RPG.gameParts.city(G) викликається з pageGame() і повертає те, що потрібне іншим частинам.
// G — спільне екрана локації: save, msg, place, locData і функції з page-game.js та інших частин
// (G.renderAll, G.renderPlace, G.renderShop…); G.fighting — чи показується бій. Спільні помічники — RPG.ui (game-common.js).
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, fmtNum, showMsg, noticeDialog, showForgeBook, fillItemCell, memberTabs } = RPG.ui;
  RPG.gameParts = RPG.gameParts || {};

  RPG.gameParts.city = function (G) {
    const { save, place, locData, msg, npcCtx, npcResult } = G;
    // Функції з page-game.js та інших частин — через G (частини підключаються по черзі, тому не напряму)
    const renderGuild = (...args) => G.renderGuild(...args);
    const renderNpc = (...args) => G.renderNpc(...args);
    const renderRestDistrict = (...args) => G.renderRestDistrict(...args);
    const renderPlace = (...args) => G.renderPlace(...args);
    const renderAll = (...args) => G.renderAll(...args);
    const renderShop = (...args) => G.renderShop(...args);

    // ---------- Дубова Застава: райони та Гільдія авантюристів ----------
    // Центральний район — з 6 рівня; Дошка оголошень біля Мерії — після особливого завдання «Час дослідити»
    const districtLocked = d => !RPG.isDistrictOpen(save, d);
    // Район, де зараз герой (переходи між районами — дорогою по мапі Дубової Застави)
    const cityDistrict = save.location.district || "south";

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
          const k = o.kind ? RPG.RUNE_KIND_NAME[o.kind].toLowerCase() : `будь-яка з ${Object.keys(RPG.RUNES).length}`;
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
      const profOpen = RPG.getClass(save.character.classId).tier > 1;
      box.append(el("p", "status", `Внесок у Мерію за наступного (${size + 1}-го) героя групи: Селянин — ${fmtNum(cost)} золота. ` +
        `Далі — ${RPG.HIRE_COSTS.slice(size).map(fmtNum).join(" → ")} золота.` + (profOpen
        ? ` Герой з професією — дорожче: +${fmtNum(RPG.HIRE_PROF_FEE)} за професію і +${fmtNum(RPG.HIRE_LEVEL_FEE)} за кожен рівень понад ${RPG.HIRE_FREE_LEVELS}-й.` : "")));
      box.append(noteP(`Оголошення змінюються раз на ${RPG.BOARD_HOURS} годин. ` + (profOpen
        ? `Тут шукають групу Селяни 1–${RPG.RECRUIT_PEASANT_MAX} рівня і герої з професією — до вашого рівня (${save.character.level}).`
        : `Поки у вас немає професії, групу тут шукають лише Селяни 1–${RPG.RECRUIT_PEASANT_MAX} рівня. ` +
          "Коли пройдете «Шлях професії», на дошці з'являться й герої з професією — до вашого рівня.")));
      const can = RPG.canHire(save);
      if (!can.ok && !can.gold) box.append(el("p", "status", can.reason));
      const cards = RPG.boardState(save);
      for (const c of cards) {
        const r = el("div", "shop-row board-card");
        const face = el("span", "party-face board-face");
        Object.assign(face.style, RPG.heroSpriteStyle(c.classId, c.gender));
        const cls = c.classId === RPG.DEFAULT_CLASS && c.gender === "f" ? "Селянка" : RPG.getClass(c.classId).name;
        const price = RPG.hireCost(save, c);
        const name = el("span", "shop-name", `«Шукаю групу. ${c.name}, ${cls}, ${c.level} рівень.»`);
        if (c.gear) name.append(el("small", "board-price rt-" + c.gear, `Спорядження: ${RPG.gearText(c.gear)} свого рівня (зі зброєю).`));
        if (price.prof) name.append(el("small", "board-price", `Внесок: ${fmtNum(price.base)} + ${fmtNum(price.prof)} за професію` +
          (price.levels ? ` + ${fmtNum(price.levels * price.perLevel)} за ${price.levels} рів. понад ${RPG.HIRE_FREE_LEVELS}-й` : "") + "."));
        r.append(face, name);
        const canThis = RPG.canHire(save, c);
        const b = button(`Найняти (${fmtNum(price.total)} зол.)`, "wf wf-button", async () => {
          const res = RPG.hireMember(save, c.name);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `${c.name} приєднується до групи! Внесок у Мерію: ${fmtNum(res.cost)} золота. ` +
            "Налаштувати спорядження — в Інвентарі, атрибути" + (res.member.character.freePoints ? ` (вільних очок: ${res.member.character.freePoints})` : "") +
            " і навички — на сторінці «Персонаж».");
          renderAll();
        });
        b.disabled = !canThis.ok;
        if (!canThis.ok && canThis.gold) b.title = canThis.reason;
        r.append(b);
        box.append(r);
      }
      if (can.ok && cards.length && cards.every(c => !RPG.canHire(save, c).ok)) box.append(el("p", "status", "Не вистачає золота на жодне з оголошень."));
      else if (!can.ok && can.gold) box.append(el("p", "status", can.reason));
      if (!cards.length) box.append(el("p", "status", "Усіх, хто шукав групу, вже найнято."));
      const next = new Date(RPG.boardNextAt());
      const left = Math.max(0, RPG.boardNextAt() - Date.now());
      box.append(el("p", "status", `Нові оголошення — о ${String(next.getHours()).padStart(2, "0")}:00 ` +
        `(через ${Math.floor(left / 3600000)} год ${Math.floor(left / 60000) % 60} хв).`));
    }

    return { renderCity };
  };
})(window.RPG);

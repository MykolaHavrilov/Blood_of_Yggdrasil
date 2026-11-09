// ============================================================
// page-character.js — Екран «Персонаж».
// Частина колишнього game.js: спільне беремо з game-common.js (RPG.ui), запуск — game-main.js.
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, setBar, fmtNum, fmtDate, fmtStat, MSG_SEC, toastParent, raiseToasts, clearToasts, toastHost, showMsg, showNoGame, requireSave, showKeyPocket, showLootFilter, renderFilterBtn, whenNoDialog, queueDialog, noticeClose, noticeDialog, showNotice, journalReward, meetStranger, showParchment, BOOK, bookMotionOff, bookWide, bookBlobs, bookAnimUrl, playBookAnim, dropBookAnim, chronicleSection, showChronicle, forgeBookTable, forgeBookAuto, forgeBookSection, dataBookSection, openLibraryBook, showDataBook, showForgeBook, fieldLootAdd, showFieldLoot, TRAVEL_HREFS, blockLink, lockNavForTravel, unlockNavAfterTravel, showTravelBanner, startRegenTimer, itemLabel, rarityName, itemIcon, rarityTextClass, miniPlaceholder, fillItemCell, socketMarks, SLOT_SHORT, fillEquipCell, smallIcon, slotClass, renderHeroDoll, renderHeroGs, miniBar, renderPartyList, memberTabs, groupMemberTabs, renderHeroBars, expInfo, bindExpInfo, describeStats, describeEffect, useResultText, locImage, TYPE_NAMES, RARITY_NAMES, itemInfo, MSG_MAX } = RPG.ui;

  // ПЕРСОНАЖ
  // ============================================================
  async function pageCharacter() {
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
    function renderMemberTabs() { members.tabs(); }

    const DERIVED = ["hp", "mp", "attack", "magic", "skillPct", "defense", "magicDefense", "speed",
                     "crit", "critDmg", "dodge", "blockPhys", "blockMag", "hpRegen", "mpRegen", "attackSpeedPct", "attackPct"];

    // ---------- Карусель «Атрибути / Характеристики / Розвиток» ----------
    const CAROUSEL_KEY = "rpg.charPage";
    let carouselPage = 0;
    try { carouselPage = Number(localStorage.getItem(CAROUSEL_KEY)) || 0; } catch (e) { /* без сховища */ }
    function showCarousel(i) {
      const pages = document.querySelectorAll("#carousel-track .carousel-page");
      if (!pages.length) return;
      carouselPage = (i + pages.length) % pages.length;
      $("carousel-track").style.transform = `translateX(-${carouselPage * 100}%)`;
      pages.forEach((p, k) => { p.setAttribute("aria-hidden", k !== carouselPage ? "true" : "false"); p.inert = k !== carouselPage; });
      $("carousel-title").textContent = pages[carouselPage].dataset.title;
      document.querySelectorAll(".carousel-dot").forEach((d, k) => {
        d.classList.toggle("is-active", k === carouselPage);
        d.setAttribute("aria-selected", k === carouselPage ? "true" : "false");
      });
      try { localStorage.setItem(CAROUSEL_KEY, String(carouselPage)); } catch (e) { /* без сховища */ }
      fitCarousel();
    }
    // Висота вікна — за поточною сторінкою (без порожнього місця під короткими)
    function fitCarousel() {
      const page = document.querySelectorAll("#carousel-track .carousel-page")[carouselPage];
      const view = document.querySelector("#char-carousel .carousel-view");
      if (page && view) view.style.height = page.offsetHeight + "px";
    }
    window.addEventListener("resize", () => fitCarousel());
    (function setupCarousel() {
      const box = $("char-carousel");
      if (!box) return;
      box.querySelectorAll(".carousel-arrow").forEach(b => b.addEventListener("click", () => showCarousel(carouselPage + Number(b.dataset.step))));
      box.querySelectorAll(".carousel-dot").forEach(b => b.addEventListener("click", () => showCarousel(Number(b.dataset.page))));
      // Гортання пальцем на телефоні/планшеті
      let x0 = null, y0 = 0;
      const view = box.querySelector(".carousel-view");
      view.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      view.addEventListener("touchend", e => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showCarousel(carouselPage + (dx < 0 ? 1 : -1));
      });
      showCarousel(carouselPage);
    })();

    // ---------- Журнал квестів (спільний для групи) ----------
    function renderQuestLog() {
      const box = $("quest-log");
      if (!box) return;
      box.innerHTML = "";
      const log = RPG.questLog(save);
      if (!log.length) {
        box.append(el("p", "status keep", "Розпочатих квестів немає. Завдання дає Артеміда, адміністратор гільдії — Дубова Застава, Південний район."));
        return;
      }
      // На сторінці — перші QUEST_SHOWN квестів; решта — у вікні «Переглянути все»
      for (const q of log.slice(0, QUEST_SHOWN)) box.append(questEntry(q));
      if (log.length > QUEST_SHOWN) {
        box.append(button(`Переглянути все (${log.length})`, "wf wf-secondary quest-all-btn", showAllQuests));
      }
    }
    const QUEST_SHOWN = 3;
    // Комірки навколо героя (варіант В): ліворуч і праворуч, згори вниз
    const { left: DOLL_LEFT, right: DOLL_RIGHT } = RPG.DOLL_SLOTS;   // game-common.js — ті самі й на «Інвентарі»
    function questEntry(q) {
      const item = el("div", "quest-entry" + (q.ready ? " is-ready" : "") + (q.special ? " is-special" : ""));
      item.append(el("strong", "quest-entry-title", q.title));
      for (const line of q.lines) item.append(el("span", "quest-entry-line", line));
      item.append(el("span", "quest-entry-where", (q.ready ? "✔ Готово — здати: " : "Здати: ") + q.where));
      return item;
    }
    // Повний перелік квестів окремим вікном
    function showAllQuests() {
      document.querySelector(".quest-all-dialog")?.remove();
      const { dlg, closeBtn } = noticeDialog("quest-all-dialog");
      const log = RPG.questLog(save);
      const list = el("div", "quest-log quest-log-all");
      for (const q of log) list.append(questEntry(q));
      dlg.append(closeBtn("Закрити"), el("h3", null, `Квести · ${log.length}`), list);
      document.body.append(dlg);
      dlg.showModal();
    }

    // ---------- Підказки «i» для атрибутів і характеристик ----------
    // Що робить характеристика в бою / поза боєм
    const STAT_HELP = {
      hp: "Скільки шкоди герой витримає. Коли здоров'я падає до 0 — герой полягає.",
      mp: "Запас мани для навичок і заклинань.",
      attack: "Сила фізичних ударів зброєю і фізичних навичок.",
      magic: "Сила заклинань і магічних навичок.",
      defense: "Зменшує фізичну шкоду, яку отримує герой.",
      magicDefense: "Зменшує магічну шкоду, яку отримує герой.",
      speed: "Як часто герой ходить у бою. Межа: 250 без професії; 350 — з професією від 25 рівня; 450 — з другою професією від 51 рівня.",
      crit: "Шанс завдати посиленого (критичного) удару.",
      attackPct: "Бонус артефактів: на стільки відсотків зростають і атака, і сила магії.",
      critDmg: "У скільки разів посилюється критичний удар: 150% — це ×1,5 шкоди. Бонус дають лише зброя та сережки. Межа — 250%.",
      dodge: "Шанс повністю ухилитися від фізичного удару.",
      blockPhys: "Шанс заблокувати половину фізичної шкоди.",
      blockMag: "Шанс заблокувати половину магічної шкоди.",
      hpRegen: "Скільки здоров'я відновлюється з часом поза боєм (у Домівці — швидше).",
      mpRegen: "Скільки мани відновлюється з часом поза боєм (у Домівці — швидше).",
      attackSpeedPct: "Бонус володіння зброєю до швидкості.",
      skillPct: "Посилює всі навички однаково: фізичні удари (від Атаки), заклинання (від Сили магії) і лікування. Дають речі (випадковий бонус) і руна Манназ."
    };
    const PASSIVE_KEYS = { hp: "hpPct", mp: "mpPct", attack: "attackPct", magic: "magicPct", defense: "defensePct",
                           magicDefense: "magicDefensePct", speed: "speedPct", crit: "crit", dodge: "dodge" };
    const num1 = v => fmtNum(Math.round(v * 10) / 10);
    const signed = v => (v < 0 ? "−" : "+") + num1(Math.abs(v));

    // Від чого взагалі може залежати характеристика (загальний перелік джерел)
    function statSources(key, cls) {
      const out = [];
      if (cls.baseStats?.[key] || cls.growth?.[key]) out.push("професії та рівня");
      const eff = (RPG.attrEffectsFor ? RPG.attrEffectsFor(ms.character.classId) : RPG.ATTR_EFFECTS)[key];
      const attrs = eff ? [...Object.keys(eff.per || {}), ...(eff.soft || [])] : [];
      if (attrs.length) out.push(attrs.map(a => RPG.ATTRS[a]).join(", "));
      if (key !== "attackSpeedPct") out.push("бонусів речей");
      if (Object.values(RPG.MASTERY_BONUS || {}).some(b => key in b)) out.push("володіння зброєю (Тренер)");
      const pk = PASSIVE_KEYS[key];
      if (pk && Object.values(RPG.SKILLS || {}).some(sk => sk.kind === "passive" && sk.effects && pk in sk.effects)) out.push("пасивних навичок");
      if (Object.values(RPG.ITEM_SETS || {}).some(set => key in (set.bonusPct || {}))) out.push("комплектів речей");
      return out;
    }

    // Кнопка «i» з підказкою (наведення — попередній перегляд, клік / дотик — закріпити)
    function infoButton(label, build) {
      const b = el("button", "info-tip stat-i");
      b.type = "button";
      b.setAttribute("aria-label", label + " — детальніше");
      b.append(el("span", "info-i", "i"));
      RPG.bindTip(b, build, null);
      return b;
    }

    // Підказка атрибута: власне (рівні + вкладені очки) окремо від речей, і на що впливає
    function attrInfo(key, total) {
      const ch = ms.character;
      const fromLevels = RPG.levelAttrs(ms)[key] || 0;
      const invested = ch.attrs[key] || 0;
      const items = [];
      for (const slot in ms.equipment) {
        const v = RPG.itemStats(ms.equipment[slot])[key];
        if (v) items.push([RPG.itemFullName(ms.equipment[slot]), v]);
      }
      const fromItems = items.reduce((sum, [, v]) => sum + v, 0);
      const box = el("div", "info-body stat-info");
      box.append(el("p", "stat-info-head", `${RPG.ATTRS[key]}: ${fmtNum(total[key])}`));
      const own = el("ul", "stat-parts");
      own.append(partRow(`Власна: ${fmtNum(fromLevels + invested)}`, null, "is-sum"));
      own.append(partRow("рівень", fromLevels));
      own.append(partRow("розподілені очки", invested));
      // Бонус від речей — лише якщо якісь вдягнені речі додають цей атрибут (і лише ці речі)
      if (items.length) {
        own.append(partRow(`Бонус від речей: ${signed(fromItems)}`, null, "is-sum"));
        for (const [name, v] of items) own.append(partRow(name, v));
      }
      box.append(own);
      box.append(el("p", "stat-info-sub", "Впливає на:"));
      const eff = el("ul", "stat-parts");
      for (const e of RPG.attrEffects(key, total, ms.character.classId)) {
        eff.append(partRow(RPG.STAT_NAMES[e.key], e.value, "", ["crit", "dodge", "blockPhys", "blockMag", "skillPct", "critDmg", "attackPct"].includes(e.key) ? "%" : ""));
      }
      box.append(eff);
      return box;
    }

    // Рядок розкладу: підпис і значення (зі знаком). value === null — без числа
    function partRow(label, value, cls = "", unit = "") {
      const li = el("li", cls);
      li.append(el("span", null, label));
      if (value !== null && value !== undefined) li.append(el("b", null, signed(value) + unit));
      return li;
    }

    // Підказка характеристики: що робить, з чого складається зараз, від чого залежить
    function statInfo(key, st, trace) {
      const pct = ["crit", "dodge", "blockPhys", "blockMag", "attackSpeedPct"].includes(key) ? "%" : "";
      const box = el("div", "info-body stat-info");
      box.append(el("p", "stat-info-head", `${RPG.STAT_NAMES[key]}: ${fmtStat(key, st[key] || 0)}`));
      box.append(el("p", null, STAT_HELP[key] || ""));
      // Округлення не показуємо — лише параметри, що впливають
      const parts = (trace[key] || []).filter(pt => pt.label !== "Округлення" && Math.abs(pt.value) >= 0.05);
      box.append(el("p", "stat-info-sub", "Складається з:"));
      const list = el("ul", "stat-parts");
      if (parts.length) for (const pt of parts) list.append(partRow(pt.label, pt.value, pt.value < 0 ? "is-neg" : "", pct));
      else list.append(partRow("поки нічого не дає", null, "is-empty"));
      box.append(list);
      const src = statSources(key, RPG.getClass(ms.character.classId));
      if (src.length) box.append(el("p", "note-src", "Залежить від: " + src.join("; ") + "."));
      return box;
    }

    function render() {
      renderMemberTabs();
      renderHeroBars(ms);
      renderQuestLog();
      requestAnimationFrame(fitCarousel);
      const st = RPG.calcStats(ms);
      const ch = ms.character;

      // Атрибути
      const attrBox = $("attrs-list");
      attrBox.innerHTML = "";
      const total = RPG.totalAttrs(ms);
      const cls = RPG.getClass(ch.classId);
      attrBox.append(el("p", ch.freePoints ? "status" : "note", ch.freePoints
        ? `Вільних очок: ${ch.freePoints}. Натисніть «+», щоб вкласти.`
        : `Вільних очок немає. За кожен новий рівень — ${RPG.POINTS_PER_LEVEL}.`));
      const autoTxt = RPG.describeAttrs(cls.levelAttrs);
      if (autoTxt) attrBox.append(noteP(`${cls.name}: за кожен рівень автоматично ${autoTxt}.`));
      for (const key in RPG.ATTRS) {
        const row = el("div", "stat-row");
        // Лише загальна сума; з чого вона складається і на що впливає — у підказці «i»
        row.append(el("span", null, RPG.ATTRS[key]),
          infoButton(RPG.ATTRS[key], () => attrInfo(key, RPG.totalAttrs(ms))),
          el("strong", null, fmtNum(total[key])));
        if (ch.freePoints > 0) {
          const plus = button("+", "wf wf-button attr-plus", async () => {
            if (!RPG.addAttrPoint(ms, key)) return;
            await RPG.saveGame(save);
            render();
          });
          plus.title = `Додати очко: ${RPG.ATTRS[key]}`;
          row.append(plus);
        }
        attrBox.append(row);
      }

      // Бойові характеристики
      const list = $("stats-list");
      list.innerHTML = "";
      const trace = {};
      RPG.calcStats(ms, trace);
      for (const key of DERIVED) {
        if (key === "attackPct" && !st[key]) continue;          // «Атака, %» — лише з артефактами
        const row = el("div", "stat-row");
        row.append(el("span", null, RPG.STAT_NAMES[key]),
          infoButton(RPG.STAT_NAMES[key], () => statInfo(key, st, trace)),
          el("strong", null, fmtStat(key, st[key] || 0)));
        list.append(row);
      }
      // Особливі дії рун у вдягнених речах (бій, золото, досвід) — те, чого не видно в характеристиках
      if (RPG.uiRunesSeen && RPG.runeTotals) {
        const rt = RPG.runeTotals(ms);
        const NAMES = { stun: "Шанс оглушити ворога", burn: "Підпал від атаки (шкода за хід, 3 ходи)", pen: "Пробиття захисту ворога",
          fire: "Додаткова вогняна шкода від атаки", elite: "Шкода по чемпіонах і босах", lifesteal: "Вампіризм",
          curse: "Шанс прокляття (−10% захисту ворога, 3 ходи)", freeze: "Шанс заморозити нападника", thorns: "Шипи (частка отриманої шкоди)",
          undeadRes: "Менше шкоди від нежиті", gold: "Більше золота з боїв (група)", exp: "Більше досвіду за бої", lootRarity: "Шанс вищої рідкості здобичі (група)" };
        const rows = [...Object.entries(rt.battle), ...Object.entries(rt.eco)].filter(([, v]) => v);
        if (rows.length) {
          list.append(el("div", "stat-row stat-sub", "Руни в гніздах"));
          for (const [k, v] of rows) {
            const row = el("div", "stat-row");
            row.append(el("span", null, NAMES[k] || k), el("strong", null, `${k === "undeadRes" ? "−" : "+"}${Math.round(v * 10) / 10}%`));
            list.append(row);
          }
        }
      }

      const info = $("char-info");
      info.innerHTML = "";
      const p = RPG.expProgress(ms);
      const infoRows = [
        ["Професія", RPG.getClass(ch.classId).name],
        ["Рівень", ch.level],
        ["Досвід", p.max ? `${fmtNum(p.exp)} (максимум)` : `${fmtNum(p.exp)} / ${fmtNum(p.nextLevelAt)}`],
        ["Весь здобутий досвід", fmtNum(ch.totalExp)],
        ["Золото", fmtNum(ch.gold)],
        ["Локація", RPG.getLocation(ms.location.map).name],
        ["Переможено ворогів", fmtNum(ch.kills || 0)],
        ["Загибелей", fmtNum(ch.deaths || 0)]
      ];
      // Смертельний режим: скільки життів лишилось у цього героя
      if (ms.hardcore) infoRows.push(["Режим", "Смертельний"], ["Життів лишилось", `${RPG.livesOf(ms)} / ${RPG.HC_LIVES}`]);
      for (const [k, v] of infoRows) {
        const row = el("div", "stat-row");
        row.append(el("span", null, k), el("strong", null, String(v)));
        info.append(row);
        // Під професією — її роль у групі (танк / дамагер / хілер)
        if (k === "Професія" && RPG.classRoles(ch.classId).length) {
          const rr = el("div", "stat-row");
          const tags = el("strong", null);
          tags.append(RPG.roleTags(ch.classId));
          rr.append(el("span", null, "Роль"), tags);
          info.append(rr);
        }
      }

      // Вдягнені речі навколо героя (варіант В): по 8 комірок ліворуч і праворуч від картинки.
      // Артефакти — з професією; без неї комірки видно, але вони приглушені (підказка — чому).
      const artOpen = !!RPG.hasArtifactSlots?.(ms);
      const dollCol = (box, list) => {
        if (!box) return;
        box.innerHTML = "";
        for (const slot of list) {
          const ref = ms.equipment[slot];
          const item = RPG.ITEMS[RPG.refId(ref)];
          const cell = el("div", item ? slotClass(ref, "equip-cell") : "wf wf-slot equip-cell slot-empty");
          fillEquipCell(cell, ref, slot);
          if (item) RPG.bindTip(cell, () => itemInfo(ref, 1, ms), () => [
            { text: "Змінити в інвентарі", className: "wf-link", onClick: () => { location.href = "inventory.html"; } }
          ]);
          else {
            const locked = slot.startsWith("artifact") && !artOpen;
            if (locked) cell.classList.add("is-locked");
            cell.title = locked ? "Комірки артефактів відкриваються з професією." : `${RPG.SLOTS[slot]}: порожньо`;
          }
          box.append(cell);
        }
      };
      dollCol($("doll-left"), DOLL_LEFT);
      dollCol($("doll-right"), DOLL_RIGHT);

      // Володіння зброєю та вивчені навички
      const mBox = $("mastery-list");
      if (mBox) {
        mBox.innerHTML = "";
        const cap = RPG.masteryCap(ms);
        const wtype = RPG.weaponTypeOf(ms);
        const own = RPG.masteryTypes(ms);
        // Усі види зброї разом — через «i» (і ті, якими професія не користується)
        const allRow = el("div", "stat-row");
        allRow.append(el("span", null, own.length < Object.keys(RPG.WEAPON_TYPES).length ? "Володіння вашої професії" : "Володіння зброєю"),
          infoButton("Усі рівні володіння зброєю", () => {
            const box = el("div", "info-body stat-info");
            box.append(el("p", "stat-info-head", "Усі рівні володіння зброєю"));
            const ul = el("ul", "stat-parts");
            for (const [t, wt] of Object.entries(RPG.WEAPON_TYPES)) {
              const lv = RPG.masteryProgress(ms, t).level;
              ul.append(partRow(wt.mastery + (own.includes(t) ? "" : " (не для вашої професії)"), null));
              ul.lastChild.append(el("b", null, `${lv} / ${cap}`));
            }
            box.append(ul);
            return box;
          }));
        mBox.append(allRow);
        for (const [t, wt] of Object.entries(RPG.WEAPON_TYPES)) {
          if (!own.includes(t)) continue;
          const pr = RPG.masteryProgress(ms, t);
          const row = el("div", "stat-row");
          row.append(el("span", null, wt.mastery + (t === wtype ? " (у руках)" : "")),
                     el("strong", null, `${pr.level} / ${cap}` + (pr.need ? ` · ${Math.floor(pr.exp)}/${pr.need}` : "")));
          row.title = pr.need ? `Досвід володіння: ${Math.floor(pr.exp)} з ${pr.need} до рівня ${pr.level + 1}. Росте за виграні бої.` : "Найвищий рівень володіння.";
          mBox.append(row);
        }
        const learned = Object.entries(ch.skills || {}).filter(([, l]) => l > 0);
        mBox.append(noteP(learned.length
          ? "Навички: " + learned.map(([id, l]) => `${RPG.SKILLS[id]?.name || id} ${l}`).join(", ")
          : "Навичок ще немає. Тренер Брут — у Гільдії авантюристів (Дубова Застава, Південний район)."));
      }
    }

    render();
    startRegenTimer(save, () => renderHeroBars(ms));
  }

  // ============================================================

  RPG.pages.pageCharacter = pageCharacter;
})(window.RPG);

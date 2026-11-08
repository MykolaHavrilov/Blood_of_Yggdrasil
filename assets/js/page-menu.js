// ============================================================
// page-menu.js — Екрани меню: нова гра, завантаження, налаштування.
// Частина колишнього game.js: спільне беремо з game-common.js (RPG.ui), запуск — game-main.js.
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, setBar, fmtNum, fmtDate, fmtStat, MSG_SEC, toastParent, raiseToasts, clearToasts, toastHost, showMsg, showNoGame, requireSave, showKeyPocket, showLootFilter, renderFilterBtn, whenNoDialog, queueDialog, noticeClose, noticeDialog, showNotice, journalReward, meetStranger, showParchment, BOOK, bookMotionOff, bookWide, bookBlobs, bookAnimUrl, playBookAnim, dropBookAnim, chronicleSection, showChronicle, forgeBookTable, forgeBookAuto, forgeBookSection, dataBookSection, openLibraryBook, showDataBook, showForgeBook, fieldLootAdd, showFieldLoot, TRAVEL_HREFS, blockLink, lockNavForTravel, unlockNavAfterTravel, showTravelBanner, startRegenTimer, itemLabel, rarityName, itemIcon, rarityTextClass, miniPlaceholder, fillItemCell, socketMarks, SLOT_SHORT, fillEquipCell, smallIcon, slotClass, renderHeroDoll, renderHeroGs, miniBar, renderPartyList, memberTabs, groupMemberTabs, renderHeroBars, expInfo, bindExpInfo, describeStats, describeEffect, useResultText, locImage, TYPE_NAMES, RARITY_NAMES, itemInfo, MSG_MAX } = RPG.ui;

  function pageNewGame() {
    const form = $("new-game-form");
    const msg = $("msg");
    const intro = $("intro-panel");
    const gender = () => form.elements.gender?.value === "f" ? "f" : "m";
    function drawIntro() {
      if (!intro || !RPG.CHRONICLE) return;
      intro.innerHTML = "";
      intro.append(el("h2", "intro-title", "Кров Іггдрасиля"));
      RPG.CHRONICLE.intro(gender()).forEach(p => intro.append(el("p", "intro-p", p)));
      intro.hidden = false;
    }
    drawIntro();
    form.querySelectorAll("input[name=gender]").forEach(r => r.addEventListener("change", drawIntro));
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const name = form.elements.name.value.trim();
      if (!name) { showMsg(msg, "Введіть ім'я персонажа.", true); return; }
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        const save = RPG.createNewSave(name, undefined, gender());
        await RPG.saveGame(save);
        RPG.setCurrentSlot(save.id);
        location.href = "game.html";
      } catch (e) {
        console.error(e);
        showMsg(msg, "Не вдалося створити гру: " + e.message, true);
        btn.disabled = false;
      }
    });
  }

  // ============================================================
  // ЗАВАНТАЖИТИ ГРУ
  // ============================================================
  async function pageLoad() {
    const list = $("save-list");
    const msg = $("msg");

    async function render() {
      list.innerHTML = "";
      let saves = [];
      try { saves = await RPG.listSaves(); }
      catch (e) { console.error(e); showMsg(msg, "Помилка читання збережень: " + e.message, true); }

      if (!saves.length) {
        list.append(el("div", "wf wf-text", "Збережень поки немає"));
        return;
      }
      const current = RPG.getCurrentSlot();
      for (const s of saves) {
        const row = el("div", "save-row");
        const cls = RPG.getClass(s.character?.classId).name;
        const place = RPG.getLocation(s.location?.map).name;
        const btn = button("", "wf wf-link save-load", () => {
          RPG.setCurrentSlot(s.id);
          location.href = "game.html";
        });
        btn.append(el("strong", null, `${s.character?.name || "Герой"} — ${cls}, рівень ${s.character?.level || 1}`));
        btn.append(el("span", "save-date",
          `${place} · збережено: ${fmtDate(s.savedAt)}${s.id === current ? " · поточна гра" : ""}`));

        const del = button("Видалити", "wf wf-danger save-del", async () => {
          if (!confirm(`Видалити збереження «${s.character?.name}»? Цю дію не можна скасувати.`)) return;
          await RPG.deleteSave(s.id);
          render();
        });
        del.title = "Видалити це збереження";

        row.append(btn, del);
        list.append(row);
      }
    }

    $("import-btn").addEventListener("click", async () => {
      const file = await RPG.pickJsonFile();
      if (!file) return;
      try {
        const save = await RPG.importSave(file);
        showMsg(msg, `Імпортовано: ${save.character.name}, рівень ${save.character.level}.`);
        render();
      } catch (e) {
        showMsg(msg, e.message, true);
      }
    });

    render();
  }

  // ============================================================
  // НАЛАШТУВАННЯ
  // ============================================================
  async function pageSettings() {
    const msg = $("msg");
    const settings = RPG.getSettings();

    // Мова: зберегти й перезавантажити сторінку — переклад даних робиться під час завантаження (i18n.js)
    const langSel = $("lang-select");
    if (langSel) {
      langSel.value = RPG.lang;
      langSel.addEventListener("change", () => {
        RPG.setSettings({ lang: langSel.value });
        location.reload();
      });
    }

    document.querySelectorAll('input[name="battle-mode"]').forEach(radio => {
      radio.checked = radio.value === settings.battleView;
      radio.addEventListener("change", () => {
        if (radio.checked) {
          RPG.setSettings({ battleView: radio.value });
          showMsg(msg, "Налаштування збережено.");
        }
      });
    });

    // Гучність: загальна, музика, звуки (audio.js). Змінюється одразу, зберігається при відпусканні
    const VOL = [["volume", "volume", 70], ["music-volume", "musicVolume", 60], ["sfx-volume", "sfxVolume", 80]];
    for (const [id, key, def] of VOL) {
      const input = $(id), out = $(id + "-value");
      if (!input) continue;
      const v = settings[key] != null ? settings[key] : def;
      input.value = v;
      out.textContent = v + "%";
      input.addEventListener("input", () => {
        out.textContent = input.value + "%";
        RPG.setSettings({ [key]: Number(input.value) });
        RPG.audio?.applyVolume();
      });
      input.addEventListener("change", () => {
        if (key === "sfxVolume") RPG.audio?.sfx("sword");
        showMsg(msg, "Налаштування збережено.");
      });
    }
    const mute = $("mute");
    if (mute) {
      mute.checked = !!settings.muted;
      mute.addEventListener("change", () => {
        RPG.setSettings({ muted: mute.checked });
        RPG.audio?.applyVolume();
        showMsg(msg, "Налаштування збережено.");
      });
    }

    // ---------- Автозілля (core.js → getAutoPotion, character.js → autoPotion) ----------
    // Окреме вікно: два блоки (здоров'я, мана) + спільні параметри. Зберігається на пристрої, не в сейві.
    const SIZE_NAMES = { auto: "Авто — найменше, якого вистачить", small: "Мале", medium: "Середнє", large: "Велике" };
    function autoPotionSummary() {
      const c = RPG.getAutoPotion();
      const side = (s, name) => (c[s].on
        ? `${name}: нижче ${c[s].below}% — пити до ${c[s].upTo}% (${c[s].size === "auto" ? "авто" : SIZE_NAMES[c[s].size].toLowerCase()}, ` +
          `до ${c[s].maxPer} за раз${c[s].magic ? ", з Чарівним" : ""})`
        : `${name}: вимкнено`);
      const box = $("autopotion-summary");
      if (box) box.textContent = `${side("hp", "Здоров'я")}. ${side("mp", "Мана")}. Діє на цьому пристрої для всіх збережень.`;
    }
    function openAutoPotion() {
      const c = RPG.getAutoPotion();
      let dlg = $("autopotion-dialog");
      if (!dlg) { dlg = el("dialog", "autopotion-dialog"); dlg.id = "autopotion-dialog"; document.body.append(dlg); }
      dlg.innerHTML = "";
      const form = el("div", "stack");
      const range = (label, min, max, step, value, fmt = v => v + "%") => {
        const wrap = el("label", "field");
        const cap = el("span"), val = el("b", null, fmt(value));
        cap.append(label + " ", val);
        const input = el("input");
        Object.assign(input, { type: "range", min, max, step, value });
        input.addEventListener("input", () => { val.textContent = fmt(input.value); });
        wrap.append(cap, input);
        return { wrap, input };
      };
      const check = (label, on) => {
        const wrap = el("label", "choice"), input = el("input");
        input.type = "checkbox"; input.checked = on;
        wrap.append(input, document.createTextNode(" " + label));
        return { wrap, input };
      };
      const block = (key, title) => {
        const s = c[key];
        const box = el("fieldset", "panel stack autopotion-side");
        box.append(el("legend", null, title));
        const on = check("Увімкнено", s.on);
        const below = range("Пити, коли нижче", 5, 95, 5, s.below);
        const upTo = range("Пити, поки не стане", 10, 100, 5, Math.max(s.upTo, s.below));
        // Ціль не може бути меншою за поріг
        below.input.addEventListener("input", () => { if (+upTo.input.value < +below.input.value) { upTo.input.value = below.input.value; upTo.input.dispatchEvent(new Event("input")); } });
        upTo.input.addEventListener("input", () => { if (+upTo.input.value < +below.input.value) { below.input.value = upTo.input.value; below.input.dispatchEvent(new Event("input")); } });
        const sizeWrap = el("label", "field");
        const size = el("select");
        for (const [v, n] of Object.entries(SIZE_NAMES)) { const o = el("option", null, n); o.value = v; size.append(o); }
        size.value = s.size;
        sizeWrap.append(el("span", null, "Розмір зілля"), size);
        const fallback = check("Якщо обраного розміру немає — брати інший", s.fallback);
        const sync = () => { fallback.wrap.hidden = size.value === "auto"; };
        size.addEventListener("change", sync); sync();
        const maxPer = range(`Не більше зілль ${key === "hp" ? "здоров'я" : "мани"} за раз для одного героя`, 1, 20, 1, s.maxPer, v => String(v));
        const magic = check(`Дозволити Чарівне зілля (лише коли звичайних зілль ${key === "hp" ? "здоров'я" : "мани"} немає)`, s.magic);
        box.append(on.wrap, below.wrap, upTo.wrap, sizeWrap, fallback.wrap, maxPer.wrap, magic.wrap);
        form.append(box);
        return () => ({ on: on.input.checked, below: +below.input.value, upTo: +upTo.input.value, size: size.value,
          fallback: fallback.input.checked, maxPer: +maxPer.input.value, magic: magic.input.checked });
      };
      const readHp = block("hp", "Здоров'я (HP)");
      const readMp = block("mp", "Мана (MP)");
      form.append(
        noteP("Перевірка — перед кожним боєм і після нього, для кожного живого героя групи. Зілля беруться лише з інвентаря. " +
          "Останнє зілля може відновити трохи більше за ціль. У данжі зілля не діють."));
      const row = el("div", "dialog-actions");
      row.append(button("Зберегти", "wf wf-button", () => {
        RPG.setSettings({ autoPotion: { hp: readHp(), mp: readMp() } });
        dlg.close();
        autoPotionSummary();
        showMsg(msg, "Налаштування автозілля збережено.");
      }), button("Скасувати", "wf wf-link", () => dlg.close()));
      dlg.append(el("h2", null, "Автозілля"), form, row);
      dlg.showModal();
    }
    autoPotionSummary();
    $("autopotion-btn")?.addEventListener("click", openAutoPotion);

    const exportBtn = $("export-btn");
    const current = await RPG.loadCurrentGame().catch(() => null);

    // Рядок коду: «god.mod» — Сфера Богів у інвентар поточної гри (одна на збереження);
    // «god.mod.off» — прибрати сферу з гри (з інвентаря й скринь);
    // «open.admin» — Печатка Адміністратора (вікно адміністрування), «open.admin.off» — прибрати її. Будь-який інший текст нічого не виконує.
    const codeForm = $("code-form"), codeInput = $("code-input");
    if (codeForm) {
      codeForm.addEventListener("submit", async ev => {
        ev.preventDefault();
        const code = codeInput.value.trim().toLowerCase();
        codeInput.value = "";
        codeInput.placeholder = "код";
        const ADMIN = { "open.admin": 1, "open.admin.off": 1 };
        if (code !== "god.mod" && code !== "god.mod.off" && !ADMIN[code]) { showMsg(msg, "Невірний код.", true); return; }
        const s = await RPG.loadCurrentGame().catch(() => null);
        if (!s) { showMsg(msg, "Немає активної гри.", true); return; }
        if (ADMIN[code]) {                       // Печатка Адміністратора (data/items.js → admin_seal)
          const offA = code === "open.admin.off";
          const r = offA ? RPG.removeAdminSeal(s) : RPG.grantAdminSeal(s);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(s);
          showMsg(msg, offA ? "Печатку Адміністратора прибрано з гри." : "Печатка Адміністратора — в інвентарі.");
          return;
        }
        const off = code === "god.mod.off";
        const r = off ? RPG.removeGodsOrb(s) : RPG.grantGodsOrb(s);
        if (!r.ok) { showMsg(msg, r.reason, true); return; }
        await RPG.saveGame(s);
        showMsg(msg, off ? "Сферу Богів прибрано з гри." : "Сфера Богів — в інвентарі.");
      });
    }
    if (!current) {
      exportBtn.disabled = true;
      exportBtn.title = "Немає активної гри";
    }
    exportBtn.addEventListener("click", async () => {
      const save = await RPG.loadCurrentGame();
      if (!save) { showMsg(msg, "Немає активної гри для експорту.", true); return; }
      RPG.exportSave(save);
      showMsg(msg, "Файл збереження завантажується.");
    });

    $("import-btn").addEventListener("click", async () => {
      const file = await RPG.pickJsonFile();
      if (!file) return;
      try {
        const save = await RPG.importSave(file);
        RPG.setCurrentSlot(save.id);
        exportBtn.disabled = false;
        // Гра завантажена — «Назад» поведе на сторінку персонажа (menu.js)
        document.body.dataset.gameLoaded = "1";
        showMsg(msg, `Імпортовано й обрано поточною грою: ${save.character.name}, рівень ${save.character.level}.`);
      } catch (e) {
        showMsg(msg, e.message, true);
      }
    });
  }

  // ============================================================

  RPG.pages.pageNewGame = pageNewGame;
  RPG.pages.pageLoad = pageLoad;
  RPG.pages.pageSettings = pageSettings;
})(window.RPG);

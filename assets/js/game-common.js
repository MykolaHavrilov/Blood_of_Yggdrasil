// ============================================================
// game-common.js — спільні помічники, вікна, предмети й герой для всіх екранів гри.
// Частина колишнього game.js: спільне беремо з game-common.js (RPG.ui), запуск — game-main.js.
// ============================================================

(function (RPG) {

  // ---------- Допоміжні функції ----------

  function $(id) { return document.getElementById(id); }

  // Створює елемент: el("div", "wf wf-slot", "текст")
  const el = RPG.el;   // спільний помічник (core.js)
  const noteP = text => el("p", "note", text);   // абзац-примітка (клас note)

  // Значки ролей професії: «Танк» «Хілер» (data/classes.js → ROLES; Селянин — порожній span)
  function roleTags(classId) {
    const box = el("span", "role-tags");
    for (const r of RPG.classRoles(classId)) box.append(el("span", `role-tag role-${r}`, RPG.ROLES[r].name));
    return box;
  }
  RPG.roleTags = roleTags;

  function link(text, href, className = "wf wf-link") {
    const a = el("a", className, text);
    a.href = href;
    return a;
  }

  function button(text, className, onClick) {
    const b = el("button", className, text);
    b.type = "button";
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }

  // Встановлює ширину смужки HP / MP / EXP і її підпис.
  function setBar(bar, current, max, label) {
    if (!bar) return;
    current = Math.floor(current);
    const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    bar.style.setProperty("--value", percent + "%");
    const lbl = bar.querySelector(".bar-label");
    if (lbl) lbl.textContent = label || `${bar.dataset.name} ${current} / ${max}`;
  }

  function fmtNum(n) { return Number(n).toLocaleString("uk-UA"); }

  function fmtDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("uk-UA", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  function fmtStat(key, value) {
    const pct = ["crit", "dodge", "blockPhys", "blockMag", "skillPct"].includes(key);
    return fmtNum(value) + (pct ? "%" : "");
  }

  // Повідомлення / помилка — у невеликому спливаючому віконці посеред екрана (main.css → .toast).
  // Закривається хрестиком або само через MSG_SEC секунд; кілька повідомлень стають стовпчиком (до MSG_MAX).
  // node — старий параметр (блок #msg унизу сторінки), більше не використовується: виклики showMsg(msg, …) лишились як є.
  // Контейнер — popover: так віконце видно й поверх відкритих діалогів (showModal); без підтримки popover — position: fixed.
  // Поки відкритий модальний діалог, решта сторінки неактивна (inert) — тож віконце кладемо всередину
  // верхнього відкритого діалогу; коли той закривається — повідомлення зникають разом із ним.
  const MSG_SEC = 1.5, MSG_MAX = 1;   // 1,5 с; нове повідомлення замінює попереднє
  let noticeRec = null;               // запис «Сповіщення» поточного відкриття сторінки (журнал бою)
  let toastBox = null;
  function toastParent() {
    const open = [...document.querySelectorAll("dialog")].filter(d => { try { return d.matches(":modal"); } catch (e) { return false; } });
    return open.length ? open[open.length - 1] : document.body;
  }
  function raiseToasts() {   // перемістити до потрібного батька й підняти на самий верх
    const host = toastBox;
    if (!host || !host.children.length) return;
    const parent = toastParent();
    const isPop = !!host.showPopover;
    if (isPop && host.matches(":popover-open")) { try { host.hidePopover(); } catch (e) {} }
    if (host.parentNode !== parent) parent.append(host);
    if (isPop) { try { host.showPopover(); } catch (e) {} }
  }
  function clearToasts() {   // прибрати всі повідомлення й сховати віконце
    const host = toastBox;
    if (!host) return;
    for (const t of [...host.children]) { clearTimeout(t._t); t.remove(); }
    if (host.hidePopover) { try { host.hidePopover(); } catch (e) {} }
    if (host.parentNode !== document.body) document.body.append(host);
  }
  function toastHost() {
    if (toastBox) return toastBox;
    toastBox = el("div", "toast-host");
    toastBox.id = "toast-host";
    if (toastBox.showPopover) toastBox.setAttribute("popover", "manual");
    document.body.append(toastBox);
    // діалог закрився — повідомлення в ньому зникають теж
    document.addEventListener("close", ev => {
      if (ev.target.tagName === "DIALOG" && ev.target.contains(toastBox)) clearToasts();
    }, true);
    // новий діалог відкрився, поки віконце видно, — віконце переходить у нього (інакше опиниться під діалогом)
    const D = window.HTMLDialogElement && HTMLDialogElement.prototype;
    if (D && D.showModal && !D.showModal._toast) {
      const orig = D.showModal;
      D.showModal = function () { const r = orig.apply(this, arguments); raiseToasts(); return r; };
      D.showModal._toast = true;
    }
    return toastBox;
  }
  function showMsg(node, text, isError) {
    if (!text) return;
    const host = toastHost();
    const box = el("div", "toast" + (isError ? " toast-error" : ""));
    box.setAttribute("role", isError ? "alert" : "status");
    const close = el("button", "toast-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Закрити");
    box.append(el("span", "toast-text", text), close);
    const remove = () => {
      clearTimeout(box._t);
      box.remove();
      if (!host.children.length && host.hidePopover) { try { host.hidePopover(); } catch (e) {} }
    };
    close.addEventListener("click", remove);
    box._t = setTimeout(remove, MSG_SEC * 1000);
    host.append(box);
    while (host.children.length > MSG_MAX) { clearTimeout(host.firstChild._t); host.firstChild.remove(); }
    // Текст — і в журнал бою (запис «Сповіщення»; зберігається разом із грою)
    const save = RPG.currentSave;
    if (save && RPG.journalAdd) {
      if (!noticeRec || !(save.battleLog || []).includes(noticeRec)) noticeRec = RPG.journalAdd(save, { kind: "notice", lines: [] });
      noticeRec.lines.push(["info", text, isError ? "m" : ""]);
    }
    raiseToasts();   // показати (або підняти на самий верх, якщо після попереднього повідомлення відкрився діалог)
  }

  // Якщо активної гри немає — замість сторінки показуємо підказку
  function showNoGame() {
    const main = document.querySelector("main");
    main.innerHTML = "";
    const box = el("div", "panel stack narrow");
    box.append(el("h2", null, "Немає активної гри"));
    box.append(el("p", null, "Створіть нового персонажа або завантажте збереження."));
    box.append(link("Нова гра", "new-game.html"), link("Завантажити гру", "load.html"),
               link("Головне меню", "../index.html"));
    main.append(box);
  }

  // Завантажує поточну гру й одразу нараховує відновлення за час відсутності
  async function requireSave() {
    try {
      const save = await RPG.loadCurrentGame();
      if (!save) { showNoGame(); return null; }
      RPG.currentSave = save;                        // для сповіщень → журнал бою
      // старий сейв: зайва річ з лівої руки — в інвентар (для кожного героя групи)
      const fixed = RPG.partyMembers(save).map(ms => RPG.fixHands(ms)).some(Boolean);
      const arrived = RPG.finishTravel(save);          // дорога скінчилась, поки гра була закрита
      const expMoved = RPG.expeditionTick ? RPG.expeditionTick(save) : false;   // бої експедиції за час відсутності
      if (RPG.applyRegenAll(save) || fixed || arrived || expMoved) await RPG.saveGame(save);
      // У дорозі доступні лише «Персонаж», «Інвентар» і «Мапа»
      if (RPG.isTraveling(save)) {
        const page = document.body.dataset.page;
        if (!RPG.TRAVEL_PAGES.includes(page)) { location.replace("maps.html"); return null; }
        lockNavForTravel();
        if (page !== "maps") showTravelBanner(save);
      }
      // Поки експедиція в дорозі — як у дорозі: лише «Персонаж», «Інвентар» і «Мапа» (expedition.js)
      else if (RPG.expeditionActive?.(save)) {
        const page = document.body.dataset.page;
        if (!RPG.TRAVEL_PAGES.includes(page)) { location.replace("maps.html"); return null; }
        lockNavForTravel("Недоступно, поки експедиція в дорозі", EXPEDITION_HREFS);
        showExpeditionBanner(save, page !== "maps");
      }
      return save;
    } catch (e) {
      console.error(e);
      showNoGame();
      return null;
    }
  }

  // ---------- Кишеня для ключів (dungeon.js): вікно зі списком ключів, без картинок ----------
  // Показуються лише ключі, які є: повна назва і кількість n/1000
  function showKeyPocket(save) {
    const keys = RPG.keyPocket(save).filter(k => k.count > 0);
    if (!keys.length) return showNotice("Кишеня для ключів", ["Ключів поки немає."], "is-keys");
    const list = el("ul", "key-pocket");
    for (const k of keys) {
      const li = el("li", "key-row" + (k.count >= RPG.KEY_MAX ? " is-full" : ""));
      li.append(el("strong", "key-name", k.name), el("b", "key-count", `${k.count}/${RPG.KEY_MAX}`));
      list.append(li);
    }
    return showNotice("Кишеня для ключів", [list], "is-keys");
  }

  // ---------- Фільтр здобичі (rarity.js → lootFilter): автоматичне викидання речей за рідкістю ----------
  // Зміни зберігаються одразу. onChange — оновити вигляд кнопки-воронки.
  function showLootFilter(save, onChange) {
    const f = RPG.lootFilter(save);
    const store = () => { RPG.saveGame(save).catch(e => console.error(e)); onChange?.(); };

    const power = el("label", "loot-filter-power");
    const onBox = document.createElement("input");
    onBox.type = "checkbox";
    onBox.id = "loot-filter-on";
    onBox.checked = f.on;
    const state = el("b", "loot-filter-state");
    power.append(onBox, el("span", null, "Фільтр увімкнено"), state);

    const list = el("ul", "loot-filter-list");
    const boxes = {};
    for (const r of RPG.RARITY_ORDER) {
      const li = el("li", "loot-filter-row rarity-" + r);
      const lab = el("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.dataset.rarity = r;
      box.checked = f.drop[r];
      boxes[r] = box;
      const name = el("span", "loot-filter-name", RPG.RARITIES[r].name);
      name.style.color = RPG.RARITIES[r].color;
      lab.append(box, name);
      li.append(lab);
      list.append(li);
      box.addEventListener("change", () => { f.drop[r] = box.checked; sync(); store(); });
    }
    function sync() {
      state.textContent = f.on ? (RPG.lootFilterActive(save) ? "Працює" : "Оберіть рідкість") : "Вимкнено";
      state.classList.toggle("is-on", RPG.lootFilterActive(save));
      list.classList.toggle("is-off", !f.on);
    }
    onBox.addEventListener("change", () => { f.on = onBox.checked; sync(); store(); });
    sync();

    const note = noteP("Позначені рідкості зброї та броні, що випадуть у бою, одразу викидаються " +
      "і не займають місця в інвентарі. Речі, які вже лежать в інвентарі, ключі, зілля й матеріали фільтр не чіпає.");
    return showNotice("Фільтр здобичі", [power, list, note], "is-loot-filter");
  }

  // Кнопка-воронка: підсвічена, коли фільтр реально викидає речі
  function renderFilterBtn(btn, save) {
    if (!btn) return;
    const on = RPG.lootFilterActive(save);
    btn.classList.toggle("is-on", on);
    const t = on
      ? "Фільтр здобичі: увімкнено (" + RPG.RARITY_ORDER.filter(r => save.lootFilter.drop[r]).map(r => RPG.RARITIES[r].name).join(", ") + ")"
      : "Фільтр здобичі: вимкнено";
    btn.title = t;
    btn.setAttribute("aria-label", t);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  // ---------- Окреме повідомлення (вікно), що закривається лише хрестиком ----------
  // Повертає Promise, який виконується після закриття.
  // Черга вікон: вікна, що з'являються самі (повідомлення, «Увага — чемпіон!»), не відкриваються
  // одне на одне — кожне чекає, доки закриються всі інші відкриті вікна, і показується по черзі.
  // open() — відкриває вікно й повертає його (або null — показувати вже нічого).
  // Повертає проміс, що виконується, коли це вікно закрили.
  let dialogQueue = Promise.resolve();
  function whenNoDialog() {
    return new Promise(resolve => {
      const check = () => (document.querySelector("dialog[open]") ? setTimeout(check, 150) : resolve());
      check();
    });
  }
  function queueDialog(open) {
    const p = dialogQueue.then(whenNoDialog).then(() => new Promise(resolve => {
      const dlg = open();
      if (!dlg || !dlg.open) { resolve(); return; }
      dlg.addEventListener("close", () => resolve(), { once: true });
    }));
    dialogQueue = p.catch(e => console.error(e));
    return p;
  }

  // Хрестик «×» вікна гри (клас notice-close); extraCls — додатковий клас (наприклад chronicle-close)
  function noticeClose(label = "Закрити", onPress, extraCls = "") {
    const c = button("×", "notice-close" + (extraCls ? " " + extraCls : ""), onPress);
    c.setAttribute("aria-label", label);
    return c;
  }

  // Спільний каркас вікон гри: <dialog>, що після закриття видаляється з DOM; onClose — додаткова дія.
  // За замовчуванням клас notice-dialog; opts.base — інший базовий клас ("" — без нього), opts.closeCls — клас хрестика.
  function noticeDialog(cls = "", onClose, opts = {}) {
    const base = opts.base ?? "notice-dialog";
    const dlg = el("dialog", (base ? base + " " : "") + cls);
    dlg.addEventListener("close", () => { dlg.remove(); if (onClose) onClose(); });
    const closeBtn = (label, onPress = () => dlg.close()) => noticeClose(label, onPress, opts.closeCls);
    return { dlg, closeBtn };
  }

  function showNotice(title, lines, cls = "") {
    return queueDialog(() => {
      const { dlg, closeBtn } = noticeDialog(cls);
      dlg.append(closeBtn(), el("h3", null, title));
      for (const l of lines) dlg.append(typeof l === "string" ? el("p", null, l) : l);
      dlg.addEventListener("cancel", ev => ev.preventDefault());     // Esc не закриває — лише хрестик
      document.body.append(dlg);
      dlg.showModal();
      return dlg;
    });
  }

  // ---------- Журнал бою: нагорода за завдання (journal.js) ----------
  function journalReward(save, title, text) {
    if (RPG.journalAdd) RPG.journalAdd(save, { kind: "quest", lines: [["title", title, "win"], ["info", text]] });
  }

  // ---------- Незнайомець зі сферою (квест «Долоні Велеса», 12 рівень) ----------
  async function meetStranger(save) {
    if (!RPG.velesGiveOrb(save)) return;
    await RPG.saveGame(save);
    return showNotice("Незнайомець", [
      "До вас підходить хтось у запиленому плащі з глибоким каптуром — обличчя не видно. Він ніби випадково зачіпає вас плечем " +
      "і щось тихо кладе вам у торбу. «Тобі воно потрібніше», — чуєте ви шепіт, а коли обертаєтеся, незнайомця вже й слід простиг.",
      "У торбі — важка куля з темного каменю, тепла на дотик. На одному боці — глибоке заглиблення у формі ромба.",
      "Отримано: Дивна сфера (квестовий предмет). Розпитайте людей, що це може бути.",
    ]);
  }

  // ---------- Відречений (секретний квест «Шлях відреченого», Селянин 30 рівня) ----------
  async function meetRenouncer(save) {
    if (!RPG.shamanMeet(save)) return;
    await RPG.saveGame(save);
    return showNotice("Незнайомець у запиленому плащі", [
      "Знайома постать у запиленому плащі виринає з натовпу й зупиняється просто перед вами. Цього разу каптур відкинуто: " +
      "сиве, хоч і не старе обличчя, а по шиї й щоках — темні, ніби обвуглені, візерунки.",
      "«Скільки вже зим ти ходиш без шляху. Ні меча гільдії, ні посоха чародія, ні молитви. Я теж колись відрікся від усіх доріг, " +
      "що пропонували боги. А потім побачив, скільки горя принесла війна Хелли, — і повернувся до коренів. Та повернувся не чистим.»",
      "«Знайди мене в Храмі, у тіні за вівтарем. Якщо готовий дізнатися, ким може стати той, хто відрікся, — поговоримо.»",
      "Новий квест: «Шлях відреченого»."
    ]);
  }

  // ---------- Обірваний пергамент (Домівка) ----------
  function showParchment() {
    const P = RPG.CHRONICLE.PARCHMENT;
    document.querySelector(".parchment-dialog")?.remove();
    const { dlg, closeBtn } = noticeDialog("parchment-dialog", null, { base: "", closeCls: "chronicle-close" });
    const close = closeBtn();
    const sheet = el("article", "parchment-sheet");
    sheet.append(el("h2", "chronicle-title", P.title));
    P.paras.forEach((p, i) => sheet.append(el("p", "chronicle-p" + (i === 0 ? " is-initial" : "") + (i === P.paras.length - 1 ? " is-cut" : ""), p)));
    sheet.append(el("p", "parchment-torn", P.torn));
    sheet.append(el("p", "parchment-keep", "Ви обережно згортаєте клапоть і ховаєте в торбу."));
    dlg.append(close, sheet);
    document.body.append(dlg);
    dlg.showModal();
  }

  // ---------- Книга «Предки Минулих та Майбутніх часів» (data/chronicle.js) ----------
  // 2.5D-книга з рендерів Blender (assets/images/book/): на широкому екрані — розворот,
  // зміст на лівій сторінці, текст глави — на правій; анімації відкриття, гортання й відновлення.
  // На телефоні (≤700px) — пергаментна книга як раніше: зміст зверху, сторінка знизу
  // (програються лише анімації відкриття й відновлення).
  const BOOK = {
    dir: "assets/images/book/",
    spread: "book_spread.webp",            // розворот (чисті сторінки)
    torn: "book_spread_torn.webp",         // розворот з обгорілими корінцями вирваної сторінки
    // [файл, тривалість у мс] — анімації програються один раз і зупиняються на останньому кадрі
    anims: {
      open: ["book_open.webp", 2700],
      next: ["book_flip_next.webp", 1350],
      prev: ["book_flip_prev.webp", 1350],
      manyNext: ["book_flip_many_next.webp", 2020],
      manyPrev: ["book_flip_many_prev.webp", 2020],
      restore: ["book_restore.webp", 4710]
    }
  };

  const bookMotionOff = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bookWide = () => !window.matchMedia("(max-width: 700px)").matches;
  const bookBlobs = {};
  // URL, з якого анімація гарантовано стартує з першого кадру (кожен показ — новий URL)
  async function bookAnimUrl(file) {
    const url = RPG.asset(BOOK.dir + file);
    if (location.protocol !== "file:") {
      try {
        if (!bookBlobs[file]) {
          const r = await fetch(url);
          if (!r.ok) throw new Error(r.status);
          bookBlobs[file] = await r.blob();
        }
        return URL.createObjectURL(bookBlobs[file]);
      } catch (e) { /* без мережі й кешу — звичайне посилання */ }
    }
    return url + (url.includes("?") ? "&" : "?") + "play=" + Date.now();
  }
  // Програти анімацію в шарі layer. onShow — коли з'явився перший кадр.
  // Повертає <img> на останньому кадрі (прибрати його — справа викликача) або null.
  function playBookAnim(layer, name, onShow) {
    const [file, ms] = BOOK.anims[name];
    return new Promise(resolve => {
      if (bookMotionOff()) return resolve(null);
      const img = new Image();
      img.className = "book-anim";
      img.alt = "";
      let done = false, timer = 0, shown = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        layer.classList.remove("is-active");
        layer.removeEventListener("click", finish);
        resolve(shown ? img : null);
      };
      img.onload = () => {
        if (done) return;
        shown = true;
        layer.append(img);
        layer.classList.add("is-active");
        if (onShow) onShow(img);
        timer = setTimeout(finish, ms);
      };
      img.onerror = finish;
      layer.addEventListener("click", finish);          // клік — пропустити анімацію
      timer = setTimeout(finish, 6000);                 // повільне завантаження — не чекаємо
      bookAnimUrl(file).then(src => { img.src = src; });
    });
  }
  function dropBookAnim(img) {
    if (!img) return;
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    img.remove();
  }

  // Вміст розділу книги: "toc" — зміст, "prologue" — Пролог, інакше — глава (id з CHAPTERS).
  // go(key) — перехід на розділ (для кнопок змісту), glow — золоте сяйво відновлених абзаців.
  function chronicleSection(save, key, { go, glow = false, torn = false, paged = false } = {}) {
    const C = RPG.CHRONICLE;
    const frag = document.createDocumentFragment();
    const add = (...nodes) => nodes.forEach(n => frag.append(n));
    if (key === "toc") {
      add(el("div", "chronicle-cover", C.TITLE));
      add(el("p", "chronicle-epigraph",
        "Ніхто не пише в ній чорнилом: щойно герой здолає великого ворога, сторінки наповнюються самі."));
      const list = el("nav", "chronicle-toc-list");
      for (const c of RPG.chronicleContents(save)) {
        if (!c.open) { list.append(el("span", "chronicle-toc-item is-sealed", `${c.title} — запечатано`)); continue; }
        list.append(button(c.title, "chronicle-toc-item", () => go(c.key)));
      }
      add(list);
      // Права сторінка змісту — віньєтка (лише в книзі-розвороті)
      if (paged) add(el("div", "book-col-break"), el("div", "book-vignette", "❦"),
        el("p", "book-vignette-text", "Так нащадки знатимуть, хто проливав кров, щоб зупинити кров Іггдрасиля."));
      return frag;
    }
    if (key === "prologue") {
      const pr = RPG.prologueFor(save);
      add(el("h2", "chronicle-title", C.PROLOGUE.title));
      if (pr.torn) {
        add(el("p", "chronicle-torn", "Перших сторінок Прологу бракує — їх вирвано, лишилися тільки обгорілі корінці."));
        // У книзі-розвороті корінці вирваної сторінки — на правій сторінці: текст продовжується вже після них
        if (paged && torn) add(el("div", "book-col-break"), el("div", "book-torn-spacer"));
      }
      pr.paras.forEach((p, i) => {
        const restored = glow && i < C.PARCHMENT.paras.length;
        add(el("p", "chronicle-p" + (i === 0 && !pr.torn ? " is-initial" : "") + (restored ? " is-restored" : ""), p));
      });
      return frag;
    }
    const ch = C.CHAPTERS.find(c => c.id === key);
    add(el("h2", "chronicle-title", ch.title), el("p", "chronicle-region", ch.region));
    add(el("p", "chronicle-p is-initial", ch.intro));
    ch.bosses.forEach(b => {
      const e = RPG.chronicleEntry(save, b.dungeon);
      const sec = el("section", "chronicle-entry");
      if (!e) {
        sec.append(el("p", "chronicle-blank", "Ця сторінка ще чиста. Її напише перемога, якої поки не було…"));
        add(sec);
        return;
      }
      const t = RPG.chronicleBossEntry(b.dungeon, e);
      sec.append(el("h3", "chronicle-sub", t.title), el("p", "chronicle-date", t.date));
      const roster = el("ul", "chronicle-roster");
      t.roster.forEach(r => roster.append(el("li", null, r)));
      sec.append(roster);
      t.lines.forEach(l => sec.append(el("p", "chronicle-p", l)));
      if (t.wins > 1) sec.append(el("p", "chronicle-note", `Відтоді цей данж пройдено ще ${t.wins - 1} раз(ів).`));
      sec.append(el("p", "chronicle-mark" + (b.final ? " is-final" : ""), `✦ ${b.mark} ✦`));
      add(sec);
    });
    if (ch.bosses.every(b => RPG.chronicleEntry(save, b.dungeon))) {
      add(el("p", "chronicle-p chronicle-ending", ch.ending), el("p", "chronicle-end", "— Кінець глави —"));
    }
    return frag;
  }

  // opts.book — інша книга в тому ж вікні: { title, cls, contents(save) → [{ key, title, open }], section(save, key, o) }
  // (за замовчуванням — літопис Захара). Обгорілі корінці Прологу — лише в літописі.
  function showChronicle(save, startKey = "prologue", opts = {}) {
    document.querySelector(".chronicle-dialog")?.remove();
    const src = opts.book || { title: RPG.CHRONICLE.TITLE, contents: RPG.chronicleContents, section: chronicleSection, torn: true };
    const wide = bookWide();
    const { dlg, closeBtn } = noticeDialog("chronicle-dialog" + (wide ? " is-3d" : "") + (src.cls ? " " + src.cls : ""), null, { base: "", closeCls: "chronicle-close" });
    dlg.lang = "uk";
    const close = closeBtn("Закрити книгу");
    const book = el("div", "chronicle-book");
    const plate = el("div", "book-plate");          // картинка розвороту
    const layer = el("div", "book-anim-layer");     // анімації поверх книги
    book.append(plate);
    dlg.append(close, book);
    const restoring = !!opts.restoring;
    let busy = false;
    const reveal = wide ? initPaged() : initScroll();
    book.append(layer);

    // ---------- Телефон: зміст зверху, сторінка з прокруткою (як раніше) ----------
    function initScroll() {
      const toc = el("nav", "chronicle-toc");
      const page = el("article", "chronicle-page");
      book.append(toc, page);
      let key = startKey, glow = restoring;
      const keys = () => src.contents(save).filter(c => c.open).map(c => c.key);
      const go = k => { key = k; draw(); };
      function draw() {
        toc.innerHTML = "";
        toc.append(el("div", "chronicle-cover", src.title));
        for (const c of src.contents(save)) {
          if (!c.open) { toc.append(el("span", "chronicle-toc-item is-sealed", `${c.title} — запечатано`)); continue; }
          toc.append(button(c.title, "chronicle-toc-item" + (c.key === key ? " is-current" : ""), () => go(c.key)));
        }
        page.innerHTML = "";
        page.append(src.section(save, key, { go, glow }));
        glow = false;
        const ks = keys(), i = ks.indexOf(key);
        const nav = el("div", "row chronicle-nav");
        const prev = button("◂ Попередня", "wf wf-link", () => go(ks[i - 1]));
        const next = button("Наступна ▸", "wf wf-link", () => go(ks[i + 1]));
        prev.disabled = i <= 0;
        next.disabled = i >= ks.length - 1;
        nav.append(prev, next);
        page.append(nav);
        page.scrollTop = 0;
      }
      return draw;
    }

    // ---------- Широкий екран: розворот, текст тече по двох сторінках, гортання розворотами ----------
    // Розділи: зміст + відкриті Пролог і глави. Кожен розділ починається з нового розвороту.
    function initPaged() {
      const spread = el("div", "book-spread");     // обидві сторінки (з перспективою під картинку)
      const flow = el("div", "book-flow");         // колонки = сторінки
      spread.append(flow);
      const footL = el("div", "book-foot is-left"), footR = el("div", "book-foot is-right");
      const prevB = button("◂", "book-turn", () => turn(-1));
      const nextB = button("▸", "book-turn", () => turn(1));
      prevB.setAttribute("aria-label", "Попередній розворот");
      nextB.setAttribute("aria-label", "Наступний розворот");
      const tocB = button("Зміст", "book-tocbtn", () => jump("toc", 0));
      const numL = el("span", "book-num"), numR = el("span", "book-num");
      footL.append(prevB, numL, tocB);
      footR.append(numR, nextB);
      book.append(spread, footL, footR);

      const sections = () => ["toc", ...src.contents(save).filter(c => c.open).map(c => c.key)];
      let secs = sections();
      let key = secs.includes(startKey) ? startKey : (secs[1] || "toc");
      let sp = 0;                                  // розворот усередині розділу
      let counts = {};                             // розділ → кількість розворотів
      let glow = restoring;
      let geo = null;
      const isTornSpread = () => !!src.torn && key === "prologue" && sp === 0 && RPG.prologueFor(save).torn;

      function measure() {
        const w = book.clientWidth, h = book.clientHeight;
        if (!w || !h) return false;
        // Перспектива: верх сторінок на картинці вужчий за низ (≈0.936) — нахиляємо текст так само
        const sh = h * 0.88;
        spread.style.transform = `perspective(${(sh * 2.5).toFixed(1)}px) rotateX(9.85deg)`;
        const W = spread.clientWidth;
        const colW = W * (39.49 / 86.67), gap = W - 2 * colW;
        const fs = Math.max(13, Math.min(19, w * 0.0152));
        flow.style.columnCount = "2";              // (не column-width: при точному збігу ширин браузер дає 1 колонку)
        flow.style.columnGap = gap + "px";
        flow.style.fontSize = fs + "px";
        geo = { W, colW, gap, H: flow.clientHeight };
        dlg.style.setProperty("--book-colh", geo.H + "px");
        dlg.style.setProperty("--book-colw", colW + "px");
        return true;
      }
      function fill(k) {
        flow.innerHTML = "";
        flow.append(src.section(save, k, { go: kk => jump(kk, 0), glow: k === "prologue" && glow, torn: true, paged: true }));
        flow.scrollLeft = 0;
        const cols = Math.max(1, Math.round((flow.scrollWidth + geo.gap) / (geo.colW + geo.gap)));
        return Math.ceil(cols / 2);
      }
      function layout() {
        if (!measure()) return;
        secs = sections();
        counts = {};
        for (const k of secs) counts[k] = fill(k);
        sp = Math.min(sp, counts[key] - 1);
        show();
      }
      // Номер сторінки по всій книзі (зміст без номерів, Пролог починається зі сторінки 1)
      function pageNo() {
        let n = 0;
        for (const k of secs) {
          if (k === key) break;
          if (k !== "toc") n += counts[k] * 2;
        }
        return key === "toc" ? 0 : n + sp * 2 + 1;
      }
      function show() {
        fill(key);
        if (key === "prologue") glow = false;
        flow.scrollLeft = sp * (geo.W + geo.gap);
        const p = pageNo();
        numL.textContent = p ? String(p) : "";
        numR.textContent = p ? String(p + 1) : "";
        const gi = globalIndex(key, sp);
        prevB.disabled = gi <= 0;
        nextB.disabled = gi >= totalSpreads() - 1;
        tocB.hidden = key === "toc";
        plate.style.backgroundImage = `url("${RPG.asset(BOOK.dir + (isTornSpread() ? BOOK.torn : BOOK.spread))}")`;
      }
      const totalSpreads = () => secs.reduce((a, k) => a + (counts[k] || 1), 0);
      function globalIndex(k, s) {
        let n = 0;
        for (const kk of secs) { if (kk === k) return n + s; n += counts[kk] || 1; }
        return n;
      }
      function fromGlobal(g) {
        for (const k of secs) { const c = counts[k] || 1; if (g < c) return [k, g]; g -= c; }
        const last = secs[secs.length - 1];
        return [last, (counts[last] || 1) - 1];
      }
      async function jump(k, s) {
        if (busy) return;
        const from = globalIndex(key, sp), to = globalIndex(k, s);
        if (from === to) return;
        if (bookMotionOff()) { key = k; sp = s; show(); return; }
        busy = true;
        book.classList.add("is-turning");
        const fwd = to > from, many = Math.abs(to - from) > 1;
        const img = await playBookAnim(layer, many ? (fwd ? "manyNext" : "manyPrev") : (fwd ? "next" : "prev"),
          () => { plate.style.backgroundImage = `url("${RPG.asset(BOOK.dir + BOOK.spread)}")`; });
        key = k; sp = s;
        show();
        dropBookAnim(img);
        book.classList.remove("is-turning");
        busy = false;
      }
      function turn(d) {
        const g = globalIndex(key, sp) + d;
        if (g < 0 || g >= totalSpreads()) return;
        const [k, s] = fromGlobal(g);
        jump(k, s);
      }
      dlg.addEventListener("keydown", e => {
        if (e.key === "ArrowRight") { e.preventDefault(); turn(1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); turn(-1); }
      });
      let rz = 0;
      const ro = new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { if (!busy) layout(); }); });
      dlg.addEventListener("close", () => ro.disconnect());
      return () => { layout(); ro.observe(book); };
    }

    // Відкриття книги (і, якщо віддали пергамент, — зрощення сторінки), потім текст
    async function intro() {
      if (bookMotionOff()) { reveal(); return; }
      busy = true;
      book.classList.add("is-opening");
      if (wide) plate.style.backgroundImage = `url("${RPG.asset(BOOK.dir + (restoring ? BOOK.torn : BOOK.spread))}")`;
      let img = await playBookAnim(layer, "open");
      if (restoring && dlg.isConnected) {
        const prevImg = img;
        img = await playBookAnim(layer, "restore", () => dropBookAnim(prevImg));
        if (!img) dropBookAnim(prevImg);
      }
      if (!dlg.isConnected) return;
      busy = false;
      book.classList.remove("is-opening");
      reveal();
      dropBookAnim(img);
    }

    document.body.append(dlg);
    dlg.showModal();
    intro();
  }

  // ---------- Книга «Небесна кузня. Настанова» (data/books.js) — те саме вікно-книга, що й літопис ----------
  // Таблиці { auto: … } будуються з даних гри (рецепти, знаряддя, шанси, ціни), тож книга завжди збігається з грою.
  function forgeBookTable(head, rows, cls = "") {
    const t = el("table", "fbook-table" + (cls ? " " + cls : ""));
    if (head) { const tr = el("tr"); head.forEach(h => tr.append(el("th", null, h))); const th = el("thead"); th.append(tr); t.append(th); }
    const tb = el("tbody");
    for (const r of rows) {
      const tr = el("tr");
      r.forEach(c => { const td = el("td"); if (c instanceof Node) td.append(c); else td.textContent = c; tr.append(td); });
      tb.append(tr);
    }
    t.append(tb);
    return t;
  }
  function forgeBookAuto(kind) {
    const pc = x => `${Math.round(x * 100)}%`;
    const gold = n => `${fmtNum(n)} зол.`;
    const frag = document.createDocumentFragment();
    if (kind === "recipes") {
      for (const g of RPG.RECIPE_GROUPS) {
        frag.append(el("p", "fbook-group", g.name));
        const rows = [];
        for (const tier of Object.keys(RPG.CRAFT_TIER_LEVEL).map(Number)) {
          const ids = Object.keys(RPG.RECIPES).filter(id => RPG.RECIPES[id].tier === tier && g.types.includes(RPG.ITEMS[id]?.type));
          if (!ids.length) continue;
          const mats = [...new Set(ids.flatMap(id => RPG.RECIPES[id].mats.map(([m]) => RPG.ITEMS[m]?.name.toLowerCase())))];
          const cell = el("span", null, ids.map(id => RPG.ITEMS[id].name).join(", "));
          cell.append(el("small", "fbook-mats", mats.join(", ")));
          rows.push([`${tier} (з ${RPG.CRAFT_TIER_LEVEL[tier]})`, cell]);
        }
        frag.append(forgeBookTable(["Тір (рівень)", "Речі й матеріали"], rows, "is-recipes"));
      }
    } else if (kind === "tools") {
      frag.append(forgeBookTable(["Знаряддя", "Для чого", "Ціна, зол."], Object.values(RPG.FORGE_TOOLS).map(t => {
        const n = el("strong", null, t.name);
        if (t.need) n.append(el("small", "fbook-mats", "обов'язкове"));
        return [n, t.text + (t.for ? ` Потрібне для: ${t.for}.` : ""), fmtNum(t.price)];
      }), "is-priced"));
    } else if (kind === "ranks") {
      frag.append(forgeBookTable(["Звання", "Рівні", "Успіх"], [["Учень", 1, 9], ["Підмайстер", 10, 19], ["Майстер", 20, 29], ["Небесний коваль", 30, 30]]
        .map(([n, a, b]) => [n, a === b ? String(a) : `${a}–${b}`, a === b ? pc(RPG.baseCraftChance(a)) : `${pc(RPG.baseCraftChance(a))}–${pc(RPG.baseCraftChance(b))}`])));
    } else if (kind === "cats") {
      frag.append(forgeBookTable(["Вид", "Що входить", "Тіри (рівень виду)"], RPG.RECIPE_GROUPS.map(g => {
        const tiers = [...new Set(Object.keys(RPG.RECIPES).filter(id => g.types.includes(RPG.ITEMS[id]?.type)).map(id => RPG.RECIPES[id].tier))].sort();
        const what = { weapon: "зброя для правої й лівої руки", armor: "уся броня", jewel: "кільця, амулети, сережки" }[g.id] || "";
        return [g.name, what, tiers.map(t => `${t} — з ${RPG.CRAFT_TIER_LEVEL[t]}`).join(", ") + `; максимум ${RPG.craftCatMaxLevel(g.id)}`];
      })));
    } else if (kind === "odds") {
      const R = ["broken", "common", "magic", "epic", "legendary"];
      const head = ["Рів.", "Успіх", ...R.map(r => { const s = el("span", "rt-" + r, RPG.RARITIES[r].name.slice(0, 4) + "."); s.title = RPG.RARITIES[r].name; return s; })];
      const t = forgeBookTable(null, [1, 5, 10, 15, 20, 25, 30].map(L => {
        const b = RPG.baseCraftChance(L), tab = RPG.craftRarityTable(L, b);
        return [String(L), pc(b), ...R.map(r => pc(tab[r]))];
      }), "is-odds");
      const thead = el("thead"), tr = el("tr");
      head.forEach(h => { const th = el("th"); if (h instanceof Node) th.append(h); else th.textContent = h; tr.append(th); });
      thead.append(tr); t.prepend(thead);
      frag.append(t);
    } else if (kind === "prices") {
      const C = RPG.CRAFT_CHESTS;
      frag.append(forgeBookTable(["Що", "Ціна"], [
        ["Дім на околиці", gold(RPG.HOUSES.oak.price)], ["Склад", gold(RPG.WAREHOUSE_PRICE)], ["Кузня", gold(RPG.FORGE_PRICE)],
        [C.mat.name, gold(C.mat.price)], [C.pot.name, gold(C.pot.price)], [C.item.name, gold(C.item.price)],
        ["Ця книга", gold(RPG.FORGE_BOOK.price)]
      ], "is-priced"));
    } else if (kind === "chests") {
      const rows = [["Скриня Домівки (спільна)", "50", "як в інвентарі", "1"]];
      for (const [k, c] of Object.entries(RPG.CRAFT_CHESTS)) rows.push([`${c.name} (${RPG.CRAFT_CHEST_ALLOW_TEXT[k]})`, String(c.size), c.stack > 1 ? `${fmtNum(c.stack)} шт` : "1 річ", String(c.max)]);
      frag.append(forgeBookTable(["Скриня", "Комірок", "У комірці", "Скринь"], rows));
    } else if (kind.startsWith("runes:")) {
      // Руни одного виду з data/runes.js: значок (іконка руни), назва, значення знака, ефект і сила за рідкістю
      const want = kind.slice(6);
      const R = ["common", "magic", "epic", "legendary"];
      for (const pan of ["norse", "slavic"]) {
        const list = Object.entries(RPG.RUNES || {}).filter(([, r]) => r.kind === want && r.pantheon === pan);
        if (!list.length) continue;
        if (want !== "universal") frag.append(el("p", "fbook-group", pan === "norse" ? "Скандинавські знаки Футарка — дар Асгарду" : "Слов'янські знаки — дар Ірію"));
        for (const [key, r] of list) {
          const card = el("section", "fbook-rune");
          const icon = el("span", "fbook-rune-icon");
          Object.assign(icon.style, RPG.itemIconStyle(RPG.runeItemId(key)) || {});
          icon.setAttribute("role", "img");
          icon.setAttribute("aria-label", `Знак ${r.name}`);
          const body = el("div", "fbook-rune-body");
          body.append(el("strong", "fbook-rune-name", r.name), el("small", "fbook-mats", r.meaning), el("span", "fbook-rune-fx", r.effect));
          const vals = el("span", "fbook-rune-vals");
          R.forEach((g, i) => vals.append(el("span", "rt-" + g, r.vals[i])));
          body.append(vals);
          card.append(icon, body);
          frag.append(card);
        }
      }
    } else if (kind === "disassemble") {
      const extra = { broken: "—", common: "—", magic: "1 магічний матеріал", epic: "1 епічний матеріал", legendary: "Небесна іскра" };
      frag.append(forgeBookTable(["Рідкість речі", "Назад", "Додатково"], Object.entries(RPG.DISASSEMBLE_SHARE).map(([r, sh]) =>
        [el("span", "rt-" + r, RPG.RARITIES[r].name), pc(sh), extra[r]])));
    }
    return frag;
  }
  // Розділ книги з даних (data/books.js): FORGE_BOOK, GODS_BOOK… — B передається через bookFrom(B)
  function forgeBookSection(save, key, opts = {}) { return dataBookSection(RPG.FORGE_BOOK, key, opts); }
  function dataBookSection(B, key, { go, paged = false } = {}) {
    const frag = document.createDocumentFragment();
    if (key === "toc") {
      frag.append(el("p", "fbook-kicker", B.kicker), el("div", "chronicle-cover", B.title), el("p", "chronicle-epigraph", B.epigraph));
      const list = el("nav", "chronicle-toc-list");
      for (const sct of B.sections) list.append(button(sct.title, "chronicle-toc-item", () => go(sct.key)));
      frag.append(list, el("p", "fbook-authors", B.authors));
      if (paged) frag.append(el("div", "book-col-break"), el("div", "book-vignette", B.vignetteSign || "⚒"), el("p", "book-vignette-text", B.vignette));
      return frag;
    }
    const sct = B.sections.find(x => x.key === key);
    if (!sct) return frag;
    frag.append(el("h2", "chronicle-title", sct.title));
    // буквиця — лише в першому абзаці, що відкриває розділ (одразу після назви чи епіграфа)
    sct.blocks.forEach((b, i) => {
      if (b.p) frag.append(el("p", "chronicle-p" + (i === 0 || (i === 1 && sct.blocks[0].quote) ? " is-initial" : ""), b.p));
      else if (b.quote) frag.append(el("p", "chronicle-epigraph", b.quote));
      else if (b.h) frag.append(el("h3", "chronicle-sub fbook-h", b.h));
      else if (b.ol || b.ul) { const l = el(b.ol ? "ol" : "ul", "fbook-list"); (b.ol || b.ul).forEach(x => l.append(el("li", null, x))); frag.append(l); }
      else if (b.table) frag.append(forgeBookTable(b.table.head, b.table.rows));
      else if (b.note) frag.append(el("p", "chronicle-note", b.note));
      else if (b.end) frag.append(el("p", "chronicle-end", b.end));
      else if (b.auto) frag.append(forgeBookAuto(b.auto));
      else if (b.god) {
        const sec = el("section", "fbook-god");
        const rel = el("p", "chronicle-p fbook-rel");
        rel.append(el("strong", null, "Стосунки: "), document.createTextNode(b.rel || ""));
        sec.append(el("h3", "chronicle-sub fbook-h", b.god), el("p", "chronicle-p", b.sphere || ""), rel);
        frag.append(sec);
      }
    });
    return frag;
  }
  // Відкрити книгу з бібліотеки за id (data/books.js → LIBRARY)
  function openLibraryBook(save, id) {
    if (id === "chronicle") showChronicle(save);
    else if (id === "forge") showForgeBook(save);
    else if (id === "gods") showDataBook(save, RPG.GODS_BOOK, "world", "is-gods-book");
    else if (id === "runes") {
      // прочитана книга рун — гравець починає бачити гнізда в речах (оновлення рун)
      if (!save.books?.runesRead) { RPG.addToLibrary(save, "runesRead"); RPG.saveGame(save).catch(e => console.error(e)); }
      RPG.uiRunesSeen = true;
      showDataBook(save, RPG.RUNE_BOOK, "word", "is-rune-book");
    }
  }
  // Будь-яка книга з даних у вікні-книзі (як літопис)
  function showDataBook(save, B, startKey, cls = "") {
    if (!B) return;
    showChronicle(save, startKey, { book: {
      title: B.title, cls,
      contents: () => B.sections.map(x => ({ key: x.key, title: x.title, open: true })),
      section: (sv, key, o) => dataBookSection(B, key, o)
    } });
  }
  function showForgeBook(save, startKey = "prologue") {
    if (!RPG.FORGE_BOOK) return;
    showChronicle(save, startKey, { book: {
      title: RPG.FORGE_BOOK.title, cls: "is-forge-book",
      contents: () => RPG.FORGE_BOOK.sections.map(x => ({ key: x.key, title: x.title, open: true })),
      section: forgeBookSection
    } });
  }

  // ---------- Здобич на полі бою (save.fieldLoot) ----------
  // Поки герой б'ється на одній локації, усе здобуте складається; при виході з неї
  // (перед дорогою або після загибелі) показується окреме вікно з підсумком.
  function fieldLootAdd(save, add) {
    const locId = save.location.map;
    let f = save.fieldLoot;
    if (!f || f.loc !== locId) f = save.fieldLoot = { loc: locId, battles: 0, wins: 0, exp: 0, gold: 0, items: {}, lost: {}, filtered: {} };
    f.filtered ??= {};
    f.battles++;
    if (add.win) f.wins++;
    f.exp += add.exp || 0;
    f.gold += add.gold || 0;
    for (const [k, n] of Object.entries(add.items || {})) f.items[k] = (f.items[k] || 0) + n;
    for (const [k, n] of Object.entries(add.lost || {})) f.lost[k] = (f.lost[k] || 0) + n;
    for (const [k, n] of Object.entries(add.filtered || {})) f.filtered[k] = (f.filtered[k] || 0) + n;
  }
  // Показати підсумок і очистити. Повертає Promise (виконується після закриття вікна або одразу, якщо нічого немає)
  async function showFieldLoot(save) {
    const f = save.fieldLoot;
    if (!f) return;
    delete save.fieldLoot;
    await RPG.saveGame(save).catch(e => console.error(e));
    if (!f.battles) return;
    const name = RPG.LOCATIONS[f.loc]?.name || f.loc;
    const lines = [`Боїв: ${f.battles}, перемог: ${f.wins}.`, `Досвід: +${fmtNum(f.exp)} EXP · Золото: +${fmtNum(f.gold)}`];
    const items = Object.entries(f.items);
    const list = el("ul", "notice-list");
    for (const [k, n] of items) list.append(el("li", null, n > 1 ? `${k} ×${n}` : k));
    lines.push(items.length ? "Речі й ресурси:" : "Речей і ресурсів не здобуто.");
    if (items.length) lines.push(list);
    const lost = Object.entries(f.lost);
    const filtered = Object.values(f.filtered || {}).reduce((a, n) => a + n, 0);
    if (filtered) lines.push(`Фільтр здобичі викинув речей: ${fmtNum(filtered)}.`);
    if (lost.length) lines.push(`Не вмістилось в інвентар і пропало: ${lost.map(([k, n]) => n > 1 ? `${k} ×${n}` : k).join(", ")}.`);
    await showNotice(`Здобич: ${name}`, lines, "is-loot");
  }

  // ---------- Дорога: блокування вкладок і банер з відліком ----------
  const TRAVEL_HREFS = ["character.html", "inventory.html", "maps.html"];
  function blockLink(ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }
  // extra — ще дозволені сторінки (ім'я файлу), напр. під час експедиції — «Налаштування» і «Головне меню»
  const EXPEDITION_HREFS = ["settings.html", "index.html"];
  function lockNavForTravel(why = "Недоступно в дорозі", extra = []) {
    document.body.classList.add("is-traveling");
    document.querySelectorAll("header nav a, main a[href]").forEach(a => {
      const href = (a.getAttribute("href") || "").split("?")[0];
      if (TRAVEL_HREFS.includes(href) || extra.includes(href.split("/").pop())) return;
      a.classList.add("travel-locked");
      a.setAttribute("aria-disabled", "true");
      a.title = why;
      a.addEventListener("click", blockLink, true);
    });
  }
  function unlockNavAfterTravel() {
    document.body.classList.remove("is-traveling");
    document.querySelectorAll("a.travel-locked").forEach(a => {
      a.classList.remove("travel-locked");
      a.removeAttribute("aria-disabled");
      a.removeAttribute("title");
      a.removeEventListener("click", blockLink, true);
    });
  }
  // Банер «В дорозі» на сторінках Персонаж / Інвентар
  function showTravelBanner(save) {
    const main = document.querySelector("main");
    if (!main) return;
    const bar = el("div", "travel-banner");
    bar.setAttribute("role", "status");
    const text = el("span");
    bar.append(text, link("Мапа", "maps.html"));
    main.prepend(bar);
    const name = id => (save.travel.region === "city"
      ? (RPG.LOCATIONS.city.districts.find(d => d.id === id) || {}).name
      : RPG.LOCATIONS[id]?.name) || id;
    const to = name(save.travel.to);
    const upd = async () => {
      const tr = RPG.travelState(save);
      if (tr && tr.leftMs > 0) { text.textContent = `В дорозі до «${to}»: ${RPG.fmtLeft(tr.leftMs)}`; return; }
      clearInterval(timer);
      RPG.finishTravel(save);
      await RPG.saveGame(save).catch(e => console.error(e));
      text.textContent = `Ви прибули: «${to}».`;
      bar.classList.add("is-done");
      unlockNavAfterTravel();
    };
    const timer = setInterval(upd, 250);
    upd();
  }

  // Банер «Експедиція в дорозі» (Персонаж / Інвентар); на Мапі — лише стежить, коли зняти обмеження
  function showExpeditionBanner(save, visible = true) {
    const main = document.querySelector("main");
    let text = null, bar = null;
    if (visible && main) {
      bar = el("div", "travel-banner");
      bar.setAttribute("role", "status");
      text = el("span");
      bar.append(text, link("Мапа", "maps.html"));
      main.prepend(bar);
    }
    const upd = async () => {
      if (RPG.expeditionTick(save)) await RPG.saveGame(save).catch(e => console.error(e));
      const act = (RPG.expeditionList(save) || []).filter(e => !e.done);
      if (act.length) {
        if (text) {
          const left = Math.min(...act.map(e => e.end)) - Date.now();
          text.textContent = (act.length > 1 ? `Експедицій у дорозі: ${act.length}` : `Експедиція в дорозі: ${RPG.LOCATIONS[act[0].loc]?.name || ""}`) +
            ` — найближча повернеться за ${fmtHours(Math.max(0, left))}. Переходити між локаціями не можна.`;
        }
        return;
      }
      clearInterval(timer);
      if (text) { text.textContent = "Експедиція повернулась — заберіть здобич на Мапі."; bar.classList.add("is-done"); }
      unlockNavAfterTravel();
    };
    const timer = setInterval(upd, 5000);
    upd();
  }

  // Щосекунди перевіряє, чи настав час відновлення (кожні 10 с).
  // isPaused() — напр. під час бою відновлення не застосовується.
  function startRegenTimer(save, onChange, isPaused) {
    setInterval(async () => {
      if (isPaused && isPaused()) return;
      const expMoved = RPG.expeditionTick ? RPG.expeditionTick(save) : false;   // експедиція: наступні бої
      if (RPG.applyRegenAll(save) || expMoved) {
        await RPG.saveGame(save).catch(e => console.error(e));
        onChange();
      }
    }, 1000);
  }

  function itemLabel(entry) {
    return RPG.itemFullName(entry) + (entry.qty > 1 ? ` ×${entry.qty}` : "");
  }

  // Назва речі кольором рідкості
  function rarityName(ref, tag = "strong") {
    const node = el(tag, null, RPG.itemFullName(ref));
    if (RPG.hasRarity(RPG.refId(ref))) node.classList.add("rt-" + RPG.rarityOf(ref));
    return node;
  }

  // Іконка предмета зі спрайт-листа (квадратний <span> з фоном).
  // Повертає null, якщо іконки немає — тоді показується заглушка з назвою.
  function itemIcon(ref, className) {
    const id = RPG.refId(ref);
    const style = RPG.itemIconRef(ref);
    if (!style) return null;
    const icon = el("span", className + " sprite-icon");
    Object.assign(icon.style, style);
    if (RPG.hasRarity(id)) icon.classList.add("ri-" + RPG.rarityOf(ref));
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", RPG.itemFullName(ref));
    return icon;
  }

  // Клас кольору рідкості для тексту заглушки
  function rarityTextClass(ref) {
    const id = RPG.refId(ref);
    if (RPG.hasRarity(id)) return " rt-" + RPG.rarityOf(ref);
    const gr = RPG.ITEMS[id]?.grade;                  // рідкість матеріалу (окрема стопка)
    return gr && gr !== "common" ? " rt-" + gr : "";
  }

  // Маленька заглушка: перші літери назви кольором рідкості
  function miniPlaceholder(ref, className) {
    const name = RPG.itemName(ref);
    const letters = name.split(/\s+/).map(w => w[0]).join("").slice(0, 3).toUpperCase();
    const ph = el("span", `${className} mini-ph${rarityTextClass(ref)}`, letters);
    ph.title = RPG.itemFullName(ref);
    return ph;
  }

  // Наповнює клітинку предмета: картинка + кількість.
  // Якщо картинки в assets/img/items/ немає — показує назву текстом,
  // тож нову іконку достатньо просто покласти в папку.
  function fillItemCell(cell, ref, qty = 1) {
    const item = RPG.ITEMS[RPG.refId(ref)];
    cell.textContent = "";
    cell.title = RPG.itemFullName(ref) + (qty > 1 ? ` ×${qty}` : "");
    const icon = itemIcon(ref, "item-icon");
    if (icon) {
      cell.classList.add("has-icon");
      cell.append(icon);
    } else {
      cell.classList.remove("has-icon");
      cell.append(el("span", "item-name item-ph" + rarityTextClass(ref), item.name));
    }
    if (qty > 1) cell.append(el("span", "item-qty", `×${qty}`));
    const gs = RPG.gearScore ? RPG.gearScore(ref) : null;
    if (gs !== null) cell.append(el("span", "item-gs", String(gs)));
    const sockets = socketMarks(ref);
    if (sockets) cell.append(sockets);
    return cell;
  }
  // Ромбики гнізд у куті комірки: порожній — вільне гніздо, кольоровий — руна (колір рідкості руни).
  // Видно лише після прочитання книги «Руни Небесної Кузні» (RPG.uiRunesSeen).
  function socketMarks(ref) {
    if (!RPG.uiRunesSeen || !ref || typeof ref !== "object" || !(ref.sockets > 0)) return null;
    const box = el("span", "item-sockets");
    box.setAttribute("aria-hidden", "true");
    for (const id of ref.runes || []) box.append(el("i", "sock" + (id ? " is-full rg-" + (RPG.ITEMS[id]?.grade || "common") : "")));
    return box;
  }

  // Комірка спорядження розміром з іконку: річ — лише картинка,
  // порожня — коротка назва слота. Повна назва — у спливаючому вікні.
  const SLOT_SHORT = {
    mainHand: "Зброя", offHand: "Ліва рука", head: "Голова", chest: "Тіло", legs: "Штани", hands: "Наручі",
    feet: "Взуття", earring1: "Сережка", ring1: "Кільце", amulet: "Амулет", ring2: "Кільце", earring2: "Сережка"
  };
  function fillEquipCell(cell, ref, slot) {
    const item = ref && RPG.ITEMS[RPG.refId(ref)];
    cell.textContent = "";
    cell.dataset.slot = slot;
    if (item) {
      cell.classList.add("has-icon");
      cell.append(smallIcon(ref, "equip-icon"));
      const gs = RPG.gearScore ? RPG.gearScore(ref) : null;
      if (gs !== null) cell.append(el("span", "item-gs", String(gs)));
      const sockets = socketMarks(ref);                // гнізда під руни — як у комірках інвентаря
      if (sockets) cell.append(sockets);
      cell.setAttribute("aria-label", `${RPG.SLOTS[slot]}: ${RPG.itemFullName(ref)}`);
    } else {
      cell.append(el("span", "equip-slot-name", SLOT_SHORT[slot] || RPG.SLOTS[slot]));
      cell.setAttribute("aria-label", `${RPG.SLOTS[slot]}: порожньо`);
      cell.title = RPG.SLOTS[slot];
    }
    return cell;
  }

  // Маленька іконка поруч із текстом (спорядження, шинок, опис)
  function smallIcon(ref, className = "mini-icon") {
    return itemIcon(ref, className) || miniPlaceholder(ref, className);
  }

  function slotClass(ref, extra = "") {
    const id = RPG.refId(ref);
    let cls = RPG.ITEMS[id]?.rarity === "rare" ? " rarity-rare" : "";
    if (RPG.hasRarity(id)) cls += " rarity-" + RPG.rarityOf(ref);
    const grade = RPG.ITEMS[id]?.grade;               // матеріал магічної / епічної / легендарної рідкості — рамка
    if (grade && grade !== "common") cls += " rarity-" + grade;
    return "wf wf-slot" + cls + (extra ? " " + extra : "");
  }

  // Збирає героя з шарів: [речі за спиною] → основа → [зброя] → [кулаки поверх руків'я]
  function renderHeroDoll(box, save) {
    const doll = RPG.heroDoll(save);
    box.textContent = "";
    box.removeAttribute("style");
    const layer = (cls, style, ref) => {
      const s = el("span", "doll-layer " + cls);
      Object.assign(s.style, style);
      if (ref && RPG.hasRarity(RPG.refId(ref))) s.classList.add("ri-" + RPG.rarityOf(ref));
      box.append(s);
    };
    for (const l of doll.layers) if (l.behind) layer("doll-item", l.style, l.ref);
    layer("doll-base", doll.base);
    for (const l of doll.layers) if (!l.behind) layer("doll-item", l.style, l.ref);
    for (const [x, y] of doll.fists) layer("doll-base", RPG.heroFistStyle(doll.base, x, y));
    renderHeroGs(box, save);
  }

  // «GS: N» у правому верхньому куті картинки героя: N — середній GS вдягнених речей
  function renderHeroGs(box, save) {
    const pic = box.parentElement;
    if (!pic || !RPG.equipmentScore) return;
    let badge = pic.querySelector(".hero-gs");
    if (!badge) { badge = el("span", "hero-gs"); pic.append(badge); }
    const es = RPG.equipmentScore(save);
    badge.textContent = `GS: ${es.avg}`;
    badge.title = es.count
      ? `Середній Gear Score вдягнених речей: ${es.avg} (речей: ${es.count}, сума: ${es.total})`
      : "Gear Score: нічого не вдягнено";
  }

  // Смужка HP / MP для невеликих рядків (напарники, вороги групою)
  function miniBar(cls, name, id) {
    const bar = el("div", `bar ${cls} bar-mini`);
    bar.dataset.name = name;
    if (id) bar.id = id;
    bar.append(el("div", "bar-fill"), el("span", "bar-label", name));
    return bar;
  }

  // Інші герої групи під портретом (сторінка локації): ім'я, рівень, HP / MP.
  // shown — хто зараз на великому портреті (його в списку немає; 0 — головний герой).
  // onPick(index) — якщо задано, клік по рядку обирає цього героя (зілля, черга дій)
  function renderPartyList(save, shown = 0, onPick = null) {
    const box = $("party-list");
    if (!box) return;
    const all = RPG.partyMembers(save);
    box.innerHTML = "";
    box.hidden = all.length < 2;
    if (all.length < 2) return;
    box.append(el("div", "party-title", `Група: ${all.length} / ${RPG.MAX_PARTY}` + (onPick ? " · клік — обрати героя" : "")));
    all.forEach((ms, i) => {
      if (i === shown) return;
      const st = RPG.calcStats(ms);
      const dead = RPG.isMemberDead(ms);
      const row = el("div", "party-row" + (dead ? " is-dead" : "") + (onPick ? " is-pickable" : ""));
      if (onPick) {
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.title = `Обрати: ${ms.character.name}`;
        row.addEventListener("click", () => onPick(i));
        row.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onPick(i); } });
      }
      const face = el("span", "party-face");
      Object.assign(face.style, RPG.heroSpriteStyle(ms.character.classId, RPG.heroGender(ms)));
      const info = el("div", "party-info");
      info.append(el("strong", null, `${ms.character.name} · рів. ${ms.character.level}${dead ? (RPG.heroGender(ms) === "f" ? " · полегла" : " · полеглий") : ""}`));
      const hp = miniBar("bar-hp", "HP", "party-hp-" + i), mp = miniBar("bar-mp", "MP", "party-mp-" + i);
      setBar(hp, ms.character.hp, st.hp);
      setBar(mp, ms.character.mp, st.mp);
      info.append(hp, mp);
      row.append(face, info);
      box.append(row);
    });
  }

  // Перемикач героїв групи (Інвентар, Персонаж, Тренер, черга бою).
  // onPick(index) — коли обрали іншого героя
  function memberTabs(box, save, current, onPick) {
    if (!box) return;
    box.innerHTML = "";
    const members = RPG.partyMembers(save);
    box.hidden = members.length < 2;
    members.forEach((ms, i) => {
      const dead = RPG.isMemberDead(ms);
      const b = button(`${ms.character.name} · ${ms.character.level}${dead ? " ✝" : ""}`,
        "wf member-tab " + (i === current ? "wf-button" : "wf-link"), () => onPick(i));
      b.title = i === 0 ? "Головний герой" : "Напарник";
      if (i === current) b.setAttribute("aria-pressed", "true");
      box.append(b);
    });
  }

  // Вибір героя групи на сторінках Персонаж і Інвентар (спільна логіка). Сторінка сама тримає
  // свій індекс і «вигляд» героя: get() — поточний індекс, set(i, ms) — записати обране, redraw() — перемалювати.
  function groupMemberTabs(save, { get, set, redraw }) {
    const pick = i => { set(i, RPG.memberSave(save, i)); redraw(); };
    const tabs = () => memberTabs($("member-tabs"), save, get(), pick);
    return { tabs };
  }

  // Оновлює блок героя: картинка, ім'я, HP / MP / EXP / LVL, відновлення
  function renderHeroBars(save) {
    const st = RPG.calcStats(save);
    const ch = save.character;
    const img = $("hero-img");
    if (img) { img._save = save; renderHeroDoll(img, save); }   // герой + зброя в руках (шари)
    const name = $("hero-name");
    if (name) name.textContent = `${ch.name} — ${RPG.getClass(ch.classId).name}`;

    setBar($("hero-hp"), ch.hp, st.hp);
    setBar($("hero-mp"), ch.mp, st.mp);

    const p = RPG.expProgress(save);
    const expBar = $("hero-exp");
    if (expBar) {
      if (p.max) setBar(expBar, 1, 1, "EXP 100% (максимум)");
      else setBar(expBar, p.current, p.needed, `EXP ${p.percent}%`);
      bindExpInfo(expBar, save);
    }
    const lvl = $("hero-lvl");
    if (lvl) lvl.textContent = `LVL ${ch.level}`;

    const regen = $("regen-info");
    if (regen) {
      const per = RPG.regenPerTick(save);
      const grace = RPG.graceLeft(save);
      regen.textContent = `Відновлення за 10 с: +${per.hp.toFixed(1)} HP, +${per.mp.toFixed(1)} MP` +
        (per.home ? " (з бонусом Домівки)" : "") +
        (grace ? ` · Молитва благодаті: ще ${Math.ceil(grace / 60000)} хв (+2% HP за 5 с, +3% MP за 10 с)` : "") +
        (RPG.springLeft && RPG.springLeft(save) ? ` · Джерело Велеса: +${RPG.VELES.expBonusPct}% досвіду, ще ${Math.ceil(RPG.springLeft(save) / 60000)} хв` : "") +
        (RPG.trainerBoostLeft && RPG.trainerBoostLeft(save) ? ` · Тренування з Брутом: +${RPG.TRAINER_BOOST.flat} досвіду володіння за бій, ще ${Math.ceil(RPG.trainerBoostLeft(save) / 60000)} хв` : "");
    }
    if (!save.memberIndex) renderPartyList(save);
  }

  // Смужка досвіду: мітка «i» і вікно з подробицями (рівень, %, досвід числами)
  function expInfo(save) {
    const ch = save.character;
    const p = RPG.expProgress(save);
    const cls = RPG.getClass(ch.classId);
    const box = el("div", "info-body exp-info");
    box.append(el("p", null, `Рівень ${ch.level} · ${cls.name}`));
    if (p.max) {
      box.append(el("p", null, `Максимальний рівень (${p.cap}). Досвід: ${fmtNum(p.exp)}.`));
      if (p.cap < RPG.LEVEL_CAP_PROFESSION) box.append(el("p", "note", ch.classId === RPG.DEFAULT_CLASS
        ? `Селянин росте лише до ${RPG.LEVEL_CAP_BASE} рівня. Героям з професією межа відкривається до ${RPG.LEVEL_CAP_PROFESSION} після першої перемоги над Белі (Альвгейм).`
        : `Межа відкриється до ${RPG.LEVEL_CAP_PROFESSION} рівня після першої перемоги над Белі — фінальним босом Альвгейму.`));
    } else {
      box.append(el("p", null, `Набрано ${p.percent}% до ${ch.level + 1} рівня.`));
      box.append(el("p", null, `Цей рівень: ${fmtNum(p.current)} / ${fmtNum(p.needed)} EXP (ще ${fmtNum(p.needed - p.current)}).`));
      box.append(el("p", null, `Усього в професії: ${fmtNum(p.exp)} / ${fmtNum(p.nextLevelAt)} EXP.`));
    }
    box.append(el("p", null, `Весь здобутий досвід: ${fmtNum(ch.totalExp || 0)} EXP.`));
    box.append(el("p", null, `Загибель забирає не більше ${RPG.DEATH_MAX_PCT || 25}% смужки рівня і може знизити рівень.`));
    return box;
  }
  function bindExpInfo(bar, save) {
    bar._save = save;
    const lbl = bar.querySelector(".bar-label");
    if (lbl && !lbl.querySelector(".info-i")) lbl.append(el("span", "info-i bar-i", "i"));
    if (bar.dataset.tip) return;
    bar.dataset.tip = "1";
    bar.setAttribute("role", "button");
    bar.setAttribute("aria-label", "Досвід — детальніше");
    RPG.bindTip(bar, () => expInfo(bar._save), null);
  }

  // ref — ID предмета або екземпляр з рідкістю
  function describeStats(ref) {
    return Object.entries(RPG.itemStats(ref))
      .map(([k, v]) => `${RPG.STAT_NAMES[k] || k} ${v > 0 ? "+" : ""}${v}`)
      .join(", ");
  }

  function describeEffect(item) {
    const e = item.effect || {};
    const parts = [];
    if (e.healHp) parts.push(`${e.healHp} HP`);
    if (e.healHpPct) parts.push(`${Math.round(e.healHpPct * 100)}% HP`);
    if (e.healMp) parts.push(`${e.healMp} MP`);
    if (e.healMpPct) parts.push(`${Math.round(e.healMpPct * 100)}% MP`);
    return parts.length ? "Відновлює " + parts.join(" і ") : "";
  }

  function useResultText(item, r) {
    const parts = [];
    if (r.healedHp) parts.push(`+${r.healedHp} HP`);
    if (r.healedMp) parts.push(`+${r.healedMp} MP`);
    if (r.recipe) return `Креслення вивчено: «${RPG.ITEMS[r.recipe].name}» — рецепт тепер у кузні.`;
    return `${item.name}: ${parts.join(", ") || "нічого не змінилось"}`;
  }

  // Картинка локації для CSS (var(--loc-img))
  function locImage(id) {
    if (id === "south_gate") id = "city";            // вхід у Дубову Заставу — та сама картинка
    if (RPG.LOCATIONS[id]?.house) id = "home";       // власний дім — поки картинка Домівки
    if (RPG.LOCATIONS[id]?.image) id = RPG.LOCATIONS[id].image;   // Шахта, Лісопилка — картинка іншої локації
    return `url("${RPG.asset("assets/images/locations/loc_" + id + ".webp")}")`;
  }


  // ---------- Експедиція (expedition.js): панель стану для мапи й локації ----------
  // onChange — перемалювати сторінку після «Відкликати» / «Забрати здобич»
  function fmtHours(ms) {
    const m = Math.ceil(ms / 60000), h = Math.floor(m / 60);
    return h ? `${h} год ${m % 60} хв` : `${m} хв`;
  }
  // Панелі всіх експедицій (у дорозі й повернених); null — експедицій немає
  function expeditionPanel(save, onChange) {
    const list = RPG.expeditionList?.(save) || [];
    if (!list.length) return null;
    if (list.length === 1) return expeditionOnePanel(save, list[0].id, onChange);
    const wrap = el("div", "stack exp-panels");
    for (const e of list) { const p = expeditionOnePanel(save, e.id, onChange); if (p) wrap.append(p); }
    return wrap;
  }
  function expeditionOnePanel(save, eid, onChange) {
    const info = RPG.expeditionInfo?.(save, eid);
    if (!info) return null;
    const box = el("div", "exp-panel" + (info.done ? " is-done" : "") + (info.reason === "wiped" ? " is-lost" : ""));
    const region = RPG.MAP_REGIONS?.[info.loc?.region || "start"]?.name || "";
    const names = info.team.map(ms => ms.character.name).join(", ");
    const bag = info.bag;
    const stackLine = Object.entries(bag.stacks).map(([id, n]) => `${RPG.ITEMS[id]?.name || id} ×${fmtNum(n)}`).join(", ");
    const potLine = Object.entries(info.potions).map(([id, n]) => `${RPG.ITEMS[id]?.name || id} ×${fmtNum(n)}`).join(", ");
    const lootLine = [bag.gold ? `${fmtNum(bag.gold)} золота` : "", bag.items.length ? `речей: ${bag.items.length}` : "", stackLine]
      .filter(Boolean).join(" · ") || (info.done ? "нічого" : "поки нічого");
    if (!info.done) {
      box.append(el("h3", null, `Експедиція: ${info.loc.name}${region ? " · " + region : ""}`));
      box.append(el("p", null, `${names}. Лишилось ${fmtHours(info.leftMs)} · боїв ${info.battles}, перемог ${info.wins}` +
        (info.champions ? `, чемпіонів ${info.champions}` : "") + ` · у строю ${info.alive}/${info.total}.`));
      box.append(el("p", "note keep", `Здобич: ${lootLine}.`));
      if (potLine) box.append(el("p", "note keep", `Випито зілля: ${potLine}.`));
      let armed = false;
      const recall = button("Відкликати групу", "wf wf-secondary", async () => {
        if (!armed) { armed = true; recall.textContent = "Точно відкликати? Натисніть ще раз"; return; }
        RPG.recallExpedition(save, eid);
        await RPG.saveGame(save);
        onChange?.();
      });
      box.append(recall);
      return box;
    }
    const title = info.reason === "wiped" ? "Експедиція загинула" : info.reason === "recalled" ? "Групу відкликано з експедиції" : "Експедиція повернулась";
    box.append(el("h3", null, `${title}: ${info.loc.name}${region ? " · " + region : ""}`));
    box.append(el("p", null, `Боїв ${info.battles}, перемог ${info.wins}` + (info.champions ? `, чемпіонів ${info.champions}` : "") + "."));
    const expLines = info.team.map(ms => {
      const id = RPG.memberIdOf(save, ms), lv = bag.levels[id];
      return `${ms.character.name}: +${fmtNum(bag.exp[id] || 0)} EXP` + (lv && lv[1] > lv[0] ? `, рівень ${lv[0]} → ${lv[1]}` : "") +
        (info.penalty?.[id] > 0 ? `, штраф −${fmtNum(info.penalty[id])} EXP` : "");
    });
    box.append(el("p", "note keep", expLines.join(" · ")));
    if (info.temple) box.append(el("p", "status", "Уся група полягла — герої прокинулись у Храмі."));
    else if (info.fallen.length) box.append(el("p", "status", `Полягли: ${info.team.filter(ms => info.fallen.includes(RPG.memberIdOf(save, ms))).map(ms => ms.character.name).join(", ")} — помоліться за них у Храмі.`));
    if (bag.filtered) box.append(el("p", "note keep", `Фільтр здобичі викинув речей: ${bag.filtered}.`));
    box.append(el("p", null, `Здобич: ${lootLine}.`));
    if (potLine) box.append(el("p", "note keep", `Випито зілля: ${potLine}.`));
    const bagIsEmpty = !bag.gold && !bag.items.length && !Object.keys(bag.stacks).length;
    const row = el("div", "row exp-btns");
    row.append(button(bagIsEmpty ? "Гаразд" : "Забрати здобич", "wf wf-button", async () => {
      const r = RPG.collectExpedition(save, eid);
      await RPG.saveGame(save);
      if (r.ok && !r.empty) showMsg(box, `Інвентар повний — у мішку експедиції лишилось ${fmtNum(r.left)}. Звільніть місце й заберіть решту.`, true);
      else onChange?.();
    }));
    let armedDrop = false;
    const drop = button("Викинути решту", "wf wf-secondary", async () => {
      if (!armedDrop) { armedDrop = true; drop.textContent = "Точно викинути? Натисніть ще раз"; return; }
      RPG.dropExpeditionLoot(save, eid);
      await RPG.saveGame(save);
      onChange?.();
    });
    if (!bagIsEmpty) row.append(drop);
    box.append(row);
    return box;
  }

  // ---------- Опис предмета для спливаючого вікна та інвентаря ----------
  const TYPE_NAMES = {
    weapon: "Зброя", armor: "Броня", accessory: "Прикраса", consumable: "Зілля",
    material: "Матеріал", offhand: "Ліва рука", shield: "Щит", quest: "Квестовий предмет", admin: "Предмет адміністратора", blueprint: "Креслення"
  };
  const RARITY_NAMES = {
    broken: "зламана", common: "звичайна", magic: "магічна", epic: "епічна", legendary: "легендарна"
  };

  // ref — ID або екземпляр; qty — кількість у стопці; ms — сейв героя (для комплектів)
  function itemInfo(ref, qty = 1, ms = null) {
    const id = RPG.refId(ref);
    const item = RPG.ITEMS[id];
    const box = el("div", "tip-item");
    if (!item) return box;

    const head = el("div", "tip-head");
    head.append(smallIcon(ref, "tip-icon"));
    const title = el("div", "tip-title");
    const gradeCls = item.grade && item.grade !== "common" ? "rt-" + item.grade : null;
    const name = RPG.hasRarity(id) ? rarityName(ref) : el("strong", item.rarity === "rare" ? "rt-epic" : gradeCls, item.name);
    name.classList.add("tip-name");
    title.append(name);
    const sub = [TYPE_NAMES[item.type] || "Предмет"];
    if (RPG.hasRarity(id)) sub.push(RARITY_NAMES[RPG.rarityOf(ref)] || "");
    else if (item.rarity === "rare") sub.push("рідкісне");
    else if (item.grade) sub.push(RARITY_NAMES[item.grade] || "");
    if (qty > 1) sub.push(`×${fmtNum(qty)}`);
    title.append(el("span", "tip-sub", sub.filter(Boolean).join(" · ")));
    head.append(title);
    const gs = RPG.gearScore ? RPG.gearScore(ref) : null;
    if (gs !== null) {
      const p = RPG.gearScoreParts(ref);
      const badge = el("div", "tip-gs", `GS ${gs}`);
      badge.title = `Gear Score: основні ${p.primary}, ` +
        `другорядні ${p.secondary}, допоміжні ${p.auxiliary}` + (p.extra ? `, рідкість і рівень ${p.extra}` : "");
      head.append(badge);
    }
    box.append(head);

    const stats = Object.entries(RPG.itemStats(ref));
    if (stats.length) {
      const list = el("ul", "tip-stats");
      for (const [k, v] of stats) {
        const li = el("li", v < 0 ? "is-neg" : null);
        li.append(el("span", null, RPG.STAT_NAMES[k] || k), el("b", null, (v > 0 ? "+" : "") + v));
        list.append(li);
      }
      box.append(list);
    }

    const eff = describeEffect(item);
    if (eff) box.append(el("div", "tip-effect", eff));
    // Гнізда під руни (після прочитання книги рун)
    if (RPG.uiRunesSeen && ref && typeof ref === "object" && ref.sockets > 0) {
      const sb = el("div", "tip-sockets");
      sb.append(el("span", "tip-sockets-title", `Гнізда для рун: ${ref.runes.filter(Boolean).length}/${ref.sockets}`));
      const ul = el("ul", "tip-socket-list");
      for (const rid of ref.runes) {
        const li = el("li", "tip-socket" + (rid ? " is-full" : ""));
        if (rid) {
          li.append(smallIcon(rid, "tip-socket-icon"), el("span", rarityTextClass(rid).trim() || null, RPG.ITEMS[rid].name),
            el("small", null, RPG.runeEffectText(rid)));
        } else li.append(el("span", "tip-socket-empty"), el("span", "tip-socket-free", "вільне гніздо"));
        ul.append(li);
      }
      sb.append(ul);
      box.append(sb);
    }

    const set = item.set && RPG.ITEM_SETS && RPG.ITEM_SETS[item.set];
    if (set) {
      const have = ms && RPG.equippedSetCounts ? (RPG.equippedSetCounts(ms)[item.set] || 0) : 0;
      if (set.steps) {
        // комплект професії: ступені за 3 і 5 частин
        const full = set.steps.at(-1).pieces;
        box.append(el("div", "tip-set", `${set.name}` + (ms ? ` (вдягнено ${Math.min(have, full)}/${full})` : "")));
        for (const st of set.steps)
          box.append(el("div", "tip-set" + (have >= st.pieces ? " rt-magic" : ""), `${st.pieces} речі: ${st.text}`));
      } else {
        box.append(el("div", "tip-set" + (have >= set.pieces ? " rt-magic" : ""),
          `${set.name}: ${set.pieces} речі — ${set.text}` + (ms ? ` (вдягнено ${Math.min(have, set.pieces)}/${set.pieces})` : "")));
      }
    }

    const req = [];
    if (item.slot) req.push(`Слот: ${RPG.slotsFor(item.slot).map(s => RPG.SLOTS[s]).join(" / ")}`);
    if (item.levelReq > 1 || item.slot) req.push(`рівень ${item.levelReq || 1}`);
    if (item.weaponType) {
      const need = RPG.TIER_MASTERY[item.tier] || 0;
      req.push(RPG.WEAPON_TYPES[item.weaponType].name +
        (need ? ` · ${RPG.WEAPON_TYPES[item.weaponType].mastery.toLowerCase()} ${need}` : "") +
        (item.weaponType === "bow" ? " · дворучна" : ""));
    }
    if (req.length) box.append(el("div", "tip-req", req.join(" · ")));

    if (item.description) box.append(el("p", "tip-desc", item.description));

    box.append(el("div", "tip-price", item.locked
      ? "Не продається, не викидається й не розбирається — лише в спільну скриню Домівки."
      : `Ціна: ${fmtNum(item.price || 0)} зол. · продаж: ${fmtNum(RPG.refSellPrice(ref))} зол.` +
        (item.noShop ? (item.profSet ? " · лише кування за кресленням" : item.tier === 3 ? " · продає лише Торгова гільдія" : " · не продається") : "")));
    return box;
  }

  // ============================================================
  // НОВА ГРА
  // ============================================================

  RPG.pages = {};
  RPG.ui = { expeditionPanel, fmtHours, $, el, noteP, link, button, setBar, fmtNum, fmtDate, fmtStat, MSG_SEC, toastParent, raiseToasts, clearToasts, toastHost, showMsg, showNoGame, requireSave, showKeyPocket, showLootFilter, renderFilterBtn, whenNoDialog, queueDialog, noticeClose, noticeDialog, showNotice, journalReward, meetStranger, showParchment, BOOK, bookMotionOff, bookWide, bookBlobs, bookAnimUrl, playBookAnim, dropBookAnim, chronicleSection, showChronicle, forgeBookTable, forgeBookAuto, forgeBookSection, dataBookSection, openLibraryBook, showDataBook, showForgeBook, fieldLootAdd, showFieldLoot, TRAVEL_HREFS, blockLink, lockNavForTravel, unlockNavAfterTravel, showTravelBanner, showExpeditionBanner, startRegenTimer, itemLabel, rarityName, itemIcon, rarityTextClass, miniPlaceholder, fillItemCell, socketMarks, SLOT_SHORT, fillEquipCell, smallIcon, slotClass, renderHeroDoll, renderHeroGs, miniBar, renderPartyList, memberTabs, groupMemberTabs, renderHeroBars, expInfo, bindExpInfo, describeStats, describeEffect, useResultText, locImage, TYPE_NAMES, RARITY_NAMES, itemInfo, MSG_MAX };
  RPG.ui.meetRenouncer = meetRenouncer;   // «Шлях відреченого»
})(window.RPG);

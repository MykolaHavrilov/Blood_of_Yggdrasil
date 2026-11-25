// ============================================================
// journal.js — два журнали: «Журнал подій» (save.eventLog) і «Журнал бою» (save.battleLog)
//
// ЖУРНАЛ ПОДІЙ — останні RPG.EVENT_LOG_MAX (500) записів: підсумок кожного бою (здобич, досвід, загибель)
//   з посиланням «Бій №N», переходи між локаціями, нагороди за завдання, сповіщення.
// ЖУРНАЛ БОЮ — останні RPG.BATTLE_LOG_MAX (100) боїв: повний хід бою від початку до результату.
//   Кожен бій має наскрізний номер save.battleNo (1, 2, 3… — не скидається, коли старі бої затираються).
// Найстаріший запис — угорі, найновіший — унизу; понад ліміт найстаріші видаляються.
// Обидва журнали йдуть у файл збереження (IndexedDB / JSON).
//
// Запис: { at, kind, lines, no? }
//   kind (події): "battle" (підсумок бою, no — номер бою) | "quest" | "notice" | "move" | "expedition" (підсумок експедиції)
//   kind (бої):   "battle", no — номер бою
//   lines: [[who, text, flags]]
//   who: "title" (flags = стан: fight/win/lose/draw/ready) | "hero" | "enemy" | "info" | "round"
//   flags для інших: "c" — крит, "m" — переміщення, "h" — лікування
//
// RPG.journalBattle(save, { course, outcome }) — новий бій: course — хід бою (рядки), outcome — підсумок (рядки);
//   повертає { no, battle, event } (записи в обох журналах)
// RPG.journalAdd(save, { kind, lines, no? })    — запис у журнал подій; повертає запис
// RPG.journalMove(save)                          — якщо герой на іншій локації, ніж у минулому записі, — запис «Перехід»
// RPG.journalLists(save)                         — { events, battles } (масиви сейву)
// RPG.migrateJournal(save)                       — старий спільний журнал → два журнали (save.js → migrateSave)
// RPG.journalPack(ev)                            — подія бою (battle.js) → рядок журналу
// RPG.logLi(line)                                — DOM-рядок журналу (<li>)
// RPG.openJournal(save, { skip, live, tab, battle }) — вікно з вкладками; повертає { append, refresh, isOpen }
//   skip — записи, яких поки не показувати (бій, що зараз показується); live — рядки цього бою наживо;
//   tab — "events" | "battles"; battle — номер бою, до якого прокрутити
// RPG.journalDownload(save, tab)                 — файл Log_events.txt / Log_battle.txt
// Підключається ПІСЛЯ core.js і ДО game.js.
// ============================================================

window.RPG = window.RPG || {};

(function (RPG) {
  const EVENT_MAX = 500;
  const BATTLE_MAX = 100;
  Object.assign(RPG, { EVENT_LOG_MAX: EVENT_MAX, BATTLE_LOG_MAX: BATTLE_MAX, JOURNAL_MAX: EVENT_MAX });
  const KIND_NAME = { battle: "Бій", quest: "Нагорода", notice: "Сповіщення", move: "Перехід", expedition: "Експедиція" };

  // ---------- Дані ----------
  function lists(save) {
    if (!Array.isArray(save.eventLog)) save.eventLog = [];
    if (!Array.isArray(save.battleLog)) save.battleLog = [];
    if (!Number.isInteger(save.battleNo)) save.battleNo = save.battleLog.reduce((m, r) => Math.max(m, r.no || 0), 0);
    return { events: save.eventLog, battles: save.battleLog };
  }
  const trim = (arr, max) => { if (arr.length > max) arr.splice(0, arr.length - max); };

  function journalAdd(save, entry) {
    const { events } = lists(save);
    const rec = { at: Date.now(), kind: entry.kind || "notice", lines: entry.lines || [] };
    if (entry.no) rec.no = entry.no;
    events.push(rec);
    trim(events, EVENT_MAX);
    return rec;
  }

  function journalBattle(save, { course = [], outcome = [] } = {}) {
    const { battles } = lists(save);
    const no = ++save.battleNo;
    const at = Date.now();
    const battle = { at, kind: "battle", no, lines: course };
    battles.push(battle);
    trim(battles, BATTLE_MAX);
    const event = journalAdd(save, { kind: "battle", no, lines: outcome });
    event.at = at;
    return { no, battle, event };
  }

  // Перехід між локаціями: запис, коли герой опинився на новій локації (порівняння з save.logLoc)
  function journalMove(save) {
    const id = save.location?.map;
    if (!id || save.logLoc === id) return null;
    const was = save.logLoc;
    save.logLoc = id;
    if (!was) return null;                       // перший запуск — без запису
    const name = l => RPG.LOCATIONS?.[l]?.name || l;
    return journalAdd(save, { kind: "move", lines: [["info", `${name(was)} → ${name(id)}`, "m"]] });
  }

  // Старий журнал (один спільний масив save.battleLog з боями, нагородами й сповіщеннями) → два журнали.
  // Бій ділиться: хід бою (до заголовка підсумку включно) — у журнал бою, підсумок — у журнал подій.
  function migrateJournal(save) {
    if (Array.isArray(save.eventLog)) { lists(save); return false; }
    const old = Array.isArray(save.battleLog) ? save.battleLog.filter(r => r && Array.isArray(r.lines)) : [];
    save.eventLog = [];
    save.battleLog = [];
    save.battleNo = 0;
    for (const r of old) {
      if (r.kind !== "battle") { save.eventLog.push({ at: r.at || 0, kind: r.kind || "notice", lines: r.lines }); continue; }
      let cut = -1;
      r.lines.forEach((l, i) => { if (l[0] === "title" && i > 0) cut = i; });
      const no = ++save.battleNo;
      const course = cut > 0 ? r.lines.slice(0, cut + 1) : r.lines;
      const outcome = cut > 0 ? r.lines.slice(cut) : [];
      save.battleLog.push({ at: r.at || 0, kind: "battle", no, lines: course });
      save.eventLog.push({ at: r.at || 0, kind: "battle", no, lines: outcome });
    }
    trim(save.eventLog, EVENT_MAX);
    trim(save.battleLog, BATTLE_MAX);
    return true;
  }

  function journalPack(ev) {
    if (Array.isArray(ev)) return ev;
    const f = (ev.crit ? "c" : "") + (ev.move ? "m" : "") + (ev.heal ? "h" : "");
    return f ? [ev.who, String(ev.text), f] : [ev.who, String(ev.text)];
  }

  // ---------- Відображення ----------

  const el = RPG.el;   // спільний помічник (core.js)

  function logLi(line) {
    const [who, text, flags = ""] = line;
    if (who === "title") {
      const li = el("li", "log-title" + (flags ? " is-" + flags : ""));
      li.append(el("span", "log-mark", flags === "win" ? "★" : flags === "lose" ? "✝" : "⚑"), el("span", "log-text", text));
      return li;
    }
    const crit = flags.includes("c"), move = flags.includes("m"), heal = flags.includes("h");
    const li = el("li", "log-" + who + (crit ? " log-crit" : "") + (move ? " log-move" : "") + (heal ? " log-heal" : ""));
    li.dataset.who = who;
    li.append(el("span", "log-mark", who === "round" ? "" : move ? "➜" : who === "hero" ? "⚔" : who === "enemy" ? "✸" : "◆"));
    const t = el("span", "log-text");
    String(text).split(/(\d+)/).forEach((part, i) => {
      if (!part) return;
      t.append(i % 2 ? el("b", "log-num", part) : document.createTextNode(part));
    });
    li.append(t);
    return li;
  }

  const pad = n => String(n).padStart(2, "0");
  function fmtAt(ms) {
    const d = new Date(ms);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ---------- Вікно журналу ----------

  let ctl = null;          // відкрите вікно
  let lastTab = "events";  // яку вкладку відкривати наступного разу

  function openJournal(save, opts = {}) {
    if (ctl && ctl.isOpen()) { ctl.refresh(opts); return ctl; }
    let skip = new Set([].concat(opts.skip || []).filter(Boolean));
    let live = opts.live || null;
    let tab = opts.tab || (live ? "battles" : lastTab);
    let jumpTo = opts.battle || null;

    const dlg = el("dialog", "notice-dialog journal-dialog");
    const close = el("button", "notice-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Закрити");
    close.addEventListener("click", () => dlg.close());
    const head = el("h3", null, "Журнал");
    const tabs = el("div", "journal-tabs");
    tabs.setAttribute("role", "tablist");
    const tabBtn = {};
    for (const [id, name] of [["events", "Журнал подій"], ["battles", "Журнал бою"]]) {
      const b = el("button", "journal-tab", name);
      b.type = "button";
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => { tab = id; jumpTo = null; render(); });
      tabBtn[id] = b;
      tabs.append(b);
    }
    const note = el("p", "journal-note");
    const wrap = el("div", "journal-wrap");
    const box = el("ol", "log journal-list");
    const nav = el("div", "journal-nav");
    const up = el("button", "journal-jump", "▲");
    const down = el("button", "journal-jump", "▼");
    up.type = down.type = "button";
    up.title = "На початок журналу"; up.setAttribute("aria-label", up.title);
    down.title = "У кінець журналу"; down.setAttribute("aria-label", down.title);
    up.addEventListener("click", () => { box.scrollTop = 0; });
    down.addEventListener("click", () => { box.scrollTop = box.scrollHeight; });
    nav.append(up, down);
    wrap.append(box, nav);
    const actions = el("div", "row dialog-actions");
    const dl = el("button", "wf wf-button wf-secondary", "Завантажити .txt");
    dl.type = "button";
    dl.addEventListener("click", () => journalDownload(save, tab));
    actions.append(dl);
    dlg.append(close, head, tabs, note, wrap, actions);

    const nearBottom = () => box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    const toBottom = () => {
      // без плавної прокрутки — відкривається одразу внизу
      box.style.scrollBehavior = "auto";
      box.scrollTop = box.scrollHeight;
      box.style.scrollBehavior = "";
    };

    // Посилання «Бій №N» у журналі подій — на вкладку «Журнал бою», до цього бою
    function battleLink(no) {
      const b = el("button", "journal-battle-link", `Бій №${no}`);
      b.type = "button";
      b.title = "Відкрити хід бою в журналі бою";
      b.addEventListener("click", () => { tab = "battles"; jumpTo = no; render(); });
      return b;
    }
    function entryHead(rec) {
      const li = el("li", "log-entry-head is-" + rec.kind);
      if (rec.no) li.dataset.no = rec.no;
      const kind = el("span", "log-entry-kind", KIND_NAME[rec.kind] || rec.kind);
      if (tab === "events" && rec.kind === "battle" && rec.no) kind.replaceChildren(battleLink(rec.no));
      else if (rec.no) kind.textContent = `Бій №${rec.no}`;
      li.append(kind, el("span", "log-entry-at", fmtAt(rec.at)));
      return li;
    }

    function render() {
      lastTab = tab;
      for (const [id, b] of Object.entries(tabBtn)) {
        b.classList.toggle("is-on", id === tab);
        b.setAttribute("aria-selected", String(id === tab));
      }
      box.setAttribute("aria-label", tab === "events" ? "Журнал подій" : "Журнал бою");
      box.dataset.tab = tab;
      box.innerHTML = "";
      const { events, battles } = lists(save);
      const all = tab === "events" ? events : battles;
      const log = all.filter(r => !skip.has(r));
      const frag = document.createDocumentFragment();
      for (const rec of log) {
        frag.append(entryHead(rec));
        for (const line of rec.lines) frag.append(logLi(line));
      }
      const showLive = live && tab === "battles";
      if (showLive) {
        frag.append(entryHead({ kind: "battle", no: save.battleNo, at: Date.now() }));
        for (const line of live) frag.append(logLi(line));
      }
      box.append(frag);
      box.classList.toggle("is-empty", !log.length && !showLive);
      const max = tab === "events" ? EVENT_MAX : BATTLE_MAX;
      note.textContent = tab === "events"
        ? `Подій у журналі: ${log.length} з ${max}. Найстаріші — вгорі, найновіші — внизу.`
        : `Боїв у журналі: ${log.length + (showLive ? 1 : 0)} з ${max}. Найстаріші — вгорі, найновіші — внизу.`;
      dl.disabled = !all.length;
      const target = jumpTo && box.querySelector(`.log-entry-head[data-no="${jumpTo}"]`);
      if (target) {
        box.style.scrollBehavior = "auto";
        box.scrollTop = target.offsetTop - box.offsetTop;
        box.style.scrollBehavior = "";
        target.classList.add("is-target");
      } else {
        if (jumpTo) note.textContent += ` Бій №${jumpTo} уже стерто — у журналі лише останні ${BATTLE_MAX} боїв.`;
        toBottom();
      }
    }

    ctl = {
      isOpen: () => dlg.open,
      append(line) {
        if (!dlg.open || !live || tab !== "battles") return;
        const stick = nearBottom();
        box.append(logLi(line));
        if (stick) toBottom();
      },
      refresh(o = {}) {
        if ("skip" in o) skip = new Set([].concat(o.skip || []).filter(Boolean));
        if ("live" in o) live = o.live || null;
        if (o.tab) tab = o.tab;
        if ("battle" in o) jumpTo = o.battle || null;
        if (dlg.open) render();
      },
    };
    dlg.addEventListener("close", () => { dlg.remove(); if (ctl && !ctl.isOpen()) ctl = null; });
    document.body.append(dlg);
    dlg.showModal();
    render();
    return ctl;
  }

  // ---------- Файли Log_events.txt / Log_battle.txt ----------

  function journalText(save, tab = "battles") {
    const { events, battles } = lists(save);
    const isEv = tab === "events";
    const out = [isEv ? `Журнал подій — останні ${EVENT_MAX} записів (найстаріші вгорі)`
                      : `Журнал бою — останні ${BATTLE_MAX} боїв (найстаріші вгорі)`,
                 `Герой: ${save.character?.name || ""}`, ""];
    for (const rec of isEv ? events : battles) {
      const kind = rec.no ? `Бій №${rec.no}` : (KIND_NAME[rec.kind] || rec.kind);
      out.push(`==== ${kind} · ${fmtAt(rec.at)} ====`);
      for (const [who, text] of rec.lines) {
        if (who === "title") out.push(`[ ${text} ]`);
        else if (who === "round") out.push(`--- ${text} ---`);
        else out.push((who === "hero" ? "⚔ " : who === "enemy" ? "✸ " : "◆ ") + text);
      }
      out.push("");
    }
    return out.map(l => RPG.t(l)).join("\r\n");   // RPG.t — переклад, якщо гра не українською (i18n.js)
  }

  function journalDownload(save, tab = "battles") {
    // BOM — щоб Блокнот Windows правильно показав кирилицю
    const blob = new Blob(["﻿" + journalText(save, tab)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab === "events" ? "Log_events.txt" : "Log_battle.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  Object.assign(RPG, { journalAdd, journalBattle, journalMove, journalLists: lists, migrateJournal, journalPack, logLi,
    openJournal, journalText, journalDownload });
})(window.RPG);

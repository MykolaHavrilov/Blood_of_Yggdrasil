// ============================================================
// i18n.js — мова гри (Налаштування → «Мова» / «Language»).
//
// Гра пишеться українською; переклад — словник «українська фраза → переклад»
// (assets/js/i18n/en.js → RPG.I18N.en). Коли обрано не українську:
//   1) рядки даних (предмети, вороги, навички, локації, професії…) перекладаються
//      одразу, до побудови сторінки — за точним збігом зі словником;
//   2) текст сторінки (HTML і те, що домальовують скрипти) перекладається
//      MutationObserver-ом: текстові вузли та атрибути title / placeholder / aria-label / alt.
// Якщо фрази немає в словнику — лишається українською (видно, що ще не перекладено).
//
// Підключається після файлів даних (перед game-common.js); на сторінках без даних — після core.js.
// ============================================================

(function (RPG) {
  const lang = RPG.lang || "uk";
  document.documentElement.lang = lang;
  const pack = RPG.I18N && RPG.I18N[lang];
  if (lang === "uk" || !pack) { RPG.t = s => s; return; }

  const dict = new Map(Object.entries(pack.phrases || {}));
  // patterns: [регулярний вираз, переклад з $1…$9, цілий рядок?, слабкий?, сталий шматок] — з шаблонних рядків скриптів (`… ${x} …`);
  // fragments: [шматок, переклад] — частини, які скрипти доклеюють до інших рядків (« · поточна гра»)
  // weak — шаблон майже без власного тексту («{} (з {})»): пробується лише після шматків
  const whole = [], weak = [], parts = [];
  // key — найдовший сталий шматок шаблону: спершу швидка перевірка includes, потім регулярний вираз
  for (const [re, out, anchored, isWeak, key] of pack.patterns || [])
    (anchored ? (isWeak ? weak : whole) : parts).push([new RegExp(re, anchored ? "" : "g"), out, key || ""]);
  // довгі фрази (речення) шукаються й усередині склеєних рядків
  const longs = Object.keys(pack.phrases || {}).filter(k => k.length >= 20).sort((a, b) => b.length - a.length)
    .map(k => [k, pack.phrases[k]]);
  const frags = pack.fragments || [];
  const CYR = /[А-Яа-яІіЇїЄєҐґ]/;
  const memo = new Map();
  // підстановка: мітки вставок (trMixed) і пробіли по краях не заважають перекладу самого значення
  const EDGE = /^([\s\uE000-\uE0FF]*)([\s\S]*?)([\s\uE000-\uE0FF]*)$/;
  const fill = (rep, m, depth) => rep.replace(/\$(\d)/g, (_, i) => {
    const [, pre, mid, post] = (m[i] || "").match(EDGE);
    return pre + trCore(mid, depth + 1) + post;
  });

  // Цілий рядок: словник → шаблон
  function trWhole(core, depth, list) {
    const out = dict.get(core);
    if (out != null) return out;
    if (depth > 3) return null;
    for (const [re, rep, key] of list) {
      if (!core.includes(key)) continue;
      const m = core.match(re);
      if (m) return fill(rep, m, depth);
    }
    return null;
  }
  function trCore(s, depth) {
    if (!CYR.test(s)) return s;
    const core = s.trim();
    let out = trWhole(core, depth, whole);
    // цілий шаблон підійшов, але лишив українські слова (« Зараз: {}» проковтнув чуже речення) — спробувати й по шматках
    const whole1 = out != null && CYR.test(out) ? out : null;
    if (whole1 != null) out = null;
    if (out == null && depth <= 3) {
      // довгі фрази → шаблони всередині рядка → доклеєні шматки → слабкі шаблони → кожна частина між « · » / « — » / «, » окремо
      let t = " " + core + " ";     // пробіли — щоб знайшлися шматки, що починаються з « · »
      for (const [u, e] of longs) if (t.includes(u)) t = t.split(u).join(e);
      for (const [re, rep, key] of parts) if (t.includes(key) && CYR.test(t)) { re.lastIndex = 0; if (re.test(t)) { re.lastIndex = 0; t = t.replace(re, (...m) => fill(rep, m, depth)); } }
      for (const [u, e] of frags) if (t.includes(u)) t = t.split(u).join(e);
      t = t.trim();
      if (CYR.test(t)) t = trWhole(t, depth, whole) || trWhole(t, depth, weak) || t;
      for (const sep of [" · ", " — ", ", "]) {
        if (!CYR.test(t) || !t.includes(sep)) continue;
        t = t.split(sep).map(x => (CYR.test(x) && trWhole(x.trim(), depth + 1, whole)) || x).join(sep);
      }
      if (t !== core) out = t;
    }
    if (whole1 != null) {
      const left = x => (x == null ? core : x).replace(/[^А-Яа-яІіЇїЄєҐґ]/g, "").length;
      if (out == null || left(whole1) <= left(out)) out = whole1;
    }
    // усередині підстановки шаблону — ще й дієслова ворогів («Grey Wolf кусає Ivan» → «Grey Wolf bites Ivan»)
    if (depth > 0 && verbs.length && CYR.test(out == null ? core : out)) {
      let t = " " + (out == null ? core : out) + " ";
      for (const [u, e] of verbs) if (t.includes(u)) t = t.split(u).join(e);
      t = t.slice(1, -1);
      if (t !== core) out = t;
    }
    if (out == null) return s;
    return core === s ? out : s.replace(core, out);
  }
  const verbs = [];   // [" кусає ", " bites "] — з даних ворогів (ENEMIES.*.verb, MONSTER_MOVES), див. нижче
  // Переклад однієї фрази; пробіли по краях зберігаються
  function tr(s) {
    if (typeof s !== "string" || !CYR.test(s)) return s;
    let r = memo.get(s);
    if (r == null) {
      r = trCore(s, 0);
      if (r !== s) r = r.replace(/[«»]/g, '"').replace(/(^|[^\d.,])1 cells\b/g, "$11 cell");   // звичайні лапки; «1 cell»
      if (memo.size > 20000) memo.clear();
      memo.set(s, r);
    }
    return r;
  }
  RPG.t = tr;

  // ---------- 1) Дані ----------
  const KEYS = ["CLASSES", "ATTRS", "STAT_NAMES", "SLOTS", "EFFECT_NAMES", "RARITIES", "OFF_TYPE_NAMES", "WEAPON_TYPES",
    "SCHOOLS", "RANGE_NAMES", "MONSTER_MOVES", "MONSTER_WEAPON_NAMES", "GS_MODES", "RUNE_GRADES", "RUNE_KIND_NAME",
    "SKILLS", "ITEMS", "CRAFT_MATERIALS", "RUNES", "ITEM_SETS", "RECIPE_GROUPS", "FORGE_TOOLS", "CRAFT_CHESTS",
    "CRAFT_CHEST_ALLOW_TEXT", "CHEST_STORAGES", "HOUSES", "ENEMIES", "LOCATIONS", "DUNGEONS", "WORLDS", "MAP_REGIONS",
    "LIBRARY", "DEFAULT_LOCATION", "FORGE_BOOK", "GODS_BOOK", "RUNE_BOOK", "CHRONICLE"];
  {
    const vs = new Set(["кусає"]);
    for (const e of Object.values(RPG.ENEMIES || {})) if (e && typeof e.verb === "string") vs.add(e.verb);
    const mm = RPG.MONSTER_MOVES;
    if (mm && typeof mm === "object") JSON.stringify(mm, (k, v) => { if (typeof v === "string" && CYR.test(v) && v.length < 30) vs.add(v); return v; });
    for (const v of vs) { const e = dict.get(v); if (e) verbs.push([" " + v + " ", " " + e + " "]); }
    verbs.sort((a, b) => b[0].length - a[0].length);
  }
  const paths = pack.paths || {};          // точкові переклади там, де одна фраза має різні значення
  const done = new WeakSet();
  function walk(obj, depth, path) {
    if (!obj || typeof obj !== "object" || depth > 8 || done.has(obj)) return;
    done.add(obj);
    for (const k of Object.keys(obj)) {
      const v = obj[k], p = path + "." + k;
      if (typeof v === "string") {
        if (paths[p] != null) obj[k] = paths[p];
        else if (CYR.test(v)) { const t = tr(v); if (t !== v) obj[k] = t; }
      } else if (v && typeof v === "object") walk(v, depth + 1, p);
    }
  }
  const ITEMS = RPG.ITEMS || {};
  for (const k of KEYS) {
    if (k === "ITEMS") continue;
    const v = RPG[k];
    if (v && typeof v === "object") walk(v, 0, k);
    else if (typeof v === "string") RPG[k] = tr(v);
  }
  if (RPG.audio && RPG.audio.TRACKS) walk(RPG.audio.TRACKS, 0, "TRACKS");
  // Літопис: розповіді про битви й підписи записів — готовими функціями (i18n/en-chronicle.js)
  if (RPG.CHRONICLE && pack.chronicle) {
    Object.assign(RPG.CHRONICLE.TALES, pack.chronicle.TALES || {});
    Object.assign(RPG.CHRONICLE.WORDS, pack.chronicle.WORDS || {});
  }

  // Предмети: звичайні — словником; матеріали інших рідкостей і руни — збираються з перекладених частин
  const G = pack.grades || {};
  const items = Object.entries(ITEMS);
  for (const [id, it] of items) if (it.type !== "rune" && !(it.gradeOf && it.type === "material")) walk(it, 0, "ITEMS." + id);
  for (const [id, it] of items) {
    if (it.type === "material" && it.gradeOf && ITEMS[it.gradeOf]) {
      const base = ITEMS[it.gradeOf];
      it.name = (G[it.grade] || it.grade) + " " + base.name;
      if (base.description) it.description = base.description;
    }
  }
  const R = pack.runes;
  if (R && RPG.RUNES) {
    for (const it of Object.values(ITEMS)) {
      if (it.type !== "rune") continue;
      const r = RPG.RUNES[it.rune];
      if (!r) continue;
      const vi = { common: 0, magic: 1, epic: 2, legendary: 3 }[it.grade];
      const value = vi != null && r.vals ? r.vals[vi] : null;
      it.name = R.prefix[it.grade] + " " + r.name;
      it.description = `${R.kind[r.kind]} · ${R.pantheon[r.pantheon]}. "${r.meaning}". ` +
        (value ? `${r.effect}: ${value}. ` : R.broken + " ") + R.where[r.kind];
    }
  }

  // ---------- 2) Сторінка ----------
  const ATTRS = ["title", "placeholder", "aria-label", "alt"];
  const INLINE = new Set(["B", "STRONG", "SPAN", "EM", "I", "SMALL", "SUP", "SUB", "U", "MARK", "CODE", "IMG", "BR"]);
  const isInline = e => INLINE.has(e.tagName) && [...e.children].every(isInline);
  // Рядок, складений скриптом з тексту й вставок (`Попереду: ${назва} (рівень <b>${n}</b>)`):
  // вставки замінюються мітками, речення перекладається цілим, а вставки повертаються на нові місця.
  function trMixed(n) {
    const kids = [...n.childNodes];
    if (kids.length < 2 || kids.length > 40) return false;
    let src = "", els = [];
    for (const c of kids) {
      if (c.nodeType === 3) src += c.nodeValue;
      else if (c.nodeType === 1 && isInline(c)) { src += String.fromCharCode(0xE000 + els.length); els.push(c); }
      else return false;
    }
    if (!els.length || !CYR.test(src.replace(/[\uE000-\uE0FF]/g, "")) || src.length > 800) return false;
    const out = tr(src);
    const seen = out === src ? [] : out.match(/[\uE000-\uE0FF]/g) || [];
    if (seen.length !== els.length || new Set(seen).size !== els.length) {
      // не вийшло з вставками — тоді цілим текстом (виділення чисел губиться), якщо так перекладається повністю
      const plain = n.textContent, t = tr(plain);
      if (t === plain || CYR.test(t) || els.some(e => e.tagName === "IMG" || e.children.length)) return false;
      n.textContent = t;
      return true;
    }
    const frag = document.createDocumentFragment();
    let buf = "";
    for (const ch of out) {
      const code = ch.charCodeAt(0);
      if (code >= 0xE000 && code <= 0xE0FF) {
        if (buf) frag.append(buf);
        buf = "";
        const e = els[code - 0xE000];
        frag.append(e);
        trNode(e);
      } else buf += ch;
    }
    if (buf) frag.append(buf);
    n.replaceChildren(frag);
    return true;
  }
  function trNode(n) {
    if (n.nodeType === 3) {
      const v = n.nodeValue;
      if (!CYR.test(v)) return;
      const p = n.parentNode;
      if (p && p.nodeType === 1 && p.childNodes.length > 1 && trMixed(p)) return;
      const t = tr(v); if (t !== v) n.nodeValue = t;
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = n.tagName;
    if (tag === "SCRIPT" || tag === "STYLE") return;
    for (const a of ATTRS) {
      const v = n.getAttribute(a);
      if (v && CYR.test(v)) { const t = tr(v); if (t !== v) n.setAttribute(a, t); }
    }
    if ((tag === "INPUT") && (n.type === "button" || n.type === "submit") && CYR.test(n.value)) n.value = tr(n.value);
    if (n.firstChild && n.firstChild !== n.lastChild && trMixed(n)) return;
    for (let c = n.firstChild; c; c = c.nextSibling) trNode(c);
  }
  const trTitle = () => { if (CYR.test(document.title)) { const t = tr(document.title); if (t !== document.title) document.title = t; } };
  function start() {
    trTitle();
    trNode(document.body);
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === "characterData") trNode(m.target);
        else if (m.type === "attributes") trNode(m.target);
        else m.addedNodes.forEach(trNode);
      }
      trTitle();
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ATTRS });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})(window.RPG);

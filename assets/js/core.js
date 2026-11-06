// ============================================================
// core.js — спільний простір імен RPG та допоміжні функції.
// Підключається ПЕРШИМ на кожній сторінці.
//
// Усі файли гри — звичайні скрипти (не модулі), тому гра працює
// і при відкритті HTML подвійним кліком, і через Live Server.
// Кожен файл додає свої функції в об'єкт window.RPG.
// ============================================================

window.RPG = window.RPG || {};

(function (RPG) {
  // Корінь гри (папка з index.html) — рахується від цього файлу,
  // тому шляхи правильні і з index.html, і з pages/*.html
  const src = document.currentScript ? document.currentScript.src : location.href;
  RPG.ROOT = new URL("../../", src).href;

  RPG.asset = function (path) {
    return RPG.ROOT + path;
  };

  RPG.randInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Створити DOM-елемент: el("p", "note", "текст") — спільний для game.js, journal.js та інших сторінок
  RPG.el = function (tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  // ---------- Глобальні налаштування (не залежать від сейву) ----------
  const SETTINGS_KEY = "rpg_settings";
  const DEFAULT_SETTINGS = { battleView: "stepByStep", volume: 70, musicVolume: 60, sfxVolume: 80, muted: false };

  // Сховище на пристрої (localStorage): без доступу (приватний режим, заблоковано) — тихо, без помилок
  RPG.storage = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* без сховища */ } },
  };

  RPG.getSettings = function () {
    try {
      const raw = RPG.storage.get(SETTINGS_KEY);
      return Object.assign({}, DEFAULT_SETTINGS, raw ? JSON.parse(raw) : {});
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  };

  RPG.setSettings = function (patch) {
    const next = Object.assign(RPG.getSettings(), patch);
    RPG.storage.set(SETTINGS_KEY, JSON.stringify(next));
    return next;
  };

  // ---------- Мова гри (Налаштування → «Мова / Language», i18n.js) ----------
  // Не обрана в налаштуваннях — за мовою браузера: українська → "uk", будь-яка інша → "en".
  // ---------- Версія гри (головне меню, праворуч унизу) ----------
  // Піднімати при КОЖНОМУ оновленні гри: VERSION — третя цифра +1 (друга — кількість відкритих світів),
  // CACHE_VERSION — те саме число, що в sw.js → CACHE ("rpg-game-vN").
  RPG.VERSION = "0.3.1";
  RPG.CACHE_VERSION = 166;

  RPG.LANGS = { uk: "Українська", en: "English" };
  RPG.lang = (function () {
    const s = RPG.getSettings().lang;
    if (s && RPG.LANGS[s]) return s;
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "uk";
    return /^uk\b/i.test(nav) ? "uk" : "en";
  })();
  // Заглушка перекладу (i18n.js замінює її, коли обрано не українську)
  RPG.t = RPG.t || (s => s);

  // ---------- Автозілля (сторінка «Налаштування» → «Автозілля», character.js → autoPotion) ----------
  // Зберігається на пристрої разом з іншими налаштуваннями (localStorage), у сейв НЕ потрапляє,
  // тож діє для всіх збережень на цьому пристрої.
  //   hp / mp: on — увімкнено; below — пити, коли нижче below% (5…95);
  //            upTo — пити, поки не стане upTo% або більше (≥ below, до 100);
  //            size — "auto" | "small" | "medium" | "large"; fallback — якщо обраного розміру немає, брати інший;
  //            maxPer — не більше стількох зілль цього виду за одну перевірку для одного героя (1…20);
  //            magic — дозволити Чарівне зілля (лише коли звичайних цього виду немає).
  //   Усі параметри — окремо для здоров'я (hp) і мани (mp).
  const AUTO_POTION_DEFAULTS = {
    hp: { on: false, below: 40, upTo: 80, size: "auto", fallback: true, maxPer: 10, magic: false },
    mp: { on: false, below: 40, upTo: 80, size: "auto", fallback: true, maxPer: 10, magic: false }
  };
  const clampInt = (v, min, max, def) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  // Налаштування автозілля з перевіркою меж (збережене могло бути неповним чи зіпсованим)
  RPG.getAutoPotion = function () {
    const raw = RPG.getSettings().autoPotion || {};
    const side = key => {
      const d = AUTO_POTION_DEFAULTS[key], r = raw[key] || {};
      const below = clampInt(r.below, 5, 95, d.below);
      return {
        on: !!r.on,
        below,
        upTo: clampInt(r.upTo, below, 100, Math.max(below, d.upTo)),
        size: ["auto", "small", "medium", "large"].includes(r.size) ? r.size : d.size,
        fallback: r.fallback !== undefined ? !!r.fallback : d.fallback,
        // (ранні налаштування мали maxPer / magic спільні — беруться як стартові для обох)
        maxPer: clampInt(r.maxPer !== undefined ? r.maxPer : raw.maxPer, 1, 20, d.maxPer),
        magic: r.magic !== undefined ? !!r.magic : !!raw.magic
      };
    };
    return { hp: side("hp"), mp: side("mp") };
  };
  RPG.AUTO_POTION_DEFAULTS = AUTO_POTION_DEFAULTS;
})(window.RPG);

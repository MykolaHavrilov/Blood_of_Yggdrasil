// ============================================================
// lang.js — обирає мову гри й підключає словник перекладу ЛИШЕ коли він потрібен.
//
// Українською гра написана, тож для неї словник (i18n/en.js, 600 КБ) не завантажується зовсім.
// Для іншої мови цей файл дописує в сторінку <script defer> зі словником — на тому самому місці,
// де стоїть сам, тому порядок скриптів лишається тим самим: словник → дані → i18n.js.
//
// Єдиний скрипт БЕЗ defer: має виконатися під час розбору сторінки (document.write діє лише тоді).
// Мова: Налаштування → «Мова» (localStorage rpg_settings.lang); не обрана — за мовою браузера.
// Список мов — core.js → RPG.LANGS; нова мова = файли i18n/<код>.js і i18n/<код>-chronicle.js + рядок у LANGS і тут.
// ============================================================
(function () {
  window.RPG = window.RPG || {};
  var LANGS = ["uk", "en"];
  var lang = null;
  try { lang = (JSON.parse(localStorage.getItem("rpg_settings") || "{}") || {}).lang; } catch (e) { /* без сховища — за браузером */ }
  if (LANGS.indexOf(lang) < 0) {
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || "uk";
    lang = /^uk\b/i.test(nav) ? "uk" : "en";
  }
  RPG.lang = lang;
  if (lang === "uk") return;
  var base = document.currentScript.src.replace(/lang\.js(\?.*)?$/, "");
  document.write('<script src="' + base + "i18n/" + lang + '.js" defer><\/script>' +
                 '<script src="' + base + "i18n/" + lang + '-chronicle.js" defer><\/script>');
})();

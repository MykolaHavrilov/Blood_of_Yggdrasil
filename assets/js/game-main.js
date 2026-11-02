// ============================================================
// game-main.js — запуск сторінок: вибір екрана за data-page, музика, подія «Картинка професії».
// Частина колишнього game.js: спільне беремо з game-common.js (RPG.ui), запуск — game-main.js.
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, setBar, fmtNum, fmtDate, fmtStat, MSG_SEC, toastParent, raiseToasts, clearToasts, toastHost, showMsg, showNoGame, requireSave, showKeyPocket, showLootFilter, renderFilterBtn, whenNoDialog, queueDialog, noticeClose, noticeDialog, showNotice, journalReward, meetStranger, showParchment, BOOK, bookMotionOff, bookWide, bookBlobs, bookAnimUrl, playBookAnim, dropBookAnim, chronicleSection, showChronicle, forgeBookTable, forgeBookAuto, forgeBookSection, dataBookSection, openLibraryBook, showDataBook, showForgeBook, fieldLootAdd, showFieldLoot, TRAVEL_HREFS, blockLink, lockNavForTravel, unlockNavAfterTravel, showTravelBanner, startRegenTimer, itemLabel, rarityName, itemIcon, rarityTextClass, miniPlaceholder, fillItemCell, socketMarks, SLOT_SHORT, fillEquipCell, smallIcon, slotClass, renderHeroDoll, renderHeroGs, miniBar, renderPartyList, memberTabs, groupMemberTabs, renderHeroBars, expInfo, bindExpInfo, describeStats, describeEffect, useResultText, locImage, TYPE_NAMES, RARITY_NAMES, itemInfo, MSG_MAX } = RPG.ui;
  const { pageNewGame, pageLoad, pageSettings, pageGame, pageCharacter, pageInventory, pageMaps } = RPG.pages;

  const PAGES = {
    "new-game": pageNewGame,
    "load": pageLoad,
    "settings": pageSettings,
    "game": pageGame,
    "character": pageCharacter,
    "inventory": pageInventory,
    "maps": pageMaps
  };

  // Картинка професії завантажилась пізніше за сторінку — перемалювати героя
  document.addEventListener("rpg:hero-sprite", () => {
    const img = document.getElementById("hero-img");
    if (img && img._save) renderHeroDoll(img, img._save);
  });

  // Музика сторінок без власної логіки звуку (Локація й Мапа обирають трек самі)
  async function pageMusic(page) {
    const A = RPG.audio;
    if (!A) return;
    if (page === "new-game" || page === "load") { A.play("menu"); return; }
    if (page === "settings") {
      const from = new URLSearchParams(location.search).get("from");
      if (!from || from === "index") A.play("menu"); else A.resume();
      return;
    }
    if (page === "character" || page === "inventory") {
      if (A.resume()) return;
      const save = await RPG.loadCurrentGame().catch(() => null);
      if (!save) return;
      const here = RPG.whereIs(save);
      if (RPG.isCombatLocation(save.location.map)) A.scene({ screen: "combat", location: save.location.map, region: here.region });
      else if (here.region === "city") A.scene({ screen: "city", district: here.spot });
      else A.scene({ screen: "map", region: here.region });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    pageMusic(page).catch(() => {});
    if (PAGES[page]) {
      Promise.resolve(PAGES[page]()).catch(e => console.error("[game]", e));
    }
  });

  Object.assign(RPG, { setBar });
})(window.RPG);

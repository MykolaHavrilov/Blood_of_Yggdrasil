// ============================================================
// page-game.js — Екран локації: запуск, герой, швидкий доступ і БІЙ (поле бою, черга дій, данжі, експедиції).
// Мирні локації (Домівка, Храм, Шинок, Дубова Застава, Гільдія) — у файлах page-game-*.js (RPG.gameParts).
// Частина колишнього game.js: спільне беремо з game-common.js (RPG.ui), запуск — game-main.js.
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, setBar, fmtNum, fmtDate, fmtStat, MSG_SEC, toastParent, raiseToasts, clearToasts, toastHost, showMsg, showNoGame, requireSave, showKeyPocket, showLootFilter, renderFilterBtn, whenNoDialog, queueDialog, noticeClose, noticeDialog, showNotice, journalReward, meetStranger, showParchment, BOOK, bookMotionOff, bookWide, bookBlobs, bookAnimUrl, playBookAnim, dropBookAnim, chronicleSection, showChronicle, forgeBookTable, forgeBookAuto, forgeBookSection, dataBookSection, openLibraryBook, showDataBook, showForgeBook, fieldLootAdd, showFieldLoot, TRAVEL_HREFS, blockLink, lockNavForTravel, unlockNavAfterTravel, showTravelBanner, startRegenTimer, itemLabel, rarityName, itemIcon, rarityTextClass, miniPlaceholder, fillItemCell, socketMarks, lockMark, lockButton, SLOT_SHORT, fillEquipCell, smallIcon, slotClass, renderHeroDoll, renderHeroGs, miniBar, renderPartyList, memberTabs, groupMemberTabs, renderHeroBars, expInfo, bindExpInfo, describeStats, describeEffect, useResultText, locImage, TYPE_NAMES, RARITY_NAMES, itemInfo, MSG_MAX } = RPG.ui;

  // ЕКРАН ЛОКАЦІЇ (бій, Домівка, Храм, Шинок)
  // ============================================================
  // Темна душа — Зрадник (dungeon.js → DARK_SOUL): попередження перед 3-м боєм і текст арени
  const DARK_SOUL_LINES = [
    "Замість боса з темряви виходить Темна душа — Зрадник: колишній Перунів посланець, що віддав свій меч Хеллі. Сварогові знаки на клинку ще жевріють, але тепер світять мертвим зеленим вогнем.",
    "Вона вдвічі сильніша за боса цього данжу, а досвіду за неї — уп'ятеро більше. Перемога над нею не рахується як перемога над босом.",
    "Зі зброї Зрадника може лишитися Жарина Небесного горна."
  ];

  async function pageGame() {
    const save = await requireSave();
    if (!save) return;

    const msg = $("msg");

    // Посилання «game.html?loc=…» / «?district=…» — герой не телепортується, а вирушає туди дорогою (travel.js)
    const params = new URLSearchParams(location.search);
    const locParam = params.get("loc");
    const distParam = params.get("district");
    let enterError = null;
    let target = null;
    if (RPG.LOCATIONS[save.location.map]?.type === "city" && distParam && distParam !== RPG.whereIs(save).spot) target = distParam;
    else if (locParam && RPG.LOCATIONS[locParam] && save.location.map !== locParam && locParam !== "city") target = locParam;
    if (target) {
      if (save.fieldLoot) await showFieldLoot(save);
      const r = RPG.startTravel(save, target);
      if (r.ok) {
        await RPG.saveGame(save);
        location.replace("maps.html");
        return;
      }
      enterError = r.reason;
    }
    if (locParam || distParam) history.replaceState(null, "", "game.html");
    if (RPG.velesStrangerDue(save)) setTimeout(() => meetStranger(save).then(() => renderAll()), 300);
    else if (RPG.shamanDue(save)) setTimeout(() => RPG.ui.meetRenouncer(save).then(() => renderAll()), 300);
    if (save.fieldLoot && save.fieldLoot.loc !== save.location.map) setTimeout(() => showFieldLoot(save), 0);
    // Жарини Небесного горна, що згасли, поки їх несли (character.js → tickEmbers)
    RPG.tickEmbers?.(save);
    if (save.emberGone) {
      const n = save.emberGone;
      delete save.emberGone;
      RPG.saveGame(save).catch(e => console.error(e));
      setTimeout(() => showNotice("Жарина згасла", [n > 1 ? `Згасло жарин Небесного горна: ${n}. Ви не встигли донести їх до горна Сварога чи до вівтаря в Храмі Перуна.` : "Жарина Небесного горна згасла: ви не встигли донести її до горна Сварога чи до вівтаря в Храмі Перуна."]), 200);
    }
    const locId = save.location.map;
    const locData = RPG.getLocation(locId);
    // Власний дім показується з назвою, яку дав гравець
    const placeName = locData.house ? (RPG.houseHere(save)?.name || locData.name) : locData.name;
    $("location-name").textContent = placeName;
    $("location-desc").textContent = locData.description;
    // Фон локації (assets/images/locations/loc_<id>.webp) — за портретами та в банері.
    // Якщо картинки ще немає, лишається фон теми.
    // у місті район може мати свій фон (districts[…].image → locations/loc_<image>.webp), напр. Затоплена штольня у Свартгарді
    const distImg = locData.type === "city" ? (locData.districts || []).find(d => d.id === RPG.whereIs(save).spot)?.image : null;
    document.body.style.setProperty("--loc-img", distImg ? `url("${RPG.asset("assets/images/locations/loc_" + distImg + ".webp")}")` : locImage(locId));
    document.body.dataset.loc = locId;

    const combat = RPG.isCombatLocation(locId);
    // Телефон, бойова локація: кнопка локації (перехід на мапу) — над портретами героя й ворога
    if (combat) {
      const locLink = document.querySelector("a.location");
      const home = locLink.parentElement, battleBox = document.querySelector(".battle");
      const phone = window.matchMedia("(max-width: 700px)");
      const place = () => { if (phone.matches) battleBox.before(locLink); else home.prepend(locLink); };
      place();
      phone.addEventListener("change", place);
    }
    $("enemy-col").hidden = !combat;
    $("combat-ui").hidden = !combat;
    $("place-panel").hidden = combat;
    document.querySelector(".battle").classList.toggle("no-enemy", !combat);

    let fighting = false;
    let queueMember = 0;        // обраний герой групи: його чергу дій налаштовуємо, йому — зілля (0 — головний)
    // Чий портрет, смужки HP/MP і швидкий доступ показуємо: обраного героя,
    // а під час показу бою — завжди головного (анімація бою пише в його смужки)
    function heroView() {
      if (!combat || fighting) return save;
      if (queueMember >= RPG.partySize(save)) queueMember = 0;
      return RPG.memberSave(save, queueMember);
    }
    function drawHero() {
      const v = heroView();
      renderHeroBars(v);
      renderPartyList(save, v.memberIndex || 0, combat && !fighting && RPG.partySize(save) > 1 ? pickMember : null);
    }
    // Обрали іншого героя групи (вкладки над чергою дій або клік по рядку групи)
    function pickMember(i) {
      queueMember = i;
      if (fighting) { renderQueue(); return; }
      renderAll();
    }
    // Данж локації (dungeon.js): режим «explore» — звичайні бої, «dungeon» — данж
    const dungeonInfo = combat ? RPG.locationDungeon(locId) : null;
    // Бойова локація з порталом (Серце Темного лісу → Альвгейм): картка над вкладками данжу (картка — renderPortal…)
    let portalBox = null;
    let mode = dungeonInfo && RPG.activeDungeon(save) ? "dungeon" : "explore";
    const dungeonOn = () => mode === "dungeon" && !!RPG.activeDungeon(save);
    // Музика локації: бій — під тип локації (останній бій данжу — тема боса), Дубова Застава — під район
    function playLocationMusic() {
      if (!RPG.audio) return;
      const dun = dungeonOn() ? RPG.activeDungeon(save) : null;
      if (combat) RPG.audio.scene({ screen: "combat", location: locId, region: locData.region, boss: !!(dun && dun.stage === dun.stages) });
      else if (locData.type === "city" && locId !== "city") RPG.audio.scene({ screen: "map", region: "svart" });            // Свартгард — тема свого світу
      else if (locData.type === "citygate" && locData.city && locData.city !== "city") RPG.audio.scene({ screen: "map", region: locData.region });
      else if (locData.type === "city") RPG.audio.scene({ screen: "city", district: save.location.district || "south" });
      else if (locData.type === "citygate") RPG.audio.scene({ screen: "city", district: "south" });
      else RPG.audio.scene({ screen: "map", region: locData.region || "start" });
    }
    playLocationMusic();
    if (enterError) setTimeout(() => showMsg(msg, enterError + " Ви залишились тут.", true), 0);

    function renderQuickSlots() {
      const box = $("quick-slots");
      box.innerHTML = "";
      for (let i = 0; i < 12; i++) {
        const entry = save.inventory[i];
        if (!entry) { box.append(el("div", "wf wf-slot slot-empty", "")); continue; }
        const item = RPG.ITEMS[entry.id];
        const cell = fillItemCell(button("", slotClass(entry)), entry, entry.qty);
        const lm = lockMark(entry);
        if (lm) cell.append(lm);
        cell.removeAttribute("title");
        cell.setAttribute("aria-label", itemLabel(entry));
        const usable = item.type === "consumable";
        const ms = heroView();   // зілля п'є обраний герой групи
        const who = RPG.partySize(save) > 1 ? `${ms.character.name}: ` : "";
        const use = async () => {
          if (fighting) return;
          const r = RPG.useItem(ms, entry.id);
          if (!r.ok) { showMsg(msg, who + r.reason, true); return; }
          showMsg(msg, who + useResultText(item, r));
          await RPG.saveGame(save);
          renderAll();
        };
        if (usable) {
          cell.classList.add("slot-usable");
          cell.addEventListener("dblclick", () => { RPG.popover.hide(); use(); });
        } else {
          cell.classList.add("slot-passive");
        }
        RPG.bindTip(cell, () => itemInfo(entry, entry.qty, ms, { onLock: async () => {
          await RPG.saveGame(save).catch(e => console.error(e));
          cell.querySelector(".item-lock")?.replaceWith(lockMark(entry));
        } }), () => [
          usable && { text: "Використати", className: "wf-button", onClick: use },
          { text: "Інвентар", className: "wf-link", onClick: () => { location.href = "inventory.html"; } }
        ]);
        box.append(cell);
      }
      $("gold").textContent = `Золото: ${fmtNum(save.character.gold)}`;
      const qt = $("quick-title");
      if (qt) qt.textContent = RPG.partySize(save) > 1 ? `Швидкий доступ · ${heroView().character.name}` : "Швидкий доступ";
    }

    // ---------- Мирні локації ----------
    const place = $("place-panel");

    function renderPlace() {
      place.innerHTML = "";
      const banner = el("div", "place-banner info-anchor");
      banner.append(el("h2", null, placeName));
      place.append(banner);
      if (locData.type === "home") renderHome();
      else if (locData.type === "temple") renderTemple();
      else if (locData.type === "tavern") renderTavern();
      else if (locData.type === "city") renderCity();
      else if (locData.type === "gate") renderDarkGate();
      else if (locData.type === "citygate") renderCityGate();
      else if (locData.type === "portal") renderPortalPlace();
      // Скриня в іншій (не Домівка) локації — пов'язана або окрема, див. character.js → CHEST_STORAGES
      if (locData.chest && locData.type !== "home") {
        const used = RPG.chestList(save, locData.chest).length;
        place.append(noteP(`Скриня: ${used}/${RPG.chestConf(locData.chest).size} клітинок зайнято.`));
        place.append(link("Інвентар і скриня", "inventory.html"));
      }
    }

    // ---------- Мирні локації — в окремих файлах (RPG.gameParts; у game.html підключені перед page-game.js) ----------
    //   page-game-home.js   — Домівка, власний дім, кузня, Спальний район
    //   page-game-places.js — брама Темного лісу, Корінь Іггдрасиля, Храм, двір Відреченого, розмови з NPC, Шинок
    //   page-game-shop.js   — купівля й продаж у торговця
    //   page-game-city.js   — Дубова Застава: райони, Торговий район, Рунне горно, Мерія
    //   page-game-guild.js  — Гільдія авантюристів: завдання, шлях професії, Тренер
    //   page-game-alchemy.js — Алхімічний станок (Гільдія ремісників, Храм), колби
    // G — спільне для частин: дані екрана й функції, які частини кличуть одна в одної та в цьому файлі
    const G = { save, msg, place, locData, renderPlace, renderAll, get fighting() { return fighting; } };
    for (const part of ["home", "places", "shop", "city", "guild", "alchemy"]) Object.assign(G, RPG.gameParts[part](G));
    const { renderHome, renderTemple, renderTavern, renderCity, renderDarkGate, renderCityGate, renderPortalPlace, portalOpen, portalCard } = G;

    // ---------- Бій ----------
    const startBtn = $("start-btn");
    const rerollBtn = $("reroll-btn");
    const saveBtn = $("save-btn");
    const logBox = $("battle-log");
    let foes = [];              // вороги наступного бою: [{ id, champion }]
    const fighters = () => RPG.aliveMembers(save);
    // Ворогів — стільки ж, скільки героїв (макс. 6; RPG.enemyGroupRange); данж — без змін
    let champWarn = false;      // показати вікно-попередження про чемпіона
    // Кут поля, де з'являться герої в наступному бою (battle.js → corner 0…3);
    // з кожною новою групою ворогів — інший кут, вороги — у протилежному
    // Краї поля (EDGE_TYPES) і перешкоди за краями (EDGE_COVER) — див. «Краї поля» нижче (fieldEdges, fieldCover).
    // Оголошені тут, бо nextEnemy() кличе fieldCover() ще до того місця.
    const EDGE_TYPES = { trees: "Дерева", rocks: "Скелі", walls: "Стіни", water: "Вода" };
    const EDGE_COVER = { trees: ["tree", "bush"], rocks: ["rock", "stone"], walls: ["wall", "stone"] };
    let corner = RPG.randomCorner();
    let obstacles = [];         // перешкоди наступного бою (battle.js → makeObstacles), нові з кожною групою ворогів
    let foePositions = [];      // стартові місця ворогів (battle.js → placeFoesFree): будь-де на полі, купою або врозкид
    function nextEnemy() {
      corner = RPG.randomCorner(corner);
      obstacles = RPG.makeObstacles(fieldCover(), corner);
      pickFoes();
      foePositions = RPG.placeFoesFree(foes, corner, obstacles);
    }
    function pickFoes() {
      if (mode === "dungeon") {
        // У данжі вороги задані наперед; поки ворота зачинені — показуємо боса
        foes = dungeonOn() ? RPG.dungeonSpecs(save) : [{ id: dungeonInfo.boss, champion: false }];
        RPG.equipFoes(foes, fighters());
        champWarn = false;
        return;
      }
      foes = RPG.rollEnemyGroup(locId, save.character.level, RPG.enemyGroupRange(fighters()), fighters());
      champWarn = foes.some(f => f.champion);
    }

    // Перемикач «Обстеження / Данж» і панель воріт данжу
    const leaveBtn = $("leave-btn");
    function renderMode() {
      const tabs = $("mode-tabs"), panel = $("dungeon-panel");
      if (!dungeonInfo) { tabs.hidden = panel.hidden = true; return; }
      const active = RPG.activeDungeon(save);
      tabs.hidden = false;
      tabs.innerHTML = "";
      const keys = RPG.keyCount(save, dungeonInfo.id);
      [["explore", dungeonInfo.explore], ["dungeon", `${dungeonInfo.name} · ключів: ${keys}`]].forEach(([m, text]) => {
        const b = button(text, "wf member-tab " + (m === mode ? "wf-button" : "wf-link"), () => {
          if (fighting || m === mode) return;
          if (active && m === "explore") { showMsg(msg, "Спершу пройдіть або покиньте данж.", true); return; }
          mode = m;
          nextEnemy();
          renderMode();
          renderEnemy();
          showReady();
        });
        if (m === mode) b.setAttribute("aria-pressed", "true");
        tabs.append(b);
      });

      const inGate = mode === "dungeon" && !active;
      panel.hidden = !inGate;
      rerollBtn.hidden = mode === "dungeon";
      startBtn.hidden = inGate;
      leaveBtn.hidden = !(mode === "dungeon" && active);
      startBtn.textContent = active && mode === "dungeon" ? `Почати бій ${active.stage} з ${active.stages}` : "Почати бій";
      if (!inGate) return;
      panel.innerHTML = "";
      panel.append(el("h3", null, `Данж «${dungeonInfo.name}»`), noteP(dungeonInfo.description));
      panel.append(noteP(
        `3 бої поспіль: 1) ${RPG.DUNGEON_POOL_TEXT(dungeonInfo, 1)}; 2) ${RPG.DUNGEON_POOL_TEXT(dungeonInfo, 2)}; ` +
        `3) бос «${RPG.ENEMIES[dungeonInfo.boss].name}». Зілля й відновлення HP/MP у данжі не діють — ` +
        "лікують лише навички. Досвід і здобич — тільки за перемогу над босом."));
      panel.append(el("p", "note" + (keys ? "" : " is-neg"),
        `${RPG.ITEMS[dungeonInfo.key].name} у кишені для ключів: ${keys}. Одна спроба — один ключ (зникає при вході). ` +
        `Ключ можна знайти під час «${dungeonInfo.explore}» — шанс ${Math.round(dungeonInfo.keyChance * 100)}% з кожного ворога.`));
      if (dungeonInfo.minLevel) panel.append(el("p", "note" + (save.character.level < dungeonInfo.minLevel ? " is-neg" : ""),
        `Бій у данжі — з ${dungeonInfo.minLevel} рівня персонажа.`));
      const open = button("Відчинити ворота (−1 ключ)", "wf wf-button", async () => {
        if (fighting) return;
        if (!confirm(`Відчинити ворота? ${RPG.ITEMS[dungeonInfo.key].name} зникне, навіть якщо данж не вдасться пройти.`)) return;
        const r = RPG.openDungeon(save, dungeonInfo.id);
        if (!r.ok) { showMsg(msg, r.reason, true); return; }
        await RPG.saveGame(save);
        showMsg(msg, "Ворота відчинено. Бій 1 з 3 — зілля й відновлення тут не діють.");
        nextEnemy();
        renderMode();
        renderEnemy();
        showReady();
        renderQuickSlots();
      });
      open.disabled = !keys || !fighters().length;
      panel.append(open);
    }
    // Вікно «Увага, чемпіон!» — з'являється, коли серед ворогів є чемпіон
    // Показується в черзі вікон (queueDialog): після «Незнайомця» та інших повідомлень, а не поверх них
    function showChampionWarning() { queueDialog(openChampionWarning); }
    function openChampionWarning() {
      if (fighting || !foes.some(f => f.champion)) return null;   // поки чекали — ворога вже змінили
      let dlg = $("champion-dialog");
      if (!dlg) {
        dlg = el("dialog", "champion-dialog");
        dlg.id = "champion-dialog";
        document.body.append(dlg);
      }
      const i = foes.findIndex(f => f.champion);
      const e = curEnemy(i);
      dlg.innerHTML = "";
      const face = el("span", "champion-face");
      Object.assign(face.style, RPG.enemySpriteStyle(foes[i].id));
      dlg.append(el("div", "champion-badge", "Увага — чемпіон!"), face,
        el("h3", null, `${e.name} · рівень ${e.level}`),
        el("p", null, "Утричі сильніший за звичайного: здоров'я, мана, атака, магія й захист ×3. " +
          "За перемогу — трофей рідкісної якості й нагорода ×5 в Артеміди, адміністратора гільдії."));
      const row = el("div", "row dialog-actions");
      row.append(
        button("Прийняти виклик", "wf wf-button", () => dlg.close()),
        button("Шукати іншого ворога", "wf wf-link", () => { dlg.close(); $("reroll-btn")?.click(); }));
      dlg.append(row);
      if (!dlg.open) dlg.showModal();
      return dlg;
    }
    function curEnemy(i = 0) { return RPG.enemyFromSpec(foes[i]); }
    const gsText = e => (e.gs ? ` · GS ${e.gs}` : "");
    // Зброя гуманоїда і його дальність (monstergear.js)
    const weaponText = e => (e.weaponName ? ` · ${e.weaponName} (дальн. ${RPG.enemyRange(e)})` : "");
    const anyChampion = () => foes.some(f => f.champion);
    if (combat) nextEnemy();

    // Ворог(и): великий портрет — перший; якщо їх кілька — список з HP / MP кожного
    function renderEnemy() {
      if (champWarn) { champWarn = false; setTimeout(showChampionWarning, 50); }
      if (!fighting) renderField();
      const enemy = curEnemy(0);
      const champ = foes[0].champion;
      $("enemy-img").closest("figure").classList.toggle("is-champion", champ);
      $("enemy-col").classList.toggle("is-champion", anyChampion());
      Object.assign($("enemy-img").style, RPG.enemySpriteStyle(foes[0].id));
      $("enemy-img").setAttribute("aria-label", enemy.name);
      $("enemy-name").textContent = `${enemy.name} (рівень ${enemy.level}${gsText(enemy)})` + (foes.length > 1 ? ` + ще ${foes.length - 1}` : "");
      setBar($("enemy-hp"), enemy.stats.hp, enemy.stats.hp);
      const mpBar = $("enemy-mp");
      mpBar.hidden = !enemy.stats.mp;
      if (enemy.stats.mp) setBar(mpBar, enemy.stats.mp, enemy.stats.mp);

      const list = $("enemy-list");
      if (!list) return;
      list.innerHTML = "";
      list.hidden = foes.length < 2;
      if (foes.length < 2) return;
      list.append(el("div", "party-title", `Ворогів: ${foes.length}`));
      foes.forEach((f, i) => {
        const e = curEnemy(i);
        const row = el("div", "party-row" + (f.champion ? " is-champion" : ""));
        const face = el("span", "party-face");
        Object.assign(face.style, RPG.enemySpriteStyle(f.id));
        const info = el("div", "party-info");
        info.append(el("strong", null, `${e.name} · рів. ${e.level}${gsText(e)}${f.champion ? " · чемпіон" : ""}${e.boss ? " · бос" : ""}${weaponText(e)}`));
        const hp = miniBar("bar-hp", "HP", "foe-hp-" + i);
        setBar(hp, e.stats.hp, e.stats.hp);
        info.append(hp);
        if (e.stats.mp) {
          const mp = miniBar("bar-mp", "MP", "foe-mp-" + i);
          setBar(mp, e.stats.mp, e.stats.mp);
          info.append(mp);
        }
        row.append(face, info);
        list.append(row);
      });
    }

    // ---------- Поле бою 15 × 30 (battle.js → BATTLE_FIELD, fieldPos, placeHeroes, placeFoes) ----------
    // Логічно поле 15 рядків × 30 стовпців. На ПК показується так само (широке),
    // на телефоні (≤ 700 px) — повернуте: 30 рядків × 15 стовпців (високе).
    // Герої стоять у куті corner (зона 3 × 3), вороги — будь-де на полі (купою або врозкид),
    // але не ближче ніж на хід руху до героїв (battle.js → placeFoesFree).
    // Розстановку героїв обирає гравець (вікно розстановки) — ВІДНОСНО своєї зони 3 × 3
    // (c 2 — передній ряд), і вона зберігається в save.formation:
    // { main: { r, c }, <id напарника>: { r, c } }. Якщо для всіх героїв групи вона вже є —
    // використовується щоразу, у будь-якому куті; інакше вікно з'являється перед першим боєм.
    const FIELD = RPG.BATTLE_FIELD;
    const fieldBox = $("bfield");
    const fieldTokens = { hero: [], enemy: [] };
    const mobileField = window.matchMedia ? window.matchMedia("(max-width: 700px)") : { matches: false };
    // Повернули телефон / змінили ширину вікна — перемалювати поле під новий вигляд (не під час бою)
    mobileField.addEventListener?.("change", () => { if (combat && !fighting) renderField(); });
    const memberKey = ms => (ms.memberIndex ? (save.party[ms.memberIndex - 1]?.id || "m" + ms.memberIndex) : "main");
    function formationOf(team) {
      const f = save.formation || {};
      return RPG.placeHeroes(team, team.map(ms => f[memberKey(ms)]));
    }
    function storeFormation(team, pos) {
      save.formation = {};
      team.forEach((ms, i) => { if (pos[i]) save.formation[memberKey(ms)] = { r: pos[i].r, c: pos[i].c }; });
      save.formationAt = locId;
    }
    // Чи вже є розстановка для всіх, хто йде в бій (нового напарника треба поставити)
    const inZone = p => p && p.r >= 0 && p.r < FIELD.zone && p.c >= 0 && p.c < FIELD.zone;
    const placedHere = () => {
      const f = save.formation || {};
      const team = fighters();
      return team.length > 0 && team.every(ms => inZone(f[memberKey(ms)]));
    };

    // Як клітинка (r, c) стоїть на екрані: box.bfView = { rows, cols, map(p) → { row, col }, scale }
    function setView(box, rows, cols, map, scale = 1) {
      box.bfView = { rows, cols, map, scale };
      box.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      box.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
      box.style.setProperty("--bf-ar", cols / rows);
    }
    function addCell(box, p, cls) {
      const v = box.bfView.map(p);
      const cell = el("div", "bf-cell " + cls);
      cell.dataset.r = p.r;
      cell.dataset.c = p.c;
      cell.style.gridRow = v.row + 1;
      cell.style.gridColumn = v.col + 1;
      box.append(cell);
      return cell;
    }
    // ---------- Краї поля: дерева / скелі / стіни / вода (data/enemies.js → LOCATIONS / DUNGEONS → edge) ----------
    // Поле обгортається рамкою .bf-frame з чотирма смугами .bf-edge (суто для вигляду, на бій не впливають).
    // Логічні краї [верх, право, низ, ліво] поточної локації (у данжі — краї данжу, якщо задані)
    function fieldEdges() {
      const src = (mode === "dungeon" && dungeonInfo?.edge) || locData?.edge || "trees";
      const arr = Array.isArray(src) ? src : [src, src, src, src];
      return [0, 1, 2, 3].map(i => (EDGE_TYPES[arr[i]] ? arr[i] : "trees"));
    }
    // Які перешкоди бувають на полі: з LOCATIONS / DUNGEONS → cover = { block: [...], low: [...] },
    // а без нього — за краями: дерева → дерева й кущі, скелі → скелі й каміння, стіни → стіни й уламки-каміння
    function fieldCover() {
      const own = (mode === "dungeon" && dungeonInfo?.cover) || locData?.cover;
      if (own) return own;
      const kinds = [...new Set(fieldEdges())].filter(k => EDGE_COVER[k]);
      if (!kinds.length) kinds.push("trees");                  // лише вода — тоді дерева й кущі
      return { block: kinds.map(k => EDGE_COVER[k][0]), low: [...new Set(kinds.map(k => EDGE_COVER[k][1]))] };
    }
    const OBST_TITLES = {
      tree: "Дерево — не пройти й не видно ціль", rock: "Скеля — не пройти й не видно ціль", wall: "Стіна — не пройти й не видно ціль",
      bush: "Кущ — не стати, але ціль видно (лук, заклинання)", stone: "Каміння — не стати, але ціль видно (лук, заклинання)"
    };
    let fieldFrame = null;
    function frameField(mob) {
      if (!fieldBox) return;
      if (!fieldFrame) {
        fieldFrame = el("div", "bf-frame");
        fieldBox.parentNode.insertBefore(fieldFrame, fieldBox);
        fieldFrame.append(fieldBox);
        for (const side of ["top", "right", "bottom", "left"]) fieldFrame.append(el("div", "bf-edge bf-edge-" + side));
      }
      const [t, r, b, l] = fieldEdges();
      // На телефоні поле повернуте (рядок ↔ стовпець): логічний лівий край стає верхнім,
      // нижній — правим, правий — нижнім, верхній — лівим
      const shown = mob ? [l, b, r, t] : [t, r, b, l];
      fieldFrame.className = "bf-frame" + (mob ? " is-mobile" : "") + (locData?.region === "dark" ? " is-dark" : "");
      ["top", "right", "bottom", "left"].forEach((side, i) => {
        const strip = fieldFrame.querySelector(".bf-edge-" + side);
        strip.className = `bf-edge bf-edge-${side} edge-${shown[i]}`;
        strip.title = EDGE_TYPES[shown[i]];
      });
    }

    // Велике поле: 450 клітинок, підсвічені зони кутів героїв і ворогів
    function fieldGrid(box, heroCorner = corner, obst = obstacles) {
      box.innerHTML = "";
      const mob = mobileField.matches;
      if (box === fieldBox) frameField(mob);
      box.className = "bfield bf-big" + (mob ? " is-mobile" : "");
      setView(box, mob ? FIELD.cols : FIELD.rows, mob ? FIELD.rows : FIELD.cols,
        mob ? p => ({ row: p.c, col: p.r }) : p => ({ row: p.r, col: p.c }), 1.3);
      const zone = {};
      for (const z of RPG.zoneCells(heroCorner)) zone[z.r + ":" + z.c] = "bf-hero" + (z.front ? " bf-front" : "");
      const ob = {};
      for (const o of obst || []) ob[o.r + ":" + o.c] = o;
      for (let r = 0; r < FIELD.rows; r++) {
        for (let c = 0; c < FIELD.cols; c++) {
          const o = ob[r + ":" + c];
          const cell = addCell(box, { r, c }, o ? `bf-gap bf-obst ob-${o.kind}${o.block ? " is-block" : " is-low"}` : (zone[r + ":" + c] || "bf-gap"));
          if (o) cell.title = OBST_TITLES[o.kind] || "";
        }
      }
    }
    // Вікно розстановки: лише своя зона 3 × 3 і смуга «у бік поля» з боку переднього ряду
    // (на ПК — праворуч, на телефоні — знизу)
    function zoneGrid(box, extra = "") {
      box.innerHTML = "";
      const mob = mobileField.matches;
      box.className = "bfield bf-zone" + (mob ? " is-mobile" : "") + (extra ? " " + extra : "");
      const n = FIELD.zone;
      setView(box, mob ? n + 1 : n, mob ? n : n + 1,
        mob ? p => ({ row: p.c, col: p.r }) : p => ({ row: p.r, col: p.c }));
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) addCell(box, { r, c }, "bf-hero" + (c === n - 1 ? " bf-front" : ""));
      const toward = el("div", "bf-toward", mob ? "↓ у бік поля ↓" : "у бік поля →");
      if (mob) { toward.style.gridRow = n + 1; toward.style.gridColumn = "1 / -1"; }
      else { toward.style.gridColumn = n + 1; toward.style.gridRow = "1 / -1"; }
      box.append(toward);
    }
    // Іконка учасника: портрет + маленькі смужки HP / MP
    function fieldToken(kind, name, sprite, extra = "") {
      const t = el("div", "bf-unit is-" + kind + (extra ? " " + extra : ""));
      t.dataset.name = name;
      const face = el("span", "bf-face");
      Object.assign(face.style, sprite);
      const bars = el("span", "bf-bars");
      for (const cls of ["bf-bar-hp", "bf-bar-mp"]) {
        const b = el("span", "bf-bar " + cls);
        b.append(el("i"));
        bars.append(b);
      }
      t.append(face, bars);
      return t;
    }
    // Іконка на клітинці p (логічні r, c) поля box; scale > 1 — трохи більша за клітинку (по центру)
    function tokenPos(t, p, box = fieldBox) {
      const v = box?.bfView;
      if (!p || !v) return;
      const q = v.map(p), k = v.scale || 1;
      t.style.width = (k * 100 / v.cols) + "%";
      t.style.height = (k * 100 / v.rows) + "%";
      t.style.left = ((q.col - (k - 1) / 2) * 100 / v.cols) + "%";
      t.style.top = ((q.row - (k - 1) / 2) * 100 / v.rows) + "%";
    }
    function tokenBars(t, hp, maxHp, mp, maxMp) {
      const [h, m] = t.querySelectorAll(".bf-bar i");
      h.style.width = Math.max(0, Math.min(100, hp / Math.max(1, maxHp) * 100)) + "%";
      m.parentElement.hidden = !maxMp;
      if (maxMp) m.style.width = Math.max(0, Math.min(100, mp / maxMp * 100)) + "%";
      t.classList.toggle("is-dead", hp <= 0);
      const label = `${t.dataset.name} — HP ${Math.max(0, Math.round(hp))} / ${Math.round(maxHp)}` + (maxMp ? `, MP ${Math.round(mp)} / ${Math.round(maxMp)}` : "");
      t.title = label;
      t.setAttribute("aria-label", label);
    }
    const heroTokenFor = ms => fieldToken("hero", ms.character.name, RPG.heroSpriteStyle(ms.character.classId, RPG.heroGender(ms)));
    const foeTokenFor = (f, e) => fieldToken("enemy", e.name + weaponText(e), RPG.enemySpriteStyle(f.id),
      (f.champion ? "is-champion" : "") + (e.boss ? " is-boss" : ""));

    // Поле над журналом: як стоятимуть герої й вороги в наступному бою.
    // heroPos / foePos / team / maxStats — для показу бою (інакше — поточна розстановка)
    function renderField(opts = {}) {
      if (!fieldBox) return;
      const team = opts.team || fighters();
      const hc = Number.isInteger(opts.corner) ? opts.corner : corner;
      const heroPos = opts.heroPos || formationOf(team).map(p => RPG.fieldPos(p, hc));
      if (foePositions.length !== foes.length) foePositions = RPG.placeFoesFree(foes, corner, obstacles);
      const foePos = opts.foePos || foePositions;
      fieldGrid(fieldBox, hc, opts.obstacles || obstacles);
      fieldTokens.hero = team.map((ms, k) => {
        const t = heroTokenFor(ms);
        const st = opts.maxStats?.[k] || RPG.calcStats(ms);
        tokenPos(t, heroPos[k]);
        tokenBars(t, ms.character.hp, st.hp, ms.character.mp, st.mp);
        fieldBox.append(t);
        return t;
      });
      fieldTokens.enemy = foes.map((f, i) => {
        const e = curEnemy(i);
        const t = foeTokenFor(f, e);
        tokenPos(t, foePos[i]);
        tokenBars(t, e.stats.hp, e.stats.hp, e.stats.mp || 0, e.stats.mp || 0);
        fieldBox.append(t);
        return t;
      });
    }
    // Подія бою на полі: позиції, смужки, хто діє, по кому влучили
    function fieldEvent(ev, prev, team, maxStats) {
      (ev.heroes || []).forEach((h, k) => {
        const t = fieldTokens.hero[k];
        if (!t) return;
        tokenPos(t, h.pos);
        tokenBars(t, h.hp, maxStats[k].hp, h.mp, maxStats[k].mp);
        const was = prev?.heroes?.[k];
        if (was && was.hp !== h.hp) RPG.fx.hit(t, h.hp - was.hp, ev.crit ? "crit" : "");
      });
      (ev.enemies || []).forEach((st, i) => {
        const t = fieldTokens.enemy[i];
        if (!t) return;
        const e = curEnemy(i);
        tokenPos(t, st.pos);
        tokenBars(t, st.hp, e.stats.hp, st.mp, e.stats.mp || 0);
        const was = prev?.enemies?.[i];
        if (was && was.hp !== st.hp) RPG.fx.hit(t, st.hp - was.hp, ev.crit ? "crit" : "");
      });
      fieldBox.querySelectorAll(".is-acting, .is-target").forEach(n => n.classList.remove("is-acting", "is-target"));
      const pick = r => (r ? fieldTokens[r.side]?.[r.i] : null);
      const a = pick(ev.actor), tg = pick(ev.target);
      if (a) { a.classList.add("is-acting"); RPG.fx.act(a); }
      if (tg && tg !== a) tg.classList.add("is-target");
    }

    // ---------- Вікно розстановки героїв ----------
    // Перетягнути портрет на клітинку своєї зони або натиснути героя, потім клітинку.
    // onDone() — що робити після «Готово» (наприклад, почати бій)
    function openFormation(onDone = null) {
      if (document.querySelector("dialog[open]:not(#formation-dialog)")) { queueDialog(() => { openFormation(onDone); return $("formation-dialog"); }); return; }
      const team = fighters();
      if (!team.length) { showMsg(msg, "Усі герої групи полягли — розставляти нікого.", true); return; }
      const f = save.formation || {};
      // Хто вже має збережене місце — стоїть на ньому; інші чекають унизу
      const auto = RPG.placeHeroes(team, team.map(ms => f[memberKey(ms)]));
      let pos = team.map((ms, i) => (f[memberKey(ms)] ? auto[i] : null));
      let selected = null;

      let dlg = $("formation-dialog");
      if (!dlg) {
        dlg = el("dialog", "formation-dialog");
        dlg.id = "formation-dialog";
        document.body.append(dlg);
      }
      dlg.innerHTML = "";
      const close = noticeClose("Закрити", () => dlg.close());
      const field = el("div", "bfield bf-zone");
      const tray = el("div", "bf-tray");
      tray.setAttribute("aria-label", "Герої, яких ще не розставлено");
      const hint = el("p", "bf-hint");
      const btnAuto = button("Розставити автоматично", "wf wf-link", () => {
        pos = RPG.placeHeroes(team, pos.map(p => p || undefined));
        selected = null;
        draw();
      });
      const btnOk = button(onDone ? "До бою!" : "Готово", "wf wf-button", async () => {
        if (pos.some(p => !p)) return;
        storeFormation(team, pos);
        await RPG.saveGame(save);
        dlg.close();
        renderField();
        if (onDone) onDone();
        else showMsg(msg, "Розстановку збережено.");
      });
      const row = el("div", "row dialog-actions");
      row.append(btnOk, btnAuto, button("Скасувати", "wf wf-link", () => dlg.close()));
      dlg.append(close, el("h3", null, "Розстановка героїв"),
        noteP("Ваша зона — 3×3 клітинки. У кожному бою група з'являється в іншому куті поля, " +
          "а вороги — будь-де на полі (купою або врозкид), але не ближче ніж на хід руху. Розстановка задається відносно " +
          "кута: передній ряд (виділений) дивиться в бік поля. " +
          "Перетягніть героя на клітинку або натисніть на героя, а потім на клітинку. " +
          "Дальність: ближній бій — 1 клітинка, посох (заклинання) — 2, лук — 3. Схема збережеться для наступних боїв і локацій."),
        field, tray, hint, row);

      function placeAt(i, p) {
        const j = pos.findIndex((q, k) => k !== i && q && q.r === p.r && q.c === p.c);
        if (j >= 0) pos[j] = pos[i] ? { ...pos[i] } : null;   // обмін місцями (або той іде вниз)
        pos[i] = { r: p.r, c: p.c };
      }
      function tokenClick(i) {
        if (selected !== null && selected !== i && pos[i]) { placeAt(selected, pos[i]); selected = null; }
        else selected = selected === i ? null : i;
        draw();
      }
      function cellClick(cell) {
        const p = { r: +cell.dataset.r, c: +cell.dataset.c };
        if (selected === null) return;
        placeAt(selected, p);
        selected = null;
        draw();
      }
      // Перетягування мишею й пальцем (pointer events); короткий дотик без руху — це клік
      function bindDrag(node, i) {
        node.tabIndex = 0;
        node.setAttribute("role", "button");
        node.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tokenClick(i); } });
        node.addEventListener("pointerdown", ev => {
          if (ev.button > 0) return;
          ev.preventDefault();
          const sx = ev.clientX, sy = ev.clientY;
          let ghost = null, over = null;
          try { node.setPointerCapture(ev.pointerId); } catch (e) { /* без захоплення теж працює */ }
          const cellAt = (x, y) => document.elementFromPoint(x, y)?.closest(".bf-cell.bf-hero");
          const move = e => {
            if (!ghost && Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
            if (!ghost) {
              ghost = node.cloneNode(true);
              ghost.className = "bf-unit is-hero bf-ghost";
              ghost.style.width = node.offsetWidth + "px";
              ghost.style.height = node.offsetHeight + "px";
              document.body.append(ghost);
              node.classList.add("is-dragging");
            }
            ghost.style.left = e.clientX + "px";
            ghost.style.top = e.clientY + "px";
            const c = cellAt(e.clientX, e.clientY);
            if (c !== over) { over?.classList.remove("is-over"); over = c; over?.classList.add("is-over"); }
          };
          const end = (e, cancel) => {
            node.removeEventListener("pointermove", move);
            node.removeEventListener("pointerup", up);
            node.removeEventListener("pointercancel", cancelUp);
            over?.classList.remove("is-over");
            node.classList.remove("is-dragging");
            if (!ghost) { if (!cancel) tokenClick(i); return; }
            ghost.remove();
            if (cancel) return;
            const cell = cellAt(e.clientX, e.clientY);
            if (cell) placeAt(i, { r: +cell.dataset.r, c: +cell.dataset.c });
            else if (document.elementFromPoint(e.clientX, e.clientY)?.closest(".bf-tray")) pos[i] = null;
            selected = null;
            draw();
          };
          const up = e => end(e, false);
          const cancelUp = e => end(e, true);
          node.addEventListener("pointermove", move);
          node.addEventListener("pointerup", up);
          node.addEventListener("pointercancel", cancelUp);
        });
      }

      function draw() {
        zoneGrid(field, "is-setup" + (selected !== null ? " has-pick" : ""));
        field.querySelectorAll(".bf-cell.bf-hero").forEach(cell => {
          cell.addEventListener("click", () => cellClick(cell));
        });
        tray.innerHTML = "";
        team.forEach((ms, i) => {
          const st = RPG.calcStats(ms);
          const t = heroTokenFor(ms);
          tokenBars(t, ms.character.hp, st.hp, ms.character.mp, st.mp);
          const w = RPG.ITEMS[RPG.refId(ms.equipment.mainHand)];
          const reach = RPG.actionRange(w?.weaponType || null, w?.weaponType === "staff");
          t.append(el("span", "bf-name", `${ms.character.name} · ${reach}`));
          t.title += ` · дальність ${reach}`;
          if (i === selected) t.classList.add("is-picked");
          bindDrag(t, i);
          if (pos[i]) { tokenPos(t, pos[i], field); field.append(t); }
          else { t.classList.add("in-tray"); tray.append(t); }
        });
        tray.classList.toggle("is-empty", !tray.children.length);
        if (!tray.children.length) tray.append(el("span", "bf-tray-empty", "Усі герої на полі. Перетягніть сюди, щоб прибрати з клітинки."));
        const left = pos.filter(p => !p).length;
        btnOk.disabled = left > 0;
        hint.textContent = left
          ? `Ще не розставлено: ${left}. ${selected !== null ? "Тепер натисніть клітинку своєї зони." : ""}`
          : selected !== null ? "Натисніть клітинку своєї зони або іншого героя, щоб помінятися місцями." : "Усі на місцях — можна в бій.";
      }
      draw();
      if (!dlg.open) dlg.showModal();
    }

    function renderQueue() {
      const box = $("queue");
      box.innerHTML = "";
      if (queueMember >= RPG.partySize(save)) queueMember = 0;
      const qms = RPG.memberSave(save, queueMember);
      memberTabs($("queue-member"), save, queueMember, pickMember);
      const weaponRef = qms.equipment.mainHand;
      const weaponItem = RPG.ITEMS[RPG.refId(weaponRef)];
      const weaponSt = weaponItem ? RPG.itemStats(weaponRef) : {};
      const magicWeapon = weaponItem && (weaponSt.magic || 0) > (weaponSt.attack || 0);
      // Варіанти для кожної клітинки: порожньо, звичайний удар, вивчені навички цієї зброї
      const wtype = weaponItem?.weaponType || null;
      const options = [["", "—"], ["attack", "Удар"]];
      if (weaponItem?.weaponType === "staff") options.push(["spell", "Іскра (4 MP)"]);
      if (wtype) {
        for (const id of RPG.skillsForWeapon(wtype, qms.character.classId)) {
          if (RPG.skillLevel(qms, id) > 0) options.push([id, `${RPG.SKILLS[id].name} (${RPG.SKILLS[id].mp} MP)`]);
        }
      }
      for (let i = 0; i < RPG.QUEUE_SIZE; i++) {
        const action = qms.battleQueue[i] || "";
        const sel = el("select", "wf wf-slot queue-select" + (action ? "" : " slot-empty"));
        sel.title = `Дія ${i + 1}`;
        sel.setAttribute("aria-label", `Дія ${i + 1} у черзі`);
        const opts = options.slice();
        if (action && !opts.some(o => o[0] === action)) {
          const sk = RPG.SKILLS[action];
          opts.push([action, sk ? `${sk.name} (недоступна — буде удар)` : (action === "spell" ? "Іскра (лише з посохом)" : action)]);
        }
        for (const [val, text] of opts) {
          const o = el("option", null, `${i + 1}. ${text}`);
          o.value = val;
          if (val === action) o.selected = true;
          sel.append(o);
        }
        sel.addEventListener("change", async () => {
          if (fighting) return;
          qms.battleQueue[i] = sel.value;
          for (let k = 0; k < RPG.QUEUE_SIZE; k++) qms.battleQueue[k] ??= "";
          qms.battleQueue.length = RPG.QUEUE_SIZE;
          if (!qms.battleQueue.some(Boolean)) qms.battleQueue[0] = "attack";
          await RPG.saveGame(save);
          renderQueue();
        });
        // Невеличке зображення навички зліва в клітинці (assets/images/skills/<id>.webp), якщо воно є;
        // для удару, «Іскри» й порожньої клітинки — без зображення
        const cell = el("div", "queue-cell");
        if (RPG.SKILLS[action]) {
          const icon = el("img", "queue-icon");
          icon.alt = "";
          icon.onerror = () => { icon.remove(); cell.classList.remove("has-icon"); };
          icon.src = RPG.asset(`assets/images/skills/${action}.webp`);
          cell.classList.add("has-icon");
          cell.append(icon);
        }
        cell.append(sel);
        box.append(cell);
      }
      const who = RPG.partySize(save) > 1 ? `${qms.character.name}: ` : "";
      $("weapon-info").textContent = who + (weaponItem
        ? `Зброя: ${RPG.itemFullName(weaponRef)} · дальність ${RPG.actionRange(weaponItem.weaponType, false)}${weaponItem.weaponType === "staff" ? " (заклинання — 2)" : ""}`
        : "Зброя: немає (бій кулаками)");
    }

    function renderCombatPortal() {
      if (!combat || !locData.portal) return;
      if (!portalOpen(locData.portal)) { portalBox?.remove(); portalBox = null; return; }
      const card = portalCard(locData.portal);
      if (portalBox) portalBox.replaceWith(card); else $("mode-tabs").before(card);
      portalBox = card;
    }

    // Експедиція (expedition.js): панель стану під назвою локації
    const activeExpN = () => (RPG.expeditionList?.(save) || []).filter(e => !e.done).length;
    let expBox = null, expWasActive = activeExpN();
    function renderExpedition() {
      const panel = RPG.ui.expeditionPanel(save, () => renderAll());
      if (expBox) expBox.remove();
      expBox = panel;
      if (panel) document.querySelector("a.location")?.after(panel);
      const active = activeExpN();
      if (active < expWasActive) showMsg(msg, "Експедиція повернулась — заберіть здобич.");
      expWasActive = active;
    }

    function renderAll() {
      renderExpedition();
      renderCombatPortal();
      drawHero();
      renderQuickSlots();
      if (combat) renderQueue();
      if (combat && !fighting) renderField();
      else renderPlace();
    }

    // Короткий стан бою (logBox): заголовок і рядки. Повний журнал — у вікні (journal.js).
    // Під час показу бою (liveLines) рядки ще й ідуть у відкрите вікно журналу.
    let liveLines = null;     // рядки бою, що зараз показується
    let liveEntry = null;     // його запис у save.battleLog (у вікні не показуємо, поки бій іде)
    let journalCtl = null;    // відкрите вікно журналу
    function statusAppend(line) {
      logBox.append(RPG.logLi(line));   // смужка на 2 рядки: видно початок (головне), решта — у журналі
    }
    function setArena(title, lines, state = "") {
      logBox.innerHTML = "";
      const all = [["title", title, state], ...(lines || []).map(l => ["info", l])];
      all.forEach(statusAppend);
      if (liveLines) all.forEach(l => { liveLines.push(l); journalCtl?.append(l); });
    }

    const foesText = () => foes.map((f, i) => { const e = curEnemy(i); return `${e.name} (рівень ${e.level})`; }).join(", ");

    function showReady() {
      if (mode === "dungeon") {
        const a = RPG.activeDungeon(save);
        logBox.innerHTML = "";
        if (!a) {
          setArena(`Данж «${dungeonInfo.name}»`, [`Ворота зачинені. Попереду чекає бос: ${foesText()}.`,
            "Відчиніть ворота ключем (панель вище)."], "ready");
          return;
        }
        const lines = [`Бій ${a.stage} з ${a.stages}: ${foesText()}.`,
          "Зілля й відновлення в данжі не діють — лікують лише навички."];
        if (a.stage < a.stages) lines.push("За цей бій нагороди немає — досвід і здобич дає лише бос.");
        else if (a.darkSoul) lines.push(...DARK_SOUL_LINES);
        else lines.push("Це БОС! Кожен третій свій хід він застосовує особливу навичку. Перемога — нагорода за весь данж.");
        if (!fighters().length) lines.push("Усі герої групи полягли.");
        setArena(a.stage < a.stages ? `Данж: бій ${a.stage} з ${a.stages}` : a.darkSoul ? "З'явилась темна душа!" : "Данж: бос!", lines, "ready");
        return;
      }
      const lvl = save.character.level;
      const strong = foes.some((f, i) => curEnemy(i).level >= lvl + 2);
      const lines = [`Попереду: ${foesText()}.${strong ? " Обережно: серед них є значно сильніші!" : ""}`];
      if (foes.length > 1) lines.push(`Ворогів: ${foes.length}, у вашій групі живих героїв: ${fighters().length}.`);
      if (anyChampion()) lines.push("Серед них рідкісний ЧЕМПІОН: утричі сильніший! За перемогу — трофей і нагорода ×5 у Гільдії авантюристів.");
      if (foes.some((f, i) => curEnemy(i).boss)) lines.push("Це БОС! Кожен третій свій хід він застосовує особливу навичку.");
      if (!fighters().length) lines.push(RPG.expeditionActive?.(save) ? "Удома немає героїв, готових до бою: решта — в експедиції або полягла." : "Усі герої групи полягли — помоліться за них у Храмі.");
      lines.push("Натисніть «Почати бій» або пошукайте іншого суперника.");
      logBox.innerHTML = "";
      setArena(anyChampion() ? "Чемпіон!" : "Готові до бою", lines, anyChampion() ? "champion" : "ready");
    }

    // Рядок журналу: позначка «хто діє» + текст, числа виділені (RPG.logLi).
    // Під час бою в короткому стані — заголовок бою й лише останній рядок.
    function addLogLine(ev) {
      const line = RPG.journalPack(ev);
      if (!liveLines) { statusAppend(line); return; }
      liveLines.push(line);
      journalCtl?.append(line);
      logBox.querySelector(".log-live")?.remove();
      const li = RPG.logLi(line);
      li.classList.add("log-live");
      logBox.append(li);
    }

    // Ефекти: хто діє — спалах; у кого змінилось HP — число над портретом
    let lastSnap = null;
    const heroFig = () => $("hero-img").closest("figure");
    const enemyFig = () => $("enemy-img").closest("figure");
    function rowOf(id) { const b = $(id); return b ? b.closest(".party-row") : null; }
    function battleFx(ev, team) {
      if (ev.who === "hero") RPG.fx.act(heroFig());
      else if (ev.who === "enemy") RPG.fx.act(enemyFig());
      if (lastSnap) {
        team.forEach((ms, k) => {
          const now = ev.heroes?.[k], was = lastSnap.heroes?.[k];
          if (!now || !was) return;
          const i = ms.memberIndex || 0;
          const target = i === 0 ? heroFig() : rowOf("party-hp-" + i);
          if (now.hp !== was.hp) RPG.fx.hit(target, now.hp - was.hp, ev.crit ? "crit" : "");
        });
        (ev.enemies || []).forEach((now, i) => {
          const was = lastSnap.enemies?.[i];
          if (!was || now.hp === was.hp) return;
          RPG.fx.hit(i === 0 ? enemyFig() : rowOf("foe-hp-" + i), now.hp - was.hp, ev.crit ? "crit" : "");
        });
      }
      lastSnap = ev;
    }

    // Смужки під час показу бою. team — герої, що б'ються; maxStats — їхні максимуми
    function applyEventToBars(ev, team, maxStats) {
      team.forEach((ms, k) => {
        const h = ev.heroes?.[k];
        if (!h) return;
        const i = ms.memberIndex || 0;
        if (i === 0) {
          setBar($("hero-hp"), h.hp, maxStats[k].hp);
          setBar($("hero-mp"), h.mp, maxStats[k].mp);
        } else {
          setBar($("party-hp-" + i), h.hp, maxStats[k].hp);
          setBar($("party-mp-" + i), h.mp, maxStats[k].mp);
        }
      });
      foes.forEach((f, i) => {
        const e = curEnemy(i), st = ev.enemies?.[i];
        if (!st) return;
        if (i === 0) {
          setBar($("enemy-hp"), st.hp, e.stats.hp);
          if (e.stats.mp) setBar($("enemy-mp"), st.mp, e.stats.mp);
        }
        setBar($("foe-hp-" + i), st.hp, e.stats.hp);
        if (e.stats.mp) setBar($("foe-mp-" + i), st.mp, e.stats.mp);
      });
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function setFighting(on) {
      fighting = on;
      startBtn.disabled = rerollBtn.disabled = saveBtn.disabled = on;
      document.body.classList.toggle("is-fighting", on);
      drawHero();          // на час бою — портрет головного героя, після — знову обраного
      renderQuickSlots();
      if (!on) renderField();   // поле — під наступний бій
      const fb = $("formation-btn");
      if (fb) fb.disabled = on;
    }

    // Автозілля (налаштування на пристрої — core.js → getAutoPotion; пиття — character.js → autoPotion):
    // перед боєм і після бою. «Немає зілля» пишемо один раз, поки зілля цього виду знову не з'явиться.
    const potionWarned = { hp: false, mp: false };
    function runAutoPotion() {
      const cfg = RPG.getAutoPotion();
      const r = RPG.autoPotion(save, cfg);
      const lines = r.lines.slice();
      for (const stat of ["hp", "mp"]) {
        const set = RPG.AUTO_POTIONS[stat];
        if (["small", "medium", "large"].some(k => RPG.countItem(save, set[k]) > 0)) potionWarned[stat] = false;
        if (cfg[stat].on && r.missing[stat] && !potionWarned[stat]) {
          potionWarned[stat] = true;
          lines.push(`Автозілля: в інвентарі закінчилось ${stat === "hp" ? "зілля здоров'я" : "зілля мани"}.`);
        }
      }
      return lines;
    }

    async function startBattle() {
      if (fighting) return;
      const team = fighters();
      if (!team.length) { showMsg(msg, RPG.expeditionActive?.(save) && RPG.partyMembers(save).some(ms => RPG.isAway(ms)) && !RPG.partyMembers(save).some(ms => !RPG.isAway(ms) && !RPG.isMemberDead(ms))
        ? "Уся група, що лишилась удома, — в експедиції або полягла. Дочекайтеся повернення експедиції." : "Усі герої групи полягли — помоліться за них у Храмі.", true); return; }
      if (mode === "dungeon" && !dungeonOn()) { showMsg(msg, "Спершу відчиніть ворота данжу ключем.", true); return; }
      const dun = dungeonOn() ? RPG.activeDungeon(save) : null;   // бій у данжі: { stage, stages, ... }
      const rewarded = !dun || dun.stage === dun.stages;          // нагорода — лише за боса данжу
      // Автозілля перед боєм (у данжі не діє — character.js → autoPotion)
      const prePotion = runAutoPotion().map(l => l.replace(/^Автозілля:/, "Автозілля перед боєм:"));
      setFighting(true);
      renderEnemy();
      logBox.innerHTML = "";

      const maxStats = team.map(ms => RPG.calcStats(ms));
      RPG.equipFoes(foes, team);   // GS групи міг змінитися (перевдягнулись) — речі ворогів під нього
      renderEnemy();
      const result = RPG.simulatePartyBattle(team, foes, { heroPos: formationOf(team), corner, obstacles, foePos: foePositions });
      const group = team.length > 1;

      // Результат застосовуємо і зберігаємо ОДРАЗУ — щоб не можна було
      // уникнути поразки, просто закривши сторінку під час показу бою
      const summary = [];
      const levelLines = [];
      let showEnding = false;            // перша перемога над Хеллою на троні — після бою вікно кінця гри
      const got = {}, lost = {}, filtered = {};   // речі цього бою (для підсумку поля бою); filtered — викинув фільтр
      const freeBefore = RPG.invFree(save);
      let battleGold = 0, battleExp = 0;
      result.heroes.forEach((h, k) => { team[k].character.hp = h.hp; team[k].character.mp = h.mp; });
      let deaths = null;
      if (result.win && !rewarded) {
        result.heroes.forEach((h, k) => {
          if (h.dead) { RPG.markFallen(team[k]); summary.push(`${team[k].character.name} полягає (відродіть у Храмі)`); }
        });
      } else if (result.win) {
        // Полеглі в переможному бою лишаються мертвими до молитви в Храмі
        result.heroes.forEach((h, k) => {
          if (h.dead) { RPG.markFallen(team[k]); summary.push(`${team[k].character.name} полягає (відродіть у Храмі)`); }
        });
        const totalExp = result.enemies.reduce((sum, e) => sum + (e.exp || 0), 0);
        // Перемоги над босами (перша — з датою): відкривають світи й межу рівня (character.js → levelCap).
        // Записуємо ДО досвіду — досвід за Белі вже йде під нову межу 50.
        const capWasOpen = RPG.levelCapOpen(save);
        const helWasBeaten = !!save.bossKills?.[RPG.HEL_ESCAPE_BOSS];
        const gameWasWon = !!save.bossKills?.[RPG.GAME_END_BOSS];
        for (const e of result.enemies) if (RPG.ENEMIES[e.id]?.boss && !RPG.ENEMIES[e.id].darkSoul) (save.bossKills ??= {})[e.id] ??= Date.now();   // Темна душа — не бос для світів
        if (!capWasOpen && RPG.levelCapOpen(save)) {
          summary.push(`⭐ Белі повалено! Межа рівня для героїв з професією відтепер — ${RPG.LEVEL_CAP_PROFESSION} (Селянин лишається до ${RPG.LEVEL_CAP_BASE}).`);
        }
        // Хелла в Глідскьяльві (фінал світу 8) не гине — тікає в портал (data/enemies.js → HEL_ESCAPE_TEXT)
        if (!helWasBeaten && save.bossKills?.[RPG.HEL_ESCAPE_BOSS]) summary.push("🌀 " + RPG.HEL_ESCAPE_TEXT);
        // Хелла на своєму троні (фінал світу 9) — кінець гри: після показу бою — епілог і титри (game-common.js → showEnding)
        if (!gameWasWon && save.bossKills?.[RPG.GAME_END_BOSS]) {
          (save.story ??= {}).gameWon ??= Date.now();
          showEnding = true;
          summary.push("👑 Хеллу переможено — Рагнарок не настав!");
        }
        let gold = 0;
        const runeEco = RPG.teamRuneEco ? RPG.teamRuneEco(team) : { gold: 0, lootRarity: 0 };   // руни Феху й Даждьбог усієї групи
        for (const e of result.enemies) {
          const lootOrb = RPG.godsOrb(save);              // Сфера Богів: +10 пунктів до шансу кожного предмета (20% → 30%)
          const loot = RPG.rollLoot(e.id, lootOrb ? lootOrb.lootPct / 100 : 0);
          for (const r of RPG.rollRunes?.(e.id, { champion: e.champion }) || []) loot.items.push({ id: r, qty: 1 });   // руни (data/runes.js → RUNE_DROP)
          if (RPG.ENEMIES[e.id]?.darkSoul) {           // Темна душа: зброя ламається, може лишитися жарина (dungeon.js → darkSoulReward)
            const ds = RPG.darkSoulReward(save);
            if (ds.ember) loot.items.push({ id: RPG.EMBER.id, qty: 1 });
            summary.push("🔥 " + ds.text);
          }
          if (runeEco.gold && loot.gold) loot.gold = Math.round(loot.gold * (1 + runeEco.gold / 100));
          if (runeEco.lootRarity) loot.rarityUp = runeEco.lootRarity;
          RPG.applyReward(save, 0, loot);                // золото й речі — у спільний інвентар
          gold += loot.gold || 0;
          for (const it of loot.items) {
            if (it.refs) it.refs.forEach(ref => { const n = RPG.itemFullName(ref); summary.push(n); got[n] = (got[n] || 0) + 1; });
            else if (it.got) { const n = RPG.ITEMS[it.id].name; summary.push(`${n} ×${it.got}`); got[n] = (got[n] || 0) + it.got; }
            if (it.lost) { const n = RPG.ITEMS[it.id].name; lost[n] = (lost[n] || 0) + it.lost; }
            if (it.filtered) it.filtered.forEach(ref => { const n = RPG.itemFullName(ref); filtered[n] = (filtered[n] || 0) + 1; });
          }
          // Перемогу над ворогом записуємо кожному героєві, що бився (і найманим — «Розвиток» на сторінці «Персонаж»)
          for (const ms of team) ms.character.kills = (ms.character.kills || 0) + 1;
          summary.push(...RPG.questOnKill(save, e.id).map(s => "Завдання: " + s));
          if (e.champion) {
            // Трофей чемпіона: одна річ (легендарна 5% → епічна 25% → магічна 50%)
            const drop = RPG.rollChampionDrop(e.id);
            if (drop && RPG.isFilteredOut(save, drop.r)) {
              const n = RPG.itemFullName(RPG.makeItem(drop.id, drop.r));
              filtered[n] = (filtered[n] || 0) + 1;
              summary.push(`Трофей чемпіона: ${n} — викинуто фільтром`);
            } else if (drop && !RPG.invFree(save)) {
              const n = RPG.itemFullName(RPG.makeItem(drop.id, drop.r));
              lost[n] = (lost[n] || 0) + 1;
              summary.push(`Трофей чемпіона: ${n} — пропав, інвентар повний!`);
            } else if (drop) {
              const ref = RPG.makeItem(drop.id, drop.r);
              save.inventory.push(ref);
              summary.push(`Трофей чемпіона: ${RPG.itemFullName(ref)}`);
              got[RPG.itemFullName(ref)] = (got[RPG.itemFullName(ref)] || 0) + 1;
            } else {
              summary.push("Трофей чемпіона: цього разу нічого");
            }
            const b = RPG.addChampionBounty(save, e.id);
            summary.push(`Гільдія авантюристів заплатить ${b.exp} EXP${group ? " кожному герою" : ""} (+ бонуси) і ${b.gold} золота (нагорода ×5)`);
          }
          // Книга «Руни Небесної Кузні»: після ПЕРШОЇ перемоги над Володарем Темного лісу — у бібліотеку дому
          if (e.id === "forest_lord" && RPG.RUNE_BOOK && RPG.addToLibrary(save, "runes")) {
            summary.push(`📜 Серед трофеїв Володаря — книга Сварога «${RPG.RUNE_BOOK.title}»! Вона чекатиме в бібліотеці вашого дому (Спальний район Дубової Застави).`);
          }
          // Креслення комплекту професії (лише визначені боси) і звичайні креслення тірів 3–7 та Штормової сталі (будь-які вороги своїх світів) — data/profsets.js
          for (const bp of [RPG.rollBlueprintDrop?.(save, e.id), ...(RPG.rollTierBlueprints?.(e.id, { dungeon: !!dun }) || [])]) {
          if (bp) {
            const n = RPG.ITEMS[bp].name;
            if (RPG.fitQty(save, bp, 1)) {
              RPG.addItem(save, bp, 1);
              summary.push(e.boss ? `📐 Трофей боса: ${n}!` : `📐 Здобич: ${n}!`);
              got[n] = (got[n] || 0) + 1;
            } else {
              summary.push(e.boss ? `📐 Трофей боса: ${n} — пропав, інвентар повний!` : `📐 Здобич: ${n} — пропала, інвентар повний!`);
              lost[n] = (lost[n] || 0) + 1;
            }
          }
          }
          // Мішечок на пояс: 1% з кожного переможеного боса, окремо від звичайної здобичі
          const pouch = RPG.rollPouchDrop?.(e.id);
          if (pouch) {
            const n = RPG.ITEMS[pouch].name;
            if (RPG.invFree(save)) {
              save.inventory.push({ id: pouch, qty: 1 });
              summary.push(`Рідкісний трофей боса: ${n}!`);
              got[n] = (got[n] || 0) + 1;
            } else {
              summary.push(`Рідкісний трофей боса: ${n} — пропав, інвентар повний!`);
              lost[n] = (lost[n] || 0) + 1;
            }
          }
        }
        // Досвід (рішення 2б): +PARTY_EXP_BONUS% (25%) за кожного героя групи понад першого (party.js),
        // і вся сума ділиться порівну між тими, хто вижив
        const survivors = team.filter((ms, k) => !result.heroes[k].dead);
        const spring = RPG.springExpMult(save);          // Джерело Велеса: ×3 до досвіду групи
        const orb = RPG.godsOrb(save);                     // Сфера Богів (предмет адміністратора): +800% досвіду
        const orbMult = orb ? 1 + orb.expPct / 100 : 1;
        const pool = Math.round(totalExp * (1 + RPG.PARTY_EXP_BONUS / 100 * (team.length - 1)) * spring * orbMult);
        const expEach = Math.floor(pool / Math.max(1, survivors.length));
        const runeExpLines = [];
        for (const ms of survivors) {
          const rp = RPG.runeTotals ? (RPG.runeTotals(ms).eco.exp || 0) : 0;   // руна Вуньо — кожному свої
          const extra = Math.round(expEach * rp / 100);
          if (extra) runeExpLines.push(`${group ? ms.character.name + ": " : ""}руни +${extra} EXP (+${rp}%)`);
          const ups = RPG.addExp(ms, expEach + extra);
          if (ups.length) levelLines.push(`${ms.character.name}: новий рівень ${ups[ups.length - 1]}!`);
        }
        const springTxt = (spring > 1 ? `, Джерело Велеса +${RPG.VELES.expBonusPct}%` : "") + (orb ? `, Сфера Богів +${orb.expPct}%` : "");
        summary.unshift(group
          ? `+${expEach} EXP кожному, хто вижив (усього ${pool}, бонус групи +${(team.length - 1) * RPG.PARTY_EXP_BONUS}%${springTxt})`
          : `+${expEach} EXP${springTxt ? ` (${springTxt.slice(2)})` : ""}`);
        if (gold) summary.splice(1, 0, `+${gold} золота` + (runeEco.gold ? ` (руни +${runeEco.gold}%)` : ""));
        if (runeExpLines.length) summary.splice(1, 0, ...runeExpLines);
        if (Object.keys(filtered).length) summary.push(`Фільтр викинув: ${Object.entries(filtered).map(([k, n]) => n > 1 ? `${k} ×${n}` : k).join(", ")}`);
        if (Object.keys(lost).length) summary.push(`Не вмістилось в інвентар: ${Object.entries(lost).map(([k, n]) => `${k} ×${n}`).join(", ")}`);
        battleGold = gold;
        battleExp = group ? expEach : totalExp;
        // «Обстеження» локації з данжем: шанс знайти ключ з кожного переможеного ворога
        const keys = RPG.rollKeyDrops(save, locId, result.enemyIds);
        if (keys.got) { summary.push(`${keys.name} ×${keys.got} — у кишеню для ключів!`); got[keys.name] = (got[keys.name] || 0) + keys.got; }
        if (keys.full) summary.push(`Кишеня для ключів: ${keys.name} — уже ${RPG.KEY_MAX}/${RPG.KEY_MAX}, нові не випадають, поки не використаєте хоча б один.`);
      } else if (!result.draw) {
        // Уся група загинула: штраф кожному, відродження в Храмі
        deaths = team.map(ms => ({ ms, d: RPG.applyDeath(ms, result.enemyIds) }));
        RPG.pray(save);   // ті, хто поліг раніше, теж прокидаються в Храмі
      }
      // Данж: перемога — наступний бій (або кінець), поразка чи втеча ворогів — данж провалено
      // Досвід володіння зброєю (data/skills.js → masteryGainFor / addMasteryExp): кожному живому герою за виграний бій
      const masteryLines = [];
      if (result.win) {
        const fmtM = v => (Math.round(v * 10) / 10).toString().replace(".", ",");
        team.forEach((ms, k) => {
          if (result.heroes[k].dead) return;
          const g = RPG.masteryGainFor(save, ms, foes);
          if (!g.type || !g.gain) return;
          const r = RPG.addMasteryExp(ms, g.type, g.gain);
          const wt = RPG.WEAPON_TYPES[g.type];
          const prog = r.need ? ` (рівень ${r.level}, ${fmtM(r.exp)}/${r.need}${r.capped ? " — межа" : ""})` : ` (рівень ${r.level} — найвищий)`;
          masteryLines.push(`${group ? ms.character.name + ": " : ""}${wt.mastery.toLowerCase()} +${fmtM(g.gain)}` +
            (g.parts.length ? ` [${g.parts.join(", ")}]` : "") + prog +
            (r.levelUps.length ? ` — новий рівень володіння ${r.levelUps.at(-1)}!` : ""));
        });
      }
      let dunNext = null;
      let chron = null;   // запис у книзі «Предки…» (перша перемога над босом данжу)
      if (dun) {
        if (result.win) dunNext = RPG.advanceDungeon(save);
        else RPG.leaveDungeon(save);
        if (result.win && dunNext.done && RPG.chronicleRecord && !dun.darkSoul) chron = RPG.chronicleRecord(save, dun.id, team, result);
      }
      // Бестіарій (bestiary.js): перемоги над кожним ворогом — лише бої в локаціях і данжах (не експедиції)
      if (result.win && RPG.bestiaryRecord) {
        summary.push(...RPG.bestiaryLines(save, RPG.bestiaryRecord(save, result.enemies)));
        RPG.bindBestiaryButtons(save);
      }
      // Загальний лічильник ворогів групи й найскладніша пройдена локація (данж — лише пройдений до кінця)
      if (result.win) {
        if (!dun || dunNext?.done) RPG.noteVictory(save, locId, result.enemyIds, dun ? dun.name : null);
        else RPG.noteKills(save, result.enemyIds);
      }
      // Смертельний режим: хто втратив останнє життя — напарник іде з групи, головний герой — кінець гри (party.js)
      const hc = RPG.hardcoreResolve?.(save);
      const lifeLines = [];
      if (save.hardcore) {
        team.forEach((ms, k) => {
          if (!result.heroes[k]?.dead || !RPG.partyMembers(save).some(m => m.character === ms.character)) return;
          lifeLines.push(`☠ ${ms.character.name}: лишилось життів — ${RPG.livesOf(ms)} з ${RPG.HC_LIVES}`);
        });
        for (const r of hc?.removed || []) lifeLines.push(r.f ? `☠ ${r.name} загинула втретє й назавжди покидає групу.` : `☠ ${r.name} загинув утретє й назавжди покидає групу.`);
        for (const r of hc?.removed || []) if (r.toInv || r.toBag) lifeLines.push(`Речі полеглого: в інвентар — ${r.toInv}, у «мішок загиблого» — ${r.toBag} (забрати протягом 30 хв, сторінка «Інвентар»).`);
      }
      if (!result.draw || result.win) fieldLootAdd(save, { win: result.win, exp: battleExp, gold: battleGold, items: got, lost, filtered });
      // Автозілля після бою (не після загибелі всієї групи; у данжі між боями не діє)
      const postPotion = deaths ? [] : runAutoPotion();

      // Підсумок бою (заголовок + рядки) — рахуємо одразу, щоб записати в журнал разом із ходом бою
      let outcome;
      if (deaths) {
        const lines = deaths.map(({ ms, d }) =>
          `${group ? ms.character.name + ": " : ""}штраф досвіду −${d.expPct}% (${fmtNum(d.expLost)} EXP)` +
          (d.levelDown ? `, рівень знижено до ${d.newLevel}${d.pointsLost ? ` (−${d.pointsLost} очок атрибутів)` : ""}` : "") +
          (d.lostItems.length ? `, втрачено: ${d.lostItems.map(ref => RPG.itemFullName(ref)).join(", ")}` : ""));
        lines.push(`${group ? "Уся група відродилася" : "Ви відродилися"} в Храмі з ${Math.round(RPG.RESPAWN_HP_PCT * 100)}% здоров'я і без мани.`);
        outcome = { title: group ? "Група загинула" : "Загибель", lines, state: "lose" };
      } else if (dun && result.win && !dunNext.done) {
        const lines = [`Бій ${dun.stage} з ${dun.stages} виграно. Нагороди за нього немає — лише за боса.`];
        if (summary.length) lines.push(summary.join(" · "));
        lines.push("Зілля й відновлення тут не діють — HP переходить у наступний бій як є (лікують лише навички).");
        outcome = { title: `Данж: бій ${dun.stage} з ${dun.stages} — перемога`, lines, state: "win" };
      } else if (result.win) {
        const lines = [summary.join(" · ")];
        for (const l of levelLines) lines.push(l + " Здоров'я та мана відновлені, є нові вільні очки атрибутів (сторінка «Персонаж»).");
        lines.push(`Переможено ворогів: ${save.character.kills}`);
        if (chron?.first) lines.push(`📜 У книзі «${RPG.CHRONICLE.TITLE}» з'явився новий запис` +
          (chron.chapterDone ? ` — «${chron.chapter.title}» завершено!` : ` («${chron.chapter.title}»).`) +
          " Попросіть Розпорядника Захара в Мерії показати книгу.");
        outcome = { title: dun ? `Данж «${dun.name}» пройдено!` : "Перемога!", lines, state: "win" };
      } else if (dun) {
        outcome = { title: foes.length > 1 ? "Вороги втекли — данж провалено" : "Ворог утік — данж провалено",
          lines: ["Ворота зачинилися. Нагороди немає, ключ використано."], state: "draw" };
      } else {
        outcome = { title: foes.length > 1 ? "Вороги втекли" : "Ворог утік", lines: ["Нагороди немає."], state: "draw" };
      }
      if (masteryLines.length) outcome.lines.push("Володіння: " + masteryLines.join("; "));
      outcome.lines.push(...lifeLines);
      outcome.lines.push(...prePotion, ...postPotion);
      const fightTitle = `${team.map(ms => ms.character.name).join(", ")} проти: ${foesText()}`;
      // Журнал бою (journal.js): увесь хід бою + підсумок; найстаріший запис понад 100 затирається
      liveEntry = RPG.journalAdd(save, { kind: "battle", lines: [
        ["title", fightTitle, "fight"], ...result.events.map(RPG.journalPack),
        ["title", outcome.title, outcome.state], ...outcome.lines.map(l => ["info", l])] });
      await RPG.saveGame(save).catch(e => console.error(e));

      // Показ бою (у вікні журналу цей бій з'являється рядок за рядком, без спойлера підсумку)
      const stepByStep = RPG.getSettings().battleView !== "result";
      liveLines = [];
      journalCtl?.refresh({ skip: liveEntry, live: liveLines });
      setArena(fightTitle, [], "fight");
      lastSnap = null;
      // Поле бою: розстановка цього бою, смужки — зі стану на початку
      renderField({ team, heroPos: result.heroPos, foePos: result.foePos, corner: result.corner, obstacles: result.obstacles, maxStats });
      fieldEvent(result.events[0], null, team, maxStats);
      if (stepByStep) {
        let prevEv = null;
        for (const ev of result.events) {
          addLogLine(ev);
          applyEventToBars(ev, team, maxStats);
          battleFx(ev, team);
          RPG.audio?.battleSound(ev);
          fieldEvent(ev, prevEv, team, maxStats);
          prevEv = ev;
          await sleep(ev.who === "info" ? 400 : 550);
        }
      } else {
        result.events.forEach(addLogLine);
        applyEventToBars(result.events[result.events.length - 1], team, maxStats);
        fieldEvent(result.events[result.events.length - 1], null, team, maxStats);
      }

      // Підсумок: коротка мелодія, далі знову музика локації
      if (RPG.audio) {
        if (deaths) RPG.audio.jingle("defeat");
        else if (result.win && levelLines.length) RPG.audio.jingle("levelup");
        else if (result.win) RPG.audio.jingle("victory");
      }
      // Бій показано — у журналі тепер повний запис (з підсумком)
      liveLines = liveEntry = null;
      journalCtl?.refresh({ skip: null, live: null });
      setArena(outcome.title, outcome.lines, outcome.state);
      // Смертельний режим: головний герой втратив останнє життя — кінець гри (вікно з підсумком)
      if (save.gameOver) {
        document.body.classList.remove("is-fighting");
        fighting = false;
        startBtn.disabled = rerollBtn.disabled = true;
        const li = el("li", "log-action");
        li.append(button("☠ Підсумок гри", "wf wf-link", () => RPG.ui.showGameOver(save)));
        logBox.append(li);
        logBox.scrollTop = logBox.scrollHeight;
        setTimeout(() => RPG.ui.showGameOver(save), 1200);
        return;
      }
      if (hc?.removed.length) RPG.ui.showHardcoreLosses(hc.removed);
      if (showEnding) setTimeout(() => RPG.ui.showEnding(save), 1200);
      if (deaths) {
        const wake = el("li", "log-action");
        wake.append(link("Прокинутися в Храмі", "game.html"));
        logBox.append(wake);
        logBox.scrollTop = logBox.scrollHeight;
        document.body.classList.remove("is-fighting");
        fighting = false;
        drawHero();
        renderQuickSlots();
        startBtn.disabled = rerollBtn.disabled = true;   // бій звідси вже неможливий
        saveBtn.disabled = false;
        return;
      }

      // Наступні суперники
      nextEnemy();
      renderMode();
      const nextDun = dungeonOn() ? RPG.activeDungeon(save) : null;
      if (nextDun?.darkSoul && nextDun.stage === nextDun.stages) showNotice("З'явилась темна душа", DARK_SOUL_LINES);   // попередження перед 3-м боєм
      addLogLine({ who: "info", text: nextDun
        ? `Далі — бій ${nextDun.stage} з ${nextDun.stages}: ${foesText()}.`
        : mode === "dungeon" ? `Щоб повторити данж, потрібен новий ключ. Бос: ${foesText()}.`
        : `Далі на вас чекає: ${foesText()}.` + (anyChampion() ? " Серед них рідкісний ЧЕМПІОН!" : "") });
      renderEnemy();

      renderAll();
      setFighting(false);
      // Данж перейшов до бою з босом (або завершився) — після джингла грає відповідна тема
      if (RPG.audio && dun) setTimeout(playLocationMusic, 5500);
      if (!fighters().length) startBtn.disabled = true;
      // Герой досяг 12 рівня — підходить незнайомець зі сферою (квест «Долоні Велеса»)
      if (RPG.velesStrangerDue(save)) setTimeout(() => meetStranger(save).then(renderAll), 800);
      // Селянин дійшов до 20 рівня без професії — повертається Відречений (секретний «Шлях відреченого»)
      else if (RPG.shamanDue(save)) setTimeout(() => RPG.ui.meetRenouncer(save).then(renderAll), 800);
      // Інвентар заповнився (або щось уже пропало) — окреме повідомлення, щоб не пропустити
      if (result.win && (Object.keys(lost).length || (freeBefore > 0 && !RPG.invFree(save)))) {
        showNotice("Інвентар заповнено!", [
          `Усі ${RPG.invSize(save)} клітинок інвентаря зайняті. Нові речі та ресурси, яким немає місця, пропадатимуть — ` +
          "доповнюються лише неповні стопки.",
          Object.keys(lost).length ? `Уже пропало: ${Object.entries(lost).map(([k, n]) => `${k} ×${n}`).join(", ")}.` : "",
          "Продайте зайве торговцю або покладіть у скриню в Домівці."
        ].filter(Boolean), "is-warn");
      }
    }

    // Не даємо піти зі сторінки посеред показу бою без попередження
    document.querySelectorAll("nav a, a.wf").forEach(a => {
      a.addEventListener("click", ev => {
        if (fighting && !confirm("Бій ще показується. Результат уже збережено. Вийти?")) { ev.preventDefault(); return; }
        // Вихід із локації посеред данжу — данж втрачено (dungeon.js скасує його на іншій локації)
        if (!fighting && RPG.activeDungeon(save) && a.getAttribute("href") === "maps.html" &&
            !confirm("Ви в данжі. Якщо підете з локації — данж буде втрачено разом із ключем. Піти?")) ev.preventDefault();
      });
    });

    // Журнал бою: останні 100 подій в окремому вікні (journal.js); під час бою — поточний бій наживо.
    // Кнопка є і в бойових локаціях (біля «Почати бій»), і в мирних (біля «Зберегти гру»)
    const openJournal = () => { journalCtl = RPG.openJournal(save, liveLines ? { skip: liveEntry, live: liveLines } : {}); };
    document.querySelectorAll(".journal-btn").forEach(b => b.addEventListener("click", openJournal));
    // Коротка смужка стану (2 рядки) — клік відкриває повний журнал
    logBox.title = "Натисніть, щоб відкрити журнал бою";
    logBox.addEventListener("click", openJournal);
    const placeJournal = $("journal-btn-place");
    if (placeJournal) placeJournal.hidden = !!combat;
    document.querySelectorAll(".bestiary-btn-place").forEach(b => b.classList.toggle("is-off", !!combat));   // у бойовій — та, що біля «Почати бій»

    saveBtn.addEventListener("click", async () => {
      try {
        await RPG.saveGame(save);
        showMsg(msg, `Гру збережено (${fmtDate(save.savedAt)}).`);
      } catch (e) {
        showMsg(msg, "Не вдалося зберегти: " + e.message, true);
      }
    });

    if (combat) {
      // Після прибуття на локацію перед першим боєм — вікно розстановки героїв
      startBtn.addEventListener("click", () => { if (fighting) return; if (placedHere()) startBattle(); else openFormation(startBattle); });
      $("formation-btn")?.addEventListener("click", () => { if (!fighting) openFormation(); });

      rerollBtn.addEventListener("click", () => {
        if (fighting || mode === "dungeon") return;
        nextEnemy();
        renderEnemy();
        showReady();
      });
      leaveBtn.addEventListener("click", async () => {
        if (fighting || !RPG.activeDungeon(save)) return;
        if (!confirm("Покинути данж? Ключ уже використано, прогрес буде втрачено.")) return;
        RPG.leaveDungeon(save);
        await RPG.saveGame(save);
        nextEnemy();
        renderMode();
        renderEnemy();
        showReady();
        showMsg(msg, "Ви покинули данж.");
      });
      renderMode();
      renderEnemy();
      showReady();
      if (!fighters().length) startBtn.disabled = true;
    }

    renderAll();
    // У мирних локаціях не перемальовуємо панель щосекунди — лише смужки героя
    startRegenTimer(save, () => { drawHero(); if (RPG.expeditionList?.(save).length) renderExpedition(); }, () => fighting);
  }

  // ============================================================

  RPG.pages.pageGame = pageGame;
})(window.RPG);

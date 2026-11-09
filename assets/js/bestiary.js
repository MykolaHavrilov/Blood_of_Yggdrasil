// ============================================================
// bestiary.js — книга «Бестіарій» (v0.3.32)
//
// Описує лише тих ворогів, з якими герой бився сам: бої в локаціях і данжах (page-game.js → bestiaryRecord);
// бої експедицій не рахуються. save.bestiary = { [id ворога]: { k: перемог, ch: з них чемпіонів,
// hp: [мін, макс], mp: [мін, макс] — справжнє здоров'я й мана в боях (зі спорядженням, без чемпіонів) } }.
//
// Книгу герой знаходить після першої перемоги над щуром (rat, rat2, rat3) — save.books.bestiary.
// Старі сейви (уже були перемоги — save.bestiaryLegacy, save.js → migrateSave) — після першої будь-якої перемоги.
// Читати: кнопка «📖 Бестіарій» на сторінках «Локація» і «Персонаж», а також бібліотека дому.
//
// Глави — 9 світів (WORLDS). Відкрита одразу лише перша; інші — сірі, доки не переможено хоч одного ворога того світу.
// Сторінка ворога з'являється після першої перемоги. Шкала 0…200 перемог (MARKS):
//     1 — картинка й назва;      10 — здоров'я й мана (від мінімального до максимального);
//    50 — матеріали й шанс;     100 — речі й шанс;     200 — уся здобич, роль і характеристики, чемпіон.
// Шанси — з таблиць здобичі (data/enemies.js → loot) і правил гри, тож завжди збігаються з грою;
// поруч — скільки разів у середньому випаде за 1000 перемог над цим ворогом.
// ============================================================

(function (RPG) {
  const MAX = 200;
  const MARKS = [1, 10, 50, 100, 200];
  const MARK_TEXT = {
    1: "нова сторінка",
    10: "здоров'я й мана",
    50: "матеріали",
    100: "речі",
    200: "уся здобич і чемпіон"
  };
  // Назви світів, якщо data/worlds.js на сторінці немає (той самий порядок, що в WORLDS)
  const WORLD_NAMES = ["Гардарика", "Темний ліс", "Альвгейм", "Ванагейм", "Свартальвгейм", "Йотунгейм", "Муспельгейм", "Асгард", "Ніфльгейм і Хельгейм"];
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  const REGION_WORLD = { start: 1, city: 1, dark: 2, alf: 3 };
  const ROLE_NAMES = { tank: "Танк", melee: "Дамагер ближнього бою", ranged: "Дамагер дальнього бою", caster: "Маг", healer: "Хілер" };

  const worldOfRegion = r => RPG.worldOfRegion?.(r)?.n || REGION_WORLD[r] || 1;
  const worldName = n => RPG.WORLDS?.[n - 1]?.name || WORLD_NAMES[n - 1] || String(n);

  // Ворог → світ (найменший номер, якщо ворог живе в кількох світах)
  let byWorld = null;
  function worldsMap() {
    if (byWorld) return byWorld;
    const of = {};
    const put = (id, n) => { if (RPG.ENEMIES[id] && (!of[id] || n < of[id])) of[id] = n; };
    for (const loc of Object.values(RPG.LOCATIONS || {})) for (const id of loc.enemies || []) put(id, worldOfRegion(loc.region || "start"));
    for (const d of Object.values(RPG.DUNGEONS || {})) {
      const n = worldOfRegion(RPG.LOCATIONS?.[d.location]?.region || "start");
      put(d.boss, n);
      (d.pool || []).forEach(id => put(id, n));
    }
    byWorld = of;
    return of;
  }
  function enemiesOfWorld(n) {
    const of = worldsMap();
    return Object.keys(of).filter(id => of[id] === n)
      .sort((a, b) => (RPG.ENEMIES[a].boss ? 1 : 0) - (RPG.ENEMIES[b].boss ? 1 : 0) || RPG.ENEMIES[a].level - RPG.ENEMIES[b].level);
  }

  const state = save => (save.bestiary ??= {});
  const has = save => !!save.books?.bestiary;
  const kills = (save, id) => save.bestiary?.[id]?.k || 0;

  // Перемога в бою (page-game.js): enemies — result.enemies [{ id, champion, maxHp, maxMp }].
  // Повертає { found — книгу щойно знайдено, marks: [{ id, k }] — відкрито нову сходинку шкали }
  function bestiaryRecord(save, enemies) {
    const b = state(save);
    const marks = [];
    for (const e of enemies || []) {
      if (!RPG.ENEMIES[e.id]) continue;
      const r = (b[e.id] ??= { k: 0 });
      r.k++;
      if (e.champion) r.ch = (r.ch || 0) + 1;
      else if (e.maxHp) {
        r.hp = r.hp ? [Math.min(r.hp[0], e.maxHp), Math.max(r.hp[1], e.maxHp)] : [e.maxHp, e.maxHp];
        const mp = e.maxMp || 0;
        r.mp = r.mp ? [Math.min(r.mp[0], mp), Math.max(r.mp[1], mp)] : [mp, mp];
      }
      if (MARKS.includes(r.k)) marks.push({ id: e.id, k: r.k });
    }
    let found = false;
    if (!has(save) && (save.bestiaryLegacy || (enemies || []).some(e => /^rat\d*$/.test(e.id)))) {
      (save.books ??= {}).bestiary = true;
      delete save.bestiaryLegacy;
      found = true;
    }
    return { found, marks: has(save) && !found ? marks : [] };
  }
  // Рядки підсумку бою
  function bestiaryLines(save, rec) {
    const out = [];
    if (rec.found) out.push("📖 Серед трофеїв — стара потерта книга «Бестіарій». Її сторінки заповнюються самі: що більше ворогів одного виду ви здолаєте, то більше про них дізнаєтесь (кнопка «📖 Бестіарій»).");
    for (const m of rec.marks) {
      const n = RPG.ENEMIES[m.id]?.name || m.id;
      out.push(m.k === 1 ? `📖 Бестіарій: нова сторінка — ${n}.` : `📖 Бестіарій: ${n} — відкрито: ${MARK_TEXT[m.k]} (${m.k} перемог).`);
    }
    return out;
  }

  // Глави: 9 світів; перша відкрита завжди, інші — після першої перемоги над ворогом цього світу
  function bestiaryContents(save) {
    const of = worldsMap();
    const seen = new Set(Object.keys(save.bestiary || {}).filter(id => kills(save, id) > 0).map(id => of[id]));
    return WORLD_NAMES.map((_, i) => ({
      key: "w" + (i + 1),
      title: `Глава ${ROMAN[i]}. ${worldName(i + 1)}`,
      open: i === 0 || seen.has(i + 1)
    }));
  }

  // ---------- Розрахунки здобичі ----------
  const pct = x => {
    const v = x * 100;
    return (v >= 10 ? Math.round(v) : v >= 1 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100).toLocaleString("uk-UA") + "%";
  };
  const per1000 = x => Math.round(x * 1000);
  const GEAR = new Set(["weapon", "armor", "accessory", "shield", "offhand"]);
  function lootRows(id, kind) {
    const e = RPG.ENEMIES[id];
    const craftOnly = RPG.isCraftOnlyEnemy?.(id);
    return (e.loot || []).filter(d => {
      const t = RPG.ITEMS[d.id]?.type;
      if (!t || (craftOnly && GEAR.has(t))) return false;
      return kind === "mat" ? t === "material" : kind === "item" ? t !== "material" : true;
    }).map(d => ({ id: d.id, chance: Math.min(1, d.chance), qty: d.qty }));
  }
  const qtyText = q => q && (q[0] !== 1 || q[1] !== 1) ? (q[0] === q[1] ? `${q[0]} шт` : `${q[0]}–${q[1]} шт`) : "1 шт";

  // ---------- Розмітка ----------
  const E = (...a) => RPG.ui.el(...a);
  function table(head, rows) {
    return RPG.ui.forgeBookTable(head, rows, "bst-table");
  }
  function itemCell(id) {
    const s = E("span", "bst-item");
    const ic = E("span", "bst-item-icon");
    Object.assign(ic.style, RPG.itemIconStyle?.(id) || {});
    s.append(ic, E("span", null, RPG.ITEMS[id]?.name || id));
    return s;
  }
  function lootTable(rows) {
    if (!rows.length) return E("p", "chronicle-note", "Нічого такого з цього ворога не випадає.");
    return table(["Що", "Шанс", "На 1000 перемог", "Скільки"],
      rows.sort((a, b) => b.chance - a.chance).map(r => [itemCell(r.id), pct(r.chance), "≈ " + per1000(r.chance), qtyText(r.qty)]));
  }
  const locked = (k, text) => E("p", "bst-locked", `🔒 ${text} — з ${k} перемог.`);

  function bar(k) {
    const box = E("div", "bst-bar");
    const fill = E("div", "bst-bar-fill");
    fill.style.width = `${Math.min(100, (k / MAX) * 100)}%`;
    box.append(fill);
    for (const m of MARKS) {
      const t = E("span", "bst-tick" + (k >= m ? " is-done" : ""));
      t.style.left = `${(m / MAX) * 100}%`;
      t.title = `${m}: ${MARK_TEXT[m]}`;
      box.append(t);
    }
    box.append(E("span", "bst-bar-label", `Перемог: ${Math.min(k, MAX)} / ${MAX}` + (k > MAX ? ` (усього ${k})` : "")));
    return box;
  }

  function fullDrop(id) {
    const e = RPG.ENEMIES[id];
    const frag = document.createDocumentFragment();
    const rows = [];
    rows.push(["Золото", `${e.gold?.[0] ?? 0}–${e.gold?.[1] ?? 0}`]);
    rows.push(["Досвід", RPG.ui.fmtNum(e.exp || 0)]);
    if (RPG.ARTIFACTS && e.level >= RPG.ARTIFACTS.MIN_LEVEL) {
      const w = RPG.ARTIFACTS.DROP.weights, tot = Object.values(w).reduce((a, b) => a + b, 0);
      const ch = e.boss ? RPG.ARTIFACTS.DROP.boss : RPG.ARTIFACTS.DROP.chance;
      rows.push(["Артефакт професії", `${pct(ch)} (≈ ${per1000(ch)} на 1000): ` +
        Object.entries(w).map(([r, v]) => `${RPG.RARITIES?.[r]?.name || r} ${Math.round(v / tot * 100)}%`).join(", ")]);
    }
    for (const d of Object.values(RPG.DUNGEONS || {})) {
      if ((d.pool || []).includes(id)) rows.push([RPG.ITEMS[d.key]?.name || d.key, `${pct(d.keyChance)} (≈ ${per1000(d.keyChance)} на 1000) — під час «${d.explore}»`]);
    }
    if (e.boss && RPG.POUCH_DROP) rows.push(["Мішечок на пояс", `${pct(RPG.POUCH_DROP.chance)}`]);
    if (RPG.BLUEPRINT_DROPS?.[id]?.length) rows.push(["Креслення комплекту професії", `${pct(RPG.BLUEPRINT_CHANCE)} — одне з ${RPG.BLUEPRINT_DROPS[id].length}`]);
    if (id === "forest_lord") rows.push(["Книга «Руни Небесної Кузні»", "після першої перемоги"]);
    // Матеріали й речі — вище; тут решта: золото, досвід, артефакти, ключі, трофеї босів
    frag.append(E("h4", "bst-h", "Решта здобичі"), table(null, rows));
    if (RPG.isCraftOnlyEnemy?.(id)) frag.append(E("p", "chronicle-note", "Зі світів, де речі лише кують, спорядження з ворогів не випадає."));
    return frag;
  }
  function roleAndStats(id) {
    const e = RPG.ENEMIES[id];
    const s = e.stats || {};
    const frag = document.createDocumentFragment();
    frag.append(E("h4", "bst-h", "Роль і характеристики"));
    const range = RPG.RANGE_NAMES?.[RPG.enemyRange?.(e) || 1] || "";
    const tags = [ROLE_NAMES[e.role] || e.role, range ? "дальність атаки: " + range : "", e.undead ? "нежить" : "", e.humanoid ? "носить спорядження під силу групи" : "", e.boss ? "бос" : ""].filter(Boolean);
    frag.append(E("p", "chronicle-p", tags.join(" · ")));
    const st = [["Атака", s.attack], ["Магія", s.magic], ["Захист", s.defense], ["Маг. захист", s.magicDefense], ["Швидкість", s.speed],
                ["Крит, %", s.crit], ["Ухилення, %", s.dodge], ["Блок фіз., %", s.blockPhys], ["Блок маг., %", s.blockMag]]
      .filter(([, v]) => v).map(([k, v]) => [k, RPG.ui.fmtNum(v)]);
    frag.append(table(["Характеристика", "Без спорядження"], st));
    const moves = [];
    const mv = RPG.enemyMove?.(e);
    if (mv) moves.push(`Прийом «${mv.name}» (×${mv.mult}, шанс ${Math.round(mv.chance * 100)}%)`);
    if (e.spell) moves.push(`Чари «${e.spell.name}» (×${e.spell.mult})`);
    for (const sk of e.skills || []) moves.push(`Навичка «${sk.name}»`);
    if (moves.length) frag.append(E("p", "chronicle-note", moves.join(" · ")));
    // Чемпіон
    frag.append(E("h4", "bst-h", "Чемпіон"));
    if (e.noChampion || e.boss) {
      frag.append(E("p", "chronicle-p", "Цей ворог не буває чемпіоном."));
    } else {
      const C = RPG.CHAMPION;
      let rest = 1;
      const rr = C.drops.map(([r, c]) => { const p = rest * c; rest *= 1 - c; return `${RPG.RARITIES?.[r]?.name || r} ${pct(p)}`; });
      const b = RPG.championBounty(id);
      frag.append(table(null, [
        ["Шанс зустріти", `${pct(C.chance)} (≈ ${per1000(C.chance)} на 1000 боїв)`],
        ["Посилення", `×${C.statMult}: здоров'я, мана, атака, магія, захист, маг. захист`],
        ["Здоров'я (без спорядження)", RPG.ui.fmtNum((s.hp || 0) * C.statMult)],
        ["Трофей — одна річ", rr.join(", ") + `; нічого — ${pct(rest)}`],
        ["Нагорода гільдії", `${RPG.ui.fmtNum(b.exp)} EXP і ${RPG.ui.fmtNum(b.gold)} золота`]
      ]));
    }
    return frag;
  }

  function entry(save, id) {
    const e = RPG.ENEMIES[id];
    const r = save.bestiary?.[id] || { k: 0 };
    const k = r.k || 0;
    const sec = E("section", "bst-entry" + (e.boss ? " is-boss" : ""));
    const head = E("div", "bst-head");
    const img = E("span", "bst-img");
    Object.assign(img.style, RPG.enemySpriteStyle(id));
    img.setAttribute("role", "img");
    img.setAttribute("aria-label", e.name);
    const title = E("div", "bst-title");
    title.append(E("h3", "chronicle-sub", e.name), E("span", "bst-sub", `Рівень ${e.level}` + (e.boss ? " · бос" : "") + (r.ch ? ` · чемпіонів переможено: ${r.ch}` : "")));
    head.append(img, title);
    sec.append(head, bar(k));
    if (k >= 10) {
      const hp = r.hp || [e.stats.hp, e.stats.hp], mp = r.mp || [e.stats.mp || 0, e.stats.mp || 0];
      const span = ([a, b]) => a === b ? RPG.ui.fmtNum(a) : `${RPG.ui.fmtNum(a)}–${RPG.ui.fmtNum(b)}`;
      sec.append(E("p", "chronicle-p bst-hpmp", `Здоров'я: ${span(hp)} · Мана: ${span(mp)}`));
    } else sec.append(locked(10, "Здоров'я й мана"));
    if (k >= 50) sec.append(E("h4", "bst-h", "Матеріали"), lootTable(lootRows(id, "mat")));
    else sec.append(locked(50, "Матеріали"));
    if (k >= 100) sec.append(E("h4", "bst-h", "Речі"), lootTable(lootRows(id, "item")));
    else sec.append(locked(100, "Речі"));
    if (k >= 200) sec.append(fullDrop(id), roleAndStats(id));
    else sec.append(locked(200, "Уся здобич, роль і характеристики, чемпіон"));
    return sec;
  }

  // Розділ книги для вікна-книги (game-common.js → showChronicle, opts.book)
  function bestiarySection(save, key, { go, paged = false } = {}) {
    const frag = document.createDocumentFragment();
    if (key === "toc") {
      frag.append(E("div", "chronicle-cover", "Бестіарій"),
        E("p", "chronicle-epigraph", "Її не пише жоден писар: щойно герой здолає ворога, на сторінках проступає його обрис. Що більше перемог — то більше книга розповідає."));
      const list = E("nav", "chronicle-toc-list");
      for (const c of bestiaryContents(save)) {
        if (!c.open) { list.append(E("span", "chronicle-toc-item is-sealed", `${c.title} — запечатано`)); continue; }
        list.append(RPG.ui.button(c.title, "chronicle-toc-item", () => go(c.key)));
      }
      frag.append(list);
      const known = Object.values(save.bestiary || {}).filter(r => r.k > 0).length;
      frag.append(E("p", "chronicle-note", `Описано істот: ${known} з ${Object.keys(worldsMap()).length}. Шкала кожної — до ${MAX} перемог: 1 — обрис і назва, 10 — здоров'я й мана, 50 — матеріали, 100 — речі, 200 — уся здобич і чемпіон. Бої експедицій книга не бачить.`));
      if (paged) frag.append(E("div", "book-col-break"), E("div", "book-vignette", "☙"),
        E("p", "book-vignette-text", "Знай свого ворога — і половина бою вже виграна."));
      return frag;
    }
    const n = Number(key.slice(1));
    frag.append(E("h2", "chronicle-title", `Глава ${ROMAN[n - 1]}. ${worldName(n)}`));
    const ids = enemiesOfWorld(n);
    const met = ids.filter(id => kills(save, id) > 0);
    if (!met.length) frag.append(E("p", "chronicle-blank", "Сторінки цієї глави ще чисті. Їх напишуть перемоги, яких поки не було…"));
    for (const id of met) frag.append(entry(save, id));
    if (ids.length > met.length) frag.append(E("p", "chronicle-note bst-unknown", `Ще не зустрінуто: ${ids.length - met.length} з ${ids.length} істот цієї глави.`));
    return frag;
  }

  function showBestiary(save, startKey = "toc") {
    if (!has(save)) return;
    RPG.ui.showChronicle(save, startKey, { book: {
      title: "Бестіарій", cls: "is-bestiary",
      contents: bestiaryContents,
      section: (sv, key, o) => bestiarySection(sv, key, o)
    } });
  }
  // Кнопки «📖 Бестіарій» (.bestiary-btn): видно, коли книгу вже знайдено
  function bindBestiaryButtons(save) {
    document.querySelectorAll(".bestiary-btn").forEach(b => {
      b.hidden = !has(save);
      if (!b.dataset.bound) { b.dataset.bound = "1"; b.addEventListener("click", () => showBestiary(save)); }
    });
  }

  Object.assign(RPG, {
    BESTIARY: { MAX, MARKS, MARK_TEXT, WORLD_NAMES },
    bestiaryRecord, bestiaryLines, bestiaryContents, bestiarySection, showBestiary, bindBestiaryButtons, bestiaryWorlds: worldsMap
  });
})(window.RPG);

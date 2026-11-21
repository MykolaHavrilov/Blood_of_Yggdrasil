// ============================================================
// data/worlds.js — ГЛОБАЛЬНА МАПА: 9 СВІТІВ ІГГДРАСИЛЯ (page-maps.js → showGlobeMap, кнопка-глобус на сторінці «Мапа»)
//
// Одна велика картина всіх світів (WORLD_MAP.image) з точками локацій.
// Світ відкритий лише тоді, коли до нього відкрито шлях (isWorldOpen): світ 1 — завжди; світ 2 — коли відчинено
// Центральну браму Дубової Застави; світи 3–9 — коли попередній світ відкритий, сам світ уже є в грі (region)
// і пройдено фінального боса попереднього світу (gate.boss). Закритий світ — сірий по своїй межі (area),
// усі його точки сірі. У відкритому світі точка кольорова, якщо в локацію можна зайти (canEnterLocation).
// Усі координати — у % картини (x — зліва направо, y — згори вниз).
//
// Поля світу:
//   n, name, sub  — номер, назва, підпис;
//   label         — де на картині підпис світу;
//   area          — межа світу (багатокутник) для сірого затемнення, поки світ закритий;
//   gate          — умова шляху: { kind: "start" } | { kind: "darkGate" } | { boss: "<id ворога>", text } — фінальний бос попереднього світу;
//   region + at   — світи, що вже є в грі (data/routes.js): at[id точки регіону] = [x, y] на глобальній картині;
//   spots         — світи, яких ще немає в грі: { name, x, y } (назви — з документа «Світи гри»).
// Коли світ з'явиться в грі — замінити йому spots на region + at, а в gate вписати id фінального боса попереднього світу.
// ============================================================
(function (RPG) {
  const WORLD_MAP = { image: "assets/images/map/map_worlds.webp", w: 1586, h: 992 };

  const WORLDS = [
    { n: 1, name: "Гардарика", sub: "Мідгард", label: { x: 8, y: 96 }, gate: { kind: "start" },
      area: [[0, 61], [22, 61], [24, 72], [20, 88], [20, 100], [0, 100]],
      region: "start",
      at: { home: [15.1, 90.4], temple: [3.5, 78.3], village_start: [8.8, 77.3], tavern: [11.7, 81.6],
            south_gate: [13.6, 66.2], forest_path: [18.6, 86.4], forest_cave: [3, 68] } },
    { n: 2, name: "Темний ліс", sub: "Мідгард", label: { x: 31, y: 96 }, gate: { kind: "darkGate" },
      area: [[22, 61], [29, 61], [30, 64], [40, 67], [48, 65], [47, 75], [46, 88], [50, 100], [20, 100], [20, 88], [24, 72]],
      region: "dark",
      at: { dark_gate: [22.4, 82.3], dk_edge: [27.4, 86], dk_marsh: [34.7, 85.4], dk_grave: [32.5, 80.8],
            dk_webs: [31.9, 72.7], dk_ravine: [40, 94.4], dk_ruins: [43.2, 71.7], dk_heart: [37.9, 77.3] } },
    { n: 3, name: "Альвгейм", sub: "рів. 25–30", label: { x: 62, y: 96 },
      gate: { boss: "forest_lord", text: "Шлях відкриється після першої перемоги над Володарем Темного лісу." },
      area: [[48, 65], [52, 61], [66, 58], [76, 58], [77, 80], [78, 100], [50, 100], [46, 88], [47, 75]],
      region: "alf",
      at: { alf_gate: [49.5, 95], alf_grove: [51.2, 89.4], alf_lake: [56.8, 82.3], alf_gardens: [66.9, 89.4],
            alf_towers: [68.8, 72.7], alf_freyr: [59.7, 68.7], alf_beli: [49.5, 67.7] } },
    { n: 4, name: "Ванагейм", sub: "рів. 30–35", label: { x: 60, y: 45 },
      gate: { boss: "alf_boss_beli", text: "Шлях відкриється після першої перемоги над Белі — фінальним босом Альвгейму." },
      area: [[38, 24], [46, 26], [58, 26], [67, 23], [72, 28], [74, 40], [78, 50], [76, 58], [66, 58], [52, 61], [48, 65], [50, 48], [48, 38], [38, 36], [28, 38], [33, 30]],
      region: "van",
      at: { van_gate: [52.5, 57.5], van_shore: [76.4, 48], van_marsh: [54.3, 52.5], van_kvasir: [65.7, 42.9],
            van_barrow: [65.7, 35.4], van_temple: [51.2, 32.8], van_ran: [72.6, 54] } },
    { n: 5, name: "Свартальвгейм", sub: "Нідавеллір · рів. 35–40", label: { x: 40, y: 39 },
      gate: { boss: "van_boss_ran_mistress_of_the_drowned", text: "Шлях відкриється після першої перемоги над Ран — фінальним босом Ванагейму." },
      area: [[28, 38], [38, 36], [48, 38], [50, 48], [48, 65], [40, 67], [30, 64], [29, 61], [27, 50]],
      region: "svart",
      at: { svart_gate: [39.5, 64], svart_mines: [38, 61], svart_falls: [31, 58], svart_quarters: [36, 52],
            svart_alvis: [28.8, 46.5], svart_forges: [36, 45], svart_runes: [45.7, 55], svart_mokkur: [46, 45.5] } },
    { n: 6, name: "Йотунгейм", sub: "рів. 40–45", label: { x: 10, y: 53 },
      gate: { boss: "svart_boss_mokkurkalfi", text: "Шлях відкриється після перемоги над фінальним босом Свартальвгейму." },
      area: [[0, 20], [10, 19], [22, 19], [27, 17], [26, 23], [38, 24], [33, 30], [28, 38], [27, 50], [29, 61], [22, 61], [0, 61]],
      region: "jot",
      at: { jot_gate: [24, 53], jot_passes: [19, 49], jot_thrymheim: [23, 29], jot_ironwood: [20, 42], jot_thrym: [11.4, 31.3],
            jot_waste: [8, 24], jot_utgard: [18.6, 35], jot_hymir: [6, 34], jot_serpent: [4.4, 44] } },
    { n: 7, name: "Муспельгейм", sub: "рів. 45–50", label: { x: 7, y: 10 },
      gate: { boss: "jot_boss_jormungandr", text: "Шлях відкриється після перемоги над фінальним босом Йотунгейму." },
      area: [[0, 0], [32, 0], [30, 10], [27, 17], [22, 19], [10, 19], [0, 20]],
      region: "musp",
      at: { musp_gate: [9, 18], musp_ash: [14, 14], musp_lava: [6, 16.7], musp_forges: [25, 15.5], musp_fortress: [19.6, 7],
            musp_sinmara: [23.5, 11], musp_ginnungagap: [2, 9], musp_surtr: [10.4, 3] } },
    { n: 8, name: "Асгард", sub: "рів. 50–60", label: { x: 45, y: 23 },
      gate: { boss: "musp_boss_surtr", text: "Біфрест відкриється після першої перемоги над Суртом." },   // ID — за спрайтом (worlds_3-9_sprites.zip)
      area: [[32, 0], [70, 0], [70, 16], [67, 23], [58, 26], [46, 26], [38, 24], [26, 23], [27, 17], [30, 10]],
      region: "asg",
      at: { asg_gate: [34, 20], asg_himinbjorg: [37, 16], asg_fensalir: [42.6, 14.1], asg_breidablik: [46, 7.6], asg_bilskirnir: [66.9, 12.6],
            asg_valhalla: [60.6, 22.7], asg_vingolf: [48, 12.5], asg_gladsheim: [51, 6], asg_square: [54.3, 12.1], asg_hlidskjalf: [61.2, 6.6] } },
    { n: 9, name: "Ніфльгейм і Хельгейм", sub: "фінальний світ · рів. 57–65", label: { x: 91, y: 61 },
      gate: { boss: "asg_boss_hel_on_odins_throne", text: "Портал Хелли відкриється після бою з нею в Глідскьяльві." },
      area: [[72, 28], [80, 24], [100, 24], [100, 100], [78, 100], [77, 80], [76, 58], [78, 50], [74, 40]],
      region: "nifl",
      at: { nifl_gate: [78, 26], nifl_border: [88, 28], nifl_elivagar: [75.4, 30.3], nifl_hvergelmir: [80.5, 36.9], nifl_roots: [82, 27.5],
            nifl_nidafjoll: [95.3, 32.8], nifl_nidhogg: [94.7, 41.9], nifl_gjallarbru: [83.3, 59.1], nifl_gnipahellir: [81.4, 75.3],
            nifl_helgrind: [92.2, 72.7], nifl_nastrond: [81, 94], nifl_eljudnir: [87.4, 67], nifl_throne: [91.8, 88.9] } }
  ];

  // Чи переможено фінального боса (перша перемога). Окремого лічильника босів у сейві немає:
  // Володар Темного лісу з першої перемоги кладе в бібліотеку книгу рун (save.books.runes); для решти — save.bossKills[id].
  function bossDefeated(save, id) {
    if (id === "forest_lord") return !!save.books?.runes;
    return !!save.bossKills?.[id];
  }

  // Чи відкрито шлях у світ: { ok, reason }. Світ відкривається лише слідом за попереднім.
  function isWorldOpen(save, n) {
    const w = WORLDS.find(x => x.n === n);
    if (!w) return { ok: false, reason: "" };
    const g = w.gate || {};
    if (g.kind === "start") return { ok: true };
    if (g.kind === "darkGate") {
      return RPG.isGateOpen && RPG.isGateOpen(save) ? { ok: true }
        : { ok: false, reason: "Шлях закритий: Центральна брама Дубової Застави зачинена — поговоріть з капітаном варти." };
    }
    const prev = isWorldOpen(save, n - 1);
    if (!prev.ok || !w.region) return { ok: false, reason: g.text || "Шлях у цей світ ще закритий." };
    if (g.boss && !bossDefeated(save, g.boss)) return { ok: false, reason: g.text || "Шлях у цей світ ще закритий." };
    return { ok: true };
  }

  // ---------- Світи «лише ремесла» (з 4-го світу) ----------
  // Починаючи з CRAFT_ONLY_FROM-го світу, вороги НЕ дають спорядження (зброя, броня, прикраси, щити, ліва рука)
  // і трофеїв чемпіонів — краще вдягнутися можна лише куванням із матеріалів, які падають з монстрів і з експедицій.
  // Падає й надалі: золото, зілля, ключі данжів, руни, квестові предмети, мішечки на пояс, креслення, матеріали.
  // Альвгейм (3-й світ) — без змін. Діє сама собою для кожного світу, щойно йому дадуть region (enemies.js → rollLoot).
  const CRAFT_ONLY_FROM = 4;
  function worldOfRegion(region) {
    region = region || "start";                            // локації без region — Гардарика (світ 1)
    if (region === "city") return 1;                       // Дубова Застава — Мідгард
    if (region === "svartgard") return 5;                  // Свартгард — місто Свартальвгейму
    return WORLDS.find(w => w.region === region)?.n || 0;
  }
  function isCraftOnlyRegion(region) { return worldOfRegion(region) >= CRAFT_ONLY_FROM; }

  Object.assign(RPG, { WORLD_MAP, WORLDS, isWorldOpen, CRAFT_ONLY_FROM, worldOfRegion, isCraftOnlyRegion });
})(window.RPG);

// ============================================================
// maze.js — ПОЛЕ-ЛАБІРИНТ: розбір карти, перевірка, шлях A → Б, генератор (без DOM)
// Задум — H:\Game_NEW\Лабіринт_задум.md (етап 4). Формат карти — data/mazes.js.
//
// RPG.parseMaze(maze)        — { rows, cols, tiles, zones, start, boss, spots: {зона: [клітинки]}, cells: {зона: [клітинки]},
//                              zoneIds, startZone, bossZone } (клітинка — { r, c })
// RPG.checkMaze(maze)        — [] або список помилок (рядки): розмір, A і Б, усе досяжне від A, кожна зона суцільна,
//                              у Б є вхід, В лише у вільних клітинках звичайних зон, у зоні з ворогами — місце для 6
// RPG.mazePath(maze)         — найкоротший шлях від A до найближчої клітинки Б (8 напрямків, як рух у бою) або null
// RPG.mazeRoute(maze)        — зони вздовж цього шляху по порядку: ["0", "1", …, "Б"]
// RPG.mazeText(maze, { view: "tiles" | "zones", path }) — карта текстом (tools/maze.js)
// RPG.mazeObstacles(maze, cover) — перешкоди карти у форматі battle.js → makeObstacles: [{ r, c, kind, block }]
//                              cover = { block: ["tree"|"rock"|"wall"], low: ["bush"|"stone"] } — вигляд за краями локації
// RPG.simulateMaze(team, maze, opts) — прохід лабіринту від A до Б (бої зон, ходьба, зілля) — опис нижче
// RPG.makeMaze(opts)         — нова карта { tiles, zones, corner, zoneCount }; opts: corner (0…3, як у бою), zones (4–7 зон
//                              між A і Б), rnd (генератор випадкових чисел, типово Math.random). Кожна карта проходить checkMaze.
//
// Рух: 8 напрямків, діагональ — теж крок; між двома перешкодами, що торкаються кутами, пройти можна (як у battle.js).
// Підключається ПІСЛЯ core.js (дані карт — data/mazes.js).
// ============================================================
(function (RPG) {
  const ROWS = 15, COLS = 30;                       // як поле бою (battle.js → FIELD)
  const MAZE_ZONES = { min: 4, max: 7 };            // зон між кімнатою A і кімнатою Б
  const SPOTS_FOR = 6;                              // у зоні з ворогами — місце щонайменше для 6 (ворогів не більше, ніж героїв)
  const BOSS_ROOM_MIN = 4;                          // бос + 3 приспішники
  const MAZE_DOOR = { wideChance: 0.25, wide: 2 };  // двері 3 клітинки — 25% (інакше 2), коли спільна стіна ≥ 3 клітинок
  const MAZE_CORRIDORS = { max: 2, chance: 0.35, len: [11, 17] };   // довгі коридори 2–3 завширшки, 11–17 завдовжки
  const key = (r, c) => r + ":" + c;
  const D8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const isOpen = t => t !== "1" && t !== "2";
  const normTile = ch => (ch === "А" ? "A" : ch);   // кирилична «А» — теж старт

  // ---------- Розбір ----------
  function parseMaze(maze) {
    const tiles = (maze.tiles || []).map(row => [...row].map(normTile));
    const zones = (maze.zones || []).map(row => [...row]);
    const out = { rows: tiles.length, cols: tiles[0]?.length || 0, tiles, zones, start: [], boss: [], spots: {}, cells: {} };
    tiles.forEach((row, r) => row.forEach((t, c) => {
      const z = zones[r]?.[c];
      if (isOpen(t) && z && z !== ".") (out.cells[z] ??= []).push({ r, c });
      if (t === "A") out.start.push({ r, c });
      else if (t === "Б") out.boss.push({ r, c });
      else if (t === "В" && z) (out.spots[z] ??= []).push({ r, c });
    }));
    out.zoneIds = Object.keys(out.cells).sort((a, b) => (a === "Б") - (b === "Б") || a.localeCompare(b));
    out.startZone = out.start.length ? zones[out.start[0].r]?.[out.start[0].c] : null;
    out.bossZone = "Б";
    return out;
  }
  const tileAt = (P, r, c) => P.tiles[r]?.[c];
  // Клітинки, досяжні від starts (8 напрямків) по вільних клітинках, для яких ok(r, c) — true
  function flood(P, starts, ok = () => true) {
    const seen = new Set(starts.map(p => key(p.r, p.c))), q = starts.slice();
    while (q.length) {
      const p = q.shift();
      for (const [dr, dc] of D8) {
        const r = p.r + dr, c = p.c + dc, k = key(r, c);
        if (seen.has(k) || r < 0 || r >= P.rows || c < 0 || c >= P.cols || !isOpen(tileAt(P, r, c)) || !ok(r, c)) continue;
        seen.add(k); q.push({ r, c });
      }
    }
    return seen;
  }

  // ---------- Перевірка ----------
  function checkMaze(maze) {
    const err = [];
    const P = parseMaze(maze);
    if (P.rows !== ROWS || P.tiles.some(row => row.length !== COLS)) err.push(`tiles: має бути ${ROWS} рядків по ${COLS} символів`);
    if (P.zones.length !== ROWS || P.zones.some(row => row.length !== COLS)) err.push(`zones: має бути ${ROWS} рядків по ${COLS} символів`);
    if (err.length) return err;
    const at = (r, c) => `(${r},${c})`;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const t = P.tiles[r][c], z = P.zones[r][c];
      if (!/^[012AБВ]$/.test(t)) err.push(`${at(r, c)}: невідома клітинка «${t}»`);
      if (!/^[0-9Б.]$/.test(z)) err.push(`${at(r, c)}: невідома зона «${z}»`);
      if (isOpen(t) && z === ".") err.push(`${at(r, c)}: вільна клітинка без зони`);
      if (!isOpen(t) && z !== ".") err.push(`${at(r, c)}: під перешкодою має бути «.», а не зона «${z}»`);
      if ((t === "Б") !== (z === "Б") && isOpen(t) && !(t === "В" && z === "Б")) err.push(`${at(r, c)}: клітинки Б і зона Б мають збігатися`);
    }
    if (!P.start.length) err.push("немає старту A");
    if (!P.boss.length) err.push("немає кімнати боса Б");
    if (err.length) return err;
    if (P.start.some(p => P.zones[p.r][p.c] !== P.startZone)) err.push("усі клітинки A мають бути в одній зоні");
    if (P.startZone === "Б") err.push("старт A не може бути в кімнаті боса");
    // усе досяжне від A
    const reach = flood(P, P.start);
    const lost = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isOpen(P.tiles[r][c]) && !reach.has(key(r, c))) lost.push(at(r, c));
    if (lost.length) err.push(`недосяжні від A клітинки: ${lost.slice(0, 8).join(" ")}${lost.length > 8 ? ` … (усього ${lost.length})` : ""}`);
    // кожна зона суцільна
    for (const z of P.zoneIds) {
      const cells = P.cells[z];
      const part = flood(P, [cells[0]], (r, c) => P.zones[r][c] === z);
      if (part.size !== cells.length) err.push(`зона ${z} розірвана на частини (${part.size} з ${cells.length} клітинок разом)`);
    }
    // у Б є вхід
    const bossDoor = P.boss.some(p => D8.some(([dr, dc]) => {
      const t = P.tiles[p.r + dr]?.[p.c + dc];
      return t && isOpen(t) && P.zones[p.r + dr][p.c + dc] !== "Б";
    }));
    if (!bossDoor) err.push("до кімнати боса Б немає входу");
    if ((P.cells["Б"] || []).length < BOSS_ROOM_MIN) err.push(`кімната боса менша за ${BOSS_ROOM_MIN} клітинки (бос + 3)`);
    // місця ворогів
    for (const [z, spots] of Object.entries(P.spots)) {
      if (z === P.startZone) err.push(`місця ворогів В у зоні старту ${z}: ${spots.map(p => at(p.r, p.c)).join(" ")}`);
      if (z === "Б") err.push("місця ворогів В у кімнаті боса (там бос і приспішники стають самі)");
      const room = P.cells[z].filter(p => P.tiles[p.r][p.c] !== "A").length;
      if (room < SPOTS_FOR) err.push(`зона ${z}: ворогам замало місця — ${room} клітинок, треба ${SPOTS_FOR}`);
    }
    return err;
  }

  // ---------- Шлях і маршрут ----------
  function mazePath(maze) {
    const P = maze.tiles ? parseMaze(maze) : maze;
    if (!P.start.length || !P.boss.length) return null;
    const prev = new Map(P.start.map(p => [key(p.r, p.c), null])), q = P.start.slice();
    while (q.length) {
      const p = q.shift();
      if (tileAt(P, p.r, p.c) === "Б") {
        const path = [];
        for (let k = key(p.r, p.c); k; k = prev.get(k)) { const [r, c] = k.split(":").map(Number); path.unshift({ r, c }); }
        return path;
      }
      for (const [dr, dc] of D8) {
        const r = p.r + dr, c = p.c + dc, k = key(r, c);
        if (prev.has(k) || r < 0 || r >= P.rows || c < 0 || c >= P.cols || !isOpen(tileAt(P, r, c))) continue;
        prev.set(k, key(p.r, p.c)); q.push({ r, c });
      }
    }
    return null;
  }
  function mazeRoute(maze) {
    const P = parseMaze(maze), path = mazePath(P) || [];
    const route = [];
    for (const p of path) { const z = P.zones[p.r][p.c]; if (route[route.length - 1] !== z) route.push(z); }
    return route;
  }

  // ---------- Карта текстом ----------
  function mazeText(maze, { view = "tiles", path = false } = {}) {
    const P = parseMaze(maze);
    const on = new Set(path ? (mazePath(P) || []).map(p => key(p.r, p.c)) : []);
    const head1 = "     " + Array.from({ length: P.cols }, (_, c) => (c % 10 === 0 ? String(c / 10) : " ")).join(" ");
    const head2 = "     " + Array.from({ length: P.cols }, (_, c) => String(c % 10)).join(" ");
    const rows = P.tiles.map((row, r) => String(r).padStart(2) + " | " + row.map((t, c) => {
      if (!isOpen(t)) return view === "zones" ? (t === "2" ? "█" : "·") : t;
      if (on.has(key(r, c)) && t !== "A" && t !== "Б" && t !== "В") return "*";
      if (view === "zones" && t !== "A" && t !== "В") return P.zones[r][c];
      return t;
    }).join(" "));
    return [head1, head2, ...rows].join("\n");
  }

  // ---------- Вигляд перешкод ----------
  function mazeObstacles(maze, cover = {}) {
    const P = parseMaze(maze);
    const big = cover.block?.length ? cover.block : ["tree"], low = cover.low?.length ? cover.low : ["bush"];
    const out = [];
    P.tiles.forEach((row, r) => row.forEach((t, c) => {
      if (t === "2") out.push({ r, c, kind: big[(r * 7 + c * 3) % big.length], block: true });
      else if (t === "1") out.push({ r, c, kind: low[(r * 5 + c) % low.length], block: false });
    }));
    return out;
  }

  // ---------- Генератор ----------
  // 1) Поле ділиться стінами (2) на прямокутники — кімнати й коридори (по одній зоні на кожен).
  // 2) Кімната A — та, що в куті corner; між сусідами — випадкове дерево проходів (двері: 75% — 2 клітинки, 25% — 3),
  //    кімната Б — найдальша від A гілка дерева (у неї рівно один вхід).
  // 3) У кімнатах — ряди малих перешкод (1) з проходом і окремі стовпи (2), якщо вони не рвуть зону.
  // 4) У кожній зоні, де є місце для 6, — 1–4 місця ворогів В. Карта, що не пройшла checkMaze, будується наново.
  const cornerCell = corner => ({ r: corner % 2 ? ROWS - 1 : 0, c: corner >= 2 ? COLS - 1 : 0 });
  function makeMaze(opts = {}) {
    const rnd = opts.rnd || Math.random;
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const corner = Number.isInteger(opts.corner) ? opts.corner : ri(0, 3);
    for (let attempt = 0; attempt < 300; attempt++) {
      const want = Math.max(MAZE_ZONES.min, Math.min(MAZE_ZONES.max, opts.zones ?? ri(MAZE_ZONES.min, MAZE_ZONES.max)));
      const m = buildOnce(want, corner, ri, pick, rnd);
      if (m && !checkMaze(m).length) return m;
    }
    throw new Error("makeMaze: не вдалося побудувати карту");
  }

  function buildOnce(middle, corner, ri, pick, rnd) {
    // 1) поділ на прямокутники (r0..r1, c0..c1 — вільна частина; між ними — стіна в 1 клітинку)
    const rects = [{ r0: 0, c0: 0, r1: ROWS - 1, c1: COLS - 1 }];
    const area = a => (a.r1 - a.r0 + 1) * (a.c1 - a.c0 + 1);
    const cuts = a => {
      const h = a.r1 - a.r0 + 1, w = a.c1 - a.c0 + 1, res = [];
      const thin = rnd() < 0.3 ? 2 : 3;                          // інколи — коридор завширшки 2
      for (let k = a.c0 + thin; k <= a.c1 - thin; k++) {
        const L = { ...a, c1: k - 1 }, R = { ...a, c0: k + 1 };
        if (area(L) >= 12 && area(R) >= 12) res.push(["v", k, L, R]);
      }
      for (let k = a.r0 + thin; k <= a.r1 - thin; k++) {
        const T = { ...a, r1: k - 1 }, B = { ...a, r0: k + 1 };
        if (area(T) >= 12 && area(B) >= 12) res.push(["h", k, T, B]);
      }
      // довгі кімнати ріжемо впоперек
      const v = res.filter(x => x[0] === "v"), hh = res.filter(x => x[0] === "h");
      if (w >= h * 1.5 && v.length) return v;
      if (h >= w * 1.5 && hh.length) return hh;
      return res;
    };
    // Коридор (рішення 25.11.2026): смуга завширшки 2–3 уздовж довгого боку прямокутника 11–17 клітинок —
    // трішки довша за кімнати; далі коридор не ріжеться. На карту — до MAZE_CORRIDORS.max, кожен з шансом chance.
    const corridorCut = a => {
      const h = a.r1 - a.r0 + 1, w = a.c1 - a.c0 + 1, horiz = w >= h, len = horiz ? w : h, side = horiz ? h : w;
      const t = rnd() < 0.5 ? 2 : 3;
      if (len < MAZE_CORRIDORS.len[0] || len > MAZE_CORRIDORS.len[1] || side - t - 1 < 3) return null;
      const atStart = rnd() < 0.5;
      if (horiz) return atStart ? [{ ...a, r1: a.r0 + t - 1, corr: true }, { ...a, r0: a.r0 + t + 1 }] : [{ ...a, r0: a.r1 - t + 1, corr: true }, { ...a, r1: a.r1 - t - 1 }];
      return atStart ? [{ ...a, c1: a.c0 + t - 1, corr: true }, { ...a, c0: a.c0 + t + 1 }] : [{ ...a, c0: a.c1 - t + 1, corr: true }, { ...a, c1: a.c1 - t - 1 }];
    };
    let corridors = 0;
    const wantCorr = Array.from({ length: MAZE_CORRIDORS.max }, () => rnd() < MAZE_CORRIDORS.chance).filter(Boolean).length;
    while (rects.length < middle + 2) {
      if (corridors < wantCorr) {
        const ok = rects.map((a, i) => [i, a.corr ? null : corridorCut(a)]).filter(x => x[1]);
        if (ok.length) { const [i, pair] = pick(ok); rects.splice(i, 1, ...pair); corridors++; continue; }
      }
      const cand = rects.map((a, i) => [i, a.corr ? [] : cuts(a)]).filter(x => x[1].length).sort((x, y) => area(rects[y[0]]) - area(rects[x[0]]));
      if (!cand.length) return null;
      const [i, options] = cand[Math.min(cand.length - 1, ri(0, 1))];
      const [, , A, B] = pick(options);
      rects.splice(i, 1, A, B);
    }
    const cc = cornerCell(corner);
    const startIdx = rects.findIndex(a => cc.r >= a.r0 && cc.r <= a.r1 && cc.c >= a.c0 && cc.c <= a.c1);
    const sr = rects[startIdx];
    if (sr.r1 - sr.r0 < 2 || sr.c1 - sr.c0 < 2) return null;    // A — 3 × 3
    // сусіди: спільна стіна з перекриттям ≥ 2
    const links = [];
    for (let i = 0; i < rects.length; i++) for (let j = 0; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.c1 + 2 === b.c0) {
        const lo = Math.max(a.r0, b.r0), hi = Math.min(a.r1, b.r1);
        if (hi - lo >= 1) links.push({ i, j, wall: { c: a.c1 + 1 }, lo, hi });
      }
      if (a.r1 + 2 === b.r0) {
        const lo = Math.max(a.c0, b.c0), hi = Math.min(a.c1, b.c1);
        if (hi - lo >= 1) links.push({ i, j, wall: { r: a.r1 + 1 }, lo, hi });
      }
    }
    // 2) випадкове дерево проходів від кімнати A
    const depth = { [startIdx]: 0 }, parent = {}, used = [];
    while (Object.keys(depth).length < rects.length) {
      const front = links.filter(l => (l.i in depth) !== (l.j in depth));
      if (!front.length) return null;
      const l = pick(front), from = l.i in depth ? l.i : l.j, to = from === l.i ? l.j : l.i;
      depth[to] = depth[from] + 1; parent[to] = from; used.push({ ...l, child: to });
    }
    const centre = a => ({ r: (a.r0 + a.r1) / 2, c: (a.c0 + a.c1) / 2 });
    const far = i => { const p = centre(rects[i]); return Math.hypot(p.r - cc.r, (p.c - cc.c) * 0.8); };
    const leaves = rects.map((_, i) => i).filter(i => i !== startIdx && !Object.values(parent).includes(i));
    const bossIdx = leaves.sort((x, y) => !!rects[x].corr - !!rects[y].corr || depth[y] - depth[x] || far(y) - far(x))[0];   // Б — не коридор, якщо є з чого вибрати
    if (bossIdx == null || far(bossIdx) < 14 || area(rects[bossIdx]) > 90) return null;
    // клітинки
    const T = Array.from({ length: ROWS }, () => Array(COLS).fill("2"));
    const owner = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
    rects.forEach((a, i) => { for (let r = a.r0; r <= a.r1; r++) for (let c = a.c0; c <= a.c1; c++) { T[r][c] = "0"; owner[r][c] = i; } });
    const doorCells = new Set();
    const doorW = [];
    for (const l of used) {
      // двері: 75% — 2 клітинки, 25% — 3 (рішення 25.11.2026), якщо спільна стіна довша за двері
      const width = l.hi - l.lo >= MAZE_DOOR.wide && rnd() < MAZE_DOOR.wideChance ? 3 : 2;
      doorW.push(width);
      const s = ri(l.lo, l.hi - width + 1);
      for (let k = s; k < s + width; k++) {
        const r = l.wall.r ?? k, c = l.wall.c ?? k;
        T[r][c] = "0"; owner[r][c] = l.child; doorCells.add(key(r, c));
      }
    }
    const nearDoor = (r, c) => [...doorCells].some(k => { const [dr, dc] = k.split(":").map(Number); return Math.max(Math.abs(dr - r), Math.abs(dc - c)) <= 1; });
    // зони: 0 — старт, далі за глибиною дерева, Б — бос
    const order = rects.map((_, i) => i).filter(i => i !== startIdx && i !== bossIdx).sort((x, y) => depth[x] - depth[y] || far(x) - far(y));
    const zoneOf = { [startIdx]: "0", [bossIdx]: "Б" };
    order.forEach((i, n) => { zoneOf[i] = String(n + 1); });
    const startCells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) startCells.push({ r: cc.r ? ROWS - 1 - r : r, c: cc.c ? COLS - 1 - c : c });
    const nearStart = (r, c) => startCells.some(p => Math.max(Math.abs(p.r - r), Math.abs(p.c - c)) <= 1);
    // перевірка, що зона i суцільна, а все поле досяжне (для прикрас)
    const P0 = () => ({ rows: ROWS, cols: COLS, tiles: T });
    const zoneWhole = i => {
      const cells = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (owner[r][c] === i && isOpen(T[r][c])) cells.push({ r, c });
      return cells.length && flood(P0(), [cells[0]], (r, c) => owner[r][c] === i).size === cells.length;
    };
    const free = (r, c) => T[r]?.[c] === "0" && !nearDoor(r, c) && !nearStart(r, c);
    const tryPut = (cells, ch, i) => {
      if (!cells.length || !cells.every(p => free(p.r, p.c))) return false;
      for (const p of cells) T[p.r][p.c] = ch;
      if (zoneWhole(i)) return true;
      for (const p of cells) T[p.r][p.c] = "0";
      return false;
    };
    // 3) прикраси: ряди «1» з проходом у 2 клітинки, стовпи «2», окремі «1»
    rects.forEach((a, i) => {
      const h = a.r1 - a.r0 + 1, w = a.c1 - a.c0 + 1;
      if (i === bossIdx) return;
      if (i !== startIdx && rnd() < 0.6 && (w >= 6 || h >= 6) && Math.min(w, h) >= 4) {
        const horiz = w >= h;
        const len = horiz ? w : h, gap = ri(0, len - 2);
        const at = horiz ? ri(a.r0 + 1, a.r1 - 1) : ri(a.c0 + 1, a.c1 - 1);
        const cells = [];
        for (let k = 0; k < len; k++) {
          if (k === gap || k === gap + 1) continue;
          cells.push(horiz ? { r: at, c: a.c0 + k } : { r: a.r0 + k, c: at });
        }
        tryPut(cells.filter(p => free(p.r, p.c)), "1", i);
      }
      const pillars = i === startIdx ? 0 : ri(0, Math.floor(area(a) / 30));
      for (let n = 0; n < pillars; n++) {
        const r = ri(a.r0 + 1, a.r1 - 1), c = ri(a.c0 + 1, a.c1 - 1);
        const cells = [{ r, c }];
        if (rnd() < 0.5) cells.push(rnd() < 0.5 ? { r, c: c + 1 } : { r: r + 1, c });
        if (cells.every(p => owner[p.r]?.[p.c] === i)) tryPut(cells, "2", i);
      }
      for (let n = ri(0, 2); n > 0; n--) {
        const r = ri(a.r0, a.r1), c = ri(a.c0, a.c1);
        tryPut([{ r, c }], "1", i);
      }
    });
    // 4) місця ворогів
    let withFoes = 0;
    for (const i of order) {
      const cells = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (owner[r][c] === i && T[r][c] === "0") cells.push({ r, c });
      if (cells.length < SPOTS_FOR) continue;
      const pool = cells.filter(p => !nearDoor(p.r, p.c));
      const n = Math.min(pool.length, ri(1, Math.min(4, 1 + Math.floor(cells.length / 12))));
      for (let k = 0; k < n; k++) { const p = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; T[p.r][p.c] = "В"; }
      if (n) withFoes++;
    }
    if (withFoes < 2) return null;
    for (const p of startCells) T[p.r][p.c] = "A";
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (owner[r][c] === bossIdx && isOpen(T[r][c])) T[r][c] = "Б";
    const Z = T.map((row, r) => row.map((t, c) => (isOpen(t) ? zoneOf[owner[r][c]] : ".")).join(""));
    return { tiles: T.map(row => row.join("")), zones: Z, corner, zoneCount: rects.length, doors: doorW, corridors: corridors };
  }


  // ---------- Прохід лабіринту (етап 6) ----------
  // RPG.simulateMaze(team, maze, opts) — увесь прохід одразу (як бій), без DOM і без змін у сейвах.
  //   team — герої групи (party.js → memberSave), maze — карта (data/mazes.js або makeMaze).
  //   opts.locationId — звідки вороги (data/enemies.js → pickEnemy, без босів); opts.boss — ID боса кімнати Б (данж;
  //   без нього Б — останній бій зі звичайними ворогами); opts.dungeon — данж (зілля між боями заборонені);
  //   opts.pickFoes(zone, n) — свої вороги замість pickEnemy ([{ id, champion }]); opts.cover — вигляд перешкод;
  //   opts.onPotion(heroes, no) — після виграного бою зони на локації: зілля (може змінити hp / mp героїв), повертає рядки;
  //   opts.heroCells — клітинки старту героїв (у кімнаті A; інакше — найближчі до виходу); opts.boss — ID або spec ворога.
  //   Порядок героїв у team — порядок ходьби: перший веде групу.
  // Правила (Лабіринт_задум.md):
  //   • група йде від A до Б найкоротшим шляхом по черзі: перший — до Б, кожен наступний — за попереднім (1 клітинка за крок);
  //   • вороги зони з'являються (сплячими), щойно хтось побачить її місце «В» (у Б — будь-яку клітинку Б) або зайде в неї;
  //     скільки — стільки, скільки героїв живі в цю мить; у Б з босом — бос + (героїв − 1), не більше 3 приспішників;
  //   • бій зони — коли герой заходить у неї або дальник (лук — 3, посох — 2) бачить сплячого в межах дальності й стріляє;
  //     у бою — стрілець і герої в зоні; інші йдуть до бою (до 4 клітинок за раунд) і вступають, щойно зайдуть у зону
  //     чи побачать прокинутого ворога; якщо всі в бою полягли — у бій кидаються решта живих;
  //   • загиблі лишаються, живі йдуть далі; кінець — кімнату Б зачищено або загинули всі (зокрема від Хелли).
  // Повертає { win, hel, reason, parts, heroes: [{ hp, mp, dead, pos }], defeated: [{ id, champion, name, exp }], battles, ticks }
  //   parts — по черзі: { type: "move", frames: [[{ r, c } | null для кожного героя], …] },
  //                     { type: "battle", no, zone, why: "enter" | "shot", shooter, heroIdx, result } (result — як simulatePartyBattle),
  //                     { type: "spawn", zone, specs, pos } — вороги зони з'явилися (сплячі),
  //                     { type: "potion", after: no, lines }
  const WALK_STEPS = 4;          // клітинок за раунд для тих, хто йде до бою (як рух у бою)
  const MAZE_MAX_TICKS = 3000;   // запобіжник: кроків ходьби за прохід
  const cd = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
  function heroReach(ms) {
    const t = RPG.ITEMS?.[RPG.refId ? RPG.refId(ms.equipment?.mainHand) : null]?.weaponType;
    return t === "bow" ? 3 : t === "staff" ? 2 : 1;
  }
  // Сила звичайних ворогів проходу локації (етап 9, баланс 24.11.2026): множник здоров'я, атаки, магії й захистів
  // (monstergear.js → spec.power) за світом локації (region) і розміром групи на старті проходу (1…6 героїв).
  // Цілі (герої свого рівня; світи 1–2 — у речах тіру, далі — у повному професійному сеті епічної рідкості; без зілля):
  //   соло — світи 1–2 ≥ 90%, світ 3 ≈ 70%, від світу 4 ≈ 5–10% (далі гра розрахована на групу);
  //   група — 3 герої ≈ 70%, 6 ≈ 85%. Підбирається скриптом балансу (tools/balance.js --maze).
  //   25.11.2026 — перепідібрано після слотів речей (сила ворогів світів 4–9 — data/enemies.js, «ТРЕТІЙ ПЕРЕРАХУНОК»)
  //   і після відновлення HP/MP у бою (1 раунд = 1 с).
  //   Нема рядка — множник 1. Данжі — свій множник (dungeon.js → GROUP_POWER), експедиції — свій (expedition.js → EXP_POWER).
  const MAZE_POWER = {
    dark : { 1: 0.7, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 },
    alf  : { 1: 0.75, 2: 0.88, 3: 1.04, 4: 1.04, 5: 1.04, 6: 0.99 },
    van  : { 1: 2.01, 2: 1.37, 3: 1.05, 4: 1.05, 5: 1.05, 6: 1.05 },
    svart: { 1: 1.95, 2: 1.38, 3: 0.98, 4: 0.98, 5: 0.98, 6: 0.94 },
    jot  : { 1: 1.63, 2: 1.31, 3: 0.92, 4: 0.92, 5: 0.84, 6: 0.84 },
    musp : { 1: 1.68, 2: 1.28, 3: 0.81, 4: 0.8, 5: 0.79, 6: 0.76 },
    asg  : { 1: 1.46, 2: 1.15, 3: 0.78, 4: 0.78, 5: 0.78, 6: 0.75 },
    nifl : { 1: 1.17, 2: 0.95, 3: 0.7, 4: 0.7, 5: 0.7, 6: 0.67 },
  };
  function mazePower(locationId, size) {
    const row = MAZE_POWER[RPG.LOCATIONS?.[locationId]?.region || "start"];
    return (row && row[Math.max(1, Math.min(6, size || 1))]) || 1;
  }

  function simulateMaze(team, maze, opts = {}) {
    const P = parseMaze(maze);
    const solid = new Set(), sight = new Set();
    P.tiles.forEach((row, r) => row.forEach((t, c) => { if (!isOpen(t)) { solid.add(key(r, c)); if (t === "2") sight.add(key(r, c)); } }));
    const zoneAt = p => P.zones[p.r]?.[p.c];
    const hasSight = RPG.hasSight || (() => true);
    const visionOf = RPG.visionOf || (() => 3);
    // Наступна клітинка найкоротшого шляху від from до клітинки, де goal(p) — true; blocked — Set зайнятих клітинок
    function nextStep(from, goal, blocked) {
      if (goal(from)) return null;
      const prev = new Map([[key(from.r, from.c), null]]), q = [from];
      while (q.length) {
        const p = q.shift();
        for (const [dr, dc] of D8) {
          const n = { r: p.r + dr, c: p.c + dc }, k = key(n.r, n.c);
          if (n.r < 0 || n.r >= ROWS || n.c < 0 || n.c >= COLS || prev.has(k) || solid.has(k) || blocked.has(k)) continue;
          prev.set(k, p);
          if (goal(n)) {
            let cur = n;
            while (prev.get(key(cur.r, cur.c)) && (prev.get(key(cur.r, cur.c)).r !== from.r || prev.get(key(cur.r, cur.c)).c !== from.c)) cur = prev.get(key(cur.r, cur.c));
            return { r: cur.r, c: cur.c };
          }
          q.push(n);
        }
      }
      return null;
    }
    // Герої проходу
    const path0 = mazePath(P) || [];
    const lead = path0[1] || path0[0] || P.start[0];
    const starts = P.start.slice().sort((a, b) => cd(a, lead) - cd(b, lead));
    const H = team.map((ms, i) => ({
      i, ms, side: "hero", name: ms.character.name, classId: ms.character.classId,
      hp: Math.floor(ms.character.hp), mp: Math.floor(ms.character.mp), dead: !(ms.character.hp > 0),
      reach: heroReach(ms), pos: { ...(opts.heroCells?.[i] || starts[i % starts.length]) }
    }));
    const alive = () => H.filter(h => !h.dead);
    const sees = (h, p) => cd(h.pos, p) <= visionOf(h) && hasSight(h.pos, p, sight);
    const level = Math.max(1, ...team.map(ms => ms.character.level || 1));
    const locPower = opts.power ?? mazePower(opts.locationId, team.length);
    const zones = {};              // зона → { specs, pos, cleared }
    const parts = [], defeated = [];
    let frames = null, battleNo = 0, ticks = 0, hel = false, win = false, reason = "";
    const frame = () => {
      if (!frames) { frames = []; parts.push({ type: "move", frames }); }
      frames.push(H.map(h => (h.dead ? null : { ...h.pos })));
    };
    // Вороги зони z: n — живих героїв зараз
    function pickNormal(n) {
      if (!opts.locationId || !RPG.pickEnemy) return [];
      const out = [];
      for (let k = 0; k < n; k++) {
        const id = RPG.pickEnemy(opts.locationId, level, { noBoss: true });
        if (id) out.push({ id, champion: RPG.rollChampion ? RPG.rollChampion(id) : false, power: locPower });
      }
      return out;
    }
    function spawn(z) {
      const n = Math.max(1, alive().length);
      let specs;
      if (z === "Б" && opts.boss) specs = [typeof opts.boss === "string" ? { id: opts.boss } : { ...opts.boss }, ...(opts.pickFoes ? opts.pickFoes(z, Math.min(3, n - 1)) : pickNormal(Math.min(3, n - 1)))];
      else specs = opts.pickFoes ? opts.pickFoes(z, n) : pickNormal(n);
      specs = specs.slice(0, z === "Б" && opts.boss ? 4 : n);
      if (specs.length && RPG.equipFoes) RPG.equipFoes(specs, alive().map(h => h.ms));
      // місця: спершу «В» (випадково), далі — найближчі до них клітинки зони; у Б — найдальші від входу
      const cells = P.cells[z].filter(p => P.tiles[p.r][p.c] !== "A");
      let order;
      if (z === "Б") {
        const fromA = flood(P, P.start), d = new Map();
        const prev = new Map(P.start.map(p => [key(p.r, p.c), 0])), q = P.start.slice();
        while (q.length) { const p = q.shift(); for (const [dr, dc] of D8) { const n2 = { r: p.r + dr, c: p.c + dc }, k = key(n2.r, n2.c); if (!fromA.has(k) || prev.has(k)) continue; prev.set(k, prev.get(key(p.r, p.c)) + 1); q.push(n2); } }
        for (const p of cells) d.set(key(p.r, p.c), prev.get(key(p.r, p.c)) ?? 0);
        order = cells.slice().sort((a, b) => d.get(key(b.r, b.c)) - d.get(key(a.r, a.c)));
      } else {
        const spots = (P.spots[z] || []).slice().sort(() => Math.random() - 0.5);
        const rest = cells.filter(p => !spots.some(s => s.r === p.r && s.c === p.c))
          .sort((a, b) => Math.min(...spots.map(s => cd(s, a))) - Math.min(...spots.map(s => cd(s, b))));
        order = [...spots, ...rest];
      }
      zones[z] = { specs, pos: order.slice(0, specs.length).map(p => ({ r: p.r, c: p.c })), cleared: !specs.length };
      if (specs.length) { frames = null; parts.push({ type: "spawn", zone: z, specs, pos: zones[z].pos.map(p => ({ ...p })) }); }
    }
    const live = z => zones[z] && !zones[z].cleared;
    // Що відбувається після кроку: поява ворогів, вхід у зону, постріл дальника
    function trigger() {
      for (const z of P.zoneIds) {
        if (z === P.startZone || zones[z] || !(z === "Б" || P.spots[z]?.length)) continue;
        const marks = z === "Б" ? P.cells["Б"] : P.spots[z];
        if (alive().some(h => zoneAt(h.pos) === z || marks.some(p => sees(h, p)))) spawn(z);
      }
      for (const h of alive()) { const z = zoneAt(h.pos); if (live(z)) return { z, why: "enter" }; }
      for (const h of alive()) {
        if (h.reach < 2) continue;
        for (const [z, Z] of Object.entries(zones)) {
          if (!live(z)) continue;
          if (Z.pos.some(p => cd(h.pos, p) <= h.reach && sees(h, p))) return { z, why: "shot", shooter: h };
        }
      }
      return null;
    }
    // Бій зони z
    function fight({ z, why, shooter }) {
      frames = null;
      const Z = zones[z], liveH = alive();
      // копія героя з поточними HP / MP; прототип — сам герой (вигляд напарника — Object.create(save): інвентар, печатки тощо успадковані)
      const members = liveH.map(h => Object.assign(Object.create(h.ms), { character: { ...h.ms.character, hp: h.hp, mp: h.mp } }));
      const away = liveH.map(h => !(zoneAt(h.pos) === z || h === shooter));
      let lastRound = -1, used = new Map();
      const afterSlot = api => {
        if (api.round !== lastRound) { lastRound = api.round; used = new Map(); }
        api.heroes.forEach((u, k) => {
          if (!u.away || u.hp <= 0) return;
          if ((used.get(k) || 0) < WALK_STEPS) {
            const busy = new Set([...api.heroes, ...api.foes].filter(x => x !== u && x.hp > 0).map(x => key(x.pos.r, x.pos.c)));
            const nx = nextStep(u.pos, p => zoneAt(p) === z, busy);
            if (nx) { u.pos = nx; used.set(k, (used.get(k) || 0) + 1); }
          }
          if (zoneAt(u.pos) === z || api.foes.some(f => f.hp > 0 && !f.asleep && api.sees(u, f))) api.join(k);
        });
      };
      const B = RPG.createBattle(members, Z.specs, { maze, cover: opts.cover, heroCells: liveH.map(h => h.pos), foePos: Z.pos,
        asleep: true, away, vision: true, afterSlot });
      if (why === "shot") B.wake(B.foes[0], `${shooter.name} стріляє здалеку`);
      while (B.round < (RPG.BATTLE_MAX_ROUNDS || 100)) {
        if (!B.going()) {
          const rest = B.heroes.map((u, k) => [u, k]).filter(([u]) => u.away && u.hp > 0);
          if (rest.length && B.foes.some(f => f.hp > 0 && !f.asleep)) { for (const [, k] of rest) B.join(k); continue; }
          break;
        }
        B.runRound();
      }
      const r = B.finish();
      const last = r.events[r.events.length - 1];
      liveH.forEach((h, k) => {
        h.hp = r.heroes[k].hp; h.mp = r.heroes[k].mp; h.dead = r.heroes[k].dead;
        if (last) h.pos = { ...last.heroes[k].pos };
      });
      if (r.hel) hel = true;
      if (r.win) { Z.cleared = true; defeated.push(...r.enemies.map(e => ({ id: e.id, champion: e.champion, name: e.name, exp: e.exp }))); }
      parts.push({ type: "battle", no: ++battleNo, zone: z, why, specs: Z.specs, shooter: shooter ? shooter.i : null, heroIdx: liveH.map(h => h.i), result: r });
      if (r.win && alive().length && !opts.dungeon && opts.potions !== false) {
        const lines = opts.onPotion ? opts.onPotion(H, battleNo) : null;
        parts.push({ type: "potion", after: battleNo, lines: lines || [] });
      }
      return r;
    }

    frame();
    let stuck = 0;
    if (!alive().length) reason = "wiped";   // живих немає ще до старту
    for (; !reason && ticks < MAZE_MAX_TICKS; ticks++) {
      const t = trigger();
      if (t) {
        const r = fight(t);
        if (!alive().length) { reason = r.hel ? "hel" : "wiped"; break; }
        if (t.z === "Б" && r.win) { win = true; reason = "cleared"; break; }
        continue;
      }
      if (zones["Б"]?.cleared) { win = true; reason = "cleared"; break; }
      // крок групи: перший — до Б, решта — за попереднім
      const group = alive();
      let moved = false;
      group.forEach((h, k) => {
        const goal = k === 0 ? (p => P.zones[p.r][p.c] === "Б") : (p => cd(p, group[k - 1].pos) <= 1);
        if (goal(h.pos)) return;
        // найкоротший шлях без огляду на своїх; на дорозі той, хто йде позаду, — міняються місцями (вузькі проходи);
        // той, хто попереду, — обхід
        let nx = nextStep(h.pos, goal, new Set());
        const other = nx && group.find(x => x !== h && x.pos.r === nx.r && x.pos.c === nx.c);
        if (other && group.indexOf(other) > k) other.pos = { ...h.pos };
        else if (other) nx = nextStep(h.pos, goal, new Set(group.filter(x => x !== h).map(x => key(x.pos.r, x.pos.c))));
        if (nx) { h.pos = nx; moved = true; }
      });
      frame();
      stuck = moved ? 0 : stuck + 1;
      if (stuck > 20) { reason = "stuck"; break; }
    }
    if (!reason) reason = "ticks";
    return { win, hel, reason, parts, defeated, battles: battleNo, ticks,
      heroes: H.map(h => ({ hp: h.hp, mp: h.mp, dead: h.dead, pos: { ...h.pos } })) };
  }

  Object.assign(RPG, { MAZE_ROWS: ROWS, MAZE_COLS: COLS, MAZE_ZONES, parseMaze, checkMaze, mazePath, mazeRoute, mazeText, mazeObstacles, makeMaze, simulateMaze, MAZE_WALK_STEPS: WALK_STEPS, MAZE_POWER, mazePower });
})(window.RPG);

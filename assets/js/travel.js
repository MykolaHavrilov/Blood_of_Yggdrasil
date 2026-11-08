// ============================================================
// travel.js — ПЕРЕМІЩЕННЯ ПО МАПІ З ЧАСОМ
//
// Світ поділено на регіони (data/routes.js → MAP_REGIONS):
//   start — стартова мапа («Гардарика»); Дубова Застава на ній — точка south_gate
//           («Південний район»): дійшовши туди, герой опиняється в Дубовій Заставі, у Південному районі;
//   city  — Дубова Застава: 5 районів, герой ходить між ними;
//   dark  — Темний ліс (за Центральною брамою, через капітана варти).
//   alf   — Альвгейм (світ 3), за коренем Іггдрасиля в Серці Темного лісу.
// Між регіонами переходять лише через брами (миттєво): south_gate ↔ Дубова Застава, Північний район ↔ dark_gate,
// Серце Темного лісу (dk_heart) ↔ Корінь Іггдрасиля в Альвгеймі (alf_gate).
//
// ДАЛЕКА ДОРОГА (planTrip): з мапи можна вирушити одразу в місце іншого відкритого світу (вкладки світів над мапою
// або точка на мапі дев'яти світів). Маршрут складається одразу з відрізків — по одному на кожен регіон дорогою,
// брами між ними герой проходить сам. Час = сума звичайних переходів (брами — миттєво, як і пішки).
// Поточний відрізок лежить у save.travel як звичайна дорога, решта — у save.travel.legs (з готовими start/end),
// кінцева точка — save.travel.dest = { region, spot }. finishTravel переводить героя на наступний відрізок.
//
// У межах регіону герой іде дорогами (ROUTES): клітинки маршруту × TRAVEL_SEC_PER_CELL секунд;
// у Дубовій Заставі будь-який перехід між районами триває CITY_TRAVEL_SEC (3 с).
// Переміщення не скасовується. Поки воно триває, доступні лише «Персонаж», «Інвентар» і «Мапа».
// Стан у сейві: save.travel = { region, from, to, cells, pts, start, end, legs?, dest? }.
//
// Підключається ПІСЛЯ data/routes.js, character.js і quests.js.
// ============================================================

(function (RPG) {
  const TRAVEL_PAGES = ["character", "inventory", "maps"];   // що можна відкривати в дорозі
  const CITY_TRAVEL_SEC = 3;                                  // у Дубовій Заставі будь-який перехід між районами — 3 с

  function regionOf(locId) {
    return RPG.LOCATIONS[locId]?.region || "start";
  }

  // Де зараз герой: { region, spot } (у Дубовій Заставі spot — район)
  function whereIs(save) {
    const map = save.location.map;
    const region = regionOf(map);
    if (region === "city") return { region, spot: save.location.district || "south" };
    return { region, spot: map };
  }

  function route(region, from, to) {
    const R = RPG.ROUTES[region] || {};
    const direct = R[`${from}>${to}`];
    if (direct) return { cells: direct.cells, pts: direct.pts };
    const back = R[`${to}>${from}`];
    if (back) return { cells: back.cells, pts: back.pts.slice().reverse() };
    return null;
  }

  // save — щоб врахувати Сферу Богів (data/items.js → orb_gods: будь-який перехід за gods.travelSec секунд)
  function travelSeconds(cells, region, save = null) {
    const orb = save && RPG.godsOrb ? RPG.godsOrb(save) : null;
    if (orb?.travelSec) return orb.travelSec;
    if (region === "city") return CITY_TRAVEL_SEC;
    return cells * RPG.TRAVEL_SEC_PER_CELL;
  }

  // Чи можна йти в точку регіону: { ok, reason }
  function canGo(save, region, to) {
    if (region === "city") {
      const d = (RPG.LOCATIONS.city.districts || []).find(x => x.id === to);
      if (!d) return { ok: false, reason: "Такого району немає." };
      if (!RPG.isDistrictOpen(save, d)) return { ok: false, reason: RPG.districtLockText(d) };
      return { ok: true };
    }
    if (to === "south_gate") return { ok: true };
    return RPG.canEnterLocation(to, save.character.level, save);
  }

  // ---------- Далека дорога між світами ----------
  // Регіони підряд (як вони з'єднані) і брами між сусідніми: [точка виходу з першого, точка входу в другий]
  const REGION_CHAIN = ["start", "city", "dark", "alf"];
  const GATES = { "start>city": ["south_gate", "south"], "city>dark": ["north", "dark_gate"], "dark>alf": ["dk_heart", "alf_gate"] };
  function gateBetween(a, b) {
    if (GATES[`${a}>${b}`]) return GATES[`${a}>${b}`];
    const g = GATES[`${b}>${a}`];
    return g ? [g[1], g[0]] : null;
  }
  const regionName = r => RPG.MAP_REGIONS[r]?.name || r;
  function spotName(region, id) {
    if (region === "city") return (RPG.LOCATIONS.city.districts || []).find(d => d.id === id)?.name || id;
    return RPG.LOCATIONS[id]?.name || id;
  }
  // Чи відкритий регіон (вкладка світу на мапі): Гардарика й Застава — завжди, Темний ліс — коли відчинено браму,
  // Альвгейм — після першої перемоги над Володарем
  function isRegionOpen(save, region) {
    if (region === "start" || region === "city") return true;
    if (region === "dark") return !!RPG.isGateOpen?.(save);
    if (region === "alf") return RPG.canEnterLocation("alf_gate", save.character.level, save).ok;
    return false;
  }
  // Брама між регіонами: чи пропустять
  function crossCheck(save, a, b) {
    if (b === "dark" && a === "city" && !RPG.isGateOpen?.(save)) return { ok: false, reason: "Центральна брама зачинена — спершу поговоріть з капітаном варти (Дубова Застава, Північний район)." };
    if (b === "alf" && !isRegionOpen(save, "alf")) return { ok: false, reason: "Шлях в Альвгейм відкриється після першої перемоги над Володарем Темного лісу (корінь Іггдрасиля в Серці Темного лісу)." };
    return { ok: true };
  }

  // Маршрут до точки to регіону toRegion (може бути інший світ): { ok, legs: [{ region, from, to, cells, pts, sec }], seconds } або { ok: false, reason }
  function planTrip(save, toRegion, to) {
    const here = whereIs(save);
    let r = here.region, cur = here.spot;
    let i = REGION_CHAIN.indexOf(r);
    const j = REGION_CHAIN.indexOf(toRegion);
    if (i < 0 || j < 0) return { ok: false, reason: "Туди немає дороги." };
    if (!RPG.MAP_REGIONS[toRegion]?.spots?.[to]) return { ok: false, reason: "Туди немає дороги." };
    const legs = [];
    const leg = (reg, from, dest) => {
      if (from === dest) return { ok: true };
      const can = canGo(save, reg, dest);
      if (!can.ok) return can;
      const rt = route(reg, from, dest);
      if (!rt) return { ok: false, reason: "Туди немає дороги." };
      legs.push({ region: reg, from, to: dest, cells: rt.cells, pts: rt.pts, sec: travelSeconds(rt.cells, reg, save) });
      return { ok: true };
    };
    const step = j > i ? 1 : -1;
    while (r !== toRegion) {
      const nr = REGION_CHAIN[i + step];
      const [exit, entry] = gateBetween(r, nr);
      let c = leg(r, cur, exit);
      if (!c.ok) return c;
      c = crossCheck(save, r, nr);
      if (!c.ok) return c;
      c = canGo(save, nr, entry);                  // де герой опиниться за брамою
      if (!c.ok) return c;
      r = nr; cur = entry; i += step;
    }
    const c = leg(r, cur, to);
    if (!c.ok) return c;
    if (!legs.length) return { ok: false, reason: "Ви вже тут." };
    return { ok: true, legs, seconds: legs.reduce((a, l) => a + l.sec, 0) };
  }

  // Поставити героя в точку регіону (прохід крізь браму)
  function placeAt(save, region, spot) {
    if (region === "city") { save.location.map = "city"; save.location.district = spot; }
    else save.location.map = spot;
  }

  // toRegion — регіон точки to (інший світ → далека дорога); без нього — точка поточного регіону
  function startTravel(save, to, now = Date.now(), toRegion = null) {
    if (isTraveling(save, now)) return { ok: false, reason: "Ви вже в дорозі — переміщення не скасувати." };
    if (RPG.expeditionActive?.(save)) return { ok: false, reason: "Поки експедиція в дорозі, переходити між локаціями не можна." };
    const { region, spot } = whereIs(save);
    if (toRegion && toRegion !== region) {
      const p = planTrip(save, toRegion, to);
      if (!p.ok) return p;
      let t = now;
      const legs = p.legs.map(l => { const start = t; t += l.sec * 1000; return { region: l.region, from: l.from, to: l.to, cells: l.cells, pts: l.pts, start, end: t }; });
      const last = legs[legs.length - 1];
      placeAt(save, legs[0].region, legs[0].from);   // брама одразу на виході (напр. із Застави — у Гардарику)
      save.travel = Object.assign({}, legs[0], { legs: legs.slice(1), dest: { region: last.region, spot: last.to } });
      return { ok: true, seconds: (t - now) / 1000, legs: legs.length };
    }
    if (spot === to) return { ok: false, reason: "Ви вже тут." };
    const can = canGo(save, region, to);
    if (!can.ok) return can;
    const r = route(region, spot, to);
    if (!r) return { ok: false, reason: "Туди немає дороги." };
    const ms = travelSeconds(r.cells, region, save) * 1000;
    save.travel = { region, from: spot, to, cells: r.cells, pts: r.pts, start: now, end: now + ms };
    return { ok: true, cells: r.cells, seconds: ms / 1000 };
  }

  // Кінець усієї дороги (з усіма відрізками далекої дороги)
  function tripEnd(t) {
    return t.legs?.length ? t.legs[t.legs.length - 1].end : t.end;
  }

  function isTraveling(save, now = Date.now()) {
    return !!save.travel && now < tripEnd(save.travel);
  }

  // Точка на маршруті за часткою пройденого шляху (0…1)
  function pointAt(pts, t, aspect = 0.625) {
    if (pts.length < 2) return { x: pts[0][0], y: pts[0][1] };
    const seg = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const L = Math.hypot(pts[i][0] - pts[i - 1][0], (pts[i][1] - pts[i - 1][1]) * aspect);   // висота/ширина мапи
      seg.push(L); total += L;
    }
    let left = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < seg.length; i++) {
      if (left <= seg[i] || i === seg.length - 1) {
        const k = seg[i] ? Math.min(1, left / seg[i]) : 1;
        return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k };
      }
      left -= seg[i];
    }
    const p = pts[pts.length - 1];
    return { x: p[0], y: p[1] };
  }

  function aspectOf(region) {
    const R = RPG.MAP_REGIONS[region];
    return R ? R.h / R.w : 0.625;
  }

  // Стан дороги: null або { …travel, leftMs, progress, pos }
  function travelState(save, now = Date.now()) {
    const t = save.travel;
    if (!t) return null;
    const dur = Math.max(1, t.end - t.start);
    const progress = Math.min(1, (now - t.start) / dur);
    const dest = t.dest || { region: t.region, spot: t.to };
    return Object.assign({}, t, { leftMs: Math.max(0, t.end - now), progress, pos: pointAt(t.pts, progress, aspectOf(t.region)),
      totalLeftMs: Math.max(0, tripEnd(t) - now), dest, destName: spotName(dest.region, dest.spot), next: t.legs?.[0] || null });
  }

  // Якщо дорога скінчилась — герой на місці. Повертає { arrived, locId, district } або null.
  // Далека дорога: скінчився відрізок — герой проходить браму й іде далі ({ arrived: false, leg: true, region })
  function finishTravel(save, now = Date.now()) {
    let t = save.travel;
    if (!t || now < t.end) return null;
    let moved = false;
    while (t.legs?.length && now >= t.end) {
      const [next, ...rest] = t.legs;
      placeAt(save, next.region, next.from);
      save.travel = t = Object.assign({}, next, { legs: rest, dest: t.dest });
      moved = true;
    }
    if (now < t.end) return moved ? { arrived: false, leg: true, region: t.region } : null;
    delete save.travel;
    delete save.formationAt;              // нове прибуття — розстановку героїв обирають знову (game.js)
    if (t.region === "city") {
      save.location.map = "city";
      save.location.district = t.to;
    } else if (t.to === "south_gate") {
      save.location.map = "city";           // Дубова Застава на стартовій мапі — одразу в Південний район
      save.location.district = "south";
    } else {
      save.location.map = t.to;
    }
    return { arrived: true, locId: save.location.map, district: save.location.district };
  }

  // Переходи крізь брами (миттєві)
  function enterCity(save, district = "south") {
    delete save.travel;
    save.location.map = "city";
    save.location.district = district;
  }
  function leaveCityToStart(save) {
    delete save.travel;
    save.location.map = "south_gate";
  }

  function fmtLeft(ms) {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  Object.assign(RPG, {
    TRAVEL_PAGES, CITY_TRAVEL_SEC, regionOf, whereIs, route, travelSeconds, canGo, startTravel, isTraveling,
    travelState, finishTravel, enterCity, leaveCityToStart, fmtLeft,
    REGION_CHAIN, isRegionOpen, planTrip, spotName, regionName
  });
})(window.RPG);

// ============================================================
// party.js — ГРУПА ГЕРОЇВ
//
// Перший (головний) герой — save.character / save.equipment / save.battleQueue.
// Напарники — save.party: [{ id, character, equipment, battleQueue }], до 5 штук
// (разом з головним — до 6). Інвентар, скриня, золото, локація — СПІЛЬНІ.
//
// memberSave(save, i) повертає «вигляд» сейву для i-го героя (0 — головний):
//   у нього свої character / equipment / battleQueue, а все інше (inventory,
//   chest, location, quests…) береться зі спільного save. Тож будь-які функції,
//   що працюють з одним героєм (calcStats, equipItem, addExp…), працюють і
//   для напарника. Зберігати завжди треба СПІЛЬНИЙ save: RPG.saveGame(save).
//
// Найм — на Дошці оголошень біля Мерії (Центральний район Дубової Застави), який
// відкривається після особливого завдання «Час дослідити» (quests.js).
// Внесок у Мерію за кожного нового напарника — HIRE_COSTS (ціна Селянина); герой з професією — дорожчий (hireCost).
// Оголошення оновлюються раз на BOARD_HOURS годин (о 0:00, 6:00, 12:00, 18:00 за місцевим часом):
//   • поки в головного героя немає професії — лише Селяни 1–5 рівня;
//   • коли професія вже є — один Селянин 1–5 рівня і BOARD_SIZE−1 героїв з професією:
//     один — рівня головного героя або трохи нижче (до BOARD_NEAR рівнів), решта — від 1 до рівня головного героя.
// Герой з професією приходить так, ніби сам пройшов «Шлях професії»: Селянин 15 рівня з вкладеними
// очками під умови професії (classes.js → requires.attrs), далі — рівні професії; решта очок — вільні.
//
// Підключається ПІСЛЯ character.js і ДО battle.js.
// ============================================================

(function (RPG) {
  const MAX_PARTY = 6;
  // Внесок у Мерію: 2-й герой групи, 3-й, 4-й, 5-й, 6-й (перший — безкоштовно). Це ціна Селянина.
  const HIRE_COSTS = [1000, 3000, 5000, 8000, 12000];
  // Герой з професією дорожчий: + HIRE_PROF_FEE за професію і + HIRE_LEVEL_FEE за кожен рівень понад HIRE_FREE_LEVELS
  const HIRE_PROF_FEE = 3000;
  const HIRE_LEVEL_FEE = 500;
  const HIRE_FREE_LEVELS = 5;
  const BOARD_SIZE = 3;      // скільки оголошень висить на дошці
  const BOARD_HOURS = 6;     // як часто оновлюються оголошення
  const BOARD_NEAR = 3;      // «трохи нижче» за рівень головного героя
  const RECRUIT_PEASANT_MAX = 5; // Селяни на дошці — 1–5 рівня
  // Спорядження найманця: випадкові речі свого рівня, однієї рідкості; чим рідкісніші — тим менше (разом зі зброєю)
  const RECRUIT_GEAR = { common: 8, magic: 6, epic: 4 };
  const RECRUIT_GEAR_WEIGHTS = { common: 60, magic: 30, epic: 10 };
  const GEAR_NAMES = { common: ["звичайна річ", "звичайні речі", "звичайних речей"], magic: ["магічна річ", "магічні речі", "магічних речей"], epic: ["епічна річ", "епічні речі", "епічних речей"] };
  const HIRE_MIN_LEVEL = 10; // рівень головного героя для найму
  // Бонус досвіду групи: +PARTY_EXP_BONUS% за кожного героя понад першого — у боях (page-game.js) і за завдання (quests.js → expBonusParts)
  const PARTY_EXP_BONUS = 25;

  const NAMES = [
    "Остап", "Марко", "Богдан", "Тарас", "Ярема", "Данило", "Іван", "Северин", "Орест", "Захар",
    "Олена", "Мирослава", "Дарина", "Соломія", "Ярина", "Оксана", "Христина", "Леся", "Устина", "Злата"
  ];

  function partyState(save) {
    save.party ??= [];
    return save.party;
  }

  function partySize(save) {
    return 1 + partyState(save).length;
  }

  // «Вигляд» сейву для героя групи (0 — головний)
  function memberSave(save, index) {
    if (!index) return save;
    const m = partyState(save)[index - 1];
    if (!m) return save;
    const view = Object.create(save);
    view.character = m.character;
    view.equipment = m.equipment;
    view.battleQueue = m.battleQueue;
    view.memberIndex = index;
    // Золото спільне: у напарника воно береться з головного героя (у сейв не пишеться)
    Object.defineProperty(m.character, "gold", {
      configurable: true, enumerable: false,
      get() { return save.character.gold; },
      set(v) { save.character.gold = v; }
    });
    return view;
  }

  // Усі герої групи як «вигляди»: [головний, напарник 1, …]
  function partyMembers(save) {
    return [save, ...partyState(save).map((_, i) => memberSave(save, i + 1))];
  }

  function isDead(ms) {
    return !!ms.character.dead || ms.character.hp <= 0;
  }

  // Живі герої, що зараз удома (герої в експедиції — expedition.js → isAway — не б'ються тут)
  function aliveMembers(save) {
    return partyMembers(save).filter(ms => !isDead(ms) && !RPG.isAway?.(ms));
  }

  // Відновлення HP/MP з часом — для кожного героя групи
  function applyRegenAll(save) {
    let changed = false;
    for (const ms of partyMembers(save)) {
      if (RPG.isAway?.(ms)) continue;         // героїв в експедиції відновлює сама експедиція (expedition.js)
      changed = RPG.applyRegen(ms) || changed;
    }
    return changed;
  }

  // ---------- Дошка оголошень ----------
  function nextHireCost(save) {
    const n = partyState(save).length;
    return n < HIRE_COSTS.length ? HIRE_COSTS[n] : null;
  }

  function takenNames(save) {
    return new Set(partyMembers(save).map(ms => ms.character.name));
  }

  // Номер шестигодинного проміжку за місцевим часом (0:00–6:00, 6:00–12:00, …)
  const BOARD_MS = BOARD_HOURS * 3600 * 1000;
  function boardSlot(now = Date.now()) {
    return Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / BOARD_MS);
  }
  // Коли з'являться нові оголошення (мітка часу)
  function boardNextAt(now = Date.now()) {
    const off = new Date(now).getTimezoneOffset() * 60000;
    return (boardSlot(now) + 1) * BOARD_MS + off;
  }
  const hasProfession = save => save.character.classId !== RPG.DEFAULT_CLASS;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  function rollGearRarity() {
    const total = Object.values(RECRUIT_GEAR_WEIGHTS).reduce((a, b) => a + b, 0);
    let x = Math.random() * total;
    for (const [r, w] of Object.entries(RECRUIT_GEAR_WEIGHTS)) { x -= w; if (x <= 0) return r; }
    return "common";
  }
  // «8 звичайних речей»
  function gearText(r) {
    const n = RECRUIT_GEAR[r] || 0, f = GEAR_NAMES[r] || GEAR_NAMES.common;
    const k = n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
    return `${n} ${f[k]}`;
  }

  // Найкраща доступна річ для слота (найвищий levelReq, не вище рівня героя); filter — додаткова умова
  const GEAR_SLOT = { ring1: "ring", ring2: "ring", earring1: "earring", earring2: "earring" };
  function gearCandidates(level, slot, filter = () => true) {
    const want = GEAR_SLOT[slot] || slot;
    const list = Object.entries(RPG.ITEMS).filter(([id, it]) => it.slot === want && RPG.hasRarity(id) && !id.startsWith("slime_") && !it.profSet &&
      (it.levelReq || 1) <= level && filter(it, id));
    const top = Math.max(0, ...list.map(([, it]) => it.levelReq || 1));
    return list.filter(([, it]) => (it.levelReq || 1) === top).map(([id]) => id);
  }
  const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];

  // Вдягнути найманця: зброя своєї професії + (n − 1) випадкових інших слотів, усе рідкості r і свого рівня
  function equipRecruit(fresh, r) {
    const ch = fresh.character, lvl = ch.level, cls = RPG.getClass(ch.classId);
    fresh.equipment = {};
    const weapons = cls.weapons || Object.keys(RPG.WEAPON_TYPES);
    const wt = pickOne(weapons);
    const wid = pickOne(gearCandidates(lvl, "mainHand", it => it.weaponType === wt));
    if (wid) {
      // досвідчений найманець володіє своєю зброєю настільки, щоб тримати річ свого виду
      const need = RPG.TIER_MASTERY?.[RPG.ITEMS[wid].tier] || 0;
      ch.mastery ??= {};
      if ((ch.mastery[wt] || 0) < need) ch.mastery[wt] = Math.min(need, RPG.masteryCap ? RPG.masteryCap(fresh) : need);
      if (RPG.canEquip(fresh, wid).ok) fresh.equipment.mainHand = RPG.makeItem(wid, r);
    }
    const slots = ["offHand", "head", "chest", "legs", "hands", "feet", "ring1", "ring2", "amulet", "earring1", "earring2"]
      .sort(() => Math.random() - 0.5);
    let left = (RECRUIT_GEAR[r] || 8) - (fresh.equipment.mainHand ? 1 : 0);
    for (const slot of slots) {
      if (left <= 0) break;
      const ids = gearCandidates(lvl, slot, (it, id) => RPG.canEquip(fresh, id).ok &&
        (slot !== "offHand" || !it.weaponType));                   // друга сокира — ні
      const id = pickOne(ids);
      if (!id) continue;
      fresh.equipment[slot] = RPG.makeItem(id, r);
      left--;
    }
    return fresh.equipment;
  }

  // Нові оголошення: [{ name, gender, classId, level, gear }]
  function rollBoard(save) {
    const taken = takenNames(save);
    const names = NAMES.filter(n => !taken.has(n));
    const pickName = () => names.splice(Math.floor(Math.random() * names.length), 1)[0];
    const main = save.character.level;
    const profs = Object.keys(RPG.CLASSES).filter(id => RPG.CLASSES[id].requires?.quest === "profession");
    const cards = [];
    for (let i = 0; i < BOARD_SIZE && names.length; i++) {
      const name = pickName();
      const card = { name, gender: RPG.FEMALE_NAMES.has(name) ? "f" : "m", classId: RPG.DEFAULT_CLASS, level: rnd(1, RECRUIT_PEASANT_MAX), gear: rollGearRarity() };
      if (hasProfession(save) && i > 0) {
        card.classId = profs[Math.floor(Math.random() * profs.length)];
        card.level = i === 1 ? rnd(Math.max(1, main - BOARD_NEAR), main) : rnd(1, main);
      }
      cards.push(card);
    }
    return cards;
  }

  // Поточні оголошення (самі оновлюються раз на BOARD_HOURS годин і коли головний герой отримує професію)
  function boardState(save) {
    save.story ??= {};
    const slot = boardSlot(), prof = hasProfession(save);
    let b = save.story.board;
    if (!b || Array.isArray(b) || b.slot !== slot || b.prof !== prof) {
      b = save.story.board = { slot, prof, cards: rollBoard(save) };
    }
    for (const c of b.cards) c.gear ??= rollGearRarity();          // старі оголошення — без рідкості спорядження
    const taken = takenNames(save);
    const top = save.character.level;
    return b.cards.filter(c => !c.hired && !taken.has(c.name))
      .map(c => Object.assign({}, c, { level: c.classId === RPG.DEFAULT_CLASS ? c.level : Math.min(c.level, top) }));
  }

  // Готовий напарник з оголошення: Селянин свого рівня або герой з професією
  function makeRecruit(save, card) {
    const fresh = RPG.createNewSave(card.name, RPG.DEFAULT_CLASS, card.gender);
    fresh.bossKills = Object.assign({}, save.bossKills);          // та сама межа рівня, що й у групи
    const table = cls => RPG.getClass(cls).levelTable;
    if (card.classId === RPG.DEFAULT_CLASS) {
      RPG.addExp(fresh, RPG.expForLevel(table(RPG.DEFAULT_CLASS), card.level));
    } else {
      const ch = fresh.character;
      RPG.addExp(fresh, RPG.expForLevel(table(RPG.DEFAULT_CLASS), RPG.PROFESSION_LEVEL));
      for (const [k, v] of Object.entries(RPG.CLASSES[card.classId].requires?.attrs || {})) {
        const put = Math.min(v, ch.freePoints || 0);
        ch.attrs[k] = (ch.attrs[k] || 0) + put;
        ch.freePoints -= put;
      }
      RPG.changeClass(fresh, card.classId, { force: true });
      if (card.level > 1) RPG.addExp(fresh, RPG.expForLevel(table(card.classId), card.level));
    }
    equipRecruit(fresh, card.gear || rollGearRarity());            // випадкові речі свого рівня (стартові лляні — геть)
    RPG.fullHeal(fresh);
    delete fresh.character.gold;                                     // золото в групі спільне
    fresh.character.regenAt = Date.now();
    return fresh;
  }

  // Внесок за конкретне оголошення: { total, base, prof, levels, perLevel }
  function hireCost(save, card) {
    const base = nextHireCost(save);
    if (base == null) return null;
    const isProf = !!card && card.classId !== RPG.DEFAULT_CLASS;
    const levels = isProf ? Math.max(0, card.level - HIRE_FREE_LEVELS) : 0;
    const prof = isProf ? HIRE_PROF_FEE : 0;
    return { total: base + prof + levels * HIRE_LEVEL_FEE, base, prof, levels, perLevel: HIRE_LEVEL_FEE };
  }

  // Чи можна зараз наймати: { ok, reason } (card — оголошення; без нього — ціна Селянина)
  function canHire(save, card = null) {
    if (!RPG.isHiringOpen(save)) return { ok: false, reason: `Дошка оголошень відкривається після особливого завдання «${RPG.EXPLORE.name}» (Артеміда, Гільдія авантюристів).` };
    if (save.character.level < HIRE_MIN_LEVEL) return { ok: false, reason: `Наймати можна з ${HIRE_MIN_LEVEL} рівня головного героя.` };
    if (partySize(save) >= MAX_PARTY) return { ok: false, reason: `У групі вже ${MAX_PARTY} героїв — це максимум.` };
    const cost = hireCost(save, card).total;
    if (save.character.gold < cost) return { ok: false, gold: true, reason: `Внесок у Мерію: ${cost} золота (у вас ${save.character.gold}).` };
    return { ok: true, cost };
  }

  // Найняти напарника з дошки (name — ім'я з оголошення)
  function hireMember(save, name) {
    const card = boardState(save).find(c => c.name === name);
    if (!card) return { ok: false, reason: "Цього оголошення вже немає." };
    const can = canHire(save, card);
    if (!can.ok) return can;
    const fresh = makeRecruit(save, card);
    const member = {
      id: "m" + Date.now().toString(36) + Math.floor(Math.random() * 1000),
      character: fresh.character,
      equipment: fresh.equipment,
      battleQueue: ["attack"]
    };
    save.character.gold -= can.cost;
    partyState(save).push(member);
    const stored = save.story.board.cards.find(c => c.name === name);
    if (stored) stored.hired = true;                   // до наступного оновлення дошки це оголошення не повернеться
    return { ok: true, member, cost: can.cost, index: save.party.length };
  }

  // Звільнити напарника (його речі — у спільний інвентар; внесок не повертається)
  function dismissMember(save, index) {
    const m = partyState(save)[index - 1];
    if (!m) return { ok: false, reason: "Такого героя в групі немає." };
    if (RPG.isAway?.(memberSave(save, index))) return { ok: false, reason: `${m.character.name} в експедиції — звільнити можна, коли повернеться.` };
    for (const slot in m.equipment) RPG.addRefToList(save.inventory, m.equipment[slot]);
    save.party.splice(index - 1, 1);
    return { ok: true, name: m.character.name };
  }

  Object.assign(RPG, { PARTY_EXP_BONUS,
    RECRUIT_GEAR, gearText, MAX_PARTY, HIRE_COSTS, HIRE_PROF_FEE, HIRE_LEVEL_FEE, HIRE_FREE_LEVELS, HIRE_MIN_LEVEL, BOARD_HOURS, RECRUIT_PEASANT_MAX,
    partyState, partySize, memberSave, partyMembers, aliveMembers, isMemberDead: isDead, applyRegenAll,
    nextHireCost, hireCost, boardState, boardNextAt, canHire, hireMember, dismissMember
  });
})(window.RPG);

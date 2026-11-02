// ============================================================
// РІВНІ ТА ДОСВІД
// Досвід НЕ скидається при новому рівні — він постійно росте.
// Таблиця показує ЗАГАЛЬНУ суму досвіду, з якої починається рівень.
//
// Таблиць може бути кілька: кожна професія (classes.js) вказує свою
// через поле levelTable. Поки є одна — "standard".
// ============================================================

(function (RPG) {
  const LEVEL_TABLES = {
    standard: [
      null,        // індекс 0 не використовується
      0,           // 1  — стартовий рівень
      100,         // 2
      400,         // 3
      1400,        // 4
      4200,        // 5
      10500,       // 6
      26250,       // 7
      65625,       // 8
      131250,      // 9
      262500,      // 10
      525000,      // 11
      1050000,     // 12
      2100000,     // 13
      4200000,     // 14
      6300000,     // 15
      9450000,     // 16
      14175000,    // 17
      21262500,    // 18
      31893750,    // 19
      47840625,    // 20
      53581500,    // 21 — з 21 по 30 кожен поріг ×1,12 від попереднього
      60011280,    // 22
      67212634,    // 23
      75278150,    // 24
      84311528,    // 25
      94428911,    // 26
      105760380,   // 27
      118451626,   // 28
      132665821,   // 29
      148585720,   // 30 — межа для всіх; далі (31–50, кожен поріг ×1,15 від попереднього) — лише героям з професією після першої перемоги над Белі (character.js → levelCap)
      170873578,   // 31
      196504615,   // 32
      225980307,   // 33
      259877353,   // 34
      298858956,   // 35
      343687799,   // 36
      395240969,   // 37
      454527114,   // 38
      522706181,   // 39
      601112108,   // 40
      691278924,   // 41
      794970763,   // 42
      914216377,   // 43
      1051348834,  // 44
      1209051159,  // 45
      1390408833,  // 46
      1598970158,  // 47
      1838815682,  // 48
      2114638034,  // 49
      2431833739   // 50
    ]

    // Приклад окремої таблиці для професій 2-го рангу:
    // advanced: [null, 0, 500, 2000, ...]
  };

  const DEFAULT_TABLE = "standard";

  function getTable(tableId) {
    return LEVEL_TABLES[tableId] || LEVEL_TABLES[DEFAULT_TABLE];
  }

  // Найбільший рівень у таблиці (для standard — 50). Межа, до якої реально росте герой, — character.js → levelCap
  function maxLevel(tableId) {
    return getTable(tableId).length - 1;
  }

  // Загальна сума досвіду, потрібна для рівня level
  function expForLevel(tableId, level) {
    const table = getTable(tableId);
    if (level <= 1) return 0;
    if (level >= table.length) return Infinity;
    return table[level];
  }

  // Максимум досвіду — далі досвід не нараховується
  function maxExp(tableId) {
    const table = getTable(tableId);
    return table[table.length - 1];
  }

  // Який рівень відповідає сумі досвіду exp
  function levelFromExp(tableId, exp) {
    const table = getTable(tableId);
    let level = 1;
    while (level < table.length - 1 && exp >= table[level + 1]) level++;
    return level;
  }

  Object.assign(RPG, { LEVEL_TABLES, DEFAULT_TABLE, getTable, maxLevel, expForLevel, maxExp, levelFromExp });
})(window.RPG);

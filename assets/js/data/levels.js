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
      52624688,    // 21 — з 21 по 30 кожен поріг ×1,10 від попереднього
      57887157,    // 22
      63675873,    // 23
      70043460,    // 24
      77047806,    // 25
      84752587,    // 26
      93227846,    // 27
      102550631,   // 28
      112805694,   // 29
      124086263,   // 30 — межа для всіх; далі (31–50, кожен поріг ×1,05 від попереднього) — лише героям з професією після першої перемоги над Белі (character.js → levelCap)
      130290576,   // 31
      136805105,   // 32
      143645360,   // 33
      150827628,   // 34
      158369009,   // 35
      166287459,   // 36
      174601832,   // 37
      183331924,   // 38
      192498520,   // 39
      202123446,   // 40
      212229618,   // 41
      222841099,   // 42
      233983154,   // 43
      245682312,   // 44
      257966428,   // 45
      270864749,   // 46
      284407986,   // 47
      298628385,   // 48
      313559804,   // 49
      329237794    // 50
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

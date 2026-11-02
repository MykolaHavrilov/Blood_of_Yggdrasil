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
      66976875,    // 21
      93767625,    // 22
      131274675,   // 23
      183784545,   // 24
      257298363,   // 25
      308758036,   // 26
      370509643,   // 27
      444611571,   // 28
      533533886,   // 29
      640240663,   // 30 — межа для всіх; далі (31–50, кожен поріг ×1,05 від попереднього) — лише героям з професією після першої перемоги над Белі (character.js → levelCap)
      672252696,   // 31
      705865331,   // 32
      741158598,   // 33
      778216528,   // 34
      817127354,   // 35
      857983722,   // 36
      900882908,   // 37
      945927053,   // 38
      993223406,   // 39
      1042884576,  // 40
      1095028805,  // 41
      1149780245,  // 42
      1207269257,  // 43
      1267632720,  // 44
      1331014356,  // 45
      1397565074,  // 46
      1467443328,  // 47
      1540815494,  // 48
      1617856269,  // 49
      1698749082   // 50
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

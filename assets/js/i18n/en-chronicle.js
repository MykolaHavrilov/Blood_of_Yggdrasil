// ============================================================
// i18n/en-chronicle.js — англійські записи літопису «Предки Минулих та Майбутніх часів»
// (data/chronicle.js → CHRONICLE.TALES, CHRONICLE.WORDS). Це код, а не фрази: розповіді про битви
// складаються з імен героїв, тож i18n.js при англійській мові просто підміняє ці функції.
// Решту тексту книг (Пролог, глави, книги Сварога, довідник богів) перекладає словник i18n/en.js.
// Підключається після i18n/en.js, перед i18n.js.
// ============================================================

window.RPG = window.RPG || {};
RPG.I18N = RPG.I18N || {};
RPG.I18N.en = RPG.I18N.en || {};
RPG.I18N.en.chronicle = {
  WORDS: {
    and: "and", locale: "en-GB", boss: "boss", quote: s => `"${s}"`,
    legacy: "This victory happened before the book had time to record it, and the page filled in later — from the very echo of the battle. " +
      "It did not keep the names of the heroes, but the seal is broken, and the Tree remembers it.",
    defeated: (names, boss) => `${names} defeated the boss "${boss}".`,
    fell: () => "Fallen",
    fallenLine: (word, names) => `${word} in battle: ${names}. Perun's fire returned the fallen to the Temple — but the blood that was shed remained on these pages.`,
    noFallen: "No one in the party fell in this battle — a rare mercy of the Thunderer.",
    winners: names => `Came out victorious: ${names}.`,
    roster: x => `${x.name} — ${RPG.t(x.cls)}, lvl ${x.level}${x.fallen ? " ✝ fallen" : ""}`
  },
  // h = { names, blow, rounds, many, … }; list(names) — «A, B and C»
  TALES: {
    cave_secret: (h, list) =>
      `Three halls full of slime were left behind when ${h.many ? list(h.names) : h.names[0]} stepped up to the throne of stone and filth. ` +
      "The King Slime rose to meet them — enormous, with dull gold deep in its jelly body — and a wave of poisonous slime covered the dungeon. " +
      `The battle lasted ${h.rounds} round(s). The last blow was struck by ${h.blow} — and the King spread into a puddle that could no longer pull itself together.`,
    web_nest: (h, list) =>
      `The cocoon the size of a house crackled underfoot. ${h.many ? list(h.names) : h.names[0]} fought through the hunters and weavers ` +
      "until the Spider Queen descended from the darkness — many-eyed, with venom dripping from her fangs. The web bound their hands, the venom burned their blood, " +
      `but after ${h.rounds} round(s) ${h.blow} cut through the heart of the nest. The Queen fell, and the threads of web over the forest sagged like dead hair.`,
    dark_throne: (h, list) =>
      `The circle of stones parted, and ${h.many ? list(h.names) : h.names[0]} entered the dead tree, ` +
      "where on a throne of roots the Lord of the Dark Forest waited — Hel's faithful servant, clad in bark and shadow. The leshies and black riders fell first, " +
      `and then the Lord himself rose, and the earth groaned underfoot. The battle lasted ${h.rounds} round(s). ` +
      `The last blow, which threw the Lord from his throne, was struck by ${h.blow}.`,
    alf_moth_nest: (h, list) =>
      `The hollow of the oldest birch glowed from within with silver dust. ${h.many ? list(h.names) : h.names[0]} stepped into the rustle of a thousand wings, ` +
      "and from the depths rose the Mother of Moths — the size of a cart, with wings that shed sleepy dust. Whoever breathed it saw dreams instead of the enemy. " +
      `The battle lasted ${h.rounds} round(s), until ${h.blow} slashed through her wing — and the dust settled on the ground like the first snow.`,
    alf_lake_depths: (h, list) =>
      `White stairs led straight into the water — and the lake parted. ${h.many ? list(h.names) : h.names[0]} went down to the bottom, where among the reflections of a foreign sky sat Näcken with his fiddle. ` +
      "He played — and the water became heavy as lead, and the heroes' reflections rose against them. " +
      `After ${h.rounds} round(s) ${h.blow} cut his song short with the last blow, and the strings of the fiddle snapped one after another.`,
    alf_rot_garden: (h, list) =>
      `The glass greenhouse on the lower terrace smelled of honey and rot. The Blighted Gardener was pruning thorny bushes when ${h.many ? list(h.names) : h.names[0]} came in ` +
      "— and turned around with shears the size of a scythe. Poison flowers spat pollen, roots grabbed at legs. " +
      `This battle lasted ${h.rounds} round(s), until ${h.blow} cut the gardener down — and the flowers around opened white for the first time in a long while.`,
    alf_dawn_spire: (h, list) =>
      "At the top of the highest tower, in a circle of runes, the Archmage of the Ljósálfar waited for the dawn and did not know that his light had long been poisoned. " +
      `Lightning of white fire struck again and again, and ${h.many ? list(h.names) : h.names[0]} barely managed to hide behind the columns. ` +
      `After ${h.rounds} round(s) ${h.blow} broke the circle of runes, and the mage fell to his knees — for the first time in a hundred years he saw the real sun.`,
    alf_freyr_throne: (h, list) =>
      "The doors of Freyr's throne room opened by themselves. The throne stood empty — only in the golden light rose the Shadow of Gullinbursti, Freyr's boar, " +
      "half made of light, half of smoke. Its tusks tore the stone, its bristles showered sparks. " +
      `For ${h.rounds} round(s) ${h.many ? list(h.names) : h.names[0]} held off its blows, until ${h.blow} dispersed the Shadow — ` +
      "and the boar, fading, seemed to bow to the heroes.",
    alf_beli_barrow: (h, list) =>
      "The barrow in the middle of the field split, and out of it came Beli — the giant Freyr once slew with a stag's antler. Hel gave him a second life and a bronze axe. " +
      `Hel's smoke spread across the field, the giant's blows knocked them off their feet, but ${h.many ? list(h.names) : h.names[0]} rose again and again. ` +
      `The battle lasted ${h.rounds} round(s). The last blow was struck by ${h.blow} — and Beli, swaying, fell back into his barrow, never to rise again.`
  }
};

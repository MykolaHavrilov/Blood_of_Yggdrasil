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
      `The battle lasted ${h.rounds} round(s). The last blow was struck by ${h.blow} — and Beli, swaying, fell back into his barrow, never to rise again.`,
    // ---------- Chapter IV. Vanaheim ----------
    van_ghost_ship: (h, list) =>
      `The largest longship in the harbour stood with its sail raised, though there was no wind. ${h.many ? list(h.names) : h.names[0]} stepped onto the deck — ` +
      "and the dead oarsmen raised their heads as one. The Draugr Captain came out from the stern, dragging a rusty anchor chain behind him, and every blow of his rocked the ship like a storm. " +
      `The battle lasted ${h.rounds} round(s). The last blow was struck by ${h.blow} — and the Captain, and his whole crew with him, went down with his ship.`,
    van_volva_hut: (h, list) =>
      `A hut on stilts of whale ribs stood in the middle of the marsh, and its door opened by itself. The Old Völva called ${h.many ? "each of them" : h.names[0]} by name ` +
      `before ${h.many ? list(h.names) : h.names[0]} even crossed the threshold: "I saw you before you were born — and I saw you die here." ` +
      "The bones on her neck clattered, the mist turned into phantoms, and the brew in the cauldron boiled with poison. " +
      `After ${h.rounds} round(s) ${h.blow} overturned the cauldron, and the völva fell silent — for the first time her prophecy did not come true.`,
    van_mead_cellar: (h, list) =>
      "Beneath the roots of the oldest oak in Kvasir's Forest, in a cellar with three cauldrons, the dwarves Fjalar and Galar still guarded the mead brewed from the sage's blood. " +
      "The two fought as one hand: one threw sleepy hops into their eyes, the other struck with a hammer from behind. " +
      (h.many
        ? `${list(h.names)} held out back to back for ${h.rounds} round(s), until ${h.blow} knocked the last of the brothers to the floor. `
        : `${h.names[0]} held out against both for ${h.rounds} round(s) and finally knocked the last of the brothers to the floor. `) +
      "The air above the cauldrons smelled of honey and wisdom — but no one dared to drink.",
    van_pyre_heart: (h, list) =>
      "Deep in the barrow the pyre on which the Aesir burned Gullveig three times was still smouldering. Three times she burned — and three times she rose from the ashes. " +
      `Now she rose a fourth time, in a dress of embers, and the flames obeyed her like hounds obey their mistress. ${h.many ? list(h.names) : h.names[0]} walked through the fire for ${h.rounds} round(s), ` +
      `and the last blow was struck by ${h.blow}. The pyre finally went out — and this time the ashes stayed ashes.`,
    van_inner_shrine: (h, list) =>
      "Behind a curtain of flowers, where no stranger had ever set foot, the High Priestess of the Vanir stood among three altars — and in her eyes lived Hel's cold instead of Freyja. " +
      `Seiðr spells bent the space: ${h.many ? list(h.names) : h.names[0]} saw themselves now on the shore, now at the bottom of the sea, now back in their Homestead. ` +
      `After ${h.rounds} round(s) ${h.blow} tore apart the last spell, and the priestess fell to her knees. The flowers on the altars, long dry, opened again.`,
    van_ran_hall: (h, list) =>
      "At low tide the sea parted, and stairs led down to a hall lit by the gold of the drowned. Among the nets sat Rán — the goddess of the sea whom Hel had made her warden. " +
      `She cast her net, and the water in the hall grew heavy as earth on a grave. ${h.many ? list(h.names) : h.names[0]} tore at its knots for ${h.rounds} round(s). ` +
      `The last blow was struck by ${h.blow} — and the net that held half the sea came apart, and Hel's spell with it.`,
    // ---------- Chapter V. Svartalfheim ----------
    svart_matriarch_cocoon: (h, list) =>
      "The rails broke off above the deepest shaft, and beyond them there was only web — from floor to vault. " +
      `${h.many ? list(h.names) : h.names[0]} hacked through it until, above a heap of empty armour, a cocoon burst and the Cave Spider Matriarch crawled out. ` +
      "She spat poison, sticky web bound their hands, and little spiders poured from under her belly. " +
      `The battle lasted ${h.rounds} round(s). The last blow was struck by ${h.blow} — and the Matriarch fell onto her own cocoons, and for the first time in a hundred years the shafts grew quiet.`,
    svart_andvari_hoard: (h, list) =>
      `Through the wall of water ${h.many ? list(h.names) : h.names[0]} entered a grotto where gold lay knee-deep. ` +
      "Andvari surfaced from the lake as a pike — and came ashore as a dwarf with a ring on his finger. " +
      `"Take even one coin — and it will kill ${h.many ? "you all" : "you"}," he laughed. Golden fetters seized their feet, the curse burned their palms. ` +
      `After ${h.rounds} round(s) ${h.blow} knocked the ring from his hand, and the dwarf vanished again into the black water. The gold stayed where it lay: this time no one took it.`,
    svart_obsidian_spire: (h, list) =>
      `Up the stairs of the obsidian spire, past svartálfar who no longer served their kings, ${h.many ? list(h.names) : h.names[0]} climbed to the very top. ` +
      "The Prince of the Svartálfar stood in violet light with two blades and did not even turn: \"I swore to Hel so that my people would live. Now they live in darkness — but they live.\" " +
      `Black flame licked the walls, shadows became fetters. The battle lasted ${h.rounds} round(s). ` +
      `The last blow was struck by ${h.blow} — and the violet light in the windows of the Black Quarters began to go out, one after another.`,
    svart_stone_hall: (h, list) =>
      `In the Petrified Hall the statues of dwarves stood so close that ${h.many ? list(h.names) : h.names[0]} had to squeeze between them sideways. ` +
      "Alvíss the All-Knowing waited beneath a crack in the vault. \"What is fire called in the tongue of giants? What is the sea called in the tongue of gods?\" he asked, " +
      "and every word of his struck like lightning, while the riddle without an answer bound their tongues. " +
      `The battle lasted ${h.rounds} round(s), until ${h.blow} answered — with a blow, not a word. Alvíss turned to stone again, this time forever.`,
    svart_sealed_forge: (h, list) =>
      "Behind the rune-carved doors breathed a forge that had not gone out since the making of the worlds. Before it stood Hel's Forged Guardian — a giant assembled from the shards of the swords, axes and shields of the fallen. " +
      "When he stepped, the whole hall rang; when he struck with his hammer, anvils cracked. " +
      (h.many
        ? `${list(h.names)} fought for ${h.rounds} round(s), and the last blow was struck by ${h.blow}. `
        : `${h.names[0]} fought for ${h.rounds} round(s), until bringing him down with the last blow. `) +
      "The Guardian crumbled into a heap of scrap — and from behind the forge came the brothers Brokkr and Eitri, squinting at the light of their own fire.",
    svart_rune_well: (h, list) =>
      `The ledge above the abyss came to an end, and ${h.many ? list(h.names) : h.names[0]} descended to the bottom of the Well of Runes, where all the inscriptions met in a single circle. ` +
      "The Keeper of the Runes raised his staff: \"No stranger shall read them.\" The rune of doom blazed, the rune of silence snuffed out spells on their lips. " +
      `After ${h.rounds} round(s) ${h.blow} shattered his staff — and for the first time in a thousand years the Keeper remembered whom he served: the dwarves who wrote these runes. ` +
      "He bowed his head, and the circle of runes shone steadily — for their own people now.",
    svart_clay_heart: (h, list) =>
      "The furnace breathed iron and clay as the overseer dwarves laid into Mökkurkálfi's chest the heart Hel had given — a block of ice from Niflheim. " +
      "The giant rose, and the vault of the forge groaned. Once he had been frightened of Thor. Now there was no fear in him — only cold. " +
      `${h.many ? list(h.names) : h.names[0]} stood against the avalanche of clay for ${h.rounds} round(s), and every step of the giant knocked them off their feet. ` +
      `The last blow was struck by ${h.blow} — the icy heart cracked, and Mökkurkálfi crumbled into the raw clay he had been moulded from.`,
    // ---------- Chapter VI. Jotunheim ----------
    jot_troll_cave: (h, list) =>
      `Beneath the pass the trolls piled the bones of those who never reached Jotunheim — and ${h.many ? list(h.names) : h.names[0]} walked over them as over shingle. ` +
      "In the deepest hall, on a heap of plunder, the Troll Chieftain rose with a club torn out of the ground along with a whole pine. He roared — and an avalanche broke loose from the peak above the cave. " +
      `The battle lasted ${h.rounds} round(s). The last blow was struck by ${h.blow} — and the chieftain collapsed onto his treasures, while the trolls that were left fled into the gorges.`,
    jot_eagle_nest: (h, list) =>
      `On the top of the eagle's crag, in a nest of broken masts and spears, sat a gigantic eagle — and ${h.many ? list(h.names) : h.names[0]} at once recognised Þjazi in him. ` +
      "Once he stole Iðunn and her apples; now Hel had promised him eternal youth even without them. The storm of his wings knocked them down, his talons seized them and carried them over the abyss. " +
      `The battle lasted ${h.rounds} round(s), until ${h.blow} clipped his wing. The eagle fell onto the rock — and rose as a giant again, old and weary, never to fly again.`,
    jot_angrboda_lair: (h, list) =>
      "The iron trees of Járnviðr wove a vault over the lair, and yellow eyes watched from behind every trunk. " +
      `Angrboða, mother of Fenrir, Jörmungandr and Hel herself, came out unarmed: "You are killing my grandchildren. Now I shall watch ${h.many ? "all of you" : "you"} die." ` +
      "Wolves lunged from every side, iron roots wound around their legs. " +
      `The battle lasted ${h.rounds} round(s). The last blow was struck by ${h.blow} — and the giantess sank down among the roots, and her wolves howled the way one howls for a mother.`,
    jot_thrym_hoard: (h, list) =>
      "Beneath the Court of Thrym, eight leagues under the earth, lay an empty treasury — Mjölnir was once hidden here. Þrymr, King of the Thurses, sat at the edge of the empty place with a golden sceptre " +
      "and did not trust guests: the last bride under a wedding veil had turned out to be Thor. " +
      `${h.many ? list(h.names) : h.names[0]} had not said a word before the king threw himself into battle. ` +
      `For ${h.rounds} round(s) the sceptre struck like a hammer, until ${h.blow} knocked it out of the royal hand. Þrymr fell to his knees and laughed: "Fooled again."`,
    jot_stone_heart: (h, list) =>
      "In the middle of the Stone Wasteland lay a giant's head bigger than a house — and suddenly it opened its eyes. Hrungnir, whose heart and head are of stone, rose again, gathering himself out of boulders. " +
      "Thor once shattered him with his hammer; now Thor was not there. " +
      (h.many
        ? `${list(h.names)} struck at stone that made blades bounce off for ${h.rounds} round(s), and every time the giant's flint whetstone struck sparks from their shields. At last ${h.blow} hit the three-cornered heart of stone — `
        : `${h.names[0]} struck at stone that made blades bounce off for ${h.rounds} round(s), and every time the giant's flint whetstone struck sparks from ${h.g1("his", "her")} shield, until at last ${h.g1("he", "she")} hit the three-cornered heart of stone — `) +
      "and Hrungnir crumbled, this time into sand.",
    jot_hall_of_illusions: (h, list) =>
      "Beyond the gate between two stone faces the walls of the hall moved, and the floor was now ice, now sea. Útgarða-Loki laughed from his throne: " +
      "\"Drink from my horn! Outrun my thought! Lift my cat!\" " +
      "The horn drew the sea into itself, the cat turned out to be the Serpent, and every blow struck emptiness. " +
      `For ${h.rounds} round(s) ${h.many ? list(h.names) : h.names[0]} fought what was not there, until ${h.blow} closed ${h.gb("his", "her")} eyes — and struck true at random. ` +
      "The hall fell apart like a dream, and for the first time Útgarða-Loki did not laugh.",
    jot_hymir_cauldron: (h, list) =>
      "In an icy cave above the bay hung a cauldron a mile deep. Hymir, who once went fishing with Thor, had no intention of giving it up a second time. " +
      "He looked — and the pillars of the cave cracked from a single glance. " +
      (h.many
        ? `An icy fist, a blow of the cauldron, frost from the deep — ${list(h.names)} held out for ${h.rounds} round(s). The last blow was struck by ${h.blow} — and the giant fell onto the ice, `
        : `An icy fist, a blow of the cauldron, frost from the deep — ${h.names[0]} withstood it all for ${h.rounds} round(s) and finally brought the giant down onto the ice, `) +
      "and the cauldron, swaying, rang out over all Jotunheim like a bell.",
    jot_serpent_ring: (h, list) =>
      "Where the Serpent bites its own tail, the sea boiled with poison. Jörmungandr raised his head above the waves — scales as large as shields, eyes in which all of Midgard was reflected. " +
      "Hel was calling him ashore, and he was coming. " +
      `${h.many ? list(h.names) : h.names[0]} stood at the edge of the world for ${h.rounds} round(s): the tail smashed the cliffs, the coils squeezed the air, the poison burned their shields. ` +
      `The last blow was struck by ${h.blow} — and the Serpent withdrew into the deep and bit his tail once more. The ring of the world closed. Ragnarök did not come — this time.`,
    // ---------- Chapter VII. Muspelheim ----------
    musp_hound_lair: (h, list) =>
      "The ash underfoot was warm, and red eyes kept peering out from beneath it. " +
      `${h.many ? list(h.names) : h.names[0]} went down into the burrows where the fire hounds rear their pups in the embers — and the pack met ${h.many ? "them" : h.g1("him", "her")} with a flaming howl. ` +
      "The Hound Packleader leapt first, and the whole pack rushed after him like wind after fire. " +
      `The battle lasted ${h.rounds} round(s). The last blow was struck by ${h.blow} — and the packleader fell into the ash, while the pack, whimpering, scattered into the burrows.`,
    musp_serpent_nest: (h, list) =>
      "Where two rivers of lava meet, the whirlpool boiled like a cauldron. The Lava Serpent surged out of it, and fiery drops ran from his scales of cooled magma. " +
      `${h.many ? list(h.names) : h.names[0]} stood on a basalt island that cracked with heat: the river of fire rolled in wave after wave, coils of magma tightened all around. ` +
      `The battle lasted ${h.rounds} round(s), until ${h.blow} split the scales on the serpent's neck. ` +
      "The serpent choked on his own lava and sank, and the rivers that met in the whirlpool flowed calmly for the first time.",
    musp_sons_forge: (h, list) =>
      "The forge at the heart of the smithies blazed so fiercely that metal melted from a mere glance. " +
      `The Master Smith of Muspel did not look up from his anvil when ${h.many ? list(h.names) : h.names[0]} came in — he was forging a blade as long as a ship, the very one with which the world is one day to be burned. ` +
      "\"You are in my way,\" was all he said, and he turned with his hammer. Molten metal splashed like rain, every blow on the anvil knocked them off their feet. " +
      `The battle lasted ${h.rounds} round(s). The last blow was struck by ${h.blow} — and the master fell beside the unfinished sword. The forge went out, and the blade stayed cold.`,
    musp_citadel_vaults: (h, list) =>
      "The vaults beneath the obsidian fortress were a labyrinth, and the Commander knew every corridor of it, and the corridors knew him: doors slammed shut behind them, the floor gave way underfoot. " +
      `${h.many ? list(h.names) : h.names[0]} fought through the guards until, in the last hall, the Commander himself came out to meet ${h.many ? "them" : h.g1("him", "her")} — with a mace and a shield of black glass. ` +
      `"Fire!" he commanded, and the flames obeyed. For ${h.rounds} round(s) the obsidian shield held every blow, until ${h.blow} split it in two. ` +
      "The Commander fell, and the prisoners in the vaults heard their doors open for the first time.",
    musp_sinmara_vault: (h, list) =>
      "Bronze braziers burned around a chest with nine locks, and Sinmara, Surtr's wife, stood before it as before a cradle. Inside lay Lævateinn — and everyone who looked in burned before they could see. " +
      "\"You have come for the key,\" she said. \"Neither gods nor giants have ever had it.\" " +
      "The flame of Lævateinn burst from under the lid, the nine locks clicked shut around their hands. " +
      `The battle lasted ${h.rounds} round(s). The last blow was struck by ${h.blow} — and Sinmara fell onto her chest. The key dropped from her hand, but no one opened the chest: some things are better left unseen.`,
    musp_ymir_abyss: (h, list) =>
      "At the bottom of Ginnungagap fire and ice still fought, as on the first day of the world. Out of the steam between them rose the Echo of Ymir — a faceless giant, burning on one side, rimed with frost on the other. " +
      "It remembered how the gods tore it into earth and sky, and it wanted the world back. " +
      `${h.many ? list(h.names) : h.names[0]} walked through ice and flame for ${h.rounds} round(s), and every step of the first giant shook the abyss. ` +
      `The last blow was struck by ${h.blow} — and the Echo dissolved into steam, and over Ginnungagap fell a silence unheard since the making of the world.`,
    musp_volcano_heart: (h, list) =>
      "Surtr rose from his black throne, and the lava in the crater surged up to his knees. He pulled his sword from the stone — brighter than the sun, hotter than death itself. " +
      "\"Hel promised me the world,\" he said. \"I shall take it without her.\" " +
      `${h.many ? list(h.names) : h.names[0]} stood against the flame of Ragnarök for ${h.rounds} round(s), and the heat melted armour right on their bodies. ` +
      `The last blow was struck by ${h.blow} — and Surtr, who was to burn the nine worlds, fell to his knees. The sword slipped from his hand and plunged into the lava — never having touched Bifrost.`
  }
};

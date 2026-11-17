// ============================================================
// page-game-places.js — Екран локації: брама Темного лісу, Корінь Іггдрасиля, вхід у Заставу, Храм, двір Відреченого, розмови з NPC, Шинок.
// Частина page-game.js: RPG.gameParts.places(G) викликається з pageGame() і повертає те, що потрібне іншим частинам.
// G — спільне екрана локації: save, msg, place, locData і функції з page-game.js та інших частин
// (G.renderAll, G.renderPlace, G.renderShop…); G.fighting — чи показується бій. Спільні помічники — RPG.ui (game-common.js).
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, fmtNum, showMsg, journalReward, showChronicle, showFieldLoot } = RPG.ui;
  RPG.gameParts = RPG.gameParts || {};

  RPG.gameParts.places = function (G) {
    const { save, place, locData, msg } = G;
    // Функції з page-game.js та інших частин — через G (частини підключаються по черзі, тому не напряму)
    const renderAll = (...args) => G.renderAll(...args);
    const renderShop = (...args) => G.renderShop(...args);

    // Темний ліс: зворотний бік Центральної брами
    function renderDarkGate() {
      place.append(noteP(locData.description));
      place.append(noteP("Тут не б'ються. Звідси — дороги до всіх місць Темного лісу (Мапа). Щоб повернутися в Дубову Заставу, гукніть капітана варти."));
      renderNpc(place, "captain");
      const row = el("div", "row");
      row.append(link("Мапа Темного лісу", "maps.html"));
      place.append(row);
    }

    // ---------- Корінь Іггдрасиля: миттєвий перехід між світами (data/enemies.js → LOCATIONS[…].portal) ----------
    // Портал видно, лише якщо в місце призначення вже можна зайти (canEnterLocation): у Серці Темного лісу —
    // після першої перемоги над Володарем, в Альвгеймі — завжди (шлях назад).
    function portalOpen(pt) {
      return !!pt && RPG.canEnterLocation(pt.to, save.character.level, save).ok;
    }
    async function usePortal(pt) {
      if (G.fighting) return;
      if (RPG.isTraveling(save)) { showMsg(msg, "Ви в дорозі — дочекайтеся прибуття.", true); return; }
      if (RPG.activeDungeon(save)) { showMsg(msg, "Спершу пройдіть або покиньте данж.", true); return; }
      const can = RPG.canEnterLocation(pt.to, save.character.level, save);
      if (!can.ok) { showMsg(msg, can.reason, true); return; }
      if (save.fieldLoot) await showFieldLoot(save);         // здобич поля бою — перед переходом
      delete save.travel;
      delete save.formationAt;
      save.location.map = pt.to;
      if (pt.district) save.location.district = pt.district;   // портал у місто — одразу в його район
      await RPG.saveGame(save);
      location.href = "game.html";
    }
    function portalCard(pt) {
      const card = el("div", "panel stack explore-card portal-card");
      card.append(el("h3", null, pt.title), noteP(pt.text));
      const row = el("div", "row");
      row.append(button(pt.button, "wf wf-button", () => usePortal(pt)));
      card.append(row);
      return card;
    }
    // Мирна локація-портал (Корінь Іггдрасиля в Альвгеймі)
    function renderPortalPlace() {
      place.append(noteP(locData.description));
      place.append(noteP("Тут не б'ються. Звідси — стежка до всіх місць світу (Мапа)."));
      if (portalOpen(locData.portal)) place.append(portalCard(locData.portal));
      const row = el("div", "row");
      row.append(link(`Мапа: ${RPG.MAP_REGIONS[locData.region]?.name || "світ"}`, "maps.html"));
      place.append(row);
    }

    // Стартова мапа: Південні ворота Дубової Застави
    function renderCityGate() {
      if (locData.city && locData.city !== "city") {            // брама іншого міста (Свартгард)
        place.append(noteP(locData.description), noteP("Тут не б'ються. За брамою — Свартгард, підземне місто свартальвів і двергів."));
        const row = el("div", "row");
        row.append(button("Увійти у Свартгард", "wf wf-button", async () => {
          RPG.enterCity(save, locData.district, locData.city);
          await RPG.saveGame(save);
          location.reload();
        }), link(`Мапа: ${RPG.MAP_REGIONS[locData.region]?.name || "світ"}`, "maps.html"));
        place.append(row);
        return;
      }
      place.append(noteP("Тут не б'ються. Крізь ворота — Південний район Дубової Застави з Гільдією авантюристів."));
      const row = el("div", "row");
      row.append(button("Увійти в Дубову Заставу", "wf wf-button", async () => {
        RPG.enterCity(save, "south");
        await RPG.saveGame(save);
        location.reload();
      }), link("Мапа", "maps.html"));
      place.append(row);
    }

    function renderTemple() {
      place.append(noteP(
        `Сюди повертаються загиблі. Відроджені мають ${Math.round(RPG.RESPAWN_HP_PCT * 100)}% здоров'я та 0% мани — ` +
        "відновіться зіллям або вирушайте відпочити в Домівку."));
      renderNpc(place, "nun");
      const sh = RPG.shamanState(save).stage;
      if (sh >= 1 && sh <= 4) renderRenouncer(place);
      if (RPG.velesState(save).stage >= 4) renderCourtyard(place);
      renderAltar(place);
      const row = el("div", "row");
      row.append(link("Мапа", "maps.html"));
      place.append(row);
    }

    // --- Вівтар Перуна: сховок для Жарин Небесного горна (character.js → EMBER, altarPut / altarTake / altarBuySlot) ---
    // Показується, щойно герой мав справу з жаринами (є в інвентарі чи на вівтарі, або вже перемагав Темну душу).
    const leftText = ms => {
      const h = Math.max(0, Math.floor(ms / 3600000)), d = Math.floor(h / 24);
      return d ? `${d} д ${h % 24} год` : h ? `${h} год` : `${Math.max(1, Math.ceil(ms / 60000))} хв`;
    };
    function renderAltar(box) {
      RPG.tickEmbers(save);
      const a = RPG.altarOf(save), inv = RPG.countItem(save, RPG.EMBER.id);
      if (!inv && !a.embers.length && !save.darkSouls?.kills) return;
      const card = el("div", "stack explore-card altar-card");
      card.append(el("h3", null, "Вівтар Перуна"));
      card.append(noteP("На вівтарі, у світлі Перунового вогню, Жарини Небесного горна не гаснуть: їхній відлік стоїть, доки ви їх не заберете. " +
        "Забрана жарина згасне через стільки, скільки їй лишалось."));
      card.append(el("p", "altar-count", `На вівтарі: ${a.embers.length}/${a.slots} місць` +
        (a.embers.length ? ` — кожній лишається: ${[...a.embers].sort((x, y) => y - x).map(leftText).join(", ")}` : "") + "."));
      const next = RPG.emberNextOut(save);
      card.append(el("p", "altar-count", inv ? `В інвентарі: ${inv} — найстарша згасне через ${leftText(next)}.` : "В інвентарі жарин немає."));
      const act = async (fn, okText) => {
        const r = fn();
        if (!r.ok) { showMsg(msg, r.reason, true); return; }
        await RPG.saveGame(save);
        showMsg(msg, okText(r));
        renderAll();
      };
      const row = el("div", "row");
      const free = a.slots - a.embers.length;
      const b1 = button("Покласти одну", "wf wf-button", () => act(() => RPG.altarPut(save, 1), () => "Жарина лягла на вівтар — її відлік зупинився."));
      const b2 = button("Покласти всі", "wf wf-button", () => act(() => RPG.altarPut(save, inv), r => `На вівтар покладено жарин: ${r.n}.`));
      b1.disabled = b2.disabled = !inv || free < 1;
      const b3 = button("Забрати одну", "wf wf-secondary", () => act(() => RPG.altarTake(save, 1), () => "Жарину забрано — відлік пішов далі."));
      const b4 = button("Забрати всі", "wf wf-secondary", () => act(() => RPG.altarTake(save, a.embers.length), r => `З вівтаря забрано жарин: ${r.n}.`));
      b3.disabled = b4.disabled = !a.embers.length;
      row.append(b1, b2, b3, b4);
      card.append(row);
      const price = RPG.altarSlotPrice(save);
      if (price != null) {
        const buy = button(`Пожертва Храму: ще одне місце · ${fmtNum(price)} зол.`, "wf wf-link", () =>
          act(() => RPG.altarBuySlot(save), r => `Сестра Ївга дякує за пожертву. Тепер на вівтарі ${r.slots} місць (−${fmtNum(r.price)} золота).`));
        buy.disabled = save.character.gold < price;
        card.append(buy);
      } else card.append(el("p", "altar-count", `На вівтарі вже найбільше місць — ${RPG.EMBER.altarMax}.`));
      box.append(card);
    }

    // --- Внутрішній двір Храму: статуя Велеса й джерело (квест «Долоні Велеса») ---
    let springWaking = false;      // сферу щойно поклали — 5 секунд «нічого не відбувається»
    // --- Відречений у тіні за вівтарем (секретний квест «Шлях відреченого» → Шаман потойбіччя) ---
    function renderRenouncer(box) {
      const S = RPG.SHAMAN;
      const info = RPG.shamanInfo(save);
      const card = el("div", "stack explore-card");
      card.append(RPG.ui.npcHead("npc_renouncer", "Відречений"));
      card.append(el("p", null, "У тіні за вівтарем, де не дістає світло свічок, стоїть чоловік у запиленому плащі. " +
        "Темні візерунки на його шкірі ледь помітно ворушаться, коли він говорить."));
      const act = (label, fn) => card.append(button(label, "wf wf-button", fn));
      const levelTxt = lv => lv?.length ? ` Новий рівень: ${lv[lv.length - 1]}!` : "";
      if (info.stage === 1) {
        card.append(el("p", null, "«Нас було багато — тих, хто відмовився від шляхів, які давали боги. Ми думали, що вільні. " +
          "А потім прийшла Хелла, і мертві встали з могил. Я пішов до коренів, до Велеса, щоб навчитися їх упокоювати. " +
          "Навчився. Але магія мертвих лишає тавро: відтоді мої руки не лікують — лише зв'язують кров'ю і палять зеленим вогнем.»"));
        card.append(el("p", null, "«Візьми мій знак — з ним варта Північної брами пропустить тебе одразу, без доручень капітана. " +
          `А знак — лише початок: ${S.total} доручень у Темному лісі. Упокоїти мертвих, зібрати з них те, що тримає їх по цей бік, ` +
          "принести руди й дерева на обряди. Хто пройде все — того мертві почують, як чують мене.»"));
        act("Прийняти Знак відреченого", async () => {
          const r = RPG.shamanAdvance(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          const next = RPG.shamanInfo(save);
          showMsg(msg, `Відречений торкається вашого чола холодними пальцями — шкірою пробігає дрож. Отримано: Знак відреченого. ` +
            `Доручення 1 з ${S.total}: ${next.def.title} (Темний ліс, за Північною брамою).`);
          renderAll();
        });
      } else if (info.task) {
        card.append(el("p", null, `Доручення ${info.index} з ${info.total}: ${info.def.title}`));
        card.append(el("p", "note", info.def.text));
        card.append(el("div", info.complete ? "rt-magic" : null, `${info.def.label}: ${fmtNum(info.have)} / ${fmtNum(info.need)}`));
        card.append(el("p", "status", "Нагорода: досвід (скільки — дізнаєтесь при здачі)"));
        const b = button(info.task.kind === "kill" ? "Розповісти Відреченому" : "Віддати Відреченому", "wf wf-button", async () => {
          const r = RPG.shamanAdvance(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          const next = RPG.shamanInfo(save);
          const got = r.exp > 0 ? ` Нагорода: ${fmtNum(r.exp)} EXP.${levelTxt(r.levelUps)}` : "";
          showMsg(msg, r.stage === 4
            ? `«Тепер ти знаєш ціну. Коли будеш готовий — приходь до обряду. Назад дороги не буде.»${got}`
            : `Відречений повільно киває. «Ти чув, як вони видихають, коли відпускаєш? Це і є наша робота.»${got} ` +
              `Доручення ${next.index} з ${next.total}: ${next.def.title}.`);
          renderAll();
        });
        b.disabled = !info.complete;
        card.append(b);
      } else if (info.stage === 4) {
        card.append(el("p", null, "«Тавро мертвих не змити. Ти більше ніколи не зможеш лікувати — ні себе, ні інших. Зате мертві " +
          "слухатимуть тебе: кров зв'язуватиме ворогів, зелене полум'я роз'їдатиме їхній захист, прощені предки відводитимуть чужі " +
          "закляття, а кожна твоя рана робитиме тебе міцнішим.»"));
        const c = RPG.getClass(S.classId);
        const p = el("p", null);
        p.append(el("strong", null, c.name), RPG.roleTags(S.classId), " — меч і сфера або малий кинджал. Атака й Сила магії — від Інтелекту (і трохи від Спритності).");
        card.append(p);
        act("Прийняти тавро мертвих (назавжди)", async () => {
          if (!confirm(`Стати «${c.name}»? Інші професії стануть недоступні назавжди.`)) return;
          const r = RPG.shamanRite(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Темні візерунки повзуть вашими руками, і на мить ви чуєте сотні голосів — а тоді тиша. ` +
            `Ваша нова професія — ${c.name}! Рівень професії почався з 1, а все, чого навчились Селянином, лишилося. ` +
            "Навички шамана — у Тренера гільдії." +
            (r.change?.removed?.length ? " Річ, якою шаман не користується, знято в інвентар." : ""));
          renderAll();
        });
      }
      box.append(card);
    }

    function renderCourtyard(box) {
      const V = RPG.VELES;
      const st = RPG.velesState(save);
      const card = el("div", "stack explore-card");
      card.append(el("h3", null, "Внутрішній двір Храму"));
      if (springWaking) {
        card.append(el("p", null, "Ви кладете сферу на долоні статуї. Камінь лягає в ромбовидний виступ, мов там і був…"));
        card.append(el("p", "rt-magic", "Нічого не відбувається."));
      } else if (st.stage < 5) {
        card.append(el("p", null, "Посеред двору — висохлий кам'яний фонтан. Над ним — статуя Велеса, що береже мудрість поколінь, " +
          "з глечиком біля ніг. На розкритих долонях статуї — невеликий виступ у формі ромба."));
        const put = button("Покласти сферу на долоні статуї", "wf wf-button", async () => {
          const r = RPG.velesPlaceOrb(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          springWaking = true;
          npcNode.nun = "start"; npcResult.nun = null;     // Ївга мовчить, поки джерело прокидається
          renderAll();
          setTimeout(() => {
            springWaking = false;
            showMsg(msg, "Раптом з глечика біля ніг статуї починає сочитися блакитна вода. Вона тече все швидше, дзюрчить по каменю — " +
              "і висохлий фонтан наповнюється сяйливою блакиттю. Джерело Велеса прокинулося!");
            if (RPG.audio?.jingle) RPG.audio.jingle("levelup");
            renderAll();
          }, V.waitMs);
        });
        put.disabled = RPG.countItem(save, "orb_veles") < 1;
        card.append(put);
      } else {
        card.append(el("p", null, "Над фонтаном височіє статуя Велеса зі сферою на долонях. З глечика біля його ніг тече блакитна вода, " +
          "і чаша фонтана повна до країв. Це чарівне джерело: хто нап'ється — тому кожен бій дає втричі більше досвіду " +
          `(+${V.expBonusPct}% до досвіду групи) протягом ${V.durationMs / 60000} хвилин. Потім вода годину набирає силу знову.`));
        const left = RPG.springLeft(save);
        const wait = RPG.springCooldown(save);
        if (left) card.append(el("p", "rt-magic", `Сила джерела ще з вами — близько ${Math.ceil(left / 60000)} хв. ` +
          `Після цього вода набиратиме силу ще ${RPG.VELES.cooldownMs / 60000} хв.`));
        else if (wait) card.append(el("p", "rt-magic", `Вода в чаші ще не набрала сили — пити знову можна буде за ${Math.ceil(wait / 60000)} хв.`));
        const drink = button("Випити з джерела", "wf wf-button", async () => {
          const r = RPG.drinkSpring(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          journalReward(save, "Джерело Велеса", `Група напилася з чарівного джерела: +${V.expBonusPct}% досвіду за бої на ${r.minutes} хвилин.`);
          await RPG.saveGame(save);
          showMsg(msg, `Вода холодна й солодка, як весняний дощ. Уся група відчуває, як світ стає яснішим: +${V.expBonusPct}% досвіду ` +
            `за бої на ${r.minutes} хвилин.`);
          renderAll();
        });
        drink.disabled = !!wait;
        card.append(drink);
      }
      box.append(card);
    }

    // ---------- Розмови з NPC (data/npcs.js) ----------
    const npcNode = {};      // на якому вузлі розмова з кожним NPC
    const npcResult = {};    // відповідь на останню дію (молитва, оплата…)
    const npcCtx = { member: 0 };

    const NPC_ACTIONS = {
      async pray() {
        const r = RPG.pray(save);
        if (!r.ok) return { text: r.reason, error: true };
        await RPG.saveGame(save);
        return { text: r.revived.length
          ? `Сестра Ївга довго молиться над полеглими. Відроджено: ${r.revived.join(", ")}.`
          : "«У твоїй групі немає полеглих. Хай так буде й надалі.»" };
      },
      async grace() {
        const r = RPG.buyGrace(save);
        if (!r.ok) return { text: `«${r.reason}»`, error: true, to: "grace" };
        await RPG.saveGame(save);
        return { text: `Сестра Ївга читає Молитву благодаті${r.count > 1 ? " над усією групою" : ""}. Пожертва: ${fmtNum(r.cost)} золота. Благодать діятиме 10 хвилин.` };
      },
      async gate_start() {
        const r = RPG.startGate(save);
        if (!r.ok) return { text: `«${r.reason}»`, error: true };
        await RPG.saveGame(save);
        return { text: "Квест «Варта Центральної брами» взято. Прогрес — у журналі квестів на сторінці «Персонаж».", to: "progress" };
      },
      async gate_turn() {
        const r = RPG.turnInGate(save);
        if (!r.ok) return { text: `«${r.reason}»`, error: true, to: "progress" };
        await RPG.saveGame(save);
        if (!r.finished) return { text: "Капітан задоволено киває. «Добре. Тепер — припаси.»", to: "progress" };
        const dot = t => (t.endsWith("!") ? t : t + ".");
        journalReward(save, "Завдання «Варта Центральної брами» виконано", dot(`Нагорода: досвід — ${r.expText}`));
        await RPG.saveGame(save);
        return { text: dot(`Капітан віддає наказ відчинити браму. «Ти з наших. Темний ліс чекає.» Досвід — ${r.expText}`) };
      },
      async gate_go() {
        if (!RPG.isGateOpen(save)) return { text: "«Брама зачинена.»", error: true };
        save.location.map = "dark_gate";               // крізь браму — одразу, без дороги
        await RPG.saveGame(save);
        location.href = "game.html";
        return { text: "Брама відчиняється…" };
      },
      async gate_back() {
        RPG.enterCity(save, "north");
        await RPG.saveGame(save);
        location.href = "game.html";
        return { text: "Варта відчиняє хвіртку в брамі…" };
      },
      // Квест «Долоні Велеса» (quests.js → VELES)
      async veles_ask(npcId) {
        if (!RPG.velesAdvance(save, 1)) return { text: "«Не розумію, про що ти.»", error: true };
        await RPG.saveGame(save);
        return { text: npcId === "steward"
          ? "Захар крутить сферу в пальцях, підносить до вікна й хитає головою. «У наших записах такого нема. Але знаєш що — " +
            "спитай Остапа в шинку біля млина. До нього хто тільки не заходить: путівники, путівниці, купці з усіх земель. " +
            "Хтось та й бачив подібне.»"
          : "Сестра Ївга обережно бере сферу, проводить пальцем по ромбовидному заглибленню й довго мовчить. «Щось знайоме… " +
            "та не пригадаю. Спитай Остапа в шинку біля млина — до нього заходять мандрівники й путівниці з далеких країв. " +
            "Може, хтось із них щось підкаже.»" };
      },
      async veles_ostap() {
        if (!RPG.velesAdvance(save, 2)) return { text: `«Щось я не второпаю, ${RPG.gw(save, "мандрівнику", "мандрівнице")}.»`, error: true };
        await RPG.saveGame(save);
        return { text: "Остап відставляє кухоль і стишує голос. «Ромб, кажеш? Була тут торік одна путівниця з півдня, сива вся, " +
          "хоч і молода на лице. Розповідала, що колись у Храмі Перуна під вівтарем било джерело, і стерегли його Велесові долоні. " +
          "А потім вода пішла, і про те забули. Сходи до сестри Ївги — вона в Храмі найдовше, мо' пригадає.»" };
      },
      // «Ким я можу стати?» — Остап відсилає до Артеміди (save.story.profTree → "ostap"; далі — Гільдія, page-game-guild.js → renderProfTalk)
      async prof_ostap() {
        save.story = save.story || {};
        if (!save.story.profTree) { save.story.profTree = "ostap"; await RPG.saveGame(save); }
        return { text: `Остап усміхається у вуса. «Бачив я на своєму віку чимало таких, як ти. Та ким тобі стати — не шинкареві казати. ` +
          "Іди до Артеміди, адміністраторки Гільдії авантюристів — це в Південному районі Дубової Застави. Скажи, що від Остапа. " +
          "Вона кожному розтлумачить, які є шляхи і чого кожен вимагає.»" };
      },
      async veles_nun() {
        if (!RPG.velesAdvance(save, 3)) return { text: "«Про що ти, дитино?»", error: true };
        await RPG.saveGame(save);
        return { text: "Ївга завмирає, і її очі ширшають. «Велесові долоні… Ну звісно! Як я могла забути. Ходімо.» " +
          "Вона веде вас за вівтар, у внутрішній двір Храму. Посеред двору — висохлий кам'яний фонтан, а над ним статуя Велеса, " +
          "що береже мудрість поколінь, з глечиком біля ніг. Ви придивляєтеся: на його розкритих долонях — невеликий виступ у формі ромба.",
          to: "veles_yard" };
      },
      // Квест «Збір вугілля» (quests.js → COAL)
      async coal_start() {
        const r = RPG.startCoal(save);
        if (!r.ok) return { text: `«${r.reason}»`, error: true };
        await RPG.saveGame(save);
        return { text: "Завдання «Збір вугілля» взято. Прогрес — у журналі квестів на сторінці «Персонаж»." };
      },
      async coal_turn() {
        const r = RPG.turnInCoal(save);
        if (!r.ok) return { text: `«${r.reason}»`, error: true };
        await RPG.saveGame(save);
        return { text: `Вози з вугіллям рушають до складів Мерії. Срібні злитки ×${RPG.COAL.reward.items[0].qty}. ` +
          `Спальний район відкрито. Досвід — ${r.expText}${r.expText.endsWith("!") ? "" : "."}` };
      },
      // Віддати Захару обірваний пергамент — книга відновлюється
      async parchment_give() {
        if (RPG.parchmentState(save) !== "have") return { text: "«У вас нічого такого немає.»", error: true };
        save.story.parchment = "given";
        await RPG.saveGame(save);
        showChronicle(save, "prologue", { restoring: true });
        return { text: "Захар прикладає обгорілий клапоть до місця, де бракує сторінок. Пергамент тепліє, краї зростаються, " +
          "і по них пробігає золоте сяйво. Коли світло згасає, сторінка вже вшита назад — ніби ніколи й не була вирвана. " +
          `«Велес бачить… — шепоче Захар. — Книга знову ціла. Дякую ${RPG.gw(save, "тобі, друже", "тобі, подруго")}».` };
      },
      async chronicle() {
        // герой побачив літопис — його список з'являється в бібліотеці власного дому
        if (RPG.addToLibrary?.(save, "chronicle")) await RPG.saveGame(save);
        showChronicle(save);
        return { text: "Захар обережно розгортає перед вами книгу. Від пергаменту пахне димом і старим дубом." };
      },
      async reset() {
        const ms = RPG.memberSave(save, npcCtx.member);
        const r = RPG.resetAttrs(ms);
        if (!r.ok) return { text: `«${r.reason}»`, error: true, to: "reset" };
        await RPG.saveGame(save);
        return { text: `Захар Вергун переписує записи. ${ms.character.name}: повернуто ${r.points} очок атрибутів, мито — ${fmtNum(r.cost)} золота. ` +
          "Розподілити очки знову можна на сторінці «Персонаж»." };
      }
    };

    function renderNpc(box, npcId) {
      const npc = RPG.NPCS[npcId];
      const node = npc.nodes[npcNode[npcId]] || npc.nodes.start;
      const wrap = el("div", "npc-dialog");
      wrap.append(RPG.ui.npcHead(npc.portrait, npc.name));   // портрет у рамці + табличка з ім'ям (game-common.js)
      const res = npcResult[npcId];
      if (res) wrap.append(el("p", "npc-result" + (res.error ? " is-error" : ""), res.text));
      const text = typeof node.text === "function" ? node.text(save, npcCtx) : node.text;
      wrap.append(el("p", "npc-line", text));
      const replies = el("div", "npc-replies");
      for (const r of node.replies) {
        if (r.show && !r.show(save, npcCtx)) continue;
        const label = typeof r.text === "function" ? r.text(save, npcCtx) : r.text;
        replies.append(button(label, "wf wf-link npc-reply", async () => {   // золотий ромб на початку — CSS (.npc-reply::before)
          npcResult[npcId] = null;
          if (r.action) {
            const out = await NPC_ACTIONS[r.action](npcId);
            npcResult[npcId] = out;
            npcNode[npcId] = out.to || r.to || "start";
          } else {
            npcNode[npcId] = r.to || "start";
          }
          renderAll();
        }));
      }
      wrap.append(replies);
      box.append(wrap);
    }

    function renderTavern() {
      renderNpc(place, "ostap");
      place.append(noteP(
        `${locData.merchant || "Торговець"} продає за ${Math.round(RPG.SHOP_SELL_RATE * 100)}% вартості, ` +
        `а купує за ${Math.round(RPG.SHOP_BUY_RATE * 100)}%. Великі та чарівні зілля тут не купиш — лише здобути в бою.`));
      renderShop(place, locData.shop || []);
      const row = el("div", "row");
      row.append(link("Мапа", "maps.html"));
      place.append(row);
    }

    return { renderDarkGate, portalOpen, portalCard, renderPortalPlace, renderCityGate, renderTemple, renderNpc, npcCtx, npcResult, renderTavern };
  };
})(window.RPG);

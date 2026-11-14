// ============================================================
// page-game-guild.js — Екран локації: Гільдія авантюристів — дошка завдань, «Час дослідити», шлях професії, Тренер.
// Частина page-game.js: RPG.gameParts.guild(G) викликається з pageGame() і повертає те, що потрібне іншим частинам.
// G — спільне екрана локації: save, msg, place, locData і функції з page-game.js та інших частин
// (G.renderAll, G.renderPlace, G.renderShop…); G.fighting — чи показується бій. Спільні помічники — RPG.ui (game-common.js).
// ============================================================

(function (RPG) {
  const { $, el, noteP, link, button, fmtNum, showMsg, showNotice, journalReward, memberTabs } = RPG.ui;
  RPG.gameParts = RPG.gameParts || {};

  RPG.gameParts.guild = function (G) {
    const { save, msg } = G;
    // Функції з page-game.js та інших частин — через G (частини підключаються по черзі, тому не напряму)
    const renderPlace = (...args) => G.renderPlace(...args);
    const renderShop = (...args) => G.renderShop(...args);
    const renderAll = (...args) => G.renderAll(...args);

    // ---------- Гільдія авантюристів ----------
    let guildNpc = "admin";         // admin | trader | trainer
    let trainMember = 0;            // кого навчає Тренер (герой групи)

    function renderGuild(box) {
      const tabs = el("div", "row npc-tabs");
      const guildTabs = [["admin", "Адміністратор Артеміда"], ["trader", "Торговець Тадеуш"], ["trainer", "Тренер Брут"]];
      if (RPG.IFRIT) guildTabs.push(["ifrit", "Іфрит (тест)"]);      // ТЕСТ: прибрати разом з блоком IFRIT у character.js
      for (const [id, name] of guildTabs) {
        tabs.append(button(name, "wf " + (guildNpc === id ? "wf-button" : "wf-link"), () => { guildNpc = id; renderPlace(); }));
      }
      box.append(tabs);
      const npc = el("div", "stack npc-panel");
      // Шапка з портретом (assets/images/npc/<файл>.webp; поки картинки немає — лише ім'я)
      const GUILD_NPC = { admin: ["npc_guild_admin", "Артеміда, адміністратор гільдії"],
                          trader: ["npc_guild_trader", "Тадеуш, торговець гільдії"],
                          trainer: ["npc_trainer", "Брут, тренер гільдії"],
                          ifrit: ["npc_ifrit", "Іфрит — тестовий торговець ресурсами"] };
      if (!GUILD_NPC[guildNpc] || (guildNpc === "ifrit" && !RPG.IFRIT)) guildNpc = "admin";
      const [pic, who] = GUILD_NPC[guildNpc];
      const head = el("div", "npc-head");
      const img = new Image();
      img.className = "npc-portrait"; img.alt = "";
      img.addEventListener("error", () => img.remove());
      img.src = RPG.asset(`assets/images/npc/${pic}.webp`);
      head.append(img, el("strong", "npc-name", who));
      npc.append(head);
      if (guildNpc === "admin") renderQuestBoard(npc);
      else if (guildNpc === "trader") {
        npc.append(noteP(
          `Тадеуш, торговець гільдії, продає зброю 1–2 виду, шкіряну броню (2 вид), малі й середні зілля (за ${Math.round(RPG.SHOP_SELL_RATE * 100)}% вартості), ` +
          `а купує будь-що за ${Math.round(RPG.SHOP_BUY_RATE * 100)}%.`));
        renderShop(npc, RPG.GUILD_SHOP || []);
      } else if (guildNpc === "ifrit") {
        // ТЕСТ: Іфрит не належить до лору — продає ресурси, які ще не падають і не добуваються
        npc.append(el("p", "ifrit-note", "Тестовий персонаж (не з лору гри). Продає ресурси ремесла, які поки ніде не падають і не добуваються. " +
          `За одну покупку — до ${fmtNum(RPG.BUY_MAX)} шт.`));
        renderShop(npc, RPG.IFRIT.stock, { priceOf: RPG.ifritPrice, buy: RPG.buyFromIfrit, stock: true });
      } else renderTrainer(npc);
      box.append(npc);
    }

    // --- Адміністратор гільдії: завдання ---
    function renderQuestBoard(box) {
      const before = RPG.questState(save).offers.length;
      RPG.fillOffers(save);
      if (RPG.questState(save).offers.length !== before) RPG.saveGame(save).catch(e => console.error(e));
      const qs = RPG.questState(save);
      renderExplore(box);
      renderProfession(box);
      box.append(noteP(
        `«Роботи вистачає — беріть до ${RPG.questMaxActive(save)} завдань одночасно.» Виконано завдань: ${qs.done}.` +
        (RPG.partySize(save) > 1 ? " Досвід за завдання отримує кожен герой групи — повністю, ще й з бонусами (група, тимчасові ефекти, руни й речі)." : "")));

      // «Здати все»: разом усі виконані завдання гільдії та нагороди за чемпіонів
      if (qs.active.length || qs.bounties.length) {
        const readyCount = qs.active.filter(q => RPG.isQuestComplete(save, q)).length + qs.bounties.length;
        const all = button(readyCount ? `Здати все (${readyCount})` : "Здати все", "wf wf-button turn-in-all", async () => {
          let exp = 0, gold = 0, quests = 0, bounties = 0, lastLevel = null;
          const items = {};
          const bountyExp = {};   // досвід (чемпіони й завдання) — кожному герою окремо, з бонусами
          const noteLevel = lv => { if (lv.length) lastLevel = lv[lv.length - 1]; };
          for (const bounty of [...qs.bounties]) {
            const res = RPG.claimBounty(save, bounty.id);
            if (!res.ok) continue;
            bounties++;
            gold += bounty.gold;
            for (const h of res.heroes) bountyExp[h.name] = (bountyExp[h.name] || 0) + h.exp;
            noteLevel(res.levelUps);
            journalReward(save, `Гільдія: переможено чемпіона «${bounty.name}»`, RPG.bountyRewardText(res));
          }
          for (const quest of qs.active.filter(q => RPG.isQuestComplete(save, q))) {
            const res = RPG.turnInQuest(save, quest.id);
            if (!res.ok) continue;
            quests++;
            gold += quest.reward.gold;
            for (const it of quest.reward.items) items[it.id] = (items[it.id] || 0) + it.qty;
            for (const h of res.heroes) bountyExp[h.name] = (bountyExp[h.name] || 0) + h.exp;
            noteLevel(res.levelUps);
            const t = `Нагорода: ${RPG.describeReward({ ...quest.reward, exp: null })}; досвід — ${res.expText}`;
            journalReward(save, `Завдання «${RPG.questTitle(quest)}» здано`, t.endsWith("!") ? t : t + ".");
          }
          if (!quests && !bounties) { showMsg(msg, "Немає виконаних завдань.", true); return; }
          const reward = RPG.describeReward({ exp: null, gold, items: Object.entries(items).map(([id, qty]) => ({ id, qty })) });
          const what = [quests ? `завдань: ${quests}` : "", bounties ? `нагород за чемпіонів: ${bounties}` : ""].filter(Boolean).join(", ");
          const names = Object.keys(bountyExp);
          const bTxt = names.length ? ` Досвід${names.length > 1 ? " кожному" : ""}: ` +
            names.map(n => names.length > 1 ? `${n} +${fmtNum(bountyExp[n])}` : `+${fmtNum(bountyExp[n])}`).join(", ") + " EXP (з бонусами)." : "";
          const txt = `Здано ${what}. Нагорода: ${reward}.${bTxt}` + (lastLevel ? ` Новий рівень: ${lastLevel}!` : "");
          await RPG.saveGame(save);
          showMsg(msg, txt);
          renderAll();
        });
        all.disabled = !readyCount;
        const allRow = el("div", "row");
        allRow.append(all);
        box.append(allRow);
      }

      if (qs.bounties.length) {
        box.append(el("h3", null, "Нагороди за чемпіонів"));
        for (const bounty of qs.bounties) {
          const r = el("div", "shop-row quest-row quest-done champion-row");
          const info = el("span", "shop-name", `Переможено чемпіона: ${bounty.name}`);
          const many = RPG.partySize(save) > 1;
          info.append(el("small", null, ` · ${bounty.exp} EXP${many ? " кожному герою" : ""} + бонуси, ${bounty.gold} золота (×${RPG.CHAMPION.bountyMult})`));
          r.append(info, button("Отримати", "wf wf-button", async () => {
            const res = RPG.claimBounty(save, bounty.id);
            if (!res.ok) { showMsg(msg, res.reason, true); return; }
            const txt = RPG.bountyRewardText(res);
            journalReward(save, `Гільдія: переможено чемпіона «${bounty.name}»`, txt);
            await RPG.saveGame(save);
            showMsg(msg, txt);
            renderAll();
          }));
          box.append(r);
        }
      }

      box.append(el("h3", null, "Ваші завдання"));
      if (!qs.active.length) box.append(el("p", "status", "Немає взятих завдань."));
      for (const quest of qs.active) {
        const done = RPG.isQuestComplete(save, quest);
        const r = el("div", "shop-row quest-row" + (done ? " quest-done" : ""));
        const info = el("span", "shop-name", `${RPG.questTitle(quest)} — ${RPG.questProgress(save, quest)}/${quest.need}`);
        info.append(el("small", null, ` · нагорода: ${RPG.describeReward(quest.reward)}`));
        const turnIn = button("Здати", "wf wf-button", async () => {
          const res = RPG.turnInQuest(save, quest.id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          const t = `Завдання виконано! Нагорода: ${RPG.describeReward({ ...quest.reward, exp: null })}; досвід — ${res.expText}`;
          const txt = t.endsWith("!") ? t : t + ".";
          journalReward(save, `Завдання «${RPG.questTitle(quest)}» здано`, txt);
          await RPG.saveGame(save);
          showMsg(msg, txt);
          renderAll();
        });
        turnIn.disabled = !done;
        const drop = button("Відмовитись", "wf wf-secondary", async () => {
          if (!confirm(`Відмовитися від завдання «${RPG.questTitle(quest)}»?`)) return;
          RPG.abandonQuest(save, quest.id);
          await RPG.saveGame(save);
          renderAll();
        });
        r.append(info, turnIn, drop);
        box.append(r);
      }

      box.append(el("h3", null, "Нові завдання"));
      for (const quest of qs.offers) {
        const r = el("div", "shop-row quest-row");
        const info = el("span", "shop-name", RPG.questTitle(quest));
        info.append(el("small", null, ` · нагорода: ${RPG.describeReward(quest.reward)}`));
        const take = button("Взяти", "wf wf-button", async () => {
          const res = RPG.acceptQuest(save, quest.id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Взято завдання: ${RPG.questTitle(quest)}.`);
          renderAll();
        });
        take.disabled = qs.active.length >= RPG.questMaxActive(save);
        r.append(info, take);
        box.append(r);
      }
    }

    // --- Особливе завдання «Час дослідити» (у Адміністратора) ---
    function renderExplore(box) {
      const info = RPG.exploreInfo(save);
      const E = RPG.EXPLORE;
      if (!info) {
        box.append(noteP(`Особливе завдання «${E.name}» Артеміда доручає героям від ${E.minLevel} рівня.`));
        return;
      }
      // Виконано: один раз показуємо повідомлення про відкриття Дошки оголошень, далі поле приховане
      if (info.done) {
        if (!info.st.announced) {
          info.st.announced = true;
          RPG.saveGame(save).catch(e => console.error(e));
          showExploreUnlocked();
        }
        return;
      }
      const card = el("div", "stack explore-card");
      card.append(el("h3", null, `Особливе завдання: «${E.name}»`));
      if (info.canStart) {
        card.append(noteP(`«Ви вже ${RPG.gw(save, "досвідчений авантюрист", "досвідчена авантюристка")}. Час дослідити світ далі — але спершу допоможіть нам. ` +
          `Завдання з ${info.total} частин, кожна відкривається після попередньої.»`));
        card.append(button("Взяти завдання", "wf wf-button", async () => {
          const r = RPG.startExplore(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Взято особливе завдання «${E.name}». Частина 1: ${E.parts[0].title}.`);
          renderAll();
        }));
      } else {
        card.append(el("p", null, `Частина ${info.index} з ${info.total}: ${info.part.title}`));
        card.append(noteP(info.part.text));
        for (const pr of info.progress) {
          card.append(el("div", pr.have >= pr.need ? "rt-magic" : null, `${pr.label}: ${pr.have} / ${pr.need}`));
        }
        card.append(el("p", "status", "Нагорода: " + RPG.describeExploreReward(info.part)));
        const b = button(info.index < info.total ? "Здати частину" : "Завершити завдання", "wf wf-button", async () => {
          const r = RPG.turnInExplore(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          const rest = RPG.describeExploreReward(r.part || info.part, true);
          const up = [rest, r.expText ? `досвід — ${r.expText}` : ""].filter(Boolean).join("; ");
          const upTxt = up ? ` Нагорода: ${up}${up.endsWith("!") ? "" : "."}` : "";
          journalReward(save, r.finished ? `Завдання «${E.name}» виконано` : `«${E.name}»: частину ${info.index} з ${info.total} здано`,
            upTxt.trim() || "Нагороди немає.");
          if (r.finished) RPG.storyState(save).announced = true;
          await RPG.saveGame(save);
          if (r.finished) showExploreUnlocked(upTxt);
          else showMsg(msg, `Частину виконано!${upTxt} Далі: ${E.parts[RPG.storyState(save).part - 1].title}.`);
          renderAll();
        });
        b.disabled = !info.complete;
        card.append(b);
      }
      box.append(card);
    }

    // Повідомлення: «Час дослідити» виконано — відкрито Дошку оголошень біля Мерії
    function showExploreUnlocked(up = "") {
      const E = RPG.EXPLORE;
      const go = link("До Центрального району (Мерія)", "game.html?district=center", "wf wf-button");
      showNotice("Відкрито доступ: Дошка оголошень", [
        `Особливе завдання «${E.name}» виконано!${up}`,
        E.finale,
        "Дошка оголошень біля Мерії (Центральний район) тепер відкрита — можна наймати героїв у групу.",
        go
      ]);
    }

    // --- Квест «Шлях професії» (з 12 рівня Селянина; 3 гілки по 10 завдань; професія — на 15 рівні) ---
    // Кожен герой групи проходить шлях сам (quests.js → professionState): картка на кожного,
    // умови й професія — за його власними атрибутами. ms — «вигляд» героя (party.js → memberSave).
    function renderProfession(box) {
      const members = RPG.partyMembers(save);
      const group = members.length > 1;
      const waiting = [];
      for (const ms of members) {
        if (!renderProfessionFor(box, ms, group) && ms.character.classId === RPG.DEFAULT_CLASS) waiting.push(ms);
      }
      if (waiting.length) {
        const who = group ? waiting.map(ms => `${ms.character.name} (${ms.character.level} рів.)`).join(", ") + " — " : "";
        box.append(noteP(`${who}квест «${RPG.PROFESSION.name}» — зміна професії — Артеміда дає Селянину з ${RPG.PROFESSION_QUEST_LEVEL} рівня.`));
      }
    }
    // Картка квесту одного героя. Повертає false, якщо квест йому ще не доступний
    function renderProfessionFor(box, ms, group) {
      const info = RPG.professionInfo(ms);
      const name = RPG.professionName(ms);
      const who = group ? `${ms.character.name}: ` : "";
      if (!info) return false;
      const card = el("div", "stack explore-card");
      card.append(el("h3", null, `${group ? ms.character.name + " — к" : "К"}вест: «${name}»`));
      const levelTxt = lv => lv.length ? ` Новий рівень: ${lv[lv.length - 1]}!` : "";
      if (info.done) {
        const done = el("p", null, `${group ? ms.character.name + " — професія" : "Ваша професія"}: ${RPG.getClass(ms.character.classId).name}.`);
        done.append(" ", RPG.roleTags(ms.character.classId));
        card.append(done);
      } else if (info.canStart) {
        card.append(noteP("«Ти переріс селянське життя. Пройди десять випробувань — і на 15 рівні я скажу, ким тобі судилося стати. " +
          "Яким шляхом ти підеш, залежить від того, що ти в собі розвивав.»"));
        if (!info.branches.length) card.append(el("p", "rt-magic", RPG.PROFESSION_REFUSE));
        const take = async branch => {
          const r = RPG.startProfession(ms, branch);
          if (r.choose) {
            const pick = el("div", "stack");
            pick.append(el("p", null, "«Перед тобою кілька шляхів. Обери, яким підеш, — назад дороги не буде.»"));
            for (const id of r.choose) {
              const B = RPG.PROFESSION_BRANCHES[id];
              pick.append(button(B.name, "wf wf-button", () => take(id)));
              const list = el("p", "role-list", "Професії: ");
              B.classes.forEach((c, i) => {
                list.append(el("span", null, RPG.getClass(c).name), RPG.roleTags(c));
                if (i < B.classes.length - 1) list.append(", ");
              });
              pick.append(list);
            }
            takeBtn.replaceWith(pick);
            return;
          }
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          const B = RPG.PROFESSION_BRANCHES[r.branch];
          showMsg(msg, `${who ? who + "в" : "В"}зято квест «${B.name}». ${B.intro} Завдання 1: ${B.parts[0].title}.`);
          renderAll();
        };
        const takeBtn = button("Взяти квест", "wf wf-button", () => take(null));
        card.append(takeBtn);
      } else if (info.final) {
        card.append(el("p", null, "Усі десять випробувань пройдено. «Ти довів, на що здатен. Час дізнатися, ким ти станеш.»"));
        card.append(el("p", null, "Нагорода за шлях: ???"));
        const finish = async classId => {
          const r = RPG.turnInProfession(ms, classId);
          if (r.choose) {
            if (r.choose.length === 1) return finish(r.choose[0]);
            const pick = el("div", "stack");
            pick.append(el("p", null, "«Перед тобою кілька шляхів — обери свій. Маг сам вирішує, якій стихії служити.» " +
              "Вибір не можна буде змінити."));
            for (const id of r.choose) {
              const c = RPG.getClass(id);
              const w = (c.weapons || []).map(t => RPG.WEAPON_TYPES[t]?.name || t).join(" / ");
              pick.append(button(`${c.name} — ${w}`, "wf wf-button", () => finish(id)));
              const d = el("p", null);
              d.append(RPG.roleTags(id), " ", c.description);
              pick.append(d);
            }
            b.replaceWith(pick);
            return;
          }
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          const c = RPG.getClass(r.classId);
          journalReward(save, `${who}Шлях професії пройдено`, `Нагорода за шлях: ${r.exp ? fmtNum(r.exp) + " EXP (15 рівень) і " : ""}нова професія — ${c.name}.`);
          await RPG.saveGame(save);
          showMsg(msg, `${who ? who + "н" : "Н"}агорода за шлях: ${r.exp ? fmtNum(r.exp) + " EXP (15 рівень) і " : ""}нова професія — ${c.name}! ${c.description} ` +
            `Рівень професії почався з 1, а бонуси Селянина лишилися. Тренер Брут навчить новим навичкам.` +
            (r.change?.removed?.length ? " Зброю, якою ця професія не користується, знято в інвентар." : "") +
            (r.change?.skillsReset?.length ? ` Навички Селянина (${r.change.skillsReset.map(id => RPG.SKILLS[id]?.name || id).join(", ")}) забуто — їх треба вчити знову; володіння зброєю лишилось.` : ""));
          renderAll();
        };
        const b = button("Завершити шлях і отримати професію", "wf wf-button", () => finish(null));
        card.append(b);
      } else {
        card.append(el("p", null, `Завдання ${info.index} з ${info.total}: ${info.part.title}`));
        card.append(noteP(info.part.text));
        for (const pr of info.progress) {
          card.append(el("div", pr.have >= pr.need ? "rt-magic" : null, `${pr.label}: ${pr.have} / ${pr.need}`));
        }
        card.append(el("div", null, "Нагорода: досвід — скільки, дізнаєтесь при здачі."));
        const b = button("Здати завдання", "wf wf-button", async () => {
          const r = RPG.turnInProfession(ms);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          journalReward(save, `${who}Шлях професії: завдання ${info.index} з ${info.total} здано`,
            `Нагорода: ${fmtNum(r.exp)} EXP.${levelTxt(r.levelUps)}`);
          await RPG.saveGame(save);
          const next = RPG.professionInfo(ms);
          showMsg(msg, `${who ? who + "з" : "З"}авдання виконано! Нагорода: ${fmtNum(r.exp)} EXP.${levelTxt(r.levelUps)} ` +
            (r.allDone ? "Усі десять випробувань пройдено — поверніться до Артеміди по нагороду за шлях."
                       : `Далі: ${next.part.title}.`));
          renderAll();
        });
        b.disabled = !info.complete;
        card.append(b);
      }
      box.append(card);
      return true;
    }

    // --- Тренер: володіння зброєю та навички ---
    function masteryBonusText(type, lvl) {
      const parts = [];
      for (const [k, max] of Object.entries(RPG.MASTERY_BONUS[type] || {})) {
        const v = Math.round(max * lvl / RPG.MASTERY_MAX * 10) / 10;
        parts.push(`${RPG.STAT_NAMES[k] || k} +${v}`);
      }
      return parts.join(", ");
    }

    function renderTrainer(box) {
      if (trainMember >= RPG.partySize(save)) trainMember = 0;
      const tabs = el("div", "row member-tabs");
      memberTabs(tabs, save, trainMember, i => { trainMember = i; renderPlace(); });
      box.append(tabs);
      const tms = RPG.memberSave(save, trainMember);
      const type = RPG.weaponTypeOf(tms);
      const cap = RPG.masteryCap(tms);
      box.append(noteP("«Володіння приходить у бою, а не за золото. За кожен виграний бій росте вміння тією зброєю, " +
        "що в правій руці. Хочеш швидше — потренуйся зі мною.»"));
      box.append(noteP(
        `Межа володіння зараз: ${cap}` + (cap < RPG.MASTERY_MAX ? ` (з 10 рівня персонажа — ${RPG.MASTERY_MAX}, з професією — ${RPG.MASTERY_PRO_MAX}).`
          : cap < RPG.MASTERY_PRO_MAX ? ` (з професією — ${RPG.MASTERY_PRO_MAX}; бонуси й далі ростуть так само).` : ".") +
        " Володіння 10 відкриває зброю 2 виду, 20 — 3 виду. Більше досвіду володіння — за кількох ворогів, чемпіонів, босів, " +
        "сильніших ворогів і з Джерелом Велеса; за ворогів, слабших на 10+ рівнів, — нічого."));

      // Тренування: +1 досвіду володіння за кожен виграний бій для всієї групи на 30 хв; лише одне активне
      const TB = RPG.TRAINER_BOOST;
      const left = RPG.trainerBoostLeft(save);
      const boost = el("div", "shop-row skill-row" + (left ? " is-current" : ""));
      const bInfo = el("span", "shop-name", `Тренування з Брутом: +${TB.flat} досвіду володіння за кожен виграний бій`);
      bInfo.append(el("small", null, left
        ? ` · діє ще ${Math.ceil(left / 60000)} хв для всієї групи`
        : ` · для всієї групи на ${TB.durationMs / 60000} хв`));
      const bBtn = button(left ? "Триває" : `Тренуватися (${fmtNum(TB.cost)} зол.)`, "wf wf-button", async () => {
        const res = RPG.buyTrainerBoost(save);
        if (!res.ok) { showMsg(msg, res.reason, true); return; }
        journalReward(save, "Тренування з Брутом", `+${TB.flat} досвіду володіння за кожен виграний бій для всієї групи на ${res.minutes} хв (−${fmtNum(res.cost)} золота).`);
        await RPG.saveGame(save);
        showMsg(msg, `Брут ганяє вас до сьомого поту. ${res.minutes} хв уся група отримує +${TB.flat} досвіду володіння за кожен виграний бій (−${fmtNum(res.cost)} золота).`);
        renderAll();
      });
      bBtn.disabled = !!left || (save.character.gold || 0) < TB.cost;
      boost.append(bInfo, bBtn);
      box.append(boost);

      // Лише види зброї своєї професії; усі рівні — через «i» біля заголовка
      const ownTypes = RPG.masteryTypes(tms);
      const mHead = el("h3", "mastery-head", "Володіння зброєю");
      const mInfo = el("button", "info-tip stat-i");
      mInfo.type = "button";
      mInfo.setAttribute("aria-label", "Усі рівні володіння зброєю");
      mInfo.append(el("span", "info-i", "i"));
      RPG.bindTip(mInfo, () => {
        const ib = el("div", "info-body stat-info");
        ib.append(el("p", "stat-info-head", "Усі рівні володіння зброєю"));
        for (const [t, wt] of Object.entries(RPG.WEAPON_TYPES)) {
          ib.append(el("p", null, `${wt.mastery}: ${RPG.masteryProgress(tms, t).level} / ${cap}` + (ownTypes.includes(t) ? "" : " — не для вашої професії")));
        }
        return ib;
      }, null);
      const mRow = el("div", "mastery-head-row");    // кнопка — поруч із заголовком, не в ньому (ui.js ставить у заголовки свої «i»)
      mRow.append(mHead, mInfo);
      box.append(mRow);
      for (const [t, wt] of Object.entries(RPG.WEAPON_TYPES)) {
        if (!ownTypes.includes(t)) continue;
        const pr = RPG.masteryProgress(tms, t);
        const lvl = pr.level;
        const r = el("div", "shop-row skill-row" + (t === type ? " is-current" : ""));
        const expTxt = pr.need ? ` · досвід ${Math.floor(pr.exp)}/${pr.need}` + (lvl >= cap ? " (межа)" : "") : " · найвищий рівень";
        const info = el("span", "shop-name", `${wt.mastery}: ${lvl}/${cap}` + (t === type ? " · у руках" : "") + expTxt);
        info.append(el("small", null, lvl ? ` · ${masteryBonusText(t, lvl)}` : ` · на 20: ${masteryBonusText(t, RPG.MASTERY_MAX)}`));
        r.append(info);
        box.append(r);
      }

      box.append(el("h3", null, "Навички, заклинання та пасивні вміння"));
      const ids = RPG.trainerSkills(tms);
      if (!ids.length) { box.append(el("p", "status", "Вдягніть зброю, щоб тренер показав навички для неї.")); return; }
      const KIND = { buff: "Баф", heal: "Лікування", passive: "Пасивне", curse: "Прокляття" };
      const wName = sk => (Array.isArray(sk.weapon) ? sk.weapon : [sk.weapon]).map(t => RPG.WEAPON_TYPES[t].name.toLowerCase()).join(" / ");
      for (const id of ids) {
        const sk = RPG.SKILLS[id];
        const lvl = RPG.skillLevel(tms, id);
        const mastery = RPG.skillMastery(tms, sk);
        const r = el("div", "shop-row skill-row" + (sk.cls ? " is-class" : ""));
        const icon = el("img", "skill-icon");
        icon.alt = "";
        icon.onerror = () => icon.remove();
        icon.src = RPG.asset(`assets/images/skills/${id}.webp`);
        const kind = KIND[sk.kind] || (sk.magic ? "Заклинання" : "Навичка");
        const info = el("span", "shop-name", `${kind}: ${sk.name} — ${lvl}/${RPG.SKILL_MAX}`);
        info.append(el("small", null, ` · ${sk.desc} ${RPG.describeSkill(id, Math.max(1, lvl))}` +
          (sk.school ? ` · школа: ${RPG.SCHOOLS[sk.school].name}` : "") +
          (sk.weapon && !RPG.skillWeaponOk(sk, type) ? ` · потрібна зброя: ${wName(sk)}` : "") +
          (sk.req && mastery < sk.req ? ` · потрібно володіння ${sk.req}` : "")));
        const cost = RPG.skillCost(lvl + 1);
        const cap = RPG.skillCap(tms, id);
        const label = lvl >= RPG.SKILL_MAX ? "Максимум" : `${lvl ? "Покращити" : "Вивчити"} (${fmtNum(cost)} зол.)`;
        const b = button(label, "wf wf-button", async () => {
          const res = RPG.learnSkill(tms, id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `«${sk.name}»: рівень ${res.level} (−${fmtNum(res.cost)} золота).` +
            (sk.kind === "passive" ? " Бонус діє постійно." : " Додайте навичку в чергу дій у бою."));
          renderAll();
        });
        b.disabled = lvl >= cap || mastery < (sk.req || 0) || tms.character.gold < cost;
        if (b.disabled && lvl >= cap && lvl < RPG.SKILL_MAX) {
          b.title = sk.kind === "passive" ? "Пасивне вміння — до половини рівня персонажа" : "Рівень навички не може перевищувати рівень володіння зброєю";
        }
        r.append(icon, info, b);
        box.append(r);
      }
    }

    return { renderGuild };
  };
})(window.RPG);

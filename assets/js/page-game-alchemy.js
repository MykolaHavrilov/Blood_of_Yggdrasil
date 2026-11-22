// ============================================================
// page-game-alchemy.js — Екран локації: Алхімічний станок (Гільдія ремісників і Храм; логіка — alchemy.js).
// Частина page-game.js: RPG.gameParts.alchemy(G) повертає renderAlchemyRow(box, station) і showAlchemy(station).
//
// Вікно станка (рішення користувача 2026-11-22):
//   ліворуч — список зілль (пряма варка й покращення) і повзунок кількості: праворуч 1, ліворуч 100
//             (не більше, ніж вистачає інгредієнтів);
//   у центрі — казан; рідина червона (здоров'я) чи синя (мана); поки вариться — відлік від суми часу всіх зілль до 0;
//             коли готово — посеред казана з'являється комірка із звареним зіллям: натиск переносить його в інвентар
//             (що не влізло — лишається в казані, і з'являється повідомлення);
//   праворуч — згори вниз комірки інгредієнтів, найнижча — під колбу.
// Варка йде в реальному часі: герой може піти й повернутися — вікно покаже, на якій вона стадії.
// ============================================================

(function (RPG) {
  const { el, noteP, button, fmtNum, showMsg, noticeDialog, fillItemCell } = RPG.ui;
  RPG.gameParts = RPG.gameParts || {};

  // 125 → «2:05», 3725 → «1:02:05»
  function clock(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
    const pad = n => String(n).padStart(2, "0");
    return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  }
  const secText = s => `${String(s).replace(".", ",")} с`;

  // Казан — картинки images/ui/alch_cauldron_*.webp: холодний (завжди внизу) і киплячий (червоний — здоров'я, синій — мана)
  // поверх нього; вони збігаються до пікселя, тож гра лише проявляє верхню. Центр рідини — 50% / 25% картинки (туди лягає комірка).
  const ALCH_IMG = kind => RPG.asset(`assets/images/ui/alch_cauldron_${kind}.webp`);
  const ALCH_BG = { guild: "assets/images/ui/alch_bg_guild.webp", temple: "assets/images/ui/alch_bg_temple.webp" };
  function cauldronImgs(pot, kind) {
    for (const [cls, src] of [["is-cold", ALCH_IMG("cold")], ["is-lit", ALCH_IMG(kind)]]) {
      const im = el("img", "alch-pot " + cls);
      Object.assign(im, { src, alt: "", decoding: "async", draggable: false });
      pot.append(im);
    }
  }

  RPG.gameParts.alchemy = function (G) {
    const { save, msg } = G;
    const renderAll = (...args) => G.renderAll(...args);

    const potionName = id => RPG.ITEMS[id]?.name || id;
    const recipeLabel = r => r.mode === "upgrade" ? `${potionName(r.potion)} — покращення` : potionName(r.potion);

    // Рядок станка в локації: назва, стан казана і кнопка
    function renderAlchemyRow(box, station) {
      const S = RPG.ALCH_STATIONS[station];
      if (!S) return;
      const st = RPG.alchBrewStatus(save, station), b = st.brew;
      const lvl = RPG.alchState(save).level;
      const row = el("div", "shop-row tool-row fbook-row alch-row");
      const ico = el("img", "alch-row-icon");
      Object.assign(ico, { src: RPG.asset("assets/images/ui/alch_station_icon.webp"), alt: "", decoding: "async" });
      ico.addEventListener("error", () => ico.remove());
      const info = el("div", "tool-info");
      const state = st.state === "brewing" ? `Вариться: ${potionName(b.potion)} ×${b.count} — ще ${clock(st.leftMs)}.`
        : st.state === "ready" ? `Готово: ${potionName(b.potion)} ×${b.left} — заберіть із казана.`
        : "Казан вільний.";
      info.append(el("strong", null, "Алхімічний станок"),
        el("small", null, `Зілля здоров'я й мани з трав і мінералів. Алхімія: ${lvl} рівень. ${state}`));
      row.append(ico, info, button("До станка", "wf wf-button", () => showAlchemy(station)));
      box.append(row);
    }

    function showAlchemy(station) {
      document.querySelector(".alchemy-dialog")?.remove();
      const S = RPG.ALCH_STATIONS[station];
      let timer = 0;
      const { dlg, closeBtn } = noticeDialog("alchemy-dialog rune-forge-dialog", () => { clearInterval(timer); renderAll(); });
      const recipes = RPG.alchRecipes();
      let pickId = null, count = 1, note = null;
      // Перший відкритий рецепт, на який вистачає інгредієнтів, інакше — перший відкритий
      const openRecipes = recipes.filter(r => RPG.alchTierOpen(save, r.tier).ok);
      pickId = (openRecipes.find(r => RPG.alchMaxCount(save, r) > 0) || openRecipes[0] || recipes[0]).id;
      const inPot = RPG.alchBrew(save, station);           // у казані щось є — після забирання лишається той самий рецепт
      if (inPot) pickId = `${inPot.potion}:${inPot.mode}`;

      const draw = () => {
        clearInterval(timer);
        const keep = dlg.scrollTop;
        dlg.innerHTML = "";
        const st = RPG.alchBrewStatus(save, station), busy = st.state !== "idle";
        const A = RPG.alchState(save), next = RPG.alchExpToNext(A.level);
        dlg.append(closeBtn("Закрити станок"), el("h3", null, S.name));
        const lvlLine = el("p", "alch-level", A.level >= RPG.ALCH_MAX_LEVEL ? `Алхімія: ${A.level} рівень (найвищий)`
          : `Алхімія: ${A.level} рівень · досвід ${fmtNum(A.exp)} / ${fmtNum(next)}`);
        const bar = el("span", "alch-bar");
        bar.append(el("span", "alch-bar-fill"));
        bar.firstChild.style.width = (A.level >= RPG.ALCH_MAX_LEVEL ? 100 : Math.min(100, A.exp / next * 100)) + "%";
        lvlLine.append(bar);
        dlg.append(lvlLine);
        dlg.append(noteP("Пряма варка: 6 матеріалів тіру + порожня колба тіру. Покращення: 3 зілля попереднього тіру + колба + 1 матеріал. " +
          "Трави дають Лісопилки, мінерали — Шахти (експедиції), колби продає Торгова гільдія. Інгредієнти беруться з інвентаря та скринь складу вашого дому. " +
          "Варка йде, навіть коли ви пішли від станка чи закрили гру; зварене зілля треба забрати з казана самому."));
        if (note) dlg.append(el("p", "forge-result" + (note.error ? " is-error" : ""), note.text));

        // що показувати: рецепт у казані (поки вариться / лежить готове) або обраний
        const rec = busy ? RPG.alchRecipe(st.brew.potion, st.brew.mode) : recipes.find(r => r.id === pickId);
        const n = busy ? st.brew.count : count;
        const open = RPG.alchTierOpen(save, rec.tier);
        const max = busy ? n : RPG.alchMaxCount(save, rec);
        if (!busy) count = Math.min(Math.max(1, count), Math.max(1, max));
        const unitSec = busy ? st.brew.unitMs / 1000 : RPG.alchBrewSec(rec.tier, A.level);

        const body = el("div", "alch-body");
        // ---------- ліворуч: вибір зілля й кількості ----------
        const left = el("div", "alch-left");
        const sel = el("select", "alch-select");
        sel.setAttribute("aria-label", "Яке зілля варити");
        for (const [kind, title] of [["hp", "Зілля здоров'я"], ["mp", "Зілля мани"]]) {
          const grp = el("optgroup");
          grp.label = RPG.t ? RPG.t(title) : title;
          for (const r of recipes.filter(x => x.kind === kind)) {
            const o = el("option", null, recipeLabel(r) + (RPG.alchTierOpen(save, r.tier).ok ? "" : ` (з ${RPG.ALCH_TIER_LEVEL[r.tier]} рів.)`));
            o.value = r.id;
            o.disabled = !RPG.alchTierOpen(save, r.tier).ok;
            if (r.id === rec.id) o.selected = true;
            grp.append(o);
          }
          sel.append(grp);
        }
        sel.disabled = busy;
        sel.addEventListener("change", () => { pickId = sel.value; count = 1; note = null; draw(); });
        left.append(el("label", "alch-cap", "Зілля"), sel);
        left.append(el("p", "alch-recipe", `Тір ${rec.tier} · ${rec.mode === "upgrade" ? "покращення" : "пряма варка"} · одне зілля — ${secText(unitSec)}`));
        // повзунок: праворуч 1, ліворуч 100 (dir="rtl")
        const qtyCap = el("label", "alch-cap", "");
        const range = el("input", "alch-range");
        Object.assign(range, { type: "range", min: 1, max: Math.max(1, busy ? n : Math.min(RPG.ALCH_MAX_BATCH, max)), step: 1, value: n });
        range.dir = "rtl";
        range.disabled = busy || max < 2;
        range.setAttribute("aria-label", "Скільки зілль варити");
        const total = el("p", "alch-total");
        const go = button("", "wf wf-button alch-go", async () => {
          const r = RPG.alchStartBrew(save, station, rec.id, count);
          if (!r.ok) { note = { text: r.reason, error: true }; draw(); return; }
          await RPG.saveGame(save);
          pickId = rec.id;
          note = { text: `Казан закипів: ${potionName(r.potion)} ×${r.count}. Буде готово за ${clock(r.ms)}.` };
          draw();
        });
        const updQty = () => {
          const k = busy ? n : count;
          qtyCap.textContent = `Кількість: ${k}` + (busy ? "" : ` (можна до ${Math.min(RPG.ALCH_MAX_BATCH, max)})`);
          total.textContent = `Час варки: ${clock(unitSec * 1000 * k)}`;
          go.textContent = `Варити ×${k}`;
          go.disabled = busy || !open.ok || max < 1;
          drawSlots();
        };
        range.addEventListener("input", () => { count = Number(range.value); updQty(); });
        const ends = el("div", "alch-range-ends");
        ends.append(el("span", null, String(range.max)), el("span", null, "1"));
        left.append(qtyCap, range, ends, total);
        if (!open.ok) left.append(el("p", "status is-error", open.reason));
        else if (!busy && max < 1) left.append(el("p", "status", "Не вистачає інгредієнтів — дивіться комірки праворуч."));
        left.append(go);

        // ---------- центр: казан ----------
        const mid = el("div", "alch-mid");
        const pot = el("div", "alch-cauldron is-" + rec.kind + (st.state === "brewing" ? " is-brewing" : "") + (st.state === "ready" ? " is-ready" : ""));
        cauldronImgs(pot, rec.kind);
        const clockEl = el("p", "alch-clock");
        if (st.state === "ready") {
          const cell = button("", "wf wf-slot alch-result", async () => {
            const r = RPG.alchCollect(save, station);
            if (!r.ok) { note = { text: r.reason, error: true }; draw(); return; }
            await RPG.saveGame(save);
            const parts = [];
            if (r.taken) parts.push(`У інвентар: ${potionName(r.potion)} ×${r.taken}.`);
            if (r.exp) parts.push(`+${fmtNum(r.exp)} досвіду Алхімії` + (r.levelUps.length ? ` — Алхімія ${r.levelUps.at(-1)} рівня!` : "."));
            if (r.full) parts.push(`В інвентарі немає місця: у казані лишилось ×${r.left}. Звільніть місце й заберіть решту.`);
            note = { text: parts.join(" "), error: r.full && !r.taken };
            if (r.full) showMsg(msg, "В інвентарі немає місця для зілля — воно лишилось у казані.", true);
            draw();
          });
          fillItemCell(cell, st.brew.potion, st.brew.left);
          cell.title = `${potionName(st.brew.potion)} ×${st.brew.left} — натисніть, щоб забрати в інвентар`;
          pot.append(cell);
          clockEl.textContent = "Готово! Заберіть зілля з казана.";
        } else if (st.state === "brewing") {
          const tick = () => {
            const s2 = RPG.alchBrewStatus(save, station);
            if (s2.state !== "brewing") { draw(); return; }
            clockEl.textContent = `${clock(s2.leftMs)} · зварено ${s2.done} з ${s2.brew.count}`;
          };
          tick();
          timer = setInterval(tick, 250);
        } else clockEl.textContent = "Казан вільний";
        mid.append(pot, clockEl);

        // ---------- праворуч: комірки інгредієнтів (найнижча — колба) ----------
        const right = el("div", "alch-slots");
        function drawSlots() {
          right.innerHTML = "";
          const k = busy ? n : count;
          for (const [id, q] of [...rec.need, [rec.flask, 1]]) {
            const need = q * k, have = RPG.alchCountIng(save, id);
            const wrap = el("div", "alch-slot-wrap" + (id === rec.flask ? " is-flask" : ""));
            const cell = el("span", "wf wf-slot alch-slot" + (busy ? " is-used" : have < need ? " is-short" : ""));
            fillItemCell(cell, id, need);
            wrap.append(cell, el("small", "alch-slot-cap", `${potionName(id)}: ${need}` + (busy ? " — у казані" : ` (є ${fmtNum(have)})`)));
            right.append(wrap);
          }
        }
        updQty();
        body.append(left, mid, right);
        dlg.append(body);
        RPG.collapseNotes?.(dlg);
        dlg.scrollTop = keep;
      };
      if (ALCH_BG[station]) { dlg.classList.add("has-bg"); dlg.style.setProperty("--alch-bg", `url("${RPG.asset(ALCH_BG[station])}")`); }
      document.body.append(dlg);
      draw();
      dlg.showModal();
    }

    // ---------- Колби в Торговій гільдії та її філіалах ----------
    // opts.byLevel — звичайні торговці (Шинок, торговець Гільдії): лише колби тірів, відкритих Алхімією героя
    function renderFlaskShop(box, opts = {}) {
      G.renderShop(box, opts.byLevel ? RPG.alchFlaskStockByLevel(save) : RPG.alchFlaskStock(save), { priceOf: RPG.alchFlaskPrice, buy: RPG.alchBuyFlask, stock: true,
        noSell: true, noGold: !!opts.noGold, title: "Порожні колби для алхімії" });
    }

    return { renderAlchemyRow, showAlchemy, renderFlaskShop };
  };
})(window.RPG);

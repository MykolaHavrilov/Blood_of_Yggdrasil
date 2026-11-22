// ============================================================
// page-game-shop.js — Екран локації: купівля й продаж у торговця (Шинок, Гільдія, Торгова гільдія).
// Частина page-game.js: RPG.gameParts.shop(G) викликається з pageGame() і повертає те, що потрібне іншим частинам.
// G — спільне екрана локації: save, msg, place, locData і функції з page-game.js та інших частин
// (G.renderAll, G.renderPlace, G.renderShop…); G.fighting — чи показується бій. Спільні помічники — RPG.ui (game-common.js).
// ============================================================

(function (RPG) {
  const { $, el, noteP, button, fmtNum, showMsg, itemLabel, lockMark, smallIcon, itemInfo } = RPG.ui;
  const T = x => (RPG.t ? RPG.t(x) : x);
  // Стовпчик із 5 золотих монет — кнопка швидкого продажу в торговця
  const COINS_SVG = '<svg viewBox="0 0 20 28" width="18" height="25" aria-hidden="true" focusable="false"><rect x="2.5" y="21.0" width="15" height="3" fill="#b07c0c"/><path d="M2.5 22.5h15" stroke="#7a5506" stroke-width=".5"/><ellipse cx="10" cy="24.0" rx="7.5" ry="2.2" fill="#9a6a08"/><ellipse cx="10" cy="21.0" rx="7.5" ry="2.2" fill="#ffd45a" stroke="#7a5506" stroke-width=".6"/><rect x="2.5" y="17.4" width="15" height="3" fill="#b07c0c"/><path d="M2.5 18.9h15" stroke="#7a5506" stroke-width=".5"/><ellipse cx="10" cy="20.4" rx="7.5" ry="2.2" fill="#9a6a08"/><ellipse cx="10" cy="17.4" rx="7.5" ry="2.2" fill="#ffd45a" stroke="#7a5506" stroke-width=".6"/><rect x="2.5" y="13.8" width="15" height="3" fill="#b07c0c"/><path d="M2.5 15.3h15" stroke="#7a5506" stroke-width=".5"/><ellipse cx="10" cy="16.8" rx="7.5" ry="2.2" fill="#9a6a08"/><ellipse cx="10" cy="13.8" rx="7.5" ry="2.2" fill="#ffd45a" stroke="#7a5506" stroke-width=".6"/><rect x="2.5" y="10.2" width="15" height="3" fill="#b07c0c"/><path d="M2.5 11.7h15" stroke="#7a5506" stroke-width=".5"/><ellipse cx="10" cy="13.2" rx="7.5" ry="2.2" fill="#9a6a08"/><ellipse cx="10" cy="10.2" rx="7.5" ry="2.2" fill="#ffd45a" stroke="#7a5506" stroke-width=".6"/><rect x="2.5" y="6.6" width="15" height="3" fill="#b07c0c"/><path d="M2.5 8.1h15" stroke="#7a5506" stroke-width=".5"/><ellipse cx="10" cy="9.6" rx="7.5" ry="2.2" fill="#9a6a08"/><ellipse cx="10" cy="6.6" rx="7.5" ry="2.2" fill="#ffd45a" stroke="#7a5506" stroke-width=".6"/><ellipse cx="8.3" cy="6.2" rx="3" ry=".7" fill="#fff6c8" opacity=".75"/></svg>';
  RPG.gameParts = RPG.gameParts || {};

  RPG.gameParts.shop = function (G) {
    const { save, msg } = G;
    // Функції з page-game.js та інших частин — через G (частини підключаються по черзі, тому не напряму)
    const renderAll = (...args) => G.renderAll(...args);

    // Купівля / продаж (Шинок, торговець Гільдії)
    // Після покупки кнопки «Купити» на пів секунди вимикаються — щоб не купити двічі випадково
    const BUY_PAUSE_MS = 500;
    let buyLockUntil = 0;
    function lockBuyButtons() {
      document.body.classList.add("buy-locked");
      setTimeout(() => document.body.classList.remove("buy-locked"), BUY_PAUSE_MS);
    }
    // opts: { priceOf(id), buy(save, id, qty), stock: true — продавати й речі з позначкою noShop,
    //        title — заголовок «Купити», noSell — без стовпця продажу, noGold — без рядка «Ваше золото» }
    function renderShop(box, shopIds, opts = {}) {
      const priceOf = opts.priceOf || RPG.shopSellPrice;
      const buyFn = opts.buy || RPG.buyItem;
      if (!opts.noGold) box.append(el("p", "status shop-gold", `Ваше золото: ${fmtNum(save.character.gold)}`));

      const cols = el("div", "row shop");
      const buyBox = el("div", "stack shop-list");
      buyBox.append(el("h3", null, opts.title || "Купити"));
      for (const id of shopIds) {
        const item = RPG.ITEMS[id];
        if (!item || (item.noShop && !opts.stock)) continue;
        const price = priceOf(id);
        const r = el("button", "shop-row shop-info");
        r.type = "button";
        r.append(smallIcon(id), el("span", "shop-name", item.name));
        if (item.levelReq > 1) r.append(el("small", "shop-lvl", `рів. ${item.levelReq}`));
        r.append(el("span", "shop-price" + (save.character.gold < price ? " is-short" : ""), `${fmtNum(price)} зол.`));
        const buy = async (qty = 1) => {
          if (Date.now() < buyLockUntil) return;          // пауза після покупки
          buyLockUntil = Date.now() + BUY_PAUSE_MS;
          lockBuyButtons();
          const res = buyFn(save, id, qty);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Куплено: ${item.name}${res.qty > 1 ? ` × ${res.qty}` : ""} за ${fmtNum(res.price)} золота.`);
          renderAll();
        };
        const stack = item.stackable ? (item.maxStack || 99) : 0;
        // Вікно покупки: опис + вибір кількості
        const build = () => {
          const box = itemInfo(id, 1, save);
          const most = Math.max(1, Math.min(RPG.BUY_MAX, Math.floor(save.character.gold / price)));
          const buyRow = el("div", "sell-qty");
          const minus = button("−", "wf wf-secondary qty-btn");
          const plus = button("+", "wf wf-secondary qty-btn");
          const qtyInput = el("input", "shop-qty");
          Object.assign(qtyInput, { type: "number", min: 1, max: RPG.BUY_MAX, step: 1, value: 1, inputMode: "numeric" });
          qtyInput.setAttribute("aria-label", `Кількість: ${item.name}`);
          const buySome = button("", "wf wf-button buy-btn", () => {
            const n = Math.floor(Number(qtyInput.value));
            if (!(n >= 1 && n <= RPG.BUY_MAX)) { showMsg(msg, `Вкажіть кількість від 1 до ${RPG.BUY_MAX}.`, true); return; }
            RPG.popover.hide();
            buy(n);
          });
          const upd = () => {
            const n = Math.min(RPG.BUY_MAX, Math.max(1, Math.floor(Number(qtyInput.value)) || 1));
            buySome.textContent = `Купити ${n} · ${fmtNum(price * n)} зол.`;
            buySome.disabled = save.character.gold < price * n;
          };
          const step = d => { qtyInput.value = Math.min(RPG.BUY_MAX, Math.max(1, (Number(qtyInput.value) || 1) + d)); upd(); };
          minus.addEventListener("click", () => step(-1));
          plus.addEventListener("click", () => step(1));
          qtyInput.addEventListener("input", upd);
          qtyInput.addEventListener("keydown", e => { if (e.key === "Enter") buySome.click(); });
          upd();
          buyRow.append(minus, qtyInput, plus);
          box.append(buyRow, buySome);
          if (most > 1) box.append(noteP(`На ваше золото — до ${fmtNum(most)} шт.`));
          return box;
        };
        RPG.bindTip(r, build, () => [
          stack && { text: `Повна комірка (${stack} шт.) · ${fmtNum(price * stack)} зол.`, className: "wf-secondary buy-btn",
            onClick: () => buy(stack), disabled: save.character.gold < price * stack,
            title: save.character.gold < price * stack ? "Не вистачає золота" : "" }
        ].filter(Boolean));
        buyBox.append(r);
      }

      const sellBox = el("div", "stack shop-list");
      sellBox.append(el("h3", null, "Продати (з інвентаря)"));
      if (!save.inventory.length) sellBox.append(el("p", "status", "Інвентар порожній. Вдягнені речі спершу зніміть."));
      // «Продати все» — усе з відкритим замком, крім квестових предметів, ключів і мішечків на пояс
      const sellList = RPG.sellAllCandidates(save);
      if (save.inventory.length) {
        const total = sellList.reduce((n, x) => n + x.price, 0);
        const allBtn = button(`Продати все · +${fmtNum(total)} зол.`, "wf wf-danger sell-all-btn", async () => {
          RPG.popover.hide();
          const now = RPG.sellAllCandidates(save);           // замки могли змінитися в описі речі
          if (!now.length) { showMsg(msg, "Нічого продати: усе в інвентарі під замком або не продається.", true); renderAll(); return; }
          const sum = now.reduce((n, x) => n + x.price, 0);
          const q = `Продати всі речі? З інвентаря буде продано ${now.length} клітинок з відкритим замком за ${fmtNum(sum)} золота. ` +
            "Речі під замком, квестові предмети, ключі й мішечки на пояс лишаться.";
          if (!confirm(RPG.t ? RPG.t(q) : q)) return;
          const res = RPG.sellAll(save);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Продано всі речі: ${fmtNum(res.count)} шт. (${res.kinds} клітинок) за ${fmtNum(res.gold)} золота.`);
          renderAll();
        });
        allBtn.disabled = !sellList.length;
        allBtn.title = sellList.length ? "" : "Нічого продати: усе під замком або не продається.";
        sellBox.append(allBtn);
      }
      save.inventory.forEach((entry, index) => {
        const item = RPG.ITEMS[entry.id];
        const unit = RPG.refSellPrice(entry);
        const qtyAll = entry.qty || 1;
        const line = el("div", "sell-line");
        const r = el("button", "shop-row shop-info");
        r.type = "button";
        const label = el("span", "shop-name", itemLabel(entry));
        if (RPG.hasRarity(entry.id)) label.classList.add("rt-" + RPG.rarityOf(entry));
        r.append(smallIcon(entry), label);
        const lm = lockMark(entry);
        if (lm) r.append(lm);
        // Ціна — скільки дасть кнопка «Продати» поруч (для стопки — за всю клітинку)
        const priceEl = el("span", "shop-price is-sell", `+${fmtNum(unit * qtyAll)} зол.`);
        if (qtyAll > 1) priceEl.title = T(`${fmtNum(qtyAll)} × ${fmtNum(unit)} зол.`);
        r.append(priceEl);
        if (RPG.isItemLocked(entry)) r.classList.add("is-locked");
        // Кнопка швидкого продажу (стовпчик монет) — продає всю клітинку одним натиском
        const quick = el("button", "quick-sell");
        quick.type = "button";
        quick.innerHTML = COINS_SVG;
        const noSell = item?.quest || item?.type === "quest" || item?.locked;
        const paintQuick = () => {
          const locked = RPG.isItemLocked(entry);
          quick.disabled = !!(noSell || locked);
          const t = noSell ? "Торговець це не купує."
            : locked ? RPG.LOCKED_REASON
            : `Продати${qtyAll > 1 ? ` (${qtyAll})` : ""} · +${fmtNum(unit * qtyAll)} зол.`;
          quick.title = T(t);
          quick.setAttribute("aria-label", T(t));
        };
        paintQuick();
        quick.addEventListener("click", e => { e.stopPropagation(); sell(qtyAll); });

        async function sell(qty) {
          RPG.popover.hide();
          const res = RPG.sellItem(save, index, qty);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Продано: ${RPG.itemFullName(entry)}${res.qty > 1 ? ` × ${res.qty}` : ""} за ${fmtNum(res.price)} золота.`);
          renderAll();
        }

        // Вікно продажу: опис + (для стопки) вибір кількості
        const build = () => {
          const box = itemInfo(entry, entry.qty, save, { onLock: async () => {
            await RPG.saveGame(save).catch(e => console.error(e));
            r.classList.toggle("is-locked", RPG.isItemLocked(entry));
            r.querySelector(".item-lock")?.replaceWith(lockMark(entry));
            paintQuick();
          } });
          if (entry.qty > 1) {
            const sellRow = el("div", "sell-qty");
            const minus = button("−", "wf wf-secondary qty-btn");
            const plus = button("+", "wf wf-secondary qty-btn");
            const qtyInput = el("input", "shop-qty");
            Object.assign(qtyInput, { type: "number", min: 1, max: entry.qty, step: 1, value: 1, inputMode: "numeric" });
            qtyInput.setAttribute("aria-label", `Кількість: ${item.name}`);
            const sellSome = button("", "wf wf-button", () => {
              const n = Math.floor(Number(qtyInput.value));
              if (!(n >= 1 && n <= entry.qty)) { showMsg(msg, `Вкажіть кількість від 1 до ${entry.qty}.`, true); return; }
              sell(n);
            });
            const upd = () => {
              const n = Math.min(entry.qty, Math.max(1, Math.floor(Number(qtyInput.value)) || 1));
              sellSome.textContent = `Продати ${n} · +${fmtNum(unit * n)} зол.`;
            };
            const step = d => { qtyInput.value = Math.min(entry.qty, Math.max(1, (Number(qtyInput.value) || 1) + d)); upd(); };
            minus.addEventListener("click", () => step(-1));
            plus.addEventListener("click", () => step(1));
            qtyInput.addEventListener("input", upd);
            qtyInput.addEventListener("keydown", e => { if (e.key === "Enter") sellSome.click(); });
            upd();
            sellRow.append(minus, qtyInput, plus);
            box.append(sellRow, sellSome);
          }
          return box;
        };
        RPG.bindTip(r, build, () => entry.qty > 1
          ? [{ text: `Продати все (${entry.qty}) · +${fmtNum(unit * entry.qty)} зол.`, className: "wf-secondary", onClick: () => sell(entry.qty) }]
          : [{ text: `Продати · +${fmtNum(unit)} зол.`, className: "wf-button", onClick: () => sell(1) }]);
        line.append(r, quick);
        sellBox.append(line);
      });

      cols.append(buyBox);
      if (!opts.noSell) cols.append(sellBox);        // opts.noSell — лише купівля (колби для алхімії поруч із крамницею)
      box.append(cols);
    }

    return { renderShop };
  };
})(window.RPG);

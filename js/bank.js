
(() => {
  "use strict";

  const LEDGER_KEY = "dodam_point_ledger_v5";
  const CATALOG_KEY = "dodam_task_catalog_v5";
  const MIGRATION_KEY = "dodam_point_ledger_v5_migrated";
  const originalGetFarmStats =
    typeof window.getFarmStats === "function" ? window.getFarmStats : null;

  const readJSON = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("포도은행 데이터 읽기 실패:", key, error);
      return fallback;
    }
  };

  const writeJSON = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  function currentTasks(){
    if (typeof tasks !== "undefined" && Array.isArray(tasks)) return tasks;
    return readJSON("dodam_tasks", []);
  }

  function currentRecords(){
    if (typeof records !== "undefined" && records && typeof records === "object") return records;
    return readJSON("dodam_records", {});
  }

  function currentPurchases(){
    if (typeof purchases !== "undefined" && Array.isArray(purchases)) return purchases;
    return readJSON("dodam_purchases", []);
  }

  function currentAdjustments(){
    if (typeof pointAdjustments !== "undefined" && Array.isArray(pointAdjustments)) return pointAdjustments;
    return readJSON("dodam_point_adjustments", []);
  }

  function normalizeTask(task){
    return {
      id: String(task?.id ?? ""),
      name: String(task?.name || task?.title || "삭제된 할 일"),
      points: Math.max(0, Number(task?.points ?? task?.score ?? 0) || 0),
      category: String(task?.category || "기타")
    };
  }

  function snapshotTaskCatalog(){
    const catalog = readJSON(CATALOG_KEY, {});
    currentTasks().forEach(task => {
      const normalized = normalizeTask(task);
      if (normalized.id) catalog[normalized.id] = normalized;
    });
    writeJSON(CATALOG_KEY, catalog);
    return catalog;
  }

  function readLedger(){
    const ledger = readJSON(LEDGER_KEY, []);
    return Array.isArray(ledger) ? ledger : [];
  }

  function saveLedger(ledger){
    const unique = new Map();
    ledger.forEach(entry => {
      if (entry && entry.key) unique.set(entry.key, entry);
    });
    const sorted = [...unique.values()].sort((a,b) =>
      String(a.date || "").localeCompare(String(b.date || "")) ||
      String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
    );
    writeJSON(LEDGER_KEY, sorted);
    return sorted;
  }

  function snapshotRoutinePoints(){
    const catalog = snapshotTaskCatalog();
    const ledger = readLedger();
    const existing = new Set(ledger.map(entry => entry.key));
    const recordsData = currentRecords();

    Object.entries(recordsData).forEach(([date, record]) => {
      const done = Array.isArray(record?.done) ? record.done : [];
      done.forEach(taskIdRaw => {
        const taskId = String(taskIdRaw);
        const key = `routine:${date}:${taskId}`;
        if (existing.has(key)) return;

        const task = catalog[taskId];
        if (!task) return;

        ledger.push({
          key,
          type:"routine",
          date,
          createdAt:`${date}T23:59:00`,
          amount:Number(task.points) || 0,
          reason:task.name,
          category:task.category,
          taskId
        });
        existing.add(key);
      });
    });

    saveLedger(ledger);
  }

  function syncAdjustmentEntries(){
    const ledger = readLedger().filter(entry => entry.type !== "adjustment");
    currentAdjustments().forEach((item, index) => {
      const amount = Number(item?.amount ?? item?.points ?? item?.value ?? 0) || 0;
      const date = String(item?.date || item?.createdAt || new Date().toISOString()).slice(0,10);
      ledger.push({
        key:`adjustment:${item?.id ?? item?.createdAt ?? date}:${index}`,
        type:"adjustment",
        date,
        createdAt:String(item?.createdAt || `${date}T12:00:00`),
        amount,
        reason:String(item?.reason || item?.name || "엄마 직접 조정"),
        category:"직접 조정"
      });
    });
    saveLedger(ledger);
  }

  function syncPurchaseEntries(){
    const ledger = readLedger().filter(entry => entry.type !== "purchase");
    currentPurchases().forEach((item, index) => {
      const price = Math.max(0, Number(item?.price ?? item?.points ?? item?.cost ?? 0) || 0);
      const date = String(item?.date || item?.createdAt || new Date().toISOString()).slice(0,10);
      ledger.push({
        key:`purchase:${item?.id ?? item?.createdAt ?? date}:${index}`,
        type:"purchase",
        date,
        createdAt:String(item?.createdAt || `${date}T18:00:00`),
        amount:-price,
        reason:String(item?.name || item?.itemName || item?.title || "마을 상품 교환"),
        category:"포도마을"
      });
    });
    saveLedger(ledger);
  }

  function syncAll(){
    // 삭제 직전에도 호출되므로, 현재 할 일의 이름과 점수를 먼저 영구 보관한다.
    snapshotTaskCatalog();
    snapshotRoutinePoints();
    syncAdjustmentEntries();
    syncPurchaseEntries();
    localStorage.setItem(MIGRATION_KEY, "1");
    renderBankPanel();
  }

  function getSummary(){
    const ledger = readLedger();
    const earned = ledger
      .filter(entry => Number(entry.amount) > 0)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const spent = ledger
      .filter(entry => Number(entry.amount) < 0)
      .reduce((sum, entry) => sum + Math.abs(Number(entry.amount || 0)), 0);
    return {
      ledger,
      earned,
      spent,
      balance:Math.max(0, earned - spent)
    };
  }

  function completedDaysAndGrapes(){
    const recordsData = currentRecords();
    const completedDays = Object.values(recordsData)
      .filter(record => record?.completed).length;
    return {completedDays, grapes:completedDays};
  }

  function ledgerGetFarmStats(){
    const summary = getSummary();
    const base = originalGetFarmStats ? originalGetFarmStats() : {};
    const growth = completedDaysAndGrapes();

    return {
      ...base,
      completedDays:growth.completedDays,
      grapes:growth.grapes,
      totalScore:summary.earned,
      earnedPoints:summary.earned,
      totalEarned:summary.earned,
      spentPoints:summary.spent,
      totalSpent:summary.spent,
      availablePoints:summary.balance,
      balance:summary.balance
    };
  }

  function formatDate(date){
    const value = String(date || "");
    const parts = value.split("-");
    return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : value;
  }

  function renderBankPanel(){
    const dashboard = document.querySelector("#momDashboard");
    if (!dashboard) return;

    let panel = document.querySelector("#grapeBankPanel");
    if (!panel){
      panel = document.createElement("section");
      panel.id = "grapeBankPanel";
      panel.className = "grape-bank-panel";
      const grid = dashboard.querySelector(".mom-grid");
      if (grid) grid.insertAdjacentElement("afterend", panel);
      else dashboard.appendChild(panel);
    }

    const summary = getSummary();
    const recent = [...summary.ledger].reverse().slice(0, 30);

    panel.innerHTML = `
      <div class="grape-bank-head">
        <h3>🍇 포도은행 거래내역</h3>
        <div class="grape-bank-balance">현재 잔액<strong>${summary.balance}점</strong></div>
      </div>
      <div class="grape-bank-list">
        ${recent.length ? recent.map(entry => `
          <div class="grape-bank-row">
            <div class="grape-bank-date">${formatDate(entry.date)}</div>
            <div class="grape-bank-reason">
              ${entry.reason}
              <small>${entry.category || (entry.type === "routine" ? "루틴 완료" : "포인트")}</small>
            </div>
            <div class="grape-bank-amount ${Number(entry.amount)>=0 ? "plus":"minus"}">
              ${Number(entry.amount)>=0 ? "+":""}${Number(entry.amount)}점
            </div>
          </div>`).join("") :
          '<div class="grape-bank-empty">아직 거래내역이 없어요.</div>'}
      </div>
      <div class="bank-protection-note">
        할 일을 수정하거나 삭제해도 이미 완료해서 받은 포인트는 거래내역에 남아 사라지지 않아요.
      </div>`;

    const earned = document.querySelector("#momEarned");
    const spent = document.querySelector("#momSpent");
    const balance = document.querySelector("#momBalance");
    if (earned) earned.textContent = summary.earned + "점";
    if (spent) spent.textContent = summary.spent + "점";
    if (balance) balance.textContent = summary.balance + "점";
  }

  // 기존 점수 계산을 거래내역 기반으로 교체한다.
  try { window.getFarmStats = ledgerGetFarmStats; } catch (_) {}

  // 저장/삭제가 실행되기 전에 현재 루틴 점수와 과거 완료기록을 먼저 보존한다.
  document.addEventListener("click", event => {
    const target = event.target.closest(
      "#saveSettings, #addTask, .mini-del, #resetToday, .task-check, #applyPoint, .buy-btn, .shop-buy"
    );
    if (!target) return;

    snapshotTaskCatalog();
    snapshotRoutinePoints();

    setTimeout(() => {
      syncAll();
      if (typeof renderAll === "function") renderAll();
      renderBankPanel();
    }, 40);
  }, true);

  window.addEventListener("storage", syncAll);
  window.addEventListener("dodam-shop-updated", () => setTimeout(syncAll, 20));

  // 과거 기록을 최초 1회 포도은행으로 이전한다.
  syncAll();
  setTimeout(() => {
    if (typeof renderAll === "function") renderAll();
    renderBankPanel();
  }, 80);

  window.GrapeBank = {
    sync:syncAll,
    getSummary,
    getLedger:readLedger
  };
})();

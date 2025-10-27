// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Funnel + Insight + Manual Inboxes + Auto Save)
// Version: Funnel Step 2.2 (Pro UX Edition)
// Author: ChatGPT (Optimized for Beauty Clinic CRM)
// ================================================================================

console.log("[Script Load] report-2.js (Funnel + Insight v2.2) executing...");

window.reportState = window.reportState || { coreData: null };
const state = window.reportState;
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------
function formatCurrency(n, showSign = false, decimals = 0) {
  if (isNaN(n)) return "0";
  const fixed = n.toFixed(decimals);
  const parts = fixed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return showSign ? `฿${parts}` : parts;
}
function formatNumber(n) {
  if (isNaN(n)) return "0";
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ----------------------------------------------------------------------
// Core Funnel Logic
// ----------------------------------------------------------------------
function calculateAndUpdateFunnel() {
  if (!state.coreData) return;

  const budgetInput = document.getElementById("funnel-budget-input");
  const inboxInput = document.getElementById("funnel-inboxes-input");
  const inboxesDisplay = document.getElementById("funnel-inboxes");
  const leadsActualEl = document.getElementById("funnel-leads-actual");
  const leadsTargetEl = document.getElementById("funnel-leads-target");
  const salesActualEl = document.getElementById("funnel-sales-actual");
  const overallCplEl = document.getElementById("funnel-overall-cpl");

  // ✅ อ่านค่าที่กรอก (และจำไว้ใน localStorage)
  const overallBudget = parseFloat(budgetInput.value) || 0;
  const manualInboxes = inboxInput.value ? parseFloat(inboxInput.value) : null;

  localStorage.setItem("reportV2_budget", overallBudget || "");
  if (manualInboxes !== null) localStorage.setItem("reportV2_inboxes", manualInboxes || "");

  // ✅ ใช้ค่าที่กรอกจากช่อง input ถ้ามี
  let totalInboxes =
    manualInboxes !== null
      ? manualInboxes
      : state.coreData.total_customers || 0;
  const actualLeads = state.coreData.qualified_leads || 0;
  const actualSales = state.coreData.closed_sales || 0;

  const targetLeads = Math.round(
    totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100)
  );
  const overallCPL =
    actualLeads > 0 && overallBudget > 0
      ? overallBudget / actualLeads
      : 0;

  // ✅ แสดงผล
  inboxesDisplay.textContent = formatNumber(totalInboxes);
  leadsActualEl.textContent = formatNumber(actualLeads);
  leadsTargetEl.textContent = formatNumber(targetLeads);
  salesActualEl.textContent = formatNumber(actualSales);
  overallCplEl.textContent =
    overallCPL > 0 ? formatCurrency(overallCPL, true, 2) : "0";

  updateInsightSummary(totalInboxes, actualLeads, targetLeads, actualSales, overallCPL);
}

// ----------------------------------------------------------------------
// Insight Summary
// ----------------------------------------------------------------------
function updateInsightSummary(inboxes, leads, targetLeads, sales, cpl) {
  let container = document.getElementById("insight-summary");
  if (!container) {
    container = document.createElement("div");
    container.id = "insight-summary";
    container.style =
      "margin-top:40px;padding:20px;border-radius:12px;text-align:center;font-family:Sarabun,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.05);transition:0.3s;";
    document.querySelector(".content").appendChild(container);
  }

  // สีพื้นตามสถานะ
  let bgColor = "#f8f9ff";
  let borderColor = "#dde1ff";
  const leadRatio = leads / targetLeads;
  if (leadRatio >= 1.2) {
    bgColor = "#e6ffed"; borderColor = "#9be6a5";
  } else if (leadRatio >= 0.8) {
    bgColor = "#fffde6"; borderColor = "#e6df9b";
  } else {
    bgColor = "#ffeaea"; borderColor = "#f0b3b3";
  }

  const leadDiff = leads - targetLeads;
  let leadPerformance =
    leadDiff > 0
      ? `ยอด Leads เกินเป้า <b style="color:#3c7;">+${formatNumber(leadDiff)}</b> (${(
          leadRatio * 100
        ).toFixed(0)}%) 🎯`
      : leadDiff < 0
      ? `ยอด Leads ต่ำกว่าเป้า <b style="color:#c33;">${formatNumber(
          Math.abs(leadDiff)
        )}</b> (${(leadRatio * 100).toFixed(0)}%) ⚠️`
      : "ยอด Leads ถึงเป้าพอดี ✅";

  let salesComment =
    sales === 0
      ? "ยังไม่มียอดปิดการขายในรอบนี้"
      : sales < leads * 0.2
      ? "อัตราปิดการขายต่ำกว่าค่าเฉลี่ย ควรทบทวนขั้นตอนติดตามลูกค้า"
      : "อัตราปิดการขายอยู่ในระดับที่ดี 👍";

  container.style.background = bgColor;
  container.style.border = `1px solid ${borderColor}`;

  container.innerHTML = `
    <h3 style="color:#334;font-size:1.1rem;margin-bottom:10px;">📊 Insight Summary</h3>
    <p style="color:#333;margin:6px 0;">${leadPerformance}</p>
    <p style="color:#333;margin:6px 0;">${salesComment}</p>
    <p style="color:#555;margin:8px 0;">CPL เฉลี่ยปัจจุบันอยู่ที่ <b style="color:#667eea;">${formatCurrency(
      cpl,
      true,
      2
    )}</b></p>
  `;
}

// ----------------------------------------------------------------------
// Input + LocalStorage Restore
// ----------------------------------------------------------------------
function handleInputChange(e) {
  if (["funnel-budget-input", "funnel-inboxes-input"].includes(e.target.id)) {
    calculateAndUpdateFunnel();
  }
}

function restoreSavedInputs() {
  const budgetInput = document.getElementById("funnel-budget-input");
  const inboxInput = document.getElementById("funnel-inboxes-input");
  const savedBudget = localStorage.getItem("reportV2_budget");
  const savedInboxes = localStorage.getItem("reportV2_inboxes");

  if (savedBudget && budgetInput) budgetInput.value = savedBudget;
  if (savedInboxes && inboxInput) inboxInput.value = savedInboxes;
}

// ----------------------------------------------------------------------
// Init
// ----------------------------------------------------------------------
function initializeReportInternally() {
  restoreSavedInputs();
  document
    .getElementById("funnel-budget-input")
    ?.addEventListener("input", handleInputChange);
  document
    .getElementById("funnel-inboxes-input")
    ?.addEventListener("input", handleInputChange);

  calculateAndUpdateFunnel();
  console.log("[Init] Funnel initialized with manual inbox + autosave.");
}

// ----------------------------------------------------------------------
// Entry
// ----------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  if (window.myReportData?.core_metrics) {
    state.coreData = window.myReportData.core_metrics;
    initializeReportInternally();
  } else {
    console.error("[Error] No core data found");
  }
});

console.log("[Script Ready] report-2.js (Funnel + Insight v2.2 PRO UX) loaded.");

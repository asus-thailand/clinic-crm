// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Funnel + Insight Summary)
// Version: Funnel Step 2.0 (Supabase + Insights + Fallback)
// Author: ChatGPT (Optimized for Beauty Clinic CRM)
// ================================================================================

console.log("[Script Load] report-2.js (Funnel + Insight v2.0) executing...");

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

function displayError(error) {
  console.error("[DisplayError]", error);
  removeLoadingOverlay();
  const errMsg = document.createElement("div");
  errMsg.style.background = "#ffe6e6";
  errMsg.style.color = "#a33";
  errMsg.style.padding = "12px";
  errMsg.style.margin = "10px 0";
  errMsg.style.border = "1px solid #f99";
  errMsg.style.borderRadius = "6px";
  errMsg.style.fontWeight = "600";
  errMsg.style.fontSize = "0.95rem";
  errMsg.textContent =
    "⚠️ " + (error?.message || "เกิดข้อผิดพลาดขณะประมวลผลรายงาน");
  document.body.prepend(errMsg);
}

// ----------------------------------------------------------------------
// Loading Overlay
// ----------------------------------------------------------------------
function showLoadingOverlay(message = "กำลังโหลดข้อมูลจากระบบ...") {
  let overlay = document.getElementById("loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.style =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(255,255,255,0.9);display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:Sarabun,sans-serif;z-index:9999;";
    overlay.innerHTML = `
        <div style="border:6px solid #ccc;border-top:6px solid #667eea;border-radius:50%;width:60px;height:60px;animation:spin 1s linear infinite;"></div>
        <p style="margin-top:20px;color:#333;font-weight:600;">${message}</p>
        <style>@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}</style>
      `;
    document.body.appendChild(overlay);
  }
}

function removeLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.remove();
}

// ----------------------------------------------------------------------
// Core Funnel Logic
// ----------------------------------------------------------------------
function calculateAndUpdateFunnel() {
  console.log("[CalculateFunnel v2.0] Updating...");

  if (!state.coreData) {
    console.warn("[CalculateFunnel] No core data found in state.");
    return;
  }

  const budgetInput = document.getElementById("funnel-budget-input");
  const inboxesDisplay = document.getElementById("funnel-inboxes");
  const leadsActualEl = document.getElementById("funnel-leads-actual");
  const leadsTargetEl = document.getElementById("funnel-leads-target");
  const salesActualEl = document.getElementById("funnel-sales-actual");
  const overallCplEl = document.getElementById("funnel-overall-cpl");

  if (
    !budgetInput ||
    !inboxesDisplay ||
    !leadsActualEl ||
    !leadsTargetEl ||
    !salesActualEl ||
    !overallCplEl
  ) {
    displayError(new Error("องค์ประกอบหน้าเว็บบางส่วนหายไป (Funnel)"));
    return;
  }

  const overallBudget = parseFloat(budgetInput.value) || 0;
  const totalInboxes = state.coreData.total_customers || 0;
  const actualLeads = state.coreData.qualified_leads || 0;
  const actualSales = state.coreData.closed_sales || 0;
  const targetLeads = Math.round(
    totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100)
  );
  const overallCPL =
    actualLeads > 0 && overallBudget > 0 ? overallBudget / actualLeads : 0;

  inboxesDisplay.textContent = formatNumber(totalInboxes);
  leadsActualEl.textContent = formatNumber(actualLeads);
  leadsTargetEl.textContent = formatNumber(targetLeads);
  salesActualEl.textContent = formatNumber(actualSales);
  overallCplEl.textContent =
    overallCPL > 0 ? formatCurrency(overallCPL, true, 2) : "0";

  updateInsightSummary(totalInboxes, actualLeads, targetLeads, actualSales, overallCPL);

  console.log("[CalculateFunnel] Done:", {
    totalInboxes,
    actualLeads,
    targetLeads,
    actualSales,
    overallCPL,
  });
}

// ----------------------------------------------------------------------
// Insight Summary (Auto Analysis)
// ----------------------------------------------------------------------
function updateInsightSummary(inboxes, leads, targetLeads, sales, cpl) {
  let container = document.getElementById("insight-summary");
  if (!container) {
    container = document.createElement("div");
    container.id = "insight-summary";
    container.style =
      "margin-top:40px;padding:20px;background:#f8f9ff;border:1px solid #dde1ff;border-radius:12px;text-align:center;font-family:Sarabun,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.05);";
    document.querySelector(".content").appendChild(container);
  }

  let leadPerformance = "";
  const leadDiff = leads - targetLeads;
  if (leadDiff > 0) {
    leadPerformance = `ยอด Leads เกินเป้า <b style="color:#3c7;">+${formatNumber(
      leadDiff
    )}</b> (${((leads / targetLeads) * 100).toFixed(0)}%) 🎯`;
  } else if (leadDiff < 0) {
    leadPerformance = `ยอด Leads ต่ำกว่าเป้า <b style="color:#c33;">${formatNumber(
      Math.abs(leadDiff)
    )}</b> (${((leads / targetLeads) * 100).toFixed(0)}%) ⚠️`;
  } else {
    leadPerformance = "ยอด Leads ถึงเป้าพอดี ✅";
  }

  let salesComment = "";
  if (sales === 0) salesComment = "ยังไม่มียอดปิดการขายในรอบนี้";
  else if (sales < leads * 0.2)
    salesComment = "อัตราปิดการขายต่ำกว่าค่าเฉลี่ย ควรทบทวนขั้นตอนติดตามลูกค้า";
  else salesComment = "อัตราปิดการขายอยู่ในระดับที่ดี 👍";

  const insightHTML = `
    <h3 style="color:#334;font-size:1.1rem;margin-bottom:10px;">📊 Insight Summary</h3>
    <p style="color:#333;margin:6px 0;">${leadPerformance}</p>
    <p style="color:#333;margin:6px 0;">${salesComment}</p>
    <p style="color:#555;margin:8px 0;">CPL เฉลี่ยปัจจุบันอยู่ที่ <b style="color:#667eea;">${formatCurrency(
      cpl,
      true,
      2
    )}</b></p>
  `;
  container.innerHTML = insightHTML;
}

// ----------------------------------------------------------------------
// Input + Init
// ----------------------------------------------------------------------
function handleFunnelInputChange(e) {
  if (e.target.id === "funnel-budget-input") {
    if (parseFloat(e.target.value) < 0) e.target.value = 0;
    calculateAndUpdateFunnel();
  }
}

function addFunnelInputListeners() {
  const input = document.getElementById("funnel-budget-input");
  if (input) {
    input.addEventListener("input", handleFunnelInputChange);
  }
}

// ----------------------------------------------------------------------
// Supabase Fetch
// ----------------------------------------------------------------------
async function fetchReportDataFromSupabase() {
  showLoadingOverlay("กำลังโหลดข้อมูลจากระบบ Supabase...");
  try {
    const userId = localStorage.getItem("crm_user_id") || "demo_user";
    if (!window.apiV2 || !window.supabaseClient)
      throw new Error("Supabase API not ready");

    const reportData = await window.apiV2.getSalesReportV2(userId);
    if (reportData && reportData.core_metrics)
      state.coreData = reportData.core_metrics;
    else state.coreData = window.myReportData?.core_metrics || {};
  } catch (err) {
    console.error("[Supabase Fetch] Error:", err);
    state.coreData = window.myReportData?.core_metrics || {};
    displayError(
      new Error("โหลดข้อมูลจาก Supabase ไม่สำเร็จ (ใช้ mock data แทน)")
    );
  }
  removeLoadingOverlay();
  initializeReportInternally();
}

// ----------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------
function initializeReportInternally() {
  addFunnelInputListeners();
  calculateAndUpdateFunnel();
  console.log("[Init] Funnel initialized successfully.");
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[DOM Ready v2.0] Funnel + Insights initializing...");
  const required = [
    "funnel-budget-input",
    "funnel-inboxes",
    "funnel-leads-actual",
  ];
  for (const id of required) {
    if (!document.getElementById(id)) {
      displayError(new Error("โครงสร้างหน้าเว็บสำหรับ Funnel ไม่สมบูรณ์"));
      return;
    }
  }

  if (window.apiV2 && window.supabaseClient) {
    fetchReportDataFromSupabase();
  } else if (window.myReportData && window.myReportData.core_metrics) {
    state.coreData = window.myReportData.core_metrics;
    initializeReportInternally();
  } else {
    displayError(new Error("ไม่พบข้อมูลรายงานเริ่มต้น (ทั้ง Supabase และ Mock)"));
  }
});

console.log("[Script Ready] report-2.js (Funnel + Insight v2.0) loaded.");

// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Updated Funnel Logic)
// Version: Funnel Step 2.0 (User Editable Inboxes + Actual Data Fetch)
// Author: ChatGPT Custom Build for FBC
// ================================================================================

console.log("[Script Load] report-2.js (Funnel v2.0) executing...");

// --------------------------------------------------------------------------------
// GLOBAL STATE
// --------------------------------------------------------------------------------
window.reportState = window.reportState || { coreData: null };
const state = window.reportState;
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// --------------------------------------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------------------------------------
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
    errMsg.textContent = "⚠️ " + (error?.message || "เกิดข้อผิดพลาดขณะประมวลผลรายงาน");
    document.body.prepend(errMsg);
}

// --------------------------------------------------------------------------------
// LOADING UI
// --------------------------------------------------------------------------------
function showLoadingOverlay(message = "กำลังโหลดข้อมูลจากระบบ...") {
    let overlay = document.getElementById("loading-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "loading-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.background = "rgba(255,255,255,0.9)";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.justifyContent = "center";
        overlay.style.alignItems = "center";
        overlay.style.fontFamily = "Sarabun, sans-serif";
        overlay.style.zIndex = "9999";
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

// --------------------------------------------------------------------------------
// MAIN FUNNEL LOGIC
// --------------------------------------------------------------------------------
function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v2.0] Updating...");

    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxInput = document.getElementById('funnel-inboxes-input');
    const leadsActualEl = document.getElementById('funnel-leads-actual');
    const leadsTargetEl = document.getElementById('funnel-leads-target');
    const salesActualEl = document.getElementById('funnel-sales-actual');
    const overallCplEl = document.getElementById('funnel-overall-cpl');

    if (!budgetInput || !inboxInput || !leadsActualEl || !leadsTargetEl || !salesActualEl || !overallCplEl) {
        displayError(new Error("องค์ประกอบหน้าเว็บบางส่วนหายไป (Funnel)"));
        return;
    }

    const overallBudget = parseFloat(budgetInput.value) || 0;
    const totalInboxes = parseFloat(inboxInput.value) || 0;

    const actualLeads = parseFloat(state.coreData?.total_customers) || 0; // ตัวเลขจริง
    const actualSales = parseFloat(state.coreData?.closed_sales) || 0;     // ตัวเลขจริง
    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100));
    const overallCPL = (overallBudget > 0 && actualLeads > 0)
        ? (overallBudget / actualLeads)
        : 0;

    leadsActualEl.textContent = formatNumber(actualLeads);
    leadsTargetEl.textContent = formatNumber(targetLeads);
    salesActualEl.textContent = formatNumber(actualSales);
    overallCplEl.textContent = (overallCPL > 0)
        ? formatCurrency(overallCPL, true, 2)
        : "0";

    console.log("[CalculateFunnel] Done:", {
        totalInboxes, actualLeads, targetLeads, actualSales, overallCPL
    });
}

// --------------------------------------------------------------------------------
// INPUT HANDLERS
// --------------------------------------------------------------------------------
function handleFunnelInputChange(event) {
    const id = event.target.id;
    if (id === 'funnel-budget-input' || id === 'funnel-inboxes-input') {
        if (parseFloat(event.target.value) < 0) event.target.value = 0;
        calculateAndUpdateFunnel();
    }
}

function addFunnelInputListeners() {
    ['funnel-budget-input', 'funnel-inboxes-input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.removeEventListener('input', handleFunnelInputChange);
            el.addEventListener('input', handleFunnelInputChange);
        }
    });
}

// --------------------------------------------------------------------------------
// INITIALIZATION
// --------------------------------------------------------------------------------
function initializeReportInternally() {
    console.log("[Init] Starting Funnel setup...");
    try {
        addFunnelInputListeners();
        // โหลด mock หรือข้อมูลจริง
        if (!state.coreData && window.myReportData?.core_metrics) {
            state.coreData = window.myReportData.core_metrics;
        }
        calculateAndUpdateFunnel();
        console.log("[Init] Funnel initialized successfully.");
    } catch (err) {
        console.error("[Init] Error:", err);
        displayError(err);
    }
}

document.addEventListener('DOMContentLoaded', initializeReportInternally);

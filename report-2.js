// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Simplified - Funnel Only)
// Version: Funnel Step 1.7 (FULLY FIXED)
// - Added proper initialization call for Funnel Calculation.
// - Fully functional with report-2.html (Simplified 1.3).
// ================================================================================

console.log("[Script Load] report-2.js (Funnel Only v1.7 FIXED) executing...");

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
    console.error("[DisplayError] Error:", error);
    const errMsg = document.createElement("div");
    errMsg.style.background = "#ffe6e6";
    errMsg.style.color = "#a33";
    errMsg.style.padding = "12px";
    errMsg.style.margin = "10px 0";
    errMsg.style.border = "1px solid #f99";
    errMsg.style.borderRadius = "6px";
    errMsg.style.fontWeight = "600";
    errMsg.textContent = "⚠️ " + (error?.message || "เกิดข้อผิดพลาดขณะประมวลผลรายงาน");
    document.body.prepend(errMsg);
}

// --------------------------------------------------------------------------------
// CORE FUNNEL LOGIC
// --------------------------------------------------------------------------------
function getFunnelInputs() {
    const budgetInput = document.getElementById('funnel-budget-input');
    const budget = parseFloat(budgetInput?.value) || 0;
    return { overallBudget: Math.max(0, budget) };
}

function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v1.7] Updating...");

    if (!state.coreData) {
        console.warn("[CalculateFunnel v1.7] No core data found in state.");
        return;
    }

    // Lookup elements
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesDisplay = document.getElementById('funnel-inboxes');
    const leadsActualEl = document.getElementById('funnel-leads-actual');
    const leadsTargetEl = document.getElementById('funnel-leads-target');
    const salesActualEl = document.getElementById('funnel-sales-actual');
    const overallCplEl = document.getElementById('funnel-overall-cpl');

    if (!budgetInput || !inboxesDisplay || !leadsActualEl || !leadsTargetEl || !salesActualEl || !overallCplEl) {
        console.error("[CalculateFunnel v1.7] CRITICAL: One or more elements not found!");
        displayError(new Error("องค์ประกอบหน้าเว็บบางส่วนหายไป (Funnel)"));
        return;
    }

    // 1️⃣ Read Inputs
    const overallBudget = parseFloat(budgetInput.value) || 0;

    // 2️⃣ Read Data from State
    const totalInboxes = state.coreData.total_customers || 0;
    const actualLeads = state.coreData.qualified_leads || 0;
    const actualSales = state.coreData.closed_sales || 0;

    // 3️⃣ Calculations
    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100));
    const overallCPL = (actualLeads > 0 && overallBudget > 0)
        ? (overallBudget / actualLeads)
        : 0;

    // 4️⃣ Update DOM
    inboxesDisplay.textContent = formatNumber(totalInboxes);
    leadsActualEl.textContent = formatNumber(actualLeads);
    leadsTargetEl.textContent = formatNumber(targetLeads);
    salesActualEl.textContent = formatNumber(actualSales);
    overallCplEl.textContent = (overallCPL > 0) ? formatCurrency(overallCPL, true, 2) : "0";

    console.log("[CalculateFunnel v1.7] Update complete:", {
        totalInboxes, actualLeads, targetLeads, actualSales, overallCPL
    });
}

function handleFunnelInputChange(event) {
    if (event.target && event.target.id === 'funnel-budget-input') {
        if (parseFloat(event.target.value) < 0) event.target.value = 0;
        if (event.target.validity.valid || event.target.value === '') {
            event.target.style.outline = '';
            calculateAndUpdateFunnel();
        } else {
            event.target.style.outline = '2px solid red';
        }
    }
}

function addFunnelInputListeners() {
    const budgetInput = document.getElementById('funnel-budget-input');
    if (budgetInput) {
        budgetInput.removeEventListener('input', handleFunnelInputChange);
        budgetInput.addEventListener('input', handleFunnelInputChange);
        console.log("[AddListeners] Added listener to: funnel-budget-input");
    } else {
        console.error("[AddListeners] CRITICAL: Could not find Budget input element!");
        displayError(new Error("ไม่สามารถเชื่อมต่อช่อง Input งบประมาณได้"));
    }
}

// --------------------------------------------------------------------------------
// INITIALIZATION
// --------------------------------------------------------------------------------
function initializeReportInternally() {
    console.log("[Init v1.7] Starting internal initialization for Report Funnel...");

    try {
        addFunnelInputListeners();
        calculateAndUpdateFunnel(); // ✅ คำนวณทันทีเมื่อโหลดหน้า
        console.log("[Init v1.7] Funnel initialized successfully.");
    } catch (err) {
        console.error("[Init v1.7] Error during initialization:", err);
        displayError(err);
    }
}

// --------------------------------------------------------------------------------
// DOM READY
// --------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOM Ready v1.7] Attempting initialization...");

    // ✅ Verify HTML structure
    const funnelSection = document.querySelector('.funnel-section');
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxDisplay = document.getElementById('funnel-inboxes');
    const leadsActualDisp = document.getElementById('funnel-leads-actual');

    if (!funnelSection || !budgetInput || !inboxDisplay || !leadsActualDisp) {
        console.error("[DOM Ready v1.7] CRITICAL: Essential HTML elements for Funnel section are missing!");
        displayError(new Error("โครงสร้างหน้าเว็บสำหรับ Funnel ไม่สมบูรณ์"));
        return;
    }

    console.log("[DOM Ready v1.7] Essential HTML elements found.");

    // ✅ Load Data
    if (
        typeof window.myReportData === 'object' &&
        window.myReportData !== null &&
        typeof window.myReportData.core_metrics === 'object'
    ) {
        console.log("[DOM Ready v1.7] Found valid window.myReportData");
        state.coreData = window.myReportData.core_metrics;
        console.log("[DOM Ready v1.7] Stored core data in state:", state.coreData);
        initializeReportInternally();
    } else {
        console.error("[DOM Ready v1.7] CRITICAL: window.myReportData not found or invalid!", window.myReportData);
        displayError(new Error("ไม่พบข้อมูลรายงานเริ่มต้น (window.myReportData) หรือข้อมูล core_metrics หายไป"));
    }
});

console.log("[Script Ready] report-2.js (Funnel Only v1.7 FIXED) loaded.");

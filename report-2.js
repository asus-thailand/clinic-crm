// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Simplified - Funnel Only)
// Version: Funnel Step 1.9 (SUPABASE + LOADING UI + AUTO FALLBACK)
// Author: ChatGPT (Optimized for Beauty Clinic CRM)
// ================================================================================

console.log("[Script Load] report-2.js (Funnel Only v1.9 PRODUCTION) executing...");

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
    removeLoadingOverlay(); // ปิดโหลดถ้ามี
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
// LOADING UI HANDLER
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
// CORE FUNNEL LOGIC
// --------------------------------------------------------------------------------
function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v1.9] Updating...");

    if (!state.coreData) {
        console.warn("[CalculateFunnel] No core data found in state.");
        return;
    }

    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesDisplay = document.getElementById('funnel-inboxes');
    const leadsActualEl = document.getElementById('funnel-leads-actual');
    const leadsTargetEl = document.getElementById('funnel-leads-target');
    const salesActualEl = document.getElementById('funnel-sales-actual');
    const overallCplEl = document.getElementById('funnel-overall-cpl');

    if (!budgetInput || !inboxesDisplay || !leadsActualEl || !leadsTargetEl || !salesActualEl || !overallCplEl) {
        console.error("[CalculateFunnel] Missing elements!");
        displayError(new Error("องค์ประกอบหน้าเว็บบางส่วนหายไป (Funnel)"));
        return;
    }

    const overallBudget = parseFloat(budgetInput.value) || 0;

    const totalInboxes = state.coreData.total_customers || 0;
    const actualLeads = state.coreData.qualified_leads || 0;
    const actualSales = state.coreData.closed_sales || 0;

    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100));
    const overallCPL = (actualLeads > 0 && overallBudget > 0)
        ? (overallBudget / actualLeads)
        : 0;

    inboxesDisplay.textContent = formatNumber(totalInboxes);
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
// INPUT EVENT HANDLER
// --------------------------------------------------------------------------------
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
        console.log("[AddListeners] Attached to budget input.");
    } else {
        displayError(new Error("ไม่พบช่อง Input งบประมาณในหน้า HTML"));
    }
}

// --------------------------------------------------------------------------------
// SUPABASE FETCH
// --------------------------------------------------------------------------------
async function fetchReportDataFromSupabase() {
    showLoadingOverlay("กำลังโหลดข้อมูลจากระบบ Supabase...");
    console.log("[Supabase Fetch] Starting...");

    try {
        const userId = localStorage.getItem("crm_user_id") || "demo_user";
        if (!window.apiV2 || !window.supabaseClient) {
            throw new Error("Supabase API not ready");
        }

        const reportData = await window.apiV2.getSalesReportV2(userId);
        console.log("[Supabase Fetch] Raw:", reportData);

        if (reportData && reportData.core_metrics) {
            state.coreData = reportData.core_metrics;
            console.log("[Supabase Fetch] Loaded:", state.coreData);
        } else {
            console.warn("[Supabase Fetch] Empty data, fallback to mock.");
            state.coreData = window.myReportData?.core_metrics || {};
        }
    } catch (err) {
        console.error("[Supabase Fetch] Error:", err);
        state.coreData = window.myReportData?.core_metrics || {};
        displayError(new Error("โหลดข้อมูลจาก Supabase ไม่สำเร็จ (ใช้ mock data แทน)"));
    }

    removeLoadingOverlay();
    initializeReportInternally();
}

// --------------------------------------------------------------------------------
// INITIALIZATION
// --------------------------------------------------------------------------------
function initializeReportInternally() {
    console.log("[Init] Starting Funnel setup...");
    try {
        addFunnelInputListeners();
        calculateAndUpdateFunnel();
        console.log("[Init] Funnel initialized successfully.");
    } catch (err) {
        console.error("[Init] Error:", err);
        displayError(err);
    }
}

// --------------------------------------------------------------------------------
// DOM READY
// --------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOM Ready v1.9] Initializing Funnel...");

    const funnelSection = document.querySelector('.funnel-section');
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxDisplay = document.getElementById('funnel-inboxes');
    const leadsActualDisp = document.getElementById('funnel-leads-actual');

    if (!funnelSection || !budgetInput || !inboxDisplay || !leadsActualDisp) {
        displayError(new Error("โครงสร้างหน้าเว็บสำหรับ Funnel ไม่สมบูรณ์"));
        return;
    }

    if (window.apiV2 && window.supabaseClient) {
        console.log("[DOM Ready] Supabase client detected.");
        fetchReportDataFromSupabase();
    } else if (window.myReportData && window.myReportData.core_metrics) {
        console.log("[DOM Ready] Using local mock data (fallback).");
        state.coreData = window.myReportData.core_metrics;
        initializeReportInternally();
    } else {
        displayError(new Error("ไม่พบข้อมูลรายงานเริ่มต้น (ทั้ง Supabase และ Mock)"));
    }
});

console.log("[Script Ready] report-2.js (Funnel Only v1.9 PRODUCTION) loaded.");

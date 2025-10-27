// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Funnel + Consult)
// Version: Funnel Step 2.0 (SUPABASE + LOADING UI + AUTO FALLBACK + CONSULT)
// Author: ChatGPT (Optimized for Beauty Clinic CRM)
// ================================================================================

console.log("[Script Load] report-2.js (Funnel + Consult v2.0 PRODUCTION) executing...");

// --------------------------------------------------------------------------------
// GLOBAL STATE
// --------------------------------------------------------------------------------
window.reportState = window.reportState || { 
    coreData: null,
    consultData: null,     // [NEW] For Consult 2 Day stats
    consultSalesData: []   // [NEW] For Consult by Sales table
};
const state = window.reportState;
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;
const KPI_LEAD_TO_CONSULT_TARGET_PERCENT = 90; // [NEW] 90% KPI

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
// [NEW] CORE CONSULT LOGIC
// --------------------------------------------------------------------------------
function calculateAndUpdateConsultSection() {
    console.log("[CalculateConsult v1.0] Updating...");
    
    // --- 1. Get Data ---
    const coreData = state.coreData;
    const consultData = state.consultData;
    const salesData = state.consultSalesData;

    if (!coreData || !consultData) {
        console.warn("[CalculateConsult] Missing core or consult data.");
        return;
    }

    // --- 2. Get Elements ---
    const qualifiedLeadsEl = document.getElementById('consult-qualified-leads');
    const consultActualEl = document.getElementById('consult-2day-actual');
    const consultTargetEl = document.getElementById('consult-2day-target');
    const salesTableBody = document.getElementById('consult-sales-breakdown-body');
    
    if (!qualifiedLeadsEl || !consultActualEl || !consultTargetEl || !salesTableBody) {
        console.error("[CalculateConsult] Missing elements!");
        displayError(new Error("องค์ประกอบหน้าเว็บบางส่วนหายไป (Consult Section)"));
        return;
    }

    // --- 3. Populate Cards ---
    // ดึง "Qualified Leads" มาจาก coreData ที่มีอยู่แล้ว
    const qualifiedLeads = coreData.qualified_leads || 0;
    // "Consult 2 Day" ต้องมาจาก API field ใหม่ (สมมติชื่อ consult_2day_actual)
    const consultActual = consultData.consult_2day_actual || 0; 
    // "Target" คือ 90% ของ Qualified Leads
    const consultTarget = Math.round(qualifiedLeads * (KPI_LEAD_TO_CONSULT_TARGET_PERCENT / 100));

    qualifiedLeadsEl.textContent = formatNumber(qualifiedLeads);
    consultActualEl.textContent = formatNumber(consultActual);
    consultTargetEl.textContent = formatNumber(consultTarget);
    
    console.log("[CalculateConsult] Cards Populated:", { qualifiedLeads, consultActual, consultTarget });

    // --- 4. Populate Table ---
    salesTableBody.innerHTML = ''; // Clear loading/old data
    
    if (!salesData || salesData.length === 0) {
        salesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">ไม่มีข้อมูลรายเซลล์</td></tr>';
        return;
    }

    // Sort data by actual consults (descending)
    salesData.sort((a, b) => (b.consult_2day_actual || 0) - (a.consult_2day_actual || 0));

    salesData.forEach(sales => {
        const salesQualified = sales.qualified_leads || 0;
        const salesActual = sales.consult_2day_actual || 0;
        const salesTarget = Math.round(salesQualified * (KPI_LEAD_TO_CONSULT_TARGET_PERCENT / 100));
        const achievementRate = (salesQualified > 0) ? (salesActual / salesQualified) * 100 : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sales.sales_name || 'ไม่ระบุ'}</td>
            <td>${formatNumber(salesQualified)}</td>
            <td>${formatNumber(salesActual)}</td>
            <td>${formatNumber(salesTarget)}</td>
            <td style="font-weight: 600; color: ${achievementRate >= KPI_LEAD_TO_CONSULT_TARGET_PERCENT ? '#48bb78' : '#e53e3e'};">
                ${achievementRate.toFixed(1)}%
            </td>
        `;
        salesTableBody.appendChild(tr);
    });
    
    console.log("[CalculateConsult] Table Populated.");
}


// --------------------------------------------------------------------------------
// INPUT EVENT HANDLER
// --------------------------------------------------------------------------------
function handleFunnelInputChange(event) {
    if (event.target && event.target.id === 'funnel-budget-input') {
        if (parseFloat(event.target.value) < 0) event.target.value = 0;
        if (event.target.validity.valid || event.target.value === '') {
            event.target.style.outline = '';
            calculateAndUpdateFunnel(); // Recalculate Funnel (CPL) on budget change
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
    console.log("[Supabase Fetch v2.0] Starting...");

    try {
        const userId = localStorage.getItem("crm_user_id") || "demo_user";
        if (!window.apiV2 || !window.supabaseClient) {
            throw new Error("Supabase API not ready");
        }

        const reportData = await window.apiV2.getSalesReportV2(userId);
        console.log("[Supabase Fetch] Raw:", reportData);

        // [UPDATED] To load core_metrics, consult_metrics, and consult_by_sales
        if (reportData && reportData.core_metrics) {
            state.coreData = reportData.core_metrics;
            console.log("[Supabase Fetch] Loaded core_metrics:", state.coreData);
        } else {
            console.warn("[Supabase Fetch] Empty core_metrics, fallback to mock.");
            state.coreData = window.myReportData?.core_metrics || {};
        }

        // [NEW] Load Consult Metrics
        state.consultData = reportData.consult_metrics || window.myReportData?.consult_metrics || { consult_2day_actual: 0 };
        console.log("[Supabase Fetch] Loaded consult_metrics:", state.consultData);
        
        // [NEW] Load Consult Sales Breakdown
        state.consultSalesData = reportData.consult_by_sales || window.myReportData?.consult_by_sales || [];
        console.log("[Supabase Fetch] Loaded consult_by_sales:", state.consultSalesData);

    } catch (err) {
        console.error("[Supabase Fetch] Error:", err);
        // [UPDATED] Fallback for all data points
        state.coreData = window.myReportData?.core_metrics || {};
        state.consultData = window.myReportData?.consult_metrics || { consult_2day_actual: 0 };
        state.consultSalesData = window.myReportData?.consult_by_sales || [];
        displayError(new Error("โหลดข้อมูลจาก Supabase ไม่สำเร็จ (ใช้ mock data แทน)"));
    }

    removeLoadingOverlay();
    initializeReportInternally();
}

// --------------------------------------------------------------------------------
// INITIALIZATION
// --------------------------------------------------------------------------------
function initializeReportInternally() {
    console.log("[Init v2.0] Starting Funnel + Consult setup...");
    try {
        addFunnelInputListeners();
        calculateAndUpdateFunnel(); // Render Funnel
        calculateAndUpdateConsultSection(); // [NEW] Render Consult Section
        console.log("[Init] Funnel + Consult initialized successfully.");
    } catch (err) {
        console.error("[Init] Error:", err);
        displayError(err);
    }
}

// --------------------------------------------------------------------------------
// DOM READY
// --------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOM Ready v2.0] Initializing Funnel + Consult...");

    const funnelSection = document.querySelector('.funnel-section');
    const consultSection = document.getElementById('consult-sales-breakdown-body'); // Check for new section element

    if (!funnelSection || !consultSection) {
        displayError(new Error("โครงสร้างหน้าเว็บสำหรับ Funnel หรือ Consult ไม่สมบูรณ์"));
        return;
    }

    if (window.apiV2 && window.supabaseClient) {
        console.log("[DOM Ready] Supabase client detected.");
        fetchReportDataFromSupabase();
    } else if (window.myReportData && window.myReportData.core_metrics) {
        console.log("[DOM Ready] Using local mock data (fallback).");
        // [UPDATED] Load all mock data into state
        state.coreData = window.myReportData.core_metrics;
        state.consultData = window.myReportData.consult_metrics || { consult_2day_actual: 0 };
        state.consultSalesData = window.myReportData.consult_by_sales || [];
        initializeReportInternally();
    } else {
        displayError(new Error("ไม่พบข้อมูลรายงานเริ่มต้น (ทั้ง Supabase และ Mock)"));
    }
});

console.log("[Script Ready] report-2.js (Funnel + Consult v2.0 PRODUCTION) loaded.");

// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Updated Funnel Logic + Consult Section)
// Version: Funnel Step 2.1 (Fixes consult logic)
// Author: ChatGPT Custom Build for FBC
// ================================================================================

console.log("[Script Load] report-2.js (Funnel v2.1 - Consult) executing...");

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
// MAIN FUNNEL LOGIC (Section 2)
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

    const actualLeads = parseFloat(state.coreData?.total_customers) || 0; // ตัวเลขจริง (Qualified Leads 96)
    const actualSales = parseFloat(state.coreData?.closed_sales) || 0;     // ตัวเลขจริง (Closed Sales 20)
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
// [NEW] CONSULT LOGIC (Section 3)
// --------------------------------------------------------------------------------
function calculateAndUpdateConsultSection() {
    console.log("[CalculateConsult v1.1] Updating...");
    
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
    // [FIXED] ดึง Qualified Leads จาก `total_customers` (96) ให้ตรงกับ Section 2
    const qualifiedLeads = coreData.total_customers || 0; 
    const consultActual = consultData.consult_2day_actual || 0; 
    
    // [FIXED] เป้าหมาย (Target) คือ 90% ของ 96
    const consultTarget = Math.round(qualifiedLeads * (KPI_LEAD_TO_CONSULT_TARGET_PERCENT / 100));

    qualifiedLeadsEl.textContent = formatNumber(qualifiedLeads); // แสดง 96
    consultActualEl.textContent = formatNumber(consultActual); // แสดง 75 (จาก Mock)
    consultTargetEl.textContent = formatNumber(consultTarget); // แสดง 86 (96 * 0.9)
    
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
        // [FIXED] เป้าหมายรายเซลล์ คือ 90% ของ Qualified Leads ของเซลล์คนนั้น
        const salesTarget = Math.round(salesQualified * (KPI_LEAD_TO_CONSULT_TARGET_PERCENT / 100));
        const achievementRate = (salesQualified > 0) ? (salesActual / salesQualified) * 100 : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sales.sales_name || 'ไม่ระบุ'}</td>
            <td>${formatNumber(salesQualified)}</td>
            <td>${formatNumber(salesActual)}</td>
            <td>${formatNumber(salesTarget)}</td> <td style="font-weight: 600; color: ${achievementRate >= KPI_LEAD_TO_CONSULT_TARGET_PERCENT ? '#48bb78' : '#e53e3e'};">
                ${achievementRate.toFixed(1)}%
            </td>
        `;
        salesTableBody.appendChild(tr);
    });
    
    console.log("[CalculateConsult] Table Populated.");
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
        
        // [UPDATED] โหลด mock หรือข้อมูลจริง
        if (!state.coreData && window.myReportData?.core_metrics) {
            state.coreData = window.myReportData.core_metrics;
            // [NEW] Load mock data for consult section
            state.consultData = window.myReportData.consult_metrics || { consult_2day_actual: 0 };
            state.consultSalesData = window.myReportData.consult_by_sales || [];
        }
        
        calculateAndUpdateFunnel(); // เรียกใช้ Section 2
        calculateAndUpdateConsultSection(); // [NEW] เรียกใช้ Section 3
        
        console.log("[Init] Funnel + Consult initialized successfully.");
    } catch (err) {
        console.error("[Init] Error:", err);
        displayError(err);
    }
}

document.addEventListener('DOMContentLoaded', initializeReportInternally);

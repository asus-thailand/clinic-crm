// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT
// [✅ SENIOR DEV EDIT] Version 2.4 - Added Date Filter Functionality
// ================================================================================

console.log("[Script Load] report-2.js (Funnel v2.4 - Date Filters) executing...");

// --------------------------------------------------------------------------------
// GLOBAL STATE
// --------------------------------------------------------------------------------
window.reportState = window.reportState || { 
    currentUser: null,     // [✅ NEW]
    coreData: null,
    consultData: null,     
    consultSalesData: [],
    startDate: null,       // [✅ NEW]
    endDate: null,         // [✅ NEW]
    activePreset: 'all'    // [✅ NEW]
};
const state = window.reportState;
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;
const KPI_LEAD_TO_CONSULT_TARGET_PERCENT = 90; 

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

// [✅ NEW] Helper from report.js
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// --------------------------------------------------------------------------------
// LOADING UI
// --------------------------------------------------------------------------------
function showLoadingOverlay(message = "กำลังโหลดข้อมูลจากระบบ...") {
    let overlay = document.getElementById("loading-overlay");
    if (!overlay) {
        // (โค้ดสร้าง overlay เหมือนเดิม)...
    }
    // [✅ EDIT] ทำให้ Content หลักจางลง
    const reportContent = document.getElementById('report-content-v2');
    if (reportContent) {
        reportContent.style.opacity = '0.3';
        reportContent.style.pointerEvents = 'none';
    }
}

function removeLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.remove();
    // [✅ EDIT] ทำให้ Content กลับมาชัด
    const reportContent = document.getElementById('report-content-v2');
    if (reportContent) {
        reportContent.style.opacity = '1';
        reportContent.style.pointerEvents = 'auto';
    }
}

// --------------------------------------------------------------------------------
// [✅ NEW] DATE FILTER LOGIC (Adapted from report.js)
// --------------------------------------------------------------------------------

/**
 * Sets up all the event listeners for the new date filter toolbar.
 */
function setupDateFilterListeners() {
    // Preset buttons (7d, 30d, all)
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(button => {
        button.addEventListener('click', () => {
            const preset = button.dataset.preset;
            updateDateFilter(preset);
            fetchAndRenderReport(); // Fetch data immediately
        });
    });

    // Custom date range "Apply" button
    document.getElementById('applyFilterBtnV2').addEventListener('click', () => {
        const start = document.getElementById('startDateV2').value;
        const end = document.getElementById('endDateV2').value;
        
        if (start && end && start > end) {
            alert('วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด');
            return;
        }
        updateDateFilter('custom', start, end);
        fetchAndRenderReport();
    });
}

/**
 * Updates the global state based on the selected date filter.
 */
function updateDateFilter(preset, customStart = null, customEnd = null) {
    state.activePreset = preset;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch (preset) {
        case '7d':
            startDate.setDate(today.getDate() - 6);
            state.startDate = formatDateForInput(startDate);
            state.endDate = formatDateForInput(today);
            break;
        case '30d':
            startDate.setDate(today.getDate() - 29);
            state.startDate = formatDateForInput(startDate);
            state.endDate = formatDateForInput(today);
            break;
        case 'custom':
            state.startDate = customStart || null;
            state.endDate = customEnd || null;
            break;
        case 'all':
        default:
            state.startDate = null;
            state.endDate = null;
            break;
    }
    updateActiveButtonUI();
}

/**
 * Updates the visual style of the filter buttons.
 */
function updateActiveButtonUI() {
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === state.activePreset);
    });
    if (state.activePreset !== 'custom') {
        document.getElementById('startDateV2').value = '';
        document.getElementById('endDateV2').value = '';
    }
}


// --------------------------------------------------------------------------------
// DATA FETCHING & RENDERING
// --------------------------------------------------------------------------------

/**
 * [✅ NEW] Main function to fetch data AND render all components.
 * This is called on init and every time a filter changes.
 */
async function fetchAndRenderReport() {
    if (!state.currentUser) {
        console.error("No user found. Aborting fetch.");
        displayError(new Error("ไม่พบข้อมูลผู้ใช้, กรุณา login ใหม่"));
        return;
    }
    
    console.log(`[FetchAndRender] Fetching report from ${state.startDate || 'all'} to ${state.endDate || 'all'}`);
    showLoadingOverlay("กำลังดึงข้อมูลรายงาน...");

    try {
        // 1. [NEW] เรียก API (api-v2.js) โดยส่งค่าวันที่ไปด้วย
        const fetchedData = await window.apiV2.getSalesReportV2(
            state.currentUser.id, 
            state.startDate, 
            state.endDate
        );

        if (!fetchedData || !fetchedData.kpis || !fetchedData.sales_performance) {
            throw new Error("ข้อมูลที่ได้รับจาก API (V2) ไม่สมบูรณ์");
        }

        // 2. [NEW] เอาข้อมูลจริงใส่ state
        state.coreData = (fetchedData.kpis && fetchedData.kpis.length > 0) ? fetchedData.kpis[0] : { total_customers: 0, closed_sales: 0 };
        state.consultSalesData = fetchedData.sales_performance || [];

        console.log("[FetchAndRender] Real data loaded:", state);

        // 3. [NEW] เรียกใช้ Function เพื่อวาดหน้าจอ (ด้วยข้อมูลจริง)
        calculateAndUpdateFunnel(); // อัปเดต Section 2
        calculateAndUpdateConsultSection(); // อัปเดต Section 3
        
        console.log("[FetchAndRender] Funnel + Consult updated successfully.");

    } catch (err) {
        console.error("[FetchAndRender] Error:", err);
        displayError(err);
    } finally {
        removeLoadingOverlay();
    }
}


/**
 * Renders Section 2 (Funnel) based on global state.
 */
function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v2.4] Updating...");

    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxInput = document.getElementById('funnel-inboxes-input');
    const leadsActualEl = document.getElementById('funnel-leads-actual');
    const leadsTargetEl = document.getElementById('funnel-leads-target');
    const salesActualEl = document.getElementById('funnel-sales-actual');
    const overallCplEl = document.getElementById('funnel-overall-cpl');
    const leadsComparisonEl = document.getElementById('funnel-leads-comparison');
    const leadsPercentageEl = document.getElementById('funnel-leads-percentage');

    if (!leadsActualEl) return; // ถ้า Element ไม่มีจริง (เช่น โหลดหน้าไม่สำเร็จ) ให้ออก

    const overallBudget = parseFloat(budgetInput.value) || 0;
    const totalInboxes = parseFloat(inboxInput.value) || 0;

    const actualLeads = parseFloat(state.coreData?.total_customers) || 0; 
    const actualSales = parseFloat(state.coreData?.closed_sales) || 0;     

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

    const achievementRate = (targetLeads > 0) ? (actualLeads / targetLeads) * 100 : 0;
    const isGoalMet = actualLeads >= targetLeads;
    const color = isGoalMet ? 'var(--color-success)' : 'var(--color-danger)'; 
    const text = isGoalMet ? 'ผ่าน KPI' : 'ไม่ผ่าน KPI';
    leadsComparisonEl.style.color = color; 
    leadsPercentageEl.textContent = `(${text} ${achievementRate.toFixed(1)}%)`; 
    leadsPercentageEl.style.color = color; 
}

/**
 * Renders Section 3 (Consult) based on global state.
 */
function calculateAndUpdateConsultSection() {
    console.log("[CalculateConsult v2.4] Updating...");
    
    const coreData = state.coreData;
    const salesData = state.consultSalesData; 

    if (!coreData || !salesData) {
        console.warn("[CalculateConsult] Missing core or sales data.");
        return;
    }

    const qualifiedLeadsEl = document.getElementById('consult-qualified-leads');
    const consultActualEl = document.getElementById('consult-2day-actual');
    const consultTargetEl = document.getElementById('consult-2day-target');
    const salesTableBody = document.getElementById('consult-sales-breakdown-body');
    
    if (!qualifiedLeadsEl || !salesTableBody) {
        console.warn("[CalculateConsult] Missing elements!");
        return;
    }

    const qualifiedLeads = coreData.total_customers || 0; 
    const consultActual = coreData.closed_sales || 0; 
    const consultTarget = coreData.closed_sales || 0;

    qualifiedLeadsEl.textContent = formatNumber(qualifiedLeads); 
    consultActualEl.textContent = formatNumber(consultActual); 
    consultTargetEl.textContent = formatNumber(consultTarget); 
    
    salesTableBody.innerHTML = ''; 
    
    if (!salesData || salesData.length === 0) {
        salesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">ไม่มีข้อมูลรายเซลล์</td></tr>';
        return;
    }
    
    salesData.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));

    salesData.forEach(sales => {
        // [✅ EDIT] เราอาจจะต้องปรับ RPC ให้คืนค่า total_leads ที่ถูกต้อง
        // แต่ตอนนี้จะใช้ total_leads (จาก kpis) และ closed_deals (จาก sales_performance) ไปก่อน
        const salesQualified = sales.total_leads || 0; // total_leads (จาก RPC 'get_sales_performance_summary' เดิม)
        const salesActual = sales.closed_deals || 0;   // closed_deals (จาก RPC 'get_full_sales_report' เดิม)
        
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
}


// --------------------------------------------------------------------------------
// INPUT HANDLERS (Funnel Inputs)
// --------------------------------------------------------------------------------
function handleFunnelInputChange(event) {
    const id = event.target.id;
    if (id === 'funnel-budget-input' || id === 'funnel-inboxes-input') {
        if (parseFloat(event.target.value) < 0) event.target.value = 0;
        // [✅ EDIT] ไม่ต้องดึงข้อมูลใหม่ แค่คำนวณ CPL ใหม่
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

async function initializeReportInternally() {
    console.log("[Init v2.4] Starting dynamic report setup...");
    
    // 1. รอให้ auth check (ใน HTML) ทำงานเสร็จก่อน
    await new Promise(resolve => {
        const interval = setInterval(() => {
            if (state.currentUser) {
                clearInterval(interval);
                resolve();
            }
        }, 50);
    });

    // 2. ผูก Event Listeners ทั้งหมด
    addFunnelInputListeners();       // ผูกกับช่อง Budget/Inbox
    setupDateFilterListeners(); // ผูกกับฟิลเตอร์วันที่
    
    // 3. ตั้งค่า Filter เริ่มต้นเป็น "ทั้งหมด"
    updateDateFilter('all');
    
    // 4. ดึงข้อมูลครั้งแรก
    await fetchAndRenderReport();
    
    console.log("[Init v2.4] Page initialized.");
}

document.addEventListener('DOMContentLoaded', initializeReportInternally);

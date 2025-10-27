// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (อัปเดต)
// Version: Funnel 2.1 (ดึงข้อมูลจริงจาก Supabase)
// ================================================================================

console.log("[Script Load] report-2.js (Funnel v2.1) executing...");

// --------------------------------------------------------------------------------
// GLOBAL STATE
// --------------------------------------------------------------------------------
window.reportState = window.reportState || {
    coreData: {
        total_customers: 0, // ค่าจริง (Qualified Leads)
        closed_sales: 0     // ค่าจริง (Closed Sales)
    } 
};
const state = window.reportState;
// เป้าหมาย KPI: 30% ของ Inbox จะต้องกลายเป็น Lead
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30; 

// --------------------------------------------------------------------------------
// HELPER FUNCTIONS (เหมือนเดิม)
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
// LOADING UI (เหมือนเดิม)
// --------------------------------------------------------------------------------
function showLoadingOverlay(message = "กำลังโหลดข้อมูลจริงจากระบบ...") {
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
// [NEW] DATA FETCHING & CALCULATION
// --------------------------------------------------------------------------------

/**
 * ฟังก์ชันหลักในการเริ่มแอป: ดึงข้อมูลและคำนวณ
 */
async function initializeApp() {
    console.log("[Init] Waiting for dependencies (Supabase, API)...");
    
    // รอให้ Supabase และ API พร้อมใช้งาน
    await new Promise(resolve => {
         let checks = 0;
         const interval = setInterval(() => {
             checks++;
             // api.js ต้องโหลดแล้ว
             if (window.supabaseClient && window.api && typeof window.api.fetchAllCustomers === 'function') { 
                 clearInterval(interval);
                 resolve();
             }
             if (checks > 50) { // Timeout 
                 clearInterval(interval);
                 displayError(new Error("ไม่สามารถโหลด API files ได้"));
                 resolve(); // หยุดรอ
             }
         }, 100);
    });

    console.log("[Init] API Ready. Fetching data...");
    showLoadingOverlay();

    try {
        // 1. ดึงข้อมูลลูกค้าทั้งหมด (เหมือนที่ main.js ทำ)
        const customers = await api.fetchAllCustomers();
        
        // 2. คำนวณค่าจริง
        calculateActuals(customers);

        // 3. ตั้งค่า Event Listeners
        addFunnelInputListeners();

        // 4. คำนวณ Funnel ครั้งแรก
        calculateAndUpdateFunnel();
        console.log("[Init] Funnel initialized successfully with real data.");

    } catch (err) {
        console.error("[Init] Error:", err);
        displayError(err);
    } finally {
        removeLoadingOverlay();
    }
}

/**
 * คำนวณค่า "ตัวเลขจริง" จากข้อมูลลูกค้าที่ดึงมา
 * @param {Array} customers - Array ข้อมูลลูกค้าจาก api.fetchAllCustomers
 */
function calculateActuals(customers = []) {
    let qualifiedLeadsCount = 0;
    let closedSalesCount = 0;

    // วนลูปข้อมูลลูกค้าทั้งหมดเพื่อนับ
    for (const c of customers) {
        // --- 1. นับ Qualified Leads ---
        // ถ้ามี 'appointment_date' (วันที่นัด CS) ถือว่าเป็น 1 Lead
        if (c.appointment_date) {
            qualifiedLeadsCount++;
        }

        // --- 2. นับ Closed Sales (ใช้ตรรกะเดียวกับ main.js) ---
        const isClosedStatus = c.status_1 === 'ปิดการขาย';
        const isClosedDeal = (c.last_status === '100%' || c.last_status === 'ONLINE');
        const hasAmount = c.closed_amount; // ต้องมียอดปิด

        if (isClosedStatus && isClosedDeal && hasAmount) {
            closedSalesCount++;
        }
    }

    // อัปเดต Global State
    state.coreData.total_customers = qualifiedLeadsCount; // อัปเดตค่า 96 เดิม
    state.coreData.closed_sales = closedSalesCount;     // อัปเดตค่า 20 เดิม

    console.log("[CalculateActuals] Data processed:", {
        totalRows: customers.length,
        qualifiedLeads: qualifiedLeadsCount,
        closedSales: closedSalesCount
    });
}

// --------------------------------------------------------------------------------
// MAIN FUNNEL LOGIC (เวอร์ชันอัปเดตล่าสุด)
// --------------------------------------------------------------------------------

/**
 * คำนวณและอัปเดต UI ของ Funnel (เวอร์ชันอัปเดตที่มี 6 การ์ด)
 */
function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v2.1-Enhanced] Updating...");

    // --- 1. ตรวจสอบ Element (ของเดิม) ---
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxInput = document.getElementById('funnel-inboxes-input');
    const leadsActualEl = document.getElementById('funnel-leads-actual');
    const leadsTargetEl = document.getElementById('funnel-leads-target');
    const salesActualEl = document.getElementById('funnel-sales-actual');
    const overallCplEl = document.getElementById('funnel-overall-cpl');

    // --- [NEW] ตรวจสอบ Element 3 ตัวใหม่ ---
    const inboxToLeadEl = document.getElementById('funnel-inbox-to-lead');
    const leadToSaleEl = document.getElementById('funnel-lead-to-sale');
    const overallCpsEl = document.getElementById('funnel-overall-cps');

    if (!budgetInput || !inboxInput || !leadsActualEl || !leadsTargetEl || !salesActualEl || !overallCplEl ||
        !inboxToLeadEl || !leadToSaleEl || !overallCpsEl) { // เพิ่มตัวใหม่ใน if check
        displayError(new Error("องค์ประกอบหน้าเว็บบางส่วนหายไป (Funnel IDs)"));
        return;
    }

    // --- 2. ดึงค่า Input และ ค่าจริง (ของเดิม) ---
    const overallBudget = parseFloat(budgetInput.value) || 0;
    const totalInboxes = parseFloat(inboxInput.value) || 0;

    const actualLeads = parseFloat(state.coreData.total_customers) || 0; 
    const actualSales = parseFloat(state.coreData.closed_sales) || 0;    
    
    // --- 3. คำนวณ (ของเดิม) ---
    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100));
    
    const overallCPL = (overallBudget > 0 && actualLeads > 0)
        ? (overallBudget / actualLeads)
        : 0;

    // --- 4. [NEW] คำนวณ 3 ค่าใหม่ ---
    
    // อัตรา Inbox -> Lead (%)
    const inboxToLeadRate = (totalInboxes > 0 && actualLeads > 0)
        ? (actualLeads / totalInboxes) * 100
        : 0;

    // อัตรา Lead -> Sale (%)
    const leadToSaleRate = (actualLeads > 0 && actualSales > 0)
        ? (actualSales / actualLeads) * 100
        : 0;
        
    // ต้นทุนต่อการขาย (CPS)
    const overallCPS = (overallBudget > 0 && actualSales > 0)
        ? (overallBudget / actualSales)
        : 0;


    // --- 5. อัปเดตหน้าเว็บ (ของเดิม + ของใหม่) ---
    leadsActualEl.textContent = formatNumber(actualLeads);
    leadsTargetEl.textContent = formatNumber(targetLeads);
    salesActualEl.textContent = formatNumber(actualSales);
    overallCplEl.textContent = (overallCPL > 0)
        ? formatCurrency(overallCPL, true, 2)
        : "0";

    // [NEW] อัปเดต 3 การ์ดใหม่
    inboxToLeadEl.textContent = inboxToLeadRate.toFixed(1) + "%"; // 1 ทศนิยม
    leadToSaleEl.textContent = leadToSaleRate.toFixed(1) + "%";   // 1 ทศนิยม
    overallCpsEl.textContent = (overallCPS > 0)
        ? formatCurrency(overallCPS, true, 2)
        : "0";


    console.log("[CalculateFunnel] Done:", {
        totalInboxes, actualLeads, targetLeads, actualSales, 
        overallCPL, inboxToLeadRate, leadToSaleRate, overallCPS // Log ค่าใหม่
    });
}


// --------------------------------------------------------------------------------
// INPUT HANDLERS (เหมือนเดิม)
// --------------------------------------------------------------------------------
function handleFunnelInputChange(event) {
    const id = event.target.id;
    if (id === 'funnel-budget-input' || id === 'funnel-inboxes-input') {
        if (parseFloat(event.target.value) < 0) event.target.value = 0;
        // เมื่อแก้ตัวเลข Budget หรือ Inboxes ให้คำนวณใหม่
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
// ใช้ 'DOMContentLoaded' เพื่อเริ่มการทำงาน
document.addEventListener('DOMContentLoaded', initializeApp);

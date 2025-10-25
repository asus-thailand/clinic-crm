// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Simplified - Funnel Only)
// Version: Funnel Step 1.7 (Strict Checks & Logging)
// - Added more detailed checks for state.coreData values and element existence.
// ================================================================================

console.log("[Script Load] report-2.js (Funnel Only v1.7 CHECK) executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || { coreData: null };
const state = window.reportState;
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... */ }
function formatNumber(n) { /* ... */ }
function displayError(error) { /* ... (Make error more visible) ... */ }

// ================================================================================
// CORE FUNNEL LOGIC (WITH STRICT CHECKS)
// ================================================================================
function getFunnelInputs() {
    const budgetInput = document.getElementById('funnel-budget-input');
    const budget = parseFloat(budgetInput?.value) || 0;
    // console.log("[getFunnelInputs] Budget:", budget);
    return { overallBudget: Math.max(0, budget) };
}

/** [MODIFIED v1.7] Main function with stricter checks */
function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v1.7] Updating...");

    // --- Strict Check 1: Ensure coreData and its properties exist ---
    if (!state.coreData || typeof state.coreData !== 'object') {
        console.error("[CalculateFunnel v1.7] CRITICAL: state.coreData is missing or invalid!", state.coreData);
        displayError(new Error("ข้อมูล Core Metrics ไม่พร้อมใช้งาน (state.coreData error)"));
        return;
    }
    const totalInboxes = state.coreData.total_customers; // Read directly
    const actualLeads = state.coreData.qualified_leads;
    const actualSales = state.coreData.closed_sales;

    // Check if the required values are valid numbers
    if (typeof totalInboxes !== 'number' || typeof actualLeads !== 'number' || typeof actualSales !== 'number') {
         console.error("[CalculateFunnel v1.7] CRITICAL: Invalid data types in state.coreData!", { totalInboxes, actualLeads, actualSales });
         displayError(new Error("ข้อมูล Core Metrics มีรูปแบบไม่ถูกต้อง (ไม่ใช่ตัวเลข)"));
         // Display whatever numbers we have, even if 0, before returning
         const inboxesDisplay = document.getElementById('funnel-inboxes');
         const leadsActualEl = document.getElementById('funnel-leads-actual');
         const salesActualEl = document.getElementById('funnel-sales-actual');
         if (inboxesDisplay) inboxesDisplay.textContent = formatNumber(totalInboxes || 0);
         if (leadsActualEl) leadsActualEl.textContent = formatNumber(actualLeads || 0);
         if (salesActualEl) salesActualEl.textContent = formatNumber(actualSales || 0);
         return; // Stop further calculation if data types are wrong
    }
    console.log(`[CalculateFunnel v1.7] Core Data OK: Inboxes=${totalInboxes}, Leads=${actualLeads}, Sales=${actualSales}`);

    // --- Lookup elements needed (Do this AFTER verifying data) ---
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesDisplay = document.getElementById('funnel-inboxes');
    const leadsActualEl = document.getElementById('funnel-leads-actual');
    const leadsTargetEl = document.getElementById('funnel-leads-target');
    const salesActualEl = document.getElementById('funnel-sales-actual');
    const overallCplEl = document.getElementById('funnel-overall-cpl');

    // --- Strict Check 2: Check if ALL essential elements exist ---
    if (!budgetInput || !inboxesDisplay || !leadsActualEl || !leadsTargetEl || !salesActualEl || !overallCplEl) {
         console.error("[CalculateFunnel v1.7] CRITICAL: One or more display/input elements not found!");
         displayError(new Error("องค์ประกอบหน้าเว็บบางส่วนหายไป (Funnel Elements Missing)"));
         // Log missing ones
         if (!budgetInput) console.error("Missing: #funnel-budget-input");
         if (!inboxesDisplay) console.error("Missing: #funnel-inboxes");
         if (!leadsActualEl) console.error("Missing: #funnel-leads-actual");
         // ... etc ...
         return;
    }
    console.log("[CalculateFunnel v1.7] All necessary elements found.");

    // 1. Read Budget Input
    const overallBudget = parseFloat(budgetInput.value) || 0; // Read current budget

    // 2. Perform Calculations (Using verified data)
    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100));
    const overallCPL = (actualLeads > 0 && overallBudget > 0) ? (overallBudget / actualLeads) : 0;
    console.log(`[CalculateFunnel v1.7] Budget=${overallBudget}, Target Leads=${targetLeads}, CPL=${overallCPL}`);

    // 3. Update Display Elements (Now we know data and elements are valid)
    inboxesDisplay.textContent = formatNumber(totalInboxes);
    leadsActualEl.textContent = formatNumber(actualLeads);
    leadsTargetEl.textContent = formatNumber(targetLeads);
    salesActualEl.textContent = formatNumber(actualSales);
    overallCplEl.textContent = formatCurrency(overallCPL, false, 2);

    console.log("[CalculateFunnel v1.7] Update complete.");
}

/** Event handler for Budget input */
function handleFunnelInputChange(event) {
     if (event.target && event.target.id === 'funnel-budget-input') {
          if (parseFloat(event.target.value) < 0) event.target.value = 0;
          if (event.target.validity.valid || event.target.value === '') {
               event.target.style.outline = '';
               // Only trigger calculation if budget input changes
               console.log("Budget input changed, recalculating...");
               calculateAndUpdateFunnel();
          } else {
               event.target.style.outline = '2px solid red';
          }
     }
}

/** Adds event listener ONLY to Budget input */
function addFunnelInputListeners() {
     const budgetInput = document.getElementById('funnel-budget-input');
     if (budgetInput) {
         budgetInput.removeEventListener('input', handleFunnelInputChange);
         budgetInput.addEventListener('input', handleFunnelInputChange);
         console.log("[AddListeners v1.7] Added listener to: funnel-budget-input");
     } else {
         console.error("[AddListeners v1.7] CRITICAL: Could not find Budget input element!");
         displayError(new Error("ไม่สามารถเชื่อมต่อช่อง Input งบประมาณได้"));
     }
 }

// ================================================================================
// INTERNAL INITIALIZATION FUNCTION
// ================================================================================
/** Internal function to initialize the report */
function initializeReportInternally() {
    console.log("[InitReport Internally v1.7] Initializing with state.coreData:", state.coreData);

    // Basic data validation
    if (!state.coreData) { /* ... error handling ... */ return; }

    try {
        // 1. Add Event Listeners to inputs
        addFunnelInputListeners(); // Only adds budget listener now

        // 2. Trigger the first calculation and display update
        console.log("[InitReport Internally] Triggering initial calculation...");
        calculateAndUpdateFunnel(); // This will read coreData and initial budget (0)

        console.log("[InitReport Internally] Report initialized successfully.");

    } catch (error) { /* ... error handling ... */ }
};

// ================================================================================
// AUTO-INITIALIZE ON DOM CONTENT LOADED (WITH RIGOROUS CHECKS)
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOM Ready v1.7] Attempting initialization...");

    // --- Strict Check 1: Verify essential HTML structure exists ---
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxDisplay = document.getElementById('funnel-inboxes');
    const leadsActualDisp = document.getElementById('funnel-leads-actual');
    // Add other essential display elements to the check
    const salesActualDisp = document.getElementById('funnel-sales-actual');
    const cplDisp = document.getElementById('funnel-overall-cpl');


    if (!budgetInput || !inboxDisplay || !leadsActualDisp || !salesActualDisp || !cplDisp ) {
         console.error("[DOM Ready v1.7] CRITICAL: Essential HTML elements for Funnel section are missing!");
         displayError(new Error("โครงสร้างหน้าเว็บสำหรับ Funnel ไม่สมบูรณ์"));
         // Log missing ones with correct IDs
         if (!budgetInput) console.error("Missing: #funnel-budget-input");
         if (!inboxDisplay) console.error("Missing: #funnel-inboxes");
         if (!leadsActualDisp) console.error("Missing: #funnel-leads-actual");
         if (!salesActualDisp) console.error("Missing: #funnel-sales-actual");
         if (!cplDisp) console.error("Missing: #funnel-overall-cpl");
         return;
    }
     console.log("[DOM Ready v1.7] Essential HTML elements found.");

    // --- Strict Check 2: Verify window.myReportData and core_metrics ---
    if (typeof window.myReportData === 'object' && window.myReportData !== null &&
        typeof window.myReportData.core_metrics === 'object' && window.myReportData.core_metrics !== null &&
        // Add specific checks for required core_metrics properties
        typeof window.myReportData.core_metrics.total_customers === 'number' &&
        typeof window.myReportData.core_metrics.qualified_leads === 'number' &&
        typeof window.myReportData.core_metrics.closed_sales === 'number' )
    {
        console.log("[DOM Ready v1.7] Found valid window.myReportData with required core_metrics.");
        state.coreData = window.myReportData.core_metrics;
        console.log("[DOM Ready v1.7] Stored core data in state:", state.coreData);
        initializeReportInternally(); // Initialize
    } else {
        console.error("[DOM Ready v1.7] CRITICAL: window.myReportData not found, invalid, or missing required core_metrics properties!", window.myReportData);
        displayError(new Error("ไม่พบข้อมูลรายงานเริ่มต้น (window.myReportData) หรือข้อมูล core_metrics ไม่สมบูรณ์"));
    }
});

console.log("[Script Ready] report-2.js (Funnel Only v1.7 CHECK) loaded.");

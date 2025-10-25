// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Simplified - Funnel Only)
// Version: Funnel Step 1.2 (Add Debugging)
// - Added console.log statements for better tracing.
// ================================================================================

console.log("[Script Load] report-2.js (Funnel Only v1.2 DEBUG) executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || {
    coreData: null
};
const state = window.reportState;

const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// -- ELEMENT REFERENCES --
// It's generally safer to look these up when needed, especially on init
// const overallBudgetInputEl = document.getElementById('funnel-budget-input');
// const funnelInboxesInputEl = document.getElementById('funnel-inboxes-input');
// const funnelLeadsActualEl = document.getElementById('funnel-leads-actual');
// const funnelLeadsTargetEl = document.getElementById('funnel-leads-target');
// const funnelSalesActualEl = document.getElementById('funnel-sales-actual');
// const funnelOverallCplEl = document.getElementById('funnel-overall-cpl');

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... เหมือนเดิม v1.1 ... */ }
function formatNumber(n) { /* ... เหมือนเดิม v1.1 ... */ }
function displayError(error) { /* ... เหมือนเดิม v1.1 ... */ }

// ================================================================================
// CORE FUNNEL LOGIC (WITH DEBUGGING)
// ================================================================================

/** Reads Budget and Inbox from inputs */
function getFunnelInputs() {
    // Lookup elements inside the function
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesInput = document.getElementById('funnel-inboxes-input');
    const budget = parseFloat(budgetInput?.value) || 0;
    const inboxes = parseInt(inboxesInput?.value, 10) || 0;
    console.log("[getFunnelInputs] Budget Value:", budget, "Inboxes Value:", inboxes); // DEBUG
    return {
        overallBudget: Math.max(0, budget),
        totalInboxes: Math.max(0, inboxes)
    };
}

/** Main function to calculate and update the Funnel display */
function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v1.2] Updating...");

    // Lookup display elements here to ensure they exist at time of update
    const leadsActualEl = document.getElementById('funnel-leads-actual');
    const leadsTargetEl = document.getElementById('funnel-leads-target');
    const salesActualEl = document.getElementById('funnel-sales-actual');
    const overallCplEl = document.getElementById('funnel-overall-cpl');

    // 1. Read Inputs
    const inputs = getFunnelInputs(); // Reads budget & inboxes
    const overallBudget = inputs.overallBudget;
    const totalInboxes = inputs.totalInboxes;

    // 2. Get Actual Data from state
    console.log("[CalculateFunnel v1.2] Reading state.coreData:", state.coreData); // DEBUG
    const actualLeads = state.coreData?.qualified_leads || 0;
    const actualSales = state.coreData?.closed_sales || 0;
    console.log(`[CalculateFunnel v1.2] Actual Leads: ${actualLeads}, Actual Sales: ${actualSales}`); // DEBUG

    // 3. Perform Calculations
    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100));
    const overallCPL = (actualLeads > 0 && overallBudget > 0) ? (overallBudget / actualLeads) : 0;
    console.log(`[CalculateFunnel v1.2] Calculated Target Leads: ${targetLeads}, Calculated CPL: ${overallCPL}`); // DEBUG

    // 4. Update Display Elements (Check if elements exist before updating)
    if (leadsActualEl) {
        console.log("[CalculateFunnel v1.2] Updating Actual Leads Display:", formatNumber(actualLeads)); // DEBUG
        leadsActualEl.textContent = formatNumber(actualLeads);
    } else {
        console.error("[CalculateFunnel v1.2] Element 'funnel-leads-actual' not found!"); // DEBUG
    }

    if (leadsTargetEl) {
        console.log("[CalculateFunnel v1.2] Updating Target Leads Display:", formatNumber(targetLeads)); // DEBUG
        leadsTargetEl.textContent = formatNumber(targetLeads);
    } else {
        console.error("[CalculateFunnel v1.2] Element 'funnel-leads-target' not found!"); // DEBUG
    }

    if (salesActualEl) {
        console.log("[CalculateFunnel v1.2] Updating Actual Sales Display:", formatNumber(actualSales)); // DEBUG
        salesActualEl.textContent = formatNumber(actualSales);
    } else {
        console.error("[CalculateFunnel v1.2] Element 'funnel-sales-actual' not found!"); // DEBUG
    }

    if (overallCplEl) {
        console.log("[CalculateFunnel v1.2] Updating CPL Display:", formatCurrency(overallCPL, false, 2)); // DEBUG
        overallCplEl.textContent = formatCurrency(overallCPL, false, 2);
    } else {
        console.error("[CalculateFunnel v1.2] Element 'funnel-overall-cpl' not found!"); // DEBUG
    }

    console.log("[CalculateFunnel v1.2] Update complete.");
}

/** Event handler for Budget / Inbox inputs */
function handleFunnelInputChange(event) {
     if (event.target && event.target.tagName === 'INPUT') {
          if (parseFloat(event.target.value) < 0) event.target.value = 0;
          if (event.target.validity.valid || event.target.value === '') {
               console.log("Funnel input changed, recalculating...");
               event.target.style.outline = '';
               calculateAndUpdateFunnel(); // Trigger recalculation
          } else {
               console.warn("Invalid number input in Funnel.");
               event.target.style.outline = '2px solid red';
          }
     }
}

/** Adds event listeners to Budget and Inbox inputs */
function addFunnelInputListeners() {
     // Lookup inside function for safety
     const budgetInput = document.getElementById('funnel-budget-input');
     const inboxesInput = document.getElementById('funnel-inboxes-input');
     const inputsToListen = [ budgetInput, inboxesInput ];

     inputsToListen.forEach(input => {
         if (input) {
             input.removeEventListener('input', handleFunnelInputChange);
             input.addEventListener('input', handleFunnelInputChange);
             console.log("[AddListeners] Added listener to:", input.id); // DEBUG
         } else {
             console.warn("[AddListeners] Could not find Funnel input element to add listener."); // DEBUG
         }
     });
 }

// ================================================================================
// GLOBAL INITIALIZATION FUNCTION (WITH DEBUGGING)
// ================================================================================

/** Global function to initialize the Funnel report section with data. */
window.initializeFunnelReport = function(reportData) {
    console.log("[Global Init - Funnel v1.2] Initializing with data:", reportData); // DEBUG

    // Basic data validation
    if (!reportData || typeof reportData !== 'object' || !reportData.core_metrics) {
        console.error("[Global Init - Funnel] Invalid or missing core data provided.");
        displayError(new Error("ข้อมูลที่ส่งมาสำหรับรายงานไม่สมบูรณ์ (ต้องการ core_metrics)"));
        return;
    }

    // Store only the necessary core metrics data
    state.coreData = reportData.core_metrics;
    console.log("[Global Init - Funnel] Stored core data:", state.coreData); // DEBUG

    try {
        // 1. Add Event Listeners to inputs (Lookup elements inside)
        addFunnelInputListeners();

        // 2. Trigger the first calculation and display update
        console.log("[Global Init - Funnel] Triggering initial calculation..."); // DEBUG
        calculateAndUpdateFunnel();

        console.log("[Global Init - Funnel] Report initialized successfully."); // DEBUG

    } catch (error) {
        console.error("[Global Init - Funnel] Error during initialization:", error); // DEBUG
        displayError(error);
    }
};

console.log("[Script Ready] report-2.js (Funnel Only v1.2 DEBUG) loaded...");

// --- Fallback definition ---
if (typeof window.initializeFunnelReport !== 'function') {
     console.error("PANIC: initializeFunnelReport function was somehow overwritten!");
     // Re-define it carefully
     window.initializeFunnelReport = function(reportData) { /* ... same init logic ... */ };
}

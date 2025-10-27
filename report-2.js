// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Simplified - Funnel Only)
// Version: Funnel Step 1.8 (Revert Inbox to Input)
// - Total Inboxes is now a user input field again.
// - Calculations use the input inbox value.
// ================================================================================

console.log("[Script Load] report-2.js (Funnel Only v1.8 REVERT INBOX) executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || { coreData: null };
const state = window.reportState;
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... */ }
function formatNumber(n) { /* ... */ }
function displayError(error) { /* ... */ }

// ================================================================================
// CORE FUNNEL LOGIC (MODIFIED)
// ================================================================================

/** [MODIFIED v1.8] Reads Budget and Inbox from inputs */
function getFunnelInputs() {
    // Lookup elements inside
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesInput = document.getElementById('funnel-inboxes-input'); // Changed back to input ID
    const budget = parseFloat(budgetInput?.value) || 0;
    const inboxes = parseInt(inboxesInput?.value, 10) || 0;
    console.log("[getFunnelInputs v1.8] Budget:", budget, "Inboxes:", inboxes); // DEBUG
    return {
        overallBudget: Math.max(0, budget),
        totalInboxes: Math.max(0, inboxes) // Read from input
    };
}

/** [MODIFIED v1.8] Main function to calculate and update Funnel display */
function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v1.8] Updating...");

    // --- Strict Check 1: Ensure coreData exists ---
    if (!state.coreData || typeof state.coreData !== 'object') { /* ... error handling ... */ return; }
    // Read actual leads/sales ONCE
    const actualLeads = state.coreData.qualified_leads || 0;
    const actualSales = state.coreData.closed_sales || 0;
    console.log(`[CalculateFunnel v1.8] Core Data OK: Leads=${actualLeads}, Sales=${actualSales}`);

    // --- Lookup elements needed ---
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesInput = document.getElementById('funnel-inboxes-input'); // Input element
    const leadsActualEl = document.getElementById('funnel-leads-actual');
    const leadsTargetEl = document.getElementById('funnel-leads-target');
    const salesActualEl = document.getElementById('funnel-sales-actual');
    const overallCplEl = document.getElementById('funnel-overall-cpl');

    // --- Strict Check 2: Check elements ---
    if (!budgetInput || !inboxesInput || !leadsActualEl || !leadsTargetEl || !salesActualEl || !overallCplEl) {
         console.error("[CalculateFunnel v1.8] CRITICAL: One or more elements not found!");
         displayError(new Error("องค์ประกอบหน้าเว็บ Funnel หายไป"));
         // Log missing ones
         if (!budgetInput) console.error("Missing: #funnel-budget-input");
         if (!inboxesInput) console.error("Missing: #funnel-inboxes-input"); // Check input ID
         // ... etc ...
         return;
    }
    console.log("[CalculateFunnel v1.8] All necessary elements found.");

    // 1. Read Inputs (Budget and Inboxes)
    const inputs = getFunnelInputs();
    const overallBudget = inputs.overallBudget;
    const totalInboxes = inputs.totalInboxes; // Get value from input

    // 2. Perform Calculations
    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100)); // Use input inbox
    const overallCPL = (actualLeads > 0 && overallBudget > 0) ? (overallBudget / actualLeads) : 0;
    console.log(`[CalculateFunnel v1.8] Budget=${overallBudget}, Inboxes=${totalInboxes}, Target Leads=${targetLeads}, CPL=${overallCPL}`);

    // 3. Update Display Elements
    // Budget and Inbox inputs retain their values, no need to update input value here unless resetting

    leadsActualEl.textContent = formatNumber(actualLeads);
    leadsTargetEl.textContent = formatNumber(targetLeads); // Update Target based on input inbox
    salesActualEl.textContent = formatNumber(actualSales);
    overallCplEl.textContent = formatCurrency(overallCPL, false, 2);

    console.log("[CalculateFunnel v1.8] Update complete.");

    // 4. [NEW] Update Planner and Totals (Pass input inbox)
    // We need a function similar to updatePlannerAndTotals from previous versions,
    // simplified for just the planner update based on funnel inputs/data.
    updatePlannerInputs(totalInboxes, actualLeads, actualSales);
}

/** Event handler for Budget / Inbox inputs */
function handleFunnelInputChange(event) {
     if (event.target && (event.target.id === 'funnel-budget-input' || event.target.id === 'funnel-inboxes-input')) { // Check both IDs
          if (parseFloat(event.target.value) < 0) event.target.value = 0;
          if (event.target.validity.valid || event.target.value === '') {
               event.target.style.outline = '';
               console.log(`Input changed (${event.target.id}), recalculating...`);
               calculateAndUpdateFunnel(); // Trigger recalculation
          } else {
               event.target.style.outline = '2px solid red';
          }
     }
}

/** [MODIFIED v1.8] Adds event listeners to Budget and Inbox inputs */
function addFunnelInputListeners() {
     const budgetInput = document.getElementById('funnel-budget-input');
     const inboxesInput = document.getElementById('funnel-inboxes-input'); // Changed back to input
     const inputsToListen = [ budgetInput, inboxesInput ]; // Listen to both
     let listenersAdded = 0;
     inputsToListen.forEach(input => {
         if (input) {
             input.removeEventListener('input', handleFunnelInputChange);
             input.addEventListener('input', handleFunnelInputChange);
             console.log("[AddListeners v1.8] Added listener to:", input.id);
             listenersAdded++;
         } else {
             console.warn("[AddListeners v1.8] Could not find Funnel input element:", input === budgetInput ? '#funnel-budget-input' : '#funnel-inboxes-input');
         }
     });
     if (listenersAdded < inputsToListen.length) { // Check if both were found
        console.error("[AddListeners v1.8] Failed to add listeners to ALL required input elements!");
        displayError(new Error("ไม่สามารถเชื่อมต่อช่อง Input หลักได้"));
     }
 }

// ================================================================================
// PLANNER UPDATE FUNCTION (Simplified)
// ================================================================================
/** [NEW v1.8] Updates Planner Inputs based on Funnel values */
function updatePlannerInputs(totalInboxes, totalLeads, totalSales) {
    console.log("[updatePlanner v1.8] Updating Planner inputs...");

    // Find planner elements (lookup inside for safety)
    const plannerInboxesEl = document.getElementById('inboxes');
    const plannerInboxToLeadEl = document.getElementById('inboxToLead');
    const plannerInboxToLeadValueEl = document.getElementById('inboxToLeadValue');
    const plannerNotesEl = document.getElementById('planner-notes');

    // Update Planner Inboxes Input
    if (plannerInboxesEl) plannerInboxesEl.value = totalInboxes;

    // Update Planner Inbox->Lead % slider and display
    const actualInboxToLeadPercent = (totalInboxes > 0) ? (totalLeads / totalInboxes * 100) : 0;
    const validInboxToLeadPercent = Math.min(50, Math.max(1, actualInboxToLeadPercent)); // Clamp for slider
    if (plannerInboxToLeadEl) plannerInboxToLeadEl.value = validInboxToLeadPercent.toFixed(1);
    if (plannerInboxToLeadValueEl) plannerInboxToLeadValueEl.textContent = `${validInboxToLeadPercent.toFixed(1)}%`;

    // Update Planner Notes
    if (plannerNotesEl) {
        plannerNotesEl.textContent = `* ผลรวม: Input Inbox ${formatNumber(totalInboxes)} → Actual Lead ${formatNumber(totalLeads)} → Actual Sale ${formatNumber(totalSales)}`;
    }

    // Trigger Planner recalculation if the function exists
    if (typeof calcPlanner === 'function') {
        console.log("[updatePlanner v1.8] Triggering calcPlanner()");
        calcPlanner();
    } else {
        console.warn("[updatePlanner v1.8] calcPlanner function not found.");
    }
}


// ================================================================================
// INTERNAL INITIALIZATION FUNCTION
// ================================================================================
/** Internal function to initialize the report */
function initializeReportInternally() {
    console.log("[InitReport Internally v1.8] Initializing...");
    if (!state.coreData) { /* ... error handling ... */ return; }

    try {
        // 1. Add Event Listeners (Budget & Inbox)
        addFunnelInputListeners();

        // 2. Trigger the first calculation and display update
        console.log("[InitReport Internally] Triggering initial calculation...");
        calculateAndUpdateFunnel(); // Reads coreData, initial inputs (0), calculates, renders funnel, updates planner

        console.log("[InitReport Internally] Report initialized successfully.");

    } catch (error) { /* ... error handling ... */ }
};

// ================================================================================
// AUTO-INITIALIZE ON DOM CONTENT LOADED
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOM Ready v1.8] Attempting initialization...");

    // --- Strict Check 1: Verify essential HTML structure exists ---
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxInput = document.getElementById('funnel-inboxes-input'); // Check Input ID again
    const leadsActualDisp = document.getElementById('funnel-leads-actual');
    // ... add checks for salesActualDisp, cplDisp etc. ...

    if (!budgetInput || !inboxInput || !leadsActualDisp /* || other checks */ ) {
         console.error("[DOM Ready v1.8] CRITICAL: Essential HTML elements missing!");
         displayError(new Error("โครงสร้างหน้าเว็บ Funnel ไม่สมบูรณ์"));
         // Log missing ones
         if (!budgetInput) console.error("Missing: #funnel-budget-input");
         if (!inboxInput) console.error("Missing: #funnel-inboxes-input"); // Log correct ID
         if (!leadsActualDisp) console.error("Missing: #funnel-leads-actual");
         return;
    }
     console.log("[DOM Ready v1.8] Essential HTML elements found.");

    // --- Strict Check 2: Verify window.myReportData ---
    if (/* ... check window.myReportData ... */) {
        console.log("[DOM Ready v1.8] Found valid window.myReportData");
        state.coreData = window.myReportData.core_metrics;
        console.log("[DOM Ready v1.8] Stored core data:", state.coreData);
        initializeReportInternally(); // Initialize
    } else { /* ... error handling for missing data ... */ }
});

console.log("[Script Ready] report-2.js (Funnel Only v1.8 REVERT INBOX) loaded.");

// --- Removed global initialize function ---

// ================================================================================
// SCENARIO PLANNER LOGIC (SECTION 7 - Minimal, needs element refs)
// ================================================================================
// Keep the calcPlanner function if it exists, but ensure refs are correct
// We need to make sure the planner section exists in the simplified HTML if we keep this.
// For now, only define a placeholder calcPlanner if needed by updatePlannerInputs.

window.plannerBase = {}; // Holds default/API values for reset

// References to Planner elements - THESE MIGHT NOT EXIST in simplified HTML!
const plannerTargetEl = document.getElementById('target');
const plannerInboxesEl = document.getElementById('inboxes');
// ... other planner element references ...
const plannerInsightEl = document.getElementById('insight');

/** Calculates and updates the Scenario Planner results. */
function calcPlanner() {
    console.log("[calcPlanner] Calculating planner forecast...");
    // Check if planner elements exist before proceeding
    if (!plannerTargetEl || !plannerInboxesEl /* ... check others ... */) {
         console.warn("[calcPlanner] Planner elements not found, skipping calculation.");
         return;
    }

    // Read current values from Planner inputs
    const target = Number(plannerTargetEl.value) || 0;
    const inboxes = Number(plannerInboxesEl.value) || 0; // Gets value from updatePlannerInputs
    // ... read other planner inputs ...
    const leadToSale = Number(document.getElementById('leadToSale')?.value) || 0;
    const ticket = Number(document.getElementById('ticket')?.value) || 0;
    const inboxToLead = Number(document.getElementById('inboxToLead')?.value) || 0;


    // Perform calculations
    const leads = Math.round((inboxes * inboxToLead) / 100);
    const sales = Math.round((leads * leadToSale) / 100);
    const revenue = sales * ticket;
    const gap = revenue - target;

    // Update Planner display elements
    const leadsOutEl = document.getElementById('leadsOut');
    const salesOutEl = document.getElementById('salesOut');
    // ... other display elements ...
    if (leadsOutEl) leadsOutEl.textContent = leads.toLocaleString();
    if (salesOutEl) salesOutEl.textContent = sales.toLocaleString();
    // ... update revenue, gap, insight ...

     console.log("[calcPlanner] Forecast:", { leads, sales, revenue, gap });
}

// Reset button logic (Simplified - Assumes planner exists)
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        console.log("Reset button clicked.");
        const base = window.plannerBase || {};
        const coreMetrics = state.apiData?.core_metrics || {};

        // Reset Planner user-editable inputs
        if (plannerTargetEl) plannerTargetEl.value = base.target || 6500000;
        if (plannerLeadToSaleEl) plannerLeadToSaleEl.value = (base.leadToSale_percent || 0).toFixed(1);
        if (plannerTicketEl) plannerTicketEl.value = base.avg_ticket_size || 0;

        // Reset Funnel Inputs (Budget/Inbox 0)
        const budgetInput = document.getElementById('funnel-budget-input');
        const inboxesInput = document.getElementById('funnel-inboxes-input');
        if (budgetInput) budgetInput.value = 0;
        if (inboxesInput) inboxesInput.value = 0; // Reset Inbox Input

        console.log("Triggering recalculate after reset.");
        recalculateAndUpdateReport(); // Trigger full recalculation
    });
} else {
     console.warn("Reset button not found.");
}

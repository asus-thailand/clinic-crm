// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Simplified - Funnel Only)
// Version: Funnel Step 1
// - Focuses ONLY on Section 2: Funnel Analysis.
// - Reads Budget/Inbox inputs.
// - Reads Leads/Sales from provided data.
// - Calculates Target Leads and CPL.
// - Updates the display for Section 2.
// ================================================================================

console.log("[Script Load] report-2.js (Funnel Only v1) executing...");

// -- GLOBAL STATE --
// Minimal state needed for this step
window.reportState = window.reportState || {
    coreData: null // Stores the core_metrics part of the data
};
const state = window.reportState;

// Hardcoded KPI for Target Leads calculation
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// -- ELEMENT REFERENCES (Specific to Funnel Section) --
const overallBudgetInputEl = document.getElementById('funnel-budget-input');
const funnelInboxesInputEl = document.getElementById('funnel-inboxes-input');
const funnelLeadsActualEl = document.getElementById('funnel-leads-actual');
const funnelLeadsTargetEl = document.getElementById('funnel-leads-target');
const funnelSalesActualEl = document.getElementById('funnel-sales-actual');
const funnelOverallCplEl = document.getElementById('funnel-overall-cpl');
// const funnelTargetKpiDisplayEl = document.getElementById('funnel-target-kpi-display'); // Not needed if KPI is hardcoded

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) {
    const num = parseFloat(n);
    if (isNaN(num)) return '-';
    const sign = num < 0 ? '-' : (showSign ? '+' : '');
    const absNum = Math.abs(num);
    return sign + '฿' + absNum.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function formatNumber(n) {
     const num = parseFloat(n);
     if (isNaN(num)) return '0';
     return num.toLocaleString();
}
function displayError(error) {
    // Basic error display for now
    const section = document.querySelector('.funnel-section');
    if (section) {
        section.innerHTML = `<p style="color: red; font-weight: bold;">Error: ${error.message}</p>`;
    } else {
        alert(`Error: ${error.message}`);
    }
    console.error("[DisplayError]", error);
}

// ================================================================================
// CORE FUNNEL LOGIC
// ================================================================================

/** Reads Budget and Inbox from inputs */
function getFunnelInputs() {
    const budget = parseFloat(overallBudgetInputEl?.value) || 0;
    const inboxes = parseInt(funnelInboxesInputEl?.value, 10) || 0;
    return {
        overallBudget: Math.max(0, budget),
        totalInboxes: Math.max(0, inboxes)
    };
}

/** Main function to calculate and update the Funnel display */
function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel] Updating...");

    // 1. Read Inputs
    const inputs = getFunnelInputs();
    const overallBudget = inputs.overallBudget;
    const totalInboxes = inputs.totalInboxes;

    // 2. Get Actual Data (from state stored during initialization)
    const actualLeads = state.coreData?.qualified_leads || 0;
    const actualSales = state.coreData?.closed_sales || 0;

    // 3. Perform Calculations
    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100));
    const overallCPL = (actualLeads > 0 && overallBudget > 0) ? (overallBudget / actualLeads) : 0;

    // 4. Update Display Elements
    // Input fields retain their values (no need to update them here)
    // Update display fields
    if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(actualLeads);
    if (funnelLeadsTargetEl) funnelLeadsTargetEl.textContent = formatNumber(targetLeads);
    if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(actualSales);
    if (funnelOverallCplEl) funnelOverallCplEl.textContent = formatCurrency(overallCPL, false, 2); // Show CPL with decimals

    console.log("[CalculateFunnel] Update complete.");
}

/** Event handler for Budget / Inbox inputs */
function handleFunnelInputChange(event) {
     if (event.target && event.target.tagName === 'INPUT') {
          // Basic Validation
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
     const inputsToListen = [ overallBudgetInputEl, funnelInboxesInputEl ];
     inputsToListen.forEach(input => {
         if (input) {
             input.removeEventListener('input', handleFunnelInputChange);
             input.addEventListener('input', handleFunnelInputChange);
             console.log("Added listener to:", input.id);
         } else {
             console.warn("Could not find Funnel input element to add listener.");
         }
     });
 }

// ================================================================================
// GLOBAL INITIALIZATION FUNCTION
// ================================================================================

/**
 * Global function to initialize the Funnel report section with data.
 * @param {Object} reportData - Report data containing at least `core_metrics`.
 */
window.initializeFunnelReport = function(reportData) {
    console.log("[Global Init - Funnel] Initializing with data:", reportData);

    // Basic data validation
    if (!reportData || typeof reportData !== 'object' || !reportData.core_metrics) {
        console.error("[Global Init - Funnel] Invalid or missing core data provided.");
        displayError(new Error("ข้อมูลที่ส่งมาสำหรับรายงานไม่สมบูรณ์ (ต้องการ core_metrics)"));
        return; // Stop initialization
    }

    // Store only the necessary core metrics data
    state.coreData = reportData.core_metrics;
    console.log("[Global Init - Funnel] Stored core data:", state.coreData);

    try {
        // 1. Add Event Listeners to inputs
        addFunnelInputListeners();

        // 2. Trigger the first calculation and display update
        //    (Reads initial 0s from inputs and actuals from state.coreData)
        calculateAndUpdateFunnel();

        console.log("[Global Init - Funnel] Report initialized successfully.");

    } catch (error) {
        console.error("[Global Init - Funnel] Error during initialization:", error);
        displayError(error);
    }
};

console.log("[Script Ready] report-2.js (Funnel Only v1) loaded. Call window.initializeFunnelReport(data) to start.");

// --- Remove Auto-Initialization block ---
// We rely solely on the manual call from the HTML now.

// Fallback definition for initializeFunnelReport (optional, for safety)
if (typeof window.initializeFunnelReport !== 'function') {
     window.initializeFunnelReport = function(reportData) {
          console.warn("initializeFunnelReport called before script fully defined, attempting delayed init.");
          state.coreData = reportData?.core_metrics;
          // Use setTimeout to wait for the rest of the script/DOM potentially
          setTimeout(() => {
                if (state.coreData) {
                     addFunnelInputListeners();
                     calculateAndUpdateFunnel();
                } else {
                     displayError(new Error("Delayed init failed: Invalid data."));
                }
          }, 50);
     }
}

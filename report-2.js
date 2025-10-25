// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Simplified - Funnel Only)
// Version: Funnel Step 1.1 (FIX Calculations)
// - FIX: Corrected Target Leads and CPL calculations.
// ================================================================================

console.log("[Script Load] report-2.js (Funnel Only v1.1 FIX) executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || {
    coreData: null 
};
const state = window.reportState;

// Hardcoded KPI for Target Leads calculation
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// -- ELEMENT REFERENCES --
const overallBudgetInputEl = document.getElementById('funnel-budget-input');
const funnelInboxesInputEl = document.getElementById('funnel-inboxes-input');
const funnelLeadsActualEl = document.getElementById('funnel-leads-actual');
const funnelLeadsTargetEl = document.getElementById('funnel-leads-target');
const funnelSalesActualEl = document.getElementById('funnel-sales-actual');
const funnelOverallCplEl = document.getElementById('funnel-overall-cpl');

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) {
    const num = parseFloat(n);
    if (isNaN(num)) return '-';
    const sign = num < 0 ? '-' : (showSign ? '+' : '');
    const absNum = Math.abs(num);
    // Use toFixed before toLocaleString if decimals are needed
    const fixedNum = absNum.toFixed(decimals);
    return sign + '฿' + parseFloat(fixedNum).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function formatNumber(n) {
     const num = parseFloat(n);
     if (isNaN(num)) return '0';
     // Use toLocaleString for integers
     return Math.round(num).toLocaleString(); // Round leads/sales to whole numbers
}
function displayError(error) { /* ... เหมือนเดิม ... */ }

// ================================================================================
// CORE FUNNEL LOGIC (FIXED)
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

/** [FIXED] Main function to calculate and update the Funnel display */
function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v1.1] Updating...");

    // 1. Read Inputs
    const inputs = getFunnelInputs();
    const overallBudget = inputs.overallBudget;
    const totalInboxes = inputs.totalInboxes;

    // 2. Get Actual Data (ensure state.coreData is populated)
    const actualLeads = state.coreData?.qualified_leads || 0;
    const actualSales = state.coreData?.closed_sales || 0;

    // 3. Perform Calculations (FIXED)
    // Target Leads = Inboxes * KPI % (ensure rounding)
    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100)); 
    // Overall CPL = Budget / Actual Leads (handle division by zero)
    const overallCPL = (actualLeads > 0 && overallBudget > 0) ? (overallBudget / actualLeads) : 0; 

    // 4. Update Display Elements
    console.log(`Updating Display: Leads=${actualLeads}, Target=${targetLeads}, Sales=${actualSales}, CPL=${overallCPL}`); // Debug log
    
    if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(actualLeads);
    if (funnelLeadsTargetEl) funnelLeadsTargetEl.textContent = formatNumber(targetLeads); // Update Target display
    if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(actualSales);
    // Display CPL with 2 decimal places
    if (funnelOverallCplEl) funnelOverallCplEl.textContent = formatCurrency(overallCPL, false, 2); 

    console.log("[CalculateFunnel v1.1] Update complete.");
}

/** Event handler for Budget / Inbox inputs */
function handleFunnelInputChange(event) { /* ... เหมือนเดิม v1 ... */ }

/** Adds event listeners to Budget and Inbox inputs */
function addFunnelInputListeners() { /* ... เหมือนเดิม v1 ... */ }

// ================================================================================
// GLOBAL INITIALIZATION FUNCTION
// ================================================================================

/** Global function to initialize the Funnel report section with data. */
window.initializeFunnelReport = function(reportData) { /* ... เหมือนเดิม v1 ... */ };

console.log("[Script Ready] report-2.js (Funnel Only v1.1 FIX) loaded...");

// --- Fallback definition ---
if (typeof window.initializeFunnelReport !== 'function') { /* ... เหมือนเดิม v1 ... */ }

// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Function-Based / Auto-Detect)
// Version 3.6
// - FIX: Moved DOM element lookups inside functions (getFunnelInputs) to ensure elements exist.
// - Funnel: Budget/Inbox=Input; Leads=Actual/Target Display; Sales=Actual Display; CPL=Calculated Display.
// - Performance: Shows Avg Closing Days, Overall Closing Rate, Filters teams (MAM, AU, GOLF).
// ================================================================================

console.log("[Script Load] report-2.js v3.6 executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || { /* ... state structure เหมือนเดิม ... */ };
const state = window.reportState;
// const TARGET_ROAS = 14; // Removed

// -- ELEMENT REFERENCES (Keep refs needed by multiple functions, or lookup inside) --
// We will look up Funnel inputs inside getFunnelInputs now.
// Keep refs for display elements if frequently updated outside initial render.
const funnelLeadsActualEl = document.getElementById('funnel-leads-actual');
const funnelLeadsTargetEl = document.getElementById('funnel-leads-target');
const funnelSalesActualEl = document.getElementById('funnel-sales-actual');
const funnelOverallCplEl = document.getElementById('funnel-overall-cpl');
const funnelTargetKpiDisplayEl = document.getElementById('funnel-target-kpi-display');
const perfAvgClosingDaysEl = document.getElementById('perf-avg-closing-days');
const perfOverallClosingRateEl = document.getElementById('perf-overall-closing-rate');
const teamGridContainerEl = document.getElementById('team-performance-grid');
// ... (Planner elements refs remain the same) ...
const plannerTargetEl = document.getElementById('target');
const plannerInboxesEl = document.getElementById('inboxes');
const plannerInboxToLeadEl = document.getElementById('inboxToLead');
const plannerLeadToSaleEl = document.getElementById('leadToSale');
const plannerTicketEl = document.getElementById('ticket');
const plannerInboxToLeadValueEl = document.getElementById('inboxToLeadValue');
const plannerLeadsOutEl = document.getElementById('leadsOut');
const plannerSalesOutEl = document.getElementById('salesOut');
const plannerRevenueOutEl = document.getElementById('revenueOut');
const plannerGapOutEl = document.getElementById('gapOut');
const plannerInsightEl = document.getElementById('insight');
const plannerNotesEl = document.getElementById('planner-notes');


// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... เหมือนเดิม ... */ }
function formatNumber(n) { /* ... เหมือนเดิม ... */ }
function displayError(error) { /* ... เหมือนเดิม ... */ }

// ================================================================================
// INPUT READING FUNCTIONS (MODIFIED)
// ================================================================================

/** * [MODIFIED v3.6] Reads Overall Budget and Inbox. Looks up elements internally. */
function getFunnelInputs() {
    // Lookup elements inside the function
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesInput = document.getElementById('funnel-inboxes-input');

    // Read values safely, default to 0
    const budget = parseFloat(budgetInput?.value) || 0;
    const inboxes = parseInt(inboxesInput?.value, 10) || 0;

    // Log element lookup and values for debugging
    // console.log("getFunnelInputs - Budget El:", budgetInput, "Value:", budgetInput?.value);
    // console.log("getFunnelInputs - Inboxes El:", inboxesInput, "Value:", inboxesInput?.value);
    
    return {
        overallBudget: Math.max(0, budget),
        totalInboxes: Math.max(0, inboxes)
    };
}

/** Reads Marketing Inputs (Budget per month) - Unchanged */
function getMarketingInputs() { /* ... เหมือนเดิม v3.4 ... */ }


// ================================================================================
// MARKETING INPUT LOGIC (Section removed - keep functions if needed elsewhere)
// ================================================================================
function createMarketingInputTable() { /* ... เหมือนเดิม v3.4 ... */ }
function handleMarketingInputChange(event) { /* ... เหมือนเดิม v3.4 ... */ }

// ================================================================================
// FINANCIAL TABLE & CORE CALCULATION LOGIC (MODIFIED)
// ================================================================================

/** * [MODIFIED] Core recalculation logic V3.6 */
function recalculateAndUpdateReport() {
    console.log("[Recalculate V3.6] Starting..."); 

    // Ensure apiData exists
    if (!state.apiData || !state.apiData.core_metrics) { /* ... check data ... */ return; }

    // --- 1. Read Inputs ---
    // This now looks up elements internally, should be safer
    const funnelInputs = getFunnelInputs(); 
    console.log("[Recalculate V3.6] Funnel Inputs Read:", funnelInputs); // Debugging log
    
    const kpiTargetPercent = 30; 

    // --- 2. Get Actual Core Metrics ---
    const coreMetrics = state.apiData.core_metrics;
    const actualTotalLeads = coreMetrics.qualified_leads || 0;
    const actualTotalSales = coreMetrics.closed_sales || 0;
    const avgClosingDays = coreMetrics.avg_closing_days; 

    // --- 3. Perform Core Calculations ---
    // Check if funnelInputs is valid before accessing properties
    if (!funnelInputs) {
        console.error("[Recalculate V3.6] funnelInputs is undefined or null!");
        displayError(new Error("เกิดข้อผิดพลาดในการอ่านข้อมูล Input (Funnel)"));
        return; 
    }
    const targetLeads = Math.round(funnelInputs.totalInboxes * (kpiTargetPercent / 100)); // Error was likely here
    const overallCPL = (actualTotalLeads > 0 && funnelInputs.overallBudget > 0) ? (funnelInputs.overallBudget / actualTotalLeads) : 0;
    const actualLeadToSalePercent = (actualTotalLeads > 0) ? (actualTotalSales / actualTotalLeads * 100) : 0;

    // --- 4. Render Funnel (Sec 2) ---
    renderFunnel({
        budget: funnelInputs.overallBudget, inboxes: funnelInputs.totalInboxes,
        leadsActual: actualTotalLeads, leadsTarget: targetLeads,
        salesActual: actualTotalSales, overallCPL: overallCPL,
        targetKPIPercent: kpiTargetPercent 
    });

    // --- 5. Render Performance Summary (Sec 3) ---
    renderPerformanceSummary({ avgClosingDays: avgClosingDays, overallClosingRate: actualLeadToSalePercent });

    // --- 6. Render Team Performance Grid (Sec 3 - filtered) ---
    renderTeamPerformance(state.apiData?.team_breakdown || []);
    
    // --- 7. Update Planner Inputs & Recalculate --- 
    updatePlannerAndTotals(funnelInputs.totalInboxes, actualTotalLeads, actualTotalSales);

    console.log("[Recalculate V3.6] Report update complete."); 
}


/** * Renders Financial Table - Unchanged from v3.4 */
function renderFinancials(financialDataToRender) { /* ... เหมือนเดิม v3.4 ... */ }
/** Event handler for financial table inputs - Unchanged */
function handleFinancialTableInputChange(event) { /* ... เหมือนเดิม v3.4 ... */ }
/** * Calculates Financial Totals & Updates Planner.
 * [MODIFIED] Reads Overall Budget using getFunnelInputs().
 */
function updatePlannerAndTotals(totalInboxes, totalLeads, totalSales) {
    const tableBody = document.getElementById('financial-table-body');
    // Read Overall Budget using the safer function
    const funnelInputsForTotal = getFunnelInputs(); // Get current budget/inbox again
    const overallBudget = funnelInputsForTotal.overallBudget; 

    // Sum Revenue total from Section 6 inputs (or use API total)
    let totalRevenue = state.apiData?.core_metrics?.total_revenue || 0;
    /* ... (Optional: uncomment revenue summing from table if needed) ... */
    
    // Calculate Overall ROAS 
    const totalROAS = (overallBudget > 0) ? (totalRevenue / overallBudget) : 0;

    // --- Update Stat Cards (Formerly Section 6) ---
    const financialBudgetEl = document.getElementById('financial-budget');
    const financialRevenueEl = document.getElementById('financial-revenue');
    const financialRoasEl = document.getElementById('financial-roas');
    if (financialBudgetEl) financialBudgetEl.textContent = formatCurrency(overallBudget); 
    if (financialRevenueEl) financialRevenueEl.textContent = formatCurrency(totalRevenue);
    if (financialRoasEl) financialRoasEl.textContent = `${totalROAS.toFixed(2)}x`;

    // --- Update Planner Inputs ---
    if (plannerInboxesEl) plannerInboxesEl.value = totalInboxes; 
    
    const actualInboxToLeadPercent = (totalInboxes > 0) ? (totalLeads / totalInboxes * 100) : 0;
    const validInboxToLeadPercent = Math.min(50, Math.max(1, actualInboxToLeadPercent)); 
    if (plannerInboxToLeadEl) plannerInboxToLeadEl.value = validInboxToLeadPercent.toFixed(1); 
    if (plannerInboxToLeadValueEl) plannerInboxToLeadValueEl.textContent = `${validInboxToLeadPercent.toFixed(1)}%`; 

    // --- Update Planner Notes ---
    if (plannerNotesEl) { /* ... เหมือนเดิม v3.4 ... */ }

    // --- Trigger Planner Recalculation ---
    if (typeof calcPlanner === 'function') calcPlanner();
}


// ================================================================================
// OTHER RENDERING FUNCTIONS (MODIFIED)
// ================================================================================

/** * [MODIFIED v3.6] Renders Funnel section display elements (Sec 2). */
function renderFunnel(funnelData) {
    // Lookup elements inside the function for safety
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesInput = document.getElementById('funnel-inboxes-input');
    const leadsActualDisp = document.getElementById('funnel-leads-actual');
    const leadsTargetDisp = document.getElementById('funnel-leads-target');
    const salesActualDisp = document.getElementById('funnel-sales-actual');
    const overallCplDisp = document.getElementById('funnel-overall-cpl');
    const targetKpiDisp = document.getElementById('funnel-target-kpi-display');

    // Update Input fields only if not focused
    if (budgetInput && document.activeElement !== budgetInput) { 
        budgetInput.value = Math.round(funnelData.budget || 0); 
    }
    if (inboxesInput && document.activeElement !== inboxesInput) { 
        inboxesInput.value = funnelData.inboxes || 0; 
    }

    // Update Display elements
    if (leadsActualDisp) leadsActualDisp.textContent = formatNumber(funnelData.leadsActual || 0);
    if (leadsTargetDisp) leadsTargetDisp.textContent = formatNumber(funnelData.leadsTarget || 0);
    if (salesActualDisp) salesActualDisp.textContent = formatNumber(funnelData.salesActual || 0);
    if (overallCplDisp) overallCplDisp.textContent = formatCurrency(funnelData.overallCPL, false, 2); 
    if (targetKpiDisp) targetKpiDisp.textContent = (funnelData.targetKPIPercent || 0).toFixed(1);
}

/** Renders the Performance Summary metrics (Sec 3) - Unchanged */
function renderPerformanceSummary(perfData) { /* ... เหมือนเดิม v3.4 ... */ }

/** Renders Team Performance, filtering out 'Online' - Unchanged */
function renderTeamPerformance(teamBreakdown = []) { /* ... เหมือนเดิม v3.4 ... */ }

/** Renders static Recommendations - Removed */
// function renderRecommendations() { /* ... */ }

/** Renders KPIs - Removed */
// function renderKPIs(...) { /* ... */ }


/** Populates Planner defaults - Unchanged */
function populatePlanner(plannerDefaults = {}) { /* ... เหมือนเดิม v3.4 ... */ }


// ================================================================================
// MAIN INITIALIZATION (MODIFIED)
// ================================================================================

/** Internal function to initialize the report */
function initializeReportWithData() {
    console.log("[InitReport V3.6] Initializing...");
    
    state.apiData = state.apiData || { core_metrics: {}, monthly_breakdown: [], team_breakdown: [], planner_defaults: {} };
    state.currentUser = state.currentUser || null; 

    try {
        // 1. Populate Planner defaults 
        populatePlanner(state.apiData.planner_defaults); 

        // 2. Set initial values for Funnel section display elements (Leads/Sales from API)
        const coreMetrics = state.apiData.core_metrics || {};
        // Use the safe references defined globally
        if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(coreMetrics.qualified_leads || 0);
        if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(coreMetrics.closed_sales || 0);
        // Budget and Inbox inputs will start at 0 (or their default HTML value)

        // 3. Trigger the first calculation cycle 
        // Reads initial 0s from inputs, calculates based on API leads/sales, renders everything
        recalculateAndUpdateReport(); 

        // 4. Render Team Performance (Filtered) - Called within recalculate now
        // renderTeamPerformance(state.apiData.team_breakdown || []);
        
        // 5. Add Event Listeners for Funnel Inputs
        addFunnelInputListeners();

        console.log("[InitReport V3.6] Initialization complete.");

    } catch (error) { console.error("[InitReport V3.6] Error:", error); displayError(error); }
}

/** Adds event listeners to ONLY Budget and Inbox inputs */
function addFunnelInputListeners() {
     // Lookup elements inside this function too for safety on initial load
     const budgetInput = document.getElementById('funnel-budget-input');
     const inboxesInput = document.getElementById('funnel-inboxes-input');
     const inputsToListen = [ budgetInput, inboxesInput ];

    inputsToListen.forEach(input => {
        if (input) {
            input.removeEventListener('input', handleFunnelInputChange); 
            input.addEventListener('input', handleFunnelInputChange);
        } else {
            console.warn("Could not find Funnel input element to add listener.");
        }
    });
}

/** Event handler for Budget / Inbox inputs */
function handleFunnelInputChange(event) { /* ... เหมือนเดิม v3.4 ... */ }


// ================================================================================
// SCENARIO PLANNER LOGIC (SECTION 7) - Unchanged Calculation Logic
// ================================================================================
window.plannerBase = {}; 
/* ... planner element references ... */
function calcPlanner() { /* ... Calculation logic is the same ... */ }
// --- Event Listeners for Planner (Section 7) ---
/* ... Listeners for Target, Lead->Sale, Ticket, Slider remain the same ... */
// Reset button logic (MODIFIED to reset new Funnel inputs correctly)
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        console.log("Reset button clicked.");
        const base = window.plannerBase || {}; 
        const coreMetrics = state.apiData?.core_metrics || {}; 

        // Reset Planner user-editable inputs
        /* ... Reset Target, Lead->Sale, Ticket ... */
        
        // Reset Funnel Inputs (Budget/Inbox 0)
        const budgetInput = document.getElementById('funnel-budget-input');
        const inboxesInput = document.getElementById('funnel-inboxes-input');
        if (budgetInput) { budgetInput.value = 0; budgetInput.style.outline = ''; } 
        if (inboxesInput) { inboxesInput.value = 0; inboxesInput.style.outline = ''; } 
        // Note: Funnel display elements (Leads/Sales) will be updated by recalc

        state.calculatedFinancialData = []; 
        console.log("Triggering recalculate after reset.");
        recalculateAndUpdateReport(); 
    });
}

// ================================================================================
// GLOBAL INITIALIZATION FUNCTION & AUTO-DETECT MODE
// ================================================================================
window.initializeSalesReport = function(reportData, userData = null) { /* ... เหมือนเดิม v3.1 ... */ };
console.log("[Script Ready] report-2.js v3.6 loaded...");
// --- Auto-Detection / Auto-Initialization --- (Removed for manual init focus)
/* ... */
// Fallback definition for initializeSalesReport
if (typeof window.initializeSalesReport !== 'function') { /* ... */ }

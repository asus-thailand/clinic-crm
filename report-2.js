// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Function-Based / Auto-Detect)
// Version 3.8 (Intensive Debugging)
// - Added extensive console.log statements to trace data flow and element updates.
// ================================================================================

console.log("[Script Load] report-2.js v3.8 DEBUG executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || { /* ... state structure ... */ };
const state = window.reportState;
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// -- ELEMENT REFERENCES -- (Keep global refs for frequently used display elements)
const funnelLeadsActualEl = document.getElementById('funnel-leads-actual');
const funnelLeadsTargetEl = document.getElementById('funnel-leads-target');
const funnelSalesActualEl = document.getElementById('funnel-sales-actual');
const funnelOverallCplEl = document.getElementById('funnel-overall-cpl');
const funnelTargetKpiDisplayEl = document.getElementById('funnel-target-kpi-display');
const perfAvgClosingDaysEl = document.getElementById('perf-avg-closing-days');
const perfOverallClosingRateEl = document.getElementById('perf-overall-closing-rate');
const teamGridContainerEl = document.getElementById('team-performance-grid');
// ... (Planner elements refs) ...

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... เหมือนเดิม ... */ }
function formatNumber(n) { /* ... เหมือนเดิม ... */ }
function displayError(error) { /* ... เหมือนเดิม ... */ }

// ================================================================================
// INPUT READING FUNCTIONS
// ================================================================================
function getFunnelInputs() {
    // Lookup inside function remains safer
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesInput = document.getElementById('funnel-inboxes-input');
    const budget = parseFloat(budgetInput?.value) || 0;
    const inboxes = parseInt(inboxesInput?.value, 10) || 0;
    // console.log("[getFunnelInputs] Budget:", budget, "Inboxes:", inboxes); // DEBUG
    return { overallBudget: Math.max(0, budget), totalInboxes: Math.max(0, inboxes) };
}

// ================================================================================
// CORE CALCULATION & RENDERING LOGIC (WITH DEBUGGING)
// ================================================================================

/** Core recalculation function V3.8 */
function recalculateAndUpdateReport() {
    console.log("[Recalculate V3.8] Starting...");

    // --- 0. Check for necessary elements upfront ---
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesInput = document.getElementById('funnel-inboxes-input');
    if (!budgetInput || !inboxesInput) {
        console.error("[Recalculate V3.8] CRITICAL: Funnel input elements not found!");
        displayError(new Error("องค์ประกอบ Input หลักหายไป"));
        return;
    }

    // --- 1. Check API Data ---
    if (!state.apiData || !state.apiData.core_metrics) {
        console.warn("[Recalculate V3.8] API data not available in state. Aborting calculation.");
        // Clear display fields to indicate missing data
        if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = '-';
        if (funnelLeadsTargetEl) funnelLeadsTargetEl.textContent = '-';
        if (funnelSalesActualEl) funnelSalesActualEl.textContent = '-';
        if (funnelOverallCplEl) funnelOverallCplEl.textContent = '-';
        // ... clear performance summary ...
        return;
    }
    console.log("[Recalculate V3.8] state.apiData.core_metrics:", state.apiData.core_metrics); // DEBUG

    // --- 2. Read Inputs ---
    const funnelInputs = getFunnelInputs(); // Reads Overall Budget & Inboxes
    console.log("[Recalculate V3.8] Funnel Inputs Read:", funnelInputs); // DEBUG

    const kpiTargetPercent = 30; // Hardcoded KPI target %

    // --- 3. Get Actual Core Metrics ---
    const coreMetrics = state.apiData.core_metrics;
    const actualTotalLeads = coreMetrics.qualified_leads || 0;
    const actualTotalSales = coreMetrics.closed_sales || 0;
    const avgClosingDays = coreMetrics.avg_closing_days;
    const totalRevenue = coreMetrics.total_revenue || 0; // Get total revenue
    console.log(`[Recalculate V3.8] Actual Metrics: Leads=${actualTotalLeads}, Sales=${actualTotalSales}, AvgDays=${avgClosingDays}, Revenue=${totalRevenue}`); // DEBUG

    // --- 4. Perform Core Calculations ---
    const targetLeads = Math.round(funnelInputs.totalInboxes * (kpiTargetPercent / 100));
    const overallCPL = (actualTotalLeads > 0 && funnelInputs.overallBudget > 0) ? (funnelInputs.overallBudget / actualTotalLeads) : 0;
    const actualLeadToSalePercent = (actualTotalLeads > 0) ? (actualTotalSales / actualTotalLeads * 100) : 0;
    const totalROAS = (funnelInputs.overallBudget > 0) ? (totalRevenue / funnelInputs.overallBudget) : 0;
    console.log(`[Recalculate V3.8] Calculated Metrics: TargetLeads=${targetLeads}, CPL=${overallCPL}, LeadSale%=${actualLeadToSalePercent}, ROAS=${totalROAS}`); // DEBUG

    // --- 5. Render Funnel (Sec 2) ---
    console.log("[Recalculate V3.8] Calling renderFunnel..."); // DEBUG
    renderFunnel({
        budget: funnelInputs.overallBudget, inboxes: funnelInputs.totalInboxes,
        leadsActual: actualTotalLeads, leadsTarget: targetLeads,
        salesActual: actualTotalSales, overallCPL: overallCPL,
        targetKPIPercent: kpiTargetPercent
    });

    // --- 6. Render Performance Summary (Sec 3) ---
    console.log("[Recalculate V3.8] Calling renderPerformanceSummary..."); // DEBUG
    renderPerformanceSummary({
        avgClosingDays: avgClosingDays,
        overallClosingRate: actualLeadToSalePercent
    });

    // --- 7. Render Team Performance Grid (Sec 3 - filtered) ---
    console.log("[Recalculate V3.8] Calling renderTeamPerformance..."); // DEBUG
    renderTeamPerformance(state.apiData?.team_breakdown || []);

    // --- 8. Update Planner Inputs & Recalculate ---
    console.log("[Recalculate V3.8] Calling updatePlannerAndTotals..."); // DEBUG
    updatePlannerAndTotals(funnelInputs.totalInboxes, actualTotalLeads, actualTotalSales, totalRevenue, totalROAS);

    console.log("[Recalculate V3.8] Report update complete.");
}


/** * Renders Funnel section display elements (Sec 2). */
function renderFunnel(funnelData) {
    console.log("[renderFunnel] Data received:", funnelData); // DEBUG

    // Lookup elements inside again for safety
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

    // Update Display elements, check if found
    if (leadsActualDisp) {
        leadsActualDisp.textContent = formatNumber(funnelData.leadsActual || 0);
        console.log("[renderFunnel] Updated Leads Actual Display:", leadsActualDisp.textContent); // DEBUG
    } else { console.error("[renderFunnel] Element 'funnel-leads-actual' NOT FOUND!"); }

    if (leadsTargetDisp) {
        leadsTargetDisp.textContent = formatNumber(funnelData.leadsTarget || 0);
        console.log("[renderFunnel] Updated Leads Target Display:", leadsTargetDisp.textContent); // DEBUG
    } else { console.error("[renderFunnel] Element 'funnel-leads-target' NOT FOUND!"); }

    if (salesActualDisp) {
        salesActualDisp.textContent = formatNumber(funnelData.salesActual || 0);
        console.log("[renderFunnel] Updated Sales Actual Display:", salesActualDisp.textContent); // DEBUG
    } else { console.error("[renderFunnel] Element 'funnel-sales-actual' NOT FOUND!"); }

    if (overallCplDisp) {
        overallCplDisp.textContent = formatCurrency(funnelData.overallCPL, false, 2);
        console.log("[renderFunnel] Updated CPL Display:", overallCplDisp.textContent); // DEBUG
    } else { console.error("[renderFunnel] Element 'funnel-overall-cpl' NOT FOUND!"); }

    if (targetKpiDisp) {
        targetKpiDisp.textContent = (funnelData.targetKPIPercent || 0).toFixed(1);
    } else { console.warn("[renderFunnel] Element 'funnel-target-kpi-display' not found."); }
}

/** Renders the Performance Summary metrics (Sec 3) */
function renderPerformanceSummary(perfData) {
     console.log("[renderPerfSummary] Data:", perfData); // DEBUG
     const avgDaysEl = document.getElementById('perf-avg-closing-days');
     const closingRateEl = document.getElementById('perf-overall-closing-rate');

     if (avgDaysEl) {
         avgDaysEl.textContent = perfData.avgClosingDays !== null && perfData.avgClosingDays !== undefined
                                         ? perfData.avgClosingDays.toFixed(1)
                                         : '-';
        console.log("[renderPerfSummary] Updated Avg Days:", avgDaysEl.textContent); // DEBUG
     } else { console.error("[renderPerfSummary] Element 'perf-avg-closing-days' NOT FOUND!"); }

     if (closingRateEl) {
         closingRateEl.textContent = (perfData.overallClosingRate || 0).toFixed(1);
         console.log("[renderPerfSummary] Updated Closing Rate:", closingRateEl.textContent); // DEBUG
     } else { console.error("[renderPerfSummary] Element 'perf-overall-closing-rate' NOT FOUND!"); }
}


/** Renders Team Performance, filtering out 'Online' */
function renderTeamPerformance(teamBreakdown = []) { /* ... เหมือนเดิม v3.4 ... */ }

/** Updates Planner Inputs & Triggers Planner Calculation. */
function updatePlannerAndTotals(totalInboxes, totalLeads, totalSales, totalRevenue, totalROAS) {
    console.log("[updatePlanner] Updating Planner with:", {totalInboxes, totalLeads, totalSales, totalRevenue, totalROAS}); // DEBUG
    /* ... Logic เหมือนเดิม v3.7 ... */
    // Ensure planner elements exist before updating
    const plannerInboxesEl = document.getElementById('inboxes');
    if (plannerInboxesEl) plannerInboxesEl.value = totalInboxes;
    // ... rest of planner updates ...
    if (typeof calcPlanner === 'function') {
        console.log("[updatePlanner] Triggering calcPlanner()"); // DEBUG
        calcPlanner();
    }
}


// ================================================================================
// MAIN INITIALIZATION (WITH DEBUGGING)
// ================================================================================

/** Internal function to initialize the report */
function initializeReportWithData() {
    console.log("[InitReport V3.8] Initializing...");

    // Ensure state.apiData and core_metrics exist
    state.apiData = state.apiData || { core_metrics: {}, monthly_breakdown: [], team_breakdown: [], planner_defaults: {} };
    state.currentUser = state.currentUser || null;
    console.log("[InitReport V3.8] Initial state.apiData.core_metrics:", state.apiData.core_metrics); // DEBUG

    try {
        // 1. Populate Planner defaults
        console.log("[InitReport V3.8] Populating planner defaults..."); // DEBUG
        populatePlanner(state.apiData.planner_defaults);

        // 2. Set initial Funnel display values (Check elements exist first)
        const coreMetrics = state.apiData.core_metrics || {};
        const initialLeadsEl = document.getElementById('funnel-leads-actual');
        const initialSalesEl = document.getElementById('funnel-sales-actual');
        if (initialLeadsEl) {
            initialLeadsEl.textContent = formatNumber(coreMetrics.qualified_leads || 0);
            console.log("[InitReport V3.8] Initial Leads set to:", initialLeadsEl.textContent); // DEBUG
        } else { console.error("[InitReport V3.8] Initial Leads element not found!");}
        if (initialSalesEl) {
            initialSalesEl.textContent = formatNumber(coreMetrics.closed_sales || 0);
            console.log("[InitReport V3.8] Initial Sales set to:", initialSalesEl.textContent); // DEBUG
        } else { console.error("[InitReport V3.8] Initial Sales element not found!");}
        // Budget and Inbox inputs start at 0 (HTML default)

        // 3. Trigger the first calculation cycle
        console.log("[InitReport V3.8] Triggering initial recalculateAndUpdateReport..."); // DEBUG
        recalculateAndUpdateReport();

        // 4. Add Event Listeners for Funnel Inputs
        console.log("[InitReport V3.8] Adding funnel input listeners..."); // DEBUG
        addFunnelInputListeners();

        console.log("[InitReport V3.8] Initialization complete.");

    } catch (error) { console.error("[InitReport V3.8] Error during initialization:", error); displayError(error); }
}

/** Adds event listeners to Budget and Inbox inputs */
function addFunnelInputListeners() { /* ... เหมือนเดิม v3.7 ... */ }

/** Event handler for Budget / Inbox inputs */
function handleFunnelInputChange(event) { /* ... เหมือนเดิม v3.7 ... */ }


// ================================================================================
// SCENARIO PLANNER LOGIC (SECTION 7) - Unchanged Calculation Logic
// ================================================================================
window.plannerBase = {};
/* ... planner element references ... */
function calcPlanner() { /* ... Calculation logic is the same ... */ }
// --- Event Listeners for Planner (Section 7) ---
/* ... Listeners for Target, Lead->Sale, Ticket, Slider remain the same ... */
// Reset button logic
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) { /* ... Reset logic เหมือนเดิม v3.7 ... */ }

// ================================================================================
// GLOBAL INITIALIZATION FUNCTION & AUTO-DETECT MODE
// ================================================================================
window.initializeSalesReport = function(reportData, userData = null) { /* ... เหมือนเดิม v3.1 ... */ };
console.log("[Script Ready] report-2.js v3.8 DEBUG loaded...");
// --- Fallback definition ---
if (typeof window.initializeSalesReport !== 'function') { /* ... */ }

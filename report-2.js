// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Function-Based / Auto-Detect)
// Version 3.5
// - FIX: Ensure actual Leads & Sales from API data are correctly displayed in Funnel section.
// - Funnel: Budget/Inbox=Input; Leads=Actual/Target Display; Sales=Actual Display; CPL=Calculated Display.
// - Performance: Shows Avg Closing Days, Overall Closing Rate, Filters teams (MAM, AU, GOLF).
// ================================================================================

console.log("[Script Load] report-2.js v3.5 executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || { /* ... state structure เหมือนเดิม ... */ };
const state = window.reportState;
// const TARGET_ROAS = 14; // No longer used for default calculation

// -- ELEMENT REFERENCES --
// Funnel Section 2
const overallBudgetInputEl = document.getElementById('funnel-budget-input');
const funnelInboxesInputEl = document.getElementById('funnel-inboxes-input');
const funnelLeadsActualEl = document.getElementById('funnel-leads-actual'); // Display Actual
const funnelLeadsTargetEl = document.getElementById('funnel-leads-target'); // Display Target
const funnelSalesActualEl = document.getElementById('funnel-sales-actual'); // Display Actual
const funnelOverallCplEl = document.getElementById('funnel-overall-cpl');   // Display CPL
const funnelTargetKpiDisplayEl = document.getElementById('funnel-target-kpi-display'); // Span showing target % used

// Performance Section 3
const perfAvgClosingDaysEl = document.getElementById('perf-avg-closing-days');
const perfOverallClosingRateEl = document.getElementById('perf-overall-closing-rate');
const teamGridContainerEl = document.getElementById('team-performance-grid');

// Planner Section 7
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
// INPUT READING FUNCTIONS
// ================================================================================
function getFunnelInputs() { /* ... Reads Budget & Inboxes - เหมือนเดิม v3.4 ... */ }
function getMarketingInputs() { /* ... Reads Monthly Budgets - เหมือนเดิม v3.4 ... */ }

// ================================================================================
// MARKETING INPUT LOGIC (Section removed from UI - kept for financial table)
// ================================================================================
function createMarketingInputTable() { /* ... เหมือนเดิม v3.4 ... */ }
function handleMarketingInputChange(event) { /* ... เหมือนเดิม v3.4 ... */ }

// ================================================================================
// FINANCIAL TABLE & CORE CALCULATION LOGIC (MODIFIED)
// ================================================================================

/** * [MODIFIED] Core recalculation logic V3.5 */
function recalculateAndUpdateReport() {
    console.log("[Recalculate V3.5] Starting...");

    // Ensure apiData exists before proceeding
    if (!state.apiData || !state.apiData.core_metrics) {
        console.warn("[Recalculate] API data not available in state. Aborting.");
        // Optionally, clear display fields or show a specific message
        if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = '-';
        if (funnelSalesActualEl) funnelSalesActualEl.textContent = '-';
        // ... clear other fields ...
        return;
    }

    // --- 1. Read Inputs ---
    const funnelInputs = getFunnelInputs(); // Reads Overall Budget & Inboxes
    const kpiTargetPercent = 30; // Hardcoded KPI target %

    // --- 2. Get Actual Core Metrics ---
    const coreMetrics = state.apiData.core_metrics;
    const actualTotalLeads = coreMetrics.qualified_leads || 0;
    const actualTotalSales = coreMetrics.closed_sales || 0;
    const avgClosingDays = coreMetrics.avg_closing_days;

    // --- 3. Perform Core Calculations ---
    const targetLeads = Math.round(funnelInputs.totalInboxes * (kpiTargetPercent / 100));
    const overallCPL = (actualTotalLeads > 0 && funnelInputs.overallBudget > 0) ? (funnelInputs.overallBudget / actualTotalLeads) : 0;
    const actualLeadToSalePercent = (actualTotalLeads > 0) ? (actualTotalSales / actualTotalLeads * 100) : 0;

    // --- 4. Render Funnel (Sec 2) ---
    // Pass all necessary calculated and read values
    renderFunnel({
        budget: funnelInputs.overallBudget,
        inboxes: funnelInputs.totalInboxes,
        leadsActual: actualTotalLeads,      // Pass Actual Leads
        leadsTarget: targetLeads,           // Pass Calculated Target Leads
        salesActual: actualTotalSales,      // Pass Actual Sales
        overallCPL: overallCPL,             // Pass Calculated CPL
        targetKPIPercent: kpiTargetPercent  // Pass Target % used
    });

    // --- 5. Render Performance Summary (Sec 3) ---
    renderPerformanceSummary({
        avgClosingDays: avgClosingDays,
        overallClosingRate: actualLeadToSalePercent // Pass Calculated Closing Rate
    });

    // --- 6. Render Team Performance Grid (Sec 3 - filtered) ---
    renderTeamPerformance(state.apiData?.team_breakdown || []);

    // --- 7. Update Planner Inputs & Recalculate ---
    // This function reads financial table inputs (if any) and updates planner
    updatePlannerAndTotals(funnelInputs.totalInboxes, actualTotalLeads, actualTotalSales);

    console.log("[Recalculate V3.5] Report update complete.");
}


/** * Renders Financial Table - Logic mostly unchanged, ensures it uses overall budget from funnel input */
function renderFinancials(financialDataToRender) {
    // ... (Code to render rows based on financialDataToRender - เหมือนเดิม v3.4) ...
    // ... (Add event listener - เหมือนเดิม v3.4) ...
    // Call updatePlannerAndTotals instead of updateFinancialTotals directly
    // updateFinancialTotals(); // Removed - called by recalculateAndUpdateReport now
}

/** Event handler for financial table inputs - Unchanged */
function handleFinancialTableInputChange(event) { /* ... เหมือนเดิม v3.4 ... */ }


/** * [MODIFIED] Calculates Financial Totals & Updates Planner.
 * Now takes funnel totals as arguments. Reads overall budget from input.
 */
function updatePlannerAndTotals(totalInboxes, totalLeads, totalSales) {
    const tableBody = document.getElementById('financial-table-body');
    // Read Overall Budget from Section 2 Input
    const overallBudget = parseFloat(overallBudgetInputEl?.value) || 0;

    // Sum Revenue total from Section 6 inputs (or use API total if table removed)
    let totalRevenue = state.apiData?.core_metrics?.total_revenue || 0;
    // Uncomment if financial table provides revenue overrides:
    // if (tableBody) {
    //     const rows = tableBody.querySelectorAll('tr');
    //     totalRevenue = 0;
    //     rows.forEach(row => {
    //         totalRevenue += parseFloat(row.querySelector('.input-revenue')?.value) || 0;
    //     });
    // }

    // Calculate Overall ROAS using Overall Budget
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
    if (plannerNotesEl) {
        // Note uses Actual Sales count from API/Core Metrics passed as argument
        plannerNotesEl.textContent = `* ผลรวม: Input Inbox ${formatNumber(totalInboxes)} → Actual Lead ${formatNumber(totalLeads)} → Actual Sale ${formatNumber(totalSales)}`;
    }

    // --- Trigger Planner Recalculation ---
    if (typeof calcPlanner === 'function') calcPlanner();
}


// ================================================================================
// OTHER RENDERING FUNCTIONS (MODIFIED)
// ================================================================================

/** * [MODIFIED] Renders Funnel section display elements (Sec 2). */
function renderFunnel(funnelData) {
    // funnelData = { budget, inboxes, leadsActual, leadsTarget, salesActual, overallCPL, targetKPIPercent }

    // Update Input fields only if they are not currently focused by the user
    if (overallBudgetInputEl && document.activeElement !== overallBudgetInputEl) {
        overallBudgetInputEl.value = Math.round(funnelData.budget || 0);
    }
    if (funnelInboxesInputEl && document.activeElement !== funnelInboxesInputEl) {
        funnelInboxesInputEl.value = funnelData.inboxes || 0;
    }

    // Update Display elements for Leads, Sales, CPL
    if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(funnelData.leadsActual || 0);
    if (funnelLeadsTargetEl) funnelLeadsTargetEl.textContent = formatNumber(funnelData.leadsTarget || 0);
    if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(funnelData.salesActual || 0);
    if (funnelOverallCplEl) funnelOverallCplEl.textContent = formatCurrency(funnelData.overallCPL, false, 2); // Show CPL with decimals
    if (funnelTargetKpiDisplayEl) funnelTargetKpiDisplayEl.textContent = (funnelData.targetKPIPercent || 0).toFixed(1); // Show the target % used
}

/** Renders the Performance Summary metrics (Sec 3) */
function renderPerformanceSummary(perfData) {
     if (perfAvgClosingDaysEl) {
         perfAvgClosingDaysEl.textContent = perfData.avgClosingDays !== null && perfData.avgClosingDays !== undefined
                                         ? perfData.avgClosingDays.toFixed(1)
                                         : '-'; // Show '-' if null/undefined
     }
     if (perfOverallClosingRateEl) {
         perfOverallClosingRateEl.textContent = (perfData.overallClosingRate || 0).toFixed(1);
     }
}

/** Renders Team Performance, filtering out 'Online' */
function renderTeamPerformance(teamBreakdown = []) { /* ... เหมือนเดิม v3.4 ... */ }

/** Renders static Recommendations - Removed */
// function renderRecommendations() { /* ... */ }

/** Renders KPIs - Removed */
// function renderKPIs(...) { /* ... */ }


/** Populates Planner defaults */
function populatePlanner(plannerDefaults = {}) {
     plannerDefaults = plannerDefaults || {};

    // Store base values for Reset
    window.plannerBase = {
        target: plannerDefaults.target || 6500000,
        leadToSale_percent: plannerDefaults.leadToSale_percent || 0,
        avg_ticket_size: plannerDefaults.avg_ticket_size || 0,
    };

    // Populate Planner inputs (Sec 7)
    if (plannerTargetEl) plannerTargetEl.value = window.plannerBase.target;
    if (plannerLeadToSaleEl) plannerLeadToSaleEl.value = window.plannerBase.leadToSale_percent.toFixed(1);
    if (plannerTicketEl) plannerTicketEl.value = window.plannerBase.avg_ticket_size;

    // Initial calculation happens via recalculateAndUpdateReport chain
}


// ================================================================================
// MAIN INITIALIZATION (MODIFIED)
// ================================================================================

/** Internal function to initialize the report */
function initializeReportWithData() {
    console.log("[InitReport V3.5] Initializing...");

    state.apiData = state.apiData || { core_metrics: {}, monthly_breakdown: [], team_breakdown: [], planner_defaults: {} };
    state.currentUser = state.currentUser || null;

    try {
        // 1. Populate Planner defaults (needs to happen before first calc)
        populatePlanner(state.apiData.planner_defaults);

        // 2. Set initial values for Funnel section
        //    (Budget/Inbox 0, Leads/Sales display from API)
        const coreMetrics = state.apiData.core_metrics || {};
        if (overallBudgetInputEl) overallBudgetInputEl.value = 0; // Start budget at 0
        if (funnelInboxesInputEl) funnelInboxesInputEl.value = 0; // Start inbox at 0
        // Display initial actual leads/sales
        if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(coreMetrics.qualified_leads || 0);
        if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(coreMetrics.closed_sales || 0);

        // 3. Trigger the first calculation cycle
        recalculateAndUpdateReport(); // Reads inputs, calculates, renders everything

        // 4. Render Team Performance (Filtered) - Called within recalculate now
        // renderTeamPerformance(state.apiData.team_breakdown || []);

        // 5. Add Event Listeners for Funnel Inputs
        addFunnelInputListeners();

        console.log("[InitReport V3.5] Initialization complete.");

    } catch (error) { console.error("[InitReport V3.5] Error:", error); displayError(error); }
}

/** Adds event listeners to ONLY Budget and Inbox inputs */
function addFunnelInputListeners() {
    const inputsToListen = [ overallBudgetInputEl, funnelInboxesInputEl ];
    inputsToListen.forEach(input => {
        if (input) {
            input.removeEventListener('input', handleFunnelInputChange);
            input.addEventListener('input', handleFunnelInputChange);
        }
    });
}

/** Event handler for Budget / Inbox inputs */
function handleFunnelInputChange(event) {
     if (event.target && event.target.tagName === 'INPUT') {
          if (parseFloat(event.target.value) < 0) event.target.value = 0;
          if (event.target.validity.valid || event.target.value === '') {
               console.log("Funnel input changed, triggering recalculation...");
               event.target.style.outline = '';
               recalculateAndUpdateReport();
          } else { /* ... error styling ... */ }
     }
}


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
        if (plannerTargetEl) { plannerTargetEl.value = base.target || 6500000; /* clear error */ }
        if (plannerLeadToSaleEl) { plannerLeadToSaleEl.value = (base.leadToSale_percent || 0).toFixed(1); /* clear error */ }
        if (plannerTicketEl) { plannerTicketEl.value = base.avg_ticket_size || 0; /* clear error */ }


        // Reset Funnel Inputs (Budget/Inbox 0)
        if (overallBudgetInputEl) { overallBudgetInputEl.value = 0; /* clear error */ }
        if (funnelInboxesInputEl) { funnelInboxesInputEl.value = 0; /* clear error */ }
        // Note: Funnel display elements (Leads/Sales) will be updated by recalc

        state.calculatedFinancialData = []; // Clear potentially stale financial calc data
        console.log("Triggering recalculate after reset.");
        recalculateAndUpdateReport(); // Trigger full recalculation
    });
}

// ================================================================================
// GLOBAL INITIALIZATION FUNCTION & AUTO-DETECT MODE
// ================================================================================
window.initializeSalesReport = function(reportData, userData = null) {
    console.log("[Global Init] Setting up report with provided data (v3.5):", reportData);
    if (!reportData || typeof reportData !== 'object' || !reportData.core_metrics) {
        console.error("[Global Init] Invalid or missing core data provided.");
        displayError(new Error("ข้อมูลที่ส่งมาสำหรับรายงานไม่สมบูรณ์หรือไม่ถูกต้อง"));
        return;
    }
    state.apiData = reportData;
    state.currentUser = userData;
    try {
        initializeReportWithData();
    } catch(initError) { /* ... error handling ... */ }
};

console.log("[Script Ready] report-2.js v3.5 loaded...");
// --- Auto-Detection / Auto-Initialization --- (Removed for manual init focus)
// window.reportInitializedManually = false;
// ... (rest of auto-init code removed) ...
if (typeof window.initializeSalesReport !== 'function') { // Fallback definition
     window.initializeSalesReport = function(reportData, userData = null) { /* ... delayed init ... */ }
}

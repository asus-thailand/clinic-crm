// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Function-Based / Auto-Detect)
// Version 3.7
// - Adapts to data structure from SQL function v3.6 (core_metrics, breakdowns, planner_defaults).
// - Renders Funnel, Performance Summary (Avg Days, Closing Rate), Filtered Teams, Planner.
// - Reads Budget/Inbox inputs for calculations.
// ================================================================================

console.log("[Script Load] report-2.js v3.7 executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || {
    currentUser: null,
    apiData: null, // Stores raw data from API v3.6
    marketingInputMonths: [ /* Default months */ ],
    calculatedFinancialData: [] // Not used in this simplified version
};
const state = window.reportState;

// -- ELEMENT REFERENCES --
// Funnel Section 2
const overallBudgetInputEl = document.getElementById('funnel-budget-input');
const funnelInboxesInputEl = document.getElementById('funnel-inboxes-input');
const funnelLeadsActualEl = document.getElementById('funnel-leads-actual');
const funnelLeadsTargetEl = document.getElementById('funnel-leads-target');
const funnelSalesActualEl = document.getElementById('funnel-sales-actual');
const funnelOverallCplEl = document.getElementById('funnel-overall-cpl');
const funnelTargetKpiDisplayEl = document.getElementById('funnel-target-kpi-display');

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
function formatCurrency(n, showSign = false, decimals = 0) { /* ... เหมือนเดิม v3.5 ... */ }
function formatNumber(n) { /* ... เหมือนเดิม v3.5 ... */ }
function displayError(error) { /* ... เหมือนเดิม v3.5 ... */ }

// ================================================================================
// INPUT READING FUNCTIONS
// ================================================================================
function getFunnelInputs() {
    const budget = parseFloat(overallBudgetInputEl?.value) || 0;
    const inboxes = parseInt(funnelInboxesInputEl?.value, 10) || 0;
    return {
        overallBudget: Math.max(0, budget),
        totalInboxes: Math.max(0, inboxes)
    };
}
// getMarketingInputs() - Not needed for this version if Financial Table is removed

// ================================================================================
// CORE CALCULATION & RENDERING LOGIC (Simplified for SQL v3.6)
// ================================================================================

/** Core recalculation function V3.7 */
function recalculateAndUpdateReport() {
    console.log("[Recalculate V3.7] Starting...");

    if (!state.apiData || !state.apiData.core_metrics) { console.warn("[Recalculate] API data not ready."); return; }

    // --- 1. Read Inputs ---
    const funnelInputs = getFunnelInputs(); // Reads Overall Budget & Inboxes
    const kpiTargetPercent = 30; // Hardcoded KPI target %

    // --- 2. Get Actual Core Metrics from API Data ---
    const coreMetrics = state.apiData.core_metrics;
    const actualTotalLeads = coreMetrics.qualified_leads || 0;
    const actualTotalSales = coreMetrics.closed_sales || 0;
    const avgClosingDays = coreMetrics.avg_closing_days;
    // Get total revenue directly from core metrics now
    const totalRevenue = coreMetrics.total_revenue || 0;

    // --- 3. Perform Core Calculations ---
    const targetLeads = Math.round(funnelInputs.totalInboxes * (kpiTargetPercent / 100));
    const overallCPL = (actualTotalLeads > 0 && funnelInputs.overallBudget > 0) ? (funnelInputs.overallBudget / actualTotalLeads) : 0;
    const actualLeadToSalePercent = (actualTotalLeads > 0) ? (actualTotalSales / actualTotalLeads * 100) : 0;
    // Calculate Overall ROAS using Overall Budget and Total Revenue from core_metrics
    const totalROAS = (funnelInputs.overallBudget > 0) ? (totalRevenue / funnelInputs.overallBudget) : 0;


    // --- 4. Render Funnel (Sec 2) ---
    renderFunnel({
        budget: funnelInputs.overallBudget,
        inboxes: funnelInputs.totalInboxes,
        leadsActual: actualTotalLeads,
        leadsTarget: targetLeads,
        salesActual: actualTotalSales,
        overallCPL: overallCPL,
        targetKPIPercent: kpiTargetPercent
    });

    // --- 5. Render Performance Summary (Sec 3) ---
    renderPerformanceSummary({
        avgClosingDays: avgClosingDays,
        overallClosingRate: actualLeadToSalePercent
    });

    // --- 6. Render Team Performance Grid (Sec 3 - filtered) ---
    renderTeamPerformance(state.apiData?.team_breakdown || []);

    // --- 7. Update Planner Inputs & Recalculate ---
    updatePlannerAndTotals(funnelInputs.totalInboxes, actualTotalLeads, actualTotalSales, totalRevenue, totalROAS); // Pass calculated ROAS too

    console.log("[Recalculate V3.7] Report update complete.");
}


/** * Renders Funnel section display elements (Sec 2). */
function renderFunnel(funnelData) {
    // Update Input fields
    if (overallBudgetInputEl && document.activeElement !== overallBudgetInputEl) { overallBudgetInputEl.value = Math.round(funnelData.budget || 0); }
    if (funnelInboxesInputEl && document.activeElement !== funnelInboxesInputEl) { funnelInboxesInputEl.value = funnelData.inboxes || 0; }

    // Update Display elements
    if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(funnelData.leadsActual || 0);
    if (funnelLeadsTargetEl) funnelLeadsTargetEl.textContent = formatNumber(funnelData.leadsTarget || 0);
    if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(funnelData.salesActual || 0);
    if (funnelOverallCplEl) funnelOverallCplEl.textContent = formatCurrency(funnelData.overallCPL, false, 2);
    if (funnelTargetKpiDisplayEl) funnelTargetKpiDisplayEl.textContent = (funnelData.targetKPIPercent || 0).toFixed(1);
}

/** Renders the Performance Summary metrics (Sec 3) */
function renderPerformanceSummary(perfData) {
     if (perfAvgClosingDaysEl) {
         perfAvgClosingDaysEl.textContent = perfData.avgClosingDays !== null && perfData.avgClosingDays !== undefined ? perfData.avgClosingDays.toFixed(1) : '-';
     }
     if (perfOverallClosingRateEl) {
         perfOverallClosingRateEl.textContent = (perfData.overallClosingRate || 0).toFixed(1);
     }
}


/** Renders Team Performance, filtering out 'Online' */
function renderTeamPerformance(teamBreakdown = []) {
    if (!teamGridContainerEl) return;
    teamBreakdown = Array.isArray(teamBreakdown) ? teamBreakdown : [];
    const filteredTeams = teamBreakdown.filter(team => ['MAM', 'AU', 'GOLF'].includes(team.team_name));

    if (filteredTeams.length === 0) {
        teamGridContainerEl.innerHTML = '<div class="stat-card placeholder"><p>ไม่มีข้อมูลทีม MAM, AU, GOLF</p></div>'; return;
    }
    teamGridContainerEl.innerHTML = '';

    const teamDisplayMap = {
         'MAM': { name: '🏆 MAM', color: '#48bb78'},
         'AU': { name: '💰 AU', color: '#667eea'},
         'GOLF': { name: '📈 GOLF', color: '#f56565'}
    };

    filteredTeams.forEach(team => {
        const displayInfo = teamDisplayMap[team.team_name] || { name: `ทีม ${team.team_name}`, color: '#ccc' };
        const leads = team.leads || 0;
        const sales = team.sales || 0;
        const revenue = team.revenue || 0;
        const closingRate = (leads > 0) ? (sales / leads * 100) : 0;
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.style.borderTop = `5px solid ${displayInfo.color}`;
        card.innerHTML = `
            <h3>${displayInfo.name}</h3>
            <div class="stat-value" style="color:${displayInfo.color};">${closingRate.toFixed(1)}%</div>
            <div class="stat-label">Closing Rate</div>
            <div class="metric-item"><span>- ยอดขายรวม</span> <span>${formatCurrency(revenue)}</span></div>
            <div class="metric-item"><span>- จำนวน Leads</span> <span>${formatNumber(leads)}</span></div>
            <div class="metric-item"><span>- เคสปิดได้</span> <span>${formatNumber(sales)}</span></div>
        `;
        teamGridContainerEl.appendChild(card);
    });
}

/** * [MODIFIED] Updates Planner Inputs & Triggers Planner Calculation. */
function updatePlannerAndTotals(totalInboxes, totalLeads, totalSales, totalRevenue, totalROAS) { // Receive calculated ROAS

    // --- Update Stat Cards (if they exist for Overall Budget/Revenue/ROAS) ---
    const financialBudgetEl = document.getElementById('financial-budget');
    const financialRevenueEl = document.getElementById('financial-revenue');
    const financialRoasEl = document.getElementById('financial-roas');
    // Read Overall Budget again as it might have changed
    const overallBudget = parseFloat(overallBudgetInputEl?.value) || 0;
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
        plannerNotesEl.textContent = `* ผลรวม: Input Inbox ${formatNumber(totalInboxes)} → Actual Lead ${formatNumber(totalLeads)} → Actual Sale ${formatNumber(totalSales)}`;
    }

    // --- Trigger Planner Recalculation ---
    if (typeof calcPlanner === 'function') calcPlanner();
}


// ================================================================================
// MAIN INITIALIZATION
// ================================================================================

/** Internal function to initialize the report */
function initializeReportWithData() {
    console.log("[InitReport V3.7] Initializing...");

    state.apiData = state.apiData || { core_metrics: {}, monthly_breakdown: [], team_breakdown: [], planner_defaults: {} };
    state.currentUser = state.currentUser || null;

    try {
        // 1. Populate Planner defaults (needs base values before first calc)
        populatePlanner(state.apiData.planner_defaults);

        // 2. Set initial Funnel display values (Leads/Sales from API)
        const coreMetrics = state.apiData.core_metrics || {};
        if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(coreMetrics.qualified_leads || 0);
        if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(coreMetrics.closed_sales || 0);
        // Budget and Inbox inputs start at 0 (or HTML default)

        // 3. Trigger the first calculation cycle
        recalculateAndUpdateReport();

        // 4. Add Event Listeners for Funnel Inputs
        addFunnelInputListeners();

        console.log("[InitReport V3.7] Initialization complete.");

    } catch (error) { console.error("[InitReport V3.7] Error:", error); displayError(error); }
}

/** Adds event listeners to Budget and Inbox inputs */
function addFunnelInputListeners() {
     const budgetInput = document.getElementById('funnel-budget-input');
     const inboxesInput = document.getElementById('funnel-inboxes-input');
     const inputsToListen = [ budgetInput, inboxesInput ];
     inputsToListen.forEach(input => { /* ... Add listeners ... */ }); // Same as v3.6
 }

/** Event handler for Budget / Inbox inputs */
function handleFunnelInputChange(event) { /* ... Same as v3.6 ... */ }


// ================================================================================
// SCENARIO PLANNER LOGIC (SECTION 7) - Unchanged Calculation Logic
// ================================================================================
window.plannerBase = {};
/* ... planner element references ... */
function calcPlanner() { /* ... Calculation logic is the same ... */ }
// --- Event Listeners for Planner (Section 7) ---
/* ... Listeners for Target, Lead->Sale, Ticket, Slider remain the same ... */
// Reset button logic (Simplified)
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        console.log("Reset button clicked.");
        const base = window.plannerBase || {};
        const coreMetrics = state.apiData?.core_metrics || {};

        // Reset Planner user-editable inputs
        if (plannerTargetEl) plannerTargetEl.value = base.target || 6500000;
        if (plannerLeadToSaleEl) { plannerLeadToSaleEl.value = (base.leadToSale_percent || 0).toFixed(1); /* ... */ }
        if (plannerTicketEl) { plannerTicketEl.value = base.avg_ticket_size || 0; /* ... */ }

        // Reset Funnel Inputs (Budget/Inbox 0)
        if (overallBudgetInputEl) { overallBudgetInputEl.value = 0; /* ... */ }
        if (funnelInboxesInputEl) { funnelInboxesInputEl.value = 0; /* ... */ }

        console.log("Triggering recalculate after reset.");
        recalculateAndUpdateReport(); // Trigger full recalculation
    });
}

// ================================================================================
// GLOBAL INITIALIZATION FUNCTION & AUTO-DETECT MODE
// ================================================================================
window.initializeSalesReport = function(reportData, userData = null) {
    console.log("[Global Init V3.7] Setting up report with data:", reportData);
    if (!reportData || typeof reportData !== 'object' || !reportData.core_metrics) { /* ... validation ... */ return; }
    state.apiData = reportData;
    state.currentUser = userData;
    try {
        initializeReportWithData();
    } catch(initError) { /* ... error handling ... */ }
};
console.log("[Script Ready] report-2.js v3.7 loaded...");
// --- Fallback definition ---
if (typeof window.initializeSalesReport !== 'function') { /* ... */ }

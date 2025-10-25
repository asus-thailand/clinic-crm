// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Function-Based / Auto-Detect)
// Version 3.4
// - Funnel: Budget/Inbox=Input; Leads=Actual/Target Display; Sales=Actual Display; CPL=Calculated Display.
// - Performance: Shows Avg Closing Days, Overall Closing Rate, Filters teams (MAM, AU, GOLF).
// - Calculations use inputs and API data accordingly.
// ================================================================================

console.log("[Script Load] report-2.js v3.4 executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || {
    currentUser: null,           
    apiData: null,               
    marketingInputMonths: [      // Default months if API doesn't provide
        { month: 'ก.ค.', monthKey: '07' }, 
        { month: 'ส.ค.', monthKey: '08' },
        { month: 'ก.ย.', monthKey: '09' }
    ],
    calculatedFinancialData: []  // Stores data for the interactive financial table
};
const state = window.reportState;

// Business Logic Constant (No longer used for default revenue calculation)
// const TARGET_ROAS = 14; 

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

// KPI Section 5 (Removed - integrated into Funnel/Performance)
// const kpiInboxLeadTargetInputEl = document.getElementById('kpi-inbox-lead-target'); 
// const actualInboxLeadEl = document.getElementById('actual-inbox-lead'); 
// const actualLeadSaleEl = document.getElementById('actual-lead-sale');   
// const kpiRevenueGoalEl = document.getElementById('kpi-revenue-goal');

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
function displayError(error) { /* ... เหมือนเดิม ... */ }

// ================================================================================
// INPUT READING FUNCTIONS 
// ================================================================================

/** Reads Overall Budget and Inbox from Funnel Inputs (Section 2) */
function getFunnelInputs() {
    const budget = parseFloat(overallBudgetInputEl?.value) || 0;
    const inboxes = parseInt(funnelInboxesInputEl?.value, 10) || 0;
    return {
        overallBudget: Math.max(0, budget),
        totalInboxes: Math.max(0, inboxes)
    };
}

/** Reads Marketing Inputs (Budget per month) - Unchanged */
function getMarketingInputs() { /* ... เหมือนเดิม ... */ }


// ================================================================================
// MARKETING INPUT LOGIC (Section removed from UI - kept for financial table)
// ================================================================================
// We still need the logic if the financial table uses monthly budget inputs, 
// but since Overall Budget is now the main input, we might simplify this later.
// For now, keep the functions but the table itself is removed from HTML v1.4.
function createMarketingInputTable() { /* ... function exists but table removed ... */ }
function handleMarketingInputChange(event) { /* ... function exists but table removed ... */ }


// ================================================================================
// FINANCIAL TABLE & CORE CALCULATION LOGIC (MODIFIED)
// ================================================================================

/** * [MODIFIED] Core recalculation logic V3.4 */
function recalculateAndUpdateReport() {
    console.log("[Recalculate V3.4] Starting..."); 

    if (!state.apiData || !state.apiData.core_metrics) { console.warn("[Recalculate] API data not ready."); return; }

    // --- 1. Read Inputs ---
    const funnelInputs = getFunnelInputs(); // Reads Overall Budget & Inboxes
    const kpiTargetPercent = 30; // Hardcoded KPI target from user requirement

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
    renderFunnel({
        budget: funnelInputs.overallBudget,
        inboxes: funnelInputs.totalInboxes,
        leadsActual: actualTotalLeads,
        leadsTarget: targetLeads,
        salesActual: actualTotalSales,
        overallCPL: overallCPL,
        targetKPIPercent: kpiTargetPercent // Pass target % for display
    });

    // --- 5. Render Performance Summary (Sec 3) ---
    renderPerformanceSummary({
        avgClosingDays: avgClosingDays,
        overallClosingRate: actualLeadToSalePercent
    });

    // --- 6. Render Team Performance Grid (Sec 3 - filtered) ---
    renderTeamPerformance(state.apiData?.team_breakdown || []);
    
    // --- 7. Update Planner Inputs & Recalculate --- 
    //    (Needs calculated total revenue which depends on financial table state)
    //    We call updatePlannerAndTotals() which reads financial table and updates planner.
    updatePlannerAndTotals(funnelInputs.totalInboxes, actualTotalLeads, actualTotalSales);

    console.log("[Recalculate V3.4] Report update complete."); 
}


/** * [NEW/REFACTORED] Calculates Financial Table totals & Updates Planner.
 * Separated from the main recalculate function. Reads financial table inputs.
 * Takes funnel totals as arguments.
 */
function updatePlannerAndTotals(totalInboxes, totalLeads, totalSales) {
    const tableBody = document.getElementById('financial-table-body'); // Still needed if using monthly overrides
    if (!tableBody) return; 

    // Read Overall Budget from Section 2 Input
    const overallBudget = parseFloat(overallBudgetInputEl?.value) || 0; 

    // Sum Revenue total from Section 6 inputs (If table exists and has inputs)
    // If Financial table is removed, totalRevenue comes directly from coreMetrics
    let totalRevenue = state.apiData?.core_metrics?.total_revenue || 0; // Default to API total revenue
    // If the financial table still exists for overrides, uncomment the sum:
    // const rows = tableBody.querySelectorAll('tr');
    // totalRevenue = 0; // Reset before summing
    // rows.forEach(row => {
    //     totalRevenue += parseFloat(row.querySelector('.input-revenue')?.value) || 0;
    // });
    
    // Calculate Overall ROAS using Overall Budget
    const totalROAS = (overallBudget > 0) ? (totalRevenue / overallBudget) : 0;

    // --- Update Stat Cards (Formerly Section 6) ---
    // Assuming these IDs might still exist or be repurposed
    const financialBudgetEl = document.getElementById('financial-budget'); // Could show Overall Budget
    const financialRevenueEl = document.getElementById('financial-revenue'); // Could show Total Revenue
    const financialRoasEl = document.getElementById('financial-roas');     // Could show Overall ROAS
    if (financialBudgetEl) financialBudgetEl.textContent = formatCurrency(overallBudget); 
    if (financialRevenueEl) financialRevenueEl.textContent = formatCurrency(totalRevenue);
    if (financialRoasEl) financialRoasEl.textContent = `${totalROAS.toFixed(2)}x`;

    // --- Update Planner Inputs ---
    if (plannerInboxesEl) plannerInboxesEl.value = totalInboxes; 
    
    const actualInboxToLeadPercent = (totalInboxes > 0) ? (totalLeads / totalInboxes * 100) : 0;
    const validInboxToLeadPercent = Math.min(50, Math.max(1, actualInboxToLeadPercent)); // Clamp
    if (plannerInboxToLeadEl) plannerInboxToLeadEl.value = validInboxToLeadPercent.toFixed(1); 
    if (plannerInboxToLeadValueEl) plannerInboxToLeadValueEl.textContent = `${validInboxToLeadPercent.toFixed(1)}%`; 

    // --- Update Planner Notes ---
    if (plannerNotesEl) {
        const leadToSalePercent = parseFloat(plannerLeadToSaleEl?.value) || window.plannerBase?.leadToSale_percent || 0;
        // Note uses Actual Sales from API/Core Metrics
        plannerNotesEl.textContent = `* ผลรวม: Input Inbox ${formatNumber(totalInboxes)} → Actual Lead ${formatNumber(totalLeads)} → Actual Sale ${formatNumber(totalSales)}`;
    }

    // --- Trigger Planner Recalculation ---
    if (typeof calcPlanner === 'function') calcPlanner();
}


// ================================================================================
// RENDERING FUNCTIONS (MODIFIED)
// ================================================================================

/** * Renders Funnel section display elements (Sec 2). */
function renderFunnel(funnelData) {
    // Update Input fields (Budget, Inboxes) 
    if (overallBudgetInputEl && document.activeElement !== overallBudgetInputEl) { 
        overallBudgetInputEl.value = Math.round(funnelData.budget || 0); 
    }
    if (funnelInboxesInputEl && document.activeElement !== funnelInboxesInputEl) { 
        funnelInboxesInputEl.value = funnelData.inboxes || 0; 
    }

    // Update Display elements
    if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(funnelData.leadsActual || 0);
    if (funnelLeadsTargetEl) funnelLeadsTargetEl.textContent = formatNumber(funnelData.leadsTarget || 0);
    if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(funnelData.salesActual || 0);
    if (funnelOverallCplEl) funnelOverallCplEl.textContent = formatCurrency(funnelData.overallCPL, false, 2);
    if (funnelTargetKpiDisplayEl) funnelTargetKpiDisplayEl.textContent = (funnelData.targetKPIPercent || 0).toFixed(1);

    // Calculate and display Actual conversion rates in Performance section
    // const actualInboxToLeadPercent = (funnelData.inboxes > 0) ? (funnelData.leadsActual / funnelData.inboxes * 100) : 0;
    // const actualLeadToSalePercent = (funnelData.leadsActual > 0) ? (funnelData.salesActual / funnelData.leadsActual * 100) : 0;
    // Moved rate display to renderPerformanceSummary
}

/** [NEW] Renders the Performance Summary metrics (Sec 3) */
function renderPerformanceSummary(perfData) {
     if (perfAvgClosingDaysEl) {
         perfAvgClosingDaysEl.textContent = perfData.avgClosingDays !== null && perfData.avgClosingDays !== undefined 
                                         ? perfData.avgClosingDays.toFixed(1) 
                                         : '-'; 
     }
     if (perfOverallClosingRateEl) {
         perfOverallClosingRateEl.textContent = (perfData.overallClosingRate || 0).toFixed(1);
     }
}


/** [MODIFIED] Renders Team Performance, filtering out 'Online' */
function renderTeamPerformance(teamBreakdown = []) {
    if (!teamGridContainerEl) return; 

    teamBreakdown = Array.isArray(teamBreakdown) ? teamBreakdown : [];
    
    // Filter teams: MAM, AU, GOLF
    const filteredTeams = teamBreakdown.filter(team => ['MAM', 'AU', 'GOLF'].includes(team.team_name));

    if (filteredTeams.length === 0) {
        teamGridContainerEl.innerHTML = '<div class="stat-card placeholder"><p>ไม่มีข้อมูลทีม MAM, AU, GOLF</p></div>'; return;
    }
    teamGridContainerEl.innerHTML = ''; 
    
    const teamDisplayMap = { /* ... team mappings ... */ }; 

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
        `; // Simplified card content
        teamGridContainerEl.appendChild(card);
    });
}

/** Renders static Recommendations - Removed as per user request */
// function renderRecommendations() { /* ... */ }

/** Renders KPIs - Removed as integrated into Funnel/Performance */
// function renderKPIs(...) { /* ... */ }


/** Populates Planner defaults */
function populatePlanner(plannerDefaults = {}) {
     plannerDefaults = plannerDefaults || {}; 

    window.plannerBase = { /* ... store base values ... */ }; 

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
    console.log("[InitReport V3.4] Initializing...");
    
    state.apiData = state.apiData || { core_metrics: {}, monthly_breakdown: [], team_breakdown: [], planner_defaults: {} };
    state.currentUser = state.currentUser || null; 

    try {
        // 1. Populate Planner defaults (needs to happen before first calc)
        populatePlanner(state.apiData.planner_defaults); 

        // 2. Set initial values for Funnel section 
        //    (Budget/Inbox 0, Leads/Sales display from API)
        const coreMetrics = state.apiData.core_metrics || {};
        if (overallBudgetInputEl) overallBudgetInputEl.value = 0; 
        if (funnelInboxesInputEl) funnelInboxesInputEl.value = 0; 
        if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(coreMetrics.qualified_leads || 0);
        if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(coreMetrics.closed_sales || 0);

        // 3. Trigger the first calculation cycle 
        recalculateAndUpdateReport(); 

        // 4. Render Team Performance (Filtered) - Called within recalculate now
        // renderTeamPerformance(state.apiData.team_breakdown || []);
        
        // 5. Add Event Listeners for Funnel Inputs
        addFunnelInputListeners();

        console.log("[InitReport V3.4] Initialization complete.");

    } catch (error) { console.error("[InitReport V3.4] Error:", error); displayError(error); }
}

/** [MODIFIED] Adds event listeners to ONLY Budget and Inbox inputs */
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
          // Validation
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
        
        // Reset Funnel Inputs (Budget/Inbox 0)
        if (overallBudgetInputEl) { overallBudgetInputEl.value = 0; /* ... clear error ... */ } 
        if (funnelInboxesInputEl) { funnelInboxesInputEl.value = 0; /* ... clear error ... */ } 
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
console.log("[Script Ready] report-2.js v3.4 loaded...");
// --- Auto-Detection / Auto-Initialization ---
// Remove auto-init block if always initializing manually via window.initializeSalesReport
/*
window.reportInitializedManually = false; 
const originalManualInit = window.initializeSalesReport;
window.initializeSalesReport = function(reportData, userData = null) { / ... เหมือนเดิม v3.1 ... / } 
document.addEventListener('DOMContentLoaded', async () => { / ... Auto-init logic ... / });
*/

// If initializing manually, ensure the function exists when called from HTML
if (typeof window.initializeSalesReport !== 'function') {
     window.initializeSalesReport = function(reportData, userData = null) {
          console.warn("initializeSalesReport called before script fully defined, attempting delayed init.");
          // Store data and try init again shortly
          state.apiData = reportData;
          state.currentUser = userData;
          setTimeout(initializeReportWithData, 50); 
     }
}

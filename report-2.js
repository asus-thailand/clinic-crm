// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Function-Based / Auto-Detect)
// Version 3.4
// - Funnel: Budget/Inbox=Input; Leads=Actual/Target Display; Sales=Actual Display; CPL=Calculated Display.
// - Performance: Shows Avg Closing Days, Overall Closing Rate, Filters teams (MAM, AU, GOLF).
// - Calculations use inputs and API data accordingly.
// ================================================================================

console.log("[Script Load] report-2.js v3.4 executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || { /* ... state structure เหมือนเดิม ... */ };
const state = window.reportState;
const TARGET_ROAS = 14; 

// -- ELEMENT REFERENCES (Add new ones) --
// Funnel Section 2
const overallBudgetInputEl = document.getElementById('funnel-budget-input');
const funnelInboxesInputEl = document.getElementById('funnel-inboxes-input');
const funnelLeadsActualEl = document.getElementById('funnel-leads-actual');
const funnelLeadsTargetEl = document.getElementById('funnel-leads-target');
const funnelSalesActualEl = document.getElementById('funnel-sales-actual');
const funnelOverallCplEl = document.getElementById('funnel-overall-cpl');
const funnelTargetKpiDisplayEl = document.getElementById('funnel-target-kpi-display'); // Span showing target % used

// Performance Section 3
const perfAvgClosingDaysEl = document.getElementById('perf-avg-closing-days');
const perfOverallClosingRateEl = document.getElementById('perf-overall-closing-rate');
const teamGridContainerEl = document.getElementById('team-performance-grid');

// KPI Section 5
const kpiInboxLeadTargetInputEl = document.getElementById('kpi-inbox-lead-target'); // Target % Input
const actualInboxLeadEl = document.getElementById('actual-inbox-lead'); // Actual % Span
const actualLeadSaleEl = document.getElementById('actual-lead-sale');   // Actual Lead->Sale Div
const kpiRevenueGoalEl = document.getElementById('kpi-revenue-goal');

// Planner Section 7 (references remain the same)
const plannerTargetEl = document.getElementById('target');
// ... (other planner elements) ...

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... เหมือนเดิม ... */ }
function formatNumber(n) { /* ... เหมือนเดิม ... */ }
function displayError(error) { /* ... เหมือนเดิม ... */ }

// ================================================================================
// INPUT READING FUNCTIONS (MODIFIED)
// ================================================================================

/** [MODIFIED] Reads Overall Budget and Inbox from Funnel Inputs (Section 2) */
function getFunnelInputs() {
    const budget = parseFloat(overallBudgetInputEl?.value) || 0;
    const inboxes = parseInt(funnelInboxesInputEl?.value, 10) || 0;
    // Leads and Sales are read from state.apiData
    return {
        overallBudget: Math.max(0, budget),
        totalInboxes: Math.max(0, inboxes)
    };
}

/** Reads the TARGET Inbox->Lead % from KPI input (Section 5) - Unchanged */
function getKPIInputs() { /* ... เหมือนเดิม, reads kpi-inbox-lead-target ... */ }

/** Reads Marketing Inputs (Budget per month) - Unchanged */
function getMarketingInputs() { /* ... เหมือนเดิม ... */ }


// ================================================================================
// MARKETING INPUT LOGIC (Section 5.5) - Unchanged
// ================================================================================
function createMarketingInputTable() { /* ... เหมือนเดิม ... */ }
function handleMarketingInputChange(event) { /* ... เหมือนเดิม ... */ }

// ================================================================================
// FINANCIAL TABLE & CORE CALCULATION LOGIC (MODIFIED)
// ================================================================================

/** * [MODIFIED] Core recalculation logic V3.4 */
function recalculateAndUpdateReport() {
    console.log("[Recalculate V3.4] Starting..."); 

    if (!state.apiData || !state.apiData.core_metrics) { /* ... check data ... */ return; }

    // --- 1. Read Inputs ---
    const funnelInputs = getFunnelInputs(); // Reads Overall Budget & Inboxes
    const kpiInputs = getKPIInputs();       // Reads Target Inbox->Lead %
    const marketingInputs = getMarketingInputs(); // Reads Budget per month

    // --- 2. Get Actual Core Metrics from API Data ---
    const coreMetrics = state.apiData.core_metrics;
    const actualTotalLeads = coreMetrics.qualified_leads || 0;
    const actualTotalSales = coreMetrics.closed_sales || 0;
    const avgClosingDays = coreMetrics.avg_closing_days; // Can be null

    // --- 3. Perform Calculations ---
    // Funnel Calculations
    const targetLeads = Math.round(funnelInputs.totalInboxes * (kpiInputs.targetInboxToLeadPercent / 100));
    const overallCPL = (actualTotalLeads > 0 && funnelInputs.overallBudget > 0) ? (funnelInputs.overallBudget / actualTotalLeads) : 0;
    const actualInboxToLeadPercent = (funnelInputs.totalInboxes > 0) ? (actualTotalLeads / funnelInputs.totalInboxes * 100) : 0;
    const actualLeadToSalePercent = (actualTotalLeads > 0) ? (actualTotalSales / actualTotalLeads * 100) : 0;

    // --- 4. Prepare Financial Table Data ---
    const actualMonthlyData = state.apiData?.monthly_breakdown || [];
    state.calculatedFinancialData = state.marketingInputMonths.map(monthInfo => {
        // ... (Logic to merge budget/inbox inputs with actual leads/revenue & calculate monthly CPL/ROAS - เหมือนเดิม v3.2) ...
         const monthKey = monthInfo.monthKey; 
         const fullMonthKey = `2025-${monthKey}`; 
         const userInput = marketingInputs[monthKey] || { inbox: 0, budget: 0 }; 
         const actualData = actualMonthlyData.find(d => d.month === fullMonthKey) || { leads: 0, revenue: 0 }; 
         const financialTableRevenueInput = document.querySelector(`#financial-table-body .input-revenue[data-month="${monthKey}"]`);
         const currentRevenueInputValue = financialTableRevenueInput ? parseFloat(financialTableRevenueInput.value) : null;
         const financialTableLeadInput = document.querySelector(`#financial-table-body .input-lead[data-month="${monthKey}"]`);
         const currentLeadInputValue = financialTableLeadInput ? parseInt(financialTableLeadInput.value, 10) : null;
         const suggestedRevenue = userInput.budget * TARGET_ROAS; 
         let revenueToUse = 0;
         if (currentRevenueInputValue !== null && !isNaN(currentRevenueInputValue)) { revenueToUse = currentRevenueInputValue; } 
         else if (userInput.budget > 0) { revenueToUse = suggestedRevenue; } 
         else { revenueToUse = actualData.revenue; }
         const leadsToUse = (currentLeadInputValue !== null && !isNaN(currentLeadInputValue)) ? currentLeadInputValue : (actualData.leads || 0);
         const budget = userInput.budget;
         const revenue = revenueToUse;
         const leads = leadsToUse;
         const cpl = (leads > 0 && budget > 0) ? (budget / leads) : 0; 
         const roas = (budget > 0) ? (revenue / budget) : 0; 

         return { /* ... return object ... */ };
    });
    
    // --- 5. Render Sections ---
    // Render Funnel (Sec 2)
    renderFunnel({
        budget: funnelInputs.overallBudget,
        inboxes: funnelInputs.totalInboxes,
        leadsActual: actualTotalLeads,
        leadsTarget: targetLeads,
        salesActual: actualTotalSales,
        overallCPL: overallCPL,
        targetKPIPercent: kpiInputs.targetInboxToLeadPercent // Pass target % for display
    });

    // Render Performance Summary (Sec 3)
    renderPerformanceSummary({
        avgClosingDays: avgClosingDays,
        overallClosingRate: actualLeadToSalePercent
    });

    // Render Financial Table (Sec 6) - Calls updateFinancialTotals internally
    renderFinancials(state.calculatedFinancialData); 

    // Render Team Performance Grid (Sec 3 - filtered)
    renderTeamPerformance(state.apiData?.team_breakdown || []);

    // Render KPIs (Sec 5 - Mostly display actuals now)
    renderKPIs(state.apiData?.planner_defaults || {}, actualInboxToLeadPercent, actualLeadToSalePercent); 

    // updateFinancialTotals (called by renderFinancials) handles Planner update
    console.log("[Recalculate V3.4] Report update complete."); 
}

/** Renders the interactive financial table */
function renderFinancials(financialDataToRender) { 
    const tableBody = document.getElementById('financial-table-body');
    const tableFooter = document.getElementById('financial-table-footer');
    if (!tableBody || !tableFooter) { /* ... error check ... */ return; }
    
    const financialData = financialDataToRender || []; 
    if (financialData.length === 0) { /* ... handle empty ... */ return; }
    
    tableBody.innerHTML = ''; 
    
    financialData.forEach(month => { /* ... create table rows ... */ }); // เหมือนเดิม v3.3
    
    if (!tableFooter.querySelector('tr')) { /* ... create footer ... */ } // เหมือนเดิม v3.3
    
    tableBody.removeEventListener('input', handleFinancialTableInputChange); 
    tableBody.addEventListener('input', handleFinancialTableInputChange);

    updateFinancialTotals(); 
}

/** Event handler for financial table inputs */
function handleFinancialTableInputChange(event) { /* ... เหมือนเดิม v3.3 ... */ }


/** * [MODIFIED] Calculates totals & updates. Reads Overall Budget from Funnel Input. */
function updateFinancialTotals() {
    const tableBody = document.getElementById('financial-table-body');
    if (!tableBody) return; 

    // Read Overall Budget from Section 2 Input
    const overallBudget = parseFloat(overallBudgetInputEl?.value) || 0; 
    // Read Funnel Inputs (for Inbox total)
    const funnelInputs = getFunnelInputs();
    const totalInbox = funnelInputs.totalInboxes;
    // Read Actual Total Leads & Sales from API data
    const totalLead = state.apiData?.core_metrics?.qualified_leads || 0; 
    const totalSalesActual = state.apiData?.core_metrics?.closed_sales || 0; 

    // Sum Revenue total from Section 6 inputs
    const rows = tableBody.querySelectorAll('tr');
    let totalRevenue = 0;
    rows.forEach(row => {
        totalRevenue += parseFloat(row.querySelector('.input-revenue')?.value) || 0;
    });
    
    // Use Overall Budget for CPL/ROAS calculations
    const totalCPL = (totalLead > 0 && overallBudget > 0) ? (overallBudget / totalLead) : 0;
    const totalROAS = (overallBudget > 0) ? (totalRevenue / overallBudget) : 0;

    // --- Update Footer, Stat Cards ---
    document.getElementById('total-budget').textContent = formatCurrency(overallBudget); // Show Overall Budget in footer too
    document.getElementById('total-inbox').textContent = formatNumber(totalInbox);   
    document.getElementById('total-lead').textContent = formatNumber(totalLead);     
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue); 
    document.getElementById('total-cpl').textContent = formatCurrency(totalCPL, false, 2);
    document.getElementById('total-roas').textContent = `${totalROAS.toFixed(2)}x`;

    document.getElementById('financial-budget').textContent = formatCurrency(overallBudget); // Stat Card shows Overall Budget
    document.getElementById('financial-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('financial-roas').textContent = `${totalROAS.toFixed(2)}x`;

    // --- Update Planner Inputs ---
    const plannerInboxEl = document.getElementById('inboxes');
    if (plannerInboxEl) plannerInboxEl.value = totalInbox; 
    
    const actualInboxToLeadPercent = (totalInbox > 0) ? (totalLead / totalInbox * 100) : 0;
    const inboxToLeadEl = document.getElementById('inboxToLead'); 
    const inboxToLeadValueEl = document.getElementById('inboxToLeadValue'); 
    const validInboxToLeadPercent = Math.min(50, Math.max(1, actualInboxToLeadPercent)); 
    if (inboxToLeadEl) inboxToLeadEl.value = validInboxToLeadPercent.toFixed(1); 
    if (inboxToLeadValueEl) inboxToLeadValueEl.textContent = `${validInboxToLeadPercent.toFixed(1)}%`; 

    // --- Update Planner Notes ---
    const plannerNotes = document.getElementById('planner-notes');
    if (plannerNotes) {
        const leadToSalePercent = parseFloat(document.getElementById('leadToSale')?.value) || window.plannerBase?.leadToSale_percent || 0;
        // Planner note uses Actual Sales count from API
        plannerNotes.textContent = `* ผลรวม: Input Inbox ${formatNumber(totalInbox)} → Actual Lead ${formatNumber(totalLead)} → Actual Sale ${formatNumber(totalSalesActual)}`;
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
    
    // Update Input fields (Budget, Inboxes) - Redundant if called by recalculate, useful for init
    if (overallBudgetInputEl) overallBudgetInputEl.value = Math.round(funnelData.budget || 0);
    if (funnelInboxesInputEl) funnelInboxesInputEl.value = funnelData.inboxes || 0;

    // Update Display elements
    if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(funnelData.leadsActual || 0);
    if (funnelLeadsTargetEl) funnelLeadsTargetEl.textContent = formatNumber(funnelData.leadsTarget || 0);
    if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(funnelData.salesActual || 0);
    if (funnelOverallCplEl) funnelOverallCplEl.textContent = formatCurrency(funnelData.overallCPL, false, 2);
    if (funnelTargetKpiDisplayEl) funnelTargetKpiDisplayEl.textContent = (funnelData.targetKPIPercent || 0).toFixed(1);

    // Calculate and display Actual conversion rates (needed again here for init)
    const actualInboxToLeadPercent = (funnelData.inboxes > 0) ? (funnelData.leadsActual / funnelData.inboxes * 100) : 0;
    const actualLeadToSalePercent = (funnelData.leadsActual > 0) ? (funnelData.salesActual / funnelData.leadsActual * 100) : 0;
    
    if (actualInboxLeadEl) actualInboxLeadEl.textContent = actualInboxToLeadPercent.toFixed(1); // Span in Sec 5
    if (actualLeadSaleEl) actualLeadSaleEl.textContent = `${actualLeadToSalePercent.toFixed(1)}%`; // Div in Sec 5
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
    
    // Filter out the 'Online' team
    const filteredTeams = teamBreakdown.filter(team => team.team_name !== 'Online');

    if (filteredTeams.length === 0) {
        teamGridContainerEl.innerHTML = '<div class="stat-card placeholder"><p>ไม่มีข้อมูลทีม MAM, AU, GOLF</p></div>'; return;
    }
    teamGridContainerEl.innerHTML = ''; // Clear placeholder/previous
    
    const teamDisplayMap = { /* ... team mappings ... */ }; // Same map

    filteredTeams.forEach(team => {
        // ... (Create team cards using same logic as v3.1, using filteredTeams) ...
        const displayInfo = teamDisplayMap[team.team_name] || { name: `ทีม ${team.team_name}`, color: '#ccc' };
        const leads = team.leads || 0;
        const sales = team.sales || 0;
        const revenue = team.revenue || 0;
        const closingRate = (leads > 0) ? (sales / leads * 100) : 0;
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.style.borderTop = `5px solid ${displayInfo.color}`;
        card.innerHTML = `<h3>${displayInfo.name}</h3> ... (rest of card content) ... `;
        teamGridContainerEl.appendChild(card);
    });
}

/** Renders static Recommendations */
function renderRecommendations() { /* ... เหมือนเดิม v3.1 ... */ }

/** [MODIFIED] Renders KPIs (Sec 5) - Shows actual rates calculated elsewhere */
function renderKPIs(plannerDefaults = {}, actualInboxToLeadPercent = 0, actualLeadToSalePercent = 0) {
    plannerDefaults = plannerDefaults || {};
    
    // Target Inbox->Lead % is handled by its own input field - no need to set here
    // Actual Inbox->Lead % is displayed by renderFunnel

    // Actual Lead->Sale % is displayed by renderFunnel
    
    // Target Revenue Goal from planner defaults
    const targetRevenue = plannerDefaults.target || 6500000;
    if (kpiRevenueGoalEl) kpiRevenueGoalEl.textContent = formatCurrency(targetRevenue);
}


/** Populates Planner defaults, sets initial Funnel/KPI values */
function populatePlanner(plannerDefaults = {}) { /* ... เหมือนเดิม v3.3 ... */ }


// ================================================================================
// MAIN INITIALIZATION (MODIFIED)
// ================================================================================

/** Internal function to initialize the report */
function initializeReportWithData() {
    console.log("[InitReport V3.4] Initializing...");
    
    state.apiData = state.apiData || { core_metrics: {}, monthly_breakdown: [], team_breakdown: [], planner_defaults: {} };
    state.currentUser = state.currentUser || null; 

    try {
        // 1. Create Marketing Input table 
        createMarketingInputTable();

        // 2. Populate Planner defaults & Initial KPI Target
        populatePlanner(state.apiData.planner_defaults); 

        // 3. Set initial values for Funnel section 
        //    (Budget/Inbox 0, Leads/Sales from API)
        const coreMetrics = state.apiData.core_metrics || {};
        if (overallBudgetInputEl) overallBudgetInputEl.value = 0; // Start budget at 0
        if (funnelInboxesInputEl) funnelInboxesInputEl.value = 0; // Start inbox at 0
        if (funnelLeadsActualEl) funnelLeadsActualEl.textContent = formatNumber(coreMetrics.qualified_leads || 0);
        if (funnelSalesActualEl) funnelSalesActualEl.textContent = formatNumber(coreMetrics.closed_sales || 0);

        // 4. Trigger the first calculation cycle 
        recalculateAndUpdateReport(); 

        // 5. Render Team Performance (Filtered)
        renderTeamPerformance(state.apiData.team_breakdown || []);
        
        // 6. Render Recommendations 
        renderRecommendations();
        
        // 7. Add Event Listeners for NEW/MODIFIED Inputs
        addFunnelAndKPIInputListeners();

        console.log("[InitReport V3.4] Initialization complete.");

    } catch (error) { /* ... error handling ... */ }
}

/** [MODIFIED] Adds event listeners to Overall Budget, Inbox input and KPI target */
function addFunnelAndKPIInputListeners() {
    const inputsToListen = [
        overallBudgetInputEl, 
        funnelInboxesInputEl, 
        kpiInboxLeadTargetInputEl 
    ];

    inputsToListen.forEach(input => {
        if (input) {
            input.removeEventListener('input', handleFunnelOrKPIInputChange); // Prevent duplicates
            input.addEventListener('input', handleFunnelOrKPIInputChange);
        }
    });
}

/** Event handler for Budget / Inbox / KPI Target inputs */
function handleFunnelOrKPIInputChange(event) {
     if (event.target && event.target.tagName === 'INPUT') {
          // Validation
          if (parseFloat(event.target.value) < 0) event.target.value = 0;
          if (event.target.id === 'kpi-inbox-lead-target' && parseFloat(event.target.value) > 100) event.target.value = 100; 

          if (event.target.validity.valid || event.target.value === '') {
               console.log("Funnel/KPI input changed, triggering recalculation...");
               event.target.style.outline = '';
               recalculateAndUpdateReport(); // Trigger main recalculation
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
        
        // Reset Marketing Inputs to zero
        /* ... Reset marketing inputs ... */
        
        // Reset Funnel Inputs (Budget/Inbox 0), Display elements show recalculated values via recalc
        if (overallBudgetInputEl) { overallBudgetInputEl.value = 0; overallBudgetInputEl.style.outline = ''; } 
        if (funnelInboxesInputEl) { funnelInboxesInputEl.value = 0; funnelInboxesInputEl.style.outline = ''; } 
        // No need to reset funnelLeadsActualEl, funnelSalesActualEl here, recalc handles display

        // Reset KPI Target Input
        /* ... Reset KPI target input ... */

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
window.reportInitializedManually = false; 
const originalManualInit = window.initializeSalesReport;
window.initializeSalesReport = function(reportData, userData = null) { /* ... เหมือนเดิม v3.1 ... */ } 
document.addEventListener('DOMContentLoaded', async () => { /* ... Auto-init logic เหมือนเดิม v3.1 ... */ });

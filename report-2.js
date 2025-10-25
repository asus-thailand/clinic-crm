// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Function-Based / Auto-Detect)
// Version 3.3
// - Funnel: Inbox is input, Leads & Sales display actual data from API.
// - Calculates actual conversion rates based on Inbox input and API Leads/Sales.
// - Planner uses Inbox input and API Leads/Sales.
// ================================================================================

console.log("[Script Load] report-2.js v3.3 executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || { /* ... เหมือนเดิม ... */ };
const state = window.reportState;
const TARGET_ROAS = 14; 

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... เหมือนเดิม ... */ }
function formatNumber(n) { /* ... เหมือนเดิม ... */ }
function displayError(error) { /* ... เหมือนเดิม ... */ }

// ================================================================================
// INPUT READING FUNCTIONS (MODIFIED)
// ================================================================================

/** [MODIFIED] Reads only the Inbox value from Funnel Input (Section 2) */
function getFunnelInputs() {
    const inboxesInputEl = document.getElementById('funnel-inboxes-input');
    const inboxes = parseInt(inboxesInputEl?.value, 10) || 0;
    // Leads and Sales are now read directly from state.apiData when needed
    return {
        totalInboxes: Math.max(0, inboxes)
    };
}

/** Reads the TARGET Inbox->Lead % from KPI input (Section 5) - Unchanged */
function getKPIInputs() { /* ... เหมือนเดิม ... */ }

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

/** * [MODIFIED] Core recalculation logic.
 * Reads Inbox from Funnel Input, Leads/Sales from API data.
 */
function recalculateAndUpdateReport() {
    console.log("[Recalculate V3.3] Starting..."); 

    if (!state.apiData || !state.apiData.core_metrics) { /* ... check data ... */ return; }

    // 1. Read Funnel Input (Section 2) - Only Inbox
    const funnelInputs = getFunnelInputs(); 
    const totalInboxes = funnelInputs.totalInboxes;
    
    // 2. Read Actual Leads & Sales from API data stored in state
    const coreMetrics = state.apiData.core_metrics;
    const totalLeads = coreMetrics.qualified_leads || 0;
    const totalSales = coreMetrics.closed_sales || 0;
    
    // 3. Read Marketing Inputs (Budget per month)
    const marketingInputs = getMarketingInputs();

    // 4. Get actual monthly breakdown (Leads/Revenue) from API data
    const actualMonthlyData = state.apiData?.monthly_breakdown || [];

    // 5. Prepare data for the financial table (Section 6)
    //    (Logic remains the same, uses budget from marketingInputs, leads/revenue from API/override)
    state.calculatedFinancialData = state.marketingInputMonths.map(monthInfo => {
        // ... (เหมือนเดิม v3.2) ...
        const monthKey = monthInfo.monthKey; 
        const fullMonthKey = `2025-${monthKey}`; 
        const userInput = marketingInputs[monthKey] || { inbox: 0, budget: 0 }; // Budget/Inbox from Sec 5.5
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

        return {
            month: monthInfo.month, monthKey: monthKey,
            inbox: userInput.inbox, budget: userInput.budget, // From Marketing Input
            lead: leads, revenue: revenue,                  // From Financial Input or API
            cpl: cpl, roas: roas                            // Calculated
        };
    });
    
    // 6. Re-render the Financial Table (Sec 6) - Calls updateFinancialTotals internally
    renderFinancials(state.calculatedFinancialData); 

    // 7. Re-render Funnel display (Sec 2) using Inbox Input + API Leads/Sales
    renderFunnel({ totalInboxes, totalLeads, totalSales }); // Pass the calculated/read values

    // 8. Re-render KPIs (Sec 5) - Uses Planner Defaults + Funnel values
    renderKPIs(state.apiData?.planner_defaults || {}, { totalLeads, totalSales });

    // updateFinancialTotals (called by renderFinancials) handles updating Planner (Sec 7)
    console.log("[Recalculate V3.3] Report update complete."); 
}

/** Renders the interactive financial table */
function renderFinancials(financialDataToRender) { 
    const tableBody = document.getElementById('financial-table-body');
    const tableFooter = document.getElementById('financial-table-footer');
    if (!tableBody || !tableFooter) { /* ... error check ... */ return; }
    
    const financialData = financialDataToRender || []; 
    if (financialData.length === 0) { /* ... handle empty ... */ return; }
    
    tableBody.innerHTML = ''; 
    
    financialData.forEach(month => {
        const tr = document.createElement('tr');
        // Budget, Lead, Revenue are inputs. Inbox is display text. CPL/ROAS calculated.
        tr.innerHTML = `
            <td>${month.month || 'N/A'}</td> 
            <td><input type="number" class="input-budget" data-month="${month.monthKey}" value="${Math.round(month.budget || 0)}" step="1000" min="0"></td>
            <td class="cell-text">${formatNumber(month.inbox || 0)}</td>  
            <td><input type="number" class="input-lead" data-month="${month.monthKey}" value="${month.lead || 0}" step="1" min="0"></td> 
            <td><input type="number" class="input-revenue" data-month="${month.monthKey}" value="${Math.round(month.revenue || 0)}" step="1000" min="0"></td>
            <td class="cell-calc cell-cpl">${formatCurrency(month.cpl, false, 2)}</td> 
            <td class="cell-calc cell-roas">${(month.roas || 0).toFixed(2)}x</td> 
        `;
        tableBody.appendChild(tr);
    });
    
    if (!tableFooter.querySelector('tr')) { /* ... create footer ... */ }
    
    tableBody.removeEventListener('input', handleFinancialTableInputChange); 
    tableBody.addEventListener('input', handleFinancialTableInputChange);

    updateFinancialTotals(); // Calculate totals AFTER rendering
}

/** Event handler for financial table inputs */
function handleFinancialTableInputChange(event) {
     if (event.target && event.target.tagName === 'INPUT') {
          if (parseFloat(event.target.value) < 0) event.target.value = 0; 
          if (event.target.validity.valid || event.target.value === '') {
               console.log("Financial table input changed, triggering recalculation...");
               event.target.style.outline = ''; 
               recalculateAndUpdateReport(); // Trigger main update
          } else { /* ... error handling ... */ }
     }
}


/** * [MODIFIED] Calculates totals & updates Footer, Stats, Planner.
 * Reads Inbox from Funnel Input, Leads from API.
 */
function updateFinancialTotals() {
    const tableBody = document.getElementById('financial-table-body');
    if (!tableBody) return; 

    // Read Funnel Input (Inbox ONLY)
    const funnelInputs = getFunnelInputs();
    const totalInbox = funnelInputs.totalInboxes;
    
    // Read Actual Total Leads from API data
    const totalLead = state.apiData?.core_metrics?.qualified_leads || 0; 
    // Total Sales needed for planner note
    const totalSalesActual = state.apiData?.core_metrics?.closed_sales || 0; 


    // Calculate Budget and Revenue totals from Section 6 inputs
    const rows = tableBody.querySelectorAll('tr');
    let totalBudget = 0, totalRevenue = 0;
    // Note: We don't sum Leads from the table anymore, use the API total
    rows.forEach(row => {
        totalBudget += parseFloat(row.querySelector('.input-budget')?.value) || 0;
        totalRevenue += parseFloat(row.querySelector('.input-revenue')?.value) || 0;
    });
    
    const totalCPL = (totalLead > 0 && totalBudget > 0) ? (totalBudget / totalLead) : 0;
    const totalROAS = (totalBudget > 0) ? (totalRevenue / totalBudget) : 0;

    // Update Footer, Stat Cards 
    document.getElementById('total-budget').textContent = formatCurrency(totalBudget);
    document.getElementById('total-inbox').textContent = formatNumber(totalInbox);   // From Funnel Input
    document.getElementById('total-lead').textContent = formatNumber(totalLead);     // From API
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue); // From Financial Table Sum
    document.getElementById('total-cpl').textContent = formatCurrency(totalCPL, false, 2);
    document.getElementById('total-roas').textContent = `${totalROAS.toFixed(2)}x`;

    document.getElementById('financial-budget').textContent = formatCurrency(totalBudget);
    document.getElementById('financial-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('financial-roas').textContent = `${totalROAS.toFixed(2)}x`;

    // Update Planner Inputs (Inboxes, Inbox->Lead %) using Funnel Input + API Leads
    const plannerInboxEl = document.getElementById('inboxes');
    if (plannerInboxEl) plannerInboxEl.value = totalInbox; 
    
    const actualInboxToLeadPercent = (totalInbox > 0) ? (totalLead / totalInbox * 100) : 0;
    const inboxToLeadEl = document.getElementById('inboxToLead'); // Slider
    const inboxToLeadValueEl = document.getElementById('inboxToLeadValue'); // Display
    const validInboxToLeadPercent = Math.min(50, Math.max(1, actualInboxToLeadPercent)); 
    if (inboxToLeadEl) inboxToLeadEl.value = validInboxToLeadPercent.toFixed(1); 
    if (inboxToLeadValueEl) inboxToLeadValueEl.textContent = `${validInboxToLeadPercent.toFixed(1)}%`; 

    // Update Planner Notes using Funnel Input values + API Sales
    const plannerNotes = document.getElementById('planner-notes');
    if (plannerNotes) {
        // Use Lead->Sale % from planner input or API default
        const leadToSalePercent = parseFloat(document.getElementById('leadToSale')?.value) || window.plannerBase?.leadToSale_percent || 0;
        // Use actual sales count from API data
        
        plannerNotes.textContent = `* ผลรวม: Input Inbox ${formatNumber(totalInbox)} → Actual Lead ${formatNumber(totalLead)} → Actual Sale ${formatNumber(totalSalesActual)}`;
    }

    // Trigger Planner recalculation AFTER updating its inputs
    if (typeof calcPlanner === 'function') calcPlanner();
}


// ================================================================================
// OTHER RENDERING FUNCTIONS (MODIFIED)
// ================================================================================

/** * [MODIFIED] Renders Funnel section. Updates Inbox input value, displays actual Leads/Sales.
 * Calculates and displays actual conversion rates.
 */
function renderFunnel(funnelData) {
    // funnelData now contains { totalInboxes, totalLeads, totalSales }
    const totalInboxes = funnelData.totalInboxes || 0;
    const qualifiedLeads = funnelData.totalLeads || 0;
    const closedSales = funnelData.totalSales || 0;

    // Update elements
    const inboxesInputEl = document.getElementById('funnel-inboxes-input');
    const leadsDisplayEl = document.getElementById('funnel-leads'); // Now a div
    const salesDisplayEl = document.getElementById('funnel-sales');   // Now a div

    if (inboxesInputEl) inboxesInputEl.value = totalInboxes; 
    if (leadsDisplayEl) leadsDisplayEl.textContent = formatNumber(qualifiedLeads);
    if (salesDisplayEl) salesDisplayEl.textContent = formatNumber(closedSales);

    // Calculate and display ACTUAL conversion rates
    const actualInboxToLeadPercent = (totalInboxes > 0) ? (qualifiedLeads / totalInboxes * 100) : 0;
    const actualLeadToSalePercent = (qualifiedLeads > 0) ? (closedSales / qualifiedLeads * 100) : 0;

    const actualInboxLeadEl = document.getElementById('actual-inbox-lead'); // Span in Sec 5
    const actualLeadSaleEl = document.getElementById('actual-lead-sale');   // Div in Sec 5

    if (actualInboxLeadEl) actualInboxLeadEl.textContent = actualInboxToLeadPercent.toFixed(1);
    // Display actual Lead->Sale rate in its dedicated div
    if (actualLeadSaleEl) actualLeadSaleEl.textContent = `${actualLeadToSalePercent.toFixed(1)}%`; 
}

/** Renders Team Performance */
function renderTeamPerformance(teamBreakdown = []) { /* ... เหมือนเดิม v3.1 ... */ }

/** Renders static Recommendations */
function renderRecommendations() { /* ... เหมือนเดิม v3.1 ... */ }

/** * [MODIFIED] Renders KPIs. Reads target from input, shows actual rates calculated elsewhere.
 */
function renderKPIs(plannerDefaults = {}, coreMetrics = {}) { // Renamed funnelInputs to coreMetrics for clarity
    plannerDefaults = plannerDefaults || {};
    coreMetrics = coreMetrics || {}; 
    
    // Target Inbox->Lead % is read from its input field (Sec 5) - no need to set here
    // Actual Inbox->Lead % is calculated and displayed by renderFunnel()

    // Actual Lead->Sale % is calculated and displayed by renderFunnel()
    
    // Target Revenue Goal comes from planner defaults
    const targetRevenue = plannerDefaults.target || 6500000;
    const kpiRevenueGoalEl = document.getElementById('kpi-revenue-goal');
    if (kpiRevenueGoalEl) kpiRevenueGoalEl.textContent = formatCurrency(targetRevenue);
    
    // We don't need to update the actual Lead->Sale display here anymore, renderFunnel handles it.
    // const leadToSalePercent = (coreMetrics.qualified_leads > 0) ? (coreMetrics.closed_sales / coreMetrics.qualified_leads * 100) : 0;
    // const kpiLeadApptEl = document.getElementById('kpi-lead-appt'); // Re-purposed for Lead->Sale Actual display
    // if (kpiLeadApptEl) kpiLeadApptEl.textContent = `Actual ${leadToSalePercent.toFixed(1)}%`; 
}


/** [MODIFIED] Populates Planner defaults, sets initial Funnel/KPI values from API */
function populatePlanner(plannerDefaults = {}) {
     plannerDefaults = plannerDefaults || {}; 

    window.plannerBase = { /* ... store base values ... */ }; 

    // Populate Planner inputs (Sec 7)
    const targetEl = document.getElementById('target');
    const leadToSaleEl = document.getElementById('leadToSale');
    const ticketEl = document.getElementById('ticket');
    if (targetEl) targetEl.value = window.plannerBase.target;
    if (leadToSaleEl) leadToSaleEl.value = window.plannerBase.leadToSale_percent.toFixed(1); 
    if (ticketEl) ticketEl.value = window.plannerBase.avg_ticket_size;

    // Populate initial TARGET KPI Input (Sec 5)
    const kpiInboxLeadTargetEl = document.getElementById('kpi-inbox-lead-target');
    if (kpiInboxLeadTargetEl) kpiInboxLeadTargetEl.value = (window.plannerBase.initialTargetInboxToLead || 30.0).toFixed(1);

     // Initial calculation/display happens via recalculateAndUpdateReport chain
}


// ================================================================================
// MAIN INITIALIZATION (MODIFIED)
// ================================================================================

/** Internal function to initialize the report */
function initializeReportWithData() {
    console.log("[InitReport V3.3] Initializing...");
    
    state.apiData = state.apiData || { core_metrics: {}, monthly_breakdown: [], team_breakdown: [], planner_defaults: {} };
    state.currentUser = state.currentUser || null; 

    try {
        // 1. Create Marketing Input table structure
        createMarketingInputTable(); // Depends on state.apiData.monthly_breakdown for months

        // 2. Populate Planner defaults & Initial KPI Target
        populatePlanner(state.apiData.planner_defaults); 

        // 3. Set initial values for Funnel section (Inbox 0, Leads/Sales from API)
        const coreMetrics = state.apiData.core_metrics || {};
        const funnelInboxesInputEl = document.getElementById('funnel-inboxes-input'); 
        const funnelLeadsDisplayEl = document.getElementById('funnel-leads'); 
        const funnelSalesDisplayEl = document.getElementById('funnel-sales');  
        if (funnelInboxesInputEl) funnelInboxesInputEl.value = 0; // Start Inbox at 0
        if (funnelLeadsDisplayEl) funnelLeadsDisplayEl.textContent = formatNumber(coreMetrics.qualified_leads || 0);
        if (funnelSalesDisplayEl) funnelSalesDisplayEl.textContent = formatNumber(coreMetrics.closed_sales || 0);

        // 4. Trigger the first calculation cycle 
        recalculateAndUpdateReport(); 

        // 5. Render Team Performance 
        renderTeamPerformance(state.apiData.team_breakdown || []);
        
        // 6. Render Recommendations 
        renderRecommendations();
        
        // 7. Add Event Listeners for NEW Funnel/KPI Inputs
        addFunnelAndKPIInputListeners();

        console.log("[InitReport V3.3] Initialization complete.");

    } catch (error) { /* ... error handling ... */ }
}

/** [MODIFIED] Adds event listeners to ONLY the Inbox input and KPI target input */
function addFunnelAndKPIInputListeners() {
    // Listener for Inbox Input ONLY
    const inboxInput = document.getElementById('funnel-inboxes-input');
    if(inboxInput) {
        inboxInput.removeEventListener('input', handleFunnelOrKPIInputChange); // Prevent duplicates
        inboxInput.addEventListener('input', handleFunnelOrKPIInputChange);
    }
    // Remove listeners for Leads/Sales inputs as they are now display divs
    // document.getElementById('funnel-leads-input')?.removeEventListener('input', handleFunnelOrKPIInputChange);
    // document.getElementById('funnel-sales-input')?.removeEventListener('input', handleFunnelOrKPIInputChange);


    // Listener for KPI Target Input
    const kpiInput = document.getElementById('kpi-inbox-lead-target');
    if (kpiInput) {
        kpiInput.removeEventListener('input', handleFunnelOrKPIInputChange); 
        kpiInput.addEventListener('input', handleFunnelOrKPIInputChange);
    }
}

/** Event handler for Inbox / KPI Target inputs */
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
const targetEl = document.getElementById('target');
/* ... other planner element references ... */
const insightEl = document.getElementById('insight');

function calcPlanner() { /* ... Calculation logic is the same ... */ }

// --- Event Listeners for Planner (Section 7) ---
// Listeners remain the same for Target, Lead->Sale %, Ticket Size, and Inbox->Lead Slider
if (leadToSaleEl) { /* ... listener ... */ }
if (ticketEl) { /* ... listener ... */ }
if (targetEl) { /* ... listener ... */ }
if (inboxToLeadEl && inboxToLeadValue) { /* ... listener ... */ }

// Reset button logic (MODIFIED to reset Funnel inputs correctly)
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        console.log("Reset button clicked.");
        const base = window.plannerBase || {}; 
        const coreMetrics = state.apiData?.core_metrics || {}; // Get core metrics for reset

        // Reset Planner user-editable inputs
        if (targetEl) targetEl.value = base.target || 6500000;
        if (leadToSaleEl) { leadToSaleEl.value = (base.leadToSale_percent || 0).toFixed(1); /* ... clear error ... */ }
        if (ticketEl) { ticketEl.value = base.avg_ticket_size || 0; /* ... clear error ... */ }
        
        // Reset Marketing Inputs to zero
        document.querySelectorAll('#marketing-input-body input.input-marketing').forEach(input => { /* ... reset ... */ });
        
        // Reset Funnel Input (Inbox) to zero, and display elements to API values
        const funnelInboxesInputEl = document.getElementById('funnel-inboxes-input'); 
        const funnelLeadsDisplayEl = document.getElementById('funnel-leads'); 
        const funnelSalesDisplayEl = document.getElementById('funnel-sales');  
        if (funnelInboxesInputEl) { funnelInboxesInputEl.value = 0; /* ... clear error ... */ } 
        // Reset display values directly, recalc will handle rates
        if (funnelLeadsDisplayEl) funnelLeadsDisplayEl.textContent = formatNumber(coreMetrics.qualified_leads || 0);
        if (funnelSalesDisplayEl) funnelSalesDisplayEl.textContent = formatNumber(coreMetrics.closed_sales || 0);

        // Reset KPI Target Input
        const kpiInboxLeadTargetEl = document.getElementById('kpi-inbox-lead-target');
        if (kpiInboxLeadTargetEl) { kpiInboxLeadTargetEl.value = (base.initialTargetInboxToLead || 30.0).toFixed(1); /* ... clear error ... */ }

        state.calculatedFinancialData = []; 
        
        console.log("Triggering recalculate after reset.");
        recalculateAndUpdateReport(); 
    });
}

// ================================================================================
// GLOBAL INITIALIZATION FUNCTION & AUTO-DETECT MODE
// ================================================================================
window.initializeSalesReport = function(reportData, userData = null) { /* ... เหมือนเดิม v3.1 ... */ };
console.log("[Script Ready] report-2.js v3.3 loaded...");
// --- Auto-Detection / Auto-Initialization ---
window.reportInitializedManually = false; 
const originalManualInit = window.initializeSalesReport;
window.initializeSalesReport = function(reportData, userData = null) { /* ... เหมือนเดิม v3.1 ... */ } 
document.addEventListener('DOMContentLoaded', async () => { /* ... Auto-init logic เหมือนเดิม v3.1 ... */ });

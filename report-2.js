// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Function-Based / Auto-Detect)
// Version 3.2
// - NEW: Funnel Analysis (Sec 2) and Inbox->Lead KPI (Sec 5) are now INPUT fields.
// - Reads Funnel/KPI inputs for calculations.
// - Calculates and displays actual conversion rates.
// - Planner uses values directly from Funnel inputs.
// ================================================================================

console.log("[Script Load] report-2.js v3.2 executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || {
    currentUser: null,           
    apiData: null,               
    marketingInputMonths: [      
        { month: 'ก.ค.', monthKey: '07' }, 
        { month: 'ส.ค.', monthKey: '08' },
        { month: 'ก.ย.', monthKey: '09' }
    ],
    calculatedFinancialData: [] 
};
const state = window.reportState;

// Business Logic Constant
const TARGET_ROAS = 14; 

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... เหมือนเดิม ... */ }
function formatNumber(n) { /* ... เหมือนเดิม ... */ }
function displayError(error) { /* ... เหมือนเดิม ... */ }

// ================================================================================
// NEW: READING INPUTS FROM FUNNEL & KPI SECTIONS
// ================================================================================

/** Reads values from the Funnel Analysis input fields (Section 2) */
function getFunnelInputs() {
    const inboxes = parseInt(document.getElementById('funnel-inboxes-input')?.value, 10) || 0;
    const leads = parseInt(document.getElementById('funnel-leads-input')?.value, 10) || 0;
    const sales = parseInt(document.getElementById('funnel-sales-input')?.value, 10) || 0;
    return {
        totalInboxes: Math.max(0, inboxes),
        totalLeads: Math.max(0, leads),
        totalSales: Math.max(0, sales)
    };
}

/** Reads the TARGET Inbox->Lead % from the KPI input field (Section 5) */
function getKPIInputs() {
    const targetInboxToLead = parseFloat(document.getElementById('kpi-inbox-lead-target')?.value) || 0;
    return {
        targetInboxToLeadPercent: Math.max(0, Math.min(100, targetInboxToLead)) // Clamp between 0-100
    };
}

// ================================================================================
// MARKETING INPUT LOGIC (Section 5.5) - Unchanged
// ================================================================================
function createMarketingInputTable() { /* ... เหมือนเดิม ... */ }
function getMarketingInputs() { /* ... เหมือนเดิม ... */ }

/** [MODIFIED] Handles changes in Marketing Input, triggers main recalculation */
function handleMarketingInputChange(event) {
    if (event.target && event.target.tagName === 'INPUT') {
         if (parseFloat(event.target.value) < 0) event.target.value = 0; 
         if (event.target.validity.valid || event.target.value === '') {
              console.log("Marketing input changed, recalculating...");
              event.target.style.outline = '';
              recalculateAndUpdateReport(); 
         } else { /* ... error handling ... */ }
    }
}

// ================================================================================
// FINANCIAL TABLE & CORE CALCULATION LOGIC (MODIFIED)
// ================================================================================

/** * [MODIFIED] Core recalculation logic. 
 * Now reads Funnel totals from inputs.
 */
function recalculateAndUpdateReport() {
    console.log("[Recalculate V3.2] Starting..."); 

    if (!state.apiData || !state.apiData.core_metrics) { /* ... check data ... */ return; }

    // 1. Read Funnel Inputs (Section 2) - These are now the primary source for totals
    const funnelInputs = getFunnelInputs(); 
    
    // 2. Read Marketing Inputs (Section 5.5 - Budget per month)
    const marketingInputs = getMarketingInputs();

    // 3. Get actual monthly breakdown (Leads/Revenue) from initial API data
    const actualMonthlyData = state.apiData?.monthly_breakdown || [];

    // 4. Prepare data for the financial table (Section 6)
    //    - Uses user-input Budget (from Marketing Inputs)
    //    - Uses actual Leads (from API)
    //    - Uses calculated/overridden Revenue (from Financial Table Input or 14x logic)
    //    - Calculates CPL/ROAS for each month
    state.calculatedFinancialData = state.marketingInputMonths.map(monthInfo => {
        const monthKey = monthInfo.monthKey; 
        const fullMonthKey = `2025-${monthKey}`; // Adjust year if needed

        const userInput = marketingInputs[monthKey] || { inbox: 0, budget: 0 }; // Budget/Inbox from Sec 5.5
        const actualData = actualMonthlyData.find(d => d.month === fullMonthKey) || { leads: 0, revenue: 0 }; 

        const financialTableRevenueInput = document.querySelector(`#financial-table-body .input-revenue[data-month="${monthKey}"]`);
        const currentRevenueInputValue = financialTableRevenueInput ? parseFloat(financialTableRevenueInput.value) : null;
        const financialTableLeadInput = document.querySelector(`#financial-table-body .input-lead[data-month="${monthKey}"]`);
        const currentLeadInputValue = financialTableLeadInput ? parseInt(financialTableLeadInput.value, 10) : null;


        const suggestedRevenue = userInput.budget * TARGET_ROAS; 
        
        let revenueToUse = 0;
        if (currentRevenueInputValue !== null && !isNaN(currentRevenueInputValue)) {
            revenueToUse = currentRevenueInputValue; // Prioritize override
        } else if (userInput.budget > 0) {
            revenueToUse = suggestedRevenue; // Use suggestion
        } else {
             revenueToUse = actualData.revenue; // Fallback
        }

        // Use Lead value from financial table input if available, else from API
        const leadsToUse = (currentLeadInputValue !== null && !isNaN(currentLeadInputValue)) ? currentLeadInputValue : (actualData.leads || 0);

        const budget = userInput.budget;
        const revenue = revenueToUse;
        const leads = leadsToUse;

        const cpl = (leads > 0 && budget > 0) ? (budget / leads) : 0; 
        const roas = (budget > 0) ? (revenue / budget) : 0; 

        return {
            month: monthInfo.month, monthKey: monthKey,
            inbox: userInput.inbox, // From Sec 5.5 input
            budget: userInput.budget, // From Sec 5.5 input
            lead: leads,            // From Sec 6 input (or API)
            revenue: revenue,       // From Sec 6 input (or calculated)
            cpl: cpl,               // Calculated
            roas: roas              // Calculated
        };
    });
    
    // console.log("[Recalculate V3.2] Calculated Financial Data:", state.calculatedFinancialData); // Debug log

    // 5. Re-render the Financial Table (Sec 6) - This also calls updateFinancialTotals
    renderFinancials(state.calculatedFinancialData); 

    // 6. Re-render Funnel display elements (Sec 2) using values read from inputs
    //    Also calculate and pass actual conversion rates
    renderFunnel(funnelInputs); 

    // 7. Re-render KPIs (Sec 5) - Reads target from input, uses funnelInputs for actuals
    renderKPIs(state.apiData?.planner_defaults || {}, funnelInputs);

    // updateFinancialTotals (called by renderFinancials) handles updating Planner (Sec 7)
    console.log("[Recalculate V3.2] Report update complete."); 
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
        // Budget, Lead, Revenue are inputs. Inbox is display text. CPL/ROAS are calculated.
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
    
    // Ensure Footer Structure
    if (!tableFooter.querySelector('tr')) { /* ... create footer ... */ }
    
    // Add Event Listener
    tableBody.removeEventListener('input', handleFinancialTableInputChange); 
    tableBody.addEventListener('input', handleFinancialTableInputChange);

    // Calculate Totals AFTER rendering inputs
    updateFinancialTotals(); 
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
 * Reads Funnel totals from Section 2 inputs via getFunnelInputs().
 */
function updateFinancialTotals() {
    const tableBody = document.getElementById('financial-table-body');
    if (!tableBody) return; 
    
    // Read Funnel Totals directly from Section 2 inputs
    const funnelInputs = getFunnelInputs();
    const totalInbox = funnelInputs.totalInboxes;
    const totalLead = funnelInputs.totalLeads;
    // Note: totalSales from funnelInputs isn't directly used in financial totals, 
    // but needed for planner notes calculation later.

    // Calculate Budget and Revenue totals from Section 6 inputs
    const rows = tableBody.querySelectorAll('tr');
    let totalBudget = 0, totalRevenue = 0;
    rows.forEach(row => {
        totalBudget += parseFloat(row.querySelector('.input-budget')?.value) || 0;
        totalRevenue += parseFloat(row.querySelector('.input-revenue')?.value) || 0;
    });
    
    // Calculate overall CPL and ROAS using totals
    const totalCPL = (totalLead > 0 && totalBudget > 0) ? (totalBudget / totalLead) : 0;
    const totalROAS = (totalBudget > 0) ? (totalRevenue / totalBudget) : 0;

    // Update Footer, Stat Cards 
    document.getElementById('total-budget').textContent = formatCurrency(totalBudget);
    document.getElementById('total-inbox').textContent = formatNumber(totalInbox); // From Funnel Input
    document.getElementById('total-lead').textContent = formatNumber(totalLead);   // From Funnel Input
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue); // From Financial Table Sum
    document.getElementById('total-cpl').textContent = formatCurrency(totalCPL, false, 2);
    document.getElementById('total-roas').textContent = `${totalROAS.toFixed(2)}x`;

    document.getElementById('financial-budget').textContent = formatCurrency(totalBudget);
    document.getElementById('financial-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('financial-roas').textContent = `${totalROAS.toFixed(2)}x`;

    // Update Planner Inputs (Inboxes, Inbox->Lead %) using Funnel Inputs
    const plannerInboxEl = document.getElementById('inboxes');
    if (plannerInboxEl) plannerInboxEl.value = totalInbox; 
    
    const actualInboxToLeadPercent = (totalInbox > 0) ? (totalLead / totalInbox * 100) : 0;
    const inboxToLeadEl = document.getElementById('inboxToLead'); // The slider
    const inboxToLeadValueEl = document.getElementById('inboxToLeadValue'); // Display next to slider
    const validInboxToLeadPercent = Math.min(50, Math.max(1, actualInboxToLeadPercent)); // Clamp for slider
    if (inboxToLeadEl) inboxToLeadEl.value = validInboxToLeadPercent.toFixed(1); // Update slider position
    if (inboxToLeadValueEl) inboxToLeadValueEl.textContent = `${validInboxToLeadPercent.toFixed(1)}%`; // Update slider display

    // Update Planner Notes using Funnel Input values
    const plannerNotes = document.getElementById('planner-notes');
    if (plannerNotes) {
        const leadToSalePercent = parseFloat(document.getElementById('leadToSale')?.value) || window.plannerBase?.leadToSale_percent || 0;
        const totalSales = funnelInputs.totalSales; // Use Sales directly from Funnel Input
        
        plannerNotes.textContent = `* ผลรวม: Input Inbox ${formatNumber(totalInbox)} → Input Lead ${formatNumber(totalLead)} → Input Sale ${formatNumber(totalSales)}`;
    }

    // Trigger Planner recalculation AFTER updating its inputs
    if (typeof calcPlanner === 'function') calcPlanner();
}


// ================================================================================
// OTHER RENDERING FUNCTIONS (MODIFIED)
// ================================================================================

/** * [MODIFIED] Renders Funnel display elements. Reads values from inputs if available.
 * Calculates and displays actual conversion rates.
 */
function renderFunnel(funnelInputs) {
    // We already read the inputs in recalculateAndUpdateReport, just use them
    const totalInboxes = funnelInputs.totalInboxes;
    const qualifiedLeads = funnelInputs.totalLeads;
    const closedSales = funnelInputs.totalSales;

    // Update the input fields themselves (in case called during init before inputs exist)
    const inboxesInputEl = document.getElementById('funnel-inboxes-input');
    const leadsInputEl = document.getElementById('funnel-leads-input');
    const salesInputEl = document.getElementById('funnel-sales-input');
    if (inboxesInputEl) inboxesInputEl.value = totalInboxes;
    if (leadsInputEl) leadsInputEl.value = qualifiedLeads;
    if (salesInputEl) salesInputEl.value = closedSales;

    // Calculate and display ACTUAL conversion rates based on current input values
    const actualInboxToLeadPercent = (totalInboxes > 0) ? (qualifiedLeads / totalInboxes * 100) : 0;
    const actualLeadToSalePercent = (qualifiedLeads > 0) ? (closedSales / qualifiedLeads * 100) : 0;

    const actualInboxLeadEl = document.getElementById('actual-inbox-lead'); // Span in Sec 5
    const actualLeadSaleEl = document.getElementById('actual-lead-sale');   // Div in Sec 5

    if (actualInboxLeadEl) actualInboxLeadEl.textContent = actualInboxToLeadPercent.toFixed(1);
    if (actualLeadSaleEl) actualLeadSaleEl.textContent = `${actualLeadToSalePercent.toFixed(1)}%`;
}

/** Renders Team Performance */
function renderTeamPerformance(teamBreakdown = []) { /* ... เหมือนเดิม ... */ }

/** Renders static Recommendations */
function renderRecommendations() { /* ... เหมือนเดิม ... */ }

/** * [MODIFIED] Renders KPIs. Reads target from input, shows actual rates from renderFunnel.
 */
function renderKPIs(plannerDefaults = {}, funnelInputs = {}) {
    plannerDefaults = plannerDefaults || {};
    funnelInputs = funnelInputs || { totalLeads: 0, totalSales: 0 }; // Provide fallback

    // Target Inbox->Lead % is now read directly from its input field
    // Actual Inbox->Lead % is displayed by renderFunnel()

    // Actual Lead->Sale % is calculated and displayed by renderFunnel()
    
    // Target Revenue Goal comes from planner defaults
    const targetRevenue = plannerDefaults.target || 6500000;
    const kpiRevenueGoalEl = document.getElementById('kpi-revenue-goal');
    if (kpiRevenueGoalEl) kpiRevenueGoalEl.textContent = formatCurrency(targetRevenue);
}


/** [MODIFIED] Populates Planner defaults based on API, sets initial KPI target */
function populatePlanner(plannerDefaults = {}) {
     plannerDefaults = plannerDefaults || {}; 

    window.plannerBase = { 
        target: plannerDefaults.target || 6500000,
        leadToSale_percent: plannerDefaults.leadToSale_percent || 0,
        avg_ticket_size: plannerDefaults.avg_ticket_size || 0,
        // Set a default TARGET for Inbox->Lead KPI if needed (e.g., 30%)
        initialTargetInboxToLead: 30.0 
    }; 

    const targetEl = document.getElementById('target');
    const leadToSaleEl = document.getElementById('leadToSale');
    const ticketEl = document.getElementById('ticket');
    const kpiInboxLeadTargetEl = document.getElementById('kpi-inbox-lead-target'); // Input in Sec 5
    
    // Populate Planner inputs (Sec 7)
    if (targetEl) targetEl.value = window.plannerBase.target;
    if (leadToSaleEl) leadToSaleEl.value = window.plannerBase.leadToSale_percent.toFixed(1); 
    if (ticketEl) ticketEl.value = window.plannerBase.avg_ticket_size;

    // Populate initial TARGET KPI Input (Sec 5)
    if (kpiInboxLeadTargetEl) kpiInboxLeadTargetEl.value = window.plannerBase.initialTargetInboxToLead.toFixed(1);
    
    // Initial calculation happens via recalculateAndUpdateReport chain
}


// ================================================================================
// MAIN INITIALIZATION - Called by external function or auto-init
// ================================================================================

/** Internal function to initialize the report rendering process */
function initializeReportWithData() {
    console.log("[InitReport V3.2] Initializing rendering with state data...");
    
    // Ensure data structure exists
    state.apiData = state.apiData || { core_metrics: {}, monthly_breakdown: [], team_breakdown: [], planner_defaults: {} };
    state.currentUser = state.currentUser || null; 

    try {
        // 1. Create Marketing Input table (determines months)
        createMarketingInputTable();

        // 2. Populate Planner defaults (sets base values for reset)
        //    AND Populate initial Funnel values from API data into inputs (Sec 2)
        //    AND Populate initial KPI Target input (Sec 5)
        populatePlanner(state.apiData.planner_defaults); 
        const coreMetrics = state.apiData.core_metrics || {};
        const funnelInboxesInputEl = document.getElementById('funnel-inboxes-input'); // Will be updated by first calc
        const funnelLeadsInputEl = document.getElementById('funnel-leads-input');
        const funnelSalesInputEl = document.getElementById('funnel-sales-input');
        // Set initial values from API into the funnel inputs
        // if (funnelInboxesInputEl) // Inbox is calculated from marketing inputs, start at 0
        if (funnelLeadsInputEl) funnelLeadsInputEl.value = coreMetrics.qualified_leads || 0;
        if (funnelSalesInputEl) funnelSalesInputEl.value = coreMetrics.closed_sales || 0;


        // 3. Trigger the first calculation cycle 
        // Reads all inputs (Marketing, Funnel), merges, calculates, renders Financial, Funnel display, KPIs, Planner
        recalculateAndUpdateReport(); 

        // 4. Render Team Performance (uses API data directly)
        renderTeamPerformance(state.apiData.team_breakdown || []);
        
        // 5. Render Recommendations (static)
        renderRecommendations();
        
        // 6. Add Event Listeners for NEW Funnel/KPI Inputs
        addFunnelAndKPIInputListeners();

        console.log("[InitReport V3.2] Report initialization complete.");

    } catch (error) {
        console.error("[InitReport V3.2] Error during initialization:", error);
        displayError(error);
    }
}

/** [NEW] Adds event listeners to Funnel and KPI input fields */
function addFunnelAndKPIInputListeners() {
    const funnelInputs = document.querySelectorAll('.interactive-funnel input.stat-input');
    funnelInputs.forEach(input => {
        input.removeEventListener('input', handleFunnelOrKPIInputChange); // Prevent duplicates
        input.addEventListener('input', handleFunnelOrKPIInputChange);
    });

    const kpiInput = document.getElementById('kpi-inbox-lead-target');
    if (kpiInput) {
        kpiInput.removeEventListener('input', handleFunnelOrKPIInputChange); // Prevent duplicates
        kpiInput.addEventListener('input', handleFunnelOrKPIInputChange);
    }
}

/** [NEW] Event handler for Funnel/KPI inputs */
function handleFunnelOrKPIInputChange(event) {
     if (event.target && event.target.tagName === 'INPUT') {
          // Basic Validation
          if (parseFloat(event.target.value) < 0) event.target.value = 0;
          // Clamp KPI target percentage
          if (event.target.id === 'kpi-inbox-lead-target' && parseFloat(event.target.value) > 100) event.target.value = 100; 

          if (event.target.validity.valid || event.target.value === '') {
               console.log("Funnel/KPI input changed, triggering recalculation...");
               event.target.style.outline = '';
               // Trigger the main recalculation (which reads these inputs)
               recalculateAndUpdateReport(); 
          } else {
               console.warn("Invalid number input in Funnel/KPI.");
               event.target.style.outline = '2px solid red';
          }
     }
}


// ================================================================================
// SCENARIO PLANNER LOGIC (SECTION 7) - Unchanged Calculation Logic
// ================================================================================

window.plannerBase = {}; // Holds default/API values for reset

// References to Planner elements 
const targetEl = document.getElementById('target');
const inboxesEl = document.getElementById('inboxes'); // Value comes *from* updateFinancialTotals (based on Sec 2 input)
const inboxToLeadEl = document.getElementById('inboxToLead'); // Value comes *from* updateFinancialTotals (based on Sec 2 inputs), user can slide override
const leadToSaleEl = document.getElementById('leadToSale'); // User input / API Default
const ticketEl = document.getElementById('ticket');       // User input / API Default
const inboxToLeadValue = document.getElementById('inboxToLeadValue'); // Display for slider
const leadsOut = document.getElementById('leadsOut');
const salesOut = document.getElementById('salesOut');
const revenueOut = document.getElementById('revenueOut');
const gapOut = document.getElementById('gapOut');
const insightEl = document.getElementById('insight');

/** Calculates and updates the Scenario Planner results. */
function calcPlanner() { /* ... Calculation logic is the same ... */ }

// --- Event Listeners for Planner (Section 7) ---
// Add listeners only for USER-editable fields that *directly* affect the planner forecast

// When user changes Lead->Sale % in Planner
if (leadToSaleEl) { /* ... listener calls calcPlanner & updateFinancialTotals ... */ }
// When user changes Avg Ticket Size in Planner
if (ticketEl) { /* ... listener calls calcPlanner ... */ }
// When user changes Target Revenue in Planner
if (targetEl) { /* ... listener calls calcPlanner ... */ }
// When user manually adjusts the Inbox->Lead % slider
if (inboxToLeadEl && inboxToLeadValue) { /* ... listener calls calcPlanner ONLY ... */ }

// Reset button logic
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        console.log("Reset button clicked.");
        const base = window.plannerBase || {}; 
        
        // Reset Planner user-editable inputs
        if (targetEl) targetEl.value = base.target || 6500000;
        if (leadToSaleEl) { leadToSaleEl.value = (base.leadToSale_percent || 0).toFixed(1); leadToSaleEl.style.outline = ''; }
        if (ticketEl) { ticketEl.value = base.avg_ticket_size || 0; ticketEl.style.outline = ''; }
        
        // Reset Marketing Inputs to zero
        document.querySelectorAll('#marketing-input-body input.input-marketing').forEach(input => { input.value = 0; input.style.outline = ''; });
        
        // Reset Funnel Inputs back to initial API values (or zero if no API data)
        const coreMetrics = state.apiData?.core_metrics || {};
        const funnelInboxesInputEl = document.getElementById('funnel-inboxes-input'); 
        const funnelLeadsInputEl = document.getElementById('funnel-leads-input');
        const funnelSalesInputEl = document.getElementById('funnel-sales-input');
        if (funnelInboxesInputEl) { funnelInboxesInputEl.value = 0; funnelInboxesInputEl.style.outline = ''; } // Inbox starts at 0 from marketing inputs
        if (funnelLeadsInputEl) { funnelLeadsInputEl.value = coreMetrics.qualified_leads || 0; funnelLeadsInputEl.style.outline = ''; }
        if (funnelSalesInputEl) { funnelSalesInputEl.value = coreMetrics.closed_sales || 0; funnelSalesInputEl.style.outline = ''; }

        // Reset KPI Target Input
        const kpiInboxLeadTargetEl = document.getElementById('kpi-inbox-lead-target');
        if (kpiInboxLeadTargetEl) { kpiInboxLeadTargetEl.value = (base.initialTargetInboxToLead || 30.0).toFixed(1); kpiInboxLeadTargetEl.style.outline = ''; }

        state.calculatedFinancialData = []; // Clear calculated data
        
        console.log("Triggering recalculate after reset.");
        recalculateAndUpdateReport(); // Trigger full recalculation
    });
}

// ================================================================================
// EXPOSE INITIALIZATION FUNCTION & AUTO-DETECT MODE
// ================================================================================

/** Global function to initialize the report with external data. */
window.initializeSalesReport = function(reportData, userData = null) { /* ... เหมือนเดิม ... */ };

console.log("[Script Ready] report-2.js v3.2 loaded. Call window.initializeSalesReport(data) or rely on auto-init.");

// --- Auto-Detection / Auto-Initialization (Optional) ---
window.reportInitializedManually = false; 
const originalManualInit = window.initializeSalesReport;
window.initializeSalesReport = function(reportData, userData = null) { /* ... เหมือนเดิม ... */ } 

document.addEventListener('DOMContentLoaded', async () => { /* ... Auto-init logic เหมือนเดิม ... */ });

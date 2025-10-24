// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT
// Version 3.0 (Simplified Data + Business Logic)
// - Reads simplified data from API v3.0 (Leads, Revenue only)
// - Reads User Inputs for Inbox & Budget
// - Implements 300k Budget -> 4.2M Revenue (14x ROAS) logic as default calculation
//   in the interactive financial table. User can still override revenue.
// - Calculates Funnel, CPL, ROAS, Planner based on combined data.
// ================================================================================

// -- GLOBAL STATE --
const state = {
    currentUser: null,
    apiData: null, // Stores raw data from API v3.0 { core_metrics, monthly_breakdown, team_breakdown, planner_defaults }
    
    // Default structure for Marketing Inputs if API doesn't provide months
    // We will try to populate this from apiData.monthly_breakdown first
    marketingInputMonths: [
        { month: 'ก.ค.', monthKey: 'jul' },
        { month: 'ส.ค.', monthKey: 'aug' },
        { month: 'ก.ย.', monthKey: 'sep' }
    ],
    // Holds the currently combined/calculated data for rendering
    calculatedFinancialData: [] 
};

// Target ROAS from business logic (4.2M / 300K)
const TARGET_ROAS = 14; 

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) {
    const num = parseFloat(n);
    if (isNaN(num)) return '-';
    const sign = num < 0 ? '-' : (showSign ? '+' : '');
    const absNum = Math.abs(num);
    const roundedNum = absNum.toFixed(decimals);
    return sign + '฿' + parseFloat(roundedNum).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function formatNumber(n) {
     const num = parseFloat(n);
     if (isNaN(num)) return '0';
     return num.toLocaleString();
}
function displayError(error) { /* ... เหมือนเดิม ... */ }

// ================================================================================
// MARKETING INPUT LOGIC (Section 5.5) - Reads user input
// ================================================================================

/**
 * Creates the Marketing Input table rows. Uses months from apiData if available.
 */
function createMarketingInputTable() {
    const tableBody = document.getElementById('marketing-input-body');
    if (!tableBody) { console.error("Marketing input table body not found."); return; }
    tableBody.innerHTML = ''; // Clear existing

    // Use months from API's monthly_breakdown if available, otherwise use default
    const monthsToUse = state.apiData?.monthly_breakdown?.map(m => ({ month: m.month_th, monthKey: m.month.substring(5) })) // Extract '07', '08' etc.
                     || state.marketingInputMonths; 
    
    // Store the actual months being used
    state.marketingInputMonths = monthsToUse;

    monthsToUse.forEach(monthInfo => {
        const tr = document.createElement('tr');
        // Default budget/inbox to 0 if not previously set
        tr.innerHTML = `
            <td>${monthInfo.month}</td>
            <td><input type="number" id="input-inbox-${monthInfo.monthKey}" data-month="${monthInfo.monthKey}" class="input-marketing input-inbox" value="0" step="1"></td>
            <td><input type="number" id="input-budget-${monthInfo.monthKey}" data-month="${monthInfo.monthKey}" class="input-marketing input-budget" value="0" step="1000"></td>
        `;
        tableBody.appendChild(tr);
    });

    // Add event listener for changes
    tableBody.addEventListener('input', handleMarketingInputChange);
}

/** Reads current values from the Marketing Input table. */
function getMarketingInputs() {
    const inputs = {};
    const inputRows = document.querySelectorAll('#marketing-input-body tr');
    inputRows.forEach(row => {
        const monthKey = row.querySelector('.input-inbox')?.dataset.month;
        if (monthKey) {
            const inbox = parseInt(row.querySelector('.input-inbox')?.value, 10) || 0; // Use parseInt for whole numbers
            const budget = parseFloat(row.querySelector('.input-budget')?.value) || 0;
            inputs[monthKey] = { inbox, budget };
        }
    });
    return inputs;
}

/** Handles changes in the Marketing Input table, triggers recalculation. */
function handleMarketingInputChange(event) {
    console.log("Marketing input changed, recalculating...");
    // Only recalculate if the input value is a valid number or empty
    if (event.target.tagName === 'INPUT' && (event.target.validity.valid || event.target.value === '')) {
         // This function now just triggers the main recalculation process
         recalculateAndUpdateReport();
    } else if (event.target.tagName === 'INPUT') {
         console.warn("Invalid number input in marketing table.");
         // Optionally provide feedback to the user
    }
}


// ================================================================================
// FINANCIAL TABLE LOGIC (SECTION 6) - Combines Input & API Data, Applies Logic
// ================================================================================

/**
 * [NEW] Core recalculation logic triggered by any input change.
 */
function recalculateAndUpdateReport() {
    // 1. Get latest marketing inputs (Inbox, Budget)
    const marketingInputs = getMarketingInputs();

    // 2. Get actual leads/revenue from the initial API data
    const actualMonthlyData = state.apiData?.monthly_breakdown || [];

    // 3. Prepare data for the financial table (Section 6)
    //    - Use user-input Inbox & Budget
    //    - Use actual Leads
    //    - Apply 300k->4.2M logic to *suggest* Revenue (if not overridden by user)
    //    - Calculate CPL/ROAS
    state.calculatedFinancialData = state.marketingInputMonths.map(monthInfo => {
        const monthKey = monthInfo.monthKey; // e.g., '07'
        const fullMonthKey = `2025-${monthKey}`; // Assuming year 2025 based on previous examples, adjust if needed

        const userInput = marketingInputs[monthKey] || { inbox: 0, budget: 0 };
        const actualData = actualMonthlyData.find(d => d.month === fullMonthKey) || { leads: 0, revenue: 0 }; // Find actual data by YYYY-MM

        // Check if user has manually entered revenue in the financial table
        const financialTableRevenueInput = document.querySelector(`#financial-table-body .input-revenue[data-month="${monthKey}"]`);
        const userRevenueOverride = financialTableRevenueInput ? parseFloat(financialTableRevenueInput.value) : null;
        
        // Apply Business Logic: Suggest revenue based on budget * TARGET_ROAS
        // Use user override if it exists and is a valid number, otherwise use suggested revenue or actual if budget is 0
        let calculatedRevenue = 0;
        if (userRevenueOverride !== null && !isNaN(userRevenueOverride)) {
            calculatedRevenue = userRevenueOverride;
        } else if (userInput.budget > 0) {
            calculatedRevenue = userInput.budget * TARGET_ROAS; 
        } else {
             calculatedRevenue = actualData.revenue; // Fallback to actual if no budget and no override
        }

        // Calculate CPL and ROAS based on current values
        const leads = actualData.leads || 0;
        const budget = userInput.budget;
        const revenue = calculatedRevenue; // Use the determined revenue

        const cpl = (leads > 0 && budget > 0) ? (budget / leads) : 0; // CPL requires budget and leads
        const roas = (budget > 0) ? (revenue / budget) : 0; // ROAS requires budget

        return {
            month: monthInfo.month, // Thai month name
            monthKey: monthKey,     // '07', '08' etc.
            inbox: userInput.inbox,
            budget: userInput.budget,
            lead: leads,            // Actual leads
            revenue: revenue,       // Calculated/Overridden revenue
            cpl: cpl,               // Calculated CPL
            roas: roas              // Calculated ROAS
        };
    });

    // 4. Re-render the Financial Table (Section 6) with the new calculated data
    renderFinancials(state.calculatedFinancialData); // This also calls updateFinancialTotals

    // 5. Re-render Funnel (uses total inbox from marketing inputs and actual leads/sales)
    renderFunnel(state.apiData?.core_metrics || {}, marketingInputs); 

    // updateFinancialTotals (called by renderFinancials) handles updating Planner
}


/**
 * Renders the interactive financial table using state.calculatedFinancialData.
 */
function renderFinancials(financialDataToRender) { 
    const tableBody = document.getElementById('financial-table-body');
    const tableFooter = document.getElementById('financial-table-footer');

    if (!tableBody || !tableFooter) { /* ... error handling ... */ return; }
    
    const financialData = financialDataToRender; 
    
    if (!financialData || financialData.length === 0) { /* ... handle empty data ... */ return; }
    
    tableBody.innerHTML = ''; // Clear existing rows
    
    financialData.forEach(month => {
        const tr = document.createElement('tr');
        // Budget, Lead, Revenue are inputs. Inbox is displayed text. CPL/ROAS are calculated display.
        tr.innerHTML = `
            <td>${month.month || 'N/A'}</td> 
            <td><input type="number" class="input-budget" data-month="${month.monthKey}" value="${Math.round(month.budget || 0)}" step="1000"></td>
            <td class="cell-text">${formatNumber(month.inbox || 0)}</td>  
            <td><input type="number" class="input-lead" data-month="${month.monthKey}" value="${month.lead || 0}" step="1"></td> 
            <td><input type="number" class="input-revenue" data-month="${month.monthKey}" value="${Math.round(month.revenue || 0)}" step="1000"></td>
            <td class="cell-calc cell-cpl">${formatCurrency(month.cpl)}</td> 
            <td class="cell-calc cell-roas">${month.roas.toFixed(2)}x</td> 
        `;
        tableBody.appendChild(tr);
        // No need to recalculate row here as data is pre-calculated
    });
    
    // Ensure Footer Structure exists
    if (!tableFooter.querySelector('tr')) {
        tableFooter.innerHTML = `
            <tr>
                <td>Total</td>
                <td id="total-budget">...</td>
                <td id="total-inbox">...</td> 
                <td id="total-lead">...</td>
                <td id="total-revenue">...</td>
                <td id="total-cpl">...</td>
                <td id="total-roas" class="good">...</td>
            </tr>
        `;
    }
    
    // Add Event Listener for input changes within THIS financial table
    // Remove previous listener to avoid duplicates if re-rendering
    tableBody.removeEventListener('input', handleFinancialTableInputChange); 
    tableBody.addEventListener('input', handleFinancialTableInputChange);

    // Calculate initial Totals based on rendered data
    updateFinancialTotals(); // This reads from inputs and updates planner
}

/** * Event handler specifically for the financial table inputs (Budget, Lead, Revenue)
 */
function handleFinancialTableInputChange(event) {
     if (event.target && event.target.tagName === 'INPUT' && (event.target.validity.valid || event.target.value === '')) {
          console.log("Financial table input changed, recalculating...");
          
          // Identify the row that changed
          const row = event.target.closest('tr');
          if (!row) return;

          // If Budget changed, recalculate suggested revenue *for that row only*
          if (event.target.classList.contains('input-budget')) {
               const budget = parseFloat(event.target.value) || 0;
               const revenueInput = row.querySelector('.input-revenue');
               // Only update revenue if the user hasn't manually typed in it recently
               // (Simple check: if value matches calculation based on *old* budget, update it)
               // A more robust way might involve tracking user interaction state.
               const suggestedRevenue = budget * TARGET_ROAS;
               // Update the revenue field *only if it seems automatically calculated*
               // This allows the user to override the suggestion.
               // We will recalculate CPL/ROAS based on whatever is in the fields in the next step.
               // Note: This simple check might not be perfect.
               // If the user *manually* inputs a value exactly matching the *new* suggested revenue,
               // subsequent budget changes might override it.
               // For now, let's keep it simple: budget change recalculates revenue suggestion.
                if (revenueInput) {
                     revenueInput.value = Math.round(suggestedRevenue);
                     // Simulate an input event on revenue to trigger recalculation if needed elsewhere
                     // revenueInput.dispatchEvent(new Event('input', { bubbles: true })); 
                }
          }
          
          // Recalculate CPL/ROAS for the specific row based on current input values
          recalculateFinancialRow(row); 
          // Recalculate totals for footer, stats cards, and update planner
          updateFinancialTotals(); 
     } else if (event.target.tagName === 'INPUT') {
          console.warn("Invalid number input in financial table.");
     }
}


/**
 * Calculates totals from Financial Table inputs & updates Footer, Stat Cards, Planner.
 */
function updateFinancialTotals() {
    const tableBody = document.getElementById('financial-table-body');
    if (!tableBody) return; 
    
    const rows = tableBody.querySelectorAll('tr');
    let totalBudget = 0, totalLead = 0, totalRevenue = 0;

    rows.forEach(row => {
        totalBudget += parseFloat(row.querySelector('.input-budget')?.value) || 0;
        totalLead += parseInt(row.querySelector('.input-lead')?.value, 10) || 0; // Leads should be integers
        totalRevenue += parseFloat(row.querySelector('.input-revenue')?.value) || 0;
    });
    
    // Get Total Inbox from Marketing Input section
    const marketingInputs = getMarketingInputs();
    const totalInbox = Object.values(marketingInputs).reduce((sum, month) => sum + (month.inbox || 0), 0);

    const totalCPL = (totalLead > 0 && totalBudget > 0) ? (totalBudget / totalLead) : 0;
    const totalROAS = (totalBudget > 0) ? (totalRevenue / totalBudget) : 0;

    // Update Footer, Stat Cards (IDs remain the same)
    document.getElementById('total-budget').textContent = formatCurrency(totalBudget);
    document.getElementById('total-inbox').textContent = formatNumber(totalInbox); 
    document.getElementById('total-lead').textContent = formatNumber(totalLead);
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('total-cpl').textContent = formatCurrency(totalCPL);
    document.getElementById('total-roas').textContent = `${totalROAS.toFixed(2)}x`;

    document.getElementById('financial-budget').textContent = formatCurrency(totalBudget);
    document.getElementById('financial-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('financial-roas').textContent = `${totalROAS.toFixed(2)}x`;

    // Update Planner Inputs
    const plannerInboxEl = document.getElementById('inboxes');
    if (plannerInboxEl) plannerInboxEl.value = totalInbox; 
    
    // Update Planner Notes and Inbox->Lead % slider
    const plannerNotes = document.getElementById('planner-notes');
    if (plannerNotes) {
        const inboxToLeadPercent = (totalInbox > 0) ? (totalLead / totalInbox * 100) : 0;
        const inboxToLeadEl = document.getElementById('inboxToLead');
        const inboxToLeadValueEl = document.getElementById('inboxToLeadValue');
        if (inboxToLeadEl) inboxToLeadEl.value = inboxToLeadPercent.toFixed(1);
        if (inboxToLeadValueEl) inboxToLeadValueEl.textContent = `${inboxToLeadPercent.toFixed(1)}%`;

        const leadToSalePercent = parseFloat(document.getElementById('leadToSale')?.value) || state.apiData?.planner_defaults?.leadToSale_percent || 0;
        const totalSales = Math.round(totalLead * (leadToSalePercent / 100));
        
        plannerNotes.textContent = `* อิงจากผลรวม: Input Inbox ${formatNumber(totalInbox)} → Actual Lead ${formatNumber(totalLead)} → Est. Sale ${formatNumber(totalSales)}`;
    }

    // Trigger Planner recalculation
    if (typeof calcPlanner === 'function') calcPlanner();
}


// ================================================================================
// OTHER RENDERING FUNCTIONS (Adapted for Simplified API Data)
// ================================================================================

/** Renders Funnel using core metrics and marketing inputs */
function renderFunnel(coreMetrics = {}, marketingInputs = {}) {
    const totalInboxes = Object.values(marketingInputs).reduce((sum, month) => sum + (month.inbox || 0), 0);
    const qualifiedLeads = coreMetrics?.qualified_leads || 0;
    const closedSales = coreMetrics?.closed_sales || 0;

    document.getElementById('funnel-inboxes').textContent = formatNumber(totalInboxes); 
    document.getElementById('funnel-leads').textContent = formatNumber(qualifiedLeads);
    document.getElementById('funnel-sales').textContent = formatNumber(closedSales);

    // Update KPIs that depend on Inboxes/Leads/Sales
    const kpiInboxLeadEl = document.getElementById('kpi-inbox-lead');
     if (kpiInboxLeadEl) {
          const inboxToLeadPercent = (totalInboxes > 0) ? (qualifiedLeads / totalInboxes * 100) : 0;
          kpiInboxLeadEl.textContent = `Actual ${inboxToLeadPercent.toFixed(1)}%`; // Show actual rate
     }
}

/** Renders simplified Team Performance based on team_breakdown */
function renderTeamPerformance(teamBreakdown = []) {
    const container = document.getElementById('team-performance-grid');
    if (!container) return;

    if (!teamBreakdown || teamBreakdown.length === 0) {
        container.innerHTML = '<div class="stat-card"><p>ไม่มีข้อมูลทีม</p></div>'; return;
    }
    container.innerHTML = ''; 
    
    // Map team names for display (adjust as needed)
    const teamDisplayMap = {
         'Online': { name: '💻 ทีมออนไลน์', color: '#764ba2'},
         'MAM': { name: '🏆 MAM', color: '#48bb78'},
         'AU': { name: '💰 AU', color: '#667eea'},
         'GOLF': { name: '📈 GOLF', color: '#f56565'}
    };

    teamBreakdown.forEach(team => {
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
        container.appendChild(card);
    });
}

/** Renders static Recommendations */
function renderRecommendations() {
    const list = document.getElementById('recommendations-list');
    if (!list) return;
    list.innerHTML = `
        <li><strong>Individual Coaching for GOLF:</strong> Focus on closing techniques.</li>
        <li><strong>Lead Qualification Criteria:</strong> Streamline lead assignment based on potential value.</li>
        <li><strong>Lead Cycle Analysis:</strong> Identify bottlenecks and optimize process duration.</li>
    `; // Simplified recommendations
}

/** Renders KPIs using planner defaults and core metrics */
function renderKPIs(plannerDefaults = {}, coreMetrics = {}) {
    // Lead -> Appointment/Sale KPI uses the calculated overall Lead->Sale %
    const leadToSalePercent = plannerDefaults?.leadToSale_percent || 0; 
    const target = plannerDefaults?.target || 6500000;

    const kpiLeadApptEl = document.getElementById('kpi-lead-appt'); // Re-purposed for Lead->Sale
    const kpiRevenueGoalEl = document.getElementById('kpi-revenue-goal');
    // Inbox->Lead KPI is handled in renderFunnel

    if (kpiLeadApptEl) kpiLeadApptEl.textContent = `Actual ${leadToSalePercent.toFixed(1)}%`; // Show actual Lead->Sale
    if (kpiRevenueGoalEl) kpiRevenueGoalEl.textContent = formatCurrency(target);
}

/** Populates Planner with defaults from API */
function populatePlanner(plannerDefaults = {}) {
    window.plannerBase = { // Store for Reset button
        target: plannerDefaults.target || 6500000,
        leadToSale_percent: plannerDefaults.leadToSale_percent || 0,
        avg_ticket_size: plannerDefaults.avg_ticket_size || 0,
        // Inboxes and Inbox->Lead % will be populated by updateFinancialTotals
    }; 

    const targetEl = document.getElementById('target');
    const leadToSaleEl = document.getElementById('leadToSale');
    const ticketEl = document.getElementById('ticket');
    
    if (targetEl) targetEl.value = window.plannerBase.target;
    if (leadToSaleEl) leadToSaleEl.value = window.plannerBase.leadToSale_percent.toFixed(1);
    if (ticketEl) ticketEl.value = window.plannerBase.avg_ticket_size;
    
    // Initial calculation of planner happens via updateFinancialTotals -> calcPlanner chain
}


// -- CORE LOGIC --
/** Fetches simplified data, creates inputs, merges, renders. */
async function fetchAndRenderReport() {
    if (!state.currentUser) { /* ... error handling ... */ return; }
    if (typeof window.apiV2 === 'undefined' || typeof window.apiV2.getSalesReportV2 !== 'function') { /* ... error handling ... */ return; }

    try {
        console.log("[Core V3] Fetching Report V2 data...");
        // Fetch the simplified data structure
        const apiData = await window.apiV2.getSalesReportV2(state.currentUser.id, null, null);

        if (!apiData || typeof apiData !== 'object' || !apiData.core_metrics) { 
            throw new Error("API V3 did not return valid core data."); 
        }
        
        console.log("[Core V3] Report V2 Data Received:", apiData); 
        state.apiData = apiData; // Store raw API data
        
        // --- NEW Workflow ---
        // 1. Create Marketing Input table structure (using months from API if available)
        createMarketingInputTable();

        // 2. Trigger the first calculation and render cycle
        // This reads initial marketing inputs (zeros), merges with API data,
        // renders the financial table (including suggested revenue), updates totals,
        // renders funnel, KPIs, and populates planner defaults.
        recalculateAndUpdateReport();

        // 3. Render Team Performance (uses data directly from API)
        renderTeamPerformance(apiData.team_breakdown || []);
        
        // 4. Render Recommendations (static for now)
        renderRecommendations();

    } catch (error) {
        console.error("[Core V3] Failed to load or render report V2 data:", error);
        displayError(error); 
    }
}

// -- INITIALIZATION --
async function initializeApp() { /* ... เหมือนเดิม ... */ }
document.addEventListener('DOMContentLoaded', initializeApp);


// ================================================================================
// SCENARIO PLANNER LOGIC (SECTION 7) - Unchanged Functionality
// ================================================================================
window.plannerBase = { /* ... default values ... */ };
const targetEl = document.getElementById('target');
/* ... other planner element references ... */
const insightEl = document.getElementById('insight');

function calcPlanner() { /* ... เหมือนเดิม ... */ }

// --- Event Listeners for Planner (Section 7) ---
// Note: Planner Inputs (Inbox, Inbox->Lead%) are updated by updateFinancialTotals
if (leadToSaleEl) leadToSaleEl.addEventListener('input', calcPlanner); // Re-calculate if Lead->Sale % changes
if (ticketEl) ticketEl.addEventListener('input', calcPlanner);     // Re-calculate if Ticket Size changes
if (targetEl) targetEl.addEventListener('input', calcPlanner);       // Re-calculate if Target changes

const calcBtn = document.getElementById('calcBtn');
if (calcBtn) calcBtn.addEventListener('click', calcPlanner);

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        const base = window.plannerBase || {}; 
        
        // Reset Planner inputs to base values from API/Defaults
        if (targetEl) targetEl.value = base.target || 6500000;
        if (leadToSaleEl) leadToSaleEl.value = (base.leadToSale_percent || 0).toFixed(1);
        if (ticketEl) ticketEl.value = base.avg_ticket_size || 0;
        
        // Reset Marketing Inputs to defaults (e.g., zeros or initial load state)
        // This is simpler than trying to restore API values for Budget/Inbox
        const marketingInputsBody = document.getElementById('marketing-input-body');
        marketingInputsBody?.querySelectorAll('input.input-marketing').forEach(input => input.value = 0);

        // Trigger a full recalculation based on the reset values
        recalculateAndUpdateReport(); 
    });
}

// Initial calculation is triggered via fetchAndRenderReport -> recalculateAndUpdateReport chain.

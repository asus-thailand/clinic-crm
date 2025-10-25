// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Function-Based / Auto-Detect)
// Version 3.1
// - NEW: Primary initialization via window.initializeSalesReport(data, user).
// - NEW: Auto-detects Supabase environment for backward compatibility (optional auto-load).
// - Uses window.reportState for global state management.
// - Continues to implement 300k Budget -> 4.2M Revenue (14x ROAS) logic.
// ================================================================================

console.log("[Script Load] report-2.js v3.1 executing...");

// -- GLOBAL STATE --
// Initialize or reuse existing global state object
window.reportState = window.reportState || {
    currentUser: null,           // Stores user info (optional, passed via init)
    apiData: null,               // Stores the core report data structure
    marketingInputMonths: [      // Default months if API doesn't provide
        { month: 'ก.ค.', monthKey: '07' }, 
        { month: 'ส.ค.', monthKey: '08' },
        { month: 'ก.ย.', monthKey: '09' }
    ],
    calculatedFinancialData: []  // Stores data for the interactive financial table
};
// Use a local constant for easier access within this script
const state = window.reportState;

// Business Logic Constant
const TARGET_ROAS = 14; 

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

function displayError(error) {
    const mainContainer = document.querySelector('.container');
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (mainContainer) {
        mainContainer.innerHTML = `
            <div style="padding: 40px; background: white; margin: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                <h2 style="color: #dc3545; margin-bottom: 15px;">เกิดข้อผิดพลาดในการแสดงรายงาน</h2>
                <p style="color: #333; font-size: 1.1em; word-wrap: break-word;">${errorMessage}</p>
                <p style="margin-top: 20px; color: #555;">กรุณาตรวจสอบข้อมูลที่ส่งเข้ามา หรือ Console สำหรับรายละเอียด</p>
            </div>`;
    } else {
        alert(`เกิดข้อผิดพลาด: ${errorMessage}`);
    }
    // Log the full error object for detailed debugging
    console.error("[DisplayError]", error); 
}

// ================================================================================
// MARKETING INPUT LOGIC 
// ================================================================================

function createMarketingInputTable() {
    const tableBody = document.getElementById('marketing-input-body');
    if (!tableBody) { console.error("Marketing input table body not found."); return; }
    tableBody.innerHTML = ''; // Clear previous

    // Use months defined in state (either default or from API data via initializeReportWithData)
    const monthsToUse = state.marketingInputMonths; 
    console.log("Creating Marketing Input table for months:", monthsToUse);

    if (!monthsToUse || monthsToUse.length === 0) {
        console.warn("No months defined for marketing input table.");
        // Optionally display a message in the table
        tableBody.innerHTML = '<tr><td colspan="3">ไม่สามารถโหลดข้อมูลเดือนได้</td></tr>';
        return;
    }

    monthsToUse.forEach(monthInfo => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${monthInfo.month || monthInfo.monthKey}</td>
            <td><input type="number" id="input-inbox-${monthInfo.monthKey}" data-month="${monthInfo.monthKey}" class="input-marketing input-inbox" value="0" step="1" min="0"></td>
            <td><input type="number" id="input-budget-${monthInfo.monthKey}" data-month="${monthInfo.monthKey}" class="input-marketing input-budget" value="0" step="1000" min="0"></td>
        `;
        tableBody.appendChild(tr);
    });

    // Add event listener (ensure only one listener is active)
    tableBody.removeEventListener('input', handleMarketingInputChange); 
    tableBody.addEventListener('input', handleMarketingInputChange);
}

function getMarketingInputs() {
    const inputs = {};
    const inputRows = document.querySelectorAll('#marketing-input-body tr');
    inputRows.forEach(row => {
        const monthKey = row.querySelector('.input-inbox')?.dataset.month;
        if (monthKey) {
            const inboxInput = row.querySelector('.input-inbox');
            const budgetInput = row.querySelector('.input-budget');
            // Read value and ensure it's a non-negative number
            const inbox = Math.max(0, parseInt(inboxInput?.value, 10) || 0); 
            const budget = Math.max(0, parseFloat(budgetInput?.value) || 0);
            inputs[monthKey] = { inbox, budget };
        }
    });
    return inputs;
}

function handleMarketingInputChange(event) {
    if (event.target && event.target.tagName === 'INPUT') {
         if (parseFloat(event.target.value) < 0) event.target.value = 0; 
         if (event.target.validity.valid || event.target.value === '') {
              console.log("Marketing input changed, recalculating...");
              event.target.style.outline = '';
              recalculateAndUpdateReport(); // Trigger full update
         } else {
              console.warn("Invalid number input in marketing table.");
              event.target.style.outline = '2px solid red'; 
         }
    }
}

// ================================================================================
// FINANCIAL TABLE & CORE CALCULATION LOGIC
// ================================================================================

/** Core recalculation function */
function recalculateAndUpdateReport() {
    console.log("[Recalculate V3.1] Starting..."); 

    // Ensure apiData is available in the global state
    if (!state.apiData || !state.apiData.core_metrics) {
        console.warn("[Recalculate V3.1] API data not available in state. Aborting.");
        // Optionally display a less intrusive message than full error
        // displayError(new Error("ข้อมูลพื้นฐานสำหรับคำนวณยังไม่พร้อม"));
        return; 
    }

    const marketingInputs = getMarketingInputs();
    const actualMonthlyData = state.apiData?.monthly_breakdown || [];
    const coreMetrics = state.apiData.core_metrics; // Use core metrics from state

    // Recalculate financial data based on inputs and API data
    state.calculatedFinancialData = state.marketingInputMonths.map(monthInfo => {
        const monthKey = monthInfo.monthKey; 
        const fullMonthKey = `2025-${monthKey}`; // Adjust year if needed based on data

        const userInput = marketingInputs[monthKey] || { inbox: 0, budget: 0 };
        const actualData = actualMonthlyData.find(d => d.month === fullMonthKey) || { leads: 0, revenue: 0 }; 

        const financialTableRevenueInput = document.querySelector(`#financial-table-body .input-revenue[data-month="${monthKey}"]`);
        const currentRevenueInputValue = financialTableRevenueInput ? parseFloat(financialTableRevenueInput.value) : null;

        const suggestedRevenue = userInput.budget * TARGET_ROAS; 
        
        let revenueToUse = 0;
        if (currentRevenueInputValue !== null && !isNaN(currentRevenueInputValue)) {
            revenueToUse = currentRevenueInputValue;
        } else if (userInput.budget > 0) {
            revenueToUse = suggestedRevenue;
        } else {
             revenueToUse = actualData.revenue; // Use actual from API as fallback
        }

        const leads = actualData.leads || 0;
        const budget = userInput.budget;
        const revenue = revenueToUse;

        const cpl = (leads > 0 && budget > 0) ? (budget / leads) : 0; 
        const roas = (budget > 0) ? (revenue / budget) : 0; 

        return {
            month: monthInfo.month, monthKey: monthKey,
            inbox: userInput.inbox, budget: userInput.budget,
            lead: leads, revenue: revenue, cpl: cpl, roas: roas
        };
    });
    
    // console.log("[Recalculate V3.1] Calculated Financial Data:", state.calculatedFinancialData); // Debug log

    // Render the financial table, which then calls updateFinancialTotals
    renderFinancials(state.calculatedFinancialData); 

    // Render Funnel using core metrics from state and current marketing inputs
    renderFunnel(coreMetrics, marketingInputs); 

    // Render KPIs using planner defaults from state and core metrics
    renderKPIs(state.apiData?.planner_defaults || {}, coreMetrics);

    console.log("[Recalculate V3.1] Report update complete."); 
}

/** Renders the interactive financial table */
function renderFinancials(financialDataToRender) { 
    const tableBody = document.getElementById('financial-table-body');
    const tableFooter = document.getElementById('financial-table-footer');

    if (!tableBody || !tableFooter) { console.error("Financial table elements missing."); return; }
    
    const financialData = financialDataToRender || []; // Ensure it's an array
    
    if (financialData.length === 0) { 
        tableBody.innerHTML = '<tr><td colspan="7">ไม่มีข้อมูลรายเดือน</td></tr>';
        tableFooter.innerHTML = `<tr><td>Total</td><td id="total-budget">฿0</td><td id="total-inbox">0</td><td id="total-lead">0</td><td id="total-revenue">฿0</td><td id="total-cpl">-</td><td id="total-roas" class="good">0.00x</td></tr>`;
        // Update stats cards when empty
        const financialBudgetEl = document.getElementById('financial-budget');
        const financialRevenueEl = document.getElementById('financial-revenue');
        const financialRoasEl = document.getElementById('financial-roas');
        if (financialBudgetEl) financialBudgetEl.textContent = formatCurrency(0);
        if (financialRevenueEl) financialRevenueEl.textContent = formatCurrency(0);
        if (financialRoasEl) financialRoasEl.textContent = `0.00x`;
        console.warn("No data to render in financial table.");
        // Still need to update totals/planner even with empty data
        updateFinancialTotals(); 
        return; 
    }
    
    tableBody.innerHTML = ''; // Clear previous rows
    
    financialData.forEach(month => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${month.month || 'N/A'}</td> 
            <td><input type="number" class="input-budget" data-month="${month.monthKey}" value="${Math.round(month.budget || 0)}" step="1000" min="0"></td>
            <td class="cell-text">${formatNumber(month.inbox || 0)}</td>  
            <td><input type="number" class="input-lead" data-month="${month.monthKey}" value="${month.lead || 0}" step="1" min="0"></td> 
            <td><input type="number" class="input-revenue" data-month="${month.monthKey}" value="${Math.round(month.revenue || 0)}" step="1000" min="0"></td>
            <td class="cell-calc cell-cpl">${formatCurrency(month.cpl)}</td> 
            <td class="cell-calc cell-roas">${(month.roas || 0).toFixed(2)}x</td> 
        `;
        tableBody.appendChild(tr);
    });
    
    // Ensure Footer Structure exists before updating totals
    if (!tableFooter.querySelector('tr')) {
        tableFooter.innerHTML = `
            <tr><td>Total</td><td id="total-budget">...</td><td id="total-inbox">...</td><td id="total-lead">...</td><td id="total-revenue">...</td><td id="total-cpl">...</td><td id="total-roas" class="good">...</td></tr>
        `;
    }
    
    // Add Event Listener for input changes within THIS table (delegate to tbody)
    tableBody.removeEventListener('input', handleFinancialTableInputChange); 
    tableBody.addEventListener('input', handleFinancialTableInputChange);

    // Calculate Totals based on rendered input values and update dependent sections
    updateFinancialTotals(); 
}

/** Event handler for financial table inputs */
function handleFinancialTableInputChange(event) {
     if (event.target && event.target.tagName === 'INPUT') {
          if (parseFloat(event.target.value) < 0) event.target.value = 0; 
          if (event.target.validity.valid || event.target.value === '') {
               console.log("Financial table input changed, triggering recalculation...");
               event.target.style.outline = ''; 
               // Trigger the main recalculation function
               recalculateAndUpdateReport(); 
          } else {
               console.warn("Invalid number input in financial table.");
               event.target.style.outline = '2px solid red'; 
          }
     }
}

/** Calculates totals from Financial Table inputs & updates Footer, Stat Cards, Planner. */
function updateFinancialTotals() {
    const tableBody = document.getElementById('financial-table-body');
    if (!tableBody) return; 
    
    const rows = tableBody.querySelectorAll('tr');
    let totalBudget = 0, totalLead = 0, totalRevenue = 0;

    rows.forEach(row => {
        totalBudget += parseFloat(row.querySelector('.input-budget')?.value) || 0;
        totalLead += parseInt(row.querySelector('.input-lead')?.value, 10) || 0; 
        totalRevenue += parseFloat(row.querySelector('.input-revenue')?.value) || 0;
    });
    
    // Get Total Inbox from Marketing Input section
    const marketingInputs = getMarketingInputs();
    const totalInbox = Object.values(marketingInputs).reduce((sum, month) => sum + (month.inbox || 0), 0);

    const totalCPL = (totalLead > 0 && totalBudget > 0) ? (totalBudget / totalLead) : 0;
    const totalROAS = (totalBudget > 0) ? (totalRevenue / totalBudget) : 0;

    // Update Footer, Stat Cards (IDs remain the same)
    const totalBudgetEl = document.getElementById('total-budget');
    const totalInboxEl = document.getElementById('total-inbox');
    const totalLeadEl = document.getElementById('total-lead');
    const totalRevenueEl = document.getElementById('total-revenue');
    const totalCplEl = document.getElementById('total-cpl');
    const totalRoasEl = document.getElementById('total-roas');
    const financialBudgetEl = document.getElementById('financial-budget');
    const financialRevenueEl = document.getElementById('financial-revenue');
    const financialRoasEl = document.getElementById('financial-roas');

    if (totalBudgetEl) totalBudgetEl.textContent = formatCurrency(totalBudget);
    if (totalInboxEl) totalInboxEl.textContent = formatNumber(totalInbox); 
    if (totalLeadEl) totalLeadEl.textContent = formatNumber(totalLead);
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenue);
    if (totalCplEl) totalCplEl.textContent = formatCurrency(totalCPL, false, 2); // Show decimals for CPL
    if (totalRoasEl) totalRoasEl.textContent = `${totalROAS.toFixed(2)}x`;

    if (financialBudgetEl) financialBudgetEl.textContent = formatCurrency(totalBudget);
    if (financialRevenueEl) financialRevenueEl.textContent = formatCurrency(totalRevenue);
    if (financialRoasEl) financialRoasEl.textContent = `${totalROAS.toFixed(2)}x`;

    // Update Planner Inputs (Inbox count and calculated Inbox->Lead %)
    const plannerInboxEl = document.getElementById('inboxes');
    if (plannerInboxEl) plannerInboxEl.value = totalInbox; 
    
    const inboxToLeadPercent = (totalInbox > 0) ? (totalLead / totalInbox * 100) : 0;
    const inboxToLeadEl = document.getElementById('inboxToLead');
    const inboxToLeadValueEl = document.getElementById('inboxToLeadValue');
    // Update slider and display value, ensuring it's within slider bounds
    const validInboxToLeadPercent = Math.min(50, Math.max(1, inboxToLeadPercent)); // Assuming slider range 1-50
    if (inboxToLeadEl) inboxToLeadEl.value = validInboxToLeadPercent.toFixed(1);
    if (inboxToLeadValueEl) inboxToLeadValueEl.textContent = `${validInboxToLeadPercent.toFixed(1)}%`;

    // Update Planner Notes
    const plannerNotes = document.getElementById('planner-notes');
    if (plannerNotes) {
        // Use Lead->Sale % directly from planner input or fallback to stored base value
        const leadToSalePercentValue = document.getElementById('leadToSale')?.value;
        const leadToSalePercent = parseFloat(leadToSalePercentValue) || window.plannerBase?.leadToSale_percent || 0;
        const totalSales = Math.round(totalLead * (leadToSalePercent / 100));
        
        plannerNotes.textContent = `* ผลรวม: Inbox ${formatNumber(totalInbox)} → Lead ${formatNumber(totalLead)} → ปิดการขาย ${formatNumber(totalSales)}`;
    }

    // Trigger Planner recalculation AFTER updating its inputs
    if (typeof calcPlanner === 'function') {
        calcPlanner();
    }
}


// ================================================================================
// OTHER RENDERING FUNCTIONS 
// ================================================================================

/** Renders Funnel using core metrics and marketing inputs */
function renderFunnel(coreMetrics = {}, marketingInputs = {}) {
    coreMetrics = coreMetrics || {}; // Ensure object exists
    const totalInboxes = Object.values(marketingInputs).reduce((sum, month) => sum + (month.inbox || 0), 0);
    const qualifiedLeads = coreMetrics.qualified_leads || 0;
    const closedSales = coreMetrics.closed_sales || 0;

    const inboxesEl = document.getElementById('funnel-inboxes');
    const leadsEl = document.getElementById('funnel-leads');
    const salesEl = document.getElementById('funnel-sales');

    if (inboxesEl) inboxesEl.textContent = formatNumber(totalInboxes); 
    if (leadsEl) leadsEl.textContent = formatNumber(qualifiedLeads);
    if (salesEl) salesEl.textContent = formatNumber(closedSales);

    // Update KPIs related to Funnel (Inbox->Lead)
    const kpiInboxLeadEl = document.getElementById('kpi-inbox-lead');
     if (kpiInboxLeadEl) {
          const inboxToLeadPercent = (totalInboxes > 0) ? (qualifiedLeads / totalInboxes * 100) : 0;
          kpiInboxLeadEl.textContent = `Actual ${inboxToLeadPercent.toFixed(1)}%`; 
     }
}

/** Renders simplified Team Performance based on team_breakdown */
function renderTeamPerformance(teamBreakdown = []) {
    const container = document.getElementById('team-performance-grid');
    if (!container) return; 

    teamBreakdown = Array.isArray(teamBreakdown) ? teamBreakdown : [];

    if (teamBreakdown.length === 0) {
        container.innerHTML = '<div class="stat-card"><p>ไม่มีข้อมูลทีม</p></div>'; return;
    }
    container.innerHTML = ''; 
    
    const teamDisplayMap = { /* ... team mappings ... */ }; // Same as before

    teamBreakdown.forEach(team => { /* ... create team cards ... */ }); // Same as before
}

/** Renders static Recommendations */
function renderRecommendations() {
    const list = document.getElementById('recommendations-list');
    if (!list) return;
    list.innerHTML = `
        <li><strong>ปรับปรุงคุณภาพ Lead:</strong> กำหนดเกณฑ์ Lead ที่ชัดเจนขึ้น</li>
        <li><strong>แบ่งปันเทคนิคการขาย:</strong> จัด Coaching ระหว่างทีมที่มีผลงานต่างกัน</li>
        <li><strong>วิเคราะห์แนวโน้มรายเดือน:</strong> หาสาเหตุของเดือนที่ผลงานดี/ไม่ดี</li>
    `; 
}

/** Renders KPIs using planner defaults and core metrics */
function renderKPIs(plannerDefaults = {}, coreMetrics = {}) {
    plannerDefaults = plannerDefaults || {};
    coreMetrics = coreMetrics || {};
    
    const leadToSalePercent = plannerDefaults.leadToSale_percent || 0; 
    const target = plannerDefaults.target || 6500000;

    const kpiLeadApptEl = document.getElementById('kpi-lead-appt'); // For Lead->Sale %
    const kpiRevenueGoalEl = document.getElementById('kpi-revenue-goal');
    // Inbox->Lead KPI is handled dynamically in renderFunnel

    if (kpiLeadApptEl) kpiLeadApptEl.textContent = `Actual ${leadToSalePercent.toFixed(1)}%`; 
    if (kpiRevenueGoalEl) kpiRevenueGoalEl.textContent = formatCurrency(target);
}

/** Populates Planner with defaults from API data */
function populatePlanner(plannerDefaults = {}) {
     plannerDefaults = plannerDefaults || {}; 

    // Store base values for Reset, providing fallbacks
    window.plannerBase = { 
        target: plannerDefaults.target || 6500000,
        leadToSale_percent: plannerDefaults.leadToSale_percent || 0,
        avg_ticket_size: plannerDefaults.avg_ticket_size || 0,
    }; 

    const targetEl = document.getElementById('target');
    const leadToSaleEl = document.getElementById('leadToSale');
    const ticketEl = document.getElementById('ticket');
    
    // Populate elements if they exist, using stored base values
    if (targetEl) targetEl.value = window.plannerBase.target;
    if (leadToSaleEl) leadToSaleEl.value = window.plannerBase.leadToSale_percent.toFixed(1); 
    if (ticketEl) ticketEl.value = window.plannerBase.avg_ticket_size;
    
    // Initial calculation of planner display happens via the updateFinancialTotals -> calcPlanner chain.
}


// ================================================================================
// MAIN INITIALIZATION - Called by external function or auto-init
// ================================================================================

/** * Internal function to initialize the report rendering process using data from state.
 */
function initializeReportWithData() {
    console.log("[InitReport V3.1] Initializing rendering with state data...");
    
    // Ensure essential data structure exists, even if empty
    state.apiData = state.apiData || { core_metrics: {}, monthly_breakdown: [], team_breakdown: [], planner_defaults: {} };
    state.currentUser = state.currentUser || null; // Can be null if run without user context

    try {
        // 1. Create Marketing Input table structure (determines months used)
        createMarketingInputTable();

        // 2. Populate Planner defaults (needs to happen before first calc)
        populatePlanner(state.apiData.planner_defaults);

        // 3. Trigger the first calculation cycle
        // This reads initial marketing inputs (zeros), merges with API data,
        // renders financial table (with suggested revenue), updates totals (which updates planner inputs),
        // renders funnel, and KPIs.
        recalculateAndUpdateReport();

        // 4. Render Team Performance (uses data directly from API state)
        renderTeamPerformance(state.apiData.team_breakdown || []);
        
        // 5. Render Recommendations (static)
        renderRecommendations();

        console.log("[InitReport V3.1] Report initialization complete.");

    } catch (error) {
        console.error("[InitReport V3.1] Error during initialization:", error);
        displayError(error);
    }
}

// ================================================================================
// SCENARIO PLANNER LOGIC (SECTION 7) - Mostly Unchanged
// ================================================================================

window.plannerBase = {}; // Holds default/API values for reset

// References to Planner elements (ensure IDs match HTML)
const targetEl = document.getElementById('target');
const inboxesEl = document.getElementById('inboxes'); // Value comes from updateFinancialTotals
const inboxToLeadEl = document.getElementById('inboxToLead'); // Value comes from updateFinancialTotals, user can slide
const leadToSaleEl = document.getElementById('leadToSale'); // User input / API Default
const ticketEl = document.getElementById('ticket');       // User input / API Default
const inboxToLeadValue = document.getElementById('inboxToLeadValue'); // Display for slider
const leadsOut = document.getElementById('leadsOut');
const salesOut = document.getElementById('salesOut');
const revenueOut = document.getElementById('revenueOut');
const gapOut = document.getElementById('gapOut');
const insightEl = document.getElementById('insight');

/** Calculates and updates the Scenario Planner results. */
function calcPlanner() {
    // Read current values from Planner inputs
    const target = Number(targetEl?.value) || 0;
    const inboxes = Number(inboxesEl?.value) || 0; // Gets value updated by updateFinancialTotals
    const inboxToLead = Number(inboxToLeadEl?.value) || 0; // Gets value updated by updateFinancialTotals/slider
    const leadToSale = Number(leadToSaleEl?.value) || 0; // User input
    const ticket = Number(ticketEl?.value) || 0;       // User input / API Default

    // Perform calculations
    const leads = Math.round((inboxes * inboxToLead) / 100);
    const sales = Math.round((leads * leadToSale) / 100);
    const revenue = sales * ticket;
    const gap = revenue - target;

    // Update Planner display elements
    if (leadsOut) leadsOut.textContent = leads.toLocaleString();
    if (salesOut) salesOut.textContent = sales.toLocaleString();
    if (revenueOut) revenueOut.textContent = formatCurrency(revenue);
    if (gapOut) gapOut.textContent = (gap >= 0 ? '+ ' : '') + formatCurrency(gap);

    const gapCard = gapOut?.parentElement;
    if (gapCard) {
        gapCard.classList.remove('positive', 'negative');
        gapCard.classList.add(gap >= 0 ? 'positive' : 'negative');
    }

    // Generate insight text
    let insight = '';
    if (gap >= 0) {
        insight = `ยอดขายเกินเป้า ${formatCurrency(gap)} 🎉`;
    } else {
        const missing = Math.abs(gap);
        const neededSales = (ticket > 0) ? Math.ceil(missing / ticket) : 0;
        const neededLeads = (leadToSale > 0) ? Math.ceil(neededSales / (leadToSale / 100)) : 0;
        const targetConversion = (inboxes > 0) ? (neededLeads * 100) / inboxes : 0; 
        
        insight = `ยังขาด <span class="planner-highlight">${formatCurrency(missing)}</span> (ประมาณ <span class="planner-highlight">${neededSales}</span> เคส)<br>
        ต้องเพิ่ม Inbox→Lead เป็น <span class="planner-highlight">${targetConversion.toFixed(1)}%</span> หรือเพิ่ม <span class="planner-highlight">${neededLeads}</span> Leads`;
    }
    if (insightEl) insightEl.innerHTML = insight;
}

// --- Event Listeners for Planner (Section 7) ---
// Add listeners only for USER-editable fields that directly affect the planner forecast

// When user changes Lead->Sale % in Planner
if (leadToSaleEl) {
     leadToSaleEl.addEventListener('input', () => {
          if (parseFloat(leadToSaleEl.value) < 0) leadToSaleEl.value = 0;
          if (leadToSaleEl.validity.valid || leadToSaleEl.value === '') {
                leadToSaleEl.style.outline = '';
                calcPlanner(); // Recalculate planner forecast
                // Also update the note which shows estimated sales based on new %
                updateFinancialTotals(); 
          } else {
               leadToSaleEl.style.outline = '2px solid red';
          }
     });
}
// When user changes Avg Ticket Size in Planner
if (ticketEl) {
     ticketEl.addEventListener('input', () => {
          if (parseFloat(ticketEl.value) < 0) ticketEl.value = 0;
          if (ticketEl.validity.valid || ticketEl.value === '') {
               ticketEl.style.outline = '';
               calcPlanner(); // Only need to recalculate planner forecast
          } else {
               ticketEl.style.outline = '2px solid red';
          }
     });
}
// When user changes Target Revenue in Planner
if (targetEl) {
     targetEl.addEventListener('input', () => {
          if (parseFloat(targetEl.value) < 0) targetEl.value = 0;
           if (targetEl.validity.valid || targetEl.value === '') {
                targetEl.style.outline = '';
                calcPlanner(); // Only need to recalculate planner forecast
           } else {
                targetEl.style.outline = '2px solid red';
           }
     });
}
// When user manually adjusts the Inbox->Lead % slider
if (inboxToLeadEl && inboxToLeadValue) {
    inboxToLeadEl.addEventListener('input', () => {
        inboxToLeadValue.textContent = `${inboxToLeadEl.value}%`;
        // Recalculate planner forecast based on manual slider adjustment
        // DO NOT trigger updateFinancialTotals here, as that reads from marketing inputs
        calcPlanner(); 
    });
}

// Reset button logic
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        console.log("Reset button clicked.");
        // Use base values stored in window.plannerBase (from API/Defaults)
        const base = window.plannerBase || {}; 
        
        // Reset Planner user-editable inputs back to base values
        if (targetEl) targetEl.value = base.target || 6500000;
        if (leadToSaleEl) {
             leadToSaleEl.value = (base.leadToSale_percent || 0).toFixed(1); 
             leadToSaleEl.style.outline = ''; // Clear error state
        }
        if (ticketEl) {
             ticketEl.value = base.avg_ticket_size || 0;
             ticketEl.style.outline = ''; // Clear error state
        }
        
        // Reset Marketing Inputs to zero
        const marketingInputsBody = document.getElementById('marketing-input-body');
        marketingInputsBody?.querySelectorAll('input.input-marketing').forEach(input => {
             input.value = 0; // Reset to zero
             input.style.outline = ''; // Clear error state
        });
        
        // Clear calculated financial data state (will be rebuilt)
        state.calculatedFinancialData = []; 
        
        console.log("Triggering recalculate after reset.");
        // Trigger a full recalculation using the now-reset inputs and original API data
        recalculateAndUpdateReport(); 
    });
}

// ================================================================================
// EXPOSE INITIALIZATION FUNCTION & AUTO-DETECT MODE
// ================================================================================

/**
 * Global function to initialize the report with external data.
 * @param {Object} reportData - Report data matching API v3.0 structure.
 * @param {Object} [userData=null] - Optional user data.
 */
window.initializeSalesReport = function(reportData, userData = null) {
    console.log("[Global Init] Setting up report with provided data:", reportData);
    
    // Basic data validation
    if (!reportData || typeof reportData !== 'object' || !reportData.core_metrics) {
        console.error("[Global Init] Invalid or missing core data provided.");
        displayError(new Error("ข้อมูลที่ส่งมาสำหรับรายงานไม่สมบูรณ์หรือไม่ถูกต้อง"));
        return; // Stop initialization
    }

    // Store data in global state
    state.apiData = reportData;
    state.currentUser = userData; // Store user data if provided

    // Start the internal rendering process
    // Wrap in try...catch for safety during initialization
    try {
        initializeReportWithData(); 
    } catch(initError) {
        console.error("[Global Init] Error during report initialization:", initError);
        displayError(initError);
    }
};

console.log("[Script Ready] report-2.js v3.1 loaded. Call window.initializeSalesReport(data) or rely on auto-init.");

// --- Auto-Detection / Auto-Initialization (for backward compatibility) ---
// Checks if Supabase/API environment exists and tries to load data automatically
// if window.initializeSalesReport hasn't been called manually shortly after DOM load.

// Use a flag to prevent auto-init if manual init happens quickly
window.reportInitializedManually = false; 
const originalManualInit = window.initializeSalesReport;
window.initializeSalesReport = function(reportData, userData = null) {
     window.reportInitializedManually = true; // Set flag
     originalManualInit(reportData, userData); // Call original function
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("[DOM Ready] Checking for auto-initialization possibility...");
    
    // Check if the necessary Supabase/API objects exist for auto-mode
    const canAutoInit = typeof window.supabaseClient !== 'undefined' 
                     && typeof window.apiV2?.getSalesReportV2 === 'function';

    if (canAutoInit) {
        console.log("[Auto-Init] Supabase/APIv2 environment detected.");
        
        // Wait a very short moment to allow potential manual initialization
        await new Promise(resolve => setTimeout(resolve, 100)); 

        // Proceed with auto-init only if manual init hasn't happened yet
        if (!window.reportInitializedManually) {
            console.log("[Auto-Init] No manual initialization detected, proceeding with auto-load...");
            try {
                const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
                
                if (sessionError) throw new Error("ไม่สามารถตรวจสอบสิทธิ์ได้: " + sessionError.message);
                
                const user = session?.user;
                if (user) {
                    console.log("[Auto-Init] User authenticated:", user.id);
                    console.log("[Auto-Init] Fetching data via apiV2.getSalesReportV2...");
                    
                    // Fetch data using the detected API
                    const reportData = await window.apiV2.getSalesReportV2(user.id, null, null);
                    
                    if (reportData && typeof reportData === 'object' && reportData.core_metrics) {
                        console.log("[Auto-Init] Data received successfully via API.");
                        // Call the *original* manual init function internally now we have data
                        originalManualInit(reportData, user); 
                    } else {
                        console.error("[Auto-Init] Invalid data received from API:", reportData);
                        throw new Error("API ไม่ได้ส่งข้อมูลรายงานที่ถูกต้องกลับมา");
                    }
                } else {
                    console.log("[Auto-Init] No active user session found. Redirecting to login.");
                    // Only redirect if truly in auto-mode without a session
                    window.location.replace('./login.html'); 
                }
            } catch (error) {
                console.error("[Auto-Init] Error during auto-initialization sequence:", error);
                displayError(error); // Show error on the report page
            }
        } else {
             console.log("[Auto-Init] Manual initialization detected, skipping auto-load.");
        }
    } else {
        console.log("[Standalone Mode] Supabase/APIv2 environment not detected. Waiting for manual call to window.initializeSalesReport(data).");
        // Optionally display a message indicating manual data injection is needed
        // displayError(new Error("กรุณาส่งข้อมูลรายงานเข้ามาผ่านฟังก์ชัน initializeSalesReport")); 
    }
});

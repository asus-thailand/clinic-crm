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
        { month: 'ก.ค.', monthKey: 'jul' }, // Default keys if API fails
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
    // Use toLocaleString for automatic comma separation and specified decimals
    return sign + '฿' + absNum.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatNumber(n) {
     const num = parseFloat(n);
     if (isNaN(num)) return '0';
     return num.toLocaleString(); // Use toLocaleString for comma separation
}

function displayError(error) {
    const mainContainer = document.querySelector('.container');
    // Ensure error message is displayed clearly
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (mainContainer) {
        // More prominent error display
        mainContainer.innerHTML = `
            <div style="padding: 40px; background: white; margin: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                <h2 style="color: #dc3545; margin-bottom: 15px;">เกิดข้อผิดพลาดในการโหลดรายงาน</h2>
                <p style="color: #333; font-size: 1.1em;">${errorMessage}</p>
                <p style="margin-top: 20px; color: #555;">กรุณาลองรีเฟรชหน้า หรือตรวจสอบ Console สำหรับรายละเอียดเพิ่มเติม</p>
            </div>`;
    } else {
        // Fallback alert
        alert(`เกิดข้อผิดพลาดในการโหลดรายงาน: ${errorMessage}`);
    }
}

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

    // Determine months to use: Prioritize API data, fallback to defaults
    const monthsFromAPI = state.apiData?.monthly_breakdown?.map(m => ({ 
        month: m.month_th || m.month, // Use Thai name if available
        monthKey: m.month.substring(5) // Extract '07', '08', etc. from 'YYYY-MM'
    }));
    
    const monthsToUse = (monthsFromAPI && monthsFromAPI.length > 0) ? monthsFromAPI : state.marketingInputMonths; 
    
    // Store the actual months being used (with keys)
    state.marketingInputMonths = monthsToUse;
    console.log("Using months for input:", state.marketingInputMonths);

    monthsToUse.forEach(monthInfo => {
        const tr = document.createElement('tr');
        // Default budget/inbox to 0 if not previously set
        // Use monthKey for unique IDs
        tr.innerHTML = `
            <td>${monthInfo.month}</td>
            <td><input type="number" id="input-inbox-${monthInfo.monthKey}" data-month="${monthInfo.monthKey}" class="input-marketing input-inbox" value="0" step="1" min="0"></td>
            <td><input type="number" id="input-budget-${monthInfo.monthKey}" data-month="${monthInfo.monthKey}" class="input-marketing input-budget" value="0" step="1000" min="0"></td>
        `;
        tableBody.appendChild(tr);
    });

    // Add event listener for changes
    tableBody.removeEventListener('input', handleMarketingInputChange); // Remove previous listener first
    tableBody.addEventListener('input', handleMarketingInputChange);
}

/** Reads current values from the Marketing Input table. */
function getMarketingInputs() {
    const inputs = {};
    const inputRows = document.querySelectorAll('#marketing-input-body tr');
    inputRows.forEach(row => {
        const monthKey = row.querySelector('.input-inbox')?.dataset.month;
        if (monthKey) {
            // Use parseInt for Inboxes (whole numbers), parseFloat for Budget
            const inbox = parseInt(row.querySelector('.input-inbox')?.value, 10) || 0; 
            const budget = parseFloat(row.querySelector('.input-budget')?.value) || 0;
            // Ensure values are not negative
            inputs[monthKey] = { 
                inbox: Math.max(0, inbox), 
                budget: Math.max(0, budget) 
            };
        }
    });
    // console.log("Read Marketing Inputs:", inputs); // For debugging
    return inputs;
}

/** Handles changes in the Marketing Input table, triggers recalculation. */
function handleMarketingInputChange(event) {
    // Basic validation on the input element itself
    if (event.target && event.target.tagName === 'INPUT') {
         // Ensure negative numbers are not allowed visually (though getMarketingInputs also handles it)
         if (parseFloat(event.target.value) < 0) {
              event.target.value = 0; 
         }
         // Check validity state for non-numeric inputs
         if (event.target.validity.valid || event.target.value === '') {
              console.log("Marketing input changed, recalculating...");
              recalculateAndUpdateReport(); // Trigger the main update function
         } else {
              console.warn("Invalid number input detected in marketing table.");
              // Optional: Add visual feedback for invalid input
              event.target.style.outline = '2px solid red'; 
         }
    }
}


// ================================================================================
// FINANCIAL TABLE LOGIC (SECTION 6) - Combines Input & API Data, Applies Logic
// ================================================================================

/**
 * [NEW] Core recalculation logic triggered by any input change.
 * Reads marketing inputs, merges with API leads/revenue, calculates suggested revenue,
 * calculates metrics (CPL/ROAS), updates state, and triggers rendering.
 */
function recalculateAndUpdateReport() {
    console.log("[Recalculate] Starting full report update..."); // Debug log

    // 1. Get latest marketing inputs (Inbox, Budget)
    const marketingInputs = getMarketingInputs();

    // 2. Get actual leads/revenue from the initial API data (ensure fallback)
    const actualMonthlyData = state.apiData?.monthly_breakdown || [];

    // 3. Prepare data for the financial table (Section 6)
    state.calculatedFinancialData = state.marketingInputMonths.map(monthInfo => {
        const monthKey = monthInfo.monthKey; // e.g., '07'
        const fullMonthKey = `2025-${monthKey}`; // Use YYYY-MM format from API data, adjust year if needed

        const userInput = marketingInputs[monthKey] || { inbox: 0, budget: 0 };
        const actualData = actualMonthlyData.find(d => d.month === fullMonthKey) || { leads: 0, revenue: 0 }; 

        // Check if user has manually entered revenue in the financial table for THIS month
        const financialTableRevenueInput = document.querySelector(`#financial-table-body .input-revenue[data-month="${monthKey}"]`);
        // Read the current value from the input, could be user override or previous calculation
        const currentRevenueInputValue = financialTableRevenueInput ? parseFloat(financialTableRevenueInput.value) : null;

        // Apply Business Logic: Suggest revenue = budget * TARGET_ROAS
        const suggestedRevenue = userInput.budget * TARGET_ROAS; 
        
        // Determine Revenue to use: Prioritize current input value (user override), 
        // then suggestedRevenue, then actualData.revenue as final fallback.
        let revenueToUse = 0;
        if (currentRevenueInputValue !== null && !isNaN(currentRevenueInputValue)) {
            revenueToUse = currentRevenueInputValue; // Use value currently in the input (could be override)
        } else if (userInput.budget > 0) {
            revenueToUse = suggestedRevenue; // Use suggestion if budget exists
        } else {
             revenueToUse = actualData.revenue; // Fallback to actual API revenue if budget is 0 and no input
        }

        // Calculate CPL and ROAS based on current values
        const leads = actualData.leads || 0;
        const budget = userInput.budget;
        const revenue = revenueToUse; // Use the determined revenue

        const cpl = (leads > 0 && budget > 0) ? (budget / leads) : 0; 
        const roas = (budget > 0) ? (revenue / budget) : 0; 

        return {
            month: monthInfo.month, // Thai month name
            monthKey: monthKey,     // '07', '08' etc.
            inbox: userInput.inbox,
            budget: userInput.budget,
            lead: leads,            // Actual leads from API
            revenue: revenue,       // Calculated/Overridden revenue
            cpl: cpl,               // Calculated CPL
            roas: roas              // Calculated ROAS
        };
    });
    
    console.log("[Recalculate] Calculated Financial Data:", state.calculatedFinancialData); // Debug log

    // 4. Re-render the Financial Table (Section 6) with the new calculated data
    // This function will now also call updateFinancialTotals at the end.
    renderFinancials(state.calculatedFinancialData); 

    // 5. Re-render Funnel (uses total inbox from marketing inputs and actual leads/sales from API core metrics)
    renderFunnel(state.apiData?.core_metrics || {}, marketingInputs); 

    // 6. Re-render KPIs (uses planner defaults from API and results from updateFinancialTotals)
    // Note: renderKPIs depends partially on planner defaults from API
    renderKPIs(state.apiData?.planner_defaults || {}, state.apiData?.core_metrics || {});

    // updateFinancialTotals (called by renderFinancials) handles updating Planner
    console.log("[Recalculate] Report update complete."); // Debug log
}


/**
 * Renders the interactive financial table using provided data (usually state.calculatedFinancialData).
 */
function renderFinancials(financialDataToRender) { 
    const tableBody = document.getElementById('financial-table-body');
    const tableFooter = document.getElementById('financial-table-footer');

    if (!tableBody || !tableFooter) { console.error("Financial table body or footer element not found."); return; }
    
    const financialData = financialDataToRender; 
    
    if (!financialData || financialData.length === 0) { 
         tableBody.innerHTML = '<tr><td colspan="7">ไม่มีข้อมูลรายเดือน</td></tr>';
         tableFooter.innerHTML = `<tr><td>Total</td><td id="total-budget">฿0</td><td id="total-inbox">0</td><td id="total-lead">0</td><td id="total-revenue">฿0</td><td id="total-cpl">-</td><td id="total-roas" class="good">0.00x</td></tr>`;
         // Update stats cards directly here if data is empty
         const financialBudgetEl = document.getElementById('financial-budget');
         const financialRevenueEl = document.getElementById('financial-revenue');
         const financialRoasEl = document.getElementById('financial-roas');
         if (financialBudgetEl) financialBudgetEl.textContent = formatCurrency(0);
         if (financialRevenueEl) financialRevenueEl.textContent = formatCurrency(0);
         if (financialRoasEl) financialRoasEl.textContent = `0.00x`;
         console.warn("No calculated financial data available to render in financial table.");
         return; 
    }
    
    tableBody.innerHTML = ''; // Clear existing rows
    
    financialData.forEach(month => {
        const tr = document.createElement('tr');
        // Budget, Lead, Revenue are inputs. Inbox is displayed text. CPL/ROAS are calculated display.
        // Use step attribute for better usability on number inputs
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
        // No need to recalculate row here as data is pre-calculated in recalculateAndUpdateReport
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
    
    // Add Event Listener using Event Delegation for input changes within THIS financial table
    // Remove previous listener to avoid duplicates if re-rendering
    tableBody.removeEventListener('input', handleFinancialTableInputChange); 
    tableBody.addEventListener('input', handleFinancialTableInputChange);

    // Calculate Totals based on the newly rendered input values and update dependent sections
    updateFinancialTotals(); 
}

/** * Event handler specifically for the financial table inputs (Budget, Lead, Revenue).
 * Triggers the main recalculation process.
 */
function handleFinancialTableInputChange(event) {
     // Basic validation on the input element itself
     if (event.target && event.target.tagName === 'INPUT') {
          // Ensure negative numbers are not allowed visually
          if (parseFloat(event.target.value) < 0) {
               event.target.value = 0; 
          }
          if (event.target.validity.valid || event.target.value === '') {
               console.log("Financial table input changed, triggering recalculation...");
               // Reset outline in case it was red
               event.target.style.outline = ''; 
               // Just trigger the main recalculation function, which reads all inputs again
               recalculateAndUpdateReport(); 
          } else {
               console.warn("Invalid number input detected in financial table.");
               // Optional: Visual feedback for invalid input
               event.target.style.outline = '2px solid red'; 
          }
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

    // Sum totals directly from the financial table inputs
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
    if (totalCplEl) totalCplEl.textContent = formatCurrency(totalCPL);
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
    if (inboxToLeadEl) inboxToLeadEl.value = inboxToLeadPercent.toFixed(1);
    if (inboxToLeadValueEl) inboxToLeadValueEl.textContent = `${inboxToLeadPercent.toFixed(1)}%`;

    // Update Planner Notes
    const plannerNotes = document.getElementById('planner-notes');
    if (plannerNotes) {
        // Use Lead->Sale % directly from planner input or fallback to API default
        const leadToSalePercentValue = document.getElementById('leadToSale')?.value;
        const leadToSalePercent = parseFloat(leadToSalePercentValue) || state.apiData?.planner_defaults?.leadToSale_percent || 0;
        const totalSales = Math.round(totalLead * (leadToSalePercent / 100));
        
        plannerNotes.textContent = `* อิงจากผลรวม: Input Inbox ${formatNumber(totalInbox)} → Actual Lead ${formatNumber(totalLead)} → Est. Sale ${formatNumber(totalSales)}`;
    }

    // Trigger Planner recalculation AFTER updating its inputs
    if (typeof calcPlanner === 'function') {
        calcPlanner();
    }
}


// ================================================================================
// OTHER RENDERING FUNCTIONS (Adapted for Simplified API Data)
// ================================================================================

/** Renders Funnel using core metrics and marketing inputs */
function renderFunnel(coreMetrics = {}, marketingInputs = {}) {
    // Ensure coreMetrics is an object
    coreMetrics = coreMetrics || {};
    const totalInboxes = Object.values(marketingInputs).reduce((sum, month) => sum + (month.inbox || 0), 0);
    const qualifiedLeads = coreMetrics.qualified_leads || 0;
    const closedSales = coreMetrics.closed_sales || 0;

    const inboxesEl = document.getElementById('funnel-inboxes');
    const leadsEl = document.getElementById('funnel-leads');
    const salesEl = document.getElementById('funnel-sales');

    if (inboxesEl) inboxesEl.textContent = formatNumber(totalInboxes); 
    if (leadsEl) leadsEl.textContent = formatNumber(qualifiedLeads);
    if (salesEl) salesEl.textContent = formatNumber(closedSales);

    // Update KPIs that depend on these numbers
    const kpiInboxLeadEl = document.getElementById('kpi-inbox-lead');
     if (kpiInboxLeadEl) {
          const inboxToLeadPercent = (totalInboxes > 0) ? (qualifiedLeads / totalInboxes * 100) : 0;
          kpiInboxLeadEl.textContent = `Actual ${inboxToLeadPercent.toFixed(1)}%`; // Show actual rate based on input
     }
}

/** Renders simplified Team Performance based on team_breakdown */
function renderTeamPerformance(teamBreakdown = []) {
    const container = document.getElementById('team-performance-grid');
    if (!container) return; // Exit if container not found

    // Ensure teamBreakdown is an array
    teamBreakdown = Array.isArray(teamBreakdown) ? teamBreakdown : [];

    if (teamBreakdown.length === 0) {
        container.innerHTML = '<div class="stat-card"><p>ไม่มีข้อมูลทีม</p></div>'; return;
    }
    container.innerHTML = ''; // Clear loading/previous content
    
    // Map team names for display (adjust as needed)
    const teamDisplayMap = {
         'Online': { name: '💻 ทีมออนไลน์', color: '#764ba2'},
         'MAM': { name: '🏆 MAM', color: '#48bb78'},
         'AU': { name: '💰 AU', color: '#667eea'},
         'GOLF': { name: '📈 GOLF', color: '#f56565'}
    };

    teamBreakdown.forEach(team => {
        // Provide default values if team properties are missing
        const teamNameKey = team.team_name || 'Unknown';
        const displayInfo = teamDisplayMap[teamNameKey] || { name: `ทีม ${teamNameKey}`, color: '#ccc' };
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
            <p class="stat-subtext"><strong>Note:</strong> Closing rate based on leads assigned to this team.</p> 
        `; // Added a simple note
        container.appendChild(card);
    });
}

/** Renders static Recommendations */
function renderRecommendations() {
    const list = document.getElementById('recommendations-list');
    if (!list) return;
    // Keep recommendations simple and static for now
    list.innerHTML = `
        <li><strong>Focus on Lead Quality:</strong> Implement stricter criteria for qualified leads.</li>
        <li><strong>Team Coaching:</strong> Share best practices for closing between high/low performers.</li>
        <li><strong>Analyze Monthly Trends:</strong> Identify reasons for high/low performance months.</li>
    `; 
}

/** Renders KPIs using planner defaults and core metrics */
function renderKPIs(plannerDefaults = {}, coreMetrics = {}) {
    // Ensure objects exist
    plannerDefaults = plannerDefaults || {};
    coreMetrics = coreMetrics || {};
    
    // Lead -> Appointment/Sale KPI uses the calculated overall Lead->Sale %
    const leadToSalePercent = plannerDefaults.leadToSale_percent || 0; 
    const target = plannerDefaults.target || 6500000;

    const kpiLeadApptEl = document.getElementById('kpi-lead-appt'); // Re-purposed for Lead->Sale
    const kpiRevenueGoalEl = document.getElementById('kpi-revenue-goal');
    // Inbox->Lead KPI is handled dynamically in renderFunnel based on user input

    if (kpiLeadApptEl) kpiLeadApptEl.textContent = `Actual ${leadToSalePercent.toFixed(1)}%`; // Show actual Lead->Sale
    if (kpiRevenueGoalEl) kpiRevenueGoalEl.textContent = formatCurrency(target);
}

/** Populates Planner with defaults from API */
function populatePlanner(plannerDefaults = {}) {
     plannerDefaults = plannerDefaults || {}; // Ensure it's an object

    // Store base values for the Reset button, providing fallbacks
    window.plannerBase = { 
        target: plannerDefaults.target || 6500000,
        leadToSale_percent: plannerDefaults.leadToSale_percent || 0,
        avg_ticket_size: plannerDefaults.avg_ticket_size || 0,
        // Inboxes and Inbox->Lead % will be populated dynamically by updateFinancialTotals
    }; 

    // Get references to Planner elements
    const targetEl = document.getElementById('target');
    const leadToSaleEl = document.getElementById('leadToSale');
    const ticketEl = document.getElementById('ticket');
    
    // Populate elements if they exist, using stored base values
    if (targetEl) targetEl.value = window.plannerBase.target;
    // Use toFixed(1) for percentage input consistency
    if (leadToSaleEl) leadToSaleEl.value = window.plannerBase.leadToSale_percent.toFixed(1); 
    if (ticketEl) ticketEl.value = window.plannerBase.avg_ticket_size;
    
    // Initial calculation of planner display happens via the updateFinancialTotals -> calcPlanner chain.
}


// -- CORE LOGIC --
/** Fetches simplified data, creates inputs, merges, renders. */
async function fetchAndRenderReport() {
    if (!state.currentUser) { console.error("No user found."); displayError(new Error("User session not found.")); return; }
    if (typeof window.apiV2 === 'undefined' || typeof window.apiV2.getSalesReportV2 !== 'function') { console.error("apiV2 not loaded."); displayError(new Error("Report API failed to load.")); return; }

    try {
        console.log("[Core V3] Fetching Report V2 data...");
        const apiData = await window.apiV2.getSalesReportV2(state.currentUser.id, null, null);

        if (!apiData || typeof apiData !== 'object' || !apiData.core_metrics) { 
            console.error("[Core V3] Invalid data received from API:", apiData);
            throw new Error("API V3 did not return valid core data."); 
        }
        
        console.log("[Core V3] Report V2 Data Received:", apiData); 
        state.apiData = apiData; 
        
        // --- Workflow ---
        // 1. Create Marketing Input table structure (determines months to use)
        createMarketingInputTable();

        // 2. Trigger the first calculation and render cycle.
        // This reads initial marketing inputs (zeros), merges with API data,
        // renders the financial table (including suggested revenue), updates totals,
        // renders funnel, KPIs, and populates planner defaults.
        recalculateAndUpdateReport(); // This is the main function now

        // 3. Render Team Performance (uses data directly from API)
        renderTeamPerformance(apiData.team_breakdown || []);
        
        // 4. Render Recommendations (static)
        renderRecommendations();

    } catch (error) {
        console.error("[Core V3] Failed to load or render report V2 data:", error);
        displayError(error); 
    }
}

// -- INITIALIZATION --
async function initializeApp() {
     // Wait for Supabase client
     await new Promise(resolve => { /* ... wait logic ... */ });
     if (!window.supabaseClient) { /* ... error handling ... */ return; }

     // Get user session
     const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();
     if (sessionError) { /* ... error handling ... */ return; }
     
     const user = session?.user;
     if (user) {
         state.currentUser = user;
         console.log("User session found:", user.id);
         fetchAndRenderReport(); // Start the process
     } else {
         console.error("User not logged in.");
         displayError(new Error("User authentication failed."));
     }
}
document.addEventListener('DOMContentLoaded', initializeApp);


// ================================================================================
// SCENARIO PLANNER LOGIC (SECTION 7) - Mostly Unchanged Functionality
// ================================================================================
window.plannerBase = { /* ... default base values ... */ };
// References to Planner elements (ensure these IDs match HTML)
const targetEl = document.getElementById('target');
const inboxesEl = document.getElementById('inboxes'); // Updated by updateFinancialTotals
const inboxToLeadEl = document.getElementById('inboxToLead'); // Updated by updateFinancialTotals
const leadToSaleEl = document.getElementById('leadToSale'); // User input
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
    const inboxToLead = Number(inboxToLeadEl?.value) || 0; // Gets value updated by updateFinancialTotals
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
        // Target conversion needed based on CURRENT inbox number in planner
        const targetConversion = (inboxes > 0) ? (neededLeads * 100) / inboxes : 0; 
        
        insight = `ยังขาด <span class="planner-highlight">${formatCurrency(missing)}</span> (ประมาณ <span class="planner-highlight">${neededSales}</span> เคส)<br>
        ต้องเพิ่ม Inbox→Lead เป็น <span class="planner-highlight">${targetConversion.toFixed(1)}%</span> หรือเพิ่ม <span class="planner-highlight">${neededLeads}</span> Leads`;
    }
    if (insightEl) insightEl.innerHTML = insight;
}

// --- Event Listeners for Planner (Section 7) ---
// Only add listeners for USER-editable fields in the planner itself

// When user changes Lead->Sale % in Planner
if (leadToSaleEl) {
     leadToSaleEl.addEventListener('input', () => {
          // Basic validation
          if (parseFloat(leadToSaleEl.value) < 0) leadToSaleEl.value = 0;
          if (leadToSaleEl.validity.valid || leadToSaleEl.value === '') {
                leadToSaleEl.style.outline = '';
                calcPlanner(); // Recalculate planner forecast
                // Also update the note which shows estimated sales
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
               calcPlanner(); 
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
                calcPlanner(); 
           } else {
                targetEl.style.outline = '2px solid red';
           }
     });
}
// Note: Inboxes and Inbox->Lead % slider are updated *by* updateFinancialTotals,
//       but the slider change itself still needs to trigger calcPlanner if user adjusts it manually.
if (inboxToLeadEl && inboxToLeadValue) {
    inboxToLeadEl.addEventListener('input', () => {
        inboxToLeadValue.textContent = `${inboxToLeadEl.value}%`;
        // When user manually adjusts slider, recalculate planner,
        // but DON'T trigger updateFinancialTotals to avoid loops.
        calcPlanner(); 
    });
}


// Reset button logic
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        console.log("Reset button clicked.");
        // Use base values stored in window.plannerBase (from API)
        const base = window.plannerBase || {}; 
        
        // Reset Planner user-editable inputs to base values
        if (targetEl) targetEl.value = base.target || 6500000;
        if (leadToSaleEl) leadToSaleEl.value = (base.leadToSale_percent || 0).toFixed(1); 
        if (ticketEl) ticketEl.value = base.avg_ticket_size || 0;
        
        // Reset Marketing Inputs to defaults (zeros)
        const marketingInputsBody = document.getElementById('marketing-input-body');
        marketingInputsBody?.querySelectorAll('input.input-marketing').forEach(input => {
             input.value = 0; // Reset to zero
             input.style.outline = ''; // Clear error state
        });
        
        // Reset Financial Table inputs to defaults (zeros for Lead/Revenue, keep budget/inbox at 0)
        // Or better: Re-trigger the whole process which will use 0 budget/inbox and API leads/revenue
        // Clear calculated data and re-run main function
         state.calculatedFinancialData = []; 
         // Clear API data to force re-fetch or re-process? Maybe not needed if recalculate works.
         // Let's just trigger recalculate with the reset inputs:
         console.log("Triggering recalculate after reset.");
         recalculateAndUpdateReport(); 
    });
}

// Initial calculation is triggered via fetchAndRenderReport -> recalculateAndUpdateReport chain.

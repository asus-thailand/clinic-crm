// ================================================================================
// Sales Performance Dashboard - Main Script (FINAL VERSION 100%)
// This version includes full interactivity, robust error handling, and charting.
// ================================================================================

// -- GLOBAL STATE --
// Stores the current state of the dashboard
const state = {
    currentUser: null,
    startDate: null,
    endDate: null,
    activePreset: 'all' // Can be '7d', '30d', 'all', or 'custom'
};

// -- CHART INSTANCES --
// Holds the chart instance to allow for proper destruction and recreation
let revenueByChannelChart = null;

// -- HELPER FUNCTIONS --

/**
 * Formats a number to include commas as thousands separators.
 * @param {number | string} num The number to format.
 * @returns {string} The formatted number string.
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    return numValue.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

/**
 * Shows or hides a loading overlay effect on the report content.
 * @param {boolean} isLoading True to show loading, false to hide.
 */
function showLoading(isLoading) {
    const reportContent = document.getElementById('report-content');
    if (reportContent) {
        reportContent.style.opacity = isLoading ? '0.3' : '1';
        reportContent.style.pointerEvents = isLoading ? 'none' : 'auto';
    }
}

/**
 * Displays a user-friendly error message on the screen.
 * @param {Error} error The error object to display.
 */
function displayError(error) {
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
        mainContainer.innerHTML = `<div style="text-align: center; padding: 40px; background: #fff; margin: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"><h2 style="color: #dc3545;">เกิดข้อผิดพลาด</h2><p>${error.message}</p></div>`;
    }
}

/**
 * Formats a Date object into a 'YYYY-MM-DD' string for date input fields.
 * @param {Date} date The date object.
 * @returns {string} The formatted date string.
 */
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// -- CORE LOGIC --

/**
 * The main function to fetch data from the API based on the current state
 * and then trigger the rendering process.
 */
async function fetchAndRenderReport() {
    if (!state.currentUser) {
        console.error("No user found. Aborting fetch.");
        return;
    }
    
    console.log(`Fetching report from ${state.startDate || 'beginning'} to ${state.endDate || 'end'}`);
    showLoading(true);

    try {
        const reportData = await api.getSalesReport(state.currentUser.id, state.startDate, state.endDate);
        if (!reportData) {
            throw new Error("API did not return any data.");
        }
        renderReport(reportData);
    } catch (error) {
        console.error("Failed to load report data:", error);
        displayError(error);
    } finally {
        showLoading(false);
    }
}

// -- UI EVENT LISTENERS & STATE MANAGEMENT --

/**
 * Sets up all the event listeners for the interactive elements on the page.
 */
function setupEventListeners() {
    // Preset buttons (7d, 30d, all)
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(button => {
        button.addEventListener('click', () => {
            const preset = button.dataset.preset;
            updateDateFilter(preset);
            fetchAndRenderReport(); // Fetch data immediately on preset click
        });
    });

    // Custom date range "Apply" button
    document.getElementById('applyFilterBtn').addEventListener('click', () => {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        
        if (start && end && start > end) {
            alert('วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด');
            return;
        }
        updateDateFilter('custom', start, end);
        fetchAndRenderReport();
    });
}

/**
 * Updates the global state based on the selected date filter.
 * @param {string} preset The selected preset ('7d', '30d', 'all', 'custom').
 * @param {string|null} customStart The custom start date string.
 * @param {string|null} customEnd The custom end date string.
 */
function updateDateFilter(preset, customStart = null, customEnd = null) {
    state.activePreset = preset;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch (preset) {
        case '7d':
            startDate.setDate(today.getDate() - 6);
            state.startDate = formatDateForInput(startDate);
            state.endDate = formatDateForInput(today);
            break;
        case '30d':
            startDate.setDate(today.getDate() - 29);
            state.startDate = formatDateForInput(startDate);
            state.endDate = formatDateForInput(today);
            break;
        case 'custom':
            state.startDate = customStart || null;
            state.endDate = customEnd || null;
            break;
        case 'all':
        default:
            state.startDate = null;
            state.endDate = null;
            break;
    }
    updateActiveButtonUI();
}

/**
 * Updates the visual style of the filter buttons to show which one is active.
 */
function updateActiveButtonUI() {
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === state.activePreset);
    });
    if (state.activePreset !== 'custom') {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
    }
}

// -- RENDERING FUNCTIONS --

/**
 * Main rendering function that calls all other specific renderers.
 * @param {object} reportData The full data object from the API.
 */
function renderReport(reportData) {
    renderKPIs(reportData.kpis || []);
    renderRevenueByChannel(reportData.revenue_by_channel || []);
    renderSalesLeaderboard(reportData.sales_performance || []);
}

/**
 * Renders the four main KPI stat cards.
 * @param {Array} kpis An array containing the KPI data object.
 */
function renderKPIs(kpis) {
    const data = (kpis && kpis.length > 0) ? kpis[0] : { total_revenue: 0, total_deals: 0, avg_deal_size: 0, avg_sales_cycle: null };
    document.getElementById('totalRevenue').textContent = formatNumber(parseFloat(data.total_revenue).toFixed(0));
    document.getElementById('totalDeals').textContent = formatNumber(data.total_deals);
    document.getElementById('avgDealSize').textContent = formatNumber(parseFloat(data.avg_deal_size).toFixed(0));
    document.getElementById('avgSalesCycle').textContent = data.avg_sales_cycle ? parseFloat(data.avg_sales_cycle).toFixed(1) : 'N/A';
}

/**
 * Renders the "Revenue by Channel" as a horizontal bar chart.
 * @param {Array} channelData The data for revenue by channel.
 */
function renderRevenueByChannel(channelData) {
    const ctx = document.getElementById('revenueByChannelChart').getContext('2d');
    
    // Destroy the previous chart instance if it exists to prevent memory leaks
    if (revenueByChannelChart) {
        revenueByChannelChart.destroy();
    }

    if (!channelData || channelData.length === 0) {
        return; // Exit if there's no data to display
    }

    const labels = channelData.map(d => d.channel);
    const data = channelData.map(d => d.total_revenue);

    revenueByChannelChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'ยอดขายรวม',
                data: data,
                backgroundColor: 'rgba(150, 1, 26, 0.6)',
                borderColor: 'rgba(150, 1, 26, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Makes the bar chart horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Renders the Sales Leaderboard table.
 * @param {Array} salesData The performance data for each salesperson.
 */
function renderSalesLeaderboard(salesData) {
    const tbody = document.getElementById('salesLeaderboardBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!salesData || salesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">ไม่มีข้อมูล</td></tr>';
        return;
    }
    
    salesData.sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue));

    salesData.forEach(sales => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sales.sales_name || 'ไม่ระบุ'}</td>
            <td>${formatNumber(parseFloat(sales.total_revenue).toFixed(0))}</td>
            <td>${formatNumber(sales.closed_deals)}</td>
            <td>${parseFloat(sales.conversion_rate).toFixed(2)}%</td>
        `;
        tbody.appendChild(tr);
    });
}

// -- INITIALIZATION --

/**
 * Initializes the entire application.
 */
async function initializeApp() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (user) {
        state.currentUser = user;
        setupEventListeners();
        // Perform the initial data fetch for the "all" time range
        updateDateFilter('all');
        fetchAndRenderReport();
    } else {
        // This case is handled by the auth guard in report.html, but is here as a fallback.
        displayError(new Error("ไม่พบข้อมูลผู้ใช้, กรุณาล็อกอินใหม่อีกครั้ง"));
    }
}

// Start the application once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

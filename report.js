// ================================================================================
// Sales Performance Dashboard - Main Script (V2 with Interactivity)
// ================================================================================

// -- GLOBAL STATE --
const state = {
    currentUser: null,
    startDate: null,
    endDate: null,
    activePreset: 'all' // '7d', '30d', 'all', 'custom'
};

// -- CHART INSTANCES --
let revenueByChannelChart = null;

// -- HELPERS --
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    return numValue.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

function showLoading(isLoading) {
    const reportContent = document.getElementById('report-content');
    if (reportContent) {
        reportContent.style.opacity = isLoading ? '0.3' : '1';
        reportContent.style.pointerEvents = isLoading ? 'none' : 'auto';
    }
}

function displayError(error) {
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
        mainContainer.innerHTML = `<div style="text-align: center; padding: 40px; background: #fff; margin: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"><h2 style="color: #dc3545;">เกิดข้อผิดพลาด</h2><p>${error.message}</p></div>`;
    }
}

// Format date to YYYY-MM-DD for input fields
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// -- CORE LOGIC --

/**
 * Main function to fetch and render all report data based on the current state
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

// -- UI UPDATE & EVENT LISTENERS --

function setupEventListeners() {
    // Preset buttons (7d, 30d, all)
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(button => {
        button.addEventListener('click', () => {
            const preset = button.dataset.preset;
            updateDateFilter(preset);
            fetchAndRenderReport(); // Fetch data immediately on preset click
        });
    });

    // Custom date apply button
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

function updateDateFilter(preset, customStart = null, customEnd = null) {
    state.activePreset = preset;
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of day
    
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Set to start of day

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

function updateActiveButtonUI() {
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === state.activePreset);
    });
    // If a preset is chosen, clear the custom date inputs for clarity
    if (state.activePreset !== 'custom') {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
    }
}


// -- RENDERING FUNCTIONS --

function renderReport(reportData) {
    renderKPIs(reportData.kpis || []);
    renderRevenueByChannel(reportData.revenue_by_channel || []);
    renderSalesLeaderboard(reportData.sales_performance || []);
}

function renderKPIs(kpis) {
    const data = (kpis && kpis.length > 0) ? kpis[0] : { total_revenue: 0, total_deals: 0, avg_deal_size: 0, avg_sales_cycle: null };
    document.getElementById('totalRevenue').textContent = formatNumber(parseFloat(data.total_revenue).toFixed(0));
    document.getElementById('totalDeals').textContent = formatNumber(data.total_deals);
    document.getElementById('avgDealSize').textContent = formatNumber(parseFloat(data.avg_deal_size).toFixed(0));
    document.getElementById('avgSalesCycle').textContent = data.avg_sales_cycle ? parseFloat(data.avg_sales_cycle).toFixed(1) : 'N/A';
}

function renderRevenueByChannel(channelData) {
    const ctx = document.getElementById('revenueByChannelChart').getContext('2d');
    
    // Destroy previous chart instance if it exists
    if (revenueByChannelChart) {
        revenueByChannelChart.destroy();
    }

    if (!channelData || channelData.length === 0) {
        // You can display a message here if you want
        return;
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
            indexAxis: 'y', // Make it a horizontal bar chart
            responsive: true,
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
async function initializeApp() {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (user) {
        state.currentUser = user;
        setupEventListeners();
        // Initial fetch for "all" data
        updateDateFilter('all');
        fetchAndRenderReport();
    } else {
        displayError(new Error("ไม่พบข้อมูลผู้ใช้, กรุณาล็อกอินใหม่อีกครั้ง"));
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

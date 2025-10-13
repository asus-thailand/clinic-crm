// ================================================================================
// BEAUTY CLINIC CRM - REPORTING LOGIC
// ================================================================================

// ฟังก์ชันสำหรับแปลงตัวเลขเป็นสกุลเงิน
function formatCurrency(value) {
    if (typeof value !== 'number') return 'N/A';
    return '฿' + value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ฟังก์ชันสำหรับแสดงผล KPI หลัก
function renderKPIs(data) {
    document.getElementById('totalRevenue').textContent = formatCurrency(data.total_revenue || 0);
    document.getElementById('totalDeals').textContent = (data.total_deals || 0).toLocaleString();
    document.getElementById('avgDealSize').textContent = formatCurrency(data.avg_deal_size || 0);
    document.getElementById('avgSalesCycle').textContent = `${(data.avg_sales_cycle || 0).toFixed(1)} วัน`;
}

// ฟังก์ชันสำหรับวาดกราฟ "ยอดขายตามช่องทาง"
function renderRevenueByChannelChart(data) {
    const ctx = document.getElementById('revenueByChannelChart').getContext('2d');
    const labels = data.map(item => item.channel || 'ไม่ระบุ');
    const values = data.map(item => item.total_revenue);

    new Chart(ctx, {
        type: 'bar', // หรือ 'pie', 'doughnut'
        data: {
            labels: labels,
            datasets: [{
                label: 'ยอดขาย',
                data: values,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.7)',
                    'rgba(118, 75, 162, 0.7)',
                    'rgba(72, 187, 120, 0.7)',
                    'rgba(245, 101, 101, 0.7)',
                    'rgba(255, 193, 7, 0.7)',
                ],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'ยอดขายรวมตามช่องทางที่ลูกค้าเข้ามา'
                }
            }
        }
    });
}

// ฟังก์ชันสำหรับสร้างตารางสรุปประสิทธิภาพเซลล์
function renderSalesLeaderboard(data) {
    const tbody = document.getElementById('salesLeaderboardBody');
    if (!tbody) return;

    // เรียงลำดับตามยอดขาย
    data.sort((a, b) => b.total_revenue - a.total_revenue);

    tbody.innerHTML = data.map(sales => `
        <tr>
            <td>${sales.sales_name || 'ไม่ระบุ'}</td>
            <td>${formatCurrency(sales.total_revenue)}</td>
            <td>${sales.closed_deals.toLocaleString()}</td>
            <td>${sales.conversion_rate.toFixed(2)}%</td>
        </tr>
    `).join('');
}


// ฟังก์ชันหลักที่ทำงานเมื่อเปิดหน้า
async function initializeReport() {
    try {
        // ดึงข้อมูลสรุปทั้งหมดจาก API
        const reportData = await window.api.getSalesReport();
        
        if (reportData) {
            renderKPIs(reportData.kpis[0]);
            renderRevenueByChannelChart(reportData.revenue_by_channel);
            renderSalesLeaderboard(reportData.sales_performance);
        }

    } catch (error) {
        console.error("Failed to load report data:", error);
        alert("ไม่สามารถโหลดข้อมูลรายงานได้: " + error.message);
    }
}

// เริ่มทำงานเมื่อโหลดหน้าเสร็จ
document.addEventListener('DOMContentLoaded', initializeReport);
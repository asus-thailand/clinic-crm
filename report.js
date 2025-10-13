// ================================================================================
// Sales Performance Report - Main Script (FIXED & ENHANCED)
// ================================================================================

// -- GLOBAL STATE & HELPERS --

// ฟังก์ชันสำหรับใส่ Commas ในตัวเลข (เช่น 1000 -> 1,000)
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

// ฟังก์ชันสำหรับแสดง/ซ่อนหน้าต่าง Loading
function showLoading(isLoading) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    }
}


// -- INITIALIZATION --

/**
 * ฟังก์ชันหลักในการเริ่มต้นโหลดและแสดงผลรายงาน
 * [MODIFIED] แก้ไขให้ดึง User ID ปัจจุบันแล้วส่งไปพร้อมกับคำขอ
 */
async function initializeReport() {
    console.log("Initializing sales report...");
    showLoading(true);
    const reportContainer = document.getElementById('reportContainer');

    try {
        // 1. ดึงข้อมูล user ที่ล็อกอินอยู่ปัจจุบันจาก Supabase
        const { data: { user } } = await window.supabaseClient.auth.getUser();

        // 2. ตรวจสอบว่ามี user หรือไม่ ถ้าไม่มีให้หยุดทำงานและแสดงข้อความ
        if (!user) {
            throw new Error("ไม่พบข้อมูลผู้ใช้, กรุณาล็อกอินใหม่");
        }

        console.log("Fetching report data for user:", user.id);
        
        // 3. เรียกใช้ api.getSalesReport พร้อมส่ง user.id เข้าไปด้วย
        const reportData = await api.getSalesReport(user.id);
        
        console.log("Report data received:", reportData);

        // 4. นำข้อมูลที่ได้ไปสร้างเป็นกราฟและตาราง
        renderReport(reportData);

    } catch (error) {
        console.error("Failed to load report data:", error);
        // แสดงข้อความ Error ให้ผู้ใช้เห็นในหน้าเว็บ
        if(reportContainer) {
            reportContainer.innerHTML = `<div class="error-message">
                <h3>ไม่สามารถโหลดข้อมูลรายงานได้</h3>
                <p>${error.message}</p>
            </div>`;
        }
    } finally {
        showLoading(false);
    }
}


// -- RENDERING FUNCTIONS --

/**
 * ฟังก์ชันหลักในการนำข้อมูลมาสร้าง UI ทั้งหมด
 * @param {object} reportData - ข้อมูลที่ได้มาจาก API
 */
function renderReport(reportData) {
    if (!reportData) {
        console.error("No data available to render report.");
        return;
    }

    // Render ส่วนต่างๆ ของรายงาน
    renderKPIs(reportData.kpis);
    renderRevenueByChannel(reportData.revenue_by_channel);
    renderSalesLeaderboard(reportData.sales_performance);
}

/**
 * สร้างการ์ดแสดงผล KPI หลัก
 * @param {Array} kpis - ข้อมูล KPI
 */
function renderKPIs(kpis) {
    const data = kpis ? kpis[0] : {}; // ใช้ข้อมูล object แรกใน array

    const totalRevenue = data.total_revenue ? parseFloat(data.total_revenue) : 0;
    const totalDeals = data.total_deals ? parseInt(data.total_deals) : 0;
    const avgDealSize = data.avg_deal_size ? parseFloat(data.avg_deal_size) : 0;
    const avgSalesCycle = data.avg_sales_cycle ? parseFloat(data.avg_sales_cycle).toFixed(1) : 'N/A';

    document.getElementById('totalRevenue').textContent = formatNumber(totalRevenue.toFixed(0));
    document.getElementById('totalDeals').textContent = formatNumber(totalDeals);
    document.getElementById('avgDealSize').textContent = formatNumber(avgDealSize.toFixed(0));
    document.getElementById('avgSalesCycle').textContent = avgSalesCycle;
}

/**
 * สร้างกราฟ (หรือตาราง) แสดงยอดขายตามช่องทาง
 * @param {Array} channelData - ข้อมูลยอดขายตามช่องทาง
 */
function renderRevenueByChannel(channelData) {
    const container = document.getElementById('revenueByChannelChart');
    if (!container) return;

    if (!channelData || channelData.length === 0) {
        container.innerHTML = "<p>ไม่มีข้อมูลยอดขายตามช่องทาง</p>";
        return;
    }

    // สร้างเป็นตารางแทนกราฟเพื่อความเรียบง่าย
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ช่องทาง (Channel)</th>
                    <th>ยอดขายรวม (Total Revenue)</th>
                </tr>
            </thead>
            <tbody>
    `;

    channelData.forEach(item => {
        tableHTML += `
            <tr>
                <td>${item.channel || 'ไม่ระบุ'}</td>
                <td>${formatNumber(parseFloat(item.total_revenue).toFixed(0))}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;
    container.innerHTML = tableHTML;
}

/**
 * สร้างตารางสรุปประสิทธิภาพของเซลล์ (Leaderboard)
 * @param {Array} salesData - ข้อมูลประสิทธิภาพของเซลล์
 */
function renderSalesLeaderboard(salesData) {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    tbody.innerHTML = ''; // ล้างข้อมูลเก่า

    if (!salesData || salesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">ไม่มีข้อมูลประสิทธิภาพของเซลล์</td></tr>';
        return;
    }
    
    // เรียงข้อมูลตามยอดขายจากมากไปน้อย
    salesData.sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue));

    salesData.forEach(sales => {
        const conversionRate = sales.conversion_rate ? parseFloat(sales.conversion_rate).toFixed(2) : '0.00';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sales.sales_name || 'ไม่ระบุ'}</td>
            <td>${formatNumber(parseFloat(sales.total_revenue).toFixed(0))}</td>
            <td>${formatNumber(sales.closed_deals)}</td>
            <td>${conversionRate}%</td>
        `;
        tbody.appendChild(tr);
    });
}


// -- EVENT LISTENERS --

// เมื่อหน้าเว็บโหลดเสร็จ ให้เริ่มทำงานทันที
document.addEventListener('DOMContentLoaded', initializeReport);

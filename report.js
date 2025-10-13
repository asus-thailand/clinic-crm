// ================================================================================
// Sales Performance Report - Main Script (VERSION 100% FIXED)
// ================================================================================

// -- GLOBAL HELPERS --

/**
 * ฟังก์ชันสำหรับใส่ Commas ในตัวเลข (เช่น 1000 -> 1,000)
 * @param {number | string} num - ตัวเลขที่ต้องการจัดรูปแบบ
 * @returns {string} ตัวเลขที่จัดรูปแบบแล้ว
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    // [FIX] ทำให้รองรับทั้ง number และ string ที่เป็นตัวเลข
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    return numValue.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

/**
 * ฟังก์ชันสำหรับแสดง/ซ่อนหน้าต่าง Loading
 * @param {boolean} isLoading - true เพื่อแสดง, false เพื่อซ่อน
 */
function showLoading(isLoading) {
    let loadingOverlay = document.getElementById('loadingOverlay');
    // [FIX] สร้าง Loading Overlay ขึ้นมาเองหากไม่มีใน HTML เพื่อป้องกัน Error
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.85);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; color: #333; font-size: 1.2em;
        `;
        loadingOverlay.innerHTML = '<div><p>กำลังโหลดข้อมูล...</p></div>';
        document.body.appendChild(loadingOverlay);
    }
    loadingOverlay.style.display = isLoading ? 'flex' : 'none';
}

/**
 * แสดงข้อความ Error ที่สวยงามและเข้าใจง่ายบนหน้าจอ
 * @param {Error} error - Object ของ Error
 */
function displayError(error) {
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
        mainContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #fff; margin: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <h2 style="color: #dc3545; margin-bottom: 15px;">เกิดข้อผิดพลาด</h2>
                <p style="color: #333; margin-bottom: 10px;">ไม่สามารถโหลดข้อมูลรายงานได้</p>
                <code style="background: #f1f1f1; padding: 10px; border-radius: 6px; display: block; white-space: pre-wrap; text-align: left;">${error.message}</code>
            </div>`;
    }
}


// -- INITIALIZATION --

/**
 * ฟังก์ชันหลักในการเริ่มต้นโหลดและแสดงผลรายงาน
 */
async function initializeReport() {
    console.log("Initializing sales report...");
    showLoading(true);

    try {
        // 1. ดึงข้อมูล user ที่ล็อกอินอยู่ปัจจุบันจาก Supabase
        const { data: { user } } = await window.supabaseClient.auth.getUser();

        if (!user) {
            throw new Error("ไม่พบข้อมูลผู้ใช้, กรุณาล็อกอินใหม่อีกครั้ง");
        }
        console.log("Fetching report data for user:", user.id);
        
        // 2. เรียกใช้ api.getSalesReport พร้อมส่ง user.id
        const reportData = await api.getSalesReport(user.id);
        console.log("Report data received:", reportData);

        // 3. ตรวจสอบข้อมูลที่ได้รับ
        if (!reportData) {
            throw new Error("API ส่งข้อมูลกลับมาเป็นค่าว่าง (null). อาจเป็นเพราะยังไม่มีข้อมูลการขายในระบบ");
        }

        // 4. นำข้อมูลที่ได้ไปสร้าง UI
        renderReport(reportData);

    } catch (error) {
        console.error("Failed to load report data:", error);
        displayError(error);
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
    // Render ส่วนต่างๆ ของรายงาน (ใช้ || [] เพื่อป้องกัน error หาก property ไม่มีอยู่)
    renderKPIs(reportData.kpis || []);
    renderRevenueByChannel(reportData.revenue_by_channel || []);
    renderSalesLeaderboard(reportData.sales_performance || []);
}

/**
 * สร้างการ์ดแสดงผล KPI หลัก
 * @param {Array} kpis - ข้อมูล KPI
 */
function renderKPIs(kpis) {
    // [FIX 100%] ทำให้รองรับกรณีที่ไม่มีข้อมูลส่งมาอย่างสมบูรณ์
    const data = (kpis && kpis.length > 0 && kpis[0]) ? kpis[0] : {
        total_revenue: 0,
        total_deals: 0,
        avg_deal_size: 0,
        avg_sales_cycle: null // ตั้งเป็น null เพื่อให้แสดง 'N/A'
    };

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
 * สร้างตารางแสดงยอดขายตามช่องทาง
 * @param {Array} channelData - ข้อมูลยอดขายตามช่องทาง
 */
function renderRevenueByChannel(channelData) {
    const canvas = document.getElementById('revenueByChannelChart');
    if (!canvas) return;
    
    // [FIX] ใน HTML เป็น Canvas แต่โค้ดเก่าสร้าง Table, เราจะเปลี่ยนเป็นสร้าง Table ใน div ที่มาแทนที่ Canvas
    const container = canvas.parentElement; // เอา container ที่หุ้ม canvas อยู่
    container.innerHTML = ''; // ล้าง Canvas ทิ้ง

    if (!channelData || channelData.length === 0) {
        container.innerHTML = "<p style='text-align: center; color: #6c757d;'>ไม่มีข้อมูลยอดขายตามช่องทาง</p>";
        return;
    }

    // สร้างตารางด้วย DOM Manipulation เพื่อความปลอดภัยและประสิทธิภาพ
    const table = document.createElement('table');
    table.className = 'excel-table'; // ใช้ class เดิมเพื่อให้ได้ style เดียวกัน
    table.style.minWidth = '100%';

    table.innerHTML = `
        <thead>
            <tr>
                <th>ช่องทาง (Channel)</th>
                <th>ยอดขายรวม (Total Revenue)</th>
            </tr>
        </thead>
    `;
    
    const tbody = document.createElement('tbody');
    channelData.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.channel || 'ไม่ระบุ'}</td>
            <td>${formatNumber(parseFloat(item.total_revenue).toFixed(0))}</td>
        `;
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

/**
 * สร้างตารางสรุปประสิทธิภาพของเซลล์ (Leaderboard)
 * @param {Array} salesData - ข้อมูลประสิทธิภาพของเซลล์
 */
function renderSalesLeaderboard(salesData) {
    // [FIX 100%] แก้ไข ID ให้ตรงกับในไฟล์ report.html
    const tbody = document.getElementById('salesLeaderboardBody');
    if (!tbody) {
        console.error("Element with ID 'salesLeaderboardBody' not found!");
        return;
    }

    tbody.innerHTML = ''; // ล้างข้อมูลเก่า

    if (!salesData || salesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #6c757d;">ไม่มีข้อมูลประสิทธิภาพของเซลล์</td></tr>';
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

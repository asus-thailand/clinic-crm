// --- การเชื่อมต่อ Supabase และระบบป้องกัน ---
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co'; // ❗ วาง URL ของคุณที่นี่
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM'; // ❗ วาง Anon Key ของคุณที่นี่

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    alert('กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_ANON_KEY ในไฟล์ script.js ก่อน');
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUserRole = 'sales'; // กำหนดค่าเริ่มต้น
let tableData = []; // ❗ ข้อมูลจะถูกดึงมาจาก Supabase ไม่ใช่ค่าที่ตายตัวอีกต่อไป

// --- ฟังก์ชันหลักในการเริ่มต้นแอป ---
async function initializeApp() {
    // 1. ตรวจสอบว่าล็อกอินหรือยัง และดึง Role
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    const userId = session.user.id;
    const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (userError) {
        console.error('Error fetching user role:', userError);
        currentUserRole = 'sales'; // fallback role
    } else {
        currentUserRole = userData.role;
    }

    // 2. อัปเดต UI ตามสิทธิ์
    updateUIByRole();
    
    // 3. ดึงข้อมูลลูกค้าจาก Supabase
    await fetchCustomerData();
}

// --- ฟังก์ชันใหม่: ดึงข้อมูลลูกค้า ---
async function fetchCustomerData() {
    // RLS ของ Supabase จะกรองข้อมูลให้เราโดยอัตโนมัติตาม Role
    const { data, error } = await supabaseClient
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false }); // เรียงจากใหม่ไปเก่า

    if (error) {
        console.error('Error fetching customers:', error);
        showStatus('ดึงข้อมูลไม่สำเร็จ', true);
    } else {
        tableData = data;
        renderTable(); // แสดงผลข้อมูลที่ดึงมา
    }
}

// --- ฟังก์ชันที่อัปเดตแล้ว ---
function updateUIByRole() {
    const userBadge = document.querySelector('.user-badge');
    const addUserButton = document.getElementById('addUserButton');
    const deleteRowMenuItem = document.getElementById('deleteRowMenuItem');

    addUserButton.style.display = 'none';
    deleteRowMenuItem.style.display = 'none';

    let permissions = {
        'administrator': { badge: 'Administrator', canAdd: true, canDelete: true },
        'admin': { badge: 'Admin', canAdd: true, canDelete: false },
        'sales': { badge: 'Sales', canAdd: true, canDelete: false }
    };

    let currentPermission = permissions[currentUserRole];
    
    if (currentPermission) {
        userBadge.textContent = currentPermission.badge;
        userBadge.style.backgroundColor = currentUserRole === 'administrator' ? '#dc3545' : (currentUserRole === 'admin' ? '#007bff' : '#28a745');
        if (currentPermission.canAdd) addUserButton.style.display = 'inline-block';
        if (currentPermission.canDelete) deleteRowMenuItem.style.display = 'block';
    }
}

function startEdit(cell, rowIndex, field) {
    // กฎ: Sales ห้ามแก้ไขคอลัมน์ 'sales'
    if (currentUserRole === 'sales' && field === 'sales') {
        showStatus('คุณไม่มีสิทธิ์แก้ไขเซลล์นี้', true);
        return;
    }
    // (โค้ดส่วนที่เหลือเหมือนเดิม)
    // ...
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}


// (ฟังก์ชันอื่นๆ ส่วนใหญ่ยังคงเหมือนเดิม แต่จะทำงานกับข้อมูลที่มาจาก Supabase)
// ... renderTable, finishEdit, updateStats, addNewRow, searchTable, etc. ...
// --- Initialize App ---
initializeApp();

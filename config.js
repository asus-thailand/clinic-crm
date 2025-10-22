// ================================================================================
// BEAUTY CLINIC CRM - CONFIGURATION FILE
// ================================================================================
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// ตรวจสอบว่า window.supabase โหลดมาหรือยัง
if (window.supabase && window.supabase.createClient) {
    // สร้าง Supabase Client
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // ทำให้ใช้ได้ทั่วทั้งโปรเจกต์
    window.supabaseClient = supabase;
    // เพิ่ม Log เพื่อยืนยันว่า Client ถูกสร้างสำเร็จ และ Key ถูกต้อง
    console.log("Supabase client initialized successfully.");
    console.log("Supabase URL:", window.supabaseClient.supabaseUrl);
    console.log("Supabase Key:", window.supabaseClient.supabaseKey); // แสดง Key ใน Console (ปลอดภัย ถ้า Console ไม่ได้เปิดให้คนอื่นดู)
} else {
    console.error("Supabase library (supabase-js) not loaded BEFORE config.js");
    // แสดงข้อความเตือนบนหน้าจอ
    alert("CRITICAL ERROR: Supabase library failed to load correctly. Please check script order in HTML or network connection.");
}

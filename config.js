// ================================================================================
// BEAUTY CLINIC CRM - CONFIGURATION FILE
// ================================================================================

/**
 * 🚨🚨🚨 SECURITY WARNING 🚨🚨🚨
 * SUPABASE_ANON_KEY เป็นคีย์สาธารณะ (Public/Anonymous Key) ที่ต้องเปิดเผยใน Client-side.
 * ความปลอดภัยของข้อมูลทั้งหมด "ขึ้นอยู่กับ" การตั้งค่า
 * **Row-Level Security (RLS)** ในฐานข้อมูล Supabase ของคุณเท่านั้น.
 * โปรดตรวจสอบให้มั่นใจว่า RLS ถูกเปิดใช้งานและมีการกำหนด Policy อย่างรัดกุม 100% 
 * สำหรับตารางทั้งหมด (โดยเฉพาะ 'customers' และ 'users').
 */
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// สร้าง Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ทำให้ใช้ได้ทั่วทั้งโปรเจกต์
window.supabaseClient = supabase;

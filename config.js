// ================================================================================
// BEAUTY CLINIC CRM - CONFIGURATION FILE (FINAL FIX)
// ================================================================================

const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// 🔴 FIX: แก้ไขจุดนี้ให้ถูกต้อง
// เราต้องใช้ `window.supabase` ซึ่งเป็น Library หลักที่โหลดมาจาก CDN
// เพื่อสร้าง Client ของเราขึ้นมาใหม่
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

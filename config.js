// ================================================================================
// BEAUTY CLINIC CRM - CONFIGURATION FILE
// ================================================================================

const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW8-71ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// 🔴 FIX: แก้ไขบรรทัดนี้
// ใช้ `window.supabase` เพื่ออ้างอิงถึง Library ที่โหลดมาจาก CDN
// ไม่ใช่การสร้างตัวแปรชื่อซ้ำกับตัวเอง
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

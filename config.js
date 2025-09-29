// ================================================================================
// BEAUTY CLINIC CRM - CONFIGURATION FILE
// ไฟล์นี้ทำหน้าที่เก็บการตั้งค่าหลักของโปรเจกต์
// แก้ไข API Keys ที่นี่เพียงที่เดียว
// ================================================================================

const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// สร้าง Supabase client และ export เพื่อให้ไฟล์อื่นสามารถ import ไปใช้งานได้
// ทำให้มั่นใจว่าทั้งแอปพลิเคชันจะใช้ client instance ตัวเดียวกันเสมอ
export const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

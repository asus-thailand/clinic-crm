📂 Clinic-CRM: Excel Edition
📝 ภาพรวมโปรเจกต์ (Project Overview)
     Clinic-CRM เป็นระบบบริหารจัดการความสัมพันธ์ลูกค้า (Customer Relationship Management) ที่ออกแบบมาสำหรับคลินิกความงามโดยเฉพาะ จุดเด่นคือหน้าตาและการใช้งานที่ คล้ายคลึงกับโปรแกรม Excel ทำให้ผู้ใช้คุ้นเคยและเรียนรู้การใช้งานได้อย่างรวดเร็ว
     ระบบนี้สร้างขึ้นด้วยเทคโนโลยี Frontend พื้นฐาน (HTML, CSS, JavaScript) และใช้ Supabase เป็น Backend-as-a-Service (BaaS) สำหรับจัดการฐานข้อมูล (PostgreSQL), การยืนยันตัวตน (Authentication), และการเรียกใช้ฟังก์ชันฐานข้อมูล (Database Functions) เพื่อสร้างรายงาน
_______________________________
✨ ฟีเจอร์หลัก (Features)
📊 หน้าตาแบบ Excel: Interface ที่คุ้นเคย, ตรึงคอลัมน์ได้, รองรับการดับเบิลคลิกเพื่อแก้ไข (ในอนาคต), Context Menu (คลิกขวา), และ Sort ข้อมูลตามวันที่ ได้
👤 การจัดการข้อมูลลูกค้า: เพิ่ม, แก้ไข, ลบ, ค้นหา, และกรองข้อมูลลูกค้าได้อย่างละเอียด
_______________________________
🔐 ระบบสิทธิ์ผู้ใช้งาน (Role-Based Access Control - RLS):
- administrator: สิทธิ์สูงสุด (ลบข้อมูล, นำเข้าข้อมูล CSV ได้)
- admin: แก้ไขข้อมูลลูกค้าได้ ทั้งหมด
- sales: ดูและแก้ไขได้ เฉพาะข้อมูลลูกค้าของตนเอง
_______________________________
📈 หน้ารายงานประสิทธิภาพ (Sales Performance Report):
-แสดง KPI หลัก (ยอดขายรวม, จำนวนดีล, ขนาดดีลเฉลี่ย, ระยะเวลาปิดดีลเฉลี่ย)
-กราฟยอดขายตามช่องทาง
-ตารางสรุปผลงานเซลล์ (Leaderboard)
-แยกการแสดงผลตามสิทธิ์: Admin เห็นภาพรวม, Sales เห็น KPI ส่วนตัว
_______________________________
🎨 การไฮไลท์เคสค้าง (Stale Case Highlighting):
-เคสค้างเกิน 15 วัน: ไฮไลท์สีชมพูอ่อน (#FFCCCB)
-เคสค้างเกิน 21 วัน: ไฮไลท์สีแดง (#f08080)
_______________________________
📜 ประวัติการติดตามอัจฉริยะ (Smart History Log):
-Admin สร้าง: บันทึกย่อแค่ "สร้าง Lead อัตโนมัติ"
-Sales แก้ไข/อัปเดตสถานะ: บันทึกรายละเอียดครบถ้วน
-📤 Export to CSV: ส่งออกข้อมูลที่กรองแล้วในตารางเป็นไฟล์ CSV
-📥 Import from CSV: (สำหรับ Administrator) นำเข้าข้อมูลลูกค้าจำนวนมากจากไฟล์ CSV
-📱 Responsive Design: รองรับการใช้งานบนมือถือ (ตรึงเฉพาะคอลัมน์ "ชื่อลูกค้า" บนจอเล็ก)
-💻 เทคโนโลยีที่ใช้ (Tech Stack)
_______________________________
-Frontend:
-HTML5
-CSS3 (with CSS Variables, Flexbox, Grid, Sticky Positioning, Media Queries)
-JavaScript (ES6+)
-Chart.js (สำหรับวาดกราฟในหน้ารายงาน)
_______________________________
Backend:
-Supabase:
-Supabase Auth (จัดการการล็อกอิน)
-Supabase Database (PostgreSQL)
-Supabase Database Functions (RPC - สำหรับสร้างรายงาน)
_______________________________
🚀 การติดตั้งและใช้งาน (Getting Started)
-ข้อกำหนดเบื้องต้น (Prerequisites)
-เว็บเบราว์เซอร์ที่ทันสมัย (Chrome, Firefox, Safari, Edge)
-สำหรับการพัฒนา: Live Server (ส่วนขยายสำหรับ VS Code หรือโปรแกรมอื่น) เพื่อเปิดไฟล์ .html
_______________________________
การตั้งค่า (Configuration)
-โปรเจกต์นี้จำเป็นต้องเชื่อมต่อกับ Supabase หากต้องการตั้งค่าโปรเจกต์ของคุณเอง:
-สมัครใช้งาน Supabase: ไปที่ supabase.com และสร้างโปรเจกต์ใหม่
_______________________________
ตั้งค่าฐานข้อมูล:
-สร้างตาราง customers, users, และ customer_status_history ตาม Schema ที่โปรเจกต์ใช้
-สร้าง PostgreSQL Functions ใน SQL Editor:
-safe_cast_to_date(TEXT)
-get_full_sales_report(UUID, TEXT, TEXT)
_______________________________
ให้สิทธิ์ (Grant Execute) ฟังก์ชันทั้งสองแก่ Role authenticated
ตั้งค่า Row Level Security (RLS) บนตาราง customers และ users ตามที่ได้กำหนดไว้ในโปรเจกต์

หา API Keys:

-ไปที่ Project Settings > API
-คัดลอก Project URL และ anon public key
-แก้ไขไฟล์ config.js:
-JavaScript
-const SUPABASE_URL = 'YOUR_SUPABASE_URL';
-const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
⚠️ คำเตือนด้านความปลอดภัย: การวาง anon key ไว้ในโค้ดฝั่ง Client ยอมรับได้สำหรับแอปพลิเคชันภายใน โดยมี RLS เป็นปราการด่านหลัก อย่างไรก็ตาม สำหรับแอปพลิเคชันที่ต้องการความปลอดภัยสูงสุด ควรพิจารณาสร้าง Backend Layer เพิ่มเติมเพื่อซ่อน Key ทั้งหมด

ใช้งาน (Usage)
-เปิดไฟล์ login.html เพื่อเข้าสู่ระบบหรือสมัครสมาชิก
-หลังจากเข้าสู่ระบบสำเร็จ จะถูก redirect ไปยังหน้า index.html ซึ่งเป็นหน้าจัดการข้อมูลหลัก
-คลิกปุ่ม "ดูรายงาน" เพื่อไปยังหน้า report.html

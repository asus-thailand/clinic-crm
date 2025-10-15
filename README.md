# 📂 Clinic-CRM: Excel Edition

## 📝 ภาพรวมโปรเจกต์ (Project Overview)
Clinic-CRM เป็นระบบบริหารจัดการความสัมพันธ์ลูกค้า
(Customer Relationship Management)

สำหรับคลินิกความงาม ถูกออกแบบมาให้มีหน้าตาและการใช้งานคล้ายกับโปรแกรม Excel เพื่อให้ผู้ใช้สามารถเรียนรู้และใช้งานได้อย่างรวดเร็ว

ระบบนี้ถูกสร้างขึ้นด้วยเทคโนโลยี Frontend พื้นฐาน (HTML, CSS, JavaScript) และใช้ Supabase เป็น Backend-as-a-Service (BaaS) สำหรับจัดการฐานข้อมูล, การยืนยันตัวตน (Authentication), และ Real-time updates

## ✨ ฟีเจอร์หลัก (Features)

- **การจัดการข้อมูลลูกค้า**: เพิ่ม, แก้ไข, ลบ, ค้นหา, และกรองข้อมูลลูกค้า
- **ระบบสิทธิ์ผู้ใช้งาน (Role-Based Access Control)**:
    - `administrator`: สิทธิ์สูงสุด (ลบข้อมูล, นำเข้าข้อมูลได้)
    - `admin`: แก้ไขข้อมูลได้ทั้งหมด
    - `sales`: แก้ไขได้เฉพาะข้อมูลของตนเอง
    - `viewer`: ดูข้อมูลได้อย่างเดียว
- **หน้าตาแบบ Excel**: Interface ที่คุ้นเคย, รองรับการดับเบิลคลิกเพื่อแก้ไข, Context Menu (คลิกขวา)
- **Real-time Updates**: ข้อมูลจะอัปเดตอัตโนมัติสำหรับผู้ใช้ทุกคนที่ออนไลน์พร้อมกัน
- **Dashboard**: แสดงสถิติภาพรวมของข้อมูลลูกค้า
- **Export to CSV**: สามารถส่งออกข้อมูลในตารางเป็นไฟล์ CSV ได้
- **Import from CSV**: (สำหรับ Administrator) สามารถนำเข้าข้อมูลจากไฟล์ CSV ได้
- **Responsive Design**: รองรับการใช้งานบนอุปกรณ์มือถือ

## 💻 เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend**:
    - HTML5
    - CSS3 (with CSS Variables)
    - JavaScript (ES6+)
- **Backend**:
    - **Supabase**:
        - Supabase Auth (จัดการการล็อกอิน)
        - Supabase Database (PostgreSQL)
        - Supabase Realtime Subscriptions

## 🚀 การติดตั้งและใช้งาน (Getting Started)

### ข้อกำหนดเบื้องต้น (Prerequisites)
- เว็บเบราว์เซอร์ที่ทันสมัย (Chrome, Firefox, Safari, Edge)
- ไม่จำเป็นต้องติดตั้งโปรแกรมใดๆ เพิ่มเติม สามารถเปิดไฟล์ `index.html` ได้โดยตรง (แนะนำให้รันผ่าน Live Server)

### การตั้งค่า (Configuration)
โปรเจกต์นี้จำเป็นต้องเชื่อมต่อกับ Supabase หากต้องการตั้งค่าโปรเจกต์ของคุณเอง:

1.  **สมัครใช้งาน Supabase**: ไปที่ [supabase.com](https://supabase.com) และสร้างโปรเจกต์ใหม่
2.  **ตั้งค่าฐานข้อมูล**: ใช้ Schema ของฐานข้อมูลตามที่โปรเจกต์ต้องการ (ตาราง `customers`, `users`)
3.  **หา API Keys**:
    - ไปที่ `Project Settings` > `API`
    - คัดลอก `Project URL` และ `anon` `public` key
4.  **แก้ไขไฟล์ `script.js` และ `login-script.js`**:
    - `const SUPABASE_URL = 'YOUR_SUPABASE_URL';`
    - `const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';`

> ⚠️ **คำเตือนด้านความปลอดภัย**:
> การวาง API Keys ไว้ในโค้ดฝั่ง Client โดยตรงเหมาะสำหรับโปรเจกต์ตัวอย่างเท่านั้น **สำหรับ Production-grade application, ควรใช้ Environment Variables และสร้าง Backend Layer (เช่น Node.js) เพื่อเป็นตัวกลางในการสื่อสารกับ Supabase เพื่อซ่อน Keys ทั้งหมด**

## ใช้งาน (Usage)
1.  เปิดไฟล์ `login.html` เพื่อเข้าสู่ระบบหรือสมัครสมาชิก
2.  หลังจากเข้าสู่ระบบสำเร็จ จะถูก redirect ไปยังหน้า `index.html` ซึ่งเป็นหน้าจัดการข้อมูลหลัก

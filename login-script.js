// ================================================================================
// BEAUTY CLINIC CRM - REFACTORED LOGIN SCRIPT
// แก้ไขให้เป็น Module, นำเข้า Supabase client จากส่วนกลาง, และปรับปรุง Event Listeners
// ================================================================================

// นำเข้า Supabase client ที่สร้างไว้ใน config.js
import { supabase } from './config.js';

// --- 1. UI Element References ---
// ดึง Element มาเก็บไว้ในตัวแปรหลังจาก DOM โหลดเสร็จ
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const messageDiv = document.getElementById('message');
const signUpLink = document.getElementById('signUpLink');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');

// --- 2. Rate Limiting for Security ---
let loginAttempts = 0;
let lastAttemptTime = 0;
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 5 * 60 * 1000; // 5 นาที

// --- 3. UI Helper Functions ---
function setLoading(isLoading) {
    if (!loginBtn) return;
    loginBtn.disabled = isLoading;
    loginBtn.classList.toggle('loading', isLoading);
    const span = loginBtn.querySelector('span');
    if (span) span.style.display = isLoading ? 'none' : 'inline';
}

function showMessage(msg, isError = false) {
    if (!messageDiv) return;
    messageDiv.style.display = 'block';
    messageDiv.textContent = msg;
    messageDiv.className = isError ? 'message error' : 'message success';
}

function togglePasswordVisibility() {
    if (!passwordInput || !togglePasswordBtn) return;
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePasswordBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        togglePasswordBtn.textContent = '👁️';
    }
}

// --- 4. Input Validation ---
function validateCredentials(email, password) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !password) {
        showMessage('กรุณากรอกอีเมลและรหัสผ่าน', true);
        return false;
    }
    if (!emailRegex.test(email)) {
        showMessage('รูปแบบอีเมลไม่ถูกต้อง', true);
        return false;
    }
    if (password.length < 6) {
        showMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', true);
        return false;
    }
    return true;
}

// --- 5. Rate Limit Logic ---
function checkRateLimit() {
    const now = Date.now();
    if (now - lastAttemptTime > LOCKOUT_TIME_MS) {
        loginAttempts = 0; // รีเซ็ตหลังจากหมดเวลา lockout
    }
    if (loginAttempts >= MAX_ATTEMPTS) {
        const remainingTime = Math.ceil((LOCKOUT_TIME_MS - (now - lastAttemptTime)) / 1000);
        showMessage(`คุณพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ ${remainingTime} วินาที`, true);
        return false;
    }
    return true;
}

// --- 6. Core Authentication Functions ---
async function handleLogin() {
    if (!checkRateLimit()) return;

    setLoading(true);
    messageDiv.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!validateCredentials(email, password)) {
        setLoading(false);
        return;
    }

    try {
        loginAttempts++;
        lastAttemptTime = Date.now();
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        loginAttempts = 0; // รีเซ็ตเมื่อสำเร็จ
        showMessage('เข้าสู่ระบบสำเร็จ!', false);
        setTimeout(() => { window.location.href = 'index.html'; }, 500);

    } catch (error) {
        console.error('Login error:', error);
        if (error.message.includes('Invalid login credentials')) {
            showMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง', true);
        } else {
            showMessage(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่', true);
        }
    } finally {
        setLoading(false);
    }
}

async function handleSignUp(event) {
    event.preventDefault(); // ป้องกันการ refresh หน้า
    setLoading(true);
    messageDiv.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!validateCredentials(email, password)) {
        setLoading(false);
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // ตรวจสอบเพิ่มเติมว่า user ถูกสร้างจริงหรือไม่
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
             showMessage('อีเมลนี้ถูกใช้งานแล้วโดยไม่มีการยืนยันตัวตน', true);
             return;
        }

        showMessage('ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี', false);
        emailInput.value = '';
        passwordInput.value = '';

    } catch (error) {
        console.error('Sign up error:', error);
        if (error.message.includes('User already registered')) {
            showMessage('อีเมลนี้ถูกใช้งานแล้ว', true);
        } else {
            showMessage(error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน', true);
        }
    } finally {
        setLoading(false);
    }
}

// --- 7. Session Management & Initialization ---
async function checkExistingSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }
}

// --- Initialization ---
// ใช้ Event Listener เพื่อให้แน่ใจว่า DOM โหลดเสร็จสมบูรณ์ก่อนเริ่มทำงาน
document.addEventListener('DOMContentLoaded', () => {
    // ตรวจสอบ session ก่อน
    checkExistingSession();
    
    // ตั้งค่า Event Listeners
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    if (signUpLink) {
        signUpLink.addEventListener('click', handleSignUp);
    }
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    }

    // จัดการการกด Enter
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && passwordInput) passwordInput.focus();
        });
        emailInput.focus(); // Focus ที่ช่อง email เมื่อหน้าโหลด
    }
});

// ================================================================================
// BEAUTY CLINIC CRM - REFACTORED LOGIN SCRIPT (FINAL FIX: BUGS & BEST PRACTICE)
// FIXES: CRITICAL BUGS (API KEYS, TDZ, DOM Access)
// ================================================================================

// --- 1. Supabase Configuration (FIXED) ---
// 🔴 CRITICAL FIX: แก้ไขการกำหนดค่า API Keys ให้ถูกต้องและทำงานบนเบราว์เซอร์ได้
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. UI Element References (ADJUSTED) ---
// ประกาศเป็น null ก่อน เพื่อรอให้ DOM โหลดเสร็จ
let emailInput = null;
let passwordInput = null;
let loginBtn = null;
let messageDiv = null;

// --- 3. Rate Limiting for Security ---
let loginAttempts = 0;
let lastAttemptTime = 0;
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 5 * 60 * 1000; // 5 minutes

// --- 4. UI Helper Functions ---
function setLoading(isLoading) {
    if (loginBtn) {
        loginBtn.disabled = isLoading;
        loginBtn.classList.toggle('loading', isLoading);
    }
}

function showMessage(msg, isError = false) {
    if (messageDiv) {
        messageDiv.style.display = 'block';
        messageDiv.textContent = msg;
        messageDiv.className = isError ? 'message error' : 'message success';
    }
}

function togglePasswordVisibility() {
    if (!passwordInput) return;
    const icon = document.querySelector('.toggle-password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        icon.textContent = '👁️';
    }
}

// --- 5. Input Validation ---
function validateCredentials(email, password, isSigningUp = false) {
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
    if (isSigningUp) {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
            showMessage('รหัสผ่านต้องประกอบด้วยตัวพิมพ์ใหญ่, เล็ก, และตัวเลข', true);
            return false;
        }
    }
    return true;
}

// --- 6. Rate Limit Logic ---
function checkRateLimit() {
    const now = Date.now();
    if (now - lastAttemptTime > LOCKOUT_TIME_MS) {
        loginAttempts = 0;
    }
    if (loginAttempts >= MAX_ATTEMPTS) {
        const remainingTime = Math.ceil((LOCKOUT_TIME_MS - (now - lastAttemptTime)) / 1000);
        showMessage(`คุณพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ ${remainingTime} วินาที`, true);
        return false;
    }
    return true;
}

// --- 7. Core Authentication Functions ---
async function handleLogin() {
    if (!emailInput || !passwordInput) return;
    if (!checkRateLimit()) return;

    setLoading(true);
    if (messageDiv) messageDiv.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!validateCredentials(email, password)) {
        setLoading(false);
        return;
    }

    try {
        loginAttempts++;
        lastAttemptTime = Date.now();
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        loginAttempts = 0;
        showMessage('เข้าสู่ระบบสำเร็จ!', false);
        setTimeout(() => { window.location.href = 'index.html'; }, 500);
    } catch (error) {
        console.error('Login error:', error);
        if (error.message && error.message.includes('Invalid login credentials')) {
            showMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง', true);
        } else {
            showMessage(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่', true);
        }
    } finally {
        setLoading(false);
    }
}

async function handleSignUp() {
    if (!emailInput || !passwordInput) return;
    setLoading(true);
    if (messageDiv) messageDiv.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!validateCredentials(email, password, true)) {
        setLoading(false);
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        if (data?.user?.identities?.length === 0) {
            showMessage('อีเมลนี้ถูกใช้งานแล้ว', true);
            return;
        }
        showMessage('ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี', false);
        emailInput.value = '';
        passwordInput.value = '';
    } catch (error) {
        console.error('Sign up error:', error);
        if (error.message && error.message.includes('already registered')) {
            showMessage('อีเมลนี้ถูกใช้งานแล้ว', true);
        } else {
            showMessage(error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน', true);
        }
    } finally {
        setLoading(false);
    }
}

// --- 8. Session Management & Initialization ---
async function checkExistingSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }
}

// 🔴 CRITICAL FIX: รอให้ DOM โหลดเสร็จก่อนเริ่มทำงาน
document.addEventListener('DOMContentLoaded', () => {
    emailInput = document.getElementById('email');
    passwordInput = document.getElementById('password');
    loginBtn = document.getElementById('loginBtn');
    messageDiv = document.getElementById('message');

    checkExistingSession();

    if (emailInput) emailInput.focus();

    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && passwordInput) passwordInput.focus();
        });
    }
});

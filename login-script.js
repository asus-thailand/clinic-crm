// --- Supabase Configuration from Environment Variables ---
// WARNING: In a real-world production environment, you should use server-side proxies or environment variables that are not exposed to the client-side.
// For demonstration purposes, we keep the keys here.
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const messageDiv = document.getElementById('message');

/**
 * Sets the loading state for the login button.
 * @param {boolean} isLoading - True to show loading state, false otherwise.
 */
function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
}

/**
 * Displays a message on the UI.
 * @param {string} msg - The message to display.
 * @param {boolean} [isError=false] - True if the message is an error, false for success.
 */
function showMessage(msg, isError = false) {
    messageDiv.style.display = 'block';
    messageDiv.textContent = msg;
    messageDiv.classList.toggle('error', isError);
    messageDiv.classList.toggle('success', !isError);
}

/**
 * Displays an error message.
 * @param {string} msg - The error message to display.
 */
function showError(msg) {
    showMessage(msg, true);
}

/**
 * Displays a success message.
 * @param {string} msg - The success message to display.
 */
function showSuccess(msg) {
    showMessage(msg, false);
}

/**
 * Validates email and password input.
 * @param {string} email - The email to validate.
 * @param {string} password - The password to validate.
 * @returns {boolean} - True if both are valid, false otherwise.
 */
function validateCredentials(email, password) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !password) {
        showError('กรุณากรอกอีเมลและรหัสผ่าน');
        return false;
    }
    if (!emailRegex.test(email)) {
        showError('รูปแบบอีเมลไม่ถูกต้อง');
        return false;
    }
    if (password.length < 6) {
        showError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        return false;
    }
    return true;
}

/**
 * Handles the login process.
 */
async function handleLogin() {
    setLoading(true);
    messageDiv.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!validateCredentials(email, password)) {
        setLoading(false);
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profileError && profileError.code === 'PGRST116') {
            showSuccess('เข้าสู่ระบบสำเร็จ! โปรไฟล์กำลังถูกสร้าง...');
        } else if (profileError) {
            throw profileError;
        } else {
            showSuccess('เข้าสู่ระบบสำเร็จ!');
        }

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);

    } catch (error) {
        console.error('Auth error:', error);
        
        if (error.message.includes('Invalid login credentials')) {
            showError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        } else if (error.message.includes('Email not confirmed')) {
            showError('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ');
        } else {
            showError(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
    } finally {
        setLoading(false);
    }
}

/**
 * Handles the sign-up process.
 */
async function handleSignUp() {
    setLoading(true);
    messageDiv.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!validateCredentials(email, password)) {
        setLoading(false);
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        showSuccess('ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน');

    } catch (error) {
        console.error('Sign up error:', error);
        showError(error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
        setLoading(false);
    }
}

// Check if already logged in on page load
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }
});

// Enter key support for login form
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});
        
emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        passwordInput.focus();
    }
});

// --- Supabase Configuration from Environment Variables ---
// WARNING: Do not hardcode keys in production! Use environment variables.
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const messageDiv = document.getElementById('message');

function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
}

function showMessage(msg, isError = false) {
    messageDiv.style.display = 'block';
    messageDiv.textContent = msg;
    messageDiv.classList.toggle('error', isError);
    messageDiv.classList.toggle('success', !isError);
}

function showError(msg) {
    showMessage(msg, true);
}

function showSuccess(msg) {
    showMessage(msg, false);
}

async function handleLogin() {
    setLoading(true);
    messageDiv.style.display = 'none';

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        // Check if user has a profile in the 'users' table
        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profileError && profileError.code === 'PGRST116') { // No row found
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

async function handleSignUp() {
    setLoading(true);
    messageDiv.style.display = 'none';

    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        showError('กรุณากรอกอีเมลและรหัสผ่านเพื่อสมัครสมาชิก');
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

// Check if already logged in
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }
});

// Enter key support
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
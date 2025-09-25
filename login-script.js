// --- Supabase Configuration ---
// WARNING: In a real-world production environment, you should use server-side proxies or environment variables that are not exposed to the client-side.
// For demonstration purposes, we keep the keys here but you must move them to environment variables on your server.
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const messageDiv = document.getElementById('message');

// Add rate limiting for login attempts
let loginAttempts = 0;
let lastAttemptTime = 0;
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 5 * 60 * 1000; // 5 minutes

function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
    if (!isLoading) {
        loginBtn.querySelector('span').style.display = 'inline';
        loginBtn.querySelector('.loader').style.display = 'none';
    } else {
        loginBtn.querySelector('span').style.display = 'none';
        loginBtn.querySelector('.loader').style.display = 'block';
    }
}

function showMessage(msg, isError = false) {
    messageDiv.style.display = 'block';
    messageDiv.textContent = msg;
    messageDiv.classList.toggle('error', isError);
    messageDiv.classList.toggle('success', !isError);
    
    // Auto hide success messages after 5 seconds
    if (!isError) {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

function showError(msg) {
    showMessage(msg, true);
}

function showSuccess(msg) {
    showMessage(msg, false);
}

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
    
    // Check for SQL injection patterns
    const sqlPatterns = /(\b(SELECT|DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE)\b|--|;|'|\"|\\)/i;
    if (sqlPatterns.test(email) || sqlPatterns.test(password)) {
        showError('ข้อมูลที่กรอกมีอักขระที่ไม่อนุญาต');
        return false;
    }
    
    return true;
}

function checkRateLimit() {
    const now = Date.now();
    
    // Reset attempts if lockout period has passed
    if (now - lastAttemptTime > LOCKOUT_TIME) {
        loginAttempts = 0;
    }
    
    if (loginAttempts >= MAX_ATTEMPTS) {
        const remainingTime = Math.ceil((LOCKOUT_TIME - (now - lastAttemptTime)) / 1000);
        showError(`คุณพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ ${remainingTime} วินาที`);
        return false;
    }
    
    return true;
}

async function handleLogin() {
    // Check rate limiting
    if (!checkRateLimit()) {
        return;
    }
    
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
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }
        
        // Reset login attempts on successful login
        loginAttempts = 0;

        const { data: userProfile, error: profileError } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profileError && profileError.code === 'PGRST116') {
            // User profile doesn't exist, will be created on main page
            showSuccess('เข้าสู่ระบบสำเร็จ! โปรไฟล์กำลังถูกสร้าง...');
        } else if (profileError) {
            throw profileError;
        } else {
            showSuccess('เข้าสู่ระบบสำเร็จ!');
        }

        // Store session expiry time
        const expiryTime = new Date().getTime() + (60 * 60 * 1000); // 1 hour
        sessionStorage.setItem('session_expiry', expiryTime.toString());
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Auth error:', error);
        
        // Handle different error cases
        if (error.message?.includes('Invalid login credentials')) {
            showError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        } else if (error.message?.includes('Email not confirmed')) {
            showError('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ');
        } else if (error.message?.includes('Network')) {
            showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
        } else if (error.message?.includes('rate limit')) {
            showError('มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่');
        } else {
            showError(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
    } finally {
        setLoading(false);
    }
}

async function handleSignUp() {
    // Check rate limiting
    if (!checkRateLimit()) {
        return;
    }
    
    setLoading(true);
    messageDiv.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!validateCredentials(email, password)) {
        setLoading(false);
        return;
    }

    // Additional password strength check for signup
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
        showError('รหัสผ่านต้องประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข');
        setLoading(false);
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    created_at: new Date().toISOString()
                }
            }
        });

        if (error) {
            throw error;
        }

        if (data?.user?.identities?.length === 0) {
            showError('อีเมลนี้ถูกใช้งานแล้ว');
            return;
        }

        showSuccess('ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน');
        
        // Clear form after successful signup
        emailInput.value = '';
        passwordInput.value = '';

    } catch (error) {
        console.error('Sign up error:', error);
        
        if (error.message?.includes('already registered')) {
            showError('อีเมลนี้ถูกใช้งานแล้ว');
        } else if (error.message?.includes('rate limit')) {
            showError('มีการสมัครสมาชิกมากเกินไป กรุณารอสักครู่');
        } else if (error.message?.includes('Network')) {
            showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } else {
            showError(error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
        }
    } finally {
        setLoading(false);
    }
}

// Check session on page load
async function checkExistingSession() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            // Check if session is still valid
            const sessionExpiry = sessionStorage.getItem('session_expiry');
            if (sessionExpiry && new Date().getTime() < parseInt(sessionExpiry)) {
                window.location.href = 'index.html';
            } else {
                // Session expired, sign out
                await supabaseClient.auth.signOut();
                sessionStorage.removeItem('session_expiry');
                showMessage('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', true);
            }
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// Password visibility toggle
function addPasswordToggle() {
    const passwordContainer = passwordInput.parentElement;
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.style.cssText = `
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        padding: 5px;
        color: #666;
    `;
    toggleBtn.innerHTML = '👁';
    toggleBtn.onclick = function() {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.innerHTML = '👁‍🗨';
        } else {
            passwordInput.type = 'password';
            toggleBtn.innerHTML = '👁';
        }
    };
    
    passwordContainer.style.position = 'relative';
    passwordContainer.appendChild(toggleBtn);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Add password toggle button
    addPasswordToggle();
    
    // Check for existing session
    await checkExistingSession();
    
    // Focus email input
    emailInput.focus();
    
    // Clear any stored error messages
    messageDiv.style.display = 'none';
});

// Keyboard event handlers
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

// Form validation on input
emailInput.addEventListener('input', () => {
    if (messageDiv.classList.contains('error')) {
        messageDiv.style.display = 'none';
    }
});

passwordInput.addEventListener('input', () => {
    if (messageDiv.classList.contains('error')) {
        messageDiv.style.display = 'none';
    }
});

// Prevent form submission on refresh
window.addEventListener('beforeunload', () => {
    setLoading(false);
});

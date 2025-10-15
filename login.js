// ================================================================================
// Login Script - Handles authentication and user status checks.
// (FINAL & COMPLETE VERSION)
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const messageDiv = document.getElementById('message');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');

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

    async function handleLogin() {
        if (!window.supabaseClient || !window.api) {
            showMessage('ระบบยังไม่พร้อม กรุณารอสักครู่', true);
            return;
        }
        setLoading(true);
        showMessage('', false);

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage('กรุณากรอกอีเมลและรหัสผ่าน', true);
            setLoading(false);
            return;
        }

        try {
            const { data: { user }, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
            if (user) {
                const profile = await api.getUserProfile(user.id);
                if (profile && profile.is_active === false) {
                    await api.signOut(); // Logout immediately
                    throw new Error('บัญชีของคุณถูกปิดการใช้งานแล้ว กรุณาติดต่อผู้ดูแล');
                }
            }
            
            showMessage('เข้าสู่ระบบสำเร็จ!', false);
            setTimeout(() => { window.location.href = 'index.html'; }, 500);

        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.message.includes('Invalid login credentials') 
                ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' 
                : error.message;
            showMessage(errorMessage, true);
        } finally {
            setLoading(false);
        }
    }
    
    async function checkExistingSession() {
        if (window.api) {
            const session = await api.getSession();
            if (session) {
                window.location.href = 'index.html';
            }
        } else {
            setTimeout(checkExistingSession, 100); // Wait for api.js to load
        }
    }

    loginBtn?.addEventListener('click', handleLogin);
    passwordInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    togglePasswordBtn?.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePasswordBtn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            togglePasswordBtn.textContent = '👁️';
        }
    });

    checkExistingSession();
});

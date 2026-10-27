// /Users/abc/Documents/web/celeb 2/js/auth.js

const API_AUTH_BASE = 'https://celeb-address.vercel.app/api/auth';
const SESSION_KEY = 'star-elite_user_active';
const FRONTEND_SIGNATURE = 'celemanagement';

const swalTheme = {
    customClass: {
        popup: 'swal-advanced-popup',
        title: 'swal-advanced-title',
        confirmButton: 'swal-confirm-btn',
        closeButton: 'swal-close-btn'
    },
    buttonsStyling: false,
    background: '#0f0f10',
    color: '#fff',
    showCloseButton: true
};

// --- LOGIN LOGIC ---
async function handleLogin() {
    Swal.fire({
        ...swalTheme,
        title: 'Sign In',
        html: `
            <div class="auth-field-group" style="display: flex; flex-direction: column; gap: 12px;">
                <input type="email" id="swalEmail" class="auth-input" placeholder="Email Address">
                <input type="password" id="swalPassword" class="auth-input" placeholder="Password">
            </div>
            <p id="swalError" style="color: #ff4d4d; font-size: 13px; margin-top: 10px; display: none;"></p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                <p style="font-size:14px; color: #9aa0a6; margin: 0;">New? <a href="#" id="toSignup" class="auth-link">Join</a></p>
                <a href="#" id="toForgotPassword" style="color: #d4af37; text-decoration: none; font-size: 13px;">Forgot Password?</a>
            </div>`,
        confirmButtonText: 'Login',
        didOpen: () => {
            document.getElementById('toSignup').onclick = (e) => { e.preventDefault(); Swal.close(); handleSignup(); };
            document.getElementById('toForgotPassword').onclick = (e) => { e.preventDefault(); Swal.close(); handleForgotPassword(); };

            // Handle Login click without auto-closing modal on error
            Swal.getConfirmButton().onclick = async () => {
                const email = document.getElementById('swalEmail').value.trim();
                const password = document.getElementById('swalPassword').value.trim();
                const errorEl = document.getElementById('swalError');

                if (!email || !password) {
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'Please fill all fields.';
                    return;
                }

                errorEl.style.display = 'none';
                Swal.showLoading();

                try {
                    const response = await fetch(`${API_AUTH_BASE}/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, signature: FRONTEND_SIGNATURE })
                    });

                    const result = await response.json();
                    Swal.hideLoading();

                    if (!response.ok || !result.success) {
                        errorEl.style.display = 'block';
                        errorEl.textContent = result.error || 'Invalid email or password.';
                    } else {
                        saveSession(result.user);
                    }
                } catch (err) {
                    Swal.hideLoading();
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'Network connection failed.';
                }
            };
        }
    });
}

// --- SIGNUP LOGIC ---
async function handleSignup() {
    Swal.fire({
        ...swalTheme,
        title: 'Join Us',
        html: `
            <div class="auth-field-group" style="display: flex; flex-direction: column; gap: 12px;">
                <input type="text" id="swalFname" class="auth-input" placeholder="Full Name">
                <input type="text" id="swalCountry" class="auth-input" placeholder="Country">
                <input type="email" id="swalEmail" class="auth-input" placeholder="Email">
                <input type="password" id="swalPass" class="auth-input" placeholder="Password">
                <input type="password" id="swalRepass" class="auth-input" placeholder="Re-enter Password">
            </div>
            <p id="swalError" style="color: #ff4d4d; font-size: 13px; margin-top: 10px; display: none;"></p>
            <p style="font-size:14px; color: #9aa0a6; margin-top: 15px;">Member? 
                <a href="#" id="toLogin" class="auth-link">Login</a>
            </p>`,
        confirmButtonText: 'Register',
        didOpen: () => {
            document.getElementById('toLogin').onclick = (e) => { e.preventDefault(); Swal.close(); handleLogin(); };

            Swal.getConfirmButton().onclick = async () => {
                const fullname = document.getElementById('swalFname').value.trim();
                const country = document.getElementById('swalCountry').value.trim();
                const email = document.getElementById('swalEmail').value.trim();
                const password = document.getElementById('swalPass').value.trim();
                const repassword = document.getElementById('swalRepass').value.trim();
                const errorEl = document.getElementById('swalError');

                if (!fullname || !country || !email || !password || !repassword) {
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'All fields are required.';
                    return;
                }
                if (password !== repassword) {
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'Passwords do not match.';
                    return;
                }

                errorEl.style.display = 'none';
                Swal.showLoading();

                try {
                    const response = await fetch(`${API_AUTH_BASE}/signup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fullname, country, email, password, signature: FRONTEND_SIGNATURE })
                    });

                    const result = await response.json();
                    Swal.hideLoading();

                    if (!response.ok || !result.success) {
                        errorEl.style.display = 'block';
                        errorEl.textContent = result.error || 'Could not register user.';
                    } else {
                        saveSession(result.user);
                    }
                } catch (err) {
                    Swal.hideLoading();
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'Network connection failed.';
                }
            };
        }
    });
}

// --- FORGOT PASSWORD FLOW ---
async function handleForgotPassword() {
    // Step 1: Request Email for OTP
    Swal.fire({
        ...swalTheme,
        title: 'Reset Password',
        html: `
            <div class="auth-field-group">
                <input type="email" id="resetEmail" class="auth-input" placeholder="Enter your registered email">
            </div>
            <p id="swalError" style="color: #ff4d4d; font-size: 13px; margin-top: 10px; display: none;"></p>
        `,
        confirmButtonText: 'Send OTP',
        didOpen: () => {
            Swal.getConfirmButton().onclick = async () => {
                const email = document.getElementById('resetEmail').value.trim();
                const errorEl = document.getElementById('swalError');

                if (!email) {
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'Please enter your email.';
                    return;
                }

                errorEl.style.display = 'none';
                Swal.showLoading();

                try {
                    const res = await fetch(`${API_AUTH_BASE}/forgot-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'send_otp', email, signature: FRONTEND_SIGNATURE })
                    });
                    const data = await res.json();
                    Swal.hideLoading();

                    if (!data.success) {
                        errorEl.style.display = 'block';
                        errorEl.textContent = data.error || 'Failed to send OTP.';
                    } else {
                        // Proceed to Step 2: Enter OTP & New Password Match
                        handleResetPasswordModal(email);
                    }
                } catch (err) {
                    Swal.hideLoading();
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'Network connection failed.';
                }
            };
        }
    });
}

// Step 2: Prompt for OTP & Confirmed New Password
function handleResetPasswordModal(email) {
    Swal.fire({
        ...swalTheme,
        title: 'Enter Verification Code',
        html: `
            <div class="auth-field-group" style="display: flex; flex-direction: column; gap: 12px;">
                <input type="text" id="otpCode" class="auth-input" placeholder="6-digit OTP">
                <input type="password" id="newPassword" class="auth-input" placeholder="New Password">
                <input type="password" id="confirmPassword" class="auth-input" placeholder="Re-enter New Password">
            </div>
            <p id="swalError" style="color: #ff4d4d; font-size: 13px; margin-top: 10px; display: none;"></p>
        `,
        confirmButtonText: 'Update Password',
        didOpen: () => {
            Swal.getConfirmButton().onclick = async () => {
                const otp = document.getElementById('otpCode').value.trim();
                const newPassword = document.getElementById('newPassword').value.trim();
                const confirmPassword = document.getElementById('confirmPassword').value.trim();
                const errorEl = document.getElementById('swalError');

                if (!otp || !newPassword || !confirmPassword) {
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'All fields are required.';
                    return;
                }
                if (newPassword !== confirmPassword) {
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'New passwords do not match.';
                    return;
                }

                errorEl.style.display = 'none';
                Swal.showLoading();

                try {
                    const resetRes = await fetch(`${API_AUTH_BASE}/forgot-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'reset_password',
                            email,
                            otp,
                            newPassword,
                            signature: FRONTEND_SIGNATURE
                        })
                    });
                    const resetResult = await resetRes.json();
                    Swal.hideLoading();

                    if (!resetResult.success) {
                        errorEl.style.display = 'block';
                        errorEl.textContent = resetResult.error || 'Failed to update password.';
                    } else {
                        Swal.fire({
                            ...swalTheme,
                            icon: 'success',
                            title: 'Success!',
                            text: 'Password updated successfully. Please log in.',
                            confirmButtonText: 'Sign In'
                        }).then(() => {
                            handleLogin();
                        });
                    }
                } catch (err) {
                    Swal.hideLoading();
                    errorEl.style.display = 'block';
                    errorEl.textContent = 'Network connection failed.';
                }
            };
        }
    });
}

function updateHeaderUI() {
    const authContainer = document.getElementById('headerAuthSection');
    if (!authContainer) return;

    const sessionStr = localStorage.getItem(SESSION_KEY);
    const session = sessionStr ? JSON.parse(sessionStr) : null;

    if (session && session.loggedIn) {
        authContainer.innerHTML = `
            <a class="btn ghost" href="./dash/index.html">Profile</a>
            <button id="headerLogoutBtn" class="btn" style="background: #e74c3c; color: white; border: none;">Logout</button>
        `;

        document.getElementById('headerLogoutBtn').onclick = () => {
            localStorage.removeItem(SESSION_KEY);
            window.location.reload();
        };
    } else {
        authContainer.innerHTML = `
            <a class="btn ghost" id="signInBtn" href="#">Sign in</a>
            <a class="btn" href="#featured">Book Talent</a>
        `;

        document.getElementById('signInBtn').onclick = (e) => {
            e.preventDefault();
            handleLogin();
        };
    }
}

function saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        loggedIn: true,
        userId: user.id,
        userName: user.fullname,
        timestamp: new Date().getTime()
    }));

    window.location.href = './dash/index.html';
}

document.addEventListener('DOMContentLoaded', updateHeaderUI);

const ghostBtn = document.querySelector('.btn.ghost');
if (ghostBtn) {
    ghostBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const sessionStr = localStorage.getItem(SESSION_KEY);
        const session = sessionStr ? JSON.parse(sessionStr) : null;

        if (session && session.loggedIn) {
            window.location.href = './dash/index.html';
        } else {
            handleLogin();
        }
    });
}
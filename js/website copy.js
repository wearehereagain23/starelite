// /website.js

const API_WEB_BASE = 'https://celeb-address.vercel.app/api/web';
const API_AUTH_BASE = 'https://celeb-address.vercel.app/api/auth';
const SESSION_KEY = 'star-elite_user_active';
const FRONTEND_SIGNATURE = 'starelite';
const TIMEOUT_LIMIT = 30 * 60 * 1000; // 30 minutes

window.checkSiteAndAccountStatus = async () => {
    try {
        checkInactivityTimeout();

        // 1. Check Global Site Visibility & Footer via Backend API using signature
        const res = await fetch(`${API_WEB_BASE}/status?signature=${FRONTEND_SIGNATURE}`);
        const data = await res.json();

        if (data.success) {
            if (data.website_visibility === false) {
                if (!window.location.pathname.includes('404.html')) {
                    const pathTo404 = window.location.pathname.includes('/dash/') ? '../404.html' : './404.html';
                    window.location.href = pathTo404;
                    return;
                }
            } else {
                if (window.location.pathname.includes('404.html')) {
                    const pathToHome = window.location.pathname.includes('/dash/') ? '../index.html' : './index.html';
                    window.location.href = pathToHome;
                    return;
                }
            }
            updateFooterUI(data.email, data.address);
        }

        // 2. Check Individual User Account Status & JWT Token Validity via Backend API
        const sessionStr = localStorage.getItem(SESSION_KEY);
        const session = sessionStr ? JSON.parse(sessionStr) : null;

        if (session?.loggedIn && session?.userId) {
            // If a token exists, verify it safely
            if (session.token) {
                try {
                    const tokenRes = await fetch(`${API_AUTH_BASE}/verify-token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: session.token })
                    });
                    const tokenResult = await tokenRes.json();

                    if (!tokenResult.valid) {
                        console.warn("⚠️ [WEBSITE.JS] Token validation failed from server:", tokenResult);
                        // Do not hard-restrict on dashboard during debugging, just log warning
                        if (!window.location.pathname.includes('/dash/')) {
                            handleRestriction("Your session has expired. Please log in again.");
                            return;
                        }
                    }
                } catch (tokenErr) {
                    console.warn("⚠️ [WEBSITE.JS] Token verify endpoint unreachable:", tokenErr);
                }
            }

            // Check Database Active Flag safely
            try {
                const userRes = await fetch(`${API_WEB_BASE}/user-status/${session.userId}`);
                const userResult = await userRes.json();

                if (userResult.success && userResult.active === false) {
                    handleRestriction("Your account is restricted. Contact management.");
                } else {
                    updateLastActive();
                }
            } catch (userStatusErr) {
                console.warn("⚠️ [WEBSITE.JS] User status endpoint unreachable:", userStatusErr);
            }
        }
    } catch (err) {
        console.error("❌ [WEBSITE.JS] Security Sync Exception (Non-fatal):", err);
    }
};

window.checkSiteVisibility = window.checkSiteAndAccountStatus;

function checkInactivityTimeout() {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    if (!session || !session.loggedIn) return;

    const lastActive = parseInt(localStorage.getItem('last_active_time') || '0', 10);
    const now = Date.now();

    if (lastActive && (now - lastActive > TIMEOUT_LIMIT)) {
        console.warn("⚠️ [WEBSITE.JS] Inactivity limit reached.");
        // Suppress hard restriction on dashboard to allow debugging
        if (!window.location.pathname.includes('/dash/')) {
            handleRestriction("Session expired due to inactivity. Please log in again.");
        }
    }
}

function updateLastActive() {
    localStorage.setItem('last_active_time', Date.now().toString());
}

function updateFooterUI(email, address) {
    const emailEl = document.getElementById('footerEmail');
    const addressEl = document.getElementById('footerAddress');
    if (emailEl && email) emailEl.innerText = `Email: ${email}`;
    if (addressEl && address) addressEl.innerText = `Address: ${address}`;
}

async function handleRestriction(message) {
    console.error("🚨 [WEBSITE.JS RESTRICTION TRIGGERED]:", message);
    if (typeof Swal !== 'undefined') {
        await Swal.fire({
            title: 'Security Alert',
            text: message,
            icon: 'warning',
            background: '#0f0f10',
            color: '#fff',
            confirmButtonColor: '#d4af37',
            allowOutsideClick: false
        });
    } else {
        alert(message);
    }

    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('last_active_time');

    const pathToHome = window.location.pathname.includes('/dash/') ? '../index.html' : './index.html';
    window.location.href = pathToHome;
}

['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
    document.addEventListener(name, updateLastActive);
});

// Run immediately and poll safely
window.checkSiteAndAccountStatus();
setInterval(window.checkSiteAndAccountStatus, 60000);
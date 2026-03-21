// admin.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// UPDATED SESSION KEYS
const ADMIN_SESSION_KEY = 'adminSession';
const USER_SESSION_KEY = 'Star-Elite_user_active';
const TIMEOUT_LIMIT = 30 * 60 * 1000; // 30 mins

window.checkAdminAuth = () => {
    const session = localStorage.getItem(ADMIN_SESSION_KEY);
    const lastActive = localStorage.getItem('admin_last_active');
    const now = Date.now();

    // 1. If no admin session, boot to login
    if (!session || session !== 'active') {
        window.adminLogout();
        return;
    }

    // 2. Inactivity check
    if (lastActive && (now - parseInt(lastActive) > TIMEOUT_LIMIT)) {
        window.adminLogout("Session expired due to inactivity.");
        return;
    }

    updateAdminActivity();
};

window.adminLogout = (message = null) => {
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('admin_last_active');
    localStorage.removeItem('Star-Elite_user_active');

    // FORCE the path to include the /admin/ prefix for your local server
    const loginPath = window.location.origin + "/admin/login/index.html";

    if (message && typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Logged Out',
            text: message,
            icon: 'info',
            confirmButtonColor: '#d4af37'
        }).then(() => {
            window.location.href = loginPath;
        });
    } else {
        window.location.href = loginPath;
    }
};

function updateAdminActivity() {
    localStorage.setItem('admin_last_active', Date.now().toString());
}

// Global Activity Listeners
['mousedown', 'keypress', 'touchstart'].forEach(name => {
    document.addEventListener(name, updateAdminActivity);
});

// Run automatically
window.checkAdminAuth();
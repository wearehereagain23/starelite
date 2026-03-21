import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 1. Initialize Supabase
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const SESSION_KEY = 'Star-Elite_user_active';
const TIMEOUT_LIMIT = 30 * 60 * 1000; // 30 minutes

/**
 * CORE PROTECTION LOGIC
 * Combined check for visibility, account status, and footer sync.
 */
window.checkSiteAndAccountStatus = async () => {
    try {
        // A. Handle Inactivity Timeout
        checkInactivityTimeout();

        // B. Check Global Site Visibility & Contact Info
        const { data: adminData } = await supabase
            .from('admin')
            .select('website_visibility, email, address')
            .eq('id', 2)
            .single();

        if (adminData) {
            // Kill-switch logic
            if (adminData.website_visibility === false) {
                if (!window.location.pathname.includes('404.html')) {
                    window.location.href = window.location.origin + '/404.html';
                    return;
                }
            }
            // Update Footer
            updateFooterUI(adminData.email, adminData.address);
        }

        // C. Check Individual User Account Status
        const session = JSON.parse(localStorage.getItem(SESSION_KEY));
        if (session?.loggedIn && session?.userId) {
            const { data: user } = await supabase
                .from('elite-users')
                .select('active')
                .eq('id', session.userId)
                .single();

            if (user && user.active === false) {
                handleRestriction("Your account is restricted. Contact management.");
            } else {
                updateLastActive();
            }
        }
    } catch (err) {
        console.error("Security Sync Error:", err);
    }
};

/**
 * LEGACY WRAPPER: Fixed "window.checkSiteVisibility is not a function"
 */
window.checkSiteVisibility = window.checkSiteAndAccountStatus;

/**
 * SECURITY: Inactivity Check
 */
function checkInactivityTimeout() {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!session || !session.loggedIn) return;

    const lastActive = parseInt(localStorage.getItem('last_active_time'));
    const now = Date.now();

    if (lastActive && (now - lastActive > TIMEOUT_LIMIT)) {
        handleRestriction("Session expired due to inactivity. Please log in again.");
    }
}

function updateLastActive() {
    localStorage.setItem('last_active_time', Date.now().toString());
}

/**
 * UI HELPERS
 */
function updateFooterUI(email, address) {
    const emailEl = document.getElementById('footerEmail');
    const addressEl = document.getElementById('footerAddress');
    if (emailEl && email) emailEl.innerText = `Email: ${email}`;
    if (addressEl && address) addressEl.innerText = `Address: ${address}`;
}

async function handleRestriction(message) {
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
    window.location.href = window.location.origin + '/index.html';
}

/**
 * REAL-TIME MONITORING
 */
function startRealtimeSync() {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));

    // Monitor Admin (Visibility/Footer)
    supabase.channel('global_admin_sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin', filter: 'id=eq.2' }, (payload) => {
            if (payload.new.website_visibility === false) {
                window.location.href = window.location.origin + '/404.html';
            }
            updateFooterUI(payload.new.email, payload.new.address);
        }).subscribe();

    // Monitor Specific User Status
    if (session?.userId) {
        supabase.channel('user_status_monitor')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'elite-users', filter: `id=eq.${session.userId}` }, (payload) => {
                if (payload.new.active === false) {
                    handleRestriction("Your account has been restricted.");
                }
            }).subscribe();
    }
}

// Activity Listeners to reset timeout timer
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(name => {
    document.addEventListener(name, updateLastActive);
});

// Run immediately
window.checkSiteAndAccountStatus();
startRealtimeSync();
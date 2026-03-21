// /dash/dash.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const SESSION_KEY = 'Star-Elite_user_active';

document.addEventListener('DOMContentLoaded', async () => {
    if (window.checkSiteAndAccountStatus) {
        await window.checkSiteAndAccountStatus();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedRid = urlParams.get('rid');

    const sessionData = localStorage.getItem(SESSION_KEY);
    const session = sessionData ? JSON.parse(sessionData) : null;
    const isLoggedIn = session && session.loggedIn && session.userId;

    // GUARD: No redirect, but force login popup if session is missing
    if (!isLoggedIn) {
        handleScanAuth(sharedRid);
        return;
    }

    await initDashboard(session.userId);
    setupTabs();

    if (sharedRid) {
        verifyAndShowScanCard(sharedRid, session.userId);
    }
});

/**
 * FIXED: handleScanAuth
 * Validates form existence before calling .toLowerCase()
 */
async function handleScanAuth(rid) {
    const { value: form } = await Swal.fire({
        title: 'Authentication Required',
        text: 'Please login to access your dashboard.',
        background: '#0f0f10',
        color: '#fff',
        // Set a base width that works for desktop, but limited by 95% for mobile
        width: '450px',
        padding: '2rem 1rem',
        html: `
    <div style="display: flex; flex-direction: column; gap: 5px; width: 100%; box-sizing: border-box;">
        <div style="text-align: left; margin-bottom: 5px; color: #9aa0a6; font-size: 13px; padding-left: 5px;">Email Address</div>
        <input id="sw-email" class="swal2-input" placeholder="e.g. name@mail.com" 
            style="background:#1a1a1b; color:white; width: 100%; margin: 0 0 15px 0; border: 1px solid #333; box-sizing: border-box; font-size: 15px;">
        
        <div style="text-align: left; margin-bottom: 5px; color: #9aa0a6; font-size: 13px; padding-left: 5px;">Password</div>
        <input id="sw-pass" type="password" class="swal2-input" placeholder="••••••••" 
            style="background:#1a1a1b; color:white; width: 100%; margin: 0 0 10px 0; border: 1px solid #333; box-sizing: border-box; font-size: 15px;">
        
        <div style="text-align: right; margin-top: 5px;">
            <a href="../authin.html" style="color: #d4af37; text-decoration: none; font-size: 12px; font-weight: bold;">Forgot Password?</a>
        </div>
    </div>
`,
        confirmButtonColor: '#d4af37',
        confirmButtonText: 'Login to Dashboard',
        allowOutsideClick: false,
        showCancelButton: true,
        cancelButtonText: 'Return Home',
        // This ensures the popup never exceeds the screen width on tiny phones
        didOpen: () => {
            const popup = Swal.getPopup();
            popup.style.maxWidth = '95vw';
        },
        preConfirm: () => {
            const email = document.getElementById('sw-email').value;
            const password = document.getElementById('sw-pass').value;
            if (!email || !password) {
                Swal.showValidationMessage('Required fields missing');
                return null;
            }
            return { email: email.trim(), password: password.trim() };
        }
    });

    if (form && form.email) {
        const { data: user, error } = await supabase
            .from('elite-users')
            .select('*')
            .eq('email', form.email.toLowerCase())
            .eq('password', form.password)
            .single();

        if (error || !user) {
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: 'Invalid email or password.',
                background: '#0f0f10',
                color: '#fff'
            }).then(() => handleScanAuth(rid));
        } else {
            localStorage.setItem(SESSION_KEY, JSON.stringify({
                loggedIn: true,
                userId: user.id,
                userName: user.fullname
            }));
            window.location.reload();
        }
    } else {
        // Only redirect if they explicitly click 'Return Home'
        window.location.href = '../index.html';
    }
}

async function verifyAndShowScanCard(cardNumber, userUuid) {
    if (!cardNumber || !userUuid) return;
    const cleanSearchCard = cardNumber.toString().replace(/\s/g, '');

    const { data: cards } = await supabase.from('memberships').select('*').eq('user_id', userUuid);
    if (!cards) return;

    const matchedCard = cards.find(c => c.card_number.toString().replace(/\s/g, '') === cleanSearchCard);

    if (!matchedCard) {
        Swal.fire({ icon: 'warning', title: 'Unauthorized', text: 'Card not found in your account.', background: '#0f0f10', color: '#fff' });
        return;
    }
    viewCardDetails(matchedCard.card_number);
}

async function initDashboard(userId) {
    const { data: user } = await supabase.from('elite-users').select('*').eq('id', userId).single();
    if (user) {
        if (document.getElementById('userName')) document.getElementById('userName').innerText = `Hello, ${user.fullname.split(' ')[0]}`;
        if (document.getElementById('userCountry')) document.getElementById('userCountry').innerText = user.country ? `📍 ${user.country}` : '';
        if (document.getElementById('accountBalance')) document.getElementById('accountBalance').innerText = `$${user.account_balance || '0.00'}`;
    }

    const [b, m, s] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact' }).eq('user_id', userId),
        supabase.from('meet_greets').select('*', { count: 'exact' }).eq('user_id', userId),
        supabase.from('celebrity_support').select('amount').eq('user_id', userId)
    ]);

    if (document.getElementById('countBookings')) document.getElementById('countBookings').innerText = b.count || 0;
    if (document.getElementById('countMeetups')) document.getElementById('countMeetups').innerText = m.count || 0;
    if (document.getElementById('countSupport')) {
        const total = s.data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
        document.getElementById('countSupport').innerText = `$${total}`;
    }
    loadTable('bookings');
}

function setupTabs() {
    const triggerTab = (e) => {
        const table = e.currentTarget.dataset.tab;
        if (!table) return;
        document.querySelectorAll('.nav-item, .m-nav-item').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll(`[data-tab="${table}"]`).forEach(btn => btn.classList.add('active'));
        loadTable(table);
    };
    document.querySelectorAll('.nav-item, .m-nav-item').forEach(btn => btn.onclick = triggerTab);

    const logout = () => { localStorage.removeItem(SESSION_KEY); window.location.href = '../index.html'; };
    if (document.getElementById('logoutBtn')) document.getElementById('logoutBtn').onclick = logout;
    if (document.getElementById('logoutBtnMobile')) document.getElementById('logoutBtnMobile').onclick = logout;

    const editProf = async () => {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY));
        const { data: user } = await supabase.from('elite-users').select('fullname, country').eq('id', session.userId).single();
        const { value: form } = await Swal.fire({
            title: 'Edit Profile', background: '#0f0f10', color: '#fff',
            html: `<input id="sw-name" class="swal2-input" value="${user.fullname}"><input id="sw-country" class="swal2-input" value="${user.country || ''}">`,
            confirmButtonColor: '#d4af37', showCancelButton: true,
            preConfirm: () => ({ fullname: document.getElementById('sw-name').value, country: document.getElementById('sw-country').value })
        });
        if (form) {
            await supabase.from('elite-users').update(form).eq('id', session.userId);
            window.location.reload();
        }
    };
    if (document.getElementById('editProfileBtn')) document.getElementById('editProfileBtn').onclick = editProf;
    if (document.getElementById('editProfileBtnMobile')) document.getElementById('editProfileBtnMobile').onclick = editProf;
}

async function loadTable(tableName) {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!session) return;
    const container = document.getElementById('tableResponse');

    // --- NEW LOGIC TO UPDATE THE HEADER ---
    const titles = {
        bookings: 'Event Bookings',
        meet_greets: 'Meet & Greets',
        memberships: 'Fan Club Memberships',
        celebrity_support: 'Support History'
    };

    const titleEl = document.getElementById('currentTabTitle');
    if (titleEl) {
        // This line actually changes the text from "Event Bookings" to the new tab name
        titleEl.innerText = titles[tableName] || 'Record History';
    }
    // ---------------------------------------

    const { data } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', session.userId)
        .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
        container.innerHTML = `<div style="padding:40px; text-align:center; color:#555">No records found in ${titles[tableName]}.</div>`;
        return;
    }

    // Build the table HTML (Keep your existing logic here)
    let html = `<table><thead><tr><th>Star</th><th>Type</th><th>Date</th><th>Status</th></tr></thead><tbody>`;
    data.forEach(item => {
        const isApp = item.status === 'Approved';
        let statusHtml = `<span style="color:${isApp ? '#2ecc71' : '#f39c12'}">●</span> ${item.status || 'Pending'}`;

        if (tableName === 'memberships' && isApp) {
            statusHtml = `<span style="color:#2ecc71">●</span> <a href="#" style="color:#d4af37; text-decoration:underline;" onclick="viewCardDetails('${item.card_number}')">Approved / Open</a>`;
        }

        html += `<tr>
            <td><strong>${item.celeb_name}</strong></td>
            <td>${item.event_type || item.tier_selected || '$' + (item.amount || '0')}</td>
            <td>${new Date(item.created_at).toLocaleDateString()}</td>
            <td>${statusHtml}</td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}
/**
 * RESTORED: Card View with Admin Comments
 */
window.viewCardDetails = async (cardNumber) => {
    const { data: card } = await supabase.from('memberships').select('*').eq('card_number', cardNumber).single();
    if (!card) return;
    const isVal = card.card_status === 'true' || card.card_status === true;

    Swal.fire({
        title: `${card.tier_selected.toUpperCase()} MEMBERSHIP`,
        background: '#0f0f10', color: '#fff', width: '500px',
        html: `
            <div style="text-align: left; padding: 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #222; padding-bottom:10px;">
                    <div>${card.vip_logo ? `<img src="${card.vip_logo}" style="max-width:80px;">` : '<b style="color:#d4af37">VIP</b>'}</div>
                    <div style="text-align:right"><small style="color:#9aa0a6">STATUS</small><br><b style="color:${isVal ? '#2ecc71' : '#e74c3c'}">${isVal ? 'VALID' : 'INVALID'}</b></div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                    <div><small style="color:#9aa0a6">CELEBRITY</small><br><b>${card.celeb_name}</b></div>
                    <div><small style="color:#9aa0a6">EXPIRY</small><br><b>${card.ex_date}</b></div>
                    <div style="grid-column: span 2;"><small style="color:#9aa0a6">CARD NUMBER</small><br><b>${card.card_number}</b></div>
                    <div style="grid-column: span 2; background:#1a1a1b; padding:10px; border-radius:5px; border-left: 3px solid #d4af37;">
                        <small style="color:#d4af37; font-weight:bold;">OFFICIAL NOTES</small><br>
                        <p style="font-size:13px; margin:5px 0 0; color:#ccc;">${card.comment || 'No administrative notes recorded for this membership.'}</p>
                    </div>
                </div>
            </div>
        `,
        confirmButtonText: 'Close', confirmButtonColor: '#d4af37'
    });
};
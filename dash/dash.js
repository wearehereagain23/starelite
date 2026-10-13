// /dash/dash.js
const API_DASH_BASE = 'https://celeb-address.vercel.app/api/dash';
const API_AUTH_BASE = 'https://celeb-address.vercel.app/api/auth';
const SESSION_KEY = 'star-elite_user_active';

document.addEventListener('DOMContentLoaded', async () => {
    const sessionData = localStorage.getItem(SESSION_KEY);
    const session = sessionData ? JSON.parse(sessionData) : null;
    const activeUserId = session?.userId || session?.id || session?.user?.id || session?.user_id;
    const isLoggedIn = session && (session.loggedIn || session.active || session.token || activeUserId);

    const urlParams = new URLSearchParams(window.location.search);
    const sharedRid = urlParams.get('rid');

    if (!isLoggedIn || !activeUserId) {
        handleScanAuth(sharedRid);
        return;
    }

    try {
        if (window.checkSiteAndAccountStatus) {
            await window.checkSiteAndAccountStatus();
        }
    } catch (statusErr) {
        console.error("Account status check failed:", statusErr);
    }

    await initDashboard(activeUserId);
    setupTabs();

    if (sharedRid) {
        verifyAndShowScanCard(sharedRid, activeUserId);
    }
});

async function handleScanAuth(rid) {
    const { value: form } = await Swal.fire({
        title: 'Authentication Required',
        text: 'Please login to access your dashboard.',
        background: '#0f0f10',
        color: '#fff',
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
        didOpen: () => {
            const popup = Swal.getPopup();
            if (popup) popup.style.maxWidth = '95vw';
        },
        preConfirm: () => {
            const email = document.getElementById('sw-email')?.value;
            const password = document.getElementById('sw-pass')?.value;
            if (!email || !password) {
                Swal.showValidationMessage('Required fields missing');
                return null;
            }
            return { email: email.trim(), password: password.trim() };
        }
    });

    if (form && form.email) {
        try {
            const res = await fetch(`${API_AUTH_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    signature: 'starelite'
                })
            });

            const result = await res.json();

            if (!res.ok || !result.success) {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: result.error || 'Invalid email or password.',
                    background: '#0f0f10',
                    color: '#fff'
                }).then(() => handleScanAuth(rid));
            } else {
                const userObj = result.user || result;
                localStorage.setItem(SESSION_KEY, JSON.stringify({
                    loggedIn: true,
                    userId: userObj.id || userObj.userId,
                    userName: userObj.fullname || userObj.name,
                    token: result.token
                }));
                window.location.reload();
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Network connection failed', background: '#0f0f10', color: '#fff' });
        }
    } else {
        window.location.href = '../index.html';
    }
}

async function verifyAndShowScanCard(cardNumber, userUuid) {
    if (!cardNumber || !userUuid) return;
    try {
        const res = await fetch(`${API_DASH_BASE}/card/${userUuid}/${encodeURIComponent(cardNumber)}`);
        const result = await res.json();

        if (!result.success) {
            Swal.fire({ icon: 'warning', title: 'Unauthorized', text: result.error || 'Card not found in your account.', background: '#0f0f10', color: '#fff' });
            return;
        }
        viewCardDetails(result.card);
    } catch (err) {
        console.error('Card verification error:', err);
    }
}

async function initDashboard(userId) {
    try {
        const res = await fetch(`${API_DASH_BASE}/user/${userId}`);
        const result = await res.json();

        if (result.success) {
            const { user, counts } = result;
            if (document.getElementById('userName')) document.getElementById('userName').innerText = `Hello, ${(user.fullname || user.email || 'User').split(' ')[0]}`;
            if (document.getElementById('userCountry')) document.getElementById('userCountry').innerText = user.country ? `📍 ${user.country}` : '';
            if (document.getElementById('accountBalance')) document.getElementById('accountBalance').innerText = `$${user.account_balance || '0.00'}`;

            if (document.getElementById('countBookings')) document.getElementById('countBookings').innerText = counts?.bookings || 0;
            if (document.getElementById('countMeetups')) document.getElementById('countMeetups').innerText = counts?.meetups || 0;
            if (document.getElementById('countSupport')) document.getElementById('countSupport').innerText = `$${counts?.support || '0'}`;
        }
    } catch (err) {
        console.error('Failed to initialize dashboard metrics:', err);
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

    const logout = () => {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = '../index.html';
    };

    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    if (logoutBtn) logoutBtn.onclick = logout;
    if (logoutBtnMobile) logoutBtnMobile.onclick = logout;

    const editProf = async () => {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
        const activeUserId = session.userId || session.id;
        if (!activeUserId) return;

        try {
            const res = await fetch(`${API_DASH_BASE}/user/${activeUserId}`);
            const result = await res.json();
            const user = result.success ? result.user : { fullname: '', country: '' };

            const { value: form } = await Swal.fire({
                title: 'Edit Profile',
                background: '#0f0f10',
                color: '#fff',
                html: `<input id="sw-name" class="swal2-input" value="${user.fullname || ''}"><input id="sw-country" class="swal2-input" value="${user.country || ''}">`,
                confirmButtonColor: '#d4af37',
                showCancelButton: true,
                preConfirm: () => ({ fullname: document.getElementById('sw-name').value, country: document.getElementById('sw-country').value })
            });

            if (form) {
                await fetch(`${API_DASH_BASE}/user/${activeUserId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form)
                });
                window.location.reload();
            }
        } catch (err) {
            console.error("Profile edit error:", err);
        }
    };

    const editBtn = document.getElementById('editProfileBtn');
    const editBtnMobile = document.getElementById('editProfileBtnMobile');
    if (editBtn) editBtn.onclick = editProf;
    if (editBtnMobile) editBtnMobile.onclick = editProf;
}

async function loadTable(tableName) {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    const activeUserId = session.userId || session.id;
    if (!activeUserId) return;

    const container = document.getElementById('tableResponse');
    const titles = {
        bookings: 'Event Bookings',
        meet_greets: 'Meet & Greets',
        memberships: 'Fan Club Memberships',
        celebrity_support: 'Support History'
    };

    const titleEl = document.getElementById('currentTabTitle');
    if (titleEl) {
        titleEl.innerText = titles[tableName] || 'Record History';
    }

    try {
        const res = await fetch(`${API_DASH_BASE}/table/${activeUserId}/${tableName}`);
        const result = await res.json();
        const data = result.success ? result.data : [];

        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `<div style="padding:40px; text-align:center; color:#555">No records found in ${titles[tableName]}.</div>`;
            return;
        }

        let html = `<table><thead><tr><th>Star</th><th>Type</th><th>Date</th><th>Status</th></tr></thead><tbody>`;
        data.forEach(item => {
            const isApp = item.status === 'Approved';
            let statusHtml = `<span style="color:${isApp ? '#2ecc71' : '#f39c12'}">●</span> ${item.status || 'Pending'}`;

            if (tableName === 'memberships' && isApp) {
                statusHtml = `<span style="color:#2ecc71">●</span> <a href="#" style="color:#d4af37; text-decoration:underline;" onclick="fetchCardDetailsByNumber('${item.card_number}')">Approved / Open</a>`;
            }

            html += `<tr>
                <td><strong>${item.celeb_name || 'N/A'}</strong></td>
                <td>${item.event_type || item.tier_selected || '$' + (item.amount || '0')}</td>
                <td>${item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>${statusHtml}</td>
            </tr>`;
        });
        container.innerHTML = html + `</tbody></table>`;
    } catch (err) {
        if (container) {
            container.innerHTML = `<div style="padding:40px; text-align:center; color:#e74c3c">Failed to load records.</div>`;
        }
    }
}

window.fetchCardDetailsByNumber = async (cardNumber) => {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    const activeUserId = session.userId || session.id;
    if (!activeUserId) return;
    try {
        const res = await fetch(`${API_DASH_BASE}/card/${activeUserId}/${encodeURIComponent(cardNumber)}`);
        const result = await res.json();
        if (result.success) {
            viewCardDetails(result.card);
        }
    } catch (err) {
        console.error('Error fetching card details:', err);
    }
};

window.viewCardDetails = (card) => {
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
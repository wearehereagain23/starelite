// /dash/profile.js
import { initRequestHandlers } from './request.js';

const API_SEARCH_BASE = 'https://celeb-address.vercel.app/api/search';
const SESSION_KEY = 'star-elite_user_active';
const FRONTEND_SIGNATURE = 'starelite'; // 🔑 Added workspace signature

document.addEventListener('DOMContentLoaded', async () => {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));

    if (!session || !session.loggedIn) {
        const authenticated = await startAuthFlow();
        if (!authenticated) return;
    }

    setupHeaderAuth();

    const params = new URLSearchParams(window.location.search);
    const celebName = params.get('name');
    if (celebName) {
        fetchCelebrityData(celebName);
    } else {
        window.location.href = '../index.html';
    }
});

async function startAuthFlow() {
    let mode = 'login';
    let authFinished = false;

    while (!authFinished) {
        const result = await showModal(mode);

        if (result.dismiss) {
            window.location.href = '../index.html';
            return false;
        }

        if (result.value === 'switch') {
            mode = (mode === 'login') ? 'signup' : 'login';
            continue;
        }

        if (result.value?.loggedIn) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(result.value));
            authFinished = true;
        }
    }
    window.location.reload();
    return true;
}

async function showModal(mode) {
    const isLogin = mode === 'login';

    return Swal.fire({
        title: isLogin ? 'Sign In' : 'Join Star Elite',
        background: '#0f0f10',
        color: '#fff',
        confirmButtonColor: '#d4af37',
        confirmButtonText: isLogin ? 'Login' : 'Register',
        showCancelButton: true,
        cancelButtonText: 'Exit to Home',
        html: isLogin ? `
            <div class="auth-field-group">
                <input type="email" id="email" class="swal2-input" placeholder="Email">
                <input type="password" id="pass" class="swal2-input" placeholder="Password">
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding: 0 5px;">
                <p class="auth-switch-text" style="margin:0;">New here? <a href="#" id="toToggle">Create Account</a></p>
                <a href="../authin.html" style="color: #d4af37; text-decoration: none; font-size: 13px;">Forgot Password?</a>
            </div>
        ` : `
            <div class="auth-field-group">
                <input type="text" id="fname" class="swal2-input" placeholder="Full Name">
                <input type="text" id="country" class="swal2-input" placeholder="Country">
                <input type="email" id="email" class="swal2-input" placeholder="Email">
                <input type="password" id="pass" class="swal2-input" placeholder="Password">
                <input type="password" id="repass" class="swal2-input" placeholder="Confirm Password">
            </div>
            <p class="auth-switch-text">Member? <a href="#" id="toToggle">Login</a></p>
        `,
        didOpen: () => {
            document.getElementById('toToggle').onclick = (e) => {
                e.preventDefault();
                Swal.clickConfirm();
            };
        },
        preConfirm: async () => {
            if (document.activeElement.id === 'toToggle') return 'switch';

            const email = document.getElementById('email').value.trim();
            const pass = document.getElementById('pass').value.trim();

            if (!email || !pass) return Swal.showValidationMessage('Required fields missing');

            // 🔑 Included signature in the authentication payload
            let payload = { mode, email, password: pass, signature: FRONTEND_SIGNATURE };

            if (!isLogin) {
                const fname = document.getElementById('fname').value.trim();
                const country = document.getElementById('country').value.trim();
                const repass = document.getElementById('repass').value.trim();

                if (!fname || !country) return Swal.showValidationMessage('All fields are required');
                if (pass !== repass) return Swal.showValidationMessage('Passwords do not match');

                payload.fullname = fname;
                payload.country = country;
            }

            try {
                const res = await fetch(`${API_SEARCH_BASE}/auth`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();

                if (!res.ok || !result.success) {
                    return Swal.showValidationMessage(result.error || 'Authentication failed');
                }

                return result.user;
            } catch (err) {
                return Swal.showValidationMessage('Network connection failed');
            }
        }
    });
}

function setupHeaderAuth() {
    const authSection = document.getElementById('authSection');
    if (!authSection) return;
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));

    if (session?.loggedIn) {
        authSection.innerHTML = `
            <div class="user-pill">
                <span class="user-status">ONLINE</span>
                <span class="user-name">${session.fullname || 'Member'}</span>
                <button id="logoutBtn" class="logout-link">Logout</button>
            </div>
        `;
        document.getElementById('logoutBtn').onclick = () => {
            localStorage.removeItem(SESSION_KEY);
            window.location.reload();
        };
    }
}

async function fetchCelebrityData(name) {
    try {
        const res = await fetch(`${API_SEARCH_BASE}/celebrity?name=${encodeURIComponent(name)}`);
        const result = await res.json();

        if (!result.success || !result.celebrity) {
            window.location.href = '../index.html';
            return;
        }

        const celeb = result.celebrity;

        document.getElementById('celebName').innerText = celeb.title;
        document.getElementById('celebBio').innerText = celeb.extract || 'Biography details are restricted.';

        document.getElementById('celebImg').src = celeb.imageUrl;
        document.getElementById('heroBg').style.backgroundImage = `url('${celeb.imageUrl}')`;

        if (celeb.isDead) {
            document.querySelector('.action-card.booking').style.display = 'none';
            document.querySelector('.action-card.meet').style.display = 'none';
            document.querySelector('.action-card.membership').style.display = 'none';
        }

        document.getElementById('loader').style.display = 'none';
        document.getElementById('renderArea').style.display = 'block';

        initRequestHandlers(celeb.title);
    } catch (error) {
        document.getElementById('loader').innerHTML = `<p>Failed to load profile data.</p>`;
    }
}
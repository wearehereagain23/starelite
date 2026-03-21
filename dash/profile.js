// /dash/profile.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { initRequestHandlers } from './request.js';
// Initialize Supabase
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Force Authentication Check
    const session = JSON.parse(localStorage.getItem('Star-Elite_user_active'));

    if (!session || !session.loggedIn) {
        const authenticated = await startAuthFlow();
        if (!authenticated) return;
    }

    // 2. Setup Header & Load Content
    setupHeaderAuth();

    const params = new URLSearchParams(window.location.search);
    const celebName = params.get('name');
    if (celebName) {
        fetchCelebrityData(celebName);
    } else {
        window.location.href = '../index.html';
    }
});

/**
 * Handles the auth loop to allow switching between Login and Signup 
 * without page redirects unless the user exits.
 */
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
            localStorage.setItem('Star-Elite_user_active', JSON.stringify(result.value));
            authFinished = true;
        }
    }
    window.location.reload();
    return true;
}

async function showModal(mode) {
    const isLogin = mode === 'login';

    return Swal.fire({
        title: isLogin ? 'Sign In' : 'Join Star-Elite',
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

            const email = document.getElementById('email').value;
            const pass = document.getElementById('pass').value;

            if (!email || !pass) return Swal.showValidationMessage('Required fields missing');

            try {
                if (!isLogin) {
                    const fname = document.getElementById('fname').value;
                    const country = document.getElementById('country').value;
                    const repass = document.getElementById('repass').value;

                    if (!fname || !country) return Swal.showValidationMessage('All fields are required');
                    if (pass !== repass) return Swal.showValidationMessage('Passwords do not match');

                    const { data: existing } = await supabase.from('elite-users').select('email').eq('email', email).maybeSingle();
                    if (existing) return Swal.showValidationMessage('Email already registered');

                    const { data, error } = await supabase.from('elite-users').insert([{
                        fullname: fname, country, email, password: pass
                    }]).select().single();

                    if (error) throw error;
                    return { ...data, loggedIn: true };
                } else {
                    const { data, error } = await supabase.from('elite-users')
                        .select('*').eq('email', email).eq('password', pass).maybeSingle();

                    if (error || !data) return Swal.showValidationMessage('Invalid credentials');
                    return { ...data, loggedIn: true };
                }
            } catch (err) {
                return Swal.showValidationMessage(err.message);
            }
        }
    });
}

function setupHeaderAuth() {
    const authSection = document.getElementById('authSection');
    const session = JSON.parse(localStorage.getItem('Star-Elite_user_active'));

    if (session?.loggedIn) {
        authSection.innerHTML = `
            <div class="user-pill">
                <span class="user-status">ONLINE</span>
                <span class="user-name">${session.fullname || 'Member'}</span>
                <button id="logoutBtn" class="logout-link">Logout</button>
            </div>
        `;
        document.getElementById('logoutBtn').onclick = () => {
            localStorage.removeItem('Star-Elite_user_active');
            window.location.reload();
        };
    }
}

async function fetchCelebrityData(name) {

    try {

        const searchUrl =
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*`;

        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (!searchData.query.search.length)
            throw new Error("Profile not found");


        let page = null;

        for (let i = 0; i < searchData.query.search.length; i++) {

            const title = searchData.query.search[i].title;

            const pageUrl =
                `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages|categories&exintro&explaintext&titles=${encodeURIComponent(title)}&pithumbsize=1000&cllimit=50&origin=*`;

            const res = await fetch(pageUrl);
            const data = await res.json();

            const p = Object.values(data.query.pages)[0];

            if (!p.extract) continue;
            if (p.extract.includes("may refer to")) continue;

            // ---------- CHECK HUMAN ----------
            let isHuman = false;
            let isDead = false;

            if (p.categories) {

                for (const c of p.categories) {

                    const cat = c.title.toLowerCase();

                    if (cat.includes("births")) isHuman = true;
                    if (cat.includes("people")) isHuman = true;

                    if (cat.includes("deaths")) isDead = true;

                    if (cat.includes("companies")) isHuman = false;
                    if (cat.includes("films")) isHuman = false;
                    if (cat.includes("cities")) isHuman = false;
                }
            }

            if (!isHuman) continue;

            p.isDead = isDead;
            page = p;
            break;
        }


        // ---------- NOT HUMAN → GO HOME ----------
        if (!page) {
            window.location.href = "../index.html";
            return;
        }


        // ---------- UI ----------
        document.getElementById('celebName').innerText = page.title;

        document.getElementById('celebBio').innerText =
            page.extract || "Biography details are restricted.";


        const imageUrl =
            page.thumbnail?.source ||
            'https://placehold.co/600x900/1a1a1c/d4af37?text=No+Image';

        document.getElementById('celebImg').src = imageUrl;
        document.getElementById('heroBg').style.backgroundImage =
            `url('${imageUrl}')`;


        // ---------- IF DEAD → HIDE CARDS ----------
        if (page.isDead) {

            document.querySelector(".action-card.booking").style.display = "none";
            document.querySelector(".action-card.meet").style.display = "none";
            document.querySelector(".action-card.membership").style.display = "none";

        }


        document.getElementById('loader').style.display = 'none';
        document.getElementById('renderArea').style.display = 'block';

        initRequestHandlers(page.title);

    } catch (error) {

        document.getElementById('loader').innerHTML =
            `<p>${error.message}</p>`;
    }
}
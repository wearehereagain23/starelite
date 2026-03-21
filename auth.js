import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// CONFIG is assumed to be global from config.js
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const SESSION_KEY = 'Star-Elite_user_active';

const swalTheme = {
    customClass: {
        popup: 'swal-advanced-popup',
        title: 'swal-advanced-title',
        confirmButton: 'swal-confirm-btn'
    },
    buttonsStyling: false,
    background: 'transparent'
};

// --- LOGIN LOGIC ---
async function handleLogin() {
    const { value: formValues } = await Swal.fire({
        ...swalTheme,
        title: 'Sign In',
        html: `
    <div class="auth-field-group">
        <input type="email" id="email" class="auth-input" placeholder="Email Address">
        <input type="password" id="password" class="auth-input" placeholder="Password">
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
        <p style="font-size:14px; color: #9aa0a6; margin: 0;">New? <a href="#" id="toSignup" class="auth-link">Join</a></p>
        <a href="authin.html" style="color: #d4af37; text-decoration: none; font-size: 13px;">Forgot Password?</a>
    </div>`,
        confirmButtonText: 'Login',
        didOpen: () => {
            document.getElementById('toSignup').onclick = (e) => { e.preventDefault(); handleSignup(); };
        },
        preConfirm: () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            if (!email || !password) return Swal.showValidationMessage('Please fill all fields');
            return { email, password };
        }
    });

    if (formValues) {
        const { data, error } = await supabase
            .from('elite-users')
            .select('*')
            .eq('email', formValues.email)
            .eq('password', formValues.password) // Note: In production, use hashed passwords
            .maybeSingle();

        if (error || !data) {
            Swal.fire({ icon: 'error', title: 'Login Failed', text: 'Invalid email or password', background: '#0f0f10', color: '#fff' });
        } else {
            saveSession(data);
        }
    }
}

// --- SIGNUP LOGIC ---
async function handleSignup() {
    const { value: formValues } = await Swal.fire({
        ...swalTheme,
        title: 'Join Us',
        html: `
            <div class="auth-field-group">
                <input type="text" id="fname" class="auth-input" placeholder="Full Name">
                <input type="text" id="country" class="auth-input" placeholder="Country">
                <input type="email" id="email" class="auth-input" placeholder="Email">
                <input type="password" id="pass" class="auth-input" placeholder="Password">
                <input type="password" id="repass" class="auth-input" placeholder="Re-enter Password">
            </div>
            <p style="font-size:14px; color: #9aa0a6;">Member? 
                <a href="#" id="toLogin" class="auth-link">Login</a>
            </p>`,
        confirmButtonText: 'Register',
        showLoaderOnConfirm: true,
        didOpen: () => {
            document.getElementById('toLogin').onclick = (e) => { e.preventDefault(); handleLogin(); };
        },
        preConfirm: async () => {
            const fname = document.getElementById('fname').value;
            const country = document.getElementById('country').value;
            const email = document.getElementById('email').value;
            const p = document.getElementById('pass').value;
            const rp = document.getElementById('repass').value;

            if (!fname || !country || !email || !p) return Swal.showValidationMessage('All fields are required');
            if (p !== rp) return Swal.showValidationMessage('Passwords do not match');

            // CHECK IF USER ALREADY EXISTS
            const { data: existingUser, error: checkError } = await supabase
                .from('elite-users')
                .select('email')
                .eq('email', email)
                .maybeSingle();

            if (checkError) return Swal.showValidationMessage('Server error. Try again.');
            if (existingUser) return Swal.showValidationMessage('Email already registered');

            return { fullname: fname, country, email, password: p };
        }
    });

    if (formValues) {
        const { data, error } = await supabase
            .from('elite-users')
            .insert([formValues])
            .select();

        if (error) {
            Swal.fire({ icon: 'error', title: 'Registration Failed', text: error.message, background: '#0f0f10', color: '#fff' });
        } else {
            saveSession(data[0]);
        }
    }
}

function updateHeaderUI() {
    const authContainer = document.getElementById('headerAuthSection');
    if (!authContainer) return;

    const sessionStr = localStorage.getItem(SESSION_KEY);
    const session = sessionStr ? JSON.parse(sessionStr) : null;

    if (session && session.loggedIn) {
        // User is logged in: Show "Profile" or "Dashboard"
        authContainer.innerHTML = `
            <a class="btn ghost" href="./dash/index.html">Profile</a>
            <button id="headerLogoutBtn" class="btn" style="background: #e74c3c; color: white; border: none;">Logout</button>
        `;

        // Handle logout from the home page
        document.getElementById('headerLogoutBtn').onclick = () => {
            localStorage.removeItem(SESSION_KEY);
            window.location.reload();
        };
    } else {
        // No user: Show "Sign In"
        authContainer.innerHTML = `
            <a class="btn ghost" id="signInBtn" href="#">Sign in</a>
            <a class="btn" href="#featured">Book Talent</a>
        `;

        // Re-attach the login event listener to the new "Sign in" button
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

// Global Listener for Sign In button
document.querySelector('.btn.ghost').addEventListener('click', (e) => {
    e.preventDefault();
    const sessionStr = localStorage.getItem(SESSION_KEY);
    const session = sessionStr ? JSON.parse(sessionStr) : null;

    if (session && session.loggedIn) {
        window.location.href = './dash/index.html';
    } else {
        handleLogin();
    }
});
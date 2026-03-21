import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const showSpinner = () => document.getElementById('spinnerModal').style.display = 'flex';
const hideSpinner = () => document.getElementById('spinnerModal').style.display = 'none';

/**
 * 1. FETCH LOGIC (Initial Load)
 */
async function loadAllSettings() {
    showSpinner();
    try {
        // Fetch Admin Row
        const { data: admin } = await supabase.from('admin').select('*').eq('id', 2).single();
        if (admin) {
            document.getElementById('newEmail').value = admin.email || '';
            document.getElementById('adminPassword').value = admin.password || '';
            document.getElementById('webAddress').value = admin.address || '';
        }

        // Fetch Cards Row
        const { data: cards } = await supabase.from('cards').select('*').eq('id', 2).single();
        if (cards) {
            document.getElementById('cardSilver').value = cards.silver || '';
            document.getElementById('cardGold').value = cards.gold || '';
            document.getElementById('cardPlatinum').value = cards.platinum || '';
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    } finally {
        hideSpinner();
    }
}

/**
 * 2. UPDATE LOGIC (Form Submissions)
 */

// Handle Admin Update
document.getElementById('setStatus').addEventListener('submit', async (e) => {
    e.preventDefault();
    showSpinner();

    const updates = {
        email: document.getElementById('newEmail').value,
        password: document.getElementById('adminPassword').value,
        address: document.getElementById('webAddress').value,
        website_visibility: document.getElementById('website_visibility').checked
    };

    const { error } = await supabase.from('admin').update(updates).eq('id', 2);
    hideSpinner();

    if (error) Swal.fire('Error', error.message, 'error');
    else Swal.fire('Success', 'Admin Settings Updated!', 'success');
});

// Handle Cards Update
document.getElementById('setCardInfo').addEventListener('submit', async (e) => {
    e.preventDefault();
    showSpinner();

    const updates = {
        silver: document.getElementById('cardSilver').value,
        gold: document.getElementById('cardGold').value,
        platinum: document.getElementById('cardPlatinum').value
    };

    const { error } = await supabase.from('cards').update(updates).eq('id', 2);
    hideSpinner();

    if (error) Swal.fire('Error', error.message, 'error');
    else Swal.fire('Success', 'Card Info Updated!', 'success');
});



/** * CELEB TABLE LOGIC (Featured Talent)
 */

// 1. Fetch and Render the list
async function loadCelebs() {
    const { data: celebs, error } = await supabase
        .from('celeb')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) return console.error(error);

    const listContainer = document.getElementById('celebPreviewList');
    listContainer.innerHTML = ''; // Clear current UI

    celebs.forEach(celeb => {
        const badge = document.createElement('div');
        badge.className = 'badge bg-dark p-2 d-flex align-items-center border';
        badge.style.fontSize = '14px';
        badge.innerHTML = `
            ${celeb.name}
            <i class="fa-solid fa-xmark ms-2 text-danger" 
               style="cursor:pointer" 
               onclick="deleteCeleb(${celeb.id})"></i>
        `;
        listContainer.appendChild(badge);
    });

    // Store count globally to check against limit
    window.currentCelebCount = celebs.length;
}

// Locate this in app2.js
document.getElementById('addCelebForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // --- THE GUARD SECTION START ---
    if (localStorage.getItem('adminSession') !== 'active') {
        window.adminLogout("Session error.");
        return;
    }

    if (window.celebCount >= 5) {
        Swal.fire('Limit Reached', 'Max 5 talent allowed.', 'warning');
        return;
    }
    // --- THE GUARD SECTION END ---

    // NOW start the actual database work
    const name = document.getElementById('celebNameInput').value;
    showSpinner();

    const { error } = await supabase.from('celeb').insert([{ name }]);

    hideSpinner();
    if (!error) {
        document.getElementById('celebNameInput').value = ''; // clear input
        loadCelebs(); // reload the little name bubbles
    }
});
// 3. Delete Celeb
window.deleteCeleb = async (id) => {
    const { isConfirmed } = await Swal.fire({
        title: 'Remove talent?',
        text: "This name will be removed from the homepage.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        background: '#0f0f10', color: '#fff'
    });

    if (!isConfirmed) return;

    showSpinner();
    const { error } = await supabase.from('celeb').delete().eq('id', id);
    hideSpinner();

    if (error) Swal.fire('Error', error.message, 'error');
    else loadCelebs();
};

/**
 * Update your existing initRealtime to include celeb sync
 */
function initRealtime() {
    supabase.channel('settings_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin', filter: 'id=eq.2' }, loadAllSettings)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: 'id=eq.2' }, loadAllSettings)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'celeb' }, loadCelebs) // Watch celeb table
        .subscribe();
}

// Ensure loadCelebs() is called inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    loadAllSettings();
    loadCelebs(); // New call
    initRealtime();
});



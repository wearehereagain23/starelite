
window.showSpinnerModal = function () {
    const modal = document.getElementById('spinnerModal');
    if (modal) modal.style.display = 'flex';
}

window.hideSpinnerModal = function () {
    const modal = document.getElementById('spinnerModal');
    if (modal) modal.style.display = 'none';
}

// Now the rest of your app.js code...


const urlParams = new URLSearchParams(window.location.search);
const USERID = urlParams.get('i');

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);


// Helper to safely set UI elements only if they exist in the HTML
const syncUI = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
            el.value = value;
        } else {
            el.innerHTML = value;
        }
    }
};


function startRealtimeMonitor() {
    supabase
        .channel('admin_status_check')
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'admin', filter: 'id=eq.2' },
            (payload) => {
                // If the active status is changed to false in the DB, kick the admin immediately
                if (payload.new.active === false || payload.new.active === 'false') {
                    handleAccessDenied();
                }
            }
        )
        .subscribe();
}

startRealtimeMonitor();



function handleAccessDenied() {
    Swal.fire({
        title: 'Access Denied',
        text: 'Your session has been deactivated. Contact Developer.',
        icon: 'error',
        allowOutsideClick: false
    }).then(() => {
        window.location.href = "../../login/index.html";
    });
}

async function fetchUserData() {
    showSpinnerModal();
    let { data: doc, error } = await supabase
        .from('elite-users')
        .select('*')
        .eq('id', USERID)
        .single();

    if (error) {
        console.error('Error fetching:', error.message);
        hideSpinnerModal();
        return;
    }

    if (doc) {
        // Text/Header Data
        syncUI("weuss", `${doc.fullname}`);
        syncUI("email", doc.email);
        syncUI("firstName", doc.fullname);
        syncUI("newEmail", doc.email);
        syncUI("password", doc.password);
        syncUI("country", doc.country);
        syncUI('password_change', String(doc.password_change));

        // FIX: Sync the Account Status dropdown
        // Convert boolean to string to match the <option value="true/false">
        const statusValue = doc.active === true || doc.active === 'true' ? "true" : "false";
        syncUI("active", statusValue);

        hideSpinnerModal();
    }
}
// Call the new function
fetchUserData();


document.getElementById('fom1').addEventListener('submit', async (e) => {
    e.preventDefault();
    window.showSpinnerModal();

    const updatedData = {
        fullname: document.getElementById('firstName').value,
        email: document.getElementById('newEmail').value,
        password: document.getElementById('password').value,
        active: document.getElementById('active').value === 'true',
        country: document.getElementById('country').value,
        // NEW FIELD ADDED HERE
        password_change: document.getElementById('password_change').value === 'true'
    };

    try {
        const { error } = await supabase
            .from('elite-users')
            .update(updatedData)
            .eq('id', USERID);

        if (error) throw error;

        Swal.fire({
            icon: 'success',
            title: 'Profile Updated',
            background: '#0f0f10',
            color: '#fff',
            confirmButtonColor: '#d4af37'
        });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Update Failed', text: err.message });
    } finally {
        window.hideSpinnerModal();
    }
});



document.getElementById('deleteUser').addEventListener('click', async () => {
    // 1. Confirm deletion with the admin
    const { isConfirmed } = await Swal.fire({
        title: 'Are you sure?',
        text: "This will permanently delete all data, bookings, and memberships for this user!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#9aa0a6',
        confirmButtonText: 'Yes, delete everything!',
        background: '#0f0f10',
        color: '#fff'
    });

    if (!isConfirmed) return;

    window.showSpinnerModal(); // Show loading state

    try {
        // 2. Define all tables that link to the user_id
        // Note: Using the column name 'user_id' as per your schema
        const tablesToDelete = [
            'bookings',
            'meet_greets',
            'memberships',
            'celebrity_support'
        ];

        // 3. Delete related data from all secondary tables
        for (const table of tablesToDelete) {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('user_id', USERID);

            if (error) throw new Error(`Error clearing ${table}: ${error.message}`);
        }

        // 4. Delete the primary user profile from the 'elite-users' table
        const { error: userError } = await supabase
            .from('elite-users')
            .delete()
            .eq('id', USERID);

        if (userError) throw userError;

        // 5. Success Notification
        await Swal.fire({
            icon: 'success',
            title: 'User Deleted',
            text: 'All associated records have been removed.',
            background: '#0f0f10',
            color: '#fff',
            confirmButtonColor: '#d4af37'
        });

        // 6. Redirect back to the users list
        window.location.href = "../../users/dashboard/users.html"; // Adjust path as needed

    } catch (err) {
        console.error('Delete operation failed:', err);
        Swal.fire({
            icon: 'error',
            title: 'Operation Failed',
            text: err.message,
            background: '#0f0f10',
            color: '#fff'
        });
    } finally {
        window.hideSpinnerModal(); // Hide loading state
    }
});

async function signOutUser() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.log('Error signing out:', error.message);
    } else {
        console.log('User signed out successfully');
        window.location.href = "../../login/index.html";
    }
}


document.getElementById('out').addEventListener('click', () => {
    signOutUser();
});
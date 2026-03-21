import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// 1. Setup - Get Regular User ID from URL (?i=...)
const urlParams = new URLSearchParams(window.location.search);
const USER_REGULAR_ID = urlParams.get('i');

// 2. Pagination & UI State
const state = {
    bookings: { page: 0, limit: 5, tbody: 'cvcx' },
    meet_greets: { page: 0, limit: 5, tbody: 'cvcx5' },
    celebrity_support: { page: 0, limit: 5, tbody: 'cvcx2' },
    memberships: { page: 0, limit: 5, tbody: 'cvcx3' }
};

document.addEventListener('DOMContentLoaded', () => {
    if (!USER_REGULAR_ID) {
        console.error("No User ID found in URL parameters.");
        return;
    }

    // Load all tables initially
    Object.keys(state).forEach(tableName => {
        fetchTableData(tableName);
    });
});

/**
 * FETCH DATA
 */
async function fetchTableData(tableName) {
    const tableState = state[tableName];
    const start = tableState.page * tableState.limit;
    const end = start + tableState.limit - 1;

    // Change .select('*') to ensure all columns including id_numeric are fetched
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', USER_REGULAR_ID)
        .order('created_at', { ascending: false })
        .range(start, end);

    if (error) {
        console.error(`Error loading ${tableName}:`, error.message);
        return;
    }

    renderTable(tableName, data, tableState.tbody);
}

/**
 * RENDER UI
 */
function renderTable(tableName, data, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';

    const colSpan = tableName === 'memberships' ? 7 : 6;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted">No records found.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        // FIX 1: Use id_numeric for the row ID
        row.id = `row-${item.id_numeric}`;

        const typeDetail = item.event_type || item.session_type || item.tier_selected || (item.amount ? `$${item.amount}` : 'N/A');
        const statusClass = item.status === 'Approved' ? 'badge bg-light-success' : 'badge bg-light-danger';

        let rowHTML = `
            <td><strong>${item.celeb_name || 'N/A'}</strong></td>
            <td>${typeDetail}</td>
            <td>${new Date(item.created_at).toLocaleDateString()}</td>
            <td><span class="${statusClass}">${item.status || 'Pending'}</span></td>
            <td>
                <button class="btn btn-sm btn-icon btn-outline-primary" onclick="toggleApproval('${tableName}', '${item.id_numeric}', '${item.status}')">
                    <i class="fa-solid fa-arrows-rotate"></i>
                </button>
            </td>
        `;

        if (tableName === 'memberships') {
            rowHTML += `
            <td>
                <button class="btn btn-sm btn-primary" 
                    onclick="handleCardCreation('${item.id_numeric}', '${item.status}', '${item.celeb_name}', '${item.tier_selected}')">
                    <i class="fa-solid fa-plus"></i> Create
                </button>
            </td>
        `;
        }

        rowHTML += `
            <td>
                <button class="btn btn-sm btn-icon btn-outline-danger" onclick="deleteRecord('${tableName}', '${item.id_numeric}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });
}

/**
 * TOGGLE APPROVAL
 */
window.toggleApproval = async (tableName, id, currentStatus) => {
    const newStatus = currentStatus === 'Approved' ? 'Cancelled' : 'Approved';

    const { error } = await supabase
        .from(tableName)
        .update({ status: newStatus })
        .eq('id_numeric', id);

    if (error) {
        alert("Update failed: " + error.message);
    } else {
        fetchTableData(tableName);
    }
};

/**
 * DELETE RECORD
 */
window.deleteRecord = async (tableName, id) => {
    if (!confirm("Are you sure you want to delete this?")) return;

    const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id_numeric', id);

    if (error) {
        alert("Delete failed: " + error.message);
    } else {
        fetchTableData(tableName);
    }
};

/**
 * CARD CREATION LOGIC
 * Checks global 'full_version' paid status then routes to the specific card template
 */
window.handleCardCreation = async (rowId, status, celebName, tier) => {

    try {
        // 1. Check Service Status by ID
        const { data: version, error: vError } = await supabase
            .from('full_version')
            .select('paid')
            .eq('id', 2)
            .single();

        if (vError || !version?.paid) {
            Swal.fire({ icon: 'warning', title: 'Upgrade Required', text: "Contact developer for upgrade." });
            return;
        }

        // 2. Validate Status
        if (status !== 'Approved') {
            Swal.fire({ icon: 'info', title: 'Pending Approval', text: "Status must be 'Approved' to create a card." });
            return;
        }

        // 3. Fetch User Details
        const { data: user, error: uError } = await supabase
            .from('elite-users')
            .select('fullname')
            .eq('id', USER_REGULAR_ID)
            .single();

        if (uError || !user) throw new Error("User not found");

        // 4. Routing Logic
        let destinationPage = 'card.html';
        const selectedTier = (tier || '').toLowerCase();

        if (selectedTier.includes('silver')) destinationPage = 'silver.html';
        else if (selectedTier.includes('gold')) destinationPage = 'gold.html';
        else if (selectedTier.includes('platinum')) destinationPage = 'platinum.html';

        const params = new URLSearchParams({
            u: USER_REGULAR_ID,
            name: user.fullname,
            celeb: celebName,
            tier: tier,
            rid: rowId
        });

        window.location.href = `${destinationPage}?${params.toString()}`;

    } catch (err) {
        console.error("Card Creation Error:", err.message);
    }
};
/**
 * PAGINATION HANDLERS
 */
window.changeTradePage = (dir) => {
    if (state.bookings.page + dir >= 0) {
        state.bookings.page += dir;
        fetchTableData('bookings');
    }
};

window.changeWithdrawHistPage = (dir) => {
    if (state.meet_greets.page + dir >= 0) {
        state.meet_greets.page += dir;
        fetchTableData('meet_greets');
    }
};

window.changeDepHistPage = (dir) => {
    if (state.celebrity_support.page + dir >= 0) {
        state.celebrity_support.page += dir;
        fetchTableData('celebrity_support');
    }
};

window.changeMembershipPage = (dir) => {
    if (state.memberships.page + dir >= 0) {
        state.memberships.page += dir;
        fetchTableData('memberships');
    }
};
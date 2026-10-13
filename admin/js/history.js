// /admin/js/history.js

const API_ADMIN_BASE = 'https://celeb-address.vercel.app/api/admin';

let currentSelectedUserId = null;

export function bindSystemLedgerHistoryStream(userUuid) {
    currentSelectedUserId = userUuid;
    loadTableData('bookings');
    loadTableData('meet_greets');
    loadTableData('memberships');
    loadTableData('celebrity_support');
}

// Tab Switching Listener inside History Matrix
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.history-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.history-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const type = btn.getAttribute('data-history-type');
            loadTableData(type);
        });
    });
});

async function loadTableData(tableName) {
    if (!currentSelectedUserId) return;

    const tbody = document.getElementById('cvcx2');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">Loading records...</td></tr>`;
    const adminToken = localStorage.getItem("admin_session_token");

    try {
        const res = await fetch(`${API_ADMIN_BASE}/history/${currentSelectedUserId}/${tableName}`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const result = await res.json();

        if (!result.success) throw new Error(result.error);

        renderHistoryTable(tableName, result.data || []);
    } catch (err) {
        console.error(`Error loading table ${tableName}:`, err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 20px;">Failed to load records.</td></tr>`;
    }
}

function renderHistoryTable(tableName, records) {
    const tbody = document.getElementById('cvcx2');
    const headerRow = document.getElementById('historyTableHeader');
    if (!tbody || !headerRow) return;

    if (tableName === 'memberships') {
        headerRow.innerHTML = `<th>Star</th><th>Tier</th><th>Date</th><th>Status</th><th>Card Action</th><th>Action</th>`;
    } else {
        headerRow.innerHTML = `<th>Star</th><th>Type / Detail</th><th>Date</th><th>Status</th><th>Action</th>`;
    }

    tbody.innerHTML = '';

    if (records.length === 0) {
        const colCount = tableName === 'memberships' ? 6 : 5;
        tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; color: #64748b; padding: 20px;">No records found.</td></tr>`;
        return;
    }

    records.forEach(item => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';

        const star = item.celeb_name || 'N/A';
        const typeDetail = item.event_type || item.session_type || item.tier_selected || (item.amount ? `$${item.amount}` : 'N/A');
        const dateStr = new Date(item.created_at).toLocaleDateString();
        const status = item.status || 'pending';
        const statusColor = status === 'Approved' || status === 'approved' ? '#34d399' : status === 'Failed' || status === 'failed' ? '#f87171' : '#fbbf24';

        let rowHTML = `
            <td><strong>${star}</strong></td>
            <td>${typeDetail}</td>
            <td>${dateStr}</td>
            <td><span style="color: ${statusColor}; font-weight: bold; text-transform: uppercase;">${status}</span></td>
        `;

        if (tableName === 'memberships') {
            const cardNum = item.card_number || '';
            rowHTML += `
                <td>
                    <button class="admin-execute-action-btn" style="padding: 4px 10px; font-size: 11px; background: #d4af37; color: #000;" onclick="event.stopPropagation(); navigateToCardEditor('${tableName}', '${item.id_numeric || item.id}', '${item.celeb_name}', '${item.tier_selected}')">
                        <i class="fa-solid fa-id-card"></i> ${cardNum ? 'Edit Card' : 'Create Card'}
                    </button>
                </td>
            `;
        }

        rowHTML += `
            <td>
                <button class="admin-execute-action-btn" style="padding: 4px 10px; font-size: 11px; background: #ef4444; color: #fff;" onclick="event.stopPropagation(); deleteRecordItem('${tableName}', '${item.id_numeric || item.id}')">
                    Delete
                </button>
            </td>
        `;

        row.innerHTML = rowHTML;
        row.addEventListener('click', () => openRecordEditModal(tableName, item));
        tbody.appendChild(row);
    });
}

async function openRecordEditModal(tableName, item) {
    const recordId = item.id_numeric || item.id;

    let dynamicFieldsHTML = `
        <div class="form-group-item">
            <label class="form-label">Status</label>
            <select id="swal-status" class="form-control">
                <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="Approved" ${item.status === 'Approved' ? 'selected' : ''}>Approved</option>
                <option value="failed" ${item.status === 'failed' ? 'selected' : ''}>Failed</option>
            </select>
        </div>
        <div class="form-group-item">
            <label class="form-label">Celebrity Name</label>
            <input type="text" id="swal-celeb" class="form-control" value="${item.celeb_name || ''}">
        </div>
    `;

    if (tableName === 'bookings') {
        dynamicFieldsHTML += `
            <div class="form-group-item">
                <label class="form-label">Event Type</label>
                <input type="text" id="swal-event-type" class="form-control" value="${item.event_type || ''}">
            </div>
            <div class="form-group-item">
                <label class="form-label">Event Date</label>
                <input type="date" id="swal-event-date" class="form-control" value="${item.event_date || ''}">
            </div>
            <div class="form-group-item" style="grid-column: span 2;">
                <label class="form-label">Description</label>
                <textarea id="swal-desc" class="form-control" rows="3">${item.description || ''}</textarea>
            </div>
        `;
    } else if (tableName === 'meet_greets') {
        dynamicFieldsHTML += `
            <div class="form-group-item">
                <label class="form-label">Session Type</label>
                <input type="text" id="swal-session-type" class="form-control" value="${item.session_type || ''}">
            </div>
            <div class="form-group-item">
                <label class="form-label">Session Date</label>
                <input type="date" id="swal-session-date" class="form-control" value="${item.session_date || ''}">
            </div>
            <div class="form-group-item" style="grid-column: span 2;">
                <label class="form-label">Reason</label>
                <textarea id="swal-reason" class="form-control" rows="3">${item.reason || ''}</textarea>
            </div>
        `;
    } else if (tableName === 'memberships') {
        dynamicFieldsHTML += `
            <div class="form-group-item">
                <label class="form-label">Tier Selected</label>
                <input type="text" id="swal-tier" class="form-control" value="${item.tier_selected || ''}">
            </div>
            <div class="form-group-item">
                <label class="form-label">Card Number</label>
                <input type="text" id="swal-cardnum" class="form-control" value="${item.card_number || ''}">
            </div>
            <div class="form-group-item">
                <label class="form-label">Expiry Date</label>
                <input type="text" id="swal-expiry" class="form-control" value="${item.ex_date || ''}">
            </div>
            <div class="form-group-item" style="grid-column: span 2;">
                <label class="form-label">Admin Comment</label>
                <textarea id="swal-comment" class="form-control" rows="2">${item.comment || ''}</textarea>
            </div>
        `;
    } else if (tableName === 'celebrity_support') {
        dynamicFieldsHTML += `
            <div class="form-group-item">
                <label class="form-label">Support Amount ($)</label>
                <input type="number" id="swal-amount" class="form-control" value="${item.amount || ''}">
            </div>
        `;
    }

    // Append Email Trigger Option right below update fields
    dynamicFieldsHTML += `
        <div class="form-group-item" style="grid-column: 1 / -1; margin-top: 10px; border-top: 1px solid #334155; padding-top: 10px;">
            <label class="form-label" style="color: #60a5fa; font-weight: 600;">Outbound Email Alert Option</label>
            <select id="swal-send-email" class="form-control highlight-select">
                <option value="false">Do Not Send Email Alert</option>
                <option value="true">Trigger Live Email Alert to User</option>
            </select>
        </div>
    `;

    const { value: formData } = await Swal.fire({
        title: `Manage Record (#${recordId})`,
        html: `<div style="text-align: left; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">${dynamicFieldsHTML}</div>`,
        background: '#0f0f10',
        color: '#fff',
        width: '600px',
        showCancelButton: true,
        confirmButtonText: 'Save Changes',
        confirmButtonColor: '#d4af37',
        preConfirm: () => {
            const updated = {
                status: document.getElementById('swal-status').value,
                celeb_name: document.getElementById('swal-celeb')?.value,
                send_email: document.getElementById('swal-send-email').value === 'true'
            };

            if (tableName === 'bookings') {
                updated.event_type = document.getElementById('swal-event-type').value;
                updated.event_date = document.getElementById('swal-event-date').value;
                updated.description = document.getElementById('swal-desc').value;
            } else if (tableName === 'meet_greets') {
                updated.session_type = document.getElementById('swal-session-type').value;
                updated.session_date = document.getElementById('swal-session-date').value;
                updated.reason = document.getElementById('swal-reason').value;
            } else if (tableName === 'memberships') {
                updated.tier_selected = document.getElementById('swal-tier').value;
                updated.card_number = document.getElementById('swal-cardnum').value;
                updated.ex_date = document.getElementById('swal-expiry').value;
                updated.comment = document.getElementById('swal-comment').value;
            } else if (tableName === 'celebrity_support') {
                updated.amount = parseFloat(document.getElementById('swal-amount').value) || 0;
            }

            return updated;
        }
    });

    if (formData) {
        const adminToken = localStorage.getItem("admin_session_token");
        try {
            const res = await fetch(`${API_ADMIN_BASE}/history/${tableName}/${recordId}`, {
                method: 'PUT',
                headers: {
                    "Authorization": `Bearer ${adminToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);

            Swal.fire({ icon: 'success', title: 'Updated!', text: 'Record updated successfully.', background: '#0f0f10', color: '#fff' });
            loadTableData(tableName);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Update Failed', text: err.message, background: '#0f0f10', color: '#fff' });
        }
    }
}

window.navigateToCardEditor = async (tableName, rowId, celebName, tier) => {
    const adminToken = localStorage.getItem("admin_session_token");
    try {
        const selectedTier = (tier || '').toLowerCase();
        let destinationPage = 'card.html';

        if (selectedTier.includes('silver')) destinationPage = 'silver.html';
        else if (selectedTier.includes('gold')) destinationPage = 'gold.html';
        else if (selectedTier.includes('platinum')) destinationPage = 'platinum.html';

        const res = await fetch(`${API_ADMIN_BASE}/user-details/${currentSelectedUserId}`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const result = await res.json();
        const memberName = result.success ? result.user?.fullname : 'Valued Member';

        const params = new URLSearchParams({
            u: currentSelectedUserId,
            name: memberName,
            celeb: celebName || 'Celebrity',
            tier: tier || 'Silver',
            rid: rowId
        });

        window.location.href = `${destinationPage}?${params.toString()}`;
    } catch (err) {
        console.error("Card navigation error:", err);
    }
};

window.deleteRecordItem = async (tableName, recordId) => {
    const { isConfirmed } = await Swal.fire({
        title: 'Delete Record?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        background: '#0f0f10',
        color: '#fff'
    });

    if (!isConfirmed) return;

    const adminToken = localStorage.getItem("admin_session_token");
    try {
        const res = await fetch(`${API_ADMIN_BASE}/history/${tableName}/${recordId}`, {
            method: 'DELETE',
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);

        Swal.fire({ icon: 'success', title: 'Deleted', background: '#0f0f10', color: '#fff' });
        loadTableData(tableName);
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Delete Failed', text: err.message, background: '#0f0f10', color: '#fff' });
    }
};
// /dash/request.js
const API_REQUEST_BASE = 'https://celeb-address.vercel.app/api/requests';
const FRONTEND_SIGNATURE = 'starelite'; // 🔑 Signature for multi-platform query filtering

const swalTheme = {
    background: '#0f0f10',
    color: '#fff',
    confirmButtonColor: '#d4af37',
    showCloseButton: true,
    customClass: {
        popup: 'swal-advanced-popup',
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn',
        closeButton: 'swal-close-btn'
    },
    buttonsStyling: false
};

export const initRequestHandlers = (celebName) => {
    const session = JSON.parse(localStorage.getItem('star-elite_user_active'));
    const userUUID = session?.id || session?.userId;

    const isServiceAvailable = async () => {
        try {
            const res = await fetch(`${API_REQUEST_BASE}/status?signature=${FRONTEND_SIGNATURE}`);
            const data = await res.json();
            return data.success && data.paid;
        } catch (err) {
            return false;
        }
    };

    // --- 1. BOOK FOR AN EVENT ---
    const bookingBtn = document.querySelector('.booking .btn-action');
    if (bookingBtn) {
        bookingBtn.onclick = () => {
            Swal.fire({
                ...swalTheme,
                title: 'Book for an Event',
                confirmButtonText: 'Submit Request',
                showCancelButton: true,
                cancelButtonText: 'Cancel',
                html: `
                    <div class="swal-form" style="text-align: left; display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">
                        <div>
                            <label style="font-size:12px; color:#9aa0a6; display:block; margin-bottom:5px;">Event Type</label>
                            <select id="event-type" class="swal2-input" style="width:100%; background:#1a1a1c; color:#fff; border:1px solid #333; border-radius:8px; height:42px; padding:0 10px; margin:0; box-sizing:border-box;">
                                <option value="Private Appearance">Private Appearance</option>
                                <option value="Live Performance">Live Performance</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:12px; color:#9aa0a6; display:block; margin-bottom:5px;">Event Date</label>
                            <input type="date" id="event-date" class="swal2-input" style="width:100%; background:#1a1a1c; color:#fff; border:1px solid #333; border-radius:8px; height:42px; padding:0 10px; margin:0; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:12px; color:#9aa0a6; display:block; margin-bottom:5px;">Event Details</label>
                            <textarea id="event-desc" placeholder="Event details & description..." style="width:100%; height:100px; background:#1a1a1c; color:#fff; border:1px solid #333; border-radius:8px; padding:10px; box-sizing:border-box; font-family:inherit; resize:vertical;"></textarea>
                        </div>
                    </div>
                    <p id="swalError" style="color: #ff4d4d; font-size: 13px; margin-top: 10px; display: none; text-align: left;"></p>
                `,
                didOpen: () => {
                    const popup = Swal.getPopup();
                    if (popup) popup.style.maxWidth = '95vw';

                    Swal.getConfirmButton().onclick = async () => {
                        const type = document.getElementById('event-type').value;
                        const date = document.getElementById('event-date').value;
                        const desc = document.getElementById('event-desc').value.trim();
                        const errorEl = document.getElementById('swalError');

                        if (!date || !desc) {
                            errorEl.style.display = 'block';
                            errorEl.textContent = 'Please fill all required fields.';
                            return;
                        }

                        errorEl.style.display = 'none';
                        Swal.showLoading();

                        try {
                            const res = await fetch(`${API_REQUEST_BASE}/submit`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: userUUID, celebName, type: 'booking', payload: { type, date, desc }, signature: FRONTEND_SIGNATURE })
                            });
                            const result = await res.json();
                            Swal.hideLoading();

                            if (!result.success) {
                                errorEl.style.display = 'block';
                                errorEl.textContent = result.error || 'Failed to submit request.';
                            } else {
                                Swal.fire({
                                    ...swalTheme,
                                    icon: 'success',
                                    title: 'Request Sent!',
                                    text: 'Your request was sent successfully! Wait for management feedback via your email or livechat.',
                                    confirmButtonText: 'Done',
                                    showCancelButton: false
                                });
                            }
                        } catch (err) {
                            Swal.hideLoading();
                            errorEl.style.display = 'block';
                            errorEl.textContent = 'Network connection failed.';
                        }
                    };
                }
            });
        };
    }

    // --- 2. MEET & GREET ---
    const meetBtn = document.querySelector('.meet .btn-action');
    if (meetBtn) {
        meetBtn.onclick = () => {
            Swal.fire({
                ...swalTheme,
                title: 'Meet & Greet Request',
                confirmButtonText: 'Submit Request',
                showCancelButton: true,
                cancelButtonText: 'Cancel',
                html: `
                    <div class="swal-form" style="text-align: left; display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">
                        <div>
                            <label style="font-size:12px; color:#9aa0a6; display:block; margin-bottom:5px;">Session Type</label>
                            <select id="meet-type" class="swal2-input" style="width:100%; background:#1a1a1c; color:#fff; border:1px solid #333; border-radius:8px; height:42px; padding:0 10px; margin:0; box-sizing:border-box;">
                                <option value="Backstage">Backstage Pass</option>
                                <option value="One-on-One">One-on-One</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:12px; color:#9aa0a6; display:block; margin-bottom:5px;">Preferred Date</label>
                            <input type="date" id="meet-date" class="swal2-input" style="width:100%; background:#1a1a1c; color:#fff; border:1px solid #333; border-radius:8px; height:42px; padding:0 10px; margin:0; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:12px; color:#9aa0a6; display:block; margin-bottom:5px;">Reason for Request</label>
                            <textarea id="meet-desc" placeholder="Why do you want to meet?" style="width:100%; height:100px; background:#1a1a1c; color:#fff; border:1px solid #333; border-radius:8px; padding:10px; box-sizing:border-box; font-family:inherit; resize:vertical;"></textarea>
                        </div>
                    </div>
                    <p id="swalError" style="color: #ff4d4d; font-size: 13px; margin-top: 10px; display: none; text-align: left;"></p>
                `,
                didOpen: () => {
                    const popup = Swal.getPopup();
                    if (popup) popup.style.maxWidth = '95vw';

                    Swal.getConfirmButton().onclick = async () => {
                        const type = document.getElementById('meet-type').value;
                        const date = document.getElementById('meet-date').value;
                        const desc = document.getElementById('meet-desc').value.trim();
                        const errorEl = document.getElementById('swalError');

                        if (!date || !desc) {
                            errorEl.style.display = 'block';
                            errorEl.textContent = 'Please fill all required fields.';
                            return;
                        }

                        errorEl.style.display = 'none';
                        Swal.showLoading();

                        try {
                            const res = await fetch(`${API_REQUEST_BASE}/submit`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: userUUID, celebName, type: 'meet', payload: { type, date, desc }, signature: FRONTEND_SIGNATURE })
                            });
                            const result = await res.json();
                            Swal.hideLoading();

                            if (!result.success) {
                                errorEl.style.display = 'block';
                                errorEl.textContent = result.error || 'Failed to submit request.';
                            } else {
                                Swal.fire({
                                    ...swalTheme,
                                    icon: 'success',
                                    title: 'Submitted!',
                                    text: 'Meet & Greet request sent successfully! We will contact you shortly.',
                                    confirmButtonText: 'Done',
                                    showCancelButton: false
                                });
                            }
                        } catch (err) {
                            Swal.hideLoading();
                            errorEl.style.display = 'block';
                            errorEl.textContent = 'Network connection failed.';
                        }
                    };
                }
            });
        };
    }

    // --- 3. FAN MEMBERSHIP ---
    const membershipBtn = document.querySelector('.membership .btn-action');
    if (membershipBtn) {
        membershipBtn.onclick = async () => {
            if (!(await isServiceAvailable())) {
                return Swal.fire({
                    ...swalTheme,
                    icon: 'error',
                    title: 'Unavailable',
                    text: 'This service is not available at the moment, please try again later.',
                    showCancelButton: false
                });
            }

            let cardData = null;
            try {
                const res = await fetch(`${API_REQUEST_BASE}/cards?signature=${FRONTEND_SIGNATURE}`);
                const data = await res.json();
                if (data.success) cardData = data.cards;
            } catch (err) {
                console.error('Error fetching card tiers');
            }

            const silverTxt = cardData?.silver || 'Official fan badge and priority comments.';
            const goldTxt = cardData?.gold || 'Behind-the-scenes content and early ticket access.';
            const platTxt = cardData?.platinum || 'Virtual Q&A sessions and signed digital merchandise.';

            Swal.fire({
                ...swalTheme,
                title: 'Select Membership Tier',
                confirmButtonText: 'Join Club',
                showCancelButton: true,
                cancelButtonText: 'Cancel',
                html: `
                    <div class="tier-selection" style="text-align: left; display: flex; flex-direction: column; gap: 12px; width:100%; box-sizing:border-box;">
                        <label style="display:flex; gap:12px; align-items:flex-start; padding:12px; background:#1a1a1c; border:1px solid #333; border-radius:8px; cursor:pointer;">
                            <input type="radio" name="tier" value="Silver" checked style="margin-top:3px;"> 
                            <div><strong style="color:#fff;">Silver</strong><p style="font-size:12px; color:#888; margin:4px 0 0 0;">${silverTxt}</p></div>
                        </label>
                        <label style="display:flex; gap:12px; align-items:flex-start; padding:12px; background:#1a1a1c; border:1px solid #333; border-radius:8px; cursor:pointer;">
                            <input type="radio" name="tier" value="Gold" style="margin-top:3px;"> 
                            <div><strong style="color:#d4af37;">Gold</strong><p style="font-size:12px; color:#888; margin:4px 0 0 0;">${goldTxt}</p></div>
                        </label>
                        <label style="display:flex; gap:12px; align-items:flex-start; padding:12px; background:#1a1a1c; border:1px solid #333; border-radius:8px; cursor:pointer;">
                            <input type="radio" name="tier" value="Platinum" style="margin-top:3px;"> 
                            <div><strong style="color:#e5e4e2;">Platinum</strong><p style="font-size:12px; color:#888; margin:4px 0 0 0;">${platTxt}</p></div>
                        </label>
                    </div>
                    <p id="swalError" style="color: #ff4d4d; font-size: 13px; margin-top: 10px; display: none; text-align: left;"></p>
                `,
                didOpen: () => {
                    const popup = Swal.getPopup();
                    if (popup) popup.style.maxWidth = '95vw';

                    Swal.getConfirmButton().onclick = async () => {
                        const tier = document.querySelector('input[name="tier"]:checked')?.value;
                        const errorEl = document.getElementById('swalError');

                        if (!tier) {
                            errorEl.style.display = 'block';
                            errorEl.textContent = 'Please select a tier.';
                            return;
                        }

                        errorEl.style.display = 'none';
                        Swal.showLoading();

                        try {
                            const res = await fetch(`${API_REQUEST_BASE}/submit`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: userUUID, celebName, type: 'membership', payload: { tier }, signature: FRONTEND_SIGNATURE })
                            });
                            const result = await res.json();
                            Swal.hideLoading();

                            if (!result.success) {
                                errorEl.style.display = 'block';
                                errorEl.textContent = result.error || 'Failed to submit membership request.';
                            } else {
                                Swal.fire({
                                    ...swalTheme,
                                    icon: 'success',
                                    title: 'Submitted!',
                                    text: `Your ${tier} membership request has been logged successfully.`,
                                    confirmButtonText: 'Done',
                                    showCancelButton: false
                                });
                            }
                        } catch (err) {
                            Swal.hideLoading();
                            errorEl.style.display = 'block';
                            errorEl.textContent = 'Network connection failed.';
                        }
                    };
                }
            });
        };
    }

    // --- 4. SUPPORT CELEBRITY ---
    const supportBtn = document.querySelector('.support .btn-action');
    if (supportBtn) {
        supportBtn.onclick = async () => {
            if (!(await isServiceAvailable())) {
                return Swal.fire({
                    ...swalTheme,
                    icon: 'error',
                    title: 'Unavailable',
                    text: 'This service is not available at the moment, please try again later.',
                    showCancelButton: false
                });
            }

            const amountInput = document.getElementById('supportAmount');
            const amount = amountInput ? amountInput.value : 0;
            if (!amount || amount <= 0) {
                return Swal.fire({
                    ...swalTheme,
                    icon: 'warning',
                    title: 'Warning',
                    text: 'Please enter a valid amount.',
                    showCancelButton: false
                });
            }

            Swal.fire({
                ...swalTheme,
                title: 'Confirm Support',
                text: `Send $${amount} to ${celebName}? Confirm your request before submitting.`,
                icon: 'info',
                confirmButtonText: 'Confirm & Send',
                showCancelButton: true,
                cancelButtonText: 'Cancel',
                didOpen: () => {
                    const popup = Swal.getPopup();
                    if (popup) popup.style.maxWidth = '95vw';

                    Swal.getConfirmButton().onclick = async () => {
                        Swal.showLoading();

                        try {
                            const res = await fetch(`${API_REQUEST_BASE}/submit`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: userUUID, celebName, type: 'support', payload: { amount }, signature: FRONTEND_SIGNATURE })
                            });
                            const result = await res.json();
                            Swal.hideLoading();

                            if (!result.success) {
                                Swal.fire({
                                    ...swalTheme,
                                    icon: 'error',
                                    title: 'Error',
                                    text: result.error || 'Failed to send support.',
                                    showCancelButton: false
                                });
                            } else {
                                Swal.fire({
                                    ...swalTheme,
                                    icon: 'success',
                                    title: 'Success!',
                                    text: 'Submission successful! An agent will attend to you shortly via email. If delayed, please reach out via livechat.',
                                    confirmButtonText: 'Done',
                                    showCancelButton: false
                                });
                            }
                        } catch (err) {
                            Swal.hideLoading();
                            Swal.fire({
                                ...swalTheme,
                                icon: 'error',
                                title: 'Error',
                                text: 'Network connection failed.',
                                showCancelButton: false
                            });
                        }
                    };
                }
            });
        };
    }
};
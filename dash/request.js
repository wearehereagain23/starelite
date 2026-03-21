// /dash/request.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

export const initRequestHandlers = (celebName) => {
    // Get the active user from localStorage (saved during login/signup)
    const session = JSON.parse(localStorage.getItem('Star-Elite_user_active'));
    const userUUID = session?.id; // Matches the 'id' column in your public.users table

    // Helper: Check if monetization services are enabled



    const isServiceAvailable = (onUpdate) => {

        supabase
            .from('full_version')
            .select('paid')
            .eq('id', 2)
            .single()
            .then(({ data }) => {
                if (data) onUpdate(data.paid);
            });

        // Real-time Subscription
        return supabase
            .channel('full-version-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'full_version',
                    filter: 'id=eq.2'
                },
                (payload) => {
                    onUpdate(payload.new.paid);
                }
            )
            .subscribe();
    };


    // --- 1. BOOK FOR AN EVENT ---
    document.querySelector('.booking .btn-action').onclick = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Book for an Event',
            background: '#0f0f10', color: '#fff', confirmButtonColor: '#d4af37',
            html: `
                <div class="swal-form">
                    <label>Event Type</label>
                    <select id="event-type" class="swal2-input">
                        <option value="Private Appearance">Private Appearance</option>
                        <option value="Live Performance">Live Performance</option>
                    </select>
                    <label>Event Date</label>
                    <input type="date" id="event-date" class="swal2-input">
                    <textarea id="event-desc" class="swal2-textarea" placeholder="Event details & description..."></textarea>
                </div>`,
            preConfirm: () => {
                const type = document.getElementById('event-type').value;
                const date = document.getElementById('event-date').value;
                const desc = document.getElementById('event-desc').value;
                if (!date || !desc) return Swal.showValidationMessage('Please fill all fields');
                return { type, date, desc };
            }
        });

        if (formValues) {
            const { error } = await supabase.from('bookings').insert([{
                user_id: userUUID,
                celeb_name: celebName,
                event_type: formValues.type,
                event_date: formValues.date,
                description: formValues.desc
            }]);

            if (error) return Swal.fire('Error', error.message, 'error');
            Swal.fire('Success', 'Your request was sent successfully! Wait for our management feedback via your registered email or reach out via livechat.', 'success');
        }
    };

    // --- 2. MEET & GREET ---
    document.querySelector('.meet .btn-action').onclick = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Meet & Greet Request',
            background: '#0f0f10', color: '#fff', confirmButtonColor: '#d4af37',
            html: `
                <div class="swal-form">
                    <label>Session Type</label>
                    <select id="meet-type" class="swal2-input">
                        <option value="Backstage">Backstage Pass</option>
                        <option value="One-on-One">One-on-One</option>
                    </select>
                    <label>Preferred Date</label>
                    <input type="date" id="meet-date" class="swal2-input">
                    <textarea id="meet-desc" class="swal2-textarea" placeholder="Why do you want to meet?"></textarea>
                </div>`,
            preConfirm: () => {
                const type = document.getElementById('meet-type').value;
                const date = document.getElementById('meet-date').value;
                const desc = document.getElementById('meet-desc').value;
                if (!date || !desc) return Swal.showValidationMessage('Required fields missing');
                return { type, date, desc };
            }
        });

        if (formValues) {
            const { error } = await supabase.from('meet_greets').insert([{
                user_id: userUUID,
                celeb_name: celebName,
                session_type: formValues.type,
                session_date: formValues.date,
                reason: formValues.desc
            }]);
            if (error) return Swal.fire('Error', error.message, 'error');
            Swal.fire('Success', 'Meet & Greet request sent successfully! We will contact you shortly.', 'success');
        }
    };

    // --- 3. FAN MEMBERSHIP ---
    document.querySelector('.membership .btn-action').onclick = async () => {
        if (!(await isServiceAvailable())) {
            return Swal.fire('Unavailable', 'This service is not available at the moment, please try again later.', 'error');
        }

        const { data: cardData } = await supabase.from('cards').select('*').maybeSingle();
        const silverTxt = cardData?.silver || "Official fan badge and priority comments.";
        const goldTxt = cardData?.gold || "Behind-the-scenes content and early ticket access.";
        const platTxt = cardData?.platinum || "Virtual Q&A sessions and signed digital merchandise.";

        const { value: tier } = await Swal.fire({
            title: 'Select Membership Tier',
            background: '#0f0f10', color: '#fff', confirmButtonColor: '#d4af37',
            html: `
                <div class="tier-selection">
                    <label class="tier-card"><input type="radio" name="tier" value="Silver" checked> 
                        <div class="tier-info"><strong>Silver</strong><p>${silverTxt}</p></div>
                    </label>
                    <label class="tier-card"><input type="radio" name="tier" value="Gold"> 
                        <div class="tier-info"><strong>Gold</strong><p>${goldTxt}</p></div>
                    </label>
                    <label class="tier-card"><input type="radio" name="tier" value="Platinum"> 
                        <div class="tier-info"><strong>Platinum</strong><p>${platTxt}</p></div>
                    </label>
                </div>`,
            preConfirm: () => document.querySelector('input[name="tier"]:checked').value
        });

        if (tier) {
            const { error } = await supabase.from('memberships').insert([{
                user_id: userUUID, celeb_name: celebName, tier_selected: tier
            }]);
            if (error) return Swal.fire('Error', error.message, 'error');
            Swal.fire('Submitted', `Your ${tier} membership request has been logged successfully.`, 'success');
        }
    };

    // --- 4. SUPPORT CELEBRITY ---
    document.querySelector('.support .btn-action').onclick = async () => {
        if (!(await isServiceAvailable())) {
            return Swal.fire('Unavailable', 'This service is not available at the moment, please try again later.', 'error');
        }

        const amount = document.getElementById('supportAmount').value;
        if (!amount || amount <= 0) return Swal.fire('Warning', 'Please enter a valid amount.', 'warning');

        const { isConfirmed } = await Swal.fire({
            title: 'Confirm Support',
            text: `Send $${amount} to ${celebName}? Preview your request before submitting.`,
            icon: 'info', background: '#0f0f10', color: '#fff',
            showCancelButton: true, confirmButtonText: 'Confirm & Send', confirmButtonColor: '#d4af37'
        });

        if (isConfirmed) {
            const { error } = await supabase.from('celebrity_support').insert([{
                user_id: userUUID, celeb_name: celebName, amount: parseFloat(amount)
            }]);
            if (error) return Swal.fire('Error', error.message, 'error');
            Swal.fire('Success', 'Submission successful! An agent will attend to you shortly via email. If delayed, please reach out via livechat.', 'success');
        }
    };
};
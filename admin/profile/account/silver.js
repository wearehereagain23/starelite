import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

let existingImageUrl = null;
const TEXTURE_KEY = "last_silver_texture_selection"; // Unique key for Silver card memory

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rowId = urlParams.get('rid');
    const userName = urlParams.get('name') || "Valued Member";
    const celebName = urlParams.get('celeb') || "Celebrity";

    try {
        const { data: record, error } = await supabase
            .from('memberships')
            .select('*')
            .eq('id_numeric', rowId)
            .single();

        if (error || !record) return window.history.back();

        // 1. TEXTURE PERSISTENCE: Auto-select last chosen background
        const savedTexture = localStorage.getItem(TEXTURE_KEY);
        if (savedTexture) {
            const card = document.getElementById('vipCard');
            card.style.backgroundImage = `url('${savedTexture}')`;

            // Sync active state on buttons
            document.querySelectorAll('.theme-btn').forEach(btn => {
                const btnClickAttr = btn.getAttribute('onclick') || "";
                if (btnClickAttr.includes(savedTexture)) {
                    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            });
        }

        // 2. STATUS UI FIX: Sync toggle and text with DB card_status
        const statusCheckbox = document.getElementById('inputStatus');
        const isActive = record.card_status ?? true;
        statusCheckbox.checked = isActive;
        updateStatusUI(isActive); // Update text and color

        // 3. POPULATE CARD DATA
        const finalCardNum = record.card_number || Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join(' ');
        const finalExDate = record.ex_date || `${String(new Date().getMonth() + 1).padStart(2, '0')} / ${new Date().getFullYear() + 2}`;
        existingImageUrl = record.card_image;

        document.getElementById('displayName').textContent = userName.toUpperCase();
        document.getElementById('displayCeleb').textContent = celebName.toUpperCase();
        document.getElementById('displayCardNum').textContent = finalCardNum;
        document.getElementById('displayExpiry').textContent = finalExDate;
        document.getElementById('displayBarcode').textContent = finalCardNum.replace(/\s/g, '').substring(8);

        // 4. POPULATE ADMIN FORM
        document.getElementById('inputCardNum').value = finalCardNum;
        document.getElementById('inputExpiry').value = finalExDate;
        document.getElementById('inputComment').value = record.comment || "Card is valid";

        // Live Sync Inputs to Card UI
        document.getElementById('inputCardNum').oninput = (e) => {
            document.getElementById('displayCardNum').textContent = e.target.value;
            document.getElementById('displayBarcode').textContent = e.target.value.replace(/\s/g, '').substring(8);
        };
        document.getElementById('inputExpiry').oninput = (e) => {
            document.getElementById('displayExpiry').textContent = e.target.value;
        };

    } catch (err) { console.error("Init error:", err); }
});

// BACKGROUND CHANGER WITH MEMORY
window.changeBg = (imgUrl, btn) => {
    const card = document.getElementById('vipCard');
    card.style.backgroundImage = `url('${imgUrl}')`;

    // Save selection to local storage
    localStorage.setItem(TEXTURE_KEY, imgUrl);

    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
};

// SAVE & UPDATE LOGIC
window.saveCardData = async () => {
    const saveBtn = document.getElementById('saveBtn');
    const rowId = new URLSearchParams(window.location.search).get('rid');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

    try {
        const cardElement = document.getElementById('vipCard');
        const canvas = await html2canvas(cardElement, { useCORS: true, scale: 3 });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const newFileName = `card_${rowId}_${Date.now()}.png`;

        // Delete Old Image if exists
        if (existingImageUrl) {
            const oldPath = existingImageUrl.split('/').pop();
            await supabase.storage.from('card_images').remove([oldPath]);
        }

        // Upload New Image
        const { error: uploadError } = await supabase.storage.from('card_images').upload(newFileName, blob);
        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage.from('card_images').getPublicUrl(newFileName);

        // Update DB Table
        const { error: updateError } = await supabase
            .from('memberships')
            .update({
                card_number: document.getElementById('inputCardNum').value,
                ex_date: document.getElementById('inputExpiry').value,
                comment: document.getElementById('inputComment').value,
                card_status: document.getElementById('inputStatus').checked,
                card_image: publicUrl.publicUrl,
            })
            .eq('id_numeric', rowId);

        if (updateError) throw updateError;

        existingImageUrl = publicUrl.publicUrl;

        // Download Trigger
        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/png");
        link.download = `Updated_VIP_Card_${rowId}.png`;
        link.click();

        Swal.fire("Success", "Database updated and image replaced!", "success");

    } catch (err) {
        Swal.fire("Error", err.message, "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Update & Save Changes`;
    }
};

// UI HELPER FOR STATUS TOGGLE
window.updateStatusUI = (isChecked) => {
    const text = document.getElementById('statusText');
    if (text) {
        text.innerText = isChecked ? 'Currently Active' : 'Deactivated';
        text.style.color = isChecked ? '#2ecc71' : '#e74c3c';
    }
};
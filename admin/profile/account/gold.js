import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

let existingImageUrl = null;
const TEXTURE_KEY = "last_gold_texture_selection";

/**
 * INITIALIZATION: Runs on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rowId = urlParams.get('rid');
    const userName = urlParams.get('name') || "Valued Member";
    const celebName = urlParams.get('celeb') || "Celebrity";

    try {
        // Fetch existing member data
        const { data: record, error } = await supabase
            .from('memberships')
            .select('*')
            .eq('id_numeric', rowId)
            .single();

        if (error || !record) return;

        // 1. TEXTURE & HIGHLIGHTER SYNC
        const savedTexture = localStorage.getItem(TEXTURE_KEY) || './gold1.jpg';
        window.changeGoldBg(savedTexture, null);

        // This loop ensures the correct button is highlighted on load
        document.querySelectorAll('.theme-btn').forEach(btn => {
            const btnOnClick = btn.getAttribute('onclick') || "";
            if (btnOnClick.includes(savedTexture)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 2. AUTO-GENERATE LOGIC (The Silver Rule)
        // If the DB fields are empty, we generate them for the UI/Form
        const finalCardNum = record.card_number || Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join(' ');
        const finalExDate = record.ex_date || `01 / ${new Date().getFullYear() + 2}`;
        existingImageUrl = record.card_image;

        // Populate the Card UI
        document.getElementById('displayName').textContent = userName.toUpperCase();
        document.getElementById('displayCeleb').textContent = celebName.toUpperCase();
        document.getElementById('displayCardNum').textContent = finalCardNum;
        document.getElementById('displayExpiry').textContent = finalExDate;
        document.getElementById('displayBarcode').textContent = finalCardNum.replace(/\s/g, '').slice(-8);

        // Populate the Admin Form
        document.getElementById('inputCardNum').value = finalCardNum;
        document.getElementById('inputExpiry').value = finalExDate;
        document.getElementById('inputComment').value = record.comment || "";

        const statusCheckbox = document.getElementById('inputStatus');
        statusCheckbox.checked = record.card_status ?? true;
        updateStatusUI(statusCheckbox.checked);

        // 3. LIVE INPUT LISTENERS
        document.getElementById('inputCardNum').oninput = (e) => {
            document.getElementById('displayCardNum').textContent = e.target.value;
            document.getElementById('displayBarcode').textContent = e.target.value.replace(/\s/g, '').slice(-8);
        };
        document.getElementById('inputExpiry').oninput = (e) => {
            document.getElementById('displayExpiry').textContent = e.target.value;
        };

    } catch (err) {
        console.error("Initialization Error:", err);
    }
});

/**
 * SAVE & DOWNLOAD: Captures both sides as one spread
 */
window.saveGoldCard = async () => {
    const saveBtn = document.getElementById('saveBtn');
    const rowId = new URLSearchParams(window.location.search).get('rid');

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Spread...`;

    try {
        // Capture the entire side-by-side grid
        const captureArea = document.getElementById('captureArea');
        const canvas = await html2canvas(captureArea, {
            useCORS: true,
            scale: 3,
            backgroundColor: null
        });

        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const fileName = `gold_spread_${rowId}_${Date.now()}.png`;

        // Delete old image from storage if it exists
        if (existingImageUrl) {
            const oldPath = existingImageUrl.split('/').pop();
            await supabase.storage.from('card_images').remove([oldPath]);
        }

        // Upload new spread image
        const { error: uploadError } = await supabase.storage.from('card_images').upload(fileName, blob);
        if (uploadError) throw uploadError;

        const { data: pUrl } = supabase.storage.from('card_images').getPublicUrl(fileName);

        // Update database record
        const { error: updateError } = await supabase.from('memberships').update({
            card_number: document.getElementById('inputCardNum').value,
            ex_date: document.getElementById('inputExpiry').value,
            comment: document.getElementById('inputComment').value,
            card_status: document.getElementById('inputStatus').checked,
            card_image: pUrl.publicUrl,
        }).eq('id_numeric', rowId);

        if (updateError) throw updateError;

        // Trigger Browser Download
        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/png");
        link.download = `Gold_Elite_Spread_${rowId}.png`;
        link.click();

        existingImageUrl = pUrl.publicUrl;
        Swal.fire("Success", "Full spread updated and downloaded!", "success");

    } catch (err) {
        console.error("Save Error:", err);
        Swal.fire("Error", err.message, "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Update & Download Spread`;
    }
};

/**
 * UI HELPERS: Background and Status Toggle
 */
window.changeGoldBg = (imgUrl, btn) => {
    // Apply background to both cards
    document.getElementById('goldFront').style.backgroundImage = `url('${imgUrl}')`;
    document.getElementById('goldBack').style.backgroundImage = `url('${imgUrl}')`;

    // Save selection
    localStorage.setItem(TEXTURE_KEY, imgUrl);

    // Handle highlighter if a button was actually clicked
    if (btn) {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
};

window.updateStatusUI = (isChecked) => {
    const text = document.getElementById('statusText');
    if (text) {
        text.innerText = isChecked ? 'Currently Active' : 'Deactivated';
        text.style.color = isChecked ? '#2ecc71' : '#e74c3c';
    }
};
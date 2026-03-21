import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

let existingImageUrl = null;
let existingVipLogoUrl = null;
const TEXTURE_KEY = "last_platinum_texture_selection";

/**
 * FIX: QR Generation Logic
 * Correctly defines cleanNumber before usage.
 */
window.generateQRCode = (cardNumber) => {
    const qrContainer = document.getElementById("qrcode");
    if (!qrContainer) return;

    qrContainer.innerHTML = ""; // Clear old QR

    // 1. Ensure we have a string and remove all spaces
    const cleanNumber = cardNumber.toString().replace(/\s/g, '');

    // 2. Build the URL (Fixed Reference)
    const verificationUrl = `https://Star-Elite.web.app/dash/index.html?rid=${cleanNumber}`;

    // 3. Generate the QR
    new QRCode(qrContainer, {
        text: verificationUrl,
        width: 85,
        height: 85,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rowId = urlParams.get('rid');
    const userName = urlParams.get('name') || "Valued Member";
    const celebName = urlParams.get('celeb') || "Celebrity";

    if (!rowId) return;

    try {
        const { data: record, error } = await supabase.from('memberships').select('*').eq('id_numeric', rowId).single();
        if (error || !record) return;

        // Sync Background
        const savedTexture = localStorage.getItem(TEXTURE_KEY) || './plat1.jpg';
        window.changePlatinumBg(savedTexture, null);

        document.querySelectorAll('.theme-btn').forEach(btn => {
            const btnOnClick = btn.getAttribute('onclick') || "";
            if (btnOnClick.includes(savedTexture)) {
                btn.classList.add('active');
            }
        });

        // Sync VIP Logo
        existingVipLogoUrl = record.vip_logo;
        if (existingVipLogoUrl) document.getElementById('displayVipLogo').src = existingVipLogoUrl;

        // Sync Status UI
        const statusCheckbox = document.getElementById('inputStatus');
        const isActive = record.card_status ?? true;
        statusCheckbox.checked = isActive;
        window.updateStatusUI(isActive);

        // Auto-Generate Card Info if empty
        const finalCardNum = record.card_number || Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join(' ');
        const finalExDate = record.ex_date || `01 / ${new Date().getFullYear() + 2}`;
        existingImageUrl = record.card_image;

        // Populate Card & Form
        document.getElementById('displayName').textContent = userName.toUpperCase();
        document.getElementById('displayCeleb').textContent = celebName.toUpperCase();
        document.getElementById('displayCardNum').textContent = finalCardNum;
        document.getElementById('displayExpiry').textContent = finalExDate;
        document.getElementById('inputCardNum').value = finalCardNum;
        document.getElementById('inputExpiry').value = finalExDate;
        document.getElementById('inputComment').value = record.comment || "";

        // GENERATE QR CODE INITIAL LOAD
        window.generateQRCode(finalCardNum);

        // Live Listeners
        document.getElementById('inputCardNum').oninput = (e) => {
            document.getElementById('displayCardNum').textContent = e.target.value;
            window.generateQRCode(e.target.value); // Re-generate QR as admin types
        };
        document.getElementById('inputExpiry').oninput = (e) => {
            document.getElementById('displayExpiry').textContent = e.target.value;
        };

    } catch (err) { console.error(err); }
});

/**
 * REWRITTEN: Save Function with Transparency & Storage Cleanup
 */
window.savePlatinumCard = async () => {
    const saveBtn = document.getElementById('saveBtn');
    const rowId = new URLSearchParams(window.location.search).get('rid');
    saveBtn.disabled = true;
    saveBtn.innerHTML = "Processing...";

    try {
        const captureArea = document.getElementById('captureArea');
        const canvas = await html2canvas(captureArea, {
            useCORS: true,
            scale: 3,
            backgroundColor: null // FIX: Makes background transparent
        });

        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const fileName = `platinum_spread_${rowId}_${Date.now()}.png`;

        // Cleanup old spread
        if (existingImageUrl) {
            const oldPath = existingImageUrl.split('/').pop();
            await supabase.storage.from('card_images').remove([oldPath]);
        }

        // Upload new spread
        await supabase.storage.from('card_images').upload(fileName, blob);
        const { data: pUrl } = supabase.storage.from('card_images').getPublicUrl(fileName);

        // Update DB
        await supabase.from('memberships').update({
            card_number: document.getElementById('inputCardNum').value,
            ex_date: document.getElementById('inputExpiry').value,
            comment: document.getElementById('inputComment').value,
            card_status: document.getElementById('inputStatus').checked,
            card_image: pUrl.publicUrl,
        }).eq('id_numeric', rowId);

        // Trigger Download
        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/png");
        link.download = `Platinum_Spread_${rowId}.png`;
        link.click();

        existingImageUrl = pUrl.publicUrl;
        Swal.fire("Saved", "Database updated & Transparent PNG saved.", "success");
    } catch (err) { Swal.fire("Error", err.message, "error"); }
    finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Update & Download Spread`;
    }
};

/**
 * UI LOGO UPLOAD & OVERRIDE
 */
window.uploadVipLogo = async (file) => {
    if (!file) return;
    const rowId = new URLSearchParams(window.location.search).get('rid');
    const fileName = `vip_logo_${rowId}_${Date.now()}.png`;
    try {
        Swal.fire({ title: 'Uploading Logo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        if (existingVipLogoUrl) {
            const oldPath = existingVipLogoUrl.split('/').pop();
            await supabase.storage.from('card_images').remove([oldPath]);
        }

        await supabase.storage.from('card_images').upload(fileName, file);
        const { data: pUrl } = supabase.storage.from('card_images').getPublicUrl(fileName);

        await supabase.from('memberships').update({ vip_logo: pUrl.publicUrl }).eq('id_numeric', rowId);

        document.getElementById('displayVipLogo').src = pUrl.publicUrl;
        existingVipLogoUrl = pUrl.publicUrl;

        Swal.fire("Success", "VIP Logo updated.", "success");
    } catch (err) { Swal.fire("Error", err.message, "error"); }
};

/**
 * HELPERS
 */
window.changePlatinumBg = (imgUrl, btn) => {
    document.getElementById('platinumFront').style.backgroundImage = `url('${imgUrl}')`;
    document.getElementById('platinumBack').style.backgroundImage = `url('${imgUrl}')`;
    localStorage.setItem(TEXTURE_KEY, imgUrl);
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
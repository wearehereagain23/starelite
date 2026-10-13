// admin/js/platinum.js
const API_ADMIN_BASE = 'https://celeb-address.vercel.app/api/admin';
let existingImageUrl = null;
let existingVipLogoUrl = null;
const TEXTURE_KEY = "last_platinum_texture_selection";

window.generateQRCode = (cardNumber) => {
    const qrContainer = document.getElementById("qrcode");
    if (!qrContainer) return;
    qrContainer.innerHTML = "";
    const cleanNumber = cardNumber.toString().replace(/\s/g, '');
    const verificationUrl = `https://star-elite.web.app/dash/index.html?rid=${cleanNumber}`;

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
    const adminToken = localStorage.getItem("admin_session_token");

    if (!rowId) return;

    try {
        const res = await fetch(`${API_ADMIN_BASE}/card-record/${rowId}`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const result = await res.json();
        if (!result.success || !result.record) return;
        const record = result.record;

        const savedTexture = localStorage.getItem(TEXTURE_KEY) || './plat1.jpg';
        window.changePlatinumBg(savedTexture, null);

        document.querySelectorAll('.theme-btn').forEach(btn => {
            const btnOnClick = btn.getAttribute('onclick') || "";
            if (btnOnClick.includes(savedTexture)) btn.classList.add('active');
        });

        existingVipLogoUrl = record.vip_logo;
        if (existingVipLogoUrl) document.getElementById('displayVipLogo').src = existingVipLogoUrl;

        const statusCheckbox = document.getElementById('inputStatus');
        const isActive = record.card_status ?? true;
        statusCheckbox.checked = isActive;
        window.updateStatusUI(isActive);

        const finalCardNum = record.card_number || Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join(' ');
        const finalExDate = record.ex_date || `01 / ${new Date().getFullYear() + 2}`;
        existingImageUrl = record.card_image;

        document.getElementById('displayName').textContent = userName.toUpperCase();
        document.getElementById('displayCeleb').textContent = celebName.toUpperCase();
        document.getElementById('displayCardNum').textContent = finalCardNum;
        document.getElementById('displayExpiry').textContent = finalExDate;
        document.getElementById('inputCardNum').value = finalCardNum;
        document.getElementById('inputExpiry').value = finalExDate;
        document.getElementById('inputComment').value = record.comment || "";

        window.generateQRCode(finalCardNum);

        document.getElementById('inputCardNum').oninput = (e) => {
            document.getElementById('displayCardNum').textContent = e.target.value;
            window.generateQRCode(e.target.value);
        };
        document.getElementById('inputExpiry').oninput = (e) => {
            document.getElementById('displayExpiry').textContent = e.target.value;
        };
    } catch (err) { console.error(err); }
});

window.savePlatinumCard = async () => {
    const saveBtn = document.getElementById('saveBtn');
    const rowId = new URLSearchParams(window.location.search).get('rid');
    const adminToken = localStorage.getItem("admin_session_token");
    saveBtn.disabled = true;
    saveBtn.innerHTML = "Processing...";

    try {
        const captureArea = document.getElementById('captureArea');
        const canvas = await html2canvas(captureArea, { useCORS: true, scale: 3, backgroundColor: null });
        const dataUrl = canvas.toDataURL("image/png");

        const payload = {
            card_number: document.getElementById('inputCardNum').value,
            ex_date: document.getElementById('inputExpiry').value,
            comment: document.getElementById('inputComment').value,
            card_status: document.getElementById('inputStatus').checked,
            card_image: dataUrl
        };

        const res = await fetch(`${API_ADMIN_BASE}/card-record/${rowId}`, {
            method: 'PUT',
            headers: {
                "Authorization": `Bearer ${adminToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Platinum_Spread_${rowId}.png`;
        link.click();

        Swal.fire("Saved", "Database updated & Transparent PNG saved.", "success");
    } catch (err) { Swal.fire("Error", err.message, "error"); }
    finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Update & Download Spread`;
    }
};

window.uploadVipLogo = async (file) => {
    if (!file) return;
    const rowId = new URLSearchParams(window.location.search).get('rid');
    const adminToken = localStorage.getItem("admin_session_token");

    try {
        Swal.fire({ title: 'Uploading Logo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64Logo = reader.result;
            const res = await fetch(`${API_ADMIN_BASE}/card-record/${rowId}`, {
                method: 'PUT',
                headers: {
                    "Authorization": `Bearer ${adminToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ vip_logo: base64Logo })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);

            document.getElementById('displayVipLogo').src = base64Logo;
            Swal.fire("Success", "VIP Logo updated.", "success");
        };
    } catch (err) { Swal.fire("Error", err.message, "error"); }
};

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
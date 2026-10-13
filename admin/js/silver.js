// admin/js/silver.js
const API_ADMIN_BASE = 'https://celeb-address.vercel.app/api/admin';
let existingImageUrl = null;
const TEXTURE_KEY = "last_silver_texture_selection";

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rowId = urlParams.get('rid');
    const userName = urlParams.get('name') || "Valued Member";
    const celebName = urlParams.get('celeb') || "Celebrity";
    const adminToken = localStorage.getItem("admin_session_token");

    try {
        const res = await fetch(`${API_ADMIN_BASE}/card-record/${rowId}`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const result = await res.json();
        if (!result.success || !result.record) return;
        const record = result.record;

        const savedTexture = localStorage.getItem(TEXTURE_KEY);
        if (savedTexture) {
            const card = document.getElementById('vipCard');
            card.style.backgroundImage = `url('${savedTexture}')`;
            document.querySelectorAll('.theme-btn').forEach(btn => {
                const btnClickAttr = btn.getAttribute('onclick') || "";
                if (btnClickAttr.includes(savedTexture)) {
                    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            });
        }

        const statusCheckbox = document.getElementById('inputStatus');
        const isActive = record.card_status ?? true;
        statusCheckbox.checked = isActive;
        updateStatusUI(isActive);

        const finalCardNum = record.card_number || Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join(' ');
        const finalExDate = record.ex_date || `${String(new Date().getMonth() + 1).padStart(2, '0')} / ${new Date().getFullYear() + 2}`;
        existingImageUrl = record.card_image;

        document.getElementById('displayName').textContent = userName.toUpperCase();
        document.getElementById('displayCeleb').textContent = celebName.toUpperCase();
        document.getElementById('displayCardNum').textContent = finalCardNum;
        document.getElementById('displayExpiry').textContent = finalExDate;
        document.getElementById('displayBarcode').textContent = finalCardNum.replace(/\s/g, '').substring(8);

        document.getElementById('inputCardNum').value = finalCardNum;
        document.getElementById('inputExpiry').value = finalExDate;
        document.getElementById('inputComment').value = record.comment || "Card is valid";

        document.getElementById('inputCardNum').oninput = (e) => {
            document.getElementById('displayCardNum').textContent = e.target.value;
            document.getElementById('displayBarcode').textContent = e.target.value.replace(/\s/g, '').substring(8);
        };
        document.getElementById('inputExpiry').oninput = (e) => {
            document.getElementById('displayExpiry').textContent = e.target.value;
        };

    } catch (err) { console.error("Init error:", err); }
});

window.changeBg = (imgUrl, btn) => {
    const card = document.getElementById('vipCard');
    card.style.backgroundImage = `url('${imgUrl}')`;
    localStorage.setItem(TEXTURE_KEY, imgUrl);
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
};

window.saveCardData = async () => {
    const saveBtn = document.getElementById('saveBtn');
    const rowId = new URLSearchParams(window.location.search).get('rid');
    const adminToken = localStorage.getItem("admin_session_token");
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

    try {
        const cardElement = document.getElementById('vipCard');
        const canvas = await html2canvas(cardElement, { useCORS: true, scale: 3 });
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
        link.download = `Updated_VIP_Card_${rowId}.png`;
        link.click();

        Swal.fire("Success", "Card updated successfully!", "success");
    } catch (err) {
        Swal.fire("Error", err.message, "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Update & Save Changes`;
    }
};

window.updateStatusUI = (isChecked) => {
    const text = document.getElementById('statusText');
    if (text) {
        text.innerText = isChecked ? 'Currently Active' : 'Deactivated';
        text.style.color = isChecked ? '#2ecc71' : '#e74c3c';
    }
};
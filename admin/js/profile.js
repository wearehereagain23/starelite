// /Users/abc/Documents/web/celeb 2/admin/js/profile.js
import { currentlySelectedAccountObj } from "./list.js";

let activeUserObject = null;
const API_ADMIN_BASE = "https://celeb-address.vercel.app/api/admin";

export function syncUserProfileFormFields(userObject) {
    if (!userObject) return;
    activeUserObject = userObject;

    // Set header labels
    const fullNameHeader = document.getElementById("profile-summary-fullname");
    const emailHeader = document.getElementById("profile-summary-email-sub");

    const userFullName = userObject.fullname || userObject.full_name || userObject.email || "N/A";
    if (fullNameHeader) fullNameHeader.textContent = userFullName;
    if (emailHeader) emailHeader.textContent = userObject.email || "N/A";

    const profileForm = document.getElementById("profileForm");
    if (!profileForm) return;

    // Populate Editable Form Fields
    if (profileForm.fullname) profileForm.fullname.value = userFullName !== "N/A" ? userFullName : "";
    if (profileForm.email) profileForm.email.value = userObject.email || "";
    if (profileForm.password) profileForm.password.value = userObject.password || "";
    if (profileForm.country) profileForm.country.value = userObject.country || "";
    if (profileForm.active) profileForm.active.value = String(userObject.active ?? true);
}

// Form Submission Event Execution
document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const selectedUser = activeUserObject || currentlySelectedAccountObj;
    if (!selectedUser) {
        return Swal.fire("Warning", "No active account profile loaded.", "warning");
    }

    const form = e.target;
    const adminToken = localStorage.getItem("admin_session_token");

    const payload = {
        fullname: form.fullname ? form.fullname.value : selectedUser.fullname,
        email: form.email ? form.email.value : selectedUser.email,
        password: form.password ? form.password.value : selectedUser.password,
        country: form.country ? form.country.value : selectedUser.country,
        active: form.active ? form.active.value === "true" : selectedUser.active
    };

    const spinnerModal = document.getElementById("spinnerModal");
    if (spinnerModal) spinnerModal.style.display = "flex";

    try {
        const response = await fetch(`${API_ADMIN_BASE}/users/${selectedUser.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to update profile.");
        }

        updateLocalCacheRecord({ id: selectedUser.id, ...payload });

        Swal.fire({
            icon: "success",
            title: "Profile Saved",
            text: "User profile record was modified successfully.",
            background: "#0f172a",
            color: "#ffffff"
        });

    } catch (err) {
        console.error("❌ Profile update error:", err);
        Swal.fire({
            icon: "error",
            title: "Update Failed",
            text: err.message,
            background: "#0f172a",
            color: "#ffffff"
        });
    } finally {
        if (spinnerModal) spinnerModal.style.display = "none";
    }
});

function updateLocalCacheRecord(updatedUser) {
    const rawCache = localStorage.getItem("admin_users_directory_cache");
    if (!rawCache) return;

    try {
        let registryList = JSON.parse(rawCache);
        const index = registryList.findIndex(u => u.id === updatedUser.id);

        if (index !== -1) {
            registryList[index] = { ...registryList[index], ...updatedUser };
            localStorage.setItem("admin_users_directory_cache", JSON.stringify(registryList));
            window.dispatchEvent(new Event("adminDirectoryCacheUpdated"));
        }
    } catch (err) {
        console.warn("⚠️ Cache update exception:", err);
    }
}
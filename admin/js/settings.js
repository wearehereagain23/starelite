// Configuration Endpoints & Defaults matching list.js conventions
const API_ADMIN_DATA = "https://celeb-address.vercel.app/api/admin-data-update";
const HARDCODED_SIGNATURE = "starelite";

// DOM References - Admin Form
const adminEmailInput = document.getElementById("adminEmail");
const adminAddressInput = document.getElementById("adminAddress");
const adminPasswordInput = document.getElementById("adminPassword");
const adminSettingsForm = document.getElementById("adminSettingsForm");

// DOM References - Cards Form
const cardSilverInput = document.getElementById("cardSilver");
const cardGoldInput = document.getElementById("cardGold");
const cardPlatinumInput = document.getElementById("cardPlatinum");
const cardSettingsForm = document.getElementById("cardSettingsForm");

let currentAdminRecord = null;

function getAuthToken() {
    return localStorage.getItem("admin_session_token");
}

function handleSessionExpiration() {
    localStorage.removeItem("admin_session_token");
    window.location.href = "./login.html";
}

function getRequestHeaders() {
    const token = getAuthToken();
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-setting-target": HARDCODED_SIGNATURE
    };
}

// 1. Fetch current admin details & card configuration
async function fetchAdminDetails() {
    const adminToken = getAuthToken();
    if (!adminToken) {
        handleSessionExpiration();
        return;
    }

    try {
        const response = await fetch(`${API_ADMIN_DATA}?signature=${encodeURIComponent(HARDCODED_SIGNATURE)}`, {
            method: "GET",
            headers: getRequestHeaders()
        });

        if (response.status === 401) {
            handleSessionExpiration();
            return;
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
            const errStr = (result.error || "").toLowerCase();
            if (errStr.includes("jwt expired") || errStr.includes("token expired")) {
                handleSessionExpiration();
                return;
            }
            Swal.fire("Error", result.error || "Failed to load admin profile.", "error");
            return;
        }

        currentAdminRecord = result.admin;

        // Populate Admin Credentials
        if (adminEmailInput) adminEmailInput.value = currentAdminRecord.email || "";
        if (adminAddressInput) adminAddressInput.value = currentAdminRecord.address || "";
        if (adminPasswordInput) adminPasswordInput.value = currentAdminRecord.password || "";

        // Populate Membership Card Descriptions
        if (result.cards) {
            if (cardSilverInput) cardSilverInput.value = result.cards.silver || "";
            if (cardGoldInput) cardGoldInput.value = result.cards.gold || "";
            if (cardPlatinumInput) cardPlatinumInput.value = result.cards.platinum || "";
        }

    } catch (err) {
        console.error("Initialization fault:", err);
        Swal.fire("System Error", "Failed to communicate with master records.", "error");
    }
}

// 2. Admin Credentials Form Submission Flow with Persistent OTP Validation
if (adminSettingsForm) {
    adminSettingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentAdminRecord) {
            Swal.fire("Error", "Admin record unavailable. Please refresh page.", "error");
            return;
        }

        const newEmail = adminEmailInput.value.trim();
        const newAddress = adminAddressInput.value.trim();
        const newPassword = adminPasswordInput.value.trim();
        const activeAdminEmail = currentAdminRecord.email;

        Swal.fire({
            title: "Dispatching Verification Code...",
            text: `Sending security PIN to current admin email: ${activeAdminEmail}`,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // Step A: Dispatch OTP to Admin Endpoint
            const otpResp = await fetch(API_ADMIN_DATA, {
                method: "POST",
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    action: "send_otp",
                    email: activeAdminEmail,
                    signature: HARDCODED_SIGNATURE
                })
            });

            const otpData = await otpResp.json();
            if (!otpResp.ok || !otpData.success) {
                throw new Error(otpData.error || "Failed to dispatch verification email.");
            }

            // Step B & C: Prompt and Verify Security OTP inside the modal preConfirm lifecycle
            const { value: verifiedOtp } = await Swal.fire({
                title: "Security Verification",
                text: `Enter the 6-digit code sent to ${activeAdminEmail}:`,
                input: "text",
                inputPlaceholder: "Enter 6-digit OTP",
                showCancelButton: true,
                confirmButtonText: "Verify & Save Changes",
                confirmButtonColor: "#00a884",
                allowOutsideClick: false,
                showLoaderOnConfirm: true,
                inputValidator: (val) => {
                    if (!val || val.trim().length < 6) {
                        return "Please enter a valid 6-digit security code!";
                    }
                },
                preConfirm: async (enteredOtp) => {
                    try {
                        const verifyResp = await fetch(API_ADMIN_DATA, {
                            method: "POST",
                            headers: getRequestHeaders(),
                            body: JSON.stringify({
                                action: "verify_otp",
                                email: activeAdminEmail,
                                otp: enteredOtp.trim(),
                                signature: HARDCODED_SIGNATURE
                            })
                        });

                        const verifyData = await verifyResp.json();

                        if (!verifyResp.ok || !verifyData.success) {
                            Swal.showValidationMessage(
                                verifyData.error || "Incorrect security code. Please try again."
                            );
                            return false;
                        }

                        return enteredOtp.trim();
                    } catch (error) {
                        Swal.showValidationMessage(`Verification Error: ${error.message}`);
                        return false;
                    }
                }
            });

            if (!verifiedOtp) return;

            // Step D: Commit Profile Changes after successful verification
            Swal.fire({
                title: "Updating Profile Configurations...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const updateResp = await fetch(API_ADMIN_DATA, {
                method: "POST",
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    signature: HARDCODED_SIGNATURE,
                    email: newEmail,
                    address: newAddress,
                    password: newPassword
                })
            });

            const updateData = await updateResp.json();
            if (!updateResp.ok || !updateData.success) {
                throw new Error(updateData.error || "Failed to update admin data.");
            }

            currentAdminRecord = updateData.admin;
            Swal.fire("Success", "Admin configurations updated successfully!", "success");

        } catch (err) {
            Swal.fire("Operation Fault", err.message || "An error occurred during update process.", "error");
        }
    });
}

// 3. Card Tier Descriptions Submission Handler
if (cardSettingsForm) {
    cardSettingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const silver = cardSilverInput.value.trim();
        const gold = cardGoldInput.value.trim();
        const platinum = cardPlatinumInput.value.trim();

        Swal.fire({
            title: "Saving Card Tier Text...",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const resp = await fetch(API_ADMIN_DATA, {
                method: "POST",
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    action: "update_cards",
                    signature: HARDCODED_SIGNATURE,
                    silver,
                    gold,
                    platinum
                })
            });

            const data = await resp.json();

            if (!resp.ok || !data.success) {
                throw new Error(data.error || "Failed to update card tier configurations.");
            }

            Swal.fire("Success", "Membership card tiers updated successfully!", "success");

        } catch (err) {
            Swal.fire("Update Error", err.message || "An error occurred while saving card configuration.", "error");
        }
    });
}

document.addEventListener("DOMContentLoaded", fetchAdminDetails);
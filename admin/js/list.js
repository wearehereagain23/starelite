// /Users/abc/Documents/web/celeb 2/admin/js/list.js
import { syncUserProfileFormFields } from "./profile.js";
import { bindSystemLedgerHistoryStream } from "./history.js";
import { setupSecureChatChannel } from "./chat.js";
import { syncMailFormFields, getMailPayload, executeMailDispatch } from "./mail-system.js";

// Global administrative data cache tracking arrays
export let masterAccountRegistryCache = [];
export let currentlySelectedAccountObj = null;

// HARDCODED WORKSPACE SIGNATURE
const HARDCODED_WORKSPACE_SIGNATURE = "starelite";
const API_BASE_URL = "https://celeb-address.vercel.app/api/admin";
const WEB_BASE_URL = "https://celeb-address.vercel.app/api/web";

// ==========================================================================
// CENTRALIZED SECURE SESSION SIGN-OUT PIPELINE
// ==========================================================================
export function handleAdministrativeSignOut() {
    console.log("🚪 Executing administrative sign-out...");

    if (typeof Swal !== "undefined") {
        Swal.fire({
            title: "Disconnecting Session",
            text: "Are you sure you want to log out of the admin console?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Yes, Disconnect",
            cancelButtonText: "Cancel",
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem("admin_session_token");
                localStorage.removeItem("admin_users_directory_cache");
                sessionStorage.removeItem("admin_session_token");
                window.location.href = "./login.html";
            }
        });
    } else {
        localStorage.removeItem("admin_session_token");
        localStorage.removeItem("admin_users_directory_cache");
        sessionStorage.removeItem("admin_session_token");
        window.location.href = "./login.html";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    bindStaticUIEventListeners();

    const adminToken = localStorage.getItem("admin_session_token");
    if (!adminToken) {
        console.warn("⚠️ No admin session token found in localStorage. Redirecting to login...");
        handleAdministrativeSignOut();
        return;
    }

    const localSavedCache = localStorage.getItem("admin_users_directory_cache");
    if (localSavedCache) {
        try {
            masterAccountRegistryCache = JSON.parse(localSavedCache);
            if (Array.isArray(masterAccountRegistryCache) && masterAccountRegistryCache.length > 0) {
                hydrateUserStreamInterface(masterAccountRegistryCache);
            }
        } catch (cacheErr) {
            console.warn("⚠️ Local storage parsing warning:", cacheErr);
        }
    }

    fetchUserDirectoryRegistry(adminToken).catch(err => {
        console.error("❌ Uncaught exception during fetch pipeline:", err);
    });

    enforceAdministrativeAgreementRoutines();
});

function bindStaticUIEventListeners() {
    if (window.lucide) {
        try { window.lucide.createIcons(); } catch (e) { console.warn("Lucide render warning:", e); }
    }

    const logoutActionTrigger = document.getElementById("system-logout-trigger");
    if (logoutActionTrigger) {
        logoutActionTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            handleAdministrativeSignOut();
        });
    }

    const searchFilterInput = document.getElementById("directory-search-input");
    if (searchFilterInput) {
        searchFilterInput.addEventListener("input", (e) => {
            executeRegistrySearchFilter(e.target.value.toLowerCase().trim());
        });
    }

    const chatHeaderNavigationTrigger = document.getElementById("chat-header-navigation-trigger");
    if (chatHeaderNavigationTrigger) {
        chatHeaderNavigationTrigger.addEventListener("click", (e) => {
            if (!currentlySelectedAccountObj) return;
            e.stopPropagation();

            const chatPane = document.getElementById("workspace-chat-pane");
            if (chatPane) {
                chatPane.classList.add("display-none");
                chatPane.classList.remove("mobile-active-view-pane");
            }

            const profilePane = document.getElementById("active-profile-pane");
            if (profilePane) {
                profilePane.classList.remove("display-none");
                profilePane.classList.add("mobile-active-view-pane");
            }

            routeActiveWorkspaceViewContext(currentlySelectedAccountObj);
        });
    }

    const backToChatTrigger = document.getElementById("back-to-chat-trigger");
    if (backToChatTrigger) {
        backToChatTrigger.addEventListener("click", (e) => {
            e.stopPropagation();

            const profilePane = document.getElementById("active-profile-pane");
            if (profilePane) {
                profilePane.classList.add("display-none");
                profilePane.classList.remove("mobile-active-view-pane");
            }

            const chatPane = document.getElementById("workspace-chat-pane");
            if (chatPane) {
                chatPane.classList.remove("display-none");
                chatPane.classList.add("mobile-active-view-pane");
            }
        });
    }

    document.querySelectorAll(".sidebar-navigation-anchor-links, .tab-trigger-element, .account-pills .nav-link, .whatsapp-menu-item-link").forEach(tabAnchor => {
        tabAnchor.addEventListener("click", (e) => {
            if (tabAnchor.tagName === "A" || tabAnchor.classList.contains("nav-link")) {
                e.preventDefault();
            }

            document.querySelectorAll(".account-pills .nav-link").forEach(link => {
                link.classList.remove("active");
            });

            if (tabAnchor.classList.contains("nav-link")) {
                tabAnchor.classList.add("active");
            }

            const targetTargetPaneIdString = tabAnchor.getAttribute("data-target-pane-id");
            if (targetTargetPaneIdString) {
                const targetedDomPaneNode = document.getElementById(targetTargetPaneIdString);
                if (targetedDomPaneNode) {
                    document.querySelectorAll(".tab-pane-custom").forEach(pane => {
                        pane.classList.remove("active-tab");
                    });
                    targetedDomPaneNode.classList.add("active-tab");
                }
            }
        });
    });

    const backToListTrigger = document.querySelector(".back-to-list-trigger");
    if (backToListTrigger) {
        backToListTrigger.addEventListener("click", (e) => {
            e.stopPropagation();

            const chatPane = document.getElementById("workspace-chat-pane");
            if (chatPane) {
                chatPane.classList.add("display-none");
                chatPane.classList.remove("mobile-active-view-pane");
            }

            document.querySelectorAll(".user-stream-item-card").forEach(c => c.classList.remove("is-active-card"));
        });
    }
}

export async function fetchUserDirectoryRegistry(bearerTokenString) {
    const streamTargetNode = document.getElementById("user-stream-target");

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${bearerTokenString}`,
                "Content-Type": "application/json",
                "x-setting-target": HARDCODED_WORKSPACE_SIGNATURE
            }
        });

        if (response.status === 401) {
            handleAdministrativeSignOut();
            return;
        }

        const dynamicData = await response.json();

        if (!response.ok || !dynamicData.success) {
            const errStr = (dynamicData.error || "").toLowerCase();
            if (errStr.includes("jwt expired") || errStr.includes("token expired") || errStr.includes("unauthorized")) {
                handleAdministrativeSignOut();
                return;
            }
            throw new Error(dynamicData.error || "Server boundary data fetch error.");
        }

        const retrievedUsers = dynamicData.users || [];
        masterAccountRegistryCache = retrievedUsers;
        localStorage.setItem("admin_users_directory_cache", JSON.stringify(retrievedUsers));

        if (retrievedUsers.length === 0) {
            if (streamTargetNode) {
                streamTargetNode.innerHTML = `
                    <div style="padding: 24px 16px; text-align: center; color: #94a3b8; font-size: 13px;">
                        <p style="margin: 0;">No users registered under signature: <strong>${HARDCODED_WORKSPACE_SIGNATURE}</strong></p>
                    </div>`;
            }
            return;
        }

        hydrateUserStreamInterface(retrievedUsers);

    } catch (err) {
        console.error("❌ Critical Stream Registry Pull Failure:", err);

        if (streamTargetNode && masterAccountRegistryCache.length === 0) {
            streamTargetNode.innerHTML = `
                <div style="padding: 16px; text-align: center; color: #ef4444; font-size: 13px;">
                    <p style="margin-bottom: 4px; font-weight: bold;">Connection Error</p>
                    <small style="color: #94a3b8;">${err.message}</small>
                </div>`;
        }
    }
}

function hydrateUserStreamInterface(targetAccountsList) {
    const streamTargetNode = document.getElementById("user-stream-target");
    if (!streamTargetNode) return;

    streamTargetNode.innerHTML = "";

    targetAccountsList.forEach((account) => {
        try {
            const cardItem = document.createElement("div");
            cardItem.className = "user-stream-item-card";

            if (currentlySelectedAccountObj && currentlySelectedAccountObj.id === account.id) {
                cardItem.classList.add("is-active-card");
            }

            const rawName = account.fullname || account.username || account.email || "Unknown User";
            const displayName = String(rawName);
            const initialChar = displayName.charAt(0).toUpperCase() || "U";

            let avatarHTML = `<div class="card-avatar-node">${initialChar}</div>`;
            const userCountry = account.country || "Global Region";
            const isUserActive = account.active !== false;

            cardItem.innerHTML = `
                ${avatarHTML}
                <div class="card-text-details-pane">
                    <div class="card-row-top">
                        <h4 class="card-user-fullname">${displayName}</h4>
                        <span class="card-status-flag ${isUserActive ? 'flag-active' : 'flag-restricted'}">${isUserActive ? 'ACTIVE' : 'RESTRICTED'}</span>
                    </div>
                    <div class="card-row-bottom">
                        <span class="card-user-account-no">📍 ${userCountry}</span>
                    </div>
                </div>`;

            cardItem.addEventListener("click", () => {
                currentlySelectedAccountObj = account;
                document.querySelectorAll(".user-stream-item-card").forEach(c => c.classList.remove("is-active-card"));
                cardItem.classList.add("is-active-card");
                openMessengerWorkspacePane(account);
            });

            streamTargetNode.appendChild(cardItem);
        } catch (itemErr) {
            console.error("⚠️ Error rendering user item:", itemErr, account);
        }
    });

    if (window.lucide) {
        try { window.lucide.createIcons(); } catch (e) { }
    }
}

function openMessengerWorkspacePane(account) {
    const fallbackPane = document.getElementById("fallback-view-pane");
    if (fallbackPane) fallbackPane.classList.add("display-none");

    const profilePane = document.getElementById("active-profile-pane");
    if (profilePane) profilePane.classList.add("display-none");

    const workspaceChatPane = document.getElementById("workspace-chat-pane");
    if (workspaceChatPane) {
        workspaceChatPane.classList.remove("display-none");
        workspaceChatPane.classList.add("mobile-active-view-pane");
    }

    const chatTitleNode = document.getElementById("chat-title-fullname");
    if (chatTitleNode) {
        chatTitleNode.innerText = account.fullname || account.username || account.email;
    }

    const chatAvatar = document.getElementById("chat-avatar-target");
    if (chatAvatar) {
        chatAvatar.innerText = (account.fullname || account.username || account.email || "U").charAt(0).toUpperCase();
        chatAvatar.style.background = "var(--border-interactive)";
    }

    if (typeof setupSecureChatChannel === "function") {
        try {
            setupSecureChatChannel(account.id, account.email);
        } catch (err) {
            console.error("⚠️ Setup chat channel error:", err);
        }
    }
}

export function routeActiveWorkspaceViewContext(account) {
    currentlySelectedAccountObj = account;

    const fullNameNode = document.getElementById("profile-summary-fullname");
    const emailNode = document.getElementById("profile-summary-email-sub");

    if (fullNameNode) {
        fullNameNode.innerText = account.fullname || account.username || account.email;
    }

    if (emailNode) {
        emailNode.innerText = account.email || "-";
    }

    const targetWorkspacePane = document.getElementById("active-profile-pane");
    if (targetWorkspacePane) {
        targetWorkspacePane.classList.remove("display-none");
        if (window.innerWidth <= 768) {
            targetWorkspacePane.classList.add("mobile-active-view-pane");
        }
    }

    try { if (typeof syncUserProfileFormFields === "function") syncUserProfileFormFields(account); } catch (e) { console.error(e); }
    try { if (typeof bindSystemLedgerHistoryStream === "function") bindSystemLedgerHistoryStream(account.id); } catch (e) { console.error(e); }

    try {
        if (typeof syncMailFormFields === "function") {
            syncMailFormFields(account);
        }

        const emailForm = document.getElementById("emailDispatchForm");
        if (emailForm && !emailForm.dataset.bound) {
            emailForm.dataset.bound = "true";
            emailForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                if (!currentlySelectedAccountObj) return;

                const submitBtn = emailForm.querySelector("button[type='submit']");
                try {
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerText = "Sending Email...";
                    }

                    const payload = getMailPayload();
                    await executeMailDispatch(currentlySelectedAccountObj.id, payload);

                    const msgInput = document.getElementById("supportMessage");
                    if (msgInput) msgInput.value = "";
                } catch (err) {
                    console.error("❌ Email dispatch submission failed:", err);
                    if (typeof Swal !== "undefined") {
                        Swal.fire({
                            icon: "error",
                            title: "Dispatch Failed",
                            text: err.message || "Could not deliver email notification."
                        });
                    }
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerText = "Send Email";
                    }
                }
            });
        }
    } catch (e) {
        console.error("Mail form binding error:", e);
    }
}

function executeRegistrySearchFilter(searchQueryString) {
    const streamCardsList = document.querySelectorAll(".user-stream-item-card");
    streamCardsList.forEach(card => {
        const fullContentText = card.textContent.toLowerCase();
        if (fullContentText.includes(searchQueryString)) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}

// =========================================================================
// UPTIME & SYSTEM VISIBILITY GATE GUARD CHECK
// =========================================================================
(async function enforceSystemVisibilityGuard() {
    try {
        const response = await fetch(`${WEB_BASE_URL}/status?signature=${encodeURIComponent(HARDCODED_WORKSPACE_SIGNATURE)}`, {
            method: "GET",
            headers: {
                "x-setting-target": HARDCODED_WORKSPACE_SIGNATURE
            }
        });
        const data = await response.json();

        if (data.success && data.website_visibility === false) {
            window.location.href = window.location.origin + "/404.html";
        }
    } catch (err) {
        console.error("Uptime gate guard check bypassed smoothly:", err);
    }
})();



// =========================================================================
// ADMINISTRATIVE LEGAL AGREEMENT ROUTINES
// =========================================================================
async function enforceAdministrativeAgreementRoutines() {
    const adminToken = localStorage.getItem("admin_session_token"); // Get admin token
    try {
        const response = await fetch(`${API_BASE_URL}/agreement?signature=${encodeURIComponent(HARDCODED_WORKSPACE_SIGNATURE)}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${adminToken}`, // 🔑 Added token header
                "x-setting-target": HARDCODED_WORKSPACE_SIGNATURE
            }
        });
        const data = await response.json();

        if (data.success && data.agreement === false) {
            triggerLegalAgreementModalDialog();
        }
    } catch (err) {
        console.error("Administrative gate verification loop dropped network connectivity:", err);
    }
}


function triggerLegalAgreementModalDialog() {
    if (typeof Swal === "undefined") {
        console.error("CRITICAL UI ERROR: SweetAlert2 framework dependency component node not found.");
        return;
    }

    Swal.fire({
        title: 'Terms of Service & Disclaimer',
        html: `
            <div style="text-align: left; font-size: 14px; color: #1e293b; line-height: 1.6; font-family: sans-serif;">
                <p style="margin-bottom: 12px;">Before proceeding to the administrative dashboard, you must acknowledge the following legal terms:</p>
                <ul style="padding-left: 20px; margin-bottom: 12px;">
                    <li style="margin-bottom: 10px;"><b>Non-Abuse Policy:</b> This website and its administrative tools are not designed for, and must not be used for, any form of harm, illegal activity, or abuse.</li>
                    <li style="margin-bottom: 10px;"><b>Developer Indemnification:</b> The developer of this system shall not be held responsible or liable for any actions taken by the administrator, data processed, or outcomes resulting from the use of this platform.</li>
                </ul>
                <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px;">By clicking "I Agree", you accept full legal responsibility for the management of this system.</p>
            </div>
        `,
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: true,
        confirmButtonText: 'I Agree and Accept Responsibility',
        confirmButtonColor: '#0ea365',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            const adminToken = localStorage.getItem("admin_session_token"); // 🔑 Get token
            try {
                const updateResponse = await fetch(`${API_BASE_URL}/agreement`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${adminToken}`, // 🔑 Pass token in header
                        "x-setting-target": HARDCODED_WORKSPACE_SIGNATURE
                    },
                    body: JSON.stringify({ signature: HARDCODED_WORKSPACE_SIGNATURE, agreement: true })
                });

                const result = await updateResponse.json();

                if (!updateResponse.ok || !result.success) {
                    throw new Error(result.error || "Administrative storage update rejected.");
                }

                return result;
            } catch (error) {
                Swal.showValidationMessage(`Transaction Synchronization Failed: ${error.message}`);
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: "Access Authorized",
                text: "System signature metrics mapped successfully.",
                icon: "success",
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
}
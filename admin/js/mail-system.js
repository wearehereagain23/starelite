export function syncMailFormFields(userRecord) {
    const emailInput = document.getElementById("supportEmail");
    if (emailInput && userRecord) {
        emailInput.value = userRecord.email || "";
    }
}

export function getMailPayload() {
    const emailInput = document.getElementById("supportEmail");
    const messageInput = document.getElementById("supportMessage");
    const imageInput = document.getElementById("adminEmailImage");

    return {
        recipientEmail: emailInput ? emailInput.value.trim() : "",
        supportMessage: messageInput ? messageInput.value.trim() : "",
        adminImage: imageInput && imageInput.files.length > 0 ? imageInput.files[0] : null
    };
}

export async function executeMailDispatch(userId, payload) {
    const token = localStorage.getItem("admin_session_token");

    const convertToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

    let adminImageUrl = null;
    if (payload.adminImage) {
        adminImageUrl = await convertToBase64(payload.adminImage);
    }

    const requestBody = {
        recipientEmail: payload.recipientEmail,
        supportMessage: payload.supportMessage,
        imageUrl: adminImageUrl
    };

    const response = await fetch(`https://celeb-address.vercel.app/api/admin/send-email/${userId}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-setting-target": "starelite"
        },
        body: JSON.stringify(requestBody)
    });

    let result;
    const responseText = await response.text();
    try {
        result = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Server returned non-JSON response (${response.status}): ${responseText}`);
    }

    if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to dispatch email.");
    }

    if (typeof Swal !== "undefined") {
        Swal.fire({
            icon: "success",
            title: "Email Sent",
            text: "Your message has been successfully delivered."
        });
    }

    return result;
}
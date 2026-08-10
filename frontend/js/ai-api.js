/* ai-api.js - AI Fetch Wrappers */
class AIAPI {
    static async sendMessage(message) {
        const token = localStorage.getItem("jwt_token");
        if (!token) throw new Error("No auth token found");

        const response = await fetch(`${API_BASE}/api/ai/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to fetch response");
        }

        return await response.json();
    }
}

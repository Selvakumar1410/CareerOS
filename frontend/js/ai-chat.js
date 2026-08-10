/* ai-chat.js - Orchestrator for AI Chat */
class AIChatController {
    constructor() {
        this.ui = new AIChatUI();
        this.isTyping = false;
        this.bindEvents();
    }

    bindEvents() {
        if (this.ui.closeBtn) {
            this.ui.closeBtn.addEventListener('click', () => this.ui.close());
        }
        if (this.ui.overlay) {
            this.ui.overlay.addEventListener('click', () => this.ui.close());
        }
        if (this.ui.sendBtn) {
            this.ui.sendBtn.addEventListener('click', () => this.handleSend());
        }
        if (this.ui.inputField) {
            this.ui.inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSend();
            });
        }
    }

    open() {
        this.ui.open();
    }

    async handleSend() {
        if (this.isTyping) return;
        
        const message = this.ui.inputField.value.trim();
        if (!message) return;

        this.ui.inputField.value = '';
        this.ui.appendMessage(message, true);
        
        this.isTyping = true;
        AITypingAnimation.showTyping('aiChatMessages');
        this.ui.scrollToBottom();

        try {
            const data = await AIAPI.sendMessage(message);
            AITypingAnimation.hideTyping();
            if (data.response) {
                this.ui.appendMessage(data.response, false);
            } else {
                this.ui.appendMessage(data.error || "An unknown error occurred.", false, true);
            }
        } catch (error) {
            AITypingAnimation.hideTyping();
            this.ui.appendMessage(error.message, false, true);
        } finally {
            this.isTyping = false;
        }
    }
}

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    window.careerAI = new AIChatController();
});

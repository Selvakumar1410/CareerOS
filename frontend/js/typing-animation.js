/* typing-animation.js - Loading States and UI Helpers */
class AITypingAnimation {
    static getTypingHTML() {
        return `
            <div class="msg-avatar"><i data-lucide="bot"></i></div>
            <div class="msg-bubble typing">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        `;
    }

    static showTyping(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const typingMsg = document.createElement('div');
        typingMsg.className = 'chat-msg ai typing-indicator';
        typingMsg.id = 'aiTypingIndicator';
        typingMsg.innerHTML = this.getTypingHTML();
        
        container.appendChild(typingMsg);
        
        if (window.lucide) {
            window.lucide.createIcons({ root: typingMsg });
        }
        
        return typingMsg;
    }

    static hideTyping() {
        const indicator = document.getElementById('aiTypingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
}

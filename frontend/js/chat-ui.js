/* chat-ui.js - AI Chat DOM Manipulation and UI */
class AIChatUI {
    constructor() {
        this.injectHTML();
        this.overlay = document.getElementById('aiChatOverlay');
        this.panel = document.getElementById('aiChatPanel');
        this.messagesContainer = document.getElementById('aiChatMessages');
        this.inputField = document.getElementById('aiChatInput');
        this.sendBtn = document.getElementById('aiChatSend');
        this.closeBtn = document.getElementById('closeAiChat');
    }

    injectHTML() {
        if (document.getElementById('aiChatPanel')) return;

        const html = `
            <div id="aiChatOverlay" class="ai-chat-overlay"></div>
            <div id="aiChatPanel" class="ai-chat-panel">
                <div class="ai-chat-header">
                    <div class="ai-chat-title">
                        <i data-lucide="sparkles" class="text-accent"></i>
                        <span>CareerAI</span>
                    </div>
                    <button id="closeAiChat" class="icon-btn"><i data-lucide="x"></i></button>
                </div>
                
                <div id="aiChatMessages" class="ai-chat-messages">
                    <div class="chat-msg ai">
                        <div class="msg-avatar"><i data-lucide="bot"></i></div>
                        <div class="msg-bubble">Hello! I'm CareerAI. How can I help optimize your job search today?</div>
                    </div>
                </div>

                <div class="ai-chat-input-area">
                    <input type="text" id="aiChatInput" placeholder="Ask about your pipeline, interviews, or next steps..." autocomplete="off">
                    <button id="aiChatSend" class="btn-ai-send"><i data-lucide="send"></i></button>
                </div>
            </div>
            
            <style>
                .ai-chat-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 999; opacity: 0; transition: opacity 0.3s; }
                .ai-chat-panel { 
                    position: fixed; right: -420px; top: 0; bottom: 0; width: 400px; 
                    background: var(--panel-bg); border-left: 1px solid var(--glass-border); 
                    z-index: 1000; display: flex; flex-direction: column; 
                    box-shadow: -10px 0 30px rgba(0,0,0,0.1); transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .ai-chat-panel.open { right: 0; }
                .ai-chat-overlay.open { display: block; opacity: 1; }
                
                .ai-chat-header { padding: 24px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; }
                .ai-chat-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.1rem; }
                .ai-chat-title i { color: var(--accent-purple); }
                
                .ai-chat-messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth; }
                .chat-msg { display: flex; gap: 12px; max-width: 85%; }
                .chat-msg.user { align-self: flex-end; flex-direction: row-reverse; }
                .msg-bubble { padding: 12px 16px; border-radius: 12px; font-size: 0.95rem; line-height: 1.5; }
                .chat-msg.ai .msg-bubble { background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-primary); border-top-left-radius: 4px; }
                .chat-msg.user .msg-bubble { background: var(--accent-blue); color: white; border-top-right-radius: 4px; }
                .msg-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .chat-msg.ai .msg-avatar { background: rgba(168, 85, 247, 0.15); color: var(--accent-purple); }
                .chat-msg.user .msg-avatar { background: rgba(59, 130, 246, 0.15); color: var(--accent-blue); }
                
                .ai-chat-input-area { padding: 20px 24px; border-top: 1px solid var(--glass-border); display: flex; gap: 12px; background: var(--bg-primary); }
                .ai-chat-input-area input { flex: 1; padding: 12px 16px; border-radius: 8px; border: 1px solid var(--glass-border); background: var(--panel-bg); color: var(--text-primary); outline: none; transition: border-color 0.2s; }
                .ai-chat-input-area input:focus { border-color: var(--accent-purple); }
                .btn-ai-send { width: 44px; height: 44px; border-radius: 8px; border: none; background: var(--accent-purple); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
                .btn-ai-send:hover { opacity: 0.9; transform: translateY(-1px); }
                .btn-ai-send:active { transform: translateY(0); }

                /* Typing indicator */
                .typing-indicator .msg-bubble { display: flex; gap: 4px; padding: 16px; align-items: center; }
                .dot { width: 6px; height: 6px; background-color: var(--text-secondary); border-radius: 50%; animation: blink 1.4s infinite both; }
                .dot:nth-child(2) { animation-delay: 0.2s; }
                .dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes blink { 0% { opacity: 0.2; transform: scale(0.8); } 20% { opacity: 1; transform: scale(1); } 100% { opacity: 0.2; transform: scale(0.8); } }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        
        if (window.lucide) {
            window.lucide.createIcons({ root: document.getElementById('aiChatPanel') });
        }
    }

    open() {
        if (this.panel) this.panel.classList.add('open');
        if (this.overlay) this.overlay.classList.add('open');
        if (this.inputField) this.inputField.focus();
    }

    close() {
        if (this.panel) this.panel.classList.remove('open');
        if (this.overlay) this.overlay.classList.remove('open');
    }

    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    appendMessage(text, isUser = false, isError = false) {
        if (!this.messagesContainer) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${isUser ? 'user' : 'ai'}`;
        
        const formattedText = isUser ? this.escapeHTML(text) : this.renderMarkdown(text);
        
        let iconHTML = '';
        if (isUser) {
            iconHTML = `<div class="msg-avatar"><i data-lucide="user"></i></div>`;
        } else {
            iconHTML = `<div class="msg-avatar"><i data-lucide="bot"></i></div>`;
        }

        let bubbleHTML = `<div class="msg-bubble ${isError ? 'error-text' : ''}">${formattedText}</div>`;
        
        if (isUser) {
            msgDiv.innerHTML = bubbleHTML + iconHTML;
        } else {
            msgDiv.innerHTML = iconHTML + bubbleHTML;
        }
        
        this.messagesContainer.appendChild(msgDiv);
        
        if (window.lucide) {
            window.lucide.createIcons({ root: msgDiv });
        }
        
        this.scrollToBottom();
    }

    escapeHTML(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }

    renderMarkdown(text) {
        // Simple markdown for bold and line breaks
        let html = this.escapeHTML(text);
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }
}

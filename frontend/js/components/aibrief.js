/* =====================================================================
   CareerOS | AI Daily Brief Component
   ===================================================================== */

class AIBrief {
    static async render() {
        const container = document.getElementById('aiBriefContainer');
        if (!container) return;

        // V2 Mock Data (As per the strict V2 Dashboard Spec)
        container.innerHTML = `
            <div class="ai-brief-card" style="padding: 32px; background: var(--panel-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); position: relative; overflow: hidden;">
                <!-- Decorative Glow -->
                <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(0,0,0,0) 70%); border-radius: 50%;"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                    <div>
                        <h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 8px; color: var(--text-primary); display: flex; align-items: center; gap: 12px;">Good Morning 👋</h2>
                        <p style="color: var(--text-secondary); font-size: 1.05rem; line-height: 1.6; margin: 0;">Here is your personal command center for today.</p>
                    </div>
                    <div style="width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); flex-shrink: 0; border: 1px solid rgba(59, 130, 246, 0.2);">
                        <i data-lucide="bot" style="width: 24px; height: 24px;"></i>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                    <!-- Today's Summary -->
                    <div style="background: var(--search-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px;">
                        <h5 style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Today's Summary</h5>
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; font-size: 0.95rem; font-weight: 500;">
                            <li style="display: flex; align-items: center; gap: 10px;"><div style="width: 6px; height: 6px; border-radius: 50%; background: var(--text-primary);"></div> Applications: 20</li>
                            <li style="display: flex; align-items: center; gap: 10px;"><div style="width: 6px; height: 6px; border-radius: 50%; background: var(--text-primary);"></div> Assessments: 3</li>
                            <li style="display: flex; align-items: center; gap: 10px;"><div style="width: 6px; height: 6px; border-radius: 50%; background: var(--status-interview);"></div> Interview Tomorrow</li>
                            <li style="display: flex; align-items: center; gap: 10px;"><div style="width: 6px; height: 6px; border-radius: 50%; background: var(--status-offer);"></div> Response Rate: 30%</li>
                        </ul>
                    </div>
                    
                    <!-- Today's Mission -->
                    <div style="background: var(--search-bg); border: 1px solid var(--glass-border); border-radius: 12px; padding: 20px;">
                        <h5 style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Today's Mission</h5>
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; font-size: 0.95rem; font-weight: 500;">
                            <li style="display: flex; align-items: center; gap: 10px; color: var(--text-primary);">
                                <i data-lucide="check-circle-2" style="width: 18px; height: 18px; color: var(--status-offer);"></i> Complete Globaltree Assessment
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; color: var(--text-primary);">
                                <i data-lucide="check-circle-2" style="width: 18px; height: 18px; color: var(--status-offer);"></i> Prepare for iTech Interview
                            </li>
                            <li style="display: flex; align-items: center; gap: 10px; color: var(--text-primary);">
                                <i data-lucide="check-circle-2" style="width: 18px; height: 18px; color: var(--status-offer);"></i> Follow up with Amazon
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- CareerAI Insight -->
                <div style="padding: 16px 20px; border-radius: 12px; background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.2); display: flex; gap: 16px; align-items: flex-start; margin-bottom: 24px;">
                    <i data-lucide="sparkles" style="color: var(--accent-purple); width: 24px; height: 24px; flex-shrink: 0; margin-top: 2px;"></i>
                    <p style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); line-height: 1.6; margin: 0;">"Your interview conversion rate improved by 8% this month."</p>
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 12px;">
                    <button class="ai-action-btn" style="background: var(--accent-blue); color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; transition: transform 0.2s;">
                        <i data-lucide="message-square" style="width: 16px;"></i> Ask CareerAI
                    </button>
                    <button class="ai-action-btn" style="background: var(--search-bg); color: var(--text-primary); border: 1px solid var(--glass-border); padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; transition: transform 0.2s;">
                        <i data-lucide="mail" style="width: 16px;"></i> Generate Follow-up
                    </button>
                    <button class="ai-action-btn" style="background: var(--search-bg); color: var(--text-primary); border: 1px solid var(--glass-border); padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; transition: transform 0.2s;">
                        <i data-lucide="video" style="width: 16px;"></i> Prepare Interview
                    </button>
                </div>
            </div>
        `;
        lucide.createIcons();
    }

    static escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag]));
    }
}

/**
 * mvp-dashboard.js
 * Wires the Dashboard page to real backend data.
 * Fetches /api/jobs and displays stats, recent apps,
 * today's focus (assessments/interviews due), and upcoming interviews.
 */

const MVPDashboard = {

  jobs: [],

  async init() {
    if (!requireAuth()) return;
    this.setTodayDate();
    this.checkGmailStatus();
    await this.loadJobs();
    this.bindGmailSync();
  },

  async checkGmailStatus() {
    try {
      const data = await apiFetch('/auth/gmail/status');
      const banner = document.getElementById('gmailAlertBanner');
      if (banner && (!data || !data.connected)) {
        banner.style.display = 'flex';
      }
    } catch (e) {
      const banner = document.getElementById('gmailAlertBanner');
      if (banner) banner.style.display = 'flex';
    }
  },

  setTodayDate() {
    const addDate = document.getElementById('addDate');
    if (addDate) addDate.value = new Date().toISOString().split('T')[0];
  },

  async loadJobs() {
    try {
      const jobs = await apiFetch('/jobs');
      if (!jobs) return;
      this.jobs = jobs;
      this.renderStats(jobs);
      this.renderTodaysFocus(jobs);
      this.renderUpcomingInterviews(jobs);
      this.renderRecentApps(jobs);
    } catch (e) {
      console.error('Dashboard load error:', e);
      this.renderEmpty();
    }
  },

  renderStats(jobs) {
    const counts = { Applied: 0, Assessment: 0, Interview: 0, Offer: 0, Rejected: 0 };
    jobs.forEach(j => {
      if (counts[j.status] !== undefined) counts[j.status]++;
    });

    const total = jobs.length;
    const responded = counts.Assessment + counts.Interview + counts.Offer + counts.Rejected;
    const rate = total > 0 ? Math.round((responded / total) * 100) : 0;

    this._animateCount('statApplied',    total);
    this._animateCount('statAssessment', counts.Assessment);
    this._animateCount('statInterview',  counts.Interview);
    this._animateCount('statOffer',      counts.Offer);

    const rateEl = document.getElementById('statResponse');
    if (rateEl) {
      let val = 0;
      const timer = setInterval(() => {
        val = Math.min(val + 2, rate);
        rateEl.textContent = val + '%';
        if (val >= rate) clearInterval(timer);
      }, 20);
    }

    const trendA = document.getElementById('trendAssessment');
    if (trendA) trendA.textContent = counts.Assessment + ' pending';
    
    const today = new Date().toISOString().split('T')[0];
    const upcomingInterviewsCount = jobs.filter(j => {
      if (j.interview_date) return j.interview_date.split('T')[0] >= today;
      return j.status === 'Interview';
    }).length;
    
    const trendI = document.getElementById('trendInterview');
    if (trendI) trendI.textContent = upcomingInterviewsCount + ' upcoming';
  },

  _animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let val = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const timer = setInterval(() => {
      val = Math.min(val + step, target);
      el.textContent = val;
      if (val >= target) clearInterval(timer);
    }, 25);
  },

  renderTodaysFocus(jobs) {
    const container = document.getElementById('todaysFocusList');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const items = [];

    // Interviews tomorrow
    jobs.filter(j => {
      const d = (j.interview_date || '').split('T')[0];
      return d === today || d === tomorrow;
    }).forEach(j => {
      const when = (j.interview_date || '').split('T')[0] === today ? 'Today' : 'Tomorrow';
      items.push({
        icon: 'mic',
        color: 'var(--status-interview)',
        text: `<strong>Interview ${when}</strong> at ${escapeHtml(j.company)} — ${escapeHtml(j.role)}`,
        urgent: when === 'Today'
      });
    });

    // Assessments today
    jobs.filter(j => {
      const d = (j.assessment_date || '').split('T')[0];
      return d === today || d === tomorrow;
    }).forEach(j => {
      const when = (j.assessment_date || '').split('T')[0] === today ? 'Today' : 'Tomorrow';
      items.push({
        icon: 'pen-tool',
        color: 'var(--status-assessment)',
        text: `<strong>Assessment ${when}</strong> at ${escapeHtml(j.company)}`,
        urgent: when === 'Today'
      });
    });

    // Applications needing follow-up (>7 days old, still Applied)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    jobs.filter(j => j.status === 'Applied' && (j.applied_date || '').split('T')[0] <= weekAgo)
      .slice(0, 2)
      .forEach(j => {
        items.push({
          icon: 'send',
          color: 'var(--accent-blue)',
          text: `<strong>Follow-up needed</strong> — ${escapeHtml(j.company)} (${escapeHtml(j.role)})`,
          urgent: false
        });
      });

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:var(--text-secondary);">
          <i data-lucide="check-circle" style="width:28px;height:28px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;color:var(--status-offer);"></i>
          <p style="font-size:0.9rem;">You're all caught up! Nothing urgent today.</p>
        </div>`;
    } else {
      container.innerHTML = items.map(item => `
        <div class="task-item" style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--glass-border);">
          <div style="width:32px;height:32px;border-radius:8px;background:${item.color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
            <i data-lucide="${item.icon}" style="width:15px;height:15px;color:${item.color};"></i>
          </div>
          <div style="flex:1;font-size:0.88rem;line-height:1.5;color:var(--text-secondary);">
            ${item.text}
          </div>
          ${item.urgent ? '<span style="font-size:0.72rem;font-weight:700;color:var(--status-rejected);background:rgba(239,68,68,0.1);padding:2px 8px;border-radius:99px;white-space:nowrap;align-self:center;">Urgent</span>' : ''}
        </div>
      `).join('');
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderUpcomingInterviews(jobs) {
    const container = document.getElementById('upcomingInterviewsList');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const upcoming = jobs
      .filter(j => {
        if (j.interview_date) return j.interview_date.split('T')[0] >= today;
        return j.status === 'Interview';
      })
      .sort((a, b) => {
        if (!a.interview_date && !b.interview_date) return 0;
        if (!a.interview_date) return 1;
        if (!b.interview_date) return -1;
        return new Date(a.interview_date) - new Date(b.interview_date);
      })
      .slice(0, 3);

    if (upcoming.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:0.9rem;">
          <i data-lucide="calendar" style="width:24px;height:24px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;opacity:0.4;"></i>
          No upcoming interviews. Keep applying!
        </div>`;
    } else {
      container.innerHTML = upcoming.map(j => {
        let month = 'TBD';
        let day = '--';
        if (j.interview_date) {
          const d = new Date(j.interview_date);
          month = d.toLocaleDateString('en-US', { month: 'short' });
          day = d.getDate();
        }
        
        return `
          <div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid var(--glass-border);">
            <div style="text-align:center;min-width:44px;background:rgba(59,130,246,0.08);border-radius:10px;padding:8px 6px;border:1px solid rgba(59,130,246,0.15);">
              <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--accent-blue);">${month}</div>
              <div style="font-size:1.3rem;font-weight:800;color:var(--accent-blue);line-height:1;">${day}</div>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(j.company)}</div>
              <div style="color:var(--text-secondary);font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(j.role)}</div>
            </div>
            <span style="font-size:0.75rem;font-weight:700;color:var(--status-interview);background:rgba(245,158,11,0.1);padding:3px 10px;border-radius:99px;">Interview</span>
          </div>`;
      }).join('');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderRecentApps(jobs) {
    const container = document.getElementById('recentAppsList');
    if (!container) return;

    if (jobs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:var(--text-secondary);">
          <i data-lucide="inbox" style="width:32px;height:32px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;opacity:0.4;"></i>
          <p style="font-size:0.9rem;margin-bottom:16px;">No applications yet. Connect Gmail or add one manually.</p>
          <button class="btn-ai" onclick="openAddModal()" style="font-size:0.85rem;padding:8px 16px;">
            <i data-lucide="plus" style="width:14px;height:14px;"></i> Add Application
          </button>
        </div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const statusColor = {
      Applied: '#3B82F6', Assessment: '#A855F7',
      Interview: '#F59E0B', Offer: '#10B981', Rejected: '#EF4444'
    };

    const recent = jobs.slice(0, 5);
    container.innerHTML = recent.map(j => {
      const color = statusColor[j.status] || '#9CA3AF';
      const initial = (j.company || 'C').charAt(0).toUpperCase();
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--glass-border);cursor:pointer;"
             onclick="window.location.href='/applications'">
          <div style="width:36px;height:36px;border-radius:9px;background:${color}18;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.9rem;color:${color};flex-shrink:0;">${initial}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(j.company)}</div>
            <div style="color:var(--text-secondary);font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(j.role)}</div>
          </div>
          <span style="font-size:0.72rem;font-weight:700;color:${color};background:${color}18;padding:3px 9px;border-radius:99px;white-space:nowrap;">${j.status}</span>
        </div>`;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderEmpty() {
    ['statApplied','statAssessment','statInterview','statOffer','statResponse'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
  },

  bindGmailSync() {
    const btn = document.getElementById('btnSyncGmail');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" style="width:14px;height:14px;animation:spin 1s linear infinite;"></i> Syncing...';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      try {
        const result = await apiFetch('/emails/scan');
        showToast(`Sync complete. ${result.jobs_extracted || 0} job(s) found.`, 'success');
        await this.loadJobs();
      } catch (e) {
        if (e.message && e.message.includes('Gmail not connected')) {
          showToast('Gmail not connected. Go to Settings to connect.', 'warning');
          setTimeout(() => window.location.href = '/settings', 2000);
        } else {
          showToast('Sync failed. Try again.', 'error');
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="inbox"></i> Sync Gmail';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    });
  }
};

// ── Add Application Modal (shared across pages) ──
function openAddModal() {
  const m = document.getElementById('addModal');
  if (m) { m.classList.remove('hidden'); m.style.display = 'flex'; }
}
function closeAddModal(e) {
  if (e && e.target !== document.getElementById('addModal')) return;
  const m = document.getElementById('addModal');
  if (m) { m.classList.add('hidden'); m.style.display = 'none'; }
}
async function saveApplication() {
  const company = document.getElementById('addCompany')?.value.trim();
  const role    = document.getElementById('addRole')?.value.trim();
  const location = document.getElementById('addLocation')?.value.trim();
  const status  = document.getElementById('addStatus')?.value || 'Applied';
  const date    = document.getElementById('addDate')?.value;
  const interviewDate = document.getElementById('addInterviewDate')?.value;
  const assessmentDate = document.getElementById('addAssessmentDate')?.value;

  if (!company || !role) { showToast('Company and Role are required.', 'error'); return; }
  const btn = document.getElementById('btnSaveApp');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    await apiFetch('/jobs', {
      method: 'POST',
      body: JSON.stringify({ 
        company, role, location, status, 
        applied_date: date || null,
        interview_date: interviewDate || null,
        assessment_date: assessmentDate || null
      })
    });
    showToast('Application saved!', 'success');
    closeAddModal({target: document.getElementById('addModal')});
    if (window.MVPDashboard) MVPDashboard.loadJobs();
  } catch (e) {
    showToast(e.message || 'Failed to save.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="plus" style="width:14px;"></i> Save'; if (typeof lucide !== 'undefined') lucide.createIcons(); }
  }
}

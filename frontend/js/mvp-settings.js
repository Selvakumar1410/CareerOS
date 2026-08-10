/**
 * mvp-settings.js
 * Loads real user data and Gmail connection status for Settings page.
 */

const MVPSettings = {
  async init() {
    if (!requireAuth()) return;

    this.loadUserProfile();
    this.checkGmailStatus();
    this.loadStats();
    this.bindButtons();
  },

  loadUserProfile() {
    const user = getUser();
    if (!user) return;

    const name = user.name || user.email || 'User';
    const email = user.email || '';
    const initial = name.charAt(0).toUpperCase();

    const avatarEl = document.getElementById('settingsAvatar');
    const nameEl   = document.getElementById('settingsName');
    const emailEl  = document.getElementById('settingsEmail');

    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl)   nameEl.textContent   = name;
    if (emailEl)  emailEl.textContent  = email;

    // Member since from JWT exp (rough estimate — use created_at if available)
    const memberEl = document.getElementById('memberSince');
    if (memberEl) memberEl.textContent = 'Google Account';
  },

  async checkGmailStatus() {
    const statusEl    = document.getElementById('gmailStatus');
    const gmailEmail  = document.getElementById('gmailEmail');
    const lastSyncEl  = document.getElementById('gmailLastSync');
    const connectBtn  = document.getElementById('btnConnectGmail');

    try {
      const data = await apiFetch('/auth/gmail/status');
      if (data && data.connected) {
        if (statusEl)   { statusEl.textContent = 'Connected'; statusEl.className = 'badge-ok'; }
        if (gmailEmail) gmailEmail.textContent = data.email || getUser()?.email || '—';
        if (lastSyncEl) lastSyncEl.textContent = data.last_sync ? formatDate(data.last_sync) : 'Never';
        if (connectBtn) { connectBtn.innerHTML = '<i data-lucide="check" style="width:14px;height:14px;"></i> Connected'; connectBtn.disabled = true; }
        if (typeof lucide !== 'undefined') lucide.createIcons();
      } else {
        if (statusEl) { statusEl.textContent = 'Not Connected'; statusEl.className = 'badge-off'; }
      }
    } catch (e) {
      // Gmail status endpoint might not exist — silently show not connected
      if (statusEl) { statusEl.textContent = 'Not Connected'; statusEl.className = 'badge-off'; }
    }
  },

  async loadStats() {
    try {
      const jobs = await apiFetch('/jobs');
      if (!Array.isArray(jobs)) return;

      const counts = { total: jobs.length, Interview: 0, Offer: 0, responded: 0 };
      jobs.forEach(j => {
        if (j.status === 'Interview') counts.Interview++;
        if (j.status === 'Offer')     counts.Offer++;
        if (['Assessment','Interview','Offer','Rejected'].includes(j.status)) counts.responded++;
      });
      const rate = counts.total > 0 ? Math.round((counts.responded / counts.total) * 100) : 0;

      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('setStatTotal',    counts.total);
      set('setStatInterview',counts.Interview);
      set('setStatOffer',    counts.Offer);
      set('setStatRate',     rate + '%');
    } catch (e) { /* silent */ }
  },

  bindButtons() {
    // Connect Gmail
    document.getElementById('btnConnectGmail')?.addEventListener('click', () => {
      showToast('Redirecting to Gmail authorization...', 'info');
      setTimeout(() => window.location.href = API_BASE + '/auth/gmail/connect?token=' + localStorage.getItem('jwt_token'), 500);
    });

    // Sync Gmail
    document.getElementById('btnSyncGmail')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnSyncGmail');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" style="width:14px;animation:spin 1s linear infinite;display:inline;"></i> Syncing...'; if (typeof lucide !== 'undefined') lucide.createIcons(); }

      if (typeof window.showGlobalSyncModal === 'function') window.showGlobalSyncModal();

      try {
        const result = await apiFetch('/emails/scan');
        showToast(`Sync complete. ${result.total_extracted || 0} job(s) found.`, 'success');
        await this.checkGmailStatus();
        await this.loadStats();
      } catch (e) {
        showToast((e.message || '').includes('not connected')
          ? 'Gmail not connected. Click "Connect Gmail" first.'
          : (e.message || 'Sync failed. Try again.'), 'error');
      } finally {
        if (typeof window.hideGlobalSyncModal === 'function') window.hideGlobalSyncModal();
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i data-lucide="refresh-cw" style="width:14px;height:14px;display:inline;"></i> Sync Now';
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }
      }
    });
  }
};

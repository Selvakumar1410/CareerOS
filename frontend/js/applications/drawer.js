/**
 * drawer.js – Application Detail Drawer for V3
 * Uses ws-drawer / ws-overlay classes defined in applications.css
 */

window.AppDrawer = {
  currentAppId: null,

  init() {
    this.drawer  = document.getElementById('appDrawer');
    this.overlay = document.getElementById('appDrawerOverlay');

    // Tab switching
    document.querySelectorAll('.ws-tab-btn').forEach(btn => {
      btn.addEventListener('click', e => this._switchTab(e.currentTarget));
    });
  },

  _switchTab(btn) {
    document.querySelectorAll('.ws-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.getAttribute('data-target');
    document.querySelectorAll('.ws-tab-pane').forEach(pane => {
      pane.style.display = pane.id === target ? 'block' : 'none';
    });
  },

  open(job) {
    if (!this.drawer || !this.overlay || !job) return;
    this.currentAppId = job.id;

    // Header
    document.getElementById('drawerLogo').textContent    = (job.company || 'C').charAt(0).toUpperCase();
    document.getElementById('drawerCompany').textContent = job.company  || 'Unknown Company';
    document.getElementById('drawerRole').textContent    = job.role     || 'Unknown Role';

    // Overview
    const statusEl = document.getElementById('drawerStatusText');
    statusEl.textContent = job.status || 'Unknown';
    const colorMap = {
      applied: '#3B82F6', assessment: '#A855F7',
      interview: '#F59E0B', offer: '#10B981', rejected: '#EF4444'
    };
    statusEl.style.color = colorMap[(job.status || '').toLowerCase()] || 'var(--text-primary)';

    document.getElementById('drawerDate').textContent     = window.AppUtils ? AppUtils.formatDate(job.applied_date) : (job.applied_date || 'Not Available');
    document.getElementById('drawerLocation').textContent = AppUtils ? AppUtils.safeNull(job.location)  : (job.location  || 'Not Available');
    document.getElementById('drawerSource').textContent   = AppUtils ? AppUtils.safeNull(job.source)    : (job.source    || 'Not Available');
    document.getElementById('drawerWorkMode').textContent = AppUtils ? AppUtils.safeNull(job.work_mode) : (job.work_mode || 'Not Available');
    document.getElementById('drawerSalary').textContent   = AppUtils ? AppUtils.safeNull(job.salary)    : (job.salary    || 'Not Available');

    const linkEl = document.getElementById('drawerJobLink');
    if (job.job_url) {
      linkEl.textContent = job.job_url;
      linkEl.href = job.job_url;
    } else {
      linkEl.textContent = 'Not Available';
      linkEl.href = '#';
    }

    // Reset to Overview tab
    const overviewBtn = document.querySelector('.ws-tab-btn[data-target="tab-overview"]');
    if (overviewBtn) this._switchTab(overviewBtn);

    // Contextual CareerAI
    if (window.AppCareerAI) AppCareerAI.renderContextualAI(job.id);

    // Show overlay + drawer
    this.overlay.style.display = 'block';
    requestAnimationFrame(() => this.drawer.classList.add('open'));

    // Re-render icons inside drawer
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  close() {
    if (!this.drawer || !this.overlay) return;
    this.drawer.classList.remove('open');
    setTimeout(() => { this.overlay.style.display = 'none'; }, 300);
    this.currentAppId = null;
  }
};

window.closeDrawer = () => { if (window.AppDrawer) AppDrawer.close(); };

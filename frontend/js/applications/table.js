/**
 * table.js – DataGrid rendering + Quick Previews
 */

window.AppTable = {
  jobsData: [],

  init() {
    this.tableBody    = document.getElementById('appTableBody');
    this.emptyState   = document.getElementById('tableEmptyState');
    this.tableWrap    = document.querySelector('.ws-table-wrap');
    this.quickPreview = document.getElementById('quickPreview');

    if (this.tableBody && this.quickPreview) {
      this.tableBody.addEventListener('mouseleave', () => {
        this.quickPreview.classList.remove('visible');
      });
    }
  },

  render(jobs) {
    this.jobsData = jobs;
    if (!this.tableBody) return;

    if (!jobs || jobs.length === 0) {
      if (this.tableWrap)  this.tableWrap.style.display  = 'none';
      if (this.emptyState) this.emptyState.style.display = 'flex';
      return;
    }

    if (this.tableWrap)  this.tableWrap.style.display  = '';
    if (this.emptyState) this.emptyState.style.display = 'none';

    this.tableBody.innerHTML = '';

    jobs.forEach(job => {
      const statusKey   = (job.status || '').toLowerCase().replace(' ', '');
      const statusLabel = job.status || 'Unknown';
      const initial     = (job.company || 'C').charAt(0).toUpperCase();
      const dateStr     = window.AppUtils ? AppUtils.formatDate(job.applied_date) : (job.applied_date || '—');
      const location    = window.AppUtils ? AppUtils.safeNull(job.location,  '—') : (job.location  || '—');
      const source      = window.AppUtils ? AppUtils.safeNull(job.source,    '—') : (job.source    || '—');

      const tr = document.createElement('tr');
      tr._jobData = job;
      tr.innerHTML = `
        <td onclick="event.stopPropagation()">
          <input type="checkbox" class="ws-checkbox row-checkbox" data-id="${job.id}">
        </td>
        <td onclick="AppDrawer.open(this.closest('tr')._jobData)">
          <div class="ws-company-logo">${initial}</div>
        </td>
        <td onclick="AppDrawer.open(this.closest('tr')._jobData)">
          <strong style="font-weight:700;">${this._esc(job.company || '—')}</strong>
        </td>
        <td onclick="AppDrawer.open(this.closest('tr')._jobData)" style="color:var(--text-secondary);">
          ${this._esc(job.role || '—')}
        </td>
        <td onclick="AppDrawer.open(this.closest('tr')._jobData)" style="color:var(--text-secondary);">
          ${this._esc(location)}
        </td>
        <td onclick="AppDrawer.open(this.closest('tr')._jobData)">
          <span class="ws-status-badge ws-status-${statusKey}">${statusLabel}</span>
        </td>
        <td onclick="AppDrawer.open(this.closest('tr')._jobData)" style="color:var(--text-secondary);">${dateStr}</td>
        <td onclick="AppDrawer.open(this.closest('tr')._jobData)" style="color:var(--text-secondary);">${this._esc(source)}</td>
        <td onclick="AppDrawer.open(this.closest('tr')._jobData)">
          <span style="font-size:0.78rem;font-weight:600;color:var(--status-rejected);">—</span>
        </td>
        <td onclick="AppDrawer.open(this.closest('tr')._jobData)" style="text-align:right;">
          <span style="font-size:0.78rem;font-weight:700;color:var(--status-offer);">—</span>
        </td>
        <td onclick="event.stopPropagation()">
          <div class="ws-row-actions">
            <button class="action-btn" title="View" onclick="AppDrawer.open(this.closest('tr')._jobData)">
              <i data-lucide="eye" style="width:15px;height:15px;"></i>
            </button>
            <button class="action-btn" title="AI Actions">
              <i data-lucide="sparkles" style="width:15px;height:15px;color:var(--accent-purple);"></i>
            </button>
          </div>
        </td>
      `;

      // Quick Preview on hover
      tr.addEventListener('mouseenter', e => this._showPreview(e, job));

      this.tableBody.appendChild(tr);
    });

    // Bind bulk checkboxes
    this.tableBody.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.addEventListener('change', e => {
        if (window.AppBulkActions) AppBulkActions.handleRowCheck(e);
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
    if (window.AppAnimations) AppAnimations.staggerRows();
  },

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  _showPreview(e, job) {
    if (!this.quickPreview) return;
    const rect    = e.currentTarget.getBoundingClientRect();
    const initial = (job.company || 'C').charAt(0).toUpperCase();
    const dateStr = window.AppUtils ? AppUtils.formatDate(job.applied_date) : (job.applied_date || '—');
    const statusKey = (job.status || '').toLowerCase();

    this.quickPreview.innerHTML = `
      <div class="ws-preview-header">
        <div class="ws-preview-logo">${initial}</div>
        <div>
          <div class="ws-preview-company">${this._esc(job.company || '—')}</div>
          <div class="ws-preview-role">${this._esc(job.role || '—')}</div>
        </div>
      </div>
      <div class="ws-preview-grid">
        <div>
          <span class="ws-preview-field-label">Status</span>
          <span class="ws-status-badge ws-status-${statusKey}" style="font-size:0.75rem;">${job.status || '—'}</span>
        </div>
        <div>
          <span class="ws-preview-field-label">Applied</span>
          <strong style="font-size:0.82rem;">${dateStr}</strong>
        </div>
        <div>
          <span class="ws-preview-field-label">AI Match</span>
          <strong style="font-size:0.82rem;color:var(--text-secondary);">—</strong>
        </div>
        <div>
          <span class="ws-preview-field-label">Next Action</span>
          <strong style="font-size:0.82rem;color:var(--text-secondary);">—</strong>
        </div>
      </div>
    `;

    this.quickPreview.style.top  = `${rect.top + rect.height / 2 - 60}px`;
    this.quickPreview.style.left = `${Math.min(rect.left + 80, window.innerWidth - 280)}px`;
    this.quickPreview.classList.add('visible');
  }
};

/**
 * mvp-applications.js
 * Clean CRUD management for the Applications page.
 */

const MVPApps = {
  allJobs: [],
  deleteTargetId: null,

  async init() {
    if (!requireAuth()) return;

    // Set today's date as default for Add modal
    const addDate = document.getElementById('addDate');
    if (addDate) addDate.value = new Date().toISOString().split('T')[0];

    // Filters
    const search = document.getElementById('appSearch');
    const status = document.getElementById('filterStatus');
    const sort   = document.getElementById('filterSort');
    if (search) search.addEventListener('input', () => this.applyFilters());
    if (status) status.addEventListener('change', () => this.applyFilters());
    if (sort)   sort.addEventListener('change',   () => this.applyFilters());

    // Sync Gmail buttons
    document.getElementById('btnSyncGmailApps')?.addEventListener('click', () => this.syncGmail());
    document.getElementById('btnSyncEmpty')?.addEventListener('click', () => this.syncGmail());

    // Close modals on backdrop click
    ['addModal', 'editModal', 'deleteModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => { if (e.target === el) this.closeModal(id); });
    });

    await this.loadJobs();
  },

  async loadJobs() {
    try {
      const jobs = await apiFetch('/jobs');
      this.allJobs = Array.isArray(jobs) ? jobs : [];
    } catch (e) {
      this.allJobs = [];
      showToast('Failed to load applications.', 'error');
    }
    this.applyFilters();
    this._hideSkeleton();
  },

  _hideSkeleton() {
    const sk = document.getElementById('appsSkeleton');
    const tb = document.getElementById('appsTable');
    if (sk) sk.style.display = 'none';
    if (tb) tb.style.display = '';
  },

  applyFilters() {
    const q      = (document.getElementById('appSearch')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filterStatus')?.value || '';
    const sort   = document.getElementById('filterSort')?.value || 'newest';

    let jobs = [...this.allJobs];

    if (q) {
      jobs = jobs.filter(j => (j.company + ' ' + j.role).toLowerCase().includes(q));
    }
    if (status) {
      jobs = jobs.filter(j => j.status === status);
    }
    if (sort === 'oldest') {
      jobs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const countEl = document.getElementById('appCount');
    if (countEl) countEl.textContent = `${jobs.length} application${jobs.length !== 1 ? 's' : ''}`;

    this.renderTable(jobs);
  },

  renderTable(jobs) {
    const tbody = document.getElementById('appsTableBody');
    const table = document.getElementById('appsTable');
    const empty = document.getElementById('appsEmpty');
    if (!tbody) return;

    if (jobs.length === 0) {
      if (table) table.style.display = 'none';
      if (empty) empty.style.display = 'block';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    if (table) table.style.display = '';
    if (empty) empty.style.display = 'none';

    const statusColor = {
      Applied: '#3B82F6', Assessment: '#A855F7',
      Interview: '#F59E0B', Offer: '#10B981',
      Rejected: '#EF4444', Shortlisted: '#3B82F6'
    };

    tbody.innerHTML = jobs.map(j => {
      const color   = statusColor[j.status] || '#9CA3AF';
      const initial = (j.company || 'C').charAt(0).toUpperCase();
      const applied = j.applied_date ? formatDate(j.applied_date) : '—';
      const updated = j.updated_at   ? formatDate(j.updated_at)   : '—';

      return `
        <tr>
          <td>
            <div class="co-logo" style="background:${color}18;color:${color};">${initial}</div>
          </td>
          <td style="font-weight:700;">${escapeHtml(j.company)}</td>
          <td style="color:var(--text-secondary);">${escapeHtml(j.role)}</td>
          <td style="color:var(--text-secondary);">${escapeHtml(j.location || '—')}</td>
          <td><span class="status-pill sp-${escapeHtml(j.status)}">${escapeHtml(j.status)}</span></td>
          <td style="color:var(--text-secondary);font-size:0.82rem;">${applied}</td>
          <td style="color:var(--text-secondary);font-size:0.82rem;">${updated}</td>
          <td>
            <div class="row-actions">
              <button class="row-btn" title="Edit" onclick="MVPApps.openEdit(${j.id})">
                <i data-lucide="edit-2" style="width:13px;height:13px;"></i>
              </button>
              <button class="row-btn del" title="Delete" onclick="MVPApps.openDelete(${j.id}, '${escapeHtml(j.company)}')">
                <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  },
  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  },

  // ── ADD ──
  async save() {
    const company = document.getElementById('addCompany')?.value.trim();
    const role    = document.getElementById('addRole')?.value.trim();
    const location = document.getElementById('addLocation')?.value.trim();
    const status  = document.getElementById('addStatus')?.value || 'Applied';
    const date    = document.getElementById('addDate')?.value;
    const interviewDate = document.getElementById('addInterviewDate')?.value;
    const assessmentDate = document.getElementById('addAssessmentDate')?.value;

    if (!company || !role) {
      showToast('Company and Role are required.', 'error');
      return;
    }

    const btn = document.getElementById('btnSave');
    this._setLoading(btn, true, 'Saving...');

    try {
      await apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify({ 
          company, role, status, 
          applied_date: date || null,
          interview_date: interviewDate || null,
          assessment_date: assessmentDate || null 
        })
      });
      showToast('Application saved!', 'success');
      this.closeModal('addModal');
      this._clearForm(['addCompany', 'addRole']);
      await this.loadJobs();
    } catch (e) {
      showToast(e.message || 'Failed to save.', 'error');
    } finally {
      this._setLoading(btn, false, '<i data-lucide="plus" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i> Save Application');
    }
  },

  // ── EDIT ──
  openEdit(id) {
    const job = this.allJobs.find(j => j.id === id);
    if (!job) return;
    if (document.getElementById('editCompany')) document.getElementById('editCompany').value = job.company || '';
    if (document.getElementById('editRole')) document.getElementById('editRole').value = job.role || '';
    if (document.getElementById('editLocation')) document.getElementById('editLocation').value = job.location || '';
    if (document.getElementById('editStatus')) document.getElementById('editStatus').value = job.status || 'Applied';
    document.getElementById('editDate').value    = (job.applied_date || '').split('T')[0];
    document.getElementById('editInterviewDate').value = (job.interview_date || '').split('T')[0];
    document.getElementById('editAssessmentDate').value = (job.assessment_date || '').split('T')[0];
    this.openModal('editModal');
  },

  async update() {
    const id      = document.getElementById('editId')?.value;
    const company = document.getElementById('editCompany')?.value.trim();
    const role    = document.getElementById('editRole')?.value.trim();
    const location = document.getElementById('editLocation')?.value.trim();
    const status  = document.getElementById('editStatus')?.value;
    const date    = document.getElementById('editDate')?.value;
    const interviewDate = document.getElementById('editInterviewDate')?.value;
    const assessmentDate = document.getElementById('editAssessmentDate')?.value;

    if (!company || !role) {
      showToast('Company and Role are required.', 'error');
      return;
    }

    const btn = document.getElementById('btnUpdate');
    this._setLoading(btn, true, 'Saving...');

    try {
      await apiFetch(`/jobs/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          company, role, location, status, 
          applied_date: date || null,
          interview_date: interviewDate || null,
          assessment_date: assessmentDate || null 
        })
      });
      showToast('Application updated!', 'success');
      this.closeModal('editModal');
      await this.loadJobs();
    } catch (e) {
      showToast(e.message || 'Failed to update.', 'error');
    } finally {
      this._setLoading(btn, false, '<i data-lucide="save" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i> Update');
    }
  },

  // ── DELETE ──
  openDelete(id, company) {
    this.deleteTargetId = id;
    const nameEl = document.getElementById('deleteAppName');
    if (nameEl) nameEl.textContent = company;
    this.openModal('deleteModal');
  },

  async confirmDelete() {
    if (!this.deleteTargetId) return;
    const btn = document.getElementById('btnConfirmDelete');
    this._setLoading(btn, true, 'Deleting...');

    try {
      await apiFetch(`/jobs/${this.deleteTargetId}`, { method: 'DELETE' });
      showToast('Application deleted.', 'success');
      this.closeModal('deleteModal');
      this.deleteTargetId = null;
      await this.loadJobs();
    } catch (e) {
      showToast(e.message || 'Failed to delete.', 'error');
    } finally {
      this._setLoading(btn, false, '<i data-lucide="trash-2" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i> Delete');
    }
  },

  // ── GMAIL SYNC ──
  async syncGmail() {
    const btn = document.getElementById('btnSyncGmailApps');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" style="width:14px;animation:spin 1s linear infinite;display:inline;"></i> Syncing...'; if (typeof lucide !== 'undefined') lucide.createIcons(); }

    try {
      const result = await apiFetch('/emails/scan');
      showToast(`Sync complete. ${result.jobs_extracted || 0} new job(s) found.`, 'success');
      await this.loadJobs();
    } catch (e) {
      if ((e.message || '').includes('not connected')) {
        showToast('Gmail not connected. Go to Settings to connect.', 'warning');
        setTimeout(() => window.location.href = '/settings', 2000);
      } else {
        showToast('Gmail sync failed. Try again.', 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="inbox" style="width:15px;height:15px;display:inline;vertical-align:middle;"></i> Sync Gmail';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }
  },

  _setLoading(btn, loading, label) {
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading ? label : label;
    if (!loading && typeof lucide !== 'undefined') lucide.createIcons();
  },

  _clearForm(ids) {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
};

// Global alias for inline onclick (dashboard modal)
function openAddModal() { MVPApps.openModal('addModal'); }
function closeAddModal(e) { if (!e || e.target === document.getElementById('addModal')) MVPApps.closeModal('addModal'); }
function saveApplication() { MVPApps.save(); }

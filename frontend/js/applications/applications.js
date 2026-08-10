/**
 * applications.js – Main orchestrator for Applications V3
 */

window.AppWorkspace = {
  rawData:      [],
  filteredData: [],

  init() {
    if (window.AppFilters)     AppFilters.init(f => this.applyFilters(f));
    if (window.AppViews)       AppViews.init();
    if (window.AppBulkActions) AppBulkActions.init();
    if (window.AppDrawer)      AppDrawer.init();
    if (window.AppTable)       AppTable.init();

    // Stat card click handlers (filter by status)
    const cardMap = {
      statCardTotal:      '',
      statCardAssessment: 'Assessment',
      statCardInterview:  'Interview',
      statCardOffer:      'Offer',
      statCardRejected:   'Rejected'
    };
    Object.entries(cardMap).forEach(([id, status]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => window.setFilter('status', status));
    });

    this.fetchData();
  },

  async fetchData() {
    try {
      const resp = await fetch('/api/jobs');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      this.rawData     = Array.isArray(data) ? data : [];
      this.filteredData = [...this.rawData];
      this._hydrate();
    } catch (err) {
      console.error('[AppWorkspace] fetchData error:', err);
      this._hydrate([]);
    }
  },

  _hydrate(override) {
    const data = override !== undefined ? override : this.filteredData;
    if (window.AppAnimations) {
      AppAnimations.fadeSkeletonOut(() => {
        this._updateStats();
        if (window.AppTable) AppTable.render(data);
        AppAnimations.initCounters();
      });
    } else {
      const sk = document.getElementById('workspaceSkeleton');
      const wc = document.getElementById('workspaceContent');
      if (sk) sk.style.display = 'none';
      if (wc) wc.style.display = 'block';
      this._updateStats();
      if (window.AppTable) AppTable.render(data);
    }
  },

  applyFilters(filters) {
    this.filteredData = this.rawData.filter(job => {
      if (filters.search) {
        const haystack = `${job.company} ${job.role} ${job.location || ''}`.toLowerCase();
        if (!haystack.includes(filters.search)) return false;
      }
      if (filters.status && filters.status !== 'All') {
        if (job.status !== filters.status) return false;
      }
      // priority / workMode: skip until backend provides them
      return true;
    });

    if (window.AppTable)       AppTable.render(this.filteredData);
    if (window.AppBulkActions) AppBulkActions.clearSelection();
  },

  _updateStats() {
    const counts = { total: this.rawData.length, assessment: 0, interview: 0, offer: 0, rejected: 0 };
    this.rawData.forEach(j => {
      const s = (j.status || '').toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) { el.setAttribute('data-target', String(val)); el.textContent = String(val); }
    };
    set('statTotal',        counts.total);
    set('statAssessment',   counts.assessment);
    set('statInterview',    counts.interview);
    set('statOffer',        counts.offer);
    set('statRejected',     counts.rejected);

    const responded = counts.assessment + counts.interview + counts.offer + counts.rejected;
    const rate = counts.total > 0 ? Math.round((responded / counts.total) * 100) : 0;
    const rrEl = document.getElementById('statResponseRate');
    if (rrEl) { rrEl.setAttribute('data-target', rate + '%'); rrEl.textContent = rate + '%'; }

    // Quick Insights
    const pending = Math.max(0, counts.total - responded);
    const setI = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setI('insightPending',    pending);
    setI('insightInterviews', counts.interview);
    setI('insightFollowup',   0); // no backend field yet
    setI('insightWeekly',     this._countThisWeek());
  },

  _countThisWeek() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return this.rawData.filter(j => {
      if (!j.applied_date) return false;
      return new Date(j.applied_date) >= weekAgo;
    }).length;
  }
};

/* ── Global helpers for inline HTML ── */
window.setFilter = (key, value) => { if (window.AppFilters) AppFilters.setExternalFilter(key, value); };
window.openAddModal = () => { console.log('Open add modal (TODO)'); };

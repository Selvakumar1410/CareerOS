/**
 * filters.js – Search, Saved Views, and filter dropdowns
 */

window.AppFilters = {
  currentFilters: { search: '', status: 'All', priority: '', workMode: '' },
  callback: null,
  _debounceTimer: null,

  init(onFilterChange) {
    this.callback = onFilterChange;

    // Search input – debounced
    const searchEl = document.getElementById('appSearch');
    if (searchEl) {
      searchEl.addEventListener('input', e => {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
          this.currentFilters.search = e.target.value.toLowerCase().trim();
          this._apply();
        }, 220);
      });
    }

    // Status dropdown
    const statusSel = document.getElementById('filterStatus');
    if (statusSel) {
      statusSel.addEventListener('change', e => {
        this.currentFilters.status = e.target.value || 'All';
        this._syncViewTabs();
        this._apply();
      });
    }

    // Priority dropdown (for future backend)
    const prioritySel = document.getElementById('filterPriority');
    if (prioritySel) {
      prioritySel.addEventListener('change', e => {
        this.currentFilters.priority = e.target.value;
        this._apply();
      });
    }

    // Work Mode dropdown (for future backend)
    const workModeSel = document.getElementById('filterWorkMode');
    if (workModeSel) {
      workModeSel.addEventListener('change', e => {
        this.currentFilters.workMode = e.target.value;
        this._apply();
      });
    }

    // Saved view tabs
    document.querySelectorAll('.ws-view-tab').forEach(tab => {
      tab.addEventListener('click', e => {
        document.querySelectorAll('.ws-view-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const view = e.currentTarget.getAttribute('data-view');
        this.currentFilters.status = view;

        // Sync status dropdown
        const statusDropdown = document.getElementById('filterStatus');
        if (statusDropdown) {
          statusDropdown.value = (view === 'All' || view === 'Bookmarked' || view === 'Archived') ? '' : view;
        }
        this._apply();
      });
    });
  },

  setExternalFilter(key, value) {
    this.currentFilters[key] = value || 'All';
    this._syncViewTabs();
    this._apply();
  },

  _syncViewTabs() {
    const s = this.currentFilters.status;
    document.querySelectorAll('.ws-view-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-view') === s);
    });
    // Fallback to 'All' tab if no match
    const anyActive = document.querySelector('.ws-view-tab.active');
    if (!anyActive) {
      const allTab = document.querySelector('.ws-view-tab[data-view="All"]');
      if (allTab) allTab.classList.add('active');
    }
  },

  _apply() {
    if (typeof this.callback === 'function') this.callback(this.currentFilters);
  }
};

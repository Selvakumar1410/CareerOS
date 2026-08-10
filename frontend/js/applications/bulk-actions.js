/**
 * bulk-actions.js – Multi-select and floating bulk toolbar
 */

window.AppBulkActions = {
  selectedIds: new Set(),

  init() {
    this.toolbar  = document.getElementById('bulkToolbar');
    this.countEl  = document.getElementById('bulkCount');
    this.selectAllCb = document.getElementById('selectAll');

    if (this.selectAllCb) {
      this.selectAllCb.addEventListener('change', e => {
        document.querySelectorAll('.row-checkbox').forEach(cb => {
          cb.checked = e.target.checked;
          if (e.target.checked) this.selectedIds.add(cb.getAttribute('data-id'));
          else this.selectedIds.delete(cb.getAttribute('data-id'));
        });
        this._update();
      });
    }
  },

  handleRowCheck(e) {
    const id = e.target.getAttribute('data-id');
    if (e.target.checked) this.selectedIds.add(id);
    else {
      this.selectedIds.delete(id);
      if (this.selectAllCb) this.selectAllCb.checked = false;
    }
    this._update();
  },

  clearSelection() {
    this.selectedIds.clear();
    document.querySelectorAll('.row-checkbox, #selectAll').forEach(cb => cb.checked = false);
    this._update();
  },

  _update() {
    if (!this.toolbar || !this.countEl) return;
    this.countEl.textContent = this.selectedIds.size;

    if (this.selectedIds.size > 0) {
      this.toolbar.classList.add('visible');
    } else {
      this.toolbar.classList.remove('visible');
    }
  }
};

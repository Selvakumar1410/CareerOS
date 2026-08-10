/**
 * utils.js
 * Shared helpers for the Applications module.
 */

window.AppUtils = {
  formatDate(dateString) {
    if (!dateString) return 'Not Available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  safeNull(value, fallback = 'Not Available') {
    return (value !== null && value !== undefined && value !== '') ? value : fallback;
  },

  getStatusColor(status) {
    const s = status.toLowerCase();
    const map = {
      'applied': 'var(--status-applied)',
      'assessment': 'var(--status-assessment)',
      'interview': 'var(--status-interview)',
      'offer': 'var(--status-offer)',
      'rejected': 'var(--status-rejected)',
      'joined': 'var(--accent-blue)'
    };
    return map[s] || 'var(--text-secondary)';
  }
};

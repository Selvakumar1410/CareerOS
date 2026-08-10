/**
 * mvp-notifications.js
 */

const MVPNotifications = {
  async init() {
    if (!requireAuth()) return;

    document.getElementById('btnMarkAll')?.addEventListener('click', () => this.markAllRead());
    await this.loadNotifications();
  },

  async loadNotifications() {
    try {
      const data = await apiFetch('/api/notifications');
      this.render(Array.isArray(data) ? data : []);
    } catch (e) {
      this.render([]);
    }
  },

  render(notifications) {
    const skeleton = document.getElementById('notifSkeleton');
    const list     = document.getElementById('notifList');
    const empty    = document.getElementById('notifEmpty');
    if (skeleton) skeleton.style.display = 'none';

    if (notifications.length === 0) {
      if (list)  list.style.display  = 'none';
      if (empty) empty.style.display = 'block';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    if (list)  list.style.display  = 'block';
    if (empty) empty.style.display = 'none';

    const typeConfig = {
      interview:   { icon: 'mic',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
      assessment:  { icon: 'pen-tool',   color: '#A855F7', bg: 'rgba(168,85,247,0.12)' },
      email_parsed:{ icon: 'mail',       color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
      offer:       { icon: 'award',      color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
      rejected:    { icon: 'x-circle',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
      reminder:    { icon: 'clock',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
      default:     { icon: 'bell',       color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    };

    list.innerHTML = notifications.map(n => {
      const cfg = typeConfig[n.type] || typeConfig.default;
      const timeAgo = this._timeAgo(n.created_at);
      return `
        <div class="notif-list-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" onclick="MVPNotifications.markRead(${n.id}, this)">
          <div class="notif-icon" style="background:${cfg.bg};">
            <i data-lucide="${cfg.icon}" style="width:17px;height:17px;color:${cfg.color};"></i>
          </div>
          <div class="notif-content">
            <div class="notif-item-title">${escapeHtml(n.title || 'Notification')}</div>
            <div class="notif-item-msg">${escapeHtml(n.message || '')}</div>
            <div class="notif-item-time">${timeAgo}</div>
          </div>
          ${!n.is_read ? '<div class="notif-unread-dot"></div>' : '<div class="notif-read-dot"></div>'}
        </div>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async markRead(id, el) {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (el) {
        el.classList.remove('unread');
        const dot = el.querySelector('.notif-unread-dot');
        if (dot) { dot.className = 'notif-read-dot'; }
      }
      // Update badge
      const badge = document.getElementById('notifBadge');
      if (badge) {
        const cur = parseInt(badge.textContent) || 0;
        const next = Math.max(0, cur - 1);
        if (next === 0) badge.style.display = 'none';
        else badge.textContent = next > 9 ? '9+' : next;
      }
    } catch (e) { /* silent */ }
  },

  async markAllRead() {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      showToast('All notifications marked as read.', 'success');
      const badge = document.getElementById('notifBadge');
      if (badge) badge.style.display = 'none';
      await this.loadNotifications();
    } catch (e) {
      showToast('Failed to mark notifications as read.', 'error');
    }
  },

  _timeAgo(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}d ago`;
    return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

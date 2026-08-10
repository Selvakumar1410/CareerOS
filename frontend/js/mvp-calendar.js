/**
 * mvp-calendar.js
 * Renders a monthly calendar with interview/assessment events from /api/jobs.
 */

const MVPCal = {
  today: new Date(),
  current: null,  // { year, month }
  jobs: [],
  events: {},     // { "YYYY-MM-DD": [{ type, company, role }] }

  async init() {
    if (!requireAuth()) return;
    this.current = { year: this.today.getFullYear(), month: this.today.getMonth() };
    await this.loadJobs();
    this.render();
  },

  async loadJobs() {
    try {
      const jobs = await apiFetch('/jobs');
      this.jobs = Array.isArray(jobs) ? jobs : [];
      this._buildEvents();
    } catch (e) {
      this.jobs = [];
    }
  },

  _buildEvents() {
    this.events = {};

    const addEvent = (dateStr, type, company, role) => {
      if (!dateStr) return;
      const key = dateStr.split('T')[0];
      if (!this.events[key]) this.events[key] = [];
      this.events[key].push({ type, company, role });
    };

    this.jobs.forEach(j => {
      if (j.applied_date)    addEvent(j.applied_date,    'applied',    j.company, j.role);
      if (j.interview_date)  addEvent(j.interview_date,  'interview',  j.company, j.role);
      if (j.assessment_date) addEvent(j.assessment_date, 'assessment', j.company, j.role);
    });

    // Fallback: if jobs have status Interview/Assessment but no date, use applied_date as hint
    this.jobs.forEach(j => {
      if (!j.interview_date && j.status === 'Interview' && j.applied_date) {
        // Don't add — no date, no calendar entry
      }
    });
  },

  render() {
    const { year, month } = this.current;
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calMonthLabel').textContent = `${MONTHS[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();  // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = this.today.toISOString().split('T')[0];

    let cells = '';

    // Leading days from prev month
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      cells += `<div class="cal-cell other-month"><div class="cal-day-num">${day}</div></div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const evs = this.events[dateStr] || [];

      const eventHtml = evs.slice(0, 3).map(ev => {
        let cls = 'ev-applied';
        let label = '📬';
        if (ev.type === 'interview') { cls = 'ev-interview'; label = '🎤'; }
        else if (ev.type === 'assessment') { cls = 'ev-assessment'; label = '📝'; }
        
        return `<div class="cal-event ${cls}" onclick="MVPCal.showDetail('${dateStr}', event)" title="${ev.company} — ${ev.role}">${label} ${escapeHtml(ev.company)}</div>`;
      }).join('');

      const hasMore = evs.length > 3 ? `<div style="font-size:0.7rem;color:var(--text-secondary);margin-top:2px;cursor:pointer;" onclick="MVPCal.showDetail('${dateStr}', event)">+${evs.length - 3} more</div>` : '';

      cells += `
        <div class="cal-cell ${isToday ? 'today' : ''} ${evs.length ? 'has-events' : ''}"
             data-date="${dateStr}">
          <div class="cal-day-num">${d}</div>
          ${eventHtml}
          ${hasMore}
        </div>`;
    }

    // Trailing days from next month
    const totalCells = firstDay + daysInMonth;
    const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= trailing; d++) {
      cells += `<div class="cal-cell other-month"><div class="cal-day-num">${d}</div></div>`;
    }

    document.getElementById('calGrid').innerHTML = cells;

    // Hide detail panel on new render
    const detail = document.getElementById('calDetail');
    if (detail) detail.style.display = 'none';

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  showDetail(dateStr, e) {
    e.stopPropagation();
    const evs = this.events[dateStr] || [];
    if (!evs.length) return;

    const d = new Date(dateStr + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    document.getElementById('calDetailTitle').textContent = label;

    const typeConfig = {
      applied:    { icon: 'send',       color: '#2563eb', bg: 'rgba(59,130,246,0.1)', label: 'Applied' },
      interview:  { icon: 'mic',        color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  label: 'Interview' },
      assessment: { icon: 'pen-tool',   color: '#A855F7', bg: 'rgba(168,85,247,0.1)', label: 'Assessment' }
    };

    document.getElementById('calDetailList').innerHTML = evs.map(ev => {
      const cfg = typeConfig[ev.type] || typeConfig.interview;
      return `
        <div class="cal-detail-item">
          <div class="cal-detail-icon" style="background:${cfg.bg};">
            <i data-lucide="${cfg.icon}" style="width:16px;height:16px;color:${cfg.color};"></i>
          </div>
          <div class="cal-detail-text">
            <strong>${escapeHtml(ev.company)}</strong>
            <span>${escapeHtml(ev.role)} — <span style="color:${cfg.color};font-weight:700;">${cfg.label}</span></span>
          </div>
        </div>`;
    }).join('');

    const panel = document.getElementById('calDetail');
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  prevMonth() {
    let { year, month } = this.current;
    month--;
    if (month < 0) { month = 11; year--; }
    this.current = { year, month };
    this.render();
  },

  nextMonth() {
    let { year, month } = this.current;
    month++;
    if (month > 11) { month = 0; year++; }
    this.current = { year, month };
    this.render();
  },

  goToday() {
    this.current = { year: this.today.getFullYear(), month: this.today.getMonth() };
    this.render();
  }
};

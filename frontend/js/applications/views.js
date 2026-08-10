/**
 * views.js – Table / Board / Timeline view switcher
 */

window.AppViews = {
  init() {
    const btns  = document.querySelectorAll('.ws-switcher-btn');
    const views = {
      table:    document.getElementById('tableView'),
      board:    document.getElementById('boardView'),
      timeline: document.getElementById('timelineView')
    };

    btns.forEach(btn => {
      btn.addEventListener('click', e => {
        const type = e.currentTarget.getAttribute('data-type');

        btns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        Object.values(views).forEach(v => { if (v) v.style.display = 'none'; });
        if (views[type]) {
          views[type].style.display = 'block';
          if (typeof gsap !== 'undefined') {
            gsap.from(views[type], { opacity: 0, y: 8, duration: 0.25, ease: 'power2.out' });
          }
        }
      });
    });
  }
};

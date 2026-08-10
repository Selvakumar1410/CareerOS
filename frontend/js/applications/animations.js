/**
 * animations.js – GSAP orchestration for Applications V3
 */

window.AppAnimations = {
  initCounters() {
    if (typeof gsap === 'undefined') return;
    
    // Use data-target attribute for target values
    ['statTotal','statAssessment','statInterview','statOffer','statRejected'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const target = parseFloat(el.getAttribute('data-target') || el.textContent || '0');
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.2,
        ease: 'power3.out',
        onUpdate: () => { el.textContent = Math.floor(obj.val); }
      });
    });

    // Response rate (with %)
    const rrEl = document.getElementById('statResponseRate');
    if (rrEl) {
      const rawTarget = rrEl.getAttribute('data-target') || '0%';
      const target = parseFloat(rawTarget.replace('%','')) || 0;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.2,
        ease: 'power3.out',
        onUpdate: () => { rrEl.textContent = Math.floor(obj.val) + '%'; }
      });
    }
  },

  fadeSkeletonOut(callback) {
    const skeleton = document.getElementById('workspaceSkeleton');
    const content  = document.getElementById('workspaceContent');
    if (!skeleton || !content) { if (callback) callback(); return; }

    if (typeof gsap !== 'undefined') {
      gsap.to(skeleton, {
        opacity: 0, duration: 0.3, onComplete: () => {
          skeleton.style.display = 'none';
          content.style.display  = 'block';
          gsap.from(content, { opacity: 0, y: 12, duration: 0.35 });
          if (callback) callback();
        }
      });
    } else {
      skeleton.style.display = 'none';
      content.style.display  = 'block';
      if (callback) callback();
    }
  },

  staggerRows() {
    if (typeof gsap === 'undefined') return;
    gsap.from('#appTableBody tr', {
      opacity: 0, y: 8,
      stagger: 0.04,
      duration: 0.3,
      ease: 'power2.out'
    });
  }
};

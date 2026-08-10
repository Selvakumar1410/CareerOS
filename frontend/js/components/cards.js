/* =====================================================================
   CareerOS | Stat Cards Component
   ===================================================================== */

function updateStatCards(jobs) {
  const total = jobs.length;
  const assessments = jobs.filter(j => j.status === "Assessment").length;
  const interviews = jobs.filter(j => j.status === "Interview").length;
  const offers = jobs.filter(j => j.status === "Offer").length;
  const responses = total > 0 ? Math.round(((total - jobs.filter(j => j.status === "Applied").length) / total) * 100) : 0;

  // Animate numbers using CountUp.js
  animateCount("statApplied", total);
  animateCount("statAssessment", assessments);
  animateCount("statInterview", interviews);
  animateCount("statOffer", offers);
  animateCount("statResponse", responses, "", "%");
}

function animateCount(elementId, targetValue, prefix = "", suffix = "") {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  if (window.countUp) {
    const countUp = new window.countUp.CountUp(elementId, targetValue, {
      prefix: prefix,
      suffix: suffix,
      duration: 2,
      useEasing: true
    });
    if (!countUp.error) {
      countUp.start();
    } else {
      el.textContent = prefix + targetValue + suffix;
    }
  } else {
    el.textContent = prefix + targetValue + suffix;
  }
}

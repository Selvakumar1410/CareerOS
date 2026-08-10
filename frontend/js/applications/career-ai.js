/**
 * career-ai.js
 * Handles contextual CareerAI inside the drawer.
 */

window.AppCareerAI = {
  renderContextualAI(appId) {
    // In the future, POST /api/applications/:id/analyze
    const jobSummaryEl = document.getElementById('aiJobSummary');
    const matchScoreEl = document.getElementById('aiMatchScore');
    const matchTextEl = document.getElementById('aiMatchText');
    
    // Simulate Skeleton/Loading state for AI
    jobSummaryEl.innerHTML = '<span class="skeleton skeleton-row w-full block"></span>';
    matchScoreEl.innerHTML = '';
    matchScoreEl.classList.add('skeleton');
    matchTextEl.innerHTML = '<span class="skeleton skeleton-row w-3/4 block"></span>';
    
    // Mock AI fetch delay
    setTimeout(() => {
      // In production, this would use actual backend data if available.
      // The rules state: "If data is unavailable, display graceful placeholders."
      // Since we have no backend AI route yet, we show a graceful placeholder.
      jobSummaryEl.innerHTML = 'AI analysis for this role is not yet available.';
      
      matchScoreEl.classList.remove('skeleton');
      matchScoreEl.innerHTML = '--%';
      matchTextEl.innerHTML = 'Resume match analysis not available.';
    }, 1500);
  },

  generateFollowUp(appId) {
    // POST /api/applications/:id/followup
    console.log("Generating AI follow up for:", appId);
  },
  
  prepareInterview(appId) {
    // POST /api/applications/:id/interview
    console.log("Generating interview prep for:", appId);
  }
};

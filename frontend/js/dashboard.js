/* =====================================================================
   CareerOS | Main Dashboard Controller
   ===================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAuth()) return;
  
  // Load Data
  loadDashboardData();

  // View Toggles (if they exist on the page)
  const btnK = document.getElementById("btnKanbanView");
  const btnD = document.getElementById("btnDataGrid");
  if (btnK) btnK.addEventListener("click", () => toggleView("kanban"));
  if (btnD) btnD.addEventListener("click", () => toggleView("datagrid"));

  // Check Gmail
  checkGmailStatus();
  
  // Render AI Brief
  if (typeof AIBrief !== 'undefined') {
      AIBrief.render();
  }
});

let globalJobs = [];

async function loadDashboardData() {
  try {
    const data = await apiFetch("/jobs");
    globalJobs = data || [];
    
    // Distribute data to components
    if (typeof updateStatCards === "function") updateStatCards(globalJobs);
    if (typeof renderTimeline === "function") renderTimeline(globalJobs);
    
    // Render new UI components (using mock data for now)
    if (typeof renderMockTasks === "function") renderMockTasks();
    if (typeof renderMockInterviews === "function") renderMockInterviews();
    if (typeof renderMockRecommendedJobs === "function") renderMockRecommendedJobs();
    
    // Trigger animations
    setTimeout(() => {
      const radial = document.getElementById("careerHealthRadial");
      if (typeof gsap !== 'undefined') {
        const scoreEl = document.querySelector(".score-value");
        const obj = { val: 0 };
        gsap.to(obj, { 
          val: 92, 
          duration: 1.5, 
          ease: "power3.out", 
          onUpdate: () => {
            if (radial) radial.style.setProperty("--progress", obj.val + "%");
            if (scoreEl) scoreEl.textContent = Math.floor(obj.val) + "%";
          }
        });
      } else if (radial) {
         radial.style.setProperty("--progress", "92%");
      }
    }, 100);
    
    // Re-initialize icons for dynamically added elements
    setTimeout(() => lucide.createIcons(), 100);
  } catch (err) {
    console.error("Failed to load dashboard data:", err);
    showToast("Failed to load applications", "error");
  }
}

function updateStatCards(jobs) {
  let applied = 0, assessment = 0, interview = 0, offer = 0;
  jobs.forEach(j => {
    if (j.status === "Applied") applied++;
    if (j.status === "Assessment") assessment++;
    if (j.status === "Interview") interview++;
    if (j.status === "Offer") offer++;
  });
  
  const responseRate = jobs.length > 0 ? Math.round(((assessment + interview + offer)/jobs.length)*100) : 0;

  if (typeof gsap !== 'undefined') {
    animateCounter("statApplied", applied);
    animateCounter("statAssessment", assessment);
    animateCounter("statInterview", interview);
    animateCounter("statOffer", offer);
    animateCounter("statResponse", responseRate, "%");
  } else {
    if(document.getElementById("statApplied")) document.getElementById("statApplied").textContent = applied;
    if(document.getElementById("statAssessment")) document.getElementById("statAssessment").textContent = assessment;
    if(document.getElementById("statInterview")) document.getElementById("statInterview").textContent = interview;
    if(document.getElementById("statOffer")) document.getElementById("statOffer").textContent = offer;
    if(document.getElementById("statResponse")) document.getElementById("statResponse").textContent = responseRate + "%";
  }
}

function animateCounter(id, value, suffix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  const obj = { val: 0 };
  gsap.to(obj, {
    val: value,
    duration: 1.5,
    ease: "power3.out",
    onUpdate: () => {
      el.textContent = Math.floor(obj.val) + suffix;
    }
  });
}

function renderTimeline(jobs) {
  // Aliased to Recent Activity for the new dashboard
  const container = document.getElementById("recentActivityList");
  if (!container) return;
  container.innerHTML = "";

  if (jobs.length === 0) {
    container.innerHTML = `<div style="padding:32px 20px; text-align:center; color:var(--text-secondary);"><p style="font-size:0.95rem; font-weight:500;">No recent activity.</p></div>`;
    return;
  }

  // Sort newest first
  const sortedJobs = [...jobs].sort((a, b) => new Date(b.applied_date || 0) - new Date(a.applied_date || 0));
  const recentJobs = sortedJobs.slice(0, 10);
  
  recentJobs.forEach((job, index) => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.style.padding = "16px";
    item.style.borderBottom = index === recentJobs.length - 1 ? "none" : "1px solid var(--glass-border)";
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.gap = "16px";
    item.style.transition = "background 0.2s";
    item.style.cursor = "pointer";
    item.onmouseover = () => item.style.background = "var(--search-bg)";
    item.onmouseout = () => item.style.background = "transparent";
    
    let icon = "briefcase";
    let color = "var(--text-secondary)";
    let title = "Application Update";
    let desc = `${escapeHtml(job.company)} is in ${job.status} stage.`;
    let bgColor = "var(--search-bg)";
    
    if (job.status === "Applied") { icon = "send"; color = "var(--status-applied)"; bgColor="rgba(59,130,246,0.1)"; title = "Application Submitted"; desc = `Role: ${escapeHtml(job.role)}`; }
    else if (job.status === "Assessment") { icon = "check-circle"; color = "var(--status-assessment)"; bgColor="rgba(168,85,247,0.1)"; title = "Assessment Received"; desc = `Role: ${escapeHtml(job.role)}`; }
    else if (job.status === "Interview") { icon = "video"; color = "var(--status-interview)"; bgColor="rgba(245,158,11,0.1)"; title = "Interview Scheduled"; desc = `Role: ${escapeHtml(job.role)}`; }
    else if (job.status === "Offer") { icon = "award"; color = "var(--status-offer)"; bgColor="rgba(34,197,94,0.1)"; title = "Offer Received!"; desc = `Role: ${escapeHtml(job.role)}`; }
    else if (job.status === "Rejected") { icon = "x-circle"; color = "var(--status-rejected)"; bgColor="rgba(239,68,68,0.1)"; title = "Application Rejected"; desc = `Role: ${escapeHtml(job.role)}`; }

    item.innerHTML = `
      <div style="width:40px; height:40px; border-radius:10px; background:${bgColor}; display:flex; align-items:center; justify-content:center; color:${color}; flex-shrink:0;">
        <i data-lucide="${icon}" style="width:20px; height:20px;"></i>
      </div>
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h5 style="font-size:0.95rem; font-weight:600;">${title}</h5>
          <span style="font-size:0.75rem; color:var(--text-secondary); opacity:0.8;">${formatDate(job.applied_date) || 'Recently'}</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px;">
          <span style="font-weight:500; color:var(--text-primary);">${escapeHtml(job.company)}</span> &bull; ${desc}
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderMockTasks() {
  const container = document.getElementById("todaysFocusList");
  if (!container) return;
  
  // Empty State Logic
  const tasks = [
    { title: "Complete Globaltree Assessment", company: "Globaltree", due: "Due Today", priority: "High", color: "var(--accent-purple)" },
    { title: "Prepare for Technical Interview", company: "iTech India", due: "Tomorrow 10:00 AM", priority: "Medium", color: "var(--status-interview)" }
  ];
  
  if (tasks.length === 0) {
    container.innerHTML = `
      <div style="padding:32px 20px; text-align:center; color:var(--text-secondary);">
        <i data-lucide="check-circle" style="width:32px; height:32px; color:var(--status-offer); margin-bottom:12px; opacity:0.8;"></i>
        <p style="font-size:0.95rem; font-weight:500;">You're all caught up for today.</p>
      </div>
    `;
    return;
  }

  let html = '';
  tasks.forEach(t => {
    html += `
      <div style="background:var(--search-bg); border:1px solid var(--glass-border); padding:16px; border-radius:var(--radius-md); display:flex; align-items:center; gap:16px; margin-bottom:12px; transition:transform 0.2s; cursor:pointer;" onmouseover="this.style.transform='translateY(-2px)'; this.style.borderColor='var(--accent-blue)';" onmouseout="this.style.transform='none'; this.style.borderColor='var(--glass-border)';">
        <input type="checkbox" style="width:20px; height:20px; accent-color:var(--accent-purple); cursor:pointer;">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:0.95rem;">${t.title}</div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px; display:flex; align-items:center; gap:8px;">
             <span>${t.company}</span>
             <span style="font-size:10px;">•</span>
             <span><i data-lucide="clock" style="width:12px; height:12px; display:inline; margin-bottom:-2px;"></i> ${t.due}</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
          <span style="font-size:0.7rem; font-weight:700; border:1px solid ${t.color}; color:${t.color}; padding:2px 8px; border-radius:12px; text-transform:uppercase;">${t.priority}</span>
          <div style="display:flex; gap:8px; opacity:0.6;">
            <i data-lucide="external-link" style="width:14px; height:14px;"></i>
            <i data-lucide="more-horizontal" style="width:14px; height:14px;"></i>
          </div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderMockInterviews() {
  const container = document.getElementById("upcomingInterviewsList");
  if (!container) return;
  
  const interviews = [
    { role: "Junior Benefits Admin", company: "iTech India", time: "Tomorrow, 10:00 AM", timer: "18h 24m", type: "Technical" }
  ];
  
  if (interviews.length === 0) {
    container.innerHTML = `
      <div style="padding:32px 20px; text-align:center; background:var(--search-bg); border-radius:var(--radius-md); border:1px dashed var(--glass-border);">
        <p style="font-size:0.95rem; font-weight:500; margin-bottom:8px;">Great! You currently have no interviews scheduled.</p>
        <p style="font-size:0.85rem; color:var(--text-secondary);">CareerAI recommends applying to 5 more matching jobs.</p>
      </div>
    `;
    return;
  }
  
  let html = '<div style="display:flex; gap:16px; overflow-x:auto; padding-bottom:8px;">';
  interviews.forEach(i => {
    html += `
      <div style="flex: 0 0 320px; background:linear-gradient(135deg, rgba(59,130,246,0.05), rgba(168,85,247,0.05)); border:1px solid var(--glass-border); border-left:4px solid var(--accent-blue); padding:24px; border-radius:var(--radius-md);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
          <div>
            <div style="font-weight:700; font-size:1.1rem; color:var(--text-primary);">${i.role}</div>
            <div style="color:var(--text-secondary); font-size:0.9rem; margin-top:4px;">${i.company}</div>
          </div>
          <div style="width:40px; height:40px; border-radius:8px; background:var(--panel-bg); border:1px solid var(--glass-border); display:flex; justify-content:center; align-items:center; font-weight:700; font-size:1.2rem; color:var(--accent-blue);">iT</div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-secondary);">
            <i data-lucide="calendar" style="width:14px;"></i> ${i.time}
          </div>
          <div style="font-size:0.75rem; font-weight:700; color:var(--status-interview); background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:4px;">
            In ${i.timer}
          </div>
        </div>
        <div style="display:flex; gap:12px;">
          <button style="flex:1; background:var(--accent-blue); color:#fff; border:none; padding:10px; border-radius:8px; font-weight:600; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">Join</button>
          <button style="flex:1; background:var(--search-bg); color:var(--text-primary); border:1px solid var(--glass-border); padding:10px; border-radius:8px; font-weight:600; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">Prepare</button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderMockRecommendedJobs() {
  const container = document.getElementById("recommendedJobsList");
  if (!container) return;
  const jobs = [
    { title: "Frontend Engineer", company: "Vercel", match: "98%", location: "Remote", salary: "$120k - $150k", reason: "Strong match for your React skills.", logo: "V" },
    { title: "React Developer", company: "Stripe", match: "94%", location: "New York", salary: "$130k - $160k", reason: "High conversion rate for this role.", logo: "S" },
    { title: "UI/UX Developer", company: "Linear", match: "91%", location: "Remote", salary: "$110k - $140k", reason: "Matches your design system experience.", logo: "L" }
  ];
  
  if (jobs.length === 0) {
    container.innerHTML = `
      <div style="padding:40px; text-align:center; background:var(--search-bg); border-radius:var(--radius-md);">
        <p style="color:var(--text-secondary); font-size:1rem;">Connect LinkedIn and Gmail to receive personalized recommendations.</p>
      </div>
    `;
    return;
  }
  
  let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px;">';
  jobs.forEach(j => {
    html += `
      <div style="background:var(--search-bg); border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:20px; transition:all 0.2s ease; cursor:pointer;" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='var(--accent-purple)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.2)';" onmouseout="this.style.transform='none'; this.style.borderColor='var(--glass-border)'; this.style.boxShadow='none';">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; gap:12px; align-items:center;">
            <div style="width:36px; height:36px; border-radius:8px; background:var(--panel-bg); display:flex; justify-content:center; align-items:center; font-weight:800; font-size:1.1rem; color:var(--text-primary); border:1px solid var(--glass-border);">${j.logo}</div>
            <div>
              <h4 style="font-weight:700; font-size:1.05rem;">${j.title}</h4>
              <div style="color:var(--text-secondary); font-size:0.85rem; margin-top:2px;">${j.company}</div>
            </div>
          </div>
          <span style="background:rgba(16,185,129,0.1); color:var(--status-offer); font-size:0.75rem; font-weight:700; padding:4px 8px; border-radius:99px;">${j.match}</span>
        </div>
        <div style="display:flex; gap:16px; margin-top:16px; font-size:0.85rem; color:var(--text-secondary);">
          <div style="display:flex; align-items:center; gap:6px;"><i data-lucide="map-pin" style="width:14px;"></i> ${j.location}</div>
          <div style="display:flex; align-items:center; gap:6px;"><i data-lucide="dollar-sign" style="width:14px;"></i> ${j.salary}</div>
        </div>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--glass-border); font-size:0.8rem; color:var(--text-secondary);">
          <i data-lucide="sparkles" style="width:12px; color:var(--accent-purple); display:inline;"></i> ${j.reason}
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

/* ==================== GLOBAL TOASTS ==================== */
function showToast(message, type="info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

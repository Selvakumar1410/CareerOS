/* =====================================================================
   CareerOS | Pipeline & DataGrid Component
   ===================================================================== */

const STATUSES = ["Applied", "Assessment", "Interview", "Offer", "Rejected"];

function renderKanban(jobs) {
  STATUSES.forEach(status => {
    const colId = `col${status}`;
    const container = document.getElementById(colId);
    if (!container) return;
    
    container.innerHTML = "";
    
    const filtered = jobs.filter(j => j.status === status);
    
    // Update count in header
    const countEl = document.getElementById(`count${status}`);
    if (countEl) countEl.textContent = filtered.length;
    
    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align:center;color:var(--text-secondary);font-size:0.85rem;padding:20px 0;background:rgba(0,0,0,0.02);border-radius:8px;">Drop here</div>`;
    } else {
      filtered.forEach(job => {
        const card = document.createElement("div");
        card.className = "kanban-card";
        card.setAttribute("data-status", job.status);
        card.setAttribute("data-id", job.id);
        
        card.innerHTML = `
          <div class="card-company">${escapeHtml(job.company)}</div>
          <div class="card-role">${escapeHtml(job.role)}</div>
          <div class="card-meta">
            <span class="badge">${escapeHtml(job.source || 'manual')}</span>
            ${job.location ? `<span style="color:var(--text-secondary);">📍 ${escapeHtml(job.location.split(',')[0])}</span>` : ''}
          </div>
        `;
        container.appendChild(card);
      });
    }
  });
}

function renderDataGrid(jobs) {
  const tbody = document.getElementById("gridBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  if (jobs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">No applications found.</td></tr>`;
    return;
  }
  
  jobs.forEach(job => {
    const tr = document.createElement("tr");
    
    tr.innerHTML = `
      <td style="font-weight:700;">${escapeHtml(job.company)}</td>
      <td style="color:var(--text-secondary);">${escapeHtml(job.role)}</td>
      <td><span class="status-pill ${job.status}">${job.status}</span></td>
      <td>${new Date(job.applied_date).toLocaleDateString()}</td>
      <td class="table-actions">
        <button class="icon-btn" title="Edit"><i data-lucide="edit-2"></i></button>
        <button class="icon-btn" title="Delete" style="color:var(--status-rejected);"><i data-lucide="trash-2"></i></button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Re-init lucide icons for new table rows
  setTimeout(() => lucide.createIcons(), 50);
}

// Utility to escape HTML
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

/* =====================================================
   Job Tracker — Frontend Configuration & Utilities
===================================================== */

// API Base URL — switch for production
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : window.location.origin;   // production: same origin

// ==================== AUTH ====================

function getToken() {
  return localStorage.getItem("jwt_token");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getToken(),
  };
}

function requireAuth() {
  const token = getToken();
  if (!token && !window.location.pathname.includes("/login") && !window.location.pathname.includes("/index")) {
    window.location.href = "/login";
    return false;
  }
  return true;
}

function logout() {
  localStorage.clear();
  window.location.href = "/login";
}

// ==================== THEME (DARK/LIGHT) ====================
function initTheme() {
  const storedTheme = localStorage.getItem("theme");
  const theme = storedTheme || "dark"; // Default to dark mode per PRD
  
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const newTheme = current === "dark" ? "light" : "dark";
  
  if (newTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  
  localStorage.setItem("theme", newTheme);
  
  // Update icon if available
  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    if (newTheme === "dark") {
      btn.innerHTML = '<i data-lucide="sun"></i>';
    } else {
      btn.innerHTML = '<i data-lucide="moon"></i>';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// Init theme immediately on script load to prevent flash
initTheme();

// ==================== FETCH WRAPPER ====================

async function apiFetch(path, options = {}) {
  const url = API_BASE + path;
  const config = {
    headers: authHeaders(),
    ...options,
  };

  try {
    const res = await fetch(url, config);

    if (res.status === 401) {
      localStorage.removeItem("jwt_token");
      window.location.href = "/login";
      return null;
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${path}]:`, err);
    throw err;
  }
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = "success") {
  // Remove existing toasts
  const existing = document.querySelectorAll(".toast");
  existing.forEach((t) => t.remove());

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️",
    update: "🔄",
    email: "📧",
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || "ℹ️"}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  const container = document.getElementById("toastContainer") || document.body;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add("toast-show"));

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==================== XSS PROTECTION ====================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function safeText(element, text) {
  element.textContent = text;
}

// ==================== DATE FORMATTING ====================

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ==================== NOTIFICATION BELL ====================

let notificationInterval = null;

async function loadNotifications() {
  try {
    const data = await apiFetch("/notifications");
    if (!data) return;

    const bell = document.getElementById("notifBell");
    const badge = document.getElementById("notifBadge");
    const dropdown = document.getElementById("notifDropdown");

    if (!bell || !badge) return;

    if (data.unread_count > 0) {
      badge.textContent = data.unread_count;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }

    if (dropdown) {
      if (data.notifications.length === 0) {
        dropdown.innerHTML = '<div class="notif-empty">No notifications</div>';
      } else {
        dropdown.innerHTML = data.notifications
          .slice(0, 10)
          .map(
            (n) => `
            <div class="notif-item ${n.is_read ? "" : "notif-unread"}" data-id="${n.id}">
              <div class="notif-message">${escapeHtml(n.message)}</div>
              <div class="notif-time">${formatDate(n.created_at)}</div>
            </div>
          `
          )
          .join("");
      }
    }
  } catch (e) {
    // Silently fail for notifications
  }
}

async function markNotificationsRead() {
  try {
    await apiFetch("/notifications/read", { method: "POST" });
    loadNotifications();
  } catch (e) {}
}

function startNotificationPolling() {
  loadNotifications();
  notificationInterval = setInterval(loadNotifications, 30000); // Every 30 seconds
}

// ==================== COMMAND PALETTE ====================
let cpData = [
  { type: "Command", label: "Ask CareerAI", icon: "sparkles", action: () => window.location.href='/career-ai' },
  { type: "Command", label: "Add New Application", icon: "plus", action: () => window.location.href='/applications' },
  { type: "Command", label: "Generate Resume", icon: "file-text", action: () => window.location.href='/resume-ai' },
  { type: "Page", label: "View Pipeline", icon: "trello", action: () => window.location.href='/pipeline' },
  { type: "Action", label: "Sync Gmail", icon: "inbox", action: () => { if(typeof runGmailScan==='function') runGmailScan(); closeCommandPalette(); } }
];

function openCommandPalette() {
  const modal = document.getElementById("commandPalette");
  const input = document.getElementById("cpInput");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
    if (input) {
      input.value = "";
      input.focus();
      renderCPResults("");
    }
  }
}

function closeCommandPalette(e) {
  if (e && e.target && !e.target.classList.contains("modal-backdrop")) return;
  const modal = document.getElementById("commandPalette");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

function renderCPResults(query) {
  const container = document.querySelector(".cp-results");
  if (!container) return;
  
  const q = query.toLowerCase().trim();
  const filtered = cpData.filter(item => item.label.toLowerCase().includes(q));
  
  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-secondary); font-size:0.9rem;">No commands found. Try "AI" or "Add"</div>`;
    return;
  }
  
  let html = `<div style="display:flex; flex-direction:column; gap:4px;">`;
  filtered.forEach((item, index) => {
    html += `
      <div class="cp-item" onclick="executeCommand(${index})" style="padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='var(--search-bg)';" onmouseout="this.style.background='transparent';">
        <div style="display:flex; align-items:center; gap:12px;">
          <i data-lucide="${item.icon}" style="width:16px; color:var(--text-secondary);"></i>
          <span style="font-weight:500; font-size:0.95rem; color:var(--text-primary);">${item.label}</span>
        </div>
        <span style="font-size:0.7rem; font-weight:700; color:var(--text-secondary); background:var(--panel-bg); padding:2px 6px; border-radius:4px; border:1px solid var(--glass-border);">${item.type}</span>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.executeCommand = function(index) {
  if (cpData[index] && typeof cpData[index].action === "function") {
    cpData[index].action();
  }
};

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    openCommandPalette();
  }
  if (e.key === "Escape") {
    closeCommandPalette({ target: document.getElementById("commandPalette") });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Command palette input handler
  const cpInput = document.getElementById("cpInput");
  if (cpInput) {
    cpInput.addEventListener("input", (e) => renderCPResults(e.target.value));
  }

  // ── Auth guard: redirect to login if no token on protected pages ──
  const publicPages = ["/login", "/", "/index.html"];
  if (!publicPages.includes(window.location.pathname) && !getToken()) {
    window.location.href = "/login";
    return;
  }

  // ── Populate profile circle with user initials ──
  const user = getUser();
  const circle = document.getElementById("profileCircle");
  if (circle && user) {
    const name = user.name || user.email || "U";
    circle.textContent = name.charAt(0).toUpperCase();
    circle.title = user.name || user.email;
  }

  // ── Set topbar page title from current path ──
  const titleEl = document.getElementById("topbarPageTitle");
  if (titleEl) {
    const pathTitles = {
      "/dashboard":     "Dashboard",
      "/applications":  "Applications",
      "/calendar":      "Calendar",
      "/notifications": "Notifications",
      "/settings":      "Settings",
    };
    titleEl.textContent = pathTitles[window.location.pathname] || "CareerOS";
  }

  // ── Load notification unread count into badge ──
  if (getToken()) {
    apiFetch("/api/notifications/unread-count").then(data => {
      if (!data) return;
      const badge = document.getElementById("notifBadge");
      if (badge) {
        if (data.count > 0) {
          badge.textContent = data.count > 9 ? "9+" : data.count;
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
        }
      }
    }).catch(() => {}); // silently fail
  }
});

/**
 * CareerOS | Premium Auth Logic
 * Manages Google Sign-In states and rotating UI text.
 */

document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, redirect to dashboard
  if (localStorage.getItem("jwt_token")) {
    window.location.href = "/dashboard";
  }
  initRotatingText();
});

/**
 * Initializes the rotating text array
 */
function initRotatingText() {
  const texts = [
    "AI organizing your career.",
    "Tracking your opportunities.",
    "Preparing your interviews.",
    "Parsing your applications.",
    "Managing your future."
  ];
  
  const container = document.getElementById("rotatingTextContainer");
  if (!container) return;

  // Create spans for each text
  texts.forEach((text, i) => {
    const span = document.createElement("span");
    span.className = "rotating-text";
    if (i === 0) span.classList.add("active");
    span.textContent = text;
    container.appendChild(span);
  });

  // Rotate every 3 seconds
  let currentIndex = 0;
  const elements = container.querySelectorAll(".rotating-text");
  
  setInterval(() => {
    elements[currentIndex].classList.remove("active");
    currentIndex = (currentIndex + 1) % elements.length;
    elements[currentIndex].classList.add("active");
  }, 3000);
}

/**
 * Handles the Google Identity Services callback
 */
function handleLogin(res) {
  // Add a small loading indicator effect to the whole button wrapper if possible
  const wrapper = document.querySelector(".google-btn-wrapper");
  if (wrapper) wrapper.style.opacity = "0.5";

  fetch("http://localhost:5000/auth/google", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({token: res.credential})
  })
  .then(r => r.json())
  .then(d => {
    localStorage.setItem("jwt_token", d.token);
    localStorage.setItem("user", JSON.stringify(d.user));
    showToast("Login successful! Redirecting...", "success");
    window.location.href = "/dashboard";
  })
  .catch(err => {
    console.error("Login failed:", err);
    if (wrapper) wrapper.style.opacity = "1";
    alert("Authentication failed. Please try again.");
  });
}

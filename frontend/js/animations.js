/**
 * CareerOS | Premium GSAP Animations
 * Handles the 11-step page load sequence, organic cursor tracking, and particles.
 */

document.addEventListener("DOMContentLoaded", () => {
  initParticles();
  initCursorTracking();
  runPageLoadTimeline();
});

/**
 * 11-Step Page Load GSAP Sequence
 */
function runPageLoadTimeline() {
  if (typeof gsap === 'undefined') {
    console.error("GSAP not loaded.");
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

  // Reset initial states for elements to prevent flash of unstyled content
  gsap.set(".panel-left, .card-logo, .hero-heading, .hero-subtitle, .feature-highlights div, .mini-workflow", { opacity: 0 });
  gsap.set(".login-card", { scale: 0.95, opacity: 0 });
  gsap.set(".btn-google, .trust-text, .divider", { opacity: 0, y: 10 });
  gsap.set(".bg-layer", { opacity: 0 }); // Hide backgrounds initially

  // Step 1: Background fades in
  tl.to(".bg-layer", { opacity: 1, duration: 1.5, stagger: 0.2, ease: "power2.inOut" }, 0)
    
    // Step 2 & 3: Blob morphs naturally (handled by CSS keyframes) & Left panel appears
    .to(".panel-left", { opacity: 1, duration: 1 }, 0.5)
    
    // Step 4 & 5: Logo scales & Heading slides
    .fromTo(".brand-logo", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 1 }, 0.8)
    .fromTo(".hero-heading", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 1.0)
    
    // Step 6: Subtitle fades
    .fromTo(".hero-subtitle", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 1.2)
    
    // Step 7: Feature list stagger
    .fromTo(".feature-highlights div", { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, 1.4)
    
    // Step 8: Workflow animation loop begins
    .fromTo(".mini-workflow span, .mini-workflow i", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.15 }, 1.8)
    
    // Step 9: Login card scales up
    .to(".login-card", { scale: 1, opacity: 1, duration: 1.2, ease: "expo.out" }, 1.5)
    
    // Step 10: Button and inner elements fade in
    .fromTo(".card-logo", { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.5)" }, 1.8)
    .fromTo(".card-title, .rotating-text-wrapper, .card-subtitle", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, 2.0)
    .to(".divider", { opacity: 1, y: 0, duration: 0.5 }, 2.3)
    .to(".btn-google", { opacity: 1, y: 0, duration: 0.8, ease: "back.out(1.2)" }, 2.4)
    .to(".trust-text", { opacity: 1, y: 0, duration: 0.8 }, 2.6)
    
    // Step 11: Particles start floating
    .call(() => {
      animateParticles();
    }, null, 2.5);
}

/**
 * Generates and floats tiny particles for Layer 6
 */
function initParticles() {
  const container = document.getElementById("particleContainer");
  if (!container) return;

  const maxParticles = 10;
  for (let i = 0; i < maxParticles; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = Math.random() * 100 + "%";
    p.style.top = Math.random() * 100 + "%";
    container.appendChild(p);
  }
}

function animateParticles() {
  const particles = document.querySelectorAll('.particle');
  particles.forEach(p => {
    gsap.to(p, {
      y: `random(-100, 100)`,
      x: `random(-50, 50)`,
      opacity: `random(0.2, 0.8)`,
      duration: `random(5, 10)`,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });
  });
}

/**
 * Organic Cursor Interaction (Max 20px movement via interpolation)
 */
function initCursorTracking() {
  const blobLarge = document.querySelector('.blob-large');
  const blobSmall = document.querySelector('.blob-small');
  const radialGlow = document.querySelector('.radial-glow');
  
  if (!blobLarge || !blobSmall || !radialGlow) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  // Smoothing variables (Lerp)
  let currentX = mouseX;
  let currentY = mouseY;
  const ease = 0.05; // Extremely smooth interpolation

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Exact Cursor Glow behavior from Landing Page
    const cursor = document.getElementById('cursorGlow');
    if (cursor) {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    }
  });

  function update() {
    // Lerp logic
    currentX += (mouseX - currentX) * ease;
    currentY += (mouseY - currentY) * ease;

    // Calculate delta from center (normalized -1 to 1)
    const deltaX = (currentX / window.innerWidth) * 2 - 1;
    const deltaY = (currentY / window.innerHeight) * 2 - 1;

    // Apply max 20px shift to backgrounds using translate
    const maxShift = 20;

    gsap.set(blobLarge, { x: deltaX * maxShift, y: deltaY * maxShift });
    gsap.set(blobSmall, { x: deltaX * -maxShift * 1.5, y: deltaY * -maxShift * 1.5 }); // Moves opposite
    gsap.set(radialGlow, { x: deltaX * (maxShift / 2), y: deltaY * (maxShift / 2) });

    requestAnimationFrame(update);
  }

  update();
}

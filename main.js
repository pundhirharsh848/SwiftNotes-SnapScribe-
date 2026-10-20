/**
 * Intelligence Designed To Evolve - Landing Page Interactions
 * Vanilla JavaScript (No Framework)
 */

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initStatsCountUp();
});

/**
 * Mobile Navigation Drawer & Hamburger Toggle
 */
function initMobileMenu() {
  const burgerBtn = document.getElementById("burger-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileOverlay = document.getElementById("mobile-overlay");
  const mobileLinks = document.querySelectorAll(".mobile-link");

  if (!burgerBtn || !mobileMenu || !mobileOverlay) return;

  function openMenu() {
    burgerBtn.setAttribute("aria-expanded", "true");
    mobileMenu.removeAttribute("hidden");
    mobileOverlay.removeAttribute("hidden");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    burgerBtn.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("hidden", "");
    mobileOverlay.setAttribute("hidden", "");
    document.body.classList.remove("menu-open");
  }

  function toggleMenu() {
    const isExpanded = burgerBtn.getAttribute("aria-expanded") === "true";
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  // Hamburger button click
  burgerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close on overlay click
  mobileOverlay.addEventListener("click", () => {
    closeMenu();
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && burgerBtn.getAttribute("aria-expanded") === "true") {
      closeMenu();
    }
  });

  // Close on link click
  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  // Close on window resize > 720px
  window.addEventListener("resize", () => {
    if (window.innerWidth > 720 && burgerBtn.getAttribute("aria-expanded") === "true") {
      closeMenu();
    }
  });
}

/**
 * Stats Count-Up Animation
 * Easing: easeOutCubic
 * Duration: 1500 + i * 80 ms
 * Start offset: 480 + i * 90 ms
 * IntersectionObserver threshold: 0.25 (run once)
 */
function initStatsCountUp() {
  const statCards = document.querySelectorAll(".stat-card");
  if (!statCards.length) return;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          obs.disconnect(); // Trigger once

          statCards.forEach((card, i) => {
            const valEl = card.querySelector(".stat-val");
            if (!valEl) return;

            const target = parseFloat(card.dataset.target || "0");
            const decimals = parseInt(card.dataset.decimals || "0", 10);
            const suffix = card.dataset.suffix || "";

            const duration = 1500 + i * 80;
            const startOffset = 480 + i * 90;

            setTimeout(() => {
              const startTime = performance.now();

              function updateNumber(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easeOutCubic(progress);
                const currentVal = target * eased;

                valEl.textContent = currentVal.toFixed(decimals) + suffix;

                if (progress < 1) {
                  requestAnimationFrame(updateNumber);
                } else {
                  valEl.textContent = target.toFixed(decimals) + suffix;
                }
              }

              requestAnimationFrame(updateNumber);
            }, startOffset);
          });
        }
      });
    },
    { threshold: 0.25 }
  );

  const footer = document.querySelector(".stats-footer");
  if (footer) {
    observer.observe(footer);
  }
}

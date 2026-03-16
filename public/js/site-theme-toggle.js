(() => {
  const storageKey = "site-theme-enabled";
  const themeClass = "site-theme-alt";
  const toggleId = "site-theme-toggle";

  const applyThemeState = (enabled) => {
    if (document.body) {
      document.body.classList.toggle(themeClass, enabled);
    }
    const toggleButton = document.getElementById(toggleId);
    if (toggleButton) {
      toggleButton.setAttribute("aria-pressed", enabled ? "true" : "false");
      toggleButton.classList.toggle("is-active", enabled);
    }
  };

  const savedState = localStorage.getItem(storageKey) === "true";
  applyThemeState(savedState);

  document.addEventListener("DOMContentLoaded", () => {
    applyThemeState(savedState);

    const toggleButton = document.getElementById(toggleId);
    if (!toggleButton) return;

    toggleButton.addEventListener("click", (event) => {
      const nextState = !document.body.classList.contains(themeClass);
      
      // Fallback if browser doesn't support View Transitions
      if (!document.startViewTransition) {
        applyThemeState(nextState);
        localStorage.setItem(storageKey, String(nextState));
        return;
      }

      // Calculate where the mouse clicked to originate the ripple
      const x = event.clientX || window.innerWidth / 2;
      const y = event.clientY || window.innerHeight / 2;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      // Inject coordinates into CSS variables so the native CSS animation uses them instantly
      document.documentElement.style.setProperty('--ripple-x', `${x}px`);
      document.documentElement.style.setProperty('--ripple-y', `${y}px`);
      document.documentElement.style.setProperty('--ripple-r', `${endRadius}px`);

      // Trigger transition natively (JS `.animate` is removed entirely to prevent the flash)
      document.startViewTransition(() => {
        applyThemeState(nextState);
        localStorage.setItem(storageKey, String(nextState));
      });
    });
  });
})();
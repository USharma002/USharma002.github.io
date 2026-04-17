(() => {
  const storageKey = "site-theme-mode";
  const legacyStorageKey = "site-theme-enabled";

  const themeConfig = {
    expedition33: {
      classes: ["expedition33-theme", "site-theme-alt"],
      buttonIds: ["site-theme-toggle-expedition", "site-theme-toggle"]
    },
    residentRequiem: {
      classes: ["resident-requiem-theme"],
      buttonIds: ["site-theme-toggle-requiem"]
    }
  };

  const themeModes = Object.keys(themeConfig);
  const allThemeClasses = [...new Set(themeModes.flatMap((mode) => themeConfig[mode].classes))];
  const allButtonIds = [...new Set(themeModes.flatMap((mode) => themeConfig[mode].buttonIds))];

  const normalizeMode = (value) => {
    if (!value) return null;
    if (value === "expedition33" || value === "residentRequiem") return value;

    // Backward compatibility with earlier single-theme state.
    if (value === "site-theme-alt" || value === "true") return "expedition33";
    if (value === "resident-requiem-theme") return "residentRequiem";

    return null;
  };

  const getModeForButton = (buttonId) =>
    themeModes.find((mode) => themeConfig[mode].buttonIds.includes(buttonId)) || null;

  const readStorage = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors in private browsing or restricted environments.
    }
  };

  const removeStorage = (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }
  };

  const getCurrentModeFromDom = () => {
    const html = document.documentElement;
    const body = document.body;

    const hasResident =
      (html && html.classList.contains("resident-requiem-theme")) ||
      (body && body.classList.contains("resident-requiem-theme"));
    if (hasResident) return "residentRequiem";

    const hasExpedition =
      (html && (html.classList.contains("expedition33-theme") || html.classList.contains("site-theme-alt"))) ||
      (body && (body.classList.contains("expedition33-theme") || body.classList.contains("site-theme-alt")));
    if (hasExpedition) return "expedition33";

    return null;
  };

  const getSavedMode = () => {
    const savedMode = normalizeMode(readStorage(storageKey));
    if (savedMode) return savedMode;

    const legacyValue = readStorage(legacyStorageKey);
    if (legacyValue === "true") return "expedition33";

    return null;
  };

  const applyThemeMode = (mode) => {
    const normalizedMode = normalizeMode(mode);
    const activeClasses = normalizedMode ? themeConfig[normalizedMode].classes : [];

    [document.documentElement, document.body].forEach((node) => {
      if (!node) return;
      node.classList.remove(...allThemeClasses);
      if (activeClasses.length > 0) {
        node.classList.add(...activeClasses);
      }
    });

    allButtonIds.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (!button) return;

      const buttonMode = getModeForButton(buttonId);
      const isActive = normalizedMode !== null && buttonMode === normalizedMode;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("is-active", isActive);
    });
  };

  const persistMode = (mode) => {
    const normalizedMode = normalizeMode(mode);

    if (normalizedMode) {
      writeStorage(storageKey, normalizedMode);
    } else {
      removeStorage(storageKey);
    }

    removeStorage(legacyStorageKey);
  };

  const runWithViewTransition = (event, callback) => {
    if (!document.startViewTransition) {
      callback();
      return;
    }

    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    document.documentElement.style.setProperty("--ripple-x", `${x}px`);
    document.documentElement.style.setProperty("--ripple-y", `${y}px`);
    document.documentElement.style.setProperty("--ripple-r", `${endRadius}px`);

    document.startViewTransition(() => {
      callback();
    });
  };

  const bindThemeButtons = () => {
    allButtonIds.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      const mode = getModeForButton(buttonId);

      if (!button || !mode) return;

      button.addEventListener("click", (event) => {
        const currentMode = getCurrentModeFromDom();
        const nextMode = currentMode === mode ? null : mode;

        runWithViewTransition(event, () => {
          applyThemeMode(nextMode);
          persistMode(nextMode);
        });
      });
    });
  };

  const initialize = () => {
    const savedMode = getSavedMode();
    applyThemeMode(savedMode);
    bindThemeButtons();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
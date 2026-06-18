import { getActiveSiteConfig } from "../rules/index";

const flickRuntime = window as Window & {
  __flickHistoryPatched?: boolean;
  __flickRouteWatcherInstalled?: boolean;
};

type RouteWatcherActions = {
  ensureButton: () => void;
  updateButton: () => void;
  removeButtonAndClose: () => void;
};

export function setupRouteWatcher(actions: RouteWatcherActions) {
  if (flickRuntime.__flickRouteWatcherInstalled) return;
  flickRuntime.__flickRouteWatcherInstalled = true;
  let lastHref = location.href;

  function check() {
    if (location.href !== lastHref) {
      lastHref = location.href;
      setTimeout(() => {
        if (!getActiveSiteConfig()) {
          actions.removeButtonAndClose();
        } else {
          actions.ensureButton();
          actions.updateButton();
        }
      }, 60);
      return;
    }

    if (getActiveSiteConfig()) {
      if (!document.querySelector(".flick-toggle-wrapper")) {
        actions.ensureButton();
      }
      actions.updateButton();
    } else {
      actions.removeButtonAndClose();
    }
  }

  if (!flickRuntime.__flickHistoryPatched) {
    try {
      (["pushState", "replaceState"] as const).forEach((method) => {
        const original = history[method];
        history[method] = function (
          this: History,
          ...args: Parameters<typeof original>
        ) {
          const ret = original.apply(this, args);
          window.dispatchEvent(new Event("flick:locationchange"));
          return ret;
        } as typeof original;
      });
      flickRuntime.__flickHistoryPatched = true;
    } catch (error) {
      console.warn("[flick history patch failed]", error);
    }
  }

  window.addEventListener("popstate", check, true);
  window.addEventListener("flick:locationchange", check, true);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        check();
        break;
      }
    }
  });
  try {
    observer.observe(document.body, { childList: true, subtree: true });
  } catch (_) {}
  setInterval(check, 3000);
}

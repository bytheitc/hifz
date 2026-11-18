"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";

/**
 * Registers the service worker and says the two things it is worth
 * interrupting somebody for.
 *
 * The first is that a new version is waiting. It is a notice with a button,
 * never an automatic reload: someone may be part way through a revision
 * session, and a reload under them would lose a grade they were about to
 * give. The tap is the point.
 *
 * The second is that the connection has gone. The app keeps working, because
 * the trail and grading live on the device, and saying so is better than
 * letting somebody wonder whether what they are looking at is current.
 */
export function ServiceWorkerBridge() {
  const [updateReady, setUpdateReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const reloading = useRef(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    // In development the worker fights Next's hot reloading and wins, which
    // makes every edit look like it did not happen.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    function watch(worker: ServiceWorker | null) {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        // `controller` is null on the very first visit, when the worker
        // installing is not an update but the only copy there has ever been.
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }
      });
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        watch(reg.installing);
        reg.addEventListener("updatefound", () => watch(reg.installing));
      })
      .catch(() => {
        // An app that works offline is better than one that does not, but it
        // is not worth a message to somebody who did not ask for it.
      });

    const onControllerChange = () => {
      if (reloading.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      registration = undefined;
    };
  }, []);

  async function applyUpdate() {
    reloading.current = true;
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage("skip-waiting");
    } else {
      window.location.reload();
    }
  }

  if (!updateReady && !offline) return null;

  return (
    <div style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4">
      {offline && (
        <p
          role="status"
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-card)] px-3 py-1.5 text-xs"
        >
          <WifiOff aria-hidden className="size-3.5 text-[var(--color-ink-soft)]" />
          Offline. Your trail and grading still work.
        </p>
      )}

      {updateReady && (
        <div
          role="status"
          className="pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--color-rule)] bg-[var(--color-card)] py-1.5 pl-4 pr-1.5 text-xs"
        >
          <span>A newer version is ready.</span>
          <button
            type="button"
            onClick={() => void applyUpdate()}
            className="flex items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-3 py-1.5 font-semibold text-white"
          >
            <RefreshCw aria-hidden className="size-3" />
            Reload
          </button>
        </div>
      )}
    </div>
  );
}

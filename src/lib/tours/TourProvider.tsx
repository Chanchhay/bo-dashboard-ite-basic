"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Driver, DriveStep } from "driver.js";

import "@/components/onboarding/tour-theme.css";
import type { routeTourConfig as RouteTourConfig } from "./tourConfig";
import { TourContext } from "./TourContext";

/**
 * Height of the sticky page headers that park themselves at the top of the
 * scroll container. Anything highlighted underneath one has to clear it.
 */
const STICKY_HEADER_OFFSET = 112;

/**
 * driver.js only scrolls when an element is outside the viewport, and an
 * element hidden behind a sticky header is still "inside" it — so it leaves the
 * target covered and never scrolls back. This clears it by hand.
 */
function revealForTour(element: Element | undefined) {
  const main = document.getElementById("main-content");

  if (!main || !(element instanceof HTMLElement)) return;

  const mainTop = main.getBoundingClientRect().top;
  const offsetFromTop = element.getBoundingClientRect().top - mainTop;

  if (offsetFromTop >= STICKY_HEADER_OFFSET) return;

  main.scrollTo({
    top: Math.max(0, main.scrollTop + offsetFromTop - STICKY_HEADER_OFFSET),
  });
}

const NEXT_TOUR_ROUTE_MAP: Record<string, string> = {
  "/inventory/stock": "/inventory/stock/movements",
  "/inventory/stock/movements": "/inventory/stock/in",
  "/inventory/stock/in": "/inventory/stock/out",
  "/inventory/stock/out": "/inventory/stock/adjust",
  "/inventory/stock/adjust": "/inventory/config/units",
  "/inventory/config/units": "/inventory/config/groups",
  "/inventory/config/groups": "/inventory/config/add-ons",
  "/inventory/config/add-ons": "/inventory/config/presets",
  "/dashboard": "/analytics",
  "/sales": "/sales/pricing",
  "/sales/pricing": "/sales/customers",
  "/sales/customers": "/sales/discounts",
  "/sales/discounts": "/sales/membership-types",
  "/sales/membership-types": "/sales/taxes",
  "/sales/taxes": "/sales/sessions",
  "/sales/sessions": "/sales/cash-register",
  "/sales/cash-register": "/pos",
  "/business/profile": "/business/currency",
  "/business/currency": "/business/payments",
  "/business/payments": "/business/telegram",
  "/business/telegram": "/business/facebook",
};

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [driverObj, setDriverObj] = useState<Driver | null>(null);

  // New user vs Old user state management
  const [isNewUser, setIsNewUser] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const type = localStorage.getItem("fluxibiz_user_type");
      const flag = localStorage.getItem("ipos_is_new_user");
      const sessionFlag = sessionStorage.getItem("ipos_is_new_user");
      if (type === "old" || localStorage.getItem("ipos_user_onboarded") === "true") {
        return false;
      }
      return type === "new" || flag === "true" || sessionFlag === "true";
    } catch {
      return false;
    }
  });

  const markAsNewUser = useCallback(() => {
    try {
      localStorage.setItem("fluxibiz_user_type", "new");
      localStorage.setItem("ipos_is_new_user", "true");
      sessionStorage.setItem("ipos_is_new_user", "true");
      setIsNewUser(true);
    } catch { }
  }, []);

  const markAsOldUser = useCallback(() => {
    try {
      localStorage.setItem("fluxibiz_user_type", "old");
      localStorage.setItem("ipos_is_new_user", "false");
      localStorage.setItem("ipos_user_onboarded", "true");
      sessionStorage.removeItem("ipos_is_new_user");
      setIsNewUser(false);
    } catch { }
  }, []);

  /*
   * The step definitions are a large module and nothing on a page needs them
   * until a tour is offered, so they are fetched once on the client rather
   * than bundled into the root layout — which put them on the login screen
   * and the till alike. Until they arrive there are no steps, which reads as
   * "no tour here yet" and settles a moment later.
   */
  const [tourConfig, setTourConfig] = useState<typeof RouteTourConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./tourConfig").then((mod) => {
      if (!cancelled) setTourConfig(mod.routeTourConfig);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Exact match, else the LONGEST matching prefix — `find` returned whichever
  // key happened to come first, so /inventory/import/42 inherited /inventory.
  const activeSteps = useMemo(() => {
    if (!pathname || !tourConfig) return [];
    if (tourConfig[pathname]) return tourConfig[pathname];

    const matchingKey = Object.keys(tourConfig)
      .filter((key) => key !== "/" && pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0];

    return matchingKey ? tourConfig[matchingKey] : [];
  }, [pathname, tourConfig]);

  /**
   * A page can inherit a parent's steps and resolve none of them, which left
   * the help button offering a tour that did nothing. Only advertise one when
   * at least one step is actually on screen; content can load late, so this
   * keeps looking for a few seconds.
   */
  const [hasLiveStep, setHasLiveStep] = useState(false);

  useEffect(() => {
    const check = () =>
      setHasLiveStep(
        activeSteps.some(
          (step) =>
            typeof step.element !== "string" ||
            !!document.querySelector(step.element),
        ),
      );

    // Deferred, so nothing is set synchronously during the effect.
    const first = setTimeout(check, 0);
    const poll = setInterval(check, 400);
    const stop = setTimeout(() => clearInterval(poll), 5000);

    return () => {
      clearTimeout(first);
      clearInterval(poll);
      clearTimeout(stop);
    };
  }, [activeSteps, pathname]);

  const saveTourProgressToBackend = useCallback(async (routePath: string) => {
    try {
      await fetch('/api/user-profile/tour-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route: routePath, completedAt: new Date().toISOString() }),
      });
    } catch {
      // Backend sync fallback
    }
  }, []);

  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem(`fluxibiz_tour_done_${pathname}`, "true");
      localStorage.setItem(`tour_done_${pathname}`, "true");
      localStorage.setItem("fluxibiz_tour_completed", "true");
      markAsOldUser();
      void saveTourProgressToBackend(pathname);
    } catch {
      // Handle storage restrictions
    }
  }, [pathname, saveTourProgressToBackend, markAsOldUser]);

  const startTour = useCallback(async () => {
    // Filter steps to elements actually present in current DOM
    const availableSteps = activeSteps.filter((step) => {
      if (typeof step.element === "string") {
        return !!document.querySelector(step.element) || !!step.onHighlightStarted;
      }
      return true;
    });

    if (availableSteps.length === 0) return;

    // Keep each step's own hook, then uncover the target before it is measured.
    const steps: DriveStep[] = availableSteps.map((step) => ({
      ...step,
      onHighlightStarted: (element, stepDef, opts) => {
        step.onHighlightStarted?.(element, stepDef, opts);
        revealForTour(element);
      },
    }));

    const nextRoute = NEXT_TOUR_ROUTE_MAP[pathname];

    let cleanupKeydown: (() => void) | null = null;

    // The tour engine and its stylesheet are 200KB that only a cashier who
    // asks for help ever needs, so they are fetched at the moment of asking
    // rather than shipped with every page.
    const [{ driver }] = await Promise.all([
      import("driver.js"),
      import("driver.js/dist/driver.css"),
    ]);

    const inst = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      stagePadding: 4,
      stageRadius: 12,
      doneBtnText: nextRoute ? "Next Page →" : "Got it!",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      progressText: "Step {{current}} of {{total}}",
      steps,
      onNextClick: (_element, _step, _opts) => {
        const isLast = inst.getActiveIndex() === availableSteps.length - 1;
        if (isLast && nextRoute) {
          try {
            sessionStorage.setItem("fluxibiz_auto_tour", "true");
          } catch { }
          inst.destroy();
          router.push(nextRoute);
          return;
        }
        inst.moveNext();
      },
      onDestroyed: () => {
        if (cleanupKeydown) cleanupKeydown();
        handleFinish();
      },
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "NumpadEnter") {
        e.preventDefault();
        e.stopPropagation();

        const isLast = inst.getActiveIndex() === availableSteps.length - 1;
        if (isLast) {
          if (nextRoute) {
            try {
              sessionStorage.setItem("fluxibiz_auto_tour", "true");
            } catch { }
            inst.destroy();
            router.push(nextRoute);
          } else {
            inst.destroy();
          }
        } else {
          inst.moveNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    cleanupKeydown = () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };

    setDriverObj(inst);
    inst.drive();
  }, [activeSteps, pathname, router, handleFinish]);

  useEffect(() => {
    if (activeSteps.length === 0) return;

    const key = `fluxibiz_tour_done_${pathname}`;
    let timer: NodeJS.Timeout | null = null;

    try {
      const isAutoTour = sessionStorage.getItem("fluxibiz_auto_tour");
      const isDone = localStorage.getItem(key);

      if (isAutoTour === "true") {
        // Multi-page tour chain ("Next Page →")
        sessionStorage.removeItem("fluxibiz_auto_tour");
        timer = setTimeout(() => {
          startTour();
        }, 500);
      } else if (isNewUser && !isDone) {
        // ONLY AUTO-START FOR NEWLY REGISTERED USERS
        timer = setTimeout(() => {
          startTour();
        }, 1200);
      }
      // OLD USERS: Zero unprompted popups on page load! Manual click via <TourButton /> available anytime.
    } catch {
      // Fallback
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pathname, activeSteps, startTour, isNewUser]);

  return (
    <TourContext.Provider
      value={{
        startTour,
        isTourAvailable: hasLiveStep,
        isNewUser,
        markAsNewUser,
        markAsOldUser,
        saveTourProgressToBackend,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

import "@/components/onboarding/tour-theme.css";
import { routeTourConfig } from "./tourConfig";
import { TourContext } from "./TourContext";

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
    } catch {}
  }, []);

  const markAsOldUser = useCallback(() => {
    try {
      localStorage.setItem("fluxibiz_user_type", "old");
      localStorage.setItem("ipos_is_new_user", "false");
      localStorage.setItem("ipos_user_onboarded", "true");
      sessionStorage.removeItem("ipos_is_new_user");
      setIsNewUser(false);
    } catch {}
  }, []);

  // Find exact match or prefix route match for current pathname
  const activeSteps = useMemo(() => {
    if (!pathname) return [];
    if (routeTourConfig[pathname]) return routeTourConfig[pathname];

    const matchingKey = Object.keys(routeTourConfig).find(
      (key) => key !== "/" && pathname.startsWith(key)
    );
    return matchingKey ? routeTourConfig[matchingKey] : [];
  }, [pathname]);

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

  const startTour = useCallback(() => {
    // Filter steps to elements actually present in current DOM
    const availableSteps = activeSteps.filter((step) => {
      if (typeof step.element === "string") {
        return !!document.querySelector(step.element) || !!step.onHighlightStarted;
      }
      return true;
    });

    if (availableSteps.length === 0) return;

    const nextRoute = NEXT_TOUR_ROUTE_MAP[pathname];

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
      steps: availableSteps,
      onNextClick: (_element, _step, _opts) => {
        const isLast = inst.getActiveIndex() === availableSteps.length - 1;
        if (isLast && nextRoute) {
          try {
            sessionStorage.setItem("fluxibiz_auto_tour", "true");
          } catch {}
          inst.destroy();
          router.push(nextRoute);
          return;
        }
        inst.moveNext();
      },
      onDestroyed: () => {
        handleFinish();
      },
    });

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
        isTourAvailable: activeSteps.length > 0,
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

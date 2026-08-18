"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

import "@/components/onboarding/tour-theme.css";
import { routeTourConfig } from "./tourConfig";
import { TourContext } from "./TourContext";

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [driverObj, setDriverObj] = useState<Driver | null>(null);

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
      void saveTourProgressToBackend(pathname);
    } catch {
      // Handle storage restrictions
    }
  }, [pathname, saveTourProgressToBackend]);

  const startTour = useCallback(() => {
    // Filter steps to elements actually present in current DOM
    const availableSteps = activeSteps.filter((step) => {
      if (typeof step.element === "string") {
        return !!document.querySelector(step.element);
      }
      return true;
    });

    if (availableSteps.length === 0) return;

    const inst = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      doneBtnText: "Got it!",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      progressText: "Step {{current}} of {{total}}",
      steps: availableSteps,
      onDestroyed: () => {
        handleFinish();
      },
    });

    setDriverObj(inst);
    inst.drive();
  }, [activeSteps, handleFinish]);

  useEffect(() => {
    if (activeSteps.length === 0) return;

    const key = `fluxibiz_tour_done_${pathname}`;
    let timer: NodeJS.Timeout | null = null;

    try {
      const isDone = localStorage.getItem(key);
      if (!isDone) {
        timer = setTimeout(() => {
          startTour();
        }, 1200);
      }
    } catch {
      // Fallback
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pathname, activeSteps, startTour]);

  return (
    <TourContext.Provider
      value={{
        startTour,
        isTourAvailable: activeSteps.length > 0,
        saveTourProgressToBackend,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

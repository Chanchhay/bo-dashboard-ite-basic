"use client";

import { useEffect, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour-theme.css";

import { dashboardTourSteps } from "./tourSteps";

export const START_TOUR_EVENT = "fluxibiz:start-tour";

export function startGuidedTour() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(START_TOUR_EVENT));
  }
}

export default function GuidedTour() {
  const startTour = useCallback(() => {
    // Filter steps to elements currently visible in the DOM
    const availableSteps = dashboardTourSteps.filter((step) => {
      if (typeof step.element === "string") {
        return !!document.querySelector(step.element);
      }
      return true;
    });

    if (availableSteps.length === 0) return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      doneBtnText: "Got it!",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      progressText: "Step {{current}} of {{total}}",
      steps: availableSteps,
      onDestroyed: () => {
        try {
          localStorage.setItem("fluxibiz_tour_completed", "true");
        } catch {
          // Ignore localStorage errors (e.g. incognito mode restrictions)
        }
      },
    });

    driverObj.drive();
  }, []);

  useEffect(() => {
    // 1. Listen for manual tour launch trigger from UserMenu / Help actions
    const handleStartEvent = () => startTour();
    window.addEventListener(START_TOUR_EVENT, handleStartEvent);

    // 2. Auto-launch for first-time visitors
    let autoTimer: NodeJS.Timeout | null = null;
    try {
      const isCompleted = localStorage.getItem("fluxibiz_tour_completed");
      if (!isCompleted) {
        autoTimer = setTimeout(() => {
          startTour();
        }, 1200);
      }
    } catch {
      // Fallback
    }

    return () => {
      window.removeEventListener(START_TOUR_EVENT, handleStartEvent);
      if (autoTimer) clearTimeout(autoTimer);
    };
  }, [startTour]);

  return null;
}

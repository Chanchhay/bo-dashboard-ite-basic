"use client";

import { createContext, useContext } from "react";

export type TourContextType = {
  startTour: () => void;
  isTourAvailable: boolean;
  saveTourProgressToBackend: (route: string) => Promise<void>;
};

export const TourContext = createContext<TourContextType>({
  startTour: () => {},
  isTourAvailable: false,
  saveTourProgressToBackend: async () => {},
});

export const useTourContext = () => useContext(TourContext);

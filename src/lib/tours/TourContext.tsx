"use client";

import { createContext, useContext } from "react";

export type TourContextType = {
  startTour: () => void;
  isTourAvailable: boolean;
  isNewUser: boolean;
  markAsNewUser: () => void;
  markAsOldUser: () => void;
  saveTourProgressToBackend: (route: string) => Promise<void>;
};

export const TourContext = createContext<TourContextType>({
  startTour: () => {},
  isTourAvailable: false,
  isNewUser: false,
  markAsNewUser: () => {},
  markAsOldUser: () => {},
  saveTourProgressToBackend: async () => {},
});

export const useTourContext = () => useContext(TourContext);

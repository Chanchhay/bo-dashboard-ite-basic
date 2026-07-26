"use client";

import {
  Search,
  LayoutGrid,
  Zap,
  Lock,
  Clock,
  User,
  Bell,
  Wifi,
  ChevronDown,
  MonitorOff,
  Unlock,
  UserCircle,
  Monitor,
} from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const [time, setTime] = useState("");
  const [isDisplayOn, setIsDisplayOn] = useState(true);

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    update();
    const id = setInterval(update, 1000 * 30);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    update();
    const id = setInterval(update, 1000 * 30);
    return () => clearInterval(id);
  }, []);

  return (
    <nav className="flex items-center gap-16 bg-white px-5 py-2.5">
      {/* Logo */}
      <h1 className="shrink-0 text-xl font-extrabold tracking-tight">
        <span>Fluxi</span>
        <span className="text-primary">Biz</span>
      </h1>

      <div className="flex gap-6 w-full">
        {/* Search */}
        <div className="flex min-w-0 flex-1 max-w-85 items-center gap-2 rounded-full border border-secondary px-4 py-2">
          <Search className="h-4 w-4 shrink-0 text-gray-500" />
          <input
            type="text"
            placeholder="Search for a product..."
            className="w-full  text-sm text-gray-600 placeholder:text-gray-500 focus:outline-none"
          />
        </div>

        {/* All categories */}
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-gray-500 "
        >
          <LayoutGrid className="h-4 w-4 text-secondary" />
          All categories
          <ChevronDown className="h-4 w-4" />
        </button>

        {/* Monitor off / display status icon */}
        <button
          type="button"
          onClick={() => setIsDisplayOn((prev) => !prev)}
          aria-pressed={isDisplayOn}
          aria-label={isDisplayOn ? "Turn display off" : "Turn display on"}
          className="shrink-0 text-secondary hover:text-secondary"
        >
          {isDisplayOn ? (
            <Monitor className="h-4.5 w-4.5" />
          ) : (
            <MonitorOff className="h-4.5 w-4.5" />
          )}
        </button>
      </div>
      {/* Spacer pushes the rest to the right */}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* Cash register status */}
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border-2 border-primary px-5 py-1.5 text-sm font-bold text-primary"
        >
          <Unlock className="h-3.5 w-3.5 font-bold" />
          Cash Register Open
        </button>

        {/* Clock */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          {time}
        </div>

        {/* User */}
        <button type="button" className="text-secondary">
          <UserCircle className="h-6 w-6" />
        </button>

        {/* Notifications */}
        <button type="button" className="text-secondary">
          <Bell className="h-6 w-6" />
        </button>

        {/* Online status */}
        <div className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">
          <Wifi className="h-3.5 w-3.5" />
          Online
        </div>
      </div>
    </nav>
  );
}

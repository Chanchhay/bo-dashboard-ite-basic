import type { Metadata } from "next";

import { PwaStatus } from "@/components/pwa/PwaStatus";
import { PushNotificationManager } from "@/components/pwa/PushNotificationManager";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export const metadata: Metadata = {
  title: "PWA Test — FluxiBiz",
};

export default function PwaTestPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-10">
      <div>
        <h1 className="text-xl font-bold text-foreground">PWA Test</h1>
      </div>

      <PwaStatus />
      <InstallPrompt />
      <PushNotificationManager />
    </div>
  );
}

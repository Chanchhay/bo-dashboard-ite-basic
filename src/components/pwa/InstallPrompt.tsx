"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Download, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { usePwaInstall } from "@/components/pwa/PwaInstallProvider";
import {
  checkManifest,
  checkServiceWorker,
  isSecureContext,
  type CheckStatus,
} from "@/components/pwa/pwa-diagnostics";

type Reasons = {
  manifest: CheckStatus;
  https: boolean;
  serviceWorker: CheckStatus;
};

function ReasonRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-2", ok ? "text-success" : "text-danger")}>
      {ok ? (
        <CircleCheck className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <X className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      {label}
    </li>
  );
}

export function InstallPrompt() {
  const { toast } = useToast();
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();

  const [wasDismissed, setWasDismissed] = useState(false);
  const [reasons, setReasons] = useState<Reasons | null>(null);

  useEffect(() => {
    Promise.all([checkManifest(), checkServiceWorker()]).then(
      ([manifest, serviceWorker]) => {
        setReasons({
          manifest: manifest.status,
          https: isSecureContext(),
          serviceWorker: serviceWorker.status,
        });
      },
    );
  }, []);

  async function handleInstall() {
    const outcome = await promptInstall();

    if (outcome === "accepted") {
      toast({ tone: "success", title: "Installing FluxiBiz…" });
    } else if (outcome === "dismissed") {
      setWasDismissed(true);
      toast({ tone: "info", title: "Install dismissed" });
    }
  }

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-5">
        <CircleCheck className="size-4 text-success" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          FluxiBiz is installed
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Smartphone className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-base font-semibold text-primary">
          Install App
        </h3>
      </div>

      {canInstall ? (
        <>
          <p className="text-sm text-muted-foreground">
            Install FluxiBiz for a faster, full-screen experience from your
            home screen or desktop.
          </p>
          <Button type="button" onClick={handleInstall}>
            <Download className="size-4" aria-hidden="true" />
            Install FluxiBiz
          </Button>
        </>
      ) : isIOS ? (
        <div className="text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Install FluxiBiz</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              Tap{" "}
              <span role="img" aria-label="share icon">
                ⎋
              </span>{" "}
              Share
            </li>
            <li>Tap &quot;Add to Home Screen&quot;</li>
            <li>Tap &quot;Add&quot;</li>
          </ol>
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            {wasDismissed
              ? "Install dismissed. Your browser only offers the prompt once per visit — reload the page to try again."
              : "Installation is not available yet."}
          </p>

          {reasons && (
            <ul className="flex flex-col gap-1 text-sm">
              <ReasonRow ok={reasons.manifest === "ready"} label="Manifest" />
              <ReasonRow ok={reasons.https} label="HTTPS / secure context" />
              <ReasonRow
                ok={reasons.serviceWorker === "ready"}
                label="Service Worker"
              />
              <ReasonRow
                ok={false}
                label="Browser has not triggered install eligibility"
              />
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

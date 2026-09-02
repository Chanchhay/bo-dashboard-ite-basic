"use client";

import { Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { usePwaInstall } from "@/components/pwa/PwaInstallProvider";


export function InstallAppButton({
  className,
  variant = "outline",
  size = "sm",
  label = "Install App",
  floating = false,
  hideLabelOnMobile = false,
}: {
  className?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default";
  label?: string;
  floating?: boolean;
  hideLabelOnMobile?: boolean;
}) {
  const { toast } = useToast();
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();

  if (isInstalled || (!canInstall && !isIOS)) {
    return null;
  }

  const triggerClassName = cn(
    buttonVariants({ variant: floating ? "default" : variant, size }),
    floating &&
      "fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6 shadow-lg shadow-black/10 dark:shadow-black/40",
    className,
  );

  async function handleInstall() {
    const outcome = await promptInstall();

    if (outcome === "accepted") {
      toast({ tone: "success", title: "Installing FluxiBiz…" });
    } else if (outcome === "dismissed") {
      toast({ tone: "info", title: "Install dismissed" });
    }
  }

  const labelNode = label ? (
    <span className={cn(hideLabelOnMobile && "hidden sm:inline")}>{label}</span>
  ) : null;

  if (isIOS) {
    return (
      <Popover>
        <PopoverTrigger
          aria-label={label}
          title={label}
          className={triggerClassName}
        >
          <Download className="size-4 shrink-0" aria-hidden="true" />
          {labelNode}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 max-w-[calc(100vw-32px)]">
          <p className="mb-2 text-sm font-semibold text-foreground">
            Install FluxiBiz
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
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
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      aria-label={label}
      title={label}
      className={triggerClassName}
    >
      <Download className="size-4 shrink-0" aria-hidden="true" />
      {labelNode}
    </button>
  );
}

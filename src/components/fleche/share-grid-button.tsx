"use client";

import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

interface ShareGridButtonProps {
  /** Absolute or relative URL to the solvable grid page. */
  url: string;
  /** Optional grid title, used to make the share message friendlier. */
  title?: string | null;
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
}

/**
 * "Partager cette grille" — opens the native share sheet when available
 * (mobile → Messages/WhatsApp/etc.) and falls back to copying the link on
 * desktop. The shared link points at the interactive solver so a friend can
 * open it and solve the grid.
 */
export function ShareGridButton({ url, title, variant, className }: ShareGridButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Resolve to an absolute URL so shared links work outside the app origin.
    const absolute =
      typeof window !== "undefined" ? new URL(url, window.location.origin).href : url;
    const shareTitle = title?.trim() ? `Mots fléchés : ${title.trim()}` : "Mots fléchés à résoudre";
    const text = "Je t'ai fait une grille de mots fléchés, à toi de la résoudre !";

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, text, url: absolute });
        return;
      } catch {
        // User dismissed the share sheet, or it's unavailable — fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — nothing more we can do.
    }
  }

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      className={
        className ??
        "btn-lapos rounded-none bg-brand px-4 py-2.5 text-sm text-brand-foreground"
      }
    >
      {copied ? "Lien copié !" : "Partager cette grille"}
    </Button>
  );
}

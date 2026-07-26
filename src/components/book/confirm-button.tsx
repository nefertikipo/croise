"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmButtonProps {
  /** Trigger label, e.g. "Supprimer cette grille". */
  label: React.ReactNode;
  /** Question shown once armed. */
  prompt?: string;
  onConfirm: () => void;
  /** Styling of the trigger button. */
  variant?: "outline" | "ghost" | "destructive";
  className?: string;
  disabled?: boolean;
}

/**
 * Lightweight two-step confirmation for destructive actions: first click arms
 * the button, which then shows an inline "Confirmer / Annuler" pair.
 */
export function ConfirmButton({
  label,
  prompt = "Supprimer ?",
  onConfirm,
  variant = "outline",
  className,
  disabled,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button
        variant={variant}
        className={className}
        disabled={disabled}
        onClick={() => setArmed(true)}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <span className="text-sm text-muted-foreground">{prompt}</span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            setArmed(false);
            onConfirm();
          }}
        >
          Confirmer
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setArmed(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, children, className }: FieldProps) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full border-2 border-black bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function TextAreaField(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "min-h-24 resize-y", props.className)} />;
}

const SWATCHES = [
  "#c8402f", // red
  "#1f9e94", // turquoise
  "#e8b23a", // ochre
  "#2f2a26", // black
  "#7a5c9e", // plum
  "#f4ede1", // cream
];

interface ColorPickerProps {
  value?: string;
  onChange: (color: string | undefined) => void;
  allowNone?: boolean;
}

export function ColorPicker({ value, onChange, allowNone = true }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cn(
            "h-8 w-8 border-2 border-black bg-background text-xs",
            !value && "ring-2 ring-primary ring-offset-1",
          )}
          title="Aucune"
        >
          ✕
        </button>
      )}
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "h-8 w-8 border-2 border-black",
            value === c && "ring-2 ring-primary ring-offset-1",
          )}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  );
}

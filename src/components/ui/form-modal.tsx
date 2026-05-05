import { ReactNode } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit?: (e: React.FormEvent) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  /** Tailwind max-w token, default sm:max-w-lg */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  destructive?: boolean;
  hideFooter?: boolean;
}

const sizeMap = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
};

/**
 * Floating modal that wraps any form. Used everywhere the user enters data —
 * keeps inputs out of inline page space and gives a consistent feel.
 */
export function FormModal({
  open, onOpenChange, title, description, children,
  onSubmit, submitLabel = "Simpan", cancelLabel = "Batal",
  busy, size = "lg", destructive, hideFooter,
}: FormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${sizeMap[size]} max-h-[90vh] overflow-y-auto`}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold tracking-tight">{title}</DialogTitle>
          {description
            ? <DialogDescription className="text-xs">{description}</DialogDescription>
            : <DialogDescription className="sr-only">{title}</DialogDescription>
          }
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit?.(e); }}
          className="space-y-4"
        >
          <div className="space-y-3.5">{children}</div>

          {!hideFooter && (
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                disabled={busy}
                className={destructive ? "" : "gradient-primary text-white border-0"}
                variant={destructive ? "destructive" : "default"}
              >
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {submitLabel}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

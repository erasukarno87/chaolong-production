/**
 * SignatureCapture - Canvas-based signature capture component
 * 
 * Features:
 * - Touch and mouse support
 * - Clear/undo functionality
 * - Exports as PNG data URL
 * - Mobile-friendly
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

interface SignatureCaptureProps {
  /** Called when signature is captured (user finishes drawing) */
  onCapture?: (dataUrl: string) => void;
  /** Called when signature is cleared */
  onClear?: () => void;
  /** Canvas width in pixels */
  width?: number;
  /** Canvas height in pixels */
  height?: number;
  /** Stroke color */
  strokeColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Initial data URL to load (for editing existing signature) */
  initialValue?: string | null;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** CSS class for container */
  className?: string;
}

export interface SignatureRef {
  /** Clear the signature */
  clear: () => void;
  /** Get current signature as data URL */
  toDataURL: () => string | null;
  /** Check if canvas has content */
  isEmpty: () => boolean;
}

export function SignatureCapture({
  onCapture,
  onClear,
  width = 400,
  height = 150,
  strokeColor = "#000000",
  strokeWidth = 2,
  initialValue,
  disabled = false,
  className = "",
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with existing signature if provided
  useEffect(() => {
    if (initialValue && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = initialValue;
    }
  }, [initialValue]);

  // Get context helper
  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  // Get coordinates from mouse/touch event
  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // Start drawing
  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      const ctx = getContext();
      if (!ctx) return;

      setIsDrawing(true);
      setHasSignature(true);
      lastPoint.current = getCoordinates(e);

      // Begin path with styling
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    },
    [disabled, getContext, getCoordinates, strokeColor, strokeWidth]
  );

  // Draw
  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return;

      const ctx = getContext();
      if (!ctx || !lastPoint.current) return;

      const currentPoint = getCoordinates(e);

      // Draw line from last point to current point
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();

      lastPoint.current = currentPoint;
    },
    [isDrawing, disabled, getContext, getCoordinates]
  );

  // Stop drawing
  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPoint.current = null;

      // Notify parent of capture
      const canvas = canvasRef.current;
      if (canvas && onCapture) {
        onCapture(canvas.toDataURL("image/png"));
      }
    }
  }, [isDrawing, onCapture]);

  // Clear signature
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear?.();
  }, [getContext, onClear]);

  // Public methods via ref
  const toDataURL = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return null;
    return canvas.toDataURL("image/png");
  }, [hasSignature]);

  const isEmpty = useCallback((): boolean => {
    return !hasSignature;
  }, [hasSignature]);

  // Prevent scrolling on touch devices while drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventScroll = (e: TouchEvent) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };

    canvas.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      canvas.removeEventListener("touchmove", preventScroll);
    };
  }, [isDrawing]);

  return (
    <div className={`space-y-2 ${className}`}>
      <Card
        className={`relative overflow-hidden transition-shadow ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        style={{
          border: "2px dashed var(--border)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`w-full touch-none cursor-crosshair bg-white ${
            disabled ? "cursor-not-allowed" : ""
          }`}
          style={{
            display: "block",
            maxWidth: "100%",
            height: "auto",
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Placeholder text when empty */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground/50">
              Tanda tangan di area ini
            </p>
          </div>
        )}
      </Card>

      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {hasSignature ? "Signature captured" : "Draw your signature above"}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSignature}
            disabled={disabled || !hasSignature}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Hapus
          </Button>
        </div>
      </div>
    </div>
  );
}

// Export ref methods type
export type { SignatureRef };
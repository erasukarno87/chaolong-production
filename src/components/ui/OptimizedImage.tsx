/**
 * Optimized Image Component
 * 
 * Automatically handles:
 * - Lazy loading
 * - WebP conversion
 * - Responsive images
 * - Loading states
 */

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { imageOptimizer } from '@/lib/performance/imageOptimization';
import { Loader2 } from 'lucide-react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  quality?: number;
  responsive?: boolean;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  lazy = true,
  quality = 80,
  responsive = true,
  fallback,
  onLoad,
  onError,
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!lazy) {
      // Load immediately if not lazy
      loadImage();
    } else if (imgRef.current) {
      // Observe for lazy loading
      imageOptimizer.observeImage(imgRef.current);
    }
  }, [src, lazy]);

  const loadImage = () => {
    const optimizedSrc = imageOptimizer.getOptimizedUrl(src, {
      quality,
      maxWidth: width,
      maxHeight: height,
      format: imageOptimizer.getOptimalFormat(),
    });

    setCurrentSrc(optimizedSrc);
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    
    if (fallback) {
      setCurrentSrc(fallback);
    }
    
    onError?.();
  };

  // Generate srcset for responsive images
  const srcset = responsive && width
    ? imageOptimizer.generateSrcSet(src, [width, width * 1.5, width * 2])
    : undefined;

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Loading State */}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded"
          style={{ width, height }}
        >
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {hasError && !fallback && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded"
          style={{ width, height }}
        >
          <div className="text-center text-gray-500">
            <svg
              className="h-8 w-8 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}

      {/* Image */}
      <img
        ref={imgRef}
        src={lazy ? undefined : currentSrc}
        data-src={lazy ? currentSrc : undefined}
        srcSet={srcset}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        className={`${lazy ? 'lazy' : ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading={lazy ? 'lazy' : 'eager'}
        {...props}
      />
    </div>
  );
}
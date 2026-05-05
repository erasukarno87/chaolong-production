/**
 * Image Optimization Utilities
 * 
 * Provides utilities for optimizing images:
 * - Lazy loading
 * - WebP conversion
 * - Responsive images
 * - Compression
 */

export interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png';
  lazy?: boolean;
}

class ImageOptimizer {
  private static instance: ImageOptimizer;
  private observer: IntersectionObserver | null = null;
  private loadedImages = new Set<string>();

  private constructor() {
    this.initializeLazyLoading();
  }

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  /**
   * Initialize lazy loading observer
   */
  private initializeLazyLoading() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.observer?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );
  }

  /**
   * Load image with lazy loading
   */
  private loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (src) {
      img.src = src;
      this.loadedImages.add(src);
    }

    if (srcset) {
      img.srcset = srcset;
    }

    img.classList.remove('lazy');
    img.classList.add('loaded');
  }

  /**
   * Observe image for lazy loading
   */
  observeImage(img: HTMLImageElement) {
    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Fallback: load immediately if IntersectionObserver not supported
      this.loadImage(img);
    }
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(baseUrl: string, widths: number[]): string {
    return widths
      .map((width) => {
        const url = this.getOptimizedUrl(baseUrl, { maxWidth: width });
        return `${url} ${width}w`;
      })
      .join(', ');
  }

  /**
   * Get optimized image URL
   */
  getOptimizedUrl(url: string, options: ImageOptimizationOptions = {}): string {
    const {
      quality = 80,
      maxWidth,
      maxHeight,
      format = 'webp',
    } = options;

    // If using Supabase Storage, add transformation parameters
    if (url.includes('supabase')) {
      const params = new URLSearchParams();
      
      if (maxWidth) params.append('width', maxWidth.toString());
      if (maxHeight) params.append('height', maxHeight.toString());
      params.append('quality', quality.toString());
      params.append('format', format);

      return `${url}?${params.toString()}`;
    }

    // For other URLs, return as-is
    return url;
  }

  /**
   * Compress image file
   */
  async compressImage(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<Blob> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'webp',
    } = options;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Calculate new dimensions
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            `image/${format}`,
            quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Preload critical images
   */
  preloadImages(urls: string[]) {
    urls.forEach((url) => {
      if (this.loadedImages.has(url)) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);

      this.loadedImages.add(url);
    });
  }

  /**
   * Check if WebP is supported
   */
  isWebPSupported(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Get optimal image format
   */
  getOptimalFormat(): 'webp' | 'jpeg' {
    return this.isWebPSupported() ? 'webp' : 'jpeg';
  }

  /**
   * Disconnect observer
   */
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Export singleton instance
export const imageOptimizer = ImageOptimizer.getInstance();

// Convenience functions
export const observeImage = (img: HTMLImageElement) => imageOptimizer.observeImage(img);

export const generateSrcSet = (baseUrl: string, widths: number[]) =>
  imageOptimizer.generateSrcSet(baseUrl, widths);

export const getOptimizedUrl = (url: string, options?: ImageOptimizationOptions) =>
  imageOptimizer.getOptimizedUrl(url, options);

export const compressImage = (file: File, options?: ImageOptimizationOptions) =>
  imageOptimizer.compressImage(file, options);

export const preloadImages = (urls: string[]) => imageOptimizer.preloadImages(urls);

export const isWebPSupported = () => imageOptimizer.isWebPSupported();

export const getOptimalFormat = () => imageOptimizer.getOptimalFormat();

export default imageOptimizer;
import React from 'react';
import Image from 'next/image';

/**
 * OptimizedImage - Wrapper for Next.js Image component with best practices
 *
 * Features:
 * - Automatic blur placeholder
 * - Responsive sizing
 * - Lazy loading (default)
 * - Priority loading for above-the-fold images
 * - Error fallback
 * - AVIF/WebP format optimization
 *
 * @example
 * <OptimizedImage
 *   src={lesson.thumbnail}
 *   alt="Lesson thumbnail"
 *   width={320}
 *   height={180}
 *   priority={false}
 * />
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 80,
  className = '',
  sizes,
  fill = false,
  objectFit = 'cover',
  onError,
  placeholder = 'blur',
  blurDataURL,
  ...props
}) => {
  // Generate blur placeholder if not provided
  const defaultBlurDataURL = blurDataURL || generateBlurDataURL(width, height);

  // Default sizes based on common breakpoints
  const defaultSizes = sizes || `
    (max-width: 640px) 100vw,
    (max-width: 768px) 50vw,
    (max-width: 1024px) 33vw,
    25vw
  `.replace(/\s+/g, ' ').trim();

  // Error handler with fallback image
  const handleError = (e) => {
    console.error('Image failed to load:', src);
    if (onError) {
      onError(e);
    } else {
      // Fallback to default placeholder
      e.target.src = '/default-thumbnail.jpg';
    }
  };

  // For fill images (responsive containers)
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        quality={quality}
        className={className}
        sizes={defaultSizes}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={defaultBlurDataURL}
        style={{ objectFit }}
        onError={handleError}
        {...props}
      />
    );
  }

  // For fixed-size images
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      quality={quality}
      className={className}
      sizes={defaultSizes}
      priority={priority}
      placeholder={placeholder}
      blurDataURL={defaultBlurDataURL}
      loading={priority ? 'eager' : 'lazy'}
      onError={handleError}
      {...props}
    />
  );
};

/**
 * Generate a lightweight SVG blur placeholder
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} Base64-encoded SVG
 */
function generateBlurDataURL(width = 320, height = 180) {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f0f0f0;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>
  `.replace(/\s+/g, ' ').trim();

  // Use btoa for browser-compatible base64 encoding
  // btoa works with ASCII strings, so we need to handle Unicode properly
  const base64 = typeof window !== 'undefined'
    ? btoa(svg)
    : Buffer.from(svg).toString('base64');

  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Preset for lesson card thumbnails
 */
export const LessonThumbnail = (props) => (
  <OptimizedImage
    width={320}
    height={180}
    quality={85}
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
    {...props}
  />
);

/**
 * Preset for hero images (above the fold)
 */
export const HeroImage = (props) => (
  <OptimizedImage
    priority={true}
    quality={90}
    sizes="100vw"
    {...props}
  />
);

/**
 * Preset for avatar images
 */
export const AvatarImage = (props) => (
  <OptimizedImage
    width={64}
    height={64}
    quality={75}
    sizes="64px"
    {...props}
  />
);

export default OptimizedImage;

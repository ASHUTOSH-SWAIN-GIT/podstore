/**
 * CDN Configuration for fast delivery of recordings
 * 
 * This utility handles CDN URL generation for Cloudflare R2 + CDN
 * to ensure maximum speed for recording delivery worldwide.
 */

interface CDNConfig {
  enabled: boolean;
  customDomain?: string;
  r2PublicUrl?: string;
  cacheMaxAge: number;
}

const cdnConfig: CDNConfig = {
  enabled: !!process.env.CDN_ENABLED,
  customDomain: process.env.CDN_CUSTOM_DOMAIN,
  r2PublicUrl: process.env.R2_PUBLIC_URL,
  cacheMaxAge: parseInt(process.env.CDN_CACHE_MAX_AGE || '86400'), // 24 hours default
};

/**
 * Generate a CDN URL for a given S3 key
 * Falls back to signed URLs if CDN is not configured
 */
export function getCDNUrl(s3Key: string): string {
  if (!s3Key) {
    throw new Error('S3 key is required');
  }

  // If CDN is enabled and custom domain is configured
  if (cdnConfig.enabled && cdnConfig.customDomain) {
    // Use custom CDN domain (e.g., cdn.yourapp.com)
    return `https://${cdnConfig.customDomain}/${s3Key}`;
  }

  // If CDN is enabled but using R2 public URL
  if (cdnConfig.enabled && cdnConfig.r2PublicUrl) {
    // Use R2 public URL with CDN (e.g., pub-123.r2.dev)
    return `${cdnConfig.r2PublicUrl}/${s3Key}`;
  }

  // Fallback: return the S3 key for signed URL generation
  // This will be handled by the existing signed URL logic
  return s3Key;
}

/**
 * Check if CDN is properly configured
 */
export function isCDNConfigured(): boolean {
  return cdnConfig.enabled && (!!cdnConfig.customDomain || !!cdnConfig.r2PublicUrl);
}

/**
 * Get CDN cache headers for API responses
 * Optimized for long-term caching - recordings don't change once uploaded
 */
export function getCDNHeaders(): Record<string, string> {
  if (!cdnConfig.enabled) {
    return {};
  }

  return {
    // Standard cache control for browsers and CDN
    'Cache-Control': `public, max-age=${cdnConfig.cacheMaxAge}, s-maxage=${cdnConfig.cacheMaxAge}, immutable`,
    // CDN-specific headers for optimal caching
    'CDN-Cache-Control': `max-age=${cdnConfig.cacheMaxAge}`,
    'Cloudflare-CDN-Cache-Control': `max-age=${cdnConfig.cacheMaxAge}`,
    // Additional headers for better caching
    'Vary': 'Accept-Encoding',
    'X-CDN-Optimized': 'true',
  };
}

/**
 * Generate a streaming URL for video playback
 * Optimized for CDN delivery with proper headers
 */
export function getStreamingUrl(s3Key: string): string {
  const cdnUrl = getCDNUrl(s3Key);
  
  // If it's still an S3 key (CDN not configured), return as-is
  if (cdnUrl === s3Key) {
    return s3Key;
  }

  // For CDN URLs, we can directly stream
  return cdnUrl;
}

/**
 * Generate a download URL with proper filename and headers
 */
export function getDownloadUrl(s3Key: string, filename?: string): string {
  const cdnUrl = getCDNUrl(s3Key);
  
  // If it's still an S3 key (CDN not configured), return as-is
  if (cdnUrl === s3Key) {
    return s3Key;
  }

  // For CDN URLs, add filename parameter if provided
  if (filename) {
    const url = new URL(cdnUrl);
    url.searchParams.set('response-content-disposition', `attachment; filename="${filename}"`);
    return url.toString();
  }

  return cdnUrl;
}

/**
 * Warm CDN cache by making a HEAD request to the CDN URL
 * This primes the cache so subsequent users get instant access
 */
export async function warmCDNCache(s3Key: string): Promise<boolean> {
  if (!isCDNConfigured()) {
    return false;
  }

  try {
    const cdnUrl = getCDNUrl(s3Key);
    if (cdnUrl === s3Key) {
      return false; // CDN not configured properly
    }

    // Make a HEAD request to warm the cache
    const response = await fetch(cdnUrl, { 
      method: 'HEAD',
      cache: 'no-store' // Don't cache this warming request locally
    });
    
    return response.ok;
  } catch (error) {
    console.warn('Failed to warm CDN cache for:', s3Key, error);
    return false;
  }
}

/**
 * Batch warm multiple recordings for better user experience
 * Useful for warming recently uploaded or popular recordings
 */
export async function batchWarmCache(s3Keys: string[]): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    s3Keys.map(key => warmCDNCache(key))
  );
  
  const success = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failed = results.length - success;
  
  return { success, failed };
}

export { cdnConfig };

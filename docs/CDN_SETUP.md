# CDN Integration Guide for PodStore

This guide will help you set up CDN for maximum speed delivery of your recordings worldwide.

## Overview

CDN (Content Delivery Network) integration provides:
- **Global fast delivery** - Recordings served from edge locations worldwide
- **Reduced server load** - Files served directly from CDN
- **Better user experience** - Faster downloads and streaming
- **Scalability** - Handle high traffic without server stress

## Setup Options

### Option 1: Cloudflare R2 + Custom Domain (Recommended for Production)

1. **Enable R2 Public Access**
   - Go to Cloudflare Dashboard > R2 > Your Bucket (`podstore`)
   - Navigate to Settings > Public access
   - Click "Allow Access" and note the public URL (e.g., `https://pub-abc123def456.r2.dev`)

2. **Set up Custom Domain**
   - Go to Cloudflare Dashboard > DNS
   - Add a CNAME record: `cdn.yourapp.com` → `pub-abc123def456.r2.dev`
   - Make sure the record is proxied (orange cloud) for CDN benefits

3. **Update Environment Variables**
   ```env
   CDN_ENABLED=true
   CDN_CUSTOM_DOMAIN=cdn.yourapp.com
   CDN_CACHE_MAX_AGE=86400
   ```

### Option 2: R2 Public URL (Simple Setup)

1. **Enable R2 Public Access**
   - Same as Option 1, step 1

2. **Update Environment Variables**
   ```env
   CDN_ENABLED=true
   R2_PUBLIC_URL=https://pub-abc123def456.r2.dev
   CDN_CACHE_MAX_AGE=86400
   ```

## Environment Variables Reference

```env
# Enable CDN (set to "true" to enable)
CDN_ENABLED=false

# Option 1: Custom CDN domain (recommended)
CDN_CUSTOM_DOMAIN=cdn.yourapp.com

# Option 2: R2 Public URL
R2_PUBLIC_URL=https://pub-abc123def456.r2.dev

# CDN cache duration in seconds (24 hours = 86400)
CDN_CACHE_MAX_AGE=86400
```

## How It Works

### With CDN Enabled:
1. **View Recording**: Opens CDN URL directly in browser - fastest possible streaming
2. **Download Recording**: Redirects to CDN URL with download headers - fastest download
3. **UI Indicators**: Shows "CDN" badges and lightning bolt icons for CDN-enabled recordings

### Without CDN (Fallback):
1. **View Recording**: Generates signed S3 URL through your server
2. **Download Recording**: Streams file through your server
3. **UI**: Normal buttons without CDN indicators

## Testing

1. **Before CDN**: Access recordings via `http://localhost:3000/dashboard/recordings`
2. **Enable CDN**: Set `CDN_ENABLED=true` and appropriate domain/URL
3. **After CDN**: You'll see:
   - "CDN Enabled" badge in page header
   - Green "CDN" badges on recordings
   - Lightning bolt icons on View/Download buttons
   - Faster loading when viewing/downloading

## Advanced Configuration

### Custom Cache Headers
The system automatically sets these headers for CDN optimization:
- `Cache-Control: public, max-age=86400, s-maxage=86400`
- `CDN-Cache-Control: max-age=86400`
- `Cloudflare-CDN-Cache-Control: max-age=86400`

### Multi-Quality Streaming (Future Enhancement)
You can extend the CDN config to support multiple quality levels:
```typescript
// lib/cdn-config.ts
export function getStreamingUrl(s3Key: string, quality?: 'low' | 'medium' | 'high'): string {
  // Implementation for quality-based URLs
}
```

## Performance Benefits

| Metric | Without CDN | With CDN |
|--------|-------------|----------|
| **Download Speed** | Limited by server | Edge location speed |
| **Server Load** | High (streaming) | Minimal (redirects only) |
| **Global Performance** | Single region | Worldwide edge locations |
| **Scalability** | Server-dependent | CDN-scaled |
| **Bandwidth Costs** | Server egress | CDN rates |

## Troubleshooting

### CDN Not Working
1. Check `CDN_ENABLED=true` in `.env`
2. Verify R2 bucket has public access enabled
3. Ensure custom domain CNAME is correct and proxied
4. Check browser network tab for CDN URLs

### Slow Performance
1. Verify recordings are uploading to R2 correctly
2. Check CDN cache headers in browser developer tools
3. Ensure CNAME record is proxied (orange cloud in Cloudflare)

### Missing CDN Indicators
1. Recordings must have `cdnUrl` property populated
2. API should return `cdnEnabled: true`
3. Check console for any JavaScript errors

## Production Checklist

- [ ] R2 bucket has public access enabled
- [ ] Custom domain CNAME record created and proxied
- [ ] Environment variables updated
- [ ] CDN indicators visible in UI
- [ ] Test download/view performance
- [ ] Monitor CDN cache hit rates
- [ ] Set up CDN analytics (optional)

## Security Notes

- CDN URLs are public but recordings require authentication to access
- File listing/discovery still requires login
- Delete operations are protected by user ownership checks
- CDN provides DDoS protection and security features

---

**Need Help?**
- Check Cloudflare R2 documentation for public access setup
- Test with a small file first before enabling for all recordings
- Monitor performance improvements in your analytics

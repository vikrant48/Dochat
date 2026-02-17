/**
 * Transforms a Supabase S3-style internal URL into a public CDN URL.
 * Example Internal: https://[project-ref].storage.supabase.co/[bucket]/[key]
 * Example Public: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[key]
 */
export const getPublicUrl = (location: string): string => {
    if (!location) return location;

    if (location.includes('storage.supabase.co')) {
        return location.replace('.storage.supabase.co/', '.supabase.co/storage/v1/object/public/');
    }

    return location;
};

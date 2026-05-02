import { supabase } from '@/services/api';

/**
 * Resolves a potentially relative image path from Supabase storage into a public URL.
 * If the path is already a full URL (starts with http), it returns it as is.
 * 
 * @param path The image path or URL
 * @param bucket The Supabase storage bucket name (defaults to 'listings')
 * @returns A full public URL
 */
export const resolveImageUrl = (path: string | null | undefined, bucket: string = 'listings'): string => {
  if (!path) return '';
  
  // If it's already an absolute URL, return it
  if (path.startsWith('http')) return path;
  if (path.startsWith('//')) return `https:${path}`;
  
  // Handle paths that might start with a leading slash
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // If the path starts with the bucket name followed by a slash, strip it
  // example: 'listings/image.jpg' -> 'image.jpg' when bucket is 'listings'
  if (cleanPath.startsWith(`${bucket}/`)) {
    cleanPath = cleanPath.slice(bucket.length + 1);
  }
  
  // Get the public URL from Supabase storage
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
  
  return data.publicUrl;
};

/**
 * Resolves an array of image data into public URLs.
 * 
 * @param images Array of image objects or strings
 * @returns Array of strings (public URLs)
 */
export const resolveImageUrls = (images: any[] | null | undefined, bucket: string = 'listings'): string[] => {
  if (!images || !Array.isArray(images)) return [];
  
  return images.map(img => {
    if (typeof img === 'string') return resolveImageUrl(img, bucket);
    if (img && typeof img === 'object') {
      const path = img.url || img.src || img.path;
      return resolveImageUrl(path, bucket);
    }
    return '';
  });
};

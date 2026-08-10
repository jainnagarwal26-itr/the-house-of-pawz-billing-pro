// ============================================================
// storageService.ts — Supabase Storage API Integration
// Project: The House of Pawz – Billing Pro
// ============================================================

import { supabase } from './supabase';

export type StorageBucket = 'company-assets' | 'invoice-assets' | 'signatures' | 'stamps' | 'documents' | 'backups';

export async function uploadFileToSupabaseStorage(
  bucket: StorageBucket,
  path: string,
  file: File | Blob
): Promise<{ publicUrl?: string; signedUrl?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true
      });

    if (error || !data) {
      return { error: error?.message || 'Failed to upload file to storage' };
    }

    if (bucket === 'company-assets') {
      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(path);
      return { publicUrl: pubData.publicUrl };
    } else {
      // Private bucket -> generate a 1-hour Signed URL
      const { data: signedData, error: signedErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);

      if (signedErr || !signedData) {
        return { error: signedErr?.message || 'Failed to create signed URL' };
      }
      return { signedUrl: signedData.signedUrl };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getSecureAssetUrl(bucket: StorageBucket, path: string): Promise<string> {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:image')) {
    return path;
  }
  try {
    if (bucket === 'company-assets') {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    } else {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      return data?.signedUrl || '';
    }
  } catch (err) {
    return '';
  }
}

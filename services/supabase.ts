
import { createClient } from '@supabase/supabase-js';
import { PhotoData } from '../types';

/* 
   ===========================================================================
   ⚡️ SUPABASE SETUP INSTRUCTIONS (REQUIRED FOR REALTIME SYNC) ⚡️
   
   If you see "Could not find the 'caption' column" errors, your table is missing fields.
   RUN THIS SQL IN YOUR SUPABASE DASHBOARD > SQL EDITOR TO FIX IT:

   ----------------------------------------------------------------
   -- 1. Fix Missing Columns (Run this if table already exists)
   ----------------------------------------------------------------
   alter table photos add column if not exists caption text;
   alter table photos add column if not exists date text;
   alter table photos add column if not exists rotation numeric;
   alter table photos add column if not exists z_index numeric;
   alter table photos add column if not exists x numeric;
   alter table photos add column if not exists y numeric;

   ----------------------------------------------------------------
   -- 2. Create Table (If you haven't created it yet)
   ----------------------------------------------------------------
   create table if not exists photos (
     id uuid primary key,
     image_url text not null,
     caption text,
     date text,
     rotation numeric,
     z_index numeric,
     x numeric,
     y numeric,
     created_at timestamptz default now()
   );

   ----------------------------------------------------------------
   -- 3. Enable Realtime & Permissions
   ----------------------------------------------------------------
   alter publication supabase_realtime add table photos;
   
   alter table photos enable row level security;
   create policy "Public view" on photos for select to anon using (true);
   create policy "Public insert" on photos for insert to anon with check (true);
   create policy "Public delete" on photos for delete to anon using (true);

   ----------------------------------------------------------------
   -- 4. Create Storage Bucket
   ----------------------------------------------------------------
   insert into storage.buckets (id, name, public) values ('retro-uploads', 'retro-uploads', true);
   create policy "Public Access" on storage.objects for select to public using ( bucket_id = 'retro-uploads' );
   create policy "Public Upload" on storage.objects for insert to public with check ( bucket_id = 'retro-uploads' );
   ===========================================================================
*/

const supabaseUrl = 'https://rbwlnnspktdijewmdivj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJid2xubnNwa3RkaWpld21kaXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2ODAyNjEsImV4cCI6MjA3OTI1NjI2MX0.VKJ_ZA8r56PhQhoTZ_b6TupIS_bCtlBsvxyblDJfBNs';

export const supabase = createClient(supabaseUrl, supabaseKey);

const LOCAL_STORAGE_KEY = 'retro_snap_gallery_backup';

// --- Types based on your DB Schema ---
interface DBPhoto {
  id: string;
  image_url: string;
  caption: string;
  date: string;
  rotation: number;
  z_index: number;
  x: number;
  y: number;
  created_at: string;
}

// --- Local Storage Helpers (The Safety Net) ---
const getLocalPhotos = (): PhotoData[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalBackup = (photo: PhotoData) => {
  const current = getLocalPhotos();
  // Prevent duplicates
  if (!current.some(p => p.id === photo.id)) {
    const updated = [photo, ...current];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    // Dispatch local event for same-tab updates
    window.dispatchEvent(new Event('local-gallery-update'));
  }
};

const deleteLocalPhoto = (id: string) => {
  const current = getLocalPhotos();
  const updated = current.filter(p => p.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('local-gallery-update'));
};

// Helper to convert base64 to Blob
const base64ToBlob = (base64: string, mimeType: string = 'image/jpeg') => {
  const byteString = atob(base64.includes(',') ? base64.split(',')[1] : base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
};

/**
 * 1. Save Local Backup (Hybrid Persistence)
 * 2. Upload to Storage (with Fallback)
 * 3. Insert Row to DB
 */
export const uploadAndSavePhoto = async (base64Image: string, photoMetadata: Omit<PhotoData, 'imageUrl' | 'timestamp'>) => {
  // 1. Construct Full Photo Data
  const fullPhotoData: PhotoData = {
    ...photoMetadata,
    imageUrl: base64Image, // Initially use base64 for local instant speed
    timestamp: Date.now()
  };

  // 2. SAVE LOCAL BACKUP IMMEDIATELY
  // This ensures that even if the next lines fail, the photo is saved on this device.
  saveLocalBackup(fullPhotoData);

  try {
    // A. Upload Image to Storage
    const filename = `${photoMetadata.id}.jpg`; // use jpg extension
    const blob = base64ToBlob(base64Image, 'image/jpeg');
    let finalImageUrl = '';

    try {
      const { error: uploadError } = await supabase.storage
        .from('retro-uploads')
        .upload(`public/${filename}`, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('retro-uploads')
        .getPublicUrl(`public/${filename}`);
        
      finalImageUrl = data.publicUrl;
      
    } catch (storageError: any) {
      console.warn("Supabase Storage upload failed (using Base64 fallback):", storageError.message);
      // FALLBACK: Use the base64 string directly if storage fails
      // Note: Now that we use JPEG compression in RetroCamera, this string is smaller and safer for DB
      finalImageUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    }

    // Update the local backup with the cloud URL if we got one (cleaner than base64)
    if (finalImageUrl.startsWith('http')) {
        const current = getLocalPhotos();
        const index = current.findIndex(p => p.id === photoMetadata.id);
        if (index !== -1) {
            current[index].imageUrl = finalImageUrl;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
        }
    }

    // B. Insert into 'photos' table
    const { error: dbError } = await supabase
      .from('photos')
      .insert([
        {
          id: photoMetadata.id,
          image_url: finalImageUrl,
          caption: photoMetadata.caption,
          date: photoMetadata.date,
          rotation: photoMetadata.rotation,
          z_index: photoMetadata.zIndex,
          x: photoMetadata.x || 0,
          y: photoMetadata.y || 0,
        }
      ]);

    if (dbError) {
      // Specific handling for missing columns
      if (dbError.code === '42703' || dbError.message.includes('Could not find the')) {
         console.warn(`⚠️ SCHEMA MISMATCH: Your table is missing columns. Running SQL setup is recommended.`);
         console.warn(`🔄 Attempting COMPATIBILITY INSERT (Photo will sync, but extra metadata might be lost on other devices)...`);
         
         // RETRY: Insert ONLY the fields we know usually exist in a basic table (fallback)
         const { error: retryError } = await supabase.from('photos').insert([{
            id: photoMetadata.id,
            image_url: finalImageUrl
         }]);

         if (retryError) {
             console.error("❌ Compatibility insert also failed:", retryError.message);
         } else {
             console.log("✅ Compatibility insert successful! Photo synced.");
         }

      } else if (dbError.code === '42P01') {
         console.warn("⚠️ SUPABASE TABLE MISSING: Running in LOCAL ONLY mode. Please run the SQL setup script.");
      } else {
         console.error("DB Insert Failed (saved locally):", dbError.message);
      }
    }

    return finalImageUrl;
  } catch (error) {
    console.error("Upload/Save process failed (preserved locally):", error);
    return base64Image;
  }
};

/**
 * Delete photo from DB and Storage
 */
export const deletePhoto = async (id: string) => {
  // 1. Delete Locally
  deleteLocalPhoto(id);

  try {
    // 2. Delete from DB
    await supabase.from('photos').delete().eq('id', id);
    // 3. Cleanup Storage
    supabase.storage.from('retro-uploads').remove([`public/${id}.jpg`]);
  } catch (error) {
    console.warn("Cloud delete failed (offline mode?)", error);
  }
};

/**
 * Hybrid Subscription: LocalStorage + Supabase Realtime + Polling
 */
export const useRealtimePhotos = (onPhotosUpdated: (photos: PhotoData[]) => void) => {
  // Local cache to merge updates
  let currentPhotos: PhotoData[] = getLocalPhotos();
  
  const update = (newPhotos: PhotoData[]) => {
    // Merge logic: Keep unique by ID, sort by timestamp desc
    const combined = [...newPhotos, ...currentPhotos];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    // Sort by timestamp (or created_at if available, assuming timestamp is synced)
    unique.sort((a, b) => b.timestamp - a.timestamp);
    
    // Only update state if counts differ (basic optimization)
    if (unique.length !== currentPhotos.length || JSON.stringify(unique.map(p=>p.id)) !== JSON.stringify(currentPhotos.map(p=>p.id))) {
        currentPhotos = unique;
        onPhotosUpdated(currentPhotos);
    }
  };

  // 1. Initial Load from Local Storage
  onPhotosUpdated(currentPhotos);

  const mapDBToPhotoData = (row: DBPhoto): PhotoData => ({
    id: row.id,
    imageUrl: row.image_url,
    // Handle missing columns safely if we inserted via compatibility mode
    caption: row.caption || "Shared Memory",
    date: row.date || new Date().toLocaleDateString(),
    rotation: Number(row.rotation) || 0,
    zIndex: Number(row.z_index) || 1,
    x: Number(row.x) || 0,
    y: Number(row.y) || 0,
    timestamp: new Date(row.created_at).getTime()
  });

  // 2. Fetch from Supabase
  const fetchCloud = async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const cloudPhotos = data.map(mapDBToPhotoData);
      update(cloudPhotos);
    } else if (error) {
        // Silent fail is okay here, it just means offline or table missing
    }
  };

  // Fetch immediately
  fetchCloud();

  // Polling Interval (Safety Net for sync issues)
  const pollInterval = setInterval(fetchCloud, 10000); // Check every 10s

  // 3. Subscribe to DB Changes
  const channel = supabase
    .channel('public:photos')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'photos' },
      (payload) => {
        const newPhoto = mapDBToPhotoData(payload.new as DBPhoto);
        update([newPhoto]);
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'photos' },
      (payload) => {
        const deletedId = payload.old.id;
        currentPhotos = currentPhotos.filter(p => p.id !== deletedId);
        onPhotosUpdated([...currentPhotos]);
        deleteLocalPhoto(deletedId);
      }
    )
    .subscribe();

  // 4. Subscribe to LOCAL events (for fallback / offline mode)
  const handleLocalUpdate = () => {
      const local = getLocalPhotos();
      update(local);
  };

  window.addEventListener('local-gallery-update', handleLocalUpdate);
  window.addEventListener('storage', handleLocalUpdate); // Cross-tab sync

  // Return cleanup function
  return () => {
    clearInterval(pollInterval);
    supabase.removeChannel(channel);
    window.removeEventListener('local-gallery-update', handleLocalUpdate);
    window.removeEventListener('storage', handleLocalUpdate);
  };
};

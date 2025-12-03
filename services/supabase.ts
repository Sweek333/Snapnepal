
import { createClient } from '@supabase/supabase-js';
import { PhotoData } from '../types';

/* 
   ===========================================================================
   ⚡️ SUPABASE SETUP INSTRUCTIONS (REQUIRED) ⚡️
   
   Run this SQL in your Supabase Dashboard > SQL Editor to fix the "Missing Column" errors:

   ----------------------------------------------------------------
   -- 1. ADD MISSING COLUMNS (Run this if table exists but update fails)
   ----------------------------------------------------------------
   alter table photos add column if not exists author_name text;
   alter table photos add column if not exists bio text;
   alter table photos add column if not exists social_handle text;

   ----------------------------------------------------------------
   -- 2. Create Table (Only if starting fresh)
   ----------------------------------------------------------------
   create table if not exists photos (
     id uuid primary key,
     image_url text not null,
     caption text,
     author_name text,
     bio text,
     social_handle text,
     date text,
     rotation numeric,
     z_index numeric,
     x numeric,
     y numeric,
     created_at timestamptz default now()
   );

   ----------------------------------------------------------------
   -- 3. Enable Realtime (For instant gallery updates)
   ----------------------------------------------------------------
   alter publication supabase_realtime add table photos;
   
   ----------------------------------------------------------------
   -- 4. Policies (Allow Public Access)
   ----------------------------------------------------------------
   alter table photos enable row level security;
   
   -- Allow INSERT/SELECT
   create policy "Public view" on photos for select to anon using (true);
   create policy "Public insert" on photos for insert to anon with check (true);
   
   -- Allow UPDATE (Crucial for editing Bio/Name)
   create policy "Public update" on photos for update to anon using (true);

   -- Allow DELETE (Crucial for Delete/Reset)
   create policy "Public delete" on photos for delete to anon using (true);

   ----------------------------------------------------------------
   -- 5. Storage Bucket
   ----------------------------------------------------------------
   insert into storage.buckets (id, name, public) values ('retro-uploads', 'retro-uploads', true)
   on conflict (id) do nothing;
   
   create policy "Public Access" on storage.objects for select to public using ( bucket_id = 'retro-uploads' );
   create policy "Public Upload" on storage.objects for insert to public with check ( bucket_id = 'retro-uploads' );
   create policy "Public Delete" on storage.objects for delete to public using ( bucket_id = 'retro-uploads' );
   ===========================================================================
*/

// Use env vars if available, otherwise fallback (for demo purposes)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rbwlnnspktdijewmdivj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJid2xubnNwa3RkaWpld21kaXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2ODAyNjEsImV4cCI6MjA3OTI1NjI2MX0.VKJ_ZA8r56PhQhoTZ_b6TupIS_bCtlBsvxyblDJfBNs';

export const supabase = createClient(supabaseUrl, supabaseKey);

const LOCAL_STORAGE_KEY = 'retro_snap_gallery_backup';

// --- Types based on your DB Schema ---
interface DBPhoto {
  id: string;
  image_url: string;
  caption: string;
  author_name?: string;
  bio?: string;
  social_handle?: string;
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
  try {
      const current = getLocalPhotos();
      // Prevent duplicates
      if (!current.some(p => p.id === photo.id)) {
        const updated = [photo, ...current];
        // Enforce a limit to prevent QuotaExceededError
        if (updated.length > 50) updated.length = 50; 
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        // Dispatch local event for same-tab updates
        window.dispatchEvent(new Event('local-gallery-update'));
      }
  } catch (e) {
      console.warn("Local storage full or disabled, skipping backup");
      // Optional: Clear old items if full
      try {
         const current = getLocalPhotos();
         if (current.length > 10) {
            const shrunk = current.slice(0, 10);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shrunk));
         }
      } catch (e2) {}
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
  saveLocalBackup(fullPhotoData);

  try {
    // A. Upload Image to Storage
    const filename = `${photoMetadata.id}.jpg`;
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
      finalImageUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    }

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
          author_name: photoMetadata.authorName, // Keep for legacy
          bio: photoMetadata.bio, // NEW FIELD
          social_handle: photoMetadata.socialHandle
        }
      ]);

    if (dbError) {
      if (dbError.code === '42703' || dbError.message.includes('Could not find the')) {
         console.warn(`⚠️ SCHEMA MISMATCH: Your table is missing columns. PLEASE RUN THE SQL SETUP SCRIPT!`);
         // RETRY: Insert ONLY the fields we know usually exist to ensure at least the photo is saved
         await supabase.from('photos').insert([{
            id: photoMetadata.id,
            image_url: finalImageUrl,
            caption: photoMetadata.caption
         }]);
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
 * Update photo details (Bio, Social, Caption)
 */
export const updatePhoto = async (id: string, updates: Partial<PhotoData>) => {
  // Update Local Backup first
  const current = getLocalPhotos();
  const index = current.findIndex(p => p.id === id);
  if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
      window.dispatchEvent(new Event('local-gallery-update'));
  }

  // Update Cloud
  try {
      const dbUpdates: any = {};
      if (updates.caption !== undefined) dbUpdates.caption = updates.caption;
      if (updates.authorName !== undefined) dbUpdates.author_name = updates.authorName;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio; // NEW FIELD
      if (updates.socialHandle !== undefined) dbUpdates.social_handle = updates.socialHandle;

      // If nothing to update on DB, return
      if (Object.keys(dbUpdates).length === 0) return;

      const { error } = await supabase.from('photos').update(dbUpdates).eq('id', id);
      
      if (error) {
          if (error.code === '42703' || error.message.includes('column')) {
              console.warn("⚠️ UPDATE FAILED: Database is missing 'bio' or 'social_handle'.");
              console.warn("👉 ACTION REQUIRED: Run the SQL script at the top of services/supabase.ts in your Supabase Dashboard.");
          } else if (error.code === '42501') {
              console.warn("⚠️ UPDATE FAILED: Permission denied. Check RLS policies (Public update).");
          } else {
             console.error("Error updating photo:", error.message);
          }
      }
  } catch (e: any) {
      console.error("Update exception:", e.message || e);
  }
};

/**
 * Delete photo from DB and Storage
 */
export const deletePhoto = async (id: string) => {
  deleteLocalPhoto(id);
  try {
    const { error } = await supabase.from('photos').delete().eq('id', id);
    if (error) throw error;
    // Attempt storage delete (fire and forget)
    supabase.storage.from('retro-uploads').remove([`public/${id}.jpg`]);
  } catch (error) {
    console.warn("Cloud delete failed", error);
  }
};

/**
 * WIPE EVERYTHING (Reset Gallery)
 */
export const clearAllPhotos = async () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  window.dispatchEvent(new Event('local-gallery-update'));

  try {
    const { data: photos, error: fetchError } = await supabase.from('photos').select('id');
    if (fetchError) throw fetchError;

    if (photos && photos.length > 0) {
        const ids = photos.map(p => p.id);
        const storagePaths = ids.map(id => `public/${id}.jpg`);

        // We use loops or smaller batches if many, but for now single bulk delete
        const { error: deleteError } = await supabase.from('photos').delete().in('id', ids);
        if (deleteError) console.warn("Failed to delete rows:", deleteError.message);

        if (storagePaths.length > 0) {
            await supabase.storage.from('retro-uploads').remove(storagePaths);
        }
    }
  } catch (e: any) {
      console.error("Clear gallery failed:", e.message);
  }
};

/**
 * Hybrid Subscription: LocalStorage + Supabase Realtime + Polling
 */
export const useRealtimePhotos = (onPhotosUpdated: (photos: PhotoData[]) => void) => {
  let currentPhotos: PhotoData[] = getLocalPhotos();
  
  const update = (newPhotos: PhotoData[]) => {
    const combined = [...newPhotos, ...currentPhotos];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    unique.sort((a, b) => b.timestamp - a.timestamp);
    
    if (unique.length !== currentPhotos.length || JSON.stringify(unique) !== JSON.stringify(currentPhotos)) {
        currentPhotos = unique;
        onPhotosUpdated(currentPhotos);
    }
  };

  onPhotosUpdated(currentPhotos);

  const mapDBToPhotoData = (row: DBPhoto): PhotoData => ({
    id: row.id,
    imageUrl: row.image_url,
    caption: row.caption || "",
    authorName: row.author_name || "",
    bio: row.bio || row.author_name || "", // Use bio, fallback to author_name
    socialHandle: row.social_handle || "",
    date: row.date || new Date().toLocaleDateString(),
    rotation: Number(row.rotation) || 0,
    zIndex: Number(row.z_index) || 1,
    x: Number(row.x) || 0,
    y: Number(row.y) || 0,
    timestamp: new Date(row.created_at).getTime()
  });

  const fetchCloud = async () => {
    try {
        const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

        if (!error && data) {
        const cloudPhotos = data.map(mapDBToPhotoData);
        update(cloudPhotos);
        }
    } catch (e) { }
  };

  fetchCloud();
  // Poll every 2 seconds for consistency
  const pollInterval = setInterval(fetchCloud, 2000);

  const channel = supabase
    .channel('public:photos')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'photos' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
            update([mapDBToPhotoData(payload.new as DBPhoto)]);
        } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            currentPhotos = currentPhotos.filter(p => p.id !== deletedId);
            onPhotosUpdated([...currentPhotos]);
            deleteLocalPhoto(deletedId);
        } else if (payload.eventType === 'UPDATE') {
            const updatedPhoto = mapDBToPhotoData(payload.new as DBPhoto);
            currentPhotos = currentPhotos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p);
            onPhotosUpdated([...currentPhotos]);
        }
      }
    )
    .subscribe((status) => {
       if (status === 'SUBSCRIBED') {
           // console.log("Realtime connected");
       }
    });

  const handleLocalUpdate = () => {
      const local = getLocalPhotos();
      update(local);
  };

  window.addEventListener('local-gallery-update', handleLocalUpdate);
  window.addEventListener('storage', handleLocalUpdate);

  return {
    unsubscribe: () => {
        clearInterval(pollInterval);
        supabase.removeChannel(channel);
        window.removeEventListener('local-gallery-update', handleLocalUpdate);
        window.removeEventListener('storage', handleLocalUpdate);
    },
    refresh: fetchCloud
  };
};

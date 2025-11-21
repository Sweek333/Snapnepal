
import React, { useState, useCallback, useEffect } from 'react';
import { RetroCamera } from './components/RetroCamera';
import { Polaroid } from './components/Polaroid';
import { PinboardGallery } from './components/PinboardGallery';
import { PhotoData } from './types';
import { generatePhotoCaption } from './services/geminiService';
import { 
  uploadAndSavePhoto, 
  useRealtimePhotos,
  deletePhoto
} from './services/supabase';

// Helper to generate random numbers within a range
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const App: React.FC = () => {
  const [galleryPhotos, setGalleryPhotos] = useState<PhotoData[]>([]); // The global gallery
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Initialize Realtime Subscription
  useEffect(() => {
    // This hook handles fetching initial data AND listening for new inserts/deletes
    const unsubscribe = useRealtimePhotos((updatedPhotos) => {
      setGalleryPhotos(updatedPhotos);
    });
    return () => unsubscribe();
  }, []);

  const handleTakePhoto = useCallback(async (imageData: string) => {
    setIsProcessing(true);

    try {
      const photoId = crypto.randomUUID();

      // 1. Generate caption using Gemini
      const aiData = await generatePhotoCaption(imageData);

      // 2. Prepare Metadata
      const newPhotoMeta = {
        id: photoId,
        caption: aiData.caption,
        date: aiData.date,
        rotation: randomRange(-12, 12),
        zIndex: 1, // DB default
        x: randomRange(-40, 40), 
        y: randomRange(-40, 40),
      };

      // 3. Optimistic Update: Show photo IMMEDIATELY locally
      // This ensures the user feels the app is instant, even if cloud sync is slow or fails
      const optimisticPhoto: PhotoData = {
        ...newPhotoMeta,
        imageUrl: imageData,
        timestamp: Date.now(),
        zIndex: 10
      };
      setGalleryPhotos(prev => [optimisticPhoto, ...prev]);

      // Show confirmation toast
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      // 4. Upload to Storage AND Insert Row to DB
      // This triggers the realtime event for everyone else. 
      // If it fails, we log it, but we've already shown the photo locally.
      try {
        await uploadAndSavePhoto(imageData, newPhotoMeta);
      } catch (cloudError) {
        console.warn("Cloud sync failed (using local only mode):", cloudError);
        // We intentionally do NOT remove the photo from the gallery.
        // It stays as a "local memory" for this session.
      }

    } catch (error) {
      console.error("Error processing photo:", error);
      // Only alert if something strictly local (like AI generation) failed before we could even show the photo
      alert("Something went wrong processing your photo.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDeletePhoto = async (id: string) => {
    // Optimistic delete locally
    setGalleryPhotos(prev => prev.filter(p => p.id !== id));
    // Perform actual delete (Realtime will propagate/confirm this)
    await deletePhoto(id);
  };
  
  const handleDownload = () => {
    // Logic to download latest session photo if needed
    if (galleryPhotos.length > 0) {
        const photo = galleryPhotos[0];
        const link = document.createElement('a');
        link.href = photo.imageUrl;
        link.download = `retro-${photo.id}.png`;
        link.click();
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#e5e5e5] bg-dot-pattern flex flex-col overflow-hidden">
      
      <PinboardGallery 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        photos={galleryPhotos}
        onDeletePhoto={handleDeletePhoto}
      />

      {/* Notification Toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#5D4037]/90 backdrop-blur text-white px-6 py-3 rounded-full z-[70] animate-in fade-in slide-in-from-top-4 font-hand text-lg sm:text-xl shadow-xl flex items-center gap-2 border-2 border-white/20">
          <span>✨</span> Saved to Public Gallery!
        </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 flex justify-between items-start z-[60] pointer-events-none">
        <div className="pointer-events-auto flex space-x-2">
           <div className="bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-gray-200 shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Live Gallery
              </span>
           </div>
        </div>
        
        <div className="pointer-events-auto flex flex-row gap-2 sm:gap-3">
          <button 
            onClick={handleDownload}
            className="bg-white border-2 border-black text-black px-4 sm:px-6 py-2 rounded-full font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm tracking-wider"
          >
            DOWNLOAD LAST
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center lg:justify-start lg:pl-32 pb-20">
        
        {/* Camera Container */}
        <div className="relative z-40 scale-[0.65] xs:scale-75 sm:scale-100 transition-transform">
           <RetroCamera onTakePhoto={handleTakePhoto} isProcessing={isProcessing} />
        </div>

        {/* Photo Gallery Area - Use the top few gallery photos for the scattered view */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="relative w-full h-full flex items-center justify-center lg:justify-end lg:pr-32">
              <div className="relative w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] pointer-events-auto">
                {/* Show top 3 most recent photos scattered around */}
                {galleryPhotos.slice(0, 3).map((photo, index) => (
                  <div 
                    key={photo.id} 
                    className="absolute top-1/2 left-1/2 transition-all duration-700 ease-out"
                    style={{ 
                        transform: `translate(-50%, -50%) translate(${index * 20}px, ${index * 20}px) rotate(${index * 5}deg)`,
                        zIndex: 10 - index
                    }}
                  >
                      <Polaroid photo={photo} />
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* CUTE PINBOARD BUTTON */}
      <button 
        onClick={() => setIsGalleryOpen(true)}
        className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 z-50 bg-[#8D6E63] hover:bg-[#795548] text-white border-[3px] sm:border-[4px] border-[#5D4037] px-4 sm:px-8 py-2 sm:py-3 rounded-full shadow-[0_4px_0_#5D4037] hover:shadow-[0_2px_0_#5D4037] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all flex items-center gap-2 sm:gap-4 group"
      >
         <div className="relative">
            <div className="transform -rotate-12 text-2xl sm:text-3xl drop-shadow-sm group-hover:scale-110 transition-transform text-red-500">📌</div>
         </div>
         <span className="font-hand text-lg sm:text-2xl font-bold tracking-wider pt-1 shadow-sm uppercase">View Public Pinboard Gallery</span>
         
         {galleryPhotos.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs sm:text-sm font-bold rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center border-2 border-[#5D4037] shadow-md animate-in zoom-in duration-300">
               {galleryPhotos.length}
            </span>
         )}
      </button>

    </div>
  );
};

export default App;

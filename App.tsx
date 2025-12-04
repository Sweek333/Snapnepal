
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RetroCamera } from './components/RetroCamera';
import { PinboardGallery } from './components/PinboardGallery';
import { PhotoData } from './types';
import { generatePhotoCaption } from './services/geminiService';
import { 
  uploadAndSavePhoto, 
  useRealtimePhotos,
  updatePhoto
} from './services/supabase';

// Helper to generate random numbers within a range
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const App: React.FC = () => {
  const [galleryPhotos, setGalleryPhotos] = useState<PhotoData[]>([]); // The global gallery
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ text: "Saved to Public Gallery!", type: "success" });
  
  // Ref to hold the refresh function from the service
  const refreshGalleryRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Initialize Realtime Subscription
  useEffect(() => {
    // This hook handles fetching initial data AND listening for new inserts/deletes
    const { unsubscribe, refresh } = useRealtimePhotos((updatedPhotos) => {
      setGalleryPhotos(updatedPhotos);
    });
    
    refreshGalleryRef.current = refresh;
    
    return () => unsubscribe();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
      setToastMessage({ text, type });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
  };

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
      showNotification("✨ Saved to Public Gallery!", "success");

      // 4. Upload to Storage AND Insert Row to DB
      // This triggers the realtime event for everyone else. 
      // If it fails, we log it, but we've already shown the photo locally.
      try {
        await uploadAndSavePhoto(imageData, newPhotoMeta);
      } catch (saveError) {
        console.error("Background save failed:", saveError);
        // We don't show an error to the user because local mode works fine
      }

    } catch (error) {
      console.error("Photo processing error:", error);
      showNotification("Something went wrong. Try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleUpdatePhoto = async (id: string, data: Partial<PhotoData>) => {
      // Optimistic update
      setGalleryPhotos(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      await updatePhoto(id, data);
  };

  return (
    <div className="relative w-full h-screen bg-[#e5e5e5] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Dot Pattern */}
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none"></div>
      
      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-4 pb-20 sm:pb-4">
        
        {/* Header / Title */}
        <div className="absolute top-4 sm:top-10 left-0 w-full flex justify-between px-6 z-20">
             <div className="flex items-center gap-2">
                 <span className="text-2xl">📸</span>
                 <h1 className="font-hand text-2xl font-bold text-gray-700 tracking-widest hidden sm:block">RetroSnap AI</h1>
             </div>
        </div>

        {/* The Retro Camera */}
        <div className="mt-8 sm:mt-0 transform scale-90 sm:scale-100 transition-transform duration-300">
           <RetroCamera onTakePhoto={handleTakePhoto} isProcessing={isProcessing} />
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 right-6 text-right hidden sm:block">
           <p className="font-hand text-gray-400 text-xs uppercase tracking-widest">
              Use Once to capture your day <br/> through everyone's eyes →
           </p>
        </div>

      </div>

      {/* View Gallery Button */}
      <button 
        onClick={() => setIsGalleryOpen(true)}
        className="absolute bottom-12 sm:bottom-10 left-6 z-50 group transition-transform hover:scale-105 active:scale-95"
      >
         <div className="relative bg-[#8d6e63] hover:bg-[#795548] text-[#efebe9] px-5 py-3 rounded-full shadow-[4px_4px_0px_rgba(62,39,35,1)] border-2 border-[#5d4037] flex items-center gap-3 transition-colors">
            <div className="text-xl transform -rotate-12 group-hover:rotate-0 transition-transform text-red-400 drop-shadow-sm">📌</div>
            <span className="font-hand font-bold text-lg tracking-wide">View Public Pinboard Gallery</span>
            
            {/* Live Count Badge */}
            {galleryPhotos.length > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#e5e5e5] shadow-sm animate-in zoom-in">
                    {galleryPhotos.length}
                </div>
            )}
         </div>
      </button>

      {/* Gallery Modal */}
      <PinboardGallery 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)}
        photos={galleryPhotos}
        onRefresh={refreshGalleryRef.current}
        onUpdatePhoto={handleUpdatePhoto}
      />

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-xl animate-in slide-in-from-top-4 duration-300 flex items-center gap-3 border-2
            ${toastMessage.type === 'error' ? 'bg-red-100 border-red-200 text-red-800' : 'bg-white border-[#8d6e63] text-[#5d4037]'}
        `}>
           <span className="text-xl">{toastMessage.type === 'error' ? '⚠️' : '✅'}</span>
           <span className="font-hand font-bold text-lg">{toastMessage.text}</span>
        </div>
      )}

    </div>
  );
};

export default App;

import React, { useState, useCallback, useEffect } from 'react';
import { RetroCamera } from './components/RetroCamera';
import { Polaroid } from './components/Polaroid';
import { PinboardGallery } from './components/PinboardGallery';
import { FilmStrip } from './components/FilmStrip';
import { PhotoData } from './types';
import { generatePhotoCaption } from './services/geminiService';
import { 
  uploadPhotoToSupabase, 
  savePhotoToDB, 
  subscribeToPhotos, 
  deletePhotoFromSupabase 
} from './services/supabase';

// Helper to generate random numbers within a range
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const App: React.FC = () => {
  const [sessionPhotos, setSessionPhotos] = useState<PhotoData[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<PhotoData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(true); 

  // Initialize Realtime Subscription
  useEffect(() => {
    // This now handles merging Local + Cloud data to ensure persistence
    const unsubscribe = subscribeToPhotos((updatedPhotos) => {
      setGalleryPhotos(updatedPhotos);
    });
    return () => unsubscribe();
  }, []);

  const handleTakePhoto = useCallback(async (imageData: string) => {
    setIsProcessing(true);

    try {
      const timestamp = Date.now();
      const photoId = crypto.randomUUID();

      // 1. Generate caption using Gemini
      const aiData = await generatePhotoCaption(imageData);

      // 2. Upload image to Supabase Storage (or base64 fallback)
      const publicUrl = await uploadPhotoToSupabase(imageData, photoId);
      
      if (!publicUrl) throw new Error("Failed to process image data");

      const newPhoto: PhotoData = {
        id: photoId,
        imageUrl: publicUrl,
        caption: aiData.caption,
        date: aiData.date,
        rotation: randomRange(-12, 12),
        zIndex: sessionPhotos.length + 1,
        x: randomRange(-40, 40), 
        y: randomRange(-40, 40),
        timestamp: timestamp,
      };

      // 3. Add to current session view (instant feedback)
      setSessionPhotos((prev) => [...prev, newPhoto]);

      // 4. Save to DB (and Local Storage automatically via the service)
      const savedToCloud = await savePhotoToDB(newPhoto);

      if (!savedToCloud) {
          setIsCloudConnected(false);
      } else {
          setIsCloudConnected(true);
      }
      
      // Note: subscribeToPhotos will automatically trigger and update galleryPhotos

    } catch (error) {
      console.error("Error processing photo:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionPhotos.length]);

  const handleDownload = () => {
    if (sessionPhotos.length > 0) {
       const photo = sessionPhotos[sessionPhotos.length - 1];
       const link = document.createElement('a');
       link.download = `retro-snap-${photo.id}.png`;
       link.href = photo.imageUrl;
       link.target = "_blank";
       link.click();
    }
  };

  const handleReset = () => {
    if (window.confirm("Clear your current session view? (Gallery photos remain in the cloud)")) {
      setSessionPhotos([]);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    // Optimistic update
    setGalleryPhotos((prev) => prev.filter((p) => p.id !== id));
    setSessionPhotos((prev) => prev.filter((p) => p.id !== id));
    
    // Perform actual delete
    await deletePhotoFromSupabase(id);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#e5e5e5] bg-dot-pattern flex flex-col overflow-hidden">
      
      <PinboardGallery 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        photos={galleryPhotos}
        onDeletePhoto={handleDeletePhoto}
      />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 flex justify-between items-start z-[60] pointer-events-none">
        <div className="pointer-events-auto flex space-x-2">
           {/* Cloud Status Indicator */}
           <div className="bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-gray-200 shadow-sm flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {isCloudConnected ? 'Supabase Live' : 'Local Mode'}
              </span>
           </div>
        </div>
        
        <div className="pointer-events-auto flex flex-row gap-2 sm:gap-3">
          <button 
            onClick={handleDownload}
            disabled={sessionPhotos.length === 0}
            className="bg-white border-2 border-black text-black px-4 sm:px-6 py-2 rounded-full font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm tracking-wider"
          >
            DOWNLOAD
          </button>
          <button 
            onClick={handleReset}
            className="bg-white border-2 border-[#FF6B6B] text-[#FF6B6B] px-4 sm:px-6 py-2 rounded-full font-bold shadow-[3px_3px_0px_0px_#FF6B6B] sm:shadow-[4px_4px_0px_0px_#FF6B6B] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#FF6B6B] transition-all active:translate-y-[4px] active:shadow-none text-xs sm:text-sm tracking-wider"
          >
            RESET
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center lg:justify-start lg:pl-32 pb-48">
        
        {/* Camera Container */}
        <div className="relative z-40 scale-[0.65] xs:scale-75 sm:scale-100 transition-transform">
           <RetroCamera onTakePhoto={handleTakePhoto} isProcessing={isProcessing} />
        </div>

        {/* Photo Gallery Area - Scattered on the right (Session Only) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="relative w-full h-full flex items-center justify-center lg:justify-end lg:pr-32">
              <div className="relative w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] pointer-events-auto">
                {sessionPhotos.length === 0 && !isProcessing && (
                   <div className="absolute inset-0 flex items-center justify-center opacity-30 -rotate-6">
                      <p className="font-hand text-2xl sm:text-4xl text-gray-500 text-center px-4">Ready to snap?</p>
                   </div>
                )}
                {sessionPhotos.map((photo) => (
                  <div key={photo.id} className="absolute top-1/2 left-1/2 transition-all duration-700 ease-out">
                      <Polaroid photo={photo} />
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* Live Film Strip at Bottom (Always visible gallery) */}
      <FilmStrip 
        photos={galleryPhotos} 
        onPhotoClick={() => setIsGalleryOpen(true)}
      />

      {/* View Gallery Button (Mobile friendly alternative) */}
      <div className="absolute bottom-56 left-4 z-40 block sm:hidden">
        <button 
          onClick={() => setIsGalleryOpen(true)}
          className="bg-[#8D6E63] text-white border-2 border-[#5D4037] px-4 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform text-xs flex items-center gap-2"
        >
          <span>📌</span> View Gallery
        </button>
      </div>

    </div>
  );
};

export default App;
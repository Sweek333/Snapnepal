import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RetroCamera } from './components/RetroCamera';
import { Polaroid } from './components/Polaroid';
import { PinboardGallery } from './components/PinboardGallery';
import { PhotoData } from './types';
import { generatePhotoCaption } from './services/geminiService';

// Helper to generate random numbers within a range
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const App: React.FC = () => {
  const [sessionPhotos, setSessionPhotos] = useState<PhotoData[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<PhotoData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  // Channel for live updates across tabs
  const syncChannel = useRef<BroadcastChannel | null>(null);

  // Load photos and setup sync listeners
  useEffect(() => {
    // Initialize BroadcastChannel
    syncChannel.current = new BroadcastChannel('retro_snap_sync');

    const loadAndCleanGallery = () => {
      const savedPhotos = localStorage.getItem('retro-snap-gallery');
      if (savedPhotos) {
        try {
          const parsed: PhotoData[] = JSON.parse(savedPhotos);
          const now = Date.now();
          const twentyFourHoursMs = 24 * 60 * 60 * 1000;

          const validPhotos = parsed.filter(p => {
              // If legacy photo (no timestamp), keep it
              if (!p.timestamp) return true;
              // Check if photo is older than 24 hours
              return (now - p.timestamp) < twentyFourHoursMs;
          });

          // Update storage if we cleaned up
          if (validPhotos.length !== parsed.length) {
              localStorage.setItem('retro-snap-gallery', JSON.stringify(validPhotos));
          }
          
          setGalleryPhotos(validPhotos);
        } catch (e) {
          console.error("Failed to load gallery photos", e);
        }
      }
    };

    // Initial load
    loadAndCleanGallery();

    // Listen for updates from other tabs (BroadcastChannel)
    syncChannel.current.onmessage = () => {
        loadAndCleanGallery();
    };

    // Listen for storage events (fallback for some browsers)
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'retro-snap-gallery') {
            loadAndCleanGallery();
        }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      syncChannel.current?.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleTakePhoto = useCallback(async (imageData: string) => {
    setIsProcessing(true);

    try {
      // Generate caption using Gemini
      const aiData = await generatePhotoCaption(imageData);

      const newPhoto: PhotoData = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        imageUrl: imageData,
        caption: aiData.caption,
        date: aiData.date,
        rotation: randomRange(-12, 12),
        zIndex: sessionPhotos.length + 1,
        // Tighter spread to ensure visibility on all screens
        x: randomRange(-40, 40), 
        y: randomRange(-40, 40),
        timestamp: Date.now(), // Add timestamp for expiration
      };

      // Add to current session (scattered view)
      setSessionPhotos((prev) => [...prev, newPhoto]);

      // Add to persistent gallery (Read-Modify-Write for safety)
      const existingJson = localStorage.getItem('retro-snap-gallery');
      const currentGallery: PhotoData[] = existingJson ? JSON.parse(existingJson) : [];
      const updatedGallery = [...currentGallery, newPhoto];
      
      localStorage.setItem('retro-snap-gallery', JSON.stringify(updatedGallery));
      setGalleryPhotos(updatedGallery);

      // Broadcast update to other tabs
      syncChannel.current?.postMessage('update');

    } catch (error) {
      console.error("Error processing photo:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionPhotos.length]);

  const handleDownload = () => {
    if (sessionPhotos.length > 0) {
       const link = document.createElement('a');
       link.download = `retro-snap-${sessionPhotos[sessionPhotos.length -1].id}.png`;
       link.href = sessionPhotos[sessionPhotos.length - 1].imageUrl;
       link.click();
    }
  };

  const handleReset = () => {
    if (window.confirm("Clear all your session memories? (Gallery will stay safe)")) {
      setSessionPhotos([]);
    }
  };

  const handleDeletePhoto = (id: string) => {
    // Read fresh from LS to avoid race conditions with other tabs
    const existingJson = localStorage.getItem('retro-snap-gallery');
    if (existingJson) {
        const currentGallery: PhotoData[] = JSON.parse(existingJson);
        const updatedGallery = currentGallery.filter((p) => p.id !== id);
        
        localStorage.setItem('retro-snap-gallery', JSON.stringify(updatedGallery));
        setGalleryPhotos(updatedGallery);
        
        // Notify other tabs
        syncChannel.current?.postMessage('update');
    }
    
    // Also remove from session if present
    setSessionPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="relative min-h-screen w-full bg-[#e5e5e5] bg-dot-pattern flex flex-col overflow-hidden">
      
      <PinboardGallery 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        photos={galleryPhotos}
        onDeletePhoto={handleDeletePhoto}
      />

      {/* Top Bar - Increased Z-Index */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 flex justify-between items-start z-[60] pointer-events-none">
        <div className="pointer-events-auto flex space-x-2">
           {/* Left side branding or tools could go here */}
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
      <div className="flex-1 relative flex items-center justify-center lg:justify-start lg:pl-32">
        
        {/* Camera Container */}
        <div className="relative z-40 scale-[0.65] xs:scale-75 sm:scale-100 transition-transform">
           <RetroCamera onTakePhoto={handleTakePhoto} isProcessing={isProcessing} />
        </div>

        {/* Photo Gallery Area - Scattered on the right */}
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

      {/* Bottom Left Action */}
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 flex items-end gap-2">
        <button 
          onClick={() => setIsGalleryOpen(true)}
          className="bg-[#8D6E63] text-white border-2 border-[#5D4037] px-3 py-2 sm:px-5 sm:py-3 rounded-xl font-bold shadow-[3px_3px_0px_0px_#3E2723] sm:shadow-[4px_4px_0px_0px_#3E2723] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#3E2723] transition-all flex items-center gap-2 text-xs sm:text-sm group"
        >
          <span className="text-lg group-hover:rotate-12 transition-transform">📌</span> 
          <span className="hidden xs:inline">View Public Pinboard Gallery</span>
          <span className="xs:hidden">Gallery</span>
          <span className="bg-[#5D4037] px-2 py-0.5 rounded-full text-[10px] ml-1">{galleryPhotos.length}</span>
        </button>
      </div>

      {/* Footer/Hint */}
      <div className="absolute bottom-6 right-6 z-40 text-right opacity-60 pointer-events-none hidden md:block">
        <p className="font-hand text-sm font-bold text-gray-600 uppercase tracking-wide">Use once to capture your day</p>
        <p className="font-hand text-xs text-gray-500">through everyone's eyes →</p>
      </div>

    </div>
  );
};

export default App;
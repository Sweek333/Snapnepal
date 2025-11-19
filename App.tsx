import React, { useState, useCallback } from 'react';
import { RetroCamera } from './components/RetroCamera';
import { Polaroid } from './components/Polaroid';
import { PhotoData } from './types';
import { generatePhotoCaption } from './services/geminiService';

// Helper to generate random numbers within a range
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

const App: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
        zIndex: photos.length + 1,
        // Tighter spread to ensure visibility on all screens
        x: randomRange(-40, 40), 
        y: randomRange(-40, 40), 
      };

      setPhotos((prev) => [...prev, newPhoto]);
    } catch (error) {
      console.error("Error processing photo:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [photos.length]);

  const handleDownload = () => {
    if (photos.length > 0) {
       const link = document.createElement('a');
       link.download = `retro-snap-${photos[photos.length -1].id}.png`;
       link.href = photos[photos.length - 1].imageUrl;
       link.click();
    }
  };

  const handleReset = () => {
    if (window.confirm("Clear all your memories?")) {
      setPhotos([]);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#e5e5e5] bg-dot-pattern flex flex-col overflow-hidden">
      
      {/* Top Bar - Increased Z-Index */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-[60] pointer-events-none">
        <div className="pointer-events-auto flex space-x-2">
           {/* Left side branding or tools could go here */}
        </div>
        
        <div className="pointer-events-auto flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleDownload}
            disabled={photos.length === 0}
            className="bg-white border-2 border-black text-black px-6 py-2 rounded-full font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wider"
          >
            DOWNLOAD
          </button>
          <button 
            onClick={handleReset}
            className="bg-white border-2 border-[#FF6B6B] text-[#FF6B6B] px-6 py-2 rounded-full font-bold shadow-[4px_4px_0px_0px_#FF6B6B] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#FF6B6B] transition-all active:translate-y-[4px] active:shadow-none text-sm tracking-wider"
          >
            RESET
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center lg:justify-start lg:pl-32">
        
        {/* Camera Container */}
        <div className="relative z-40 scale-75 sm:scale-100 transition-transform">
           <RetroCamera onTakePhoto={handleTakePhoto} isProcessing={isProcessing} />
        </div>

        {/* Photo Gallery Area - Scattered on the right */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="relative w-full h-full flex items-center justify-center lg:justify-end lg:pr-32">
              <div className="relative w-[500px] h-[500px] pointer-events-auto">
                {photos.length === 0 && !isProcessing && (
                   <div className="absolute inset-0 flex items-center justify-center opacity-30 -rotate-6">
                      <p className="font-hand text-4xl text-gray-500">Ready to snap?</p>
                   </div>
                )}
                {photos.map((photo) => (
                  <div key={photo.id} className="absolute top-1/2 left-1/2 transition-all duration-700 ease-out">
                      <Polaroid photo={photo} />
                  </div>
                ))}
              </div>
           </div>
        </div>

      </div>

      {/* Bottom Left Action */}
      <div className="absolute bottom-6 left-6 z-50">
        <button className="bg-[#8D6E63] text-white border-2 border-[#5D4037] px-5 py-3 rounded-xl font-bold shadow-[4px_4px_0px_0px_#3E2723] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#3E2723] transition-all flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-lg">📌</span> View Public Pinboard Gallery
        </button>
      </div>

      {/* Footer/Hint */}
      <div className="absolute bottom-6 right-6 z-40 text-right opacity-60 pointer-events-none hidden sm:block">
        <p className="font-hand text-sm font-bold text-gray-600 uppercase tracking-wide">Use once to capture your day</p>
        <p className="font-hand text-xs text-gray-500">through everyone's eyes →</p>
      </div>

    </div>
  );
};

export default App;
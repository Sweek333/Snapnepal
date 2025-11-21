
import React, { useState, useRef, useEffect } from 'react';
import { PhotoData } from '../types';
import { Polaroid } from './Polaroid';

interface PinboardGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoData[];
  onDeletePhoto: (id: string) => void;
  onRefresh?: () => Promise<void>;
  onClear?: () => void;
}

export const PinboardGallery: React.FC<PinboardGalleryProps> = ({ isOpen, onClose, photos, onDeletePhoto, onRefresh, onClear }) => {
  // Pull to refresh state
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Custom Confirmation State
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const startY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Reset scroll position when opening
  useEffect(() => {
    if (isOpen) {
        setPullY(0);
        setIsRefreshing(false);
        setShowClearConfirm(false);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only enable pull if we are at the top of the scroll container
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
    } else {
        startY.current = -1; // Disable
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === -1 || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    // Only detect pull down
    if (diff > 0 && scrollContainerRef.current?.scrollTop === 0) {
       // Add resistance (logarithmic scaling)
       const damped = Math.min(diff * 0.5, 120); 
       setPullY(damped);
       // Prevent default chrome scroll bounce behavior if we are pulling for action
       if (diff > 10 && e.cancelable) {
          // Optional: e.preventDefault(); 
          // Avoiding preventDefault here to let browser handle scrolling naturally unless deep into pull
       }
    }
  };

  const handleTouchEnd = async () => {
    if (startY.current === -1 || isRefreshing) return;

    if (pullY > 60 && onRefresh) {
        // Trigger Refresh
        setIsRefreshing(true);
        setPullY(60); // Snap to loading position
        await onRefresh();
        setIsRefreshing(false);
        setPullY(0);
    } else {
        // Snap back
        setPullY(0);
    }
    startY.current = -1;
  };

  const handleManualRefresh = async () => {
     if (isRefreshing || !onRefresh) return;
     setIsRefreshing(true);
     await onRefresh();
     setIsRefreshing(false);
  };

  const handleClearClick = () => {
     setShowClearConfirm(true);
  };

  const confirmClear = () => {
      if (onClear) {
          onClear();
      }
      setShowClearConfirm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Corkboard Container */}
      <div className="relative w-full h-full sm:max-w-7xl bg-[#d7ccc8] sm:rounded-xl shadow-2xl overflow-hidden flex flex-col border-x-0 border-y-0 sm:border-[12px] border-[#8d6e63]">
        
        {/* Cork texture overlay */}
        <div className="absolute inset-0 opacity-60 bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')] pointer-events-none"></div>
        
        {/* Header */}
        <div className="relative z-10 bg-[#795548] p-3 sm:p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] flex justify-between items-center border-b-4 border-[#5d4037]">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl">📌</span>
            <h2 className="font-hand text-xl sm:text-3xl text-white font-bold tracking-widest drop-shadow-md">Our Pinboard</h2>
          </div>
          <div className="flex items-center gap-2">
             
             {/* Clear / Reset Gallery */}
             {onClear && (
                 <button
                    onClick={handleClearClick}
                    className="bg-red-500/20 hover:bg-red-500/40 text-white border-2 border-red-300/30 p-1.5 rounded-full font-bold text-xs sm:text-sm transition-colors mr-2"
                    title="Reset Gallery"
                 >
                    <span className="block text-lg leading-none">🗑️</span>
                 </button>
             )}

             {/* Refresh Button (Desktop/Accessibility) */}
             {onRefresh && (
                 <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 p-1.5 rounded-full font-bold text-xs sm:text-sm transition-colors mr-2"
                    title="Refresh Gallery"
                 >
                    <span className={`block text-lg leading-none ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
                 </button>
             )}

             <div className="text-white/60 text-[10px] sm:text-xs font-hand mr-2 hidden sm:block">
                Memories are forever ✨
             </div>
             <button 
                onClick={onClose} 
                className="bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 px-3 py-1 sm:px-4 rounded-full font-bold text-xs sm:text-sm transition-colors"
             >
                CLOSE ✕
             </button>
          </div>
        </div>

        {/* Scrollable Area with Pull to Refresh */}
        <div 
            ref={scrollContainerRef}
            className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
           {/* Pull Indicator */}
           <div 
              className="w-full flex items-center justify-center overflow-hidden transition-all duration-300 ease-out absolute top-0 left-0 z-0 pointer-events-none"
              style={{ height: `${pullY}px`, opacity: pullY > 0 ? 1 : 0 }}
           >
              <div className="flex flex-col items-center text-[#5d4037] transform translate-y-2">
                  <div className={`text-2xl transition-transform duration-300 ${pullY > 60 ? 'rotate-180' : ''}`}>
                     {isRefreshing ? '📷' : '⬇️'}
                  </div>
                  <span className="font-hand text-sm font-bold">
                     {isRefreshing ? 'Developing...' : pullY > 60 ? 'Release to Refresh' : 'Pull to Refresh'}
                  </span>
              </div>
           </div>

           {/* Content */}
           <div 
              className="p-4 xs:p-6 sm:p-12 flex flex-wrap justify-center items-start gap-x-2 gap-y-4 sm:gap-4 min-h-full pb-24 transition-transform duration-300 ease-out"
              style={{ transform: `translateY(${pullY}px)` }}
           >
              {photos.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 opacity-50 mt-20 text-center px-4">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-black/10 mb-4 flex items-center justify-center">
                        <span className="text-2xl sm:text-4xl">📷</span>
                    </div>
                    <p className="font-hand text-xl sm:text-3xl text-[#5d4037]">Gallery is empty...</p>
                    <p className="font-hand text-lg sm:text-xl text-[#5d4037] mt-2">Snap a photo to leave your mark!</p>
                 </div>
              ) : (
                photos.slice().reverse().map((photo) => (
                   <div key={photo.id} className="relative pt-3 sm:pt-4 px-1 hover:z-50 transition-all duration-200 group/pin">
                      {/* Pin graphic - Scaled for mobile. Low z-index to not block touches if overlap occurs */}
                      <div className="absolute top-1.5 sm:top-2 left-1/2 transform -translate-x-1/2 z-20 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 shadow-[2px_2px_4px_rgba(0,0,0,0.4)] border border-red-700 flex items-center justify-center pointer-events-none">
                         <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-red-300 rounded-full opacity-50"></div>
                      </div>
                      <div className="absolute top-2.5 sm:top-3 left-1/2 transform -translate-x-1/2 z-10 w-0.5 sm:w-1 h-2 sm:h-3 bg-black/30 blur-[1px] translate-y-1 pointer-events-none"></div>
                      
                      <div className="hover:z-50 relative">
                          <Polaroid 
                            photo={photo} 
                            variant="grid" 
                            onDelete={() => onDeletePhoto(photo.id)}
                          />
                      </div>
                   </div>
                ))
              )}
           </div>
        </div>

        {/* Custom Confirmation Modal */}
        {showClearConfirm && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full text-center border-4 border-[#5d4037]">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h3 className="font-hand text-2xl font-bold text-[#5d4037] mb-2">Clear Gallery?</h3>
                    <p className="text-gray-600 mb-6 font-hand text-lg leading-tight">
                        This will permanently delete ALL photos for everyone. This action cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => setShowClearConfirm(false)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-full font-bold text-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmClear}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-full font-bold text-white shadow-md transition-colors"
                        >
                            Yes, Delete All
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};


import React, { useState, useRef, useEffect } from 'react';
import { PhotoData } from '../types';
import { Polaroid } from './Polaroid';

interface PinboardGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoData[];
  onRefresh?: () => Promise<void>;
  onUpdatePhoto?: (id: string, data: Partial<PhotoData>) => void;
  onDelete?: (id: string) => Promise<void>;
  onClear?: () => Promise<void>;
}

type ConfirmType = 'DELETE_PHOTO' | 'CLEAR_GALLERY' | null;

export const PinboardGallery: React.FC<PinboardGalleryProps> = ({ isOpen, onClose, photos, onRefresh, onUpdatePhoto, onDelete, onClear }) => {
  // Pull to refresh state
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Custom Confirmation Modal State
  const [confirmType, setConfirmType] = useState<ConfirmType>(null);
  const [targetPhotoId, setTargetPhotoId] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  const startY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Reset scroll position when opening
  useEffect(() => {
    if (isOpen) {
        setPullY(0);
        setIsRefreshing(false);
        setConfirmType(null);
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

  // --- DELETE HANDLERS ---

  const requestDeletePhoto = (id: string) => {
      setTargetPhotoId(id);
      setConfirmType('DELETE_PHOTO');
  };

  const requestClearGallery = () => {
      setConfirmType('CLEAR_GALLERY');
  };

  const handleConfirmAction = async () => {
      if (!confirmType) return;
      setIsProcessingAction(true);
      
      try {
          if (confirmType === 'DELETE_PHOTO' && targetPhotoId && onDelete) {
              await onDelete(targetPhotoId);
          } else if (confirmType === 'CLEAR_GALLERY' && onClear) {
              await onClear();
          }
      } catch (error) {
          console.error("Action failed", error);
          alert("Action failed. Please check your connection.");
      } finally {
          setIsProcessingAction(false);
          setConfirmType(null);
          setTargetPhotoId(null);
      }
  };

  const handleCancelAction = () => {
      setConfirmType(null);
      setTargetPhotoId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 lg:p-12 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Corkboard Container */}
      <div className="relative w-full h-full bg-[#d7ccc8] sm:rounded-xl shadow-2xl overflow-hidden flex flex-col border-x-0 border-y-0 sm:border-[8px] lg:border-[12px] border-[#8d6e63]">
        
        {/* Cork texture overlay */}
        <div className="absolute inset-0 opacity-60 bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')] pointer-events-none"></div>
        
        {/* Header */}
        <div className="relative z-10 bg-[#795548] p-3 sm:p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] flex justify-between items-center border-b-4 border-[#5d4037]">
          <div className="flex items-center gap-2 select-none">
            <span className="text-xl sm:text-2xl">📌</span>
            <h2 className="font-hand text-lg sm:text-2xl text-white font-bold tracking-widest drop-shadow-md">Public Pinboard</h2>
          </div>
          <div className="flex items-center gap-2">
             
             {/* Reset/Clear Button - Everyone */}
             {onClear && (
                 <button
                    onClick={requestClearGallery}
                    className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border-2 border-red-300/50 w-8 h-8 rounded-full flex items-center justify-center transition-colors mr-1 cursor-pointer"
                    title="Reset Gallery"
                 >
                    <span className="text-sm">🗑️</span>
                 </button>
             )}

             {/* Refresh Button */}
             {onRefresh && (
                 <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors mr-1 cursor-pointer"
                    title="Refresh Gallery"
                 >
                    <span className={`block text-lg leading-none ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
                 </button>
             )}

             <button 
                onClick={onClose} 
                className="bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 px-3 py-1 sm:px-4 rounded-full font-bold text-xs sm:text-sm transition-colors cursor-pointer"
             >
                CLOSE
             </button>
          </div>
        </div>

        {/* Scrollable Area with Pull to Refresh */}
        <div 
            ref={scrollContainerRef}
            className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-y-contain"
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

           {/* Content - CSS Grid for Responsive Layout */}
           <div 
              className="p-4 sm:p-8 min-h-full pb-32 transition-transform duration-300 ease-out"
              style={{ transform: `translateY(${pullY}px)` }}
           >
              {photos.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 opacity-50 mt-10 text-center px-4">
                    <div className="w-20 h-20 rounded-full bg-black/10 mb-4 flex items-center justify-center">
                        <span className="text-4xl">📷</span>
                    </div>
                    <p className="font-hand text-xl sm:text-3xl text-[#5d4037]">Gallery is empty...</p>
                    <p className="font-hand text-lg text-[#5d4037] mt-2">Snap a photo to leave your mark!</p>
                 </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-8">
                    {photos.slice().reverse().map((photo) => (
                    <div key={photo.id} className="relative pt-3 hover:z-50 transition-all duration-200 group/pin flex justify-center">
                        {/* Pin graphic - Scaled for mobile */}
                        <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 z-20 w-3 h-3 rounded-full bg-red-500 shadow-[2px_2px_4px_rgba(0,0,0,0.4)] border border-red-700 flex items-center justify-center pointer-events-none">
                            <div className="w-1 h-1 bg-red-300 rounded-full opacity-50"></div>
                        </div>
                        <div className="absolute top-2.5 left-1/2 transform -translate-x-1/2 z-10 w-0.5 h-2 bg-black/30 blur-[1px] translate-y-1 pointer-events-none"></div>
                        
                        <div className="hover:z-50 relative w-full">
                            <Polaroid 
                                photo={photo} 
                                variant="grid" 
                                onUpdate={onUpdatePhoto}
                                onDelete={onDelete ? () => requestDeletePhoto(photo.id) : undefined}
                            />
                        </div>
                    </div>
                    ))}
                </div>
              )}
           </div>
        </div>

        {/* Custom Confirmation Modal */}
        {confirmType && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-[#fdfdfd] p-6 rounded-lg shadow-2xl max-w-sm w-full border-4 border-[#795548] transform scale-100 animate-in zoom-in-95 duration-200">
                    <h3 className="font-hand text-2xl font-bold text-[#5d4037] mb-2 text-center">
                        {confirmType === 'CLEAR_GALLERY' ? 'Reset Gallery?' : 'Delete Photo?'}
                    </h3>
                    <p className="font-hand text-lg text-gray-600 text-center mb-6 leading-tight">
                        {confirmType === 'CLEAR_GALLERY' 
                            ? 'Warning: This will permanently delete ALL photos for everyone. This cannot be undone!' 
                            : 'Are you sure you want to remove this memory forever?'}
                    </p>
                    
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={handleCancelAction}
                            disabled={isProcessingAction}
                            className="flex-1 py-2 border-2 border-[#a1887f] text-[#5d4037] font-bold rounded-full hover:bg-[#efebe9] transition-colors disabled:opacity-50 font-hand text-lg"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirmAction}
                            disabled={isProcessingAction}
                            className="flex-1 py-2 bg-red-500 text-white font-bold rounded-full shadow-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:bg-red-400 flex items-center justify-center gap-2 font-hand text-lg"
                        >
                            {isProcessingAction ? (
                                <span className="block w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <span>{confirmType === 'CLEAR_GALLERY' ? 'Reset All' : 'Delete'}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

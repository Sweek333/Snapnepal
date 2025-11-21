import React from 'react';
import { PhotoData } from '../types';
import { Polaroid } from './Polaroid';

interface PinboardGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoData[];
  onDeletePhoto: (id: string) => void;
}

export const PinboardGallery: React.FC<PinboardGalleryProps> = ({ isOpen, onClose, photos, onDeletePhoto }) => {
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
            <h2 className="font-hand text-xl sm:text-3xl text-white font-bold tracking-widest drop-shadow-md">Public Pinboard</h2>
          </div>
          <div className="flex items-center gap-2">
             <div className="text-white/60 text-[10px] sm:text-xs font-hand mr-2 hidden sm:block">
                Memories fade after 24h
             </div>
             <button 
                onClick={onClose} 
                className="bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 px-3 py-1 sm:px-4 rounded-full font-bold text-xs sm:text-sm transition-colors"
             >
                CLOSE ✕
             </button>
          </div>
        </div>

        {/* Scrollable Area */}
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
           <div className="p-4 xs:p-6 sm:p-12 flex flex-wrap justify-center items-start gap-x-2 gap-y-4 sm:gap-4 min-h-full pb-24">
              {photos.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 opacity-50 mt-20 text-center px-4">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-black/10 mb-4 flex items-center justify-center">
                        <span className="text-2xl sm:text-4xl">📷</span>
                    </div>
                    <p className="font-hand text-xl sm:text-3xl text-[#5d4037]">Gallery is empty...</p>
                    <p className="font-hand text-lg sm:text-xl text-[#5d4037] mt-2">Snap a photo to share it with everyone!</p>
                 </div>
              ) : (
                photos.slice().reverse().map((photo) => (
                   <div key={photo.id} className="relative pt-3 sm:pt-4 px-1">
                      {/* Pin graphic - Scaled for mobile. Low z-index to not block touches if overlap occurs */}
                      <div className="absolute top-1.5 sm:top-2 left-1/2 transform -translate-x-1/2 z-20 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 shadow-[2px_2px_4px_rgba(0,0,0,0.4)] border border-red-700 flex items-center justify-center pointer-events-none">
                         <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-red-300 rounded-full opacity-50"></div>
                      </div>
                      <div className="absolute top-2.5 sm:top-3 left-1/2 transform -translate-x-1/2 z-10 w-0.5 sm:w-1 h-2 sm:h-3 bg-black/30 blur-[1px] translate-y-1 pointer-events-none"></div>
                      
                      <Polaroid 
                        photo={photo} 
                        variant="grid" 
                        onDelete={() => onDeletePhoto(photo.id)}
                      />
                   </div>
                ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { PhotoData } from '../types';
import { Polaroid } from './Polaroid';

interface PinboardGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoData[];
}

export const PinboardGallery: React.FC<PinboardGalleryProps> = ({ isOpen, onClose, photos }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Corkboard Container */}
      <div className="relative w-full h-full max-w-7xl bg-[#d7ccc8] rounded-xl shadow-2xl overflow-hidden flex flex-col border-[12px] border-[#8d6e63]">
        
        {/* Cork texture overlay */}
        <div className="absolute inset-0 opacity-60 bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')] pointer-events-none"></div>
        
        {/* Header */}
        <div className="relative z-10 bg-[#795548] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] flex justify-between items-center border-b-4 border-[#5d4037]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📌</span>
            <h2 className="font-hand text-2xl sm:text-3xl text-white font-bold tracking-widest drop-shadow-md">Public Pinboard Gallery</h2>
          </div>
          <button 
            onClick={onClose} 
            className="bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 px-4 py-1 rounded-full font-bold text-sm transition-colors"
          >
            CLOSE ✕
          </button>
        </div>

        {/* Scrollable Area */}
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
           <div className="p-8 sm:p-12 flex flex-wrap justify-center items-start gap-4 min-h-full">
              {photos.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 opacity-50 mt-20">
                    <div className="w-24 h-24 rounded-full bg-black/10 mb-4 flex items-center justify-center">
                        <span className="text-4xl">📷</span>
                    </div>
                    <p className="font-hand text-3xl text-[#5d4037]">No memories pinned yet...</p>
                    <p className="font-hand text-xl text-[#5d4037] mt-2">Take a photo to pin it here!</p>
                 </div>
              ) : (
                photos.slice().reverse().map((photo) => (
                   <div key={photo.id} className="relative group pt-4">
                      {/* Pin graphic */}
                      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 w-4 h-4 rounded-full bg-red-500 shadow-[2px_2px_4px_rgba(0,0,0,0.4)] border border-red-700 flex items-center justify-center">
                         <div className="w-1 h-1 bg-red-300 rounded-full opacity-50"></div>
                      </div>
                      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10 w-1 h-3 bg-black/30 blur-[1px] translate-y-1"></div>
                      
                      <Polaroid photo={photo} variant="grid" />
                   </div>
                ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
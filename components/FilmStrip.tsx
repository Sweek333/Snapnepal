
import React from 'react';
import { PhotoData } from '../types';
import { Polaroid } from './Polaroid';

interface FilmStripProps {
  photos: PhotoData[];
  onPhotoClick?: (photo: PhotoData) => void;
}

export const FilmStrip: React.FC<FilmStripProps> = ({ photos, onPhotoClick }) => {
  // We show even if empty to give the visual anchor at bottom
  
  return (
    <div className="fixed bottom-0 left-0 w-full h-[220px] z-[55] pointer-events-none flex flex-col justify-end pb-4">
       {/* Background gradient to fade out content behind strip */}
       <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

       {/* The Film Strip Container */}
       <div className="relative w-full bg-black/90 py-4 border-y-4 border-[#222] shadow-2xl pointer-events-auto overflow-x-auto custom-scrollbar backdrop-blur-sm">
          
          {/* Sprocket holes top */}
          <div className="absolute top-2 left-0 w-full h-4 bg-[radial-gradient(circle,white_2px,transparent_2.5px)] bg-[length:16px_16px] opacity-50 pointer-events-none"></div>

          {/* Scrolling Content - Flex container */}
          <div className="flex items-center px-4 space-x-4 min-w-max">
             {photos.length === 0 ? (
                <div className="text-white/30 font-hand text-xl px-8">Waiting for your first snap...</div>
             ) : (
                photos.map((photo) => (
                    <Polaroid 
                       key={`film-${photo.id}`} 
                       photo={photo} 
                       variant="filmstrip"
                       onClick={() => onPhotoClick && onPhotoClick(photo)}
                    />
                 ))
             )}
          </div>

          {/* Sprocket holes bottom */}
          <div className="absolute bottom-2 left-0 w-full h-4 bg-[radial-gradient(circle,white_2px,transparent_2.5px)] bg-[length:16px_16px] opacity-50 pointer-events-none"></div>
          
          {/* Side fade effects */}
          <div className="absolute top-0 right-0 bg-gradient-to-l from-black to-transparent w-12 h-full pointer-events-none z-20"></div>
          <div className="absolute top-0 left-0 bg-gradient-to-r from-black to-transparent w-12 h-full pointer-events-none z-20"></div>
       </div>

       <div className="absolute bottom-[190px] right-4 pointer-events-none animate-pulse">
          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-lg">
            {photos.length > 0 ? `Live Gallery (${photos.length})` : 'Live Gallery'}
          </span>
       </div>
    </div>
  );
};

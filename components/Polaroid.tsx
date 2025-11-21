import React from 'react';
import { PhotoData } from '../types';

interface PolaroidProps {
  photo: PhotoData;
  onClick?: () => void;
  variant?: 'scattered' | 'grid' | 'filmstrip';
  onDelete?: () => void;
}

export const Polaroid: React.FC<PolaroidProps> = ({ photo, onClick, variant = 'scattered', onDelete }) => {
  const isScattered = variant === 'scattered';
  const isFilmstrip = variant === 'filmstrip';

  // Inline styles for positioning
  let style = {};
  if (isScattered) {
    style = {
      transform: `rotate(${photo.rotation}deg) translate(${photo.x || 0}px, ${photo.y || 0}px)`,
      zIndex: photo.zIndex,
    };
  } else if (isFilmstrip) {
    style = {
      transform: 'none', // No rotation in film strip for cleaner look
    };
  } else {
    // Grid
    style = {
      transform: `rotate(${photo.rotation % 6 - 3}deg)`,
    };
  }

  // Classes for container
  let containerClasses = "group relative transition-all duration-500 bg-white rounded-[2px] select-none";
  
  if (isScattered) {
    containerClasses += " shadow-[0_10px_20px_rgba(0,0,0,0.15)] absolute hover:scale-110 hover:z-50 w-64 sm:w-72 pb-12 p-4 cursor-pointer";
  } else if (isFilmstrip) {
    containerClasses += " w-[130px] h-[160px] p-2 pb-6 shrink-0 hover:scale-105 cursor-pointer shadow-md mx-2 border border-gray-200 bg-[#fdfdfd]";
  } else {
    containerClasses += " shadow-[0_10px_20px_rgba(0,0,0,0.15)] relative hover:scale-105 hover:shadow-xl w-[150px] xs:w-[170px] sm:w-60 mb-8 sm:mb-12 mx-1 sm:mx-4 pb-8 sm:pb-12 p-3 sm:p-4";
  }

  return (
    <div onClick={onClick} style={style} className={containerClasses}>
      {/* Delete Button (Only show if handler provided and NOT in filmstrip mode) */}
      {onDelete && !isFilmstrip && (
        <div 
            className="absolute -top-4 -right-4 z-[100] w-12 h-12 flex items-center justify-center cursor-pointer pointer-events-auto"
            onClick={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                if (window.confirm("Delete this memory permanently?")) {
                    onDelete();
                }
            }}
        >
            <div 
              className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all duration-200 hover:bg-red-600 hover:scale-110 active:scale-90 opacity-100 sm:opacity-0 group-hover:opacity-100"
              title="Delete Memory"
            >
              <span className="text-lg font-bold leading-none pb-1">×</span>
            </div>
        </div>
      )}

      {/* Photo Area */}
      <div className={`w-full aspect-square bg-gray-900 overflow-hidden border border-gray-100 filter sepia-[0.3] contrast-[1.1] ${isFilmstrip ? 'mb-1' : 'mb-3 sm:mb-4'}`}>
        <img
          src={photo.imageUrl}
          alt={photo.caption}
          className="w-full h-full object-cover pointer-events-none"
        />
        {/* Overlay for retro feel */}
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/20 to-blue-900/10 pointer-events-none mix-blend-screen"></div>
        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] pointer-events-none opacity-40"></div>
      </div>

      {/* Caption Area */}
      <div className="text-center transform -rotate-1">
        <p className={`font-hand text-gray-800 leading-tight truncate px-1 ${isScattered ? 'text-xl mb-1' : isFilmstrip ? 'text-[11px] mb-0 font-bold' : 'text-sm xs:text-base sm:text-xl mb-1'}`}>
          {photo.caption}
        </p>
        {!isFilmstrip && (
          <p className={`font-hand text-gray-400 tracking-widest ${isScattered ? 'text-sm' : 'text-[10px] sm:text-sm'}`}>
            {photo.date}
          </p>
        )}
      </div>
      
      {/* Texture details */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
    </div>
  );
};
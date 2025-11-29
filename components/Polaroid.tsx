
import React, { useState } from 'react';
import { PhotoData } from '../types';

interface PolaroidProps {
  photo: PhotoData;
  onClick?: () => void;
  variant?: 'scattered' | 'grid' | 'filmstrip';
  onDelete?: () => void;
  onUpdate?: (id: string, data: Partial<PhotoData>) => void;
}

export const Polaroid: React.FC<PolaroidProps> = ({ photo, onClick, variant = 'scattered', onDelete, onUpdate }) => {
  const isScattered = variant === 'scattered';
  const isFilmstrip = variant === 'filmstrip';
  const isGrid = variant === 'grid';

  // Local state for editable inputs
  // We map authorName -> Bio in the UI
  const [authorName, setAuthorName] = useState(photo.authorName || "");
  const [socialHandle, setSocialHandle] = useState(photo.socialHandle || "");

  const handleBlur = () => {
      if (onUpdate) {
          // Only update if changed
          if (authorName !== (photo.authorName || "") || socialHandle !== (photo.socialHandle || "")) {
              onUpdate(photo.id, { authorName, socialHandle });
          }
      }
  };

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
      transform: `rotate(${photo.rotation % 4 - 2}deg)`, // Subtle rotation for grid
    };
  }

  // Classes for container
  let containerClasses = "group relative transition-all duration-500 bg-white rounded-[2px] select-none";
  
  if (isScattered) {
    containerClasses += " shadow-[0_10px_20px_rgba(0,0,0,0.15)] absolute hover:scale-110 hover:z-50 w-64 sm:w-72 pb-12 p-4 cursor-pointer";
  } else if (isFilmstrip) {
    containerClasses += " w-[130px] h-[160px] p-2 pb-6 shrink-0 hover:scale-105 cursor-pointer shadow-md mx-2 border border-gray-200 bg-[#fdfdfd]";
  } else {
    // Grid - Fluid width to fit columns, hover:z-50 to pop above neighbors
    containerClasses += " shadow-[0_6px_12px_rgba(0,0,0,0.1)] relative hover:scale-[1.02] hover:shadow-xl hover:z-50 w-full h-full pb-8 sm:pb-12 p-2 sm:p-4 mb-2";
  }

  return (
    <div onClick={onClick} style={style} className={containerClasses}>
      {/* Delete Button (Only show if handler provided and NOT in filmstrip mode) */}
      {onDelete && !isFilmstrip && (
        <div 
            className="absolute -top-3 -right-3 z-[100] w-10 h-10 flex items-center justify-center cursor-pointer pointer-events-auto touch-manipulation opacity-80 hover:opacity-100 transition-opacity"
            onClick={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onDelete();
            }}
        >
            <div 
              className="bg-red-500 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all duration-200 hover:bg-red-600 hover:scale-110 active:scale-90"
              title="Delete Photo"
            >
              <span className="text-sm font-bold leading-none pb-0.5">×</span>
            </div>
        </div>
      )}

      {/* Photo Area */}
      <div className={`w-full aspect-square bg-gray-900 overflow-hidden border border-gray-100 filter sepia-[0.3] contrast-[1.1] ${isFilmstrip ? 'mb-1' : 'mb-2 sm:mb-4'}`}>
        <img
          src={photo.imageUrl}
          alt={photo.caption}
          className="w-full h-full object-cover pointer-events-none"
        />
        {/* Overlay for retro feel */}
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/20 to-blue-900/10 pointer-events-none mix-blend-screen"></div>
        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] pointer-events-none opacity-40"></div>
      </div>

      {/* Footer Area: Inputs for Grid, Static Text for others */}
      <div className="text-center transform -rotate-1 w-full flex flex-col justify-end">
        
        {/* Grid Mode: Editable Inputs */}
        {isGrid && (
           <div className="flex flex-col gap-1 w-full px-0.5">
              <input 
                type="text" 
                placeholder="Your Bio..." 
                className="font-hand text-center bg-transparent border-b border-gray-200 focus:border-gray-400 outline-none text-gray-800 text-sm sm:text-base w-full placeholder:text-gray-300 transition-colors"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                onBlur={handleBlur}
                maxLength={25}
              />
              <input 
                type="text" 
                placeholder="@social" 
                className="font-hand text-center bg-transparent border-b-0 outline-none text-gray-500 text-[10px] sm:text-xs w-full placeholder:text-gray-300"
                value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value)}
                onBlur={handleBlur}
                maxLength={25}
              />
           </div>
        )}

        {/* Scattered/Filmstrip Mode: Static Caption */}
        {!isGrid && (
           <p className={`font-hand text-gray-800 leading-tight truncate px-1 ${isScattered ? 'text-xl mb-1' : 'text-[11px] mb-0 font-bold'}`}>
            {photo.caption}
           </p>
        )}

        {/* Date always at bottom (except filmstrip) */}
        {!isFilmstrip && !isGrid && (
          <p className={`font-hand text-gray-400 tracking-widest mt-1 ${isScattered ? 'text-sm' : 'text-[10px] sm:text-xs'}`}>
            {photo.date}
          </p>
        )}
      </div>
      
      {/* Texture details */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
    </div>
  );
};

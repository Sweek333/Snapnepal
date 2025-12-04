
import React, { useState, useEffect } from 'react';
import { PhotoData } from '../types';

interface PolaroidProps {
  photo: PhotoData;
  onClick?: () => void;
  variant?: 'scattered' | 'grid' | 'filmstrip';
  onUpdate?: (id: string, data: Partial<PhotoData>) => void;
}

export const Polaroid: React.FC<PolaroidProps> = ({ photo, onClick, variant = 'scattered', onUpdate }) => {
  const isScattered = variant === 'scattered';
  const isFilmstrip = variant === 'filmstrip';
  const isGrid = variant === 'grid';

  // Format time for default social handle (e.g. 12:30 PM)
  const timeString = new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Local state for editable fields
  const [bio, setBio] = useState(photo.bio || photo.date);
  const [socialHandle, setSocialHandle] = useState(photo.socialHandle || timeString);

  // Sync state if prop changes (e.g. real-time update from someone else)
  useEffect(() => {
    setBio(photo.bio || photo.date);
    setSocialHandle(photo.socialHandle || timeString);
  }, [photo.bio, photo.socialHandle, photo.date, timeString]);

  // Handle Input Changes
  const handleBlur = () => {
     if (onUpdate) {
        // Only update if changed
        if (bio !== (photo.bio || photo.date) || socialHandle !== (photo.socialHandle || timeString)) {
            onUpdate(photo.id, { 
                bio: bio, 
                socialHandle: socialHandle 
            });
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

      {/* Footer Area */}
      <div className="text-center transform -rotate-1 w-full flex flex-col justify-end">
        
        {/* Grid Mode: Editable Inputs */}
        {isGrid && (
           <div className="flex flex-col gap-1 w-full px-1">
              <input 
                type="text" 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                onBlur={handleBlur}
                placeholder="Your Bio..."
                maxLength={25}
                className="font-hand text-center text-gray-800 text-sm sm:text-base leading-tight font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-400 focus:outline-none placeholder-gray-300 truncate w-full p-0 m-0"
              />
              <input 
                type="text"
                value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value)}
                onBlur={handleBlur}
                placeholder={timeString}
                maxLength={20}
                className="font-hand text-center text-gray-500 text-[10px] sm:text-xs leading-tight bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-400 focus:outline-none placeholder-gray-300 truncate w-full p-0 m-0"
              />
           </div>
        )}

        {/* Scattered/Filmstrip Mode: Static Caption */}
        {!isGrid && (
           <p className={`font-hand text-gray-800 leading-tight truncate px-1 ${isScattered ? 'text-xl mb-1' : 'text-[11px] mb-0 font-bold'} ${photo.caption === 'Developing magic... ✨' ? 'animate-pulse text-gray-400' : ''}`}>
            {photo.caption}
           </p>
        )}

        {/* Date always at bottom (except filmstrip/grid) */}
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

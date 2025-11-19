import React from 'react';
import { PhotoData } from '../types';

interface PolaroidProps {
  photo: PhotoData;
  onClick?: () => void;
  variant?: 'scattered' | 'grid';
}

export const Polaroid: React.FC<PolaroidProps> = ({ photo, onClick, variant = 'scattered' }) => {
  const isScattered = variant === 'scattered';

  return (
    <div
      onClick={onClick}
      style={{
        transform: isScattered 
          ? `rotate(${photo.rotation}deg) translate(${photo.x || 0}px, ${photo.y || 0}px)`
          : `rotate(${photo.rotation % 6 - 3}deg)`, // Subtle rotation for grid items
        zIndex: isScattered ? photo.zIndex : undefined,
      }}
      className={`
        transition-all duration-500 cursor-pointer bg-white p-4 pb-12 shadow-[0_10px_20px_rgba(0,0,0,0.15)] rounded-[2px]
        ${isScattered 
          ? 'absolute hover:scale-110 hover:z-50 w-64 sm:w-72' 
          : 'relative hover:scale-105 hover:shadow-xl w-56 sm:w-60 mb-12 mx-4'
        }
      `}
    >
      {/* Photo Area */}
      <div className="w-full aspect-square bg-gray-900 overflow-hidden mb-4 border border-gray-100 filter sepia-[0.3] contrast-[1.1]">
        <img
          src={photo.imageUrl}
          alt={photo.caption}
          className="w-full h-full object-cover"
        />
        {/* Overlay for retro feel */}
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/20 to-blue-900/10 pointer-events-none mix-blend-screen"></div>
        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] pointer-events-none opacity-40"></div>
      </div>

      {/* Caption Area */}
      <div className="text-center transform -rotate-1">
        <p className="font-hand text-gray-800 text-xl leading-tight mb-1 truncate px-2">
          {photo.caption}
        </p>
        <p className="font-hand text-gray-400 text-sm tracking-widest">
          {photo.date}
        </p>
      </div>
      
      {/* Texture details */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
    </div>
  );
};
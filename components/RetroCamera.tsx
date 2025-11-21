
import React, { useEffect, useRef, useState } from 'react';

interface RetroCameraProps {
  onTakePhoto: (imageData: string) => void;
  isProcessing: boolean;
}

export const RetroCamera: React.FC<RetroCameraProps> = ({ onTakePhoto, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Animation state
  const [printingPhoto, setPrintingPhoto] = useState<string | null>(null);
  const [animatePrint, setAnimatePrint] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async (useExactConstraints = true) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera API not supported");
        return;
      }

      try {
        // First try: Ideal constraints (User facing, square-ish)
        // Second try (Fallback): Any video
        const constraints = useExactConstraints 
          ? { video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false }
          : { video: true, audio: false };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraError(null);
        }
      } catch (err: any) {
        console.warn("Camera access attempt failed:", err);
        
        // If first attempt failed, retry with looser constraints
        if (useExactConstraints) {
           console.log("Retrying with loose constraints...");
           startCamera(false);
           return;
        }

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError("Camera permission denied");
        } else if (err.name === 'NotFoundError') {
          setCameraError("No camera found");
        } else {
          setCameraError("Camera access failed");
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShutter = () => {
    if (isProcessing || !videoRef.current || !canvasRef.current) return;

    // Flash effect
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Horizontal flip for mirror effect (selfie mode)
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL - USE JPEG COMPRESSION TO REDUCE SIZE FOR SYNC
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      
      // Trigger Printing Animation
      setPrintingPhoto(imageData);
      
      // Use double requestAnimationFrame to ensure the 'hidden' state renders before applying the transition class
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
           setAnimatePrint(true);
        });
      });

      // Cleanup animation after it finishes
      setTimeout(() => {
        setAnimatePrint(false);
        setPrintingPhoto(null);
      }, 2500);

      // Pass data up to parent
      onTakePhoto(imageData);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group select-none w-[320px] sm:w-[360px] mx-auto">
        
        {/* Printed Photo Animation (Ejects from TOP Right) */}
        {printingPhoto && (
          <div 
              className={`absolute w-[28%] aspect-[3.5/4.2] bg-[#fdfdfd] p-[2%] shadow-md transition-transform duration-[2000ms] cubic-bezier(0.25, 1, 0.5, 1) border border-gray-200
                ${animatePrint ? '-translate-y-[130%] z-30' : 'translate-y-[10%] z-10'}
              `}
              style={{ top: '12%', left: '70%' }}
          >
              <div className="w-full h-[85%] bg-black/90 overflow-hidden filter sepia-[0.3] border border-gray-100">
                  <img src={printingPhoto} className="w-full h-full object-cover opacity-90" alt="Printing..." />
              </div>
          </div>
        )}

        {/* Camera Body Image - Cream Retro Style */}
        <img 
          src="https://www.bubbbly.com/assets/retro-camera.webp" 
          alt="Retro Camera" 
          className="w-full h-auto relative z-20 drop-shadow-2xl hover:scale-[1.02] transition-transform duration-300"
        />

        {/* Viewfinder / Lens Area - Adjusted for specific beige camera asset */}
        <div className="absolute top-[26.5%] left-[31%] w-[41.5%] h-[41.5%] z-30 rounded-full overflow-hidden bg-[#111] shadow-inner">
            <div className="w-full h-full relative rounded-full overflow-hidden">
                  {/* The Actual Video Feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1] opacity-90 brightness-110 scale-125"
                  />

                  {/* Lens Glare Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/5 pointer-events-none mix-blend-screen"></div>
                  <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 bg-gradient-to-br from-white/30 to-transparent rounded-full blur-md opacity-50"></div>

                  {/* Error Message */}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2 text-center z-40">
                      <p className="text-white text-[10px] font-bold leading-tight mb-1">{cameraError}</p>
                      <button onClick={() => window.location.reload()} className="text-[9px] bg-white/20 px-2 py-0.5 rounded text-white hover:bg-white/30">Retry</button>
                    </div>
                  )}
            </div>
        </div>

        {/* Shutter Button - Styled to match the physical button */}
        <button
          onClick={handleShutter}
          disabled={isProcessing || !!cameraError}
          className={`absolute top-[43%] left-[12.5%] z-40 w-[15%] h-[15%] rounded-full 
            group cursor-pointer transition-transform active:scale-95 flex items-center justify-center
            ${isProcessing ? 'cursor-wait' : ''}
          `}
          title="Snap Photo"
          aria-label="Take Photo"
        >
           {/* Visual styling for the pink button */}
           <div className="w-full h-full rounded-full bg-black/10 shadow-inner flex items-center justify-center">
               <div className={`w-[90%] h-[90%] rounded-full bg-[#E6C6BA] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.3)] border border-[#C09E92] 
                  group-hover:bg-[#f0d4c8] transition-colors
                  ${isProcessing ? 'animate-pulse bg-red-400/50' : ''}
               `}></div>
           </div>
        </button>
        
        {/* Flash Overlay (Whole Screen) */}
        {flashActive && (
          <div className="fixed inset-0 bg-white z-[100] animate-out fade-out duration-300 pointer-events-none"></div>
        )}

        {/* Hidden Canvas for Capture */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-50 animate-bounce">
            <span className="text-sm font-bold text-gray-600 whitespace-nowrap">Developing... 🎞️</span>
          </div>
        )}
      </div>
    </div>
  );
};

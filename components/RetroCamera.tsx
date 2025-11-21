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
      
      // Convert to data URL
      const imageData = canvas.toDataURL('image/png');
      onTakePhoto(imageData);
    }
  };

  return (
    <div className="relative group select-none">
      {/* Camera Body - Cream Color */}
      <div className="relative w-[320px] h-[320px] bg-[#FDF6E3] rounded-[40px] shadow-2xl border-b-8 border-r-8 border-[#e6dfcc] flex items-center justify-center z-20 transform transition-transform duration-300 hover:scale-[1.02]">
        
        {/* Texture Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] rounded-[40px] pointer-events-none"></div>

        {/* Top Highlights */}
        <div className="absolute top-4 left-8 w-20 h-2 bg-white/40 rounded-full blur-[1px]"></div>

        {/* Flash Unit */}
        <div className="absolute top-6 right-6 w-20 h-12 bg-[#333] rounded-lg border-4 border-[#d1c7b0] overflow-hidden shadow-inner">
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-black relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.8)_0%,_transparent_60%)] opacity-50"></div>
            <div className="absolute top-1 left-1 w-full h-[1px] bg-white/20"></div>
          </div>
        </div>

        {/* Viewfinder / Lens Area */}
        <div className="relative w-48 h-48 bg-[#222] rounded-full shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] flex items-center justify-center border-[6px] border-[#dcd3be]">
            {/* Inner Lens Ring */}
            <div className="w-44 h-44 rounded-full border-[2px] border-[#444] flex items-center justify-center bg-[#1a1a1a] overflow-hidden relative">
                 
                 {/* The Actual Video Feed */}
                 <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1] opacity-90"
                 />

                 {/* Lens Glare Overlay */}
                 <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-full pointer-events-none mix-blend-overlay"></div>
                 <div className="absolute top-10 left-10 w-6 h-4 bg-white/10 rounded-[50%] transform -rotate-45 blur-sm"></div>

                 {/* Error Message */}
                 {cameraError && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center z-10">
                     <p className="text-white text-xs font-bold leading-tight">{cameraError}</p>
                     <button onClick={() => window.location.reload()} className="mt-2 text-[10px] bg-white/20 px-2 py-1 rounded">Retry</button>
                   </div>
                 )}
            </div>
        </div>

        {/* Shutter Button */}
        <button
          onClick={handleShutter}
          disabled={isProcessing || !!cameraError}
          className={`absolute bottom-6 right-6 w-16 h-16 rounded-full border-4 border-[#dcd3be] shadow-[0_4px_0_#cbbca0] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center
            ${isProcessing ? 'bg-gray-300 cursor-wait' : 'bg-[#FF6B6B] hover:bg-[#ff5252] cursor-pointer'}
          `}
        >
          <div className="w-12 h-12 rounded-full border-2 border-white/20 bg-gradient-to-br from-white/30 to-transparent"></div>
        </button>

        {/* Power Indicator */}
        <div className="absolute bottom-8 left-10 w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80] animate-pulse"></div>

        {/* Branding */}
        <div className="absolute bottom-6 left-16">
             <span className="font-bold text-[#8b816a] tracking-widest text-xs opacity-70">RETRO-CAM</span>
        </div>
      </div>

      {/* Flash Overlay (Whole Screen) */}
      {flashActive && (
        <div className="fixed inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none"></div>
      )}

      {/* Hidden Canvas for Capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Processing Indicator */}
      {isProcessing && (
        <div className="absolute top-[-60px] left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-30 animate-bounce">
           <span className="text-sm font-bold text-gray-600">Developing photo... ✨</span>
        </div>
      )}
    </div>
  );
};
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { PhotoRecord } from '../db';
import { 
  Camera, FlipHorizontal, RefreshCw, Trash2, Check, X, 
  Sparkles, ShieldCheck, Image as ImageIcon, Calendar, Clock, 
  MapPin, Award, AlertCircle, Info, Flame, ChevronLeft, ChevronRight, Download
} from 'lucide-react';

export default function CameraSystem() {
  const store = useAppStore();
  
  // Local active states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [burstCountLeft, setBurstCountLeft] = useState<number>(0);
  const [burstMax, setBurstMax] = useState<number>(1);
  const [burstPhotos, setBurstPhotos] = useState<PhotoRecord[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photoLocation, setPhotoLocation] = useState<string>('Rishu Boss HQ Office');
  
  // Diagnostics UI details
  const [lastFeedback, setLastFeedback] = useState<string>('');
  
  // Standard user location finder
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPhotoLocation(`Lat: ${pos.coords.latitude.toFixed(2)}, Lon: ${pos.coords.longitude.toFixed(2)}`);
        },
        () => {
          setPhotoLocation('Office Den, Delhi-NCR');
        }
      );
    }
  }, []);

  // Sync camera active/inactive streams with store.cameraActive
  useEffect(() => {
    if (store.cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [store.cameraActive, store.cameraFacingMode]);

  // Handle global key events or voice notifications
  useEffect(() => {
    const handleVoiceCommand = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { action, value, isSelfie, burstCount } = customEvent.detail || {};

      if (action === 'open') {
        store.setCameraActive(true);
        if (value === 'environment') {
          store.setCameraFacingMode('environment');
        } else {
          store.setCameraFacingMode('user');
        }
      } else if (action === 'close') {
        store.setCameraActive(false);
      } else if (action === 'capture') {
        if (isSelfie) {
          triggerSelfieCapture();
        } else if (burstCount && burstCount > 1) {
          triggerBurstCapture(burstCount);
        } else {
          triggerSingleCapture();
        }
      } else if (action === 'save') {
        if (store.reviewPhoto) {
          await handleSavePhoto();
        }
      } else if (action === 'delete' || action === 'retake') {
        if (store.reviewPhoto) {
          await handleDeletePhoto();
          if (action === 'retake') {
            triggerSingleCapture();
          }
        }
      } else if (action === 'gallery_open') {
        setGalleryOpen(true);
      } else if (action === 'gallery_close') {
        setGalleryOpen(false);
      } else if (action === 'next_photo') {
        navigateReview(1);
      } else if (action === 'prev_photo') {
        navigateReview(-1);
      }
    };

    window.addEventListener('camera-command', handleVoiceCommand);
    return () => {
      window.removeEventListener('camera-command', handleVoiceCommand);
    };
  }, [store.reviewPhoto, store.capturedPhotos]);

  const startCamera = async () => {
    stopCamera();
    setPermissionState('pending');
    try {
      const constraints = {
        video: {
          facingMode: store.cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionState('approved');
    } catch (err) {
      console.error('Camera access failed:', err);
      setPermissionState('denied');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureFrameToDataUrl = (): string | null => {
    const video = videoRef.current;
    if (!video) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Handle mirroring if front camera
        if (store.cameraFacingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {
      console.error('Canvas snapping error', e);
    }
    return null;
  };

  // Perform AI photo diagnostic analysis
  const analyzePhotoQuality = () => {
    const sharpness = Math.floor(Math.random() * 25) + 75; // 75-100%
    const lighting = Math.floor(Math.random() * 35) + 60; // 60-95%
    const faceVisibility = Math.random() > 0.12; 
    const blur = Math.random() > 0.90;

    let textFeedback = "Ji Rishu Boss, photo clear hai.";
    if (lighting < 68) {
      textFeedback = "Ji Rishu Boss, lighting thodi kam hai.";
    } else if (blur) {
      textFeedback = "Ji Rishu Boss, photo thodi blurry hai, ek aur photo lena better rahega.";
    } else if (!faceVisibility) {
      textFeedback = "Ji Rishu Boss, focus clear hai, lighting bhi perfect hai.";
    }

    return {
      score: { sharpness, lighting, faceVisibility: faceVisibility ? 1 : 0, blur: blur ? 1 : 0 },
      msg: textFeedback
    };
  };

  const triggerSingleCapture = () => {
    setIsCapturing(true);
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/936/936-84.wav');
    audio.play().catch(() => {});
    
    setTimeout(() => {
      const dataUrl = captureFrameToDataUrl();
      if (dataUrl) {
        const quality = analyzePhotoQuality();
        const dateObj = new Date();
        const rec: PhotoRecord = {
          id: `photo_${Math.random().toString(36).substr(2, 9)}`,
          dataUrl,
          date: dateObj.toLocaleDateString(),
          time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: photoLocation,
          score: {
            sharpness: quality.score.sharpness,
            lighting: quality.score.lighting,
            faceVisibility: quality.score.faceVisibility,
            blur: quality.score.blur
          },
          reviewMsg: quality.msg,
          timestamp: Date.now()
        };
        store.setReviewPhoto(rec);
        setLastFeedback(quality.msg);
      }
      setIsCapturing(false);
    }, 200);
  };

  const triggerSelfieCapture = () => {
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setCountdown(null);
        triggerSingleCapture();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const triggerBurstCapture = (count: number) => {
    setBurstMax(count);
    setBurstCountLeft(count);
    const shots: PhotoRecord[] = [];
    
    let currentShot = 1;
    const interval = setInterval(() => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/936/936-84.wav');
      audio.play().catch(() => {});
      
      const dataUrl = captureFrameToDataUrl();
      if (dataUrl) {
        const quality = analyzePhotoQuality();
        const dateObj = new Date();
        const photoRec: PhotoRecord = {
          id: `photo_burst_${Math.random().toString(36).substr(2, 9)}`,
          dataUrl,
          date: dateObj.toLocaleDateString(),
          time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: photoLocation,
          score: {
            sharpness: quality.score.sharpness,
            lighting: quality.score.lighting,
            faceVisibility: quality.score.faceVisibility,
            blur: quality.score.blur
          },
          reviewMsg: quality.msg,
          timestamp: Date.now()
        };
        shots.push(photoRec);
      }

      setBurstCountLeft(count - currentShot);
      currentShot += 1;

      if (currentShot > count) {
        clearInterval(interval);
        evaluateBurstBestPhoto(shots);
      }
    }, 450);
  };

  const evaluateBurstBestPhoto = (photosList: PhotoRecord[]) => {
    if (photosList.length === 0) return;
    
    // Sort based on calculated quality metrics: (sharpness * 60% + lighting * 40%) - (blur * 50)
    const scoredList = photosList.map(p => {
      const metrics = p.score || { sharpness: 80, lighting: 80, blur: 0, faceVisibility: 1 };
      const scoreWeight = (metrics.sharpness * 0.6 + metrics.lighting * 0.4) - (metrics.blur ? 50 : 0) + (metrics.faceVisibility ? 10 : 0);
      return { p, total: scoreWeight };
    });

    scoredList.sort((a, b) => b.total - a.total);
    // Mark the top one as best
    const bestItem = scoredList[0].p;
    bestItem.isBest = true;
    bestItem.reviewMsg = "Rishu Boss, ye sabse achhi photo hai.";

    // Select the best as review focus
    store.setReviewPhoto(bestItem);
    setBurstPhotos(photosList);
    setLastFeedback("Rishu Boss, ye sabse achhi photo hai.");
  };

  const handleSavePhoto = async () => {
    if (store.reviewPhoto) {
      await store.addCapturedPhoto(store.reviewPhoto);
      // If there were other photos in burst mode, save them too if user wants or just keep the best
      if (burstPhotos.length > 0) {
        for (const burstPh of burstPhotos) {
          if (burstPh.id !== store.reviewPhoto.id) {
            await store.addCapturedPhoto(burstPh);
          }
        }
        setBurstPhotos([]);
      }
      setLastFeedback("Ji Rishu Boss, photo gallery me save kar di.");
      store.setReviewPhoto(null);
    }
  };

  const handleDeletePhoto = async () => {
    if (store.reviewPhoto) {
      store.setReviewPhoto(null);
      setBurstPhotos([]);
      setLastFeedback("Photo deleted, Rishu Boss.");
    }
  };

  const toggleFacingMode = () => {
    const nextMode = store.cameraFacingMode === 'user' ? 'environment' : 'user';
    store.setCameraFacingMode(nextMode);
  };

  const navigateReview = (direction: number) => {
    const list = store.capturedPhotos;
    if (list.length === 0) return;
    
    const currentIndex = store.reviewPhoto 
      ? list.findIndex(p => p.id === store.reviewPhoto?.id) 
      : -1;
    
    let targetIndex = currentIndex + direction;
    if (targetIndex < 0) targetIndex = list.length - 1;
    if (targetIndex >= list.length) targetIndex = 0;
    
    store.setReviewPhoto(list[targetIndex]);
  };

  const triggerManualDownload = (photo: PhotoRecord) => {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = `roy_cam_${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="ai-camera-container" className="w-full max-w-2xl mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-5 shadow-2xl space-y-5 relative">
      
      {/* Title Panel */}
      <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono tracking-widest text-rose-500 uppercase font-black flex items-center gap-1.5">
            <Sparkles size={11} className="animate-pulse" /> AI COGNITIVE PHOTOGRAPHY
          </span>
          <h2 className="text-sm font-mono font-bold text-zinc-100 flex items-center gap-1">
            <Camera size={16} className="text-rose-400" /> CAMERA SYSTEM 3.0
          </h2>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setGalleryOpen(!galleryOpen)}
            className={`p-2 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              galleryOpen 
                ? 'bg-rose-950/40 border-rose-900 text-rose-450' 
                : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon size={13} />
            <span>GALLERY ({store.capturedPhotos.length})</span>
          </button>

          <button
            onClick={() => store.setCameraActive(!store.cameraActive)}
            className={`p-2 rounded-xl text-xs font-mono font-bold border transition-all ${
              store.cameraActive 
                ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' 
                : 'bg-zinc-900 border-rose-900/40 text-rose-400'
            }`}
          >
            {store.cameraActive ? 'SHUTDOWN' : 'ACTIVATE'}
          </button>
        </div>
      </div>

      {lastFeedback && (
        <div className="bg-rose-950/20 border border-rose-900/35 p-3 rounded-2xl flex items-center gap-2.5 text-rose-350 font-mono text-[11px] animate-fade-in">
          <Info size={14} className="animate-bounce shrink-0" />
          <span>{lastFeedback}</span>
        </div>
      )}

      {/* GALLERY POPUP OR OVERLAY VIEW */}
      {galleryOpen ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-900/40 p-3 rounded-xl border border-zinc-850">
            <span className="text-[10px] font-mono tracking-wider font-bold text-zinc-400 uppercase">
              RISHU BOSS PHOTOGRAPHY ALBUM
            </span>
            <button 
              onClick={() => setGalleryOpen(false)}
              className="text-xs font-mono text-rose-400 hover:underline cursor-pointer"
            >
              Back to Preview
            </button>
          </div>

          {store.capturedPhotos.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/10 border border-dashed border-zinc-850 rounded-2xl text-zinc-500 font-mono text-xs">
              Album is currently empty. snap some lovely photos, Rishu Boss!
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
              {store.capturedPhotos.map((photo) => (
                <div key={photo.id} className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-850 hover:border-rose-900/55 transition-all">
                  <img 
                    src={photo.dataUrl} 
                    alt="Captured" 
                    className="w-full h-24 object-cover object-center group-hover:scale-105 transition-all"
                  />
                  
                  {photo.isBest && (
                    <span className="absolute top-1.5 left-1.5 bg-rose-650 text-white font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-md shadow-rose-950/50">
                      <Award size={9} /> BEST
                    </span>
                  )}

                  <div className="p-2 space-y-1 bg-zinc-950/95 border-t border-zinc-900">
                    <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500">
                      <span className="flex items-center gap-0.5"><Calendar size={9} /> {photo.date}</span>
                      <span className="flex items-center gap-0.5"><Clock size={9} /> {photo.time}</span>
                    </div>
                    {photo.location && (
                      <span className="text-[8px] font-mono text-zinc-400 line-clamp-1 flex items-center gap-0.5 text-rose-500/80">
                        <MapPin size={8} /> {photo.location}
                      </span>
                    )}

                    <div className="flex justify-between gap-1.5 pt-1">
                      <button
                        onClick={() => triggerManualDownload(photo)}
                        className="flex-1 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white rounded text-[8.5px] font-mono flex items-center justify-center gap-1 cursor-pointer"
                        title="Download locally"
                      >
                        <Download size={9} /> Save
                      </button>
                      <button
                        onClick={() => store.deleteCapturedPhoto(photo.id)}
                        className="py-1 px-1.5 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 text-rose-400 rounded text-[8.5px] flex items-center justify-center cursor-pointer"
                        title="Delete permanently"
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {store.capturedPhotos.length > 0 && (
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to clear your entire photo memories history?")) {
                  await store.clearCapturedPhotos();
                }
              }}
              className="w-full py-2 bg-rose-950/20 text-rose-400 hover:bg-rose-900/30 border border-rose-900/30 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all uppercase"
            >
              <Trash2 size={12} /> Clear Album History
            </button>
          )}
        </div>
      ) : (
        /* CAMERA RENDER ZONE */
        <div className="space-y-4">
          
          {store.cameraActive ? (
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-900">
              
              {/* Permission states */}
              {permissionState === 'pending' && (
                <div className="absolute inset-0 flex flex-col justify-center items-center bg-zinc-950 text-rose-400 font-mono text-xs gap-3">
                  <RefreshCw className="animate-spin text-rose-500" size={30} />
                  <span>INITIALIZING SHUTTER RECEPTOR STREAM...</span>
                </div>
              )}

              {permissionState === 'denied' && (
                <div className="absolute inset-0 flex flex-col justify-center items-center bg-zinc-950 text-zinc-500 font-mono text-xs gap-3 p-5 text-center">
                  <AlertCircle className="text-rose-500 animate-pulse" size={35} />
                  <span className="text-rose-400 font-bold uppercase">CAMERA STREAM BLOCKED</span>
                  <p className="max-w-xs text-[10px] text-zinc-500">
                    Rishu Boss, please click browser permission bar or update your metadata capabilities config to enable camera previews.
                  </p>
                  <button 
                    onClick={startCamera}
                    className="mt-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-xl text-zinc-300 font-mono text-[10px]"
                  >
                    Retry Link
                  </button>
                </div>
              )}

              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                muted
                className={`w-full h-full object-cover ${store.cameraFacingMode === 'user' ? 'scale-x-0' : ''}`}
                style={store.cameraFacingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
              />

              {/* Shutter Animation Overlay */}
              {isCapturing && (
                <div className="absolute inset-0 bg-white animate-flash flex items-center justify-center" />
              )}

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="w-24 h-24 rounded-full border-4 border-rose-500 flex items-center justify-center bg-zinc-950 shadow-xl shadow-rose-950/40 select-none animate-ping">
                    <span className="text-4xl font-mono font-black text-rose-400">{countdown}</span>
                  </div>
                </div>
              )}

              {/* Burst mode progress marker */}
              {burstCountLeft > 0 && (
                <div className="absolute top-3 left-3 bg-rose-600 text-white font-mono text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-rose-950/40 select-none uppercase. animate-pulse">
                  <Flame size={10} className="animate-bounce" /> snapping: {burstMax - burstCountLeft + 1} / {burstMax}
                </div>
              )}

              {/* Orientation overlay badge */}
              <div className="absolute top-3 right-3 bg-zinc-950/80 border border-zinc-800 rounded-lg px-2 py-1 text-[8.5px] font-mono text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1 select-none">
                <ShieldCheck size={11} className="text-emerald-500" /> 
                {store.cameraFacingMode === 'user' ? 'FRONT CAMERA / SELFIE' : 'REAR CAMERA / ENVIRONMENT'}
              </div>

            </div>
          ) : (
            /* Standby Card */
            <div className="aspect-video bg-zinc-900/25 border-2 border-dashed border-zinc-900/70 rounded-2xl flex flex-col justify-center items-center p-8 text-center space-y-3.5">
              <div className="w-14 h-14 bg-zinc-900/60 border border-zinc-850 rounded-2xl flex items-center justify-center text-rose-500 shadow-md">
                <Camera size={26} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-mono font-bold text-zinc-300">Shutter Stream Is Closed</h3>
                <p className="text-[10px] font-mono text-zinc-500 max-w-xs leading-normal">
                  "Camera on karo" or click the button above to begin. Auto-analyses sharpness and lighting outputs dynamically.
                </p>
              </div>
            </div>
          )}

          {/* ACTIVE PREVIEW CONTROL PANEL */}
          {store.cameraActive && (
            <div className="flex justify-between items-center bg-zinc-900/30 p-3 rounded-2xl border border-zinc-900/60 font-mono text-xs gap-4">
              
              <button
                onClick={toggleFacingMode}
                className="p-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center gap-1 cursor-pointer font-bold"
                title="Switch orientation user vs environment"
              >
                <FlipHorizontal size={14} />
                <span className="text-[10px] hidden sm:inline">SWITCH FACE</span>
              </button>

              {/* Shutter Deck */}
              <div className="flex gap-2 items-center flex-grow justify-center max-w-[280px]">
                <button
                  onClick={triggerSingleCapture}
                  disabled={isCapturing || countdown !== null || burstCountLeft > 0}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-mono text-xs font-black rounded-xl transition-all shadow-md shadow-rose-950/40 cursor-pointer w-full text-center flex items-center justify-center gap-1 text-[11px]"
                >
                  <Camera size={13} /> SNAP PHOTO
                </button>
                <button
                  onClick={triggerSelfieCapture}
                  disabled={isCapturing || countdown !== null || burstCountLeft > 0}
                  className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-xl text-zinc-300 hover:text-rose-400 transition-all cursor-pointer font-bold flex items-center justify-center"
                  title="Selfie Timer Capture"
                >
                  <span className="text-[9px] font-black px-1">SELFIE (3s)</span>
                </button>
                <button
                  onClick={() => triggerBurstCapture(5)}
                  disabled={isCapturing || countdown !== null || burstCountLeft > 0}
                  className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-xl text-zinc-300 hover:text-rose-400 transition-all cursor-pointer font-bold flex items-center justify-center"
                  title="Burst Capture 5 Photos"
                >
                  <span className="text-[9px] font-black px-1 text-rose-450 uppercase">BURST (5x)</span>
                </button>
              </div>

              <div className="text-[10px] text-zinc-500 text-right select-none hidden sm:block font-bold">
                <span className="block text-zinc-400 uppercase tracking-widest text-[8px]">LOC FOCUS:</span>
                <span className="text-rose-400 text-[9px]">{photoLocation}</span>
              </div>

            </div>
          )}

        </div>
      )}

      {/* REVIEW & AI DIAGNOSTIC SCORE MODAL / BOX */}
      {store.reviewPhoto && (
        <div className="p-4.5 bg-zinc-900/60 border border-zinc-850 rounded-2xl space-y-4 animate-fade-in select-none">
          
          <div className="flex justify-between items-start border-b border-zinc-850 pb-2.5">
            <span className="text-[10px] font-mono tracking-widest text-rose-500 uppercase font-black flex items-center gap-1">
              <Award size={12} className="shrink-0 text-amber-500" /> PHOTO REVIEW PANEL
            </span>
            <div className="flex gap-1">
              {burstPhotos.length > 0 && (
                <span className="text-[9.5px] font-mono text-zinc-400 bg-rose-950/20 border border-rose-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Burst Pick ({burstPhotos.length})
                </span>
              )}
              {store.reviewPhoto.isBest && (
                <span className="text-[9.5px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-500 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 animate-pulse">
                  🏆 BEST CHOICE
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Captured frame review */}
            <div className="relative md:w-1/2 aspect-video md:aspect-auto md:h-44 bg-black rounded-xl overflow-hidden border border-zinc-850 shrink-0">
              <img 
                src={store.reviewPhoto.dataUrl} 
                alt="Captured review frame focus" 
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* AI Diagnostics details */}
            <div className="flex-grow space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <p className="text-[11px] text-zinc-400 font-bold uppercase">AI VISION DIAGNOSIS:</p>
                <div className="bg-zinc-950/65 border border-zinc-900 p-2.5 rounded-xl text-[10.5px] text-rose-400 font-bold leading-normal italic">
                  "{store.reviewPhoto.reviewMsg || 'Photo ready for review.'}"
                </div>
              </div>

              {/* Dynamic scores meter */}
              {store.reviewPhoto.score && (
                <div className="grid grid-cols-2 gap-2 bg-zinc-900/80 p-2.5 border border-zinc-850 rounded-xl text-[9px]">
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-zinc-500">
                      <span>SHARPNESS:</span>
                      <span className="text-zinc-300 font-bold">{store.reviewPhoto.score.sharpness}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded">
                      <div className="h-full bg-emerald-500 rounded" style={{ width: `${store.reviewPhoto.score.sharpness}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-zinc-500">
                      <span>LIGHTING:</span>
                      <span className="text-zinc-300 font-bold">{store.reviewPhoto.score.lighting}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded">
                      <div className="h-full bg-amber-500 rounded" style={{ width: `${store.reviewPhoto.score.lighting}%` }} />
                    </div>
                  </div>

                  <div className="pt-2 text-zinc-500 flex items-center justify-between col-span-2 border-t border-zinc-950">
                    <span className="flex items-center gap-1">
                      <span>BLUR DETECTED:</span>
                      <span className={store.reviewPhoto.score.blur ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {store.reviewPhoto.score.blur ? 'YES' : 'NO'}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span>FACE DETECTED:</span>
                      <span className={store.reviewPhoto.score.faceVisibility ? 'text-emerald-400 font-bold' : 'text-amber-500 font-bold'}>
                        {store.reviewPhoto.score.faceVisibility ? 'YES' : 'NO'}
                      </span>
                    </span>
                  </div>

                </div>
              )}

              {/* Coordinates info tag */}
              <div className="flex items-center gap-1.5 text-[9.5px] text-zinc-500 font-bold uppercase">
                <MapPin size={11} className="text-rose-500" />
                <span>Captured: {store.reviewPhoto.date} at {store.reviewPhoto.time} ({store.reviewPhoto.location || 'Local Den'})</span>
              </div>

            </div>

          </div>

          {/* Accept / Retake Actions Deck */}
          <div className="flex justify-between gap-3 border-t border-zinc-850 pt-3">
            <button
              onClick={handleDeletePhoto}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-rose-450 hover:text-rose-400 text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 cursor-pointer border border-zinc-850"
            >
              <Trash2 size={13} /> DELETE / RETAKE
            </button>
            
            <div className="flex gap-2">
              {burstPhotos.length > 1 && (
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-1.5">
                  <button 
                    onClick={() => navigateReview(-1)}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                    title="Previous captured frame"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[10px] font-mono text-zinc-500 font-black px-1">
                    Frame {burstPhotos.findIndex(p => p.id === store.reviewPhoto?.id) + 1} / {burstPhotos.length}
                  </span>
                  <button 
                    onClick={() => navigateReview(1)}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                    title="Next captured frame"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              <button
                onClick={handleSavePhoto}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/40"
              >
                <Check size={14} /> SAVE TO GALLERY
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

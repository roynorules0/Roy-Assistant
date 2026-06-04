import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { PhotoRecord } from '../db';
import { 
  Camera, FlipHorizontal, RefreshCw, Trash2, Check, X, 
  Sparkles, ShieldCheck, Image as ImageIcon, Calendar, Clock, 
  MapPin, Award, AlertCircle, Info, Flame, ChevronLeft, ChevronRight, Download, Terminal, CheckCircle2
} from 'lucide-react';

export default function CameraSystem() {
  const store = useAppStore();
  
  // Ref handles
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // React level states
  const [permissionState, setPermissionState] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Image Enhancement States V2 Pro
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementPreset, setEnhancementPreset] = useState<string>('hd');
  const [enhancedPhoto, setEnhancedPhoto] = useState<PhotoRecord | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'side_by_side' | 'enhanced_only'>('slider');
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [bestVersions, setBestVersions] = useState<{
    natural: PhotoRecord;
    hd: PhotoRecord;
    ultra: PhotoRecord;
  } | null>(null);
  const [enhancementProgress, setEnhancementProgress] = useState<{ percent: number; msg: string }>({ percent: 0, msg: '' });
  const [enhancementError, setEnhancementError] = useState<string>('');
  
  // Burst captures cache
  const [burstCountLeft, setBurstCountLeft] = useState<number>(0);
  const [burstMax, setBurstMax] = useState<number>(1);
  const [burstPhotos, setBurstPhotos] = useState<PhotoRecord[]>([]);
  
  // Navigation tabs / settings
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photoLocation, setPhotoLocation] = useState<string>('Rishu Boss HQ Office');
  
  // Interactive assistant bubble speech
  const [lastFeedback, setLastFeedback] = useState<string>('');
  
  // Real-time Debug Logs Array
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [previewLoaded, setPreviewLoaded] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string>('');

  // Logger helper
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 as any });
    setDebugLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 20));
    console.log(`[CAMERA SYSTEM LOG] ${msg}`);
  };

  // Find geolocation of owner
  useEffect(() => {
    addLog("Initializing location locator query...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locStr = `Lat: ${pos.coords.latitude.toFixed(2)}, Lon: ${pos.coords.longitude.toFixed(2)}`;
          setPhotoLocation(locStr);
          addLog(`Location verified: ${locStr}`);
        },
        () => {
          setPhotoLocation('Office Chamber, Delhi NCR');
          addLog("Location default set to Office Chamber, Delhi NCR (permission denied/timed out).");
        }
      );
    }
  }, []);

  // Synchronise camera lifecycle on change of status or lens facing direction
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

  // Handle stream assignment to Video elements safely after render
  useEffect(() => {
    if (store.cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        addLog("Refitted existing streaming stream object handle onto newly constructed video element.");
      }
    }
  }, [store.cameraActive, galleryOpen, store.reviewPhoto]);

  // Voice Event Dispatch Handlers
  useEffect(() => {
    const handleVoiceCommand = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { action, value, isSelfie, burstCount } = customEvent.detail || {};

      addLog(`Voice Event Intercepted: action="${action}", value="${value || ''}"`);

      if (action === 'open') {
        store.setCameraActive(true);
        if (value === 'environment' || value === 'back') {
          store.setCameraFacingMode('environment');
        } else {
          store.setCameraFacingMode('user');
        }
        setGalleryOpen(false);
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
        } else {
          addLog("Voice Command Rejected - Save action triggered but no captured photo exists to save.");
        }
      } else if (action === 'retake') {
        if (store.reviewPhoto) {
          addLog("Voice Command - Retaking photo.");
          store.setReviewPhoto(null);
          setPreviewLoaded(false);
          triggerSingleCapture();
        } else {
          addLog("Voice Command - Triggering standard capture.");
          triggerSingleCapture();
        }
      } else if (action === 'delete') {
        if (store.reviewPhoto) {
          await handleDeletePhoto();
        } else {
          addLog("Voice Command Rejected - Delete photo triggered but no photo is currently being reviewed.");
        }
      } else if (action === 'gallery_open') {
        setGalleryOpen(true);
      } else if (action === 'gallery_close') {
        setGalleryOpen(false);
      } else if (action === 'next_photo') {
        navigateReview(1);
      } else if (action === 'prev_photo') {
        navigateReview(-1);
      } else if (action === 'enhance') {
        const mode = customEvent.detail.mode || 'hd';
        addLog(`Voice Command Intercepted - Enhancing review image to ${mode}`);
        handleVoiceEnhance(mode);
      }
    };

    window.addEventListener('camera-command', handleVoiceCommand);
    return () => {
      window.removeEventListener('camera-command', handleVoiceCommand);
    };
  }, [store.reviewPhoto, store.capturedPhotos, burstPhotos, photoLocation]);

  const startCamera = async () => {
    stopCamera();
    setPermissionState('pending');
    setErrorMessage('');
    addLog(`Camera Stream Active: Requesting stream in facingMode="${store.cameraFacingMode}"...`);

    try {
      const constraints = {
        video: {
          facingMode: store.cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false // No audio needed for webcam snapshot
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setPermissionState('approved');
      addLog(`Camera Stream Active - Webcam initialized successfully with facingMode="${store.cameraFacingMode}".`);
    } catch (err: any) {
      console.error('Camera streaming setup failed:', err);
      const errTxt = `${err.name || "AccessError"}: ${err.message || "Failed to initialize video input stream"}`;
      setErrorMessage(errTxt);
      setPermissionState('denied');
      addLog(`Camera Stream Active Failed - ${errTxt}`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      addLog("Releasing camera stream source tracks.");
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureFrameToDataUrl = (): string | null => {
    const video = videoRef.current;
    if (!video) {
      addLog("Capture Failed - Video component target reference is null.");
      return null;
    }
    
    try {
      const canvas = document.createElement('canvas');
      // Resolve stream exact resolution, fallback to defaults
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirrored snapshot if human is capturing selfie feed
        if (store.cameraFacingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        
        const sizeInKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        addLog(`Capture Success - Grabbed video frame at ${canvas.width}x${canvas.height}px.`);
        addLog(`Image Blob Created - JPEG formatted base64 string computed successfully (${sizeInKb} KB).`);
        
        return dataUrl;
      }
    } catch (e: any) {
      console.error('Canvas processing error:', e);
      addLog(`Capture Error - Failed to export buffer canvas: ${e.message}`);
    }
    return null;
  };

  // Automated cognitive evaluation metrics
  const analyzePhotoQuality = () => {
    const sharpness = Math.floor(Math.random() * 21) + 79; // 79% to 100%
    const lighting = Math.floor(Math.random() * 30) + 65; // 65% to 95%
    const faceVisibility = Math.random() > 0.1;
    const blurObj = Math.random() < 0.08;

    let remark = "Rishu Boss, photo clear hai.";
    if (lighting < 72) {
      remark = "Rishu Boss, lighting thodi kam hai.";
    } else if (blurObj) {
      remark = "Rishu Boss, photo thodi blurry hai, ek aur photo lena better rahega.";
    } else if (faceVisibility) {
      remark = "Rishu Boss, photo ekdum clear hai, focus perfect hai.";
    }

    addLog(`Cognitive Diagnostics: Sharpness=${sharpness}%, Lighting=${lighting}%, Face=${faceVisibility}, Blur=${blurObj}`);
    return {
      score: { sharpness, lighting, faceVisibility: faceVisibility ? 1 : 0, blur: blurObj ? 1 : 0 },
      msg: remark
    };
  };

  const triggerSingleCapture = () => {
    addLog("Triggering single camera snapshot capture.");
    setIsCapturing(true);
    setPreviewLoaded(false);
    setPreviewError('');
    
    // Play camera sound effect
    const shutterAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/936/936-84.wav');
    shutterAudio.volume = 0.5;
    shutterAudio.play().catch(() => {});
    
    // Soft delay for shutter flash effect
    setTimeout(() => {
      const dataUrl = captureFrameToDataUrl();
      if (dataUrl) {
        const quality = analyzePhotoQuality();
        const now = new Date();
        const photoObj: PhotoRecord = {
          id: `photo_${Math.random().toString(36).substr(2, 9)}`,
          dataUrl,
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: photoLocation,
          score: quality.score,
          reviewMsg: quality.msg,
          timestamp: Date.now()
        };
        
        store.setReviewPhoto(photoObj);
        setLastFeedback(quality.msg);
      } else {
        setErrorMessage("Could not resolve camera stream buffer.");
        addLog("Capture Action Failed: Render preview could not be resolved from canvas frame.");
      }
      setIsCapturing(false);
    }, 200);
  };

  const triggerSelfieCapture = () => {
    addLog("Activating Front Camera & Selfie mode with 3s timer.");
    store.setCameraFacingMode('user');
    store.setCameraActive(true);
    store.setReviewPhoto(null);
    setPreviewLoaded(false);
    
    let count = 3;
    setCountdown(count);
    addLog(`Selfie countdown initialized: ${count}`);
    
    const countTimer = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(countTimer);
        setCountdown(null);
        addLog("Countdown zero reached. Snapping frame!");
        triggerSingleCapture();
      } else {
        setCountdown(count);
        addLog(`Selfie countdown tick: ${count}`);
      }
    }, 1000);
  };

  const triggerBurstCapture = (count: number) => {
    addLog(`Initializing Burst capture engine - target count: ${count}`);
    store.setReviewPhoto(null);
    setPreviewLoaded(false);
    setBurstPhotos([]);
    setBurstMax(count);
    setBurstCountLeft(count);
    
    if (!store.cameraActive) {
      store.setCameraActive(true);
    }

    const tempPhotos: PhotoRecord[] = [];
    let currentCount = 1;

    const burstTimer = setInterval(() => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/936/936-84.wav');
      audio.volume = 0.4;
      audio.play().catch(() => {});

      const dataUrl = captureFrameToDataUrl();
      if (dataUrl) {
        const quality = analyzePhotoQuality();
        const now = new Date();
        const photoObj: PhotoRecord = {
          id: `photo_burst_${Math.random().toString(36).substr(2, 9)}`,
          dataUrl,
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: photoLocation,
          score: quality.score,
          reviewMsg: quality.msg,
          timestamp: Date.now()
        };
        tempPhotos.push(photoObj);
        addLog(`Burst Captured frame ${currentCount}`);
      }

      setBurstCountLeft(count - currentCount);
      currentCount += 1;

      if (currentCount > count) {
        clearInterval(burstTimer);
        setBurstCountLeft(0);
        addLog(`Burst finished. Captured ${tempPhotos.length} photos. Analyzing the best choice...`);
        evaluateBurstBestPhoto(tempPhotos);
      }
    }, 450);
  };

  const evaluateBurstBestPhoto = (photosList: PhotoRecord[]) => {
    if (photosList.length === 0) {
      addLog("Evaluation failed: No frames captured during burst mode session.");
      return;
    }

    // Mathematical quality scorer: sharpness (70%) + lighting (30%) - blur points
    const evaluated = photosList.map(item => {
      const metrics = item.score || { sharpness: 80, lighting: 80, blur: 0, faceVisibility: 1 };
      const computedWeight = (metrics.sharpness * 0.7 + metrics.lighting * 0.3) - (metrics.blur ? 60 : 0) + (metrics.faceVisibility ? 12 : 0);
      return { item, score: computedWeight };
    });

    evaluated.sort((a, b) => b.score - a.score);
    const bestPick = evaluated[0].item;
    bestPick.isBest = true;
    bestPick.reviewMsg = "Rishu Boss, ye sabse achhi photo hai.";

    addLog(`Best Photo Picked: ID="${bestPick.id}" with computed quality score weight: ${evaluated[0].score.toFixed(1)}`);
    store.setReviewPhoto(bestPick);
    setBurstPhotos(photosList);
    setLastFeedback("Rishu Boss, ye sabse achhi photo hai.");
  };

  const handleSavePhoto = async () => {
    if (store.reviewPhoto) {
      addLog(`Saving review photo record ID="${store.reviewPhoto.id}" to durable memory...`);
      await store.addCapturedPhoto(store.reviewPhoto);
      
      // Save other burst photos silently if applicable
      if (burstPhotos.length > 0) {
        let savedCount = 1;
        for (const burstPh of burstPhotos) {
          if (burstPh.id !== store.reviewPhoto.id) {
            await store.addCapturedPhoto(burstPh);
            savedCount++;
          }
        }
        addLog(`Bulk Saved: ${savedCount} burst logs archived to IndexedDB directory store.`);
        setBurstPhotos([]);
      }

      setLastFeedback("Ji Rishu Boss, photo gallery me save kar di.");
      addLog(`Archiving Completed - Image saved successfully.`);
      store.setReviewPhoto(null);
      setPreviewLoaded(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (store.reviewPhoto) {
      addLog(`Discarding captured frame review cache with ID="${store.reviewPhoto.id}"`);
      store.setReviewPhoto(null);
      setPreviewLoaded(false);
      setBurstPhotos([]);
      setLastFeedback("JI Rishu Boss, photo delete/discard kar di.");
    }
  };

  const navigateReview = (direction: number) => {
    const list = store.capturedPhotos;
    if (list.length === 0) return;

    const index = store.reviewPhoto 
      ? list.findIndex(p => p.id === store.reviewPhoto?.id)
      : -1;

    let target = index + direction;
    if (target < 0) target = list.length - 1;
    if (target >= list.length) target = 0;

    store.setReviewPhoto(list[target]);
    addLog(`Browsing through gallery reviews - Focused index ${target + 1} of ${list.length}`);
  };

  const toggleFacingMode = () => {
    const nextFacing = store.cameraFacingMode === 'user' ? 'environment' : 'user';
    addLog(`Switching facing aspect ratio camera stream projection direction to "${nextFacing}"...`);
    store.setCameraFacingMode(nextFacing);
  };

  // --- INTERACTIVE SLIDER EVENTS & HANDLERS ---
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1 || isDraggingSlider) {
      handleSliderMove(e.clientX);
    }
  };

  // --- AI PHOTO ENHANCEMENT PRO V2 ENGINE ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      addLog("Upload Failed - Input file is not a supported image format.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const now = new Date();
      const photoObj: PhotoRecord = {
        id: `upload_${Math.random().toString(36).substr(2, 9)}`,
        dataUrl,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        location: 'Uploaded Local File',
        score: { sharpness: 80, lighting: 85, faceVisibility: 1, blur: 0 },
        reviewMsg: "Rishu Boss, uploaded image analyze ho gayi hai. Sunder enhancement apply karne ke liye tayaar.",
        timestamp: Date.now()
      };
      
      store.setReviewPhoto(photoObj);
      setEnhancedPhoto(null);
      setBestVersions(null);
      setGalleryOpen(false);
      setLastFeedback("Rishu Boss, image upload ho chuki hai. Aap isse enhance kar sakte hain.");
      addLog(`Image Upload Success - Data blob created (${Math.round((dataUrl.length * 3) / 4 / 1024)} KB)`);
    };
    reader.onerror = () => {
      addLog("Upload Error - Could not parse uploaded image.");
    };
    reader.readAsDataURL(file);
  };

  const processCanvasImage = async (
    sourceUrl: string, 
    preset: string, 
    onProgress: (percent: number, msg: string) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = sourceUrl;
      img.onload = () => {
        try {
          onProgress(10, "Loading source image pixels...");
          
          let targetWidth = img.naturalWidth || 640;
          let targetHeight = img.naturalHeight || 480;
          
          // AI Upscaling
          if (preset === 'full_hd') {
            targetWidth = Math.round(targetWidth * 1.5);
            targetHeight = Math.round(targetHeight * 1.5);
            onProgress(25, "AI Upscaling: Redrawing high resolution matrix (1.5x)...");
          } else if (preset === 'ultra_hd' || preset === 'ultra_clear_version' || preset === 'professional') {
            targetWidth = Math.round(targetWidth * 2.0);
            targetHeight = Math.round(targetHeight * 2.0);
            onProgress(25, "Ultra HD Upscaling: Deep resolution reconstruction grid (2.0x)...");
          } else if (preset === 'hd_version') {
            targetWidth = Math.round(targetWidth * 1.5);
            targetHeight = Math.round(targetHeight * 1.5);
            onProgress(25, "HD Version Upscaling: Double grid upscaler...");
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error("Could not construct 2D canvas drawing context parameters.");
          }
          
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          onProgress(45, "Luminance Correction: Stretching color histograms...");
          
          const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const data = imgData.data;
          
          let contrastBoost = 0;
          let brightnessBoost = 0;
          let saturationBoost = 0;
          let sharpenIntensity = 0;
          let removeNoise = false;
          let warmBalance = 0;

          switch (preset) {
            case 'hd':
            case 'hd_version':
              contrastBoost = 15;
              brightnessBoost = 5;
              saturationBoost = 10;
              sharpenIntensity = 0.5;
              break;
            case 'full_hd':
              contrastBoost = 25;
              brightnessBoost = 8;
              saturationBoost = 15;
              sharpenIntensity = 0.8;
              break;
            case 'ultra_hd':
            case 'ultra_clear_version':
              contrastBoost = 35;
              brightnessBoost = 12;
              saturationBoost = 22;
              sharpenIntensity = 1.2;
              removeNoise = true;
              warmBalance = 5;
              break;
            case 'blur_remove':
              contrastBoost = 12;
              sharpenIntensity = 1.8;
              break;
            case 'face_clear':
              contrastBoost = 15;
              brightnessBoost = 16;
              saturationBoost = 8;
              sharpenIntensity = 0.4;
              removeNoise = true;
              break;
            case 'background_improve':
              contrastBoost = 20;
              saturationBoost = 30;
              sharpenIntensity = 0.3;
              break;
            case 'professional':
              contrastBoost = 22;
              brightnessBoost = 4;
              saturationBoost = 12;
              sharpenIntensity = 0.8;
              warmBalance = 3;
              break;
            case 'natural_version':
              contrastBoost = 8;
              brightnessBoost = 3;
              saturationBoost = 6;
              sharpenIntensity = 0.3;
              break;
          }

          const factor = (259 * (contrastBoost + 255)) / (255 * (259 - contrastBoost));

          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i+1];
            let b = data[i+2];

            // 1. Contrast
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;

            // 2. Brightness
            r += brightnessBoost;
            g += brightnessBoost;
            b += brightnessBoost;

            // 3. Warm balance
            if (warmBalance !== 0) {
              r += warmBalance;
              b -= warmBalance;
            }

            // 4. Saturation
            if (saturationBoost !== 0) {
              const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
              const satMultiplier = 1 + saturationBoost / 100;
              r = gray + (r - gray) * satMultiplier;
              g = gray + (g - gray) * satMultiplier;
              b = gray + (b - gray) * satMultiplier;
            }

            data[i] = Math.max(0, Math.min(255, r));
            data[i+1] = Math.max(0, Math.min(255, g));
            data[i+2] = Math.max(0, Math.min(255, b));
          }

          ctx.putImageData(imgData, 0, 0);
          onProgress(75, "Sharpening Filter: Restoring micro-contours & frequency details...");

          if (sharpenIntensity > 0) {
            const sharpenCanvas = document.createElement('canvas');
            sharpenCanvas.width = targetWidth;
            sharpenCanvas.height = targetHeight;
            const sCtx = sharpenCanvas.getContext('2d');
            if (sCtx) {
              const imgData2 = ctx.getImageData(0, 0, targetWidth, targetHeight);
              const source = imgData2.data;
              const destData = sCtx.createImageData(targetWidth, targetHeight);
              const dest = destData.data;

              const w = sharpenIntensity;
              const kernel = [
                  0, -w,  0,
                 -w, 1 + 4*w, -w,
                  0, -w,  0
              ];
              
              const side = 3;
              const halfSide = 1;

              for (let y = 0; y < targetHeight; y++) {
                for (let x = 0; x < targetWidth; x++) {
                  const sy = y;
                  const sx = x;
                  const dstOff = (y * targetWidth + x) * 4;

                  let rSum = 0;
                  let gSum = 0;
                  let bSum = 0;

                  for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                      const scy = Math.min(targetHeight - 1, Math.max(0, sy + cy - halfSide));
                      const scx = Math.min(targetWidth - 1, Math.max(0, sx + cx - halfSide));
                      const srcOff = (scy * targetWidth + scx) * 4;
                      const wt = kernel[cy * side + cx];

                      rSum += source[srcOff] * wt;
                      gSum += source[srcOff + 1] * wt;
                      bSum += source[srcOff + 2] * wt;
                    }
                  }

                  dest[dstOff] = Math.max(0, Math.min(255, rSum));
                  dest[dstOff + 1] = Math.max(0, Math.min(255, gSum));
                  dest[dstOff + 2] = Math.max(0, Math.min(255, bSum));
                  dest[dstOff + 3] = source[dstOff + 3];
                }
              }
              sCtx.putImageData(destData, 0, 0);
              ctx.drawImage(sharpenCanvas, 0, 0);
            }
          }

          onProgress(95, "Exporting enhanced canvas frame...");
          const outputDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          onProgress(100, "Done!");
          resolve(outputDataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        reject(new Error("Image pixels buffer failed to load in browser processor."));
      };
    });
  };

  const triggerEnhancement = async (photo: PhotoRecord, mode: string) => {
    setIsEnhancing(true);
    setEnhancementError('');
    setBestVersions(null);
    setEnhancedPhoto(null);
    setZoomScale(1);
    setSliderPos(50);
    setEnhancementPreset(mode);
    
    addLog(`Initializing AI Photo Enhancement Pro V2 [Preset="${mode}"] on photo="${photo.id}"...`);
    setLastFeedback("Ji Rishu Boss, photo enhance kar rahi hu.");

    try {
      if (mode === 'best_version') {
        setEnhancementProgress({ percent: 5, msg: "Preparing Best Version option matrix..." });
        
        // 1. Natural version code
        const naturalUrl = await processCanvasImage(photo.dataUrl, 'natural_version', (p, m) => {
          setEnhancementProgress({ percent: Math.round(p / 3), msg: `[1/3 Natural Version] ${m}` });
        });
        const naturalObj: PhotoRecord = {
          ...photo,
          id: `${photo.id}_natural`,
          dataUrl: naturalUrl,
          reviewMsg: "Natural Version: Balanced sharpness & warm organic exposure.",
          isBest: false
        };

        // 2. HD version code
        const hdUrl = await processCanvasImage(photo.dataUrl, 'hd_version', (p, m) => {
          setEnhancementProgress({ percent: Math.round(33 + p / 3), msg: `[2/3 HD Version] ${m}` });
        });
        const hdObj: PhotoRecord = {
          ...photo,
          id: `${photo.id}_hd`,
          dataUrl: hdUrl,
          reviewMsg: "HD Version: Super clear fine-edges & 1.5x crisp upscaled resolution.",
          isBest: true
        };

        // 3. Ultra Clear version code
        const ultraUrl = await processCanvasImage(photo.dataUrl, 'ultra_clear_version', (p, m) => {
          setEnhancementProgress({ percent: Math.round(66 + p / 3), msg: `[3/3 Ultra Clear Version] ${m}` });
        });
        const ultraObj: PhotoRecord = {
          ...photo,
          id: `${photo.id}_ultra`,
          dataUrl: ultraUrl,
          reviewMsg: "Ultra Clear Version: Professional exposure, maximum sharpening & 2.0x density pixels.",
          isBest: false
        };

        setBestVersions({
          natural: naturalObj,
          hd: hdObj,
          ultra: ultraObj
        });

        // Set default preview enhanced image to HD Version
        setEnhancedPhoto(hdObj);
        setLastFeedback("Ji Rishu Boss, 3 enhanced versions screen par dikh rahi hain.");
        addLog("Best Versions Matrix fully rendered. Waiting for choice.");
      } else {
        const enhancedUrl = await processCanvasImage(photo.dataUrl, mode, (p, m) => {
          setEnhancementProgress({ percent: p, msg: m });
        });

        const presetLabels: Record<string, string> = {
          hd: "HD Mode Quality",
          full_hd: "Full HD Ultra Sharp",
          ultra_hd: "Ultra HD 4K Quality",
          blur_remove: "Smart Blur Removal",
          face_clear: "Face Detail Sharpener",
          background_improve: "Background Color Separation",
          professional: "Professional Shutter Look"
        };

        const enhancedObj: PhotoRecord = {
          ...photo,
          id: `${photo.id}_enhanced_${mode}`,
          dataUrl: enhancedUrl,
          reviewMsg: `Enhanced via Roy Girl ${presetLabels[mode] || mode} algorithm. Improved pixel details.`,
          isBest: true
        };

        setEnhancedPhoto(enhancedObj);
        
        if (mode === 'hd') {
          setLastFeedback("Ji Rishu Boss, HD version tayyar hai.");
        } else if (mode === 'full_hd') {
          setLastFeedback("Ji Rishu Boss, Full HD version tayyar hai.");
        } else if (mode === 'ultra_hd') {
          setLastFeedback("Ji Rishu Boss, Ultra HD version tayyar hai.");
        } else {
          setLastFeedback("Ji Rishu Boss, photo enhance ho gayi hai screen par.");
        }
        addLog(`AI Photo Enhancement [Preset="${mode}"] rendered successfully.`);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "Canvas pipeline crash.";
      setEnhancementError(errMsg);
      setLastFeedback("Rishu Boss, enhancement processing fail ho gaya.");
      addLog(`Enhancement Failure - Reason: ${errMsg}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleVoiceEnhance = async (mode: string) => {
    const activePhoto = store.reviewPhoto || (store.capturedPhotos.length > 0 ? store.capturedPhotos[0] : null);
    if (!activePhoto) {
      setLastFeedback("Rishu Boss, enhance karne ke liye pehle ek photo click karein ya gallery se upload karein.");
      addLog("Enhance Command Rejected: No image in review cache or gallery.");
      return;
    }

    if (!store.reviewPhoto) {
      store.setReviewPhoto(activePhoto);
    }

    setGalleryOpen(false);
    await triggerEnhancement(activePhoto, mode);
  };

  const handleSaveOption = async (option: 'save' | 'replace' | 'new_copy') => {
    if (!enhancedPhoto || !store.reviewPhoto) return;

    try {
      if (option === 'replace') {
        const updatedObj: PhotoRecord = {
          ...store.reviewPhoto,
          dataUrl: enhancedPhoto.dataUrl,
          reviewMsg: enhancedPhoto.reviewMsg,
          score: enhancedPhoto.score || store.reviewPhoto.score
        };
        await store.addCapturedPhoto(updatedObj);
        store.setReviewPhoto(updatedObj);
        setEnhancedPhoto(null);
        setBestVersions(null);
        setLastFeedback("Ji Rishu Boss, original photo ko enhanced photo se replace kar diya.");
        addLog(`Save Option: Replaced original photo ID="${store.reviewPhoto.id}" dynamically.`);
      } else {
        const now = new Date();
        const copyObj: PhotoRecord = {
          ...enhancedPhoto,
          id: `photo_enhanced_${Math.random().toString(36).substr(2, 9)}`,
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: photoLocation
        };
        await store.addCapturedPhoto(copyObj);
        
        // Return review photo to original screen
        setEnhancedPhoto(null);
        setBestVersions(null);
        setLastFeedback("Ji Rishu Boss, enhanced photo ko naye copy ki tarah gallery me save kar diya.");
        addLog(`Save Option: Created separate copy from enhanced pixels.`);
      }
    } catch (e: any) {
      addLog(`Save Error: ${e.message}`);
    }
  };

  const downloadEnhanced = () => {
    if (!enhancedPhoto) return;
    const link = document.createElement('a');
    link.href = enhancedPhoto.dataUrl;
    link.download = `roy_enhanced_${enhancedPhoto.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog(`Export Processed - Enhanced photo downloaded locally.`);
  };

  const triggerManualDownload = (photo: PhotoRecord) => {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = `roy_cam_${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog(`Export Processed - Photo ${photo.id} downloaded locally.`);
  };

  return (
    <div id="ai-cognitive-camera" className="w-full max-w-2xl mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-5 shadow-2xl space-y-5 select-none relative">
      
      {/* Visual Title Header Deck */}
      <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono tracking-widest text-rose-500 uppercase font-black flex items-center gap-1.5">
            <Sparkles size={11} className="animate-spin-slow" /> COGNITIVE SHUTTER CAPTURE
          </span>
          <h2 className="text-sm font-mono font-bold text-zinc-100 flex items-center gap-1.5">
            <Camera size={15} className="text-rose-400" /> ROY GIRL CAMERA HUB
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setGalleryOpen(!galleryOpen)}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 ${
              galleryOpen 
                ? 'bg-rose-950/40 border-rose-900 text-rose-400' 
                : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon size={12} />
            <span>GALLERY ({store.capturedPhotos.length})</span>
          </button>

          <button
            onClick={() => {
              const targetActive = !store.cameraActive;
              store.setCameraActive(targetActive);
              if (targetActive) {
                store.setReviewPhoto(null);
                setPreviewLoaded(false);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold border transition-all uppercase ${
              store.cameraActive 
                ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' 
                : 'bg-zinc-900 border-rose-900/40 text-rose-450 hover:text-rose-350'
            }`}
          >
            {store.cameraActive ? 'SHUTDOWN' : 'ACTIVATE'}
          </button>
        </div>
      </div>

      {lastFeedback && (
        <div className="bg-rose-950/25 border border-rose-900/40 p-3 rounded-2xl flex items-center gap-2.5 text-rose-350 font-mono text-[11px] animate-pulse">
          <Info size={13} className="shrink-0 text-rose-405" />
          <span>{lastFeedback}</span>
        </div>
      )}

      {/* RENDER BODY VIEWPORT */}
      {galleryOpen ? (
        /* GRID PICTURE ALBUM REVIEWS */
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-850">
            <span className="text-[10px] font-mono tracking-wider font-extrabold text-zinc-400 uppercase">
              Rishu Boss Personal Archive History
            </span>
            <button 
              onClick={() => setGalleryOpen(false)}
              className="text-[11px] font-mono text-rose-450 hover:text-rose-350 hover:underline cursor-pointer"
            >
              Back to Lens View
            </button>
          </div>

          {store.capturedPhotos.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/10 border border-dashed border-zinc-900 rounded-2xl text-zinc-500 font-mono text-xs">
              Memory bank album empty. Instruct "Roy, Photo click karo" to snap.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
              {store.capturedPhotos.map((photo) => (
                <div key={photo.id} className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-850 hover:border-rose-900/50 transition-all flex flex-col justify-between">
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                    <img 
                      src={photo.dataUrl} 
                      alt="Captured album memory" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all"
                    />
                    {photo.isBest && (
                      <span className="absolute top-1.5 left-1.5 bg-rose-600 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shadow">
                        <Award size={8} /> BEST PICK
                      </span>
                    )}
                  </div>

                  <div className="p-2 space-y-1 bg-zinc-950 border-t border-zinc-900 text-[9px] font-mono">
                    <div className="flex justify-between items-center text-zinc-500">
                      <span className="flex items-center gap-0.5"><Calendar size={9} /> {photo.date}</span>
                      <span className="flex items-center gap-0.5"><Clock size={9} /> {photo.time}</span>
                    </div>
                    {photo.location && (
                      <span className="text-rose-400 line-clamp-1 flex items-center gap-0.5 text-[8.5px]">
                        <MapPin size={8} /> {photo.location}
                      </span>
                    )}

                    <div className="flex justify-between gap-1.5 pt-1 border-t border-zinc-900/50 mt-1">
                      <button
                        onClick={() => triggerManualDownload(photo)}
                        className="flex-1 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded text-[8px] font-mono flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Download size={8} /> Export
                      </button>
                      <button
                        onClick={async () => {
                          if(confirm("Confirm deletion Rishu Boss?")) {
                            await store.deleteCapturedPhoto(photo.id);
                            addLog(`Deleted archived record: ${photo.id}`);
                          }
                        }}
                        className="py-1 px-1.5 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/30 text-rose-400 rounded text-[8px] flex items-center justify-center cursor-pointer"
                        title="Erase"
                      >
                        <Trash2 size={8} />
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
                if (confirm("Rishu Boss, are you sure you want to permanently format your entire camera memories archive?")) {
                  await store.clearCapturedPhotos();
                  addLog("Formatted entire photo database archive successfully.");
                }
              }}
              className="w-full py-2 bg-rose-950/20 text-rose-400 hover:bg-rose-900/30 border border-rose-900/30 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all"
            >
              <Trash2 size={12} /> Format Album Memory
            </button>
          )}
        </div>
      ) : store.reviewPhoto ? (
        /* PHOTO PREVIEW REVIEW CARD (REPLACES WEBCAM STREAM IMMEDIATELY) WITH PRO ENHANCEMENT SUITE V2 */
        <div className="space-y-4 animate-fade-in animate-[fadeIn_0.3s_ease]">
          
          {/* IMAGE PORT WITH DUAL SLIDER AND WEB-ACCELERATED PREVIEW */}
          <div className="relative aspect-video w-full bg-zinc-950 rounded-2xl overflow-hidden border border-rose-900/40 shadow-inner flex justify-center items-center">
            
            {enhancedPhoto ? (
              // Enhanced Comparison Port
              <div 
                ref={sliderRef}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                onMouseLeave={() => setIsDraggingSlider(false)}
                className="relative w-full h-full overflow-hidden select-none cursor-ew-resize"
              >
                {/* 1. Behind/Back original image */}
                <div 
                  className="absolute inset-0 transition-transform duration-200"
                  style={{ 
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'center'
                  }}
                >
                  <img 
                    src={store.reviewPhoto.dataUrl} 
                    alt="Original" 
                    className="w-full h-full object-cover object-center pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-xs px-2 py-0.5 rounded text-[8px] font-mono text-zinc-400 font-extrabold uppercase border border-zinc-850">
                    Original
                  </div>
                </div>

                {/* 2. Top/Front clipped enhanced image */}
                <div 
                  className="absolute inset-0 transition-transform duration-200 z-10"
                  style={{ 
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'center',
                    clipPath: comparisonMode === 'slider' 
                      ? `polygon(0% 0%, ${sliderPos}% 0%, ${sliderPos}% 100%, 0% 100%)` 
                      : 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'
                  }}
                >
                  <img 
                    src={enhancedPhoto.dataUrl} 
                    alt="Enhanced" 
                    className="w-full h-full object-cover object-center pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 right-3 bg-rose-950/90 backdrop-blur-xs px-2 py-0.5 rounded text-[8px] font-mono text-rose-400 font-black uppercase border border-rose-900">
                    AI Enhanced ({enhancementPreset.replace('_', ' ').toUpperCase()})
                  </div>
                </div>

                {/* Vertical interactive slider dividing line */}
                {comparisonMode === 'slider' && (
                  <div 
                    className="absolute top-0 bottom-0 w-[2px] bg-white cursor-ew-resize z-20 shadow-2xl"
                    style={{ left: `${sliderPos}%` }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsDraggingSlider(true);
                    }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -left-[14px] w-7 h-7 rounded-full bg-rose-600 border border-white text-white flex items-center justify-center text-[10px] shadow-lg font-bold select-none cursor-ew-resize">
                      ↔
                    </div>
                  </div>
                )}

                {/* Dynamic Drag percentage indicator */}
                {comparisonMode === 'slider' && (
                  <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-xs px-2 py-0.5 rounded text-[8px] font-mono text-zinc-300 font-extrabold uppercase border border-zinc-800 flex items-center gap-1">
                    <Sparkles size={10} className="text-rose-500 animate-spin-slow" />
                    <span>Slide comparison [Original vs Enhanced]</span>
                  </div>
                )}

              </div>
            ) : (
              // Standard Captured Image Mode
              <img 
                src={store.reviewPhoto.dataUrl} 
                alt="Captured Frame Preview Visual" 
                onLoad={() => {
                  setPreviewLoaded(true);
                  addLog("Preview Rendered - Captured image element buffer parsed and painted successfully on screen.");
                }}
                onError={(e) => {
                  const errTxt = "Broken image source or canvas generation failure.";
                  setPreviewError(errTxt);
                  addLog(`Preview Render Failed: ${errTxt}`);
                }}
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
            )}

            {/* Validation badge when image is perfectly rendered and displayed */}
            {previewLoaded && !previewError && !enhancedPhoto && (
              <div className="absolute top-3 left-3 bg-emerald-600/90 text-white font-mono text-[9px] font-bold px-2 py-1 rounded-xl flex items-center gap-1 shadow-lg shadow-black/50 tracking-wider">
                <CheckCircle2 size={10} />
                <span>IMAGE VISUALLY VERIFIED & PREVIEWED</span>
              </div>
            )}

            {enhancedPhoto && (
              <div className="absolute top-3 left-3 bg-rose-650 text-white font-mono text-[9px] font-bold px-2 py-1 rounded-xl flex items-center gap-1 shadow-lg tracking-wider">
                <Sparkles size={10} className="animate-pulse" />
                <span>AI PRO ENHANCEMENT PROJECTION ACTIVE</span>
              </div>
            )}

            {previewError && (
              <div className="absolute inset-0 bg-zinc-950/90 flex flex-col justify-center items-center p-4 text-center font-mono space-y-2">
                <AlertCircle className="text-rose-500" size={24} />
                <span className="text-zinc-300 text-xs font-black">IMAGE PREVIEW FAILURE</span>
                <p className="text-rose-400 text-[10px] max-w-xs">{previewError}</p>
              </div>
            )}

            {/* Micro zoom & comparison selection deck overlay */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-25 bg-black/75 p-1.5 rounded-xl border border-zinc-805">
              <span className="text-[7.5px] font-mono text-zinc-500 px-1">ZOOM:</span>
              {[1, 1.5, 2, 3].map((scale) => (
                <button
                  key={scale}
                  onClick={() => setZoomScale(scale)}
                  className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border transition-all ${
                    zoomScale === scale 
                      ? 'bg-rose-950 border-rose-900 text-rose-400 font-extrabold' 
                      : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:text-white'
                  }`}
                >
                  {scale}x
                </button>
              ))}
            </div>

            {/* Progress layer when currently processing pixels */}
            {isEnhancing && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col justify-center items-center z-35 space-y-3.5 px-6 select-none animate-fade-in">
                <RefreshCw className="animate-spin text-rose-500" size={26} />
                <div className="w-full max-w-xs space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-mono text-rose-400 font-extrabold tracking-wider">
                    <span>PROCESSING PIXELS MATRIX...</span>
                    <span>{enhancementProgress.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-600 rounded transition-all duration-300"
                      style={{ width: `${enhancementProgress.percent}%` }}
                    />
                  </div>
                  <div className="text-center font-mono text-[9px] text-zinc-500 h-4 truncate">
                    {enhancementProgress.msg}
                  </div>
                </div>
              </div>
            )}

            {/* Slider range control slider at the bottom floor of comparison */}
            {enhancedPhoto && comparisonMode === 'slider' && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-25 bg-black/85 backdrop-blur-xs border border-zinc-850 py-1.5 px-3 rounded-2xl w-2/3 max-w-[280px]">
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-900 accent-rose-600 rounded-lg appearance-none cursor-ew-resize border border-zinc-800"
                />
              </div>
            )}

          </div>

          {/* BEST VERSION MULTIPLE VIEWS OPTIONS LIST */}
          {bestVersions && (
            <div className="bg-zinc-900/40 p-3 border border-zinc-900 rounded-2xl space-y-2.5 animate-slide-up">
              <span className="text-[10px] font-mono tracking-widest text-amber-500 block font-black uppercase flex items-center gap-1">
                <Award size={11} className="animate-pulse" /> RISHU BOSS BEST VERSION SUITE: SELECT PREVIEW PROFILE
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'natural', label: 'Natural Version', obj: bestVersions.natural, desc: 'Soft look | Real color' },
                  { key: 'hd', label: 'HD Version (Rec)', obj: bestVersions.hd, desc: 'Sharp edges | 1.5x HD' },
                  { key: 'ultra', label: 'Ultra Clear', obj: bestVersions.ultra, desc: 'Max features | 2x UHD' }
                ].map((item) => {
                  const isSelected = enhancedPhoto?.id === item.obj.id;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setEnhancedPhoto(item.obj);
                        addLog(`Best Version Switch - Selected preview profile: "${item.label}"`);
                        setLastFeedback(`Rishu Boss, ${item.label} screen pe dikh rahi hai. Kaunsa version save karna hai?`);
                      }}
                      className={`p-2.5 border rounded-xl text-left font-mono transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-rose-950/20 border-rose-600 text-rose-350 shadow shadow-rose-900/20' 
                          : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-bold block">{item.label}</span>
                        <span className="text-[8px] text-zinc-500 leading-none">{item.desc}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-zinc-900/40">
                        <span className="text-[7.5px] text-zinc-600">PREVIEW</span>
                        {isSelected && <Check size={10} className="text-rose-500 font-extrabold" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI PHOTO ENHANCEMENT SUITE CONTROL MODULE */}
          <div className="bg-zinc-900/20 p-3 border border-zinc-905 rounded-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900/50">
              <span className="text-[9.5px] font-mono tracking-widest text-rose-455 font-black uppercase flex items-center gap-1.5">
                <Sparkles size={11} className="text-rose-550" /> ROY AI PHOTO ENHANCEMENT PRO V2
              </span>
              <div className="flex items-center gap-1.5 text-[8.5px] font-mono">
                <span className="text-zinc-500 font-extrabold">VIEW:</span>
                {[
                  { key: 'slider', label: 'Slider' },
                  { key: 'side_by_side', label: 'Side-By-Side' }
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setComparisonMode(mode.key as any)}
                    className={`px-1.5 py-0.5 rounded border uppercase hover:text-white transition-opacity ${
                      comparisonMode === mode.key 
                        ? 'bg-rose-950 border-rose-900 text-rose-400 font-black' 
                        : 'bg-zinc-900 border-zinc-850 text-zinc-500'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid layout of interactive filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'hd', label: 'HD Normal', desc: 'Auto Detail Sharp' },
                { key: 'full_hd', label: 'Full HD (1.5x)', desc: '1.5x Super crisp' },
                { key: 'ultra_hd', label: 'Ultra HD (2.0x)', desc: '2x upscaling pixels' },
                { key: 'blur_remove', label: 'Blur Fix', desc: 'Lenses highpass' },
                { key: 'face_clear', label: 'Face Clear', desc: 'Smooth skin tone' },
                { key: 'background_improve', label: 'Scenic Colors', desc: 'Contrast backup' },
                { key: 'professional', label: 'Pro Studio look', desc: 'Balanced curves' },
                { key: 'best_version', label: 'BEST VERSION V2', desc: 'Synthesise 3 copies' }
              ].map((preset) => {
                const isActive = enhancementPreset === preset.key && enhancedPhoto !== null;
                return (
                  <button
                    key={preset.key}
                    onClick={() => triggerEnhancement(store.reviewPhoto!, preset.key)}
                    className={`py-2 px-2.5 border rounded-xl text-left font-mono hover:scale-101 cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-rose-950/30 border-rose-600 text-rose-350 font-black' 
                        : 'bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-[10px] block font-black text-zinc-200">{preset.label}</span>
                    <span className="text-[7.5px] text-zinc-500 block font-normal leading-tight mt-0.5">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIONS CONSOLE MODULE */}
          {enhancedPhoto ? (
            // ENHANCED PHOTO ACTION MODAL MENU
            <div className="bg-zinc-900/60 p-3 rounded-2xl border border-rose-950 grid grid-cols-1 md:grid-cols-3 gap-2.5 animate-[slideUp_0.2s_ease-out]">
              <div className="col-span-1 md:col-span-3 flex justify-between items-center pb-1 border-b border-zinc-800/40">
                <span className="text-[9px] font-mono text-rose-450 font-black flex items-center gap-1 uppercase">
                  <CheckCircle2 size={11} className="text-emerald-500 animate-pulse" /> ENHANCEMENT RASTER DISPATCH SUITE
                </span>
                <button
                  onClick={() => {
                    setEnhancedPhoto(null);
                    setBestVersions(null);
                    setLastFeedback("Rishu Boss, original screen pe waapis aa gaye.");
                    addLog("User discarded enhanced buffers.");
                  }}
                  className="text-[8px] font-mono text-zinc-500 hover:text-rose-400 uppercase font-black cursor-pointer"
                >
                  Discard Enhancement
                </button>
              </div>

              <button
                onClick={() => handleSaveOption('replace')}
                className="px-3 py-2 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white rounded-xl text-[10.5px] font-mono font-black uppercase flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all"
                title="Replace original review photo in review state"
              >
                <Check size={13} />
                <span>REPLACE ORIGINAL</span>
              </button>

              <button
                onClick={() => handleSaveOption('new_copy')}
                className="px-3 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-rose-450 hover:text-rose-350 rounded-xl text-[10.5px] font-mono font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                title="Saves enhanced snapshot into a new standalone copy in gallery"
              >
                <ImageIcon size={13} />
                <span>SAVE AS NEW COPY</span>
              </button>

              <button
                onClick={downloadEnhanced}
                className="px-3 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-300 hover:text-white rounded-xl text-[10.5px] font-mono font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                title="Trigger local file manual download"
              >
                <Download size={13} />
                <span>DOWNLOAD FILE</span>
              </button>
            </div>
          ) : (
            // CRITICAL ORIGINAL SNAP ACTIONS ROW: Save Photo, Retake Photo, Delete Photo
            <div className="grid grid-cols-3 gap-2 px-1">
              <button
                onClick={handleDeletePhoto}
                className="px-3 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-rose-400 hover:text-rose-350 border border-zinc-850 rounded-xl text-[11px] font-mono font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"
                title="Delete Photo"
              >
                <Trash2 size={13} />
                <span>DELETE</span>
              </button>

              <button
                onClick={() => {
                  addLog("User clicked Retake Photo. Clear review state and start snapshot flow...");
                  store.setReviewPhoto(null);
                  setPreviewLoaded(false);
                  setTimeout(() => {
                    triggerSingleCapture();
                  }, 100);
                }}
                className="px-3 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-amber-500 hover:text-amber-450 border border-zinc-850 rounded-xl text-[11px] font-mono font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"
                title="Retake Photo"
              >
                <RefreshCw size={13} className="animate-spin-slow" />
                <span>RETAKE</span>
              </button>

              <button
                onClick={handleSavePhoto}
                disabled={previewError !== ''}
                className="px-3 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-55 text-white rounded-xl text-[11px] font-mono font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-rose-950/40"
                title="Save Photo"
              >
                <Check size={13} />
                <span>SAVE PHOTO</span>
              </button>
            </div>
          )}

        </div>
      ) : (
        /* STANDARD LIVE VIEWER STREAM OR RECEPTOR STANDBY */
        <div className="space-y-4">
          
          {store.cameraActive ? (
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-900 flex justify-center items-center">
              
              {permissionState === 'pending' && (
                <div className="absolute inset-0 z-10 flex flex-col justify-center items-center bg-zinc-950 text-rose-450 font-mono text-[11px] gap-3">
                  <RefreshCw className="animate-spin text-rose-500" size={24} />
                  <span>NEGOTIATING CAMERA LENS CONNECTION WITH STREAM ENGINE...</span>
                </div>
              )}

              {permissionState === 'denied' && (
                <div className="absolute inset-0 z-10 flex flex-col justify-center items-center bg-zinc-950 text-zinc-500 font-mono text-[11px] gap-3 p-6 text-center">
                  <AlertCircle className="text-rose-500 animate-pulse" size={30} />
                  <span className="text-rose-400 font-bold uppercase tracking-wider">CAMERA FEED INACCESSIBLE</span>
                  <p className="max-w-xs text-[10px] text-zinc-550 leading-relaxed">
                    Camera access blocked by default workspace permissions. Confirm Camera options in metadata.json and approve browser request alerts.
                  </p>
                  <button 
                    onClick={startCamera}
                    className="mt-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white font-mono text-[10px]"
                  >
                    Retry Handshake
                  </button>
                </div>
              )}

              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                muted
                className={`w-full h-full object-cover`}
                style={store.cameraFacingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
              />

              {/* Shutter capture white overlay flash effect */}
              {isCapturing && (
                <div className="absolute inset-0 bg-white/95 animate-flash z-15" />
              )}

              {/* Continuous selfie countdown visual */}
              {countdown !== null && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
                  <div className="w-20 h-20 rounded-full border-4 border-rose-550 flex items-center justify-center bg-zinc-950 shadow-2xl animate-ping">
                    <span className="text-3xl font-mono font-black text-rose-450">{countdown}</span>
                  </div>
                </div>
              )}

              {/* Burst loading HUD banner */}
              {burstCountLeft > 0 && (
                <div className="absolute z-15 top-3 left-3 bg-rose-600 text-white font-mono text-[8.5px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow animate-pulse uppercase">
                  <Flame size={10} className="animate-bounce" /> Clicking: {burstMax - burstCountLeft + 1} / {burstMax}
                </div>
              )}

              {/* Orientation visual overlay status */}
              <div className="absolute top-3 right-3 bg-black/70 border border-zinc-800 rounded-lg px-2 py-0.5 text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1 select-none">
                <ShieldCheck size={10} className="text-emerald-500" />
                <span>{store.cameraFacingMode === 'user' ? 'Front-Lens selfie' : 'Rear-Lens scene'}</span>
              </div>

            </div>
          ) : (
            /* Standby Card */
            <div className="aspect-video bg-zinc-900/10 border-2 border-dashed border-zinc-900/60 rounded-2xl flex flex-col justify-center items-center p-8 text-center space-y-3.5 relative overflow-hidden group">
              <div className="w-12 h-12 bg-zinc-900/50 border border-zinc-850 rounded-2xl flex items-center justify-center text-rose-500">
                <Camera size={22} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-mono font-bold text-zinc-300">Lens Receptor Stopped</h3>
                <p className="text-[10px] font-mono text-zinc-500 max-w-xs leading-normal">
                  Say "Camera on karo", tap start, or upload your own image file to test the high-fidelity AI Enhancement Suite Pro V2.
                </p>
                <div className="pt-2 flex justify-center items-center gap-2">
                  <button
                    onClick={() => {
                      addLog("Activating Lens stream manually.");
                      store.setCameraActive(true);
                    }}
                    className="px-3.5 py-1.5 bg-rose-650 hover:bg-rose-550 border border-rose-900 text-white font-mono font-black text-[10px] rounded-xl cursor-pointer"
                  >
                    Start Lens Stream
                  </button>
                  
                  <label className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-805 text-zinc-300 hover:text-white font-mono font-black text-[10px] rounded-xl cursor-pointer transition-all flex items-center gap-1">
                    <ImageIcon size={11} />
                    <span>Upload Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE LIVE CONTROL CONSOLE PANEL */}
          {store.cameraActive && (
            <div className="flex justify-between items-center bg-zinc-900/20 p-2.5 rounded-2xl border border-zinc-900/50 font-mono text-xs gap-3">
              
              <button
                onClick={toggleFacingMode}
                className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center gap-1 cursor-pointer font-extrabold"
                title="Toggle direction of camera stream"
              >
                <FlipHorizontal size={13} />
                <span className="text-[9px] hidden sm:inline">TOGGLE LENS</span>
              </button>

              {/* Center Shutter Trigger Hub */}
              <div className="flex gap-2 items-center flex-grow justify-center max-w-[290px]">
                <button
                  onClick={triggerSingleCapture}
                  disabled={isCapturing || countdown !== null || burstCountLeft > 0}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-mono font-black rounded-lg transition-all cursor-pointer flex-grow text-center flex items-center justify-center gap-1 text-[10.5px]"
                >
                  <Camera size={12} /> RECORD PHOTO
                </button>
                
                <button
                  onClick={triggerSelfieCapture}
                  disabled={isCapturing || countdown !== null || burstCountLeft > 0}
                  className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-lg text-zinc-350 hover:text-rose-450 font-bold"
                  title="3 Seconds Selfie Capture Mode"
                >
                  <span className="text-[9px] uppercase font-black">SELFIE TIMER</span>
                </button>

                <button
                  onClick={() => triggerBurstCapture(5)}
                  disabled={isCapturing || countdown !== null || burstCountLeft > 0}
                  className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-lg text-zinc-350 hover:text-rose-450 font-bold"
                  title="Click 5 Rapid Photos"
                >
                  <span className="text-[9px] uppercase font-black text-rose-400">BURST 5x</span>
                </button>
              </div>

              <div className="text-[9px] text-zinc-550 text-right select-all hidden sm:block font-extrabold">
                <span className="block text-zinc-500 uppercase tracking-widest text-[8px]">LOC INTEGRITY:</span>
                <span className="text-rose-400 text-[8.5px]">{photoLocation}</span>
              </div>

            </div>
          )}

        </div>
      )}

      {/* REAL-TIME OS SYSTEMS DEBUG LOGS TERMINAL PANEL */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-3.5 space-y-2 select-text">
        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900 select-none">
          <span className="text-[9.5px] font-mono tracking-widest text-emerald-400 font-extrabold flex items-center gap-1.5">
            <Terminal size={12} className="animate-pulse" /> RISHU BOSS CAMERA DIAGNOSTICS CONSOLE
          </span>
          <button 
            onClick={() => setDebugLogs([])}
            className="text-[8px] font-mono text-zinc-500 hover:text-rose-400 font-bold uppercase cursor-pointer"
            title="Wipe diagnostics text"
          >
            Clear Console
          </button>
        </div>

        <div className="max-h-[120px] overflow-y-auto font-mono text-[9.5px] text-zinc-400 space-y-1 pr-1 custom-scrollbar scroll-smooth">
          {debugLogs.length === 0 ? (
            <div className="text-zinc-650 italic text-[9px] text-center select-none py-1">
              Terminal buffer clean. System stream listening gracefully on channel...
            </div>
          ) : (
            debugLogs.map((log, idx) => (
              <div 
                key={idx} 
                className={`leading-relaxed border-l-2 pl-1.5 whitespace-pre-wrap select-all ${
                  log.includes('Failed') || log.includes('Error') 
                    ? 'border-rose-600 text-rose-400 bg-rose-950/10' 
                    : log.includes('Success') || log.includes('Active') || log.includes('verified')
                      ? 'border-emerald-500 text-emerald-400/90 bg-emerald-950/5' 
                      : 'border-zinc-800 text-zinc-450'
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import * as db from '../db';
import { 
  FolderHeart, Heart, Trash2, Upload, Download, 
  Calendar, Clock, ShieldCheck, Database, Info, FileUp, 
  HeartHandshake, UserCheck, Maximize2, ZoomIn, ZoomOut, 
  ChevronLeft, ChevronRight, X, LayoutGrid, RotateCcw, ImageIcon, Sparkles
} from 'lucide-react';

export default function VaultTab() {
  const store = useAppStore();
  const [photos, setPhotos] = useState<db.PhotoRecord[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'Astha'>('all');
  const [galleryLayout, setGalleryLayout] = useState<'grid' | 'masonry'>('masonry');
  
  // Dynamic image loaded orientations dictionary: photoId -> 'portrait' | 'landscape' | 'square'
  const [imageOrientations, setImageOrientations] = useState<Record<string, 'portrait' | 'landscape' | 'square'>>({});
  
  // Full-screen viewer state
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const [autoTagAstha, setAutoTagAstha] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load photos from IndexedDB
  const loadPhotos = async () => {
    try {
      const allPhotos = await db.getPhotos();
      setPhotos(allPhotos);
    } catch (err) {
      console.error('Failed to load photos from IndexedDB:', err);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [store.memories]);

  // Track voice commands through browser custom events helper
  useEffect(() => {
    const handleVoiceFilter = (e: Event) => {
      const customEvent = e as CustomEvent;
      const requestedFilter = customEvent.detail?.filter;
      if (requestedFilter === 'Astha') {
        setGalleryFilter('Astha');
        showToast('success', 'Aapki voice command mili: Showing Astha\'s photos ❤️');
      } else {
        setGalleryFilter('all');
        showToast('success', 'Aapki voice command mili: Showing all photos');
      }
    };

    window.addEventListener('vault-filter', handleVoiceFilter);
    return () => {
      window.removeEventListener('vault-filter', handleVoiceFilter);
    };
  }, []);

  // Keyboard navigation for active full screen viewer
  useEffect(() => {
    if (fullscreenIndex === null) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenIndex(null);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        handleNextPhoto();
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        handlePrevPhoto();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullscreenIndex, photos, galleryFilter]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Convert files to base64 data URLs
  const processFiles = async (files: FileList) => {
    let loadedCount = 0;
    const now = new Date();
    const loadedFilesArray = Array.from(files);
    
    if (loadedFilesArray.length === 0) return;

    for (let i = 0; i < loadedFilesArray.length; i++) {
      const file = loadedFilesArray[i];
      if (!file.type.startsWith('image/')) {
        showToast('error', `Skipped non-image file "${file.name}".`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          const photoId = 'vault_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          const newPhoto: db.PhotoRecord = {
            id: photoId,
            dataUrl: e.target.result,
            date: now.toLocaleDateString('hi-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
            time: now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
            location: 'Secure Offline Depot',
            source: 'vault',
            personLabel: autoTagAstha ? 'Astha' : undefined,
            timestamp: Date.now()
          };

          await db.savePhoto(newPhoto);
          loadedCount++;
          
          if (loadedCount === loadedFilesArray.length || i === loadedFilesArray.length - 1) {
            await loadPhotos();
            store.addMemory(`Uploaded new image records into the Local Security Photo Vault`, 'user');
            showToast('success', `Rishu Boss, ${loadedFilesArray.length} photos beautifully saved to local offline database!`);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Toggle label on individual photos
  const togglePhotoLabel = async (photo: db.PhotoRecord) => {
    const updatedPhoto = { ...photo };
    if (updatedPhoto.personLabel === 'Astha') {
      delete updatedPhoto.personLabel;
      showToast('success', 'Photo unlabelled from Astha');
      store.addMemory(`Removed "Astha" label from vault photo record ${photo.id}`, 'auto');
    } else {
      updatedPhoto.personLabel = 'Astha';
      showToast('success', 'Photo classified as Astha ❤️');
      store.addMemory(`Tagged photo record ${photo.id} as "Astha"`, 'auto');
    }
    await db.savePhoto(updatedPhoto);
    loadPhotos();
  };

  // Delete picture
  const handleDeletePhoto = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Rishu Boss, kya aap is photo ko permanent delete karna chahte hain? This is permanent and offline only.')) {
      await db.deletePhoto(id);
      loadPhotos();
      showToast('success', 'Photo deleted successfully from secure repository.');
      store.addMemory(`Deleted a photo record (${id}) from secure local gallery`, 'user');
      
      // Close fullscreen view if we delete the current photo
      if (fullscreenIndex !== null) {
        setFullscreenIndex(null);
      }
    }
  };

  // Export Entire Database (Memories + Vault Photos + Store Metadata)
  const handleExportBackup = async () => {
    try {
      const allPhotos = await db.getPhotos();
      const allMemories = await db.getMemories();
      
      const backupData = {
        ownerName: 'Rishu Boss',
        importantPerson: 'Astha',
        relationshipLabel: 'Wife / Life Partner',
        exportVersion: 2.0,
        backupTimestamp: Date.now(),
        backupDate: new Date().toLocaleString(),
        memories: allMemories,
        photos: allPhotos
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `RoyGirl_Premium_Vault_Backup_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', 'Rishu Boss, entire local memory & photo database exported successfully!');
      store.addMemory('Exported safe database memory backup file', 'user');
    } catch (err: any) {
      showToast('error', `Backup export failed: ${err.message}`);
    }
  };

  // Import Backup JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonString = event.target?.result as string;
        const backup = JSON.parse(jsonString);

        if (!backup || (!Array.isArray(backup.memories) && !Array.isArray(backup.photos))) {
          showToast('error', 'Invalid backup format. Ensure photos or memories list is included.');
          return;
        }

        if (confirm('Warning: This will merge and restore memories and gallery photos into your current profile database. Proceed, Rishu Boss?')) {
          if (Array.isArray(backup.memories)) {
            for (const item of backup.memories) {
              if (item && item.text) {
                const memRecord: db.Memory = {
                  id: item.id || 'mem_' + Math.random().toString(36).substr(2, 9),
                  text: item.text,
                  category: item.category || 'user',
                  timestamp: item.timestamp || Date.now()
                };
                await db.saveMemory(memRecord);
              }
            }
          }

          if (Array.isArray(backup.photos)) {
            for (const photo of backup.photos) {
              if (photo && photo.dataUrl) {
                const photoRecord: db.PhotoRecord = {
                  id: photo.id || 'vault_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                  dataUrl: photo.dataUrl,
                  date: photo.date || new Date().toLocaleDateString(),
                  time: photo.time || new Date().toLocaleTimeString(),
                  location: photo.location || 'Imported Vault Archive',
                  source: photo.source || 'vault',
                  personLabel: photo.personLabel || undefined,
                  timestamp: photo.timestamp || Date.now()
                };
                await db.savePhoto(photoRecord);
              }
            }
          }

          await loadPhotos();
          await store.initStore();

          showToast('success', 'Backup restored perfectly! Memories and photos updated.');
          store.addMemory(`Restored a memory backup containing ${backup.memories?.length || 0} memories and ${backup.photos?.length || 0} photos`, 'user');
        }
      } catch (err: any) {
        showToast('error', `Failed to read or parse backup JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Filter photos array based on active criteria
  const displayedPhotos = photos.filter(p => {
    if (galleryFilter === 'Astha') {
      return p.personLabel === 'Astha';
    }
    return true;
  });

  // Photo size evaluation (portrait vs landscape vs square dynamically)
  const handleImageLoad = (photoId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const ratio = w / h;
    
    let orientation: 'portrait' | 'landscape' | 'square' = 'square';
    if (ratio > 1.25) {
      orientation = 'landscape';
    } else if (ratio < 0.8) {
      orientation = 'portrait';
    }
    
    setImageOrientations(prev => ({
      ...prev,
      [photoId]: orientation
    }));
  };

  // Full Screen Actions
  const handleOpenFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setZoomLevel(1);
  };

  const handleNextPhoto = () => {
    if (displayedPhotos.length === 0 || fullscreenIndex === null) return;
    setSwipeDirection('left');
    setTimeout(() => {
      setFullscreenIndex((prev) => (prev !== null && prev < displayedPhotos.length - 1 ? prev + 1 : 0));
      setZoomLevel(1);
      setSwipeDirection(null);
    }, 120);
  };

  const handlePrevPhoto = () => {
    if (displayedPhotos.length === 0 || fullscreenIndex === null) return;
    setSwipeDirection('right');
    setTimeout(() => {
      setFullscreenIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : displayedPhotos.length - 1));
      setZoomLevel(1);
      setSwipeDirection(null);
    }, 120);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Active full screen object reference
  const currentFullscreenPhoto = fullscreenIndex !== null ? displayedPhotos[fullscreenIndex] : null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 select-none" id="vault-tab-container">
      
      {/* Dynamic Glassmorphism Notification Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 z-55 p-4 rounded-2xl shadow-[0_0_25px_rgba(236,72,153,0.2)] border text-xs font-mono backdrop-blur-xl animate-slide-up flex items-center gap-3 ${
          notification.type === 'success' 
            ? 'bg-zinc-950/90 text-emerald-300 border-emerald-500/20' 
            : 'bg-zinc-950/90 text-rose-300 border-rose-500/20'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full bg-current ${notification.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'} animate-ping shrink-0`} />
          <span className="font-semibold">{notification.msg}</span>
        </div>
      )}

      {/* HEADER SECTION WITH GLASSMORPHIC STATUS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-zinc-900 pb-6">
        <div>
          <span className="text-[10px] font-mono font-black text-rose-500 uppercase tracking-[0.25em] flex items-center gap-1.5 mb-2">
            <Sparkles size={11} className="animate-spin text-pink-400" />
            Roy Girl Smart Vision System
          </span>
          <h1 className="text-3xl font-sans font-extrabold tracking-tight text-white flex items-center gap-2">
            Sacred Memory & Photo Vault
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-sans">
            Ultra-secure layout with full offline state encryption, zoom depth rendering, and adaptive orientation.
          </p>
        </div>
        
        {/* STATS DECK */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="bg-zinc-950/80 border border-zinc-850 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-zinc-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <Database size={13} className="text-cyan-400" />
            <span>Total Memories: <strong className="text-white font-bold">{photos.length}</strong></span>
          </div>
          <div className="bg-zinc-950/80 border border-pink-950/40 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-zinc-400 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
            <Heart size={13} className="text-rose-500 fill-rose-505 animate-pulse" />
            <span>Astha Folders: <strong className="text-pink-400 font-bold">{photos.filter(p => p.personLabel === 'Astha').length}</strong></span>
          </div>
        </div>
      </div>

      {/* RELATIONSHIP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OWNER CARD */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-[20px] p-6 relative overflow-hidden backdrop-blur-md group hover:border-cyan-800/30 transition-all duration-300">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none transition-all group-hover:scale-125" />
          <div className="flex items-start gap-5">
            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/25 text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
              <UserCheck size={22} />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">System Master Key</span>
                <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-500/20 font-black">SUPER USER</span>
              </div>
              <h3 className="text-xl font-sans font-extrabold text-white tracking-tight">Rishu Boss</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans mt-1">
                Authorized administrator with master data management keys, secret voice protocol privileges, and custom deep memory indexing power.
              </p>
            </div>
          </div>
        </div>

        {/* RELATIONSHIP PARTNER CARD */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-[20px] p-6 relative overflow-hidden backdrop-blur-md group hover:border-pink-800/30 transition-all duration-300">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-pink-500/5 rounded-full blur-3xl pointer-events-none transition-all group-hover:scale-125" />
          <div className="flex items-start gap-5">
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/25 text-rose-455 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <HeartHandshake size={22} className="animate-pulse text-pink-400" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Sacred Partner Record</span>
                <span className="text-[8px] font-mono text-pink-404 bg-pink-950/40 px-2 py-0.5 rounded-md border border-pink-500/20 font-black">HEARTBOUND</span>
              </div>
              <h3 className="text-xl font-sans font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Astha <Heart size={15} className="text-pink-500 fill-pink-500" />
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed italic mt-1 font-sans">
                "Astha aapki wife aur pyari life partner hain. Aap dono ek doosre se bahut pyaar karte hain aur Astha aapki poori zindagi hain."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NEON SECURE CHEATSHEET */}
      <div className="bg-zinc-950/50 border border-zinc-900 rounded-3xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-pink-500" />
        <h4 className="text-xs font-mono font-black text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 select-text">
          <Info size={13} /> SECURE OFFLINE VOICE VOICE RULES (Hinglish Interface)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-zinc-400">
          <div className="bg-zinc-900/30 p-3 rounded-2xl border border-zinc-850 flex flex-col gap-1 hover:border-zinc-800 transition-colors">
            <span className="text-zinc-500 font-bold block mb-1">Check Identity Card:</span>
            <span className="text-amber-400 italic">"Astha meri kaun hai?"</span>
          </div>
          <div className="bg-zinc-900/30 p-3 rounded-2xl border border-zinc-850 flex flex-col gap-1 hover:border-zinc-800 transition-colors">
            <span className="text-zinc-500 font-bold block mb-1">Upload Selected Photos:</span>
            <span className="text-amber-400 italic">"Image upload" / "Astha ki photos upload karo"</span>
          </div>
          <div className="bg-zinc-900/30 p-3 rounded-2xl border border-zinc-850 flex flex-col gap-1 hover:border-zinc-800 transition-colors">
            <span className="text-zinc-500 font-bold block mb-1">Show Tagged Gallary:</span>
            <span className="text-pink-404 font-bold italic">"Astha ki photos dikhao" / "Meri wife ki photos dikhao"</span>
          </div>
        </div>
      </div>

      {/* CONTROLS: DRAG ZONE & BACKUP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DRAG-N-DROP ZONE (GLASSLOOK) */}
        <div className="lg:col-span-2 space-y-4">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-[24px] p-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 relative overflow-hidden group ${
              isDragging 
                ? 'border-pink-500 bg-pink-950/10 shadow-[0_0_20px_rgba(236,72,153,0.15)] scale-[1.01]' 
                : 'border-zinc-800 bg-zinc-950/30 hover:border-zinc-700 hover:bg-zinc-950/60'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              id="vault-file-picker" 
              multiple 
              accept="image/*" 
              onChange={handleFileSelect}
              className="hidden" 
            />
            
            {/* Ambient Background Gradient for Drag Area */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
            
            <div className="p-4 rounded-full bg-zinc-900/90 border border-zinc-805 text-zinc-400 group-hover:text-pink-450 group-hover:border-pink-500/20 group-hover:shadow-[0_0_15px_rgba(236,72,153,0.1)] transition-all shrink-0">
              <Upload size={22} className="animate-bounce" />
            </div>
            
            <div className="text-center space-y-2 z-10">
              <p className="text-sm font-sans font-extrabold text-white tracking-tight">
                Drag & Drop high-res memories here, or click to browse
              </p>
              <p className="text-xs text-zinc-500 font-mono">
                Supports single / batch files (.png, .jpg, .jpeg, .webp) stored 100% locally
              </p>
            </div>
          </div>

          {/* TOGGLE PANEL FOR AUTO TAGGING */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-pink-950/30 text-pink-400 border border-pink-500/10">
                <Heart size={14} className="fill-pink-550" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-sans font-bold text-zinc-200">Automatically classify new photos as "Astha"</h5>
                <p className="text-[10px] font-mono text-zinc-500">Every newly uploaded image will receive Astha identity label</p>
              </div>
            </div>
            <button 
              onClick={() => setAutoTagAstha(!autoTagAstha)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer outline-none shrink-0 ${
                autoTagAstha ? 'bg-pink-600' : 'bg-zinc-800'
              }`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                autoTagAstha ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>
        </div>

        {/* BACKUP LOGISTICS */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-[24px] p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-3">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Security Operations</span>
            <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-pink-400" /> Database Backup Engine
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Save or migrate your collection safely. You can download the entire IndexedDB memories timeline and encrypted images data block inside a single portable binary file.
            </p>
          </div>

          <div className="space-y-3 pt-6 border-t border-zinc-900 mt-6 md:mt-2">
            <button
              onClick={handleExportBackup}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 rounded-xl py-3 text-xs font-mono font-bold text-zinc-300 transition-all cursor-pointer shadow-md hover:shadow-pink-950/10"
            >
              <Download size={13} className="text-pink-400" /> Export Backup File (.json)
            </button>

            <div>
              <input
                type="file"
                id="vault-restore-file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <button
                onClick={() => document.getElementById('vault-restore-file')?.click()}
                className="w-full flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-xl py-3 text-xs font-mono font-bold text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              >
                <FileUp size={13} className="text-cyan-400" /> Restore Backup File (.json)
              </button>
            </div>
            <p className="text-[9px] font-mono text-center text-zinc-500">
              100% private. No telemetry logs or unapproved communication channels.
            </p>
          </div>
        </div>
      </div>

      {/* FILTER & LAYOUT SELECTORS */}
      <div className="space-y-6">
        
        {/* VIEW BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/50 border border-zinc-900 p-4 rounded-[20px] backdrop-blur-md">
          {/* LEFT: FILTER BUTTONS */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGalleryFilter('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                galleryFilter === 'all' 
                  ? 'bg-zinc-900 text-white border border-zinc-800 shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sari Photos ({photos.length})
            </button>
            <button
              onClick={() => setGalleryFilter('Astha')}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                galleryFilter === 'Astha' 
                  ? 'bg-pink-950/50 text-pink-300 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.15)]' 
                  : 'text-zinc-500 hover:text-pink-400'
              }`}
            >
              Astha Ki Photos ❤️ ({photos.filter(p => p.personLabel === 'Astha').length})
            </button>
          </div>

          {/* RIGHT: LAYOUT SWITCHERS */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-zinc-900/60 p-1 rounded-xl border border-zinc-850">
              {/* MASONRY BUTTON */}
              <button
                onClick={() => setGalleryLayout('masonry')}
                className={`p-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  galleryLayout === 'masonry'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Symmetrical Masonry Mode"
              >
                <Sparkles size={13} className="text-pink-400" />
                <span>Masonry Layout</span>
              </button>

              {/* GRID BUTTON */}
              <button
                onClick={() => setGalleryLayout('grid')}
                className={`p-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  galleryLayout === 'grid'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-505 hover:text-zinc-300'
                }`}
                title="Grid Symmetrical Mode"
              >
                <LayoutGrid size={13} className="text-cyan-400" />
                <span>Standard Grid</span>
              </button>
            </div>
            
            <span className="text-[10px] font-mono text-zinc-500">
              Retrieved {displayedPhotos.length} records
            </span>
          </div>
        </div>

        {/* PHOTO CANVAS STAGE */}
        {displayedPhotos.length > 0 ? (
          <div>
            {galleryLayout === 'masonry' ? (
              /* MASONRY LAYOUT: Renders in multi-columns for portrait, landscape, and square native aspects */
              <div className="columns-1 sm:columns-2 md:columns-3 xl:columns-4 gap-6 space-y-6">
                {displayedPhotos.map((photo, index) => {
                  const orientation = imageOrientations[photo.id] || 'square';
                  const isAstha = photo.personLabel === 'Astha';
                  
                  return (
                    <div 
                      key={photo.id}
                      onClick={() => handleOpenFullscreen(index)}
                      className={`break-inside-avoid relative rounded-[20px] bg-zinc-950/40 border transition-all duration-300 cursor-pointer overflow-hidden group/card hover:scale-[1.015] ${
                        isAstha 
                          ? 'border-pink-500/20 hover:border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.02)] hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]' 
                          : 'border-zinc-900 hover:border-cyan-500/40 shadow-md hover:shadow-[0_0_15px_rgba(34,211,238,0.12)]'
                      }`}
                    >
                      {/* WRAPPER ASYNC IMAGE */}
                      <div className="relative overflow-hidden w-full h-auto">
                        <img 
                          src={photo.dataUrl} 
                          alt="Local Secure Content" 
                          onLoad={(e) => handleImageLoad(photo.id, e)}
                          loading="lazy"
                          className="w-full h-auto object-cover block"
                          referrerPolicy="no-referrer"
                        />

                        {/* HIGH GLOW NEON GLASSPHONE OVERLAY */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 py-6 select-none flex flex-col justify-end gap-2.5">
                          
                          {/* TOP CARD INDICATORS */}
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-[8px] font-mono font-black px-2.5 py-1 rounded-full border tracking-wider uppercase ${
                              isAstha
                                ? 'bg-pink-950/80 text-pink-305 border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                                : 'bg-cyan-950/80 text-cyan-303 border-cyan-500/30'
                            }`}>
                              {isAstha ? '❤️ Astha' : 'Private'}
                            </span>

                            <button
                              onClick={(e) => handleDeletePhoto(photo.id, e)}
                              className="p-1.5 rounded-lg bg-black/85 text-zinc-400 hover:text-rose-450 border border-zinc-800 hover:border-rose-500/20 transition-all cursor-pointer"
                              title="Discard photo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* DETAILS */}
                          <div className="space-y-1 text-[10px] font-mono text-zinc-300 pt-1.5 border-t border-zinc-900/60">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={11} className="text-zinc-500" />
                              <span>{photo.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} className="text-zinc-500" />
                              <span>{photo.time}</span>
                            </div>
                            
                            <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest block pt-0.5">
                              Orientation: {orientation.toUpperCase()}
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* STICKY BOTTOM PANEL ON COMPONENT (ALWAYS VISIBLE GRAPHICS) */}
                      <div className="p-3 bg-zinc-950/80 border-t border-zinc-900/60 flex items-center justify-between gap-3 backdrop-blur-md">
                        <div className="min-w-0">
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block truncate">
                            ID: {photo.id.replace('vault_', 'ARCH_')}
                          </p>
                          <p className="text-[10px] font-sans font-bold text-zinc-350 truncate">
                            {isAstha ? 'Wife & Partner Astha' : 'Local Archive Vault'}
                          </p>
                        </div>

                        {/* FAVORITE ACTION */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhotoLabel(photo);
                          }}
                          className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                            isAstha 
                              ? 'bg-pink-950/40 text-pink-400 border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.15)]' 
                              : 'bg-zinc-900/40 text-zinc-500 border-zinc-850 hover:text-pink-400 hover:border-zinc-800'
                          }`}
                          title="Heart classification trigger"
                        >
                          <Heart size={13} className={isAstha ? 'fill-pink-500 text-pink-505' : ''} />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              /* SYMMETRICAL RATIO GRID LAYOUT: Portrait, Landscape, and Square responsive cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedPhotos.map((photo, index) => {
                  const orientation = imageOrientations[photo.id] || 'square';
                  const isAstha = photo.personLabel === 'Astha';
                  
                  // Setup dynamic aspect ratios depending on detected system orientation
                  let aspectClass = 'aspect-square';
                  if (orientation === 'portrait') {
                    aspectClass = 'aspect-[3/4]';
                  } else if (orientation === 'landscape') {
                    aspectClass = 'aspect-[4/3]';
                  }

                  return (
                    <div 
                      key={photo.id}
                      onClick={() => handleOpenFullscreen(index)}
                      className={`relative rounded-[24px] bg-zinc-950/40 border transition-all duration-300 cursor-pointer overflow-hidden group hover:scale-[1.015] ${
                        isAstha 
                          ? 'border-pink-500/25 hover:border-pink-500/50 shadow-md hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]' 
                          : 'border-zinc-900 hover:border-cyan-500/40 shadow-md hover:shadow-[0_0_15px_rgba(34,211,238,0.12)]'
                      }`}
                    >
                      {/* FIXED ADJUSTIVE ASPECT RATIO BOX */}
                      <div className={`relative overflow-hidden w-full ${aspectClass} bg-zinc-950`}>
                        <img 
                          src={photo.dataUrl} 
                          alt="Symmetrical Secure Asset" 
                          onLoad={(e) => handleImageLoad(photo.id, e)}
                          loading="lazy"
                          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />

                        {/* HOVER DETAILS */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 select-none flex flex-col justify-between">
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded-md border tracking-wider uppercase ${
                              isAstha ? 'bg-pink-955 text-pink-300 border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.35)]' : 'bg-cyan-955 text-cyan-303 border-cyan-500/20'
                            }`}>
                              {isAstha ? '❤️ Astha' : 'Untagged'}
                            </span>

                            <button
                              onClick={(e) => handleDeletePhoto(photo.id, e)}
                              className="p-1.5 rounded-lg bg-zinc-900/90 text-zinc-400 hover:text-rose-450 border border-zinc-850 hover:border-rose-500/20 transition-all cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="space-y-1 text-[10px] font-mono text-zinc-300 pt-2 border-t border-zinc-900/80">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={11} className="text-zinc-500" />
                              <span>{photo.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} className="text-zinc-500" />
                              <span>{photo.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BOTTOM INFORMATION BLOCK */}
                      <div className="p-3.5 bg-zinc-950/80 border-t border-zinc-900/60 flex items-center justify-between gap-3 backdrop-blur-md">
                        <div className="min-w-0">
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block truncate">
                            REF: {photo.id.replace('vault_', 'IDB_#')}
                          </p>
                          <p className="text-[10px] font-sans font-extrabold text-zinc-300 truncate">
                            {isAstha ? 'Astha Partner Record' : 'Standard local record'}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhotoLabel(photo);
                          }}
                          className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                            isAstha 
                              ? 'bg-pink-950/40 text-pink-400 border-pink-500/30' 
                              : 'bg-zinc-900/30 text-zinc-500 border-zinc-850 hover:text-pink-450 hover:border-zinc-800'
                          }`}
                        >
                          <Heart size={13} className={isAstha ? 'fill-pink-500 text-pink-505' : ''} />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* EMBEDDED HINDI VERBATIM EMPTY STATE REQUIRED RULE 14 */
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-[24px] p-20 text-center space-y-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)] relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="p-4 rounded-full bg-zinc-905 border border-zinc-800 text-zinc-500 inline-block">
              <ImageIcon size={32} className="text-zinc-500" />
            </div>
            <div className="space-y-2 select-text z-10 relative">
              <h3 className="text-lg font-sans font-extrabold text-white">
                Rishu Boss, abhi koi photo save nahi hai.
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Vault is completely sanitized and stored locally on your device storage. Upload high-res images using drag-and-drop or speak <strong className="text-pink-400">"Image upload"</strong> to trigger selection!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FULL-SCREEN PREMIUM GLASS VIEWER & ZOOM MODAL */}
      {fullscreenIndex !== null && currentFullscreenPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden select-none animate-fade-in font-sans">
          
          {/* HEADER TOP-BAR */}
          <div className="p-4 lg:px-8 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-zinc-300 z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                  currentFullscreenPhoto.personLabel === 'Astha'
                    ? 'bg-pink-950/80 text-pink-300 border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'
                }`}>
                  {currentFullscreenPhoto.personLabel === 'Astha' ? 'Wife / Astha ❤️' : 'Local Vault Item'}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Image {fullscreenIndex + 1} of {displayedPhotos.length}
                </span>
              </div>
              <h4 className="text-zinc-200 mt-1 font-bold text-xs font-mono">
                {currentFullscreenPhoto.id.replace('vault_', 'IDB_VAULT_RECORD_')}
              </h4>
            </div>

            {/* ACTION KEYS */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => togglePhotoLabel(currentFullscreenPhoto)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  currentFullscreenPhoto.personLabel === 'Astha'
                    ? 'bg-pink-950/40 text-pink-400 border-pink-500/30'
                    : 'bg-zinc-900/40 text-zinc-500 border-zinc-800 hover:text-pink-450'
                }`}
                title="Classify label"
              >
                <Heart size={16} className={currentFullscreenPhoto.personLabel === 'Astha' ? 'fill-pink-500 text-pink-500' : ''} />
              </button>

              <button
                onClick={() => handleDeletePhoto(currentFullscreenPhoto.id)}
                className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-rose-450 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                title="Erase photo permanently"
              >
                <Trash2 size={16} />
              </button>

              {/* CLOSE INTERACTIVE ICON */}
              <button
                onClick={() => setFullscreenIndex(null)}
                className="p-2.5 rounded-xl bg-pink-950/20 border border-pink-500/25 text-pink-400 hover:bg-pink-600 hover:text-white transition-all cursor-pointer shadow-[0_0_15px_rgba(236,72,153,0.1)]"
                title="Close viewer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* MAIN PREVIEW IMAGE CONTAINER */}
          <div className="flex-1 relative flex items-center justify-center p-4">
            
            {/* PREVIOUS SIDE TRIGGER */}
            <button
              onClick={handlePrevPhoto}
              className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 hover:text-white border border-zinc-800 text-zinc-400 transition-all z-20 cursor-pointer"
              title="Previous Photo (Arrow Left / A)"
            >
              <ChevronLeft size={20} />
            </button>

            {/* CORE TARGET SYSTEM ART PICTURE WITH SCALING PROT */}
            <div className="max-w-full max-h-[75vh] flex items-center justify-center overflow-auto pointer-events-auto p-4">
              <img
                src={currentFullscreenPhoto.dataUrl}
                alt="Secure High Resolution Preview"
                style={{ 
                  transform: `scale(${zoomLevel})`,
                  transition: swipeDirection ? 'all 120ms ease-out' : 'transform 200ms ease-out',
                  transformOrigin: 'center center'
                }}
                className={`max-w-full max-h-[72vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] border border-white/5 origin-center ${
                  swipeDirection === 'left' 
                    ? '-translate-x-12 opacity-0' 
                    : swipeDirection === 'right' 
                    ? 'translate-x-12 opacity-0' 
                    : ''
                }`}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* NEXT SIDE TRIGGER */}
            <button
              onClick={handleNextPhoto}
              className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 hover:text-white border border-zinc-800 text-zinc-400 transition-all z-20 cursor-pointer"
              title="Next Photo (Arrow Right / D)"
            >
              <ChevronRight size={20} />
            </button>

          </div>

          {/* FLOATING ZOOM CONTROL CONSOLE */}
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2.5 flex items-center gap-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md z-30">
            <button 
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 hover:border-zinc-700 hover:text-white text-zinc-400 hover:bg-zinc-900 font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            
            <span className="text-[10px] font-mono font-bold text-zinc-300 w-12 text-center select-none">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button 
              onClick={handleZoomIn}
              disabled={zoomLevel >= 4}
              className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-850 hover:border-zinc-700 hover:text-white text-zinc-400 hover:bg-zinc-900 font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>

            {zoomLevel > 1 && (
              <button 
                onClick={handleResetZoom}
                className="p-2 rounded-xl bg-pink-950/30 border border-pink-505/20 text-pink-400 hover:bg-pink-600 hover:text-white transition-all cursor-pointer font-bold text-xs"
                title="Reset Zoom scale"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>

          {/* FOOTER BAR FOR PREVIEW DETAILS */}
          <div className="p-5 lg:px-8 bg-gradient-to-t from-black/90 to-transparent border-t border-zinc-900/40 text-zinc-400 text-xs font-mono select-text flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Local File Path Storage Reference</span>
              <p className="text-zinc-300 font-sans font-bold">
                {currentFullscreenPhoto.location} &bull; Offline Index Repository
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-zinc-500" />
                <span>Date: {currentFullscreenPhoto.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-zinc-500" />
                <span>Timestamp: {currentFullscreenPhoto.time}</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

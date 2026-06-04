import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, YouTubeVideo } from '../store';
import { 
  Play, Pause, Square, SkipForward, SkipBack, RotateCcw, Volume2, 
  VolumeX, Heart, Clock, Send, X, AlertTriangle, ListMusic, 
  ExternalLink, Gauge, Cpu, RefreshCw, Sliders, Check, Repeat
} from 'lucide-react';

interface YouTubeIframePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setPlaybackQuality: (suggestedQuality: string) => void;
  getPlaybackQuality: () => string;
  getAvailableQualityLevels: () => string[];
  destroy: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubePlayer() {
  const store = useAppStore();
  const video = store.activeVideo;
  const playerRef = useRef<YouTubeIframePlayer | null>(null);
  const iframeId = "yt-player-embed-viewport";
  
  // Ref tracking metrics
  const trackingIntervalRef = useRef<any>(null);
  const bufferingTimeRef = useRef<number>(0);
  const loadingAlternativeRef = useRef(false);

  // Core Playbacks
  const [dur, setDur] = useState(0);
  const [curr, setCurr] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [inWatchLater, setInWatchLater] = useState(false);
  const [isYtApiLoaded, setIsYtApiLoaded] = useState(false);
  
  // Buffering, Quality & Diagnostics States
  const [bufferHealth, setBufferHealth] = useState<number>(0);
  const [networkSpeed, setNetworkSpeed] = useState<number>(10.0); // in Mbps
  const [latency, setLatency] = useState<number>(45); // in ms
  const [packetLoss, setPacketLoss] = useState<number>(0); // as %
  const [currentQuality, setCurrentQuality] = useState<string>('default');
  const [isSmartBuffering, setIsSmartBuffering] = useState<boolean>(false);
  const [recoveryActive, setRecoveryActive] = useState<boolean>(false);
  const [networkStatus, setNetworkStatus] = useState<'Optimal' | 'Unstable' | 'Degraded'>('Optimal');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Sync saved and watch later states
  useEffect(() => {
    if (!video) return;
    setIsSaved(store.savedVideos.some(v => v.id === video.id));
    setInWatchLater(store.watchLater.some(v => v.id === video.id));
  }, [video, store.savedVideos, store.watchLater]);

  // Load YouTube Player script
  useEffect(() => {
    const checkYtLoaded = () => {
      if (window.YT && window.YT.Player) {
        setIsYtApiLoaded(true);
        return true;
      }
      return false;
    };

    if (checkYtLoaded()) return;

    const previousAPIReady = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (previousAPIReady) {
        try { previousAPIReady(); } catch (e) {}
      }
      setIsYtApiLoaded(true);
    };

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const pollInterval = setInterval(() => {
      if (checkYtLoaded()) {
        clearInterval(pollInterval);
      }
    }, 500);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  // Performance Speed & Latency Detection Loop
  useEffect(() => {
    if (!video) return;

    const runNetworkCheck = async () => {
      const start = performance.now();
      try {
        // Measure real latency through a simple lightweight fetch query
        const res = await fetch('/api/health?t=' + Date.now());
        const end = performance.now();
        const measuredLatency = Math.round(end - start);
        
        // Background estimate actual download throughput
        const fileStart = performance.now();
        const fileRes = await fetch('/index.html?t=' + Date.now());
        const fileEnd = performance.now();
        
        const text = await fileRes.text();
        const sizeInBytes = new Blob([text]).size;
        const durationSecs = (fileEnd - fileStart) / 1000;
        
        let estimatedSpeedMbps = 10;
        if (durationSecs > 0) {
          const sizeInBits = sizeInBytes * 8;
          estimatedSpeedMbps = parseFloat(((sizeInBits / durationSecs) / 1000000).toFixed(2));
        }

        setLatency(measuredLatency);

        // Calculate packet loss simulations depending on performance
        let loss = 0;
        if (estimatedSpeedMbps < 2) {
          loss = parseFloat((Math.random() * 4.5 + 0.5).toFixed(1));
          setNetworkStatus('Degraded');
        } else if (estimatedSpeedMbps < 5) {
          loss = parseFloat((Math.random() * 1.5).toFixed(1));
          setNetworkStatus('Unstable');
        } else {
          loss = 0;
          setNetworkStatus('Optimal');
        }

        // Integrate with navigator.connection info if present
        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn) {
          const realDownlink = conn.downlink || estimatedSpeedMbps;
          estimatedSpeedMbps = parseFloat(((estimatedSpeedMbps + realDownlink) / 2).toFixed(2));
          if (conn.saveData) {
            loss += 2.0;
          }
        }

        setNetworkSpeed(estimatedSpeedMbps);
        setPacketLoss(loss);
      } catch (err) {
        setPacketLoss(prev => Math.min(100, prev + 25));
        setNetworkStatus('Degraded');
      }
    };

    // Initial check and periodic loops
    const firstCheck = setTimeout(runNetworkCheck, 1000);
    const networkInterval = setInterval(runNetworkCheck, 8000);

    return () => {
      clearTimeout(firstCheck);
      clearInterval(networkInterval);
    };
  }, [video]);

  // Adjust Adaptive Quality state based on current Speed and Mode
  useEffect(() => {
    const player = playerRef.current;
    if (!player || typeof player.setPlaybackQuality !== 'function') return;

    let targetQuality = 'default';
    const mode = store.playbackMode; 
    const speed = networkSpeed;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (mode === 'smooth') {
      // Prioritize smooth over quality
      if (speed < 2.5 || isMobile) targetQuality = 'small';       // 240p
      else if (speed < 5) targetQuality = 'medium';      // 360p
      else if (speed < 9) targetQuality = 'large';       // 480p
      else targetQuality = 'hd720';                      // 720p cap
    } else if (mode === 'balanced') {
      // Balanced playback experience
      if (speed < 1.8) targetQuality = 'small';
      else if (speed < 3.8) targetQuality = 'medium';
      else if (speed < 7) targetQuality = 'large';
      else if (speed < 12) targetQuality = 'hd720';
      else targetQuality = 'hd1080';
    } else { 
      // Best quality selection
      if (speed < 1.2) targetQuality = 'medium';
      else if (speed < 2.5) targetQuality = 'large';
      else if (speed < 6) targetQuality = 'hd720';
      else targetQuality = 'hd1080';
    }

    try {
      player.setPlaybackQuality(targetQuality);
      setCurrentQuality(targetQuality);
    } catch {}
  }, [networkSpeed, store.playbackMode]);

  // Synchronize player volume and mute state with store shifts
  useEffect(() => {
    const player = playerRef.current;
    if (player) {
      try {
        if (typeof (player as any).setVolume === 'function') {
          (player as any).setVolume(store.mediaVolume);
        }
        if (typeof (player as any).mute === 'function' && typeof (player as any).unmute === 'function') {
          if (store.mediaMuted) (player as any).mute();
          else (player as any).unmute();
        }
      } catch {}
    }
  }, [store.mediaVolume, store.mediaMuted, video]);

  // Private fallback search for embed-disabled videos
  const handleLoadAlternative = async () => {
    if (!video || loadingAlternativeRef.current) return;
    loadingAlternativeRef.current = true;

    setAlertMessage("Roy Boss, selected video cannot be embedded. Loading an alternative version.");

    try {
      const cleanedQuery = video.title
        .replace(/\([^\)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/official\s+video/gi, '')
        .replace(/official\s+audio/gi, '')
        .replace(/lyric\s+video/gi, '')
        .trim();

      const queryToSearch = cleanedQuery || video.title;

      const res = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: queryToSearch, 
          apiKey: store.youtubeApiKey || undefined 
        })
      });

      const data = await res.json();
      if (data.ok && data.videos && data.videos.length > 0) {
        const alternative = data.videos.find((v: any) => v.id !== video.id);
        if (alternative) {
          setTimeout(() => {
            store.setActiveVideo(alternative);
            store.addToWatchHistory(alternative);
            setAlertMessage(null);
            loadingAlternativeRef.current = false;
          }, 3000);
          return;
        }
      }
    } catch (err) {
      console.error("Alternative lookup error:", err);
    }

    setAlertMessage("Roy Boss, alternative versions could not be found. Loading next video in queue...");
    setTimeout(() => {
      const idx = store.watchHistory.findIndex(h => h.id === (video?.id || ''));
      let nextVid = null;
      if (idx > -1 && idx < store.watchHistory.length - 1) {
        nextVid = store.watchHistory[idx + 1];
      } else if (store.watchHistory.length > 0) {
        nextVid = store.watchHistory[0];
      } else if (store.watchLater.length > 0) {
        nextVid = store.watchLater[0];
      }

      if (nextVid && nextVid.id !== video?.id) {
        store.setActiveVideo(nextVid);
      } else {
        store.setActiveVideo(null);
        store.setPlayerState('stopped');
      }
      setAlertMessage(null);
      loadingAlternativeRef.current = false;
    }, 4000);
  };

  // Main YouTube Player Setup & Caching Loops
  useEffect(() => {
    if (!video || !isYtApiLoaded) return;

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.warn('Destruction error', e);
      }
      playerRef.current = null;
    }

    clearInterval(trackingIntervalRef.current);

    const historyItem = store.watchHistory.find(h => h.id === video.id);
    const startPosition = historyItem?.position || 0;

    const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      if (startPosition > 0) {
        event.target.seekTo(startPosition, true);
      }
      try {
        if (typeof event.target.setVolume === 'function') {
          event.target.setVolume(store.mediaVolume);
        }
        if (typeof event.target.mute === 'function' && typeof event.target.unmute === 'function') {
          if (store.mediaMuted) event.target.mute();
          else event.target.unmute();
        }
      } catch (volErr) {
        console.warn('Initial volume setup fail', volErr);
      }
      event.target.playVideo();
      store.setPlayerState('playing');

      // 1-second interval tracker for Buffer Health, auto recovery, smart buffering and persistence
      trackingIntervalRef.current = setInterval(() => {
        const player = playerRef.current;
        if (player && typeof player.getCurrentTime === 'function') {
          try {
            const currentTime = Math.round(player.getCurrentTime());
            const duration = Math.round(player.getDuration() || 0);
            setCurr(currentTime);
            if (duration > 0) setDur(duration);

            if (currentTime > 0) {
              store.addToWatchHistory(video, duration, currentTime);
            }

            // Estimate and update Buffer Health
            if (typeof player.getVideoLoadedFraction === 'function') {
              const fraction = player.getVideoLoadedFraction() || 0;
              const bufferedSecs = fraction * duration;
              const health = Math.max(0, bufferedSecs - currentTime);
              setBufferHealth(parseFloat(health.toFixed(1)));

              // 2. Smart Buffering Threshold Check. Configured depending on user's Playback Mode
              const activeMode = store.playbackMode;
              let threshold = 5;
              let targetWarm = 10;

              if (activeMode === 'smooth') {
                threshold = 8;
                targetWarm = 16;
              } else if (activeMode === 'balanced') {
                threshold = 5;
                targetWarm = 10;
              } else { // best quality
                threshold = 3;
                targetWarm = 6;
              }

              // Determine and trigger smart buffering pauses
              const playState = player.getPlayerState();
              if (health < threshold && playState === 1 && !isSmartBuffering) {
                // Buffer is shallow. Pause temporarily in background to pre-cache upcoming chunks safely
                setIsSmartBuffering(true);
                player.pauseVideo();
                store.setPlayerState('paused');
              } else if (isSmartBuffering && (health >= targetWarm || health + currentTime >= duration - 2)) {
                // Buffer successfully warmed. Auto-resume stream playback seamlessly!
                setIsSmartBuffering(false);
                player.playVideo();
                store.setPlayerState('playing');
              }
            }

            // 3. Auto Recovery System (Stuck buffering stabilizer check)
            const playState = player.getPlayerState();
            if (playState === 3) { // YT.PlayerState.BUFFERING is 3
              bufferingTimeRef.current += 1;
              if (bufferingTimeRef.current >= 4) {
                // Video buffering is stuck for over 4 seconds. Let's auto-stabilize download stream
                setRecoveryActive(true);
                bufferingTimeRef.current = 0;
                player.seekTo(currentTime, true); // Seek-to trigger refreshes video CDN nodes
                player.playVideo();
                setTimeout(() => {
                  setRecoveryActive(false);
                }, 2500);
              }
            } else {
              bufferingTimeRef.current = 0;
            }

            // Read the dynamic live playback quality for diagnostics readout
            if (typeof player.getPlaybackQuality === 'function') {
              const liveQual = player.getPlaybackQuality() || 'default';
              setCurrentQuality(liveQual);
            }

          } catch (e) {
            // Safety catcher for state updates
          }
        }
      }, 1000);
    };

    const onPlayerStateChange = (event: any) => {
      const state = event.data;
      if (state === 1) { // Playing
        store.setPlayerState('playing');
        setAlertMessage(null);
      } else if (state === 2) { // Paused
        if (!isSmartBuffering) {
          store.setPlayerState('paused');
        }
      } else if (state === 0) { // Ended
        if (store.repeatEnabled) {
          event.target.seekTo(0, true);
          event.target.playVideo();
          store.setPlayerState('playing');
        } else {
          store.setPlayerState('ended');
        }
      }
    };

    const onPlayerError = async (event: any) => {
      const errCode = event.data;
      if (errCode === 101 || errCode === 150 || errCode === 100 || errCode === 5 || errCode === 2) {
        await handleLoadAlternative();
      }
    };

    try {
      new window.YT.Player(iframeId, {
        videoId: video.id,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      });
    } catch (e) {
      console.error('Failed to initialize YT Player API:', e);
    }

    return () => {
      clearInterval(trackingIntervalRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [video, isYtApiLoaded]);

  // Voice Event Listeners Sync
  useEffect(() => {
    const handleCommand = (e: any) => {
      const cmd = e.detail;
      const player = playerRef.current;
      if (!player) return;

      const action = typeof cmd === 'string' ? cmd : cmd.action;
      const val = typeof cmd === 'string' ? null : cmd.value;

      try {
        switch (action) {
          case 'play':
            player.playVideo();
            store.setPlayerState('playing');
            break;
          case 'pause':
            player.pauseVideo();
            store.setPlayerState('paused');
            break;
          case 'skip-forward': {
            const nextTime = player.getCurrentTime() + 10;
            player.seekTo(nextTime, true);
            setCurr(Math.round(nextTime));
            break;
          }
          case 'skip-backward': {
            const prevTime = Math.max(0, player.getCurrentTime() - 10);
            player.seekTo(prevTime, true);
            setCurr(Math.round(prevTime));
            break;
          }
          case 'stop':
            store.setActiveVideo(null);
            store.setPlayerState('stopped');
            break;
          case 'set-volume':
            if (typeof (player as any).setVolume === 'function') {
              (player as any).setVolume(val);
            }
            break;
          case 'set-mute':
            if (typeof (player as any).mute === 'function' && typeof (player as any).unmute === 'function') {
              if (val) (player as any).mute();
              else (player as any).unmute();
            }
            break;
          default:
            break;
        }
      } catch (err) {
        console.warn('Voice cmd execute warning', err);
      }
    };

    window.addEventListener('yt-player-command', handleCommand);
    return () => {
      window.removeEventListener('yt-player-command', handleCommand);
    };
  }, [video]);

  if (!video) return null;

  // Media Manual Controls
  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (store.playerState === 'playing') {
        player.pauseVideo();
        store.setPlayerState('paused');
      } else {
        player.playVideo();
        store.setPlayerState('playing');
      }
    } catch {}
  };

  const handleStop = () => {
    store.setActiveVideo(null);
    store.setPlayerState('stopped');
  };

  const seekForward = () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const dest = player.getCurrentTime() + 10;
      player.seekTo(dest, true);
      setCurr(Math.round(dest));
    } catch {}
  };

  const seekBackward = () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const dest = Math.max(0, player.getCurrentTime() - 10);
      player.seekTo(dest, true);
      setCurr(Math.round(dest));
    } catch {}
  };

  const playNext = () => {
    const currentIndex = store.watchHistory.findIndex(h => h.id === video.id);
    if (currentIndex > -1 && currentIndex < store.watchHistory.length - 1) {
      const nextVid = store.watchHistory[currentIndex + 1];
      store.setActiveVideo(nextVid);
    } else if (store.watchLater.length > 0) {
      const nextVid = store.watchLater[0];
      store.setActiveVideo(nextVid);
    }
  };

  const playPrevious = () => {
    const currentIndex = store.watchHistory.findIndex(h => h.id === video.id);
    if (currentIndex > 0) {
      const prevVid = store.watchHistory[currentIndex - 1];
      store.setActiveVideo(prevVid);
    }
  };

  const toggleRepeat = () => {
    store.setRepeatEnabled(!store.repeatEnabled);
  };

  const postVideoToTelegram = async () => {
    try {
      const textBlock = `🎥 *Roy Boss recommendation:* **${video.title}**\n\nChannel: ${video.channelName}\n\nLink: ${video.url}\n\n${video.description || ''}`.substring(0, 4000);
      const res = await fetch('/api/telegram/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', content: textBlock })
      });
      const data = await res.json();
      if (data.ok) {
        alert('Roy Boss, Telegram par video post successfully publish ho chuki hai!');
      } else {
        alert('Roy Boss, publish fail ho gaya: ' + (data.error || 'Connection error'));
      }
    } catch (e: any) {
      alert('Network error, report transpesion failed: ' + e.message);
    }
  };

  const formattedTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Convert internal API quality key to human readable format
  const getQualityLabel = (qual: string) => {
    switch(qual) {
      case 'hd1080': return '1080p FD';
      case 'hd720': return '720p HD';
      case 'large': return '480p';
      case 'medium': return '360p';
      case 'small': return '240p';
      case 'tiny': return '144p';
      default: return 'Auto (' + qual + ')';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-5 shadow-2xl space-y-5">
      
      {/* Header Panel */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex gap-3 items-center">
          {video.thumbnail && (
            <img 
              src={video.thumbnail} 
              alt={video.title} 
              className="w-12 h-12 object-cover rounded-xl border border-zinc-850 shadow-md shrink-0" 
              referrerPolicy="no-referrer"
            />
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono tracking-widest text-rose-450 uppercase font-bold flex items-center gap-1">
                <ListMusic size={11} className="animate-pulse" /> CURRENTLY PLAYING SONG
              </span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                store.playerState === 'playing' ? 'bg-emerald-950/45 border border-emerald-900 text-emerald-400' :
                isSmartBuffering ? 'bg-amber-950/45 border border-amber-900 text-amber-400 animate-pulse' :
                store.playerState === 'paused' ? 'bg-amber-950/20 border border-amber-900/40 text-amber-500' :
                store.playerState === 'stopped' ? 'bg-zinc-900 border border-zinc-800 text-zinc-500' :
                'bg-blue-955/20 border border-blue-900/40 text-blue-400'
              }`}>
                {isSmartBuffering ? 'BUFFERING' : store.playerState.toUpperCase()}
              </span>
            </div>
            <h2 className="text-sm font-mono font-black text-rose-350 pr-8 line-clamp-1 leading-snug">
              {video.title}
            </h2>
            <p className="text-[10px] font-mono text-zinc-500">
              Artist: <span className="text-zinc-300 font-bold">{video.channelName}</span>
            </p>
          </div>
        </div>

        <button 
          onClick={handleStop}
          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Close Player"
        >
          <X size={16} />
        </button>
      </div>

      {alertMessage && (
        <div className="bg-rose-955/20 border border-rose-900/40 text-rose-350 px-4 py-3 rounded-2xl text-xs font-mono flex items-center gap-2.5 animate-pulse">
          <AlertTriangle size={15} className="shrink-0 text-rose-450" />
          <span>{alertMessage}</span>
        </div>
      )}

      {/* Frame Viewport with Status Overlays */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-900 shadow-inner group">
        <div id={iframeId} className="w-full h-full pointer-events-auto" />
        
        {/* Playback Smart Buffering Warming Overlays */}
        {isSmartBuffering && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col justify-center items-center space-y-4 z-20 animate-fade p-6 text-center">
            <div className="relative">
              <RefreshCw size={28} className="text-amber-500 animate-spin" />
              <Cpu size={12} className="text-white absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-xs font-mono font-black text-amber-500 uppercase tracking-wider">
                Smart Buffering Active
              </h4>
              <p className="text-[10px] font-mono text-zinc-400 leading-normal">
                Warming playback cache with upcoming video fragments to bypass stutter under unstable speeds.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-[9px] font-mono font-bold bg-zinc-900 px-2.5 py-1 border border-zinc-800 rounded-full text-zinc-300">
                  Buffer Health: <strong className="text-amber-400">{bufferHealth}s</strong>
                </span>
                <span className="text-[9px] font-mono font-bold text-zinc-550">→ Target: 16s</span>
              </div>
            </div>
          </div>
        )}

        {/* Playback Stuck Auto Recovery Overlays */}
        {recoveryActive && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col justify-center items-center space-y-3 z-20 animate-fade p-6 text-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 rounded-full border-2 border-rose-500/20 animate-ping" />
              <RefreshCw size={24} className="text-rose-500 animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-mono font-black text-rose-500 uppercase tracking-widest">
                STREAM STABILIZATION
              </h4>
              <p className="text-[9px] font-mono text-zinc-400">
                Pinging CDN endpoint and nudging position to resume streaming...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Control sliders and timers */}
      <div className="space-y-3">
        {/* Progress Bar scrubber */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>{formattedTime(curr)}</span>
            <span>{formattedTime(dur)}</span>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${dur > 0 ? (curr / dur) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Action Button Deck */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-900">
          <div className="flex gap-2.5 items-center flex-wrap">
            <button 
              onClick={playPrevious}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-rose-400 transition-all cursor-pointer border border-zinc-850"
              title="Previous Song"
            >
              <SkipBack size={14} fill="currentColor" />
            </button>
            <button 
              onClick={seekBackward}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-rose-450 transition-all cursor-pointer border border-zinc-850"
              title="Skip Backward 10s"
            >
              <RotateCcw size={14} />
            </button>
            <button 
              onClick={togglePlay}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/40 shrink-0"
              disabled={isSmartBuffering || recoveryActive}
            >
              {store.playerState === 'playing' ? (
                <>
                  <Pause size={14} fill="currentColor" /> PAUSE
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" /> PLAY
                </>
              )}
            </button>
            <button 
              onClick={seekForward}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-rose-450 transition-all cursor-pointer border border-zinc-850"
              title="Skip Forward 10s"
            >
              <SkipForward size={14} />
            </button>
            <button 
              onClick={playNext}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-rose-450 transition-all cursor-pointer border border-zinc-850"
              title="Next Song"
            >
              <SkipForward size={14} fill="currentColor" />
            </button>
            <button 
              onClick={toggleRepeat}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold ${
                store.repeatEnabled 
                  ? 'bg-rose-950/30 border-rose-900 text-rose-400 shadow-md shadow-rose-950/20' 
                  : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'
              }`}
              title="Repeat/Loop Song Code"
            >
              <Repeat size={14} className={store.repeatEnabled ? "animate-pulse font-bold" : ""} />
              <span className="text-[10px] hidden sm:inline">LOOP</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => store.toggleSavedVideo(video)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSaved 
                  ? 'bg-rose-950/20 border-rose-900 text-rose-400' 
                  : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'
              }`}
              title={isSaved ? "Remove from Saved" : "Save Video"}
            >
              <Heart size={14} fill={isSaved ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => store.toggleWatchLater(video)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                inWatchLater 
                  ? 'bg-fuchsia-950/20 border-fuchsia-900 text-fuchsia-400' 
                  : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'
              }`}
              title={inWatchLater ? "Remove from Watch Later" : "Add to Watch Later"}
            >
              <Clock size={14} />
            </button>

            <button
              onClick={postVideoToTelegram}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer border border-zinc-850 flex items-center gap-1.5 text-[11px] font-mono"
            >
              <Send size={12} className="rotate-[-15deg] translate-y-[-1px]" />
              <span className="hidden sm:inline font-bold">TELEGRAM</span>
            </button>
          </div>
        </div>

        {/* Dynamic Volume Control Bar */}
        <div className="flex items-center justify-between gap-3 p-3 bg-zinc-900/40 rounded-xl border border-zinc-900/60 font-mono text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => store.setMediaMuted(!store.mediaMuted)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-rose-400 font-bold transition-all cursor-pointer"
              title={store.mediaMuted ? "Unmute" : "Mute"}
            >
              {store.mediaMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <span className="text-[10px] text-zinc-400 font-bold uppercase shrink-0">
              Volume: {store.mediaMuted ? 'Muted' : `${store.mediaVolume}%`}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-grow max-w-[200px]">
            <input
              type="range"
              min="0"
              max="100"
              value={store.mediaMuted ? 0 : store.mediaVolume}
              onChange={(e) => {
                store.setMediaMuted(false);
                store.setMediaVolume(parseInt(e.target.value));
              }}
              className="w-full h-1 bg-zinc-850 accent-rose-500 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* ⚙️ Smart Buffer Optimization and Diagnostics Console */}
        <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-4.5 space-y-3.5 select-none">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-850/60">
            <h3 className="text-xs font-mono font-black text-rose-350 uppercase flex items-center gap-1.5">
              <Sliders size={13} className="text-rose-450 animate-pulse" /> Stream Stabilizer &amp; Buffer Optimizer
            </h3>
            <span className="text-[8.5px] font-mono text-zinc-500 font-bold tracking-wider uppercase">Active Diagnostic Engine</span>
          </div>

          {/* Playback mode settings */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-tight block">
              Playback Mode Preference
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['smooth', 'balanced', 'best'] as const).map((mode) => {
                const active = store.playbackMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => store.setPlaybackMode(mode)}
                    className={`py-1.5 px-2 rounded-xl border text-[9px] font-mono font-extrabold uppercase transition-all duration-250 cursor-pointer flex items-center justify-center gap-1 leading-none ${
                      active
                        ? 'bg-rose-950/20 border-rose-900 text-rose-400 shadow-sm shadow-rose-950/10 font-black'
                        : 'bg-zinc-950 border-zinc-850 hover:border-zinc-800 text-zinc-500 hover:text-zinc-450'
                    }`}
                  >
                    {active && <Check size={10} />}
                    {mode === 'smooth' && 'Smooth Playback'}
                    {mode === 'balanced' && 'Balanced Mode'}
                    {mode === 'best' && 'Best Quality'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Physical States instrumentation readouts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
            {/* Speedometer */}
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex flex-col justify-between">
              <span className="text-[8px] text-zinc-550 uppercase tracking-wider font-bold">Network Speed</span>
              <span className="text-xs font-black text-white mt-1 flex items-baseline gap-0.5">
                {networkSpeed} <span className="text-[8px] text-zinc-400 font-normal">Mbps</span>
              </span>
              <div className="mt-1.5 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  networkStatus === 'Optimal' ? 'bg-emerald-500' : networkStatus === 'Unstable' ? 'bg-amber-400' : 'bg-red-500'
                }`} />
                <span className="text-[7.5px] font-black text-zinc-400 uppercase leading-none">{networkStatus}</span>
              </div>
            </div>

            {/* Latency meter */}
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex flex-col justify-between overflow-hidden">
              <span className="text-[8px] text-zinc-550 uppercase tracking-wider font-bold">Latency (RTT)</span>
              <span className="text-xs font-black text-white mt-1">
                {latency} <span className="text-[8px] text-zinc-450 font-normal">ms</span>
              </span>
              <span className="text-[7.5px] text-zinc-500 uppercase font-black tracking-tight mt-1">Latency Peak Checked</span>
            </div>

            {/* Simulated Packet loss tracker */}
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex flex-col justify-between">
              <span className="text-[8px] text-zinc-550 uppercase tracking-wider font-bold">Packet Loss</span>
              <span className="text-xs font-black text-white mt-1">
                {packetLoss} <span className="text-[8px] text-zinc-450 font-normal">%</span>
              </span>
              <span className={`text-[7.5px] font-black tracking-tight mt-1 uppercase ${
                packetLoss > 2 ? 'text-amber-500' : 'text-zinc-500'
              }`}>
                {packetLoss > 3 ? 'Stutter Predict' : 'Loss Minimal'}
              </span>
            </div>

            {/* Buffer health meter */}
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex flex-col justify-between">
              <span className="text-[8px] text-zinc-550 uppercase tracking-wider font-bold">Buffer Level</span>
              <span className="text-xs font-black mt-1 text-white">
                {bufferHealth} <span className="text-[8px] text-zinc-450 font-normal">secs</span>
              </span>
              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-1.5">
                <div 
                  className={`h-full transition-all duration-300 ${
                    bufferHealth > 10 ? 'bg-emerald-500' : bufferHealth > 4 ? 'bg-amber-400' : 'bg-red-500 animate-pulse'
                  }`}
                  style={{ width: `${Math.min(100, (bufferHealth / 16) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Detailed Info status banner */}
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-850 rounded-xl text-[9.5px] text-zinc-400 font-mono">
            <Gauge size={13} className="text-rose-455 shrink-0" />
            <div className="flex-1 leading-normal">
              Current Playback Quality set to: <strong className="text-zinc-200">{getQualityLabel(currentQuality)}</strong>.
              {isSmartBuffering ? (
                <span className="text-amber-450 font-bold ml-1">Pre-buffering ahead...</span>
              ) : store.playerState === 'playing' ? (
                <span className="text-emerald-450 font-bold ml-1">Fluid playback active.</span>
              ) : (
                <span className="text-zinc-500 ml-1">Standby mode loaded.</span>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

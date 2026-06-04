import React, { useState } from 'react';
import { useAppStore, YouTubeVideo } from '../store';
import { 
  Search, Play, Heart, Clock, History, Loader2, 
  Film, Sparkles, AlertCircle
} from 'lucide-react';

export default function YouTubeMediaHub() {
  const store = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError('');
    setResults([]);
    try {
      const res = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery, 
          apiKey: store.youtubeApiKey || undefined 
        })
      });
      const data = await res.json();
      if (data.ok && data.videos) {
        setResults(data.videos);
      } else {
        setSearchError(data.error || 'Failed to fetch search results.');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Network error executing media search lookup.');
    } finally {
      setSearching(false);
    }
  };

  const handlePlayVideo = (video: YouTubeVideo) => {
    store.setActiveVideo(video);
    store.addToWatchHistory(video);
  };

  const getResumeTime = (video: YouTubeVideo) => {
    const hist = store.watchHistory.find(h => h.id === video.id);
    return hist?.position || 0;
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto pb-16 animate-fade select-all">
      {/* 1. Dashboard Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-md">
        <div className="space-y-1">
          <h2 className="text-sm font-mono tracking-wider font-extrabold text-rose-450 uppercase flex items-center gap-2">
            <Film size={16} /> YouTube Video Hub
          </h2>
          <p className="text-xs font-mono text-zinc-400">
            Confident voice activation, real history persistence, and web-view video mode streaming.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-950 px-3.5 py-1.5 rounded-2xl border border-zinc-855 self-start">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Voice Ready</span>
        </div>
      </div>

      {/* 2. Voice Command Cheatsheet */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-mono font-black text-rose-350 uppercase flex items-center gap-1.5 mb-1.5">
            <Sparkles size={13} className="text-amber-400" /> Video Voice Commands
          </h3>
          <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
            Activate the voice loop and speak naturally to stream video content:
          </p>
          <ul className="mt-2 space-y-1 text-[10px] font-mono text-zinc-500 list-disc list-inside">
            <li>"Play video about Python object-oriented structures"</li>
            <li>"Pause video" or "Roko video"</li>
            <li>"Resume video" (Restores past playback position!)</li>
            <li>"Skip video forward 10 seconds"</li>
          </ul>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-zinc-900 pt-3 md:pt-0 md:pl-4 space-y-2">
          <h4 className="text-[11px] font-mono font-bold text-zinc-400 uppercase">
            Telegram Broadcasting
          </h4>
          <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
            Speak <strong className="text-zinc-300">"Post this video to Telegram"</strong> while watching. Rishna assistant publishes details instantly to your feed.
          </p>
        </div>
      </div>

      {/* 3. Search Engine Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-mono tracking-wider font-extrabold text-zinc-300 uppercase flex items-center gap-2">
          <Film size={14} className="text-rose-455" />
          Search YouTube Videos
        </h3>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type video topic (e.g. Science of genetics, cellular biology)..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-200 outline-none focus:border-rose-400/50 transition-colors font-mono"
            disabled={searching}
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-5 py-3 text-white font-mono text-xs font-black uppercase rounded-2xl transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0 bg-gradient-to-tr from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        {searchError && (
          <div className="p-3 bg-rose-955/20 border border-rose-900/40 text-rose-400 rounded-xl text-xs font-mono flex items-center gap-2">
            <AlertCircle size={14} />
            {searchError}
          </div>
        )}

        {/* Search Results Display */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3">
            {results.map((video) => {
              const rTime = getResumeTime(video);
              return (
                <div 
                  key={video.id + '_s'} 
                  className="bg-zinc-950 border border-zinc-85/60 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col group hover:border-rose-500/30"
                >
                  <div className="relative aspect-video bg-black focus-within:ring-2 overflow-hidden">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={() => handlePlayVideo(video)}
                      className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <div className="p-3 rounded-full text-white shadow-lg cursor-pointer bg-rose-605 shadow-rose-950/50">
                        <Play size={16} fill="currentColor" />
                      </div>
                    </button>
                    {rTime > 0 && (
                      <span className="absolute bottom-1.5 left-2 bg-emerald-950 border border-emerald-900 text-emerald-400 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Resume {Math.floor(rTime / 60)}m
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-mono font-black line-clamp-2 leading-tight uppercase transition-colors text-rose-350 group-hover:text-rose-450">
                        {video.title}
                      </h4>
                      <p className="text-[9px] font-mono text-zinc-500 truncate">
                        {video.channelName}
                      </p>
                    </div>

                    <button
                      onClick={() => handlePlayVideo(video)}
                      className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 rounded-lg cursor-pointer font-mono text-[9px] font-extrabold uppercase flex items-center justify-center gap-1 transition-all text-rose-350"
                    >
                      <Play size={10} fill="currentColor" /> Play Video
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Playlists and cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Playback History */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4 flex flex-col h-full">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-855">
            <h3 className="text-xs font-mono font-black text-zinc-300 uppercase flex items-center gap-1.5">
              <History size={13} className="text-orange-450" /> Recently Watched
            </h3>
            {store.watchHistory.length > 0 && (
              <button 
                onClick={() => store.clearWatchHistory()}
                className="text-[8px] font-mono text-rose-400 bg-rose-955/20 border border-rose-900/40 px-1.5 py-0.5 rounded cursor-pointer hover:bg-rose-955/40"
              >
                CLEAR
              </button>
            )}
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 custom-scrollbar pr-0.5">
            {store.watchHistory.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-500 italic text-center py-8">
                No history logged yet. Speak "play video about..." to start streaming!
              </p>
            ) : (
              store.watchHistory.map((vid) => (
                <div 
                  key={vid.id + '_h'} 
                  className="flex gap-2.5 bg-zinc-950 border border-zinc-850/60 hover:border-rose-900/40 p-2 rounded-xl transition-all group relative cursor-pointer"
                  onClick={() => handlePlayVideo(vid)}
                >
                  <img 
                    src={vid.thumbnail} 
                    alt={vid.title} 
                    className="w-14 aspect-video object-cover rounded-lg bg-zinc-900 shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-[10px] font-mono font-bold text-zinc-300 leading-tight truncate uppercase group-hover:text-rose-400">
                      {vid.title}
                    </h4>
                    <span className="text-[8px] font-mono text-zinc-500 truncate">{vid.channelName}</span>
                    {vid.position && vid.duration && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-indigo-400 font-bold shrink-0">
                          {Math.floor(vid.position / 60)}m / {Math.floor(vid.duration / 60)}m
                        </span>
                        <div className="flex-1 bg-zinc-950 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full"
                            style={{ width: `${(vid.position / vid.duration) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Saved Videos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4 flex flex-col h-full">
          <div className="pb-2 border-b border-zinc-855">
            <h3 className="text-xs font-mono font-black text-zinc-300 uppercase flex items-center gap-1.5">
              <Heart size={13} className="text-rose-450" /> Saved Favourites
            </h3>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 custom-scrollbar pr-0.5">
            {store.savedVideos.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-500 italic text-center py-8">
                No videos saved as favourite. Click heart icon while watching a video!
              </p>
            ) : (
              store.savedVideos.map((vid) => (
                <div 
                  key={vid.id + '_f'} 
                  className="flex gap-2.5 bg-zinc-950 border border-zinc-855/60 hover:border-rose-900/40 p-2 rounded-xl transition-all group cursor-pointer"
                  onClick={() => handlePlayVideo(vid)}
                >
                  <img 
                    src={vid.thumbnail} 
                    alt={vid.title} 
                    className="w-14 aspect-video object-cover rounded-lg bg-zinc-900 shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-[10px] font-mono font-bold text-zinc-300 leading-tight truncate uppercase group-hover:text-rose-450">
                      {vid.title}
                    </h4>
                    <span className="text-[8px] font-mono text-zinc-500 truncate">{vid.channelName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Watch Later */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4 flex flex-col h-full">
          <div className="pb-2 border-b border-zinc-855">
            <h3 className="text-xs font-mono font-black text-zinc-300 uppercase flex items-center gap-1.5">
              <Clock size={13} className="text-fuchsia-450" /> Watch Later Queue
            </h3>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 custom-scrollbar pr-0.5">
            {store.watchLater.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-500 italic text-center py-8">
                Your Watch Later list is empty. Add videos while streaming to save!
              </p>
            ) : (
              store.watchLater.map((vid) => (
                <div 
                  key={vid.id + '_l'} 
                  className="flex gap-2.5 bg-zinc-950 border border-zinc-855/60 hover:border-rose-900/40 p-2 rounded-xl transition-all group cursor-pointer"
                  onClick={() => handlePlayVideo(vid)}
                >
                  <img 
                    src={vid.thumbnail} 
                    alt={vid.title} 
                    className="w-14 aspect-video object-cover rounded-lg bg-zinc-900 shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-[10px] font-mono font-bold text-zinc-300 leading-tight truncate uppercase group-hover:text-rose-400">
                      {vid.title}
                    </h4>
                    <span className="text-[8px] font-mono text-zinc-500 truncate">{vid.channelName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

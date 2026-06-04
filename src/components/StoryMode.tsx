import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
  BookOpen, Play, Pause, Square, SkipForward, Volume2, History, Infinity, 
  Flame, Skull, Heart, Compass, Search, Award, HelpCircle, Theater, Map, Quote, Check, Clock
} from 'lucide-react';

export default function StoryMode() {
  const store = useAppStore();
  const state = store.storyState;
  
  const [selectedCategory, setSelectedCategory] = useState<string>('horror');
  const [selectedDuration, setSelectedDuration] = useState<string>('15m');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the live narration console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.narrationTranscript]);

  const categories = [
    { id: 'horror', name: 'Horror', icon: Skull, desc: 'Scary, ghost and spooky narratives', accent: 'text-red-500 hover:bg-red-500/10 border-red-500/20' },
    { id: 'adventure', name: 'Adventure', icon: Compass, desc: 'Thrilling journey and exploration', accent: 'text-amber-500 hover:bg-amber-500/10 border-amber-500/20' },
    { id: 'mystery', name: 'Mystery', icon: Search, desc: 'Suspenseful detective & secret solving', accent: 'text-cyan-500 hover:bg-cyan-500/10 border-cyan-500/20' },
    { id: 'love', name: 'Love Story', icon: Heart, desc: 'Romantic and emotional bonds', accent: 'text-pink-500 hover:bg-pink-500/10 border-pink-500/20' },
    { id: 'motivational', name: 'Motivational', icon: Flame, desc: 'Inspiring tales of victory & hustle', accent: 'text-orange-500 hover:bg-orange-500/10 border-orange-500/20' },
    { id: 'fantasy', name: 'Fantasy', icon: Map, desc: 'Magical realms, spells & legends', accent: 'text-purple-500 hover:bg-purple-500/10 border-purple-500/20' },
    { id: 'comedy', name: 'Comedy', icon: Theater, desc: 'Hilarious scripts and witty humor', accent: 'text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20' },
    { id: 'historical', name: 'Historical', icon: History, desc: 'Epic historical wars and tales of kings', accent: 'text-blue-500 hover:bg-blue-500/10 border-blue-500/20' },
    { id: 'sci_fi', name: 'Sci-Fi', icon: Infinity, desc: 'Dystopian futures, AI, and black holes', accent: 'text-indigo-500 hover:bg-indigo-500/10 border-indigo-500/20' },
  ];

  const durations = [
    { id: '15m', label: '15 Minute Story', chapters: 3 },
    { id: '30m', label: '30 Minute Story', chapters: 6 },
    { id: '1h', label: '1 Hour Story', chapters: 12 },
    { id: '2h', label: '2 Hour Story', chapters: 24 },
    { id: 'endless', label: 'Infinite Mode', chapters: 999 },
  ];

  const triggerVoiceCommand = (command: string) => {
    // Dispatch custom event to trigger text sending via the Live WebSocket in App.tsx
    window.dispatchEvent(new CustomEvent('story-command', {
      detail: { 
        action: 'send-text', 
        payload: { text: command } 
      }
    }));
  };

  const handleStartStory = () => {
    // Construct Hinglish voice prompt matching user intent
    let promptText = '';
    const categoryName = categories.find(c => c.id === selectedCategory)?.name || 'Spooky';
    const durationLabel = durations.find(d => d.id === selectedDuration)?.label || '15 Minutes';
    
    if (customPrompt.trim()) {
      promptText = `Rishu Boss, ${categoryName} kahani sunao jiska topic hai: "${customPrompt}". Kahani ${durationLabel} lambi honi chahiye.`;
    } else {
      promptText = `Rishu Boss, ek shaandar ${categoryName} kahani sunao. Is story ka duration lagbhag ${durationLabel} hona chahiye.`;
    }

    // Trigger story start
    window.dispatchEvent(new CustomEvent('story-command', {
      detail: {
        action: 'start',
        payload: { prompt: promptText, category: selectedCategory, duration: selectedDuration }
      }
    }));
  };

  const handlePauseStory = () => {
    triggerVoiceCommand("Pause story");
  };

  const handleResumeStory = () => {
    triggerVoiceCommand("Resume story");
  };

  const handleStopStory = () => {
    // Completely clear storytelling state
    store.resetStoryState();
    triggerVoiceCommand("System Command: Stop storytelling mode entirely.");
  };

  const handleNextChapter = () => {
    triggerVoiceCommand("Continue story");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 font-mono text-[140px] uppercase pointer-events-none select-none tracking-tighter">
          NARRATOR
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold tracking-wider uppercase">
                Long Story Engine v4.2
              </span>
              {state.isActive && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase ${
                  state.isPaused 
                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${state.isPaused ? 'bg-zinc-500' : 'bg-emerald-400 animate-ping'}`} />
                  {state.isPaused ? 'Narrator Paused' : 'Narrator Active'}
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-sans tracking-tight font-medium text-white">
              Dedicated Long Story Mode
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl font-sans leading-relaxed">
              Immersive, persistent, chapter-by-chapter Hinglish audiobooks curated live by your assistant. 
              Supports 15 minute up to 2 hour continuous narration with zero artificial interruptions.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => triggerVoiceCommand("Kahani sunao")}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono text-xs tracking-wider cursor-pointer transition-all"
            >
              🎤 "KAHANI SUNAO"
            </button>
            <button
              onClick={() => triggerVoiceCommand("Endless story sunao")}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono text-xs tracking-wider cursor-pointer transition-all"
            >
              🎤 "ENDLESS SUNAO"
            </button>
          </div>
        </div>
      </div>

      {state.isActive ? (
        /* ACTIVE STORY DASHBOARD */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Story Narrator Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Audio Wave & Meta Status Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div>
                  <div className="text-[10px] font-mono tracking-wider text-amber-400 uppercase">
                    Narrating: {state.type.toUpperCase()} Genre
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-white mt-1">
                    {state.title || "Untitled Animated Saga"}
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-zinc-600" /> Duration: <strong className="text-zinc-300">{state.durationMinutes === 'endless' ? 'Infinite/Endless' : state.durationMinutes}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={13} className="text-zinc-600" /> Chapter: <strong className="text-zinc-300">{state.currentChapter} / {state.totalChapters === 999 ? 'Endless' : state.totalChapters}</strong>
                    </span>
                  </div>
                </div>

                {/* Main player controls widgets */}
                <div className="flex gap-2 self-start sm:self-center">
                  {state.isPaused ? (
                    <button
                      onClick={handleResumeStory}
                      className="p-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 font-mono text-xs font-bold"
                      title="Resume Narration"
                    >
                      <Play size={16} fill="currentColor" /> RESUME
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseStory}
                      className="p-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 font-mono text-xs font-bold"
                      title="Pause Narration"
                    >
                      <Pause size={16} fill="currentColor" /> PAUSE
                    </button>
                  )}
                  
                  <button
                    onClick={handleNextChapter}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 font-mono text-xs"
                    title="Skip to Next Chapter"
                  >
                    <SkipForward size={15} /> Continue
                  </button>

                  <button
                    onClick={handleStopStory}
                    className="p-3 bg-zinc-950 hover:bg-red-950/40 border border-zinc-800 hover:border-red-500/40 text-rose-500 rounded-xl cursor-pointer transition-all flex items-center justify-center"
                    title="Stop & Clear Story"
                  >
                    <Square size={14} fill="currentColor" />
                  </button>
                </div>
              </div>

              {/* Progress Tracker Slider bar (Visual only) */}
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-[11px] text-zinc-500">
                  <span>NARATIVE TIMELINE</span>
                  <span>
                    {state.totalChapters === 999 
                      ? `Chapter ${state.currentChapter} (Continuous Endless mode)`
                      : `Chapter ${state.currentChapter} of ${state.totalChapters} (${Math.round((state.currentChapter / state.totalChapters) * 100)}% completed)`
                    }
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${state.totalChapters ? Math.min(100, (state.currentChapter / state.totalChapters) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Live Streaming Cap Scrolling Panel */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-wider">
                  <Volume2 size={13} className="text-amber-500" />
                  Narration Scroll (Real-Time Subtitles)
                </div>
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 min-h-[180px] max-h-[300px] overflow-y-auto font-sans text-sm text-zinc-300 leading-relaxed space-y-4 shadow-inner">
                  {state.narrationTranscript ? (
                    <p className="whitespace-pre-line text-zinc-200 animate-[fadeIn_0.5s_ease]">
                      {state.narrationTranscript}
                    </p>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-zinc-600 font-mono text-xs text-center space-y-2">
                      <div className="h-2.5 w-20 bg-zinc-900 rounded animate-pulse" />
                      <p>Roy is talking! Listening for voice signals...</p>
                    </div>
                  )}
                  <div ref={consoleEndRef} />
                </div>
              </div>
            </div>

            {/* Chapters Chronicles log */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h4 className="text-xs font-mono tracking-wider text-zinc-400 uppercase flex items-center gap-2">
                <History size={15} className="text-amber-500" />
                Chapter Chronicles Stack (Survives Reloads)
              </h4>
              {state.chaptersHistory.length > 0 ? (
                <div className="space-y-3">
                  {state.chaptersHistory.map((chap, i) => (
                    <details 
                      key={i} 
                      className="group bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden transition-all"
                      open={i === state.chaptersHistory.length - 1}
                    >
                      <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-900/60 transition-colors select-none">
                        <span className="font-mono text-xs font-bold text-zinc-300">
                          {chap.title || `Chapter ${chap.chapter}`}
                        </span>
                        <span className="text-[11px] font-mono text-amber-500 group-open:rotate-180 transition-transform">
                          ▼ Read Text
                        </span>
                      </summary>
                      <div className="p-4 pt-1 border-t border-zinc-900 text-xs font-sans text-zinc-400 leading-relaxed whitespace-pre-line">
                        {chap.content}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-600 font-mono text-xs">
                  No historical chapters saved. Keep listening to commit to timeline archives!
                </div>
              )}
            </div>

          </div>

          {/* Right Sidebar Hints Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl h-fit space-y-6">
            <div className="space-y-1.5">
              <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-200 uppercase">
                Story Voice Registry
              </h3>
              <p className="text-xs font-sans text-zinc-500 leading-relaxed">
                As "Rishu Boss", speak these direct Hindi triggers or use the panels to orchestrate long narratives.
              </p>
            </div>

            <div className="divide-y divide-zinc-800/65 text-xs font-mono">
              {[
                { trigger: "Kahani sunao", cmd: "Roy, ek achhi kahani sunao" },
                { trigger: "Horror kahani sunao", cmd: "Horror kahani sunao bhoot ki" },
                { trigger: "Love story sunao", cmd: "Motivational ya love story suna do" },
                { trigger: "1 ghante ki kahani sunao", cmd: "1 ghante lambi kahani shuru karo" },
                { trigger: "Endless story sunao", cmd: "Endless story sunao, stop mat karna" },
                { trigger: "Kahani pause karo", cmd: "Kahani pause karo" },
                { trigger: "Kahani resume karo", cmd: "Continue story" },
              ].map((item, i) => (
                <div key={i} className="py-3 flex justify-between gap-1.5">
                  <span className="text-amber-400 font-bold">"{item.trigger}"</span>
                  <button 
                    onClick={() => triggerVoiceCommand(item.trigger)}
                    className="text-[10px] text-zinc-500 hover:text-white cursor-pointer px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-850 hover:bg-zinc-800"
                  >
                    Send Verb
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800/70 rounded-2xl p-4 space-y-2.5 font-sans">
              <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Quote size={13} className="text-amber-500" />
                Narrative Rulebook
              </h4>
              <ul className="text-[11px] text-zinc-500 leading-relaxed list-disc list-inside space-y-1.5">
                <li>Automatic transition loops run when Roy finishes chapters.</li>
                <li>Hinglish audio voice matches custom emotion thresholds beautifully.</li>
                <li>Supports offline persistence (keeps your bookmark safe across refreshes!)</li>
              </ul>
            </div>
          </div>

        </div>
      ) : (
        /* CONFIGURATION AND BUILD PANEL */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Category Cards Selector Container */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-200 uppercase flex items-center gap-1.5">
                  <BookOpen size={16} className="text-amber-500" />
                  1. SELECT NARRATIVE GENRE
                </h3>
                <p className="text-xs text-zinc-500 font-sans">
                  Choose the thematic setting and emotional voice envelope for your story.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isCur = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-4 border rounded-2xl text-left cursor-pointer transition-all ${cat.accent} ${
                        isCur 
                          ? 'bg-zinc-950 border-zinc-500 shadow-lg scale-[1.02]' 
                          : 'bg-zinc-950/30 border-zinc-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon size={20} />
                        {isCur && <Check size={14} className="text-white bg-zinc-800 rounded-full p-0.5" />}
                      </div>
                      <h4 className="font-mono text-xs font-bold text-zinc-200 mt-3">{cat.name}</h4>
                      <p className="text-[11px] text-zinc-500 font-sans mt-1 leading-snug">{cat.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom story prompt box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-200 uppercase">
                ADD CUSTOM PLOT DIRECTION (OPTIONAL)
              </h3>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Example: 'A spaceship lost inside a terrifying black hole' or 'A village ghost haunting near an old banyan tree'..."
                className="w-full h-24 bg-zinc-950 border border-zinc-850 rounded-2xl p-4 text-xs font-mono text-zinc-300 outline-none focus:border-amber-400/40 leading-relaxed placeholder:text-zinc-650"
              />
            </div>
          </div>

          {/* Right Config bar */}
          <div className="space-y-6">
            
            {/* Story Duration and Build Start */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-200 uppercase">
                  2. TIMELINE SETTING
                </h3>
                <p className="text-xs text-zinc-500">
                  Select narration span and chapter partition.
                </p>
              </div>

              <div className="space-y-3">
                {durations.map((dur) => {
                  const isCur = selectedDuration === dur.id;
                  return (
                    <button
                      key={dur.id}
                      onClick={() => setSelectedDuration(dur.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left cursor-pointer transition-all font-mono text-xs ${
                        isCur 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold' 
                          : 'bg-zinc-950/60 text-zinc-400 border-zinc-850 hover:bg-zinc-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isCur ? 'bg-amber-400' : 'bg-zinc-700'}`} />
                        {dur.label}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {dur.chapters === 999 ? 'Infinite loop' : `~ ${dur.chapters} Chapters`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleStartStory}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:brightness-110 font-mono text-xs font-bold uppercase rounded-2xl cursor-pointer transition-all shadow-xl shadow-amber-500/5 hover:scale-[1.01]"
              >
                🎮 SPARK LIVE STORY
              </button>
            </div>

            {/* Quick Helper Box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-mono tracking-wider text-zinc-300 uppercase flex items-center gap-1.5">
                <HelpCircle size={15} className="text-zinc-400" />
                How to play?
              </h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                Roy Girl AI operates via real-time spoken audio pipelines. 
                Ensure your <strong>Google API Key</strong> is configured and the AI Orb is connected before sparking stories!
              </p>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

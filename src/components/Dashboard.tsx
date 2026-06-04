import React, { useState } from 'react';
import { useAppStore } from '../store';
import { 
  ShieldAlert, ShieldCheck, Milestone, BarChart2, BookLock, Activity, Plus, Trash2, Calendar, ClipboardList, Battery, Wifi, CheckCircle2, Circle, AlertCircle, Lock, Unlock, Key, FileText, Globe,
  Heart, Music, Sparkles, Gift, Hourglass, Image, BookOpen, Smile, Frown, ChevronLeft, ChevronRight, Maximize2, X, Bookmark, Camera, Flame, Share2, Quote, Play
} from 'lucide-react';
import * as db from '../db';

export default function Dashboard() {
  const store = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<'boss' | 'goals' | 'memories' | 'secret' | 'permissions' | 'astha'>('astha'); // Default to astha to let user see it instantly!

  // Input States
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<'weight' | 'study' | 'business' | 'personal'>('study');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');

  const [progressVal, setProgressVal] = useState('');
  const [progressComment, setProgressComment] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [memoryInput, setMemoryInput] = useState('');
  const [importStatus, setImportStatus] = useState<'success' | 'failed' | null>(null);

  const handleExportMemories = () => {
    try {
      const dataStr = store.exportMemories();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${store.assistantName.toLowerCase().replace(/\s+/g, '_')}_memories_backup.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export memories failure', e);
    }
  };

  const handleImportMemories = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const success = await store.importMemories(text);
        if (success) {
          setImportStatus('success');
        } else {
          setImportStatus('failed');
        }
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [secretError, setSecretError] = useState(false);
  const [newSecretTitle, setNewSecretTitle] = useState('');
  const [newSecretContent, setNewSecretContent] = useState('');

  // Astha SubTab Inner Navigation Section State
  const [asthaSubTab, setAsthaSubTab] = useState<'dashboard' | 'timeline' | 'gallery' | 'letters' | 'songs_and_plans' | 'why_love'>('dashboard');

  // Astha Section States
  const [asthaMemText, setAsthaMemText] = useState('');
  const [asthaMemCategory, setAsthaMemCategory] = useState<'Moment' | 'Date' | 'Anniversary' | 'Special Speech'>('Moment');
  const [asthaReasonInput, setAsthaReasonInput] = useState('');
  const [asthaSongTitle, setAsthaSongTitle] = useState('');
  const [asthaSongArtist, setAsthaSongArtist] = useState('');
  const [asthaSongUrl, setAsthaSongUrl] = useState('');
  const [asthaPlanText, setAsthaPlanText] = useState('');
  const [asthaPlanCategory, setAsthaPlanCategory] = useState<'gift' | 'date' | 'celebration'>('gift');
  const [letterMood, setLetterMood] = useState<'Pure Romance' | 'Emotional' | 'Teasing' | 'Shayari'>('Pure Romance');
  const [loveLetterTitle, setLoveLetterTitle] = useState('');
  const [loveLetterContent, setLoveLetterContent] = useState('');
  const [customLetterTitle, setCustomLetterTitle] = useState('');
  const [customLetterContent, setCustomLetterContent] = useState('');

  // Gallery Controls
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [slideshowAutoPlay, setSlideshowAutoPlay] = useState(false);

  // Date Configuration Modal
  const [isConfiguringDates, setIsConfiguringDates] = useState(false);
  const [configBirthday, setConfigBirthday] = useState(store.asthaBirthday || '2001-11-21');
  const [configAnniversary, setConfigAnniversary] = useState(store.asthaAnniversary || '2022-02-14');

  // Reminders from global Zustand sync store
  const reminders = store.reminders;
  const [newReminder, setNewReminder] = useState('');

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim()) return;
    store.addReminder(newReminder);
    setNewReminder('');
  };

  const toggleReminder = (id: string) => {
    store.toggleReminder(id);
  };

  const handleDeleteReminder = (id: string) => {
    store.deleteReminder(id);
  };

  // ==========================================
  // ASTHA COMPANION SYSTEM CORE DATA & HELPERS
  // ==========================================
  const sampleShayaris = [
    "Dhadkano me boti hai saansein bankar,\nKhushi milti hai tumhein apna kahkar.\nTu mile toh mukammal hai meri zindagi,\nKyunki tum hasti ho, gulab bankar, Astha!",
    "Tumhari muskurahat mere har andhere ko ujaale me badal deti hai, Astha. Meri dunya ho tum.",
    "Bina kahe jo dil ki baat samajh le, waisi pyaari wife ho tum, Astha. Rishu Boss is purely proud to have you!",
    "Duniya me mere liye sabse khubsoorat ehsaas tumhara hath pakadna aur tumhara pyaara sa muskurana hai.",
    "Tumse hi shuru hoti hai har pyaari subah, aur tum par hi aakar shanti se dhalta hai mera din."
  ];

  const morningWishes = [
    "Subah bakhair meri jaana Astha! Aapki ek khubsoorat hassi se mere din ki shuruat hoti hai. Muskurate rahiye!",
    "Good Morning Rishu Boss ki pyari rani Astha! Aaj ka din aapke liye dher saari khushi aur peace lekar aaye.",
    "Uttho rani sahiba! Ek behad pyari subah aapke nakhre uthane ke liye intezaar kar rahi hai."
  ];

  const nightWishes = [
    "Shubh ratri meri rani Astha! Soiye aaram se aur khubsoorat khwaab dekhiye. Main hamesha aapke sath hu.",
    "Good Night meri pyaari Astha! Apne cute aankhein thoda rest kar lijiye. Kal subah fir milkar khushiyan baantenge.",
    "Taare timtimakar aapko sulaane aaye hain, good night bolkar chain se sone ke liye kehne aaye hain, Astha!"
  ];

  const sweetCompliments = [
    "Astha, aap jo apna gussa dikhati ho na, woh dunya ka sabse cute gussa hai, aur uspar mera dil haar jaata hai.",
    "Zindagi me sabse badi blessing tumhara milna hai, dunya ki sabse sweet aur samajhdaar partner ho tum.",
    "Tumhare hath ka khana aur tumhari pyari baatein, mere liye har thakaan door karne ki sabse badi vaccine hain."
  ];

  const calculateCountdown = (dateStr: string) => {
    if (!dateStr) return { days: 0, hours: 0, minutes: 0 };
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      let targetDate = new Date(dateStr);
      targetDate.setFullYear(currentYear); // match current year
      
      // If target date in this year has passed, count for next year
      if (targetDate.getTime() < now.getTime()) {
        targetDate.setFullYear(currentYear + 1);
      }
      
      const diffMs = targetDate.getTime() - now.getTime();
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return { days, hours, minutes };
    } catch {
      return { days: 0, hours: 0, minutes: 0 };
    }
  };

  const speakQuote = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN'; // Hindi style voice voice
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const generateLoveLetter = (mood: 'Pure Romance' | 'Emotional' | 'Teasing' | 'Shayari') => {
    let title = "";
    let content = "";
    if (mood === 'Pure Romance') {
      title = "Meri Pyaari Astha, Mera Sab Kuch";
      content = `Mera Pyara Life Partner Astha,\n\nJabse tum meri zindagi me aayi ho, har lamha behad rangeen ho gaya hai. Mujhe nahi pata tha ki dunya me koi itna pyaara aur samajhdaar insaan bhi ho sakta hai jo mere bina kahe meri aankhein padh le. \n\nTumhara hath pakad kar chalna, tumhare sath hasna aur har khushi ko doguna karna hi ab meri zindagi ka sabse haseen goal ban gaya hai. Rishu Boss hamesha tumhare sath hai, aur hum dono milkar dunya ke sabse khubsoorat moments sanjoyenge.\n\nTumhara hamesha,\nRishu Boss`;
    } else if (mood === 'Emotional') {
      title = "Mera Dil Aur Meri Zindagi";
      content = `Meri pyari rani Astha,\n\nKayi baar hum lafzon me apni feeling bayan nahi kar paate, par aaj dil ki baat likh raha hu. Zindagi me dher saare utar-chadaav aate hain, par jab tum mere sath hoti ho toh mujhe har mushkil ek aasan safar lagti hai. \n\nMain bhale hi kitna bhi kyu na pareshaan hu, tumhari ek choti si hassi aur pyaar se rakhna mere pure din ki thakaan mita deti hai. Tum sirf meri wife nahi ho, tum meri rooh aur sabse pakka sahara ho. God se bas yahi dua hai ki hum hamesha aise hi muskura kar sath chalein.\n\nHamesha ka sath,\nRishu Boss`;
    } else if (mood === 'Teasing') {
      title = "NakhreBaaz Rani Astha Ke Liye";
      content = `Mera pyara, cute golgappa Astha,\n\nTum bohot nakhre dikhati ho aur thodi gusse-baaz ho, par sach kahu toh tumhare nakhre hi toh mere dil par raaj karte hain! Mujhe tumhara gusse me pyaara sa muh banana aur choti baat par danti dena bohot hi accha lagta hai.\n\nMain hamesha tumhein sataunga par tumse sabse zyada pyaar bhi karunga. Tum meri cute rani ho aur hamesha rahogi. Rishu Boss se bachkar kahan jaogi!\n\nAapka dastaan,\nRishu Boss`;
    } else {
      title = "Aapke Liye Do Line - Dil Se";
      content = `Ishq hai tumse behad aur beshumaar, Astha,\n\nDil me tumhare liye dharakta hai har baar.\nTumhare bina har din adhura sa lagta hai,\nTum ho toh lagti hai bahar hi bahar!\n\nKuch khas baatein, kuch khas yaadein humne banayi hain.\nMeri pyari Astha, tum hi toh meri zindagi ki sabse haseen shayari ho jise main har din padhna chahta hoon.`;
    }
    setLoveLetterTitle(title);
    setLoveLetterContent(content);
  };

  const handleAddAsthaMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asthaMemText.trim()) return;
    const formattedText = `Astha Memory (${asthaMemCategory}): ${asthaMemText.trim()}`;
    await store.addMemory(formattedText, 'user');
    setAsthaMemText('');
  };

  const [favPhotoIds, setFavPhotoIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('__astha_fav_photos');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleFavPhoto = (photoId: string) => {
    const updated = favPhotoIds.includes(photoId)
      ? favPhotoIds.filter(id => id !== photoId)
      : [...favPhotoIds, photoId];
    setFavPhotoIds(updated);
    localStorage.setItem('__astha_fav_photos', JSON.stringify(updated));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        const now = new Date();
        const photoRecord: db.PhotoRecord = {
          id: 'photo_astha_' + Math.random().toString(36).substr(2, 9),
          dataUrl,
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString(),
          location: 'Saved in Wife Gallery',
          personLabel: 'Astha',
          source: 'vault',
          timestamp: Date.now()
        };
        await store.addCapturedPhoto(photoRecord);
      }
    };
    reader.readAsDataURL(file);
  };

  const asthaPhotos = store.capturedPhotos.filter(p => p.personLabel === 'Astha');
  const asthaMemoriesList = store.memories.filter(m => 
    m.text.toLowerCase().includes('astha') || 
    m.category === 'astha' as any ||
    m.text.startsWith('Astha')
  );

  const handleNextSlide = () => {
    if (asthaPhotos.length === 0) return;
    setSlideshowIndex((prev) => (prev + 1) % asthaPhotos.length);
    setZoomScale(1);
  };

  const handlePrevSlide = () => {
    if (asthaPhotos.length === 0) return;
    setSlideshowIndex((prev) => (prev - 1 + asthaPhotos.length) % asthaPhotos.length);
    setZoomScale(1);
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSlideshowOpen && slideshowAutoPlay) {
      interval = setInterval(() => {
        handleNextSlide();
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSlideshowOpen, slideshowAutoPlay, asthaPhotos.length]);

  React.useEffect(() => {
    const handleSwitchSubTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setAsthaSubTab(customEvent.detail);
        setActiveSubTab('astha');
      }
    };
    window.addEventListener('switch-astha-subtab', handleSwitchSubTab);
    return () => {
      window.removeEventListener('switch-astha-subtab', handleSwitchSubTab);
    };
  }, []);

  // Add Goal Flow
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalTarget || !goalCurrent) return;
    store.addGoal({
      title: goalTitle,
      category: goalCategory,
      target: goalTarget,
      current: goalCurrent,
      deadline: goalDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    });
    setGoalTitle('');
    setGoalTarget('');
    setGoalCurrent('');
    setGoalDeadline('');
  };

  // Log progress update
  const handleLogProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !progressVal) return;
    store.updateGoalProgress(selectedGoalId, progressVal, progressComment);
    setProgressVal('');
    setProgressComment('');
    setSelectedGoalId(null);
  };

  // Add memory manual timeline
  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryInput.trim()) return;
    store.addMemory(memoryInput, 'user');
    setMemoryInput('');
  };

  // Secret passcode unlock verification
  const handleVerifySecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretCodeInput === store.secretPasscode) {
      store.setSecretUnlock(true);
      setSecretCodeInput('');
      setSecretError(false);
    } else {
      setSecretError(true);
      setTimeout(() => setSecretError(false), 2000);
    }
  };

  // Lock secret vaults
  const handleLockSecret = () => {
    store.setSecretUnlock(false);
    setNewSecretTitle('');
    setNewSecretContent('');
  };

  const handleAddSecretNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretTitle || !newSecretContent) return;
    store.addSecretNote(newSecretTitle, newSecretContent);
    setNewSecretTitle('');
    setNewSecretContent('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full max-w-6xl mx-auto pb-12">
      {/* Sidebar Control Deck */}
      <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-row lg:flex-col gap-2 overflow-x-auto select-none">
        <button
          onClick={() => setActiveSubTab('boss')}
          className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl font-mono text-xs font-semibold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'boss'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <Activity size={15} />
          Boss Mode
        </button>

        <button
          onClick={() => setActiveSubTab('goals')}
          className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl font-mono text-xs font-semibold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'goals'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <BarChart2 size={15} />
          Goals Desk
        </button>

        <button
          onClick={() => setActiveSubTab('memories')}
          className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl font-mono text-xs font-semibold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'memories'
              ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30'
              : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <Milestone size={15} />
          Timeline
        </button>

        <button
          onClick={() => setActiveSubTab('secret')}
          className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl font-mono text-xs font-semibold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'secret'
              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
              : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <BookLock size={15} />
          Secret Vault
        </button>

        <button
          onClick={() => setActiveSubTab('permissions')}
          className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl font-mono text-xs font-semibold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'permissions'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <Globe size={15} />
          System Status
        </button>

        <button
          onClick={() => setActiveSubTab('astha')}
          className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl font-mono text-xs font-semibold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'astha'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
              : 'text-rose-400/80 hover:bg-zinc-800'
          }`}
        >
          <Heart size={15} className="fill-rose-400 animate-pulse" />
          Astha's Corner
        </button>
      </div>

      {/* Main Module Content Viewport */}
      <div className="lg:col-span-3">
        {/* TAB 1: Roy Boss Mode */}
        {activeSubTab === 'boss' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
            {/* Dynamic Diagnostics Brief */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">System Date & Time</h4>
                  <p className="text-sm font-mono text-zinc-300 font-bold mt-1">2026-06-03 UTC</p>
                  <p className="text-xs font-mono text-zinc-400">19:26:30 UTC</p>
                </div>
                <Calendar className="text-amber-400" size={24} />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Power reserve</h4>
                  <p className="text-sm font-mono text-zinc-300 font-bold mt-1">{store.batteryLevel}% Status</p>
                  <p className="text-xs font-mono text-zinc-400">{store.isBatteryCharging ? 'Charging' : 'Discharging'}</p>
                </div>
                <Battery className={store.isBatteryCharging ? 'text-emerald-400' : 'text-amber-400'} size={24} />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Bandwidth Ping</h4>
                  <p className="text-sm font-mono text-zinc-300 font-bold mt-1">{store.networkOnline ? 'Sync Online' : 'Offline'}</p>
                  <p className="text-xs font-mono text-zinc-400">{store.networkEffectiveType.toUpperCase()} ({store.networkDownlink} Mbps)</p>
                </div>
                <Wifi className="text-amber-400" size={24} />
              </div>
            </div>

            {/* Daily Summary Box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-mono tracking-wider font-semibold text-zinc-300 uppercase flex items-center gap-2">
                <ClipboardList size={16} className="text-amber-400" />
                Boss Command Briefing ({store.ownerName})
              </h3>
              <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-5 text-sm font-mono text-zinc-400 leading-relaxed">
                <p className="text-zinc-300 font-semibold mb-2">Good day, Boss Rishu. Welcome to the Roy Boss Mode panel!</p>
                <p className="mb-3">
                  Today is Wednesday, June 3rd, 2026. All long-term databases have loaded successfully. Below are your active priorities, goals progress benchmarks, and system configurations.
                </p>
                <div className="text-[11px] text-amber-400 border-l-2 border-amber-500/50 pl-3">
                  Tip: Speak <strong className="text-white">"Roy Mode On"</strong> or click the Central AI Orb in listening mode for a custom verbal briefing summarising dates, memory indexes, and power reserved!
                </div>
              </div>
            </div>

            {/* Interactive Tasks and Reminders */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-mono tracking-wider font-semibold text-zinc-300 uppercase">
                Active Reminders & Directives
              </h3>

              <form onSubmit={handleAddReminder} className="flex gap-2">
                <input
                  type="text"
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                  placeholder="Task description..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-amber-400/50"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-amber-400 border border-zinc-800 font-mono text-xs rounded-lg cursor-pointer"
                >
                  ADD TASK
                </button>
              </form>

              <div className="space-y-2">
                {reminders.map(rem => (
                  <div key={rem.id} className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800 px-4 py-3 rounded-xl">
                    <button 
                      onClick={() => toggleReminder(rem.id)}
                      className="flex items-center gap-3 text-left font-mono text-xs text-zinc-300 cursor-pointer"
                    >
                      {rem.done ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <Circle size={16} className="text-zinc-600" />
                      )}
                      <span className={rem.done ? 'line-through text-zinc-500' : ''}>{rem.text}</span>
                    </button>

                    <button 
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="text-zinc-600 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Goal Tracker */}
        {activeSubTab === 'goals' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
              <h3 className="text-xs font-mono tracking-wider font-semibold text-zinc-300 uppercase flex items-center gap-2">
                <BarChart2 size={16} className="text-cyan-400" />
                Establish New Target Milestone
              </h3>

              <form onSubmit={handleAddGoal} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase">Goal Title</label>
                  <input
                    type="text"
                    required
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="e.g. Core App Weight or Study Blocks"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 space-y-1">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase">Category</label>
                    <select
                      value={goalCategory}
                      onChange={(e) => setGoalCategory(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-[11px] text-zinc-300 font-mono outline-none"
                    >
                      <option value="study">Study</option>
                      <option value="business">Business</option>
                      <option value="weight">Weight</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>

                  <div className="col-span-1 space-y-1">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase">Start Value</label>
                    <input
                      type="text"
                      required
                      value={goalCurrent}
                      onChange={(e) => setGoalCurrent(e.target.value)}
                      placeholder="Current"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-xs text-zinc-300 outline-none text-center"
                    />
                  </div>

                  <div className="col-span-1 space-y-1">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase">Target Value</label>
                    <input
                      type="text"
                      required
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      placeholder="Target"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-xs text-zinc-300 outline-none text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase">Deadline Date</label>
                  <input
                    type="text"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    placeholder="e.g. 2026-12-31 or 4 Weeks"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> INITIALIZE GOAL
                  </button>
                </div>
              </form>
            </div>

            {/* Active Goals Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono tracking-wider font-semibold text-zinc-400 uppercase px-1">
                Synchronized Target Progress
              </h3>

              {store.goals.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 font-mono text-xs">
                  NO ACTIVE GOAL TRACK RECORDS FOUND
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {store.goals.map((g) => (
                    <div key={g.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 relative overflow-hidden">
                      {g.completed && (
                        <div className="absolute top-2.5 right-4 text-[9px] font-mono tracking-widest text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded">
                          ACHIEVED 🎉
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase bg-zinc-950 px-2 py-1 rounded text-cyan-400 border border-zinc-800">
                          {g.category}
                        </span>
                        <h4 className="text-sm font-mono font-bold text-zinc-200 pt-2">{g.title}</h4>
                      </div>

                      {/* Bar Representation */}
                      <div className="space-y-1.5 font-mono text-xs text-zinc-400">
                        <div className="flex justify-between">
                          <span>Progress: {g.current} / {g.target}</span>
                          <span>Deadline: {g.deadline}</span>
                        </div>
                        <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (parseFloat(g.current) / (parseFloat(g.target) || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Nested Progress Updates */}
                      <div className="space-y-2 pt-2 border-t border-zinc-800/60 font-mono">
                        <p className="text-[10px] text-zinc-500 uppercase">Recent Updates</p>
                        <div className="max-h-20 overflow-y-auto space-y-1 text-[10px]">
                          {g.progressLog.slice(-2).reverse().map((log, idx) => (
                            <div key={idx} className="flex justify-between items-start text-zinc-400">
                              <span>● {log.date}: {log.value} ({log.comment})</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex gap-2 pt-2 justify-end">
                        <button
                          onClick={() => setSelectedGoalId(g.id)}
                          className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded font-mono text-[10px] text-cyan-400 cursor-pointer"
                        >
                          LOG PROGRESS
                        </button>
                        <button
                          onClick={() => store.deleteGoal(g.id)}
                          className="p-1 px-2 text-zinc-500 hover:text-rose-400 border border-transparent hover:border-zinc-800 rounded cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal-like Progress Updates log */}
            {selectedGoalId && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <form onSubmit={handleLogProgress} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4">
                  <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-200 uppercase">Log Daily Progress</h3>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase">New Current Value</label>
                    <input
                      type="text"
                      required
                      value={progressVal}
                      onChange={(e) => setProgressVal(e.target.value)}
                      placeholder="Updated current level"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase">Update Comment</label>
                    <input
                      type="text"
                      value={progressComment}
                      onChange={(e) => setProgressComment(e.target.value)}
                      placeholder="e.g. Weight tracked in morning"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 outline-none"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGoalId(null)}
                      className="flex-1 py-2 bg-zinc-950 hover:bg-zinc-800 font-mono text-xs text-zinc-400 border border-zinc-800 rounded-xl"
                    >
                      CLOSE
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 font-mono text-xs text-white font-bold rounded-xl"
                    >
                      LOG Progress
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Personal Memory Timeline */}
        {activeSubTab === 'memories' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-mono tracking-wider font-semibold text-zinc-300 uppercase flex items-center gap-2">
                <Milestone size={16} className="text-fuchsia-400" />
                Add Milestone Event
              </h3>

              <form onSubmit={handleAddMemory} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={memoryInput}
                  onChange={(e) => setMemoryInput(e.target.value)}
                  placeholder="Record fact or event (e.g. 'Rishu Boss prefers green tea')"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-300 outline-none focus:border-fuchsia-400/50"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 font-mono font-bold text-xs rounded-xl text-white cursor-pointer"
                >
                  LOG FACT
                </button>
              </form>
            </div>

            {/* Persistent memory view logs */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xs font-mono tracking-wider font-semibold text-zinc-400 uppercase">
                  Long-Term Timeline Memories
                </h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportMemories}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/20 border border-cyan-900/50 px-2.5 py-1 rounded cursor-pointer"
                  >
                    EXPORT JSON
                  </button>

                  <label className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 border border-emerald-900/50 px-2.5 py-1 rounded cursor-pointer">
                    IMPORT JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportMemories}
                      className="hidden"
                    />
                  </label>

                  {store.memories.length > 0 && (
                    <button
                      onClick={() => store.clearAllMemories()}
                      className="text-[10px] font-mono text-rose-400 hover:text-rose-300 bg-rose-950/20 border border-rose-900/50 px-2.5 py-1 rounded cursor-pointer"
                    >
                      PURGE ALL
                    </button>
                  )}
                </div>
              </div>

              {importStatus === 'success' && (
                <div className="text-xs font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg">
                  ✓ Memories imported successfully inside local database timeline!
                </div>
              )}

              {importStatus === 'failed' && (
                <div className="text-xs font-mono text-rose-400 bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-lg">
                  ✗ Failed to parse memories backup payload. Ensure correct JSON format.
                </div>
              )}

              {store.memories.length === 0 ? (
                <div className="bg-zinc-950 rounded-2xl p-8 text-center text-zinc-600 font-mono text-xs">
                  AUTOMATED LEARNING TIMELINE IS CURRENTLY EMPTY
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {store.memories.map((m) => (
                    <div key={m.id} className="flex items-start gap-3 bg-zinc-950/50 border border-zinc-800/80 p-3.5 rounded-xl">
                      <span className={`text-[8px] font-mono uppercase font-bold px-1.5 py-0.5 rounded tracking-widest mt-0.5 border ${
                        m.category === 'auto' ? 'bg-amber-950/30 text-amber-400 border-amber-900/40' :
                        m.category === 'user' ? 'bg-fuchsia-950/30 text-fuchsia-400 border-fuchsia-900/40 font-bold' :
                        'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}>
                        {m.category}
                      </span>
                      <div className="flex-1 font-mono text-xs text-zinc-300">
                        <p>{m.text}</p>
                        <span className="text-[10px] text-zinc-500 block pt-1.5">
                          {new Date(m.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => store.deleteMemory(m.id)}
                        className="text-zinc-600 hover:text-rose-400 pt-0.5 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Secret Boss Mode */}
        {activeSubTab === 'secret' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
            {!store.isSecretUnlocked ? (
              /* Passcode Screen */
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-xl max-w-md mx-auto">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 animate-pulse">
                  <Lock size={26} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-200 uppercase">
                    Secret Boss Vault Locked
                  </h3>
                  <p className="text-xs font-mono text-zinc-500">
                    Input your custom numeric keycode passcode to decrypt secure notes and private memory timeline segments.
                  </p>
                </div>

                <form onSubmit={handleVerifySecret} className="space-y-4">
                  <input
                    type="password"
                    maxLength={8}
                    value={secretCodeInput}
                    onChange={(e) => setSecretCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="ENTER SECRET CODE"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-center tracking-widest text-lg font-mono text-zinc-200 outline-none focus:border-red-500/50"
                  />

                  {secretError && (
                    <div className="text-xs font-mono text-rose-400 py-1 flex items-center justify-center gap-1">
                      <AlertCircle size={14} /> ACCESS DENIED: INVALID CODE
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-red-900 hover:bg-red-800 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    VERIFY & UNLOCK VAULT
                  </button>
                </form>
              </div>
            ) : (
              /* Authenticated Private Vault Desk */
              <div className="space-y-6">
                {/* Vault Banner controls */}
                <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-4 flex justify-between items-center shadow-lg">
                  <div className="flex items-center gap-2.5 text-xs font-mono text-red-400">
                    <Unlock size={16} className="animate-pulse" />
                    VAULT DECRYPTED - ACTIVE Boss SESSION
                  </div>
                  <button
                    onClick={handleLockSecret}
                    className="px-3 py-1.5 bg-red-900 text-white font-mono text-[10px] font-bold rounded hover:bg-red-800 transition-colors cursor-pointer"
                  >
                    CLOSE & LOCK VAULT
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Write Note Panel */}
                  <div className="md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <h3 className="text-xs font-mono tracking-wider font-semibold text-zinc-200 uppercase flex items-center gap-1.5">
                      <FileText size={14} className="text-red-400" />
                      Write Hidden Note
                    </h3>

                    <form onSubmit={handleAddSecretNote} className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-mono text-zinc-400 uppercase">Title</label>
                        <input
                          type="text"
                          required
                          value={newSecretTitle}
                          onChange={(e) => setNewSecretTitle(e.target.value)}
                          placeholder="Note title..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-red-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-mono text-zinc-400 uppercase">Content</label>
                        <textarea
                          required
                          rows={4}
                          value={newSecretContent}
                          onChange={(e) => setNewSecretContent(e.target.value)}
                          placeholder="Sensitive details..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-red-500/50 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-red-900 hover:bg-red-800 text-white font-mono text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        LOCK IN SECRET BOX
                      </button>
                    </form>
                  </div>

                  {/* Secret Notes List */}
                  <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <h3 className="text-xs font-mono tracking-wider font-semibold text-zinc-300 uppercase">
                      Decrypted Hidden Notes
                    </h3>

                    {store.secretNotes.length === 0 ? (
                      <div className="bg-zinc-950 rounded-2xl p-8 text-center text-zinc-600 font-mono text-xs">
                        NO SECRET JOT NOTES STORED IN PRIVATE SCHEMAS
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto">
                        {store.secretNotes.map((note) => (
                          <div key={note.id} className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl relative space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="text-xs font-mono font-bold text-red-400">{note.title}</h4>
                              <button
                                onClick={() => store.deleteSecretNote(note.id)}
                                className="text-zinc-600 hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <p className="text-xs font-mono text-zinc-300 leading-relaxed break-words">{note.content}</p>
                            <span className="text-[9px] text-zinc-500 block pt-1 border-t border-zinc-900">
                              Locked: {new Date(note.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Permissions Dashboard */}
        {activeSubTab === 'permissions' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-mono tracking-wider font-semibold text-zinc-300 uppercase flex items-center gap-1.5">
                <Globe size={16} className="text-emerald-400" />
                Browser Permissions Dashboard
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Microphone */}
                <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-zinc-500 block">MICROPHONE FEED</span>
                    <strong className={`text-xs font-mono uppercase block pt-1 ${
                      store.microphonePermission === 'granted' ? 'text-emerald-400' :
                      store.microphonePermission === 'denied' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {store.microphonePermission.toUpperCase()}
                    </strong>
                  </div>
                  <div>
                    {store.microphonePermission === 'granted' ? (
                      <ShieldCheck className="text-emerald-400 font-bold animate-[pulse_2s_infinite]" size={20} />
                    ) : (
                      <ShieldAlert className="text-amber-500" size={20} />
                    )}
                  </div>
                </div>

                {/* 2. Notifications */}
                <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-zinc-500 block font-normal">BROWSER NOTIFICATIONS</span>
                    <strong className={`text-xs font-mono uppercase block pt-1 ${
                      store.notificationsPermission === 'granted' ? 'text-emerald-400' :
                      store.notificationsPermission === 'denied' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {store.notificationsPermission.toUpperCase()}
                    </strong>
                  </div>
                  <div>
                    {store.notificationsPermission === 'granted' ? (
                      <ShieldCheck className="text-emerald-400 font-bold" size={20} />
                    ) : (
                      <ShieldAlert className="text-amber-500" size={20} />
                    )}
                  </div>
                </div>

                {/* 3. IndexedDB Storage */}
                <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-zinc-500 block">DB PERSISTENCE</span>
                    <strong className="text-xs font-mono text-emerald-400 uppercase block pt-1">
                      OK: ACTIVE_SYNC
                    </strong>
                  </div>
                  <div>
                    <ShieldCheck className="text-emerald-400" size={20} />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-2xl text-xs font-mono text-zinc-400 space-y-1.5 leading-relaxed">
                <p className="text-zinc-300 font-semibold uppercase text-[10px]">Verification Metadata</p>
                <p>Mic Feed requires micro-interfacing access inside iframe blocks. Always grant permissions on prompt to enable live continuous voice duplex features.</p>
                <p>Storage requires standard localStorage and local IndexedDB open keys. Supported flawlessly on modern Chrome, Safari, and edge engines.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Astha's Corner Suite */}
        {activeSubTab === 'astha' && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease] text-zinc-100">
            {/* Header branding Banner */}
            <div className="relative bg-gradient-to-r from-rose-950/40 via-purple-950/20 to-zinc-900 border border-rose-500/20 rounded-3xl p-6 overflow-hidden shadow-[0_0_25px_rgba(244,63,94,0.05)]">
              {/* Abs decorative hearts */}
              <div className="absolute top-4 right-4 text-rose-500/10 pointer-events-none">
                <Heart size={140} className="fill-rose-500/5 animate-pulse" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Heart className="text-rose-400 fill-rose-500/20 animate-pulse" size={20} />
                    <span className="text-[10px] font-mono tracking-widest text-rose-400 uppercase font-bold">Life Partner Companion</span>
                  </div>
                  <h2 className="text-2xl font-bold font-sans tracking-tight text-white mt-1">Astha's Corner</h2>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">Addressing Owner: <span className="text-rose-300 font-semibold">Rishu Boss</span> | Local Safe Storage Active</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => speakQuote(sampleShayaris[Math.floor(Math.random() * sampleShayaris.length)])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/25 rounded-xl text-[11px] font-mono transition-all cursor-pointer font-bold"
                  >
                    <Quote size={13} /> Random Shayari Bolo 🔊
                  </button>
                  <button 
                    onClick={() => handleExportMemories()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 text-zinc-300 border border-zinc-700/80 hover:bg-zinc-800 rounded-xl text-[11px] font-mono transition-all cursor-pointer"
                  >
                    Backup Export 📥
                  </button>
                </div>
              </div>
            </div>

            {/* Inner SubTab Toolbar Navigation */}
            <div className="flex flex-wrap gap-1.5 bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-800/80 max-w-full overflow-x-auto scrollbar-none">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Globe },
                { id: 'timeline', label: 'yaadein timeline', icon: Milestone },
                { id: 'gallery', label: 'couple gallery', icon: Image },
                { id: 'letters', label: 'Love Letter Generator', icon: BookOpen },
                { id: 'songs_and_plans', label: 'songs & surprise planner', icon: Sparkles },
                { id: 'why_love', label: 'Why I Love Her', icon: Heart }
              ].map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setAsthaSubTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-[10px] font-bold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                      asthaSubTab === tab.id
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <TabIcon size={13} className={asthaSubTab === tab.id ? 'text-rose-400 fill-rose-500/10' : 'text-zinc-500'} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ASTHA SUBTAB 1: OVERVIEW DASHBOARD */}
            {asthaSubTab === 'dashboard' && (
              <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
                {/* Countdown Cards Suite */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Astha Birthday Countdown */}
                  <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl p-5 overflow-hidden">
                    <div className="absolute top-2 right-2 text-rose-500/20">
                      <Hourglass size={36} className="animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono tracking-widest text-rose-400 uppercase font-bold block">Birthday Countdown</span>
                      <h3 className="text-lg font-bold text-white mt-1">Astha ka Birthday Countdown</h3>
                      <p className="text-xs text-zinc-500 font-mono">Date: {new Date(store.asthaBirthday).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</p>
                      
                      {/* Live Counter */}
                      {(() => {
                        const count = calculateCountdown(store.asthaBirthday);
                        return (
                          <div className="grid grid-cols-3 gap-2 mt-4 max-w-xs">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center">
                              <span className="text-xl font-mono font-bold text-rose-300 block">{count.days}</span>
                              <span className="text-[9px] font-mono text-zinc-500 uppercase">Days</span>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center">
                              <span className="text-xl font-mono font-bold text-rose-300 block">{count.hours}</span>
                              <span className="text-[9px] font-mono text-zinc-500 uppercase">Hours</span>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center">
                              <span className="text-xl font-mono font-bold text-rose-300 block">{count.minutes}</span>
                              <span className="text-[9px] font-mono text-zinc-500 uppercase">Mins</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Couple Anniversary Countdown */}
                  <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl p-5 overflow-hidden">
                    <div className="absolute top-2 right-2 text-rose-500/20">
                      <Flame size={36} className="animate-bounce" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono tracking-widest text-rose-400 uppercase font-bold block">Anniversary Countdown</span>
                      <h3 className="text-lg font-bold text-white mt-1">Hamari Anniversary Alert</h3>
                      <p className="text-xs text-zinc-500 font-mono">Date: {new Date(store.asthaAnniversary).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</p>

                      {/* Live Counter */}
                      {(() => {
                        const count = calculateCountdown(store.asthaAnniversary);
                        return (
                          <div className="grid grid-cols-3 gap-2 mt-4 max-w-xs">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center">
                              <span className="text-xl font-mono font-bold text-rose-300 block">{count.days}</span>
                              <span className="text-[9px] font-mono text-zinc-500 uppercase">Days</span>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center">
                              <span className="text-xl font-mono font-bold text-rose-300 block">{count.hours}</span>
                              <span className="text-[9px] font-mono text-zinc-500 uppercase">Hours</span>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center">
                              <span className="text-xl font-mono font-bold text-rose-300 block">{count.minutes}</span>
                              <span className="text-[9px] font-mono text-zinc-500 uppercase">Mins</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Inline Change Dates Button Toggle */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="text-rose-400" size={16} />
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">Set Dates manually / Special Dates badlo</p>
                      <p className="text-[10px] text-zinc-500 font-mono">Changes birthday and anniversary calculations instantly</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsConfiguringDates(!isConfiguringDates)}
                    className="px-3.5 py-1.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer font-bold"
                  >
                    {isConfiguringDates ? 'Close Editor' : 'Configure Dates ⚙️'}
                  </button>
                </div>

                {/* Dates Configuration Expansion Box */}
                {isConfiguringDates && (
                  <div className="bg-zinc-950 border border-rose-500/20 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fadeIn_0.2s_ease]">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold mb-1">Modify Astha's Birthday</label>
                      <input 
                        type="date"
                        value={configBirthday}
                        onChange={(e) => {
                          setConfigBirthday(e.target.value);
                          store.setAsthaBirthday(e.target.value);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white rounded-lg focus:outline-none focus:border-rose-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold mb-1">Modify Anniversary Date</label>
                      <input 
                        type="date"
                        value={configAnniversary}
                        onChange={(e) => {
                          setConfigAnniversary(e.target.value);
                          store.setAsthaAnniversary(e.target.value);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white rounded-lg focus:outline-none focus:border-rose-500/50"
                      />
                    </div>
                  </div>
                )}

                {/* Dashboard Highlights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Random shayari / quotes generator highlight */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 md:col-span-2 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <Quote className="text-rose-400 animate-pulse fill-rose-500/5" size={18} />
                      <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase font-bold">Rishu Boss Daily Compliment Drawer</span>
                    </div>
                    <div className="my-4">
                      <p className="text-sm font-sans italic text-rose-100 leading-relaxed font-medium">
                        "{sampleShayaris[0]}"
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-rose-400 font-bold">Rishu & Astha Partners</span>
                      <button
                        onClick={() => speakQuote(sampleShayaris[0])}
                        className="text-[10px] font-mono text-zinc-400 hover:text-rose-300 flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        🔊 Listen
                      </button>
                    </div>
                  </div>

                  {/* Highlights section: favorite couple songs or why I love her */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-1">
                      <Heart size={14} className="text-rose-400 fill-rose-500/20" />
                      <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase font-bold">Pyaar ka Khas Reason</span>
                    </div>
                    
                    <div className="my-4 text-center">
                      {store.asthaReasons.length > 0 ? (
                        <p className="text-xs font-mono text-zinc-300">
                          "{store.asthaReasons[Math.floor(Math.random() * store.asthaReasons.length)].text}"
                        </p>
                      ) : (
                        <p className="text-xs font-mono text-zinc-500 italic">No reasons saved yet.</p>
                      )}
                    </div>

                    <button
                      onClick={() => setAsthaSubTab('why_love')}
                      className="w-full text-center py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl text-[10px] font-mono transition-all border border-zinc-700/60"
                    >
                      More reasons look up →
                    </button>
                  </div>
                </div>

                {/* Snapshot panels: last memory list and latest favorite couple photo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Latest Memories */}
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <Milestone className="text-rose-400" size={16} />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">Latest Saved Moment</h4>
                    </div>
                    <div className="my-3 flex-1">
                      {asthaMemoriesList.length > 0 ? (
                        <div className="bg-zinc-900/80 border border-zinc-800/60 p-3 rounded-xl">
                          <p className="text-xs font-sans text-zinc-200 line-clamp-3 leading-relaxed">
                            {asthaMemoriesList[0].text}
                          </p>
                          <span className="text-[9px] font-mono text-zinc-500 mt-2 block">
                            {new Date(asthaMemoriesList[0].timestamp).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs font-mono text-zinc-500 italic py-4">No moments saved yet. Try voice command "Ye moment save karo" or enter manually!</p>
                      )}
                    </div>
                    <button
                      onClick={() => setAsthaSubTab('timeline')}
                      className="text-left text-[10px] font-mono text-rose-400/80 hover:text-rose-300 mt-2 block w-max cursor-pointer"
                    >
                      Yaadein Timeline Kholein →
                    </button>
                  </div>

                  {/* Beautiful Couples Polaroid Grid */}
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                      <Image className="text-rose-400" size={16} />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">Featured Couple photo</h4>
                    </div>
                    <div className="my-3 flex-1 flex items-center justify-center">
                      {asthaPhotos.length > 0 ? (
                        <div className="relative group max-w-[150px] bg-zinc-900 p-2 pb-8 rounded-lg shadow-xl border border-zinc-800 rotate-2">
                          <img 
                            src={asthaPhotos[0].dataUrl} 
                            alt="Astha Couple Featured" 
                            className="w-full object-cover rounded aspect-square"
                          />
                          <span className="absolute bottom-1 right-2 text-[8px] font-mono text-zinc-500">Love Astha</span>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-xs font-mono text-zinc-500 italic">No gallery photos uploaded yet.</p>
                          <label 
                            htmlFor="photo-upload-dash"
                            className="mt-2 inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-[10px] text-rose-300 font-mono cursor-pointer"
                          >
                            Add First Photo 📷
                          </label>
                          <input 
                            type="file" 
                            id="photo-upload-dash" 
                            accept="image/*" 
                            onChange={handlePhotoUpload} 
                            className="hidden" 
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setAsthaSubTab('gallery')}
                      className="text-left text-[10px] font-mono text-rose-400/80 hover:text-rose-300 mt-2 block w-max cursor-pointer"
                    >
                      Couple Gallery Kholein →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ASTHA SUBTAB 2: YAADEIN TIMELINE & RELATIONSHIP JOURNAL */}
            {asthaSubTab === 'timeline' && (
              <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
                {/* Save Memory manual desk */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Milestone className="text-rose-400" size={18} />
                    <h3 className="text-sm font-mono font-bold uppercase text-zinc-200">Aaj ki yaad save karo / Add Couple Memory</h3>
                  </div>
                  
                  <form onSubmit={handleAddAsthaMemory} className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold mb-1">Moment Note Details (Hinglish/Hindi fully supported)</label>
                      <textarea
                        value={asthaMemText}
                        onChange={(e) => setAsthaMemText(e.target.value)}
                        placeholder="E.g. Aaj Astha ke sath naya restaurant try kiya, unhein golgappe bohot acche lage. Best moment!"
                        rows={3}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-rose-500/50 resize-y"
                      />
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold mb-1">Choose Event Category</label>
                        <select
                          value={asthaMemCategory}
                          onChange={(e: any) => setAsthaMemCategory(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
                        >
                          <option value="Moment">General Moment / Sweet Memory</option>
                          <option value="Date">Sunset Date / Gift Moment</option>
                          <option value="Anniversary">Anniversary Celebration</option>
                          <option value="Special Speech">Special words uttered by Astha</option>
                        </select>
                      </div>
                      
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full md:w-auto px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                        >
                          <Plus size={14} /> Save Memory locally 💾
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Timeline Cards display */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">My Wife Memories Timeline</h3>
                  
                  {asthaMemoriesList.length > 0 ? (
                    <div className="relative border-l border-zinc-800/80 ml-3 pl-6 space-y-6">
                      {asthaMemoriesList.map((mem) => {
                        const isDate = mem.text.includes('(Date)');
                        const isAnniv = mem.text.includes('(Anniversary)');
                        const isSpeech = mem.text.includes('(Special Speech)');
                        
                        return (
                          <div key={mem.id} className="relative group animate-[fadeIn_0.3s_ease]">
                            {/* Dot */}
                            <span className="absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full bg-zinc-950 border-2 border-rose-400 flex items-center justify-center group-hover:scale-125 transition-all">
                              <span className="w-1 h-1 rounded-full bg-rose-400" />
                            </span>
                            
                            <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 hover:border-rose-500/20 transition-all flex flex-col justify-between">
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono uppercase font-bold tracking-wider ${
                                    isAnniv ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                    isDate ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    isSpeech ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {isAnniv ? 'Anniversary' : isDate ? 'Date Setup' : isSpeech ? 'Speech' : 'Couple Moment'}
                                  </span>
                                  
                                  <span className="text-[10px] font-mono text-zinc-500">
                                    {new Date(mem.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-200 leading-relaxed font-sans mt-2 whitespace-pre-wrap">
                                  {mem.text.replace(/^Astha Memory \((Moment|Date|Anniversary|Special Speech)\):\s*/, '')}
                                </p>
                              </div>

                              <div className="flex items-center justify-end gap-2.5 mt-4">
                                <button
                                  onClick={() => speakQuote(mem.text.replace(/^Astha Memory \((Moment|Date|Anniversary|Special Speech)\):\s*/, ''))}
                                  className="text-[10px] font-mono text-zinc-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer bg-zinc-900 border border-zinc-800 px-2 py-1 rounded"
                                >
                                  🔊 Suno
                                </button>
                                <button
                                  onClick={() => store.deleteMemory(mem.id)}
                                  className="text-[10px] font-mono text-zinc-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer bg-zinc-900 border border-zinc-800 px-2 py-1 rounded"
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl text-center">
                      <p className="text-xs font-mono text-zinc-500">Abhi tak koi memories saved nahi hain, Rishu Boss.</p>
                      <p className="text-[10px] text-zinc-600 font-mono mt-1">Ghabraiye mat! Aap Roy voice assistant se bol kar ya upar form se save kar sakte hain.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ASTHA SUBTAB 3: COUPLE GALLERY */}
            {asthaSubTab === 'gallery' && (
              <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
                {/* Photo upload dropzone panel */}
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Image className="text-rose-400" size={18} />
                    <h3 className="text-sm font-mono font-bold uppercase text-zinc-200">Wife / Couple Photo Save Karo</h3>
                  </div>

                  <div className="max-w-md mx-auto">
                    <label 
                      htmlFor="astha-gallery-uploader" 
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-rose-500/40 rounded-xl cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/80 transition-all text-center"
                    >
                      <Camera className="text-rose-400/80 animate-pulse mb-2" size={32} />
                      <span className="text-xs font-mono text-zinc-300 font-bold">Upload Image / Photo pick karo 📷</span>
                      <span className="text-[9px] font-mono text-zinc-500 mt-1">Converts image to local sandbox URL and saves in IndexedDB</span>
                    </label>
                    <input 
                      type="file" 
                      id="astha-gallery-uploader" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                    />
                  </div>
                </div>

                {/* Slideshow launcher alert button */}
                {asthaPhotos.length > 0 && (
                  <button
                    onClick={() => {
                      setSlideshowIndex(0);
                      setIsSlideshowOpen(true);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-mono text-xs font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer border border-rose-400/20 active:scale-[0.99] transition-all"
                  >
                    <Play size={14} className="fill-white" /> Start Full-Screen Love Slideshow 🎥 ({asthaPhotos.length} photos)
                  </button>
                )}

                {/* Grid */}
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">Astha Photos Grid</h3>
                  
                  {asthaPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {asthaPhotos.map((photo, pIdx) => {
                        const isFav = favPhotoIds.includes(photo.id);
                        return (
                          <div 
                            key={photo.id} 
                            className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-rose-500/25 transition-all relative flex flex-col justify-between"
                          >
                            <div className="relative aspect-square overflow-hidden bg-zinc-900">
                              <img 
                                src={photo.dataUrl} 
                                alt="Gallery Snip" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                              />
                              
                              {/* Favorite Overlay */}
                              <button
                                onClick={() => toggleFavPhoto(photo.id)}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 border border-zinc-800 hover:bg-black/90 transition-all cursor-pointer z-10"
                              >
                                <Heart 
                                  size={13} 
                                  className={isFav ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-zinc-400'} 
                                />
                              </button>
                            </div>
                            
                            <div className="p-3 bg-zinc-950 flex flex-col justify-between flex-1">
                              <div>
                                <p className="text-[9px] font-mono text-zinc-500 uppercase">{photo.date} @ {photo.time}</p>
                                <p className="text-[10px] text-zinc-300 font-bold truncate mt-0.5">{photo.location || 'Safe Couple Vault'}</p>
                              </div>
                              <div className="flex gap-1.5 mt-3">
                                <button
                                  onClick={() => {
                                    setSlideshowIndex(pIdx);
                                    setIsSlideshowOpen(true);
                                  }}
                                  className="flex-1 py-1 bg-zinc-900 hover:bg-zinc-850 hover:text-white rounded border border-zinc-800 text-[9px] font-mono transition-all cursor-pointer font-bold text-zinc-300"
                                >
                                  Sponsor
                                </button>
                                <button
                                  onClick={() => store.deleteCapturedPhoto(photo.id)}
                                  className="p-1 px-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:text-rose-400 rounded transition-all cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-zinc-950 border border-zinc-800 py-12 rounded-2xl text-center">
                      <p className="text-xs font-mono text-zinc-500">Gallery me koi bhi couples/photos nahi hain Rishu Boss.</p>
                      <p className="text-[10px] text-zinc-600 font-mono mt-1">Upar diye gaye camera/file dropbox ki madad se pyari photos save kijiye.</p>
                    </div>
                  )}
                </div>

                {/* GALLERY SLIDESHOW FULL SCREEN PORTAL DISPLAY */}
                {isSlideshowOpen && asthaPhotos.length > 0 && (
                  <div className="fixed inset-0 bg-black/98 z-55 flex flex-col justify-between items-center p-4 animate-[fadeIn_0.2g_ease]">
                    {/* Head bar */}
                    <div className="w-full flex items-center justify-between z-10 text-zinc-300 border-b border-zinc-900 pb-3">
                      <div className="flex items-center gap-2">
                        <Heart size={14} className="text-rose-500 fill-rose-500 animate-pulse" />
                        <span className="text-xs font-mono uppercase tracking-wider font-bold">Astha Slideshow Projector — {slideshowIndex + 1} / {asthaPhotos.length}</span>
                      </div>
                      <button
                        onClick={() => {
                          setIsSlideshowOpen(false);
                          setSlideshowAutoPlay(false);
                        }}
                        className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Mid display viewport */}
                    <div className="relative flex-1 w-full flex items-center justify-between max-w-4xl max-h-[80vh] py-4">
                      {/* Left Arrow */}
                      <button
                        onClick={handlePrevSlide}
                        className="p-3.5 rounded-full bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-900 text-zinc-100 cursor-pointer hover:border-zinc-700 transition-all mx-2"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      {/* Photo projection area */}
                      <div className="flex-1 h-full flex flex-col items-center justify-center relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-900 p-2">
                        <img 
                          src={asthaPhotos[slideshowIndex].dataUrl} 
                          alt="Projections active" 
                          style={{ transform: `scale(${zoomScale})` }}
                          className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-all duration-300 pointer-events-none"
                        />
                      </div>

                      {/* Right Arrow */}
                      <button
                        onClick={handleNextSlide}
                        className="p-3.5 rounded-full bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-900 text-zinc-100 cursor-pointer hover:border-zinc-700 transition-all mx-2"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>

                    {/* Bottom toolbar controller */}
                    <div className="w-full flex flex-col items-center gap-3 bg-zinc-950 border-t border-zinc-900 p-3.5 rounded-2xl max-w-2xl z-10">
                      {/* Zoom scales and Play toggler */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                          <button
                            onClick={() => setZoomScale(Math.max(1, zoomScale - 0.5))}
                            className="px-2 py-1 text-xs font-mono rounded hover:bg-zinc-800 text-zinc-400 cursor-pointer"
                          >
                            ZOOM -
                          </button>
                          <span className="px-3 text-xs font-mono text-zinc-300 font-bold">{zoomScale}x</span>
                          <button
                            onClick={() => setZoomScale(Math.min(3, zoomScale + 0.5))}
                            className="px-2 py-1 text-xs font-mono rounded hover:bg-zinc-800 text-zinc-400 cursor-pointer"
                          >
                            ZOOM +
                          </button>
                        </div>

                        <button
                          onClick={() => setSlideshowAutoPlay(!slideshowAutoPlay)}
                          className={`px-4 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer ${
                            slideshowAutoPlay
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {slideshowAutoPlay ? '⏸️ Pause Slide' : '▶️ AutoPlay Slide'}
                        </button>

                        <button
                          onClick={() => toggleFavPhoto(asthaPhotos[slideshowIndex].id)}
                          className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-850 flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer"
                        >
                          <Heart 
                            size={12} 
                            className={favPhotoIds.includes(asthaPhotos[slideshowIndex].id) ? 'text-rose-500 fill-rose-500' : 'text-zinc-500'} 
                          />
                          Fav Snap
                        </button>
                      </div>

                      {/* Snapshot metadata info block */}
                      <div className="text-center">
                        <span className="text-[10px] font-mono text-zinc-500 block">RECORD REVELATION DETECTIVE</span>
                        <p className="text-xs font-semibold text-zinc-300 mt-0.5">{asthaPhotos[slideshowIndex].location || 'Wedding Album Vault'}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">Date Captured: {asthaPhotos[slideshowIndex].date} at {asthaPhotos[slideshowIndex].time}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ASTHA SUBTAB 4: LOVE LETTER & COUPLINGS COMPLIMENT DRAWER */}
            {asthaSubTab === 'letters' && (
              <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
                {/* Generation Form */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="text-rose-400" size={18} />
                    <h3 className="text-sm font-mono font-bold uppercase text-zinc-200">Love Letter & Shayari Generator</h3>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold mb-1">Select Romance Vibe Letter Mood</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'Pure Romance', desc: 'Siddat-wala Pyaar' },
                          { id: 'Emotional', desc: 'Deep Dil Se' },
                          { id: 'Teasing', desc: 'Cute Golgappa' },
                          { id: 'Shayari', desc: 'Kavita / Ghazal' }
                        ].map((moodItem) => (
                          <button
                            key={moodItem.id}
                            type="button"
                            onClick={() => setLetterMood(moodItem.id as any)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-center items-center ${
                              letterMood === moodItem.id
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                                : 'bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <span className="text-[11px] font-bold font-mono uppercase tracking-wider block">{moodItem.id}</span>
                            <span className="text-[9px] font-mono text-zinc-500 mt-0.5">{moodItem.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => generateLoveLetter(letterMood)}
                      className="px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-mono text-xs font-bold rounded-xl transition-all cursor-pointer h-max shadow-[0_0_15px_rgba(244,63,94,0.3)] select-none text-center"
                    >
                      Generate Letter ✍️ ✨
                    </button>
                  </div>

                  {/* Letter display box */}
                  {loveLetterContent && (
                    <div className="mt-5 bg-stone-950/60 border border-amber-900/40 rounded-2xl p-5 relative overflow-hidden animate-[fadeIn_0.3s_ease]">
                      {/* Ribbon background design corner */}
                      <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rotate-41 select-none pointer-events-none" />
                      
                      <h4 className="text-sm font-bold font-sans text-amber-300 tracking-wide border-b border-zinc-800 pb-2">{loveLetterTitle}</h4>
                      <div className="py-4 text-zinc-300 text-xs font-sans whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto pr-2">
                        {loveLetterContent}
                      </div>
                      
                      <div className="flex justify-end gap-2 border-t border-zinc-800/60 pt-3">
                        <button
                          onClick={() => speakQuote(loveLetterContent)}
                          className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 hover:text-rose-300 border border-zinc-800 text-zinc-400 rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1.5 font-bold"
                        >
                          Sunaayein 🔊 (Priya Voice)
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(loveLetterContent);
                            store.addMemory(`Generated and copied a "${letterMood}" Love Letter for Astha.`, 'user');
                            alert("Copied to clipboard! / Note Copy ho chuka hai Rishu Boss!");
                          }}
                          className="px-3.5 py-1.5 bg-zinc-900 hover:bg-rose-500/10 hover:text-rose-400 border border-zinc-800 text-zinc-400 rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1.5 font-bold"
                        >
                          Copy Letter 📋
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Daily Wishes / Compliments Library Drawer */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4 pr-1">
                    <Sparkles className="text-rose-400" size={17} />
                    <h3 className="text-sm font-mono font-bold uppercase text-zinc-200">Daily Wishes & Compliments Deck</h3>
                    <span className="text-[9px] font-mono text-zinc-500 leading-none">Click anything to listen or copy</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Good Morning Deck */}
                    <div className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-mono uppercase font-bold tracking-wider">Good Morning Wishes</span>
                      <p className="text-[10px] font-mono text-zinc-500 mt-1 mb-3">Sweet subah wishes for Rishu Boss</p>
                      
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {morningWishes.map((wish, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => speakQuote(wish)}
                            className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 hover:border-amber-500/20 transition-all cursor-pointer text-zinc-300 hover:text-white"
                          >
                            <p className="text-[11px] font-sans line-clamp-3 leading-relaxed">{wish}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Good Night Deck */}
                    <div className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] font-mono uppercase font-bold tracking-wider">Good Night Wishes</span>
                      <p className="text-[10px] font-mono text-zinc-500 mt-1 mb-3">Sweet sweet dreams sleep wishes</p>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {nightWishes.map((wish, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => speakQuote(wish)}
                            className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 hover:border-purple-500/20 transition-all cursor-pointer text-zinc-300 hover:text-white"
                          >
                            <p className="text-[11px] font-sans line-clamp-3 leading-relaxed">{wish}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sweet Compliments Deck */}
                    <div className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl">
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-mono uppercase font-bold tracking-wider">Sweet Compliments Suggestions</span>
                      <p className="text-[10px] font-mono text-zinc-500 mt-1 mb-3">Daily compliment ideas to praise Astha</p>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {sweetCompliments.map((comp, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => speakQuote(comp)}
                            className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 hover:border-rose-500/20 transition-all cursor-pointer text-zinc-300 hover:text-white"
                          >
                            <p className="text-[11px] font-sans line-clamp-3 leading-relaxed">{comp}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ASTHA SUBTAB 5: SONGS TRACKER & SURPRISE PLANNER */}
            {asthaSubTab === 'songs_and_plans' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fadeIn_0.2s_ease]">
                {/* Left side: Couple Special Songs Tracker */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Music className="text-rose-400" size={17} />
                      <h3 className="text-sm font-mono font-bold uppercase text-zinc-200">Couple favorite Songs Memory</h3>
                    </div>

                    {/* Add tracker song form */}
                    <div className="bg-zinc-900/40 border border-zinc-800/60 p-3.5 rounded-xl mb-4 space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] uppercase font-mono text-zinc-500 block font-bold mb-0.5">Song Title / Geet naam</label>
                          <input 
                            type="text" 
                            placeholder="E.g. Kesariya, Tum Hi Ho"
                            value={asthaSongTitle}
                            onChange={(e) => setAsthaSongTitle(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-mono text-zinc-500 block font-bold mb-0.5">Artist name (optional)</label>
                          <input 
                            type="text" 
                            placeholder="E.g. Arijit Singh"
                            value={asthaSongArtist}
                            onChange={(e) => setAsthaSongArtist(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-xs text-white"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[9px] uppercase font-mono text-zinc-500 block font-bold mb-0.5">YouTube Music/Video URL (optional)</label>
                        <input 
                          type="text" 
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={asthaSongUrl}
                          onChange={(e) => setAsthaSongUrl(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-xs text-zinc-300"
                        />
                      </div>

                      <button
                        onClick={() => {
                          if (!asthaSongTitle.trim()) return;
                          store.addAsthaSong(asthaSongTitle.trim(), asthaSongArtist.trim() || undefined, true, asthaSongUrl.trim() || undefined);
                          setAsthaSongTitle('');
                          setAsthaSongArtist('');
                          setAsthaSongUrl('');
                        }}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded text-xs font-mono font-bold cursor-pointer transition-all border border-zinc-700"
                      >
                        Add to Couple Songs list 🎵
                      </button>
                    </div>

                    {/* Listing of songs */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block pb-1">Hamara Special Playlist</span>
                      {store.asthaSongs && store.asthaSongs.length > 0 ? (
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {store.asthaSongs.map((song) => (
                            <div 
                              key={song.id} 
                              className="bg-zinc-900 border border-zinc-800/80 p-2.5 rounded-xl flex items-center justify-between gap-2.5"
                            >
                              <div className="flex items-center gap-2.5">
                                <Play className="text-zinc-500" size={13} />
                                <div>
                                  <h4 className="text-xs font-bold text-zinc-100 leading-snug">{song.title}</h4>
                                  <p className="text-[9px] font-mono text-zinc-500 leading-none">{song.artist || 'Traditional/Classical'}</p>
                                </div>
                              </div>
                              <span className="flex gap-1.5">
                                {song.url && (
                                  <button
                                    onClick={() => {
                                      // Is YouTuber. Parse video ID if matching
                                      const urlVal = song.url || '';
                                      let vId = '';
                                      if (urlVal.includes('v=')) {
                                        vId = urlVal.split('v=')[1]?.split('&')[0] || '';
                                      }
                                      if (vId) {
                                        store.setActiveVideo({
                                          id: vId,
                                          title: song.title,
                                          description: song.artist || 'Wife special',
                                          url: urlVal,
                                          channelName: 'Wife Music',
                                          thumbnail: ''
                                        });
                                      } else {
                                        // Open youtube link customly
                                        window.open(urlVal, '_blank');
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-mono font-bold rounded cursor-pointer"
                                  >
                                    Play 🎶
                                  </button>
                                )}
                                <button
                                  onClick={() => store.deleteAsthaSong(song.id)}
                                  className="text-zinc-500 hover:text-rose-400 p-0.5 cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] font-mono text-zinc-600 italic">No songs saved yet. Record Kesariya!</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Surprise Planner Section */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Gift className="text-rose-400 animate-pulse" size={17} />
                      <h3 className="text-sm font-mono font-bold uppercase text-zinc-200">Wife Surprise Planner Desk</h3>
                    </div>

                    {/* Add planner item form */}
                    <div className="bg-zinc-900/40 border border-zinc-800/60 p-3.5 rounded-xl mb-4 space-y-3.5">
                      <div>
                        <label className="text-[9px] uppercase font-mono text-zinc-500 block font-bold mb-0.5">Surprise Plan Idea Details</label>
                        <input 
                          type="text" 
                          placeholder="E.g. Gift a custom crystal-pendant necklace, sunset roof date"
                          value={asthaPlanText}
                          onChange={(e) => setAsthaPlanText(e.target.value)}
                          className="w-full bg-zinc-955 border border-zinc-800 p-2 rounded text-xs text-white placeholder-zinc-600 focus:outline-none"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                        <div>
                          <label className="text-[9px] uppercase font-mono text-zinc-500 block font-bold mb-0.5">Vibe Category</label>
                          <select 
                            value={asthaPlanCategory} 
                            onChange={(e: any) => setAsthaPlanCategory(e.target.value)}
                            className="w-full bg-zinc-955 border border-zinc-800 p-1.5 rounded text-xs text-zinc-350"
                          >
                            <option value="gift">Surprise Gift Idea 🎁</option>
                            <option value="date">Romantic Date Setup 🕯️</option>
                            <option value="celebration">Anniversary/Birthday Party 🎉</option>
                          </select>
                        </div>
                        
                        <button
                          onClick={() => {
                            if (!asthaPlanText.trim()) return;
                            store.addAsthaPlan(asthaPlanCategory, asthaPlanText.trim());
                            setAsthaPlanText('');
                          }}
                          className="w-full py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs font-bold rounded cursor-pointer transition-all border border-zinc-800"
                        >
                          Plan Surprise 💝
                        </button>
                      </div>
                    </div>

                    {/* Listing of plans */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block pb-1">Surprise Ideas Tracker</span>
                      {store.asthaPlans && store.asthaPlans.length > 0 ? (
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {store.asthaPlans.map((plan) => {
                            return (
                              <div 
                                key={plan.id} 
                                className={`bg-zinc-900 border p-2.5 rounded-xl flex items-center justify-between gap-2.5 ${
                                  plan.completed ? 'border-emerald-500/20 bg-emerald-950/5' : 'border-zinc-800'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input 
                                    type="checkbox" 
                                    checked={plan.completed}
                                    onChange={() => store.toggleAsthaPlan(plan.id)}
                                    className="rounded border-zinc-800 text-rose-500 bg-zinc-950 focus:ring-0 cursor-pointer"
                                  />
                                  <div>
                                    <h4 className={`text-xs font-bold leading-snug ${
                                      plan.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
                                    }`}>
                                      {plan.text}
                                    </h4>
                                    <span className="text-[8px] font-mono text-rose-400 uppercase tracking-widest font-bold">
                                      {plan.category === 'gift' ? 'Gift 🎁' : plan.category === 'date' ? 'Date Setup 🕯️' : 'Party 🎉'}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => store.deleteAsthaPlan(plan.id)}
                                  className="text-zinc-500 hover:text-rose-400 p-0.5 cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] font-mono text-zinc-600 italic">No surprise plans logged yet. Think out of the box, Rishu Boss!</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ASTHA SUBTAB 6: WHY I LOVE ASTHA PURE STATEMENT SUITE */}
            {asthaSubTab === 'why_love' && (
              <div className="space-y-6 animate-[fadeIn_0.2s_ease]">
                {/* Adding reasons manual desk */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="text-rose-400 fill-rose-500/20" size={18} />
                    <h3 className="text-sm font-mono font-bold uppercase text-zinc-200">Why I Love Astha Memory Suite ("Ye reason save karo")</h3>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!asthaReasonInput.trim()) return;
                      store.addAsthaReason(asthaReasonInput.trim());
                      setAsthaReasonInput('');
                    }}
                    className="space-y-3.5"
                  >
                    <div>
                      <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold mb-1">State reasons why you love Astha</label>
                      <textarea 
                        value={asthaReasonInput}
                        onChange={(e) => setAsthaReasonInput(e.target.value)}
                        placeholder="E.g. Tum jis tarah se har choti choti khushi par khush ho jati ho, tumhara woh gussa hona mere pure din ko rangeen banata hai."
                        rows={2}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500/40"
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                      >
                        Ye reason save karo 💖
                      </button>
                    </div>
                  </form>
                </div>

                {/* SHOWSTOPPER INTERACTIVE SPEECH TRIGGER BOX */}
                {store.asthaReasons.length > 0 && (
                  <div className="bg-gradient-to-r from-rose-950/20 via-zinc-900 to-rose-950/10 border border-rose-500/25 p-6 rounded-3xl text-center relative overflow-hidden shadow-2xl">
                    <div className="absolute top-2 right-2 text-rose-500/10 pointer-events-none select-none">
                      <Sparkles size={110} />
                    </div>
                    
                    <h4 className="text-sm font-bold font-mono tracking-tight text-white mb-2">Main Astha se kyun pyaar karta hu?</h4>
                    <p className="text-xs text-zinc-400 font-mono mb-4 max-w-md mx-auto">Click this massive pink heart button, Roy Girl AI will select a random saved reason and read it aloud with glowing heart animations!</p>
                    
                    <button
                      onClick={() => {
                        const randomReason = store.asthaReasons[Math.floor(Math.random() * store.asthaReasons.length)];
                        speakQuote(`Rishu Boss, aap Astha se isliye pyaar karte hain kyunki: ${randomReason.text}.`);
                      }}
                      className="inline-flex items-center justify-center w-20 h-20 bg-rose-500 hover:bg-rose-600 text-white rounded-full cursor-pointer hover:scale-110 active:scale-95 shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse transition-all select-none border border-rose-400"
                    >
                      <Heart size={40} className="fill-white" />
                    </button>
                  </div>
                )}

                {/* Listing of all reasons */}
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">Saved Reasons Why I Love Astha</h3>
                  {store.asthaReasons && store.asthaReasons.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {store.asthaReasons.map((reason) => (
                        <div 
                          key={reason.id} 
                          className="bg-zinc-950 border border-zinc-800 p-4.5 rounded-2xl hover:border-rose-500/15 transition-all flex flex-col justify-between"
                        >
                          <p className="text-xs font-sans text-zinc-200 italic leading-relaxed">
                            "{reason.text}"
                          </p>
                          <div className="flex items-center justify-between mt-4">
                            <span className="text-[8px] font-mono text-zinc-500">Love Reason {reason.id.toUpperCase()}</span>
                            <span className="flex gap-2">
                              <button
                                onClick={() => speakQuote(reason.text)}
                                className="text-[10px] font-mono text-zinc-400 hover:text-rose-400 cursor-pointer"
                              >
                                Listen
                              </button>
                              <button
                                onClick={() => store.deleteAsthaReason(reason.id)}
                                className="text-zinc-500 hover:text-rose-400 p-0.5 cursor-pointer"
                              >
                                <Trash2 size={11} />
                              </button>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-zinc-950 border border-zinc-800 py-10 rounded-2xl text-center text-zinc-500 text-xs font-mono">
                      Abhi tak koi reasons list nahi kiya gaya hai, Rishu Boss. Pehla reason upar form me likhiye!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

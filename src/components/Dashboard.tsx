import React, { useState } from 'react';
import { useAppStore } from '../store';
import { 
  ShieldAlert, ShieldCheck, Milestone, BarChart2, BookLock, Activity, Plus, Trash2, Calendar, ClipboardList, Battery, Wifi, CheckCircle2, Circle, AlertCircle, Lock, Unlock, Key, FileText, Globe
} from 'lucide-react';

export default function Dashboard() {
  const store = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<'boss' | 'goals' | 'memories' | 'secret' | 'permissions'>('boss');

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
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { 
  Key, Shield, Settings, Volume2, Mic, User, UserCheck, Code, Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Moon, Sun, Monitor
} from 'lucide-react';

export default function SettingsPanel() {
  const store = useAppStore();
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  // YouTube Key States
  const [showYtKey, setShowYtKey] = useState(false);
  const [testingYtKey, setTestingYtKey] = useState(false);
  const [ytTestResult, setYtTestResult] = useState<'success' | 'failed' | null>(null);

  // Creator state settings
  const [asstName, setAsstName] = useState(store.assistantName);
  const [creatName, setCreatName] = useState(store.creatorName);
  const [ownName, setOwnName] = useState(store.ownerName);
  const [savingSettings, setSavingSettings] = useState(false);

  // Secret passcode state
  const [passcode, setPasscode] = useState(store.secretPasscode);

  const testYtConnection = async () => {
    if (!store.youtubeApiKey) {
      setYtTestResult('failed');
      return;
    }
    setTestingYtKey(true);
    setYtTestResult(null);
    try {
      const res = await fetch('/api/youtube/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: store.youtubeApiKey }),
      });
      const data = await res.json();
      if (data.ok) {
        setYtTestResult('success');
      } else {
        setYtTestResult('failed');
      }
    } catch (e) {
      setYtTestResult('failed');
    } finally {
      setTestingYtKey(false);
    }
  };

  const testConnection = async () => {
    if (!store.apiKey) {
      setTestResult('failed');
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: store.apiKey }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult('success');
      } else {
        setTestResult('failed');
      }
    } catch (e) {
      setTestResult('failed');
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveCreatorSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    store.setCreatorSettings({
      assistantName: asstName,
      creatorName: creatName,
      ownerName: ownName,
    });
    setTimeout(() => setSavingSettings(false), 600);
  };

  const handleUpdatePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    store.setSecretPasscode(passcode);
  };

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto pb-12">
      {/* 1. Gemini Live API Configuration */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-300 uppercase flex items-center gap-2">
          <Key size={16} className="text-cyan-400" />
          Gemini Configuration
        </h3>

        <div className="space-y-3">
          <label className="block text-xs font-mono text-zinc-400 uppercase">Gemini API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={store.apiKey}
              onChange={(e) => store.setApiKey(e.target.value)}
              placeholder="Paste AI Studio API Key..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 outline-none focus:border-cyan-400/50 transition-colors pr-12 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3.5 top-3 text-zinc-500 hover:text-zinc-300"
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">
            Your key stays offline in secure client storage and is never saved on arbitrary server databases.
          </p>

          <div className="flex flex-wrap gap-3 items-center pt-2">
            <button
              onClick={testConnection}
              disabled={testingKey || !store.apiKey}
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-semibold rounded-lg border border-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {testingKey ? (
                <RefreshCw size={14} className="animate-spin text-cyan-400" />
              ) : (
                <CheckCircle size={14} className="text-cyan-400" />
              )}
              TEST CONNECTION
            </button>

            {testResult === 'success' && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-900/50 px-3 py-1 rounded-full">
                <CheckCircle size={12} />
                CONNECTION SUCCESSFUL
              </span>
            )}

            {testResult === 'failed' && (
              <span className="text-xs font-mono text-rose-400 flex items-center gap-1.5 bg-rose-950/30 border border-rose-900/50 px-3 py-1 rounded-full">
                <XCircle size={12} />
                CONNECTION FAILED
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-zinc-400 uppercase">Live Model</label>
            <select
              value={store.selectedModel}
              onChange={(e) => store.setSelectedModel(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 outline-none focus:border-cyan-400/50"
            >
              <option value="gemini-3.1-flash-live-preview">gemini-3.1-flash-live-preview (Fast Live)</option>
              <option value="gemini-3.5-flash">gemini-3.5-flash (Standard Text/API)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-zinc-400 uppercase">Interactive Voice</label>
            <select
              value={store.selectedVoice}
              onChange={(e) => store.setSelectedVoice(e.target.value as any)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 outline-none focus:border-cyan-400/50"
            >
              <option value="Zephyr">Zephyr (Warm Female)</option>
              <option value="Kore">Kore (Vibrant Female)</option>
              <option value="Puck">Puck (Witty Male)</option>
              <option value="Charon">Charon (Deep Male)</option>
              <option value="Fenrir">Fenrir (Confident male)</option>
            </select>
          </div>
        </div>
      </div>

      {/* YouTube API Config */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-300 uppercase flex items-center gap-2">
          <Settings size={16} className="text-rose-400" />
          YouTube API Key Settings
        </h3>

        <div className="space-y-3">
          <label className="block text-xs font-mono text-zinc-400 uppercase">YouTube Data API v3 Key</label>
          <div className="relative">
            <input
              type={showYtKey ? 'text' : 'password'}
              value={store.youtubeApiKey}
              onChange={(e) => store.setYoutubeApiKey(e.target.value)}
              placeholder="Paste Google/YouTube API Key (Optional)..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 outline-none focus:border-rose-400/50 transition-colors pr-12 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowYtKey(!showYtKey)}
              className="absolute right-3.5 top-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              {showYtKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">
            Optional. If not provided, search will gracefully fallback to high-fidelity, grounded Gemini search to discover public videos.
          </p>

          <div className="flex flex-wrap gap-3 items-center pt-2">
            <button
              type="button"
              onClick={testYtConnection}
              disabled={testingYtKey || !store.youtubeApiKey}
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 font-mono text-xs font-semibold rounded-lg border border-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {testingYtKey ? (
                <RefreshCw size={14} className="animate-spin text-rose-400" />
              ) : (
                <CheckCircle size={14} className="text-rose-400" />
              )}
              TEST CONNECTION
            </button>

            {ytTestResult === 'success' && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-900/50 px-3 py-1 rounded-full">
                <CheckCircle size={12} />
                CONNECTION SUCCESSFUL
              </span>
            )}

            {ytTestResult === 'failed' && (
              <span className="text-xs font-mono text-rose-400 flex items-center gap-1.5 bg-rose-950/30 border border-rose-900/50 px-3 py-1 rounded-full">
                <XCircle size={12} />
                CONNECTION FAILED
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Device Audio Tunings */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-300 uppercase flex items-center gap-2">
          <Volume2 size={16} className="text-fuchsia-400" />
          Hardware & Speech Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
          {/* Speaker Volume */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
              <span className="uppercase flex items-center gap-1.5">
                <Volume2 size={14} /> AI SPEAKER VOLUME
              </span>
              <span>{store.voiceVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={store.voiceVolume}
              onChange={(e) => store.setVoiceVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
            />
          </div>

          {/* Mic Gain */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
              <span className="uppercase flex items-center gap-1.5">
                <Mic size={14} /> MIC RECAPTURE GAIN
              </span>
              <span>{store.micGain}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={store.micGain}
              onChange={(e) => store.setMicGain(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
            />
          </div>
        </div>
      </div>

      {/* 3. Persona Settings (Creator Creator Mode) */}
      <form onSubmit={handleSaveCreatorSettings} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-300 uppercase flex items-center gap-2">
          <User size={16} className="text-emerald-400" />
          Persona & Owner Identity
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-zinc-400 uppercase">Assistant Name</label>
            <input
              type="text"
              value={asstName}
              onChange={(e) => setAsstName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-400/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-zinc-400 uppercase">Rishu Boss / Owner Name</label>
            <input
              type="text"
              value={ownName}
              onChange={(e) => setOwnName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-400/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-zinc-400 uppercase">Creator Name</label>
            <input
              type="text"
              value={creatName}
              onChange={(e) => setCreatName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-400/50 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer mt-2"
        >
          {savingSettings ? 'SAVING...' : 'SAVE CORE CHANGES'}
        </button>
      </form>

      {/* 4. Secret Boss Locked System Setup */}
      <form onSubmit={handleUpdatePasscode} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-mono tracking-wider font-semibold text-zinc-300 uppercase flex items-center gap-2">
          <Shield size={16} className="text-red-400" />
          Secret Boss Passcode Lock
        </h3>

        <div className="space-y-3">
          <label className="block text-xs font-mono text-zinc-400 uppercase">Secret Numeric Keycode</label>
          <div className="flex gap-3">
            <input
              type="password"
              maxLength={8}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))} // Numeric only
              placeholder="e.g. 1234"
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-200 outline-none focus:border-red-400/50 transition-colors w-40 tracking-widest text-center"
            />
            <button
              type="submit"
              disabled={passcode === store.secretPasscode}
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-red-400 font-mono text-xs font-semibold rounded-lg border border-zinc-800 transition-colors flex items-center gap-2"
            >
              CHOOSE PASSCODE
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">
            Protects private diary records, memory databases, and hidden timeline journals.
          </p>
        </div>
      </form>
    </div>
  );
}

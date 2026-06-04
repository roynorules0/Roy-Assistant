import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, LiveState } from '../store';
import { voiceEngine } from '../audio-processor';

const STATE_MESSAGES: Record<LiveState, string> = {
  offline: 'TAP TO ACTIVATE',
  connecting: 'SYCHRONIZING COGNITION...',
  ready: 'ROY GIRL AI ONLINE',
  listening: 'LISTENING...',
  thinking: 'PROCESSING DIRECTIVES...',
  speaking: 'ROY GIRL SPEAKING',
};

export default function Orb({ onClick }: { onClick: () => void }) {
  const liveState = useAppStore((state) => state.liveState);
  const assistantName = useAppStore((state) => state.assistantName);
  const connectionError = useAppStore((state) => state.connectionError);
  const orbRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // High performance visual scaling with requestAnimationFrame (prevents React render thrashing)
  useEffect(() => {
    let active = true;
    const updateScale = () => {
      if (!active) return;

      const orb = orbRef.current;
      const glow = glowRef.current;
      if (orb && glow) {
        let amplitude = 0;
        if (liveState === 'listening') {
          amplitude = voiceEngine.micAmplitude;
        } else if (liveState === 'speaking') {
          amplitude = voiceEngine.speakerAmplitude;
        }

        // Clamp & boost representation
        const scaleVal = 1 + Math.min(1.5, amplitude * 4.5);
        orb.style.transform = `scale(${scaleVal})`;
        
        const opacityVal = 0.4 + Math.min(0.6, amplitude * 12);
        glow.style.opacity = `${opacityVal}`;
        glow.style.transform = `scale(${scaleVal * 1.35})`;
      }

      requestAnimationFrame(updateScale);
    };

    updateScale();
    return () => {
      active = false;
    };
  }, [liveState]);

  // Color mappings based on engine states
  const getOrbGradient = () => {
    switch (liveState) {
      case 'offline':
        return 'from-slate-700 via-slate-800 to-zinc-950 shadow-[0_0_50px_rgba(100,116,139,0.35)] ring-slate-700/50';
      case 'connecting':
        return 'from-amber-500 via-yellow-600 to-amber-950 shadow-[0_0_60px_rgba(245,158,11,0.5)] ring-amber-500/50';
      case 'ready':
        return 'from-cyan-500 via-teal-600 to-sky-950 shadow-[0_0_60px_rgba(6,182,212,0.5)] ring-cyan-500/50';
      case 'listening':
        return 'from-fuchsia-500 via-purple-600 to-purple-950 shadow-[0_0_80px_rgba(217,70,239,0.73)] ring-fuchsia-500/50';
      case 'thinking':
        return 'from-violet-500 via-indigo-600 to-indigo-950 animate-pulse shadow-[0_0_60px_rgba(99,102,241,0.6)] ring-indigo-500/50';
      case 'speaking':
        return 'from-emerald-400 via-green-600 to-emerald-950 shadow-[0_0_90px_rgba(16,185,129,0.8)] ring-emerald-400/50';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 select-none">
      <div 
        id="orb_engine_container" 
        className="relative flex items-center justify-center w-72 h-72 cursor-pointer group"
        onClick={onClick}
      >
        {/* Dynamic visual bloom backdrop */}
        <div
          ref={glowRef}
          className={`absolute inset-4 rounded-full blur-3xl transition-all duration-700 ${
            liveState === 'offline' ? 'bg-slate-800' :
            liveState === 'connecting' ? 'bg-amber-600' :
            liveState === 'ready' ? 'bg-cyan-600' :
            liveState === 'listening' ? 'bg-fuchsia-600' :
            liveState === 'thinking' ? 'bg-indigo-600' :
            'bg-emerald-600'
          }`}
          style={{ opacity: 0.35 }}
        />

        {/* Outer orbital rings */}
        <AnimatePresence>
          {liveState !== 'offline' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 rounded-full border border-dashed border-zinc-700/60 animate-[spin_50s_linear_infinite]"
            />
          )}
        </AnimatePresence>
        
        {/* Secondary orbit ring running opposite */}
        {liveState === 'thinking' && (
          <div className="absolute -inset-4 rounded-full border border-violet-500/30 animate-[spin_10s_linear_infinite_reverse]" />
        )}

        {/* Primary Interactive AI Core */}
        <div
          ref={orbRef}
          className={`w-48 h-48 rounded-full bg-gradient-to-tr ${getOrbGradient()} border-2 transition-all duration-500 flex flex-col items-center justify-center text-center p-4 z-10`}
        >
          {/* Internal neon wire mesh */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={liveState}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center"
            >
              <span className="text-[10px] uppercase font-mono tracking-[4px] text-zinc-400 mb-1">
                {assistantName}
              </span>

              {liveState === 'offline' ? (
                <div className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-[0_0_10px_#64748b] animate-ping" />
              ) : liveState === 'connecting' ? (
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : liveState === 'thinking' ? (
                <div className="flex gap-1.5 justify-center py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-[bounce_1s_infinite_100ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-[bounce_1s_infinite_200ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-[bounce_1s_infinite_300ms]" />
                </div>
              ) : (
                <div className={`w-3.5 h-3.5 rounded-full ${
                  liveState === 'listening' ? 'bg-fuchsia-400 shadow-[0_0_12px_#d946ef]' :
                  liveState === 'speaking' ? 'bg-emerald-400 shadow-[0_0_15px_#10b981]' :
                  'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                }`} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Reactive Text Panels */}
      <div className="mt-8 text-center max-w-sm z-10">
        <h3 className={`text-sm font-mono tracking-widest font-semibold transition-colors duration-500 uppercase ${
          liveState === 'offline' ? 'text-zinc-500' :
          liveState === 'connecting' ? 'text-amber-400' :
          liveState === 'listening' ? 'text-fuchsia-400' :
          liveState === 'thinking' ? 'text-indigo-400' :
          liveState === 'speaking' ? 'text-emerald-400' :
          'text-cyan-400'
        }`}>
          {STATE_MESSAGES[liveState]}
        </h3>

        {connectionError && (
          connectionError === 'MIC_PERMISSION_DENIED' ? (
            <div className="mt-4 text-left text-[11px] text-amber-300 bg-amber-950/20 border border-amber-900/40 rounded-2xl p-4 font-mono animate-fade-in space-y-2">
              <span className="font-extrabold text-amber-400 block tracking-wider text-xs">🎙️ MICROPHONE DISCONNECTED</span>
              <p className="text-zinc-400 leading-relaxed">
                Browser microphone access was blocked or denied.
              </p>
              <div className="text-[10px] text-zinc-500 space-y-1 pt-1 border-t border-zinc-900/60">
                <p className="font-bold text-zinc-400">💡 Quick Troubleshooting Tips:</p>
                <p>1. Check the padlock icon in your browser address bar next to the URL.</p>
                <p>2. Toggle the switch to <strong className="text-emerald-400 uppercase">"Allow" / "Reset Permissions"</strong> for microphone input.</p>
                <p>3. Do not worry! You can easily chat with me by typing right into the text input box below.</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-rose-500 bg-rose-950/40 border border-rose-900/50 rounded-lg px-4 py-2 font-mono animate-shake">
              ERR: {connectionError}
            </p>
          )
        )}
      </div>
    </div>
  );
}

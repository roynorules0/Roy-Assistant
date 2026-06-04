import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { voiceEngine } from '../audio-processor';

export default function Waveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveState = useAppStore((state) => state.liveState);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let width = container.clientWidth;
    let height = container.clientHeight || 120;
    canvas.width = width;
    canvas.height = height;

    // Use ResizeObserver for perfect non-fixed layout boundaries
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width = Math.floor(entry.contentRect.width);
        height = Math.floor(entry.contentRect.height) || 120;
        canvas.width = width;
        canvas.height = height;
      }
    });
    resizeObserver.observe(container);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Determine wave count, speed, and standard colors
      let waveCount = 3;
      let amplitudeFactor = 0;
      let color = '#3f3f46'; // Slate zinc default
      let glowColor = 'rgba(63, 63, 70, 0)';

      if (liveState === 'listening') {
        amplitudeFactor = voiceEngine.micAmplitude;
        color = '#d946ef'; // Fuchsia
        glowColor = 'rgba(217, 70, 239, 0.4)';
        waveCount = 4;
      } else if (liveState === 'speaking') {
        amplitudeFactor = voiceEngine.speakerAmplitude;
        color = '#10b981'; // Emerald
        glowColor = 'rgba(16, 185, 129, 0.4)';
        waveCount = 5;
      } else if (liveState === 'connecting') {
        amplitudeFactor = 0.05 + Math.sin(Date.now() / 150) * 0.02;
        color = '#f59e0b'; // Amber
        glowColor = 'rgba(245, 158, 11, 0.2)';
      } else if (liveState === 'ready') {
        amplitudeFactor = 0.02 + Math.sin(Date.now() / 400) * 0.01;
        color = '#06b6d4'; // Cyan
        glowColor = 'rgba(6, 182, 212, 0.2)';
      }

      phase += 0.08; // Dynamic movement speed

      // Apply gorgeous neon bloom glow effects to canvas lines
      ctx.shadowBlur = amplitudeFactor > 0 ? 12 : 2;
      ctx.shadowColor = color;

      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        
        // Multi-layered waves with conflicting phases builds organic physical movement
        const waveOffset = w * (Math.PI / 4);
        const waveSpeedFactor = 1 - w * 0.15;
        const localAmp = (amplitudeFactor * height * 0.85) / Math.sqrt(w + 1);

        ctx.strokeStyle = w === 0 ? color : `${color}66`; // Primary wave is opaque, helper waves are semi-transparent
        ctx.lineWidth = w === 0 ? 3 : 1.5;

        for (let x = 0; x < width; x++) {
          const y =
            height / 2 +
            Math.sin(x * 0.012 + phase * waveSpeedFactor + waveOffset) *
              localAmp *
              Math.sin((x / width) * Math.PI); // Pin boundaries to 0 so waves stay within canvas bounds

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      ctx.shadowBlur = 0; // Clear shadow
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [liveState]);

  return (
    <div ref={containerRef} className="w-full h-24 bg-zinc-950/20 backdrop-blur-md rounded-2xl border border-zinc-800/10 relative overflow-hidden flex items-end">
      {/* Absolute indicator badge */}
      {liveState !== 'offline' && (
        <div id="v_wave_meta" className="absolute top-2.5 right-4 font-mono text-[9px] tracking-wider text-zinc-500 uppercase flex items-center gap-1.5 z-10 select-none">
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${
            liveState === 'listening' ? 'bg-fuchsia-500 animate-pulse' :
            liveState === 'speaking' ? 'bg-emerald-500 animate-pulse' :
            'bg-cyan-500 animate-pulse'
          }`} />
          {liveState === 'listening' ? 'MIC FEED' : liveState === 'speaking' ? 'SPEAKER FEED' : 'ACTIVE IDLE'}
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

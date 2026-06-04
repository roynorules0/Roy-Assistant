import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, AvatarEmotion } from '../store';
import { voiceEngine } from '../audio-processor';
import { Sparkles, Heart, Activity } from 'lucide-react';

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'star' | 'heart' | 'note' | 'confetti' | 'teardrop' | 'cyber';
  rotation?: number;
  rotationSpeed?: number;
}

export default function AnimeAvatar({ onClick }: { onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveState = useAppStore((state) => state.liveState);
  const avatarEmotion = useAppStore((state) => state.avatarEmotion);
  const setAvatarEmotion = useAppStore((state) => state.setAvatarEmotion);
  const assistantName = useAppStore((state) => state.assistantName);

  // Mouse Coordinates for Head/Eye Tracking
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Voice Amplitudes for Lip Sync
  const lastSpeakerAmp = useRef(0);

  // Blinking mechanics
  const blinkTimerRef = useRef(0);
  const isBlinkingRef = useRef(false);
  const blinkRatioRef = useRef(1); // 1 = fully open, 0 = fully closed

  // Natural state timers
  const timeRef = useRef(0);

  // Confetti / Particle array
  const particlesRef = useRef<Particle[]>([]);

  // Track orientation / resize
  const [dimensions, setDimensions] = useState({ width: 280, height: 280 });

  // Sync mouse coordinate offsets
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      // Normalized coordinates from -1 to 1
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      
      mouseRef.current.targetX = Math.max(-1, Math.min(1, dx));
      mouseRef.current.targetY = Math.max(-1, Math.min(1, dy));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Set dimension on mount and window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // High fidelity scaling resolution
        const d = Math.min(300, containerRef.current.clientWidth || 280);
        setDimensions({ width: d, height: d });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Update base emotion when live voice engine state changes
  useEffect(() => {
    // If we are in a custom triggered override animation, let it complete
    const isOverride = ['dance', 'hello', 'smile', 'happy', 'sad', 'curious', 'confused'].includes(avatarEmotion);
    if (isOverride) return;

    if (liveState === 'speaking') {
      setAvatarEmotion('speaking');
    } else if (liveState === 'listening') {
      setAvatarEmotion('listening');
    } else if (liveState === 'thinking') {
      setAvatarEmotion('thinking');
    } else {
      setAvatarEmotion('idle');
    }
  }, [liveState, setAvatarEmotion, avatarEmotion]);

  // Handle custom animation return to idle/normal loop
  useEffect(() => {
    if (['dance', 'hello', 'smile', 'happy', 'sad', 'curious', 'confused'].includes(avatarEmotion)) {
      // Set timer to automatically return to idle after some period
      const ms = avatarEmotion === 'dance' ? 6200 : avatarEmotion === 'hello' ? 3800 : 2800;
      const t = setTimeout(() => {
        // Return to normal corresponding to liveState
        if (liveState === 'speaking') {
          setAvatarEmotion('speaking');
        } else if (liveState === 'listening') {
          setAvatarEmotion('listening');
        } else if (liveState === 'thinking') {
          setAvatarEmotion('thinking');
        } else {
          setAvatarEmotion('idle');
        }
      }, ms);
      return () => clearTimeout(t);
    }
  }, [avatarEmotion, liveState, setAvatarEmotion]);

  // Main high-performance Canvas rendering loop: 60 FPS Target with advanced 3D shaders
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    // Helper functions for drawing advanced AAA cyber elements
    const drawHolographicHUD = (ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) => {
      ctx.save();
      ctx.translate(cx, cy);

      let neonColor = 'rgba(34,211,238,0.15)'; // cyan
      if (liveState === 'listening') neonColor = 'rgba(236,72,153,0.22)'; // fuchsia pulse
      if (liveState === 'thinking') neonColor = 'rgba(168,85,247,0.18)'; // violet computing
      if (liveState === 'speaking') neonColor = 'rgba(16,185,129,0.22)'; // emerald speaking
      if (avatarEmotion === 'dance') {
        neonColor = `hsla(${(time * 4) % 360}, 85%, 60%, 0.18)`;
      }

      // Outer holographic rotating ring with data breaks
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 1;
      
      ctx.save();
      ctx.rotate(time * 0.005);
      ctx.beginPath();
      ctx.arc(0, 0, 115, 0, Math.PI * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 115, Math.PI * 0.5, Math.PI * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 115, Math.PI, Math.PI * 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 115, Math.PI * 1.5, Math.PI * 1.9);
      ctx.stroke();
      ctx.restore();

      // Faster counter-rotating inner ring
      ctx.save();
      ctx.rotate(-time * 0.012);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, 108, 0, Math.PI * 1.8);
      ctx.setLineDash([5, 15]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Crosshairs in the corners
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 0.75;
      const chSize = 6;
      const ringR = 120;
      
      const drawCrosshair = (x: number, y: number) => {
        ctx.beginPath();
        ctx.moveTo(x - chSize, y); ctx.lineTo(x + chSize, y);
        ctx.moveTo(x, y - chSize); ctx.lineTo(x, y + chSize);
        ctx.stroke();
      };
      
      drawCrosshair(-ringR, -ringR);
      drawCrosshair(ringR, -ringR);
      drawCrosshair(-ringR, ringR);
      drawCrosshair(ringR, ringR);

      // Binary state ticks
      ctx.save();
      ctx.font = 'bold 6px monospace';
      ctx.fillStyle = neonColor;
      ctx.fillText("DEC: 99.48%", -ringR, -ringR + 15);
      ctx.fillText("GRID_SEC: OK", ringR - 45, ringR - 12);
      ctx.restore();

      ctx.restore();
    };

    const drawLowerHairLayer = (ctx: CanvasRenderingContext2D, cx: number, cy: number, tiltX: number, tiltY: number, breathing: number, time: number) => {
      ctx.save();
      ctx.translate(cx + tiltX * 0.85, cy + tiltY * 0.85 + breathing);

      // Hair Base Gradient colors (Futuristic Royal Violet to Glowing Magenta)
      const hairGrad = ctx.createLinearGradient(-80, -90, 80, 110);
      hairGrad.addColorStop(0, '#1e0b36'); // Midnight space
      hairGrad.addColorStop(0.5, '#4c1d95'); // Royal violet
      hairGrad.addColorStop(0.85, '#9d174d'); // Crimson punch
      hairGrad.addColorStop(1, '#ec4899'); // Glowing hot pink ends

      ctx.fillStyle = hairGrad;
      ctx.strokeStyle = '#0c0415';
      ctx.lineWidth = 2.5;

      const hairSway = Math.sin(time * 0.038) * 4.5;
      const pigtailRot = Math.sin(time * 0.05) * 0.04;

      // Draw long flowing back pigtails with simulated physics
      // LEFT LONG PIGTAIL
      ctx.save();
      ctx.translate(-38, -12);
      ctx.rotate(-0.05 + pigtailRot + (avatarEmotion === 'dance' ? Math.sin(time * 0.15) * 0.15 : 0));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-55 + hairSway, 25, -95 + hairSway, 90, -78 + hairSway, 145);
      ctx.bezierCurveTo(-65 + hairSway, 125, -35 + hairSway, 65, -8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // RIGHT LONG PIGTAIL
      ctx.save();
      ctx.translate(38, -12);
      ctx.rotate(0.05 - pigtailRot - (avatarEmotion === 'dance' ? Math.sin(time * 0.15) * 0.15 : 0));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(55 - hairSway, 25, 95 - hairSway, 90, 78 - hairSway, 145);
      ctx.bezierCurveTo(65 - hairSway, 125, 35 - hairSway, 65, 8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    };

    const drawHeadAndStructure = (ctx: CanvasRenderingContext2D, cx: number, cy: number, tiltX: number, tiltY: number, breathing: number, time: number) => {
      // 1. Cyber Headset Halo
      ctx.save();
      ctx.translate(cx, cy + breathing);
      
      let indicatorColor = '#22d3ee'; // standard cyan
      let haloGlow = 'rgba(6,182,212,0.18)'; 
      if (liveState === 'listening') {
        indicatorColor = '#f472b6'; // hot pink
        haloGlow = 'rgba(236,72,153,0.28)';
      } else if (liveState === 'thinking') {
        indicatorColor = '#c084fc'; // purple
        haloGlow = 'rgba(168,85,247,0.24)';
      } else if (liveState === 'speaking') {
        indicatorColor = '#34d399'; // emerald
        haloGlow = 'rgba(16,185,129,0.3)';
      }
      if (avatarEmotion === 'dance') {
        const h = (time * 1.5) % 360;
        indicatorColor = `hsl(${h}, 90%, 60%)`;
        haloGlow = `hsla(${h}, 85%, 50%, 0.3)`;
      }

      ctx.shadowBlur = avatarEmotion === 'listening' ? 14 : 7;
      ctx.shadowColor = indicatorColor;

      // Halo Arc Ring (Back Headwear component)
      ctx.beginPath();
      ctx.arc(0, -18, 76, Math.PI, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = indicatorColor;
      ctx.stroke();

      // Glowing cyber knots
      ctx.beginPath();
      ctx.arc(-72, -18, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = indicatorColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(72, -18, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0; // Reset shadow for basic vector shapes
      ctx.restore();

      // 2. Neck and Cyber Collar
      ctx.save();
      ctx.translate(cx + tiltX * 0.7, cy + breathing + 42);
      
      // Neck Base
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.lineTo(-10, 16);
      ctx.lineTo(10, 16);
      ctx.lineTo(11, 0);
      ctx.closePath();
      
      const neckSkinGrad = ctx.createLinearGradient(0, -5, 0, 18);
      neckSkinGrad.addColorStop(0, '#ffe4e6'); // light peach shadow
      neckSkinGrad.addColorStop(1, '#fed7aa'); // rich warm peach base
      ctx.fillStyle = neckSkinGrad;
      ctx.fill();

      // Neck shadow occlusion
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.bezierCurveTo(-5, 6, 5, 6, 11, 0);
      ctx.lineTo(11, 4);
      ctx.bezierCurveTo(5, 10, -5, 10, -11, 4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(190, 24, 74, 0.16)'; // warm blush shadows
      ctx.fill();

      // Tech choker collar
      ctx.fillStyle = '#111019'; // metallic black
      ctx.strokeStyle = '#27273a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-11, 6);
      ctx.lineTo(-10, 14);
      ctx.lineTo(10, 14);
      ctx.lineTo(11, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing fiber line
      ctx.beginPath();
      ctx.moveTo(-10.5, 10);
      ctx.lineTo(10.5, 10);
      ctx.strokeStyle = indicatorColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      // 3. Futuristic High-contrast Suit & Shoulders
      ctx.save();
      ctx.translate(cx + tiltX * 0.55, cy + breathing + 54);

      // Shoulders base contour
      ctx.beginPath();
      ctx.moveTo(-33, 5);
      ctx.bezierCurveTo(-55, 7, -68, 22, -68, 40);
      ctx.lineTo(68, 40);
      ctx.bezierCurveTo(68, 22, 55, 7, 33, 5);
      ctx.closePath();

      // Cyber Glossy Gradient Suit (with ambient occlusion shading)
      const carbonGrad = ctx.createLinearGradient(-60, 5, 60, 35);
      carbonGrad.addColorStop(0, '#09080e'); // Obsidian black
      carbonGrad.addColorStop(0.35, '#161427'); // Cosmic indigo deep
      carbonGrad.addColorStop(0.5, '#2e1049'); // Carbon violet center
      carbonGrad.addColorStop(0.65, '#161427');
      carbonGrad.addColorStop(1, '#09080e');
      ctx.fillStyle = carbonGrad;
      ctx.fill();

      // Metallic Suit Borders Specular Highlight edge
      ctx.beginPath();
      ctx.moveTo(-32, 6);
      ctx.quadraticCurveTo(-52, 9, -65, 23);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dynamic LED piping on shoulders
      ctx.beginPath();
      ctx.moveTo(-33, 9);
      ctx.lineTo(-44, 28);
      ctx.moveTo(33, 9);
      ctx.lineTo(44, 28);
      ctx.strokeStyle = indicatorColor + 'bc'; // beautiful neon pipe
      ctx.lineWidth = 2;
      ctx.stroke();

      // Suit Center logo / emblem (Roy cyber crest)
      ctx.fillStyle = indicatorColor;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(-5, 9);
      ctx.lineTo(0, 4);
      ctx.lineTo(5, 9);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 4. Detailed Mature Face Shape Shape Contour
      ctx.save();
      ctx.translate(cx + tiltX, cy + tiltY + breathing);

      // Cheek chin vector curves
      ctx.beginPath();
      // Mature narrower chin angle instead of chubby flat circle
      ctx.moveTo(-42, -18);
      ctx.bezierCurveTo(-42, 10, -32, 29, 0, 37); // Sharper aesthetic jawline
      ctx.bezierCurveTo(32, 29, 42, 10, 42, -18);
      ctx.bezierCurveTo(42, -45, -42, -45, -42, -18);
      ctx.closePath();

      // 3D Soft skin shading with light source from top-left
      const skinGrad = ctx.createRadialGradient(-15, -25, 10, 0, 0, 56);
      skinGrad.addColorStop(0, '#fffbfb'); // Direct bright light
      skinGrad.addColorStop(0.7, '#fff1f2'); // Rose peach blush
      skinGrad.addColorStop(1, '#fecdd3'); // Shaded jaw rim
      
      ctx.fillStyle = skinGrad;
      ctx.fill();

      // Jawline 3D Shadow Overlay for Depth
      ctx.beginPath();
      ctx.moveTo(-41, 1);
      ctx.quadraticCurveTo(-15, 25, 0, 37);
      ctx.quadraticCurveTo(15, 25, 41, 1);
      ctx.quadraticCurveTo(0, 23, -41, 1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(225, 29, 72, 0.12)'; // drop shade skin contour
      ctx.fill();

      // Cyber blush details
      let blushOpacity = 0.14;
      if (['happy', 'smile', 'hello', 'celebrating'].includes(avatarEmotion)) blushOpacity = 0.42;
      ctx.fillStyle = `rgba(244, 63, 94, ${blushOpacity})`;

      // Beautiful subtle soft blush pads
      ctx.beginPath();
      ctx.ellipse(-23, 7, 7, 3.5, -0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(23, 7, 7, 3.5, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Blush vector lash lines (adorable anime blush lines)
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.35)';
      ctx.lineWidth = 1;
      const drawBlushTicks = (bx: number) => {
        ctx.beginPath();
        ctx.moveTo(bx - 3, 5); ctx.lineTo(bx - 1, 9);
        ctx.moveTo(bx, 5);     ctx.lineTo(bx + 2, 9);
        ctx.stroke();
      };
      if (blushOpacity > 0.2) {
        drawBlushTicks(-23);
        drawBlushTicks(23);
      }

      ctx.restore();

      // 5. High Fidelity Cyber Headphone Consoles (Ear covers)
      ctx.save();
      ctx.translate(cx + tiltX, cy + tiltY + breathing);

      const drawSingleHeadphone = (hX: number, isRight: boolean) => {
        const side = isRight ? 1 : -1;
        ctx.save();
        ctx.translate(hX, -10);

        // Rotating visual core inside headphones
        ctx.shadowBlur = 8;
        ctx.shadowColor = indicatorColor;

        // Outer cyber metal casing
        ctx.fillStyle = '#0b0a12';
        ctx.strokeStyle = '#27273f';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 19, side * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0; // Reset glow

        // Glowing fluorescent accent band
        ctx.strokeStyle = indicatorColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 14, side * 0.1, 0, Math.PI * 2);
        ctx.stroke();

        // Little center energy bead
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Cybernetic metallic antenna
        ctx.beginPath();
        ctx.moveTo(side * 4, -13);
        ctx.lineTo(side * 14, -31);
        ctx.strokeStyle = '#3e3d55';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(side * 4, -13);
        ctx.lineTo(side * 14, -31);
        ctx.strokeStyle = indicatorColor;
        ctx.lineWidth = 0.75;
        ctx.stroke();

        // Tip LED bead glow
        ctx.beginPath();
        ctx.arc(side * 14, -31, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = indicatorColor;
        ctx.fill();

        ctx.restore();
      };

      drawSingleHeadphone(-52, false);
      drawSingleHeadphone(52, true);

      ctx.restore();
    };

    const drawEyesV3 = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      tiltX: number,
      tiltY: number,
      breathing: number,
      eyeTrackX: number,
      eyeTrackY: number,
      time: number
    ) => {
      ctx.save();
      // Absolute spatial coordinates of eyes
      ctx.translate(cx + tiltX, cy + tiltY + breathing - 4);

      const eyeXOffset = 21.5;
      const eyeYOffset = -4;

      const drawSingleIrisV3 = (eyeX: number, isRight: boolean) => {
        const side = isRight ? 1 : -1;

        // 1. EYEBROWS (highly expressive, vector arcs)
        ctx.save();
        ctx.strokeStyle = '#311042'; // deep violet purple
        ctx.lineWidth = 1.75;
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        let eyebrowY = eyeYOffset - 16;

        if (avatarEmotion === 'thinking') {
          eyebrowY += isRight ? -3 : 2; // curious asymmetric raise
        } else if (avatarEmotion === 'confused' || avatarEmotion === 'curious') {
          eyebrowY += isRight ? 2 : -2.5; 
        } else if (avatarEmotion === 'sad') {
          // slope up inward high sad arches
          ctx.moveTo(eyeX - 8 * side, eyebrowY + 3);
          ctx.bezierCurveTo(
            eyeX - 4 * side, eyebrowY - 3,
            eyeX + 6 * side, eyebrowY - 1,
            eyeX + 8 * side, eyebrowY + 2
          );
        }

        if (avatarEmotion !== 'sad') {
          ctx.moveTo(eyeX - 10 * side, eyebrowY + 1);
          ctx.quadraticCurveTo(eyeX, eyebrowY - 2.5, eyeX + 9 * side, eyebrowY + 1.5);
        }
        ctx.stroke();
        ctx.restore();

        // 2. HAPPY / CLOSED EYES (Cute arches ^.^)
        const isClosed = ['happy', 'smile', 'excited', 'celebrating'].includes(avatarEmotion);
        if (isClosed) {
          ctx.beginPath();
          ctx.strokeStyle = '#0c0b16';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          // upward happy curves
          ctx.moveTo(eyeX - 10 * side, eyeYOffset + 1.5);
          ctx.quadraticCurveTo(
            eyeX, eyeYOffset - 5.5,
            eyeX + 11 * side, eyeYOffset + 1.5
          );
          ctx.stroke();

          // double tick eyelashes
          ctx.beginPath();
          ctx.moveTo(eyeX + 9 * side, eyeYOffset - 1.5);
          ctx.lineTo(eyeX + 13 * side, eyeYOffset - 3.5);
          ctx.lineWidth = 2;
          ctx.stroke();
          return;
        }

        // 3. SAD EYELID ARCHES
        if (avatarEmotion === 'sad') {
          ctx.beginPath();
          ctx.strokeStyle = '#0c0b16';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          // downward sad droop curve
          ctx.moveTo(eyeX - 10 * side, eyeYOffset - 2);
          ctx.quadraticCurveTo(
            eyeX, eyeYOffset + 2,
            eyeX + 10 * side, eyeYOffset - 2
          );
          ctx.stroke();

          // crying pool
          ctx.save();
          ctx.beginPath();
          ctx.translate(eyeX, eyeYOffset + 4);
          ctx.arc(0, 0, 3.5, 0, Math.PI);
          ctx.fillStyle = '#22d3ee'; // cyber water shimmer
          ctx.fill();
          ctx.restore();
          return;
        }

        // 4. NATURAL BLINKING ratio handler
        const ratio = blinkRatioRef.current;
        if (ratio < 0.15) {
          ctx.beginPath();
          ctx.strokeStyle = '#0c0b16';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.moveTo(eyeX - 11 * side, eyeYOffset);
          ctx.lineTo(eyeX + 11 * side, eyeYOffset);
          ctx.stroke();
          return;
        }

        // 5. STANDARD OPEN HIGH-QUALITY IRIS
        ctx.save();
        ctx.beginPath();
        // Beautiful large, clear vertical anime oval eyes
        ctx.ellipse(eyeX, eyeYOffset, 10.5, 14.5 * ratio, 0, 0, Math.PI * 2);
        ctx.clip(); // Mask iris layers internally

        // Glowing backdrop iris gradient (Cyan neon cyber shade)
        let irisH1 = '#047857'; // base emerald
        let irisH2 = '#a7f3d0'; // glowing green
        
        if (liveState === 'listening') {
          irisH1 = '#be185d'; // base pink
          irisH2 = '#fbcfe8'; // soft lilac
        } else if (liveState === 'thinking') {
          irisH1 = '#6d28d9'; // deep violet
          irisH2 = '#ddd6fe'; // pale neon violet
        } else {
          irisH1 = '#0369a1'; // base blue cyber
          irisH2 = '#bae6fd'; // sky glow
        }

        // Complex 3-layer gradient
        const irisGrad = ctx.createLinearGradient(eyeX, eyeYOffset - 15, eyeX, eyeYOffset + 15);
        irisGrad.addColorStop(0, '#04020a'); // Dark edge obsidian occlusion
        irisGrad.addColorStop(0.4, irisH1);
        irisGrad.addColorStop(1, irisH2);
        ctx.fillStyle = irisGrad;
        ctx.fill();

        // Inner circular pupil detail (gaze direction tracking)
        const maxOffset = 3.2;
        const pupilX = eyeX + eyeTrackX * maxOffset;
        const pupilY = eyeYOffset + eyeTrackY * maxOffset;

        ctx.beginPath();
        ctx.ellipse(pupilX, pupilY, 5, 7.5 * ratio, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#080112'; // obsidian black core pupil
        ctx.fill();

        // Golden glowing neon circuit ring inside pupil
        ctx.beginPath();
        ctx.ellipse(pupilX, pupilY, 3, 4.5 * ratio, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Highlight stars / shiny glints (Main glint + Sub highlights)
        ctx.beginPath();
        // Dynamic glistening position offset
        ctx.arc(pupilX - 3.2, pupilY - 4 * ratio, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pupilX + 2.8, pupilY + 3.2 * ratio, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();

        ctx.restore(); // Exit clip masking

        // Thick anime upper eyeliner structure with mascara eyelashes
        ctx.strokeStyle = '#0c0b16';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeYOffset, 11, 15 * ratio, 0, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();

        // Cute winged eyeliner stroke
        ctx.beginPath();
        ctx.moveTo(eyeX + 10.2 * side, eyeYOffset - 4 * ratio);
        ctx.lineTo(eyeX + 13.5 * side, eyeYOffset - 6.5 * ratio);
        ctx.lineWidth = 2.4;
        ctx.stroke();
      };

      drawSingleIrisV3(-eyeXOffset, false);
      drawSingleIrisV3(eyeXOffset, true);

      ctx.restore();
    };

    const drawMouthAndNoseV3 = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      tiltX: number,
      tiltY: number,
      breathing: number,
      speakerAmp: number,
      time: number
    ) => {
      ctx.save();
      ctx.translate(cx + tiltX, cy + tiltY + breathing);

      // 1. Cute mature vector nose (Soft line and highlights)
      ctx.strokeStyle = 'rgba(190, 24, 74, 0.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-1, 3);
      ctx.quadraticCurveTo(-0.5, 4.5, 0.5, 4.5);
      ctx.stroke();

      // Sharp micro nose highlight
      ctx.beginPath();
      ctx.arc(-0.5, 2.5, 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();

      // Mouth baseline
      const mouthY = 19.5;

      // 2. Real-time pronunciation vowels and lip-sync open factor
      const speakOpen = Math.max(0, speakerAmp * 96);

      // SPEAKING VOICE ANIMATION shapes: Alternating vowel loops
      if (avatarEmotion === 'speaking') {
        const shapeCycle = time % 30;
        let mouthW = 10;
        let mouthH = 3.5 + speakOpen;

        if (shapeCycle < 8) {
          // 'A' open shape
          mouthW = 11.5;
          mouthH += 3.5;
        } else if (shapeCycle < 16) {
          // 'O' circular projection
          mouthW = 7;
          mouthH += 5;
        } else if (shapeCycle < 24) {
          // 'E' happy wide
          mouthW = 13;
          mouthH += 1.5;
        }

        ctx.save();
        ctx.translate(0, mouthY);

        // Clapped speech cavity
        ctx.beginPath();
        ctx.ellipse(0, 0, mouthW / 2, mouthH / 2, 0, 0, Math.PI * 2);
        ctx.clip();

        // Dark back throat
        ctx.fillStyle = '#650b28';
        ctx.fill();

        // Glossy tongue
        ctx.beginPath();
        ctx.ellipse(0, mouthH / 5, mouthW / 2.8, mouthH / 3.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#fda4af'; // warm coral tongue
        ctx.fill();

        // White upper teeth lining
        ctx.beginPath();
        ctx.rect(-mouthW / 2, -mouthH / 2, mouthW, mouthH / 4.5);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();

        // Upper/Lower Lip outlines
        ctx.strokeStyle = '#3b0617';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, mouthY, mouthW / 2, mouthH / 2, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Glossy lip glitter
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(2, mouthY + mouthH / 2.8, 1.2, 0.6, 0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
        ctx.restore();

      } else if (avatarEmotion === 'listening') {
        // Listening cute small 'o' shape
        ctx.beginPath();
        ctx.arc(0, mouthY + 1.5, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#9e0d3e'; 
        ctx.fill();
        ctx.strokeStyle = '#1d0b2e';
        ctx.lineWidth = 1.8;
        ctx.stroke();

      } else if (['happy', 'excited', 'celebrating'].includes(avatarEmotion)) {
        // Huge triangular joyful laugh mouth (Drawn with perfect coordinates)
        const mouthTopW = 11;
        const mouthDep = 8;
        ctx.save();
        ctx.translate(0, mouthY);
        ctx.beginPath();
        ctx.moveTo(-mouthTopW, -1);
        ctx.quadraticCurveTo(0, mouthDep, mouthTopW, -1);
        ctx.closePath();
        ctx.clip();

        // Dark red throat
        ctx.fillStyle = '#be123c';
        ctx.fill();

        // Cute tongue outline
        ctx.beginPath();
        ctx.arc(0, mouthDep - 3, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fecdd3';
        ctx.fill();

        ctx.restore();

        // Black outer eyeliner lip-edge
        ctx.beginPath();
        ctx.moveTo(-mouthTopW, mouthY - 1);
        ctx.quadraticCurveTo(0, mouthY + mouthDep, mouthTopW, mouthY - 1);
        ctx.closePath();
        ctx.strokeStyle = '#0d021c';
        ctx.lineWidth = 2;
        ctx.stroke();

      } else if (avatarEmotion === 'smile') {
        // Sweet curved lines with side corners
        ctx.beginPath();
        ctx.moveTo(-8.5, mouthY);
        ctx.quadraticCurveTo(0, mouthY + 4, 8.5, mouthY);
        ctx.strokeStyle = '#0d021c';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.stroke();

      } else if (avatarEmotion === 'sad') {
        // Downturned sad angle
        ctx.beginPath();
        ctx.moveTo(-7.5, mouthY + 3);
        ctx.quadraticCurveTo(0, mouthY - 0.5, 7.5, mouthY + 3);
        ctx.strokeStyle = '#0d021c';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

      } else if (avatarEmotion === 'confused') {
        // Cute wave squiggly mouth shape
        ctx.beginPath();
        ctx.moveTo(-7, mouthY + 1.5);
        ctx.bezierCurveTo(-3.5, mouthY - 1, 0, mouthY + 4, 7, mouthY + 1);
        ctx.strokeStyle = '#0d021c';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.stroke();

      } else if (avatarEmotion === 'curious') {
        // Playful tilted asymmetrical smirky curve
        ctx.beginPath();
        ctx.moveTo(-6, mouthY + 1.5);
        ctx.quadraticCurveTo(1.5, mouthY, 6, mouthY + 3);
        ctx.strokeStyle = '#0d021c';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

      } else {
        // MATURE IDLE Sweet light curve (always beautiful)
        ctx.beginPath();
        ctx.moveTo(-6.5, mouthY + 1.5);
        ctx.quadraticCurveTo(0, mouthY + 3.2, 6.5, mouthY + 1.5);
        ctx.strokeStyle = '#0c0b16';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawHairForeground = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      tiltX: number,
      tiltY: number,
      breathing: number,
      time: number
    ) => {
      ctx.save();
      // Foreground bangs are linked tightly to the head movement and breathing
      ctx.translate(cx + tiltX, cy + tiltY + breathing);

      // Iridescent futuristic hair gradients
      const mainHairG = ctx.createLinearGradient(0, -50, 0, 40);
      mainHairG.addColorStop(0, '#2d0a4e'); // rich space purple
      mainHairG.addColorStop(0.5, '#4c1d95'); // majestic violet
      mainHairG.addColorStop(1, '#db2777'); // vibrant glowing magenta tips

      ctx.fillStyle = mainHairG;
      ctx.strokeStyle = '#0c0211';
      ctx.lineWidth = 2.2;

      const hairSway = Math.sin(time * 0.038) * 1.4;

      // 1. BACK TO FOREGROUND COLLATERAL BANGS
      // Left cheek long strand bang
      ctx.beginPath();
      ctx.moveTo(-41, -26);
      ctx.bezierCurveTo(-41 + hairSway, -12, -38 + hairSway, 7, -31 + hairSway, 17);
      ctx.lineTo(-27 + hairSway, 11);
      ctx.bezierCurveTo(-32 + hairSway, 2, -35 + hairSway, -11, -35, -26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right cheek long strand bang
      ctx.beginPath();
      ctx.moveTo(41, -26);
      ctx.bezierCurveTo(41 - hairSway, -12, 38 - hairSway, 7, 31 - hairSway, 17);
      ctx.lineTo(27 - hairSway, 11);
      ctx.bezierCurveTo(32 - hairSway, 2, 35 - hairSway, -11, 35, -26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 2. LAYERED FRONT FOREHEAD BANG STRANDS
      // Center Lock Strand Left
      ctx.beginPath();
      ctx.moveTo(-18, -36);
      ctx.quadraticCurveTo(-14 + hairSway, -14, -10 + hairSway, 3);
      ctx.quadraticCurveTo(-6 + hairSway, -14, -5, -36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center Lock Strand Right
      ctx.beginPath();
      ctx.moveTo(-4, -36);
      ctx.quadraticCurveTo(3 + hairSway, -12, 8 + hairSway, 5);
      ctx.quadraticCurveTo(10 + hairSway, -14, 13, -36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Side Left forehead fringe
      ctx.beginPath();
      ctx.moveTo(-31, -32);
      ctx.quadraticCurveTo(-25 + hairSway, -16, -21 + hairSway, -3);
      ctx.quadraticCurveTo(-20, -14, -18, -34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Side Right forehead fringe
      ctx.beginPath();
      ctx.moveTo(31, -32);
      ctx.quadraticCurveTo(25 - hairSway, -16, 21 - hairSway, -3);
      ctx.quadraticCurveTo(20, -14, 18, -34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. Cyber Barrette / Hairpin (Asymmetric circuit design)
      ctx.fillStyle = '#10b981'; // emerald green matrix neon
      ctx.fillRect(-29, -28, 7, 2.5);
      ctx.fillStyle = '#06b6d4'; // cyan barrette right
      ctx.fillRect(22, -29, 6, 2.5);

      // Specular High-Gloss Hair Reflection Shimmer (Cyber gloss ring)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, -23, 26, 3, 0.05, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Gloss shine reflection
      ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    const drawHelloHandWave = (ctx: CanvasRenderingContext2D, cx: number, cy: number, breathing: number, time: number) => {
      if (avatarEmotion !== 'hello') return;

      ctx.save();
      const wave = Math.sin(time * 0.28) * 0.38; // fast cute waving rotations
      ctx.translate(cx + 46, cy + breathing + 36);
      
      // Arm rotation
      ctx.rotate(-0.75 + wave);

      // Cyber Skin sleeve Mitten
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-4, -40);
      ctx.bezierCurveTo(-4, -52, 12, -52, 12, -40); // Hand curves
      ctx.lineTo(8, -25);
      ctx.bezierCurveTo(16, -23, 14, -10, 8, 0); // cute details
      ctx.closePath();
      ctx.fillStyle = '#fff1f2'; // Peach matching her facial glow
      ctx.fill();

      // Black outlines
      ctx.strokeStyle = '#0c0b16';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Waving motion air arcs (cyber HUD line signals)
      ctx.strokeStyle = 'rgba(34,211,238,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(4, -48, 6, Math.PI * 1.5, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(4, -48, 12, Math.PI * 1.5, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    const spawnParticlesV3 = () => {
      const time = timeRef.current;
      const rate = 12; // spawn density threshold

      if (time % rate === 0) {
        let spawnNumber = 0;
        let type: Particle['type'] = 'cyber';
        let color = '#22d3ee'; // standard cyan

        if (avatarEmotion === 'happy' || avatarEmotion === 'smile') {
          spawnNumber = 1;
          type = 'heart';
          color = `rgba(236, 72, 153, ${0.42 + Math.random() * 0.58})`; // luscious pink
        } else if (avatarEmotion === 'excited' || avatarEmotion === 'celebrating') {
          spawnNumber = 3;
          type = 'confetti';
          const colors = ['#f472b6', '#34d399', '#38bdf8', '#fbbf24', '#c084fc'];
          color = colors[Math.floor(Math.random() * colors.length)];
        } else if (avatarEmotion === 'sad') {
          spawnNumber = 1;
          type = 'teardrop';
          color = 'rgba(56, 189, 248, 0.75)';
        } else if (avatarEmotion === 'dance') {
          spawnNumber = 1;
          type = 'note';
          const notes = ['#a78bfa', '#f472b6', '#38bdf8'];
          color = notes[Math.floor(Math.random() * notes.length)];
        } else if (avatarEmotion === 'thinking' || avatarEmotion === 'curious') {
          spawnNumber = 1;
          type = 'cyber';
          color = 'rgba(168, 85, 247, 0.65)'; // Violet cyber particles
        }

        for (let i = 0; i < spawnNumber; i++) {
          let rx = dimensions.width / 2 + (Math.random() * 90 - 45);
          let ry = dimensions.height / 2 + (Math.random() * 50 - 25);

          if (type === 'teardrop') {
            const sideOffset = Math.random() > 0.5 ? 21.5 : -21.5;
            rx = dimensions.width / 2 + sideOffset + (Math.random() * 3 - 1.5);
            ry = dimensions.height / 2 + 10;
          }

          particlesRef.current.push({
            id: 'v3_pt_' + Math.random().toString(36).substring(2, 7),
            x: rx,
            y: ry,
            vx: type === 'confetti' ? (Math.random() * 4.4 - 2.2) : (Math.random() * 1.8 - 0.9),
            vy: type === 'teardrop' ? (1.5 + Math.random() * 1.5) : (-1.2 - Math.random() * 1.2),
            size: type === 'confetti' ? (5 + Math.random() * 4) : (type === 'note' ? 12 : 4 + Math.random() * 5),
            color,
            alpha: 1,
            life: 0,
            maxLife: type === 'confetti' ? 120 : (type === 'teardrop' ? 65 : 75),
            type,
            rotation: Math.random() * Math.PI,
            rotationSpeed: Math.random() * 0.08 - 0.04
          });
        }
      }
    };

    const drawParticlesV3 = (ctx: CanvasRenderingContext2D) => {
      const list = particlesRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life++;
        
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = 1 - p.life / p.maxLife;

        if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
          p.rotation += p.rotationSpeed;
        }

        if (p.life >= p.maxLife || p.alpha <= 0) {
          list.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (p.type === 'heart') {
          ctx.beginPath();
          ctx.translate(p.x, p.y);
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-p.size / 2, -p.size / 2, -p.size, p.size / 3, 0, p.size);
          ctx.bezierCurveTo(p.size, p.size / 3, p.size / 2, -p.size / 2, 0, 0);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else if (p.type === 'star' || p.type === 'cyber') {
          ctx.beginPath();
          ctx.translate(p.x, p.y);
          // Holographic digital crosshairs
          ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0);
          ctx.moveTo(0, -p.size); ctx.lineTo(0, p.size);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (p.type === 'teardrop') {
          ctx.beginPath();
          ctx.translate(p.x, p.y);
          ctx.arc(0, 0, p.size / 2.2, 0, Math.PI);
          ctx.lineTo(0, -p.size);
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.fill();
        } else if (p.type === 'note') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation || 0);
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = p.color;
          ctx.fillText(Math.random() > 0.5 ? '🎵' : '🎶', 0, 0);
        } else if (p.type === 'confetti') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation || 0);
          ctx.fillStyle = p.color;
          if (p.life % 4 === 0) {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }
    };

    // The core 60 FPS AAA animation render loop
    const render = () => {
      timeRef.current += 1;
      const time = timeRef.current;

      // 1. Calculations: Dynamic Breathing wave & Asymmetric Bobbing
      // Even when idle, Roy Girl is breathes seamlessly
      const breathingFactor = (avatarEmotion === 'dance') ? 0.08 : 0.034;
      const breathingAmp = (avatarEmotion === 'dance') ? 9 : 3.8;
      const breathingOffset = Math.sin(time * breathingFactor) * breathingAmp;

      let tiltX = 0;
      let tiltY = 0;

      if (avatarEmotion === 'thinking') {
        tiltX = -5.5;
        tiltY = -2;
      } else if (avatarEmotion === 'confused' || avatarEmotion === 'curious') {
        tiltX = 4.5;
        tiltY = 2.5; // Sweet tilt of curiosity
      } else if (avatarEmotion === 'sad') {
        tiltY = 5; // Drooping head
      } else if (avatarEmotion === 'dance') {
        // AAA style dynamic lateral disco bobbing loop
        tiltX = Math.sin(time * 0.11) * 16.5;
        tiltY = Math.abs(Math.cos(time * 0.11)) * 5 - 3;
      } else if (avatarEmotion === 'speaking') {
        tiltY = Math.sin(time * 0.075) * 1.5;
      } else {
        // Natural ambient sway so she is NEVER frozen
        tiltX = Math.sin(time * 0.015) * 2;
        tiltY = Math.cos(time * 0.02) * 1.2;
      }

      // Smooth mouse tracking interpolation
      const mouse = mouseRef.current;
      const trackLag = 0.082;
      mouse.x += (mouse.targetX - mouse.x) * trackLag;
      mouse.y += (mouse.targetY - mouse.y) * trackLag;

      const eyeTrackX = mouse.x;
      const eyeTrackY = mouse.y;

      // 2. Beautiful Natural Blinking Cycle
      blinkTimerRef.current += 1;
      if (!isBlinkingRef.current && blinkTimerRef.current > 160 + Math.random() * 240) {
        isBlinkingRef.current = true;
        blinkTimerRef.current = 0;
      }

      if (isBlinkingRef.current) {
        if (blinkRatioRef.current > 0.04) {
          blinkRatioRef.current -= 0.28; // rapid eye shut
        } else {
          isBlinkingRef.current = false; // fully closed - immediate recovery
        }
      } else {
        if (blinkRatioRef.current < 1) {
          blinkRatioRef.current += 0.22; // smooth eye opening
          if (blinkRatioRef.current > 1) blinkRatioRef.current = 1;
        }
      }

      // 3. Clear canvas viewport safely
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2 - 4;

      // 4. Background strobe pulses and HUD tracking rings
      if (avatarEmotion === 'dance') {
        ctx.save();
        const partyGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, dimensions.width / 1.1);
        partyGrad.addColorStop(0, `hsla(${(time * 3) % 360}, 50%, 8%, 0.55)`);
        partyGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = partyGrad;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        ctx.restore();
      }

      // Draw cyber HUD grids
      drawHolographicHUD(ctx, cx, cy, time);

      // Realtime Audio Volume smoothing for Pronunciation Mouth shape
      lastSpeakerAmp.current = lastSpeakerAmp.current * 0.72 + voiceEngine.speakerAmplitude * 0.28;

      // 5. Draw Layer Stacks
      drawLowerHairLayer(ctx, cx, cy, tiltX, tiltY, breathingOffset, time);
      drawHeadAndStructure(ctx, cx, cy, tiltX, tiltY, breathingOffset, time);
      drawEyesV3(ctx, cx, cy, tiltX, tiltY, breathingOffset, eyeTrackX, eyeTrackY, time);
      drawMouthAndNoseV3(ctx, cx, cy, tiltX, tiltY, breathingOffset, lastSpeakerAmp.current, time);
      drawHairForeground(ctx, cx, cy, tiltX, tiltY, breathingOffset, time);
      drawHelloHandWave(ctx, cx, cy, breathingOffset, time);

      // AAA micro interactive particles
      spawnParticlesV3();
      drawParticlesV3(ctx);

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [dimensions, avatarEmotion, liveState]);

  return (
    <div className="flex flex-col items-center justify-center select-none" ref={containerRef}>
      <div
        id="avatar_clickable_container"
        className="relative flex items-center justify-center cursor-pointer group"
        onClick={onClick}
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
      >
        {/* Glowing cyber optic ring with customized states */}
        <div
          className={`absolute inset-1 rounded-full border border-dashed transition-all duration-700 pointer-events-none ${
            liveState === 'offline' ? 'border-zinc-800 scale-95 opacity-40' :
            liveState === 'connecting' ? 'border-amber-500 animate-[spin_30s_linear_infinite] opacity-70' :
            liveState === 'listening' ? 'border-pink-500 scale-102 animate-[spin_10s_linear_infinite] shadow-[0_0_20px_rgba(236,72,153,0.35)]' :
            liveState === 'thinking' ? 'border-purple-400 scale-104 animate-[spin_6s_linear_infinite] opacity-90' :
            liveState === 'speaking' ? 'border-emerald-400 scale-102 animate-[spin_14s_linear_infinite] shadow-[0_0_25px_rgba(16,185,129,0.35)]' :
            'border-cyan-500 animate-[spin_20s_linear_infinite] opacity-80'
          }`}
        />

        {/* Outer radial core pulse glow frame */}
        <div className="absolute inset-4 rounded-full bg-zinc-950/40 border border-zinc-900/50 backdrop-blur-3xl overflow-hidden shadow-2xl">
          {liveState === 'offline' ? (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(63,63,70,0.12),transparent_70%)]" />
          ) : liveState === 'listening' ? (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.18),transparent_70%)] animate-pulse" />
          ) : liveState === 'thinking' ? (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.16),transparent_70%)] animate-pulse" />
          ) : liveState === 'speaking' ? (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_70%)] animate-[pulse_1.2s_infinite]" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.15),transparent_70%)]" />
          )}

          {/* HTML5 high resolution drawing viewport */}
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full block relative z-10"
          />
        </div>

        {/* Digital tracking system tag displaying active expression matrix info */}
        <div className="absolute -bottom-1 text-center bg-zinc-900/95 border border-zinc-800/80 px-3 py-1 rounded-full text-[9px] font-mono tracking-widest font-black uppercase text-zinc-400 shadow-md backdrop-blur-md flex items-center gap-1.5 z-20 group-hover:border-indigo-500/35 transition-colors">
          {liveState === 'offline' && <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
          {liveState === 'connecting' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
          {liveState === 'thinking' && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />}
          {liveState === 'listening' && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />}
          {liveState === 'speaking' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          {liveState === 'ready' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
          
          <span className="text-[8px]">
            {avatarEmotion === 'dance' ? '🕺 DANCING V3' :
             avatarEmotion === 'hello' ? '👋 HELLO BOSS' :
             avatarEmotion === 'smile' ? '😊 SMILING V3' :
             avatarEmotion === 'happy' ? '💖 HAPPY STREAK' :
             avatarEmotion === 'sad' ? '💧 TEARS V3' :
             avatarEmotion === 'confused' ? '❓ CONFUSED' :
             avatarEmotion === 'curious' ? '✨ CURIOUS V3' :
             liveState === 'offline' ? 'OFFLINE' :
             liveState === 'connecting' ? 'SYNC...' :
             liveState === 'listening' ? 'LISTENING' :
             liveState === 'thinking' ? 'THINKING' :
             liveState === 'speaking' ? 'SPEAKING' :
             'ROY GIRL V3 ACTIVE'}
          </span>
        </div>
      </div>

      {/* State subtitle status prompt */}
      <div className="mt-4 text-center">
        {liveState === 'offline' && (
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
            TAP SECURE CORE TO INITIALIZE DATA STREAM
          </p>
        )}
      </div>
    </div>
  );
}

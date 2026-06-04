import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
  Eye, X, ShieldAlert, ShieldCheck, Check, Info, Scan, Play, AlertTriangle, HelpCircle, RefreshCw, Send, Volume2, ShieldQuestion, HelpCircle as HelpIcon, Sparkles, Monitor
} from 'lucide-react';

interface HighlightItem {
  id: string;
  rect: DOMRect;
  label: string;
  color: string;
  category: 'button' | 'input' | 'error';
}

export default function ScreenAwareness() {
  const store = useAppStore();
  const [isActive, setIsActive] = useState(false);
  const [permissionState, setPermissionState] = useState<'unknown' | 'prompt' | 'granted' | 'denied'>('prompt');
  const [isScanning, setIsScanning] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  
  // Detected elements arrays
  const [buttons, setButtons] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [screenPreview, setScreenPreview] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState<string>('');
  const [activeTabLabel, setActiveTabLabel] = useState<string>('Home Voice Orb');
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'buttons' | 'forms' | 'errors'>('all');
  const [showVisualGuidance, setShowVisualGuidance] = useState(true);

  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setDiagnosticLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // 1. Initial listener for incoming triggers (spoken voice command or UI click)
  useEffect(() => {
    const handleTrigger = (e: any) => {
      console.log('SCREEN_AWARENESS: Trigger heard. Opening HUD panel...');
      setIsActive(true);
      
      const payload = e.detail || {};
      const toolCallName = payload.name;
      const toolCallId = payload.id;
      
      addLog('VOICE EVENT: "Roy screen dekho" activated.');
      
      // Automatic start analysis sequence
      startAnalysisSequence(toolCallName, toolCallId);
    };

    window.addEventListener('screen-awareness-trigger', handleTrigger);
    return () => window.removeEventListener('screen-awareness-trigger', handleTrigger);
  }, [permissionState]);

  // Handle active viewport tag name when DOM elements load or active tab changes
  useEffect(() => {
    if (isActive) {
      scanActiveDOM();
    }
  }, [isActive]);

  const scanActiveDOM = () => {
    const activeSection = document.querySelector('main');
    addLog('SCANNING: Analysing active Document Object Model tags...');

    // A. Detect buttons
    const btnElements = Array.from(document.querySelectorAll('button, [role="button"], a.btn, input[type="button"], input[type="submit"]')) as HTMLElement[];
    const parsedButtons = btnElements
      .map((el, idx) => {
        const rect = el.getBoundingClientRect();
        // Skip hidden elements or empty frames
        if (rect.width === 0 || rect.height === 0 || el.closest('[data-no-screen-scan="true"]')) return null;
        
        const label = (el.innerText || el.getAttribute('title') || el.ariaLabel || el.id || `Button ${idx + 1}`).trim();
        return {
          id: `btn-${idx}`,
          label: label.substring(0, 45) || 'Unnamed Action Control',
          tag: el.tagName.toLowerCase(),
          rect,
          element: el
        };
      })
      .filter(Boolean) as any[];

    // B. Detect input forms
    const inputElements = Array.from(document.querySelectorAll('input, select, textarea')) as HTMLInputElement[];
    const parsedInputs = inputElements
      .map((el, idx) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || el.closest('[data-no-screen-scan="true"]')) return null;
        
        // Skip hidden types
        if (el.type === 'hidden') return null;

        const placeholder = (el.placeholder || el.name || el.id || `Field ${idx + 1}`).trim();
        const labelText = document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() || '';
        
        return {
          id: `input-${idx}`,
          label: (labelText ? `${labelText} (${placeholder})` : placeholder).substring(0, 45),
          type: el.type || 'text',
          rect,
          element: el
        };
      })
      .filter(Boolean) as any[];

    // C. Detect errors & status flags
    const parsedErrors: any[] = [];
    
    // Check connection states
    if (store.connectionError) {
      parsedErrors.push({
        id: 'error-conn',
        label: `Active Pipeline Drop: ${store.connectionError}`,
        rect: { left: window.innerWidth / 2 - 150, top: 200, width: 300, height: 60 } as DOMRect,
        element: null
      });
    }

    // Check for red borders or error texts in DOM tree
    const errElements = Array.from(document.querySelectorAll('.border-red-500, .text-rose-500, .text-red-500, [role="alert"]')) as HTMLElement[];
    errElements.forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        parsedErrors.push({
          id: `dom-err-${idx}`,
          label: (el.innerText || 'Validation outline exception detected').trim().substring(0, 85),
          rect,
          element: el
        });
      }
    });

    // Case fallback leaf leaf node warning texts scan
    const blocks = Array.from(document.querySelectorAll('p, span, div')) as HTMLElement[];
    blocks.forEach((el, idx) => {
      if (el.children.length === 0 && el.getBoundingClientRect().width > 0) {
        const txt = el.innerText.toLowerCase();
        if (txt.includes('error') || txt.includes('failed') || txt.includes('denied') || txt.includes('invalid') || txt.includes('missing')) {
          parsedErrors.push({
            id: `text-err-${idx}`,
            label: `DOM Warning: "${el.innerText.trim().substring(0, 70)}"`,
            rect: el.getBoundingClientRect(),
            element: el
          });
        }
      }
    });

    setButtons(parsedButtons);
    setForms(parsedInputs);
    setErrors(parsedErrors);

    // D. Compute bounding rect absolute highlight targets (Visual Guidance overlay)
    const lists: HighlightItem[] = [
      ...parsedButtons.map(b => ({ id: b.id, rect: b.rect, label: b.label, color: 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)] bg-cyan-450/5', category: 'button' as const })),
      ...parsedInputs.map(i => ({ id: i.id, rect: i.rect, label: i.label, color: 'border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.6)] bg-pink-500/5', category: 'input' as const })),
      ...parsedErrors.map(e => ({ id: e.id, rect: e.rect, label: e.label, color: 'border-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] bg-rose-500/10 border-[2.5px]', category: 'error' as const }))
    ];

    setHighlights(lists);
    addLog(`COMPLETED: Captured ${parsedButtons.length} buttons, ${parsedInputs.length} fields, and ${parsedErrors.length} alert targets.`);
  };

  // Re-evaluate client screenshot stream via standard Canvas Grab
  const grabDisplayScreenshot = async (): Promise<string | null> => {
    try {
      addLog('MEDIA: Initiating getDisplayMedia raw video stream capture...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false
      });
      
      const track = stream.getVideoTracks()[0];
      const ImageCaptureConstructor = (window as any).ImageCapture;
      let dataUrl: string | null = null;

      if (ImageCaptureConstructor) {
        // High fidelity ImageCapture API
        const imageCapture = new ImageCaptureConstructor(track);
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(bitmap, 0, 0);
        dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      } else {
        // Fallback video frames sampling
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve);
          };
        });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 960;
        canvas.height = video.videoHeight || 540;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      }

      // Cleanup tracks cleanly inside workspace
      stream.getTracks().forEach(t => t.stop());
      setPermissionState('granted');
      addLog('SUCCESS: Raw screen buffer frame saved to local memory.');
      return dataUrl;

    } catch (e: any) {
      console.warn('Screen Display Capture rejected or unavailable:', e);
      addLog(`FALLBACK: Display media rejected (${e.message || 'BLOCKED'}); falling back to DOM Semantic matrix.`);
      setPermissionState('denied');
      return null;
    }
  };

  // Start analysis trigger pipeline
  const startAnalysisSequence = async (toolCallName?: string, toolCallId?: string) => {
    if (isScanning) return;
    setIsScanning(true);
    setAnalysisText('');
    store.setAvatarEmotion('thinking');

    addLog('MATRIX: Initializing core screen inspection lifecycle...');

    // 1. Scan direct live bounding rect coordinates of DOM
    scanActiveDOM();

    // 2. Play digital scanning grid for 1.8 seconds & evaluate captured thumbnail
    let base64Img: string | null = null;
    if (permissionState === 'granted' || permissionState === 'unknown') {
      base64Img = await grabDisplayScreenshot();
      if (base64Img) setScreenPreview(base64Img);
    } else {
      // Prompt first or use static frame mockup
      addLog('PERMISSION: Requesting explicit user approval for viewport scan.');
    }

    // Delay to simulate elite neural decryption
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Compile local diagnostic summary mock as assistant's insight
    const currentActiveTabLabel = document.title || 'Roy Girl AI Assistant';
    let outputDescription = '';

    const hasApiKey = !!store.apiKey;
    const hasTelegram = !!store.isSecretUnlocked;
    
    // Synthesize extremely cool explanation
    if (errors.length > 0) {
      store.setAvatarEmotion('confused');
      outputDescription = `Rishu Boss, maine screen inspect ki hai aur mujhe yahan kuch warnings ya issues mile hain. Dashboard par connection exceptions dikh rahe hain. Chinta mat kijiye, main help karti hoon! Settings panel par jaakar verify kijiye ki correct server keys loaded hain ya nahi. Main ready khadi hoon!`;
    } else if (forms.length > 0) {
      store.setAvatarEmotion('curious');
      outputDescription = `Ji Rishu Boss! Screen par mujhe inputs aur forms dikh rahe hain. Aap yahan config details fill kar sakte hain. Screen highlight active hai, aur inputs par pink glowing border bana diya hai taaki aap easily navigate kar sakein.`;
    } else {
      store.setAvatarEmotion('happy');
      outputDescription = `Roy screen dekh rahi hai, Rishu Boss! Sab kuch absolutely perfect lag raha hai. Visible area me mujhe action buttons aur voice-orb dashboard controls perfectly arrange hote huye dikh rahe hain. Red, cyan aur pink lines se screen ke dynamic layers transparent ho chuke hain! Let's conquer our targets!`;
    }

    setAnalysisText(outputDescription);
    setIsScanning(false);
    store.setAvatarEmotion('speaking');

    // 3. Dispatch feedback completed event back to the WebSocket in App.tsx
    if (toolCallName && toolCallId) {
      const summaryPayload = {
        name: toolCallName,
        id: toolCallId,
        response: {
          success: true,
          activeTab: currentActiveTabLabel,
          detectedButtonsCount: buttons.length,
          detectedInputsCount: forms.length,
          errorsDetectedCount: errors.length,
          detailsSummary: outputDescription,
          buttonsList: buttons.map(b => b.label),
          inputsList: forms.map(f => f.label),
          warningsList: errors.map(e => e.label)
        }
      };

      addLog('PIPELINE: Streaming toolCall response packets to Gemini...');
      window.dispatchEvent(new CustomEvent('screen-analysis-complete', { detail: summaryPayload }));
    }
  };

  const handleGrantPermission = async () => {
    const dataUrl = await grabDisplayScreenshot();
    if (dataUrl) {
      setScreenPreview(dataUrl);
      setPermissionState('granted');
    } else {
      setPermissionState('denied');
    }
    // Re-run
    startAnalysisSequence();
  };

  const forceManualScan = () => {
    startAnalysisSequence();
  };

  const highlightElementOnPage = (el: HTMLElement) => {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Bouncing neon grid highlight class injection
    el.classList.add('ring-4', 'ring-pink-500', 'ring-offset-2', 'ring-offset-zinc-950', 'animate-pulse');
    setTimeout(() => {
      el.classList.remove('ring-4', 'ring-pink-500', 'ring-offset-2', 'ring-offset-zinc-950', 'animate-pulse');
    }, 2800);

    addLog(`GRID_GUIDE: Highlighted target element on viewport.`);
  };

  // Close HUD panel
  const handleCloseHUD = () => {
    setIsActive(false);
    setHighlights([]);
  };

  return null;
}

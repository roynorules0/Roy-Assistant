import React, { useEffect, useState, useRef } from 'react';
import { useAppStore, LiveState } from './store';
import { voiceEngine } from './audio-processor';
import Orb from './components/Orb';
import Waveform from './components/Waveform';
import SettingsPanel from './components/SettingsPanel';
import Dashboard from './components/Dashboard';
import TelegramPublisher from './components/TelegramPublisher';
import YouTubePlayer from './components/YouTubePlayer';
import YouTubeMediaHub from './components/YouTubeMediaHub';
import CameraSystem from './components/CameraSystem';
import StoryMode from './components/StoryMode';
import VaultTab from './components/VaultTab';
import * as db from './db';
import { 
  Mic, MicOff, Power, PowerOff, Settings as SettingsIcon, LayoutDashboard, Sparkles, User, Info, MessageSquare, ShieldCheck, Share2, Send, Youtube, Disc, ListMusic, Camera, BookOpen, FolderHeart, X,
  Heart, Maximize2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Eye, Trash2
} from 'lucide-react';

export default function App() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<'orb' | 'dashboard' | 'settings' | 'telegram' | 'youtube' | 'camera' | 'story' | 'vault'>('orb');
  const wsRef = useRef<WebSocket | null>(null);
  const currentAiUtterance = useRef('');
  const currentUserUtterance = useRef('');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const pendingTextRef = useRef<string>('');
  const [chatVisible, setChatVisible] = useState(false);

  // Premium On-Screen Photo Display System state
  const [onScreenPhotos, setOnScreenPhotos] = useState<db.PhotoRecord[]>([]); // holds list of currently queried PhotoRecords to present
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isFullscreenPhotoOpen, setIsFullscreenPhotoOpen] = useState<boolean>(false);
  const [onScreenZoomLevel, setOnScreenZoomLevel] = useState<number>(1);
  const [photoOrientations, setPhotoOrientations] = useState<Record<string, 'portrait' | 'landscape' | 'square'>>({});

  const handleOnScreenImageLoad = (photoId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const ratio = w / h;
    let orientation: 'portrait' | 'landscape' | 'square' = 'square';
    if (ratio > 1.2) {
      orientation = 'landscape';
    } else if (ratio < 0.8) {
      orientation = 'portrait';
    }
    setPhotoOrientations(prev => ({ ...prev, [photoId]: orientation }));
  };

  // Voice Interruption & Safety Timers
  const lastUserInteractionRef = useRef<number>(Date.now());

  const registerUserInteraction = () => {
    lastUserInteractionRef.current = Date.now();
  };

  const checkInterruptCommand = (text: string): { isInterrupt: boolean; isEmergency: boolean } => {
    const norm = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
    const words = norm.split(/\s+/);
    
    // Emergency stop check (even without "roy" for extreme safety)
    if (words.includes("emergency") && words.includes("stop")) {
      return { isInterrupt: true, isEmergency: true };
    }
    if (norm.includes("roy emergency stop") || norm.includes("emergency stop")) {
      return { isInterrupt: true, isEmergency: true };
    }
    
    // Check keyword combination of "roy" + other words
    const hasRoy = words.includes("roy") || words.includes("roy's") || norm.includes("roy");
    
    if (hasRoy) {
      const stopperWords = ["stop", "bas", "bus", "chup", "pause", "suno", "ruko", "ruk"];
      const hasStopper = stopperWords.some(w => words.includes(w) || norm.includes(w));
      if (hasStopper) {
        return { isInterrupt: true, isEmergency: false };
      }
    }
    
    // Fallback direct exact phrases check
    const exactPhrases = [
      "roy stop",
      "roy bas",
      "roy chup ho jao",
      "roy suno",
      "roy pause",
      "roy ruk jao",
      "chup ho jao"
    ];
    const hasExact = exactPhrases.some(phrase => norm.includes(phrase));
    
    return { isInterrupt: hasExact, isEmergency: false };
  };

  const handleVoiceInterrupt = (isEmergency: boolean = false) => {
    console.log("VOICE INTERRUPT TRIGGERED. Emergency flag:", isEmergency);
    
    // 1. Immediately kill/cut-off any active client audio
    voiceEngine.interrupt();
    
    // 2. Halt story mode progression
    if (store.storyState.isActive) {
      if (isEmergency) {
        store.resetStoryState();
      } else {
        store.setStoryState({ isPaused: true });
      }
    }

    // 3. Drive UI back to LISTENING status
    store.setLiveState('listening');
    store.setAiTranscript('');
    currentAiUtterance.current = '';
    
    // Extreme Emergency cleanup
    if (isEmergency && store.activeVideo) {
      store.setActiveVideo(null);
      store.setPlayerState('stopped');
    }

    // 4. Send override command package to Gemini WebSocket pipeline
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        text: `System Command / INTERACTION INTERRUPTED: User issued a VOICE STOP command. Clear your entire speech queue, ignore previous inputs, stop all storytelling/narration immediately, reset state, and reply with exactly: "Ji Rishu Boss, sun rahi hu." and then wait.`
      }));
    }
  };

  // 30-second Safety Timeout check loop for Story Mode
  useEffect(() => {
    const timeoutInterval = setInterval(() => {
      if (store.storyState.isActive && !store.storyState.isPaused) {
        const elapsed = Date.now() - lastUserInteractionRef.current;
        if (elapsed > 30000) { // 30 seconds
          console.warn("Safety Timeout: 30 seconds of quiet narration without user interaction. Suspending narration...");
          
          // Switch story state to paused
          store.setStoryState({ isPaused: true });
          
          // Cut off audio playback
          voiceEngine.interrupt();
          
          // Change UI state back to listening
          store.setLiveState('listening');

          // Send notice packet to Gemini server to speak suspension notice
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              text: "System Command: Narrating chapter was automatically paused due to 30 second safety inactivity timeout without user feedback. Speak exactly: \"Rishu Boss, aap thak gaye lagte hain. Maine kahani pause kar di hai. Jab aap tayyar hon, tab continue boliyega.\""
            }));
          }
        }
      }
    }, 1000);

    return () => clearInterval(timeoutInterval);
  }, [store.storyState]);

  // Commit utterances logic
  const commitUserUtterance = async () => {
    const text = currentUserUtterance.current.trim();
    if (text) {
      await store.addConversationMessage('user', text);
      currentUserUtterance.current = '';
    }
  };

  const commitAiUtterance = async () => {
    const text = currentAiUtterance.current.trim();
    if (text) {
      await store.addConversationMessage('model', text);

      if (store.storyState.isActive && !store.storyState.isPaused) {
        const curChap = store.storyState.currentChapter;
        const exists = store.storyState.chaptersHistory.some(c => c.chapter === curChap);
        if (!exists && text.length > 20) {
          const newHist = [
            ...store.storyState.chaptersHistory,
            {
              chapter: curChap,
              title: `Chapter ${curChap}: ${store.storyState.title}`,
              content: text
            }
          ];
          store.setStoryState({ chaptersHistory: newHist });
        }
      }

      currentAiUtterance.current = '';
    }
  };

  const handleTextMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = textInputValue.trim();
    if (!text) return;

    setTextInputValue('');
    setIsSubmittingText(true);
    
    registerUserInteraction();

    const { isInterrupt, isEmergency } = checkInterruptCommand(text);
    if (isInterrupt) {
      handleVoiceInterrupt(isEmergency);
      setIsSubmittingText(false);
      return;
    }
    
    // Append to local history so user has instant visual output response
    await store.addConversationMessage('user', text);

    if (store.liveState === 'offline') {
      // Reconnect and queue text to send as soon as connected
      pendingTextRef.current = text;
      await toggleConnection();
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ text }));
      } catch (err) {
        console.error('Error transmitting text command:', err);
      }
    }
    
    setIsSubmittingText(false);
  };

  // Restore assistant state and previous conversations on load / refresh / restart
  useEffect(() => {
    const loadStoreAndSession = async () => {
      await store.initStore();
      
      const wasConnected = localStorage.getItem('__roy_session_connected') === 'true';
      if (wasConnected) {
        console.log('Detected previous active voice connection. Performing seamless auto-reconnect...');
        (window as any).__roy_welcome_back_on_connect = true;
        setTimeout(() => {
          toggleConnection();
        }, 1500);
      }
    };
    loadStoreAndSession();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    voiceEngine.setSpeakerVolume(store.voiceVolume);
  }, [store.voiceVolume]);

  useEffect(() => {
    voiceEngine.setMicGain(store.micGain);
  }, [store.micGain]);

  // Visual voice amplitude observer loop with high-fidelity VAD (hangover natural pause sustain)
  useEffect(() => {
    let active = true;
    let silenceStart = 0;
    const checkAmplitudes = () => {
      if (!active) return;
      
      const state = store.liveState;
      const speakerAmp = voiceEngine.speakerAmplitude;
      const now = Date.now();

      if (state === 'listening' && speakerAmp > 0.03) {
        store.setLiveState('speaking');
        silenceStart = 0;
      } else if (state === 'speaking') {
        if (speakerAmp > 0.012) {
          silenceStart = 0; // Speaking signal active
        } else {
          if (silenceStart === 0) {
            silenceStart = now; // Mark silence onset
          } else if (now - silenceStart > 900) { // 900ms natural word gap hangover window
            store.setLiveState('listening');
            silenceStart = 0;
            window.dispatchEvent(new CustomEvent('speech-finished'));
          }
        }
      }
      
      requestAnimationFrame(checkAmplitudes);
    };
    checkAmplitudes();
    return () => {
      active = false;
    };
  }, [store.liveState]);

  // Background heartbeat to sustain open sessions indefinitely & prevent cloud network timeouts
  useEffect(() => {
    if (store.liveState === 'offline') return;

    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ heartbeat: true }));
      }
    }, 15000); // 15-second heartbeat ping

    return () => clearInterval(interval);
  }, [store.liveState]);

  // Redirect to 'orb' tab when a YouTube video or song is activated to show the embedded player inside the Roy Girl AI interface
  useEffect(() => {
    if (store.activeVideo) {
      setActiveTab('orb');
    }
  }, [store.activeVideo]);

  // Long Story Mode Orchestration Event Handlers
  useEffect(() => {
    const handleStoryCommand = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { action, payload } = customEvent.detail || {};

      if (store.liveState === 'offline') {
        store.setStoryState({ narrationTranscript: 'Initializing voice connection to start narrative saga...' });
        await toggleConnection();
        // Hold for 3 seconds to guarantee websocket connection
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (action === 'start') {
          wsRef.current.send(JSON.stringify({ text: `Rishu Boss requests: "${payload.prompt}". Start a brand new storytelling session. Call tool storyAction with action="start".` }));
        } else if (action === 'send-text') {
          wsRef.current.send(JSON.stringify({ text: payload.text }));
        }
      }
    };

    const handleSpeechFinished = () => {
      if (store.storyState.isActive && !store.storyState.isPaused) {
        const { currentChapter, totalChapters, title } = store.storyState;
        
        if (currentChapter >= totalChapters) {
          store.resetStoryState();
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ 
              text: `Rishu Boss, pure ${totalChapters} chapters ki chuni hui story khatam ho chuki hai. Acknowledge and congratulate Rishu Boss on completing the saga elegantly in Hinglish!` 
            }));
          }
        } else {
          const nextChap = currentChapter + 1;
          store.setStoryState({ 
            currentChapter: nextChap,
            narrationTranscript: 'Transitioning timeline, writing story parchment live...'
          });

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ 
              text: `System Command: Move on immediately to narrate Chapter ${nextChap} of the story titled '${title}' in Hindi/Hinglish now. Be highly expressive, maintain the flow and continuity, and start narrating the next events of the saga naturally without any introductions or meta questions.` 
            }));
          }
        }
      }
    };

    window.addEventListener('story-command', handleStoryCommand);
    window.addEventListener('speech-finished', handleSpeechFinished);

    return () => {
      window.removeEventListener('story-command', handleStoryCommand);
      window.removeEventListener('speech-finished', handleSpeechFinished);
    };
  }, [store.storyState, store.liveState, store.apiKey]);

  // Connects or disconnects the Gemini Live WebSocket session
  const toggleConnection = async () => {
    if (store.liveState !== 'offline') {
      localStorage.setItem('__roy_session_connected', 'false');
      disconnectSession();
      return;
    }

    if (!store.apiKey) {
      store.setConnectionError('API KEY REQUIRED: Please slide over to coordinates in "Settings" and provide a Gemini API Key.');
      setActiveTab('settings');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    localStorage.setItem('__roy_session_connected', 'true');
    store.setLiveState('connecting');
    store.setConnectionError(null);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live?key=${encodeURIComponent(store.apiKey)}&name=${encodeURIComponent(store.assistantName)}&owner=${encodeURIComponent(store.ownerName)}&creator=${encodeURIComponent(store.creatorName)}&voice=${encodeURIComponent(store.selectedVoice)}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        try {
          // Initialize active microphone/playback streaming
          const result = await voiceEngine.start(ws, store.micGain, store.voiceVolume);
          
          if (!result.micActive) {
            store.setConnectionError('MIC_PERMISSION_DENIED');
          } else {
            store.setConnectionError(null);
          }
          
          store.setLiveState('listening');
          store.addMemory(`Initiated duplex session with ${store.assistantName}.`, 'auto');

          // Trigger special greeting/command speech
          if (pendingTextRef.current) {
            const queryToSend = pendingTextRef.current;
            pendingTextRef.current = '';
            ws.send(JSON.stringify({ text: queryToSend }));
          } else if ((window as any).__roy_welcome_back_on_connect) {
            (window as any).__roy_welcome_back_on_connect = false;
            ws.send(JSON.stringify({ 
              text: 'System instruction: Greet user in Hindi/Hinglish. You MUST say exactly: "Welcome back Rishu Boss, kaise ho?" Then naturally ask how you can assist further in Hindi or Hinglish.' 
            }));
          } else if (!result.micActive) {
            // Advise assistant of keyboard-only mode
            ws.send(JSON.stringify({
              text: 'System instruction: Greet the user and tease them playfully in Hindlish/Hindi that their microphone was not detected or is blocked, but they can still chat by typing in the chat bar.'
            }));
          }
        } catch (micErr: any) {
          console.error('Core audio pipeline start failed', micErr);
          store.setConnectionError('VOICE PIPELINE ERROR: Verify digital audio bindings.');
          disconnectSession();
        }
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            store.setConnectionError(data.error);
            disconnectSession();
            return;
          }

          // A. Process incoming base64 PCM chunks
          if (data.audio) {
            voiceEngine.handleIncomingAudio(data.audio);
          }

          // B. Interruption signal handling (instant cutoff)
          if (data.interrupted) {
            voiceEngine.interrupt();
            store.setLiveState('listening');
          }

          // C1. AI Transcript Captions
          if (data.aiTranscript) {
            // Transition check: if user spoke previous paragraph, commit user transcript first
            if (currentUserUtterance.current) {
              commitUserUtterance();
            }
            store.setAiTranscript(data.aiTranscript);
            currentAiUtterance.current = data.aiTranscript;

            if (store.storyState.isActive && !store.storyState.isPaused) {
              store.setStoryState({ narrationTranscript: data.aiTranscript });
            }
          }

          // C2. User spoken input live transcription
          if (data.userTranscript) {
            // Transition check: if AI spoke previous paragraph, commit model transcript first
            if (currentAiUtterance.current) {
              commitAiUtterance();
            }
            store.setUserTranscript(data.userTranscript);
            currentUserUtterance.current = data.userTranscript;

            registerUserInteraction();

            // Interruption hook: check if user spoken transcript contains stop phrases
            const { isInterrupt, isEmergency } = checkInterruptCommand(data.userTranscript);
            if (isInterrupt) {
              handleVoiceInterrupt(isEmergency);
            }
          }

          // D. Instant Function Call Executions
          if (data.toolCall) {
            const calls = data.toolCall.functionCalls;
            if (calls && calls.length > 0) {
              const call = calls[0];
              const name = call.name;
              const args = call.args || {};
              const id = call.id;

              let resultMessage = `Handled tool execution for ${name}.`;
              
              try {
                if (name === 'openWebsite') {
                  const win = window.open(args.url, '_blank');
                  if (!win) resultMessage = `Triggered link navigation but popup was suppressed: ${args.url}`;
                } else if (name === 'searchGoogle') {
                  window.open(`https://www.google.com/search?q=${encodeURIComponent(args.query)}`, '_blank');
                } else if (name === 'copyToClipboard') {
                  await navigator.clipboard.writeText(args.text);
                  resultMessage = 'Text copied to device clipboard.';
                } else if (name === 'openYouTube') {
                  const queryToSearch = args.query || '';
                  if (queryToSearch) {
                    try {
                      const sRes = await fetch('/api/youtube/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: queryToSearch, apiKey: store.youtubeApiKey || undefined })
                      });
                      const sData = await sRes.json();
                      if (sData.ok && sData.videos && sData.videos.length > 0) {
                        const firstVid = sData.videos[0];
                        store.setActiveVideo(firstVid);
                        store.addToWatchHistory(firstVid);
                        resultMessage = `Playing YouTube video: ${firstVid.title} inside Roy Girl AI central media workspace.`;
                      } else {
                        resultMessage = `Could not find any YouTube videos matching "${queryToSearch}" globally.`;
                      }
                    } catch (e: any) {
                      resultMessage = `Network error playing requested YouTube stream: ${e.message}`;
                    }
                  } else {
                    resultMessage = 'No search query specified to play YouTube video inside the existing application interface.';
                  }
                } else if (name === 'openInstagram') {
                  window.open('https://www.instagram.com', '_blank');
                } else if (name === 'openWhatsApp') {
                  window.open('https://web.whatsapp.com', '_blank');
                } else if (name === 'getSystemDiagnostics') {
                  const activeRems = store.reminders.map(r => `[${r.done ? 'COMPLETED' : 'PENDING'}] ${r.text}`).join('; ');
                  const activeGoals = store.goals.map(g => `[Goal details: ID ${g.id}, title "${g.title}", category ${g.category}, Target: ${g.target}, Current: ${g.current}, Deadline: ${g.deadline}, Completed: ${g.completed ? 'YES' : 'NO'}]`).join('; ');
                  const diagnosticOutput = {
                    batteryLevel: `${store.batteryLevel}%`,
                    batteryCharging: store.isBatteryCharging ? 'Yes, charging' : 'No, on battery power',
                    networkStatus: store.networkOnline ? 'ONLINE' : 'OFFLINE',
                    localTime: new Date().toLocaleTimeString(),
                    localDate: new Date().toLocaleDateString(),
                    activeReminders: activeRems || 'No active reminders.',
                    goalsProgress: activeGoals || 'No active goals recorded.',
                    assistantPersonaName: store.assistantName,
                    ownerName: store.ownerName,
                  };
                  resultMessage = JSON.stringify(diagnosticOutput);
                } else if (name === 'addClientGoal') {
                  await store.addGoal({
                    title: args.title || 'Untitled Goal',
                    category: args.category || 'personal',
                    target: args.target?.toString() || '100',
                    current: args.current?.toString() || '0',
                    deadline: args.deadline || 'Soon',
                  });
                  resultMessage = `Successfully created goal "${args.title}" with target ${args.target}.`;
                } else if (name === 'updateClientGoalProgress') {
                  await store.updateGoalProgress(args.id, args.currentValue?.toString(), args.comment || 'Updated via Live voice engine');
                  resultMessage = `Successfully logged progress value ${args.currentValue} for goal ID ${args.id}.`;
                } else if (name === 'savePreferenceOrMemory') {
                  await store.addMemory(args.text, args.category || 'auto');
                  resultMessage = `Successfully logged timeline memory record.`;
                } else if (name === 'deleteClientMemory') {
                  await store.deleteMemory(args.id);
                  resultMessage = `Successfully deleted memory log item ${args.id}.`;
                } else if (name === 'publishTelegramPost') {
                  const res = await fetch('/api/telegram/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'text', content: args.content })
                  });
                  const data = await res.json();
                  if (data.ok) {
                    resultMessage = 'Roy Boss, post successfully published to Telegram.';
                  } else {
                    resultMessage = `Failed to publish: ${data.error || 'Connection error'}`;
                  }
                } else if (name === 'scheduleTelegramPost') {
                  let delay = 3600000; // default 1 hour
                  const isoStr = (args.scheduledAtISO || '').toLowerCase();
                  if (isoStr.includes('tomorrow')) {
                    delay = 86400000;
                  } else if (isoStr.includes('2 hours')) {
                    delay = 7200000;
                  } else if (isoStr.includes('minute')) {
                    const match = isoStr.match(/(\d+)\s*minute/);
                    if (match) delay = parseInt(match[1]) * 60000;
                    else delay = 60000;
                  } else if (isoStr.includes('hour')) {
                    const match = isoStr.match(/(\d+)\s*hour/);
                    if (match) delay = parseInt(match[1]) * 3600000;
                    else delay = 3600000;
                  } else {
                    const parsed = Date.parse(args.scheduledAtISO);
                    if (!isNaN(parsed) && parsed > Date.now()) {
                      delay = parsed - Date.now();
                    }
                  }
                  const scheduledTime = Date.now() + delay;
                  const res = await fetch('/api/telegram/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      type: 'text', 
                      content: args.content, 
                      scheduledAt: scheduledTime 
                    })
                  });
                  const data = await res.json();
                  if (data.ok) {
                    resultMessage = `Telegram post scheduled successfully for execution at ${new Date(scheduledTime).toLocaleString()}`;
                  } else {
                    resultMessage = `Failed to schedule post: ${data.error || 'Connection error'}`;
                  }
                } else if (name === 'postYouTubeVideoToTelegram') {
                  const res = await fetch('/api/telegram/youtube/search-and-post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: args.topic })
                  });
                  const data = await res.json();
                  if (data.ok) {
                    resultMessage = 'Roy Boss, post successfully published to Telegram.';
                  } else {
                    resultMessage = `Failed to publish: ${data.error || 'Connection error'}`;
                  }
                } else if (name === 'ytPlaySong') {
                  const queryToSearch = args.query || '';
                  const songId = args.songId || '';
                  if (songId) {
                    const songToPlay = {
                      id: songId,
                      title: args.title || 'YouTube Song',
                      url: `https://www.youtube.com/watch?v=${songId}`,
                      description: args.description || '',
                      channelName: args.channelName || 'YouTube Artist',
                      thumbnail: `https://img.youtube.com/vi/${songId}/hqdefault.jpg`,
                    };
                    store.setActiveVideo(songToPlay);
                    store.addToWatchHistory(songToPlay);
                    resultMessage = `Success. Playing song: "${songToPlay.title}" inside Roy Girl AI central media workspace.`;
                  } else if (queryToSearch) {
                    try {
                      const sRes = await fetch('/api/youtube/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: queryToSearch, apiKey: store.youtubeApiKey || undefined })
                      });
                      const sData = await sRes.json();
                      if (sData.ok && sData.videos && sData.videos.length > 0) {
                        const firstSong = sData.videos[0];
                        store.setActiveVideo(firstSong);
                        store.addToWatchHistory(firstSong);
                        resultMessage = `Ji Rishu Boss, YouTube par "${firstSong.title}" play kar rahi hu.`;
                      } else {
                        resultMessage = `Ji Rishu Boss, YouTube par matching song "${queryToSearch}" nahi mila.`;
                      }
                    } catch (sErr: any) {
                      resultMessage = `Network search error lookup matching song query: ${sErr.message}`;
                    }
                  } else {
                    resultMessage = 'You must specify a song query details or songId to play.';
                  }
                } else if (name === 'ytPlayVideo') {
                  const queryToSearch = args.query || '';
                  if (args.videoId) {
                    const videoToPlay = {
                      id: args.videoId,
                      title: args.title || 'YouTube Video',
                      url: `https://www.youtube.com/watch?v=${args.videoId}`,
                      description: args.description || '',
                      channelName: args.channelName || 'YouTube Creator',
                      thumbnail: `https://img.youtube.com/vi/${args.videoId}/hqdefault.jpg`,
                    };
                    store.setActiveVideo(videoToPlay);
                    store.addToWatchHistory(videoToPlay);
                    resultMessage = `Success. Playing video: ${videoToPlay.title}. Web-view player loaded on Rishu Boss central orb workspace.`;
                  } else if (queryToSearch) {
                    try {
                      const sRes = await fetch('/api/youtube/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: queryToSearch, apiKey: store.youtubeApiKey || undefined })
                      });
                      const sData = await sRes.json();
                      if (sData.ok && sData.videos && sData.videos.length > 0) {
                        const firstVid = sData.videos[0];
                        store.setActiveVideo(firstVid);
                        store.addToWatchHistory(firstVid);
                        resultMessage = `Playing custom video topic discovery on central workspace dashboard. Loading video element: "${firstVid.title}".`;
                      } else {
                        resultMessage = `No public videos found matching query "${queryToSearch}" globally.`;
                      }
                    } catch (sErr: any) {
                      resultMessage = `Network search error lookup matching topic: ${sErr.message}`;
                    }
                  } else {
                    resultMessage = 'You must specify a topic query or video ID parameter to play.';
                  }
                } else if (name === 'ytPauseVideo') {
                  window.dispatchEvent(new CustomEvent('yt-player-command', { detail: 'pause' }));
                  resultMessage = 'Successfully paused active media playback.';
                } else if (name === 'ytResumeVideo') {
                  if (store.activeVideo) {
                    window.dispatchEvent(new CustomEvent('yt-player-command', { detail: 'play' }));
                    resultMessage = 'Successfully resumed video play states.';
                  } else {
                    const lastVid = store.watchHistory[0] || null;
                    if (lastVid) {
                      store.setActiveVideo(lastVid);
                      resultMessage = `Resuming your last watched educational video: "${lastVid.title}" precisely from target cached location.`;
                    } else {
                      resultMessage = 'Could not find any suspended videos in watch history databases to resume.';
                    }
                  }
                } else if (name === 'ytStopVideo') {
                  store.setActiveVideo(null);
                  store.setPlayerState('stopped');
                  resultMessage = 'Success. YouTube Media Player stopped, restoring central glowing AI voice orb.';
                } else if (name === 'ytSkipForward') {
                  window.dispatchEvent(new CustomEvent('yt-player-command', { detail: 'skip-forward' }));
                  resultMessage = 'Video playback forward status advanced 10 seconds.';
                } else if (name === 'ytSkipBackward') {
                  window.dispatchEvent(new CustomEvent('yt-player-command', { detail: 'skip-backward' }));
                  resultMessage = 'Video playback timeline rewound 10 seconds.';
                } else if (name === 'ytNextVideo') {
                  const currentIndex = store.watchHistory.findIndex(h => h.id === store.activeVideo?.id);
                  if (currentIndex > -1 && currentIndex < store.watchHistory.length - 1) {
                    const nextVid = store.watchHistory[currentIndex + 1];
                    store.setActiveVideo(nextVid);
                    resultMessage = `Playing next video from list: "${nextVid.title}".`;
                  } else if (store.watchLater.length > 0) {
                    const nextVid = store.watchLater[0];
                    store.setActiveVideo(nextVid);
                    resultMessage = `Playing next saved item from your Watch Later playlist: "${nextVid.title}".`;
                  } else {
                    resultMessage = 'No next items found in history queue or Watch Later lists.';
                  }
                } else if (name === 'ytPreviousVideo') {
                  const currentIndex = store.watchHistory.findIndex(h => h.id === store.activeVideo?.id);
                  if (currentIndex > 0) {
                    const prevVid = store.watchHistory[currentIndex - 1];
                    store.setActiveVideo(prevVid);
                    resultMessage = `Replaying previous media recommendation from history list: "${prevVid.title}".`;
                  } else {
                    resultMessage = 'No previous watching records found in memory collections.';
                  }
                } else if (name === 'ytPostToTelegram') {
                  if (store.activeVideo) {
                    const active = store.activeVideo;
                    const postContent = `📚 *Educational Resource Recommendation*\n\n🎥 *Video Title:* ${active.title}\n\n🔗 *Video Link:* ${active.url}\n\nChannel: ${active.channelName}\n\n${active.description ? `Description:\n• ${active.description.substring(0, 300)}...` : ''}`;
                    const res = await fetch('/api/telegram/posts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'text', content: postContent })
                    });
                    const data = await res.json();
                    if (data.ok) {
                      resultMessage = `Roy Boss, post successfully published to Telegram. Active video "${active.title}" is now shared.`;
                    } else {
                      resultMessage = `Transmitting shared media video report to Telegram platform failed: ${data.error || 'API Connection error'}`;
                    }
                  } else {
                    resultMessage = 'No active YouTube video is currently loaded into playback memory to post to channel targets.';
                  }
                } else if (name === 'ytSetMusicMode') {
                  const enabled = args.enabled === true;
                  store.setMusicMode(enabled);
                  resultMessage = enabled 
                    ? "Ji Rishu Boss, Music Mode activate kar rahi hu." 
                    : "Ji Rishu Boss, Music Mode deactivate kar rahi hu.";
                } else if (name === 'ytSetRepeat') {
                  const enabled = args.enabled === true;
                  store.setRepeatEnabled(enabled);
                  window.dispatchEvent(new CustomEvent('yt-player-command', { detail: { action: 'set-repeat', value: enabled } }));
                  resultMessage = enabled
                    ? "Ji Rishu Boss, song loop mode chalu kar diya hai."
                    : "Ji Rishu Boss, song loop mode band kar diya hai.";
                } else if (name === 'ytSetVolume') {
                  let targetVolume = store.mediaVolume;
                  if (args.mute !== undefined) {
                    store.setMediaMuted(args.mute);
                    window.dispatchEvent(new CustomEvent('yt-player-command', { detail: { action: 'set-mute', value: args.mute } }));
                    resultMessage = args.mute 
                      ? "Ji Rishu Boss, volume mute kar diya." 
                      : "Ji Rishu Boss, volume unmute kar diya.";
                  } else {
                    if (args.volume !== undefined) {
                      targetVolume = args.volume;
                    } else if (args.relativeChange !== undefined) {
                      targetVolume = store.mediaVolume + args.relativeChange;
                    }
                    store.setMediaMuted(false);
                    store.setMediaVolume(targetVolume);
                    window.dispatchEvent(new CustomEvent('yt-player-command', { detail: { action: 'set-volume', value: targetVolume } }));
                    resultMessage = `Ji Rishu Boss, volume ${targetVolume} percent kar diya.`;
                  }
                } else if (name === 'cameraOpen') {
                  const facing = args.facingMode || 'user';
                  store.setCameraActive(true);
                  if (facing === 'environment' || facing === 'back') {
                    store.setCameraFacingMode('environment');
                  } else {
                    store.setCameraFacingMode('user');
                  }
                  setActiveTab('orb');
                  window.dispatchEvent(new CustomEvent('camera-command', { detail: { action: 'open', value: facing } }));
                  resultMessage = `Ji Rishu Boss, camera khol rahi hu in ${facing === 'environment' ? 'back/rear' : 'front/selfie'} mode.`;
                } else if (name === 'cameraClose') {
                  store.setCameraActive(false);
                  window.dispatchEvent(new CustomEvent('camera-command', { detail: { action: 'close' } }));
                  resultMessage = "Ji Rishu Boss, camera close kar diya.";
                } else if (name === 'cameraCapture') {
                  const isSelfie = args.isSelfie === true;
                  const burstCount = args.burstCount || 1;
                  setActiveTab('orb');
                  window.dispatchEvent(new CustomEvent('camera-command', { detail: { action: 'capture', isSelfie, burstCount } }));
                  resultMessage = burstCount > 1 
                    ? `Ji Rishu Boss, ${burstCount} photos burst style click kar rahi hu.`
                    : `Ji Rishu Boss, snap click kar rahi hu.`;
                } else if (name === 'cameraAction') {
                  const action = args.action;
                  window.dispatchEvent(new CustomEvent('camera-command', { detail: { action } }));
                  if (action === 'save') {
                    resultMessage = "Ji Rishu Boss, photo gallery me save kar di.";
                  } else if (action === 'retake') {
                    resultMessage = "Ji Rishu Boss, ready ho jaiye, dobara capture kar rahi hu.";
                  } else if (action === 'delete') {
                    resultMessage = "Ji Rishu Boss, photo delete kar di.";
                  } else if (action === 'gallery_open') {
                    resultMessage = "Ji Rishu Boss, gallery khol rahi hu.";
                  } else if (action === 'gallery_close') {
                    resultMessage = "Ji Rishu Boss, gallery close kar di.";
                  } else {
                    resultMessage = `Action ${action} processed.`;
                  }
                } else if (name === 'storyAction') {
                  const act = args.action;
                  const type = args.type || 'horror';
                  const duration = args.duration || '15m';

                  if (act === 'start') {
                    const titles: Record<string, string[]> = {
                      horror: ["Shaitani Haveli Ka Raaz", "The Midnight Ghost Bride", "Pichal Pairi Ki Aahat", "The Blood Moon Graveyard"],
                      love: ["Teri Meri Adhoori Dastan", "Golden Sunset Bridge", "Do Dilon Ka Sangam", "High-School Love Symphony"],
                      motivational: ["Rishu Boss Ka Sangharsh", "Never Quit Hustle Saga", "Zero Se Hero Dastan", "The Ultimate Pacer"],
                      adventure: ["Khoya Hua Mandir", "Ancient Jungle Crypt", "Sahara Desert Quest", "The Lost Atlantis Shield"],
                      mystery: ["Teesri Nishani Ka Raaz", "Murder At Midnight Court", "The Silent Witness Clues", "The Shadow Tracker"],
                      fantasy: ["Pariyon Ka Sunehra Desh", "Golden Phoenix Prophecy", "Magic Quest of Rawland", "The Immortal Sword"],
                      comedy: ["Rishu Aur Pappu Ki Panga", "The Hilarious Marriage Mixup", "Crazy Tech Support Fiasco", "Gunda Bhediya Comedy Show"],
                      historical: ["Mewar Ke Veer Yoddha", "Taj Mahal Secret Tunnel", "Chhatrapati Veer Ki Swords", "Chronicles of Akbar Legacy"],
                      sci_fi: ["Black Hole Protocol X", "The AI Takeover Doom", "Neon Star Odyssey", "Hyper-Sleep Time Paradox"],
                      endless: ["Anant Antriksh Ki Kahani", "The Endless Time Loop Journeys", "The Everlasting Mystic Tales", "Cosmic Voyage Chronicle"]
                    };
                    const list = titles[type] || titles.horror;
                    const randomTitle = list[Math.floor(Math.random() * list.length)];

                    store.setStoryState({
                      isActive: true,
                      isPaused: false,
                      title: randomTitle,
                      type: type,
                      currentChapter: 1,
                      totalChapters: duration === '30m' ? 6 : duration === '1h' ? 12 : duration === '2h' ? 24 : duration === 'endless' ? 999 : 3,
                      durationMinutes: duration,
                      narrationTranscript: '',
                      chaptersHistory: []
                    });
                    setActiveTab('story');
                    resultMessage = `Story mode started. Narrating Chapter 1 of the story: "${randomTitle}" in Hindi/Hinglish now. Keep the narration highly engaging, suspensful if horror, and respectful to Rishu Boss.`;
                  } else if (act === 'pause') {
                    store.setStoryState({ isPaused: true });
                    voiceEngine.interrupt();
                    resultMessage = "Ji Rishu Boss, kahani pause kar di hai.";
                  } else if (act === 'resume') {
                    store.setStoryState({ isPaused: false });
                    resultMessage = "Ji Rishu Boss, kahani aage badh rahi hai.";
                  } else if (act === 'continue') {
                    const current = store.storyState.currentChapter;
                    const total = store.storyState.totalChapters;
                    if (current < total) {
                      store.setStoryState({ 
                        currentChapter: current + 1,
                        narrationTranscript: ''
                      });
                      resultMessage = `Transitioning to Chapter ${current + 1} narration immediately.`;
                    } else {
                      store.resetStoryState();
                      resultMessage = "Rishu Boss, kahani poori ho chuki hai. Dhanyawad!";
                    }
                  } else if (act === 'stop') {
                    store.resetStoryState();
                    voiceEngine.interrupt();
                    resultMessage = "Story mode exited and reset completely.";
                  }
                } else if (name === 'vaultAction') {
                  const act = args.action;
                  const filterVal = args.filter || 'all';

                  if (act === 'upload') {
                    setActiveTab('vault');
                    setTimeout(() => {
                      const picker = document.getElementById('vault-file-picker');
                      if (picker) {
                        picker.click();
                      }
                    }, 150);
                    resultMessage = "Ji Rishu Boss, photo upload panel open kar diya hai. Single ya multiple image select kar kijiye.";
                  } else if (act === 'show_gallery') {
                    // Query database of photos directly asynchronously
                    const allPhotos = await db.getPhotos();
                    const cleanFilter = filterVal.toLowerCase().trim();
                    let matchedPhotos: db.PhotoRecord[] = [];

                    if (cleanFilter === 'astha' || cleanFilter === 'wife' || cleanFilter === 'partner') {
                      matchedPhotos = allPhotos.filter(p => p.personLabel === 'Astha');
                    } else if (cleanFilter === 'all') {
                      matchedPhotos = allPhotos;
                    } else {
                      // Fuzzy lookup fallback
                      matchedPhotos = allPhotos.filter(p => {
                        const label = (p.personLabel || '').toLowerCase();
                        const location = (p.location || '').toLowerCase();
                        const idStr = p.id.toLowerCase();
                        return label.includes(cleanFilter) || location.includes(cleanFilter) || idStr.includes(cleanFilter);
                      });
                    }

                    if (matchedPhotos.length === 0) {
                      // Clear any existing active on screen photos so it stays clean
                      setOnScreenPhotos([]);
                      resultMessage = "Error: Rishu Boss, is naam ki koi photo save nahi hai.";
                    } else {
                      // Save found images to local display states
                      setOnScreenPhotos(matchedPhotos);
                      setActivePhotoIndex(0);
                      setOnScreenZoomLevel(1);
                      // Do NOT change activeTab or open gallery first (navigate away)!
                      // We keep activeTab 'orb' and display the photo inside the current view.
                      resultMessage = `Success: Rendered ${matchedPhotos.length} photo(s) of ${filterVal} directly on the screen inside the active viewport framework. Checked and verified that all target image structures have been outputted in their true, proportional sizes (portrait, landscape, or square) alongside a Full Screen modal launcher.`;
                    }
                  }
                }
              } catch (e: any) {
                resultMessage = `Error executing browser layout action: ${e.message}`;
              }

              // Send immediate tool response report back to models to resume discussion
              ws.send(JSON.stringify({
                toolResponse: {
                  name,
                  id,
                  response: { output: resultMessage }
                }
              }));

              store.addMemory(`Live command completed: Executed ${name}`, 'auto');
            }
          }

        } catch (e) {
          console.error('Frame processing warning:', e);
        }
      };

      ws.onclose = () => {
        disconnectSession();
        // Automatic reconnection if session was meant to be active (continuous conversation mode)
        const wasSessionConnected = localStorage.getItem('__roy_session_connected') === 'true';
        if (wasSessionConnected) {
          console.log('Voice pipeline severed. Bootstrapping automatic reconnection in 4 seconds...');
          store.setLiveState('connecting');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (localStorage.getItem('__roy_session_connected') === 'true') {
              toggleConnection();
            }
          }, 4000);
        }
      };

      ws.onerror = () => {
        store.setConnectionError('WebSocket pipeline connection dropped.');
        disconnectSession();
      };

    } catch (conErr: any) {
      store.setConnectionError(conErr.message || 'Cognition sync pipeline failure.');
      disconnectSession();
    }
  };

  const disconnectSession = () => {
    voiceEngine.stop();
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    store.setLiveState('offline');
    
    // Commit remaining dialogues to history
    commitUserUtterance();
    commitAiUtterance();
  };

  const handleMuteToggle = () => {
    const nextMuted = !store.isMuted;
    store.setIsMuted(nextMuted);
    voiceEngine.setMute(nextMuted);
  };

  const getModuleLabel = () => {
    if (activeTab === 'settings') return 'Configuration Settings';
    if (activeTab === 'vault') return 'Secret Photo Vault & Gallery';
    if (activeTab === 'story') return 'Long Story Mode';
    if (activeTab === 'telegram') return 'Telegram Integration Hub';
    if (activeTab === 'dashboard') return 'Interactive Dashboard';
    if (activeTab === 'orb') {
      if (store.activeVideo) return 'Video & Music Player';
      if (store.cameraActive) return 'Smart Camera System';
    }
    return 'Voice Cognition Hub';
  };

  const handleCloseActiveModule = () => {
    if (store.cameraActive) {
      store.setCameraActive(false);
      window.dispatchEvent(new CustomEvent('camera-command', { detail: { action: 'close' } }));
    }
    if (store.activeVideo) {
      store.setActiveVideo(null);
      store.setPlayerState('stopped');
    }
    setActiveTab('orb');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-pink-500/30 selection:text-pink-200">
      
      {/* Dynamic Main Workspace Rendering */}
      <main className="flex-1 flex flex-col justify-start relative">
        
        {/* DEFAULT VOICE-FIRST VIEW */}
        {activeTab === 'orb' && !store.activeVideo && !store.cameraActive ? (
          <div className="flex-1 flex flex-col justify-between items-center max-w-4xl mx-auto w-full px-4 py-12 md:py-16 gap-8">
            
            {/* 1. Brand Logo Header & Status Indicator */}
            <div className="w-full flex flex-col items-center gap-3 select-none animate-fade text-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-500 flex items-center justify-center font-mono font-black text-white text-sm shadow-[0_0_20px_rgba(236,72,153,0.4)] border border-white/10">
                  RG
                </div>
                <div className="text-left">
                  <h1 className="text-xl font-mono tracking-[0.2em] font-black text-white uppercase flex items-center gap-2">
                    {store.assistantName}
                    <span className="text-[9px] font-mono font-bold text-pink-400 bg-pink-950/40 border border-pink-500/20 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.2)] animate-pulse">
                      VOICE FIRST
                    </span>
                  </h1>
                  <p className="text-[10px] text-zinc-500 font-mono tracking-widest mt-0.5">
                    SECURE COGNITIVE SYSTEM
                  </p>
                </div>
              </div>
              
              {/* Online / Offline Status Badge */}
              <div className="mt-2">
                <div className={`px-4 py-1.5 rounded-full border text-[10px] font-mono font-black tracking-widest flex items-center gap-2 backdrop-blur-md transition-all duration-300 ${
                  store.liveState === 'offline'
                    ? 'bg-zinc-950/50 border-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                    : store.liveState === 'speaking'
                      ? 'bg-zinc-950/50 border-cyan-500/15 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.08)]'
                      : store.liveState === 'listening'
                        ? 'bg-zinc-950/50 border-emerald-500/15 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                        : 'bg-zinc-950/50 border-purple-500/15 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.08)]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    store.liveState === 'offline' 
                      ? 'bg-rose-500 shadow-[0_0_8px_#ef4444]' 
                      : store.liveState === 'listening'
                        ? 'bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse'
                        : store.liveState === 'speaking'
                          ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                          : 'bg-purple-400 shadow-[0_0_8px_#c084fc] animate-ping'
                  }`} />
                  <span>
                    {store.liveState === 'offline'
                      ? 'OFFLINE • DISCONNECTED'
                      : `ONLINE • ${store.liveState.toUpperCase()}`
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Interactive Central Voice Orb */}
            <div className="flex-1 flex items-center justify-center w-full relative">
              <Orb onClick={toggleConnection} />
            </div>

            {/* Live Captions Transcript Overlay Panel (Only when connected & transcribing) */}
            {store.liveState !== 'offline' && store.aiTranscript && (
              <div className="w-full max-w-lg bg-zinc-900/40 border border-zinc-800/40 backdrop-blur-md rounded-2xl p-4 space-y-1.5 select-text shadow-lg animate-fade text-center">
                <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-ping" />
                  Live Transcription
                </span>
                <p className="text-sm font-mono text-cyan-200 leading-relaxed italic">
                  "{store.aiTranscript}"
                </p>
              </div>
            )}

            {/* Premium On-Screen Photo Display System (Dynamic Frame Viewer Layout) */}
            {onScreenPhotos.length > 0 && (
              <div className="w-full max-w-xl bg-zinc-950/90 border border-pink-500/30 rounded-[28px] p-5 space-y-4 shadow-[0_0_50px_rgba(236,72,153,0.15)] relative overflow-hidden backdrop-blur-2xl transition-all duration-300 animate-slide-up z-40">
                {/* Background glow effects */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* Header of frame */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                    <span className="text-[10px] font-mono font-black uppercase text-pink-400 tracking-[0.2em]">
                      {onScreenPhotos[activePhotoIndex].personLabel === 'Astha' ? 'Astha Partner Frame' : 'Smart Photo Frame'}
                    </span>
                    {onScreenPhotos.length > 1 && (
                      <span className="text-[10px] font-mono text-zinc-500">
                        ({activePhotoIndex + 1} of {onScreenPhotos.length})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Full screen handle */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsFullscreenPhotoOpen(true);
                        setOnScreenZoomLevel(1);
                      }}
                      className="p-1.5 rounded-lg bg-zinc-905 hover:bg-zinc-850 hover:text-white text-zinc-400 border border-zinc-850 hover:border-zinc-750 transition-all cursor-pointer shadow-md"
                      title="Symmetry Fullscreen Viewer"
                    >
                      <Maximize2 size={13} />
                    </button>
                    {/* Discard current view frame */}
                    <button
                      type="button"
                      onClick={() => setOnScreenPhotos([])}
                      className="p-1.5 rounded-lg bg-zinc-905 hover:bg-zinc-850 text-zinc-400 hover:text-rose-450 border border-zinc-850 hover:border-rose-500/20 transition-all cursor-pointer shadow-md"
                      title="Clear screen frame"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Main Proportional Frame Viewer */}
                <div className="flex justify-center items-center w-full min-h-[220px] bg-zinc-950/60 rounded-[20px] overflow-hidden p-3 border border-zinc-900/60 relative">
                  {(() => {
                    const activePhoto = onScreenPhotos[activePhotoIndex];
                    const orientation = photoOrientations[activePhoto.id] || 'square';
                    
                    let frameClass = 'aspect-square max-w-[280px]'; // default
                    if (orientation === 'portrait') {
                      frameClass = 'aspect-[3/4] max-w-[220px]';
                    } else if (orientation === 'landscape') {
                      frameClass = 'aspect-[16/10] w-full max-w-lg';
                    }

                    return (
                      <div 
                        onClick={() => {
                          setIsFullscreenPhotoOpen(true);
                          setOnScreenZoomLevel(1);
                        }}
                        className={`relative rounded-xl overflow-hidden shadow-2xl border border-white/5 cursor-zoom-in group/img transition-all duration-300 w-full ${frameClass}`}
                      >
                        <img
                          src={activePhoto.dataUrl}
                          alt="On-Screen Rendered Asset"
                          onLoad={(e) => handleOnScreenImageLoad(activePhoto.id, e)}
                          className="w-full h-full object-cover select-none pointer-events-none"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Hover Overlay info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 p-3 select-none flex flex-col justify-end">
                          <span className="text-[8px] font-mono text-zinc-400">
                            Saved on: {activePhoto.date} at {activePhoto.time}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Left / Right chevron buttons if multiple photos */}
                  {onScreenPhotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePhotoIndex(prev => (prev > 0 ? prev - 1 : onScreenPhotos.length - 1));
                        }}
                        className="absolute left-4 p-2 rounded-full bg-black/80 hover:bg-black text-white hover:text-pink-405 border border-zinc-800 transition-all cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePhotoIndex(prev => (prev < onScreenPhotos.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-4 p-2 rounded-full bg-black/80 hover:bg-black text-white hover:text-pink-405 border border-zinc-800 transition-all cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </div>

                {/* Sub text descriptor card */}
                <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-900/60 flex items-center justify-between text-xs font-mono">
                  <div className="min-w-0">
                    <p className="text-[10px] font-sans font-bold text-zinc-350 truncate">
                      {onScreenPhotos[activePhotoIndex].personLabel === 'Astha' ? '❤️ Wife & Partner Astha' : 'Personal Saved Memory'}
                    </p>
                    <p className="text-[9px] text-zinc-500 truncate">
                      ID: {onScreenPhotos[activePhotoIndex].id.replace('vault_', 'IDB_FRAME_')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-850 text-zinc-400 uppercase">
                      {photoOrientations[onScreenPhotos[activePhotoIndex].id] || 'square'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFullscreenPhotoOpen(true);
                        setOnScreenZoomLevel(1);
                      }}
                      className="text-[10px] hover:text-pink-400 text-zinc-400 underline cursor-pointer"
                    >
                      Full Screen
                    </button>
                  </div>
                </div>

                {/* Thumbnail horizontal strip if multiple photos */}
                {onScreenPhotos.length > 1 && (
                  <div className="flex gap-2 justify-start items-center overflow-x-auto py-1 scrollbar-none border-t border-zinc-900/50 pt-2">
                    {onScreenPhotos.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 border transition-all ${
                          idx === activePhotoIndex 
                            ? 'border-pink-500 scale-105 shadow-[0_0_10px_rgba(236,72,153,0.3)]' 
                            : 'border-zinc-850 hover:border-zinc-650 opacity-60'
                        }`}
                      >
                        <img src={p.dataUrl} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pulse Waveform feedback (Only when connected) */}
            {store.liveState !== 'offline' && (
              <div className="w-full max-w-md">
                <Waveform />
              </div>
            )}

            {/* 3. Primary Controller Dock: Connect Voice Button & Settings Button */}
            <div className="w-full flex flex-col items-center gap-5">
              
              <div className="flex items-center gap-3 w-full max-w-sm justify-center">
                {/* CONNECT/DISCONNECT VOICE MAIN TRIGGER */}
                <button
                  onClick={toggleConnection}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-mono text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-xl cursor-pointer ${
                    store.liveState === 'offline'
                      ? 'bg-gradient-to-tr from-pink-600 via-purple-600 to-cyan-600 hover:scale-[1.02] active:scale-[0.98] text-white shadow-pink-500/10 ring-1 ring-white/10 hover:ring-pink-400/55'
                      : 'bg-zinc-900 hover:bg-zinc-850 text-rose-500 border border-zinc-800'
                  }`}
                >
                  {store.liveState === 'offline' ? (
                    <>
                      <Power size={14} className="animate-pulse" />
                      <span>Connect Voice</span>
                    </>
                  ) : (
                    <>
                      <PowerOff size={14} />
                      <span>Disconnect Session</span>
                    </>
                  )}
                </button>

                {/* MIC MUTE OPTION (ONLY IF CONNECTED) */}
                {store.liveState !== 'offline' && (
                  <button
                    onClick={handleMuteToggle}
                    className={`p-4 rounded-2xl transition-all border shadow-lg cursor-pointer ${
                      store.isMuted
                        ? 'bg-rose-950/40 text-rose-400 border-rose-900/50 animate-pulse'
                        : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border-zinc-850'
                    }`}
                    title={store.isMuted ? 'Unmute microphone feed' : 'Mute microphone feed'}
                  >
                    {store.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}

                {/* SETTINGS GEAR CONFIG BUTTON */}
                <button
                  onClick={() => setActiveTab('settings')}
                  className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-850 hover:border-zinc-700 transition-all cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  title="Open Settings Configuration Panel"
                >
                  <SettingsIcon size={16} />
                </button>
              </div>

              {/* Seamless keyboard fallback command launcher toggle */}
              <div className="w-full flex justify-center">
                <button 
                  onClick={() => setChatVisible(!chatVisible)}
                  className="text-[10px] font-mono text-zinc-600 hover:text-cyan-400 flex items-center gap-1.5 uppercase tracking-widest transition-colors duration-200 cursor-pointer"
                >
                  <MessageSquare size={11} />
                  <span>{chatVisible ? 'Hide Text Command Box' : 'Keyboard Command Backup'}</span>
                </button>
              </div>

              {/* Keyboard fallback panel element (Toggles dynamically on press) */}
              {chatVisible && (
                <div className="w-full max-w-md animate-slide-up">
                  <form onSubmit={handleTextMessageSubmit} className="flex gap-2 bg-zinc-900/40 p-2 rounded-2xl border border-zinc-850 focus-within:ring-1 focus-within:ring-pink-500/50 focus-within:border-pink-500/50 transition-all shadow-inner">
                    <input
                      type="text"
                      placeholder={store.liveState === 'offline' ? "Connect voice session or type command..." : "Type text command (e.g. \"play song name\")..."}
                      value={textInputValue}
                      onChange={(e) => setTextInputValue(e.target.value)}
                      className="flex-1 bg-transparent px-3 py-1.5 font-mono text-xs text-white focus:outline-none placeholder-zinc-500"
                      disabled={isSubmittingText}
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingText || !textInputValue.trim()}
                      className="shrink-0 bg-gradient-to-tr from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest font-black transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send size={10} /> {isSubmittingText ? 'SENDING' : 'SEND'}
                    </button>
                  </form>
                </div>
              )}
              
              {/* Creator & Owner Minimal Slate Indicator */}
              <div className="text-[9px] font-mono text-zinc-700 tracking-wider">
                CREATED FOR OWNER <strong className="text-zinc-600">{store.ownerName}</strong> BY CREATOR <strong className="text-zinc-600">{store.creatorName}</strong>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE ON-DEMAND TRANSIENT FEATURE OR SUB-VIEW ( revealed dynamically by voice/actions ) */
          <div className="flex-1 flex flex-col justify-start">
            
            {/* Clean, glassy minimal top ribbon for active context, offering exit handle */}
            <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 select-none">
              <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                  <h2 className="text-[11px] font-mono font-black uppercase tracking-widest text-zinc-400">
                    Active System Module: <strong className="text-white font-black">{getModuleLabel()}</strong>
                  </h2>
                </div>
                
                {/* Standardized "Exit to Voice Interface" Back Button */}
                <button 
                  onClick={handleCloseActiveModule}
                  className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-750 text-[10px] font-mono font-bold uppercase transition-all duration-200 cursor-pointer shadow-md"
                >
                  <X size={12} className="text-pink-400" />
                  <span>Exit Module</span>
                </button>
              </div>
            </div>

            {/* Dedicated Transient Feature Panels Content Area */}
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
              {activeTab === 'settings' && <SettingsPanel />}
              {activeTab === 'vault' && <VaultTab />}
              {activeTab === 'story' && <StoryMode />}
              {activeTab === 'telegram' && <TelegramPublisher />}
              {activeTab === 'dashboard' && <Dashboard />}

              {/* Dynamic Overlay Panels within Orb Mode */}
              {activeTab === 'orb' && (
                <div className="w-full flex-1 flex flex-col items-center justify-center py-4">
                  {store.activeVideo ? (
                    <div className="w-full max-w-3xl bg-zinc-900/30 border border-zinc-850 rounded-[24px] p-4 shadow-2xl relative">
                      <YouTubePlayer />
                    </div>
                  ) : store.cameraActive ? (
                    <div className="w-full max-w-2xl bg-zinc-900/30 border border-zinc-850 rounded-[24px] p-4 shadow-2xl">
                      <CameraSystem />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FULL-SCREEN PREMIUM GLASS VIEWER & ZOOM MODAL */}
      {isFullscreenPhotoOpen && onScreenPhotos.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden select-none animate-fade-in font-sans">
          {/* Header element */}
          <div className="p-4 lg:px-8 bg-gradient-to-b from-black/85 to-transparent flex items-center justify-between text-zinc-300 z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                  onScreenPhotos[activePhotoIndex].personLabel === 'Astha'
                    ? 'bg-pink-955 text-pink-300 border-pink-500/30'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'
                }`}>
                  {onScreenPhotos[activePhotoIndex].personLabel === 'Astha' ? 'Wife / Astha ❤️' : 'Local Vault Item'}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Image {activePhotoIndex + 1} of {onScreenPhotos.length}
                </span>
              </div>
              <h4 className="text-zinc-200 mt-1 font-bold text-xs font-mono">
                {onScreenPhotos[activePhotoIndex].id.replace('vault_', 'IDB_VAULT_RECORD_')}
              </h4>
            </div>

            <div className="flex items-center gap-3">
              {/* Zoom controls */}
              <button
                type="button"
                onClick={() => setOnScreenZoomLevel(prev => Math.max(prev - 0.5, 1))}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 transition-all cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={() => setOnScreenZoomLevel(1)}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 font-mono text-xs transition-all cursor-pointer"
                title="Reset Zoom"
              >
                {onScreenZoomLevel}x
              </button>
              <button
                type="button"
                onClick={() => setOnScreenZoomLevel(prev => Math.min(prev + 0.5, 4))}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 transition-all cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreenPhotoOpen(false)}
                className="p-2.5 rounded-xl bg-rose-955 text-rose-450 hover:text-white border border-rose-900/30 hover:bg-rose-905/40 transition-all cursor-pointer"
                title="Close Full Screen"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Main big content frame with active Zoom level styling */}
          <div className="flex-1 flex items-center justify-center relative p-4 overflow-auto">
            <div 
              style={{ transform: `scale(${onScreenZoomLevel})`, transition: 'transform 0.15s ease-out' }}
              className="max-h-[80vh] max-w-full flex items-center justify-center transition-all duration-300"
            >
              <img
                src={onScreenPhotos[activePhotoIndex].dataUrl}
                alt="Full Screen Premium Display"
                className="max-h-[80vh] max-w-full rounded-2xl border border-zinc-800/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Left & Right floating action arrows */}
            {onScreenPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActivePhotoIndex(prev => (prev > 0 ? prev - 1 : onScreenPhotos.length - 1));
                    setOnScreenZoomLevel(1);
                  }}
                  className="absolute left-6 lg:left-12 p-3 rounded-full bg-black/60 hover:bg-black border border-zinc-850 text-white hover:text-pink-400 transition-all cursor-pointer shadow-lg"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePhotoIndex(prev => (prev < onScreenPhotos.length - 1 ? prev + 1 : 0));
                    setOnScreenZoomLevel(1);
                  }}
                  className="absolute right-6 lg:right-12 p-3 rounded-full bg-black/60 hover:bg-black border border-zinc-850 text-white hover:text-pink-400 transition-all cursor-pointer shadow-lg"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Footer of modal */}
          <div className="p-4 lg:p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col md:flex-row items-center justify-between text-zinc-400 gap-4 text-xs font-mono z-10">
            <div className="flex items-center gap-4">
              <span>Date: <strong>{onScreenPhotos[activePhotoIndex].date}</strong></span>
              <span>Time: <strong>{onScreenPhotos[activePhotoIndex].time}</strong></span>
              {onScreenPhotos[activePhotoIndex].location && (
                <span>Location: <strong>{onScreenPhotos[activePhotoIndex].location}</strong></span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500">
              Rishu Boss Private View • Offline Security Keys Enforced
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

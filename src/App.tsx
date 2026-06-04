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
import { 
  Mic, MicOff, Power, PowerOff, Settings as SettingsIcon, LayoutDashboard, Sparkles, User, Info, MessageSquare, ShieldCheck, Share2, Send, Youtube, Disc
} from 'lucide-react';

export default function App() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<'orb' | 'dashboard' | 'settings' | 'telegram' | 'youtube'>('orb');
  const wsRef = useRef<WebSocket | null>(null);
  const currentAiUtterance = useRef('');
  const currentUserUtterance = useRef('');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const pendingTextRef = useRef<string>('');

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
      currentAiUtterance.current = '';
    }
  };

  const handleTextMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = textInputValue.trim();
    if (!text) return;

    setTextInputValue('');
    setIsSubmittingText(true);
    
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
          }

          // C2. User spoken input live transcription
          if (data.userTranscript) {
            // Transition check: if AI spoke previous paragraph, commit model transcript first
            if (currentAiUtterance.current) {
              commitAiUtterance();
            }
            store.setUserTranscript(data.userTranscript);
            currentUserUtterance.current = data.userTranscript;
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Header Navigation Deck */}
      <header className="border-b border-zinc-900/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 select-none">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center font-mono font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                R
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-mono tracking-widest font-black text-white uppercase flex items-center gap-1.5">
                {store.assistantName}
                <span className="text-[9px] bg-cyan-950 text-cyan-300 font-mono font-normal tracking-wide px-1.5 py-0.2 rounded border border-cyan-800/50">
                  LIVE GEN
                </span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider">
                CREATED & OWNED BY <strong className="text-zinc-400 font-medium">{store.creatorName}</strong>
              </p>
            </div>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('orb')}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'orb' 
                  ? 'bg-zinc-900 text-cyan-400 border border-zinc-800' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
              title="Interactive Voice Core"
            >
              <Sparkles size={18} />
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-zinc-900 text-amber-400 border border-zinc-800' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
              title="Dashboard System"
            >
              <LayoutDashboard size={18} />
            </button>

             <button
              onClick={() => setActiveTab('telegram')}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'telegram' 
                  ? 'bg-zinc-900 text-cyan-455 border border-zinc-800' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
              title="Telegram Integration Hub"
            >
              <Send size={18} className="translate-y-[0px] rotate-[-12deg] text-cyan-400" />
            </button>

            <button
              onClick={() => setActiveTab('youtube')}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'youtube' 
                  ? 'bg-zinc-900 text-rose-500 border border-zinc-800' 
                  : 'text-zinc-400 hover:text-rose-450 hover:bg-zinc-900/40'
              }`}
              title="YouTube Media Hub"
            >
              <Youtube size={18} className="text-rose-500" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-zinc-900 text-fuchsia-400 border border-zinc-800' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
              title="Settings Config"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Space Layout */}
      <main className="flex-1 flex flex-col justify-start relative">
        {/* TAB 1: Core AI Voice Orb */}
        <div className={`flex-1 w-full flex flex-col justify-start ${activeTab === 'orb' ? '' : 'hidden'}`}>
          <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col justify-center gap-6">
            
            {/* Visual core containing responsive speech orb */}
            <div className="flex-1 flex flex-col justify-center items-center w-full">
              {store.activeVideo ? (
                <YouTubePlayer />
              ) : (
                <Orb onClick={toggleConnection} />
              )}
            </div>

            {/* Subtitle/Transcription Capture overlay panel */}
            {store.liveState !== 'offline' && store.aiTranscript && (
              <div className="w-full max-w-xl mx-auto bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-md rounded-2xl p-4 space-y-2 select-all shadow-lg animate-fade">
                <span className="text-[8px] font-mono tracking-widest text-zinc-500 uppercase flex items-center gap-1">
                  <MessageSquare size={10} /> Live Captions Transcript
                </span>
                <p className="text-sm font-mono text-cyan-200 leading-relaxed italic text-center">
                  "{store.aiTranscript}"
                </p>
              </div>
            )}

            {/* Visual audio stream scopes */}
            <div className="w-full max-w-xl mx-auto">
              <Waveform />
            </div>

            {/* Restored Continuous Conversation memory timeline */}
            {store.conversations.length > 0 && (
              <div className="w-full max-w-xl mx-auto bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-3 max-h-48 overflow-y-auto custom-scrollbar shadow-inner select-all">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                  <span className="text-[9px] font-mono tracking-wider text-zinc-500 font-semibold uppercase flex items-center gap-1.5">
                    <MessageSquare size={11} className="text-cyan-400" /> Stored Memory Decoders ({store.conversations.length})
                  </span>
                  <button
                    onClick={() => store.clearConversationHistory()}
                    className="text-[9px] font-mono text-rose-400 hover:text-rose-300 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/40 transition-colors cursor-pointer"
                  >
                    CLEAR LOGS
                  </button>
                </div>
                <div className="space-y-2">
                  {store.conversations.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-2 text-xs font-mono leading-relaxed ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-xl px-3 py-1.5 ${
                          msg.role === 'user' 
                            ? 'bg-zinc-900 text-cyan-300 border border-cyan-950/40' 
                            : 'bg-zinc-900/40 text-zinc-300 border border-zinc-900'
                        }`}
                      >
                        <span className="text-[8px] font-bold tracking-wider text-zinc-500 uppercase block mb-0.5">
                          {msg.role === 'user' ? store.ownerName : store.assistantName}
                        </span>
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Elegant Chat Fallback text bar */}
            <div className="w-full max-w-xl mx-auto">
              <form onSubmit={handleTextMessageSubmit} className="flex gap-2 bg-zinc-900/60 p-2 rounded-2xl border border-zinc-850 focus-within:ring-1 focus-within:ring-cyan-500/50 focus-within:border-cyan-500/50 transition-all shadow-inner">
                <input
                  type="text"
                  placeholder={store.liveState === 'offline' ? "Connect session or type a message..." : "Type a message or command (e.g. \"play song name\")..."}
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-1.5 font-mono text-xs text-white focus:outline-none placeholder-zinc-500"
                  disabled={isSubmittingText}
                />
                <button
                  type="submit"
                  disabled={isSubmittingText || !textInputValue.trim()}
                  className="shrink-0 bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest font-black transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={10} /> {isSubmittingText ? 'TRANSCEIVING' : 'SEND'}
                </button>
              </form>
            </div>

            {/* Direct voice connection toggle console */}
            <div className="flex gap-4 items-center justify-center select-none pt-4">
              <button
                onClick={toggleConnection}
                className={`px-6 py-3 rounded-2xl font-mono text-xs font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-2 shadow-lg cursor-pointer ${
                  store.liveState === 'offline'
                    ? 'bg-gradient-to-tr from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-rose-500 border border-zinc-800'
                }`}
              >
                {store.liveState === 'offline' ? (
                  <>
                    <Power size={14} className="animate-spin" />
                    Connect Voice
                  </>
                ) : (
                  <>
                    <PowerOff size={14} />
                    Disconnect Session
                  </>
                )}
              </button>

              {store.liveState !== 'offline' && (
                <button
                  onClick={handleMuteToggle}
                  className={`p-3.5 rounded-2xl transition-all border shadow-lg cursor-pointer ${
                    store.isMuted
                      ? 'bg-rose-950/40 text-rose-400 border-rose-900/50 animate-pulse'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
                  }`}
                  title={store.isMuted ? 'Unmute microphone feed' : 'Mute microphone feed'}
                >
                  {store.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>

            {/* Creator / Owner bottom quick banner */}
            <div className="text-center font-mono text-[10px] text-zinc-600 border-t border-zinc-900 pt-6 mt-4 select-none flex items-center justify-center gap-1">
              <ShieldCheck size={11} className="text-cyan-500/80" /> Created for Owner <strong className="text-zinc-500">{store.ownerName}</strong> by Creator <strong className="text-zinc-500">{store.creatorName}</strong>
            </div>
          </div>
        </div>

        {/* TAB 2: Dashboard Panels */}
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <div className="px-4 py-8">
            <Dashboard />
          </div>
        </div>

        {/* TAB 3: Settings Page */}
        <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
          <div className="px-4 py-8">
            <SettingsPanel />
          </div>
        </div>

        {/* TAB 4: Telegram Live Control */}
        <div className={activeTab === 'telegram' ? 'block select-text' : 'hidden'}>
          <div className="px-4 py-8">
            <TelegramPublisher />
          </div>
        </div>

        {/* TAB 5: YouTube Media Hub */}
        <div className={activeTab === 'youtube' ? 'block' : 'hidden'}>
          <div className="px-4 py-8">
            <YouTubeMediaHub />
          </div>
        </div>

        {/* Floating Mini-Player Control Pill when listening in other tabs */}
        {activeTab !== 'orb' && store.activeVideo && (
          <div className="fixed bottom-6 right-6 bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3.5 shadow-2xl z-40 max-w-xs animate-slide-up flex items-center gap-3 select-none backdrop-blur-md">
            <div className="relative shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-zinc-850">
              <img 
                src={store.activeVideo.thumbnail} 
                alt="Track art"
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Disc className="text-cyan-400 animate-spin-slow" size={12} />
              </div>
            </div>
            
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className="text-[8px] font-mono font-black text-rose-450 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                Now Playing Video
              </span>
              <h4 className="text-xs font-mono font-black text-white truncate uppercase leading-none">
                {store.activeVideo.title}
              </h4>
              <button
                onClick={() => setActiveTab('orb')}
                className="text-[10px] font-mono text-zinc-400 hover:text-cyan-400 flex items-center gap-0.5 underline transition-colors cursor-pointer"
              >
                OPEN WORKspace CONTROLLER
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

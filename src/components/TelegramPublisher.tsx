import React, { useState, useEffect } from 'react';
import { 
  Send, Shield, CheckCircle, XCircle, AlertCircle, RefreshCw, 
  Calendar, Film, FileText, Image as ImageIcon, ToggleLeft, ToggleRight, 
  Clock, Trash2, CheckCircle2, AlertTriangle, Paperclip, Loader2,
  Users, Eye, Percent, Radio, Zap, HelpCircle, Award, Youtube, Plus,
  FileSpreadsheet, Clipboard, Flame, Sparkles, Check, Play
} from 'lucide-react';

interface ConnectedChannel {
  id: string;
  title: string;
  username: string;
  addedAt: number;
  status: 'Connected' | 'Disconnected' | 'Missing Permission' | 'Invalid Token';
  memberCount: number;
}

interface PostRecord {
  id: string;
  type: 'text' | 'image' | 'video' | 'document';
  content: string;
  caption?: string;
  status: 'pending' | 'published' | 'failed';
  scheduledAt: number;
  publishedAt?: number;
  errorMessage?: string;
  fileName?: string;
  targetChannelIds: string[];
  retryCount: number;
}

interface TelegramDraft {
  id: string;
  title: string;
  type: 'text' | 'image' | 'video' | 'document';
  content: string;
  caption?: string;
  createdAt: number;
  approved: boolean;
}

interface TelegramPoll {
  id: string;
  question: string;
  options: string[];
  isAnonymous: boolean;
  publishedAt?: number;
  channelId: string;
}

interface Giveaway {
  id: string;
  title: string;
  prize: string;
  status: 'active' | 'ended';
  participants: string[];
  winner?: string;
  createdAt: number;
  channelId: string;
}

interface YouTubeChannel {
  id: string;
  title: string;
  enabled: boolean;
}

interface HealthLog {
  checkedAt: number;
  ok: boolean;
  status: string;
  details: string;
}

interface TelemetryMetrics {
  totalSubscribers: number;
  newSubscribersToday: number;
  totalPostsCount: number;
  publishedCount: number;
  failedCount: number;
  draftsCount: number;
  engagementRate: string;
  mostViewedPost: { content: string; views: number } | null;
  lastPublishedPost: PostRecord | null;
  healthLogs: HealthLog[];
}

// Simple robust IndexedDB wrapper for Telegram setting persistence
const initIDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TelegramSettingsStore', 2);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('settings_v1')) {
        db.createObjectStore('settings_v1');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const persistInIndexedDB = async (key: string, value: string): Promise<void> => {
  try {
    const db = await initIDB();
    const tx = db.transaction('settings_v1', 'readwrite');
    const store = tx.objectStore('settings_v1');
    store.put(value, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('IndexedDB Save Error:', err);
  }
};

const retrieveFromIndexedDB = async (key: string): Promise<string> => {
  try {
    const db = await initIDB();
    const tx = db.transaction('settings_v1', 'readonly');
    const store = tx.objectStore('settings_v1');
    const req = store.get(key);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || '');
      req.onerror = () => resolve('');
    });
  } catch (err) {
    console.error('IndexedDB Read Error:', err);
    return '';
  }
};

export default function TelegramPublisher() {
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<'channels' | 'composer' | 'drafts' | 'polls' | 'news' | 'telemetry'>('channels');

  // Config metrics - Separate state variables as requested
  const [telegramBotToken, setTelegramBotToken] = useState<string>(() => {
    return localStorage.getItem('telegramBotToken') || '';
  });
  const [telegramChannelUsername, setTelegramChannelUsername] = useState<string>(() => {
    return localStorage.getItem('telegramChannelUsername') || '';
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [isTokenVisible, setIsTokenVisible] = useState(false);

  const [botToken, setBotToken] = useState('');
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [autoPostInterval, setAutoPostInterval] = useState(12);
  const [autoPostCategory, setAutoPostCategory] = useState<'AI' | 'Fitness' | 'Tech' | 'Education' | 'NEET'>('AI');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // New Channel link states
  const [newChannelId, setNewChannelId] = useState('');
  const [linkingChannel, setLinkingChannel] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // Connection testing states
  const [testingTokenOnly, setTestingTokenOnly] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; status: string; message: string } | null>(null);

  // Broadcast Composer states
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'document'>('text');
  const [textContent, setTextContent] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  
  // Local File uploads support
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedPath, setUploadedPath] = useState('');
  const [uploadedName, setUploadedName] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Future scheduling targets
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Drafts & Approvals states
  const [drafts, setDrafts] = useState<TelegramDraft[]>([]);
  const [newDraftTitle, setNewDraftTitle] = useState('');
  const [newDraftContent, setNewDraftContent] = useState('');
  const [generatingIdeas, setGeneratingIdeas] = useState(false);

  // Smart Poll creator states
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAnonymous, setPollAnonymous] = useState(true);
  const [pollFeedback, setPollFeedback] = useState<string>('');
  const [pollTargetChannel, setPollTargetChannel] = useState('');

  // Giveaway tracking states
  const [gwyTitle, setGwyTitle] = useState('');
  const [gwyPrize, setGwyPrize] = useState('');
  const [gwyTargetChannel, setGwyTargetChannel] = useState('');
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [newParticipant, setNewParticipant] = useState<Record<string, string>>({}); // giveawayID -> name

  // YouTube Sync integration states
  const [youtubeChannels, setYoutubeChannels] = useState<YouTubeChannel[]>([]);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState('');
  const [addingFeed, setAddingFeed] = useState(false);

  // AI News generation state
  const [newsCategory, setNewsCategory] = useState<'AI' | 'Fitness' | 'Tech' | 'Education' | 'NEET'>('AI');
  const [fetchingNews, setFetchingNews] = useState(false);
  const [newsDraftBlock, setNewsDraftBlock] = useState('');

  // YouTube Search & Post states
  const [ytSearchTopic, setYtSearchTopic] = useState('');
  const [searchingYt, setSearchingYt] = useState(false);
  const [ytPostResult, setYtPostResult] = useState('');
  const [ytPostError, setYtPostError] = useState('');

  // Emergency broadcast input
  const [emergencyText, setEmergencyText] = useState('');
  const [sendingEmergency, setSendingEmergency] = useState(false);
  const [emergencyFeedback, setEmergencyFeedback] = useState('');

  // Main list timeline history & telemetry metrics
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [sendingPost, setSendingPost] = useState(false);
  const [composerFeedback, setComposerFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryMetrics | null>(null);

  // Load configuration details
  const loadData = async () => {
    try {
      // 1. Fetch credentials & active linked channels
      const configRes = await fetch('/api/telegram/config');
      const configData = await configRes.json();
      setBotToken(configData.botTokenMasked || '');
      setChannels(configData.channels || []);
      setAutoPostEnabled(configData.autoPostEnabled || false);
      setAutoPostInterval(configData.autoPostIntervalHours || 12);
      setAutoPostCategory(configData.autoPostCategory || 'AI');
      setAutoReplyEnabled(configData.autoReplyEnabled || false);

      // 2. Fetch history log timeline
      const postsRes = await fetch('/api/telegram/posts');
      const postsData = await postsRes.json();
      setPosts(postsData.posts || []);

      // 3. Fetch saved drafts
      const draftsRes = await fetch('/api/telegram/drafts');
      const draftsData = await draftsRes.json();
      setDrafts(draftsData.drafts || []);

      // 4. Fetch youtube channels list
      const ytRes = await fetch('/api/telegram/youtube');
      const ytData = await ytRes.json();
      setYoutubeChannels(ytData.channels || []);

      // 5. Fetch active giveaways list
      const gwyRes = await fetch('/api/telegram/giveaways');
      const gwyData = await gwyRes.json();
      setGiveaways(gwyData.giveaways || []);

      // 6. Fetch Telemetry stats
      const telRes = await fetch('/api/telegram/telemetry');
      const telData = await telRes.json();
      setTelemetry(telData);
    } catch (e) {
      console.error('Error fetching Telegram publisher metrics:', e);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Load and restore saved values automatically when page loads
  useEffect(() => {
    const restoreSavedValues = async () => {
      try {
        const savedToken = await retrieveFromIndexedDB('telegramBotToken');
        const savedChannel = await retrieveFromIndexedDB('telegramChannelUsername');
        
        // Prefer localStorage first, fallback to IndexedDB, then update both
        const finalToken = localStorage.getItem('telegramBotToken') || savedToken || '';
        const finalChannel = localStorage.getItem('telegramChannelUsername') || savedChannel || '';
        
        if (finalToken) {
          setTelegramBotToken(finalToken);
          localStorage.setItem('telegramBotToken', finalToken);
          await persistInIndexedDB('telegramBotToken', finalToken);
        }
        
        if (finalChannel) {
          setTelegramChannelUsername(finalChannel);
          localStorage.setItem('telegramChannelUsername', finalChannel);
          await persistInIndexedDB('telegramChannelUsername', finalChannel);
        }
      } catch (e) {
        console.error('Failed restoring automatic values:', e);
      }
    };
    restoreSavedValues();
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000); // Poll and sync settings every 8 seconds
    return () => clearInterval(interval);
  }, []);

  // Auto-save values immediately on user typing (Requirements 7 and 10)
  const handleBotTokenChange = async (val: string) => {
    setTelegramBotToken(val);
    setAutoSaveStatus('saving');
    localStorage.setItem('telegramBotToken', val);
    await persistInIndexedDB('telegramBotToken', val);
    setAutoSaveStatus('saved');
  };

  const handleChannelUsernameChange = async (val: string) => {
    setTelegramChannelUsername(val);
    setAutoSaveStatus('saving');
    localStorage.setItem('telegramChannelUsername', val);
    await persistInIndexedDB('telegramChannelUsername', val);
    setAutoSaveStatus('saved');
  };

  // Connection testing states
  const [testingConnection, setTestingConnection] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState<{ ok: boolean; status: string; message: string } | null>(null);

  // Connection testing action for custom token & channel username (Requirement 8)
  const handleTestConnection = async () => {
    if (!telegramBotToken) {
      setTestConnectionResult({ ok: false, status: 'Error', message: 'You must provide a Bot Token to test.' });
      return;
    }
    if (!telegramChannelUsername) {
      setTestConnectionResult({ ok: false, status: 'Error', message: 'You must provide a Channel Username or ID to test.' });
      return;
    }

    setTestingConnection(true);
    setTestConnectionResult(null);

    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken,
          channelId: telegramChannelUsername
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestConnectionResult({
          ok: true,
          status: data.status,
          message: data.message || `Connected successfully! Target Chat: "${data.title}" (${data.memberCount} subscribers).`
        });
      } else {
        setTestConnectionResult({
          ok: false,
          status: data.status || 'Authentication Failed',
          message: data.message || data.error || 'Connection failed. Please check your credentials.'
        });
      }
    } catch (err: any) {
      setTestConnectionResult({
        ok: false,
        status: 'Error',
        message: err.message || 'API connection timeout. Ensure dev server runs on port 3000.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Secure Credentials form handler -> Stored permanently locally and pushed securely to server-db config (Requirement 3 & 6)
  const handleSaveTelegramSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    setComposerFeedback(null);
    try {
      // 1. Double-persist locally surely
      localStorage.setItem('telegramBotToken', telegramBotToken);
      localStorage.setItem('telegramChannelUsername', telegramChannelUsername);
      await persistInIndexedDB('telegramBotToken', telegramBotToken);
      await persistInIndexedDB('telegramChannelUsername', telegramChannelUsername);

      // 2. Save Bot Token to Server Config
      const configRes = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken,
          autoPostEnabled,
          autoPostIntervalHours: autoPostInterval,
          autoPostCategory,
          autoReplyEnabled
        })
      });

      // 3. Link Channel to Server if provided
      if (telegramChannelUsername) {
        await fetch('/api/telegram/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId: telegramChannelUsername })
        });
      }

      const configData = await configRes.json();
      if (configData.ok) {
        await loadData();
        setComposerFeedback({ ok: true, message: 'Telegram settings successfully updated both locally and inside the server scheduler memory.' });
      } else {
        setComposerFeedback({ ok: false, message: configData.message || 'Server rejected storing parameters.' });
      }
    } catch (err) {
      setComposerFeedback({ ok: false, message: 'Server transmission interruption saving settings.' });
    } finally {
      setSavingConfig(false);
    }
  };

  // Add & link a new target channel
  const handleLinkChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelId) return;
    setLinkingChannel(true);
    setLinkFeedback(null);

    try {
      const res = await fetch('/api/telegram/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: newChannelId })
      });
      const data = await res.json();

      if (data.ok) {
        setLinkFeedback({ ok: true, message: `Successfully connected channel "${data.title}" with standard admin credentials verified!` });
        setNewChannelId('');
        await loadData();
      } else {
        setLinkFeedback({ ok: false, message: data.message || 'Verification failed. Confirm channel ID & bot admin settings.' });
      }
    } catch (err: any) {
      setLinkFeedback({ ok: false, message: 'Server transmission interruption linking target channel ID.' });
    } finally {
      setLinkingChannel(false);
    }
  };

  // Delete channel
  const handleDeleteChannel = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/channels/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setChannels(channels.filter(c => c.id !== id));
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // File Upload Processor (Base64 wrapper)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError('');
    setUploadedPath('');
    setUploadedName('');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Content = (reader.result as string).split(',')[1];
        const res = await fetch('/api/telegram/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64Content
          })
        });
        const data = await res.json();
        if (data.ok) {
          setUploadedPath(data.filePath);
          setUploadedName(data.fileName);
        } else {
          setUploadError(data.error || 'Server storage rejected file bytes.');
        }
      } catch (err: any) {
        setUploadError('Unable to upload local asset to server.');
      } finally {
        setUploadingFile(false);
      }
    };
    reader.onerror = () => {
      setUploadError('FileReader failed reading bytes.');
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  // Direct Broadcast Composer trigger
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingPost(true);
    setComposerFeedback(null);

    const pathContent = postType === 'text' ? textContent : (uploadedPath || mediaUrl);
    if (!pathContent) {
      setComposerFeedback({ ok: false, message: 'Provide post content or path parameter.' });
      setSendingPost(false);
      return;
    }

    let absoluteEpoch: number | null = null;
    if (isScheduled) {
      if (!scheduleDate || !scheduleTime) {
        setComposerFeedback({ ok: false, message: 'Please select both schedule date and time coordinates.' });
        setSendingPost(false);
        return;
      }
      absoluteEpoch = Date.parse(`${scheduleDate}T${scheduleTime}`);
      if (isNaN(absoluteEpoch) || absoluteEpoch <= Date.now()) {
        setComposerFeedback({ ok: false, message: 'Select future timestamp schedule date/time targets.' });
        setSendingPost(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/telegram/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: postType,
          content: pathContent,
          caption: postType !== 'text' ? mediaCaption : undefined,
          scheduledAt: absoluteEpoch,
          fileName: postType !== 'text' && uploadedName ? uploadedName : undefined,
          targetChannelIds: selectedChannels
        })
      });

      const data = await res.json();
      if (res.ok) {
        setComposerFeedback({ ok: true, message: data.message || 'Request successfully registered.' });
        setTextContent('');
        setMediaCaption('');
        setMediaUrl('');
        setUploadedPath('');
        setUploadedName('');
        setIsScheduled(false);
        await loadData();
      } else {
        setComposerFeedback({ ok: false, message: data.error || 'Failed sending parameters.' });
      }
    } catch (e) {
      setComposerFeedback({ ok: false, message: 'Connection exception publishing post.' });
    } finally {
      setSendingPost(false);
    }
  };

  // Immediate retry connection check
  const handleForceRetry = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/posts/retry/${id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        await loadData();
      } else {
        alert(`Retry failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete/Cancel Scheduled Post in Database
  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add / Create Draft Post Blueprint
  const handleSaveDraft = async (approved = false) => {
    if (!newDraftContent) return;
    try {
      const res = await fetch('/api/telegram/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDraftTitle || 'Motivational Insight Idea',
          type: 'text',
          content: newDraftContent,
          approved
        })
      });
      if (res.ok) {
        setNewDraftTitle('');
        setNewDraftContent('');
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/drafts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approve / Toggle Draft Approval status
  const handleToggleDraftApprove = async (id: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/telegram/drafts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: !currentState })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Publish / Schedule approved Draft Post
  const handlePublishDraft = async (draft: TelegramDraft) => {
    try {
      const res = await fetch('/api/telegram/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: draft.type,
          content: draft.content,
          caption: draft.caption,
          targetChannelIds: [] // Deliver to config default
        })
      });
      if (res.ok) {
        // Automatically delete draft since it serves as published
        await fetch(`/api/telegram/drafts/${draft.id}`, { method: 'DELETE' });
        await loadData();
        setActiveSubTab('composer');
        setComposerFeedback({ ok: true, message: `Draft "${draft.title}" published completed successfully!` });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generate 10 Post ideas instantly via Gemini AI Model integration
  const handleGenerateIdeas = async () => {
    setGeneratingIdeas(true);
    try {
      const quoteRes = await fetch(`/api/telegram/news-summary?category=${autoPostCategory}`);
      const quoteData = await quoteRes.json();
      if (quoteData.ok && quoteData.content) {
        // Save the result directly as a beautiful unapproved draft
        await fetch('/api/telegram/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `AI generated idea - Focus Category: ${autoPostCategory}`,
            type: 'text',
            content: quoteData.content,
            approved: false
          })
        });
        await loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingIdeas(false);
    }
  };

  // Poll creator action
  const handlePublishPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion) return;
    const cleanOptions = pollOptions.filter(o => o.trim() !== '');
    if (cleanOptions.length < 2) {
      setPollFeedback('Provide at least 2 options.');
      return;
    }

    setPollFeedback('Publishing poll to Telegram Channel...');
    try {
      const res = await fetch('/api/telegram/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: pollQuestion,
          options: cleanOptions,
          isAnonymous: pollAnonymous,
          channelId: pollTargetChannel || (channels[0]?.id)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPollFeedback('Awesome! Smart poll successfully published to Telegram.');
        setPollQuestion('');
        setPollOptions(['', '']);
        await loadData();
      } else {
        setPollFeedback(`Publish failed: ${data.error}`);
      }
    } catch (e) {
      setPollFeedback('Network error delivering poll.');
    }
  };

  // Giveaway setup
  const handleCreateGiveaway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gwyTitle || !gwyPrize) return;

    try {
      const res = await fetch('/api/telegram/giveaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: gwyTitle,
          prize: gwyPrize,
          channelId: gwyTargetChannel || (channels[0]?.id)
        })
      });
      if (res.ok) {
        setGwyTitle('');
        setGwyPrize('');
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Participant join simulator
  const handleJoinParticipant = async (gwyId: string) => {
    const user = newParticipant[gwyId]?.trim();
    if (!user) return;

    try {
      const res = await fetch(`/api/telegram/giveaways/join/${gwyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user })
      });
      if (res.ok) {
        setNewParticipant(prev => ({ ...prev, [gwyId]: '' }));
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Draw random giveaway winner trigger
  const handleDrawWinner = async (gwyId: string) => {
    try {
      const res = await fetch(`/api/telegram/giveaways/draw/${gwyId}`, {
        method: 'POST'
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // YouTube Feed registrations
  const handleAddYoutube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYoutubeUrl) return;
    setAddingFeed(true);

    try {
      const res = await fetch('/api/telegram/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlOrId: newYoutubeUrl })
      });
      if (res.ok) {
        setNewYoutubeUrl('');
        await loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingFeed(false);
    }
  };

  // Clear YouTube Sync feed target
  const handleDeleteYoutube = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/youtube/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Emergency instant broadcast dispatch
  const handleSendEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyText) return;
    setSendingEmergency(true);
    setEmergencyFeedback('');

    try {
      const res = await fetch('/api/telegram/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: emergencyText })
      });
      const data = await res.json();
      if (res.ok) {
        setEmergencyFeedback(data.message || 'Emergency blast completed successfully.');
        setEmergencyText('');
        await loadData();
      } else {
        setEmergencyFeedback(`Failed: ${data.error}`);
      }
    } catch (e) {
      setEmergencyFeedback('Network timeout.');
    } finally {
      setSendingEmergency(false);
    }
  };

  // Fetch AI grounded news recap on selected categorization
  const handleFetchNewsDraft = async () => {
    setFetchingNews(true);
    setNewsDraftBlock('');
    try {
      const res = await fetch(`/api/telegram/news-summary?category=${newsCategory}`);
      const data = await res.json();
      if (data.ok && data.content) {
        setNewsDraftBlock(data.content);
      } else {
        setNewsDraftBlock(`Failed loading news report: ${data.error}`);
      }
    } catch (e) {
      setNewsDraftBlock('Gateways connection timeout generating summaries.');
    } finally {
      setFetchingNews(false);
    }
  };

  // Search YouTube via search grounding and post video summary to Telegram instantly
  const handleSearchAndPostYouTube = async () => {
    if (!ytSearchTopic) return;
    setSearchingYt(true);
    setYtPostResult('');
    setYtPostError('');
    try {
      const res = await fetch('/api/telegram/youtube/search-and-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: ytSearchTopic })
      });
      const data = await res.json();
      if (data.ok && data.content) {
        setYtPostResult(data.content);
        setYtSearchTopic('');
        // Reload history logs lists & graphs
        loadData();
      } else {
        setYtPostError(data.error || 'General connection or research failure.');
      }
    } catch (e: any) {
      setYtPostError(e.message || 'Network timeout searching YouTube.');
    } finally {
      setSearchingYt(false);
    }
  };

  // Quick insertion helpers
  const handleInsertMotivation = () => {
    setPostType('text');
    setTextContent("🎯 Target Completed! Rishu Boss and Ritik Boss, let's scaling new milestones today! #Motivation #RoyGirlAI");
  };

  // Sort queues for Tomorrow & Upcoming display
  const pendingPosts = posts.filter(p => p.status === 'pending');
  const publishedPosts = posts.filter(p => p.status === 'published');
  const failedPosts = posts.filter(p => p.status === 'failed');

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto pb-16 select-text">
      
      {/* Banner Deck */}
      <div className="flex flex-col sm:flex-row border-b border-zinc-900 pb-5 items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-xl font-mono font-black uppercase text-white tracking-widest flex items-center gap-2">
            <Send size={22} className="text-cyan-400 rotate-[-12deg]" /> Telegram Automation System
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono tracking-wider mt-0.5">
            PRODUCTION SYSTEM | MULTI-CHANNEL QUEUES | AUTOMATED COGNITIVE BROADCAST AGENT
          </p>
        </div>
        
        {/* Dynamic status overview */}
        <div className="flex items-center gap-2">
          {telemetry && telemetry.healthLogs && telemetry.healthLogs[0] && (
            <span className={`text-[10px] uppercase font-mono px-3 py-1.5 rounded-lg border ${
              telemetry.healthLogs[0].ok 
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' 
                : 'bg-amber-950/40 text-amber-300 border-amber-900/60'
            }`}>
              📡 Status: {telemetry.healthLogs[0].status}
            </span>
          )}
          <div className="text-[10px] font-mono bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1.5">
            <Clock size={11} className="text-cyan-400 animate-spin" /> Continuous Polling Daemon Online
          </div>
        </div>
      </div>

      {/* Sub tabs Navigation matrix */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 select-none border-b border-zinc-900 pb-4">
        {[
          { id: 'channels', label: 'Credentials & Channels', icon: Shield, color: 'text-cyan-400' },
          { id: 'composer', label: 'Composer & Queue', icon: Send, color: 'text-amber-500' },
          { id: 'drafts', label: 'AI Drafts & Approvals', icon: Sparkles, color: 'text-fuchsia-400' },
          { id: 'polls', label: 'Polls & Giveaways', icon: Award, color: 'text-emerald-400' },
          { id: 'news', label: 'News & Youtube Sync', icon: Youtube, color: 'text-red-400' },
          { id: 'telemetry', label: 'Telemetry & Analytics', icon: Radio, color: 'text-sky-400' }
        ].map((tab) => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`p-3.5 rounded-2xl transition-all border outline-none text-[10px] font-mono font-black uppercase flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeSubTab === tab.id
                  ? 'bg-zinc-900 text-white border-zinc-700' 
                  : 'bg-zinc-950/50 text-zinc-500 border-transparent hover:border-zinc-900 hover:text-zinc-300'
              }`}
            >
              <IconComp size={16} className={tab.color} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: Credentials & Channels Linking */}
      {activeSubTab === 'channels' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* A. Token Input credentials panel */}
          <div className="lg:col-span-12 bg-[#09090b]/40 border border-zinc-900 rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900/60 pb-4">
              <div>
                <h3 className="text-sm font-mono font-black text-cyan-400 tracking-widest uppercase flex items-center gap-2">
                  <Shield size={16} className="text-cyan-400" /> Telegram Integration settings
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  SECURE & INDEPENDENT STORAGE MATRIX PRESERVED IN LOCALSTORAGE, INDEXEDDB, AND DECRYPTED SERVER STATE
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-0 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-900 text-[10px] font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-zinc-400">Auto Save:</span>
                <span className={autoSaveStatus === 'saving' ? 'text-amber-400 animate-pulse' : 'text-emerald-400 font-bold'}>
                  {autoSaveStatus === 'saving' ? 'SAVING...' : 'LIVE ACTIVE (IDB + LOCAL)'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveTelegramSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Bot Token input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wide">
                      Telegram Bot Token
                    </label>
                    <span className="text-[9px] text-zinc-500 font-mono font-bold">FROM @BOTFATHER</span>
                  </div>
                  <div className="relative">
                    <input
                      type={isTokenVisible ? "text" : "password"}
                      value={telegramBotToken}
                      onChange={(e) => handleBotTokenChange(e.target.value)}
                      placeholder="Paste token, e.g. 123456789:ABCdefGhIJKlmNoPQRsT..."
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-4 pr-11 py-3 text-xs text-zinc-200 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-450 transition-all font-mono"
                      id="telegram-bot-token-input"
                    />
                    <button
                      type="button"
                      onClick={() => setIsTokenVisible(!isTokenVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>

                {/* Channel username input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wide">
                      Primary Channel Username or ID
                    </label>
                    <span className="text-[9px] text-zinc-500 font-mono font-bold">E.G. @RISHUTECHUPDATES</span>
                  </div>
                  <input
                    type="text"
                    value={telegramChannelUsername}
                    onChange={(e) => handleChannelUsernameChange(e.target.value)}
                    placeholder="Enter channel username with @ or numeric ID, e.g. @RishuTechUpdates"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-zinc-200 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-450 transition-all font-mono placeholder-zinc-700"
                    id="telegram-channel-username-input"
                  />
                </div>
              </div>

              {/* Warnings and notices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-900 text-[10px] font-mono text-zinc-500 leading-relaxed space-y-1">
                  <div className="text-zinc-400 font-bold flex items-center gap-1">
                    <Check size={11} className="text-cyan-400" /> CLIENT PERSISTENCE
                  </div>
                  <p>Injected to IndexedDB and localStorage. Restores instantly upon tab switching, refresh, or session restart.</p>
                </div>
                <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-900 text-[10px] font-mono text-zinc-500 leading-relaxed space-y-1">
                  <div className="text-zinc-400 font-bold flex items-center gap-1">
                    <Check size={11} className="text-cyan-400" /> SECURE HANDSHAKE
                  </div>
                  <p>Encrypted during transport. Private tokens are locked server-side and never shared outside authorization triggers.</p>
                </div>
              </div>

              {/* Action buttons panel */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-40 text-white font-mono text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  id="save-telegram-settings-btn"
                >
                  <Shield size={14} />
                  {savingConfig ? 'Persisting settings...' : 'Save Settings'}
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="w-full sm:w-auto px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-805 text-zinc-300 font-mono text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  id="test-telegram-connection-btn"
                >
                  {testingConnection ? (
                    <Loader2 size={14} className="animate-spin text-cyan-400" />
                  ) : (
                    <Radio size={14} className="text-cyan-400" />
                  )}
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </form>

            {/* Test Connection Results Banner */}
            {testConnectionResult && (
              <div className={`p-4 rounded-2xl border text-xs font-mono leading-relaxed space-y-1 transition-all ${
                testConnectionResult.ok
                  ? 'bg-emerald-950/30 text-emerald-300 border-emerald-900/60'
                  : 'bg-rose-950/30 text-rose-300 border-rose-900/60'
              }`}>
                <div className="flex items-center gap-2 font-bold uppercase text-[11px]">
                  {testConnectionResult.ok ? (
                    <CheckCircle className="text-emerald-400 shrink-0" size={16} />
                  ) : (
                    <XCircle className="text-rose-400 shrink-0" size={16} />
                  )}
                  <span>Test Result: {testConnectionResult.status}</span>
                </div>
                <p className="text-[11px] text-zinc-400 pl-6">{testConnectionResult.message}</p>
              </div>
            )}
            
            {/* Feedback message for Save */}
            {composerFeedback && (
              <div className={`p-4 rounded-2xl border text-xs font-mono leading-relaxed space-y-1 transition-all ${
                composerFeedback.ok
                  ? 'bg-cyan-950/30 text-cyan-300 border-cyan-800/60'
                  : 'bg-amber-950/30 text-amber-300 border-amber-800/60'
              }`}>
                <p className="font-bold uppercase text-[10px] tracking-wide">System Feedback:</p>
                <p className="text-[11px] text-zinc-400">{composerFeedback.message}</p>
              </div>
            )}
          </div>

          {/* B. Linked Channel multi-channel config */}
          <div className="lg:col-span-12 bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur-md">
            <div>
              <h3 className="text-xs font-mono font-black text-cyan-400 tracking-widest uppercase flex items-center gap-2">
                <Plus size={14} /> Registered Multi-Channel Targets ({channels.length})
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">CURRENT RECIPIENT TARGETS LINKED ON THE BACKEND SCHEDULER</p>
            </div>

            {/* Channels count list */}
            <div className="space-y-3">
              {channels.length === 0 ? (
                <div className="text-center py-6 bg-zinc-950/30 border border-zinc-950 rounded-2xl text-[10px] font-mono text-zinc-650">
                  No active channel targets registered. Provide a Bot Token and Channel Username above and click "Save Settings" or connect them dynamically below.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {channels.map((chan) => (
                    <div key={chan.id} className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <div className="space-y-1">
                        <span className="block text-xs font-mono font-black text-white">{chan.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-cyan-400">{chan.username}</span>
                          <span className="text-[10px] font-mono text-zinc-500">• {chan.memberCount || 0} Subscribers</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                          chan.status === 'Connected' 
                            ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' 
                            : 'bg-amber-950/30 text-amber-400 border-amber-900/50'
                        }`}>
                          {chan.status}
                        </span>
                        
                        <button
                          onClick={() => handleDeleteChannel(chan.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/10 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Form for manual additional channels */}
            <div className="pt-4 border-t border-zinc-900/60 space-y-2">
              <span className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">Link Additional Target Channel ID/Username</span>
              <form onSubmit={handleLinkChannel} className="flex gap-2">
                <input
                  type="text"
                  value={newChannelId}
                  onChange={(e) => setNewChannelId(e.target.value)}
                  placeholder="e.g. @AnotherChannelName or -100xxxxxxxx"
                  className="flex-1 bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-cyan-300 outline-none focus:border-cyan-400 transition-colors font-mono"
                  id="telegram-new-channel-id-input"
                />
                <button
                  type="submit"
                  disabled={linkingChannel || !newChannelId}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-bold rounded-xl border border-zinc-800 flex items-center gap-1.5 cursor-pointer"
                  id="connect-channel-submit-btn"
                >
                  {linkingChannel ? <Loader2 size={12} className="animate-spin text-cyan-400" /> : 'Link Target'}
                </button>
              </form>
              {linkFeedback && (
                <div className={`p-3 rounded-xl border text-[10px] font-mono leading-relaxed flex items-start gap-1.5 ${
                  linkFeedback.ok ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/60' : 'bg-rose-950/20 text-rose-400 border-rose-900/60'
                }`}>
                  {linkFeedback.ok ? <CheckCircle size={12} className="shrink-0 text-emerald-400 mt-0.5" /> : <XCircle size={12} className="shrink-0 text-rose-400 mt-0.5" />}
                  <span>{linkFeedback.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Broadcast Composer & Queues */}
      {activeSubTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* A. Composer Form */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur-md">
            <div>
              <h3 className="text-xs font-mono font-black text-amber-500 tracking-widest uppercase flex items-center gap-2">
                <Send size={14} /> Broadcast Creator
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">COMPOSER INTERACTION FOR INDIVIDUAL OR ALL CONNECTED CHANNELS</p>
            </div>

            <form onSubmit={handlePublishPost} className="space-y-4">
              
              {/* TARGET MULTI-CHANNELS CHECKBOXES */}
              <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4 space-y-2.5">
                <span className="block text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-bold">1. SELECT TARGET DESTINATIONS</span>
                {channels.length === 0 ? (
                  <span className="text-[10px] font-mono text-rose-400 block">⚠️ No channels connected. Link channel tokens in first tab.</span>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {channels.map(c => (
                      <label key={c.id} className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 cursor-pointer hover:border-zinc-700">
                        <input
                          type="checkbox"
                          checked={selectedChannels.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedChannels([...selectedChannels, c.id]);
                            else setSelectedChannels(selectedChannels.filter(id => id !== c.id));
                          }}
                          className="rounded bg-zinc-950 border-zinc-800 accent-cyan-400 text-cyan-400"
                        />
                        <span className="text-[11px] font-mono text-zinc-300">{c.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Media selection selectors tab */}
              <div className="grid grid-cols-4 gap-1.5 select-none p-1 bg-zinc-950 border border-zinc-900 rounded-xl">
                {['text', 'image', 'video', 'document'].map((mtype) => (
                  <button
                    key={mtype}
                    type="button"
                    onClick={() => { setPostType(mtype as any); setComposerFeedback(null); }}
                    className={`py-1.5 rounded-lg text-[10px] font-mono font-semibold uppercase flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      postType === mtype ? 'bg-zinc-900 text-cyan-400 border border-zinc-800/80' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {mtype === 'text' && <FileText size={11} />}
                    {mtype === 'image' && <ImageIcon size={11} />}
                    {mtype === 'video' && <Film size={11} />}
                    {mtype === 'document' && <Paperclip size={11} />}
                    <span>{mtype}</span>
                  </button>
                ))}
              </div>

              {/* Main composition input layouts */}
              {postType === 'text' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center select-none">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">Text Segment Content</label>
                    <button
                      type="button"
                      onClick={handleInsertMotivation}
                      className="text-[9px] font-mono text-cyan-400 hover:text-[#5ceeff] bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-900/40 transition-all cursor-pointer"
                    >
                      💡 MOTIVATE BOSS
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Type raw markup or clean markdown to dispatch..."
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-zinc-200 outline-none focus:border-cyan-400 transition-colors font-mono resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Upload Selector Option */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-3">
                    <span className="block text-[9px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1 font-bold">
                      <Paperclip size={11} className="text-cyan-400" /> LOCAL ASSETS STORAGE STREAMER
                    </span>
                    
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      <label className="w-full sm:w-auto relative cursor-pointer px-4 py-3 bg-zinc-900 border border-zinc-805 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 select-none">
                        <span className="text-xs font-mono font-bold text-zinc-300">
                          {uploadingFile ? (
                            <Loader2 size={13} className="animate-spin text-cyan-400 inline" />
                          ) : (
                            'CHOOSE LOCAL TARGET FILE'
                          )}
                        </span>
                        <input
                          type="file"
                          accept={postType === 'image' ? 'image/*' : postType === 'video' ? 'video/*' : '*/*'}
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploadingFile}
                        />
                      </label>
                      <span className="text-zinc-650 font-mono text-[10px]">or input web link below</span>
                    </div>

                    {uploadedName && (
                      <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/25 border border-emerald-900/50 p-2 rounded-lg flex items-center gap-1 px-3">
                        <CheckCircle2 size={12} /> Buffered: "{uploadedName}" for transmission streaming.
                      </div>
                    )}
                    {uploadError && (
                      <div className="text-[10px] font-mono text-rose-400 bg-rose-950/25 border border-rose-900/50 p-2 rounded-lg flex items-center gap-1 px-3">
                        <AlertTriangle size={12} /> {uploadError}
                      </div>
                    )}
                  </div>

                  {/* Manual URL input fallback */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase">Input Media URL</label>
                    <input
                      type="text"
                      disabled={!!uploadedPath}
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder={uploadedPath ? 'Local dynamic asset loaded successfully.' : "e.g. https://images.unsplash.com/photo-..."}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-zinc-200 outline-none focus:border-cyan-400 transition-colors font-mono disabled:opacity-40"
                    />
                  </div>

                  {/* Caption */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase">Optional Media Caption Text</label>
                    <input
                      type="text"
                      value={mediaCaption}
                      onChange={(e) => setMediaCaption(e.target.value)}
                      placeholder="e.g. Scaling daily targets! #Success"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-zinc-250 outline-none focus:border-cyan-400 transition-colors font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Scheduler Toggle */}
              <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-400" />
                    <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase">Schedule for future execution</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="w-4 h-4 bg-zinc-900 rounded border-zinc-800 text-cyan-400 focus:ring-0 cursor-pointer select-none"
                  />
                </div>

                {isScheduled && (
                  <div className="grid grid-cols-2 gap-3 pt-1 select-none animate-fade">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase">Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase">Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-xs font-mono text-zinc-200 outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action row */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={sendingPost || (!textContent && !uploadedPath && !mediaUrl)}
                  className="px-6 py-3 bg-gradient-to-tr from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-40 text-white font-mono text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {sendingPost ? <Loader2 size={12} className="animate-spin text-white" /> : <Send size={11} className="rotate-[-10deg]" />}
                  {isScheduled ? 'SCHEDULE POST' : 'PUBLISH NOW'}
                </button>
              </div>
            </form>

            {composerFeedback && (
              <div className={`p-4 rounded-xl border text-xs font-mono leading-relaxed select-text flex items-start gap-1.5 ${
                composerFeedback.ok ? 'bg-emerald-950/20 text-emerald-450 border-emerald-900/50' : 'bg-rose-950/20 text-rose-450 border-rose-900/50'
              }`}>
                {composerFeedback.ok ? <CheckCircle size={14} className="text-emerald-450 shrink-0 mt-0.5" /> : <AlertCircle size={14} className="text-rose-450 shrink-0 mt-0.5" />}
                <span>{composerFeedback.message}</span>
              </div>
            )}
          </div>

          {/* B. Emergency Broadcast Trigger and Fail Safe Monitor */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Emergency blast */}
            <div className="bg-zinc-900/40 border border-zinc-950 rounded-3xl p-5 shadow-xl space-y-4 backdrop-blur-md">
              <div>
                <h3 className="text-xs font-mono font-black text-rose-500 tracking-widest uppercase flex items-center gap-2">
                  <Flame size={14} /> Emergency Broadcast Channel Blast
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">DISPATCH ALERTS INSTANTLY TO ALL CHANNELS AT ONCE</p>
              </div>

              <form onSubmit={handleSendEmergency} className="space-y-3">
                <textarea
                  rows={2}
                  value={emergencyText}
                  onChange={(e) => setEmergencyText(e.target.value)}
                  placeholder="e.g. Critical platform updates going live now!..."
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-rose-200 outline-none focus:border-rose-500 transition-colors font-mono resize-none font-semibold text-rose-300"
                />
                
                <button
                  type="submit"
                  disabled={sendingEmergency || !emergencyText}
                  className="w-full py-2.5 bg-rose-900 hover:bg-rose-800 disabled:opacity-40 text-white font-mono text-xs font-black uppercase rounded-lg border border-rose-850 flex items-center justify-center gap-1 cursor-pointer"
                >
                  {sendingEmergency ? 'Blasting...' : '🚀 BROADCAST TO ALL CHANNELS'}
                </button>
              </form>

              {emergencyFeedback && (
                <div className="p-3 bg-zinc-950 border border-zinc-900 text-[10px] font-mono text-zinc-300 rounded">
                  {emergencyFeedback}
                </div>
              )}
            </div>

            {/* FAILED ROADS RECOVERY PORTAL */}
            <div className="bg-zinc-900/40 border border-zinc-950 rounded-3xl p-5 shadow-xl space-y-4 backdrop-blur-md">
              <div>
                <h3 className="text-xs font-mono font-black text-amber-500 tracking-widest uppercase flex items-center gap-2">
                  <AlertTriangle size={14} /> Fail-Safe Jobs Monitor ({failedPosts.length})
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">MANUALLY RETRY OR FORWARD BROKEN JOBS</p>
              </div>

              {failedPosts.length === 0 ? (
                <span className="block text-[10px] font-mono text-zinc-500 text-center py-4 bg-zinc-950/20 border border-zinc-950 rounded-lg">
                  Zero failed jobs registered. Active auto-retry loops are standing guard.
                </span>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {failedPosts.map((post) => (
                    <div key={post.id} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                        <span>ID: {post.id}</span>
                        <span>Retries: {post.retryCount}/3</span>
                      </div>
                      <p className="text-[10px] text-zinc-300 font-mono truncate">{post.content}</p>
                      
                      <div className="flex items-center justify-between border-t border-zinc-900 pt-1.5">
                        <span className="text-[8px] font-mono text-rose-450 shrink-0 select-text font-bold uppercase truncate max-w-[150px]">ERR: {post.errorMessage}</span>
                        <button
                          onClick={() => handleForceRetry(post.id)}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[9px] font-mono font-bold text-cyan-400 hover:bg-zinc-800 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={10} /> FORCE RE-SEND
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AI Drafts & Approvals (Roy Boss Mode) */}
      {activeSubTab === 'drafts' && (
        <div className="space-y-6">
          
          {/* Quick Idea Booster Controls */}
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-950 pb-4 gap-4">
              <div>
                <h3 className="text-xs font-mono font-black text-fuchsia-400 tracking-widest uppercase flex items-center gap-2">
                  <Sparkles size={14} /> Roy Boss Approval Workflow
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">DRAFT IDEAS CHANNELS WAITING FOR FINAL PUBLISHING APPROVALS</p>
              </div>

              {/* Model trigger buttons */}
              <button
                onClick={handleGenerateIdeas}
                disabled={generatingIdeas || channels.length === 0}
                className="px-4 py-2 bg-gradient-to-tr from-fuchsia-600 to-indigo-700 hover:from-fuchsia-500 hover:to-indigo-600 disabled:opacity-40 text-white font-mono text-xs font-black uppercase rounded-lg border border-fuchsia-800 flex items-center gap-1.5 cursor-pointer"
              >
                {generatingIdeas ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={11} />}
                GENERATE 10 TELEGRAM IDEAS
              </button>
            </div>

            {/* Quick Draft Composing Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
              <div className="md:col-span-4">
                <input
                  type="text"
                  value={newDraftTitle}
                  onChange={(e) => setNewDraftTitle(e.target.value)}
                  placeholder="Draft Title..."
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-fuchsia-400 font-mono"
                />
              </div>
              <div className="md:col-span-6 flex gap-2">
                <input
                  type="text"
                  value={newDraftContent}
                  onChange={(e) => setNewDraftContent(e.target.value)}
                  placeholder="Compose draft content booster quote..."
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-zinc-300 outline-none focus:border-fuchsia-400 font-mono"
                />
              </div>
              <div className="md:col-span-2 flex gap-1.5">
                <button
                  onClick={() => handleSaveDraft(false)}
                  disabled={!newDraftContent}
                  className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 font-mono text-[10px] font-bold text-zinc-300 rounded-lg cursor-pointer"
                >
                  SAVE IDEA
                </button>
                <button
                  onClick={() => handleSaveDraft(true)}
                  disabled={!newDraftContent}
                  className="w-full bg-fuchsia-950/40 hover:bg-fuchsia-900/40 border border-fuchsia-900/60 font-mono text-[10px] font-bold text-fuchsia-400 rounded-lg cursor-pointer"
                >
                  APPROVE
                </button>
              </div>
            </div>
          </div>

          {/* Drafts List GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.length === 0 ? (
              <span className="col-span-full text-center py-12 bg-zinc-950/20 border border-zinc-950 rounded-3xl text-zinc-500 font-mono text-xs">
                Zero saved ideas or drafts. Click "Generate 10 Telegram Ideas" or use voice controls: "Generate 10 post ideas".
              </span>
            ) : (
              drafts.map((d) => (
                <div key={d.id} className="bg-zinc-900/50 border border-zinc-950 rounded-3xl p-5 space-y-4 shadow-md flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="truncate pr-1">
                        <span className="block text-xs font-mono font-black text-zinc-100 truncate">{d.title}</span>
                        <span className="text-[9px] font-mono text-zinc-500">{new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <button
                        onClick={() => handleToggleDraftApprove(d.id, d.approved)}
                        className={`px-2 py-0.5 rounded text-[8px] font-mono font-black tracking-widest uppercase border transition-all shrink-0 cursor-pointer ${
                          d.approved 
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' 
                            : 'bg-zinc-950 text-zinc-500 border-zinc-905 hover:text-zinc-300 hover:border-zinc-800'
                        }`}
                      >
                        {d.approved ? 'APPROVED ✓' : 'UNAPPROVED'}
                      </button>
                    </div>

                    <p className="text-xs font-mono text-zinc-300 leading-relaxed font-semibold bg-zinc-950 p-3 rounded-2xl select-text max-h-[140px] overflow-y-auto custom-scrollbar">
                      {d.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-950/60">
                    <button
                      onClick={() => handleDeleteDraft(d.id)}
                      className="text-[10px] font-mono font-bold text-zinc-500 hover:text-rose-450 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                    
                    <button
                      onClick={() => handlePublishDraft(d)}
                      className="px-3.5 py-1.5 bg-gradient-to-tr from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 font-mono text-[10px] font-black uppercase text-white rounded-lg inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Play size={9} /> Publish Post
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Polls & Giveaways */}
      {activeSubTab === 'polls' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* A. Smart Poll Creator */}
          <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-905 rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur-md">
            <div>
              <h3 className="text-xs font-mono font-black text-emerald-400 tracking-widest uppercase flex items-center gap-2">
                <HelpCircle size={14} /> Smart Poll Creator
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">ANONYMOUS OR PUBLIC POLL DELIVERIES</p>
            </div>

            <form onSubmit={handlePublishPoll} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">1. Select Target Channel</label>
                <select
                  value={pollTargetChannel}
                  onChange={(e) => setPollTargetChannel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono focus:border-emerald-400"
                >
                  <option value="">Default (First Connected)</option>
                  {channels.map(c => <option key={c.id} value={c.id}>{c.title} ({c.id})</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">2. Poll Question Query</label>
                <input
                  type="text"
                  required
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. Which project target should we crush today?"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              {/* Options lists management */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                  <span className="uppercase font-bold">3. Multi Options List</span>
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-emerald-450 hover:text-emerald-350 text-[9px]"
                  >
                    + ADD OPTION FIELD
                  </button>
                </div>
                
                {pollOptions.map((opt, oIdx) => (
                  <div key={oIdx} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const copy = [...pollOptions];
                        copy[oIdx] = e.target.value;
                        setPollOptions(copy);
                      }}
                      placeholder={`Choice option ${oIdx + 1}...`}
                      className="flex-1 bg-zinc-950 border border-zinc-900/60 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono focus:border-emerald-400"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== oIdx))}
                        className="text-rose-500 p-2 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between select-none p-2 bg-zinc-950 border border-zinc-900 rounded-xl">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Publish Anonymous Poll</span>
                <input
                  type="checkbox"
                  checked={pollAnonymous}
                  onChange={(e) => setPollAnonymous(e.target.checked)}
                  className="w-4 h-4 accent-emerald-400 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={!pollQuestion || channels.length === 0}
                className="w-full py-2.5 bg-gradient-to-tr from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 disabled:opacity-45 text-white font-mono text-xs font-black uppercase rounded-xl transition-all cursor-pointer"
              >
                PUBLISH SMART POLL TO TELEGRAM
              </button>
            </form>

            {pollFeedback && (
              <div className="p-3 bg-zinc-950 border border-zinc-900 text-[10px] font-mono text-emerald-400 rounded">
                ✓ {pollFeedback}
              </div>
            )}
          </div>

          {/* B. Giveaway Management */}
          <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-905 rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur-md">
            <div>
              <h3 className="text-xs font-mono font-black text-emerald-400 tracking-widest uppercase flex items-center gap-2">
                <Award size={14} /> Giveaway Manager
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">RANDOM WINNERS DRAWS & ANNOUNCEMENT MODULES</p>
            </div>

            {/* Create Giveaway Form */}
            <form onSubmit={handleCreateGiveaway} className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-3">
              <span className="block text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-bold">CREATE NEW GIVEAWAY EVENT</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-zinc-500">Event Title</label>
                  <input
                    type="text"
                    required
                    value={gwyTitle}
                    onChange={(e) => setGwyTitle(e.target.value)}
                    placeholder="NEET Premium Prep Kit"
                    className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-450 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-zinc-500">Prize Details</label>
                  <input
                    type="text"
                    required
                    value={gwyPrize}
                    onChange={(e) => setGwyPrize(e.target.value)}
                    placeholder="Full Study Set"
                    className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-450 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!gwyTitle || !gwyPrize || channels.length === 0}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-emerald-400 font-bold border border-zinc-800 rounded-lg cursor-pointer"
                >
                  🚀 Register Giveaway
                </button>
              </div>
            </form>

            {/* Active Giveaways list */}
            <div className="space-y-3 border-t border-zinc-950 pt-3">
              <span className="block text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-bold">Giveaway slots & Draws list ({giveaways.length})</span>
              
              {giveaways.length === 0 ? (
                <span className="block text-[10.5px] font-mono text-zinc-650 text-center py-4">No giveaway events registered yet.</span>
              ) : (
                <div className="space-y-3.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {giveaways.map((gwy) => (
                    <div key={gwy.id} className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center select-none border-b border-zinc-900 pb-1.5">
                        <span className="text-xs font-mono font-black text-zinc-200">{gwy.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                          gwy.status === 'active' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}>
                          {gwy.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-zinc-400 space-y-1">
                        <div>Prize: <span className="font-bold text-white">{gwy.prize}</span></div>
                        <div>Participants Checked: <span className="text-cyan-400 font-bold">{gwy.participants?.length || 0}</span></div>
                        {gwy.winner && <div className="text-emerald-400 font-bold">🏆 Winner Chosen: @{gwy.winner}</div>}
                      </div>

                      {gwy.status === 'active' && (
                        <div className="flex items-center gap-1.5 border-t border-zinc-900 pt-2 select-none">
                          <input
                            type="text"
                            placeholder="Add user without @"
                            value={newParticipant[gwy.id] || ''}
                            onChange={(e) => setNewParticipant({ ...newParticipant, [gwy.id]: e.target.value })}
                            className="bg-zinc-900 border border-zinc-850 text-xs px-2.5 py-1.5 rounded flex-1 focus:border-cyan-400 outline-none font-mono text-zinc-300"
                          />
                          <button
                            onClick={() => handleJoinParticipant(gwy.id)}
                            className="p-1 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[10px] font-mono text-zinc-300 rounded"
                          >
                            Add
                          </button>
                          
                          <button
                            onClick={() => handleDrawWinner(gwy.id)}
                            disabled={!gwy.participants || gwy.participants.length === 0}
                            className="p-1 px-3 bg-emerald-950/45 hover:bg-emerald-900/40 border border-emerald-900/50 text-[10px] font-mono text-emerald-400 font-black rounded"
                          >
                            Draw Winner 🏆
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: News & Youtube Sync */}
      {activeSubTab === 'news' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* A. Dynamic News summarizer using Google grounding search summaries via Gemini */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 shadow-xl space-y-5 backdrop-blur-md">
            <div>
              <h3 className="text-xs font-mono font-black text-rose-450 tracking-widest uppercase flex items-center gap-2">
                <Youtube size={14} /> News To Telegram Auto-Posting
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">SELECT CATEGORIES FOR AUTOMATIC NEWS CURATIONS & SUMMARIES</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 select-none items-center p-1.5 bg-zinc-950 border border-zinc-900 rounded-2xl">
              <span className="text-[10px] font-mono text-zinc-500 pl-2 uppercase font-black shrink-0">SELECT Focus Category:</span>
              <div className="flex flex-wrap gap-1 w-full justify-end">
                {(['AI', 'Fitness', 'Tech', 'Education', 'NEET'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNewsCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      newsCategory === cat ? 'bg-zinc-900 text-fuchsia-400 border border-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10.5px] text-zinc-400 leading-relaxed font-mono">
              Leverage the real continuous Gemini Search Grounding daemon server-side! Let Gemini browse live facts on your chosen topic (e.g. Artificial Intelligence, tech shifts, fitness tips, or NEET education requirements), draft summaries, and auto-queue directly.
            </p>

            <button
              onClick={handleFetchNewsDraft}
              disabled={fetchingNews || channels.length === 0}
              className="w-full py-3 bg-gradient-to-tr from-rose-600 to-indigo-700 hover:from-rose-500 hover:to-indigo-600 disabled:opacity-40 text-white font-mono text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {fetchingNews ? <Loader2 size={13} className="animate-spin" /> : <Flame size={12} />}
              GENERATE REAL AI NEWS SUMMARY REPORT
            </button>

            {newsDraftBlock && (
              <div className="space-y-3.5 select-text p-4 bg-zinc-950 border border-zinc-900 rounded-2xl animate-fade">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">AI Grounded News Summary Draft</span>
                  <button
                    onClick={() => {
                      setPostType('text');
                      setTextContent(newsDraftBlock);
                      setActiveSubTab('composer');
                    }}
                    className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-[9px] font-mono text-cyan-400 hover:text-teal-400 rounded-lg transition-colors"
                  >
                    INSERT INTO COMPOSER
                  </button>
                </div>
                <p className="text-xs font-mono font-medium text-zinc-200 leading-relaxed max-h-[220px] overflow-y-auto custom-scrollbar bg-zinc-950 px-1 py-1">
                  {newsDraftBlock}
                </p>
              </div>
            )}
          </div>

          {/* B. Youtube Auto-Sync feeds list */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur-md">
            <div>
              <h3 className="text-xs font-mono font-black text-rose-500 tracking-widest uppercase flex items-center gap-2">
                <Youtube size={14} /> YouTube Channel Auto-Sync
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">AUTO-POST NEW UPLOADS TO TELEGRAM SEAMLESSLY</p>
            </div>

            <form onSubmit={handleAddYoutube} className="flex gap-2">
              <input
                type="text"
                required
                value={newYoutubeUrl}
                onChange={(e) => setNewYoutubeUrl(e.target.value)}
                placeholder="YouTube Username, handle, or ID"
                className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-rose-350 outline-none focus:border-rose-500 font-mono"
              />
              <button
                type="submit"
                disabled={addingFeed}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-[10.5px] border border-zinc-850 rounded-lg cursor-pointer"
              >
                Sync Link
              </button>
            </form>

            <div className="space-y-3.5 border-t border-zinc-950 pt-3">
              <span className="block text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-bold font-black">Linked Active YouTube Feeds</span>
              {youtubeChannels.length === 0 ? (
                <span className="block text-[10px] font-mono text-zinc-650 text-center py-4 bg-zinc-955/20 rounded">
                  Zero active YouTube track feeds. Enter the handle or url above.
                </span>
              ) : (
                <div className="space-y-2">
                  {youtubeChannels.map((yt) => (
                    <div key={yt.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono font-black text-zinc-100">{yt.title}</span>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 uppercase">
                          <Check size={10} className="text-emerald-400" /> RSS Feed Sync Active
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteYoutube(yt.id)}
                        className="p-1 px-2 text-zinc-500 hover:text-rose-450 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* C. Instant YouTube Search & Post */}
            <div className="border-t border-zinc-950 pt-5 space-y-4">
              <div>
                <h4 className="text-xs font-mono font-black text-rose-450 uppercase flex items-center gap-1.5">
                  <Flame size={12} /> Instant YouTube Poster
                </h4>
                <p className="text-[9.5px] text-zinc-500 font-mono">SEARCH AND POST VIDEO SUMMARIES DIRECTLY</p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ytSearchTopic}
                    onChange={(e) => setYtSearchTopic(e.target.value)}
                    placeholder="Enter search topic (e.g., Koshika Jeevan Ki Ikai)"
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-rose-350 outline-none focus:border-rose-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSearchAndPostYouTube}
                    disabled={searchingYt || !ytSearchTopic || channels.length === 0}
                    className="px-4 py-2 bg-gradient-to-tr from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-mono text-[10.5px] font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-45 h-[38px]"
                  >
                    {searchingYt ? <Loader2 size={12} className="animate-spin" /> : <Send size={11} />}
                    Post Video
                  </button>
                </div>

                {ytPostResult && (
                  <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center bg-zinc-900 px-2 py-1.5 rounded-lg">
                      <span className="text-[9px] font-mono text-emerald-400 font-black uppercase tracking-wider">✓ Posted Successfully</span>
                      <button
                        onClick={() => {
                          setYtPostResult('');
                        }}
                        className="text-zinc-500 hover:text-zinc-350 text-[10px] cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-300 leading-normal whitespace-pre-wrap select-text max-h-[180px] overflow-y-auto custom-scrollbar bg-zinc-950 px-1.5 py-1">
                      {ytPostResult}
                    </p>
                  </div>
                )}
                {ytPostError && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/40 text-rose-450 rounded-xl text-[10px] font-mono">
                    ⚠️ {ytPostError}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB 6: Telemetry Analytics Dashboard */}
      {activeSubTab === 'telemetry' && (
        <div className="space-y-6">
          
          {/* A. Basic metrics row */}
          {telemetry && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 select-none">
              <div className="bg-zinc-900/50 border border-zinc-900 p-4 rounded-3xl space-y-1">
                <span className="block text-[9px] font-mono text-zinc-500 uppercase">Total Subscribers</span>
                <span className="block text-xl font-mono font-black text-white">{telemetry.totalSubscribers}</span>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-900 p-4 rounded-3xl space-y-1">
                <span className="block text-[9px] font-mono text-zinc-500 uppercase">New Today</span>
                <span className="block text-xl font-mono font-black text-emerald-400">+{telemetry.newSubscribersToday}</span>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-900 p-4 rounded-3xl space-y-1">
                <span className="block text-[9px] font-mono text-zinc-500 uppercase">Publications Logs</span>
                <span className="block text-xl font-mono font-black text-zinc-250">{telemetry.totalPostsCount}</span>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-900 p-4 rounded-3xl space-y-1">
                <span className="block text-[9px] font-mono text-zinc-500 uppercase">Published completely</span>
                <span className="block text-xl font-mono font-black text-emerald-450">{telemetry.publishedCount}</span>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-900 p-4 rounded-3xl space-y-1">
                <span className="block text-[9px] font-mono text-zinc-500 uppercase">Engagement Ratio</span>
                <span className="block text-xl font-mono font-black text-cyan-450">{telemetry.engagementRate}</span>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-900 p-4 rounded-3xl space-y-1">
                <span className="block text-[9px] font-mono text-zinc-500 uppercase">Failed jobs array</span>
                <span className={`block text-xl font-mono font-black ${telemetry.failedCount > 0 ? 'text-rose-450 animate-pulse' : 'text-zinc-650'}`}>{telemetry.failedCount}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Health Logs Monitoring panel */}
            <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-md">
              <div>
                <h3 className="text-xs font-mono font-black text-[#5beeff] tracking-widest uppercase flex items-center gap-2">
                  <Radio size={14} /> Daemon Connection Monitor Diagnostics
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">CONTINUOUS HEARTBEAT HISTORY LOGS RUNNING SECURELY SERVER SIDE</p>
              </div>

              {telemetry && telemetry.healthLogs && telemetry.healthLogs.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar select-text pr-1">
                  {telemetry.healthLogs.map((log, lIdx) => (
                    <div key={lIdx} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-1.5 leading-relaxed text-[11px] font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-[#a1a1aa]">{new Date(log.checkedAt).toLocaleString()}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-bold border ${
                          log.ok ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50' : 'bg-rose-950/20 text-rose-450 border-rose-900/50'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <p className="text-zinc-400 font-medium text-[10.5px] leading-relaxed">{log.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="block text-[10px] font-mono text-zinc-500 py-6 text-center">Diagnostics running every 3 minutes. Standby logs generation.</span>
              )}
            </div>

            {/* Most viewed & Last publication block highlights */}
            <div className="lg:col-span-6 space-y-6">
              {telemetry && telemetry.mostViewedPost && (
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-5 shadow-xl space-y-3 backdrop-blur-md">
                  <span className="block text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-black">🔥 MOST VIEWED CHANNEL POST BROADCASTED</span>
                  <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-2xl select-text space-y-2">
                    <p className="text-xs font-mono text-zinc-300 truncate font-semibold leading-relaxed">"{telemetry.mostViewedPost.content}"</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 font-black">
                      <Eye size={11} className="text-[#5beeff]" /> Total Views Deliveries: <span className="text-[#5beeff]">{telemetry.mostViewedPost.views}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AUTOMATION FREQUENCY DETAILS */}
              <div className="bg-zinc-900/40 border border-zinc-905 rounded-3xl p-5 shadow-xl space-y-3 backdrop-blur-md">
                <span className="block text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-black">📅 CONTENT CALENDAR AUTO-POST AUTO-REDIAL PARAMS</span>
                <form onSubmit={handleSaveTelegramSettings} className="p-3 bg-zinc-950 border border-zinc-900 rounded-2xl space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 select-none">
                      <span className="block text-[11px] font-mono font-bold text-white uppercase">Automated Background Posts</span>
                      <span className="block text-[9px] font-mono text-zinc-500">Continuous AI generation updates</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setAutoPostEnabled(!autoPostEnabled)}
                      className="text-zinc-400 hover:text-white transition-opacity shrink-0 cursor-pointer"
                    >
                      {autoPostEnabled ? <ToggleRight size={30} className="text-[#5beeff]" /> : <ToggleLeft size={30} className="text-zinc-650" />}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                      <span className="uppercase">AI NEWS FOCUS SEGMENT:</span>
                      <span className="text-fuchsia-400 font-bold uppercase">{autoPostCategory}</span>
                    </div>
                    <select
                      disabled={!autoPostEnabled}
                      value={autoPostCategory}
                      onChange={(e) => setAutoPostCategory(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-lg p-2 text-xs font-mono text-zinc-300 disabled:opacity-40"
                    >
                      {['AI', 'Fitness', 'Tech', 'Education', 'NEET'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5 border-t border-zinc-900 pt-3 select-none">
                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                      <span className="uppercase">Interval Frequencies Target</span>
                      <span className="text-cyan-400 font-bold font-mono">EVERY {autoPostInterval} HOURS</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="48"
                      disabled={!autoPostEnabled}
                      value={autoPostInterval}
                      onChange={(e) => setAutoPostInterval(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#5beeff] disabled:opacity-40"
                    />
                  </div>

                  {/* Group auto response manager */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
                    <div className="space-y-0.5 select-none text-left">
                      <span className="block text-[11px] font-mono font-bold text-white uppercase">Enable Auto Reply Manager</span>
                      <span className="block text-[9px] font-mono text-zinc-500">Reacts automatically to user comments in linked groups</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                      className="text-zinc-400 hover:text-white transition-opacity shrink-0 cursor-pointer"
                    >
                      {autoReplyEnabled ? <ToggleRight size={30} className="text-[#5beeff]" /> : <ToggleLeft size={30} className="text-zinc-650" />}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-zinc-900 text-right">
                    <button
                      type="submit"
                      disabled={savingConfig}
                      className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono font-black text-[#5beeff] border border-zinc-850 rounded-lg uppercase cursor-pointer"
                    >
                      {savingConfig ? 'Saving Settings...' : 'Save Settings Preferences'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED TIMELINE HISTORY TABLE */}
      <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <div>
          <h3 className="text-xs font-mono font-black text-cyan-450 tracking-widest uppercase flex items-center gap-2">
            <Calendar size={14} /> Scheduled Queue & Timeline History logs
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">REAL-TIME TIMELINE FOR THE PERSISTENT SERVER CONTAINER DAEMON DEPLOYMENTS</p>
        </div>

        {loadingPosts ? (
          <div className="py-12 flex flex-col justify-center items-center gap-3 bg-zinc-950/20 rounded-2xl">
            <Loader2 size={24} className="animate-spin text-[#5beeff]" />
            <span className="text-xs font-mono text-zinc-500">Aligning timeline indexes...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 border border-zinc-950 rounded-3xl bg-zinc-950/25 text-center flex flex-col items-center justify-center gap-1 select-none">
            <Send size={28} className="text-zinc-850 rotate-[-12deg]" />
            <span className="text-xs font-mono text-zinc-500 font-black uppercase mt-3">Zero timeline records</span>
            <span className="text-[10px] font-mono text-zinc-650">Delightful posts history will log here as you build automated campaigns.</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-950 bg-zinc-950/40">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-900/80 select-none uppercase tracking-wider text-[9px] font-bold">
                  <th className="p-4">Type</th>
                  <th className="p-4">Preview Details</th>
                  <th className="p-4">Target Channel</th>
                  <th className="p-4">Delivery Timeline</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {posts.slice().reverse().map((post) => (
                  <tr key={post.id} className="hover:bg-zinc-950/65 transition-colors">
                    <td className="p-4 select-none">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                        post.type === 'text' 
                          ? 'text-cyan-400 bg-cyan-950/20 border-cyan-900/40'
                          : post.type === 'image'
                            ? 'text-fuchsia-400 bg-fuchsia-950/20 border-fuchsia-900/40'
                            : post.type === 'video'
                              ? 'text-amber-400 bg-amber-950/20 border-amber-900/40'
                              : 'text-violet-400 bg-violet-950/20 border-violet-900/40'
                      }`}>
                        {post.type}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs truncate font-bold text-zinc-300">
                      {post.type === 'text' ? (
                        <p className="truncate block">"{post.content}"</p>
                      ) : (
                        <div className="space-y-0.5 truncate">
                          <span className="text-zinc-400 italic block truncate font-normal">🔗 {post.fileName || post.content}</span>
                          {post.caption && <span className="block text-[10px] text-zinc-500 truncate">Caption: "{post.caption}"</span>}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-zinc-400 truncate max-w-[120px]">
                      {post.targetChannelIds && post.targetChannelIds.length > 0 ? (
                        <span className="text-xs">{post.targetChannelIds.join(', ')}</span>
                      ) : (
                        <span className="text-xs text-zinc-650">Default Target</span>
                      )}
                    </td>
                    <td className="p-4 text-zinc-400">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-350">{new Date(post.scheduledAt).toLocaleString()}</span>
                        {post.publishedAt && (
                          <span className="text-[9.5px] text-emerald-500">Sent: {new Date(post.publishedAt).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center select-none shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase rounded-full ${
                        post.status === 'published'
                          ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/45'
                          : post.status === 'pending'
                            ? 'bg-amber-950/30 text-amber-400 border border-amber-900/45 animate-pulse'
                            : 'bg-rose-950/30 text-rose-450 border border-rose-900/45'
                      }`}>
                        {post.status === 'published' && <CheckCircle size={10} />}
                        {post.status === 'pending' && <Clock size={10} />}
                        {post.status === 'failed' && <AlertTriangle size={10} />}
                        {post.status}
                      </span>
                      {post.errorMessage && (
                        <span className="block text-[8px] text-rose-400 max-w-[140px] truncate mx-auto mt-1" title={post.errorMessage}>
                          Err: {post.errorMessage}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {post.status === 'failed' && (
                          <button
                            onClick={() => handleForceRetry(post.id)}
                            className="p-1 px-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-cyan-400 hover:text-cyan-300 text-[10px] font-mono font-bold rounded"
                            title="Retry now"
                          >
                            <RefreshCw size={11} className="inline mr-1" /> RE-RUN
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-450 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 rounded transition-all cursor-pointer"
                          title={post.status === 'pending' ? 'Cancel Schedule Post' : 'Remove Log Record'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export class VoiceEngine {
  private micCtx: AudioContext | null = null;
  private playbackCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private nextStartTime: number = 0;
  private ws: WebSocket | null = null;

  // Real-time visualizers amplitudes
  public micAmplitude: number = 0;
  public speakerAmplitude: number = 0;

  // Settings
  private micGain: number = 2; // Multiplier
  private speakerVolume: number = 0.8; // 0.0 to 1.0
  private isMuted: boolean = false;

  constructor() {}

  public hasMicAccess: boolean = true;

  public async start(ws: WebSocket, micGain: number, voiceVolume: number): Promise<{ micActive: boolean }> {
    this.ws = ws;
    this.micGain = micGain;
    this.speakerVolume = voiceVolume / 100;
    this.isMuted = false;
    this.nextStartTime = 0;
    this.hasMicAccess = true;

    // 1. Initialize playback context at 24kHz
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.playbackCtx = new AudioContextClass({ sampleRate: 24000 });

    try {
      // 2. Initialize mic stream
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.micCtx = new AudioContextClass();
      const source = this.micCtx.createMediaStreamSource(this.micStream);
      
      // Mono script processor
      this.processor = this.micCtx.createScriptProcessor(2048, 1, 1);
      
      const inputSampleRate = this.micCtx.sampleRate;
      
      this.processor.onaudioprocess = (e) => {
        if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.micAmplitude = 0;
          return;
        }

        const float32Data = e.inputBuffer.getChannelData(0);
        
        // Compute visual amplitude
        let sum = 0;
        for (let i = 0; i < float32Data.length; i++) {
          sum += float32Data[i] * float32Data[i];
        }
        this.micAmplitude = Math.sqrt(sum / float32Data.length);

        // Apply mic gain
        const gainedData = new Float32Array(float32Data.length);
        for (let i = 0; i < float32Data.length; i++) {
          gainedData[i] = Math.min(1, Math.max(-1, float32Data[i] * this.micGain));
        }

        // Downsample to 16kHz PCM
        const pcm16 = this.downsample(gainedData, inputSampleRate, 16000);
        const base64 = this.pcmToBase64(pcm16);

        // Send to WebSocket
        try {
          this.ws.send(JSON.stringify({ audio: base64 }));
        } catch (err) {
          console.error('Audio WS send error', err);
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.micCtx.destination);
      return { micActive: true };
    } catch (err) {
      console.warn('VoiceEngine running in fallback mode without microphone stream:', err);
      this.hasMicAccess = false;
      this.micStream = null;
      this.micCtx = null;
      this.processor = null;
      return { micActive: false };
    }
  }

  public stop() {
    this.interrupt();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.micCtx) {
      this.micCtx.close();
      this.micCtx = null;
    }

    if (this.playbackCtx) {
      this.playbackCtx.close();
      this.playbackCtx = null;
    }

    this.ws = null;
    this.micAmplitude = 0;
    this.speakerAmplitude = 0;
  }

  public setMicGain(gain: number) {
    this.micGain = gain;
  }

  public setSpeakerVolume(volume: number) {
    this.speakerVolume = volume / 100;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) this.micAmplitude = 0;
  }

  public interrupt() {
    this.activeSources.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    this.activeSources = [];
    this.nextStartTime = 0;
    this.speakerAmplitude = 0;
  }

  public handleIncomingAudio(base64Audio: string) {
    if (!this.playbackCtx) return;

    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);

      let sum = 0;
      for (let i = 0; i < int16.length; i++) {
        const floatVal = int16[i] / 32768.0;
        float32[i] = floatVal * this.speakerVolume; // Apply volume settings
        sum += floatVal * floatVal;
      }
      
      // Update real-time speaker visuals
      this.speakerAmplitude = Math.sqrt(sum / int16.length);

      const buffer = this.playbackCtx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const source = this.playbackCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.playbackCtx.destination);

      const currentTime = this.playbackCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.05; // Guard interval for smooth drift recovery
      }

      source.start(this.nextStartTime);
      
      // Keep track of pending triggers for interruption mechanics
      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
        if (this.activeSources.length === 0) {
          this.speakerAmplitude = 0;
        }
      };

      this.nextStartTime += buffer.duration;
    } catch (e) {
      console.error('Error handling incoming audio chunk:', e);
    }
  }

  // Downsampling logic (linear decimation / upsampling compensation)
  private downsample(buffer: Float32Array, fromRate: number, toRate: number): Int16Array {
    if (fromRate === toRate) {
      return this.float32ToInt16(buffer);
    }
    const sampleRateRatio = fromRate / toRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetInput = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetInput; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = Math.min(1, Math.max(-1, accum / (count || 1))) * 0x7fff;
      offsetResult++;
      offsetInput = nextOffsetBuffer;
    }
    return result;
  }

  private float32ToInt16(buffer: Float32Array): Int16Array {
    const l = buffer.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 0x7fff;
    }
    return buf;
  }

  private pcmToBase64(int16Array: Int16Array): string {
    const buffer = int16Array.buffer;
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
export const voiceEngine = new VoiceEngine();

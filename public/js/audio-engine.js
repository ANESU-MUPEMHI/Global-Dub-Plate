// Global Dub Plate - Professional Web Audio Engine
// Real-time Sound Synthesis, 25% Preview Gate, Split-Track Routing, Stems Mixer & Dub Siren
// Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies

class GlobalDubAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.totalDuration = 120;
    this.isFullUnlocked = false;
    this.isSplitTrack = false;
    this.splitChannelMode = 'both';
    this.isTempoClickAcapella = false;
    this.bpm = 85;

    this.masterGain = null;
    this.analyser = null;

    this.stems = {
      vocal: { gain: null, volume: 0.9, muted: false, solo: false },
      riddim: { gain: null, volume: 0.85, muted: false, solo: false },
      dubFx: { gain: null, volume: 0.75, muted: false, solo: false },
      click: { gain: null, volume: 0.6, muted: false, solo: false }
    };

    this.timerInterval = null;
    this.onTimeUpdate = null;
    this.onPreviewLocked = null;
    this.onEnded = null;

    this.playlistClips = [];
    this.activeAudition = null;
    this.initPlaylistData();
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      for (const key of Object.keys(this.stems)) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = this.stems[key].volume;
        this.stems[key].gain = gainNode;
        gainNode.connect(this.masterGain);
      }

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  loadOrder(order) {
    this.stop();
    this.currentOrder = order;
    this.totalDuration = order.audioDuration || 120;
    this.isFullUnlocked = order.pricing?.percentPaid === 100 || order.status === 'completed';
    this.isSplitTrack = order.deliveryFormat === 'split_track';
    this.isTempoClickAcapella = !!order.isTempoClickAcapella;
    this.bpm = order.tempoBpm || 85;
    this.currentTime = 0;

    if (this.isTempoClickAcapella) {
      this.setStemVolume('riddim', 0);
      this.setStemVolume('click', 0.8);
    } else {
      this.setStemVolume('riddim', 0.85);
      this.setStemVolume('click', 0);
    }
  }

  play() {
    this.initContext();
    if (this.isPlaying) return;

    const maxAllowedTime = this.isFullUnlocked ? this.totalDuration : (this.totalDuration * 0.25);
    if (!this.isFullUnlocked && this.currentTime >= maxAllowedTime) {
      this.playPreviewLockAlert();
      if (this.onPreviewLocked) this.onPreviewLocked(this.currentOrder);
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.startAudioSynthesisLoop();

    const tickIntervalMs = 100;
    this.timerInterval = setInterval(() => {
      this.currentTime += tickIntervalMs / 1000;
      const currentLimit = this.isFullUnlocked ? this.totalDuration : (this.totalDuration * 0.25);

      if (this.currentTime >= currentLimit) {
        if (!this.isFullUnlocked) {
          this.pause();
          this.playPreviewLockAlert();
          if (this.onPreviewLocked) this.onPreviewLocked(this.currentOrder);
        } else if (this.currentTime >= this.totalDuration) {
          this.stop();
          if (this.onEnded) this.onEnded();
        }
      }

      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.currentTime, this.totalDuration, currentLimit);
      }
    }, tickIntervalMs);
  }

  pause() {
    this.isPlaying = false;
    this.isPaused = true;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.stopAudioSynthesisLoop();
  }

  stop() {
    this.pause();
    this.currentTime = 0;
    this.isPaused = false;
    if (this.onTimeUpdate) {
      const currentLimit = this.isFullUnlocked ? this.totalDuration : (this.totalDuration * 0.25);
      this.onTimeUpdate(0, this.totalDuration, currentLimit);
    }
  }

  seek(seconds) {
    const maxAllowedTime = this.isFullUnlocked ? this.totalDuration : (this.totalDuration * 0.25);
    let target = Math.max(0, Math.min(seconds, this.totalDuration));

    if (!this.isFullUnlocked && target > maxAllowedTime) {
      target = maxAllowedTime;
      this.playPreviewLockAlert();
      if (this.onPreviewLocked) this.onPreviewLocked(this.currentOrder);
    }

    this.currentTime = target;
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentTime, this.totalDuration, maxAllowedTime);
    }
  }

  unlockFull() {
    this.isFullUnlocked = true;
    if (this.currentOrder) {
      this.currentOrder.pricing.percentPaid = 100;
      this.currentOrder.pricing.balanceDue = 0;
      this.currentOrder.status = 'completed';
    }
  }

  setSplitMode(mode) {
    this.splitChannelMode = mode;
    if (!this.ctx) return;

    if (mode === 'left_vocal') {
      this.setStemVolume('vocal', 0.95);
      this.setStemVolume('riddim', 0.0);
    } else if (mode === 'right_riddim') {
      this.setStemVolume('vocal', 0.0);
      this.setStemVolume('riddim', 0.9);
    } else {
      this.setStemVolume('vocal', 0.9);
      this.setStemVolume('riddim', this.isTempoClickAcapella ? 0 : 0.85);
    }
  }

  setStemVolume(stemKey, volume) {
    if (this.stems[stemKey]) {
      this.stems[stemKey].volume = volume;
      if (this.stems[stemKey].gain && this.ctx) {
        this.stems[stemKey].gain.gain.setValueAtTime(
          this.stems[stemKey].muted ? 0 : volume,
          this.ctx.currentTime
        );
      }
    }
  }

  toggleStemMute(stemKey) {
    const stem = this.stems[stemKey];
    if (stem) {
      stem.muted = !stem.muted;
      if (stem.gain && this.ctx) {
        stem.gain.gain.setValueAtTime(stem.muted ? 0 : stem.volume, this.ctx.currentTime);
      }
      return stem.muted;
    }
    return false;
  }

  toggleStemSolo(stemKey) {
    const stem = this.stems[stemKey];
    if (!stem) return false;
    stem.solo = !stem.solo;

    const anySolo = Object.values(this.stems).some(s => s.solo);

    for (const key of Object.keys(this.stems)) {
      const s = this.stems[key];
      const targetGain = anySolo ? (s.solo ? s.volume : 0) : (s.muted ? 0 : s.volume);
      if (s.gain && this.ctx) {
        s.gain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
      }
    }
    return stem.solo;
  }

  // FX: Dub Siren
  triggerDubSiren(duration = 2.5) {
    this.initContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(6, now);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(250, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const sirenGain = this.ctx.createGain();
    sirenGain.gain.setValueAtTime(0, now);
    sirenGain.gain.linearRampToValueAtTime(0.7, now + 0.1);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const delay = this.ctx.createDelay();
    delay.delayTime.setValueAtTime(0.32, now);

    const feedback = this.ctx.createGain();
    feedback.gain.setValueAtTime(0.65, now);

    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(1800, now);

    osc.connect(sirenGain);
    sirenGain.connect(this.stems.dubFx.gain);
    sirenGain.connect(delay);

    delay.connect(delayFilter);
    delayFilter.connect(feedback);
    feedback.connect(delay);
    feedback.connect(this.stems.dubFx.gain);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + duration + 1);
    osc.stop(now + duration + 1);
  }

  // FX: Airhorn
  triggerAirhorn() {
    this.initContext();
    const now = this.ctx.currentTime;
    const freqs = [466.16, 587.33, 700.0];

    const hornGain = this.ctx.createGain();
    hornGain.gain.setValueAtTime(0, now);

    const blasts = [
      { start: 0.0, end: 0.12 },
      { start: 0.18, end: 0.30 },
      { start: 0.36, end: 0.85 }
    ];

    blasts.forEach(b => {
      hornGain.gain.setValueAtTime(0.75, now + b.start);
      hornGain.gain.exponentialRampToValueAtTime(0.001, now + b.end);
    });

    hornGain.connect(this.stems.dubFx.gain);

    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(hornGain);
      osc.start(now);
      osc.stop(now + 1.0);
    });
  }

  // FX: Laser Gun
  triggerLaser() {
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    const sweepGain = this.ctx.createGain();
    sweepGain.gain.setValueAtTime(0.8, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.28);

    osc.connect(sweepGain);
    sweepGain.connect(this.stems.dubFx.gain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // FX: Tape Stop
  triggerTapeStop() {
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.85);
  }

  playPreviewLockAlert() {
    this.triggerTapeStop();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Global Dub Plate Preview. 25 percent reached. Pay balance to unlock master cut.');
      utterance.pitch = 0.9;
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }

  startAudioSynthesisLoop() {
    this.stopAudioSynthesisLoop();
    if (!this.ctx) return;

    const beatDuration = 60 / this.bpm;
    let step = Math.floor((this.currentTime / beatDuration) % 16);

    const scheduleBeats = () => {
      if (!this.isPlaying) return;

      const now = this.ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const time = now + (i * (beatDuration / 2));
        const currentStep = (step + i) % 16;
        this.scheduleBeatStep(currentStep, time, beatDuration);
      }
      step = (step + 4) % 16;
    };

    scheduleBeats();
    this.synthLoopInterval = setInterval(scheduleBeats, beatDuration * 1000);
  }

  stopAudioSynthesisLoop() {
    if (this.synthLoopInterval) {
      clearInterval(this.synthLoopInterval);
      this.synthLoopInterval = null;
    }
  }

  scheduleBeatStep(step, time, beatDuration) {
    if (!this.ctx) return;

    if (step % 2 === 0) {
      const isDownbeat = (step === 0);
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(isDownbeat ? 1200 : 800, time);
      clickGain.gain.setValueAtTime(0.4, time);
      clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      clickOsc.connect(clickGain);
      clickGain.connect(this.stems.click.gain);
      clickOsc.start(time);
      clickOsc.stop(time + 0.05);
    }

    if (this.isTempoClickAcapella) {
      this.scheduleVocalStep(step, time, beatDuration);
      return;
    }

    if (step === 4 || step === 12) {
      const snareNoise = this.ctx.createBufferSource();
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }
      snareNoise.buffer = buffer;

      const snareFilter = this.ctx.createBiquadFilter();
      snareFilter.type = 'highpass';
      snareFilter.frequency.setValueAtTime(1000, time);

      const snareGain = this.ctx.createGain();
      snareGain.gain.setValueAtTime(0.55, time);
      snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      snareNoise.connect(snareFilter);
      snareFilter.connect(snareGain);
      snareGain.connect(this.stems.riddim.gain);

      snareNoise.start(time);
      snareNoise.stop(time + 0.16);

      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.frequency.setValueAtTime(120, time);
      kickOsc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      kickGain.gain.setValueAtTime(0.7, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      kickOsc.connect(kickGain);
      kickGain.connect(this.stems.riddim.gain);
      kickOsc.start(time);
      kickOsc.stop(time + 0.16);
    }

    if (step % 2 === 0) {
      const hatOsc = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      hatOsc.type = 'square';
      hatOsc.frequency.setValueAtTime(8000, time);
      hatGain.gain.setValueAtTime(0.15, time);
      hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      hatOsc.connect(hatGain);
      hatGain.connect(this.stems.riddim.gain);
      hatOsc.start(time);
      hatOsc.stop(time + 0.05);
    }

    if (step === 2 || step === 6 || step === 10 || step === 14) {
      const chordNotes = [293.66, 349.23, 440.0];
      chordNotes.forEach(freq => {
        const chordOsc = this.ctx.createOscillator();
        const chordGain = this.ctx.createGain();
        chordOsc.type = 'sawtooth';
        chordOsc.frequency.setValueAtTime(freq, time);

        const chordFilter = this.ctx.createBiquadFilter();
        chordFilter.type = 'lowpass';
        chordFilter.frequency.setValueAtTime(1200, time);

        chordGain.gain.setValueAtTime(0.25, time);
        chordGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        chordOsc.connect(chordFilter);
        chordFilter.connect(chordGain);
        chordGain.connect(this.stems.riddim.gain);

        chordOsc.start(time);
        chordOsc.stop(time + 0.14);
      });
    }

    const bassline = [
      { step: 0, note: 73.42 },
      { step: 2, note: 73.42 },
      { step: 4, note: 82.41 },
      { step: 6, note: 87.31 },
      { step: 8, note: 98.00 },
      { step: 10, note: 87.31 },
      { step: 12, note: 73.42 },
      { step: 14, note: 65.41 }
    ];

    const currentBassNote = bassline.find(b => b.step === step);
    if (currentBassNote) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(currentBassNote.note, time);

      bassGain.gain.setValueAtTime(0.65, time);
      bassGain.gain.exponentialRampToValueAtTime(0.01, time + (beatDuration * 0.45));

      bassOsc.connect(bassGain);
      bassGain.connect(this.stems.riddim.gain);

      bassOsc.start(time);
      bassOsc.stop(time + (beatDuration * 0.5));
    }

    this.scheduleVocalStep(step, time, beatDuration);
  }

  scheduleVocalStep(step, time, beatDuration) {
    if (!this.ctx) return;

    const vocalPitches = [146.83, 164.81, 174.61, 196.00, 220.00];
    if (step === 0 || step === 3 || step === 8 || step === 11) {
      const pitch = vocalPitches[(step + Math.floor(this.currentTime)) % vocalPitches.length];

      const vocalOsc = this.ctx.createOscillator();
      const vocalFilter = this.ctx.createBiquadFilter();
      const vocalGain = this.ctx.createGain();

      vocalOsc.type = 'sawtooth';
      vocalOsc.frequency.setValueAtTime(pitch, time);

      vocalFilter.type = 'bandpass';
      vocalFilter.frequency.setValueAtTime(800 + (Math.sin(time) * 300), time);
      vocalFilter.Q.setValueAtTime(3.0, time);

      vocalGain.gain.setValueAtTime(0.35, time);
      vocalGain.gain.exponentialRampToValueAtTime(0.01, time + (beatDuration * 0.7));

      vocalOsc.connect(vocalFilter);
      vocalFilter.connect(vocalGain);

      vocalGain.connect(this.stems.vocal.gain);

      if (step === 8) {
        const dubDelaySend = this.ctx.createGain();
        dubDelaySend.gain.setValueAtTime(0.5, time);
        vocalGain.connect(dubDelaySend);
        dubDelaySend.connect(this.stems.dubFx.gain);
      }

      vocalOsc.start(time);
      vocalOsc.stop(time + (beatDuration * 0.75));
    }
  }

  playMetronomeClick(isAccent = false) {
    this.initContext();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1400 : 880, time);
    gain.gain.setValueAtTime(isAccent ? 0.75 : 0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  generateWavFile(options = {}) {
    const {
      duration = 30,
      isSplitTrack = false,
      sampleRate = 44100
    } = options;

    const numChannels = 2;
    const numFrames = sampleRate * duration;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numFrames * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    const bpm = this.bpm || 85;
    const beatSamples = (60 / bpm) * sampleRate;

    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      const beat = (i % beatSamples) / beatSamples;

      const bassFreq = 73.42 + (Math.floor(t * (bpm / 60) / 2) % 4) * 8;
      const bassVal = Math.sin(2 * Math.PI * bassFreq * t) * 0.45;

      let skankVal = 0;
      if (beat > 0.45 && beat < 0.65) {
        skankVal = (Math.sin(2 * Math.PI * 349 * t) + Math.sin(2 * Math.PI * 440 * t)) * 0.2;
      }

      const vocalFreq = 146.83 + ((Math.floor(t * 1.5) % 5) * 20);
      const vocalVal = Math.sin(2 * Math.PI * vocalFreq * t) * 0.4 * (0.8 + 0.2 * Math.sin(2 * Math.PI * 4 * t));

      let leftSample = 0;
      let rightSample = 0;

      if (isSplitTrack) {
        leftSample = vocalVal;
        rightSample = bassVal + skankVal;
      } else {
        const mix = (bassVal + skankVal + vocalVal) * 0.65;
        leftSample = mix;
        rightSample = mix;
      }

      const clamp = (val) => Math.max(-1, Math.min(1, val));
      view.setInt16(offset, clamp(leftSample) * 0x7FFF, true);
      view.setInt16(offset + 2, clamp(rightSample) * 0x7FFF, true);
      offset += 4;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  // =========================================================================
  // MINI 4-TRACK DUB RECORDER & MULTITRACK MIXER SYSTEM
  // Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
  // =========================================================================

  initFourTrack() {
    this.initContext();
    if (!this.ctx) return;

    if (!this.fourTrack) {
      this.fourTrack = {
        isPlaying: false,
        isRecording: false,
        isPaused: false,
        currentTime: 0,
        totalDuration: 180,
        tapeSpeed: 1.0,
        dubDelayTime: 0.35,
        dubDelayFeedback: 0.55,
        tracks: {
          1: { name: 'TR-808 Music / Riddim', volume: 0.85, pan: 0, muted: false, solo: false, recArmed: false, trim: 1.0, delaySendAmount: 0.3, gain: null, panner: null, analyser: null, delaySendNode: null },
          2: { name: 'Juno 106 - Lead Vocal', volume: 0.90, pan: 0, muted: false, solo: false, recArmed: true, trim: 1.1, delaySendAmount: 0.5, gain: null, panner: null, analyser: null, delaySendNode: null },
          3: { name: 'Moog Sub 37 - Backing & Chants', volume: 0.78, pan: -0.25, muted: false, solo: false, recArmed: false, trim: 0.95, delaySendAmount: 0.45, gain: null, panner: null, analyser: null, delaySendNode: null },
          4: { name: 'Korg Minilogue - Dub FX', volume: 0.75, pan: 0.25, muted: false, solo: false, recArmed: false, trim: 1.0, delaySendAmount: 0.8, gain: null, panner: null, analyser: null, delaySendNode: null },
          5: { name: 'Yamaha DX7 - Tape Echo & Reverb', volume: 0.70, pan: -0.15, muted: false, solo: false, recArmed: false, trim: 1.0, delaySendAmount: 0.5, gain: null, panner: null, analyser: null, delaySendNode: null },
          6: { name: 'Korg MS1 - Sound Clash Drops', volume: 0.82, pan: 0.15, muted: false, solo: false, recArmed: false, trim: 1.0, delaySendAmount: 0.2, gain: null, panner: null, analyser: null, delaySendNode: null }
        },
        master: {
          volume: 0.85,
          saturation: true,
          limiter: true,
          gain: null,
          analyserL: null,
          analyserR: null
        },
        delayBus: {
          delayNode: null,
          feedbackNode: null,
          filterNode: null
        },
        rhythmStep: 0,
        timerInterval: null
      };

      // Master Buss Gain
      const masterGain = this.ctx.createGain();
      masterGain.gain.value = this.fourTrack.master.volume;

      // Stereo Splitter for Master L & R UV Meters
      const splitter = this.ctx.createChannelSplitter(2);
      const analyserL = this.ctx.createAnalyser();
      const analyserR = this.ctx.createAnalyser();
      analyserL.fftSize = 64;
      analyserR.fftSize = 64;

      masterGain.connect(splitter);
      splitter.connect(analyserL, 0);
      splitter.connect(analyserR, 1);
      masterGain.connect(this.ctx.destination);

      this.fourTrack.master.gain = masterGain;
      this.fourTrack.master.analyserL = analyserL;
      this.fourTrack.master.analyserR = analyserR;

      // Dub Delay / Space Echo bus
      const delayNode = this.ctx.createDelay(2.0);
      delayNode.delayTime.value = this.fourTrack.dubDelayTime;

      const feedbackNode = this.ctx.createGain();
      feedbackNode.gain.value = this.fourTrack.dubDelayFeedback;

      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 2400;

      delayNode.connect(delayFilter);
      delayFilter.connect(feedbackNode);
      feedbackNode.connect(delayNode);

      this.fourTrack.delayBus.delayNode = delayNode;
      this.fourTrack.delayBus.feedbackNode = feedbackNode;
      this.fourTrack.delayBus.filterNode = delayFilter;

      // Setup Channel Strips (1 to 6)
      for (let i = 1; i <= 6; i++) {
        const trk = this.fourTrack.tracks[i];
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = trk.volume * trk.trim;

        const pannerNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        if (pannerNode) pannerNode.pan.value = trk.pan;

        const analyserNode = this.ctx.createAnalyser();
        analyserNode.fftSize = 64;

        const delaySendNode = this.ctx.createGain();
        delaySendNode.gain.value = trk.delaySendAmount;

        gainNode.connect(analyserNode);
        if (pannerNode) {
          analyserNode.connect(pannerNode);
          pannerNode.connect(masterGain);
        } else {
          analyserNode.connect(masterGain);
        }

        gainNode.connect(delaySendNode);
        delaySendNode.connect(delayNode);

        if (i === 4) {
          delayFilter.connect(gainNode);
        }

        trk.gain = gainNode;
        trk.panner = pannerNode;
        trk.analyser = analyserNode;
        trk.delaySendNode = delaySendNode;
      }
    }
  }

  startFourTrack(isRecording = false) {
    this.initFourTrack();
    if (this.fourTrack.isPlaying) return;

    this.fourTrack.isPlaying = true;
    this.fourTrack.isRecording = isRecording;
    this.fourTrack.isPaused = false;

    if (isRecording) {
      this.playMetronomeClick(true);
    }

    const stepMs = Math.round(((60 / this.bpm) / 4) * 1000 / this.fourTrack.tapeSpeed);
    this.fourTrack.timerInterval = setInterval(() => {
      if (!this.fourTrack.isPlaying || this.fourTrack.isPaused) return;

      this.fourTrack.currentTime += (stepMs / 1000);
      this.fourTrack.rhythmStep = (this.fourTrack.rhythmStep + 1) % 16;
      this.stepFourTrackAudio(this.fourTrack.rhythmStep);
    }, stepMs);
  }

  stepFourTrackAudio(step) {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const beatDuration = (60 / this.bpm) / this.fourTrack.tapeSpeed;

    const hasSolo = Object.values(this.fourTrack.tracks).some(t => t.solo);

    const isTrackAudible = (num) => {
      const t = this.fourTrack.tracks[num];
      if (t.muted) return false;
      if (hasSolo && !t.solo) return false;
      return true;
    };

    // TRACK 1: MUSIC / RIDDIM (Drums, Bass, Skank)
    if (isTrackAudible(1) && this.fourTrack.tracks[1].gain) {
      this.playMusicStep(step, time, beatDuration, this.fourTrack.tracks[1].gain);
    }

    // TRACK 2: LEAD VOICE (Vocal melody / clash toasting)
    if (isTrackAudible(2) && this.fourTrack.tracks[2].gain) {
      this.playLeadVoiceStep(step, time, beatDuration, this.fourTrack.tracks[2].gain);
    }

    // TRACK 3: BACKING VOCALS / HARMONY
    if (isTrackAudible(3) && this.fourTrack.tracks[3].gain) {
      this.playBackingHarmonyStep(step, time, beatDuration, this.fourTrack.tracks[3].gain);
    }

    // TRACK 4: DUBBING FX / SPACE ECHO
    if (isTrackAudible(4) && this.fourTrack.tracks[4].gain) {
      this.playDubbingFxStep(step, time, beatDuration, this.fourTrack.tracks[4].gain);
    }
  }

  playMusicStep(step, time, beatDur, targetNode) {
    if (step === 4 || step === 12) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.frequency.setValueAtTime(110, time);
      kickOsc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      kickGain.gain.setValueAtTime(0.7, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
      kickOsc.connect(kickGain);
      kickGain.connect(targetNode);
      kickOsc.start(time);
      kickOsc.stop(time + 0.15);

      const snareNoise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      snareNoise.buffer = buffer;
      const snareGain = this.ctx.createGain();
      snareGain.gain.setValueAtTime(0.45, time);
      snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      snareNoise.connect(snareGain);
      snareGain.connect(targetNode);
      snareNoise.start(time);
      snareNoise.stop(time + 0.13);
    }

    if (step % 4 === 2) {
      [293.66, 349.23, 440.0].forEach(f => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, time);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
        osc.connect(gain);
        gain.connect(targetNode);
        osc.start(time);
        osc.stop(time + 0.1);
      });
    }

    if (step % 2 === 0) {
      const bassNotes = [73.42, 73.42, 82.41, 87.31, 98.00, 87.31, 73.42, 65.41];
      const note = bassNotes[(step / 2) % bassNotes.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(note, time);
      bassGain.gain.setValueAtTime(0.65, time);
      bassGain.gain.exponentialRampToValueAtTime(0.01, time + (beatDur * 0.45));
      bassOsc.connect(bassGain);
      bassGain.connect(targetNode);
      bassOsc.start(time);
      bassOsc.stop(time + (beatDur * 0.5));
    }
  }

  playLeadVoiceStep(step, time, beatDur, targetNode) {
    const leadPitches = [146.83, 164.81, 196.00, 220.00, 246.94, 293.66];
    if (step === 0 || step === 3 || step === 8 || step === 11) {
      const pitch = leadPitches[(step + Math.floor(this.fourTrack.currentTime)) % leadPitches.length];
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitch, time);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950 + Math.sin(time * 3) * 200, time);
      filter.Q.value = 3.5;

      gain.gain.setValueAtTime(0.38, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + (beatDur * 0.65));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(targetNode);

      osc.start(time);
      osc.stop(time + (beatDur * 0.7));
    }
  }

  playBackingHarmonyStep(step, time, beatDur, targetNode) {
    if (step === 8 || step === 10) {
      [220.00, 277.18, 329.63].forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + (beatDur * 0.7));
        osc.connect(gain);
        gain.connect(targetNode);
        osc.start(time);
        osc.stop(time + (beatDur * 0.75));
      });
    }
  }

  playDubbingFxStep(step, time, beatDur, targetNode) {
    if (step === 14 && Math.random() > 0.4) {
      const sweepOsc = this.ctx.createOscillator();
      const sweepGain = this.ctx.createGain();
      sweepOsc.type = 'sine';
      sweepOsc.frequency.setValueAtTime(300, time);
      sweepOsc.frequency.exponentialRampToValueAtTime(1600, time + 0.2);
      sweepGain.gain.setValueAtTime(0.25, time);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
      sweepOsc.connect(sweepGain);
      sweepGain.connect(targetNode);
      sweepOsc.start(time);
      sweepOsc.stop(time + 0.25);
    }
  }

  stopFourTrack() {
    if (!this.fourTrack) return;
    this.fourTrack.isPlaying = false;
    this.fourTrack.isRecording = false;
    this.fourTrack.isPaused = false;
    if (this.fourTrack.timerInterval) {
      clearInterval(this.fourTrack.timerInterval);
      this.fourTrack.timerInterval = null;
    }
  }

  pauseFourTrack() {
    if (!this.fourTrack) return;
    this.fourTrack.isPaused = !this.fourTrack.isPaused;
  }

  rewindFourTrack() {
    if (!this.fourTrack) return;
    this.fourTrack.currentTime = Math.max(0, this.fourTrack.currentTime - 5);
  }

  fastForwardFourTrack() {
    if (!this.fourTrack) return;
    this.fourTrack.currentTime = Math.min(this.fourTrack.totalDuration, this.fourTrack.currentTime + 5);
  }

  returnToZeroFourTrack() {
    if (!this.fourTrack) return;
    this.fourTrack.currentTime = 0;
    this.fourTrack.rhythmStep = 0;
  }

  setTrackVolume(trkNum, val) {
    this.initFourTrack();
    const trk = this.fourTrack.tracks[trkNum];
    if (trk) {
      trk.volume = val;
      if (trk.gain) trk.gain.gain.value = trk.muted ? 0 : (trk.volume * trk.trim);
    }
  }

  setTrackTrim(trkNum, val) {
    this.initFourTrack();
    const trk = this.fourTrack.tracks[trkNum];
    if (trk) {
      trk.trim = val;
      if (trk.gain) trk.gain.gain.value = trk.muted ? 0 : (trk.volume * trk.trim);
    }
  }

  setTrackPan(trkNum, val) {
    this.initFourTrack();
    const trk = this.fourTrack.tracks[trkNum];
    if (trk) {
      trk.pan = val;
      if (trk.panner) trk.panner.pan.value = val;
    }
  }

  setTrackDelaySend(trkNum, val) {
    this.initFourTrack();
    const trk = this.fourTrack.tracks[trkNum];
    if (trk) {
      trk.delaySendAmount = val;
      if (trk.delaySendNode) trk.delaySendNode.gain.value = val;
    }
  }

  toggleTrackMute(trkNum) {
    this.initFourTrack();
    const trk = this.fourTrack.tracks[trkNum];
    if (trk) {
      trk.muted = !trk.muted;
      if (trk.gain) trk.gain.gain.value = trk.muted ? 0 : (trk.volume * trk.trim);
      return trk.muted;
    }
    return false;
  }

  toggleTrackSolo(trkNum) {
    this.initFourTrack();
    const trk = this.fourTrack.tracks[trkNum];
    if (trk) {
      trk.solo = !trk.solo;
      return trk.solo;
    }
    return false;
  }

  toggleTrackRecArm(trkNum) {
    this.initFourTrack();
    const trk = this.fourTrack.tracks[trkNum];
    if (trk) {
      trk.recArmed = !trk.recArmed;
      return trk.recArmed;
    }
    return false;
  }

  setMasterVolume(val) {
    this.initFourTrack();
    this.fourTrack.master.volume = val;
    if (this.fourTrack.master.gain) {
      this.fourTrack.master.gain.gain.value = val;
    }
  }

  setTapeSpeed(speed) {
    this.initFourTrack();
    this.fourTrack.tapeSpeed = speed;
  }

  triggerFourTrackChant(chantType) {
    this.initFourTrack();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    const target = this.fourTrack.tracks[3].gain || this.fourTrack.master.gain;

    const chantFrequencies = {
      killsound: [220, 196, 164.81],
      pullup: [293.66, 349.23, 440],
      morefire: [330, 392, 493.88],
      jahvisions: [261.63, 329.63, 392, 523.25]
    };

    const notes = chantFrequencies[chantType] || [261.63, 329.63, 392];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time + idx * 0.08);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, time);
      filter.Q.value = 4.0;

      gain.gain.setValueAtTime(0.35, time + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.08 + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(target);

      osc.start(time + idx * 0.08);
      osc.stop(time + idx * 0.08 + 0.4);
    });
  }

  triggerFourTrackFX(fxType) {
    this.initFourTrack();
    if (!this.ctx) return;
    const target = this.fourTrack.tracks[4].gain || this.fourTrack.master.gain;

    if (fxType === 'siren') {
      this.triggerDubSiren(2.0);
    } else if (fxType === 'horn') {
      this.triggerAirhorn();
    } else if (fxType === 'laser') {
      this.triggerLaser();
    } else if (fxType === 'spring') {
      const time = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, time);
      filter.Q.setValueAtTime(8.0, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(target);

      noise.start(time);
      noise.stop(time + 0.4);
    }
  }

  getFourTrackVULevels() {
    const levels = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, masterL: 0, masterR: 0 };
    if (!this.fourTrack || (!this.fourTrack.isPlaying && !this.fourTrack.isRecording)) {
      return levels;
    }

    const calcLevel = (analyser) => {
      if (!analyser) return 0;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const val = (data[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / data.length);
      return Math.min(1.0, rms * 2.8);
    };

    for (let i = 1; i <= 6; i++) {
      levels[i] = calcLevel(this.fourTrack.tracks[i]?.analyser);
    }
    levels.masterL = calcLevel(this.fourTrack.master?.analyserL);
    levels.masterR = calcLevel(this.fourTrack.master?.analyserR);
    return levels;
  }

  // =========================================================================
  // 4-TRACK AUDIO PLAYLIST & MINIMAL WAVEFORM EDITING ENGINE
  // Audio Curves, Scissors Slicing, Slip Trimming & Direct 4-Track Routing
  // Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
  // =========================================================================

  initPlaylistData() {
    this.playlistClips = [
      {
        id: 'clip-sleng-teng',
        title: 'Sleng Teng Riddim (King Jammy Cut)',
        category: 'riddim',
        duration: 16.0,
        bpm: 85,
        trimStart: 0.0,
        trimEnd: 16.0,
        cutPosition: 6.4,
        fadeInDur: 0.15,
        fadeInCurve: 'scurve',
        fadeOutDur: 0.35,
        fadeOutCurve: 'scurve',
        gainDb: 0.0,
        loop: true,
        assignedTrack: 1,
        seed: 101
      },
      {
        id: 'clip-stalag-17',
        title: 'Stalag 17 Riddim (Tubby Heavy Bass)',
        category: 'riddim',
        duration: 16.0,
        bpm: 82,
        trimStart: 0.0,
        trimEnd: 16.0,
        cutPosition: 8.0,
        fadeInDur: 0.1,
        fadeInCurve: 'exp',
        fadeOutDur: 0.4,
        fadeOutCurve: 'scurve',
        gainDb: 1.0,
        loop: true,
        assignedTrack: null,
        seed: 102
      },
      {
        id: 'clip-real-rock',
        title: 'Real Rock Riddim (Studio One Classic)',
        category: 'riddim',
        duration: 16.0,
        bpm: 76,
        trimStart: 0.0,
        trimEnd: 16.0,
        cutPosition: 4.0,
        fadeInDur: 0.2,
        fadeInCurve: 'linear',
        fadeOutDur: 0.5,
        fadeOutCurve: 'scurve',
        gainDb: 0.0,
        loop: true,
        assignedTrack: null,
        seed: 103
      },
      {
        id: 'clip-tour-riddim',
        title: 'Tour Riddim (Fireman Fast Skank)',
        category: 'riddim',
        duration: 16.0,
        bpm: 92,
        trimStart: 0.0,
        trimEnd: 16.0,
        cutPosition: 8.0,
        fadeInDur: 0.1,
        fadeInCurve: 'scurve',
        fadeOutDur: 0.3,
        fadeOutCurve: 'scurve',
        gainDb: 0.0,
        loop: true,
        assignedTrack: null,
        seed: 104
      },
      {
        id: 'clip-capleton-lead',
        title: "Capleton - 'Tour Slew Dem' Lead Toast",
        category: 'vocal',
        duration: 12.0,
        bpm: 92,
        trimStart: 0.5,
        trimEnd: 11.5,
        cutPosition: 4.8,
        fadeInDur: 0.25,
        fadeInCurve: 'scurve',
        fadeOutDur: 0.4,
        fadeOutCurve: 'scurve',
        gainDb: 1.5,
        loop: false,
        assignedTrack: 2,
        seed: 201
      },
      {
        id: 'clip-spice-lead',
        title: "Spice - 'So Mi Like It' Dubplate Verse",
        category: 'vocal',
        duration: 14.0,
        bpm: 98,
        trimStart: 0.25,
        trimEnd: 13.5,
        cutPosition: 7.0,
        fadeInDur: 0.15,
        fadeInCurve: 'scurve',
        fadeOutDur: 0.35,
        fadeOutCurve: 'scurve',
        gainDb: 1.0,
        loop: false,
        assignedTrack: null,
        seed: 202
      },
      {
        id: 'clip-buju-lead',
        title: "Buju Banton - 'Champion Sound' Intro Cut",
        category: 'vocal',
        duration: 10.0,
        bpm: 85,
        trimStart: 0.0,
        trimEnd: 9.8,
        cutPosition: 5.0,
        fadeInDur: 0.1,
        fadeInCurve: 'linear',
        fadeOutDur: 0.5,
        fadeOutCurve: 'exp',
        gainDb: 2.0,
        loop: false,
        assignedTrack: null,
        seed: 203
      },
      {
        id: 'clip-chant-killsound',
        title: "Chant Take: 'Kill Sound Boy Dead!'",
        category: 'chant',
        duration: 4.0,
        bpm: 85,
        trimStart: 0.0,
        trimEnd: 3.8,
        cutPosition: 1.8,
        fadeInDur: 0.05,
        fadeInCurve: 'linear',
        fadeOutDur: 0.25,
        fadeOutCurve: 'scurve',
        gainDb: 2.5,
        loop: false,
        assignedTrack: 3,
        seed: 301
      },
      {
        id: 'clip-chant-pullup',
        title: "Chant Take: 'Pull Up Selecta Rewind!'",
        category: 'chant',
        duration: 3.5,
        bpm: 85,
        trimStart: 0.0,
        trimEnd: 3.2,
        cutPosition: 1.5,
        fadeInDur: 0.05,
        fadeInCurve: 'linear',
        fadeOutDur: 0.3,
        fadeOutCurve: 'scurve',
        gainDb: 2.0,
        loop: false,
        assignedTrack: null,
        seed: 302
      },
      {
        id: 'clip-chant-jahvisions',
        title: "Chant Take: 'Jahvisions Sound Rules!'",
        category: 'chant',
        duration: 4.5,
        bpm: 85,
        trimStart: 0.1,
        trimEnd: 4.2,
        cutPosition: 2.1,
        fadeInDur: 0.1,
        fadeInCurve: 'scurve',
        fadeOutDur: 0.4,
        fadeOutCurve: 'scurve',
        gainDb: 2.0,
        loop: false,
        assignedTrack: null,
        seed: 303
      },
      {
        id: 'clip-fx-siren',
        title: "Dub Siren Sweep (Analog King Tubby)",
        category: 'fx',
        duration: 6.0,
        bpm: 85,
        trimStart: 0.0,
        trimEnd: 5.8,
        cutPosition: 2.5,
        fadeInDur: 0.1,
        fadeInCurve: 'scurve',
        fadeOutDur: 0.8,
        fadeOutCurve: 'scurve',
        gainDb: 0.0,
        loop: false,
        assignedTrack: 4,
        seed: 401
      },
      {
        id: 'clip-fx-airhorn',
        title: "Sound Clash Airhorn Blast (Triple)",
        category: 'fx',
        duration: 3.0,
        bpm: 85,
        trimStart: 0.0,
        trimEnd: 2.9,
        cutPosition: 1.2,
        fadeInDur: 0.02,
        fadeInCurve: 'linear',
        fadeOutDur: 0.4,
        fadeOutCurve: 'exp',
        gainDb: 1.0,
        loop: false,
        assignedTrack: null,
        seed: 402
      },
      {
        id: 'clip-fx-spring',
        title: "Tubby Spring Reverb Tank Crash",
        category: 'fx',
        duration: 4.0,
        bpm: 85,
        trimStart: 0.0,
        trimEnd: 3.8,
        cutPosition: 1.5,
        fadeInDur: 0.01,
        fadeInCurve: 'linear',
        fadeOutDur: 0.9,
        fadeOutCurve: 'scurve',
        gainDb: 0.0,
        loop: false,
        assignedTrack: null,
        seed: 403
      }
    ];
  }

  getPlaylistClips(filter = 'all') {
    if (filter === 'all') return this.playlistClips;
    return this.playlistClips.filter(c => c.category === filter);
  }

  getClip(clipId) {
    return this.playlistClips.find(c => c.id === clipId) || null;
  }

  splitClip(clipId, cutTime) {
    const idx = this.playlistClips.findIndex(c => c.id === clipId);
    if (idx === -1) return null;
    const orig = this.playlistClips[idx];

    // Ensure cutTime is between trimStart and trimEnd with safety margins
    const cut = Math.max(orig.trimStart + 0.2, Math.min(orig.trimEnd - 0.2, cutTime));
    const cleanTitle = orig.title.replace(/\s*\(Part \d+\)/g, '');

    // Part 1: start to cut
    const part1 = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `${orig.id}-pt1-${Math.random().toString(36).substring(2, 6)}`,
      title: `${cleanTitle} (Part 1)`,
      trimStart: orig.trimStart,
      trimEnd: Math.round(cut * 100) / 100,
      duration: Math.round(cut * 10) / 10,
      cutPosition: Math.round((orig.trimStart + (cut - orig.trimStart) * 0.5) * 10) / 10,
      fadeOutDur: Math.min(orig.fadeOutDur, Math.max(0.05, (cut - orig.trimStart) * 0.25)),
      seed: orig.seed + 11
    };

    // Part 2: cut to end
    const part2 = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `${orig.id}-pt2-${Math.random().toString(36).substring(2, 6)}`,
      title: `${cleanTitle} (Part 2)`,
      trimStart: Math.round(cut * 100) / 100,
      trimEnd: orig.trimEnd,
      duration: Math.round((orig.trimEnd - cut) * 10) / 10,
      cutPosition: Math.round((cut + (orig.trimEnd - cut) * 0.5) * 10) / 10,
      fadeInDur: Math.min(orig.fadeInDur, Math.max(0.05, (orig.trimEnd - cut) * 0.25)),
      assignedTrack: null, // leave unassigned so it doesn't conflict
      seed: orig.seed + 22
    };

    // Replace original with part 1 and part 2 in playlist
    this.playlistClips.splice(idx, 1, part1, part2);
    this.triggerScissorsCut();

    return { part1, part2 };
  }

  trimClip(clipId, trimStart, trimEnd) {
    const clip = this.getClip(clipId);
    if (!clip) return;
    clip.trimStart = Math.max(0, Math.min(trimStart, clip.duration - 0.1));
    clip.trimEnd = Math.max(clip.trimStart + 0.1, Math.min(trimEnd, clip.duration));
    if (clip.cutPosition < clip.trimStart || clip.cutPosition > clip.trimEnd) {
      clip.cutPosition = (clip.trimStart + clip.trimEnd) / 2;
    }
  }

  updateClipCurves(clipId, params) {
    const clip = this.getClip(clipId);
    if (!clip) return;
    if (params.fadeInDur !== undefined) clip.fadeInDur = params.fadeInDur;
    if (params.fadeInCurve !== undefined) clip.fadeInCurve = params.fadeInCurve;
    if (params.fadeOutDur !== undefined) clip.fadeOutDur = params.fadeOutDur;
    if (params.fadeOutCurve !== undefined) clip.fadeOutCurve = params.fadeOutCurve;
    if (params.gainDb !== undefined) clip.gainDb = params.gainDb;
  }

  duplicateClip(clipId) {
    const orig = this.getClip(clipId);
    if (!orig) return null;
    const copy = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `${orig.id}-copy-${Math.random().toString(36).substring(2, 6)}`,
      title: `${orig.title} (Copy)`,
      assignedTrack: null,
      seed: orig.seed + 5
    };
    const idx = this.playlistClips.findIndex(c => c.id === clipId);
    this.playlistClips.splice(idx + 1, 0, copy);
    return copy;
  }

  deleteClip(clipId) {
    const idx = this.playlistClips.findIndex(c => c.id === clipId);
    if (idx !== -1) {
      const removed = this.playlistClips.splice(idx, 1)[0];
      return removed;
    }
    return null;
  }

  resetClip(clipId) {
    const clip = this.getClip(clipId);
    if (!clip) return;
    clip.trimStart = 0;
    clip.trimEnd = clip.duration;
    clip.cutPosition = clip.duration * 0.4;
    clip.fadeInDur = 0.15;
    clip.fadeInCurve = 'scurve';
    clip.fadeOutDur = 0.35;
    clip.fadeOutCurve = 'scurve';
    clip.gainDb = 0;
  }

  resetAllClips() {
    this.stopAudition();
    this.initPlaylistData();
  }

  assignClipToTrack(clipId, trkNum) {
    // Unassign previous clip on target track
    this.playlistClips.forEach(c => {
      if (c.assignedTrack === trkNum) {
        c.assignedTrack = null;
      }
    });

    const clip = this.getClip(clipId);
    if (clip) {
      clip.assignedTrack = trkNum;
    }
  }

  getCurveGainValue(t, curveType) {
    const clamped = Math.max(0, Math.min(1, t));
    if (curveType === 'linear') {
      return clamped;
    } else if (curveType === 'exp') {
      return Math.pow(clamped, 2);
    } else { // scurve / smoothstep
      return 3 * Math.pow(clamped, 2) - 2 * Math.pow(clamped, 3);
    }
  }

  generateAudioCurvePoints(dur, curveType, direction = 'in', steps = 32) {
    const points = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const val = this.getCurveGainValue(t, curveType);
      points[i] = direction === 'in' ? val : (1.0 - val);
    }
    return points;
  }

  triggerScissorsCut() {
    this.initContext();
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    
    // Crisp metallic snip
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(3400, time);
    osc.frequency.exponentialRampToValueAtTime(750, time + 0.04);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, time);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  auditionClip(clipId, onProgress, onEnd) {
    this.stopAudition();
    this.initContext();
    if (!this.ctx) return;

    const clip = this.getClip(clipId);
    if (!clip) return;

    const duration = Math.max(0.2, clip.trimEnd - clip.trimStart);
    const startTime = this.ctx.currentTime;
    const stopTime = startTime + duration;

    // Gain node applying Curves & Gain DB
    const curveGainNode = this.ctx.createGain();
    const linearGain = Math.pow(10, (clip.gainDb || 0) / 20);

    // Apply Fade In Curve
    const inDur = Math.max(0.01, Math.min(clip.fadeInDur || 0.05, duration * 0.45));
    const inPoints = this.generateAudioCurvePoints(inDur, clip.fadeInCurve || 'scurve', 'in', 32);
    for (let i = 0; i < inPoints.length; i++) inPoints[i] *= linearGain;
    curveGainNode.gain.setValueCurveAtTime(inPoints, startTime, inDur);

    // Apply Fade Out Curve
    const outDur = Math.max(0.01, Math.min(clip.fadeOutDur || 0.1, duration * 0.45));
    const outPoints = this.generateAudioCurvePoints(outDur, clip.fadeOutCurve || 'scurve', 'out', 32);
    for (let i = 0; i < outPoints.length; i++) outPoints[i] *= linearGain;
    curveGainNode.gain.setValueCurveAtTime(outPoints, stopTime - outDur, outDur);

    curveGainNode.connect(this.masterGain);

    // Synthesize clip audio or play decoded buffer
    const activeNodes = [];
    if (clip.audioBuffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = clip.audioBuffer;
      source.connect(curveGainNode);
      source.start(startTime, clip.trimStart, duration);
      activeNodes.push(source);
    } else {
      // Synthesize based on category
      if (clip.category === 'riddim') {
        const bpm = clip.bpm || 85;
        const beatSec = 60 / bpm;
        const totalBeats = Math.floor(duration / beatSec);
        for (let b = 0; b < totalBeats; b++) {
          const t = startTime + b * beatSec;
          // Kick + Bass
          const kick = this.ctx.createOscillator();
          const kickG = this.ctx.createGain();
          kick.frequency.setValueAtTime(110, t);
          kick.frequency.exponentialRampToValueAtTime(45, t + 0.1);
          kickG.gain.setValueAtTime(0.6, t);
          kickG.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          kick.connect(kickG);
          kickG.connect(curveGainNode);
          kick.start(t);
          kick.stop(t + 0.13);
          activeNodes.push(kick);

          // Skank
          const skank = this.ctx.createOscillator();
          const skankG = this.ctx.createGain();
          skank.type = 'sawtooth';
          skank.frequency.setValueAtTime(330, t + beatSec * 0.5);
          skankG.gain.setValueAtTime(0.18, t + beatSec * 0.5);
          skankG.gain.exponentialRampToValueAtTime(0.001, t + beatSec * 0.5 + 0.08);
          skank.connect(skankG);
          skankG.connect(curveGainNode);
          skank.start(t + beatSec * 0.5);
          skank.stop(t + beatSec * 0.5 + 0.09);
          activeNodes.push(skank);
        }
      } else if (clip.category === 'vocal') {
        const notes = [220, 261.63, 293.66, 329.63, 392];
        const stepSec = 0.22;
        const totalSteps = Math.floor(duration / stepSec);
        for (let s = 0; s < totalSteps; s++) {
          const t = startTime + s * stepSec;
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const g = this.ctx.createGain();
          osc.type = 'sawtooth';
          const freq = notes[s % notes.length];
          osc.frequency.setValueAtTime(freq, t);
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(950 + (s % 3) * 200, t);
          filter.Q.value = 3.5;
          g.gain.setValueAtTime(0.28, t);
          g.gain.exponentialRampToValueAtTime(0.01, t + stepSec * 0.9);
          osc.connect(filter);
          filter.connect(g);
          g.connect(curveGainNode);
          osc.start(t);
          osc.stop(t + stepSec);
          activeNodes.push(osc);
        }
      } else if (clip.category === 'chant') {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, startTime);
        osc.frequency.exponentialRampToValueAtTime(140, stopTime);
        g.gain.setValueAtTime(0.35, startTime);
        g.gain.exponentialRampToValueAtTime(0.01, stopTime);
        osc.connect(g);
        g.connect(curveGainNode);
        osc.start(startTime);
        osc.stop(stopTime);
        activeNodes.push(osc);
      } else { // FX
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, startTime);
        osc.frequency.linearRampToValueAtTime(1800, startTime + duration * 0.5);
        osc.frequency.linearRampToValueAtTime(300, stopTime);
        g.gain.setValueAtTime(0.3, startTime);
        g.gain.exponentialRampToValueAtTime(0.01, stopTime);
        osc.connect(g);
        g.connect(curveGainNode);
        osc.start(startTime);
        osc.stop(stopTime);
        activeNodes.push(osc);
      }
    }

    // Playback progress ticker
    const timer = setInterval(() => {
      const elapsed = this.ctx.currentTime - startTime;
      if (elapsed >= duration) {
        if (clip.loop) {
          // Loop restart
          this.auditionClip(clipId, onProgress, onEnd);
        } else {
          this.stopAudition();
          if (onEnd) onEnd();
        }
      } else {
        if (onProgress) onProgress(clip.trimStart + elapsed, clip.duration, elapsed / duration);
      }
    }, 40);

    this.activeAudition = {
      clipId,
      nodes: activeNodes,
      curveGainNode,
      timer,
      onEnd
    };
  }

  stopAudition() {
    if (this.activeAudition) {
      clearInterval(this.activeAudition.timer);
      this.activeAudition.nodes.forEach(n => {
        try { n.stop(); n.disconnect(); } catch (e) {}
      });
      try { this.activeAudition.curveGainNode?.disconnect(); } catch (e) {}
      if (this.activeAudition.onEnd) {
        this.activeAudition.onEnd();
      }
      this.activeAudition = null;
    }
  }

  async importAudioFile(file) {
    this.initContext();
    if (!this.ctx) return null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      const dur = Math.round(audioBuffer.duration * 10) / 10;
      const newClip = {
        id: `custom-${Date.now().toString(36)}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        category: 'vocal',
        duration: dur,
        bpm: 85,
        trimStart: 0,
        trimEnd: dur,
        cutPosition: Math.round(dur * 0.4 * 10) / 10,
        fadeInDur: 0.1,
        fadeInCurve: 'scurve',
        fadeOutDur: 0.25,
        fadeOutCurve: 'scurve',
        gainDb: 0,
        loop: false,
        assignedTrack: null,
        audioBuffer,
        seed: Math.floor(Math.random() * 9000)
      };
      this.playlistClips.unshift(newClip);
      return newClip;
    } catch (err) {
      console.error('Audio import failed:', err);
      return null;
    }
  }

  downloadDubFile(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}

window.dubEngine = new GlobalDubAudioEngine();

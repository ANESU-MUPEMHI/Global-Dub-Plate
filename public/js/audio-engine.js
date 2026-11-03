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

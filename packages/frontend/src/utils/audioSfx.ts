/**
 * Cyber CTF Arena Web Audio Synthesizer & Sound Effects Engine
 * 
 * Provides zero-latency, offline-compatible procedural sound synthesis for:
 * - Laser shots (Plasma blasters)
 * - Explosive hits & boss impacts
 * - Shield misses & deflects
 * - Top Orbiting Squad rank position shifts
 * - Live battle feed telemetry blips
 * - Dota-style First Blood voice & war horn announcements
 */

class AudioSfxManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private soundEnabled: boolean = true;
  private isUnlocked: boolean = false;
  private lastFirstBloodTime: number = 0;
  private lastFreezeSoundTime: number = 0;
  private lastUnfreezeSoundTime: number = 0;

  constructor() {
    try {
      const saved = localStorage.getItem('scoreboard_sound_enabled');
      this.soundEnabled = saved !== null ? saved === 'true' : true;
    } catch {
      this.soundEnabled = true;
    }

    // Auto-unlock audio on first user interaction anywhere on the screen
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.unlock();
        ['click', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) => {
          window.removeEventListener(evt, unlockAudio);
        });
      };
      ['click', 'touchstart', 'keydown', 'pointerdown'].forEach((evt) => {
        window.addEventListener(evt, unlockAudio, { passive: true, once: true });
      });
    }
  }

  public unlock(): boolean {
    const ctx = this.getContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => { });
      } else {
        this.isUnlocked = true;
      }
      return true;
    }
    return false;
  }

  private getContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }
    return this.ctx;
  }

  private getDestination(): AudioNode {
    const ctx = this.getContext();
    if (this.masterGain) return this.masterGain;
    return ctx ? ctx.destination : ({} as any);
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('scoreboard_sound_enabled', String(enabled));
    } catch { }
  }

  public toggle(): boolean {
    const nextState = !this.soundEnabled;
    this.setEnabled(nextState);
    if (nextState) {
      this.unlock();
      // Play instant confirmation preview sound
      setTimeout(() => {
        this.playLaserShoot(false);
      }, 50);
    }
    return nextState;
  }

  /**
   * 0. SUPER-DRAMATIC LASER CHARGING SFX (3s Multi-Phase Energy Ingathering & Hyper-Drive Riser)
   */
  public playLaserCharge(isFirstBlood: boolean = false, duration: number = 3) {
    if (!this.soundEnabled) return;
    this.unlock();
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dest = this.getDestination();

    // Phase 1 & 2: Sub-Bass Seismic Power Core Drone (35Hz -> 90Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(38, now);
    subOsc.frequency.exponentialRampToValueAtTime(110, now + duration);

    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(120, now);
    subFilter.frequency.linearRampToValueAtTime(380, now + duration);

    subGain.gain.setValueAtTime(0.15, now);
    subGain.gain.linearRampToValueAtTime(0.65, now + duration * 0.85);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.08);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(dest);
    subOsc.start(now);
    subOsc.stop(now + duration + 0.1);

    // Phase 2: Main Hyper-Capacitor Frequency Riser (90Hz -> 2800Hz)
    const riserOsc = ctx.createOscillator();
    const riserGain = ctx.createGain();
    const riserFilter = ctx.createBiquadFilter();

    riserOsc.type = isFirstBlood ? 'sawtooth' : 'triangle';
    const startFreq = isFirstBlood ? 110 : 85;
    const endFreq = isFirstBlood ? 3200 : 2400;

    riserOsc.frequency.setValueAtTime(startFreq, now);
    riserOsc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    riserFilter.type = 'lowpass';
    riserFilter.frequency.setValueAtTime(startFreq * 3.5, now);
    riserFilter.frequency.exponentialRampToValueAtTime(Math.min(18000, endFreq * 2.5), now + duration);

    riserGain.gain.setValueAtTime(0.04, now);
    riserGain.gain.linearRampToValueAtTime(0.55, now + duration * 0.92);
    riserGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.08);

    riserOsc.connect(riserFilter);
    riserFilter.connect(riserGain);
    riserGain.connect(dest);

    riserOsc.start(now);
    riserOsc.stop(now + duration + 0.1);

    // Phase 3: Accelerating Strobe Magnetic Pulse (Tremolo LFO from 4Hz to 32Hz)
    const pulseOsc = ctx.createOscillator();
    const pulseGain = ctx.createGain();
    pulseOsc.type = 'square';
    pulseOsc.frequency.setValueAtTime(70, now);
    pulseOsc.frequency.exponentialRampToValueAtTime(450, now + duration);

    // LFO modulator for rapid pulsing
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(4, now);
    lfo.frequency.exponentialRampToValueAtTime(32, now + duration);
    lfoGain.gain.setValueAtTime(0.35, now);

    lfo.connect(pulseGain.gain);
    pulseOsc.connect(pulseGain);
    pulseGain.connect(dest);

    pulseOsc.start(now);
    lfo.start(now);
    pulseOsc.stop(now + duration + 0.08);
    lfo.stop(now + duration + 0.08);

    // Climax Electrical Plasma Sparks (High frequency noise snaps right before fire)
    try {
      const snapTime = now + duration * 0.75;
      const snapDuration = duration * 0.25;
      const bufferSize = Math.floor(ctx.sampleRate * snapDuration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(i / bufferSize, 2);
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(2500, snapTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.02, snapTime);
      noiseGain.gain.linearRampToValueAtTime(0.45, now + duration);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.05);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);

      noiseSource.start(snapTime);
      noiseSource.stop(now + duration + 0.06);
    } catch { }
  }

  /**
   * 1. DRAMATIC LASER SHOOT SFX (Crisp, Piercing Sci-Fi "CIUUUUW / PEWWW" Laser Blaster)
   */
  public playLaserShoot(isFirstBlood: boolean = false) {
    if (!this.soundEnabled) return;
    this.unlock();
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dest = this.getDestination();
    const duration = isFirstBlood ? 0.55 : 0.40;

    // Layer 1: Piercing Resonant Sci-Fi Laser "CIUUUUW" Sweep (High Q Filter)
    const laserOsc = ctx.createOscillator();
    const laserGain = ctx.createGain();
    const laserFilter = ctx.createBiquadFilter();

    laserOsc.type = isFirstBlood ? 'sawtooth' : 'triangle';
    const startFreq = isFirstBlood ? 3600 : 2800;
    const endFreq = isFirstBlood ? 160 : 120;

    laserOsc.frequency.setValueAtTime(startFreq, now);
    laserOsc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    // Resonant filter sweep creates the signature "CIUUUUW" laser whip sound
    laserFilter.type = 'lowpass';
    laserFilter.Q.setValueAtTime(isFirstBlood ? 14.0 : 10.0, now);
    laserFilter.frequency.setValueAtTime(startFreq * 1.5, now);
    laserFilter.frequency.exponentialRampToValueAtTime(250, now + duration);

    laserGain.gain.setValueAtTime(0.95, now);
    laserGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    laserOsc.connect(laserFilter);
    laserFilter.connect(laserGain);
    laserGain.connect(dest);

    laserOsc.start(now);
    laserOsc.stop(now + duration + 0.05);

    // Layer 2: Heavy Plasma Sub Cannon Punch (Bass thump behind the pew)
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(isFirstBlood ? 180 : 140, now);
    kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.18);
    kickGain.gain.setValueAtTime(0.85, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    kickOsc.connect(kickGain);
    kickGain.connect(dest);
    kickOsc.start(now);
    kickOsc.stop(now + 0.25);

    // Layer 3: Stereo Detuned Harmonic Shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(startFreq * 1.15, now);
    osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.2, now + duration * 0.85);

    gain2.gain.setValueAtTime(isFirstBlood ? 0.5 : 0.35, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.85);

    osc2.connect(gain2);
    gain2.connect(dest);
    osc2.start(now);
    osc2.stop(now + duration);
  }

  /**
   * 2. MASSIVE SOLAR IMPACT / EXPLOSION HIT SFX (Ultra-Heavy Explosive Thunder, Fireball Roar, Transient Punch & Seismic Shockwave)
   */
  public playLaserHit(isFirstBlood: boolean = false) {
    if (!this.soundEnabled) return;
    this.unlock();
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
      }
    } catch { }

    const now = ctx.currentTime;
    const dest = this.getDestination();
    const duration = isFirstBlood ? 2.5 : 1.8;

    // --- LAYER 1: Immediate Explosive Punch Transient / Shockwave Pop ---
    try {
      const punchOsc = ctx.createOscillator();
      const punchGain = ctx.createGain();
      punchOsc.type = 'triangle';
      punchOsc.frequency.setValueAtTime(isFirstBlood ? 520 : 420, now);
      punchOsc.frequency.linearRampToValueAtTime(45, now + 0.22);

      punchGain.gain.setValueAtTime(1.4, now);
      punchGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);

      punchOsc.connect(punchGain);
      punchGain.connect(dest);
      punchOsc.start(now);
      punchOsc.stop(now + 0.28);
    } catch { }

    // --- LAYER 2: Deep Detonating Plasma Thunder Blast (Sawtooth + Triangle Crunch) ---
    try {
      const boomOsc1 = ctx.createOscillator();
      const boomOsc2 = ctx.createOscillator();
      const boomGain = ctx.createGain();
      const boomFilter = ctx.createBiquadFilter();

      boomOsc1.type = 'sawtooth';
      boomOsc2.type = 'triangle';
      boomOsc1.frequency.setValueAtTime(isFirstBlood ? 220 : 180, now);
      boomOsc1.frequency.linearRampToValueAtTime(32, now + duration);
      boomOsc2.frequency.setValueAtTime(isFirstBlood ? 160 : 130, now);
      boomOsc2.frequency.linearRampToValueAtTime(28, now + duration);

      boomFilter.type = 'lowpass';
      boomFilter.frequency.setValueAtTime(isFirstBlood ? 2800 : 2000, now);
      boomFilter.frequency.linearRampToValueAtTime(120, now + duration);

      boomGain.gain.setValueAtTime(isFirstBlood ? 1.3 : 1.0, now);
      boomGain.gain.linearRampToValueAtTime(0.0001, now + duration);

      boomOsc1.connect(boomFilter);
      boomOsc2.connect(boomFilter);
      boomFilter.connect(boomGain);
      boomGain.connect(dest);

      boomOsc1.start(now);
      boomOsc2.start(now);
      boomOsc1.stop(now + duration + 0.05);
      boomOsc2.stop(now + duration + 0.05);
    } catch { }

    // --- LAYER 3: AudioBuffer White-Noise Blast (Broadband Roaring Fireball & Shrapnel Crackle) ---
    try {
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        const decay = Math.exp(-progress * 2.5);
        output[i] = (Math.random() * 2 - 1) * decay;
      }

      // Roaring Fireball Lowpass (Audible "KABOOOOM / CRAAASH")
      const roarNoise = ctx.createBufferSource();
      roarNoise.buffer = buffer;
      const roarFilter = ctx.createBiquadFilter();
      roarFilter.type = 'lowpass';
      roarFilter.frequency.setValueAtTime(isFirstBlood ? 4200 : 3200, now);
      roarFilter.frequency.linearRampToValueAtTime(220, now + duration);

      const roarGain = ctx.createGain();
      roarGain.gain.setValueAtTime(isFirstBlood ? 1.3 : 1.0, now);
      roarGain.gain.linearRampToValueAtTime(0.0001, now + duration);

      roarNoise.connect(roarFilter);
      roarFilter.connect(roarGain);
      roarGain.connect(dest);
      roarNoise.start(now);
      roarNoise.stop(now + duration + 0.05);

      // Shrapnel Crackle
      const crackleNoise = ctx.createBufferSource();
      crackleNoise.buffer = buffer;
      const crackleFilter = ctx.createBiquadFilter();
      crackleFilter.type = 'bandpass';
      crackleFilter.frequency.setValueAtTime(1600, now);
      crackleFilter.Q.setValueAtTime(2.5, now);

      const crackleGain = ctx.createGain();
      crackleGain.gain.setValueAtTime(isFirstBlood ? 0.8 : 0.55, now);
      crackleGain.gain.linearRampToValueAtTime(0.0001, now + duration * 0.7);

      crackleNoise.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(dest);
      crackleNoise.start(now);
      crackleNoise.stop(now + duration * 0.75);
    } catch { }

    // --- LAYER 4: Heavy Sub-Bass Core Thump (160Hz -> 28Hz) ---
    try {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.linearRampToValueAtTime(26, now + duration);

      subGain.gain.setValueAtTime(isFirstBlood ? 1.2 : 0.9, now);
      subGain.gain.linearRampToValueAtTime(0.0001, now + duration);

      subOsc.connect(subGain);
      subGain.connect(dest);
      subOsc.start(now);
      subOsc.stop(now + duration + 0.05);
    } catch { }

    // --- LAYER 5: For First Blood: Deep Supernova Gong Resonance ---
    if (isFirstBlood) {
      try {
        const gongOsc = ctx.createOscillator();
        const gongGain = ctx.createGain();
        gongOsc.type = 'sawtooth';
        gongOsc.frequency.setValueAtTime(140, now);
        gongOsc.frequency.linearRampToValueAtTime(32, now + 2.0);

        const gongFilter = ctx.createBiquadFilter();
        gongFilter.type = 'bandpass';
        gongFilter.frequency.setValueAtTime(460, now);
        gongFilter.Q.setValueAtTime(3.0, now);

        gongGain.gain.setValueAtTime(1.0, now);
        gongGain.gain.linearRampToValueAtTime(0.0001, now + 2.0);

        gongOsc.connect(gongFilter);
        gongFilter.connect(gongGain);
        gongGain.connect(dest);

        gongOsc.start(now);
        gongOsc.stop(now + 2.05);
      } catch { }
    }
  }

  /**
   * 3. MISS / FORCEFIELD SHIELD DEFLECT SFX (Metallic Ricochet "TCHIIINGGG-BZZZZT" & Electric Spark Fizzle)
   */
  public playMissDeflect() {
    if (!this.soundEnabled) return;
    this.unlock();
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dest = this.getDestination();
    const duration = 0.45;

    // Layer 1: High-Tech Metallic Forcefield Ricochet Ping ("TCHIIINGGG")
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.linearRampToValueAtTime(320, now + duration);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.linearRampToValueAtTime(500, now + duration);
      filter.Q.setValueAtTime(12.0, now);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch { }

    // Layer 2: Electric Forcefield Plasma Spark Fizzle ("KSHHH / BZZZT")
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.28);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(3000, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, now);
      noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.28);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.3);
    } catch { }

    // Layer 3: Kinetic Forcefield Dissonant Rebound Thud
    try {
      const buzzOsc = ctx.createOscillator();
      const buzzGain = ctx.createGain();
      buzzOsc.type = 'sawtooth';
      buzzOsc.frequency.setValueAtTime(180, now);
      buzzOsc.frequency.linearRampToValueAtTime(60, now + 0.22);
      buzzGain.gain.setValueAtTime(0.5, now);
      buzzGain.gain.linearRampToValueAtTime(0.0001, now + 0.22);

      buzzOsc.connect(buzzGain);
      buzzGain.connect(dest);
      buzzOsc.start(now);
      buzzOsc.stop(now + 0.25);
    } catch { }
  }

  /**
   * 4. TOP ORBIT SQUADS RANK SHIFT / OVERTAKE SFX
   */
  public playRankShift() {
    if (!this.soundEnabled) return;
    this.unlock();
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dest = this.getDestination();
    // Ascending high-tech cyber arpeggio (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];

    try {
      notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.24, startTime);
        gain.gain.linearRampToValueAtTime(0.0001, startTime + 0.18);

        osc.connect(gain);
        gain.connect(dest);

        osc.start(startTime);
        osc.stop(startTime + 0.22);
      });

      // Sub whoosh sweep
      const whoosh = ctx.createOscillator();
      const whooshGain = ctx.createGain();
      whoosh.type = 'triangle';
      whoosh.frequency.setValueAtTime(200, now);
      whoosh.frequency.linearRampToValueAtTime(600, now + 0.2);
      whooshGain.gain.setValueAtTime(0.2, now);
      whooshGain.gain.linearRampToValueAtTime(0.0001, now + 0.22);

      whoosh.connect(whooshGain);
      whooshGain.connect(dest);
      whoosh.start(now);
      whoosh.stop(now + 0.25);
    } catch { }
  }

  /**
   * 5. LIVE BATTLE FEED TELEMETRY BLIP SFX
   */
  public playFeedBlip(isHit: boolean) {
    if (!this.soundEnabled) return;
    this.unlock();
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dest = this.getDestination();

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (isHit) {
        osc.frequency.setValueAtTime(980, now);
        osc.frequency.linearRampToValueAtTime(1480, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
      } else {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
      }

      gain.gain.linearRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch { }
  }

  /**
   * 6. DOTA-STYLE FIRST BLOOD ANNOUNCEMENT (Uses /sfx/announcer_1stblood_01.mp3)
   */
  public playFirstBloodDota(teamName?: string) {
    if (!this.soundEnabled) return;
    const now = Date.now();
    // Guard against duplicate playback within 5 seconds
    if (now - this.lastFirstBloodTime < 5000) {
      return;
    }
    this.lastFirstBloodTime = now;
    this.unlock();

    // 1. Play authentic Dota First Blood announcer sound file
    try {
      const audio = new Audio('/sfx/announcer_1stblood_01.mp3');
      audio.volume = 1.0;
      audio.play().catch((err) => {
        console.warn('First Blood MP3 audio playback error:', err);
      });
    } catch (e) {
      console.warn('First Blood MP3 init error:', e);
    }
  }

  /**
   * 7. CRYOGENIC FREEZE / FROST CRYSTALLIZATION SFX
   * Rich multi-layer audio synthesis:
   * - Layer 1: Sub-zero frost shockwave blast (resonant low sweep with deep arctic boom)
   * - Layer 2: Freezing polar wind & filtered white noise turbulence
   * - Layer 3: Crystalline ice shimmer arpeggio (sparkling frost chimes)
   * - Layer 4: Rapid ice lattice micro-crackles
   */
  public playFreezeSound() {
    if (!this.soundEnabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastFreezeSoundTime < 2000) return;
    this.lastFreezeSoundTime = nowMs;
    this.unlock();

    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getDestination();

    // Layer 1: Deep Arctic Cryo-Shockwave Sweep (Deep Rumble to sub-bass)
    try {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(220, now);
      subOsc.frequency.exponentialRampToValueAtTime(38, now + 1.2);

      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.linearRampToValueAtTime(0.65, now + 0.15);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      subOsc.connect(subGain);
      subGain.connect(dest);
      subOsc.start(now);
      subOsc.stop(now + 1.5);
    } catch { }

    // Layer 2: Freezing Polar Wind & Frost White Noise Sweep
    try {
      const bufSize = Math.floor(ctx.sampleRate * 1.6);
      const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(2800, now + 0.8);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 1.5);
      filter.Q.setValueAtTime(4.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.45, now + 0.3);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);

      noise.start(now);
      noise.stop(now + 1.6);
    } catch { }

    // Layer 3: Crystalline Ice Shimmer Arpeggio (Sparkling Frost Chimes)
    const frostFrequencies = [1480, 1960, 2637, 3520, 4186, 5274];
    frostFrequencies.forEach((freq, idx) => {
      try {
        const chimeStartTime = now + 0.08 + idx * 0.065;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, chimeStartTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.04, chimeStartTime + 0.4);

        gain.gain.setValueAtTime(0.2, chimeStartTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, chimeStartTime + 0.6);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(chimeStartTime);
        osc.stop(chimeStartTime + 0.65);
      } catch { }
    });

    // Layer 4: Rapid Ice Micro-Crackles
    for (let c = 0; c < 8; c++) {
      try {
        const crackTime = now + 0.15 + c * 0.08 + Math.random() * 0.04;
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(3200 + Math.random() * 2000, crackTime);
        clickGain.gain.setValueAtTime(0.22, crackTime);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, crackTime + 0.025);

        clickOsc.connect(clickGain);
        clickGain.connect(dest);
        clickOsc.start(crackTime);
        clickOsc.stop(crackTime + 0.03);
      } catch { }
    }
  }

  /**
   * 8. UNFREEZE / THAW / ICE SHATTER & RADIANT WARMTH SFX
   * Rich multi-layer audio synthesis:
   * - Layer 1: Glassy Ice Shattering & Crystalline Fracture Burst
   * - Layer 2: Ascending Solar Warmth & Harmonic Resonance Sweep
   * - Layer 3: Sparkling crystal dust dissipation chime
   */
  public playUnfreezeSound() {
    if (!this.soundEnabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastUnfreezeSoundTime < 2000) return;
    this.lastUnfreezeSoundTime = nowMs;
    this.unlock();

    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getDestination();

    // Layer 1: Crystalline Ice Shatter Impact & Fracture Burst
    try {
      const shatterBufSize = Math.floor(ctx.sampleRate * 0.6);
      const shatterBuffer = ctx.createBuffer(1, shatterBufSize, ctx.sampleRate);
      const data = shatterBuffer.getChannelData(0);
      for (let i = 0; i < shatterBufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
      }
      const shatterNoise = ctx.createBufferSource();
      shatterNoise.buffer = shatterBuffer;

      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(3500, now);
      hpFilter.frequency.exponentialRampToValueAtTime(1200, now + 0.5);

      const shatterGain = ctx.createGain();
      shatterGain.gain.setValueAtTime(0.5, now);
      shatterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      shatterNoise.connect(hpFilter);
      hpFilter.connect(shatterGain);
      shatterGain.connect(dest);

      shatterNoise.start(now);
      shatterNoise.stop(now + 0.6);
    } catch { }

    // Layer 2: Ascending Radiant Solar Warmth Arpeggio (Liberation Chime)
    const thawHarmonics = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C Major Radiant Lift
    thawHarmonics.forEach((freq, idx) => {
      try {
        const noteStart = now + idx * 0.055;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, noteStart + 0.6);

        gain.gain.setValueAtTime(0.28, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.75);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(noteStart);
        osc.stop(noteStart + 0.8);
      } catch { }
    });

    // Layer 3: Warm Solar Flare Sub-Rise Sweep
    try {
      const riseOsc = ctx.createOscillator();
      const riseGain = ctx.createGain();
      riseOsc.type = 'triangle';
      riseOsc.frequency.setValueAtTime(80, now);
      riseOsc.frequency.exponentialRampToValueAtTime(440, now + 0.7);

      riseGain.gain.setValueAtTime(0.1, now);
      riseGain.gain.linearRampToValueAtTime(0.35, now + 0.25);
      riseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      riseOsc.connect(riseGain);
      riseGain.connect(dest);
      riseOsc.start(now);
      riseOsc.stop(now + 0.85);
    } catch { }
  }
}

export const audioSfx = new AudioSfxManager();
export default audioSfx;

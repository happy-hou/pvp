// 音效系统 - 使用 Web Audio API 生成合成音效
let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// 播放一个简单的音调
function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15, detune = 0) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.value = freq
  osc.detune.value = detune

  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

// 播放噪音（用于打击感）
function playNoise(duration: number, volume = 0.1) {
  const ctx = getCtx()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 800

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  source.start(ctx.currentTime)
}

export const SFX = {
  // 普通攻击音效 - 短促的挥砍声
  attack() {
    playNoise(0.08, 0.12)
    playTone(220, 0.06, 'sawtooth', 0.08)
  },

  // 攻击命中音效 - 金属碰撞感
  hit() {
    playNoise(0.12, 0.18)
    playTone(180, 0.08, 'square', 0.1)
    playTone(120, 0.1, 'sawtooth', 0.06)
  },

  // 格挡音效 - 金属格挡声
  block() {
    playTone(800, 0.06, 'sine', 0.12)
    playNoise(0.05, 0.08)
  },

  // 技能释放音效 - 能量释放感
  skill() {
    playTone(440, 0.15, 'sine', 0.15)
    playTone(660, 0.12, 'sine', 0.1)
    setTimeout(() => playTone(880, 0.2, 'sine', 0.12), 80)
  },

  // 狂暴技能音效 - 狂暴激活
  rage() {
    playTone(150, 0.3, 'sawtooth', 0.15)
    playTone(200, 0.25, 'square', 0.1)
    setTimeout(() => playTone(300, 0.2, 'sawtooth', 0.12), 100)
    setTimeout(() => playTone(400, 0.15, 'square', 0.08), 200)
  },

  // 骊诱技能音效 - 眩晕魔法感
  stun() {
    playTone(600, 0.2, 'sine', 0.12)
    playTone(800, 0.15, 'sine', 0.1, 10)
    setTimeout(() => playTone(1000, 0.3, 'sine', 0.08, -10), 100)
  },

  // 领域展开音效 - 领域释放
  domain() {
    playTone(200, 0.4, 'sine', 0.15)
    playTone(300, 0.35, 'triangle', 0.1)
    setTimeout(() => playTone(400, 0.3, 'sine', 0.12), 150)
    setTimeout(() => playTone(500, 0.25, 'triangle', 0.08), 300)
  },

  // 选择音效 - UI选择确认
  select() {
    playTone(523, 0.08, 'square', 0.1)  // C5
    playTone(659, 0.06, 'square', 0.08)  // E5
  },

  // 取消选择音效
  deselect() {
    playTone(400, 0.06, 'square', 0.08)
    playTone(300, 0.08, 'square', 0.06)
  },

  // 确认选择音效
  confirm() {
    playTone(523, 0.1, 'square', 0.1)   // C5
    setTimeout(() => playTone(659, 0.1, 'square', 0.1), 80)  // E5
    setTimeout(() => playTone(784, 0.15, 'square', 0.12), 160) // G5
  },

  // KO音效 - 胜利/失败
  ko() {
    playTone(523, 0.2, 'square', 0.15)  // C5
    setTimeout(() => playTone(659, 0.2, 'square', 0.12), 150)  // E5
    setTimeout(() => playTone(784, 0.3, 'square', 0.15), 300)  // G5
    setTimeout(() => playTone(1047, 0.5, 'square', 0.18), 500) // C6
  },

  // 跳跃音效
  jump() {
    playTone(300, 0.06, 'sine', 0.06)
    playTone(500, 0.04, 'sine', 0.04)
  },
}

export type Vec2 = {
  x: number
  y: number
}

export type Rect = {
  x: number
  y: number
  w: number
  h: number
}

export type PlayerId = 1 | 2

// 人物类型
export type CharacterType = "meng-zhi-li" | "kuang-qi" | "zhu-yu-xuan"

// 技能类型（保留原有 + 新增）
export type SkillType = "dash-slash" | "pulse-shot" | "li-you" | "kuang-bao" | "ling-yu-zhan-kai"

export type PlayerState = "idle" | "walk" | "jump" | "attack" | "skill" | "block" | "hit" | "ko" | "stunned"

// 人物配置
export type CharacterConfig = {
  type: CharacterType
  name: string
  description: string
  skill: SkillConfig
  palette: {
    core: string
    steel: string
    shade: string
    glow: string
    accent: string
  }
}

export type SkillConfig = {
  type: SkillType
  name: string
  description: string
  // 技能效果参数
  stunDurationMs?: number      // 眩晕时长（骊诱）
  speedMultiplier?: number     // 速度倍数（狂暴）
  buffDurationMs?: number      // 增益时长（狂暴）
  chargeTimeMs?: number        // 蓄力时间（领域展开）
  failDamagePercent?: number   // 失败扣血百分比（领域展开）
  attackMultiplier?: number    // 攻击力倍数（领域展开）
}

export type Player = {
  id: PlayerId
  x: number
  y: number
  vx: number
  vy: number
  facing: -1 | 1
  onGround: boolean
  onPlatform: boolean       // 是否站在平台上
  dropThroughPlatformMs: number  // 穿过平台下落的时间窗口
  airJumpsLeft: number      // 剩余空中跳跃次数（二段跳）
  hp: number
  state: PlayerState
  stateTimeMs: number
  attackLockedMs: number
  skillLockedMs: number
  attackSeq: number
  attackDidHit: boolean
  hitstunMs: number
  flashMs: number
  skill: SkillConfig
  character: CharacterConfig
  // 技能条系统
  skillCharge: number          // 0-4，攻击命中4次充满
  skillReady: boolean          // 技能条是否充满
  // 特殊状态
  stunMs: number               // 眩晕剩余时间
  rageActive: boolean          // 狂暴状态是否激活
  rageDurationMs: number       // 狂暴剩余时间
  domainCharging: boolean      // 领域是否正在蓄力
  domainChargeMs: number       // 领域蓄力已进行时间
  domainActive: boolean        // 领域是否已展开
  domainDurationMs: number     // 领域剩余时间
  domainFailed: boolean        // 领域蓄力是否被打断失败
  domainFailDamageApplied: boolean  // 领域失败扣血是否已应用
  domainDotTimerMs: number     // 领域持续伤害计时器
  liYouActiveMs: number        // 骊诱效果剩余时间（持久标记，不受状态切换影响）
}

// 平台类型（可从下方跳穿，站在上面不掉落）
export type Platform = {
  x: number      // 左边界
  y: number      // 平台顶部 Y
  w: number      // 宽度
  h: number      // 高度（厚度）
}

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  lifeMs: number
  maxLifeMs: number
  color: string
}

export type GamePhase = "battle" | "ko"

export type GameState = {
  phase: GamePhase
  paused: boolean
  timeMs: number
  rng: number
  arena: {
    left: number
    right: number
    groundY: number
  }
  players: Record<PlayerId, Player>
  particles: Particle[]
  platforms: Platform[]    // 平台列表
  winner: PlayerId | null
  hitSeq: number
}

export type MatchConfig = {
  p1Character: CharacterType
  p2Character: CharacterType
}

export type RawInput = {
  p1Left: boolean
  p1Right: boolean
  p1Down: boolean          // P1 按下键（S键）
  p1JumpPressed: boolean
  p1Attack: boolean
  p1Block: boolean
  p1SkillPressed: boolean
  p2Left: boolean
  p2Right: boolean
  p2Down: boolean          // P2 按下键（下箭头）
  p2JumpPressed: boolean
  p2Attack: boolean
  p2Block: boolean
  p2SkillPressed: boolean
  pausePressed: boolean
  restartPressed: boolean
}
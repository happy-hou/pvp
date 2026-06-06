import type { CharacterConfig, SkillConfig } from "./types"

// 原有技能配置（保留）
export const SKILL_OPTIONS: SkillConfig[] = [
  {
    type: "dash-slash",
    name: "突进斩",
    description: "快速朝面朝方向突进并挥出长斩击，适合贴身追击。",
  },
  {
    type: "pulse-shot",
    name: "脉冲炮",
    description: "向前打出短距离能量冲击，中距离压制更稳定。",
  },
]

// 人物配置
export const CHARACTER_OPTIONS: CharacterConfig[] = [
  {
    type: "meng-zhi-li",
    name: "萌之骊",
    description: "来自萌国的最可爱的人，可以用美丽的外表迷惑对手。",
    skill: {
      type: "li-you",
      name: "骊诱",
      description: "使敌人眩晕1秒，眩晕期间不能动弹。",
      stunDurationMs: 1000,
    },
    palette: {
      core: "#ff69b4",      // 粉色核心
      steel: "#ffb6c1",     // 浅粉钢色
      shade: "#4a2c5a",     // 深紫阴影
      glow: "#ff1493",      // 深粉发光
      accent: "#ffd700",    // 金色点缀
    },
  },
  {
    type: "kuang-qi",
    name: "狂祺",
    description: "狂暴的战士，无人能挡。",
    skill: {
        type: "kuang-bao",
        name: "狂暴状态",
        description: "攻击速度和移动速度提高为原来的2倍，攻击力大幅提高，持续7秒。",
        speedMultiplier: 2.0,
        attackMultiplier: 11/6,
        buffDurationMs: 7000,
      },
    palette: {
      core: "#ff4500",      // 橙红核心
      steel: "#8b4513",     // 棕色钢色
      shade: "#2d1b0e",     // 深棕阴影
      glow: "#ff6600",      // 橙色发光
      accent: "#ff0000",    // 红色点缀
    },
  },
  {
    type: "zhu-yu-xuan",
    name: "祝宇轩",
    description: "来自花椒的软件工程专业，喜欢打瓦，玩原神。",
    skill: {
      type: "ling-yu-zhan-kai",
      name: "领域展开",
      description: "需不被攻击4.7秒才能施展，否则扣20%血。领域内攻击力+0.5倍。",
      chargeTimeMs: 4700,
      failDamagePercent: 20,
      attackMultiplier: 1.5,
    },
    palette: {
      core: "#00ff88",      // 绿色核心
      steel: "#2e8b57",     // 海绿钢色
      shade: "#1a3a2a",     // 深绿阴影
      glow: "#00ff00",      // 亮绿发光
      accent: "#00ffff",    // 青色点缀
    },
  },
]

export const GAME_CONFIG = {
  internal: {
    width: 480,
    height: 270,
  },
  arena: {
    left: 36,
    right: 444,
    groundY: 213,
  },
  // 平台配置（可从下方跳穿，站在上面不掉落）
  platforms: [
    // 左侧平台（两层）
    { x: 50, y: 170, w: 80, h: 6 },
    { x: 50, y: 120, w: 60, h: 6 },
    // 中间平台
    { x: 200, y: 150, w: 80, h: 6 },
    // 右侧平台（两层）
    { x: 350, y: 170, w: 80, h: 6 },
    { x: 370, y: 120, w: 60, h: 6 },
  ],
  player: {
    hpMax: 300,
    body: { w: 16, h: 26 },
    moveSpeed: 0.1275,
    airMoveSpeed: 0.09,
    blockMoveSpeed: 0.06,
    friction: 0.86,
    jumpVelocity: -0.34,
    gravity: 0.00095,
    maxFallSpeed: 0.42,
    maxAirJumps: 1,           // 最大空中跳跃次数（二段跳）
    airJumpVelocity: -0.28,   // 二段跳速度（比一段跳稍弱）
  },
  combat: {
    attack: {
      durationMs: 320,
      startupMs: 90,
      activeMs: 70,
      recoveryMs: 160,
      cooldownMs: 220,
      damage: 12,
      push: 0.24,
      blockDamageFactor: 0.3,
      blockPushFactor: 0.45,
      hitstunMs: 160,
      blockstunMs: 90,
    },
    skill: {
      cooldownMs: 900,
      skillChargeMax: 4,      // 技能条最大值
      dashSlash: {
        durationMs: 360,
        startupMs: 70,
        activeMs: 110,
        damage: 20,
        push: 0.34,
        speed: 0.19,
      },
      pulseShot: {
        durationMs: 420,
        startupMs: 120,
        activeMs: 140,
        damage: 16,
        push: 0.26,
        range: 34,
      },
      // 新技能配置
      liYou: {
        durationMs: 2600,
        startupMs: 100,
        activeMs: 200,
        range: 9999,          // 全屏范围（无距离限制）
      },
      kuangBao: {
        durationMs: 300,
        startupMs: 50,
        activeMs: 100,
      },
      lingYuZhanKai: {
        durationMs: 8000,     // 领域持续8秒
        startupMs: 200,
        activeMs: 7800,
        range: 162,           // 领域范围 = 原来的3倍
        slowPercent: 30,      // 领域内对手减速30%
        dotDamage: 4,         // 领域内每秒持续伤害
        dotIntervalMs: 1000,  // 持续伤害间隔（毫秒）
        chargeTimeMs: 4700,   // 蓄力时间
      },
    },
  },
  particles: {
    hitBurstCount: 10,
  },
} as const

// 地图配置
export type ArenaConfig = {
  name: string
  background: string
  platforms: { x: number; y: number; w: number; h: number }[]
}

export const ARENA_OPTIONS: ArenaConfig[] = [
  {
    name: "标准竞技场",
    background: "#05060a",
    platforms: [
      { x: 50, y: 170, w: 80, h: 6 },
      { x: 50, y: 120, w: 60, h: 6 },
      { x: 200, y: 150, w: 80, h: 6 },
      { x: 350, y: 170, w: 80, h: 6 },
      { x: 370, y: 120, w: 60, h: 6 },
    ],
  },
  {
    name: "高空平台",
    background: "#0a0a1a",
    platforms: [
      { x: 30, y: 180, w: 60, h: 6 },
      { x: 100, y: 140, w: 50, h: 6 },
      { x: 180, y: 100, w: 120, h: 6 },
      { x: 330, y: 140, w: 50, h: 6 },
      { x: 390, y: 180, w: 60, h: 6 },
    ],
  },
  {
    name: "对称战场",
    background: "#1a0a0a",
    platforms: [
      { x: 40, y: 160, w: 100, h: 6 },
      { x: 40, y: 110, w: 60, h: 6 },
      { x: 190, y: 140, w: 100, h: 6 },
      { x: 340, y: 110, w: 60, h: 6 },
      { x: 340, y: 160, w: 100, h: 6 },
    ],
  },
]

// 随机获取地图
export function getRandomArena(): ArenaConfig {
  return ARENA_OPTIONS[Math.floor(Math.random() * ARENA_OPTIONS.length)]
}

// 获取人物配置
export function getCharacterByType(type: string): CharacterConfig {
  return CHARACTER_OPTIONS.find((c) => c.type === type) ?? CHARACTER_OPTIONS[0]
}
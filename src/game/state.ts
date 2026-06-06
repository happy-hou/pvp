import { GAME_CONFIG, getCharacterByType } from "./config"
import { clamp, rectsOverlap } from "./math"
import type { CharacterType, GameState, MatchConfig, Particle, Player, PlayerId, RawInput, Rect, SkillType } from "./types"
import { SFX } from "./audio"

type PlayerInput = {
  left: boolean
  right: boolean
  down: boolean          // 按下键（从平台下来）
  jumpPressed: boolean
  attack: boolean
  block: boolean
  skillPressed: boolean
}

type HitSpec = {
  damage: number
  push: number
  hitstunMs: number
  color: string
  applyStun?: boolean      // 是否施加眩晕
  stunDurationMs?: number  // 眩晕时长
}

function rand01(g: GameState) {
  g.rng = (Math.imul(g.rng, 1664525) + 1013904223) >>> 0
  return g.rng / 4294967296
}

function createPlayer(id: PlayerId, x: number, facing: -1 | 1, characterType: CharacterType): Player {
  const character = getCharacterByType(characterType)
  return {
    id,
    x,
    y: GAME_CONFIG.arena.groundY,
    vx: 0,
    vy: 0,
    facing,
    onGround: true,
    onPlatform: false,
    dropThroughPlatformMs: 0,
    airJumpsLeft: GAME_CONFIG.player.maxAirJumps,
    hp: GAME_CONFIG.player.hpMax,
    state: "idle",
    stateTimeMs: 0,
    attackLockedMs: 0,
    skillLockedMs: 0,
    attackSeq: 0,
    attackDidHit: false,
    hitstunMs: 0,
    flashMs: 0,
    skill: character.skill,
    character,
    // 技能条系统
    skillCharge: 0,
    skillReady: false,
    // 特殊状态
    stunMs: 0,
    rageActive: false,
    rageDurationMs: 0,
    domainCharging: false,
    domainChargeMs: 0,
    domainActive: false,
    domainDurationMs: 0,
    domainFailed: false,
    domainFailDamageApplied: false,
    domainDotTimerMs: 0,
    liYouActiveMs: 0,
  }
}

export function createGame(seed = Date.now() >>> 0, matchConfig?: MatchConfig): GameState {
  return {
    phase: "battle",
    paused: false,
    timeMs: 0,
    rng: seed >>> 0,
    arena: { ...GAME_CONFIG.arena },
    players: {
      1: createPlayer(1, 60, 1, matchConfig?.p1Character ?? "meng-zhi-li"),
      2: createPlayer(2, 420, -1, matchConfig?.p2Character ?? "kuang-qi"),
    },
    particles: [],
      platforms: [...GAME_CONFIG.platforms],
    winner: null,
    hitSeq: 0,
  }
}

export function restartGame(g: GameState) {
  const seed = (g.rng ^ (g.timeMs >>> 0) ^ 0x9e3779b9) >>> 0
  const next = createGame(seed, {
    p1Character: g.players[1].character.type,
    p2Character: g.players[2].character.type,
  })
  g.phase = next.phase
  g.paused = false
  g.timeMs = 0
  g.rng = next.rng
  g.players = next.players
  g.particles = []
  g.platforms = next.platforms
  g.winner = null
  g.hitSeq = 0
}

function getBodyRect(p: Player): Rect {
  const { w, h } = GAME_CONFIG.player.body
  const airborneLift = p.onGround ? 0 : 2
  return {
    x: Math.round(p.x - w / 2),
    y: Math.round(p.y - h - airborneLift),
    w,
    h,
  }
}

function isAttackActive(t: number) {
  const { startupMs, activeMs } = GAME_CONFIG.combat.attack
  return t >= startupMs && t < startupMs + activeMs
}

function isSkillActive(t: number, skillType: SkillType): boolean {
  const skillConfig = GAME_CONFIG.combat.skill
  if (skillType === "dash-slash") {
    return t >= skillConfig.dashSlash.startupMs && t < skillConfig.dashSlash.startupMs + skillConfig.dashSlash.activeMs
  }
  if (skillType === "pulse-shot") {
    return t >= skillConfig.pulseShot.startupMs && t < skillConfig.pulseShot.startupMs + skillConfig.pulseShot.activeMs
  }
  if (skillType === "li-you") {
    return t >= skillConfig.liYou.startupMs && t < skillConfig.liYou.startupMs + skillConfig.liYou.activeMs
  }
  if (skillType === "kuang-bao") {
    return t >= skillConfig.kuangBao.startupMs && t < skillConfig.kuangBao.startupMs + skillConfig.kuangBao.activeMs
  }
  if (skillType === "ling-yu-zhan-kai") {
    return t >= skillConfig.lingYuZhanKai.startupMs && t < skillConfig.lingYuZhanKai.startupMs + skillConfig.lingYuZhanKai.activeMs
  }
  return false
}

function getAttackRect(p: Player): Rect | null {
  if (p.state !== "attack" || !isAttackActive(p.stateTimeMs)) return null
  const body = getBodyRect(p)
  const w = 14
  const h = 10
  // 攻击方向跟随人物朝向
  const ox = p.facing * 14
  return {
    x: Math.round(body.x + body.w / 2 + ox - w / 2),
    y: Math.round(body.y + 9),
    w,
    h,
  }
}

function getSkillRect(p: Player): Rect | null {
  const body = getBodyRect(p)
  const skillType = p.skill.type
  
  // 骊诱技能：基于 liYouActiveMs 判定，不依赖 state（因为释放后立即恢复 idle）
  if (skillType === "li-you" && p.liYouActiveMs > 0) {
    const w = GAME_CONFIG.combat.skill.liYou.range
    const h = 20
    const ox = p.facing * (w / 2 + body.w / 2)
    return {
      x: Math.round(body.x + body.w / 2 + ox - w / 2),
      y: Math.round(body.y),
      w,
      h,
    }
  }
  
  // 其他技能需要 state === "skill"
  if (p.state !== "skill") return null
  
  // 技能方向跟随人物朝向
  if (skillType === "dash-slash" && isSkillActive(p.stateTimeMs, skillType)) {
    const w = 22
    const h = 12
    const ox = p.facing * 18
    return {
      x: Math.round(body.x + body.w / 2 + ox - w / 2),
      y: Math.round(body.y + 8),
      w,
      h,
    }
  }
  if (skillType === "pulse-shot" && isSkillActive(p.stateTimeMs, skillType)) {
    const w = GAME_CONFIG.combat.skill.pulseShot.range
    const h = 12
    const x = p.facing === 1 ? body.x + body.w + 4 : body.x - w - 4
    return {
      x: Math.round(x),
      y: Math.round(body.y + 7),
      w,
      h,
    }
  }
  if (skillType === "kuang-bao" && isSkillActive(p.stateTimeMs, skillType)) {
    // 狂暴是自身增益，没有攻击范围
    return null
  }
  if (skillType === "ling-yu-zhan-kai" && p.domainActive) {
    // 领域展开后的范围
    const w = GAME_CONFIG.combat.skill.lingYuZhanKai.range
    const h = 40
    return {
      x: Math.round(p.x - w / 2),
      y: Math.round(body.y - 10),
      w,
      h,
    }
  }
  return null
}

function pushApart(a: Player, b: Player) {
  if (!a.onGround || !b.onGround) return
  const min = 18
  const dx = b.x - a.x
  const adx = Math.abs(dx)
  if (adx >= min) return
  const push = (min - adx) / 2
  const dir = dx >= 0 ? 1 : -1
  a.x -= push * dir
  b.x += push * dir
}

function canDirectionalBlock(victim: Player, attacker: Player) {
  if (victim.state !== "block" || victim.hitstunMs > 0 || victim.stunMs > 0 || !victim.onGround) return false
  const relative = attacker.x - victim.x
  return relative * victim.facing > 0
}

function applyHit(g: GameState, attacker: Player, victim: Player, hitbox: Rect, spec: HitSpec) {
  const a = GAME_CONFIG.combat.attack
  const blocked = canDirectionalBlock(victim, attacker)
  
  // 计算伤害（考虑领域加成和狂暴加成）
  let baseDamage = spec.damage
  if (attacker.domainActive && attacker.skill.attackMultiplier) {
    baseDamage = Math.round(baseDamage * attacker.skill.attackMultiplier)
  }
  if (attacker.rageActive && attacker.skill.attackMultiplier) {
    baseDamage = Math.round(baseDamage * attacker.skill.attackMultiplier)
  }
  
  const dmg = blocked ? Math.max(1, Math.round(baseDamage * a.blockDamageFactor)) : baseDamage
  const push = blocked ? spec.push * a.blockPushFactor : spec.push
  const stun = blocked ? a.blockstunMs : spec.hitstunMs

  victim.hp = Math.max(0, victim.hp - dmg)
  victim.vx = attacker.facing * push
  if (!victim.onGround) victim.vy = Math.min(victim.vy, -0.08)
  victim.hitstunMs = stun
  victim.flashMs = 90
  victim.state = victim.hp <= 0 ? "ko" : "hit"
  victim.stateTimeMs = 0

  // 应用眩晕效果（骊诱）
  if (spec.applyStun && spec.stunDurationMs) {
    victim.stunMs = spec.stunDurationMs
    victim.state = "stunned"
  }

  // 打断领域蓄力
  if (victim.domainCharging) {
    victim.domainCharging = false
    victim.domainFailed = true
    victim.domainChargeMs = 0
  }

  attacker.attackDidHit = true

  // 播放命中音效
  if (blocked) {
    SFX.block()
  } else {
    SFX.hit()
  }

  // 增加技能条充能
  if (!blocked) {
    attacker.skillCharge = Math.min(GAME_CONFIG.combat.skill.skillChargeMax, attacker.skillCharge + 1)
    if (attacker.skillCharge >= GAME_CONFIG.combat.skill.skillChargeMax) {
      attacker.skillReady = true
    }
  }

  const cx = hitbox.x + hitbox.w * 0.5
  const cy = hitbox.y + hitbox.h * 0.5
  spawnHitParticles(g, cx, cy, blocked, spec.color)

  if (victim.hp <= 0 && g.phase !== "ko") {
    g.phase = "ko"
    g.winner = attacker.id
    SFX.ko()
  }
}

// 领域持续伤害
function applyDomainDotDamage(g: GameState, domainOwner: Player, victim: Player, dt: number) {
  if (!domainOwner.domainActive || domainOwner.skill.type !== "ling-yu-zhan-kai") return
  if (victim.hp <= 0) return

  const domainRadius = GAME_CONFIG.combat.skill.lingYuZhanKai.range / 2
  const dx = victim.x - domainOwner.x
  const dy = victim.y - domainOwner.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > domainRadius) {
    victim.domainDotTimerMs = 0
    return
  }

  victim.domainDotTimerMs += dt
  const intervalMs = GAME_CONFIG.combat.skill.lingYuZhanKai.dotIntervalMs ?? 1000
  if (victim.domainDotTimerMs >= intervalMs) {
    victim.domainDotTimerMs -= intervalMs
    const dmg = GAME_CONFIG.combat.skill.lingYuZhanKai.dotDamage ?? 4
    victim.hp = Math.max(0, victim.hp - dmg)
    victim.flashMs = 60

    // 生成伤害粒子
    const cx = victim.x
    const cy = victim.y - 15
    spawnHitParticles(g, cx, cy, false, "#00ff88")

    if (victim.hp <= 0) {
      victim.state = "ko"
      g.phase = "ko"
      g.winner = domainOwner.id
    }
  }
}

function spawnHitParticles(g: GameState, x: number, y: number, blocked: boolean, base = "#ff7a59") {
  const n = GAME_CONFIG.particles.hitBurstCount
  const color = blocked ? "#7ef9ff" : base
  for (let i = 0; i < n; i++) {
    const a = rand01(g) * Math.PI * 2
    const sp = 0.02 + rand01(g) * 0.08
    const p: Particle = {
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 0.02,
      lifeMs: 0,
      maxLifeMs: 260 + rand01(g) * 200,
      color,
    }
    g.particles.push(p)
  }
}

function updateParticles(g: GameState, dt: number) {
  const next: Particle[] = []
  for (const p of g.particles) {
    const life = p.lifeMs + dt
    if (life >= p.maxLifeMs) continue
    const t = life / p.maxLifeMs
    p.lifeMs = life
    p.vy += 0.00009 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 0.985 - t * 0.02
    p.vy *= 0.985
    next.push(p)
  }
  g.particles = next
}

function resolveFacing(p: Player, input: PlayerInput) {
  if (p.stunMs > 0) return // 眩晕时不能转向
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  if (dir !== 0) p.facing = dir === 1 ? 1 : -1
}

function handleJump(p: Player, input: PlayerInput) {
  if (p.stunMs > 0) return // 眩晕时不能跳跃
  
  // 按下键从平台下来
  if (input.down && p.onGround && p.onPlatform) {
    p.onGround = false
    p.onPlatform = false
    p.dropThroughPlatformMs = 200 // 200ms 穿过平台时间窗口
    p.vy = 0.1 // 轻微下落速度
    return
  }
  
  if (!input.jumpPressed || p.hitstunMs > 0 || p.state === "ko" || p.state === "attack" || (p.state === "skill" && p.skill.type !== "li-you" && p.skill.type !== "ling-yu-zhan-kai")) return
  
  // 地面跳跃（一段跳）
  if (p.onGround) {
    p.onGround = false
    p.onPlatform = false
    p.airJumpsLeft = GAME_CONFIG.player.maxAirJumps // 重置空中跳跃次数
    p.vy = GAME_CONFIG.player.jumpVelocity
    p.state = "jump"
    p.stateTimeMs = 0
    SFX.jump()
    return
  }
  
  // 空中跳跃（二段跳）
  if (p.airJumpsLeft > 0) {
    p.airJumpsLeft--
    p.vy = GAME_CONFIG.player.airJumpVelocity
    p.state = "jump"
    p.stateTimeMs = 0
    SFX.jump()
    // 可选：添加二段跳特效
  }
}

function getSkillDuration(skillType: SkillType): number {
  const skillConfig = GAME_CONFIG.combat.skill
  switch (skillType) {
    case "dash-slash": return skillConfig.dashSlash.durationMs
    case "pulse-shot": return skillConfig.pulseShot.durationMs
    case "li-you": return skillConfig.liYou.durationMs
    case "kuang-bao": return skillConfig.kuangBao.durationMs
    case "ling-yu-zhan-kai": return skillConfig.lingYuZhanKai.durationMs
    default: return 400
  }
}

function resolvePlayerState(g: GameState, p: Player, input: PlayerInput) {
  // 处理领域失败扣血（扣除当前生命的20%，而非最大生命值）
  if (p.domainFailed && !p.domainFailDamageApplied) {
    const failDamage = Math.round(p.hp * (p.skill.failDamagePercent ?? 20) / 100)
    p.hp = Math.max(0, p.hp - failDamage)
    p.flashMs = 150
    p.domainFailDamageApplied = true
    p.domainFailed = false
    // 技能条清零
    p.skillCharge = 0
    p.skillReady = false
    if (p.hp <= 0) {
      p.state = "ko"
      return
    }
  }

  if (p.hp <= 0) {
    p.state = "ko"
    return
  }
  
  // 眩晕状态
  if (p.stunMs > 0) {
    p.state = "stunned"
    return
  }
  
  if (p.hitstunMs > 0) {
    p.state = "hit"
    return
  }
  
  if (p.state === "attack") {
    if (p.stateTimeMs >= GAME_CONFIG.combat.attack.durationMs) p.state = p.onGround ? "idle" : "jump"
    return
  }
  
  if (p.state === "skill") {
    const duration = getSkillDuration(p.skill.type)
    const skillType = p.skill.type // 保存技能类型
    if (p.stateTimeMs >= duration) {
      p.state = p.onGround ? "idle" : "jump"
      // 狂暴和领域在技能开始时就已激活，这里不需要再激活
    }
    // 领域展开和骊诱技能期间可以移动（不return，让后续移动逻辑处理）
    if (skillType === "ling-yu-zhan-kai" || skillType === "li-you") {
      // 允许移动，不return
    } else {
      return
    }
  }

  // 技能释放（需要技能条充满）
  if (input.skillPressed && p.skillReady && p.skillLockedMs <= 0 && p.attackLockedMs <= 0 && !input.block && p.stunMs <= 0) {
    // 领域展开需要先蓄力
    if (p.skill.type === "ling-yu-zhan-kai") {
      if (!p.domainCharging) {
        p.domainCharging = true
        p.domainChargeMs = 0
        p.domainFailed = false
        p.domainFailDamageApplied = false
      }
      return
    }
    
    // 其他技能直接释放
    p.state = "skill"
    p.stateTimeMs = 0
    p.skillLockedMs = getSkillDuration(p.skill.type) + GAME_CONFIG.combat.skill.cooldownMs
    p.attackDidHit = false
    p.attackSeq = ++g.hitSeq
    // 消耗技能条
    p.skillCharge = 0
    p.skillReady = false
    
    // 狂暴技能：释放时立即激活
    if (p.skill.type === "kuang-bao") {
      p.rageActive = true
      p.rageDurationMs = p.skill.buffDurationMs ?? 7000
      SFX.rage()
    }
    // 骊诱技能：设置持久效果标记，立即恢复idle状态
    if (p.skill.type === "li-you") {
      p.liYouActiveMs = GAME_CONFIG.combat.skill.liYou.durationMs
      p.state = p.onGround ? "idle" : "jump"
      SFX.stun()
    }
    // 其他技能音效
    if (p.skill.type === "dash-slash" || p.skill.type === "pulse-shot") {
      SFX.skill()
    }
    return
  }

  if (input.attack && p.attackLockedMs <= 0 && !input.block && p.stunMs <= 0) {
    p.state = "attack"
    p.stateTimeMs = 0
    p.attackLockedMs = GAME_CONFIG.combat.attack.durationMs + GAME_CONFIG.combat.attack.cooldownMs
    p.attackSeq = ++g.hitSeq
    p.attackDidHit = false
    SFX.attack()
    return
  }

  if (input.block && p.onGround && p.stunMs <= 0) {
    p.state = "block"
    return
  }

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  if (!p.onGround) {
    p.state = "jump"
  } else if (dir !== 0) {
    p.state = "walk"
  } else {
    p.state = "idle"
  }
}

function updateMovement(p: Player, g: GameState, dt: number, input: PlayerInput, opponent: Player) {
  if (p.stunMs > 0) return // 眩晕时不能移动
  
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  // 领域展开技能期间可以移动
  const canMove = p.state !== "attack" && p.hitstunMs <= 0 && p.state !== "ko" && (p.state !== "skill" || p.skill.type === "ling-yu-zhan-kai" || p.skill.type === "li-you")
  
  // 计算速度倍数（狂暴状态）
  let speedMult = p.rageActive ? (p.skill.speedMultiplier ?? 1.6) : 1
  
  // 检查是否在对手领域内（减速效果）
  if (opponent.domainActive && opponent.skill.type === "ling-yu-zhan-kai") {
    const domainRadius = GAME_CONFIG.combat.skill.lingYuZhanKai.range / 2
    const dx = p.x - opponent.x
    const dy = p.y - opponent.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= domainRadius) {
      const slowPercent = GAME_CONFIG.combat.skill.lingYuZhanKai.slowPercent ?? 30
      speedMult *= (1 - slowPercent / 100) // 减速30%
    }
  }
  
  const base = p.onGround
    ? p.state === "block"
      ? GAME_CONFIG.player.blockMoveSpeed
      : GAME_CONFIG.player.moveSpeed * speedMult
    : GAME_CONFIG.player.airMoveSpeed * speedMult

  if (p.state === "skill" && p.skill.type === "dash-slash" && isSkillActive(p.stateTimeMs, p.skill.type)) {
    p.vx = p.facing * GAME_CONFIG.combat.skill.dashSlash.speed * speedMult
  } else if (!canMove || p.state === "attack") {
    p.vx *= GAME_CONFIG.player.friction
  } else if (dir === 0) {
    p.vx *= p.onGround ? GAME_CONFIG.player.friction : 0.98
  } else {
    const target = dir * base
    p.vx = p.vx * (p.onGround ? 0.65 : 0.8) + target * (p.onGround ? 0.35 : 0.2)
  }

  p.x += p.vx * dt

  // 更新穿过平台时间窗口
  if (p.dropThroughPlatformMs > 0) {
    p.dropThroughPlatformMs = Math.max(0, p.dropThroughPlatformMs - dt)
  }

  // 空中移动和平台碰撞检测
  if (!p.onGround) {
    p.vy = Math.min(GAME_CONFIG.player.maxFallSpeed, p.vy + GAME_CONFIG.player.gravity * dt)
    p.y += p.vy * dt
    
    // 检测平台碰撞（只有在下落且不在穿过平台时）
    if (p.vy > 0 && p.dropThroughPlatformMs <= 0 && g.platforms) {
      const feetY = p.y
      for (const plat of g.platforms) {
        // 检查是否在平台水平范围内
        if (p.x >= plat.x && p.x <= plat.x + plat.w) {
          // 检查是否从平台上方落下（脚底刚接触平台顶部）
          const prevFeetY = feetY - p.vy * dt
          if (prevFeetY <= plat.y && feetY >= plat.y) {
            // 站在平台上
            p.y = plat.y
            p.vy = 0
            p.onGround = true
            p.onPlatform = true
            p.airJumpsLeft = GAME_CONFIG.player.maxAirJumps // 重置二段跳
            if (p.state === "jump") p.state = "idle"
            break
          }
        }
      }
    }
    
    // 检测地面碰撞
    if (p.y >= GAME_CONFIG.arena.groundY) {
      p.y = GAME_CONFIG.arena.groundY
      p.vy = 0
      p.onGround = true
      p.onPlatform = false
      p.airJumpsLeft = GAME_CONFIG.player.maxAirJumps // 重置二段跳
      if (p.state === "jump") p.state = "idle"
    }
  } else {
    // 在地面或平台上时，检查是否还在平台上
    if (p.onPlatform && g.platforms) {
      const stillOnPlatform = g.platforms.some(plat => 
        p.x >= plat.x && p.x <= plat.x + plat.w && p.y === plat.y
      )
      if (!stillOnPlatform) {
        p.onGround = false
        p.onPlatform = false
      }
    }
  }
}

function buildHitSpecForAttack(): HitSpec {
  return {
    damage: GAME_CONFIG.combat.attack.damage,
    push: GAME_CONFIG.combat.attack.push,
    hitstunMs: GAME_CONFIG.combat.attack.hitstunMs,
    color: "#ff7a59",
  }
}

function buildHitSpecForSkill(p: Player, victim?: Player): HitSpec {
  switch (p.skill.type) {
    case "dash-slash":
      return {
        damage: GAME_CONFIG.combat.skill.dashSlash.damage,
        push: GAME_CONFIG.combat.skill.dashSlash.push,
        hitstunMs: 180,
        color: "#7ef9ff",
      }
    case "pulse-shot":
      return {
        damage: GAME_CONFIG.combat.skill.pulseShot.damage,
        push: GAME_CONFIG.combat.skill.pulseShot.push,
        hitstunMs: 150,
        color: "#ffb000",
      }
    case "li-you":
      // 对狂祺眩晕效果翻倍
      const isKuangQi = victim?.character.type === "kuang-qi"
      const stunDuration = (p.skill.stunDurationMs ?? 1000) * (isKuangQi ? 2 : 1)
      return {
        damage: 5,
        push: 0.1,
        hitstunMs: 100,
        color: "#ff69b4",
        applyStun: true,
        stunDurationMs: stunDuration,
      }
    case "ling-yu-zhan-kai":
      return {
        damage: 15,
        push: 0.2,
        hitstunMs: 200,
        color: "#00ff88",
      }
    default:
      return {
        damage: 10,
        push: 0.15,
        hitstunMs: 150,
        color: "#ffffff",
      }
  }
}

function updateSpecialStates(p: Player, dt: number) {
  // 更新眩晕时间
  p.stunMs = Math.max(0, p.stunMs - dt)
  
  // 更新骊诱持久效果
  p.liYouActiveMs = Math.max(0, p.liYouActiveMs - dt)
  
  // 更新狂暴状态
  if (p.rageActive) {
    p.rageDurationMs = Math.max(0, p.rageDurationMs - dt)
    if (p.rageDurationMs <= 0) {
      p.rageActive = false
    }
  }
  
  // 更新领域蓄力
  if (p.domainCharging) {
    p.domainChargeMs += dt
    if (p.domainChargeMs >= (p.skill.chargeTimeMs ?? 4700)) {
      // 蓄力成功，立即激活领域
      p.domainCharging = false
      p.domainActive = true
      p.domainDurationMs = GAME_CONFIG.combat.skill.lingYuZhanKai.durationMs
      SFX.domain()
      // 进入短暂的释放动画状态
      p.state = "skill"
      p.stateTimeMs = 0
      p.skillLockedMs = GAME_CONFIG.combat.skill.lingYuZhanKai.startupMs + GAME_CONFIG.combat.skill.cooldownMs
      p.attackDidHit = false
      p.attackSeq = 0
      p.skillCharge = 0
      p.skillReady = false
    }
  }
  
  // 更新领域状态
  if (p.domainActive) {
    p.domainDurationMs = Math.max(0, p.domainDurationMs - dt)
    if (p.domainDurationMs <= 0) {
      p.domainActive = false
    }
  }
}

export function stepGame(g: GameState, input: RawInput, dt: number) {
  if (input.pausePressed && g.phase !== "ko") g.paused = !g.paused
  if (g.paused) return

  g.timeMs += dt

  if (g.phase === "ko") {
    updateParticles(g, dt)
    return
  }

  const p1 = g.players[1]
  const p2 = g.players[2]

  const i1: PlayerInput = {
    left: input.p1Left,
    right: input.p1Right,
    down: input.p1Down,
    jumpPressed: input.p1JumpPressed,
    attack: input.p1Attack,
    block: input.p1Block,
    skillPressed: input.p1SkillPressed,
  }
  const i2: PlayerInput = {
    left: input.p2Left,
    right: input.p2Right,
    down: input.p2Down,
    jumpPressed: input.p2JumpPressed,
    attack: input.p2Attack,
    block: input.p2Block,
    skillPressed: input.p2SkillPressed,
  }

  for (const p of [p1, p2]) {
    p.stateTimeMs += dt
    p.attackLockedMs = Math.max(0, p.attackLockedMs - dt)
    p.skillLockedMs = Math.max(0, p.skillLockedMs - dt)
    p.hitstunMs = Math.max(0, p.hitstunMs - dt)
    p.flashMs = Math.max(0, p.flashMs - dt)
    updateSpecialStates(p, dt)
  }

  resolveFacing(p1, i1)
  resolveFacing(p2, i2)

  handleJump(p1, i1)
  handleJump(p2, i2)

  resolvePlayerState(g, p1, i1)
  resolvePlayerState(g, p2, i2)

  updateMovement(p1, g, dt, i1, p2)
  updateMovement(p2, g, dt, i2, p1)

  pushApart(p1, p2)

  p1.x = clamp(p1.x, g.arena.left, g.arena.right)
  p2.x = clamp(p2.x, g.arena.left, g.arena.right)

  // 攻击判定
  const hb1 = getAttackRect(p1)
  if (hb1 && !p1.attackDidHit && rectsOverlap(hb1, getBodyRect(p2))) applyHit(g, p1, p2, hb1, buildHitSpecForAttack())

  const hb2 = getAttackRect(p2)
  if (hb2 && !p2.attackDidHit && rectsOverlap(hb2, getBodyRect(p1))) applyHit(g, p2, p1, hb2, buildHitSpecForAttack())

  // 技能判定
  const sb1 = getSkillRect(p1)
  if (sb1 && !p1.attackDidHit && rectsOverlap(sb1, getBodyRect(p2))) applyHit(g, p1, p2, sb1, buildHitSpecForSkill(p1, p2))

  const sb2 = getSkillRect(p2)
  if (sb2 && !p2.attackDidHit && rectsOverlap(sb2, getBodyRect(p1))) applyHit(g, p2, p1, sb2, buildHitSpecForSkill(p2, p1))

  // 领域持续伤害判定
  applyDomainDotDamage(g, p1, p2, dt)
  applyDomainDotDamage(g, p2, p1, dt)

  if (p1.hp <= 0) {
    g.phase = "ko"
    g.winner = 2
  } else if (p2.hp <= 0) {
    g.phase = "ko"
    g.winner = 1
  }

  updateParticles(g, dt)
}

export function getPlayerBodyRect(p: Player) {
  return getBodyRect(p)
}

export function getPlayerAttackRect(p: Player) {
  return getAttackRect(p)
}

export function getPlayerSkillRect(p: Player) {
  return getSkillRect(p)
}
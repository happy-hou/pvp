import { GAME_CONFIG } from "./config"
import { clamp, lerp } from "./math"
import type { GameState, Player } from "./types"
import { getPlayerAttackRect, getPlayerBodyRect, getPlayerSkillRect } from "./state"

type Palette = {
  core: string
  steel: string
  shade: string
  glow: string
  accent: string
}

export function renderGame(ctx: CanvasRenderingContext2D, g: GameState) {
  const w = GAME_CONFIG.internal.width
  const h = GAME_CONFIG.internal.height

  ctx.save()
  ctx.clearRect(0, 0, w, h)
  ctx.imageSmoothingEnabled = false

  drawBackground(ctx, g, w, h)
  drawGround(ctx, g, w, h)
  drawPlatforms(ctx, g)

  const ordered = [g.players[1], g.players[2]].sort((a, b) => a.y - b.y)
  for (const p of ordered) {
    const palette: Palette = p.character.palette
    drawPlayer(ctx, p, g, palette)
  }

  drawParticles(ctx, g)

  ctx.restore()
}

function drawBackground(ctx: CanvasRenderingContext2D, g: GameState, w: number, h: number) {
  ctx.fillStyle = "#07080b"
  ctx.fillRect(0, 0, w, h)

  const t = g.timeMs * 0.00012
  ctx.fillStyle = "#0d1230"
  ctx.fillRect(0, 0, w, Math.floor(h * 0.62))

  const cityY = Math.floor(h * 0.62)
  const center = (g.players[1].x + g.players[2].x) / 2
  const par = (center - w / 2) * 0.03

  for (let layer = 0; layer < 3; layer++) {
    const base = layer === 0 ? "#05060a" : layer === 1 ? "#090b13" : "#0b0f20"
    ctx.fillStyle = base
    const step = 14 - layer * 3
    const height = 22 + layer * 14
    for (let x = -40; x < w + 60; x += step) {
      const n = Math.sin((x + layer * 97) * 0.12 + t * (0.7 + layer * 0.35)) * 0.5 + 0.5
      const bw = 10 + Math.floor(n * 10)
      const bh = height + Math.floor(n * 26)
      const xx = Math.floor(x - par * (0.8 - layer * 0.25))
      ctx.fillRect(xx, cityY - bh + layer * 6, bw, bh)
    }
  }

  ctx.fillStyle = "rgba(126,249,255,0.08)"
  for (let i = 0; i < 50; i++) {
    const x = (i * 37 + (g.rng & 255)) % w
    const y = (i * 19 + 11) % Math.floor(h * 0.45)
    const tw = 1 + ((i * 11) % 2)
    ctx.fillRect(x, y, tw, 1)
  }
}

function drawGround(ctx: CanvasRenderingContext2D, g: GameState, w: number, h: number) {
  const gy = g.arena.groundY
  ctx.fillStyle = "#0c0d12"
  ctx.fillRect(0, gy, w, h - gy)

  const t = g.timeMs * 0.0002
  for (let x = 0; x < w; x += 8) {
    const n = Math.sin(x * 0.12 + t) * 0.5 + 0.5
    ctx.fillStyle = n > 0.5 ? "#131526" : "#0f101b"
    ctx.fillRect(x, gy, 8, h - gy)
  }

  ctx.fillStyle = "rgba(44,245,198,0.12)"
  ctx.fillRect(0, gy - 2, w, 1)
  ctx.fillStyle = "rgba(255,122,89,0.10)"
  ctx.fillRect(0, gy - 4, w, 1)
}

// 绘制平台
function drawPlatforms(ctx: CanvasRenderingContext2D, g: GameState) {
  for (const plat of g.platforms) {
    // 平台主体（像素风格）
    ctx.fillStyle = "#2a2d3e"
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h)
    
    // 平台顶部高亮
    ctx.fillStyle = "#3a3d52"
    ctx.fillRect(plat.x, plat.y, plat.w, 2)
    
    // 平台边缘装饰
    ctx.fillStyle = "#1a1d2e"
    ctx.fillRect(plat.x, plat.y + plat.h - 1, plat.w, 1)
    
    // 平台纹理（每隔8像素画一个点）
    const t = g.timeMs * 0.001
    for (let x = plat.x + 4; x < plat.x + plat.w - 4; x += 8) {
      const n = Math.sin(x * 0.1 + t) * 0.3 + 0.7
      ctx.fillStyle = `rgba(60, 65, 90, ${n})`
      ctx.fillRect(x, plat.y + 2, 2, 2)
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, g: GameState, palette: Palette) {
  const body = getPlayerBodyRect(p)
  const x = Math.round(p.x)
  const y = Math.round(p.y)

  const flash = p.flashMs > 0 ? clamp(p.flashMs / 90, 0, 1) : 0
  const wobble = p.state === "hit" ? Math.sin(g.timeMs * 0.08) * 1.5 * flash : 0

  const baseBob = p.state === "walk" ? Math.sin(g.timeMs * 0.03) * 1.2 : Math.sin(g.timeMs * 0.012) * 0.8
  const koDrop = p.state === "ko" ? lerp(0, 10, clamp(p.stateTimeMs / 500, 0, 1)) : 0
  const jumpLift = p.onGround ? 0 : Math.max(0, (GAME_CONFIG.arena.groundY - p.y) * 0.18)

  const cx = x + wobble
  const cy = y + baseBob + koDrop - jumpLift

  // 绘制领域光环（在阴影之前，作为底层）
  if (p.domainActive) {
    drawDomainAura(ctx, p, g, palette)
  }

  // 绘制狂暴火焰光环（在阴影之前）
  if (p.rageActive) {
    drawRageAura(ctx, p, g, palette)
  }

  // 绘制领域蓄力进度条
  if (p.domainCharging && !p.domainActive) {
    drawDomainChargeBar(ctx, p, g, cx, y)
  }

  const shadowW = (18 + (p.state === "attack" ? 2 : 0)) * (p.onGround ? 1 : 0.72)
  ctx.fillStyle = "rgba(0,0,0,0.55)"
  ctx.fillRect(Math.round(cx - shadowW / 2), Math.round(y - 2), shadowW, 3)

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy))
  ctx.scale(p.facing, 1)
  ctx.translate(-Math.round(cx), -Math.round(cy))

  const tint = flash > 0 ? 1 : 0
  const steel = tint ? "#f2f6ff" : palette.steel
  const shade = tint ? "#cfd7e6" : palette.shade
  const core = tint ? "#ffffff" : palette.core
  const glow = tint ? "#ffffff" : palette.glow

  const walkPhase = p.state === "walk" || !p.onGround ? (g.timeMs * 0.02) % (Math.PI * 2) : 0
  const legSwing = p.state === "walk" ? Math.sin(walkPhase) * 2 : 0
  const armSwing = p.state === "walk" ? Math.sin(walkPhase + Math.PI) * 2 : 0

  const atk = p.state === "attack" ? clamp(p.stateTimeMs / GAME_CONFIG.combat.attack.durationMs, 0, 1) : 0
  const atkEase = atk < 0.3 ? atk / 0.3 : atk < 0.7 ? 1 : 1 - (atk - 0.7) / 0.3
  const armExtend = p.state === "attack" ? Math.round(lerp(0, 5, atkEase)) : 0

  const skillDuration =
    p.skill.type === "dash-slash" ? GAME_CONFIG.combat.skill.dashSlash.durationMs :
    p.skill.type === "pulse-shot" ? GAME_CONFIG.combat.skill.pulseShot.durationMs :
    p.skill.type === "li-you" ? GAME_CONFIG.combat.skill.liYou.durationMs :
    p.skill.type === "kuang-bao" ? GAME_CONFIG.combat.skill.kuangBao.durationMs :
    GAME_CONFIG.combat.skill.lingYuZhanKai.durationMs
  const skill = p.state === "skill" ? clamp(p.stateTimeMs / skillDuration, 0, 1) : 0
  const skillArm = p.state === "skill" ? Math.round(lerp(0, 6, skill < 0.55 ? skill / 0.55 : 1 - (skill - 0.55) / 0.45)) : 0

  const block = p.state === "block" ? clamp(p.stateTimeMs / 80, 0, 1) : 0
  const guard = Math.round(lerp(0, 4, block))

  const torsoX = Math.round(cx - 8)
  const torsoY = Math.round(cy - 22)

  px(ctx, shade, torsoX + 1, torsoY + 2, 14, 16)
  px(ctx, steel, torsoX + 2, torsoY + 3, 12, 14)
  px(ctx, shade, torsoX + 4, torsoY + 6, 8, 7)
  px(ctx, glow, torsoX + 7, torsoY + 7, 2, 2)

  const headX = torsoX + 4
  const headY = torsoY - 6
  px(ctx, shade, headX + 1, headY + 1, 8, 6)
  px(ctx, steel, headX + 2, headY + 2, 6, 4)
  px(ctx, core, headX + 4, headY + 3, 2, 1)

  const hipY = torsoY + 16
  const legY = hipY + 3
  const airborneLegs = !p.onGround ? 2 : 0
  const l1 = Math.round(legSwing) - airborneLegs
  const l2 = -Math.round(legSwing) + airborneLegs
  px(ctx, shade, torsoX + 4, hipY, 8, 3)
  px(ctx, steel, torsoX + 4, hipY + 1, 8, 2)
  px(ctx, shade, torsoX + 4, legY + 1, 4, 10)
  px(ctx, steel, torsoX + 5, legY + 2, 2, 8)
  px(ctx, shade, torsoX + 8, legY + 1, 4, 10)
  px(ctx, steel, torsoX + 9, legY + 2, 2, 8)
  px(ctx, core, torsoX + 4 + l1, legY + 10, 4, 2)
  px(ctx, core, torsoX + 8 + l2, legY + 10, 4, 2)

  const armY = torsoY + 6
  const armA = Math.round(armSwing)
  const ax = torsoX + 1
  px(ctx, shade, ax - guard, armY + armA, 4, 9)
  px(ctx, steel, ax + 1 - guard, armY + armA + 1, 2, 7)
  px(ctx, glow, ax + 1 - guard, armY + armA + 3, 2, 1)

  const bx = torsoX + 12
  px(ctx, shade, bx + armExtend + skillArm, armY - armA, 4, 8)
  px(ctx, steel, bx + 1 + armExtend + skillArm, armY - armA + 1, 2, 6)
  px(ctx, core, bx + 1 + armExtend + skillArm, armY - armA + 3, 2, 1)

  // 防御盾牌：方向跟随 facing（已在 ctx.scale 中处理）
  if (p.state === "block") {
    const blockBreath = Math.sin(g.timeMs * 0.015) * 0.15 + 0.85
    const blockAlpha = lerp(0, 1, block) * blockBreath
    const shieldH = Math.round(lerp(6, 12, block))
    const shieldW = Math.round(lerp(2, 5, block))
    const shieldX = torsoX - shieldW - 1
    const shieldY = torsoY + 7 + Math.round((12 - shieldH) / 2)
    px(ctx, withAlpha(palette.shade, blockAlpha), shieldX, shieldY, shieldW, shieldH)
    px(ctx, withAlpha(palette.steel, blockAlpha), shieldX + 1, shieldY + 1, shieldW - 2, shieldH - 2)
    const glowAlpha = lerp(0, 0.9, block) * blockBreath
    px(ctx, withAlpha(palette.glow, glowAlpha), shieldX + 1, shieldY + Math.round(shieldH * 0.4), shieldW - 2, 1)
  }

  // 攻击特效：方向跟随 facing（已在 ctx.scale 中处理）
  if (p.state === "attack") {
    const hb = getPlayerAttackRect(p)
    if (hb) {
      const sx = Math.round(hb.x + hb.w * 0.4)
      const sy = Math.round(hb.y + hb.h * 0.3)
      const maxLen = 18
      const len = Math.round(lerp(4, maxLen, atkEase))
      const slashAlpha = lerp(0.2, 0.85, atkEase)
      px(ctx, withAlpha("#ffffff", slashAlpha), sx, sy, len, 1)
      px(ctx, withAlpha(core, slashAlpha * 0.9), sx + 2, sy - 1, Math.max(0, len - 4), 1)
      px(ctx, withAlpha(glow, slashAlpha * 0.8), sx + 4, sy + 1, Math.max(0, len - 8), 1)
    }
  }

  // 技能特效
  if (p.state === "skill") {
    const sb = getPlayerSkillRect(p)
    if (sb) {
      const skillFade = skill < 0.2 ? skill / 0.2 : skill > 0.75 ? 1 - (skill - 0.75) / 0.25 : 1
      const skillAlpha = lerp(0, 1, skillFade)

      if (p.skill.type === "dash-slash") {
        const sy = Math.round(sb.y + sb.h * 0.5)
        const slashW = Math.round(lerp(sb.w * 0.3, sb.w, clamp(skill / 0.4, 0, 1)))
        const slashX = sb.x + Math.round((sb.w - slashW) / 2)
        px(ctx, withAlpha(palette.core, skillAlpha), slashX, sy - 1, slashW, 1)
        px(ctx, withAlpha("#ffffff", skillAlpha * 0.9), slashX + 2, sy, Math.max(0, slashW - 4), 1)
        px(ctx, withAlpha(palette.glow, skillAlpha * 0.8), slashX + 4, sy + 1, Math.max(0, slashW - 8), 1)
      } else if (p.skill.type === "pulse-shot") {
        const midY = Math.round(sb.y + sb.h / 2)
        const visibleW = Math.round(lerp(0, sb.w, clamp(skill / 0.35, 0, 1)))
        for (let i = 0; i < visibleW; i += 5) {
          const wave = Math.sin(g.timeMs * 0.02 + i * 0.3) * 0.3 + 0.7
          px(ctx, withAlpha(palette.glow, skillAlpha * wave), sb.x + i, midY + ((i / 5) % 2 === 0 ? -1 : 1), 3, 1)
        }
        px(ctx, withAlpha("#ffffff", skillAlpha * 0.85), sb.x, midY, visibleW, 1)
      } else if (p.skill.type === "li-you") {
        drawLiYouSkill(ctx, p, g, sb, skillAlpha, palette)
      } else if (p.skill.type === "kuang-bao") {
        drawKuangBaoSkill(ctx, p, g, sb, skillAlpha, palette)
      } else if (p.skill.type === "ling-yu-zhan-kai") {
        drawLingYuZhanKaiSkill(ctx, p, g, sb, skillAlpha, palette)
      }
    }
  }

  // 领域展开释放动画（domainActive 且刚激活时显示展开特效）
  if (p.domainActive && p.skill.type === "ling-yu-zhan-kai") {
    const expandTime = 500 // 展开动画持续500ms
    const expandProgress = clamp(p.domainDurationMs / (GAME_CONFIG.combat.skill.lingYuZhanKai.durationMs), 0, 1)
    const justExpanded = p.domainDurationMs > GAME_CONFIG.combat.skill.lingYuZhanKai.durationMs - expandTime
    if (justExpanded) {
      const centerX = Math.round(p.x)
      const centerY = Math.round(p.y)
      const domainRadius = GAME_CONFIG.combat.skill.lingYuZhanKai.range / 2
      // 冲击波
      const shockProgress = 1 - (p.domainDurationMs - (GAME_CONFIG.combat.skill.lingYuZhanKai.durationMs - expandTime)) / expandTime
      const shockRadius = lerp(domainRadius * 0.3, domainRadius * 1.3, shockProgress)
      const shockAlpha = (1 - shockProgress) * 0.9
      for (let angle = 0; angle < Math.PI * 2; angle += 0.25) {
        const x = centerX + Math.cos(angle + g.timeMs * 0.008) * shockRadius
        const y = centerY + Math.sin(angle + g.timeMs * 0.008) * shockRadius * 0.4
        px(ctx, withAlpha("#00ffff", shockAlpha), Math.round(x), Math.round(y), 3, 3)
        px(ctx, withAlpha("#ffffff", shockAlpha * 0.5), Math.round(x) + 1, Math.round(y) + 1, 1, 1)
      }
    }
  }

  // 骊诱持久动画（基于 liYouActiveMs，不受状态切换影响）
  if (p.liYouActiveMs > 0 && p.skill.type === "li-you") {
    drawLiYouHearts(ctx, p, g)
  }

  // 眩晕状态：星星环绕头顶
  if (p.stunMs > 0 || p.state === "stunned") {
    drawStunnedStars(ctx, p, g, torsoX, torsoY)
  }

  if (p.state === "hit" && p.flashMs > 0) {
    const hitPulse = Math.sin(g.timeMs * 0.06) * 0.5 + 0.5
    const hitAlpha = lerp(0.05, 0.2, flash * hitPulse)
    ctx.fillStyle = withAlpha("#ffffff", hitAlpha)
    ctx.fillRect(body.x - 4, body.y - 6, body.w + 8, body.h + 10)
  }

  if (!p.onGround) {
    px(ctx, palette.accent, torsoX + 6, torsoY + 24, 2, 1)
  }

  ctx.restore()

  // 技能条显示（在人物脚下）
  drawSkillBar(ctx, p, g, cx, y)
}

// 骊诱技能：粉色心形波纹向前方扩散 + 头顶冒出小爱心
function drawLiYouSkill(ctx: CanvasRenderingContext2D, p: Player, g: GameState, sb: { x: number; y: number; w: number; h: number }, alpha: number, palette: Palette) {
  const centerX = Math.round(p.x)
  const bodyTop = Math.round(p.y - GAME_CONFIG.player.body.h - 2) // 头顶位置
  const progress = clamp(p.stateTimeMs / GAME_CONFIG.combat.skill.liYou.durationMs, 0, 1)
  
  // ===== 头顶依次冒出小爱心动画 =====
  const heartCount = 16 // 总共冒出16个爱心
  const totalDuration = 2600 // 总持续时间2.6秒
  const spawnInterval = totalDuration / heartCount // 每个爱心间隔约162ms
  const heartLifeDuration = 1600 // 每个爱心飘动1.6秒后消失
  
  for (let i = 0; i < heartCount; i++) {
    const spawnTime = i * spawnInterval
    const heartLife = p.stateTimeMs - spawnTime
    
    if (heartLife < 0 || heartLife > heartLifeDuration) continue
    
    const heartProgress = heartLife / heartLifeDuration
    const heartAlpha = alpha * (1 - heartProgress) * 0.85
    
    // 爱心从头顶冒出，位置略有左右偏移
    const offsetX = Math.sin(i * 1.8 + 0.5) * 4 // 左右交替偏移
    const startX = centerX + offsetX
    const startY = bodyTop
    
    // 向上飘动 + 轻微左右摇摆
    const floatY = heartProgress * 20 // 向上飘20像素
    const floatX = Math.sin(heartProgress * Math.PI * 3 + i * 1.2) * 3 // 轻微摇摆
    
    const heartX = startX + floatX
    const heartY = startY - floatY
    
    // 爱心很小（2-3像素）
    const heartSize = Math.round(lerp(2, 3, Math.sin(heartProgress * Math.PI)))
    
    // 交替粉色
    const heartColor = i % 3 === 0 ? "#ff1493" : i % 3 === 1 ? "#ff69b4" : "#ffb6c1"
    
    // 像素爱心：两个小方块组成
    px(ctx, withAlpha(heartColor, heartAlpha), Math.round(heartX) - heartSize, Math.round(heartY), heartSize, heartSize)
    px(ctx, withAlpha(heartColor, heartAlpha), Math.round(heartX), Math.round(heartY), heartSize, heartSize)
    px(ctx, withAlpha(heartColor, heartAlpha * 0.7), Math.round(heartX) - Math.floor(heartSize / 2), Math.round(heartY) + heartSize, heartSize, heartSize)
  }
  
  // ===== 原有技能效果：多个心形波纹向外扩散 =====
  const waveCount = 3
  for (let i = 0; i < waveCount; i++) {
    const waveProgress = clamp((progress * 3 - i * 0.8), 0, 1)
    if (waveProgress <= 0 || waveProgress >= 1) continue
    
    const radius = lerp(5, 35, waveProgress)
    const waveAlpha = alpha * (1 - waveProgress) * 0.8
    
    const heartSize = Math.round(lerp(4, 12, waveProgress))
    const dir = p.facing
    const baseX = centerX + dir * radius
    const heartY = Math.round(p.y - 10)
    
    const pulseAlpha = waveAlpha * (0.6 + Math.sin(g.timeMs * 0.01 + i) * 0.4)
    
    ctx.save()
    ctx.translate(baseX, heartY)
    
    px(ctx, withAlpha("#ff69b4", pulseAlpha), -heartSize, -heartSize / 2, heartSize, heartSize)
    px(ctx, withAlpha("#ff1493", pulseAlpha), 0, -heartSize / 2, heartSize, heartSize)
    px(ctx, withAlpha("#ff69b4", pulseAlpha * 0.8), -heartSize / 2, heartSize / 2, heartSize, heartSize)
    
    ctx.restore()
  }
  
  // 中心闪光
  const flashAlpha = alpha * (1 - progress) * 0.9
  px(ctx, withAlpha("#ffffff", flashAlpha), centerX - 2, Math.round(p.y - 12), 4, 4)
  px(ctx, withAlpha("#ff69b4", flashAlpha * 0.8), centerX - 1, Math.round(p.y - 11), 2, 2)
}

// 骊诱持久爱心动画（不受状态切换影响，基于 liYouActiveMs）
function drawLiYouHearts(ctx: CanvasRenderingContext2D, p: Player, g: GameState) {
  const centerX = Math.round(p.x)
  const bodyTop = Math.round(p.y - GAME_CONFIG.player.body.h - 2)
  const totalDuration = GAME_CONFIG.combat.skill.liYou.durationMs
  const elapsed = totalDuration - p.liYouActiveMs // 已经过的时间
  const progress = clamp(elapsed / totalDuration, 0, 1)
  
  const heartCount = 16
  const spawnInterval = totalDuration / heartCount
  const heartLifeDuration = 1600
  
  for (let i = 0; i < heartCount; i++) {
    const spawnTime = i * spawnInterval
    const heartLife = elapsed - spawnTime
    
    if (heartLife < 0 || heartLife > heartLifeDuration) continue
    
    const heartProgress = heartLife / heartLifeDuration
    const heartAlpha = (1 - heartProgress) * 0.85
    
    const offsetX = Math.sin(i * 1.8 + 0.5) * 4
    const startX = centerX + offsetX
    const startY = bodyTop
    
    const floatY = heartProgress * 20
    const floatX = Math.sin(heartProgress * Math.PI * 3 + i * 1.2) * 3
    
    const heartX = startX + floatX
    const heartY = startY - floatY
    
    const heartSize = Math.round(lerp(2, 3, Math.sin(heartProgress * Math.PI)))
    const heartColor = i % 3 === 0 ? "#ff1493" : i % 3 === 1 ? "#ff69b4" : "#ffb6c1"
    
    px(ctx, withAlpha(heartColor, heartAlpha), Math.round(heartX) - heartSize, Math.round(heartY), heartSize, heartSize)
    px(ctx, withAlpha(heartColor, heartAlpha), Math.round(heartX), Math.round(heartY), heartSize, heartSize)
    px(ctx, withAlpha(heartColor, heartAlpha * 0.7), Math.round(heartX) - Math.floor(heartSize / 2), Math.round(heartY) + heartSize, heartSize, heartSize)
  }
}

// 狂暴技能：红色火焰激活特效
function drawKuangBaoSkill(ctx: CanvasRenderingContext2D, p: Player, g: GameState, sb: { x: number; y: number; w: number; h: number }, alpha: number, palette: Palette) {
  const centerX = Math.round(p.x)
  const centerY = Math.round(p.y - 10)
  const progress = clamp(p.stateTimeMs / GAME_CONFIG.combat.skill.kuangBao.durationMs, 0, 1)
  
  // 火焰粒子向上喷发
  const flameCount = 8
  for (let i = 0; i < flameCount; i++) {
    const angle = (i / flameCount) * Math.PI * 2 + g.timeMs * 0.003
    const dist = 8 + Math.sin(g.timeMs * 0.008 + i * 1.5) * 4
    const flameX = centerX + Math.cos(angle) * dist
    const flameY = centerY + Math.sin(angle) * dist * 0.5 - 5
    
    const flameAlpha = alpha * (0.5 + Math.sin(g.timeMs * 0.015 + i) * 0.3)
    const flameSize = 2 + Math.floor(Math.sin(g.timeMs * 0.01 + i * 0.7) * 2)
    
    // 火焰颜色渐变
    const colorPhase = (g.timeMs * 0.005 + i * 0.3) % 1
    const flameColor = colorPhase < 0.3 ? "#ff4500" : colorPhase < 0.6 ? "#ff6600" : "#ffcc00"
    
    px(ctx, withAlpha(flameColor, flameAlpha), Math.round(flameX - flameSize / 2), Math.round(flameY), flameSize, flameSize)
  }
  
  // 中心爆发光
  const burstAlpha = alpha * (1 - progress * 0.5) * 0.7
  px(ctx, withAlpha("#ff0000", burstAlpha), centerX - 3, centerY - 3, 6, 6)
  px(ctx, withAlpha("#ff6600", burstAlpha * 0.8), centerX - 2, centerY - 2, 4, 4)
}

// 领域展开技能：绿色领域光环（释放阶段动画）
function drawLingYuZhanKaiSkill(ctx: CanvasRenderingContext2D, p: Player, g: GameState, sb: { x: number; y: number; w: number; h: number }, alpha: number, palette: Palette) {
  const centerX = Math.round(p.x)
  const centerY = Math.round(p.y)
  const progress = clamp(p.stateTimeMs / GAME_CONFIG.combat.skill.lingYuZhanKai.durationMs, 0, 1)
  
  // 领域边界光环
  const domainRadius = GAME_CONFIG.combat.skill.lingYuZhanKai.range / 2
  const expandProgress = clamp(progress * 2, 0, 1) // 更快的展开速度
  const currentRadius = lerp(5, domainRadius, expandProgress)
  
  // 展开时的冲击波效果
  if (expandProgress < 1) {
    const shockwaveRadius = lerp(0, domainRadius * 1.2, expandProgress)
    const shockwaveAlpha = (1 - expandProgress) * 0.8
    for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
      const x = centerX + Math.cos(angle) * shockwaveRadius
      const y = centerY + Math.sin(angle) * shockwaveRadius * 0.4
      px(ctx, withAlpha("#00ffff", shockwaveAlpha), Math.round(x), Math.round(y), 3, 3)
    }
  }
  
  // 绘制领域边界（更亮更明显）
  const boundaryAlpha = alpha * 0.9 * (0.6 + Math.sin(g.timeMs * 0.015) * 0.4)
  
  // 外圈 - 加粗
  for (let angle = 0; angle < Math.PI * 2; angle += 0.15) {
    const x = centerX + Math.cos(angle + g.timeMs * 0.005) * currentRadius
    const y = centerY + Math.sin(angle + g.timeMs * 0.005) * currentRadius * 0.4
    const pulseAlpha = boundaryAlpha * (0.8 + Math.sin(angle * 4 + g.timeMs * 0.02) * 0.2)
    px(ctx, withAlpha("#00ff88", pulseAlpha), Math.round(x), Math.round(y), 3, 3)
    px(ctx, withAlpha("#ffffff", pulseAlpha * 0.5), Math.round(x) + 1, Math.round(y) + 1, 1, 1)
  }
  
  // 内部能量线 - 更密集
  const lineCount = 12
  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2 + g.timeMs * 0.003
    const innerRadius = currentRadius * 0.2
    const outerRadius = currentRadius * 0.95
    
    const x1 = centerX + Math.cos(angle) * innerRadius
    const y1 = centerY + Math.sin(angle) * innerRadius * 0.4
    const x2 = centerX + Math.cos(angle) * outerRadius
    const y2 = centerY + Math.sin(angle) * outerRadius * 0.4
    
    const lineAlpha = alpha * 0.6 * (0.5 + Math.sin(g.timeMs * 0.015 + i) * 0.5)
    ctx.strokeStyle = withAlpha("#00ff00", lineAlpha)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(Math.round(x1), Math.round(y1))
    ctx.lineTo(Math.round(x2), Math.round(y2))
    ctx.stroke()
  }
  
  // 中心光点 - 更大更亮
  const coreAlpha = alpha * 1.0
  const corePulse = 1 + Math.sin(g.timeMs * 0.02) * 0.3
  const coreSize = Math.round(4 * corePulse)
  px(ctx, withAlpha("#00ff88", coreAlpha), centerX - coreSize, centerY - 5 - coreSize, coreSize * 2, coreSize * 2)
  px(ctx, withAlpha("#ffffff", coreAlpha * 0.9), centerX - coreSize/2, centerY - 5 - coreSize/2, coreSize, coreSize)
  
  // 顶部能量爆发效果
  const burstCount = 8
  for (let i = 0; i < burstCount; i++) {
    const angle = (i / burstCount) * Math.PI * 2 + g.timeMs * 0.01
    const dist = 15 + Math.sin(g.timeMs * 0.02 + i) * 5
    const bx = centerX + Math.cos(angle) * dist
    const by = centerY - 15 + Math.sin(angle) * dist * 0.3
    const burstAlpha = alpha * 0.7 * (0.5 + Math.sin(g.timeMs * 0.03 + i) * 0.5)
    px(ctx, withAlpha("#00ffff", burstAlpha), Math.round(bx), Math.round(by), 2, 2)
  }
}

// 眩晕状态：星星环绕头顶
function drawStunnedStars(ctx: CanvasRenderingContext2D, p: Player, g: GameState, torsoX: number, torsoY: number) {
  const headCenterX = torsoX + 8
  const headTopY = torsoY - 12
  const starCount = 3
  const radius = 8
  
  for (let i = 0; i < starCount; i++) {
    const angle = (g.timeMs * 0.004) + (i * Math.PI * 2 / starCount)
    const starX = headCenterX + Math.cos(angle) * radius
    const starY = headTopY + Math.sin(angle) * radius * 0.4 - 3
    
    // 星星闪烁
    const twinkle = 0.6 + Math.sin(g.timeMs * 0.01 + i * 2) * 0.4
    
    // 绘制小星星（十字形）
    px(ctx, withAlpha("#ffdf6e", twinkle), Math.round(starX) - 1, Math.round(starY), 2, 1)
    px(ctx, withAlpha("#ffdf6e", twinkle), Math.round(starX), Math.round(starY) - 1, 1, 2)
    px(ctx, withAlpha("#ffffff", twinkle * 0.8), Math.round(starX), Math.round(starY), 1, 1)
  }
}

// 狂暴光环（持续状态）
function drawRageAura(ctx: CanvasRenderingContext2D, p: Player, g: GameState, palette: Palette) {
  const centerX = Math.round(p.x)
  const centerY = Math.round(p.y - 10)
  
  // 火焰粒子环绕
  const flameCount = 12
  for (let i = 0; i < flameCount; i++) {
    const angle = (i / flameCount) * Math.PI * 2 + g.timeMs * 0.003
    const dist = 12 + Math.sin(g.timeMs * 0.008 + i * 1.2) * 5
    const flameX = centerX + Math.cos(angle) * dist
    const flameY = centerY + Math.sin(angle) * dist * 0.5
    
    const flameAlpha = 0.4 + Math.sin(g.timeMs * 0.015 + i) * 0.2
    const flameSize = 2 + Math.floor(Math.sin(g.timeMs * 0.01 + i * 0.5) * 1.5)
    
    const colorPhase = (g.timeMs * 0.003 + i * 0.2) % 1
    const flameColor = colorPhase < 0.5 ? "#ff4500" : "#ff6600"
    
    px(ctx, withAlpha(flameColor, flameAlpha), Math.round(flameX - flameSize / 2), Math.round(flameY), flameSize, flameSize)
  }
  
  // 底部光环
  const ringAlpha = 0.3 + Math.sin(g.timeMs * 0.01) * 0.15
  px(ctx, withAlpha("#ff4500", ringAlpha), centerX - 10, centerY + 15, 20, 2)
  px(ctx, withAlpha("#ff6600", ringAlpha * 0.7), centerX - 8, centerY + 16, 16, 1)
}

// 领域光环（持续状态）
function drawDomainAura(ctx: CanvasRenderingContext2D, p: Player, g: GameState, palette: Palette) {
  const centerX = Math.round(p.x)
  const centerY = Math.round(p.y)
  const domainRadius = GAME_CONFIG.combat.skill.lingYuZhanKai.range / 2
  
  // 领域边界 - 更明显的脉冲效果
  const boundaryAlpha = 0.5 + Math.sin(g.timeMs * 0.008) * 0.2
  
  // 绘制领域边界（椭圆形）- 加粗加亮
  for (let angle = 0; angle < Math.PI * 2; angle += 0.12) {
    const x = centerX + Math.cos(angle + g.timeMs * 0.003) * domainRadius
    const y = centerY + Math.sin(angle + g.timeMs * 0.003) * domainRadius * 0.4
    
    const pulseAlpha = boundaryAlpha * (0.8 + Math.sin(angle * 4 + g.timeMs * 0.015) * 0.2)
    px(ctx, withAlpha("#00ff88", pulseAlpha), Math.round(x), Math.round(y), 3, 3)
    // 高光点
    if (Math.sin(angle * 6 + g.timeMs * 0.02) > 0.5) {
      px(ctx, withAlpha("#ffffff", pulseAlpha * 0.6), Math.round(x) + 1, Math.round(y) + 1, 1, 1)
    }
  }
  
  // 内部能量流动 - 更密集
  const flowCount = 10
  for (let i = 0; i < flowCount; i++) {
    const angle = (i / flowCount) * Math.PI * 2 + g.timeMs * 0.004
    const innerR = domainRadius * 0.15
    const outerR = domainRadius * 0.9
    
    const x1 = centerX + Math.cos(angle) * innerR
    const y1 = centerY + Math.sin(angle) * innerR * 0.4
    const x2 = centerX + Math.cos(angle) * outerR
    const y2 = centerY + Math.sin(angle) * outerR * 0.4
    
    const lineAlpha = 0.4 * (0.5 + Math.sin(g.timeMs * 0.012 + i) * 0.5)
    ctx.strokeStyle = withAlpha("#00ff00", lineAlpha)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(Math.round(x1), Math.round(y1))
    ctx.lineTo(Math.round(x2), Math.round(y2))
    ctx.stroke()
  }
  
  // 旋转的能量环
  const ringCount = 3
  for (let r = 0; r < ringCount; r++) {
    const ringRadius = domainRadius * (0.3 + r * 0.25)
    const ringAngle = g.timeMs * 0.002 * (r % 2 === 0 ? 1 : -1) + r * Math.PI / 3
    
    for (let i = 0; i < 6; i++) {
      const angle = ringAngle + (i / 6) * Math.PI * 2
      const x = centerX + Math.cos(angle) * ringRadius
      const y = centerY + Math.sin(angle) * ringRadius * 0.4
      const ringAlpha = 0.3 + Math.sin(g.timeMs * 0.01 + r + i) * 0.2
      px(ctx, withAlpha("#00ffff", ringAlpha), Math.round(x), Math.round(y), 2, 2)
    }
  }
  
  // 地面光圈 - 更明显
  const groundY = GAME_CONFIG.arena.groundY
  const groundPulse = 0.6 + Math.sin(g.timeMs * 0.01) * 0.2
  px(ctx, withAlpha("#00ff88", groundPulse), centerX - Math.round(domainRadius), groundY - 2, Math.round(domainRadius * 2), 3)
  px(ctx, withAlpha("#00ffff", groundPulse * 0.5), centerX - Math.round(domainRadius) + 2, groundY - 1, Math.round(domainRadius * 2) - 4, 1)
  
  // 中心持续发光
  const corePulse = 0.8 + Math.sin(g.timeMs * 0.015) * 0.2
  px(ctx, withAlpha("#00ff88", corePulse * 0.7), centerX - 3, centerY - 8, 6, 6)
  px(ctx, withAlpha("#ffffff", corePulse * 0.5), centerX - 1, centerY - 6, 2, 2)
}

// 领域蓄力进度条
function drawDomainChargeBar(ctx: CanvasRenderingContext2D, p: Player, g: GameState, cx: number, y: number) {
  const chargeTime = GAME_CONFIG.combat.skill.lingYuZhanKai.chargeTimeMs || 4700
  const progress = clamp(p.domainChargeMs / chargeTime, 0, 1)
  
  const barWidth = 24
  const barHeight = 3
  const barX = cx - barWidth / 2
  const barY = y + 5
  
  // 背景
  ctx.fillStyle = "rgba(0,0,0,0.6)"
  ctx.fillRect(Math.round(barX), Math.round(barY), barWidth, barHeight)
  
  // 进度
  const fillWidth = Math.round(barWidth * progress)
  const pulseAlpha = 0.7 + Math.sin(g.timeMs * 0.01) * 0.3
  ctx.fillStyle = withAlpha("#00ff88", pulseAlpha)
  ctx.fillRect(Math.round(barX), Math.round(barY), fillWidth, barHeight)
  
  // 边框
  ctx.strokeStyle = withAlpha("#00ff00", 0.5)
  ctx.lineWidth = 1
  ctx.strokeRect(Math.round(barX), Math.round(barY), barWidth, barHeight)
}

// 技能条显示（在人物脚下）
function drawSkillBar(ctx: CanvasRenderingContext2D, p: Player, g: GameState, cx: number, y: number) {
  const maxCharge = GAME_CONFIG.combat.skill.skillChargeMax
  const charge = p.skillCharge
  
  const barWidth = 20
  const barHeight = 2
  const segmentWidth = barWidth / maxCharge
  const barX = cx - barWidth / 2
  const barY = y + 8
  
  // 背景
  ctx.fillStyle = "rgba(0,0,0,0.5)"
  ctx.fillRect(Math.round(barX), Math.round(barY), barWidth, barHeight)
  
  // 已充能的格子
  for (let i = 0; i < charge; i++) {
    const segX = barX + i * segmentWidth
    const segAlpha = p.skillReady ? 0.9 + Math.sin(g.timeMs * 0.015) * 0.1 : 0.7
    ctx.fillStyle = withAlpha(p.character.palette.glow, segAlpha)
    ctx.fillRect(Math.round(segX) + 1, Math.round(barY), Math.round(segmentWidth) - 1, barHeight)
  }
  
  // 技能就绪时闪烁边框
  if (p.skillReady) {
    const flashAlpha = 0.6 + Math.sin(g.timeMs * 0.02) * 0.4
    ctx.strokeStyle = withAlpha(p.character.palette.glow, flashAlpha)
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(barX) - 1, Math.round(barY) - 1, barWidth + 2, barHeight + 2)
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, g: GameState) {
  for (const p of g.particles) {
    const t = 1 - p.lifeMs / p.maxLifeMs
    const a = clamp(t, 0, 1)
    ctx.fillStyle = withAlpha(p.color, 0.7 * a)
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1)
  }
}

function withAlpha(hex: string, a: number) {
  const v = hex.startsWith("#") ? hex.slice(1) : hex
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}
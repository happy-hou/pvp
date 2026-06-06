import { useEffect, useMemo, useRef, useState } from "react"
import { GAME_CONFIG } from "@/game/config"
import { createInputTracker } from "@/game/input"
import { renderGame } from "@/game/render"
import { createGame, restartGame, stepGame } from "@/game/state"
import type { MatchConfig } from "@/game/types"

type HudSnapshot = {
  p1Hp: number
  p2Hp: number
  p1CharacterName: string
  p2CharacterName: string
  p1SkillName: string
  p2SkillName: string
  p1SkillCharge: number
  p2SkillCharge: number
  p1SkillReady: boolean
  p2SkillReady: boolean
  p1Stunned: boolean
  p2Stunned: boolean
  p1RageActive: boolean
  p2RageActive: boolean
  p1DomainActive: boolean
  p2DomainActive: boolean
  p1DomainCharging: boolean
  p2DomainCharging: boolean
  paused: boolean
  phase: "battle" | "ko"
  winner: 1 | 2 | null
}

export function useGameLoop(enabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const inputRef = useRef(createInputTracker())
  const gameRef = useRef(createGame())
  const rafRef = useRef<number | null>(null)

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    p1Hp: gameRef.current.players[1].hp,
    p2Hp: gameRef.current.players[2].hp,
    p1CharacterName: gameRef.current.players[1].character.name,
    p2CharacterName: gameRef.current.players[2].character.name,
    p1SkillName: gameRef.current.players[1].skill.name,
    p2SkillName: gameRef.current.players[2].skill.name,
    p1SkillCharge: gameRef.current.players[1].skillCharge,
    p2SkillCharge: gameRef.current.players[2].skillCharge,
    p1SkillReady: gameRef.current.players[1].skillReady,
    p2SkillReady: gameRef.current.players[2].skillReady,
    p1Stunned: gameRef.current.players[1].stunMs > 0,
    p2Stunned: gameRef.current.players[2].stunMs > 0,
    p1RageActive: gameRef.current.players[1].rageActive,
    p2RageActive: gameRef.current.players[2].rageActive,
    p1DomainActive: gameRef.current.players[1].domainActive,
    p2DomainActive: gameRef.current.players[2].domainActive,
    p1DomainCharging: gameRef.current.players[1].domainCharging,
    p2DomainCharging: gameRef.current.players[2].domainCharging,
    paused: gameRef.current.paused,
    phase: gameRef.current.phase,
    winner: gameRef.current.winner,
  }))

  const api = useMemo(
    () => ({
      startMatch: (matchConfig: MatchConfig) => {
        gameRef.current = createGame(Date.now() >>> 0, matchConfig)
        setHud({
          p1Hp: gameRef.current.players[1].hp,
          p2Hp: gameRef.current.players[2].hp,
          p1CharacterName: gameRef.current.players[1].character.name,
          p2CharacterName: gameRef.current.players[2].character.name,
          p1SkillName: gameRef.current.players[1].skill.name,
          p2SkillName: gameRef.current.players[2].skill.name,
          p1SkillCharge: gameRef.current.players[1].skillCharge,
          p2SkillCharge: gameRef.current.players[2].skillCharge,
          p1SkillReady: gameRef.current.players[1].skillReady,
          p2SkillReady: gameRef.current.players[2].skillReady,
          p1Stunned: gameRef.current.players[1].stunMs > 0,
          p2Stunned: gameRef.current.players[2].stunMs > 0,
          p1RageActive: gameRef.current.players[1].rageActive,
          p2RageActive: gameRef.current.players[2].rageActive,
          p1DomainActive: gameRef.current.players[1].domainActive,
          p2DomainActive: gameRef.current.players[2].domainActive,
          p1DomainCharging: gameRef.current.players[1].domainCharging,
          p2DomainCharging: gameRef.current.players[2].domainCharging,
          paused: gameRef.current.paused,
          phase: gameRef.current.phase,
          winner: gameRef.current.winner,
        })
      },
      restartMatch: () => {
        restartGame(gameRef.current)
        setHud({
          p1Hp: gameRef.current.players[1].hp,
          p2Hp: gameRef.current.players[2].hp,
          p1CharacterName: gameRef.current.players[1].character.name,
          p2CharacterName: gameRef.current.players[2].character.name,
          p1SkillName: gameRef.current.players[1].skill.name,
          p2SkillName: gameRef.current.players[2].skill.name,
          p1SkillCharge: gameRef.current.players[1].skillCharge,
          p2SkillCharge: gameRef.current.players[2].skillCharge,
          p1SkillReady: gameRef.current.players[1].skillReady,
          p2SkillReady: gameRef.current.players[2].skillReady,
          p1Stunned: gameRef.current.players[1].stunMs > 0,
          p2Stunned: gameRef.current.players[2].stunMs > 0,
          p1RageActive: gameRef.current.players[1].rageActive,
          p2RageActive: gameRef.current.players[2].rageActive,
          p1DomainActive: gameRef.current.players[1].domainActive,
          p2DomainActive: gameRef.current.players[2].domainActive,
          p1DomainCharging: gameRef.current.players[1].domainCharging,
          p2DomainCharging: gameRef.current.players[2].domainCharging,
          paused: gameRef.current.paused,
          phase: gameRef.current.phase,
          winner: gameRef.current.winner,
        })
      },
    }),
    [],
  )

  useEffect(() => {
    if (!enabled) return
    const onDown = (e: KeyboardEvent) => inputRef.current.onKeyDown(e)
    const onUp = (e: KeyboardEvent) => inputRef.current.onKeyUp(e)
    window.addEventListener("keydown", onDown, { passive: false })
    window.addEventListener("keyup", onUp, { passive: false })
    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("keyup", onUp)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = GAME_CONFIG.internal.width
    canvas.height = GAME_CONFIG.internal.height
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return
    ctxRef.current = ctx
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let last = performance.now()
    let acc = 0
    const step = 1000 / 60

    const loop = (now: number) => {
      const ctx = ctxRef.current
      const canvas = canvasRef.current
      if (!ctx || !canvas) return

      const dt = Math.min(50, now - last)
      last = now
      acc += dt

      const g = gameRef.current
      while (acc >= step) {
        try {
          const raw = inputRef.current.getSnapshot()
          if (raw.restartPressed && g.phase === "ko") restartGame(g)
          stepGame(g, raw, step)
        } catch (e) {
          console.error("Game step error:", e, (e as Error).stack)
        }
        acc -= step
      }

      renderGame(ctx, g)

      const nextHud: HudSnapshot = {
        p1Hp: g.players[1].hp,
        p2Hp: g.players[2].hp,
        p1CharacterName: g.players[1].character.name,
        p2CharacterName: g.players[2].character.name,
        p1SkillName: g.players[1].skill.name,
        p2SkillName: g.players[2].skill.name,
        p1SkillCharge: g.players[1].skillCharge,
        p2SkillCharge: g.players[2].skillCharge,
        p1SkillReady: g.players[1].skillReady,
        p2SkillReady: g.players[2].skillReady,
        p1Stunned: g.players[1].stunMs > 0,
        p2Stunned: g.players[2].stunMs > 0,
        p1RageActive: g.players[1].rageActive,
        p2RageActive: g.players[2].rageActive,
        p1DomainActive: g.players[1].domainActive,
        p2DomainActive: g.players[2].domainActive,
        p1DomainCharging: g.players[1].domainCharging,
        p2DomainCharging: g.players[2].domainCharging,
        paused: g.paused,
        phase: g.phase,
        winner: g.winner,
      }
      setHud((prev) => {
        if (
          prev.p1Hp === nextHud.p1Hp &&
          prev.p2Hp === nextHud.p2Hp &&
          prev.p1CharacterName === nextHud.p1CharacterName &&
          prev.p2CharacterName === nextHud.p2CharacterName &&
          prev.p1SkillName === nextHud.p1SkillName &&
          prev.p2SkillName === nextHud.p2SkillName &&
          prev.p1SkillCharge === nextHud.p1SkillCharge &&
          prev.p2SkillCharge === nextHud.p2SkillCharge &&
          prev.p1SkillReady === nextHud.p1SkillReady &&
          prev.p2SkillReady === nextHud.p2SkillReady &&
          prev.p1Stunned === nextHud.p1Stunned &&
          prev.p2Stunned === nextHud.p2Stunned &&
          prev.p1RageActive === nextHud.p1RageActive &&
          prev.p2RageActive === nextHud.p2RageActive &&
          prev.p1DomainActive === nextHud.p1DomainActive &&
          prev.p2DomainActive === nextHud.p2DomainActive &&
          prev.p1DomainCharging === nextHud.p1DomainCharging &&
          prev.p2DomainCharging === nextHud.p2DomainCharging &&
          prev.paused === nextHud.paused &&
          prev.phase === nextHud.phase &&
          prev.winner === nextHud.winner
        )
          return prev
        return nextHud
      })

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [enabled])

  return { canvasRef, hud, ...api }
}
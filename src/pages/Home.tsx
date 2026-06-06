import Hud from "@/components/Hud"
import StartScreen from "@/components/StartScreen"
import { useGameLoop } from "@/hooks/useGameLoop"
import { cn } from "@/lib/utils"
import { useMemo, useState } from "react"
import type { CharacterType } from "@/game/types"
import { useNavigate } from "react-router-dom"

type Screen = "start" | "battle"

export default function Home() {
  const [screen, setScreen] = useState<Screen>("start")
  const [p1Character, setP1Character] = useState<CharacterType>("meng-zhi-li")
  const [p2Character, setP2Character] = useState<CharacterType>("kuang-qi")
  const { canvasRef, hud, startMatch, restartMatch } = useGameLoop(screen === "battle")
  const navigate = useNavigate()

  const onStart = () => {
    startMatch({ p1Character, p2Character })
    setScreen("battle")
  }

  const onBack = () => {
    setScreen("start")
  }

  const shell = useMemo(
    () => (
      <div className="pointer-events-none absolute inset-0">
        <div className="crt-scanlines absolute inset-0 opacity-70" />
        <div className="crt-noise absolute inset-0 opacity-[0.14]" />
        <div className="crt-vignette absolute inset-0" />
      </div>
    ),
    [],
  )

  return (
    <div className="relative min-h-dvh bg-[#05060a] text-zinc-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(126,249,255,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,122,89,0.10),transparent_42%),radial-gradient(circle_at_50%_90%,rgba(44,245,198,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_25%,transparent_70%,rgba(0,0,0,0.35))]" />

      <div className="relative">
        {screen === "start" ? (
          <div className="flex flex-col items-center">
            <StartScreen
              onStart={onStart}
              p1Character={p1Character}
              p2Character={p2Character}
              onPickP1Character={setP1Character}
              onPickP2Character={setP2Character}
            />
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={() => navigate('/lobby')}
                className="group relative inline-flex select-none items-center justify-center gap-2 px-6 py-3 text-sm font-semibold tracking-wide outline-none border-2 border-cyan-400/30 bg-cyan-950/40 text-cyan-200 shadow-[0_6px_0_0_rgba(0,0,0,0.45)] active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(0,0,0,0.45)] transition-[transform,box-shadow,filter] duration-100 hover:brightness-110 hover:border-cyan-400/50"
              >
                <span className="pointer-events-none absolute inset-0 opacity-55 bg-[linear-gradient(180deg,rgba(126,249,255,0.14),rgba(255,122,89,0.0)_60%)]" />
                <span className="relative" style={{ fontFamily: 'var(--font-display)' }}>
                  联机对战
                </span>
                <span className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[linear-gradient(90deg,rgba(126,249,255,0.0),rgba(126,249,255,0.18),rgba(255,122,89,0.18),rgba(255,122,89,0.0))]" />
              </button>
              <div className="text-[10px] text-zinc-400/50" style={{ fontFamily: 'var(--font-display)' }}>
                与全球机甲驾驶员在线对战
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-6">
            <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200/10 bg-zinc-950/30 p-3">
              <div className="relative mx-auto w-full max-w-5xl">
                <div className={cn("relative aspect-video w-full overflow-hidden rounded-lg bg-black")}>
                  <canvas ref={canvasRef} className="pixel-canvas absolute inset-0 h-full w-full" />
                  {shell}
                  <Hud
                    p1Hp={hud.p1Hp}
                    p2Hp={hud.p2Hp}
                    p1CharacterName={hud.p1CharacterName}
                    p2CharacterName={hud.p2CharacterName}
                    p1SkillName={hud.p1SkillName}
                    p2SkillName={hud.p2SkillName}
                    p1SkillCharge={hud.p1SkillCharge}
                    p2SkillCharge={hud.p2SkillCharge}
                    p1SkillReady={hud.p1SkillReady}
                    p2SkillReady={hud.p2SkillReady}
                    p1Stunned={hud.p1Stunned}
                    p2Stunned={hud.p2Stunned}
                    p1RageActive={hud.p1RageActive}
                    p2RageActive={hud.p2RageActive}
                    p1DomainActive={hud.p1DomainActive}
                    p2DomainActive={hud.p2DomainActive}
                    p1DomainCharging={hud.p1DomainCharging}
                    p2DomainCharging={hud.p2DomainCharging}
                    paused={hud.paused}
                    phase={hud.phase}
                    winner={hud.winner}
                    onRestart={() => restartMatch()}
                    onBack={onBack}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-200/70">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <span className="font-bold text-zinc-100">P1</span>：A/D 移动，W 跳跃，J 攻击，K 防御，L 技能
                  </span>
                  <span>
                    <span className="font-bold text-zinc-100">P2</span>：←/→ 移动，↑ 跳跃，1/U 攻击，2/I 防御，3/O 技能
                  </span>
                </div>
                <div className="font-semibold tracking-wide text-zinc-200/60">ESC 暂停 / 继续</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
import PixelButton from "@/components/PixelButton"
import { cn } from "@/lib/utils"

type Props = {
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
  onRestart: () => void
  onBack: () => void
}

function HpBar({ value, maxValue = 300, tone }: { value: number; maxValue?: number; tone: "cyan" | "orange" }) {
  const p = Math.max(0, Math.min(100, (value / maxValue) * 100))
  const from = tone === "cyan" ? "from-cyan-300" : "from-orange-300"
  const to = tone === "cyan" ? "to-emerald-300" : "to-amber-300"
  return (
    <div className="h-3 w-full rounded-sm border border-zinc-50/15 bg-zinc-950/50 p-[2px]">
      <div
        className={cn("h-full rounded-[1px] bg-gradient-to-r transition-[width] duration-150", from, to)}
        style={{ width: `${p}%` }}
      />
    </div>
  )
}

// 技能条组件（4格充能）
function SkillChargeBar({ 
  charge, 
  ready, 
  tone 
}: { 
  charge: number
  ready: boolean
  tone: "cyan" | "orange" 
}) {
  const maxCharge = 4
  const segments = Array.from({ length: maxCharge }, (_, i) => i)
  const glowColor = tone === "cyan" ? "bg-cyan-400" : "bg-orange-400"
  const borderColor = tone === "cyan" ? "border-cyan-300/30" : "border-orange-300/30"
  
  return (
    <div className="flex items-center gap-1">
      {segments.map((i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-2 rounded-sm border transition-colors",
            i < charge 
              ? ready 
                ? `${glowColor} animate-pulse` 
                : glowColor
              : "border-zinc-200/20 bg-zinc-950/50",
            ready && i < charge && borderColor
          )}
        />
      ))}
      {ready && (
        <span className={cn(
          "ml-1 text-[10px] font-bold",
          tone === "cyan" ? "text-cyan-200" : "text-orange-200"
        )}>
          READY
        </span>
      )}
    </div>
  )
}

// 状态指示器组件
function StatusIndicator({
  stunned,
  rageActive,
  domainActive,
  domainCharging,
  tone
}: {
  stunned: boolean
  rageActive: boolean
  domainActive: boolean
  domainCharging: boolean
  tone: "cyan" | "orange"
}) {
  const textColor = tone === "cyan" ? "text-cyan-200/80" : "text-orange-200/80"
  const bgColor = tone === "cyan" ? "bg-cyan-400/15" : "bg-orange-400/15"
  const borderColor = tone === "cyan" ? "border-cyan-300/20" : "border-orange-300/20"
  
  return (
    <div className="flex flex-wrap gap-1">
      {stunned && (
        <span className={cn(
          "rounded-sm border px-1.5 py-0.5 text-[9px] font-bold",
          "bg-yellow-400/15 border-yellow-300/20 text-yellow-200/80"
        )}>
          眩晕
        </span>
      )}
      {rageActive && (
        <span className={cn(
          "rounded-sm border px-1.5 py-0.5 text-[9px] font-bold",
          "bg-red-400/15 border-red-300/20 text-red-200/80"
        )}>
          狂暴
        </span>
      )}
      {domainActive && (
        <span className={cn(
          "rounded-sm border px-1.5 py-0.5 text-[9px] font-bold",
          "bg-green-400/15 border-green-300/20 text-green-200/80"
        )}>
          领域
        </span>
      )}
      {domainCharging && !domainActive && (
        <span className={cn(
          "rounded-sm border px-1.5 py-0.5 text-[9px] font-bold",
          bgColor, borderColor, textColor
        )}>
          蓄力中
        </span>
      )}
    </div>
  )
}

export default function Hud({
  p1Hp,
  p2Hp,
  p1CharacterName,
  p2CharacterName,
  p1SkillName,
  p2SkillName,
  p1SkillCharge,
  p2SkillCharge,
  p1SkillReady,
  p2SkillReady,
  p1Stunned,
  p2Stunned,
  p1RageActive,
  p2RageActive,
  p1DomainActive,
  p2DomainActive,
  p1DomainCharging,
  p2DomainCharging,
  paused,
  phase,
  winner,
  onRestart,
  onBack,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto mx-auto flex w-full max-w-5xl items-start justify-between gap-4 px-4 pt-4">
        <div className="w-[46%]">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-wider text-zinc-200/70">
            <span className="text-cyan-200/80">{p1CharacterName}</span>
            <span className="text-cyan-200/80">{p1Hp}</span>
          </div>
          <HpBar value={p1Hp} tone="cyan" />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-[10px] font-bold tracking-[0.2em] text-cyan-200/70">{p1SkillName}</div>
            <SkillChargeBar charge={p1SkillCharge} ready={p1SkillReady} tone="cyan" />
          </div>
          <StatusIndicator
            stunned={p1Stunned}
            rageActive={p1RageActive}
            domainActive={p1DomainActive}
            domainCharging={p1DomainCharging}
            tone="cyan"
          />
        </div>
        <div className="mt-1 text-[10px] font-bold tracking-[0.35em] text-zinc-200/45">MECH//DUEL</div>
        <div className="w-[46%]">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-wider text-zinc-200/70">
            <span className="text-orange-200/80">{p2CharacterName}</span>
            <span className="text-orange-200/80">{p2Hp}</span>
          </div>
          <HpBar value={p2Hp} tone="orange" />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-[10px] font-bold tracking-[0.2em] text-orange-200/70">{p2SkillName}</div>
            <SkillChargeBar charge={p2SkillCharge} ready={p2SkillReady} tone="orange" />
          </div>
          <StatusIndicator
            stunned={p2Stunned}
            rageActive={p2RageActive}
            domainActive={p2DomainActive}
            domainCharging={p2DomainCharging}
            tone="orange"
          />
        </div>
      </div>

      {paused && phase === "battle" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="w-[min(92vw,520px)] rounded-lg border border-zinc-200/10 bg-zinc-950/70 p-6 text-center">
            <div className="text-xs font-bold tracking-[0.35em] text-zinc-200/60">PAUSED</div>
            <div className="mt-2 text-3xl font-black text-zinc-50">暂停</div>
            <div className="mt-3 text-sm text-zinc-200/70">按 ESC 继续。想换一局就点重新开始。</div>
            <div className="mt-5 flex justify-center gap-3">
              <PixelButton onClick={onRestart}>重新开始</PixelButton>
              <PixelButton onClick={onBack} variant="ghost">
                返回标题
              </PixelButton>
            </div>
          </div>
        </div>
      )}

      {phase === "ko" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/55">
          <div className="w-[min(92vw,560px)] rounded-lg border border-zinc-200/10 bg-zinc-950/75 p-6 text-center">
            <div className="text-xs font-bold tracking-[0.35em] text-zinc-200/60">SYSTEM</div>
            <div className="mt-2 text-5xl font-black tracking-tight text-zinc-50">KO</div>
            <div className="mt-3 text-sm text-zinc-200/75">
              胜者：{" "}
              <span className={cn("font-extrabold", winner === 1 ? "text-cyan-200" : "text-orange-200")}>
                {winner === 1 ? p1CharacterName : p2CharacterName}
              </span>
            </div>
            <div className="mt-5 flex justify-center gap-3">
              <PixelButton onClick={onRestart}>再来一局（R）</PixelButton>
              <PixelButton onClick={onBack} variant="ghost">
                返回标题
              </PixelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
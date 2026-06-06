import PixelButton from "@/components/PixelButton"
import { CHARACTER_OPTIONS } from "@/game/config"
import { cn } from "@/lib/utils"
import type { CharacterType, CharacterConfig } from "@/game/types"
import { useState } from "react"
import { SFX } from "@/game/audio"

type Props = {
  onStart: () => void
  p1Character: CharacterType
  p2Character: CharacterType
  onPickP1Character: (character: CharacterType) => void
  onPickP2Character: (character: CharacterType) => void
}

function KeyCap({ children }: { children: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-8 items-center justify-center rounded-sm px-2 py-1",
        "border border-zinc-200/20 bg-zinc-950/60 text-[11px] font-bold text-zinc-100",
        "shadow-[0_3px_0_rgba(0,0,0,0.45)]",
      )}
    >
      {children}
    </span>
  )
}

// 人物介绍弹窗组件
function CharacterDetailModal({
  character,
  player,
  onClose,
}: {
  character: CharacterConfig
  player: "P1" | "P2"
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[min(92vw,420px)] rounded-lg border border-zinc-200/15 bg-zinc-950/85 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs font-bold tracking-wider text-zinc-200/60">{player} 选择</div>
          <button
            onClick={onClose}
            className="rounded-sm border border-zinc-200/20 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-200/10"
          >
            关闭
          </button>
        </div>
        
        <div className="mb-4">
          <div 
            className="text-2xl font-black"
            style={{ color: character.palette.core }}
          >
            {character.name}
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-300/80">
            {character.description}
          </div>
        </div>
        
        <div className="rounded-md border border-zinc-200/10 bg-black/30 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div 
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: character.palette.glow }}
            />
            <div className="text-sm font-bold text-zinc-100">技能：{character.skill.name}</div>
          </div>
          <div className="text-xs leading-5 text-zinc-300/70">
            {character.skill.description}
          </div>
          {character.skill.stunDurationMs && (
            <div className="mt-2 text-xs text-zinc-400/60">
              眩晕时长：{character.skill.stunDurationMs / 1000}秒
            </div>
          )}
          {character.skill.speedMultiplier && (
            <div className="mt-2 text-xs text-zinc-400/60">
              速度提升：{character.skill.speedMultiplier}倍，持续{character.skill.buffDurationMs! / 1000}秒
            </div>
          )}
          {character.skill.chargeTimeMs && (
            <div className="mt-2 text-xs text-zinc-400/60">
              蓄力时间：{character.skill.chargeTimeMs / 1000}秒，被打断扣{character.skill.failDamagePercent}%血
            </div>
          )}
        </div>
        
        <div className="mt-4 flex items-center gap-3">
          <div className="text-xs text-zinc-400/60">配色：</div>
          <div className="flex gap-1">
            {Object.entries(character.palette).map(([key, color]) => (
              <div
                key={key}
                className="h-4 w-4 rounded-sm border border-zinc-200/20"
                style={{ backgroundColor: color }}
                title={key}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// 人物卡片组件
function CharacterCard({
  character,
  isSelected,
  playerTone,
  onClick,
  onShowDetail,
}: {
  character: CharacterConfig
  isSelected: boolean
  playerTone: "cyan" | "orange"
  onClick: () => void
  onShowDetail: () => void
}) {
  const borderColor = playerTone === "cyan" 
    ? isSelected ? "border-cyan-300/60" : "border-zinc-200/10"
    : isSelected ? "border-orange-300/60" : "border-zinc-200/10"
  const bgColor = playerTone === "cyan"
    ? isSelected ? "bg-cyan-400/15" : "bg-black/25"
    : isSelected ? "bg-orange-400/15" : "bg-black/25"
  const hoverColor = playerTone === "cyan" ? "hover:border-cyan-300/30 hover:bg-cyan-400/8" : "hover:border-orange-300/30 hover:bg-orange-400/8"
  
  return (
    <div
      className={cn(
        "rounded-md border p-4 transition-colors cursor-pointer",
        borderColor,
        bgColor,
        !isSelected && hoverColor,
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div 
          className="text-sm font-bold"
          style={{ color: isSelected ? character.palette.core : "text-zinc-50" }}
        >
          {character.name}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onShowDetail()
          }}
          className={cn(
            "rounded-sm border px-2 py-1 text-[10px] transition-colors",
            isSelected 
              ? playerTone === "cyan" 
                ? "border-cyan-300/40 text-cyan-200 hover:bg-cyan-300/15"
                : "border-orange-300/40 text-orange-200 hover:bg-orange-300/15"
              : "border-zinc-200/20 text-zinc-400 hover:bg-zinc-200/10"
          )}
        >
          详情
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div 
          className="h-3 w-3 rounded-sm"
          style={{ backgroundColor: character.palette.core }}
        />
        <div className="text-xs text-zinc-300/60">
          技能：{character.skill.name}
        </div>
      </div>
      {isSelected && (
        <div className="mt-2 text-xs text-zinc-200/70 leading-4">
          {character.description.slice(0, 40)}...
        </div>
      )}
    </div>
  )
}

export default function StartScreen({ 
  onStart, 
  p1Character, 
  p2Character, 
  onPickP1Character, 
  onPickP2Character 
}: Props) {
  const [detailCharacter, setDetailCharacter] = useState<CharacterConfig | null>(null)
  const [detailPlayer, setDetailPlayer] = useState<"P1" | "P2">("P1")
  
  const showDetail = (character: CharacterConfig, player: "P1" | "P2") => {
    setDetailCharacter(character)
    setDetailPlayer(player)
  }
  
  const closeDetail = () => {
    setDetailCharacter(null)
  }

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-10">
      {/* 人物介绍弹窗 */}
      {detailCharacter && (
        <CharacterDetailModal
          character={detailCharacter}
          player={detailPlayer}
          onClose={closeDetail}
        />
      )}
      
      <div className="text-center">
        <div className="text-xs font-semibold tracking-[0.35em] text-zinc-200/70">ARCADE MECH DUEL</div>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-50 md:text-6xl">
          像素机甲对战<span className="text-zinc-50/60">_</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-200/70">
          双人同屏对战：选择你的机甲战士，走位、跳跃越人、出刀、定向格挡与技能释放。攻击命中4次充满技能条，释放强力技能！
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200/10 bg-zinc-950/35 p-5">
          <div className="text-xs font-bold tracking-wider text-zinc-200/70">玩家 1（青）</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-100">
            <KeyCap>A</KeyCap>
            <KeyCap>D</KeyCap>
            <span className="self-center text-zinc-200/60">移动</span>
            <KeyCap>J</KeyCap>
            <span className="self-center text-zinc-200/60">攻击</span>
            <KeyCap>K</KeyCap>
            <span className="self-center text-zinc-200/60">防御（按住）</span>
            <KeyCap>L</KeyCap>
            <span className="self-center text-zinc-200/60">技能</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400/60">
            <KeyCap>W</KeyCap>
            <span className="ml-2 self-center text-zinc-200/60">跳跃</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200/10 bg-zinc-950/35 p-5">
          <div className="text-xs font-bold tracking-wider text-zinc-200/70">玩家 2（橙）</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-100">
            <KeyCap>←</KeyCap>
            <KeyCap>→</KeyCap>
            <span className="self-center text-zinc-200/60">移动</span>
            <KeyCap>1</KeyCap>
            <span className="self-center text-zinc-200/60">攻击</span>
            <KeyCap>2</KeyCap>
            <span className="self-center text-zinc-200/60">防御（按住）</span>
            <KeyCap>3</KeyCap>
            <span className="self-center text-zinc-200/60">技能</span>
          </div>
          <div className="mt-2 text-xs text-zinc-400/60">
            <KeyCap>↑</KeyCap>
            <span className="ml-2 self-center text-zinc-200/60">跳跃</span>
          </div>
        </div>
      </div>

      {/* 人物选择区域 */}
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-cyan-200/10 bg-zinc-950/35 p-5">
          <div className="text-xs font-bold tracking-wider text-cyan-200/70">玩家 1 选择人物</div>
          <div className="mt-3 grid gap-3">
            {CHARACTER_OPTIONS.map((character) => (
              <CharacterCard
                key={character.type}
                character={character}
                isSelected={p1Character === character.type}
                playerTone="cyan"
                onClick={() => { SFX.select(); onPickP1Character(character.type) }}
                onShowDetail={() => showDetail(character, "P1")}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-orange-200/10 bg-zinc-950/35 p-5">
          <div className="text-xs font-bold tracking-wider text-orange-200/70">玩家 2 选择人物</div>
          <div className="mt-3 grid gap-3">
            {CHARACTER_OPTIONS.map((character) => (
              <CharacterCard
                key={character.type}
                character={character}
                isSelected={p2Character === character.type}
                playerTone="orange"
                onClick={() => { SFX.select(); onPickP2Character(character.type) }}
                onShowDetail={() => showDetail(character, "P2")}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 当前选择预览 */}
      <div className="w-full rounded-lg border border-zinc-200/10 bg-zinc-950/25 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-cyan-200/70">P1:</div>
            <div 
              className="text-sm font-bold"
              style={{ color: CHARACTER_OPTIONS.find(c => c.type === p1Character)?.palette.core }}
            >
              {CHARACTER_OPTIONS.find(c => c.type === p1Character)?.name}
            </div>
            <div className="text-xs text-zinc-300/60">
              ({CHARACTER_OPTIONS.find(c => c.type === p1Character)?.skill.name})
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-orange-200/70">P2:</div>
            <div 
              className="text-sm font-bold"
              style={{ color: CHARACTER_OPTIONS.find(c => c.type === p2Character)?.palette.core }}
            >
              {CHARACTER_OPTIONS.find(c => c.type === p2Character)?.name}
            </div>
            <div className="text-xs text-zinc-300/60">
              ({CHARACTER_OPTIONS.find(c => c.type === p2Character)?.skill.name})
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <PixelButton onClick={() => { SFX.confirm(); onStart() }} className="px-8 py-3 text-base">
          开始对战
        </PixelButton>
        <div className="text-xs text-zinc-200/60">
          ESC 暂停，KO 后按 R 重新开始。攻击命中4次充满技能条！
        </div>
      </div>
    </div>
  )
}
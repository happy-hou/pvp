import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOnlineMatch } from '@/hooks/useOnlineMatch'
import { CHARACTER_OPTIONS } from '@/game/config'
import type { CharacterType } from '@/game/types'
import { cn } from '@/lib/utils'
import { SFX } from '@/game/audio'

const SELECT_TIME_SECONDS = 30

export default function CharacterSelectPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()

  // 从 location state 获取 matchId
  const matchId = (location.state as { matchId?: string })?.matchId

  const { match, submitCharacters, bothReady, error, loading } = useOnlineMatch(matchId)

  const [selectedChars, setSelectedChars] = useState<CharacterType[]>([])
  const [timeLeft, setTimeLeft] = useState(SELECT_TIME_SECONDS)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [opponentReady, setOpponentReady] = useState(false)

  // 未登录重定向
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  // 倒计时
  useEffect(() => {
    if (hasSubmitted || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // 时间到，自动提交
          if (selectedChars.length > 0 && !hasSubmitted) {
            handleSubmit()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, hasSubmitted, selectedChars])

  // 监听双方是否都准备好
  useEffect(() => {
    if (bothReady && match) {
      // 双方都选好了，跳转到对战页面
      navigate('/match', { state: { matchId: match.id } })
    }
  }, [bothReady, match, navigate])

  // 选择/取消选择人物
  const toggleCharacter = (charType: CharacterType) => {
    if (hasSubmitted || timeLeft <= 0) return

    setSelectedChars(prev => {
      if (prev.includes(charType)) {
        // 取消选择
        SFX.deselect()
        return prev.filter(c => c !== charType)
      }
      if (prev.length >= 3) {
        // 已经选了3个，不能再选
        return prev
      }
      // 添加选择
      SFX.select()
      return [...prev, charType]
    })
  }

  // 提交选择
  const handleSubmit = async () => {
    if (selectedChars.length === 0 || hasSubmitted) return

    // 如果选的不够3个，用随机人物填充
    let finalSelection = [...selectedChars]
    const availableChars = CHARACTER_OPTIONS.map(c => c.type).filter(
      c => !finalSelection.includes(c)
    )

    while (finalSelection.length < 3 && availableChars.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableChars.length)
      finalSelection.push(availableChars[randomIndex])
      availableChars.splice(randomIndex, 1)
    }

    const result = await submitCharacters(finalSelection as CharacterType[])
    if (result !== undefined || !error) {
      setHasSubmitted(true)
      SFX.confirm()
    }
  }

  if (authLoading || !user || loading) {
    return (
      <div className="relative min-h-dvh bg-[#05060a] text-zinc-50 flex items-center justify-center">
        <div className="text-cyan-300/80 animate-pulse">连接对战房间中...</div>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh bg-[#05060a] text-zinc-50">
      {/* 背景效果 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(126,249,255,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,122,89,0.10),transparent_42%),radial-gradient(circle_at_50%_90%,rgba(44,245,198,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_25%,transparent_70%,rgba(0,0,0,0.35))]" />

      {/* CRT 效果 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="crt-scanlines absolute inset-0 opacity-70" />
        <div className="crt-noise absolute inset-0 opacity-[0.14]" />
        <div className="crt-vignette absolute inset-0" />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-200/10 bg-zinc-950/50 px-5 py-3">
          <div className="text-sm font-bold text-cyan-300">选择出战人物</div>
          <div className={cn(
            "text-2xl font-black",
            timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-cyan-300"
          )}>
            {timeLeft}s
          </div>
        </div>

        {/* 说明文字 */}
        <div className="text-center">
          <div className="text-xs text-zinc-300/60">
            选择3个不同的人物（三局两胜制，每局使用不同人物）
          </div>
          <div className="mt-2 text-sm text-cyan-200/80">
            已选择: {selectedChars.length}/3
          </div>
        </div>

        {/* 人物选择区域 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CHARACTER_OPTIONS.map((character, index) => {
            const isSelected = selectedChars.includes(character.type)
            const selectionOrder = selectedChars.indexOf(character.type) + 1

            return (
              <button
                key={character.type}
                onClick={() => toggleCharacter(character.type)}
                disabled={hasSubmitted || timeLeft <= 0}
                className={cn(
                  "relative rounded-lg border p-5 text-left transition-all",
                  isSelected
                    ? "border-cyan-400/60 bg-cyan-400/15"
                    : "border-zinc-200/10 bg-zinc-950/35 hover:border-cyan-300/30 hover:bg-cyan-400/8",
                  (hasSubmitted || timeLeft <= 0) && "opacity-50 cursor-not-allowed"
                )}
              >
                {/* 选择顺序标记 */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-400 text-black text-xs font-bold flex items-center justify-center">
                    {selectionOrder}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: character.palette.core }}
                  />
                  <div className="text-lg font-bold" style={{ color: character.palette.core }}>
                    {character.name}
                  </div>
                </div>

                <div className="text-xs text-zinc-300/70 mb-2">
                  {character.description}
                </div>

                <div className="text-xs text-cyan-200/60">
                  技能: {character.skill.name}
                </div>
              </button>
            )
          })}
        </div>

        {/* 已选人物预览 */}
        {selectedChars.length > 0 && (
          <div className="rounded-lg border border-zinc-200/10 bg-zinc-950/35 p-4">
            <div className="text-xs text-zinc-400/60 mb-3">出战顺序</div>
            <div className="flex gap-4">
              {[0, 1, 2].map((index) => {
                const charType = selectedChars[index]
                const character = CHARACTER_OPTIONS.find(c => c.type === charType)

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex-1 rounded border p-3 text-center",
                      character
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : "border-zinc-200/10 bg-zinc-950/50"
                    )}
                  >
                    <div className="text-xs text-zinc-400/60 mb-1">第{index + 1}局</div>
                    {character ? (
                      <div className="text-sm font-bold" style={{ color: character.palette.core }}>
                        {character.name}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-500">未选择</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        {!hasSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={selectedChars.length === 0 || timeLeft <= 0}
            className={cn(
              "w-full py-4 text-lg font-bold rounded-lg border-2 transition-all",
              selectedChars.length > 0 && timeLeft > 0
                ? "border-cyan-400/50 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-400/20"
                : "border-zinc-200/20 bg-zinc-950/40 text-zinc-500 cursor-not-allowed"
            )}
          >
            {selectedChars.length === 0 ? '请至少选择1个人物' : '确认选择'}
          </button>
        ) : (
          <div className="text-center py-4">
            <div className="text-cyan-300 animate-pulse">已提交，等待对手...</div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="rounded border border-red-400/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

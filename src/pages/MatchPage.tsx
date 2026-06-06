import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOnlineMatch } from '@/hooks/useOnlineMatch'
import { useGameLoop } from '@/hooks/useGameLoop'
import Hud from '@/components/Hud'
import { cn } from '@/lib/utils'
import type { CharacterType } from '@/game/types'
import { getCharacterByType } from '@/game/config'

export default function MatchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()

  // 从 location state 获取 matchId
  const matchId = (location.state as { matchId?: string })?.matchId

  const { 
    match, 
    isP1, 
    myScore, 
    opponentScore,
    getCurrentCharacter,
    getOpponentCharacter,
    submitRoundResult,
    error 
  } = useOnlineMatch(matchId)

  const [currentRound, setCurrentRound] = useState(1)
  const [roundWinner, setRoundWinner] = useState<'p1' | 'p2' | null>(null)
  const [showRoundResult, setShowRoundResult] = useState(false)
  const [matchEnded, setMatchEnded] = useState(false)
  const [finalResult, setFinalResult] = useState<'win' | 'lose' | 'draw' | null>(null)

  const [p1Character, setP1Character] = useState<CharacterType>('meng-zhi-li')
  const [p2Character, setP2Character] = useState<CharacterType>('kuang-qi')

  // 获取当前回合的人物
  useEffect(() => {
    const myChar = getCurrentCharacter()
    const oppChar = getOpponentCharacter()
    
    if (myChar && oppChar) {
      if (isP1) {
        setP1Character(myChar)
        setP2Character(oppChar)
      } else {
        setP1Character(oppChar)
        setP2Character(myChar)
      }
    }
  }, [match, isP1, getCurrentCharacter, getOpponentCharacter])

  // 游戏循环（使用useGameLoop返回的canvasRef）
  const { hud, startMatch, restartMatch, canvasRef } = useGameLoop(true)

  // 开始当前回合
  useEffect(() => {
    if (p1Character && p2Character) {
      startMatch({ p1Character, p2Character })
    }
  }, [p1Character, p2Character, startMatch])

  // 监听游戏结束（KO）
  useEffect(() => {
    if (hud.winner && !showRoundResult && !matchEnded) {
      const winner = hud.winner === 1 ? 'p1' : 'p2'
      setRoundWinner(winner)
      setShowRoundResult(true)

      // 提交回合结果
      submitRoundResult(winner)
    }
  }, [hud.winner, showRoundResult, matchEnded, submitRoundResult])

  // 监听对战状态变化
  useEffect(() => {
    if (!match) return

    setCurrentRound(match.current_round)

    // 检查比赛是否结束
    if (match.phase === 'finished') {
      setMatchEnded(true)
      const myFinalScore = isP1 ? match.p1_score : match.p2_score
      const oppFinalScore = isP1 ? match.p2_score : match.p1_score
      
      if (myFinalScore > oppFinalScore) {
        setFinalResult('win')
      } else if (myFinalScore < oppFinalScore) {
        setFinalResult('lose')
      } else {
        setFinalResult('draw')
      }
    }
  }, [match, isP1])

  // 未登录重定向
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [user, authLoading, navigate])

  const handleNextRound = () => {
    setShowRoundResult(false)
    setRoundWinner(null)
    restartMatch()
  }

  const handleBackToLobby = () => {
    navigate('/lobby')
  }

  if (authLoading || !user) {
    return (
      <div className="relative min-h-dvh bg-[#05060a] text-zinc-50 flex items-center justify-center">
        <div className="text-cyan-300/80 animate-pulse">加载中...</div>
      </div>
    )
  }

  const shell = (
    <div className="pointer-events-none absolute inset-0">
      <div className="crt-scanlines absolute inset-0 opacity-70" />
      <div className="crt-noise absolute inset-0 opacity-[0.14]" />
      <div className="crt-vignette absolute inset-0" />
    </div>
  )

  return (
    <div className="relative min-h-dvh bg-[#05060a] text-zinc-50">
      {/* 背景效果 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(126,249,255,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,122,89,0.10),transparent_42%),radial-gradient(circle_at_50%_90%,rgba(44,245,198,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_25%,transparent_70%,rgba(0,0,0,0.35))]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-6">
        {/* 顶部信息栏 */}
        <div className="w-full flex items-center justify-between rounded-lg border border-zinc-200/10 bg-zinc-950/50 px-5 py-3">
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold text-cyan-300">
              第 {currentRound}/3 局
            </div>
            <div className="text-xs text-zinc-400/60">
              三局两胜
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-zinc-400/60">我方</div>
              <div className="text-xl font-black text-cyan-300">{myScore}</div>
            </div>
            <div className="text-2xl text-zinc-600">:</div>
            <div className="text-center">
              <div className="text-xs text-zinc-400/60">对手</div>
              <div className="text-xl font-black text-orange-300">{opponentScore}</div>
            </div>
          </div>
        </div>

        {/* 当前人物信息 */}
        <div className="w-full flex justify-between text-xs text-zinc-400/60">
          <div className="flex items-center gap-2">
            <span className="text-cyan-300">我方:</span>
            <span>{getCharacterByType(p1Character).name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>对手:</span>
            <span className="text-orange-300">{getCharacterByType(p2Character).name}</span>
          </div>
        </div>

        {/* 游戏画面 */}
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
                onBack={handleBackToLobby}
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

        {/* 回合结束弹窗 */}
        {showRoundResult && !matchEnded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="rounded-lg border border-zinc-200/20 bg-zinc-950/90 p-8 text-center shadow-[0_8px_0_0_rgba(0,0,0,0.45)]">
              <div className={cn(
                "text-3xl font-black mb-4",
                roundWinner === (isP1 ? 'p1' : 'p2') ? "text-green-400" : "text-red-400"
              )}>
                {roundWinner === (isP1 ? 'p1' : 'p2') ? '回合胜利！' : '回合失败'}
              </div>
              <div className="text-sm text-zinc-300/60 mb-6">
                当前比分: {myScore} - {opponentScore}
              </div>
              <button
                onClick={handleNextRound}
                className="px-6 py-3 text-sm font-bold rounded-lg border-2 border-cyan-400/50 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-400/20"
              >
                下一局
              </button>
            </div>
          </div>
        )}

        {/* 比赛结束弹窗 */}
        {matchEnded && finalResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="rounded-lg border-2 border-zinc-200/20 bg-zinc-950/95 p-10 text-center shadow-[0_12px_0_0_rgba(0,0,0,0.5)]">
              <div className={cn(
                "text-5xl font-black mb-6",
                finalResult === 'win' ? "text-green-400" : 
                finalResult === 'lose' ? "text-red-400" : "text-yellow-400"
              )}>
                {finalResult === 'win' ? '胜利！' : 
                 finalResult === 'lose' ? '失败' : '平局'}
              </div>
              <div className="text-xl text-zinc-200 mb-2">
                最终比分
              </div>
              <div className="text-4xl font-bold text-cyan-300 mb-8">
                {myScore} - {opponentScore}
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleBackToLobby}
                  className="px-8 py-4 text-base font-bold rounded-lg border-2 border-cyan-400/50 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-400/20"
                >
                  返回大厅
                </button>
              </div>
            </div>
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

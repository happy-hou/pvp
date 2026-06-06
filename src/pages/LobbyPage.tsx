import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useInvitation } from '@/hooks/useInvitation'
import { useOnlineMatch } from '@/hooks/useOnlineMatch'
import { supabase } from '@/supabase'

export default function LobbyPage() {
  const { user, logout, loading } = useAuth()
  const { onlineUsers } = useOnlineStatus()
  const { pendingInvitation, invitationResponse, acceptedInvitation, sendInvitation, acceptInvitation, rejectInvitation } = useInvitation()
  const { createMatch, joinMatch } = useOnlineMatch()
  const navigate = useNavigate()
  const [matchId, setMatchId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  // 未登录重定向
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  // 邀请方：邀请被接受时创建对战并跳转
  useEffect(() => {
    if (invitationResponse === 'accepted' && acceptedInvitation && !connecting) {
      setConnecting(true)
      const startMatch = async () => {
        // 创建对战（邀请方是P1，被邀请方to_uid是P2）
        const match = await createMatch(acceptedInvitation.to_uid)
        if (match) {
          navigate('/select', { state: { matchId: match.id } })
        } else {
          setConnecting(false)
        }
      }
      startMatch()
    }
  }, [invitationResponse, acceptedInvitation, createMatch, navigate, connecting])

  // 接受方：接受邀请后等待match创建，然后加入
  const handleAccept = async () => {
    if (!pendingInvitation || !user) return
    setConnecting(true)

    // 先接受邀请
    await acceptInvitation()

    // 轮询等待邀请方创建match（最多等10秒）
    const pollMatch = async () => {
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500))

        // 查询包含自己uid的match
        const { data } = await supabase
          .from('matches')
          .select('*')
          .or(`p1_uid.eq.${user.id},p2_uid.eq.${user.id}`)
          .eq('phase', 'selecting')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (data) {
          const foundMatch = data
          // 加入对战（更新自己的名字）
          await joinMatch(foundMatch.id)
          navigate('/select', { state: { matchId: foundMatch.id } })
          return
        }
      }
      // 超时
      setConnecting(false)
    }
    pollMatch()
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleInvite = async (toUid: string) => {
    await sendInvitation(toUid)
  }

  if (loading) {
    return (
      <div className="relative min-h-dvh bg-[#05060a] text-zinc-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(126,249,255,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,122,89,0.10),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="crt-scanlines absolute inset-0 opacity-70" />
          <div className="crt-vignette absolute inset-0" />
        </div>
        <div className="relative text-center">
          <div
            className="text-sm text-cyan-300/80 animate-pulse"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            连接中...
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

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
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
            <span
              className="text-xs text-zinc-100"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {user.user_metadata?.display_name || user.user_metadata?.username || '匿名'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded border border-zinc-200/15 bg-zinc-950/40 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-200/10"
            >
              返回首页
            </button>
            <button
              onClick={handleLogout}
              className="rounded border border-red-400/20 bg-red-950/30 px-3 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-900/40"
            >
              登出
            </button>
          </div>
        </div>

        {/* 标题 */}
        <div className="text-center">
          <div className="text-[10px] font-semibold tracking-[0.35em] text-zinc-200/60">
            ONLINE BATTLE LOBBY
          </div>
          <h1
            className="mt-2 text-xl font-black tracking-tight md:text-2xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-cyan-300">联机大厅</span>
            <span className="text-zinc-50/60">_</span>
          </h1>
        </div>

        {/* 在线玩家列表 */}
        <div className="rounded-lg border border-zinc-200/10 bg-zinc-950/35 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div
              className="text-[10px] font-bold tracking-wider text-zinc-200/60"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              在线玩家
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-zinc-400/60">
                {onlineUsers.length} 人在线
              </span>
            </div>
          </div>

          {onlineUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400/50">
              <div
                className="text-xs"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                暂无其他玩家在线
              </div>
              <div className="mt-2 text-[10px] text-zinc-500/40">
                等待其他机甲驾驶员加入...
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {onlineUsers.map((player) => (
                <div
                  key={player.uid}
                  className="group flex items-center justify-between rounded-md border border-zinc-200/10 bg-black/25 p-4 transition-colors hover:border-cyan-300/20 hover:bg-cyan-400/5"
                >
                  <div className="flex items-center gap-3">
                    {/* 像素头像占位 */}
                    <div className="flex h-10 w-10 items-center justify-center rounded border border-zinc-200/15 bg-zinc-950/60">
                      <span className="text-lg">🤖</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-100">
                        {player.display_name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]" />
                        <span className="text-[10px] text-zinc-400/60">在线</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInvite(player.uid)}
                    className="group relative inline-flex select-none items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-wide outline-none border-2 border-cyan-400/30 bg-cyan-950/40 text-cyan-200 shadow-[0_4px_0_0_rgba(0,0,0,0.35)] active:translate-y-[1px] active:shadow-[0_3px_0_0_rgba(0,0,0,0.35)] transition-[transform,box-shadow,filter] duration-100 hover:brightness-110 hover:border-cyan-400/50"
                  >
                    <span className="pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(180deg,rgba(126,249,255,0.2),transparent_60%)]" />
                    <span className="relative" style={{ fontFamily: 'var(--font-display)' }}>
                      邀请
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 邀请状态提示 */}
        {(invitationResponse === 'accepted' || connecting) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="rounded-lg border border-green-400/30 bg-zinc-950/90 p-8 text-center shadow-[0_8px_0_0_rgba(0,0,0,0.45)]">
              <div
                className="text-lg font-bold text-green-300 animate-pulse"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                对战即将开始...
              </div>
              <div className="mt-3 text-xs text-zinc-300/60">
                正在连接到对手
              </div>
            </div>
          </div>
        )}

        {invitationResponse === 'rejected' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="rounded-lg border border-red-400/30 bg-zinc-950/90 p-8 text-center shadow-[0_8px_0_0_rgba(0,0,0,0.45)]">
              <div
                className="text-sm font-bold text-red-300"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                对手拒绝了邀请
              </div>
            </div>
          </div>
        )}

        {/* 收到邀请弹窗 */}
        {pendingInvitation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-[min(92vw,400px)] rounded-lg border border-cyan-400/30 bg-zinc-950/90 p-6 shadow-[0_8px_0_0_rgba(0,0,0,0.45)]">
              <div
                className="mb-1 text-[10px] font-bold tracking-wider text-cyan-300/60"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                收到对战邀请
              </div>
              <div className="mb-6">
                <span
                  className="text-base font-bold text-cyan-200"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {pendingInvitation.from_name}
                </span>
                <span className="ml-2 text-xs text-zinc-300/60">向你发起了对战邀请</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAccept}
                  className="group relative flex-1 inline-flex select-none items-center justify-center gap-2 px-4 py-3 text-xs font-semibold tracking-wide outline-none border-2 border-green-400/30 bg-green-950/40 text-green-200 shadow-[0_6px_0_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(0,0,0,0.35)] transition-[transform,box-shadow,filter] duration-100 hover:brightness-110 hover:border-green-400/50"
                >
                  <span className="pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(180deg,rgba(74,222,128,0.2),transparent_60%)]" />
                  <span className="relative" style={{ fontFamily: 'var(--font-display)' }}>
                    接受
                  </span>
                </button>
                <button
                  onClick={rejectInvitation}
                  className="group relative flex-1 inline-flex select-none items-center justify-center gap-2 px-4 py-3 text-xs font-semibold tracking-wide outline-none border-2 border-red-400/30 bg-red-950/40 text-red-200 shadow-[0_6px_0_0_rgba(0,0,0,0.35)] active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(0,0,0,0.35)] transition-[transform,box-shadow,filter] duration-100 hover:brightness-110 hover:border-red-400/50"
                >
                  <span className="pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(180deg,rgba(248,113,113,0.2),transparent_60%)]" />
                  <span className="relative" style={{ fontFamily: 'var(--font-display)' }}>
                    拒绝
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

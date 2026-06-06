import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        if (!username.trim()) {
          setError('请输入账号')
          setLoading(false)
          return
        }
        if (!displayName.trim()) {
          setError('请输入昵称')
          setLoading(false)
          return
        }
        await register(username.trim(), password, displayName.trim())
      } else {
        await login(username.trim(), password)
      }
      navigate('/lobby')
    } catch (err: unknown) {
      const error = err as { message?: string }
      const msg = error.message || ''
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
        setError('账号或密码错误')
      } else if (msg.includes('User not found') || msg.includes('invalid email')) {
        setError('用户不存在，请先注册')
      } else if (msg.includes('already registered') || msg.includes('already in use')) {
        setError('该账号已被注册')
      } else if (msg.includes('password') && (msg.includes('weak') || msg.includes('short'))) {
        setError('密码太弱，至少6位')
      } else if (msg.includes('rate limit') || msg.includes('Too Many Requests')) {
        setError('请求过于频繁，请稍后再试')
      } else {
        setError(msg || '操作失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsRegister(!isRegister)
    setError('')
  }

  return (
    <div className="relative min-h-dvh bg-[#05060a] text-zinc-50 flex items-center justify-center">
      {/* 背景效果 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(126,249,255,0.12),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,122,89,0.10),transparent_42%),radial-gradient(circle_at_50%_90%,rgba(44,245,198,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_25%,transparent_70%,rgba(0,0,0,0.35))]" />

      {/* CRT 效果 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="crt-scanlines absolute inset-0 opacity-70" />
        <div className="crt-noise absolute inset-0 opacity-[0.14]" />
        <div className="crt-vignette absolute inset-0" />
      </div>

      <div className="relative w-full max-w-md px-6">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <div className="text-[10px] font-semibold tracking-[0.35em] text-cyan-300/60">
            ONLINE BATTLE LOBBY
          </div>
          <h1
            className="mt-3 text-2xl font-black tracking-tight md:text-3xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-cyan-300">像素机甲对战</span>
            <span className="text-zinc-50/60">_</span>
          </h1>
          <p
            className="mt-2 text-xs text-zinc-300/60"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            联机大厅
          </p>
        </div>

        {/* 表单卡片 */}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-200/10 bg-zinc-950/60 p-6 shadow-[0_8px_0_0_rgba(0,0,0,0.45)]"
        >
          {/* 账号 */}
          <div className="mb-4">
            <label
              className="mb-2 block text-[10px] font-bold tracking-wider text-zinc-200/60"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              账号
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="自定义你的账号"
              className="w-full rounded border border-zinc-200/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500/50 outline-none transition-colors focus:border-cyan-400/50 focus:bg-black/60"
            />
          </div>

          {/* 密码 */}
          <div className="mb-4">
            <label
              className="mb-2 block text-[10px] font-bold tracking-wider text-zinc-200/60"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="至少6位"
              className="w-full rounded border border-zinc-200/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500/50 outline-none transition-colors focus:border-cyan-400/50 focus:bg-black/60"
            />
          </div>

          {/* 昵称（仅注册时显示） */}
          {isRegister && (
            <div className="mb-4">
              <label
                className="mb-2 block text-[10px] font-bold tracking-wider text-zinc-200/60"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                昵称
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="你的机甲代号"
                className="w-full rounded border border-zinc-200/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500/50 outline-none transition-colors focus:border-cyan-400/50 focus:bg-black/60"
              />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 rounded border border-red-400/30 bg-red-900/20 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="group relative inline-flex w-full select-none items-center justify-center gap-2 px-4 py-3 text-sm font-semibold tracking-wide outline-none border-2 border-zinc-200/20 bg-zinc-950 text-zinc-50 shadow-[0_6px_0_0_rgba(0,0,0,0.45)] active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(0,0,0,0.45)] transition-[transform,box-shadow,filter] duration-100 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="pointer-events-none absolute inset-0 opacity-55 bg-[linear-gradient(180deg,rgba(126,249,255,0.14),rgba(255,122,89,0.0)_60%)]" />
            <span className="relative" style={{ fontFamily: 'var(--font-display)' }}>
              {loading ? '连接中...' : isRegister ? '注册并进入大厅' : '登录'}
            </span>
            <span className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[linear-gradient(90deg,rgba(126,249,255,0.0),rgba(126,249,255,0.18),rgba(255,122,89,0.18),rgba(255,122,89,0.0))]" />
          </button>

          {/* 切换登录/注册 */}
          <div className="mt-4 text-center text-xs text-zinc-300/60">
            {isRegister ? '已有账号？' : '没有账号？'}
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 text-cyan-300/80 hover:text-cyan-200 transition-colors underline underline-offset-2"
            >
              {isRegister ? '去登录' : '去注册'}
            </button>
          </div>
        </form>

        {/* 返回首页 */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-zinc-400/50 hover:text-zinc-300/70 transition-colors"
          >
            &lt; 返回首页
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export interface OnlineUser {
  uid: string
  display_name: string
  online: boolean
  last_seen: string
}

export function useOnlineStatus() {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])

  const getDisplayName = useCallback(() => {
    return user?.user_metadata?.display_name || user?.user_metadata?.username || '匿名'
  }, [user])

  useEffect(() => {
    if (!user) {
      setOnlineUsers([])
      return
    }

    const myName = getDisplayName()

    // 上线：写入 online_users 表
    const goOnline = async () => {
      await supabase.from('online_users').upsert({
        user_id: user.id,
        display_name: myName,
        online: true,
        last_seen: new Date().toISOString()
      }, { onConflict: 'user_id' })
    }

    // 离线：删除记录
    const goOffline = async () => {
      await supabase.from('online_users').delete().eq('user_id', user.id)
    }

    goOnline()

    // 订阅实时变化
    const channel = supabase.channel('online-users', {
      config: {
        presence: { key: user.id },
        broadcast: { self: false }
      }
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users: OnlineUser[] = Object.values(state).map((presence: any) => ({
        uid: presence.id,
        display_name: presence.display_name || '匿名',
        online: true,
        last_seen: new Date().toISOString()
      }))
      setOnlineUsers(users.filter(u => u.uid !== user.id))
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: user.id,
          display_name: myName,
          online_at: new Date().toISOString()
        })
      }
    })

    // 同时用数据库查询获取在线用户
    const fetchOnline = async () => {
      const { data } = await supabase
        .from('online_users')
        .select('*')
        .eq('online', true)
      if (data) {
        setOnlineUsers(data
          .filter((u: any) => u.user_id !== user.id)
          .map((u: any) => ({
            uid: u.user_id,
            display_name: u.display_name,
            online: true,
            last_seen: u.last_seen
          }))
        )
      }
    }

    fetchOnline()

    // 定期刷新在线列表
    const interval = setInterval(fetchOnline, 10000)

    // 页面关闭时离线
    const handleBeforeUnload = () => { goOffline() }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      goOffline()
      channel.unsubscribe()
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user, getDisplayName])

  return { onlineUsers }
}

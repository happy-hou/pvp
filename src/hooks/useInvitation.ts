import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Invitation {
  id: number
  from_uid: string
  from_name: string
  to_uid: string
  to_name: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export function useInvitation() {
  const { user } = useAuth()
  const [pendingInvitation, setPendingInvitation] = useState<Invitation | null>(null)
  const [invitationResponse, setInvitationResponse] = useState<'accepted' | 'rejected' | null>(null)
  // 记录被接受的邀请（邀请方需要知道对手是谁）
  const [acceptedInvitation, setAcceptedInvitation] = useState<Invitation | null>(null)

  const getMyName = () => {
    return user?.user_metadata?.display_name || user?.user_metadata?.username || '匿名'
  }

  // 轮询检查邀请
  useEffect(() => {
    if (!user) return

    const poll = setInterval(async () => {
      // 检查别人发给我的邀请
      const { data } = await supabase
        .from('invitations')
        .select('*')
        .eq('to_uid', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        setPendingInvitation(data[0] as Invitation)
      } else {
        setPendingInvitation(null)
      }

      // 检查对方是否回应了我的邀请
      const { data: responseData } = await supabase
        .from('invitations')
        .select('*')
        .eq('from_uid', user.id)
        .in('status', ['accepted', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(1)

      if (responseData && responseData.length > 0) {
        const latest = responseData[0] as Invitation
        setInvitationResponse(latest.status as 'accepted' | 'rejected')
        // 保存被接受的邀请信息（包含对手uid）
        if (latest.status === 'accepted') {
          setAcceptedInvitation(latest)
        }
        // 清理
        await supabase.from('invitations').delete().eq('id', latest.id)
        setTimeout(() => {
          setInvitationResponse(null)
          setAcceptedInvitation(null)
        }, 5000)
      }
    }, 2000)

    return () => clearInterval(poll)
  }, [user])

  const sendInvitation = async (toUid: string) => {
    if (!user) return
    await supabase.from('invitations').insert({
      from_uid: user.id,
      from_name: getMyName(),
      to_uid: toUid,
      status: 'pending'
    })
  }

  const acceptInvitation = async () => {
    if (!user || !pendingInvitation) return
    await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', pendingInvitation.id)
    setPendingInvitation(null)
  }

  const rejectInvitation = async () => {
    if (!user || !pendingInvitation) return
    await supabase
      .from('invitations')
      .update({ status: 'rejected' })
      .eq('id', pendingInvitation.id)
    setPendingInvitation(null)
  }

  return { pendingInvitation, invitationResponse, acceptedInvitation, sendInvitation, acceptInvitation, rejectInvitation }
}

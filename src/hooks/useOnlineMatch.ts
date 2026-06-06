import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CharacterType } from '../game/types'

export type MatchPhase = 'selecting' | 'fighting' | 'finished'
export type MatchResult = 'win' | 'lose' | 'draw' | null

export interface RoundResult {
  round: number
  winner: 'p1' | 'p2' | null
  p1Character: CharacterType
  p2Character: CharacterType
}

export interface OnlineMatch {
  id: string
  p1_uid: string
  p1_name: string
  p2_uid: string
  p2_name: string
  phase: MatchPhase
  current_round: number
  p1_score: number
  p2_score: number
  p1_characters: CharacterType[]
  p2_characters: CharacterType[]
  p1_ready: boolean
  p2_ready: boolean
  round_results: RoundResult[]
  created_at: string
}

export function useOnlineMatch(initialMatchId?: string) {
  const { user } = useAuth()
  const [match, setMatch] = useState<OnlineMatch | null>(null)
  const [isP1, setIsP1] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getMyName = useCallback(() => {
    return user?.user_metadata?.display_name || user?.user_metadata?.username || '匿名'
  }, [user])

  // 根据matchId加载match数据
  const loadMatch = useCallback(async (matchId: string) => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (error) throw error
      if (data) {
        setMatch(data)
        setIsP1(data.p1_uid === user.id)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  // 初始化时加载match
  useEffect(() => {
    if (initialMatchId && user) {
      loadMatch(initialMatchId)
    }
  }, [initialMatchId, user, loadMatch])

  // 创建对战
  const createMatch = useCallback(async (opponentUid: string) => {
    if (!user) return null
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          p1_uid: user.id,
          p1_name: getMyName(),
          p2_uid: opponentUid,
          p2_name: '', // 会在对方加入时更新
          phase: 'selecting',
          current_round: 1,
          p1_score: 0,
          p2_score: 0,
          p1_characters: [],
          p2_characters: [],
          p1_ready: false,
          p2_ready: false,
          round_results: []
        })
        .select()
        .single()

      if (error) {
        console.error('createMatch error:', error)
        throw error
      }
      setMatch(data)
      setIsP1(true)
      return data
    } catch (err: any) {
      console.error('createMatch failed:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [user, getMyName])

  // 加入对战
  const joinMatch = useCallback(async (matchId: string) => {
    if (!user) return null
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('matches')
        .update({ p2_name: getMyName() })
        .eq('id', matchId)
        .select()
        .single()

      if (error) {
        console.error('joinMatch error:', error)
        throw error
      }
      setMatch(data)
      setIsP1(data.p1_uid === user.id)
      return data
    } catch (err: any) {
      console.error('joinMatch failed:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [user, getMyName])

  // 提交人物选择（一次性选3个）
  const submitCharacters = useCallback(async (characters: CharacterType[]) => {
    if (!match || !user) return

    const updateField = isP1 ? 'p1_characters' : 'p2_characters'
    const readyField = isP1 ? 'p1_ready' : 'p2_ready'

    try {
      const { data, error } = await supabase
        .from('matches')
        .update({
          [updateField]: characters,
          [readyField]: true
        })
        .eq('id', match.id)
        .select()
        .single()

      if (error) {
        console.error('submitCharacters error:', error)
        throw error
      }
      setMatch(data)
    } catch (err: any) {
      console.error('submitCharacters failed:', err)
      setError(err.message)
    }
  }, [match, user, isP1])

  // 提交回合结果
  const submitRoundResult = useCallback(async (winner: 'p1' | 'p2' | null) => {
    if (!match || !user) return

    const newResult: RoundResult = {
      round: match.current_round,
      winner,
      p1Character: match.p1_characters[match.current_round - 1],
      p2Character: match.p2_characters[match.current_round - 1]
    }

    const newResults = [...match.round_results, newResult]
    const p1Score = newResults.filter(r => r.winner === 'p1').length
    const p2Score = newResults.filter(r => r.winner === 'p2').length

    // 检查是否结束（三局两胜）
    const isFinished = p1Score >= 2 || p2Score >= 2 || match.current_round >= 3
    const nextRound = isFinished ? match.current_round : match.current_round + 1
    const nextPhase: MatchPhase = isFinished ? 'finished' : 'fighting'

    try {
      const { data, error } = await supabase
        .from('matches')
        .update({
          round_results: newResults,
          p1_score: p1Score,
          p2_score: p2Score,
          current_round: nextRound,
          phase: nextPhase
        })
        .eq('id', match.id)
        .select()
        .single()

      if (error) throw error
      setMatch(data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [match, user])

  // 监听对战状态变化
  useEffect(() => {
    if (!match || !user) return

    const subscription = supabase
      .channel(`match-${match.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${match.id}`
      }, (payload) => {
        setMatch(payload.new as OnlineMatch)
      })
      .subscribe()

    // 轮询备用方案（每1秒刷新一次，防止Realtime未启用）
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('id', match.id)
        .single()
      if (data) {
        setMatch(data)
      }
    }, 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(poll)
    }
  }, [match?.id, user])

  // 获取当前应该使用的人物
  const getCurrentCharacter = useCallback((): CharacterType | null => {
    if (!match) return null
    const chars = isP1 ? match.p1_characters : match.p2_characters
    return chars[match.current_round - 1] || null
  }, [match, isP1])

  // 获取对手当前应该使用的人物
  const getOpponentCharacter = useCallback((): CharacterType | null => {
    if (!match) return null
    const chars = isP1 ? match.p2_characters : match.p1_characters
    return chars[match.current_round - 1] || null
  }, [match, isP1])

  // 检查双方是否都准备好
  const bothReady = match?.p1_ready && match?.p2_ready

  // 获取我的得分
  const myScore = isP1 ? match?.p1_score : match?.p2_score

  // 获取对手得分
  const opponentScore = isP1 ? match?.p2_score : match?.p1_score

  return {
    match,
    isP1,
    loading,
    error,
    bothReady,
    myScore,
    opponentScore,
    getCurrentCharacter,
    getOpponentCharacter,
    loadMatch,
    createMatch,
    joinMatch,
    submitCharacters,
    submitRoundResult
  }
}

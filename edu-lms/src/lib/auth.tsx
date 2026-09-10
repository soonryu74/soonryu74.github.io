import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Student } from '../types'

interface AuthState {
  session: Session | null
  student: Student | null
  loading: boolean
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState>({ session: null, student: null, loading: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // 세션이 생기면 edu_students 한 줄을 읽는다 (가입 트리거가 만들어 둔다)
  useEffect(() => {
    if (!session) { setStudent(null); return }
    supabase.from('edu_students').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setStudent(data as Student | null))
  }, [session])

  const signOut = async () => { await supabase.auth.signOut() }

  return <Ctx.Provider value={{ session, student, loading, signOut }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

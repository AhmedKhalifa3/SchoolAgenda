import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [childrenList, setChildrenList] = useState([])

  const processPendingSharedKey = useCallback(async (parentId, key) => {
    const { data: keyData, error: keyError } = await supabase.from('shared_keys').select('*').eq('key', key).gt('expires_at', new Date().toISOString()).is('used_by', null).single()
    if (keyError || !keyData) return
    const { error: connError } = await supabase.from('parent_student_connections').insert({ parent_id: parentId, student_id: keyData.student_id })
    if (!connError) await supabase.from('shared_keys').update({ used_by: parentId, used_at: new Date().toISOString() }).eq('id', keyData.id)
  }, [])

  const fetchChildren = useCallback(async (parentId) => {
    const { data, error } = await supabase.from('parent_student_connections').select('*, profiles:student_id(id, full_name, grade_id, grades(name))').eq('parent_id', parentId).order('created_at')
    if (!error && data) setChildrenList(data.map(conn => conn.profiles).filter(Boolean))
  }, [])

  const fetchProfile = useCallback(async (userId, user) => {
    setProfileError(null)
    const { data, error } = await supabase.from('profiles').select('*, grades(name)').eq('id', userId).single()
    if (error) {
      setProfileError(error.code === 'PGRST116' ? 'no_profile' : error.message)
      return
    }
    setProfile(data)
    if (data.role === 'parent') {
      const pendingKey = user?.user_metadata?.shared_key
      if (pendingKey) {
        await processPendingSharedKey(userId, pendingKey)
        await supabase.auth.updateUser({ data: { shared_key: null } })
      }
      fetchChildren(userId)
    }
  }, [fetchChildren, processPendingSharedKey])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id, session.user)
      else setSession(null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) fetchProfile(nextSession.user.id, nextSession.user)
      else { setProfile(null); setProfileError(null); setChildrenList([]) }
    })
    return () => subscription.unsubscribe()
  }, [fetchProfile])

  async function createProfile(userId, fullName, role, gradeId) {
    const { error } = await supabase.from('profiles').insert({ id: userId, full_name: fullName, role, grade_id: gradeId || null })
    if (!error) fetchProfile(userId)
    return { error }
  }
  async function signIn(email, password) { const { error } = await supabase.auth.signInWithPassword({ email, password }); return { error } }
  async function signUp(email, password, fullName, role, gradeId) { const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role, grade_id: gradeId || null } } }); return { error } }
  async function signOut() { await supabase.auth.signOut() }
  async function generateSharedKey(studentId, durationMinutes = 30) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let key = ''
    for (let i = 0; i < 8; i++) key += chars.charAt(Math.floor(Math.random() * chars.length))
    const expiresAt = new Date(Date.now() + durationMinutes * 60000).toISOString()
    const { data, error } = await supabase.from('shared_keys').insert({ student_id: studentId, key, expires_at: expiresAt }).select().single()
    return { key: data?.key || null, expiresAt: data?.expires_at || null, error }
  }

  const value = { session, profile, profileError, children: childrenList, loading: session === undefined, signIn, signUp, signOut, createProfile, fetchChildren, generateSharedKey, refreshProfile: () => session && fetchProfile(session.user.id, session.user) }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

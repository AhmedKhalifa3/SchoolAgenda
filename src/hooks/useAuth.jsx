import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]           = useState(undefined) // undefined = loading
  const [profile, setProfile]           = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [children: childrenList, setChildren] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setSession(null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setProfileError(null); setChildren([]) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    setProfileError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('*, grades(name)')
      .eq('id', userId)
      .single()

    if (error) {
      setProfileError(
        error.code === 'PGRST116'
          ? 'no_profile'
          : error.message
      )
      return
    }
    setProfile(data)
    
    // If parent, fetch children
    if (data.role === 'parent') {
      fetchChildren(userId)
    }
  }

  async function fetchChildren(parentId) {
    const { data, error } = await supabase
      .from('parent_student_connections')
      .select('*, profiles:student_id(id, full_name, grade_id, grades(name))')
      .eq('parent_id', parentId)
      .order('created_at')

    if (!error && data) {
      setChildren(data.map(conn => conn.profiles))
    }
  }

  async function generateSharedKey(studentId, durationMinutes = 30) {
    // Generate a random key (8 characters, alphanumeric)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let key = ''
    for (let i = 0; i < 8; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60000).toISOString()

    const { data, error } = await supabase
      .from('shared_keys')
      .insert({
        student_id: studentId,
        key: key,
        expires_at: expiresAt
      })
      .select()
      .single()

    return { key: data?.key || null, expiresAt: data?.expires_at || null, error }
  }

  async function createProfile(userId, fullName, role, gradeId) {
    const { error } = await supabase.from('profiles').insert({
      id: userId, full_name: fullName, role, grade_id: gradeId || null,
    })
    if (!error) fetchProfile(userId)
    return { error }
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email, password, fullName, role, gradeId) {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role, grade_id: gradeId || null } },
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    profile,
    profileError,
    children: childrenList,
    loading: session === undefined,
    signIn,
    signUp,
    signOut,
    createProfile,
    fetchChildren,
    generateSharedKey,
    refreshProfile: () => session && fetchProfile(session.user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

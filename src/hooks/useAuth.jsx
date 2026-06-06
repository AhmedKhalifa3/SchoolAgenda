import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]           = useState(undefined) // undefined = loading
  const [profile, setProfile]           = useState(null)
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setSession(null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setProfileError(null) }
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
      // Profile row missing — happens if the trigger didn't fire or
      // the schema wasn't run before the user signed up.
      setProfileError(
        error.code === 'PGRST116'
          ? 'no_profile'   // row not found
          : error.message
      )
      return
    }
    setProfile(data)
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
    loading: session === undefined,
    signIn,
    signUp,
    signOut,
    createProfile,
    refreshProfile: () => session && fetchProfile(session.user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

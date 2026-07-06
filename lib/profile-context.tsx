'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserRole = 'director' | 'coach' | null

export type Profile = {
  id: string
  role: UserRole
  coach_id: string | null
}

type ProfileContextValue = {
  profile: Profile | null
  loading: boolean
  isDirector: boolean
  isCoach: boolean
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  loading: true,
  isDirector: false,
  isCoach: false,
})

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setProfile(null); setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('id, role, coach_id')
        .eq('id', user.id)
        .single()

      setProfile(data ?? null)
      setLoading(false)
    }

    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <ProfileContext.Provider value={{
      profile,
      loading,
      isDirector: profile?.role === 'director',
      isCoach: profile?.role === 'coach',
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}

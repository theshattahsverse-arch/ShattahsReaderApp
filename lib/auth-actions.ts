'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { mergeAnonymousDayPassToUser, getSessionIdFromCookie } from '@/lib/anonymous-daypass'
import { NextRequest } from 'next/server'

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  // Check for anonymous Day Pass and merge if present
  if (authData?.user) {
    const cookieStore = await cookies()
    const sessionIdCookie = cookieStore.get('daypass_session_id')
    if (sessionIdCookie?.value) {
      try {
        await mergeAnonymousDayPassToUser(sessionIdCookie.value, authData.user.id)
      } catch (error) {
        console.error('Error merging anonymous Day Pass:', error)
        // Don't fail the sign-in if merge fails
      }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('fullName') as string,
      },
    },
  }

  const { error, data: authData } = await supabase.auth.signUp(data)

  if (error) {
    return { error: error.message }
  }

  // Check for anonymous Day Pass and merge if present
  if (authData?.user) {
    const cookieStore = await cookies()
    const sessionIdCookie = cookieStore.get('daypass_session_id')
    if (sessionIdCookie?.value) {
      try {
        await mergeAnonymousDayPassToUser(sessionIdCookie.value, authData.user.id)
      } catch (error) {
        console.error('Error merging anonymous Day Pass:', error)
        // Don't fail the sign-up if merge fails
      }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    return { url: data.url }
  }

  return { error: 'Failed to generate OAuth URL' }
}


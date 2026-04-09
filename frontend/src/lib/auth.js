import { supabase } from './supabase'

const SESSION_KEY = 'tm_session'

export async function register({ name, email, password, role, id }) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role, id: parseInt(id, 10) },
    },
  })
  if (error) throw new Error(error.message)
}

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  const meta = data.user.user_metadata
  const session = {
    name: meta.name,
    email: data.user.email,
    role: meta.role,
    id: meta.id,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function logout() {
  await supabase.auth.signOut()
  localStorage.removeItem(SESSION_KEY)
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') } catch { return null }
}

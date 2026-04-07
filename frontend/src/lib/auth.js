const ACCOUNTS_KEY = 'tm_accounts'
const SESSION_KEY  = 'tm_session'

function encode(str) { return btoa(unescape(encodeURIComponent(str))) }
function decode(str) { return decodeURIComponent(escape(atob(str))) }

function getAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]') } catch { return [] }
}

function saveAccounts(list) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
}

export function register({ name, email, password, role, id }) {
  const accounts = getAccounts()
  if (accounts.find(a => a.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('An account with this email already exists.')
  }
  const account = { name, email: email.toLowerCase(), password: encode(password), role, id: parseInt(id, 10) }
  accounts.push(account)
  saveAccounts(accounts)
  return account
}

export function login({ email, password }) {
  const accounts = getAccounts()
  const account = accounts.find(a => a.email === email.toLowerCase())
  if (!account) throw new Error('No account found with this email address.')
  if (account.password !== encode(password)) throw new Error('Incorrect password. Please try again.')
  const session = { ...account }
  delete session.password
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') } catch { return null }
}

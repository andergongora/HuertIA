const TOKEN_KEY = 'huertai_token'

let _token: string | null = localStorage.getItem(TOKEN_KEY)
let _onUnauthorized: (() => void) | null = null

export function getToken(): string | null {
  return _token
}

export function saveToken(token: string): void {
  _token = token
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  _token = null
  localStorage.removeItem(TOKEN_KEY)
}

export function setOnUnauthorized(cb: () => void): void {
  _onUnauthorized = cb
}

export function triggerUnauthorized(): void {
  _onUnauthorized?.()
}

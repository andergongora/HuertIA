const TOKEN_KEY = 'huertai_token'

let _token: string | null = localStorage.getItem(TOKEN_KEY)

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

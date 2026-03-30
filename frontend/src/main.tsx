import React from 'react'
import ReactDOM from 'react-dom/client'
import { StackClientApp, StackProvider, StackTheme } from '@stackframe/stack'
import App from './App'
import './index.css'

export const stackApp = new StackClientApp({
  tokenStore: 'cookie',
  projectId: import.meta.env.VITE_STACK_PROJECT_ID,
  publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
  urls: {
    signIn: '/login',
    afterSignIn: '/gardens',
    afterSignOut: '/login',
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StackProvider app={stackApp}>
      <StackTheme>
        <App />
      </StackTheme>
    </StackProvider>
  </React.StrictMode>,
)

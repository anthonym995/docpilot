import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ChatLayout } from '@/components/chat/chat-layout'
import { AuthProvider } from '@/context/auth-context'
import { SignInPage } from '@/pages/auth/sign-in'
import { SignUpPage } from '@/pages/auth/sign-up'
import { NewChatPage } from '@/pages/chat/new-chat-page'
import { ThreadPage } from '@/pages/chat/thread-page'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<ChatLayout />}>
              <Route path="/" element={<NewChatPage />} />
              <Route path="/c/:threadId" element={<ThreadPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

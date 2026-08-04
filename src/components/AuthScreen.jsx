import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import AuroraBackground from './AuroraBackground'

export default function AuthScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Заполните оба поля')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') await login(username, password)
      else await register(username, password)
    } catch (err) {
      setError(readableError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass shadow-glass rounded-3xl w-full max-w-sm p-8 relative overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-aurora opacity-20 blur-2xl" />

        <div className="flex items-center gap-3 mb-8 relative">
          <div className="w-10 h-10 rounded-2xl bg-aurora flex items-center justify-center shadow-glow">
            <div className="w-4 h-4 rounded-full bg-space-900" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-gradient">Aurora</h1>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'login' ? 12 : -12 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="font-display text-lg font-medium mb-1">
              {mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              {mode === 'login' ? 'Войдите, чтобы продолжить общение' : 'Придумайте имя пользователя и пароль'}
            </p>
          </motion.div>
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Имя пользователя"
            autoComplete="username"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20 transition-all placeholder:text-slate-500"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20 transition-all placeholder:text-slate-500"
          />

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-pink-400 text-xs px-1"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={busy}
            className="w-full mt-2 py-3 rounded-xl font-medium text-sm bg-aurora text-space-900 disabled:opacity-60 transition-opacity"
          >
            {busy ? 'Секунду…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </motion.button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
          className="w-full text-center text-xs text-slate-400 mt-5 hover:text-slate-200 transition-colors"
        >
          {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </motion.div>
    </div>
  )
}

function readableError(err) {
  const code = err?.code || ''
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'Неверный пароль'
  if (code.includes('user-not-found')) return 'Пользователь не найден'
  if (code.includes('email-already-in-use')) return 'Это имя уже занято'
  if (code.includes('weak-password')) return 'Пароль слишком короткий (минимум 6 символов)'
  return err?.message || 'Что-то пошло не так'
}

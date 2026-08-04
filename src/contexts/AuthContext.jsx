import { createContext, useContext, useEffect, useState, useRef } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, FAKE_EMAIL_DOMAIN } from '../firebase'

const AuthContext = createContext(null)

// Палитра для автоматических цветных аватаров (по хешу имени)
const AVATAR_COLORS = [
  ['#6ee7b7', '#34d399'],
  ['#818cf8', '#6366f1'],
  ['#f472b6', '#ec4899'],
  ['#facc15', '#f59e0b'],
  ['#38bdf8', '#0ea5e9'],
  ['#c084fc', '#a855f7'],
  ['#fb7185', '#e11d48'],
]

export function colorForName(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const heartbeatRef = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const ref = doc(db, 'users', firebaseUser.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) setProfile(snap.data())
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // Присутствие "в сети": обновляем lastSeen каждые 20 секунд, пока вкладка открыта
  useEffect(() => {
    if (!user) return
    const beat = async () => {
      await setDoc(
        doc(db, 'users', user.uid),
        { online: true, lastSeen: serverTimestamp() },
        { merge: true }
      )
    }
    beat()
    heartbeatRef.current = setInterval(beat, 20000)

    const goOffline = () => {
      // catch: если это сработает уже после выхода из аккаунта,
      // правила безопасности справедливо отклонят запись — это не ошибка
      setDoc(doc(db, 'users', user.uid), { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {})
    }
    window.addEventListener('beforeunload', goOffline)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) goOffline()
      else beat()
    })

    return () => {
      clearInterval(heartbeatRef.current)
      goOffline()
      window.removeEventListener('beforeunload', goOffline)
    }
  }, [user])

  async function register(username, password) {
    const clean = username.trim()
    if (clean.length < 3) throw new Error('Имя пользователя должно быть не короче 3 символов')
    if (!/^[a-zA-Zа-яА-Я0-9_]+$/.test(clean)) throw new Error('Разрешены только буквы, цифры и подчёркивание')

    // Отдельную проверку "занято ли имя" через Firestore мы не делаем —
    // до входа в аккаунт правила безопасности запрещают чтение чужих
    // данных. Вместо этого полагаемся на сам Firebase Auth: он не даст
    // создать два аккаунта с одинаковым email (а email строится из
    // имени пользователя), и вернёт понятную ошибку "email-already-in-use".
    const email = `${clean.toLowerCase()}${FAKE_EMAIL_DOMAIN}`
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: clean })

    const [c1, c2] = colorForName(clean)
    const newProfile = {
      uid: cred.user.uid,
      username: clean,
      usernameLower: clean.toLowerCase(),
      colorFrom: c1,
      colorTo: c2,
      online: true,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), newProfile)
    setProfile(newProfile)
    return cred.user
  }

  async function login(username, password) {
    const email = `${username.trim().toLowerCase()}${FAKE_EMAIL_DOMAIN}`
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const snap = await getDoc(doc(db, 'users', cred.user.uid))
    if (snap.exists()) setProfile(snap.data())
    return cred.user
  }

  async function logout() {
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { online: false, lastSeen: serverTimestamp() }, { merge: true })
    }
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

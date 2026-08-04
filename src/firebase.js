import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// ─────────────────────────────────────────────────────────────
//  ВСТАВЬТЕ СЮДА СВОЙ КОНФИГ ИЗ FIREBASE CONSOLE
//  Подробно, как его получить, написано в README.md (Шаг 2)
//  Эти значения НЕ являются секретными — Firebase специально
//  проектирует их так, чтобы их можно было открыто хранить
//  в клиентском коде. Безопасность обеспечивают Firestore/
//  Storage Rules, которые вы настроите отдельно.
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDYrL9ecKeoeIku5E1Zwyz9uvFlwcviwNk",
  authDomain: "aurora-chat-362a8.firebaseapp.com",
  projectId: "aurora-chat-362a8",
  storageBucket: "aurora-chat-362a8.firebasestorage.app",
  messagingSenderId: "134500363035",
  appId: "1:134500363035:web:ad81961997929f105001be",
  measurementId: "G-DHK55W5EFZ"
};

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Внутренний домен для преобразования логина в email для Firebase Auth.
// Пользователи вводят только имя пользователя и пароль — им не нужно
// знать, что "под капотом" используется email/password авторизация.
export const FAKE_EMAIL_DOMAIN = '@aurora-chat.local'

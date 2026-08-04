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
  apiKey: 'ВСТАВЬТЕ_apiKey',
  authDomain: 'ВСТАВЬТЕ_authDomain',
  projectId: 'ВСТАВЬТЕ_projectId',
  storageBucket: 'ВСТАВЬТЕ_storageBucket',
  messagingSenderId: 'ВСТАВЬТЕ_messagingSenderId',
  appId: 'ВСТАВЬТЕ_appId',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Внутренний домен для преобразования логина в email для Firebase Auth.
// Пользователи вводят только имя пользователя и пароль — им не нужно
// знать, что "под капотом" используется email/password авторизация.
export const FAKE_EMAIL_DOMAIN = '@aurora-chat.local'

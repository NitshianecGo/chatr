import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useSound } from './hooks/useSound'
import AuroraBackground from './components/AuroraBackground'
import AuthScreen from './components/AuthScreen'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import NewChatModal from './components/NewChatModal'

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <AuroraBackground />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 rounded-full border-2 border-white/10 border-t-violet-400"
      />
    </div>
  )
}

function ChatApp() {
  const { profile } = useAuth()
  const sound = useSound()
  const [activeChat, setActiveChat] = useState(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [pendingChatId, setPendingChatId] = useState(null)

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    sound.setEnabled(next)
  }

  function selectChat(chat) {
    setActiveChat(chat)
    setMobileShowChat(true)
  }

  return (
    <div className="h-screen w-full p-3 md:p-5">
      <AuroraBackground />
      <div className="h-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4">
        <div className={`h-full min-h-0 ${mobileShowChat ? 'hidden md:block' : 'block'}`}>
          <Sidebar
            activeChatId={activeChat?.id}
            onSelectChat={selectChat}
            onNewChat={() => setShowNewChat(true)}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        </div>

        <div className={`h-full min-h-0 ${mobileShowChat ? 'block' : 'hidden md:block'}`}>
          {activeChat ? (
            <ChatWindow chat={activeChat} onBack={() => setMobileShowChat(false)} sound={sound} />
          ) : (
            <EmptyState onNewChat={() => setShowNewChat(true)} name={profile.username} />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showNewChat && (
          <NewChatModal
            onClose={() => setShowNewChat(false)}
            onChatReady={(chatId) => {
              setShowNewChat(false)
              setPendingChatId(chatId)
            }}
          />
        )}
      </AnimatePresence>

      {pendingChatId && <ChatOpener chatId={pendingChatId} onOpen={(c) => { selectChat(c); setPendingChatId(null) }} />}
    </div>
  )
}

// Небольшой помощник: после создания чата в модалке у нас есть только id,
// а Sidebar раздаёт уже полные объекты чатов через onSnapshot. Мы просто
// ждём, пока чат появится в списке, и открываем его.
function ChatOpener({ chatId, onOpen }) {
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) {
        onOpen({ id: snap.id, ...snap.data() })
        unsub()
      }
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId])
  return null
}

function EmptyState({ onNewChat, name }) {
  return (
    <div className="h-full glass rounded-3xl flex flex-col items-center justify-center text-center p-8">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-3xl bg-aurora shadow-glow flex items-center justify-center mb-6"
      >
        <div className="w-8 h-8 rounded-full bg-space-900" />
      </motion.div>
      <h2 className="font-display text-xl font-semibold mb-2">Привет, {name} 👋</h2>
      <p className="text-slate-400 text-sm max-w-xs mb-6">
        Выберите чат слева или начните новый разговор с другом
      </p>
      <button onClick={onNewChat} className="px-5 py-2.5 rounded-xl bg-aurora text-space-900 text-sm font-medium">
        Начать чат
      </button>
    </div>
  )
}

function Gate() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Loader />
  if (!user || !profile) return <AuthScreen />
  return <ChatApp />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

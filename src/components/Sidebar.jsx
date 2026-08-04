import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import Avatar from './Avatar'

function timeAgo(ts) {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// Живой статус "в сети" для собеседника личного чата
function useOtherOnline(otherUid) {
  const [online, setOnline] = useState(undefined)
  useEffect(() => {
    if (!otherUid) return
    const unsub = onSnapshot(doc(db, 'users', otherUid), (snap) => {
      setOnline(snap.exists() ? !!snap.data().online : false)
    })
    return unsub
  }, [otherUid])
  return online
}

export default function Sidebar({ activeChatId, onSelectChat, onNewChat, soundOn, onToggleSound }) {
  const { profile, logout } = useAuth()
  const [chats, setChats] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!profile) return
    // Сортируем на клиенте (а не через orderBy в запросе), чтобы не
    // требовался ручной composite index в Firebase Console — приложение
    // должно работать сразу после публикации без лишних настроек.
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', profile.uid))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0))
      setChats(list)
    })
    return unsub
  }, [profile])

  function chatDisplay(chat) {
    if (chat.isGroup) return { name: chat.groupName, colorFrom: '#818cf8', colorTo: '#f472b6' }
    const otherUid = chat.participants.find((p) => p !== profile.uid)
    const info = chat.participantsInfo?.[otherUid]
    return { name: info?.username || '…', colorFrom: info?.colorFrom, colorTo: info?.colorTo, otherUid }
  }

  const filtered = chats.filter((c) => {
    const { name } = chatDisplay(c)
    return name?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="h-full flex flex-col glass rounded-3xl overflow-hidden">
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-aurora flex items-center justify-center shadow-glow">
              <div className="w-3.5 h-3.5 rounded-full bg-space-900" />
            </div>
            <h1 className="font-display text-xl font-semibold text-gradient">Aurora</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleSound}
              title={soundOn ? 'Выключить звук' : 'Включить звук'}
              className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-lg transition-colors"
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button
              onClick={onNewChat}
              title="Новый чат"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск чатов…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-violet-400/60 placeholder:text-slate-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-3 pb-3">
        {filtered.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-12 px-6">
            {chats.length === 0 ? 'Пока нет чатов — начните новый!' : 'Ничего не найдено'}
          </div>
        )}
        <AnimatePresence initial={false}>
          {filtered.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              display={chatDisplay(chat)}
              isActive={chat.id === activeChatId}
              meUid={profile.uid}
              onSelect={() => onSelectChat(chat)}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-white/10 flex items-center gap-2.5">
        <Avatar name={profile.username} colorFrom={profile.colorFrom} colorTo={profile.colorTo} size={38} />
        <span className="text-sm font-medium flex-1 truncate">{profile.username}</span>
        <button
          onClick={logout}
          title="Выйти"
          className="text-slate-400 hover:text-pink-400 text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          Выйти
        </button>
      </div>
    </div>
  )
}

function ChatRow({ chat, display, isActive, meUid, onSelect }) {
  const { name, colorFrom, colorTo, otherUid } = display
  const online = useOtherOnline(chat.isGroup ? undefined : otherUid)
  const lastMine = chat.lastMessage?.senderId === meUid

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl mb-1 transition-colors text-left ${
        isActive ? 'bg-violet-500/20' : 'hover:bg-white/5'
      }`}
    >
      <Avatar name={name} colorFrom={colorFrom} colorTo={colorTo} size={46} online={chat.isGroup ? undefined : online} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{name}</span>
          {chat.lastMessage && (
            <span className="text-[10px] text-slate-500 shrink-0">{timeAgo(chat.lastMessage.createdAt)}</span>
          )}
        </div>
        <p className="text-xs text-slate-400 truncate">
          {chat.lastMessage ? `${lastMine ? 'Вы: ' : ''}${chat.lastMessage.text}` : 'Нет сообщений'}
        </p>
      </div>
    </motion.button>
  )
}

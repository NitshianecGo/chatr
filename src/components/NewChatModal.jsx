import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { getOrCreateDirectChat, createGroupChat } from '../lib/chatApi'
import Avatar from './Avatar'

export default function NewChatModal({ onClose, onChatReady }) {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [groupMode, setGroupMode] = useState(false)
  const [selected, setSelected] = useState([])
  const [groupName, setGroupName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map((d) => d.data()).filter((u) => u.uid !== profile?.uid)
      setUsers(list)
    })
    return unsub
  }, [profile])

  const filtered = users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()))

  function toggleSelect(u) {
    setSelected((prev) => (prev.find((s) => s.uid === u.uid) ? prev.filter((s) => s.uid !== u.uid) : [...prev, u]))
  }

  async function startDirect(u) {
    setBusy(true)
    try {
      const chatId = await getOrCreateDirectChat(profile, u)
      onChatReady(chatId)
    } finally {
      setBusy(false)
    }
  }

  async function confirmGroup() {
    if (!groupName.trim() || selected.length === 0) return
    setBusy(true)
    try {
      const chatId = await createGroupChat(profile, selected, groupName.trim())
      onChatReady(chatId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative glass shadow-glass rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] flex flex-col overflow-hidden"
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">
              {groupMode ? 'Новая группа' : 'Новый чат'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
              ×
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setGroupMode(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${!groupMode ? 'bg-aurora text-space-900' : 'bg-white/5 text-slate-300'}`}
            >
              Личный чат
            </button>
            <button
              onClick={() => setGroupMode(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${groupMode ? 'bg-aurora text-space-900' : 'bg-white/5 text-slate-300'}`}
            >
              Группа
            </button>
          </div>

          {groupMode && (
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Название группы"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400/60 mb-3"
            />
          )}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400/60"
          />
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin p-3">
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">Никого не найдено</p>
          )}
          <AnimatePresence>
            {filtered.map((u) => {
              const isSelected = !!selected.find((s) => s.uid === u.uid)
              return (
                <motion.button
                  key={u.uid}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  disabled={busy}
                  onClick={() => (groupMode ? toggleSelect(u) : startDirect(u))}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isSelected ? 'bg-violet-500/20' : 'hover:bg-white/5'}`}
                >
                  <Avatar name={u.username} colorFrom={u.colorFrom} colorTo={u.colorTo} size={40} online={u.online} />
                  <span className="text-sm font-medium">{u.username}</span>
                  {groupMode && (
                    <span className={`ml-auto w-5 h-5 rounded-full border ${isSelected ? 'bg-mint-400 border-mint-400' : 'border-slate-500'}`} />
                  )}
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>

        {groupMode && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={confirmGroup}
              disabled={busy || !groupName.trim() || selected.length === 0}
              className="w-full py-3 rounded-xl font-medium text-sm bg-aurora text-space-900 disabled:opacity-40 transition-opacity"
            >
              Создать группу ({selected.length})
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { sendTextMessage, sendImageMessage, setTyping, markMessageRead } from '../lib/chatApi'
import Avatar from './Avatar'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'

const QUICK_EMOJI = ['❤️', '😂', '👍', '🔥', '😮', '🎉']

export default function ChatWindow({ chat, onBack, sound }) {
  const { profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [typists, setTypists] = useState([])
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const firstLoadRef = useRef(true)
  const prevChatIdRef = useRef(null)

  const isGroup = chat.isGroup
  const otherUid = !isGroup ? chat.participants.find((p) => p !== profile.uid) : null
  const otherInfo = !isGroup ? chat.participantsInfo?.[otherUid] : null
  const headerName = isGroup ? chat.groupName : otherInfo?.username

  // Сообщения в реальном времени
  useEffect(() => {
    if (prevChatIdRef.current !== chat.id) {
      firstLoadRef.current = true
      prevChatIdRef.current = chat.id
    }
    const q = query(collection(db, 'chats', chat.id, 'messages'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setMessages(list)

      if (!firstLoadRef.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const m = change.doc.data()
            if (m.senderId !== profile.uid) {
              document.hidden ? sound.playNotify() : sound.playReceive()
            }
          }
        })
      }
      firstLoadRef.current = false

      // помечаем прочитанным всё, что не наше
      list.forEach((m) => {
        if (m.senderId !== profile.uid && !(m.readBy || []).includes(profile.uid)) {
          markMessageRead(chat.id, m.id, profile.uid)
        }
      })
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id])

  // Индикатор "печатает…"
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'chats', chat.id, 'typing'), (snap) => {
      const now = Date.now()
      const active = snap.docs
        .filter((d) => d.id !== profile.uid)
        .map((d) => d.data())
        .filter((t) => t.isTyping && t.updatedAt?.toDate && now - t.updatedAt.toDate().getTime() < 6000)
      setTypists(active)
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typists.length])

  function handleTextChange(v) {
    setText(v)
    setTyping(chat.id, profile.uid, true)
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setTyping(chat.id, profile.uid, false), 2000)
  }

  async function handleSend() {
    const value = text
    if (!value.trim()) return
    setText('')
    setTyping(chat.id, profile.uid, false)
    sound.playSend()
    await sendTextMessage(chat.id, profile, value)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    sound.playSend()
    await sendImageMessage(chat.id, profile, file)
    e.target.value = ''
  }

  return (
    <div className="h-full flex flex-col glass rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
        <button onClick={onBack} className="md:hidden text-slate-400 hover:text-white text-xl mr-1">
          ‹
        </button>
        <Avatar
          name={headerName}
          colorFrom={isGroup ? '#818cf8' : otherInfo?.colorFrom}
          colorTo={isGroup ? '#f472b6' : otherInfo?.colorTo}
          size={42}
        />
        <div className="min-w-0">
          <h2 className="font-display font-medium text-sm truncate">{headerName}</h2>
          <AnimatePresence mode="wait">
            {typists.length > 0 ? (
              <motion.p
                key="typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-mint-400"
              >
                печатает…
              </motion.p>
            ) : (
              <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-500">
                {isGroup ? `${chat.participants.length} участников` : 'личный чат'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isMine={m.senderId === profile.uid}
              showSender={isGroup && (i === 0 || messages[i - 1].senderId !== m.senderId)}
            />
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {typists.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex gap-1.5 mb-2">
          {QUICK_EMOJI.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleTextChange(text + emoji)}
              className="text-lg hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-11 h-11 shrink-0 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-colors"
            title="Отправить фото"
          >
            📎
          </button>
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение…"
            rows={1}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-violet-400/60 placeholder:text-slate-500 max-h-32"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-11 h-11 shrink-0 rounded-full bg-aurora disabled:opacity-30 flex items-center justify-center text-space-900 transition-opacity"
            title="Отправить"
          >
            ➤
          </motion.button>
        </div>
      </div>
    </div>
  )
}

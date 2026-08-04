import { motion } from 'framer-motion'

function formatTime(ts) {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message, isMine, showSender }) {
  const seenByOthers = isMine && message.readBy && message.readBy.length > 1

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.92, filter: 'blur(3px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div className={`max-w-[72%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {showSender && !isMine && (
          <span className="text-xs text-violet-300 mb-1 px-1 font-medium">{message.senderName}</span>
        )}
        <div
          className={`px-4 py-2.5 text-[14px] leading-relaxed break-words ${
            isMine
              ? 'bg-bubble-sent text-white rounded-2xl rounded-br-sm shadow-lg shadow-indigo-950/30'
              : 'glass text-slate-100 rounded-2xl rounded-bl-sm'
          }`}
        >
          {message.type === 'image' ? (
            <img
              src={message.imageUrl}
              alt="изображение"
              className="rounded-lg max-w-full max-h-72 object-cover -mx-1 -my-0.5"
            />
          ) : (
            <span className="whitespace-pre-wrap">{message.text}</span>
          )}
        </div>
        <div className={`flex items-center gap-1 mt-1 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-500">{formatTime(message.createdAt)}</span>
          {isMine && (
            <span className={`text-[11px] ${seenByOthers ? 'text-mint-400' : 'text-slate-500'}`}>
              {seenByOthers ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

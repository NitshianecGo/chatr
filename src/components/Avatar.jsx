export default function Avatar({ name = '?', colorFrom = '#818cf8', colorTo = '#6366f1', size = 44, online, ring }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`w-full h-full rounded-full flex items-center justify-center font-display font-semibold select-none ${ring ? 'ring-2 ring-space-900' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})`,
          fontSize: size * 0.42,
          color: '#0b0f1a',
        }}
      >
        {initial}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-space-900 ${online ? 'bg-mint-400' : 'bg-slate-500'}`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  )
}

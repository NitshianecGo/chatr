export default function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-space-900">
      <div
        className="absolute -top-32 -left-24 w-[38rem] h-[38rem] rounded-full opacity-30 blur-[110px] animate-float"
        style={{ background: 'radial-gradient(circle, #6ee7b7 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 -right-32 w-[34rem] h-[34rem] rounded-full opacity-25 blur-[110px] animate-drift"
        style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-40 left-1/4 w-[36rem] h-[36rem] rounded-full opacity-20 blur-[120px] animate-float"
        style={{ background: 'radial-gradient(circle, #f472b6 0%, transparent 70%)', animationDelay: '4s' }}
      />
      <div className="absolute inset-0 bg-space-900/40" />
    </div>
  )
}

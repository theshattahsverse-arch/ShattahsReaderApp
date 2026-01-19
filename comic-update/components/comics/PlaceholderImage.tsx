'use client'

interface PlaceholderImageProps {
  title: string
  className?: string
}

export function PlaceholderImage({ title, className = '' }: PlaceholderImageProps) {
  // Generate a consistent color based on the title
  const colors = [
    'from-amber-500/30 to-purple-600/30',
    'from-cyan-500/30 to-blue-600/30',
    'from-pink-500/30 to-red-600/30',
    'from-green-500/30 to-emerald-600/30',
    'from-violet-500/30 to-indigo-600/30',
  ]
  
  const colorIndex = title.length % colors.length
  const gradient = colors[colorIndex]

  return (
    <div 
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} ${className}`}
    >
      <div className="text-center p-4">
        <div className="text-6xl font-black text-white/20 mb-2">
          {title.charAt(0).toUpperCase()}
        </div>
        <div className="text-sm text-white/30 font-medium">
          {title}
        </div>
      </div>
    </div>
  )
}


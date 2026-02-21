'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, Zap } from 'lucide-react'

function AnimatedCounter({
  to,
  startWhen,
  durationMs = 1500,
  suffix = '',
}: {
  to: number
  startWhen: boolean
  durationMs?: number
  suffix?: string
}) {
  const [value, setValue] = useState(0)

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? true
  }, [])

  useEffect(() => {
    if (!startWhen) return

    if (prefersReducedMotion) {
      setValue(to)
      return
    }

    let rafId = 0
    const start = performance.now()
    const from = 0
    const delta = to - from

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      const eased = easeOutCubic(t)
      const next = Math.round(from + delta * eased)
      setValue(next)
      if (t < 1) rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [durationMs, prefersReducedMotion, startWhen, to])

  return (
    <span>
      {value}
      {suffix}
    </span>
  )
}

export function HeroSection() {
  const statsRef = useRef<HTMLDivElement | null>(null)
  const [startStats, setStartStats] = useState(false)

  useEffect(() => {
    if (!statsRef.current || startStats) return

    const el = statsRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStartStats(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [startStats])

  return (
    <section className="relative min-h-[90vh] w-full overflow-hidden">
      {/* Background Image - Surveillance Screens */}
      <div className="absolute inset-0">
        {/* The actual background image */}
        <Image
          src="/images/backgrounds/flickering-screens.png"
          alt="Surveillance screens background"
          fill
          className="object-cover object-center"
          priority
          quality={90}
        />
        
        {/* Dark overlay for better text readability - reduced opacity to show image */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        
        {/* Flickering/glitch effect overlay */}
        <div className="absolute inset-0 animate-flicker pointer-events-none" 
          style={{ 
            background: 'linear-gradient(transparent 50%, rgba(0, 0, 0, 0.1) 50%)',
            backgroundSize: '100% 4px',
          }} 
        />
        
        {/* Scanline animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-scanline"
          />
        </div>

        {/* Vignette effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[90vh] max-w-7xl flex-col items-center justify-center px-4 pt-20 text-center sm:px-6 lg:px-8">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber/50 bg-black/50 px-4 py-1.5 text-sm text-amber backdrop-blur-sm">
          <Zap className="h-4 w-4" />
          <span>New Release Available</span>
        </div>

        {/* Main Title with glitch effect */}
        <h1 className="relative mb-4">
          <span className="block text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="text-amber text-glow-amber">SHATT</span>
            <span className="relative inline-block">
              <span className="text-amber-dark">A</span>
              {/* Glitch copies */}
              <span className="absolute left-[2px] top-0 text-cyan-400/50 animate-glitch" aria-hidden="true">A</span>
              <span className="absolute left-[-2px] top-0 text-red-500/50 animate-glitch" style={{ animationDelay: '0.1s' }} aria-hidden="true">A</span>
            </span>
            <span className="text-amber text-glow-amber">HS</span>
          </span>
          <span className="mt-2 block text-lg tracking-[0.5em] text-white/80 drop-shadow-lg sm:text-xl md:text-2xl">
            VERSE
          </span>
        </h1>

        {/* Tagline */}
        <p className="mb-8 max-w-2xl text-lg text-white/90 drop-shadow-lg sm:text-xl md:text-2xl">
          In an age of knockoffs...{' '}
          <span className="text-white font-semibold">Are your heroes safe?</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-amber hover:bg-amber-dark text-background font-bold text-lg px-8 glow-amber"
          >
            <Link href="/comics">
              Start Reading
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div
          ref={statsRef}
          className="mt-16 grid grid-cols-3 gap-8 rounded-xl bg-black/40 px-8 py-6 backdrop-blur-sm sm:gap-16 sm:px-12"
        >
          <Link
            href="/artists"
            className="text-center transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-transparent rounded-lg"
          >
            <div className="text-3xl font-bold text-amber drop-shadow-lg sm:text-4xl">
              <AnimatedCounter to={23} suffix="+" startWhen={startStats} />
            </div>
            <div className="text-sm text-white/70">Artists</div>
          </Link>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber drop-shadow-lg sm:text-4xl">
              50+
            </div>
            <div className="text-sm text-white/70">Countries</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber drop-shadow-lg sm:text-4xl">
              1
            </div>
            <div className="text-sm text-white/70">Mission</div>
          </div>
        </div>
      </div>

      {/* Bottom fade to content */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
    </section>
  )
}

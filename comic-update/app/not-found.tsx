import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-1/4 h-96 w-96 rounded-full bg-amber/10 blur-[128px]" />
        <div className="absolute -right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[128px]" />
      </div>

      <div className="relative z-10 text-center">
        {/* 404 with glitch effect */}
        <h1 className="text-9xl font-black text-amber animate-rgb-shift">
          404
        </h1>
        
        <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
          Lost in the Multiverse
        </h2>
        
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          The page you&apos;re looking for has slipped into another dimension. 
          Let&apos;s get you back to safety.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild className="bg-amber hover:bg-amber-dark text-background">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/comics">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Comics
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}


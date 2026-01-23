import Link from 'next/link'
import { Facebook, Instagram } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6">
          {/* Social Links */}
          <div className="flex items-center gap-3">
            <a
              href="https://www.facebook.com/shattahsverse"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1877f2] text-white hover:bg-[#1877f2]/80 transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href="https://www.instagram.com/shattahsverse"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-80 transition-opacity"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="hhttps://x.com/shattahsverse"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background hover:bg-foreground/80 transition-colors"
              aria-label="X (Twitter)"
            >
             <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            <a
                href="https://www.tiktok.com/@shattahsverse"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white hover:bg-black/80 transition-colors shadow-md"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-amber transition-colors">
              Home
            </Link>
            <Link href="/comics" className="hover:text-amber transition-colors">
              Comics
            </Link>
            <Link href="/subscription" className="hover:text-amber transition-colors">
              Subscription
            </Link>
           <Link href="/about" className="hover:text-amber transition-colors"> 
              About
            </Link>  
          </div>    

          {/* Copyright */}
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2026 ShattahsVerse. The Multiverse will never be the same.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}


import Link from 'next/link'
import { ComicCard } from '@/components/comics/ComicCard'
import { ChevronRight } from 'lucide-react'
import type { Comic } from '@/types/database'

interface PopularSectionProps {
  comics: (Comic & { cover_image_url: string | null })[]
}

export function PopularSection({ comics }: PopularSectionProps) {
  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Golden badge like in the reference */}
            <div className="relative">
              <div className="rounded-l-md bg-amber px-4 py-2 font-bold text-background">
                Popular Today
              </div>
              {/* Triangle pointer */}
              <div 
                className="absolute right-0 top-0 h-full w-4 translate-x-full"
                style={{
                  background: 'linear-gradient(to right bottom, #f5a623 50%, transparent 50%)',
                }}
              />
            </div>
          </div>
          <Link 
            href="/comics" 
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-amber transition-colors"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Comics Grid */}
        <div className="rounded-lg border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
          {comics.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No comics available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {comics.map((comic) => (
                <ComicCard key={comic.id} comic={comic} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}


'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Star, Crown, Eye } from 'lucide-react'
import type { Comic } from '@/types/database'

interface ComicCardProps {
  comic: Comic & { cover_image_url: string | null }
}

export function ComicCard({ comic }: ComicCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link href={`/comics/${comic.id}`}>
      <article
        className="group relative overflow-hidden rounded-lg border border-border/50 bg-card transition-all duration-300 hover:border-amber/50 hover:shadow-lg hover:shadow-amber/10"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Cover Image */}
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          {imageError || !comic.cover_image_url ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber/20 to-purple-500/20">
              <span className="text-4xl font-bold text-amber/50">
                {comic.title.charAt(0)}
              </span>
            </div>
          ) : (
            <Image
              src={comic.cover_image_url}
              alt={comic.title}
              fill
              className={`object-cover transition-transform duration-500 ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
              onError={() => setImageError(true)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Premium badge */}
          {comic.is_premium && (
            <div className="absolute right-2 top-2">
              <Badge className="bg-amber text-background gap-1">
                <Crown className="h-3 w-3" />
                Premium
              </Badge>
            </div>
          )}

          {/* Rating */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
            <Star className="h-3 w-3 fill-amber text-amber" />
            <span className="text-xs font-semibold text-amber">{comic.rating}</span>
          </div>

          {/* View count on hover */}
          <div
            className={`absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Eye className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {comic.view_count.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="mb-1 line-clamp-1 font-semibold text-foreground group-hover:text-amber transition-colors">
            {comic.title}
          </h3>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {comic.description}
          </p>
          
          {/* Genre tags */}
          {comic.genre && comic.genre.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {comic.genre.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hover border glow effect */}
        <div
          className={`absolute inset-0 rounded-lg border-2 border-amber/50 transition-opacity duration-300 pointer-events-none ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </article>
    </Link>
  )
}


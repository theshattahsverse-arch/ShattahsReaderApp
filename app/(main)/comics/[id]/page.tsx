import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getComicById, getComicPages } from '@/lib/comic-actions'
import { 
  Star, 
  Eye, 
  Calendar, 
  BookOpen, 
  Crown,
  User
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ComicDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ComicDetailPageProps) {
  const { id } = await params
  const { data: comic } = await getComicById(id)
  
  if (!comic) {
    return { title: 'Comic Not Found' }
  }

  return {
    title: comic.title,
    description: comic.description || '',
  }
}

export default async function ComicDetailPage({ params }: ComicDetailPageProps) {
  const { id } = await params
  const { data: comic, error: comicError } = await getComicById(id)
  const { data: pages } = await getComicPages(id)

  if (comicError || !comic) {
    notFound()
  }

  // Generate star rating display
  const fullStars = Math.floor(Number(comic.rating) / 2)
  const hasHalfStar = (Number(comic.rating) / 2) % 1 >= 0.5

  const pageCount =
    typeof comic.page_count === 'number'
      ? comic.page_count
      : Number(comic.page_count ?? (pages?.length ?? 0)) || (pages?.length ?? 0)

  const viewCount =
    typeof comic.view_count === 'number'
      ? comic.view_count
      : Number(comic.view_count ?? 0) || 0

  const splitCredits = (value: unknown): string[] => {
    if (typeof value !== 'string') return []
    return value
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Background */}
      <div className="relative h-[50vh] w-full overflow-hidden">
        {/* Background Image with blur */}
        <div className="absolute inset-0">
          {comic.cover_image_url && (
            <Image
              src={comic.cover_image_url}
              alt=""
              fill
              className="object-cover blur-xl scale-110 opacity-30"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background" />
        </div>
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 -mt-80 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left Column - Cover & Stats */}
          <div className="lg:w-80 flex-shrink-0">
            {/* Cover Image */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border/50 shadow-2xl">
              {comic.cover_image_url ? (
                <Image
                  src={comic.cover_image_url}
                  alt={comic.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber/20 to-purple-500/20">
                  <span className="text-6xl font-bold text-amber/50">
                    {comic.title.charAt(0)}
                  </span>
                </div>
              )}
              {comic.is_premium && (
                <div className="absolute right-2 top-2">
                  <Badge className="bg-amber text-background gap-1">
                    <Crown className="h-3 w-3" />
                    Premium
                  </Badge>
                </div>
              )}
            </div>

            {/* Title (mobile) */}
            <h1 className="mt-4 text-2xl font-bold lg:hidden">{comic.title}</h1>

            {/* Rating */}
            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < fullStars
                        ? 'fill-amber text-amber'
                        : i === fullStars && hasHalfStar
                        ? 'fill-amber/50 text-amber'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-bold text-amber">{Number(comic.rating).toFixed(1)}</span>
            </div>

            {/* Stats */}
            <div className="mt-4 rounded-lg border border-border/50 bg-card/50 p-4">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="h-auto w-full justify-start whitespace-normal border-border/50 bg-background/40 px-3 py-2 text-left opacity-100"
                >
                  <div className="flex w-full flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <span className="inline-flex items-center gap-2">
                      <Badge variant={comic.status === 'Ongoing' ? 'default' : 'secondary'}>
                        {comic.status || '—'}
                      </Badge>
                    </span>
                  </div>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="h-auto w-full justify-start whitespace-normal border-border/50 bg-background/40 px-3 py-2 text-left opacity-100"
                >
                  {/* <div className="flex w-full flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Pages</span>
                    <span className="text-sm font-semibold text-foreground">{pageCount}</span>
                  </div> */}
                </Button>

                {comic.written_by && (
                  <div className="w-full rounded-md border border-border/50 bg-background/40 px-3 py-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground">Written By</span>
                      <div className="flex flex-wrap gap-2">
                        {splitCredits(comic.written_by).map((name, idx) => (
                          <Button
                            key={`${name}-${idx}`}
                            type="button"
                            variant="default"
                            size="sm"
                            className="pointer-events-none rounded-full px-4 text-sm font-semibold shadow-none"
                          >
                            {name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {comic.cover_art && (
                  <div className="w-full rounded-md border border-border/50 bg-background/40 px-3 py-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground">Cover Art</span>
                      <div className="flex flex-wrap gap-2">
                        {splitCredits(comic.cover_art).map((name, idx) => (
                          <Button
                            key={`${name}-${idx}`}
                            type="button"
                            variant="default"
                            size="sm"
                            className="pointer-events-none rounded-full px-4 text-sm font-semibold shadow-none"
                          >
                            {name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {comic.interior_art_lines && (
                  <div className="w-full rounded-md border border-border/50 bg-background/40 px-3 py-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground">Interior Art Lines</span>
                      <div className="flex flex-wrap gap-2">
                        {splitCredits(comic.interior_art_lines).map((name, idx) => (
                          <Button
                            key={`${name}-${idx}`}
                            type="button"
                            variant="default"
                            size="sm"
                            className="pointer-events-none rounded-full px-4 text-sm font-semibold shadow-none"
                          >
                            {name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {comic.interior_art_colors && (
                  <div className="w-full rounded-md border border-border/50 bg-background/40 px-3 py-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground">Interior Art Colors</span>
                      <div className="flex flex-wrap gap-2">
                        {splitCredits(comic.interior_art_colors).map((name, idx) => (
                          <Button
                            key={`${name}-${idx}`}
                            type="button"
                            variant="default"
                            size="sm"
                            className="pointer-events-none rounded-full px-4 text-sm font-semibold shadow-none"
                          >
                            {name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="h-auto w-full justify-start whitespace-normal border-border/50 bg-background/40 px-3 py-2 text-left opacity-100"
                >
                  <div className="flex w-full flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Views</span>
                    <span className="text-sm font-semibold text-foreground">
                      {viewCount.toLocaleString()}
                    </span>
                  </div>
                </Button> */}
              </div>
            </div>

            {/* Read Button (mobile) */}
            {pages && pages.length > 0 && (
              <Button
                asChild
                className="mt-4 w-full bg-amber hover:bg-amber-dark text-background font-bold lg:hidden"
                size="lg"
              >
                <Link href={`/comics/read/${id}?page=1`}>
                  <BookOpen className="mr-2 h-5 w-5" />
                  Read Now
                </Link>
              </Button>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="flex-1">
            {/* Title (desktop) */}
            <h1 className="hidden text-3xl font-bold lg:block sm:text-4xl">
              {comic.title}
            </h1>

            {/* Synopsis */}
            <div className="mt-6 rounded-lg border border-border/50 bg-card/50 p-6">
              <h2 className="mb-2 text-lg font-semibold">{comic.title}</h2>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Synopsis</h3>
              <p className="text-muted-foreground leading-relaxed">
                {comic.description || 'No description available.'}
              </p>

              {/* Meta info */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {comic.author && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{comic.author}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(comic.published_date || comic.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{comic.view_count.toLocaleString()} views</span>
                </div>
              </div>

              {/* Genre tags */}
              {comic.genre && comic.genre.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {comic.genre.map((genre) => (
                    <Badge key={genre} variant="outline" className="border-amber/30">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Pages Section */}
            <div className="mt-6 rounded-lg border border-border/50 bg-card/50 p-6">
              <h2 className="mb-4 text-lg font-semibold">Pages</h2>
              
              {!pages || pages.length === 0 ? (
                <p className="text-muted-foreground">No pages available yet.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    This comic has {pages.length} page{pages.length !== 1 ? 's' : ''}. Click below to start reading.
                  </p>
                  <Button
                    asChild
                    className="bg-amber hover:bg-amber-dark text-background font-bold"
                    size="lg"
                  >
                    <Link href={`/comics/read/${id}?page=1`}>
                      <BookOpen className="mr-2 h-5 w-5" />
                      Start Reading
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Read Button (desktop) */}
            {/* {pages && pages.length > 0 && (
              <div className="mt-6 hidden lg:block">
                <Button
                  asChild
                  className="bg-amber hover:bg-amber-dark text-background font-bold"
                  size="lg"
                >
                  <Link href={`/comics/read/${id}?page=1`}>
                    <BookOpen className="mr-2 h-5 w-5" />
                    Start Reading
                  </Link>
                </Button>
              </div>
            )} */}
          </div>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-16" />
    </div>
  )
}

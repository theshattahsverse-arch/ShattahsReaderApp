import { ComicGrid } from '@/components/comics/ComicGrid'
import { getAllComics } from '@/lib/comic-actions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Comics',
  description: 'Browse all comics available on ShattahsVerse',
}

export default async function ComicsPage() {
  const { data: comics } = await getAllComics()

  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            All Comics
          </h1>
          <p className="mt-2 text-muted-foreground">
            Discover amazing stories from the multiverse
          </p>
        </div>

        {/* Filters - placeholder for future implementation */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select className="rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber">
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Genre:</span>
            <select className="rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber">
              <option value="all">All Genres</option>
              <option value="action">Action</option>
              <option value="superhero">Superhero</option>
              <option value="sci-fi">Sci-Fi</option>
              <option value="fantasy">Fantasy</option>
            </select>
          </div>
        </div>

        {/* Comics Grid */}
        {comics && comics.length > 0 ? (
          <ComicGrid comics={comics} columns={4} />
        ) : (
          <div className="rounded-lg border border-border/50 bg-card/50 p-12 text-center">
            <p className="text-muted-foreground">No comics available yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}


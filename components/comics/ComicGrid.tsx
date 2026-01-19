import { ComicCard } from './ComicCard'
import type { Comic } from '@/types/database'

interface ComicGridProps {
  comics: (Comic & { cover_image_url: string | null })[]
  columns?: 2 | 3 | 4 | 5
}

export function ComicGrid({ comics, columns = 4 }: ComicGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  }

  if (comics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-6xl">📚</div>
        <h3 className="mb-2 text-xl font-semibold">No comics found</h3>
        <p className="text-muted-foreground">
          Check back later for new releases!
        </p>
      </div>
    )
  }

  return (
    <div className={`grid gap-6 ${gridCols[columns]}`}>
      {comics.map((comic) => (
        <ComicCard key={comic.id} comic={comic} />
      ))}
    </div>
  )
}


import { notFound } from 'next/navigation'
import { ComicReader } from '@/components/comics/ComicReader'
import { getComicById, getComicPages } from '@/lib/comic-actions'

interface ReaderPageProps {
  params: Promise<{ comicId: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: ReaderPageProps) {
  const { comicId } = await params
  const { data: comic } = await getComicById(comicId)
  
  if (!comic) {
    return { title: 'Comic Not Found' }
  }

  return {
    title: `Reading ${comic.title}`,
    description: `Read ${comic.title}`,
  }
}

export default async function ReaderPage({ params, searchParams }: ReaderPageProps) {
  const { comicId } = await params
  const { page } = await searchParams
  const pageNumber = page ? parseInt(page, 10) : 1

  const { data: comic, error: comicError } = await getComicById(comicId)
  const { data: pages, error: pagesError } = await getComicPages(comicId)

  if (comicError || !comic) {
    notFound()
  }

  if (pagesError || !pages || pages.length === 0) {
    notFound()
  }

  // Validate page number
  const currentPageIndex = Math.max(0, Math.min(pageNumber - 1, pages.length - 1))
  const currentPage = pages[currentPageIndex]

  if (!currentPage) {
    notFound()
  }

  return (
    <ComicReader 
      comic={comic}
      pages={pages}
      currentPageIndex={currentPageIndex}
    />
  )
}


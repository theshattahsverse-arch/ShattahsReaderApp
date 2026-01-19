// Sample comic data for testing the UI
// This will be replaced with actual Supabase data

export interface SampleComic {
  id: string
  title: string
  description: string
  cover_image_url: string
  author: string
  genre: string[]
  rating: number
  view_count: number
  is_premium: boolean
  status: string
  published_date: string
}

export interface SampleChapter {
  id: string
  comic_id: string
  chapter_number: number
  title: string
  pages: string[]
}

export const sampleComics: SampleComic[] = [
  {
    id: '1',
    title: 'Shatteus: Issue 0',
    description: 'On the streets of JamRock, Mande is caught in the middle of a Superhuman event. His world is turned upside down when he encounters Shattahs a clandestine team of Superhunters tasked with tracking and neutralizing the multiverse greatest threat; Heroes',
    cover_image_url: '/images/comics/shatteus-cover.jpg',
    author: 'ShattahsVerse',
    genre: ['Action', 'Superhero', 'Sci-Fi'],
    rating: 9.8,
    view_count: 12500,
    is_premium: false,
    status: 'Ongoing',
    published_date: '2025-07-03',
  },
  {
    id: '2',
    title: 'Neon Shadows',
    description: 'In a cyberpunk metropolis where corporations rule, a lone vigilante discovers a conspiracy that threatens to reshape humanity forever.',
    cover_image_url: '/images/comics/neon-shadows.jpg',
    author: 'CyberInk Studios',
    genre: ['Cyberpunk', 'Action', 'Mystery'],
    rating: 9.2,
    view_count: 8700,
    is_premium: true,
    status: 'Ongoing',
    published_date: '2025-05-15',
  },
  {
    id: '3',
    title: 'Quantum Rift',
    description: 'When parallel dimensions collide, a team of unlikely heroes must navigate multiple realities to prevent the collapse of existence itself.',
    cover_image_url: '/images/comics/quantum-rift.jpg',
    author: 'Dimensional Arts',
    genre: ['Sci-Fi', 'Adventure', 'Drama'],
    rating: 8.9,
    view_count: 6200,
    is_premium: false,
    status: 'Completed',
    published_date: '2025-03-20',
  },
  {
    id: '4',
    title: 'Spirit Walker',
    description: 'A young shaman inherits the power to walk between worlds, uncovering ancient secrets that could save or destroy both realms.',
    cover_image_url: '/images/comics/spirit-walker.jpg',
    author: 'Mystic Tales',
    genre: ['Fantasy', 'Supernatural', 'Action'],
    rating: 9.5,
    view_count: 10300,
    is_premium: false,
    status: 'Ongoing',
    published_date: '2025-06-10',
  },
]

export const sampleChapters: SampleChapter[] = [
  {
    id: 'ch-1-1',
    comic_id: '1',
    chapter_number: 0,
    title: 'Issue 0',
    pages: [
      '/images/comics/shatteus/page-1.jpg',
      '/images/comics/shatteus/page-2.jpg',
      '/images/comics/shatteus/page-3.jpg',
      '/images/comics/shatteus/page-4.jpg',
      '/images/comics/shatteus/page-5.jpg',
    ],
  },
  {
    id: 'ch-2-1',
    comic_id: '2',
    chapter_number: 1,
    title: 'Chapter 1: The Awakening',
    pages: [
      '/images/comics/neon-shadows/page-1.jpg',
      '/images/comics/neon-shadows/page-2.jpg',
      '/images/comics/neon-shadows/page-3.jpg',
    ],
  },
]

export function getComicById(id: string): SampleComic | undefined {
  return sampleComics.find(comic => comic.id === id)
}

export function getChaptersByComicId(comicId: string): SampleChapter[] {
  return sampleChapters.filter(chapter => chapter.comic_id === comicId)
}

export function getChapterById(id: string): SampleChapter | undefined {
  return sampleChapters.find(chapter => chapter.id === id)
}


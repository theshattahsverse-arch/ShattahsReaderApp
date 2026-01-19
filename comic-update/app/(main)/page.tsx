import { HeroSection } from '@/components/home/HeroSection'
import { PopularSection } from '@/components/home/PopularSection'
import { getPopularComics } from '@/lib/comic-actions'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { data: popularComics } = await getPopularComics(4)

  return (
    <div className="min-h-screen">
      <HeroSection />
      <PopularSection comics={popularComics || []} />
    </div>
  )
}


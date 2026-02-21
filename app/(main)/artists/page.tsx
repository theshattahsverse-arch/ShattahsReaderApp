import Image from 'next/image'
import { getAllArtistsPublic } from '@/lib/comic-actions'

export const metadata = {
  title: 'Artist Spotlight',
  description: 'Meet the artists behind our comics',
}

export default async function ArtistSpotlightPage() {
  const { data: artists, error } = await getAllArtistsPublic()

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glowing dots */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[20%] h-2 w-2 rounded-full bg-amber-500/60 blur-sm" />
        <div className="absolute right-[15%] top-[30%] h-1.5 w-1.5 rounded-full bg-amber-400/50 blur-sm" />
        <div className="absolute bottom-[25%] left-[20%] h-2 w-2 rounded-full bg-orange-500/40 blur-sm" />
        <div className="absolute bottom-[40%] right-[25%] h-1 w-1 rounded-full bg-amber-500/50 blur-sm" />
        <div className="absolute left-[50%] top-[15%] h-1 w-1 rounded-full bg-amber-400/30 blur-sm" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Page title */}
        <header className="mb-16 text-center">
          <h1 className="text-4xl font-bold uppercase tracking-wide text-amber-500 sm:text-5xl">
            Artist Spotlight
          </h1>
          <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-amber-500/80" />
        </header>

        {/* Artist cards */}
        {error && (
          <p className="text-center text-red-400">Unable to load artists. Please try again later.</p>
        )}

        {!error && (!artists || artists.length === 0) && (
          <p className="text-center text-white/60">No artists to show yet.</p>
        )}

        {!error && artists && artists.length > 0 && (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {artists.map((artist) => (
              <article
                key={artist.id}
                className="w-full rounded-2xl border border-amber-500/30 bg-zinc-900/95 px-6 py-8 shadow-xl backdrop-blur sm:px-8 sm:py-10"
              >
                {/* Gradient glow behind avatar */}
                <div className="relative flex flex-col items-center text-center">
                  <div
                    className="absolute top-0 h-40 w-40 rounded-full bg-gradient-to-b from-amber-500/40 via-orange-600/30 to-transparent blur-2xl"
                    aria-hidden
                  />
                  <div className="relative flex h-28 w-28 flex-shrink-0 overflow-hidden rounded-full border-2 border-amber-500/40 shadow-lg ring-2 ring-amber-500/20">
                    {artist.picture_url ? (
                      <Image
                        src={artist.picture_url}
                        alt={artist.name}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-700 text-3xl font-bold text-amber-500">
                        {artist.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <h2 className="mt-6 text-2xl font-bold text-amber-500 sm:text-3xl">
                    {artist.hyperlink ? (
                      <a
                        href={artist.hyperlink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {artist.name}
                      </a>
                    ) : (
                      artist.name
                    )}
                  </h2>

                  {(artist.title || artist.social_handle || !artist.bio) && (
                    <div className="mt-2 space-y-1">
                      {artist.title && (
                        <p className="text-sm font-medium uppercase tracking-widest text-amber-400/95">
                          {artist.title}
                        </p>
                      )}
                      {artist.social_handle && (
                        <p className="text-xs text-white/50">@{artist.social_handle}</p>
                      )}
                      {!artist.title && !artist.social_handle && (
                        <p className="text-xs uppercase tracking-widest text-white/60">Artist</p>
                      )}
                    </div>
                  )}

                  {artist.bio && (
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/90">
                      {artist.bio}
                    </p>
                  )}

                  {/* Decorative separator */}
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <span className="h-px w-8 bg-amber-500/40" />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                    <span className="h-px w-8 bg-amber-500/40" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="h-16" />
      </div>
    </div>
  )
}

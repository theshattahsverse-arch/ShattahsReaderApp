'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createArtist, updateArtist, getAllComics } from '@/lib/admin-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, UserCircle } from 'lucide-react'
import type { Artist } from '@/types/database'
import type { Comic } from '@/types/database'

const artistSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  title: z.string().optional(),
  bio: z.string().optional(),
  hyperlink: z.string().optional(),
  comic_id: z.string().optional(),
  social_handle: z.string().optional(),
})

type ArtistFormData = z.infer<typeof artistSchema>

interface ArtistFormProps {
  artist?: Artist
}

export function ArtistForm({ artist }: ArtistFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState<string | null>(
    artist?.picture_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/comics/${artist.picture_path}`
      : null
  )
  const [comics, setComics] = useState<Comic[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await getAllComics()
      if (data) setComics(data)
    }
    load()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ArtistFormData>({
    resolver: zodResolver(artistSchema),
    defaultValues: artist
      ? {
          name: artist.name,
          title: artist.title || '',
          bio: artist.bio || '',
          hyperlink: artist.hyperlink || '',
          comic_id: artist.comic_id || '',
          social_handle: artist.social_handle || '',
        }
      : {
          comic_id: '',
        },
  })

  const comicId = watch('comic_id')

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPictureFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPicturePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: ArtistFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('title', data.title || '')
      formData.append('bio', data.bio || '')
      formData.append('hyperlink', data.hyperlink || '')
      formData.append('comic_id', data.comic_id || '')
      formData.append('social_handle', data.social_handle || '')
      if (pictureFile) {
        formData.append('picture', pictureFile, pictureFile.name)
      }

      let result
      if (artist) {
        result = await updateArtist(artist.id, formData)
      } else {
        result = await createArtist(formData)
      }

      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      if (!artist && result.data) {
        router.push('/admin/artists')
      } else {
        router.refresh()
        setIsLoading(false)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Artist Details</CardTitle>
          <CardDescription>Name, bio, and optional link to a comic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              disabled={isLoading}
              placeholder="Artist name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register('title')}
              disabled={isLoading}
              placeholder="e.g. Digital Sculptor, Cover Artist"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              {...register('bio')}
              disabled={isLoading}
              placeholder="Short bio"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hyperlink">Hyperlink</Label>
            <Input
              id="hyperlink"
              type="url"
              {...register('hyperlink')}
              disabled={isLoading}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="social_handle">Social handle</Label>
            <Input
              id="social_handle"
              {...register('social_handle')}
              disabled={isLoading}
              placeholder="Twitter / Instagram handle or URL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comic_id">Comic (optional)</Label>
            <Select
              value={comicId || 'none'}
              onValueChange={(v) => setValue('comic_id', v === 'none' ? '' : v)}
              disabled={isLoading}
            >
              <SelectTrigger id="comic_id" className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {comics.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Picture</CardTitle>
          <CardDescription>Profile image stored in Supabase Storage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="picture">Picture</Label>
            <Input
              id="picture"
              type="file"
              accept="image/*"
              onChange={handlePictureChange}
              disabled={isLoading}
            />
          </div>
          {picturePreview && (
            <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-border">
              <img
                src={picturePreview}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          {!picturePreview && artist && (
            <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-border bg-muted">
              <UserCircle className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {artist ? 'Update Artist' : 'Create Artist'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

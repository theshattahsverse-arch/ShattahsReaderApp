'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createCharacter, updateCharacter } from '@/lib/admin-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save, UserCircle } from 'lucide-react'
import type { ComicCharacter } from '@/types/database'

const characterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  title: z.string().optional(),
  handle: z.string().optional(),
  bio: z.string().optional(),
  hyperlink: z.string().optional(),
})

type CharacterFormData = z.infer<typeof characterSchema>

interface CharacterFormProps {
  comicId: string
  character?: ComicCharacter
  onSuccess?: () => void
  onCancel?: () => void
  compact?: boolean
}

export function CharacterForm({ comicId, character, onSuccess, onCancel, compact }: CharacterFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState<string | null>(
    character?.picture_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/comics/${character.picture_path}`
      : null
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CharacterFormData>({
    resolver: zodResolver(characterSchema),
    defaultValues: character
      ? {
          name: character.name,
          title: character.title || '',
          handle: character.handle || '',
          bio: character.bio || '',
          hyperlink: character.hyperlink || '',
        }
      : {
          name: '',
          title: '',
          handle: '',
          bio: '',
          hyperlink: '',
        },
  })

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPictureFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPicturePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: CharacterFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('comic_id', comicId)
      formData.append('name', data.name)
      formData.append('title', data.title || '')
      formData.append('handle', data.handle || '')
      formData.append('bio', data.bio || '')
      formData.append('hyperlink', data.hyperlink || '')
      if (pictureFile) {
        formData.append('picture', pictureFile, pictureFile.name)
      }

      let result
      if (character) {
        result = await updateCharacter(character.id, formData)
      } else {
        result = await createCharacter(formData)
      }

      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      onSuccess?.()
      setIsLoading(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="char-name">Name *</Label>
            <Input
              id="char-name"
              {...register('name')}
              disabled={isLoading}
              placeholder="Character name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="char-title">Title</Label>
            <Input
              id="char-title"
              {...register('title')}
              disabled={isLoading}
              placeholder="e.g. Hero, Villain"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="char-handle">Handle</Label>
          <Input
            id="char-handle"
            {...register('handle')}
            disabled={isLoading}
            placeholder="@handle or display handle"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="char-hyperlink">Hyperlink</Label>
          <Input
            id="char-hyperlink"
            type="url"
            {...register('hyperlink')}
            disabled={isLoading}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="char-bio">Bio</Label>
          <textarea
            id="char-bio"
            {...register('bio')}
            disabled={isLoading}
            placeholder="Short bio"
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="char-picture">Picture</Label>
          <Input
            id="char-picture"
            type="file"
            accept="image/*"
            onChange={handlePictureChange}
            disabled={isLoading}
          />
          {picturePreview && (
            <div className="relative mt-2 h-24 w-24 overflow-hidden rounded-lg border border-border">
              <img src={picturePreview} alt="Preview" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {character ? 'Update Character' : 'Add Character'}
              </>
            )}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{character ? 'Edit Character' : 'Add Character'}</CardTitle>
          <CardDescription>Name, title, handle, bio, and picture for this comic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              disabled={isLoading}
              placeholder="Character name"
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
              placeholder="e.g. Hero, Villain, Sidekick"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="handle">Handle</Label>
            <Input
              id="handle"
              {...register('handle')}
              disabled={isLoading}
              placeholder="@handle or display name"
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
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              {...register('bio')}
              disabled={isLoading}
              placeholder="Short bio"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Picture</CardTitle>
          <CardDescription>Character image stored in Supabase Storage</CardDescription>
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
          {!picturePreview && character && (
            <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-border bg-muted">
              <UserCircle className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {character ? 'Update Character' : 'Add Character'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createComic, updateComic } from '@/lib/admin-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import type { Comic, ComicStatus } from '@/types/database'

const comicSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  author: z.string().optional(),
  genre: z.string().optional(),
  status: z.enum(['Ongoing', 'Completed', 'Hiatus', 'Cancelled']),
  is_premium: z.boolean(),
})

type ComicFormData = z.infer<typeof comicSchema>

interface ComicFormProps {
  comic?: Comic
}

export function ComicForm({ comic }: ComicFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(
    comic?.cover_image_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/comics/${comic.cover_image_path}`
      : null
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ComicFormData>({
    resolver: zodResolver(comicSchema),
    defaultValues: comic
      ? {
          title: comic.title,
          description: comic.description || '',
          author: comic.author || '',
          genre: comic.genre?.join(', ') || '',
          status: comic.status,
          is_premium: comic.is_premium,
        }
      : {
          status: 'Ongoing',
          is_premium: false,
        },
  })

  const status = watch('status')
  const isPremium = watch('is_premium')

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: ComicFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('description', data.description || '')
      formData.append('author', data.author || '')
      formData.append('genre', data.genre || '')
      formData.append('status', data.status)
      formData.append('is_premium', data.is_premium.toString())
      
      if (coverFile) {
        formData.append('cover', coverFile, coverFile.name)
        console.log('Cover file added to FormData:', {
          name: coverFile.name,
          size: coverFile.size,
          type: coverFile.type
        })
      } else {
        console.log('No cover file to upload')
      }

      let result
      if (comic) {
        result = await updateComic(comic.id, formData)
      } else {
        result = await createComic(formData)
      }

      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      // Redirect to edit page if new comic, or stay on edit page
      if (!comic && result.data) {
        router.push(`/admin/comics/${result.data.id}`)
      } else {
        router.refresh()
        setIsLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
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
          <CardTitle>Comic Details</CardTitle>
          <CardDescription>Enter the basic information about your comic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              disabled={isLoading}
              placeholder="Enter comic title"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...register('description')}
              disabled={isLoading}
              placeholder="Enter comic description"
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                {...register('author')}
                disabled={isLoading}
                placeholder="Enter author name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                {...register('genre')}
                disabled={isLoading}
                placeholder="Action, Superhero, Sci-Fi (comma separated)"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue('status', value as ComicStatus)}
                disabled={isLoading}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ongoing">Ongoing</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Hiatus">Hiatus</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_premium">Premium</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_premium"
                  checked={isPremium}
                  onChange={(e) => setValue('is_premium', e.target.checked)}
                  disabled={isLoading}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_premium" className="font-normal">
                  Mark as premium content
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cover Image</CardTitle>
          <CardDescription>Upload a cover image for your comic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cover">Cover Image</Label>
            <Input
              id="cover"
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              disabled={isLoading}
            />
          </div>

          {coverPreview && (
            <div className="relative aspect-[3/4] w-48 overflow-hidden rounded-lg border border-border">
              <img
                src={coverPreview}
                alt="Cover preview"
                className="h-full w-full object-cover"
              />
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
              {comic ? 'Update Comic' : 'Create Comic'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}


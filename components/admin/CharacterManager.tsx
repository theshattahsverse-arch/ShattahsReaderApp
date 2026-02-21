'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCharactersByComicId, deleteCharacter } from '@/lib/admin-actions'
import { CharacterForm } from '@/components/admin/CharacterForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, Pencil, Trash2, UserCircle } from 'lucide-react'
import type { ComicCharacter } from '@/types/database'

interface CharacterManagerProps {
  comicId: string
}

export function CharacterManager({ comicId }: CharacterManagerProps) {
  const router = useRouter()
  const [characters, setCharacters] = useState<ComicCharacter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const loadCharacters = async () => {
    setIsLoading(true)
    const { data, error } = await getCharactersByComicId(comicId)
    if (error) {
      setIsLoading(false)
      return
    }
    setCharacters(data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    loadCharacters()
  }, [comicId])

  const handleFormSuccess = () => {
    setShowAddForm(false)
    setEditingId(null)
    loadCharacters()
    router.refresh()
  }

  const handleDelete = async (character: ComicCharacter) => {
    if (!confirm(`Are you sure you want to delete "${character.name}"? This cannot be undone.`)) {
      return
    }
    const { error } = await deleteCharacter(character.id)
    if (error) {
      alert(`Failed to delete: ${error}`)
      return
    }
    if (editingId === character.id) {
      setEditingId(null)
    }
    loadCharacters()
    router.refresh()
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Manage Characters</CardTitle>
              <CardDescription>
                Add and edit characters for this comic. They will appear on the comic detail page.
              </CardDescription>
            </div>
            {!showAddForm && !editingId && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Character
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showAddForm && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="mb-4 text-sm font-semibold">New Character</h3>
              <CharacterForm
                comicId={comicId}
                compact
                onSuccess={handleFormSuccess}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          )}

          {editingId && (() => {
            const character = characters.find((c) => c.id === editingId)
            if (!character) return null
            return (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-4 text-sm font-semibold">Edit: {character.name}</h3>
                <CharacterForm
                  comicId={comicId}
                  character={character}
                  compact
                  onSuccess={handleFormSuccess}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )
          })()}

          {characters.length === 0 && !showAddForm ? (
            <div className="py-12 text-center text-muted-foreground">
              <UserCircle className="mx-auto mb-4 h-12 w-12" />
              <p>No characters yet</p>
              <p className="text-sm">Add characters using the button above</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Character
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className="flex gap-4 rounded-lg border border-border bg-card p-4"
                >
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {character.picture_path ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/comics/${character.picture_path}`}
                        alt={character.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <UserCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{character.name}</p>
                    {character.title && (
                      <p className="text-sm text-muted-foreground">{character.title}</p>
                    )}
                    {character.handle && (
                      <p className="text-xs text-muted-foreground">@{character.handle}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddForm(false)
                          setEditingId(character.id)
                        }}
                        disabled={!!editingId}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(character)}
                        disabled={!!editingId}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

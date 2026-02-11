'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check, ImageIcon } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'

interface ComicShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comicTitle: string
  comicId: string
  /** Page number being shared (1-based). When set, share URL is reader URL for this page. */
  sharePageNumber?: number
  /** Image URL of the page being shared. When set, user can share the actual page image. */
  sharePageImageUrl?: string | null
}

function getShareUrl(comicId: string, sharePageNumber?: number): string {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  // When sharing from reader, use reader URL so the link opens on that page
  if (sharePageNumber != null && sharePageNumber >= 1) {
    return `${origin}/comics/read/${comicId}?page=${sharePageNumber}`
  }
  return `${origin}/comics/${comicId}`
}

function getShareText(comicTitle: string): string {
  return `Check out "${comicTitle}" on Shattahs Reader`
}

export function ComicShareDialog({
  open,
  onOpenChange,
  comicTitle,
  comicId,
  sharePageNumber,
  sharePageImageUrl,
}: ComicShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [sharingImage, setSharingImage] = useState(false)
  const [shareImageError, setShareImageError] = useState<string | null>(null)
  const shareUrl = getShareUrl(comicId, sharePageNumber)
  const shareText = getShareText(comicTitle)

  useEffect(() => {
    if (open) setShareImageError(null)
  }, [open])

  const sharePageImage = useCallback(async () => {
    if (!sharePageImageUrl) return
    setSharingImage(true)
    setShareImageError(null)
    try {
      const res = await fetch(sharePageImageUrl, { mode: 'cors' })
      if (!res.ok) throw new Error('Failed to load image')
      const blob = await res.blob()
      const ext = blob.type === 'image/png' ? 'png' : 'jpg'
      const file = new File([blob], `comic-page-${sharePageNumber ?? 'page'}.${ext}`, {
        type: blob.type || 'image/jpeg',
      })
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: comicTitle,
          text: shareText,
          url: shareUrl,
          files: [file],
        })
      } else {
        setShareImageError('Sharing the image is not supported in this browser. Copy the link or use the buttons below.')
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not share image'
      setShareImageError(message === 'AbortError' ? '' : message)
    } finally {
      setSharingImage(false)
    }
  }, [sharePageImageUrl, sharePageNumber, comicTitle, shareText, shareUrl])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [shareUrl])

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500')
  }

  const shareToFacebook = () => {
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    )
  }

  const shareToX = () => {
    openShareWindow(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    )
  }

  const shareToLinkedIn = () => {
    openShareWindow(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    )
  }

  const shareToWhatsApp = () => {
    openShareWindow(
      `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
    )
  }

  const shareToTelegram = () => {
    openShareWindow(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle>Share this comic</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {sharePageNumber != null
              ? `Share page ${sharePageNumber} of "${comicTitle}" with your friends`
              : `Share "${comicTitle}" with your friends`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* Share page image - primary when sharing a specific page */}
          {sharePageImageUrl && (
            <>
              <Button
                type="button"
                size="lg"
                className="w-full bg-amber text-black hover:bg-amber/90 font-semibold"
                onClick={sharePageImage}
                disabled={sharingImage}
              >
                <ImageIcon className="h-5 w-5 mr-2" />
                {sharingImage ? 'Preparing…' : 'Share page image'}
              </Button>
              {shareImageError && (
                <p className="text-xs text-amber-200/90">{shareImageError}</p>
              )}
            </>
          )}
          {/* Social buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="bg-[#1877F2]/10 border-[#1877F2]/50 text-white hover:bg-[#1877F2]/20"
              onClick={shareToFacebook}
            >
              <FacebookIcon className="h-5 w-5 mr-2" />
              Facebook
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700"
              onClick={shareToX}
            >
              <XIcon className="h-5 w-5 mr-2" />
              X (Twitter)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="bg-[#0A66C2]/10 border-[#0A66C2]/50 text-white hover:bg-[#0A66C2]/20"
              onClick={shareToLinkedIn}
            >
              <LinkedInIcon className="h-5 w-5 mr-2" />
              LinkedIn
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="bg-[#25D366]/10 border-[#25D366]/50 text-white hover:bg-[#25D366]/20"
              onClick={shareToWhatsApp}
            >
              <WhatsAppIcon className="h-5 w-5 mr-2" />
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="bg-[#0088cc]/10 border-[#0088cc]/50 text-white hover:bg-[#0088cc]/20 sm:col-span-2"
              onClick={shareToTelegram}
            >
              <TelegramIcon className="h-5 w-5 mr-2" />
              Telegram
            </Button>
          </div>
          {/* Copy link */}
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-300"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 border-zinc-600 text-white hover:bg-zinc-700"
              onClick={copyLink}
              title="Copy link"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Copy the link to share anywhere (e.g. Instagram, email, or messages)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

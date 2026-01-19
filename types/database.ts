export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ComicStatus = 'Ongoing' | 'Completed' | 'Hiatus' | 'Cancelled'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          subscription_tier: string
          subscription_end_date: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: string
          subscription_end_date?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: string
          subscription_end_date?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      comics: {
        Row: {
          id: string
          title: string
          description: string | null
          cover_image_path: string | null
          author: string | null
          genre: string[] | null
          rating: number
          view_count: number
          page_count: number
          is_premium: boolean
          status: ComicStatus
          published_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          cover_image_path?: string | null
          author?: string | null
          genre?: string[] | null
          rating?: number
          view_count?: number
          page_count?: number
          is_premium?: boolean
          status?: ComicStatus
          published_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          cover_image_path?: string | null
          author?: string | null
          genre?: string[] | null
          rating?: number
          view_count?: number
          page_count?: number
          is_premium?: boolean
          status?: ComicStatus
          published_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      comic_pages: {
        Row: {
          id: string
          comic_id: string
          page_number: number
          image_path: string
          created_at: string
        }
        Insert: {
          id?: string
          comic_id: string
          page_number: number
          image_path: string
          created_at?: string
        }
        Update: {
          id?: string
          comic_id?: string
          page_number?: number
          image_path?: string
          created_at?: string
        }
      }
      user_favorites: {
        Row: {
          id: string
          user_id: string
          comic_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          comic_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          comic_id?: string
          created_at?: string
        }
      }
      comic_comments: {
        Row: {
          id: string
          user_id: string
          comic_id: string
          page_id: string | null
          parent_id: string | null
          content: string
          rating: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          comic_id: string
          page_id?: string | null
          parent_id?: string | null
          content: string
          rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          comic_id?: string
          page_id?: string | null
          parent_id?: string | null
          content?: string
          rating?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      user_reading_progress: {
        Row: {
          id: string
          user_id: string
          comic_id: string
          page_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          comic_id: string
          page_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          comic_id?: string
          page_id?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Comic = Database['public']['Tables']['comics']['Row']
export type ComicPage = Database['public']['Tables']['comic_pages']['Row']
export type UserFavorite = Database['public']['Tables']['user_favorites']['Row']
export type ComicComment = Database['public']['Tables']['comic_comments']['Row']
export type UserReadingProgress = Database['public']['Tables']['user_reading_progress']['Row']

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
          subscription_status: string
          subscription_end_date: string | null
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          paystack_transaction_ref: string | null
          paypal_order_id: string | null
          paypal_subscription_id: string | null
          payment_provider: string | null
          platform: string | null
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
          subscription_status?: string
          subscription_end_date?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          paystack_transaction_ref?: string | null
          paypal_order_id?: string | null
          paypal_subscription_id?: string | null
          payment_provider?: string | null
          platform?: string | null
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
          subscription_status?: string
          subscription_end_date?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          paystack_transaction_ref?: string | null
          paypal_order_id?: string | null
          paypal_subscription_id?: string | null
          payment_provider?: string | null
          platform?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      reddit_user_ids: {
        Row: {
          reddit_id: string
          user_id: string
        }
        Insert: {
          reddit_id: string
          user_id: string
        }
        Update: {
          reddit_id?: string
          user_id?: string
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
          written_by: string | null
          cover_art: string | null
          interior_art_lines: string | null
          interior_art_colors: string | null
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
          written_by?: string | null
          cover_art?: string | null
          interior_art_lines?: string | null
          interior_art_colors?: string | null
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
          written_by?: string | null
          cover_art?: string | null
          interior_art_lines?: string | null
          interior_art_colors?: string | null
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
      artists: {
        Row: {
          id: string
          name: string
          title: string | null
          bio: string | null
          picture_path: string | null
          hyperlink: string | null
          comic_id: string | null
          social_handle: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          title?: string | null
          bio?: string | null
          picture_path?: string | null
          hyperlink?: string | null
          comic_id?: string | null
          social_handle?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          title?: string | null
          bio?: string | null
          picture_path?: string | null
          hyperlink?: string | null
          comic_id?: string | null
          social_handle?: string | null
          created_at?: string
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
export type Artist = Database['public']['Tables']['artists']['Row']

// Extended types
export interface CommentWithUser {
  id: string
  user_id: string
  comic_id: string
  page_id: string | null
  parent_id: string | null
  content: string
  rating: number | null
  created_at: string
  updated_at: string
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
    email: string | null
    platform: string | null
  }
}

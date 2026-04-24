export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          device_id: string
          device_info: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          device_id: string
          device_info?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          device_id?: string
          device_info?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_user_notes: {
        Row: {
          author_user_id: string
          created_at: string
          id: string
          note: string
          pinned: boolean
          target_user_id: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          created_at?: string
          id?: string
          note: string
          pinned?: boolean
          target_user_id: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          created_at?: string
          id?: string
          note?: string
          pinned?: boolean
          target_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      albums: {
        Row: {
          artist_id: string
          cover_url: string | null
          created_at: string
          id: string
          release_date: string | null
          title: string
        }
        Insert: {
          artist_id: string
          cover_url?: string | null
          created_at?: string
          id?: string
          release_date?: string | null
          title: string
        }
        Update: {
          artist_id?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          release_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_requests: {
        Row: {
          artist_name: string
          bio: string | null
          contact_email: string | null
          created_at: string
          document_urls: Json | null
          genre: string | null
          id: string
          links: Json | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["artist_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_name: string
          bio?: string | null
          contact_email?: string | null
          created_at?: string
          document_urls?: Json | null
          genre?: string | null
          id?: string
          links?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["artist_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_name?: string
          bio?: string | null
          contact_email?: string | null
          created_at?: string
          document_urls?: Json | null
          genre?: string | null
          id?: string
          links?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["artist_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artists: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      card_purchases: {
        Row: {
          amount_cents: number
          buyer_email: string
          buyer_user_id: string
          card_type: Database["public"]["Enums"]["card_type"]
          created_at: string
          currency: string
          download_credits: number
          gift_message: string | null
          gift_recipient_email: string | null
          id: string
          is_gift: boolean
          qr_card_id: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_email: string
          buyer_user_id: string
          card_type: Database["public"]["Enums"]["card_type"]
          created_at?: string
          currency?: string
          download_credits: number
          gift_message?: string | null
          gift_recipient_email?: string | null
          id?: string
          is_gift?: boolean
          qr_card_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string
          buyer_user_id?: string
          card_type?: Database["public"]["Enums"]["card_type"]
          created_at?: string
          currency?: string
          download_credits?: number
          gift_message?: string | null
          gift_recipient_email?: string | null
          id?: string
          is_gift?: boolean
          qr_card_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      collaboration_claims: {
        Row: {
          claimant_artist_name: string
          claimant_user_id: string
          collaborator_id: string
          created_at: string
          id: string
          message: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["collab_claim_status"]
          updated_at: string
        }
        Insert: {
          claimant_artist_name: string
          claimant_user_id: string
          collaborator_id: string
          created_at?: string
          id?: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["collab_claim_status"]
          updated_at?: string
        }
        Update: {
          claimant_artist_name?: string
          claimant_user_id?: string
          collaborator_id?: string
          created_at?: string
          id?: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["collab_claim_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_claims_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "song_collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_redemptions: {
        Row: {
          id: string
          ip_address: string | null
          qr_card_id: string
          redeemed_at: string
          redeemed_by_email: string
          redeemed_by_user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          qr_card_id: string
          redeemed_at?: string
          redeemed_by_email: string
          redeemed_by_user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          qr_card_id?: string
          redeemed_at?: string
          redeemed_by_email?: string
          redeemed_by_user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_year: number | null
          created_at: string
          downloads_remaining: number | null
          full_name: string | null
          gender: string | null
          id: string
          last_used_mode: string
          preferred_mode: string
          profile_choice_made: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          downloads_remaining?: number | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_used_mode?: string
          preferred_mode?: string
          profile_choice_made?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          downloads_remaining?: number | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_used_mode?: string
          preferred_mode?: string
          profile_choice_made?: boolean
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      qr_cards: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          card_type: Database["public"]["Enums"]["card_type"]
          code: string
          created_at: string
          currency: string | null
          download_credits: number
          gift_message: string | null
          gift_recipient_email: string | null
          gift_redeemed: boolean
          gift_redeemed_at: string | null
          id: string
          is_activated: boolean | null
          is_gift: boolean
          origin: Database["public"]["Enums"]["card_origin"]
          owner_user_id: string | null
          price_cents: number | null
          purchase_id: string | null
          redemption_token: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          card_type?: Database["public"]["Enums"]["card_type"]
          code: string
          created_at?: string
          currency?: string | null
          download_credits?: number
          gift_message?: string | null
          gift_recipient_email?: string | null
          gift_redeemed?: boolean
          gift_redeemed_at?: string | null
          id?: string
          is_activated?: boolean | null
          is_gift?: boolean
          origin?: Database["public"]["Enums"]["card_origin"]
          owner_user_id?: string | null
          price_cents?: number | null
          purchase_id?: string | null
          redemption_token?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          card_type?: Database["public"]["Enums"]["card_type"]
          code?: string
          created_at?: string
          currency?: string | null
          download_credits?: number
          gift_message?: string | null
          gift_recipient_email?: string | null
          gift_redeemed?: boolean
          gift_redeemed_at?: string | null
          id?: string
          is_activated?: boolean | null
          is_gift?: boolean
          origin?: Database["public"]["Enums"]["card_origin"]
          owner_user_id?: string | null
          price_cents?: number | null
          purchase_id?: string | null
          redemption_token?: string | null
        }
        Relationships: []
      }
      song_collaborators: {
        Row: {
          artist_name: string
          claimed_at: string | null
          claimed_by_user_id: string | null
          contact_email: string | null
          created_at: string
          id: string
          is_primary: boolean
          role: Database["public"]["Enums"]["collab_role"]
          share_percent: number
          song_id: string | null
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          artist_name: string
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: Database["public"]["Enums"]["collab_role"]
          share_percent: number
          song_id?: string | null
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          artist_name?: string
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: Database["public"]["Enums"]["collab_role"]
          share_percent?: number
          song_id?: string | null
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      song_submissions: {
        Row: {
          album_title: string | null
          artist_name: string
          cover_path: string | null
          cover_url: string | null
          created_at: string
          duration_seconds: number
          genre: string | null
          id: string
          preview_path: string | null
          preview_start_seconds: number
          preview_url: string | null
          published_song_id: string | null
          rejection_reason: string | null
          release_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_release_at: string | null
          status: Database["public"]["Enums"]["song_submission_status"]
          title: string
          track_path: string | null
          track_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          album_title?: string | null
          artist_name: string
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          duration_seconds?: number
          genre?: string | null
          id?: string
          preview_path?: string | null
          preview_start_seconds?: number
          preview_url?: string | null
          published_song_id?: string | null
          rejection_reason?: string | null
          release_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_release_at?: string | null
          status?: Database["public"]["Enums"]["song_submission_status"]
          title: string
          track_path?: string | null
          track_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          album_title?: string | null
          artist_name?: string
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          duration_seconds?: number
          genre?: string | null
          id?: string
          preview_path?: string | null
          preview_start_seconds?: number
          preview_url?: string | null
          published_song_id?: string | null
          rejection_reason?: string | null
          release_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_release_at?: string | null
          status?: Database["public"]["Enums"]["song_submission_status"]
          title?: string
          track_path?: string | null
          track_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      songs: {
        Row: {
          album_id: string | null
          artist_id: string
          cover_url: string | null
          created_at: string
          duration_seconds: number
          id: string
          preview_start_seconds: number
          preview_url: string | null
          scheduled_release_at: string | null
          title: string
          track_url: string | null
        }
        Insert: {
          album_id?: string | null
          artist_id: string
          cover_url?: string | null
          created_at?: string
          duration_seconds: number
          id?: string
          preview_start_seconds?: number
          preview_url?: string | null
          scheduled_release_at?: string | null
          title: string
          track_url?: string | null
        }
        Update: {
          album_id?: string | null
          artist_id?: string
          cover_url?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          preview_start_seconds?: number
          preview_url?: string | null
          scheduled_release_at?: string | null
          title?: string
          track_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "songs_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "songs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          area: Database["public"]["Enums"]["staff_area"]
          created_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          area: Database["public"]["Enums"]["staff_area"]
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          area?: Database["public"]["Enums"]["staff_area"]
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_balance: {
        Row: {
          created_at: string | null
          id: string
          qr_card_id: string
          remaining_downloads: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          qr_card_id: string
          remaining_downloads?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          qr_card_id?: string
          remaining_downloads?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_balance_qr_card_id_fkey"
            columns: ["qr_card_id"]
            isOneToOne: false
            referencedRelation: "qr_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_balance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          card_id: string
          card_type: string
          credits_remaining: number
          expires_at: string
          id: string
          is_active: boolean | null
          max_credits: number
          scanned_at: string | null
          user_email: string
        }
        Insert: {
          card_id: string
          card_type: string
          credits_remaining: number
          expires_at: string
          id?: string
          is_active?: boolean | null
          max_credits: number
          scanned_at?: string | null
          user_email: string
        }
        Update: {
          card_id?: string
          card_type?: string
          credits_remaining?: number
          expires_at?: string
          id?: string
          is_active?: boolean | null
          max_credits?: number
          scanned_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      user_downloads: {
        Row: {
          card_id_str: string | null
          card_type: string | null
          city: string | null
          country_code: string | null
          country_name: string | null
          download_type: string
          downloaded_at: string
          fraud_score: number
          hidden_from_library: boolean
          id: string
          ip_address: string | null
          local_user_id: string | null
          qr_card_id: string | null
          region: string | null
          song_id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          card_id_str?: string | null
          card_type?: string | null
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          download_type?: string
          downloaded_at?: string
          fraud_score?: number
          hidden_from_library?: boolean
          id?: string
          ip_address?: string | null
          local_user_id?: string | null
          qr_card_id?: string | null
          region?: string | null
          song_id: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          card_id_str?: string | null
          card_type?: string | null
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          download_type?: string
          downloaded_at?: string
          fraud_score?: number
          hidden_from_library?: boolean
          id?: string
          ip_address?: string | null
          local_user_id?: string | null
          qr_card_id?: string | null
          region?: string | null
          song_id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_downloads_qr_card_id_fkey"
            columns: ["qr_card_id"]
            isOneToOne: false
            referencedRelation: "qr_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_downloads_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_fraud_score: {
        Row: {
          created_at: string
          flagged_at: string | null
          is_suspicious: boolean
          last_event_at: string
          notes: string | null
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flagged_at?: string | null
          is_suspicious?: boolean
          last_event_at?: string
          notes?: string | null
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          flagged_at?: string | null
          is_suspicious?: boolean
          last_event_at?: string
          notes?: string | null
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          id: string
          is_active: boolean | null
          last_active: string | null
          session_token: string
          user_email: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          last_active?: string | null
          session_token: string
          user_email: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          last_active?: string | null
          session_token?: string
          user_email?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_artist_request: {
        Args: { p_request_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      approve_song_submission: {
        Args: { p_submission_id: string }
        Returns: {
          message: string
          song_id: string
          success: boolean
        }[]
      }
      approve_song_submission_scheduled: {
        Args: { p_release_at?: string; p_submission_id: string }
        Returns: {
          message: string
          song_id: string
          success: boolean
        }[]
      }
      claim_collaboration: {
        Args: { p_collaborator_id: string; p_message?: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      consume_card_credit: {
        Args: { p_card_id: string; p_song_id: string; p_user_id: string }
        Returns: {
          credits_left: number
          message: string
          success: boolean
        }[]
      }
      get_artist_stats: { Args: { p_artist_id: string }; Returns: Json }
      get_gift_preview: {
        Args: { p_token: string }
        Returns: {
          card_type: Database["public"]["Enums"]["card_type"]
          code: string
          download_credits: number
          gift_redeemed: boolean
        }[]
      }
      get_my_staff_areas: {
        Args: never
        Returns: {
          area: Database["public"]["Enums"]["staff_area"]
        }[]
      }
      get_pending_collaborations_for_artist: {
        Args: never
        Returns: {
          artist_name: string
          collaborator_id: string
          downloads: number
          estimated_revenue_cents: number
          has_pending_claim: boolean
          share_percent: number
          song_cover_url: string
          song_id: string
          song_title: string
        }[]
      }
      get_upcoming_releases: {
        Args: never
        Returns: {
          artist_name: string
          cover_url: string
          id: string
          scheduled_release_at: string
          title: string
        }[]
      }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_area: {
        Args: {
          _area: Database["public"]["Enums"]["staff_area"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      redeem_gift_card: {
        Args: { p_token: string; p_user_email: string; p_user_id: string }
        Returns: {
          card_id: string
          card_type: Database["public"]["Enums"]["card_type"]
          download_credits: number
          message: string
          success: boolean
        }[]
      }
      reject_artist_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      reject_song_submission: {
        Args: { p_reason?: string; p_submission_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      release_scheduled_songs: { Args: never; Returns: number }
      resolve_collaboration_claim: {
        Args: { p_approve: boolean; p_claim_id: string; p_reason?: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      transfer_card_to_user: {
        Args: {
          p_card_id: string
          p_gift_message?: string
          p_recipient_username: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      transfer_song_to_user: {
        Args: { p_recipient_username: string; p_song_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      user_owns_artist: {
        Args: { _artist_id: string; _user_id: string }
        Returns: boolean
      }
      validate_qr_card: {
        Args: { card_code: string }
        Returns: {
          card_type: Database["public"]["Enums"]["card_type"]
          download_credits: number
          id: string
          is_activated: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "artist"
      artist_request_status: "pending" | "approved" | "rejected"
      card_origin: "physical" | "digital"
      card_type: "standard" | "premium"
      collab_claim_status: "pending" | "approved" | "rejected"
      collab_role: "featuring" | "producer" | "performer" | "composer" | "remix"
      purchase_status: "pending" | "paid" | "failed" | "refunded"
      song_submission_status: "pending" | "approved" | "rejected" | "removed"
      staff_area:
        | "catalog"
        | "users"
        | "artist_requests"
        | "qr_cards"
        | "monetization"
        | "settings"
      user_role: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "artist"],
      artist_request_status: ["pending", "approved", "rejected"],
      card_origin: ["physical", "digital"],
      card_type: ["standard", "premium"],
      collab_claim_status: ["pending", "approved", "rejected"],
      collab_role: ["featuring", "producer", "performer", "composer", "remix"],
      purchase_status: ["pending", "paid", "failed", "refunded"],
      song_submission_status: ["pending", "approved", "rejected", "removed"],
      staff_area: [
        "catalog",
        "users",
        "artist_requests",
        "qr_cards",
        "monetization",
        "settings",
      ],
      user_role: ["user", "admin"],
    },
  },
} as const

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
          created_at: string
          downloads_remaining: number | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          downloads_remaining?: number | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          downloads_remaining?: number | null
          full_name?: string | null
          id?: string
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
      songs: {
        Row: {
          album_id: string | null
          artist_id: string
          cover_url: string | null
          created_at: string
          duration_seconds: number
          id: string
          preview_url: string | null
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
          preview_url?: string | null
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
          preview_url?: string | null
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
          downloaded_at: string
          id: string
          local_user_id: string | null
          qr_card_id: string | null
          song_id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          card_id_str?: string | null
          card_type?: string | null
          downloaded_at?: string
          id?: string
          local_user_id?: string | null
          qr_card_id?: string | null
          song_id: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          card_id_str?: string | null
          card_type?: string | null
          downloaded_at?: string
          id?: string
          local_user_id?: string | null
          qr_card_id?: string | null
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
      consume_card_credit: {
        Args: { p_card_id: string; p_song_id: string; p_user_id: string }
        Returns: {
          credits_left: number
          message: string
          success: boolean
        }[]
      }
      get_gift_preview: {
        Args: { p_token: string }
        Returns: {
          card_type: Database["public"]["Enums"]["card_type"]
          code: string
          download_credits: number
          gift_redeemed: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "moderator" | "user"
      card_origin: "physical" | "digital"
      card_type: "standard" | "premium"
      purchase_status: "pending" | "paid" | "failed" | "refunded"
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
      app_role: ["admin", "moderator", "user"],
      card_origin: ["physical", "digital"],
      card_type: ["standard", "premium"],
      purchase_status: ["pending", "paid", "failed", "refunded"],
      user_role: ["user", "admin"],
    },
  },
} as const

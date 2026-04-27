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
      ad_campaigns: {
        Row: {
          artist_id: string | null
          campaign_type: Database["public"]["Enums"]["ad_campaign_type"]
          clicks: number
          created_at: string
          cta_text: string | null
          cta_url: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          image_url: string | null
          impressions: number
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["ad_payment_status"]
          placement: string
          price_eur: number | null
          price_xaf: number | null
          priority: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["ad_campaign_status"]
          subtitle: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          artist_id?: string | null
          campaign_type: Database["public"]["Enums"]["ad_campaign_type"]
          clicks?: number
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["ad_payment_status"]
          placement?: string
          price_eur?: number | null
          price_xaf?: number | null
          priority?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_campaign_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          artist_id?: string | null
          campaign_type?: Database["public"]["Enums"]["ad_campaign_type"]
          clicks?: number
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["ad_payment_status"]
          placement?: string
          price_eur?: number | null
          price_xaf?: number | null
          priority?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_campaign_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ad_requests: {
        Row: {
          ad_type: string
          admin_notes: string | null
          asset_url: string | null
          budget: string | null
          company_name: string | null
          created_at: string
          desired_dates: string | null
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          sector: string | null
          status: Database["public"]["Enums"]["ad_request_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ad_type: string
          admin_notes?: string | null
          asset_url?: string | null
          budget?: string | null
          company_name?: string | null
          created_at?: string
          desired_dates?: string | null
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          sector?: string | null
          status?: Database["public"]["Enums"]["ad_request_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ad_type?: string
          admin_notes?: string | null
          asset_url?: string | null
          budget?: string | null
          company_name?: string | null
          created_at?: string
          desired_dates?: string | null
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          sector?: string | null
          status?: Database["public"]["Enums"]["ad_request_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_financial_settings: {
        Row: {
          artist_percentage: number
          auto_release_enabled: boolean
          created_at: string
          id: number
          platform_percentage: number
          updated_at: string
          validation_period_days: number
          value_per_download_xaf: number
          wallet_price_per_download_xaf: number
          withdrawal_fee_type: Database["public"]["Enums"]["withdrawal_fee_type"]
          withdrawal_fee_value: number
          withdrawal_frequency_days: number
          withdrawal_minimum_xaf: number
          withdrawals_enabled: boolean
        }
        Insert: {
          artist_percentage?: number
          auto_release_enabled?: boolean
          created_at?: string
          id?: number
          platform_percentage?: number
          updated_at?: string
          validation_period_days?: number
          value_per_download_xaf?: number
          wallet_price_per_download_xaf?: number
          withdrawal_fee_type?: Database["public"]["Enums"]["withdrawal_fee_type"]
          withdrawal_fee_value?: number
          withdrawal_frequency_days?: number
          withdrawal_minimum_xaf?: number
          withdrawals_enabled?: boolean
        }
        Update: {
          artist_percentage?: number
          auto_release_enabled?: boolean
          created_at?: string
          id?: number
          platform_percentage?: number
          updated_at?: string
          validation_period_days?: number
          value_per_download_xaf?: number
          wallet_price_per_download_xaf?: number
          withdrawal_fee_type?: Database["public"]["Enums"]["withdrawal_fee_type"]
          withdrawal_fee_value?: number
          withdrawal_frequency_days?: number
          withdrawal_minimum_xaf?: number
          withdrawals_enabled?: boolean
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
      artist_earnings: {
        Row: {
          artist_amount_xaf: number
          artist_id: string
          artist_percentage: number
          created_at: string
          fraud_score: number
          gross_amount_xaf: number
          id: string
          notes: string | null
          platform_amount_xaf: number
          qr_card_id: string | null
          song_id: string | null
          source_download_id: string | null
          status: Database["public"]["Enums"]["artist_earning_status"]
          updated_at: string
          user_id: string | null
          validation_release_date: string
          withdrawal_request_id: string | null
        }
        Insert: {
          artist_amount_xaf?: number
          artist_id: string
          artist_percentage: number
          created_at?: string
          fraud_score?: number
          gross_amount_xaf?: number
          id?: string
          notes?: string | null
          platform_amount_xaf?: number
          qr_card_id?: string | null
          song_id?: string | null
          source_download_id?: string | null
          status?: Database["public"]["Enums"]["artist_earning_status"]
          updated_at?: string
          user_id?: string | null
          validation_release_date: string
          withdrawal_request_id?: string | null
        }
        Update: {
          artist_amount_xaf?: number
          artist_id?: string
          artist_percentage?: number
          created_at?: string
          fraud_score?: number
          gross_amount_xaf?: number
          id?: string
          notes?: string | null
          platform_amount_xaf?: number
          qr_card_id?: string | null
          song_id?: string | null
          source_download_id?: string | null
          status?: Database["public"]["Enums"]["artist_earning_status"]
          updated_at?: string
          user_id?: string | null
          validation_release_date?: string
          withdrawal_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_earnings_withdrawal"
            columns: ["withdrawal_request_id"]
            isOneToOne: false
            referencedRelation: "artist_withdrawal_requests"
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
      artist_withdrawal_methods: {
        Row: {
          account_holder_name: string
          artist_id: string
          country: string | null
          created_at: string
          details_json: Json
          id: string
          is_default: boolean
          last_used_at: string | null
          method_type: Database["public"]["Enums"]["artist_payment_method_type"]
          payment_details: Json
          rejection_reason: string | null
          updated_at: string
          user_id: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_holder_name: string
          artist_id: string
          country?: string | null
          created_at?: string
          details_json?: Json
          id?: string
          is_default?: boolean
          last_used_at?: string | null
          method_type: Database["public"]["Enums"]["artist_payment_method_type"]
          payment_details?: Json
          rejection_reason?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_holder_name?: string
          artist_id?: string
          country?: string | null
          created_at?: string
          details_json?: Json
          id?: string
          is_default?: boolean
          last_used_at?: string | null
          method_type?: Database["public"]["Enums"]["artist_payment_method_type"]
          payment_details?: Json
          rejection_reason?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      artist_withdrawal_requests: {
        Row: {
          admin_internal_note: string | null
          amount_requested_xaf: number
          artist_id: string
          created_at: string
          fee_amount_xaf: number
          id: string
          net_amount_xaf: number
          paid_at: string | null
          paid_by: string | null
          payment_method_id: string | null
          payment_method_snapshot: Json | null
          payment_proof_url: string | null
          payment_reference: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["artist_withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_internal_note?: string | null
          amount_requested_xaf: number
          artist_id: string
          created_at?: string
          fee_amount_xaf?: number
          id?: string
          net_amount_xaf: number
          paid_at?: string | null
          paid_by?: string | null
          payment_method_id?: string | null
          payment_method_snapshot?: Json | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["artist_withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_internal_note?: string | null
          amount_requested_xaf?: number
          artist_id?: string
          created_at?: string
          fee_amount_xaf?: number
          id?: string
          net_amount_xaf?: number
          paid_at?: string | null
          paid_by?: string | null
          payment_method_id?: string | null
          payment_method_snapshot?: Json | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["artist_withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_withdrawal_requests_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "artist_withdrawal_methods"
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
          {
            foreignKeyName: "collaboration_claims_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "unclaimed_collaborators_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          max_attempts: number
          rate_limit_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
          visibility_timeout_seconds: number
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          max_attempts?: number
          rate_limit_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
          visibility_timeout_seconds?: number
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          max_attempts?: number
          rate_limit_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
          visibility_timeout_seconds?: number
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          enabled_state: Database["public"]["Enums"]["subscription_visibility"]
          key: string
          rules: Json
          updated_at: string
          updated_by: string | null
          whitelist_user_ids: string[]
        }
        Insert: {
          enabled_state?: Database["public"]["Enums"]["subscription_visibility"]
          key: string
          rules?: Json
          updated_at?: string
          updated_by?: string | null
          whitelist_user_ids?: string[]
        }
        Update: {
          enabled_state?: Database["public"]["Enums"]["subscription_visibility"]
          key?: string
          rules?: Json
          updated_at?: string
          updated_by?: string | null
          whitelist_user_ids?: string[]
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
      recharge_cards: {
        Row: {
          amount: number
          batch: string | null
          code: string
          created_at: string
          created_by: string | null
          currency: string
          expires_at: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["recharge_card_status"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          amount: number
          batch?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["recharge_card_status"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          amount?: number
          batch?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["recharge_card_status"]
          used_at?: string | null
          used_by?: string | null
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
      song_plays: {
        Row: {
          duration_ms: number | null
          id: string
          ip_address: string | null
          is_valid: boolean
          played_at: string
          session_id: string | null
          song_id: string
          user_id: string | null
        }
        Insert: {
          duration_ms?: number | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean
          played_at?: string
          session_id?: string | null
          song_id: string
          user_id?: string | null
        }
        Update: {
          duration_ms?: number | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean
          played_at?: string
          session_id?: string | null
          song_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      song_shares: {
        Row: {
          channel: string | null
          id: string
          shared_at: string
          song_id: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          id?: string
          shared_at?: string
          song_id: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          id?: string
          shared_at?: string
          song_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      song_submissions: {
        Row: {
          album_title: string | null
          artist_name: string
          audio_hash: string | null
          copyright_checked_at: string | null
          copyright_matches: Json
          copyright_score: number
          copyright_status: Database["public"]["Enums"]["copyright_status"]
          cover_path: string | null
          cover_url: string | null
          created_at: string
          duration_seconds: number
          express_paid_at: string | null
          express_price_xaf: number | null
          express_requested_at: string | null
          express_tier: Database["public"]["Enums"]["express_tier"] | null
          genre: string | null
          id: string
          nationality: string | null
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
          audio_hash?: string | null
          copyright_checked_at?: string | null
          copyright_matches?: Json
          copyright_score?: number
          copyright_status?: Database["public"]["Enums"]["copyright_status"]
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          duration_seconds?: number
          express_paid_at?: string | null
          express_price_xaf?: number | null
          express_requested_at?: string | null
          express_tier?: Database["public"]["Enums"]["express_tier"] | null
          genre?: string | null
          id?: string
          nationality?: string | null
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
          audio_hash?: string | null
          copyright_checked_at?: string | null
          copyright_matches?: Json
          copyright_score?: number
          copyright_status?: Database["public"]["Enums"]["copyright_status"]
          cover_path?: string | null
          cover_url?: string | null
          created_at?: string
          duration_seconds?: number
          express_paid_at?: string | null
          express_price_xaf?: number | null
          express_requested_at?: string | null
          express_tier?: Database["public"]["Enums"]["express_tier"] | null
          genre?: string | null
          id?: string
          nationality?: string | null
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
          is_premium: boolean
          preview_start_seconds: number
          preview_url: string | null
          scheduled_release_at: string | null
          subscription_locked_until: string | null
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
          is_premium?: boolean
          preview_start_seconds?: number
          preview_url?: string | null
          scheduled_release_at?: string | null
          subscription_locked_until?: string | null
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
          is_premium?: boolean
          preview_start_seconds?: number
          preview_url?: string | null
          scheduled_release_at?: string | null
          subscription_locked_until?: string | null
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
      subscription_download_attempts: {
        Row: {
          created_at: string
          id: string
          reason: string
          song_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string
          song_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          song_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          code: Database["public"]["Enums"]["subscription_plan_code"]
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_recommended: boolean
          monthly_downloads: number
          name: string
          price_eur_cents: number
          price_xaf: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          code: Database["public"]["Enums"]["subscription_plan_code"]
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          monthly_downloads: number
          name: string
          price_eur_cents: number
          price_xaf: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: Database["public"]["Enums"]["subscription_plan_code"]
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          monthly_downloads?: number
          name?: string
          price_eur_cents?: number
          price_xaf?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_type: Database["public"]["Enums"]["support_message_sender"]
          sender_user_id: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_type: Database["public"]["Enums"]["support_message_sender"]
          sender_user_id?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_type?: Database["public"]["Enums"]["support_message_sender"]
          sender_user_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["support_ticket_category"]
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["support_ticket_category"]
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["support_ticket_category"]
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          downloads_remaining: number
          id: string
          last_event_at: string
          monthly_downloads: number
          plan_id: string
          renewal_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["user_subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          downloads_remaining?: number
          id?: string
          last_event_at?: string
          monthly_downloads: number
          plan_id: string
          renewal_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["user_subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          downloads_remaining?: number
          id?: string
          last_event_at?: string
          monthly_downloads?: number
          plan_id?: string
          renewal_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["user_subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          total_recharged: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          total_recharged?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          total_recharged?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
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
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json
          payment_method: string | null
          reference: string | null
          related_card_id: string | null
          related_song_id: string | null
          status: Database["public"]["Enums"]["wallet_transaction_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          payment_method?: string | null
          reference?: string | null
          related_card_id?: string | null
          related_song_id?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          payment_method?: string | null
          reference?: string | null
          related_card_id?: string | null
          related_song_id?: string | null
          status?: Database["public"]["Enums"]["wallet_transaction_status"]
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      unclaimed_collaborators_public: {
        Row: {
          artist_name: string | null
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string | null
          id: string | null
          is_primary: boolean | null
          role: Database["public"]["Enums"]["collab_role"] | null
          share_percent: number | null
          song_id: string | null
          submission_id: string | null
          updated_at: string | null
        }
        Insert: {
          artist_name?: string | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string | null
          id?: string | null
          is_primary?: boolean | null
          role?: Database["public"]["Enums"]["collab_role"] | null
          share_percent?: number | null
          song_id?: string | null
          submission_id?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_name?: string | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string | null
          id?: string | null
          is_primary?: boolean | null
          role?: Database["public"]["Enums"]["collab_role"] | null
          share_percent?: number | null
          song_id?: string | null
          submission_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_approve_ad_campaign: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      admin_approve_withdrawal: {
        Args: { p_request_id: string }
        Returns: Json
      }
      admin_generate_recharge_cards: {
        Args: {
          p_amount: number
          p_batch?: string
          p_expires_at?: string
          p_quantity: number
        }
        Returns: Json
      }
      admin_mark_withdrawal_paid:
        | { Args: { p_request_id: string }; Returns: Json }
        | {
            Args: {
              p_admin_internal_note?: string
              p_payment_proof_url?: string
              p_payment_reference?: string
              p_request_id: string
            }
            Returns: Json
          }
      admin_reject_ad_campaign: {
        Args: { p_campaign_id: string; p_reason?: string }
        Returns: undefined
      }
      admin_reject_withdrawal: {
        Args: { p_reason: string; p_request_id: string }
        Returns: Json
      }
      admin_set_method_status: {
        Args: { p_method_id: string; p_reason?: string; p_status: string }
        Returns: Json
      }
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
      consume_download: {
        Args: {
          p_city?: string
          p_country_code?: string
          p_country_name?: string
          p_ip?: string
          p_region?: string
          p_song_id: string
          p_user_id: string
        }
        Returns: {
          balance_info: Json
          message: string
          source: string
          success: boolean
        }[]
      }
      consume_subscription_credit: {
        Args: { p_song_id: string; p_user_id: string }
        Returns: {
          credits_left: number
          message: string
          success: boolean
        }[]
      }
      create_artist_release_ad: {
        Args: {
          p_artist_id: string
          p_cta_text: string
          p_cta_url: string
          p_duration_days: number
          p_image_url: string
          p_price_eur: number
          p_price_xaf: number
          p_start_date?: string
          p_subtitle: string
          p_title: string
        }
        Returns: string
      }
      delete_email: {
        Args: { msg_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_artist_for_user: {
        Args: { _artist_name: string; _user_id: string }
        Returns: string
      }
      expire_ad_campaigns: { Args: never; Returns: number }
      get_active_ad_campaigns: {
        Args: { p_limit?: number; p_placement?: string }
        Returns: {
          campaign_type: Database["public"]["Enums"]["ad_campaign_type"]
          cta_text: string
          cta_url: string
          id: string
          image_url: string
          subtitle: string
          title: string
        }[]
      }
      get_artist_stats: { Args: { p_artist_id: string }; Returns: Json }
      get_artist_wallet_summary: {
        Args: { p_artist_id: string }
        Returns: Json
      }
      get_ceo_ai_alerts: { Args: { p_days?: number }; Returns: Json }
      get_ceo_fraud_summary: { Args: { p_days?: number }; Returns: Json }
      get_ceo_health_score: { Args: { p_days?: number }; Returns: Json }
      get_ceo_kpis: { Args: { p_days?: number }; Returns: Json }
      get_ceo_recommendations: { Args: { p_days?: number }; Returns: Json }
      get_ceo_revenue_breakdown: { Args: { p_days?: number }; Returns: Json }
      get_ceo_sales_forecast: { Args: { p_days?: number }; Returns: Json }
      get_ceo_top_artists: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          active_songs: number
          artist_id: string
          downloads_now: number
          downloads_prev: number
          estimated_revenue: number
          growth_pct: number
          name: string
          recommendation: string
        }[]
      }
      get_ceo_top_songs: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          ai_status: string
          artist_name: string
          downloads_now: number
          downloads_prev: number
          estimated_revenue: number
          growth_pct: number
          song_id: string
          title: string
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
      get_my_staff_areas: {
        Args: never
        Returns: {
          area: Database["public"]["Enums"]["staff_area"]
        }[]
      }
      get_or_create_wallet: {
        Args: { p_user_id: string }
        Returns: {
          balance: number
          created_at: string
          currency: string
          id: string
          total_recharged: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_wallets"
          isOneToOne: true
          isSetofReturn: false
        }
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
      get_popular_songs: {
        Args: { p_genre?: string; p_limit?: number; p_period?: string }
        Returns: {
          artist_name: string
          cover_url: string
          downloads_count: number
          favorites_count: number
          genre: string
          plays_count: number
          popularity_score: number
          redemptions_count: number
          shares_count: number
          song_id: string
          title: string
        }[]
      }
      get_public_financial_settings: { Args: never; Returns: Json }
      get_subscription_visibility: {
        Args: { _user_id: string }
        Returns: {
          reason: string
          state: Database["public"]["Enums"]["subscription_visibility"]
          visible: boolean
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
      get_wallet_summary: { Args: { p_limit?: number }; Returns: Json }
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
      mark_copyright_blocked: {
        Args: {
          p_matches: Json
          p_reason: string
          p_score: number
          p_submission_id: string
        }
        Returns: undefined
      }
      move_to_dlq: {
        Args: { msg_id: number; payload: Json; source_queue: string }
        Returns: number
      }
      read_email_batch: {
        Args: {
          batch_size?: number
          queue_name: string
          visibility_timeout?: number
        }
        Returns: {
          enqueued_at: string
          message: Json
          msg_id: number
          read_ct: number
          vt: string
        }[]
      }
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
      redeem_recharge_card: { Args: { p_code: string }; Returns: Json }
      register_subscription_attempt: {
        Args: { p_reason?: string; p_song_id?: string }
        Returns: undefined
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
      release_pending_earnings: { Args: never; Returns: number }
      release_scheduled_songs: { Args: never; Returns: number }
      request_artist_withdrawal: {
        Args: { p_amount_xaf: number; p_artist_id: string; p_method_id: string }
        Returns: Json
      }
      resolve_collaboration_claim: {
        Args: { p_approve: boolean; p_claim_id: string; p_reason?: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      submit_ad_request: {
        Args: {
          p_ad_type: string
          p_asset_url?: string
          p_budget?: string
          p_company_name?: string
          p_desired_dates?: string
          p_email: string
          p_message?: string
          p_name: string
          p_phone?: string
          p_sector?: string
        }
        Returns: string
      }
      subscription_metrics: { Args: never; Returns: Json }
      sync_historical_earnings: { Args: { p_dry_run?: boolean }; Returns: Json }
      track_ad_click: { Args: { p_campaign_id: string }; Returns: undefined }
      track_ad_impression: {
        Args: { p_campaign_id: string }
        Returns: undefined
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
      update_copyright_analysis: {
        Args: {
          p_audio_hash?: string
          p_matches: Json
          p_score: number
          p_status: Database["public"]["Enums"]["copyright_status"]
          p_submission_id: string
        }
        Returns: undefined
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
      wallet_consume_for_download:
        | { Args: { p_amount: number; p_song_id: string }; Returns: Json }
        | {
            Args: { p_amount: number; p_song_id: string; p_user_id: string }
            Returns: {
              balance_after: number
              message: string
              success: boolean
            }[]
          }
    }
    Enums: {
      ad_campaign_status:
        | "draft"
        | "pending_payment"
        | "pending_review"
        | "active"
        | "rejected"
        | "expired"
        | "cancelled"
      ad_campaign_type:
        | "artist_release"
        | "external_business"
        | "yusiop_service"
      ad_payment_status: "unpaid" | "paid" | "refunded"
      ad_request_status:
        | "new"
        | "contacted"
        | "proposal_sent"
        | "converted"
        | "rejected"
      app_role: "admin" | "moderator" | "user" | "artist"
      artist_earning_status:
        | "pending_validation"
        | "available"
        | "withdrawn"
        | "blocked"
        | "refunded"
        | "under_review"
      artist_payment_method_type:
        | "bank_transfer"
        | "mobile_money"
        | "paypal"
        | "other"
        | "crypto"
        | "manual_other"
      artist_request_status: "pending" | "approved" | "rejected"
      artist_withdrawal_status:
        | "requested"
        | "under_review"
        | "approved"
        | "paid"
        | "rejected"
        | "cancelled"
      card_origin: "physical" | "digital"
      card_type: "standard" | "premium"
      collab_claim_status: "pending" | "approved" | "rejected"
      collab_role: "featuring" | "producer" | "performer" | "composer" | "remix"
      copyright_status:
        | "pending"
        | "analyzing"
        | "clean"
        | "review"
        | "blocked"
        | "error"
      express_tier: "72h" | "48h" | "24h"
      purchase_status: "pending" | "paid" | "failed" | "refunded"
      recharge_card_status: "active" | "used" | "expired" | "disabled"
      song_submission_status: "pending" | "approved" | "rejected" | "removed"
      staff_area:
        | "catalog"
        | "users"
        | "artist_requests"
        | "qr_cards"
        | "monetization"
        | "settings"
      subscription_plan_code: "plus" | "pro" | "elite"
      subscription_visibility: "off" | "soft_launch" | "on"
      support_message_sender: "user" | "ai" | "admin"
      support_ticket_category:
        | "qr"
        | "downloads"
        | "payments"
        | "cards"
        | "subscriptions"
        | "artist"
        | "collaborations"
        | "other"
      support_ticket_priority: "low" | "medium" | "high"
      support_ticket_status: "open" | "pending" | "resolved" | "closed"
      user_role: "user" | "admin"
      user_subscription_status: "active" | "cancelled" | "expired" | "past_due"
      wallet_transaction_status: "pending" | "completed" | "failed" | "reversed"
      wallet_transaction_type:
        | "recharge"
        | "purchase"
        | "refund"
        | "bonus"
        | "adjustment"
      withdrawal_fee_type: "none" | "fixed" | "percent"
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
      ad_campaign_status: [
        "draft",
        "pending_payment",
        "pending_review",
        "active",
        "rejected",
        "expired",
        "cancelled",
      ],
      ad_campaign_type: [
        "artist_release",
        "external_business",
        "yusiop_service",
      ],
      ad_payment_status: ["unpaid", "paid", "refunded"],
      ad_request_status: [
        "new",
        "contacted",
        "proposal_sent",
        "converted",
        "rejected",
      ],
      app_role: ["admin", "moderator", "user", "artist"],
      artist_earning_status: [
        "pending_validation",
        "available",
        "withdrawn",
        "blocked",
        "refunded",
        "under_review",
      ],
      artist_payment_method_type: [
        "bank_transfer",
        "mobile_money",
        "paypal",
        "other",
        "crypto",
        "manual_other",
      ],
      artist_request_status: ["pending", "approved", "rejected"],
      artist_withdrawal_status: [
        "requested",
        "under_review",
        "approved",
        "paid",
        "rejected",
        "cancelled",
      ],
      card_origin: ["physical", "digital"],
      card_type: ["standard", "premium"],
      collab_claim_status: ["pending", "approved", "rejected"],
      collab_role: ["featuring", "producer", "performer", "composer", "remix"],
      copyright_status: [
        "pending",
        "analyzing",
        "clean",
        "review",
        "blocked",
        "error",
      ],
      express_tier: ["72h", "48h", "24h"],
      purchase_status: ["pending", "paid", "failed", "refunded"],
      recharge_card_status: ["active", "used", "expired", "disabled"],
      song_submission_status: ["pending", "approved", "rejected", "removed"],
      staff_area: [
        "catalog",
        "users",
        "artist_requests",
        "qr_cards",
        "monetization",
        "settings",
      ],
      subscription_plan_code: ["plus", "pro", "elite"],
      subscription_visibility: ["off", "soft_launch", "on"],
      support_message_sender: ["user", "ai", "admin"],
      support_ticket_category: [
        "qr",
        "downloads",
        "payments",
        "cards",
        "subscriptions",
        "artist",
        "collaborations",
        "other",
      ],
      support_ticket_priority: ["low", "medium", "high"],
      support_ticket_status: ["open", "pending", "resolved", "closed"],
      user_role: ["user", "admin"],
      user_subscription_status: ["active", "cancelled", "expired", "past_due"],
      wallet_transaction_status: ["pending", "completed", "failed", "reversed"],
      wallet_transaction_type: [
        "recharge",
        "purchase",
        "refund",
        "bonus",
        "adjustment",
      ],
      withdrawal_fee_type: ["none", "fixed", "percent"],
    },
  },
} as const

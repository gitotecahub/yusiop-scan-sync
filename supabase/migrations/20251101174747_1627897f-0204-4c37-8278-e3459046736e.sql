-- CRITICAL SECURITY FIX: Remove unrestricted INSERT on user_credits
-- This prevents attackers from granting themselves unlimited download credits

-- Drop the dangerous policy that allows anyone to insert credits
DROP POLICY IF EXISTS "Allow system to create credit records" ON public.user_credits;

-- The edge function activate-qr uses service role key, so it doesn't need 
-- a user-facing policy to insert credits. Only the edge function should create credits.

-- CRITICAL SECURITY FIX: Remove public SELECT access to qr_cards
-- This prevents enumeration of all QR card codes and business data

-- Drop the public read policy
DROP POLICY IF EXISTS "Allow QR card lookup by code" ON public.qr_cards;

-- The validate_qr_card SECURITY DEFINER function provides controlled access
-- The edge function uses service role key to query qr_cards directly
-- Admins can still manage QR cards via the existing "Admins can manage QR cards" policy
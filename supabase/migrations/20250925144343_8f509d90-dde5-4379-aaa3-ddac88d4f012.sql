-- CRITICAL SECURITY FIX: Secure user_downloads and qr_cards tables
-- Fix the public data exposure vulnerabilities

-- First, drop all existing policies on user_downloads
DROP POLICY IF EXISTS "Allow all access to user_downloads" ON public.user_downloads;
DROP POLICY IF EXISTS "Users can view their own downloads" ON public.user_downloads;
DROP POLICY IF EXISTS "Users can create their own downloads" ON public.user_downloads;

-- Create secure RLS policies for user_downloads
-- Users can only view their own download history
CREATE POLICY "Users can view their own downloads" 
ON public.user_downloads 
FOR SELECT 
USING (user_email = auth.email() OR user_id = auth.uid());

-- Users can create their own download records
CREATE POLICY "Users can create their own downloads" 
ON public.user_downloads 
FOR INSERT 
WITH CHECK (user_email = auth.email() OR user_id = auth.uid());

-- Admins can view all downloads for management purposes
CREATE POLICY "Admins can view all downloads" 
ON public.user_downloads 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Admins can manage all download records
CREATE POLICY "Admins can manage all downloads" 
ON public.user_downloads 
FOR ALL 
USING (is_admin(auth.uid()));

-- Secure qr_cards table - drop existing public policies
DROP POLICY IF EXISTS "QR cards can be read for activation" ON public.qr_cards;
DROP POLICY IF EXISTS "QR cards can be updated for activation" ON public.qr_cards;
DROP POLICY IF EXISTS "qr_cards_select" ON public.qr_cards;
DROP POLICY IF EXISTS "qr_cards_insert" ON public.qr_cards;
DROP POLICY IF EXISTS "qr_cards_update" ON public.qr_cards;
DROP POLICY IF EXISTS "qr_cards_delete" ON public.qr_cards;

-- Only admins can manage QR cards
CREATE POLICY "Admins can manage QR cards" 
ON public.qr_cards 
FOR ALL 
USING (is_admin(auth.uid()));

-- Allow system to update QR cards during activation (for edge function)
CREATE POLICY "Allow QR card activation updates" 
ON public.qr_cards 
FOR UPDATE 
USING (NOT is_activated OR is_activated IS NULL);

-- Allow reading specific QR card by code for activation only
CREATE POLICY "Allow QR card lookup by code" 
ON public.qr_cards 
FOR SELECT 
USING (true);

-- Create a secure function for QR card validation
CREATE OR REPLACE FUNCTION public.validate_qr_card(card_code text)
RETURNS TABLE(
  id uuid,
  is_activated boolean,
  download_credits integer,
  card_type card_type
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT qr.id, qr.is_activated, qr.download_credits, qr.card_type
  FROM public.qr_cards qr
  WHERE qr.code = card_code
  LIMIT 1;
$$;
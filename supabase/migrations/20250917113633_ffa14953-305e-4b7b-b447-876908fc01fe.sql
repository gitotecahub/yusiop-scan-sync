-- Fix security vulnerability: Restrict access to user_credits table
-- Remove the overly permissive policy that allows all access
DROP POLICY IF EXISTS "Allow all access to user_credits" ON public.user_credits;

-- Create secure RLS policies that only allow users to access their own records
CREATE POLICY "Users can view their own credits" 
ON public.user_credits 
FOR SELECT 
USING (user_email = auth.email());

CREATE POLICY "Users can update their own credits" 
ON public.user_credits 
FOR UPDATE 
USING (user_email = auth.email())
WITH CHECK (user_email = auth.email());

-- Allow edge functions and admin operations to insert new credit records
CREATE POLICY "Allow system to create credit records" 
ON public.user_credits 
FOR INSERT 
WITH CHECK (true);

-- Prevent users from deleting credit records (only system should do this)
CREATE POLICY "Prevent credit deletion" 
ON public.user_credits 
FOR DELETE 
USING (false);
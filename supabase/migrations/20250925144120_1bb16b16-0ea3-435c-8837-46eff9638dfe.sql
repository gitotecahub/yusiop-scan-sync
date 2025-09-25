-- Fix security vulnerability: Remove public access to user_sessions table
-- This table contains sensitive data like session tokens and user emails
DROP POLICY IF EXISTS "Allow all access to user_sessions" ON public.user_sessions;

-- Create secure RLS policies for user_sessions table
-- Users can only view their own session data
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (user_email = auth.email());

-- Users can create their own session records
CREATE POLICY "Users can create their own sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (user_email = auth.email());

-- Users can update their own session data
CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (user_email = auth.email())
WITH CHECK (user_email = auth.email());

-- Users can delete their own session records
CREATE POLICY "Users can delete their own sessions" 
ON public.user_sessions 
FOR DELETE 
USING (user_email = auth.email());
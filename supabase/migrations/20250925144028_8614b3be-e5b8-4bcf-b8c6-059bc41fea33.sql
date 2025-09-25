-- Fix security vulnerability: Remove public access to profiles table
-- This removes the policy that allows anyone to read all user profile data
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- The remaining policies already provide proper access control:
-- 1. "Users can view their own profile" - allows users to see only their own data
-- 2. "Users can update their own profile" - allows users to update only their own data  
-- 3. "Allow profile creation" - allows profile creation during signup
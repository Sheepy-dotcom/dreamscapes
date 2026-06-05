-- DreamScapes subscription security
-- Run this in Supabase SQL Editor so users cannot change their own paid plan.
-- RevenueCat webhook updates still work through the Supabase service role.

drop policy if exists "Users can update own profile" on public.profiles;

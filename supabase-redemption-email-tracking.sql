-- DreamScapes redeem code redemption tracking
-- Run this in Supabase SQL Editor so redemption rows show the email address.

alter table public.redeem_code_redemptions
add column if not exists redeem_code text;

alter table public.redeem_code_redemptions
add column if not exists user_email text;

update public.redeem_code_redemptions redemption
set
  redeem_code = coalesce(redemption.redeem_code, code.code),
  user_email = coalesce(
    redemption.user_email,
    (select profile.email from public.profiles profile where profile.id = redemption.user_id),
    (select auth_user.email from auth.users auth_user where auth_user.id = redemption.user_id)
  )
from public.redeem_codes code
where redemption.redeem_code_id = code.id
  and (
    redemption.redeem_code is null
    or redemption.user_email is null
  );

create index if not exists redeem_code_redemptions_email_idx
on public.redeem_code_redemptions (user_email, redeemed_at desc);

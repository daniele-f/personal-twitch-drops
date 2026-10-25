-- The account-wide restore action was removed from the product.
-- Retire its RPC without rewriting historical applied migrations.
drop function if exists public.restore_all_ignored_games();

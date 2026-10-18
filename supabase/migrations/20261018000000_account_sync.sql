create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme_color text not null default 'twitch-purple' check (theme_color in ('twitch-purple', 'electric-blue', 'neon-rose', 'emerald-glow', 'golden-amber')),
  show_subscriptions boolean not null default false,
  show_badges boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_favorite_games (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null check (game_id <> ''),
  game_name text not null check (game_name <> ''),
  added_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table public.user_ignored_games (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null check (game_id <> ''),
  game_name text not null check (game_name <> ''),
  ignored_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table public.user_collected_rewards (
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id text not null check (campaign_id <> ''),
  reward_name text not null check (reward_name <> ''),
  collected_at timestamptz not null default now(),
  cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, campaign_id, reward_name)
);

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger user_favorite_games_set_updated_at
before update on public.user_favorite_games
for each row execute function public.set_updated_at();

create trigger user_ignored_games_set_updated_at
before update on public.user_ignored_games
for each row execute function public.set_updated_at();

create trigger user_collected_rewards_set_updated_at
before update on public.user_collected_rewards
for each row execute function public.set_updated_at();

create index user_favorite_games_active_by_user_idx
on public.user_favorite_games (user_id, updated_at desc)
where removed_at is null;

create index user_ignored_games_active_by_user_idx
on public.user_ignored_games (user_id, updated_at desc)
where removed_at is null;

create index user_collected_rewards_active_by_user_idx
on public.user_collected_rewards (user_id, updated_at desc)
where cleared_at is null;

alter table public.user_settings enable row level security;
alter table public.user_favorite_games enable row level security;
alter table public.user_ignored_games enable row level security;
alter table public.user_collected_rewards enable row level security;

create policy "Users can select their own settings" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their own settings" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own settings" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own settings" on public.user_settings for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their own favorite games" on public.user_favorite_games for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their own favorite games" on public.user_favorite_games for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own favorite games" on public.user_favorite_games for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own favorite games" on public.user_favorite_games for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their own ignored games" on public.user_ignored_games for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their own ignored games" on public.user_ignored_games for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own ignored games" on public.user_ignored_games for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own ignored games" on public.user_ignored_games for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their own collected rewards" on public.user_collected_rewards for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their own collected rewards" on public.user_collected_rewards for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own collected rewards" on public.user_collected_rewards for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own collected rewards" on public.user_collected_rewards for delete to authenticated using ((select auth.uid()) = user_id);

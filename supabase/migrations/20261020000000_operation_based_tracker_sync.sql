-- Tracker mutations are deliberately state operations. The browser never sends user_id
-- or updated_at: auth.uid() and the existing updated_at triggers remain authoritative.

create or replace function public.apply_tracker_game_preference(p_action text, p_game_id text, p_game_name text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  if p_game_id is null or btrim(p_game_id) = '' then raise exception 'A game ID is required'; end if;

  if p_action = 'favorite' then
    if p_game_name is null or btrim(p_game_name) = '' then raise exception 'A game name is required'; end if;
    insert into public.user_favorite_games (user_id, game_id, game_name, removed_at)
    values (current_user_id, p_game_id, p_game_name, null)
    on conflict (user_id, game_id) do update set game_name = excluded.game_name, removed_at = null;
    update public.user_ignored_games set removed_at = now() where user_id = current_user_id and game_id = p_game_id and removed_at is null;
  elsif p_action = 'ignore' then
    if p_game_name is null or btrim(p_game_name) = '' then raise exception 'A game name is required'; end if;
    insert into public.user_ignored_games (user_id, game_id, game_name, removed_at)
    values (current_user_id, p_game_id, p_game_name, null)
    on conflict (user_id, game_id) do update set game_name = excluded.game_name, removed_at = null;
    update public.user_favorite_games set removed_at = now() where user_id = current_user_id and game_id = p_game_id and removed_at is null;
  elsif p_action = 'unfavorite' then
    update public.user_favorite_games set removed_at = now() where user_id = current_user_id and game_id = p_game_id and removed_at is null;
  elsif p_action = 'unignore' then
    update public.user_ignored_games set removed_at = now() where user_id = current_user_id and game_id = p_game_id and removed_at is null;
  else
    raise exception 'Unknown game preference action';
  end if;
end;
$$;

create or replace function public.set_tracker_settings(p_theme_color text, p_show_subscriptions boolean, p_show_badges boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  if p_theme_color not in ('twitch-purple', 'electric-blue', 'neon-rose', 'emerald-glow', 'golden-amber') then raise exception 'Invalid theme'; end if;
  insert into public.user_settings (user_id, theme_color, show_subscriptions, show_badges) values (current_user_id, p_theme_color, p_show_subscriptions, p_show_badges)
  on conflict (user_id) do update set theme_color = excluded.theme_color, show_subscriptions = excluded.show_subscriptions, show_badges = excluded.show_badges;
end;
$$;

create or replace function public.set_tracker_reward(p_campaign_id text, p_reward_name text, p_collected boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  if p_campaign_id is null or btrim(p_campaign_id) = '' or p_reward_name is null or btrim(p_reward_name) = '' then raise exception 'A campaign ID and reward name are required'; end if;
  if p_collected then
    insert into public.user_collected_rewards (user_id, campaign_id, reward_name, cleared_at) values (current_user_id, p_campaign_id, p_reward_name, null)
    on conflict (user_id, campaign_id, reward_name) do update set cleared_at = null;
  else
    update public.user_collected_rewards set cleared_at = now() where user_id = current_user_id and campaign_id = p_campaign_id and reward_name = p_reward_name and cleared_at is null;
  end if;
end;
$$;

create or replace function public.restore_all_ignored_games()
returns integer language plpgsql security invoker set search_path = '' as $$
declare current_user_id uuid := auth.uid(); restored integer;
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  update public.user_ignored_games set removed_at = now() where user_id = current_user_id and removed_at is null;
  get diagnostics restored = row_count;
  return restored;
end;
$$;

create or replace function public.import_tracker_preferences(p_snapshot jsonb, p_replace_existing boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
declare item jsonb; current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then raise exception 'A tracker snapshot is required'; end if;
  if p_replace_existing then
    update public.user_favorite_games set removed_at = now() where user_id = current_user_id and removed_at is null;
    update public.user_ignored_games set removed_at = now() where user_id = current_user_id and removed_at is null;
    update public.user_collected_rewards set cleared_at = now() where user_id = current_user_id and cleared_at is null;
  end if;
  for item in select value from jsonb_array_elements(coalesce(p_snapshot->'favorites', '[]'::jsonb)) loop
    perform public.apply_tracker_game_preference('favorite', item->>'gameId', item->>'gameName');
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_snapshot->'ignoredGames', '[]'::jsonb)) loop
    perform public.apply_tracker_game_preference('ignore', item->>'gameId', item->>'gameName');
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_snapshot->'collectedRewards', '[]'::jsonb)) loop
    perform public.set_tracker_reward(item->>'campaignId', item->>'rewardName', true);
  end loop;
  if p_snapshot ? 'settings' then
    perform public.set_tracker_settings(p_snapshot->'settings'->>'themeColor', (p_snapshot->'settings'->>'showSubscriptions')::boolean, (p_snapshot->'settings'->>'showBadges')::boolean);
  end if;
end;
$$;

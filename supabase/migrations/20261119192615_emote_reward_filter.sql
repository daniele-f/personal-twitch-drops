-- Preserve existing two-filter RPC overloads for older clients.
alter table public.user_settings add column show_emotes boolean not null default false;

create or replace function public.set_tracker_settings(p_show_subscriptions boolean, p_show_badges boolean, p_show_emotes boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  insert into public.user_settings (user_id, show_subscriptions, show_badges, show_emotes)
  values (current_user_id, p_show_subscriptions, p_show_badges, p_show_emotes)
  on conflict (user_id) do update set show_subscriptions = excluded.show_subscriptions,
    show_badges = excluded.show_badges, show_emotes = excluded.show_emotes;
end;
$$;

revoke execute on function public.set_tracker_settings(boolean, boolean, boolean) from public, anon;
grant execute on function public.set_tracker_settings(boolean, boolean, boolean) to authenticated;

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
    perform public.set_tracker_settings((p_snapshot->'settings'->>'showSubscriptions')::boolean, (p_snapshot->'settings'->>'showBadges')::boolean, coalesce((p_snapshot->'settings'->>'showEmotes')::boolean, false));
  end if;
end;
$$;

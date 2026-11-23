alter table public.user_favorite_games
  add column old_names text[] not null default '{}',
  add column name_observed_at timestamptz;
alter table public.user_ignored_games
  add column old_names text[] not null default '{}',
  add column name_observed_at timestamptz;

create function public.keep_tracker_game_old_names()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare previous_names text[] := '{}'; other_names text[];
begin
  if tg_op = 'UPDATE' then
    previous_names := old.old_names;
    if old.game_name <> old.game_id then
      previous_names := array_append(previous_names, old.game_name);
    end if;
  end if;

  if tg_table_name = 'user_favorite_games' then
    select array_append(old_names, game_name) into other_names
    from public.user_ignored_games where user_id = new.user_id and game_id = new.game_id;
  else
    select array_append(old_names, game_name) into other_names
    from public.user_favorite_games where user_id = new.user_id and game_id = new.game_id;
  end if;

  new.old_names := array(
    select btrim(name)
    from unnest(previous_names || new.old_names || other_names) with ordinality as names(name, position)
    where btrim(name) <> '' and btrim(name) <> btrim(new.game_name) and btrim(name) <> new.game_id
    group by btrim(name)
    order by min(position)
  );
  return new;
end;
$$;

create trigger user_favorite_games_keep_old_names
before insert or update of game_name, old_names on public.user_favorite_games
for each row execute function public.keep_tracker_game_old_names();

create trigger user_ignored_games_keep_old_names
before insert or update of game_name, old_names on public.user_ignored_games
for each row execute function public.keep_tracker_game_old_names();

revoke execute on function public.keep_tracker_game_old_names() from public, anon, authenticated;

create function public.record_tracker_game_name(
  p_list text, p_game_id text, p_game_name text, p_old_names text[], p_observed_at timestamptz default null
)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  observed_at timestamptz := case when p_observed_at is not null then least(p_observed_at, now()) end;
  observed_names text[] := array_remove(array_append(coalesce(p_old_names, '{}'), p_game_name), p_game_id);
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  if p_game_id is null or btrim(p_game_id) = '' or p_game_name is null or btrim(p_game_name) = '' then
    raise exception 'A game ID and name are required';
  end if;

  if p_list = 'favorite' then
    update public.user_favorite_games set
      game_name = case when observed_at >= coalesce(name_observed_at, '-infinity') then p_game_name else game_name end,
      name_observed_at = greatest(name_observed_at, observed_at),
      old_names = observed_names
    where user_id = current_user_id and game_id = p_game_id and removed_at is null
      and (observed_at > coalesce(name_observed_at, '-infinity')
        or (observed_at = name_observed_at and game_name <> p_game_name)
        or not (old_names || array[game_name]) @> observed_names);
  elsif p_list = 'ignore' then
    update public.user_ignored_games set
      game_name = case when observed_at >= coalesce(name_observed_at, '-infinity') then p_game_name else game_name end,
      name_observed_at = greatest(name_observed_at, observed_at),
      old_names = observed_names
    where user_id = current_user_id and game_id = p_game_id and removed_at is null
      and (observed_at > coalesce(name_observed_at, '-infinity')
        or (observed_at = name_observed_at and game_name <> p_game_name)
        or not (old_names || array[game_name]) @> observed_names);
  else
    raise exception 'Unknown game preference list';
  end if;
end;
$$;

revoke execute on function public.record_tracker_game_name(text, text, text, text[], timestamptz) from public, anon;
grant execute on function public.record_tracker_game_name(text, text, text, text[], timestamptz) to authenticated;

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
    perform public.apply_tracker_game_preference('favorite', item->>'gameId', coalesce(item->>'gameName', item->>'gameId'));
    if jsonb_typeof(item->'oldNames') = 'array' then
      perform public.record_tracker_game_name('favorite', item->>'gameId', coalesce(item->>'gameName', item->>'gameId'), array(select jsonb_array_elements_text(item->'oldNames')));
    end if;
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_snapshot->'ignoredGames', '[]'::jsonb)) loop
    perform public.apply_tracker_game_preference('ignore', item->>'gameId', item->>'gameName');
    if jsonb_typeof(item->'oldNames') = 'array' then
      perform public.record_tracker_game_name('ignore', item->>'gameId', item->>'gameName', array(select jsonb_array_elements_text(item->'oldNames')));
    end if;
  end loop;
  for item in select value from jsonb_array_elements(coalesce(p_snapshot->'collectedRewards', '[]'::jsonb)) loop
    perform public.set_tracker_reward(item->>'campaignId', item->>'rewardName', true);
  end loop;
  if p_snapshot ? 'settings' then
    perform public.set_tracker_settings((p_snapshot->'settings'->>'showSubscriptions')::boolean, (p_snapshot->'settings'->>'showBadges')::boolean, coalesce((p_snapshot->'settings'->>'showEmotes')::boolean, false));
  end if;
end;
$$;

-- Theme color is intentionally local to each browser. Keep the legacy RPC
-- available for older clients, but do not let it overwrite a stored theme.
create or replace function public.set_tracker_settings(p_theme_color text, p_show_subscriptions boolean, p_show_badges boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  insert into public.user_settings (user_id, show_subscriptions, show_badges) values (current_user_id, p_show_subscriptions, p_show_badges)
  on conflict (user_id) do update set show_subscriptions = excluded.show_subscriptions, show_badges = excluded.show_badges;
end;
$$;

create or replace function public.set_tracker_settings(p_show_subscriptions boolean, p_show_badges boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication is required'; end if;
  insert into public.user_settings (user_id, show_subscriptions, show_badges) values (current_user_id, p_show_subscriptions, p_show_badges)
  on conflict (user_id) do update set show_subscriptions = excluded.show_subscriptions, show_badges = excluded.show_badges;
end;
$$;

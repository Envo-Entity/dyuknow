-- Show the postcode exactly as the member typed it, instead of a looked-up
-- place name. Removes the place-name column and its function.

drop view public.talent_cards;
drop view public.venue_cards;
drop function public.set_my_area_name(text);
alter table public.talents drop column area_name;
alter table public.venues drop column area_name;

create view public.talent_cards with (security_barrier = true) as
  select m.id as member_id,
    case when m.deleted_at is null then t.full_name else 'Former member' end as full_name,
    case when m.deleted_at is null then t.photo_path end as photo_path,
    case when m.deleted_at is null then t.positions else '{}'::text[] end as positions,
    case when m.deleted_at is null then t.skills else '{}'::text[] end as skills,
    case when m.deleted_at is null then t.custom_skills else '{}'::text[] end as custom_skills,
    case when m.deleted_at is null then t.home_area end as home_area,
    case when m.deleted_at is null then t.bio end as bio,
    case when m.deleted_at is null then round(t.minimum_same_day_rate_gbp * 100)::integer end as minimum_pay_pence,
    case when m.deleted_at is null then private.verified_labels(m.id) else '{}'::text[] end as verified_documents,
    (m.approved and m.deleted_at is null) as active,
    case when m.deleted_at is null then t.home_postcode end as postcode
  from public.members m join public.talents t on t.member_id = m.id
  where m.id = (select private.current_member_id())
     or (m.approved and m.deleted_at is null and (select private.caller_is_approved('venue')))
     or m.id in (select private.contact_member_ids());

create view public.venue_cards with (security_barrier = true) as
  select m.id as member_id,
    case when m.deleted_at is null then v.display_name else 'Former member' end as display_name,
    case when m.deleted_at is null then v.photo_path end as photo_path,
    case when m.deleted_at is null then v.area end as area,
    case when m.deleted_at is null then v.bio end as bio,
    case when m.deleted_at is null then v.venue_types else '{}'::text[] end as venue_types,
    case when m.deleted_at is null then v.cuisines else '{}'::text[] end as cuisines,
    case when m.deleted_at is null then v.instagram_handle end as instagram_handle,
    case when m.deleted_at is null then private.verified_labels(m.id) else '{}'::text[] end as verified_documents,
    (m.approved and m.deleted_at is null) as active,
    case when m.deleted_at is null then v.postcode end as postcode
  from public.members m join public.venues v on v.member_id = m.id
  where m.id = (select private.current_member_id())
     or (m.approved and m.deleted_at is null and (select private.caller_is_approved('talent')))
     or m.id in (select private.contact_member_ids());

revoke all on public.talent_cards, public.venue_cards from anon, authenticated;
grant select on public.talent_cards, public.venue_cards to authenticated;

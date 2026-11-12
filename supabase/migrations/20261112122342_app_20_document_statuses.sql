-- Venues see each talent document's status, not only the verified ones.
-- talent_cards gains document_statuses: one entry per talent document type
-- with public_tick (so never the CV) that suits the talent's positions, or that
-- they've added anyway. Status is verified, added (waiting to be checked) or
-- not-added. A rejected document counts as not-added. No file, path or reason
-- is exposed. verified_documents stays for older app builds. Who can see a card
-- is unchanged.

create function private.document_statuses(p_member uuid, p_positions text[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'label', t.label,
           'status', case d.status when 'verified' then 'verified' when 'review' then 'added' else 'not-added' end)
         order by t.sort_order), '[]'::jsonb)
  from public.document_types t
  left join public.documents d on d.member_id = p_member and d.doc_type = t.code
  where t.side = 'talent' and t.public_tick
    and (private.doc_type_suits(t.code, 'talent', p_positions) or d.status in ('review', 'verified'));
$$;
revoke all on function private.document_statuses(uuid, text[]) from public, anon;
grant execute on function private.document_statuses(uuid, text[]) to authenticated;

create or replace view public.talent_cards with (security_barrier = true) as
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
    case when m.deleted_at is null then t.home_postcode end as postcode,
    case when m.deleted_at is null then private.document_statuses(m.id, t.positions) else '[]'::jsonb end as document_statuses
  from public.members m join public.talents t on t.member_id = m.id
  where m.id = (select private.current_member_id())
     or (m.approved and m.deleted_at is null and (select private.caller_is_approved('venue')))
     or m.id in (select private.contact_member_ids());

create table if not exists public.inspection_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  inspection_date timestamp without time zone not null,
  inspector_name text not null,
  store_name text not null,
  rubric_version text not null default '巡店评分表-v4',
  total_score integer not null default 0,
  max_score integer not null default 0,
  score_percent numeric(5, 2) not null default 0,
  answered_count integer not null default 0,
  total_questions integer not null default 0,
  section_summary text not null default '',
  answer_summary text not null default '',
  overall_notes text,
  operational_improvement_suggestions text,
  store_feedback text,
  answers jsonb not null default '[]'::jsonb,
  section_scores jsonb not null default '[]'::jsonb
);

alter table if exists public.inspection_submissions
  alter column created_at set default now(),
  alter column submitted_at set default now(),
  alter column inspection_date type timestamp without time zone using inspection_date::timestamp,
  alter column inspection_date set default now(),
  alter column rubric_version set default '巡店评分表-v6',
  alter column total_score set default 0,
  alter column max_score set default 0,
  alter column score_percent set default 0,
  alter column answered_count set default 0,
  alter column total_questions set default 0,
  alter column section_summary set default '',
  alter column answer_summary set default '',
  alter column answers set default '[]'::jsonb,
  alter column section_scores set default '[]'::jsonb;

alter table if exists public.inspection_submissions
  alter column inspection_date set not null,
  alter column inspector_name set not null,
  alter column store_name set not null,
  alter column rubric_version set not null,
  alter column total_score set not null,
  alter column max_score set not null,
  alter column score_percent set not null,
  alter column answered_count set not null,
  alter column total_questions set not null,
  alter column section_summary set not null,
  alter column answer_summary set not null,
  alter column answers set not null,
  alter column section_scores set not null;

alter table public.inspection_submissions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inspection_submissions'
      and policyname = 'Allow anonymous inserts for inspection submissions'
  ) then
    create policy "Allow anonymous inserts for inspection submissions"
      on public.inspection_submissions
      for insert
      to anon
      with check (true);
  end if;
end
$$;

create index if not exists inspection_submissions_store_name_idx
  on public.inspection_submissions (store_name);

create index if not exists inspection_submissions_inspection_date_idx
  on public.inspection_submissions (inspection_date desc);

create index if not exists inspection_submissions_rubric_version_idx
  on public.inspection_submissions (rubric_version);

create index if not exists inspection_submissions_total_score_idx
  on public.inspection_submissions (total_score desc);
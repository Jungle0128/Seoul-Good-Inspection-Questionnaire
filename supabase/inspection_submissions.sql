create table if not exists public.inspection_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  inspection_date date not null,
  inspector_name text not null,
  store_name text not null,
  rubric_version text not null default 'shop-inspection-v1',
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
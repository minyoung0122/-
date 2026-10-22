-- Supabase SQL Editor에 전체 실행하세요.
create table if not exists public.jjongi_scores (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 12),
  score integer not null check (score between 0 and 20000),
  created_at timestamptz not null default now()
);
create index if not exists jjongi_scores_rank_idx on public.jjongi_scores (score desc, created_at asc);
alter table public.jjongi_scores enable row level security;
create policy "public_can_read_scores" on public.jjongi_scores for select to anon using (true);
create policy "public_can_submit_scores" on public.jjongi_scores for insert to anon with check (true);
grant select (nickname, score, created_at) on public.jjongi_scores to anon;
grant insert (nickname, score) on public.jjongi_scores to anon;
grant usage, select on sequence public.jjongi_scores_id_seq to anon;
-- 주의: 공개 익명 랭킹은 누군가 개발자 도구로 점수를 조작할 수 있습니다.
-- 공정한 경쟁이 중요하다면 서버 측 검증/속도 제한을 추가해야 합니다.

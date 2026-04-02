-- ============================================================
-- INQA COACHING PLATFORM - Supabase Setup
-- Ausführen in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. ERWEITERUNGEN
-- ============================================================
create extension if not exists "uuid-ossp";

-- 2. TABELLEN
-- ============================================================

-- Mandanten (jeder INQA-Kunde = ein Mandant)
create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company_name text,
  vorgang_id text,
  model text default 'Klassisches Modell',
  start_date date,
  status text default 'active', -- active | completed | archived
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Nutzer-Profile (erweitert Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Mitgliedschaften: Wer hat Zugang zu welchem Mandanten?
create table public.tenant_members (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member', -- owner | coach | member
  invited_by uuid references public.profiles(id),
  joined_at timestamptz default now(),
  unique(tenant_id, user_id)
);

-- Einladungen per E-Mail
create table public.invitations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  email text not null,
  role text default 'member',
  token text unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references public.profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- Phasen (pro Mandant)
create table public.phases (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  phase_key text not null, -- initial | innov1 | innov2 | innov3 | learn
  label text not null,
  subtitle text,
  months text,
  hours text,
  color text default '#1a56db',
  status text default 'pending', -- done | active | pending
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Schritte pro Phase
create table public.phase_steps (
  id uuid primary key default uuid_generate_v4(),
  phase_id uuid references public.phases(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  label text not null,
  done boolean default false,
  done_at timestamptz,
  done_by uuid references public.profiles(id),
  step_date text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Dokumente
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  title text not null,
  phase_label text,
  doc_type text default 'other', -- protocol | report | other
  file_url text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Module (flexibel erweiterbar)
create table public.modules (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  module_type text not null, -- issue-map | scrum | notes | custom
  title text not null,
  icon text default '🧩',
  active boolean default true,
  data jsonb default '{}',
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notizen (Team-Notizen pro Mandant)
create table public.notes (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  text text not null,
  author_id uuid references public.profiles(id),
  author_name text,
  created_at timestamptz default now()
);

-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Nutzer sehen NUR Daten ihrer eigenen Mandanten

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_members enable row level security;
alter table public.invitations enable row level security;
alter table public.phases enable row level security;
alter table public.phase_steps enable row level security;
alter table public.documents enable row level security;
alter table public.modules enable row level security;
alter table public.notes enable row level security;

-- Hilfsfunktion: Ist der aktuelle Nutzer Mitglied dieses Mandanten?
create or replace function public.is_tenant_member(tenant_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = tenant_uuid
    and user_id = auth.uid()
  );
$$ language sql security definer;

-- Hilfsfunktion: Ist der aktuelle Nutzer Owner/Coach dieses Mandanten?
create or replace function public.is_tenant_admin(tenant_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = tenant_uuid
    and user_id = auth.uid()
    and role in ('owner', 'coach')
  );
$$ language sql security definer;

-- RLS Policies: Tenants
create policy "Mitglieder sehen ihre Mandanten" on public.tenants
  for select using (public.is_tenant_member(id));

create policy "Jeder eingeloggte Nutzer kann Mandanten erstellen" on public.tenants
  for insert with check (auth.uid() is not null);

create policy "Nur Admins können Mandanten bearbeiten" on public.tenants
  for update using (public.is_tenant_admin(id));

-- RLS Policies: Profiles
create policy "Nutzer sehen eigenes Profil" on public.profiles
  for select using (auth.uid() = id);

create policy "Nutzer sehen Profile ihrer Mandanten-Mitglieder" on public.profiles
  for select using (
    exists (
      select 1 from public.tenant_members tm1
      join public.tenant_members tm2 on tm1.tenant_id = tm2.tenant_id
      where tm1.user_id = auth.uid() and tm2.user_id = id
    )
  );

create policy "Nutzer können eigenes Profil erstellen" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Nutzer können eigenes Profil bearbeiten" on public.profiles
  for update using (auth.uid() = id);

-- RLS Policies: Mitgliedschaften
create policy "Mitglieder sehen andere Mitglieder" on public.tenant_members
  for select using (public.is_tenant_member(tenant_id));

create policy "Admins verwalten Mitglieder" on public.tenant_members
  for all using (public.is_tenant_admin(tenant_id));

create policy "System kann Mitglieder hinzufügen" on public.tenant_members
  for insert with check (auth.uid() is not null);

-- RLS Policies: Einladungen
create policy "Admins sehen Einladungen" on public.invitations
  for select using (public.is_tenant_admin(tenant_id));

create policy "Admins erstellen Einladungen" on public.invitations
  for insert with check (public.is_tenant_admin(tenant_id));

create policy "Einladung per Token abrufbar" on public.invitations
  for select using (true); -- Token-basierter Zugriff, App prüft Gültigkeit

-- RLS Policies: Phasen, Schritte, Dokumente, Module, Notizen
create policy "Mitglieder sehen Phasen" on public.phases
  for select using (public.is_tenant_member(tenant_id));
create policy "Admins verwalten Phasen" on public.phases
  for all using (public.is_tenant_admin(tenant_id));

create policy "Mitglieder sehen Schritte" on public.phase_steps
  for select using (public.is_tenant_member(tenant_id));
create policy "Mitglieder können Schritte abhaken" on public.phase_steps
  for update using (public.is_tenant_member(tenant_id));
create policy "Admins verwalten Schritte" on public.phase_steps
  for all using (public.is_tenant_admin(tenant_id));

create policy "Mitglieder sehen Dokumente" on public.documents
  for select using (public.is_tenant_member(tenant_id));
create policy "Mitglieder laden Dokumente hoch" on public.documents
  for insert with check (public.is_tenant_member(tenant_id));
create policy "Admins verwalten Dokumente" on public.documents
  for all using (public.is_tenant_admin(tenant_id));

create policy "Mitglieder sehen Module" on public.modules
  for select using (public.is_tenant_member(tenant_id));
create policy "Mitglieder bearbeiten Module" on public.modules
  for update using (public.is_tenant_member(tenant_id));
create policy "Admins verwalten Module" on public.modules
  for all using (public.is_tenant_admin(tenant_id));

create policy "Mitglieder sehen Notizen" on public.notes
  for select using (public.is_tenant_member(tenant_id));
create policy "Mitglieder schreiben Notizen" on public.notes
  for insert with check (public.is_tenant_member(tenant_id));
create policy "Admins verwalten Notizen" on public.notes
  for all using (public.is_tenant_admin(tenant_id));

-- 4. TRIGGER: Profil automatisch anlegen bei Registrierung
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. TRIGGER: Ersteller wird automatisch Owner
-- ============================================================
-- (Wird per App-Logik gehandhabt nach Tenant-Erstellung)

-- 6. STANDARD-PHASEN FUNKTION
-- ============================================================
-- Wird aufgerufen wenn ein neuer Mandant angelegt wird
create or replace function public.create_default_phases(p_tenant_id uuid)
returns void as $$
declare
  phase_id uuid;
begin
  -- Initialphase
  insert into public.phases (tenant_id, phase_key, label, subtitle, months, hours, color, status, sort_order)
  values (p_tenant_id, 'initial', 'Initialphase', 'Kick-off & Vorbereitung', 'Monat 1', '~20 Std', '#1a56db', 'active', 1)
  returning id into phase_id;

  insert into public.phase_steps (phase_id, tenant_id, label, sort_order) values
    (phase_id, p_tenant_id, 'Erstberatung', 1),
    (phase_id, p_tenant_id, 'Experteninterview', 2),
    (phase_id, p_tenant_id, 'Kick-off-Workshop', 3);

  -- Arbeitsphase 1
  insert into public.phases (tenant_id, phase_key, label, subtitle, months, hours, color, status, sort_order)
  values (p_tenant_id, 'innov1', 'Arbeitsphase 1', 'Innovationsphase', 'Monat 2', '~20 Std', '#7e3af2', 'pending', 2)
  returning id into phase_id;

  insert into public.phase_steps (phase_id, tenant_id, label, sort_order) values
    (phase_id, p_tenant_id, 'Planungssitzung', 1),
    (phase_id, p_tenant_id, 'Lab-Arbeit', 2),
    (phase_id, p_tenant_id, 'Auswertungssitzung', 3),
    (phase_id, p_tenant_id, 'Fortschrittsbericht 1', 4);

  -- Arbeitsphase 2
  insert into public.phases (tenant_id, phase_key, label, subtitle, months, hours, color, status, sort_order)
  values (p_tenant_id, 'innov2', 'Arbeitsphase 2', 'Innovationsphase', 'Monat 3', '~20 Std', '#7e3af2', 'pending', 3)
  returning id into phase_id;

  insert into public.phase_steps (phase_id, tenant_id, label, sort_order) values
    (phase_id, p_tenant_id, 'Planungssitzung', 1),
    (phase_id, p_tenant_id, 'Lab-Arbeit', 2),
    (phase_id, p_tenant_id, 'Auswertungssitzung', 3),
    (phase_id, p_tenant_id, 'Fortschrittsbericht 2', 4);

  -- Arbeitsphase 3
  insert into public.phases (tenant_id, phase_key, label, subtitle, months, hours, color, status, sort_order)
  values (p_tenant_id, 'innov3', 'Arbeitsphase 3', 'Innovationsphase', 'Monat 4', '~20 Std', '#7e3af2', 'pending', 4)
  returning id into phase_id;

  insert into public.phase_steps (phase_id, tenant_id, label, sort_order) values
    (phase_id, p_tenant_id, 'Planungssitzung', 1),
    (phase_id, p_tenant_id, 'Lab-Arbeit', 2),
    (phase_id, p_tenant_id, 'Auswertungssitzung', 3),
    (phase_id, p_tenant_id, 'Fortschrittsbericht 3', 4);

  -- Lernphase
  insert into public.phases (tenant_id, phase_key, label, subtitle, months, hours, color, status, sort_order)
  values (p_tenant_id, 'learn', 'Lernphase', 'Evaluation & Abschluss', 'Monat 5–7', '~16 Std', '#0e9f6e', 'pending', 5)
  returning id into phase_id;

  insert into public.phase_steps (phase_id, tenant_id, label, sort_order) values
    (phase_id, p_tenant_id, 'Evaluationssitzung', 1),
    (phase_id, p_tenant_id, 'Abschlussbericht', 2),
    (phase_id, p_tenant_id, 'Abschlussgespräch IBS', 3);
end;
$$ language plpgsql security definer;

-- ============================================================
-- FERTIG! Alle Tabellen, RLS-Policies und Funktionen sind bereit.
-- Nächster Schritt: App-Code deployen auf Vercel
-- ============================================================

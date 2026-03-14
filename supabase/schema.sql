create table if not exists public.events (
  id bigserial primary key,
  title text not null,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text not null unique,
  role text not null check (role in ('patient', 'doctor', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists users_role_created_at_idx on public.users (role, created_at desc);

alter table public.users enable row level security;

drop policy if exists "Users can view own profile row" on public.users;
create policy "Users can view own profile row" on public.users
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can update own profile row" on public.users;
create policy "Users can update own profile row" on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role in ('patient', 'doctor', 'admin')
  );

drop policy if exists "Admins can view all user rows" on public.users;
create policy "Admins can view all user rows" on public.users
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

insert into public.users (id, name, email, role, created_at)
select
  au.id,
  nullif(trim(coalesce(au.raw_user_meta_data ->> 'name', '')), '') as name,
  au.email,
  coalesce(au.raw_app_meta_data ->> 'role', au.raw_user_meta_data ->> 'role', 'patient') as role,
  coalesce(au.created_at, now()) as created_at
from auth.users au
where au.email is not null
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role;

create or replace function public.sync_auth_user_to_public_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, role, created_at)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
    new.email,
    coalesce(new.raw_app_meta_data ->> 'role', new.raw_user_meta_data ->> 'role', 'patient'),
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_synced_to_public_users on auth.users;
create trigger on_auth_user_synced_to_public_users
after insert or update on auth.users
for each row
execute function public.sync_auth_user_to_public_users();

alter table public.events enable row level security;

drop policy if exists "Allow authenticated read" on public.events;
create policy "Allow authenticated read" on public.events
  for select
  to authenticated
  using (true);

-- optional write policy for testing
drop policy if exists "Allow authenticated insert" on public.events;
create policy "Allow authenticated insert" on public.events
  for insert
  to authenticated
  with check (true);

do $$
begin
  if exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'events'
  ) then
    alter publication supabase_realtime drop table public.events;
  end if;
end
$$;
alter publication supabase_realtime add table public.events;

create table if not exists public.patients (
  id bigserial primary key,
  full_name text not null,
  email text,
  user_id uuid unique references auth.users(id) on delete set null,
  age int,
  disease text,
  notes text,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.patients add column if not exists user_id uuid unique references auth.users(id) on delete set null;
alter table public.patients add column if not exists disease text;

alter table public.patients enable row level security;

drop policy if exists "Doctors can view own patients" on public.patients;
create policy "Doctors can view own patients" on public.patients
  for select
  to authenticated
  using (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
  );

drop policy if exists "Doctors can add own patients" on public.patients;
create policy "Doctors can add own patients" on public.patients
  for insert
  to authenticated
  with check (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
  );

drop policy if exists "Doctors can update own patients" on public.patients;
create policy "Doctors can update own patients" on public.patients
  for update
  to authenticated
  using (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
  )
  with check (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
  );

drop policy if exists "Patients can view own profile" on public.patients;
create policy "Patients can view own profile" on public.patients
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  );

create table if not exists public.vitals (
  id bigserial primary key,
  patient_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bp', 'glucose', 'weight', 'heart_rate', 'oxygen')),
  value text not null,
  "timestamp" timestamptz not null default now()
);

create index if not exists vitals_patient_id_timestamp_idx on public.vitals (patient_id, "timestamp" desc);

alter table public.vitals enable row level security;

drop policy if exists "Patients can add own vitals" on public.vitals;
create policy "Patients can add own vitals" on public.vitals
  for insert
  to authenticated
  with check (
    patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  );

drop policy if exists "Patients can view own vitals" on public.vitals;
create policy "Patients can view own vitals" on public.vitals
  for select
  to authenticated
  using (
    patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  );

drop policy if exists "Doctors can view assigned patient vitals" on public.vitals;
create policy "Doctors can view assigned patient vitals" on public.vitals
  for select
  to authenticated
  using (
    (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
    and exists (
      select 1
      from public.patients p
      where p.user_id = vitals.patient_id and p.doctor_id = auth.uid()
    )
  );

create table if not exists public.alerts (
  id bigserial primary key,
  patient_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bp', 'glucose', 'weight', 'heart_rate', 'oxygen')),
  severity text not null default 'critical' check (severity in ('low', 'medium', 'high', 'critical')),
  message text not null,
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'resolved'))
);

create index if not exists alerts_patient_id_created_at_idx on public.alerts (patient_id, created_at desc);
create index if not exists alerts_status_created_at_idx on public.alerts (status, created_at desc);

alter table public.alerts enable row level security;

drop policy if exists "Patients can view own alerts" on public.alerts;
create policy "Patients can view own alerts" on public.alerts
  for select
  to authenticated
  using (
    patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  );

drop policy if exists "Patients can insert own alerts" on public.alerts;
create policy "Patients can insert own alerts" on public.alerts
  for insert
  to authenticated
  with check (
    patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  );

drop policy if exists "Doctors can view assigned patient alerts" on public.alerts;
create policy "Doctors can view assigned patient alerts" on public.alerts
  for select
  to authenticated
  using (
    (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
    and exists (
      select 1
      from public.patients p
      where p.user_id = alerts.patient_id and p.doctor_id = auth.uid()
    )
  );

create table if not exists public.messages (
  id bigserial primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  "timestamp" timestamptz not null default now()
);

alter table public.messages add column if not exists created_at timestamptz;
update public.messages
set created_at = coalesce(created_at, "timestamp", now())
where created_at is null;
alter table public.messages alter column created_at set default now();
alter table public.messages alter column created_at set not null;

create index if not exists messages_sender_receiver_timestamp_idx
  on public.messages (sender_id, receiver_id, "timestamp" desc);
create index if not exists messages_receiver_sender_timestamp_idx
  on public.messages (receiver_id, sender_id, "timestamp" desc);
create index if not exists messages_sender_receiver_created_at_idx
  on public.messages (sender_id, receiver_id, created_at desc);

alter table public.messages enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'messages'
  ) then
    alter publication supabase_realtime drop table public.messages;
  end if;
end
$$;
alter publication supabase_realtime add table public.messages;

drop policy if exists "Users can view own messages" on public.messages;
create policy "Users can view own messages" on public.messages
  for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Patient can message assigned doctor" on public.messages;
create policy "Patient can message assigned doctor" on public.messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
    and exists (
      select 1
      from public.patients p
      where p.user_id = sender_id and p.doctor_id = receiver_id
    )
  );

drop policy if exists "Doctor can message assigned patient" on public.messages;
create policy "Doctor can message assigned patient" on public.messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
    and exists (
      select 1
      from public.patients p
      where p.user_id = receiver_id and p.doctor_id = sender_id
    )
  );

create table if not exists public.medications (
  id bigserial primary key,
  patient_id uuid not null references auth.users(id) on delete cascade,
  medicine_name text not null,
  dosage text not null,
  schedule text not null,
  reminder_time time not null,
  created_at timestamptz not null default now()
);

create index if not exists medications_patient_id_created_at_idx
  on public.medications (patient_id, created_at desc);

alter table public.medications enable row level security;

drop policy if exists "Patients can view own medications" on public.medications;
create policy "Patients can view own medications" on public.medications
  for select
  to authenticated
  using (
    patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  );

drop policy if exists "Doctors can view assigned patient medications" on public.medications;
create policy "Doctors can view assigned patient medications" on public.medications
  for select
  to authenticated
  using (
    (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
    and exists (
      select 1
      from public.patients p
      where p.user_id = medications.patient_id and p.doctor_id = auth.uid()
    )
  );

drop policy if exists "Doctors can assign medications to assigned patients" on public.medications;
create policy "Doctors can assign medications to assigned patients" on public.medications
  for insert
  to authenticated
  with check (
    (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
    and exists (
      select 1
      from public.patients p
      where p.user_id = medications.patient_id and p.doctor_id = auth.uid()
    )
  );

create table if not exists public.appointments (
  id bigserial primary key,
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  "date" timestamptz not null,
  type text not null check (type in ('video', 'clinic')),
  meeting_link text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.appointments add column if not exists meeting_link text;

create index if not exists appointments_patient_date_idx on public.appointments (patient_id, "date" desc);
create index if not exists appointments_doctor_date_idx on public.appointments (doctor_id, "date" desc);

alter table public.appointments enable row level security;

drop policy if exists "Patients can view own appointments" on public.appointments;
create policy "Patients can view own appointments" on public.appointments
  for select
  to authenticated
  using (
    patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  );

drop policy if exists "Patients can request appointments with assigned doctor" on public.appointments;
create policy "Patients can request appointments with assigned doctor" on public.appointments
  for insert
  to authenticated
  with check (
    patient_id = auth.uid()
    and status = 'pending'
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
    and exists (
      select 1
      from public.patients p
      where p.user_id = patient_id and p.doctor_id = doctor_id
    )
  );

drop policy if exists "Doctors can view assigned patient appointments" on public.appointments;
create policy "Doctors can view assigned patient appointments" on public.appointments
  for select
  to authenticated
  using (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
  );

drop policy if exists "Doctors can update appointment status" on public.appointments;
create policy "Doctors can update appointment status" on public.appointments
  for update
  to authenticated
  using (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
  )
  with check (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
    and status in ('approved', 'rejected')
  );

create table if not exists public.care_plans (
  id bigserial primary key,
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  condition text not null,
  goals text not null,
  instructions text not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_plans_patient_created_at_idx on public.care_plans (patient_id, created_at desc);
create index if not exists care_plans_doctor_created_at_idx on public.care_plans (doctor_id, created_at desc);

alter table public.care_plans enable row level security;

drop policy if exists "Patients can view own care plans" on public.care_plans;
create policy "Patients can view own care plans" on public.care_plans
  for select
  to authenticated
  using (
    patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  );

drop policy if exists "Doctors can manage assigned patient care plans" on public.care_plans;
create policy "Doctors can manage assigned patient care plans" on public.care_plans
  for all
  to authenticated
  using (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
    and exists (
      select 1
      from public.patients p
      where p.user_id = care_plans.patient_id
        and p.doctor_id = auth.uid()
    )
  )
  with check (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
    and exists (
      select 1
      from public.patients p
      where p.user_id = care_plans.patient_id
        and p.doctor_id = auth.uid()
    )
  );

create table if not exists public.educational_content (
  id bigserial primary key,
  title text not null,
  category text not null,
  language text not null default 'en',
  summary text not null,
  body text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists educational_content_category_created_at_idx
  on public.educational_content (category, created_at desc);

alter table public.educational_content enable row level security;

drop policy if exists "All authenticated can read education content" on public.educational_content;
create policy "All authenticated can read education content" on public.educational_content
  for select
  to authenticated
  using (true);

drop policy if exists "Doctors and admins can create education content" on public.educational_content;
create policy "Doctors and admins can create education content" on public.educational_content
  for insert
  to authenticated
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') in ('doctor', 'admin')
  );

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_role text not null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_created_at_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_action_created_at_idx on public.audit_logs (action, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "Users can insert own audit logs" on public.audit_logs;
create policy "Users can insert own audit logs" on public.audit_logs
  for insert
  to authenticated
  with check (actor_id = auth.uid());

drop policy if exists "Admins can read all audit logs" on public.audit_logs;
create policy "Admins can read all audit logs" on public.audit_logs
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

create table if not exists public.emergency_contacts (
  id bigserial primary key,
  patient_id uuid not null references auth.users(id) on delete cascade,
  contact_name text not null,
  relation text,
  phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists emergency_contacts_patient_created_at_idx
  on public.emergency_contacts (patient_id, created_at desc);

alter table public.emergency_contacts enable row level security;

drop policy if exists "Patients can manage own emergency contacts" on public.emergency_contacts;
create policy "Patients can manage own emergency contacts" on public.emergency_contacts
  for all
  to authenticated
  using (
    patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  )
  with check (
    patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  );

create table if not exists public.emergency_events (
  id bigserial primary key,
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid references auth.users(id) on delete set null,
  triggered_by uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.emergency_events
  drop constraint if exists emergency_events_status_check;
alter table public.emergency_events
  add constraint emergency_events_status_check
  check (status in ('open', 'acknowledged', 'resolved'));

create index if not exists emergency_events_patient_created_at_idx
  on public.emergency_events (patient_id, created_at desc);
create index if not exists emergency_events_doctor_created_at_idx
  on public.emergency_events (doctor_id, created_at desc);

alter table public.emergency_events enable row level security;

drop policy if exists "Patients can create/view own emergency events" on public.emergency_events;
create policy "Patients can create/view own emergency events" on public.emergency_events
  for all
  to authenticated
  using (
    patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  )
  with check (
    triggered_by = auth.uid()
    and patient_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient')
  );

drop policy if exists "Doctors can view assigned emergency events" on public.emergency_events;
create policy "Doctors can view assigned emergency events" on public.emergency_events
  for select
  to authenticated
  using (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
  );

drop policy if exists "Doctors can resolve assigned emergency events" on public.emergency_events;
create policy "Doctors can resolve assigned emergency events" on public.emergency_events
  for update
  to authenticated
  using (
    doctor_id = auth.uid()
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
  )
  with check (
    doctor_id = auth.uid()
    and status in ('open', 'acknowledged', 'resolved')
    and (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor')
  );

do $$
begin
  if exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'emergency_events'
  ) then
    alter publication supabase_realtime drop table public.emergency_events;
  end if;
end
$$;
alter publication supabase_realtime add table public.emergency_events;

insert into public.educational_content (title, category, language, summary, body, created_by)
select
  seed.title,
  seed.category,
  seed.language,
  seed.summary,
  seed.body,
  null
from (
  values
    (
      'Diabetes Daily Routine',
      'diabetes',
      'en',
      'Simple daily checklist for glucose, meals, hydration, and activity.',
      'Check fasting and post-meal glucose levels. Keep regular meal times, reduce refined sugar, hydrate well, and walk at least 30 minutes unless your doctor advises otherwise.'
    ),
    (
      'Hypertension Home Monitoring',
      'hypertension',
      'en',
      'How to correctly log blood pressure and lifestyle habits.',
      'Measure blood pressure after 5 minutes of rest, keep cuff at heart level, avoid caffeine before readings, and reduce sodium intake. Maintain a daily BP log for your doctor.'
    ),
    (
      'Heart Health Warning Signs',
      'heart_disease',
      'en',
      'Recognize high-risk symptoms and when to seek emergency help.',
      'If you experience chest pain, severe breathlessness, sudden weakness, or oxygen below 90%, seek emergency care immediately and notify your care team.'
    )
) as seed(title, category, language, summary, body)
where not exists (
  select 1 from public.educational_content ec where ec.title = seed.title
);

create table if not exists public.organizations (
  id bigserial primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id bigserial primary key,
  organization_id bigint not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'doctor', 'care_manager')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists org_members_org_user_idx
  on public.organization_members (organization_id, user_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "Members can view own organizations" on public.organizations;
create policy "Members can view own organizations" on public.organizations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can view all organizations" on public.organizations;
create policy "Admins can view all organizations" on public.organizations
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

drop policy if exists "Members can view own org memberships" on public.organization_members;
create policy "Members can view own org memberships" on public.organization_members
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can view all org memberships" on public.organization_members;
create policy "Admins can view all org memberships" on public.organization_members
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

create table if not exists public.providers (
  id bigserial primary key,
  user_id uuid unique references auth.users(id) on delete cascade,
  organization_id bigint references public.organizations(id) on delete set null,
  specialty text,
  npi text,
  created_at timestamptz not null default now()
);

create index if not exists providers_org_idx on public.providers (organization_id);

alter table public.providers enable row level security;

drop policy if exists "Providers can view own profile" on public.providers;
create policy "Providers can view own profile" on public.providers
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can view all providers" on public.providers;
create policy "Admins can view all providers" on public.providers
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

create table if not exists public.devices (
  id bigserial primary key,
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid references auth.users(id) on delete set null,
  organization_id bigint references public.organizations(id) on delete set null,
  device_type text not null check (device_type in ('bp_monitor', 'glucose_meter', 'weight_scale', 'pulse_oximeter', 'wearable')),
  manufacturer text,
  model text,
  serial_number text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (patient_id, serial_number)
);

create index if not exists devices_patient_created_at_idx
  on public.devices (patient_id, created_at desc);

alter table public.devices enable row level security;

drop policy if exists "Patients can view own devices" on public.devices;
create policy "Patients can view own devices" on public.devices
  for select
  to authenticated
  using (
    patient_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient'
  );

drop policy if exists "Doctors can view assigned patient devices" on public.devices;
create policy "Doctors can view assigned patient devices" on public.devices
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor'
    and exists (
      select 1
      from public.patients p
      where p.user_id = devices.patient_id
        and p.doctor_id = auth.uid()
    )
  );

drop policy if exists "Doctors can register assigned patient devices" on public.devices;
create policy "Doctors can register assigned patient devices" on public.devices
  for insert
  to authenticated
  with check (
    doctor_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor'
    and exists (
      select 1
      from public.patients p
      where p.user_id = devices.patient_id
        and p.doctor_id = auth.uid()
    )
  );

create table if not exists public.integration_configs (
  id bigserial primary key,
  organization_id bigint references public.organizations(id) on delete set null,
  provider text not null check (provider in ('fhir', 'epic', 'cerner', 'custom')),
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  base_url text not null,
  auth_type text not null default 'oauth2' check (auth_type in ('oauth2', 'api_key')),
  encrypted_access_token text,
  encrypted_refresh_token text,
  scopes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  last_synced_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_configs_provider_status_idx
  on public.integration_configs (provider, status);

alter table public.integration_configs enable row level security;

drop policy if exists "Admins can read integration configs" on public.integration_configs;
create policy "Admins can read integration configs" on public.integration_configs
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

drop policy if exists "Admins can manage integration configs" on public.integration_configs;
create policy "Admins can manage integration configs" on public.integration_configs
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

create table if not exists public.sync_jobs (
  id bigserial primary key,
  integration_config_id bigint references public.integration_configs(id) on delete set null,
  organization_id bigint references public.organizations(id) on delete set null,
  initiated_by uuid references auth.users(id) on delete set null,
  source text not null default 'fhir' check (source in ('fhir', 'device', 'manual')),
  operation text not null check (operation in ('pull_observations', 'push_appointments', 'pull_patients', 'device_ingest')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  processed_count int not null default 0,
  failed_count int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists sync_jobs_status_created_at_idx
  on public.sync_jobs (status, created_at desc);

alter table public.sync_jobs enable row level security;

drop policy if exists "Admins can read sync jobs" on public.sync_jobs;
create policy "Admins can read sync jobs" on public.sync_jobs
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

drop policy if exists "Admins can manage sync jobs" on public.sync_jobs;
create policy "Admins can manage sync jobs" on public.sync_jobs
  for all
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

create table if not exists public.integration_logs (
  id bigserial primary key,
  sync_job_id bigint references public.sync_jobs(id) on delete cascade,
  level text not null default 'info' check (level in ('info', 'warning', 'error')),
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists integration_logs_sync_job_created_at_idx
  on public.integration_logs (sync_job_id, created_at desc);

alter table public.integration_logs enable row level security;

drop policy if exists "Admins can read integration logs" on public.integration_logs;
create policy "Admins can read integration logs" on public.integration_logs
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

drop policy if exists "Admins can insert integration logs" on public.integration_logs;
create policy "Admins can insert integration logs" on public.integration_logs
  for insert
  to authenticated
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
  );

create table if not exists public.medication_adherence_logs (
  id bigserial primary key,
  medication_id bigint not null references public.medications(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('taken', 'missed', 'skipped')),
  note text,
  logged_at timestamptz not null default now()
);

create index if not exists medication_adherence_patient_logged_at_idx
  on public.medication_adherence_logs (patient_id, logged_at desc);
create index if not exists medication_adherence_medication_logged_at_idx
  on public.medication_adherence_logs (medication_id, logged_at desc);

alter table public.medication_adherence_logs enable row level security;

drop policy if exists "Patients can view own adherence logs" on public.medication_adherence_logs;
create policy "Patients can view own adherence logs" on public.medication_adherence_logs
  for select
  to authenticated
  using (
    patient_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient'
  );

drop policy if exists "Patients can insert own adherence logs" on public.medication_adherence_logs;
create policy "Patients can insert own adherence logs" on public.medication_adherence_logs
  for insert
  to authenticated
  with check (
    patient_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient'
    and exists (
      select 1
      from public.medications m
      where m.id = medication_adherence_logs.medication_id
        and m.patient_id = auth.uid()
    )
  );

drop policy if exists "Doctors can view assigned patient adherence logs" on public.medication_adherence_logs;
create policy "Doctors can view assigned patient adherence logs" on public.medication_adherence_logs
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor'
    and exists (
      select 1
      from public.patients p
      where p.user_id = medication_adherence_logs.patient_id
        and p.doctor_id = auth.uid()
    )
  );

create table if not exists public.alert_escalations (
  id bigserial primary key,
  alert_id bigint not null references public.alerts(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  escalated_by uuid not null references auth.users(id) on delete cascade,
  priority text not null default 'high' check (priority in ('high', 'critical')),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists alert_escalations_alert_created_idx
  on public.alert_escalations (alert_id, created_at desc);
create index if not exists alert_escalations_doctor_status_created_idx
  on public.alert_escalations (doctor_id, status, created_at desc);
create index if not exists alert_escalations_patient_status_created_idx
  on public.alert_escalations (patient_id, status, created_at desc);

alter table public.alert_escalations enable row level security;

drop policy if exists "Doctors can manage own alert escalations" on public.alert_escalations;
create policy "Doctors can manage own alert escalations" on public.alert_escalations
  for all
  to authenticated
  using (
    doctor_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor'
    and exists (
      select 1
      from public.patients p
      where p.user_id = alert_escalations.patient_id
        and p.doctor_id = auth.uid()
    )
  )
  with check (
    doctor_id = auth.uid()
    and escalated_by = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor'
    and exists (
      select 1
      from public.patients p
      where p.user_id = alert_escalations.patient_id
        and p.doctor_id = auth.uid()
    )
  );

drop policy if exists "Patients can view own escalations" on public.alert_escalations;
create policy "Patients can view own escalations" on public.alert_escalations
  for select
  to authenticated
  using (
    patient_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient'
  );

create table if not exists public.clinical_notes (
  id bigserial primary key,
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  is_patient_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists clinical_notes_patient_created_idx
  on public.clinical_notes (patient_id, created_at desc);
create index if not exists clinical_notes_doctor_created_idx
  on public.clinical_notes (doctor_id, created_at desc);

alter table public.clinical_notes enable row level security;

drop policy if exists "Doctors can manage assigned patient clinical notes" on public.clinical_notes;
create policy "Doctors can manage assigned patient clinical notes" on public.clinical_notes
  for all
  to authenticated
  using (
    doctor_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor'
    and exists (
      select 1
      from public.patients p
      where p.user_id = clinical_notes.patient_id
        and p.doctor_id = auth.uid()
    )
  )
  with check (
    doctor_id = auth.uid()
    and author_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'doctor'
    and exists (
      select 1
      from public.patients p
      where p.user_id = clinical_notes.patient_id
        and p.doctor_id = auth.uid()
    )
  );

drop policy if exists "Patients can view visible clinical notes" on public.clinical_notes;
create policy "Patients can view visible clinical notes" on public.clinical_notes
  for select
  to authenticated
  using (
    patient_id = auth.uid()
    and is_patient_visible = true
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'patient'
  );

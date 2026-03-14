# Hackathon AI Starter (Next.js 14 + Supabase)

## Stack
- Next.js 14 (App Router)
- Supabase (Auth, Postgres, Realtime)
- Tailwind CSS
- shadcn/ui-style setup
- Chart.js

## Pages
- `/login`
- `/signup`
- `/dashboard`
- `/patient/dashboard`
- `/patient/vitals`
- `/patient/appointments`
- `/patient/medications`
- `/patient/chat`
- `/patient/ai`
- `/doctor/dashboard`
- `/doctor/patients`
- `/doctor/appointments`
- `/doctor/patients/[id]`
- `/admin/dashboard`
- `/admin/manage-users`
- `/set-password`

## Setup
1. Use Node.js `18.17+` (recommended: Node 20 LTS).
2. Install deps:
   ```bash
   npm install
   ```
3. Copy env file:
   ```bash
   cp .env.example .env.local
   ```
4. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
   - Set `NEXT_PUBLIC_APP_URL` (example: `http://localhost:3000`) for invite email redirect.
   - Also set `SUPABASE_SERVICE_ROLE_KEY` for admin role-management API routes.
   - Set `OPENAI_API_KEY` to enable AI health intelligence (falls back to heuristic output if missing).
5. Run SQL in your Supabase SQL Editor:
   - `supabase/schema.sql`
6. Start app:
   ```bash
   npm run dev
   ```

## Notes
- Sidebar navigation is in the root layout.
- Self signup is enabled for `patient` and `doctor` with role-specific onboarding fields.
- Role-based routing is enabled:
  - `patient` -> `/patient/dashboard`
  - `doctor` -> `/doctor/dashboard`
  - `admin` -> `/admin/dashboard`
- Access is protected in middleware; mismatched roles are redirected to the correct dashboard.
- Dashboard listens to realtime changes on `public.events`.
- Doctor flow:
  - Add new patient (Next.js server action)
  - View all patients assigned to logged-in doctor
  - View patient details page
- Vitals monitoring module:
  - Patients can add new vital readings (`bp`, `glucose`, `weight`, `heart_rate`, `oxygen`)
  - Patients can view vitals history and chart trends
  - Doctors can view patient vitals and trend charts per patient details page
- Alert monitoring module:
  - Automated alert detection on vital submission:
    - `glucose > 200`
    - `bp (systolic) > 140`
    - `oxygen < 90`
  - Doctors dashboard displays patient alerts panel with severity and timestamps
- Messaging module:
  - Real-time chat between doctor and patient using Supabase realtime (`messages` table)
  - Patient can message assigned doctor from patient dashboard
  - Doctor can message patient from patient details page
- Medication module:
  - Doctors assign medications on patient details page
  - Patients see medication schedule and reminder times on dashboard
- Appointment module:
  - Patients can request `video` or `clinic` appointments
  - Doctors can approve/reject pending appointment requests
  - Patient dashboard shows appointment calendar/status list
- AI Health Intelligence module:
  - Runs analysis on patient vitals history
  - Outputs risk score, observation, recommendation, and anomaly detection
  - Uses OpenAI API with safe heuristic fallback when API key is unavailable
- Admin dashboard includes role management UI backed by:
  - `GET /api/admin/users`
  - `POST /api/admin/users` (`mode=invite` email flow or `mode=password` temporary password flow)
  - `PATCH /api/admin/users/:id/role`
  - `PATCH /api/admin/users/:id/password`

## Role Setup In Supabase
Set each user's role in Supabase Auth metadata as one of: `patient`, `doctor`, `admin`.
- Preferred: `app_metadata.role`
- Supported fallback: `user_metadata.role`

## Vitals Schema
`supabase/schema.sql` now includes:
- `public.vitals` table
- RLS for patient write/read and doctor assigned-patient read
- `public.patients.user_id` linking for doctor monitoring
- `public.alerts` table with RLS for patient insert/read and doctor assigned-patient read
- `public.messages` table with RLS for assigned doctor-patient messaging
- `public.medications` table with RLS for doctor assignment and patient visibility
- `public.appointments` table with RLS for patient booking and doctor approval flow

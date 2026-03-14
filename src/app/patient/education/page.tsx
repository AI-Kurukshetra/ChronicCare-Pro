import { BookOpenText } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserRole } from '@/lib/auth/roles';
import { APP_TITLE } from '@/lib/branding';
import { formatUtcDate } from '@/lib/date-format';
import { createClient } from '@/lib/supabase/server';

type EducationRow = {
  id: number;
  title: string;
  category: string;
  language: string;
  summary: string;
  body: string;
  created_at: string;
};

export default async function PatientEducationPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (getUserRole(user) !== 'patient') redirect('/login');

  const { data: patient } = await supabase.from('patients').select('disease').eq('user_id', user.id).maybeSingle();
  const disease = patient?.disease?.toLowerCase() ?? null;

  const { data: contentData } = await supabase
    .from('educational_content')
    .select('id,title,category,language,summary,body,created_at')
    .order('created_at', { ascending: false });

  const content = (contentData as EducationRow[] | null) ?? [];
  const recommended = disease
    ? content.filter((item) => item.category.toLowerCase().includes(disease) || disease.includes(item.category.toLowerCase()))
    : [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-700/60 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Patient Education</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Education Library</h1>
            <p className="max-w-2xl text-sm text-blue-100">Learn practical routines for diabetes, hypertension, and heart health management.</p>
            <p className="text-xs text-blue-200">{APP_TITLE}</p>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Educational Articles</p>
            <p className="text-2xl font-semibold">{content.length}</p>
          </div>
          <BookOpenText className="h-5 w-5 text-slate-700" />
        </CardContent>
      </Card>

      {recommended.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended For You</CardTitle>
            <CardDescription>Matched to your recorded condition.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommended.map((item) => (
              <div key={`recommended-${item.id}`} className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <p className="font-medium text-blue-900">{item.title}</p>
                <p className="mt-1 text-sm text-blue-800">{item.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Content</CardTitle>
          <CardDescription>Condition-aware guidance and lifestyle recommendations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {content.length === 0 && <p className="text-sm text-muted-foreground">No educational content available yet.</p>}
          {content.map((item) => (
            <div key={item.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{item.category}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{item.language.toUpperCase()}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Published {formatUtcDate(item.created_at)}</p>
              <p className="mt-3 text-sm text-muted-foreground">{item.summary}</p>
              <p className="mt-2 text-sm">{item.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

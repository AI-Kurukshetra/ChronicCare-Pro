import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Brain,
  Building2,
  Check,
  ClipboardList,
  HeartPulse,
  Hospital,
  MessageSquare,
  MonitorCheck,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
  Video
} from 'lucide-react';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/brand/brand-mark';
import { Card, CardContent } from '@/components/ui/card';
import { HeroDashboardPreview } from '@/components/marketing/hero-dashboard-preview';
import { APP_NAME } from '@/lib/branding';
import { getDashboardPathByRole, getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

const problemItems = [
  {
    icon: Stethoscope,
    title: 'Limited Continuous Monitoring',
    description: 'Doctors cannot manually track every chronic patient between visits.'
  },
  {
    icon: AlertTriangle,
    title: 'Late Warning Detection',
    description: 'Patients often miss warning signs until serious complications occur.'
  },
  {
    icon: Hospital,
    title: 'Rising Care Burden',
    description: 'Clinics need scalable systems to monitor larger chronic populations.'
  }
];

const featureCards = [
  {
    icon: Activity,
    title: 'Real-Time Vital Monitoring',
    description: 'Track blood pressure, glucose, heart rate, oxygen, and weight continuously.'
  },
  {
    icon: Brain,
    title: 'AI Health Insights',
    description: 'Detect risk patterns early and surface clinically relevant anomalies.'
  },
  {
    icon: MonitorCheck,
    title: 'Doctor Dashboard',
    description: 'Monitor all assigned patients from a single high-signal workspace.'
  },
  {
    icon: AlertTriangle,
    title: 'Smart Alerts',
    description: 'Get immediate notifications when patient vitals become critical.'
  },
  {
    icon: Video,
    title: 'Telehealth Integration',
    description: 'Run virtual follow-ups with secure messaging and consultation workflows.'
  }
];

const aiCards = [
  {
    icon: Bot,
    title: 'Risk Prediction',
    description: 'AI detects hidden patterns in vitals and estimates near-term risk shifts.'
  },
  {
    icon: Sparkles,
    title: 'Health Insights',
    description: 'Generate practical recommendations for lifestyle and treatment adherence.'
  },
  {
    icon: ShieldCheck,
    title: 'Smart Prioritization',
    description: 'Highlight high-risk patients first so doctors can intervene faster.'
  }
];

const steps = [
  {
    icon: HeartPulse,
    title: '1. Capture Data',
    description: 'Patients connect devices and log daily vitals.'
  },
  {
    icon: Brain,
    title: '2. AI Analysis',
    description: 'AI evaluates trends, anomalies, and risk escalation.'
  },
  {
    icon: AlertTriangle,
    title: '3. Early Intervention',
    description: 'Doctors receive alerts and act before complications worsen.'
  }
];

const testimonials = [
  {
    quote:
      'ChronicCare Pro helped us detect early warning signs in diabetic patients before complications occurred.',
    name: 'Dr. Elena Martinez',
    role: 'Endocrinologist, Northside Medical'
  },
  {
    quote:
      'Our remote monitoring team now triages high-risk patients in minutes, not hours.',
    name: 'Dr. Arjun Patel',
    role: 'Cardiology Lead, MetroCare Hospital'
  },
  {
    quote:
      'Patient engagement improved significantly after we adopted the alerts and coaching workflows.',
    name: 'Dr. Sophia Kim',
    role: 'Chronic Care Director, VitalHealth Network'
  }
];

const pricing = [
  {
    name: 'Starter',
    price: '$99',
    description: 'For small clinics starting remote chronic care programs.',
    features: ['Up to 100 patients', 'Vitals + alerts', 'Secure messaging', 'Basic analytics']
  },
  {
    name: 'Professional',
    price: '$349',
    description: 'For hospitals managing multi-specialty chronic care operations.',
    features: ['Up to 1,000 patients', 'Advanced AI insights', 'Care plan management', 'Priority support'],
    featured: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large healthcare systems with custom workflows and integrations.',
    features: ['Unlimited patients', 'Dedicated success manager', 'Custom integrations', 'Enterprise security']
  }
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const role = getUserRole(user);
  if (user && role) {
    redirect(getDashboardPathByRole(role));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative min-h-screen overflow-hidden border-b border-blue-200/60 bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 px-4 py-10 text-white shadow-xl md:px-8 md:py-14">
        <div className="mx-auto flex w-full max-w-[1240px] min-h-[calc(100svh-5rem)] items-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(255,255,255,0.22),transparent_42%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-[0.18em] text-blue-100">
                <BrandMark className="h-5 w-5 rounded" />
                {APP_NAME}
              </p>
              <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
                AI-Powered Remote Patient Monitoring for Modern Healthcare
              </h1>
              <p className="max-w-2xl text-sm text-blue-100 md:text-base">
                Monitor chronic patients in real time, detect health risks early, and improve patient outcomes with
                AI-driven insights.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-blue-900 hover:bg-blue-50">
                  <Link href="/signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/60 bg-white/10 text-white hover:bg-white/20">
                  <Link href="/login">
                    Book Demo
                    <PlayCircle className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <HeroDashboardPreview />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-12 md:px-8">
        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-700">The Problem</p>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Chronic care needs continuous visibility</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {problemItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="rounded-2xl border-blue-100/70 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
                  <CardContent className="space-y-3 p-5">
                    <span className="inline-flex rounded-lg bg-red-50 p-2">
                      <Icon className="h-5 w-5 text-red-700" />
                    </span>
                    <p className="text-lg font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-700">Product Features</p>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Everything care teams need in one platform</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="group rounded-2xl border-blue-100/70 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <CardContent className="space-y-3 p-5">
                    <span className="inline-flex rounded-lg bg-blue-50 p-2 transition group-hover:bg-blue-100">
                      <Icon className="h-5 w-5 text-blue-700" />
                    </span>
                    <p className="text-lg font-semibold">{feature.title}</p>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-700">Product Screens</p>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Built for real clinical workflows</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl border-blue-100/70 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <img
                  src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1400&q=80"
                  alt="Doctor dashboard view"
                  className="h-52 w-full rounded-xl border object-cover"
                />
                <p className="font-medium">Doctor Dashboard</p>
                <p className="text-sm text-muted-foreground">Live patient monitoring, alerts, and intervention queue.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-blue-100/70 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <img
                  src="https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1400&q=80"
                  alt="Patient monitoring charts"
                  className="h-52 w-full rounded-xl border object-cover"
                />
                <p className="font-medium">Patient Monitoring Charts</p>
                <p className="text-sm text-muted-foreground">Trend analysis for vitals across daily, weekly, and monthly views.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-blue-100/70 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <img
                  src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1400&q=80"
                  alt="Alert management panel"
                  className="h-52 w-full rounded-xl border object-cover"
                />
                <p className="font-medium">Alert Management</p>
                <p className="text-sm text-muted-foreground">Color-coded critical events with fast resolution actions.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-blue-100/70 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <img
                  src="https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?auto=format&fit=crop&w=1400&q=80"
                  alt="Health analytics dashboard"
                  className="h-52 w-full rounded-xl border object-cover"
                />
                <p className="font-medium">Patient Health Analytics</p>
                <p className="text-sm text-muted-foreground">Population-level outcomes and risk segmentation insights.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-blue-700">AI Intelligence</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">AI That Helps Doctors Save Lives</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {aiCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
                  <span className="inline-flex rounded-lg bg-blue-50 p-2">
                    <Icon className="h-5 w-5 text-blue-700" />
                  </span>
                  <p className="mt-3 font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-700">How It Works</p>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">From patient data to early intervention</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="rounded-2xl border-blue-100/70 shadow-sm">
                  <CardContent className="space-y-3 p-5">
                    <span className="inline-flex rounded-lg bg-blue-50 p-2">
                      <Icon className="h-5 w-5 text-blue-700" />
                    </span>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-700">Benefits</p>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Impact across the care ecosystem</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-2xl border-blue-100/70 shadow-sm">
              <CardContent className="space-y-2 p-5">
                <UsersRound className="h-5 w-5 text-blue-700" />
                <p className="font-semibold">For Doctors</p>
                <p className="text-sm text-muted-foreground">Monitor hundreds of patients efficiently and focus on high-risk cases first.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-emerald-100/70 shadow-sm">
              <CardContent className="space-y-2 p-5">
                <HeartPulse className="h-5 w-5 text-emerald-700" />
                <p className="font-semibold">For Patients</p>
                <p className="text-sm text-muted-foreground">Stay on track with chronic disease care through guided monitoring and reminders.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-orange-100/70 shadow-sm">
              <CardContent className="space-y-2 p-5">
                <Building2 className="h-5 w-5 text-orange-700" />
                <p className="font-semibold">For Hospitals</p>
                <p className="text-sm text-muted-foreground">Reduce emergency admissions and improve long-term outcome quality metrics.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-700">Testimonials</p>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Trusted by clinical teams</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name} className="rounded-2xl border-blue-100/70 shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <p className="text-sm text-slate-700">"{item.quote}"</p>
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-blue-700">Pricing</p>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Simple plans for every care organization</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {pricing.map((plan) => (
              <Card
                key={plan.name}
                className={`rounded-2xl shadow-sm ${plan.featured ? 'border-2 border-blue-500 bg-blue-50/30' : 'border-blue-100/70'}`}
              >
                <CardContent className="space-y-4 p-5">
                  <div>
                    <p className="text-lg font-semibold">{plan.name}</p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">{plan.price}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="space-y-2">
                    {plan.features.map((feature) => (
                      <p key={feature} className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <Check className="h-4 w-4 text-emerald-600" />
                        {feature}
                      </p>
                    ))}
                  </div>
                  <Button className="w-full" variant={plan.featured ? 'default' : 'outline'}>
                    Choose {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </div>

      <section className="mt-12 border-y border-blue-200/60 bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-700 px-4 py-10 text-white shadow-xl md:px-8 md:py-12">
        <div className="mx-auto w-full max-w-[1240px]">
          <p className="text-xs uppercase tracking-[0.18em] text-blue-200">Final CTA</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-4xl">Transform Chronic Care with AI</h2>
          <p className="mt-3 max-w-2xl text-sm text-blue-100 md:text-base">
            Start proactive monitoring, reduce preventable complications, and scale better outcomes across your care network.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-blue-900 hover:bg-blue-50">
              <Link href="/signup">Start Monitoring Patients Today</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/60 bg-white/10 text-white hover:bg-white/20">
              <Link href="/login">Schedule a Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="mt-10 border-t border-blue-100 bg-white px-4 py-8 md:px-8">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <BrandMark className="h-6 w-6 rounded-md" />
            {APP_NAME}
          </p>
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            AI-powered chronic disease monitoring platform for modern healthcare teams.
          </p>
        </div>
      </footer>
    </div>
  );
}

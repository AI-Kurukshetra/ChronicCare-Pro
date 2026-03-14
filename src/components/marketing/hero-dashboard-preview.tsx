'use client';

import { Activity, AlertTriangle, HeartPulse, Siren } from 'lucide-react';

const glucoseSeries = [132, 140, 136, 148, 145, 154, 149, 158];
const bpSeries = [118, 121, 119, 126, 124, 129, 127, 131];

function toPoints(values: number[], width: number, height: number) {
  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;
  const stepX = width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = Math.round(index * stepX * 100) / 100;
      const y = Math.round((height - ((value - min) / (max - min)) * height) * 100) / 100;
      return `${x},${y}`;
    })
    .join(' ');
}

export function HeroDashboardPreview() {
  const width = 320;
  const height = 120;
  const glucosePoints = toPoints(glucoseSeries, width, height);
  const bpPoints = toPoints(bpSeries, width, height);
  const latestGlucose = glucoseSeries[glucoseSeries.length - 1];

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-sm md:p-5">
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/25 bg-white/10 p-3">
            <p className="text-[11px] uppercase tracking-wide text-blue-100">Monitored</p>
            <p className="mt-1 text-lg font-semibold">184</p>
            <p className="text-[11px] text-blue-100">Active patients</p>
          </div>
          <div className="rounded-xl border border-white/25 bg-white/10 p-3">
            <p className="text-[11px] uppercase tracking-wide text-blue-100">Critical</p>
            <p className="mt-1 inline-flex items-center gap-1 text-lg font-semibold text-red-100">
              <Siren className="h-4 w-4 animate-pulse" />
              12
            </p>
            <p className="text-[11px] text-red-100/90">Need intervention</p>
          </div>
          <div className="rounded-xl border border-white/25 bg-white/10 p-3">
            <p className="text-[11px] uppercase tracking-wide text-blue-100">Risk Score</p>
            <p className="mt-1 text-lg font-semibold">78%</p>
            <p className="text-[11px] text-orange-100">Rising trend</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.55fr_0.85fr]">
          <div className="rounded-xl border border-white/25 bg-white/10 p-3">
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-blue-100">
              <Activity className="h-3.5 w-3.5" />
              Live Vitals Overview
            </p>
            <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-32 w-full">
              <defs>
                <linearGradient id="glucose-gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="bp-gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[1, 2, 3].map((line) => (
                <line
                  key={line}
                  x1="0"
                  x2={width}
                  y1={(height / 4) * line}
                  y2={(height / 4) * line}
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="1"
                />
              ))}

              <polygon
                points={`0,${height} ${glucosePoints} ${width},${height}`}
                fill="url(#glucose-gradient)"
              />
              <polyline points={glucosePoints} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />

              <polygon points={`0,${height} ${bpPoints} ${width},${height}`} fill="url(#bp-gradient)" />
              <polyline points={bpPoints} fill="none" stroke="#7dd3fc" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-blue-100">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Glucose</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-300" /> Systolic BP</span>
              <span className="inline-flex items-center gap-1">Latest Glucose: {latestGlucose} mg/dL</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-white/25 bg-white/10 p-3">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-blue-100">
                <HeartPulse className="h-3.5 w-3.5" />
                Health Load
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="relative h-14 w-14 rounded-full"
                  style={{ background: 'conic-gradient(#22c55e 0 62%, #fb923c 62% 82%, #ef4444 82% 100%)' }}
                >
                  <div className="absolute inset-[6px] rounded-full bg-blue-900/90" />
                </div>
                <div>
                  <p className="text-lg font-semibold">62%</p>
                  <p className="text-[11px] text-blue-100">Stable population</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-red-200/40 bg-red-500/20 p-3">
              <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-red-100">
                <AlertTriangle className="h-3.5 w-3.5" />
                Priority Alert
              </p>
              <p className="mt-1 text-xs text-red-100">Patient #A-102 oxygen trend dropped below threshold.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, UserCircle2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toaster';
import { type AppRole } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

type LocalProfile = {
  displayName: string;
  phone: string;
  bio: string;
  specialty: string;
  condition: string;
  experienceYears: string;
  avatarUrl: string;
};

const emptyProfile: LocalProfile = {
  displayName: '',
  phone: '',
  bio: '',
  specialty: '',
  condition: '',
  experienceYears: '',
  avatarUrl: ''
};

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function ProfileMenu({
  userId,
  role,
  userName,
  userEmail,
  isCollapsed
}: {
  userId: string;
  role: AppRole;
  userName: string | null;
  userEmail: string | null;
  isCollapsed: boolean;
}) {
  const { toast } = useToast();
  const storageKey = `ccp_profile_${userId}`;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<LocalProfile>(emptyProfile);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LocalProfile;
        setProfile({ ...emptyProfile, ...parsed });
        return;
      } catch {}
    }
    setProfile((prev) => ({
      ...prev,
      displayName: userName ?? userEmail ?? ''
    }));
  }, [storageKey, userEmail, userName]);

  const displayName = profile.displayName || userName || userEmail || 'User';
  const initials = useMemo(() => getInitials(displayName || 'U'), [displayName]);

  function saveProfile() {
    setSaving(true);
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
    setSaving(false);
    setOpen(false);
    toast({ title: 'Profile updated', description: 'Your profile details were saved locally.', variant: 'success' });
  }

  async function onUploadImage(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/profile-image', {
      method: 'POST',
      body: formData
    });
    const result = (await response.json()) as { error?: string; url?: string };
    setUploading(false);

    if (!response.ok || !result.url) {
      toast({ title: 'Image upload failed', description: result.error ?? 'Could not upload image.', variant: 'error' });
      return;
    }

    setProfile((prev) => ({ ...prev, avatarUrl: result.url ?? '' }));
    toast({ title: 'Image uploaded', description: 'Profile image saved to local uploads folder.', variant: 'success' });
  }

  return (
    <>
      <button
        type="button"
        className={cn('mb-3 flex w-full items-center gap-3 rounded-lg border border-blue-700/60 p-2 text-left hover:bg-blue-800/70', isCollapsed && 'justify-center')}
        onClick={() => setOpen(true)}
        title="Open profile"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : isCollapsed ? (
            <UserCircle2 className="h-5 w-5" />
          ) : (
            initials
          )}
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-blue-200 capitalize">{role}</p>
          </div>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-white p-5 text-slate-900 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-semibold">Update Profile</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle2 className="h-8 w-8 text-slate-500" />
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Camera className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void onUploadImage(file);
                    }}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-name">Display Name</Label>
                <Input
                  id="profile-name"
                  value={profile.displayName}
                  onChange={(event) => setProfile((prev) => ({ ...prev, displayName: event.target.value }))}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-phone">Phone</Label>
                <Input
                  id="profile-phone"
                  value={profile.phone}
                  onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="+1..."
                />
              </div>

              {role === 'doctor' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="profile-specialty">Specialty</Label>
                    <Input
                      id="profile-specialty"
                      value={profile.specialty}
                      onChange={(event) => setProfile((prev) => ({ ...prev, specialty: event.target.value }))}
                      placeholder="Cardiology"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-experience">Experience (years)</Label>
                    <Input
                      id="profile-experience"
                      value={profile.experienceYears}
                      onChange={(event) => setProfile((prev) => ({ ...prev, experienceYears: event.target.value }))}
                      placeholder="8"
                    />
                  </div>
                </>
              )}

              {role === 'patient' && (
                <div className="space-y-2">
                  <Label htmlFor="profile-condition">Primary Condition</Label>
                  <Input
                    id="profile-condition"
                    value={profile.condition}
                    onChange={(event) => setProfile((prev) => ({ ...prev, condition: event.target.value }))}
                    placeholder="Diabetes"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="profile-bio">About</Label>
                <textarea
                  id="profile-bio"
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={profile.bio}
                  onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))}
                  placeholder="Write a short profile note..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="text-black hover:text-black">
                  Cancel
                </Button>
                <Button type="button" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

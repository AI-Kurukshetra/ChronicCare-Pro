'use server';

import { revalidatePath } from 'next/cache';

import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export type UpdateAdminSettingsState = {
  error?: string;
  success?: string;
};

export async function updateAdminSettings(
  _prevState: UpdateAdminSettingsState,
  formData: FormData
): Promise<UpdateAdminSettingsState> {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const newPassword = String(formData.get('newPassword') ?? '').trim();

  if (newPassword && newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== 'admin') {
    return { error: 'Only admins can update this page.' };
  }

  const currentData = (user.user_metadata ?? {}) as Record<string, unknown>;
  const { error } = await supabase.auth.updateUser({
    ...(newPassword ? { password: newPassword } : {}),
    data: {
      ...currentData,
      full_name: fullName || null,
      phone: phone || null
    }
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/settings');
  revalidatePath('/admin/dashboard');
  return { success: newPassword ? 'Settings and password updated.' : 'Settings updated.' };
}

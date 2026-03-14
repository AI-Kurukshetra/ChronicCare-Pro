import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const contentTypeToExt: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

function sanitizeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required.' }, { status: 400 });
  }

  if (!Object.prototype.hasOwnProperty.call(contentTypeToExt, file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, and WEBP images are supported.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'Image must be smaller than 2MB.' }, { status: 400 });
  }

  const ext = contentTypeToExt[file.type];
  const fileName = `${sanitizeFilePart(user.id)}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
  const absolutePath = path.join(uploadDir, fileName);

  await fs.mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return NextResponse.json({
    url: `/uploads/profiles/${fileName}?v=${Date.now()}`
  });
}

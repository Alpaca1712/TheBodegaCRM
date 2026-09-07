'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSafeInternalRedirect } from '@/lib/auth/redirects';
import { createClient } from '@/lib/supabase/server';

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectedFromValue = formData.get('redirectedFrom');
  const redirectedFrom = getSafeInternalRedirect(
    typeof redirectedFromValue === 'string' ? redirectedFromValue : null
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('Sign in error:', error);
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect(redirectedFrom || '/leads');
}

export async function signOut() {
  const cookieStore = await cookies();

  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) {
      cookieStore.delete(cookie.name);
    }
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signIn(formData: FormData) {
  const supabase = createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Sign in error:', error);
    return { error: error.message };
  }
  
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUp(formData: FormData) {
  const supabase = createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000')}/callback`,
    },
  });
  
  if (error) {
    console.error('Sign up error:', error);
    return { error: error.message };
  }
  
  // Create profile entry for the new user
  if (data.user && !data.user.identities?.length) {
    // User already exists
    console.log('User already exists');
  } else if (data.user) {
    // New user - create profile
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            user_id: data.user.id,
            full_name: name,
          },
        ]);
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't return error - user is created, profile can be created later
      }
    } catch (err) {
      console.error('Error creating profile:', err);
    }
  }
  
  revalidatePath('/', 'layout');
  redirect('/signup/confirm');
}

export async function signOut() {
  const supabase = createClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Sign out error:', error);
    return { error: error.message };
  }
  
  revalidatePath('/', 'layout');
  redirect('/login');
}

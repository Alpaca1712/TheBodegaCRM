'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { signIn } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AuthForm() {
  return (
    <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-md bg-zinc-100" />}>
      <AuthFormInner />
    </Suspense>
  );
}

const inputClass = 'relative block w-full rounded-md border-0 py-3 px-4 text-zinc-900 dark:text-zinc-100 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-colors';

function AuthFormInner() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('password', data.password);
      const redirectedFrom = searchParams.get('redirectedFrom');
      if (redirectedFrom) formData.append('redirectedFrom', redirectedFrom);
      const result = await signIn(formData);
      if (result?.error) setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 rounded-md shadow-sm">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email address</label>
          <Input id="email" type="email" autoComplete="email" placeholder="Email address" className={inputClass} {...register('email')} disabled={isLoading} aria-invalid={!!errors.email} />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
          <Input id="password" type="password" autoComplete="current-password" placeholder="Password" className={inputClass} {...register('password')} disabled={isLoading} aria-invalid={!!errors.password} />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="group relative flex w-full justify-center rounded-md bg-red-600 py-3 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-colors">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Sign in</span>}
      </Button>
    </form>
  );
}

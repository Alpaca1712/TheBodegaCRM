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
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AuthForm() {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
      <AuthFormInner />
    </Suspense>
  );
}

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
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-3.5">
        <div>
          <Label htmlFor="email" className="mb-1.5">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@pigeonlabs.nyc"
            className="h-11 border-border bg-background"
            {...register('email')}
            disabled={isLoading}
            aria-invalid={!!errors.email}
          />
          {errors.email ? <p className="mt-1 text-sm text-destructive">{errors.email.message}</p> : null}
        </div>
        <div>
          <Label htmlFor="password" className="mb-1.5">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            className="h-11 border-border bg-background"
            {...register('password')}
            disabled={isLoading}
            aria-invalid={!!errors.password}
          />
          {errors.password ? <p className="mt-1 text-sm text-destructive">{errors.password.message}</p> : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        disabled={isLoading}
        className="h-11 w-full rounded-xl text-sm font-semibold"
      >
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
      </Button>
    </form>
  );
}

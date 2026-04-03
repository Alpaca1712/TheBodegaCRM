'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AuthMode = 'login' | 'signup';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type FormData = LoginFormData & Partial<Pick<SignupFormData, 'name'>>;

interface AuthFormProps {
  mode: AuthMode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  return (
    <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-md bg-zinc-100" />}>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}

function AuthFormInner({ mode }: AuthFormProps) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isLogin = mode === 'login';
  const schema = isLogin ? loginSchema : signupSchema;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
    },
  });
  
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('password', data.password);
      if (!isLogin && data.name) {
        formData.append('name', data.name);
      }
      const inviteToken = searchParams.get('invite_token');
      if (inviteToken) {
        formData.append('invite_token', inviteToken);
      }
      
      if (isLogin) {
        const result = await signIn(formData);
        if (result?.error) {
          setError(result.error);
        }
      } else {
        const result = await signUp(formData);
        if (result?.error) {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 rounded-md shadow-sm">
        {!isLogin && (
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Full name"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
        )}
        
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Email address"
            {...register('email')}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
        
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            placeholder="Password"
            {...register('password')}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
      </div>
      
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <div>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span>
              {isLogin ? 'Sign in' : 'Create account'}
            </span>
          )}
        </Button>
      </div>
      
      {isLogin && (
        <div className="text-center text-sm">
          <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
            Forgot your password?
          </a>
        </div>
      )}
    </form>
  );
}

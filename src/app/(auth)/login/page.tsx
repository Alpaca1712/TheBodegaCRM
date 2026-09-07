import { Metadata } from 'next';
import AuthForm from '@/components/auth/auth-form';
import { BodegaLogo } from '@/components/brand/bodega-logo';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to the Bodega console',
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(24,24,27,0.06),_transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(248,113,113,0.12),_transparent_55%)]"
      />
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <BodegaLogo size="md" asHeading />
          </div>
          <p className="text-sm text-muted-foreground">
            Pigeon Labs console. Accounts are created in Supabase Auth.
          </p>
        </div>

        {params.error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-sm text-red-800 dark:text-red-300">{params.error}</p>
          </div>
        ) : null}
        {params.message ? (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
            <p className="text-sm text-blue-800 dark:text-blue-300">{params.message}</p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-zinc-950/[0.03]">
          <AuthForm />
        </div>
      </div>
    </div>
  );
}

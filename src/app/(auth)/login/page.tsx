import { Metadata } from 'next';
import AuthForm from '@/components/auth/auth-form';

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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-600/25">
            <span className="relative text-lg font-bold text-white">
              B
              <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bodega</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
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

import { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Check Your Email | TheBodegaCRM',
  description: 'Verify your email address to complete signup',
};

export default function ConfirmPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <Mail className="h-8 w-8 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Check your email
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            We sent you a confirmation link. Click the link in your email to
            activate your account and get started.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          <p>
            Didn&apos;t receive an email? Check your spam folder or{' '}
            <Link
              href="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              try signing up again
            </Link>
            .
          </p>
        </div>
        <div>
          <Link
            href="/login"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

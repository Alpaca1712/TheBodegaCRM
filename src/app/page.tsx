import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          TheBodegaCRM
        </h1>
        <p className="text-lg leading-8 text-zinc-600">
          Manage your contacts, companies, deals, and activities—all in one place.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-full bg-zinc-900 px-6 font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="flex h-12 items-center justify-center rounded-full border border-zinc-300 px-6 font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            Create account
          </Link>
        </div>
      </main>
    </div>
  );
}

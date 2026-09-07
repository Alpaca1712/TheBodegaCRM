import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">Bodega</h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Pigeon Labs&apos; API-first cold email CRM. Drive it from Claude via MCP, or open the console.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/login" className="flex h-12 items-center justify-center rounded-full bg-zinc-900 px-6 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
            Open console
          </Link>
          <Link href="/api/v1/openapi.json" className="flex h-12 items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 px-6 font-medium text-zinc-900 dark:text-zinc-100 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
            OpenAPI spec
          </Link>
        </div>
      </main>
    </div>
  );
}

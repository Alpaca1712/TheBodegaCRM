import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(24,24,27,0.06),_transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(248,113,113,0.12),_transparent_55%)]"
      />
      <main className="relative flex w-full max-w-lg flex-col items-center gap-8 text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-600/25">
          <span className="relative text-xl font-bold text-white">
            B
            <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400" />
          </span>
        </div>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Bodega</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">
            Pigeon Labs&apos; API-first cold email CRM. Drive it from Claude via MCP, or open the console.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="flex h-11 items-center justify-center rounded-xl bg-foreground px-6 text-sm font-medium text-background transition-colors hover:opacity-90"
          >
            Open console
          </Link>
          <Link
            href="/api/v1/openapi.json"
            className="flex h-11 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            OpenAPI spec
          </Link>
        </div>
      </main>
    </div>
  );
}

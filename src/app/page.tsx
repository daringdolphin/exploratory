import { hasSupabaseEnv } from "@/lib/supabase/env";

function getSupabaseProjectHost() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    return null;
  }

  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export default function Home() {
  const isSupabaseConfigured = hasSupabaseEnv();
  const supabaseHost = getSupabaseProjectHost();

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-emerald-950/30 sm:p-10">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-emerald-300">
          Boilerplate ready
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Next.js app linked for Supabase
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          This starter uses the App Router, TypeScript, Tailwind CSS, and
          Supabase SSR helpers for browser and server clients.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-slate-400">Supabase status</p>
            <p className="mt-2 text-xl font-semibold">
              {isSupabaseConfigured ? "Configured" : "Needs env values"}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {supabaseHost
                ? `Pointing at ${supabaseHost}`
                : "Copy .env.example to .env.local and add your project URL and anon key."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-slate-400">Start developing</p>
            <code className="mt-3 block rounded-xl bg-slate-900 p-4 text-sm text-emerald-200">
              pnpm dev
            </code>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm leading-7 text-emerald-50">
          Use <code>@/lib/supabase/server</code> from Server Components, Route
          Handlers, and Server Actions. Use <code>@/lib/supabase/client</code>{" "}
          inside Client Components.
        </div>
      </section>
    </main>
  );
}

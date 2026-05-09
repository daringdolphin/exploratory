# Next.js + Supabase Starter

## Getting Started

Install dependencies and start the development server:

```powershell
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase Setup

Create a local environment file from the example:

```powershell
Copy-Item .env.example .env.local
```

Then add your Supabase project values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

Use `@/lib/supabase/server` from Server Components, Route Handlers, and Server Actions. Use `@/lib/supabase/client` from Client Components.

## Project Stack

- [Next.js](https://nextjs.org) App Router
- [Supabase](https://supabase.com) SSR helpers
- TypeScript
- Tailwind CSS

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

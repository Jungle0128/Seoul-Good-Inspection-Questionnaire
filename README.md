# Seoul Good Inspection Scoring Form

This project is a static Vite + React app for shop inspection scoring, built for Netlify deployment and Supabase inserts.

## What it includes

- A configurable rubric in [src/rubric.ts](src/rubric.ts)
- A Supabase client wrapper in [src/lib/supabase.ts](src/lib/supabase.ts)
- A Netlify redirect rule in [public/_redirects](public/_redirects)
- A sample Supabase schema in [supabase/inspection_submissions.sql](supabase/inspection_submissions.sql)

## Setup

1. Create a Supabase project.
2. Run [supabase/inspection_submissions.sql](supabase/inspection_submissions.sql) in the SQL editor.
3. Add these environment variables for local development and Netlify:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_TABLE=inspection_submissions
```

4. Install dependencies and run the app:

```bash
npm install
npm run dev
```

## Netlify deployment

The project is ready for static hosting with the following build settings:

- Build command: `npm run build`
- Publish directory: `dist`

The SPA redirect rule already lives in [public/_redirects](public/_redirects), so refreshes on deep links will work on Netlify.

## Extending the rubric

Add or edit sections and questions in [src/rubric.ts](src/rubric.ts). The form UI and submission payload are generated from that file, so custom rubric items do not require rewriting the page.

## Previewing outputs

Use the built-in preview buttons in the dashboard to open the current submission as CSV or as a browser-rendered PDF before saving it to Supabase.

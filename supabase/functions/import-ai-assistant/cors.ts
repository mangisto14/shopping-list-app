// supabase/functions/import-ai-assistant/cors.ts
// The client calls this function directly from the browser (via
// supabase-js's `functions.invoke`), cross-origin from the app's own
// domain to the Supabase functions domain - without these headers the
// browser blocks the response before the app ever sees it. Standard
// Supabase Edge Function CORS boilerplate: allow the headers
// supabase-js itself sends, and echo back on every response (success
// or error) so a thrown error never surfaces as an opaque CORS failure
// instead of the real JSON error body.
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// Zugangsdaten für die Live-Ansicht (Supabase).
// Der "anon"/"publishable" Schlüssel ist öffentlich und darf im Code stehen;
// Schreiben ist nur mit der Turnier-PIN möglich (siehe supabase/live.sql).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const liveEnabled = () => !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

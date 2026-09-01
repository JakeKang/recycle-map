import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = client.storage.from("point-photos");
let removedCount = 0;

while (true) {
  const { data, error } = await client
    .from("app_uploads")
    .select("id,object_path")
    .in("status", ["pending", "rejected"])
    .lt("expires_at", new Date().toISOString())
    .order("expires_at")
    .limit(500);
  if (error) throw error;
  if (!data || data.length === 0) break;

  const { error: removeError } = await bucket.remove(
    data.map((upload) => upload.object_path),
  );
  if (removeError) throw removeError;

  const { error: deleteError } = await client
    .from("app_uploads")
    .delete()
    .in("id", data.map((upload) => upload.id));
  if (deleteError) throw deleteError;

  removedCount += data.length;
  if (data.length < 500) break;
}

console.log(`Removed ${removedCount} expired upload(s).`);

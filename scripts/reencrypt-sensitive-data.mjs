import { createClient } from "@supabase/supabase-js";
import {
  decryptWithKeyRing,
  encryptWithKeyRing,
  parseEncryptionKeyRing,
} from "../src/lib/sensitive-data-core.mjs";

const applyChanges = process.argv.includes("--apply");
const verifyOnly = process.argv.includes("--verify");
if (applyChanges && verifyOnly) {
  throw new Error("Use either --apply or --verify, not both");
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rawKeyRing = process.env.DATA_ENCRYPTION_KEYS;

if (!supabaseUrl || !serviceRoleKey || !rawKeyRing) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATA_ENCRYPTION_KEYS are required",
  );
}

const keyRing = parseEncryptionKeyRing(rawKeyRing);
const activeKey = keyRing[0];

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const targets = [
  { table: "reports", column: "reason" },
  { table: "point_suggestions", column: "payload_ciphertext" },
  { table: "security_audit_events", column: "encrypted_details" },
  { table: "app_uploads", column: "original_name" },
];

let totalCandidates = 0;

for (const target of targets) {
  let offset = 0;
  let candidates = 0;
  while (true) {
    const { data, error } = await client
      .from(target.table)
      .select(`id,${target.column}`)
      .not(target.column, "is", null)
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      const current = row[target.column];
      if (typeof current !== "string") {
        continue;
      }
      const plaintext = current.startsWith("enc:")
        ? decryptWithKeyRing(current, keyRing)
        : current;
      if (current.startsWith(`enc:${activeKey.version}:`)) {
        continue;
      }
      const next = encryptWithKeyRing(plaintext, keyRing);
      candidates += 1;
      totalCandidates += 1;
      if (applyChanges) {
        const { error: updateError } = await client
          .from(target.table)
          .update({ [target.column]: next })
          .eq("id", row.id);
        if (updateError) throw updateError;
      }
    }

    if (data.length < 500) break;
    offset += data.length;
  }
  console.log(`${target.table}: ${candidates} row(s) ${applyChanges ? "updated" : "would update"}`);
}

if (applyChanges) {
  const { error } = await client.rpc("finalize_sensitive_data_encryption");
  if (error) throw error;
  console.log("Database encryption constraints validated.");
}

if (!applyChanges) {
  console.log("Dry run only. Re-run with --apply to persist re-encryption.");
}

if (verifyOnly && totalCandidates > 0) {
  console.error(`${totalCandidates} value(s) still require encryption with the active key.`);
  process.exitCode = 1;
}

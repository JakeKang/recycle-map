import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schemaFilePath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260309150000_init_schema.sql",
);

const rlsFilePath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260309151000_rls_policies.sql",
);

const testAccountPoliciesFilePath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260309162000_test_account_policies.sql",
);

const deletePoliciesFilePath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260309170000_delete_policies.sql",
);

describe("supabase schema contract", () => {
  it("contains core tables and triggers for points/reviews/reports", async () => {
    const sql = await readFile(schemaFilePath, "utf-8");

    expect(sql).toContain("create table if not exists public.collection_points");
    expect(sql).toContain("create table if not exists public.reviews");
    expect(sql).toContain("create table if not exists public.reports");
    expect(sql).toContain("create trigger trigger_update_rating");
    expect(sql).toContain("create trigger trigger_sync_report_state");
  });

  it("contains baseline rls policy setup", async () => {
    const sql = await readFile(rlsFilePath, "utf-8");

    expect(sql).toContain("alter table public.collection_points enable row level security");
    expect(sql).toContain("create policy points_insert_own");
  });

  it("contains test-account policies for no-service-key mode", async () => {
    const sql = await readFile(testAccountPoliciesFilePath, "utf-8");

    expect(sql).toContain("insert into public.profiles");
    expect(sql).toContain("create policy points_insert_test_accounts");
    expect(sql).toContain("create policy reviews_insert_test_accounts");
    expect(sql).toContain("create policy reports_insert_test_accounts");
  });

  it("contains delete policies for core writable tables", async () => {
    const sql = await readFile(deletePoliciesFilePath, "utf-8");

    expect(sql).toContain("create policy points_delete_test_accounts");
    expect(sql).toContain("create policy reviews_delete_test_accounts");
    expect(sql).toContain("create policy reports_delete_test_accounts");
    expect(sql).toContain("create policy photos_delete_test_accounts");
  });
});

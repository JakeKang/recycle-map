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

const verificationVotesFilePath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260831090000_point_verification_votes.sql",
);

const securityHardeningFilePath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260901090000_security_hardening.sql",
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

  it("contains community verification vote schema, thresholds, trigger, and rls", async () => {
    const sql = await readFile(verificationVotesFilePath, "utf-8");

    expect(sql).toContain("create table if not exists public.point_verification_votes");
    expect(sql).toContain("inaccurate_count >= 3");
    expect(sql).toContain("accurate_count >= 5");
    expect(sql).toContain("trigger_sync_point_verification_state");
    expect(sql).toContain("verification_votes_insert_own");
  });

  it("removes public test policies and adds production persistence constraints", async () => {
    const sql = await readFile(securityHardeningFilePath, "utf-8");

    expect(sql).toContain("revoke all on table public.profiles from anon, authenticated");
    expect(sql).toContain("drop policy if exists points_insert_test_accounts");
    expect(sql).toContain("add column if not exists photo_ids uuid[]");
    expect(sql).toContain("trigger_enforce_single_report_per_user");
    expect(sql).toContain("trigger_enforce_single_suggestion_per_user");
    expect(sql).toContain("create_collection_point_with_photos");
    expect(sql).toContain("migrate_legacy_user_identity");
    expect(sql).toContain("create table if not exists public.legacy_user_identity_mappings");
    expect(sql).toContain("create table if not exists public.point_suggestions");
    expect(sql).toContain("create table if not exists public.security_rate_limits");
    expect(sql).toContain("create table if not exists public.security_audit_events");
  });
});

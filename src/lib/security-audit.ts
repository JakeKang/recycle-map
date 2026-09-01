import { encryptSensitiveText } from "@/lib/sensitive-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface SecurityAuditEvent {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  outcome: "success" | "denied" | "failure";
  details?: Record<string, unknown>;
}

export async function recordSecurityAuditEvent(event: SecurityAuditEvent) {
  try {
    const client = createSupabaseServerClient();
    if (!client) {
      return;
    }

    const { error } = await client.from("security_audit_events").insert({
      actor_id: event.actorId ?? null,
      action: event.action,
      target_type: event.targetType ?? null,
      target_id: event.targetId ?? null,
      outcome: event.outcome,
      encrypted_details: event.details
        ? encryptSensitiveText(JSON.stringify(event.details))
        : null,
    });
    if (error) {
      throw error;
    }
  } catch {
    console.error("[security-audit] failed to persist an audit event");
  }
}

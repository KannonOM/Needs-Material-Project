import { requireViewer } from "../../../../lib/auth/api";
import { getSupabaseAdmin } from "../../../../lib/supabase/server";
import { ROLES } from "../../../../lib/auth/permissions";
import { displayAdminRole } from "../../../../lib/auth/user-labels";

export const dynamic = "force-dynamic";

/**
 * Active buyers and administrators for the work-order Owner dropdown.
 * Does not change schema — Owner remains free text on needs_material.
 */
export async function GET() {
  const { error: authError } = await requireViewer();
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("allowed_users")
      .select("id, full_name, email, role, status")
      .eq("status", "active")
      .in("role", [ROLES.ADMINISTRATOR, ROLES.PURCHASING])
      .order("full_name", { ascending: true });

    if (error) throw error;

    return Response.json({
      owners: [
        { value: "Unassigned", label: "Unassigned" },
        ...(data || []).map((row) => ({
          value: row.full_name,
          label: `${row.full_name} (${displayAdminRole(row.role)})`,
          role: row.role,
          email: row.email,
        })),
      ],
    });
  } catch (error) {
    console.error("GET /api/allowed-users/owners failed", error);
    return Response.json(
      { error: "Failed to load owner options" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createSupabaseRouteClient, getBearerToken } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseRouteClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const [{ data: profile, error: profileError }, { data: roleData, error: roleError }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
    ]);

  if (profileError || roleError) {
    return NextResponse.json(
      {
        error: "Access profile not configured",
        profile: profileError?.message,
        role: roleError?.message,
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    user,
    profile,
    role: roleData?.role ?? null,
  });
}

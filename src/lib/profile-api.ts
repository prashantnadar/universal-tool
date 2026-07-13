import { supabase } from "@/integrations/supabase/client";

export async function getProfile() {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  if (error) throw error;

  return data;
}

export async function updateProfile(displayName: string) {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    throw new Error("Not authenticated");
  }

  // Update profile table
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userData.user.id);

  if (profileError) {
    throw profileError;
  }

  // Keep Supabase Auth metadata in sync
  const { error: authError } = await supabase.auth.updateUser({
    data: {
      display_name: displayName.trim(),
    },
  });

  if (authError) {
    throw authError;
  }

  // Return the latest profile
  return await getProfile();
}

export async function uploadAvatar(file: File) {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    throw new Error("Not authenticated");
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image.");
  }

  // Max 5 MB
  const MAX_SIZE = 5 * 1024 * 1024;

  if (file.size > MAX_SIZE) {
    throw new Error("Avatar must be smaller than 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";

  const fileName = `${userData.user.id}.${extension}`;

  const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, {
    upsert: true,
    cacheControl: "3600",
  });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userData.user.id);

  if (profileError) {
    throw profileError;
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      avatar_url: publicUrl,
    },
  });

  if (authError) {
    throw authError;
  }

  return publicUrl;
}

export async function changePassword(password: string) {
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) throw error;
}

export interface UsageStats {
  totalToolsUsed: number;
  todayUsage: number;
  lastToolUsed: string | null;
}

export async function getUsageStats(): Promise<UsageStats> {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    throw new Error("Not authenticated");
  }

  const userId = userData.user.id;

  const today = new Date().toISOString().split("T")[0];

  const [
    { count: totalToolsUsed, error: totalError },
    { count: todayUsage, error: todayError },
    { data: lastTool, error: lastError },
  ] = await Promise.all([
    supabase
      .from("tool_usage")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId),

    supabase
      .from("tool_usage")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId)
      .gte("used_on", today),

    supabase
      .from("tool_usage")
      .select("tool_slug")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),
  ]);

  if (totalError) throw totalError;
  if (todayError) throw todayError;
  if (lastError) throw lastError;

  return {
    totalToolsUsed: totalToolsUsed ?? 0,
    todayUsage: todayUsage ?? 0,
    lastToolUsed: lastTool?.tool_slug ?? null,
  };
}

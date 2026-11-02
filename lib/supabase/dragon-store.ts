import type { SupabaseClient } from "@supabase/supabase-js";
import type { DragonAction, DragonWorld } from "../dragon-types";

// The RPC returns one atomic snapshot. Growth and credits never come from the client.
export async function updateDragonWorld(supabase: SupabaseClient, childId: string, command: DragonAction): Promise<DragonWorld> {
  const { action, ...payload } = command;
  const result = await supabase.rpc("dragon_world", { p_child: childId, p_action: action, p_payload: payload }).abortSignal(AbortSignal.timeout(15_000));
  if (result.error) throw new Error(result.error.message);
  if (!result.data) throw new Error("드래곤 정보를 확인하지 못했어요.");
  return result.data as DragonWorld;
}

/**
 * useUserGroups — Hook to get groups where current user is a leader
 * 
 * Usage:
 *   const { data: userGroups } = useUserGroups();
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Line {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface Group {
  id: string;
  line_id: string;
  code: string;
  sort_order: number;
  active: boolean;
  // Joined data
  lines?: Line;
}

export interface UserGroup extends Group {
  line: Line | null;
  isLeader: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUserGroups() {
  const { user } = useAuth();

  return useQuery<UserGroup[]>({
    queryKey: ["user-groups", user?.id],
    queryFn: async (): Promise<UserGroup[]> => {
      if (!user?.id) return [];

      // Get user roles to check if leader/super_admin
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .limit(1);

      if (roleError) throw roleError;
      
      const userRole = roles?.[0]?.role;
      
      // Only leaders and super_admins can be group leaders
      if (!["leader", "super_admin"].includes(userRole)) {
        return [];
      }

      // Get groups where user is a leader
      const { data: leaderGroups, error: leaderError } = await supabase
        .from("group_leaders")
        .select(`
          id,
          user_id,
          group_id,
          groups (
            id,
            line_id,
            code,
            sort_order,
            active,
            lines (
              id,
              code,
              name,
              active
            )
          )
        `)
        .eq("user_id", user.id);

      if (leaderError) throw leaderError;

      // Transform to UserGroup format
      return (leaderGroups ?? []).map(lg => {
        const group = lg.groups;
        return {
          id: group.id,
          line_id: group.line_id,
          code: group.code,
          sort_order: group.sort_order,
          active: group.active,
          line: group.lines ?? null,
          isLeader: true,
        };
      });
    },
    enabled: !!user?.id,
    // Refetch every 30 seconds to keep leader assignments fresh
    staleTime: 30_000,
  });
}

// ─── Helper: Get all groups for a line (for selection dropdown) ───────────────

export function useGroupsForLine(lineId: string | null) {
  return useQuery<Group[]>({
    queryKey: ["groups-for-line", lineId],
    queryFn: async (): Promise<Group[]> => {
      if (!lineId) return [];
      
      const { data, error } = await supabase
        .from("groups")
        .select(`
          id,
          line_id,
          code,
          sort_order,
          active
        `)
        .eq("line_id", lineId)
        .eq("active", true)
        .order("sort_order");

      if (error) throw error;
      return (data ?? []) as Group[];
    },
    enabled: !!lineId,
  });
}

// ─── Helper: Get user's leader status for specific group ─────────────────────

export function useIsGroupLeader(groupId: string | null) {
  const { user } = useAuth();

  return useQuery<boolean>({
    queryKey: ["is-group-leader", user?.id, groupId],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id || !groupId) return false;

      const { data, error } = await supabase
        .from("group_leaders")
        .select("id")
        .eq("user_id", user.id)
        .eq("group_id", groupId)
        .limit(1);

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user?.id && !!groupId,
  });
}
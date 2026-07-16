import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useDocuments() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["documents"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDocument(id: string | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["documents", id],
    enabled: !!session && !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("id", id as string).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDocument() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<TablesInsert<"documents">, "user_id">) => {
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("documents")
        .insert({ ...row, user_id: session.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"documents"> }) => {
      const { error } = await supabase.from("documents").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents", vars.id] });
    },
  });
}

export async function archiveDocumentFile(userId: string, documentId: string, file: File): Promise<string> {
  const path = `${userId}/${documentId}/${file.name}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

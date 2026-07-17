import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Powers the Settings page's "Delete All My Data" danger zone. Storage
// cleanup happens first and client-side — Postgres has no reach into
// Supabase Storage, so the actual uploaded PDF/image bytes (see
// archiveDocumentFile in useDocuments.ts) have to be removed via the
// Storage API before the DB rows referencing them are gone. Then
// delete_all_user_data() (0010_delete_user_data.sql) clears every
// financial table in one transaction. See that migration's header
// comment for exactly what is and isn't included in scope.
export function useDeleteAllData() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Not authenticated");

      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("storage_path")
        .not("storage_path", "is", null);
      if (docsError) throw docsError;

      const paths = (docs ?? []).map((d) => d.storage_path).filter((p): p is string => !!p);
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from("documents").remove(paths);
        if (storageError) throw storageError;
      }

      const { error: rpcError } = await supabase.rpc("delete_all_user_data");
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// NOTE: this file is normally auto-generated via `supabase gen types`, but
// there is no Supabase CLI session set up for this project, so it is
// HAND-WRITTEN to match supabase/migrations/0001-0009 exactly. If you add
// or change a migration, update this file too — nothing enforces they stay
// in sync, a drift here only shows up as a runtime error, not a type error.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          balance: number
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          is_default?: boolean
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          slug: string
          name: string
          icon: string
          swatch: string
          is_system: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          slug: string
          name: string
          icon?: string
          swatch?: string
          is_system?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          slug?: string
          name?: string
          icon?: string
          swatch?: string
          is_system?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          user_id: string
          filename: string
          mime_type: string
          size_bytes: number
          doc_type: Database["public"]["Enums"]["doc_type"]
          status: Database["public"]["Enums"]["doc_status"]
          storage_path: string | null
          extracted_total: number | null
          row_count: number
          error_message: string | null
          created_at: string
          confirmed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          mime_type: string
          size_bytes?: number
          doc_type?: Database["public"]["Enums"]["doc_type"]
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string | null
          extracted_total?: number | null
          row_count?: number
          error_message?: string | null
          created_at?: string
          confirmed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          mime_type?: string
          size_bytes?: number
          doc_type?: Database["public"]["Enums"]["doc_type"]
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string | null
          extracted_total?: number | null
          row_count?: number
          error_message?: string | null
          created_at?: string
          confirmed_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          category_id: string | null
          document_id: string | null
          amount: number
          description: string
          merchant_raw: string | null
          merchant_normalized: string | null
          tx_date: string
          source: Database["public"]["Enums"]["tx_source"]
          confidence: number | null
          is_recurring: boolean
          notes: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          category_id?: string | null
          document_id?: string | null
          amount: number
          description?: string
          merchant_raw?: string | null
          merchant_normalized?: string | null
          tx_date: string
          source?: Database["public"]["Enums"]["tx_source"]
          confidence?: number | null
          is_recurring?: boolean
          notes?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          category_id?: string | null
          document_id?: string | null
          amount?: number
          description?: string
          merchant_raw?: string | null
          merchant_normalized?: string | null
          tx_date?: string
          source?: Database["public"]["Enums"]["tx_source"]
          confidence?: number | null
          is_recurring?: boolean
          notes?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_rules: {
        Row: {
          id: string
          user_id: string
          merchant_pattern: string
          category_id: string
          hit_count: number
          last_used_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          merchant_pattern: string
          category_id: string
          hit_count?: number
          last_used_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          merchant_pattern?: string
          category_id?: string
          hit_count?: number
          last_used_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          period: string
          method: Database["public"]["Enums"]["budget_method"]
          income_expected: number
          status: Database["public"]["Enums"]["budget_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period: string
          method?: Database["public"]["Enums"]["budget_method"]
          income_expected?: number
          status?: Database["public"]["Enums"]["budget_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period?: string
          method?: Database["public"]["Enums"]["budget_method"]
          income_expected?: number
          status?: Database["public"]["Enums"]["budget_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_lines: {
        Row: {
          id: string
          user_id: string
          budget_id: string
          category_id: string
          group_name: string
          amount_budgeted: number
          rollover_enabled: boolean
          sinking_fund_target_annual: number | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          budget_id: string
          category_id: string
          group_name?: string
          amount_budgeted?: number
          rollover_enabled?: boolean
          sinking_fund_target_annual?: number | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          budget_id?: string
          category_id?: string
          group_name?: string
          amount_budgeted?: number
          rollover_enabled?: boolean
          sinking_fund_target_annual?: number | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_adjustments: {
        Row: {
          id: string
          user_id: string
          budget_line_id: string
          type: Database["public"]["Enums"]["adjustment_type"]
          amount: number
          from_line_id: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          budget_line_id: string
          type: Database["public"]["Enums"]["adjustment_type"]
          amount: number
          from_line_id?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          budget_line_id?: string
          type?: Database["public"]["Enums"]["adjustment_type"]
          amount?: number
          from_line_id?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_adjustments_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_adjustments_from_line_id_fkey"
            columns: ["from_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          type: Database["public"]["Enums"]["goal_type"]
          target_amount: number
          starting_amount: number
          target_date: string | null
          linked_category_id: string | null
          linked_account_id: string | null
          status: Database["public"]["Enums"]["goal_status"]
          source: string
          source_simulated_target_date: string | null
          committed_monthly_amount: number | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string
          type?: Database["public"]["Enums"]["goal_type"]
          target_amount: number
          starting_amount?: number
          target_date?: string | null
          linked_category_id?: string | null
          linked_account_id?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          source?: string
          source_simulated_target_date?: string | null
          committed_monthly_amount?: number | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string
          type?: Database["public"]["Enums"]["goal_type"]
          target_amount?: number
          starting_amount?: number
          target_date?: string | null
          linked_category_id?: string | null
          linked_account_id?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          source?: string
          source_simulated_target_date?: string | null
          committed_monthly_amount?: number | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_linked_category_id_fkey"
            columns: ["linked_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          id: string
          user_id: string
          goal_id: string
          amount: number
          date: string
          transaction_id: string | null
          source: Database["public"]["Enums"]["contribution_source"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_id: string
          amount: number
          date?: string
          transaction_id?: string | null
          source?: Database["public"]["Enums"]["contribution_source"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string
          amount?: number
          date?: string
          transaction_id?: string | null
          source?: Database["public"]["Enums"]["contribution_source"]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          category_alerts_enabled: boolean
          threshold_80_enabled: boolean
          threshold_100_enabled: boolean
          weekly_summary_enabled: boolean
          unusual_transaction_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_alerts_enabled?: boolean
          threshold_80_enabled?: boolean
          threshold_100_enabled?: boolean
          weekly_summary_enabled?: boolean
          unusual_transaction_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_alerts_enabled?: boolean
          threshold_80_enabled?: boolean
          threshold_100_enabled?: boolean
          weekly_summary_enabled?: boolean
          unusual_transaction_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      budget_insights: {
        Row: {
          id: string
          user_id: string
          period: string
          insights: Json
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period: string
          insights: Json
          generated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period?: string
          insights?: Json
          generated_at?: string
        }
        Relationships: []
      }
      impact_events: {
        Row: {
          id: string
          user_id: string
          session_id: string
          event_name: string
          metadata: Json
          client_ts: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          event_name: string
          metadata?: Json
          client_ts: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          event_name?: string
          metadata?: Json
          client_ts?: string
          created_at?: string
        }
        Relationships: []
      }
      impact_snapshots: {
        Row: {
          id: string
          user_id: string
          snapshot_date: string
          net_worth: number
          total_assets: number
          total_liabilities: number
          trailing_90d_income: number
          trailing_90d_expenses: number
          savings_rate: number | null
          debt_to_income_ratio: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          snapshot_date?: string
          net_worth: number
          total_assets: number
          total_liabilities: number
          trailing_90d_income: number
          trailing_90d_expenses: number
          savings_rate?: number | null
          debt_to_income_ratio?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          snapshot_date?: string
          net_worth?: number
          total_assets?: number
          total_liabilities?: number
          trailing_90d_income?: number
          trailing_90d_expenses?: number
          savings_rate?: number | null
          debt_to_income_ratio?: number | null
          created_at?: string
        }
        Relationships: []
      }
      impact_scores: {
        Row: {
          id: string
          user_id: string
          metric_type: Database["public"]["Enums"]["impact_metric_type"]
          window_start: string
          window_end: string
          score: number | null
          eligible: boolean
          components: Json
          computed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          metric_type: Database["public"]["Enums"]["impact_metric_type"]
          window_start: string
          window_end: string
          score?: number | null
          eligible?: boolean
          components?: Json
          computed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          metric_type?: Database["public"]["Enums"]["impact_metric_type"]
          window_start?: string
          window_end?: string
          score?: number | null
          eligible?: boolean
          components?: Json
          computed_at?: string
        }
        Relationships: []
      }
      impact_aggregate_scores: {
        Row: {
          id: string
          metric_type: Database["public"]["Enums"]["impact_metric_type"]
          period_start: string
          period_end: string
          score: number | null
          sample_size: number
          components: Json
          computed_at: string
        }
        Insert: {
          id?: string
          metric_type: Database["public"]["Enums"]["impact_metric_type"]
          period_start: string
          period_end: string
          score?: number | null
          sample_size?: number
          components?: Json
          computed_at?: string
        }
        Update: {
          id?: string
          metric_type?: Database["public"]["Enums"]["impact_metric_type"]
          period_start?: string
          period_end?: string
          score?: number | null
          sample_size?: number
          components?: Json
          computed_at?: string
        }
        Relationships: []
      }
      impact_settings: {
        Row: {
          id: string
          user_id: string
          behavioral_tracking_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          behavioral_tracking_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          behavioral_tracking_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_category_spend: {
        Args: { p_start: string; p_end: string; p_account_id?: string | null }
        Returns: { category_id: string | null; name: string; icon: string; swatch: string; total: number; pct: number }[]
      }
      get_cash_flow: {
        Args: { p_start: string; p_end: string; p_granularity?: string }
        Returns: { period_start: string; income: number; expense: number; net: number }[]
      }
      get_spending_trend: {
        Args: { p_start: string; p_end: string }
        Returns: { day: string; cumulative_spend: number; budget_pace: number }[]
      }
      budget_progress: {
        Args: { p_period: string }
        Returns: {
          line_id: string
          category_id: string
          category_name: string
          category_icon: string
          category_swatch: string
          group_name: string
          sort_order: number
          amount_budgeted: number
          spent: number
          remaining: number
          pct_used: number
          rollover_enabled: boolean
          rollover_in: number
          sinking_fund_target_annual: number | null
          last_month_spent: number
        }[]
      }
      sinking_fund_progress: {
        Args: { p_category_id: string }
        Returns: { target_annual: number | null; monthly_target: number; accumulated: number; remaining_needed: number }[]
      }
      category_spend_history: {
        Args: { p_category_id: string; p_months?: number }
        Returns: { month: string; total: number }[]
      }
      materialize_next_period: {
        Args: { p_from_period: string }
        Returns: string
      }
      record_budget_adjustment: {
        Args: {
          p_type: Database["public"]["Enums"]["adjustment_type"]
          p_budget_line_id: string
          p_amount: number
          p_from_line_id?: string | null
          p_note?: string | null
        }
        Returns: string
      }
      get_top_merchants: {
        Args: { p_start: string; p_end: string; p_limit?: number }
        Returns: { merchant_normalized: string; category_id: string | null; category_name: string | null; total: number; tx_count: number; last_date: string }[]
      }
      ensure_default_account: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      check_duplicate_candidates: {
        Args: { p_rows: Json }
        Returns: { candidate_index: number; existing_transaction_id: string; existing_description: string; existing_date: string; existing_amount: number }[]
      }
      confirm_document_import: {
        Args: { p_document_id: string; p_rows: Json }
        Returns: number
      }
      undo_import_batch: {
        Args: { p_document_id: string }
        Returns: number
      }
      detect_recurring_candidates: {
        Args: Record<PropertyKey, never>
        Returns: { merchant_normalized: string; category_id: string | null; avg_amount: number; occurrence_count: number; avg_gap_days: number }[]
      }
      upsert_merchant_rule: {
        Args: { p_merchant: string; p_category_id: string }
        Returns: undefined
      }
      record_impact_snapshot: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_financial_progress_inputs: {
        Args: { p_window_start: string; p_window_end: string }
        Returns: {
          recent_snapshot_date: string | null
          recent_net_worth: number | null
          recent_dti: number | null
          prior_snapshot_date: string | null
          prior_net_worth: number | null
          prior_dti: number | null
          savings_rate_recent: number | null
          savings_rate_prior: number | null
          snapshot_count: number
          eligible_goal_count: number
          attained_goal_count: number
        }[]
      }
      get_behavioral_action_inputs: {
        Args: { p_window_start: string; p_window_end: string }
        Returns: {
          simulations_run: number
          simulations_converted: number
          goal_seek_goals_created: number
          plan_adherence_matched_months: number
          plan_adherence_total_months: number
          repeat_engagement_days: number
        }[]
      }
      get_experience_quality_inputs: {
        Args: { p_period_start: string; p_period_end: string }
        Returns: {
          sample_size: number
          completion_rate: number | null
          median_ttfi_ms: number | null
          error_rate: number | null
          avg_survey_rating: number | null
          adoption_rate: number | null
        }[]
      }
      get_financial_progress_aggregate_inputs: {
        Args: { p_period_start: string; p_period_end: string }
        Returns: {
          sample_size: number
          median_net_worth_trend_pct: number | null
          median_savings_rate_delta: number | null
        }[]
      }
      get_behavioral_action_aggregate_inputs: {
        Args: { p_period_start: string; p_period_end: string }
        Returns: {
          sample_size: number
          median_conversion_rate: number | null
          median_goal_setting_rate: number | null
          median_plan_adherence_rate: number | null
        }[]
      }
    }
    Enums: {
      doc_type: "bank_statement" | "receipt" | "pay_stub" | "csv_export" | "unknown"
      doc_status: "uploaded" | "scanning" | "extracting" | "review" | "confirmed" | "rejected" | "failed"
      account_type: "cash" | "checking" | "savings" | "credit" | "other"
      tx_source: "manual" | "upload_csv" | "upload_pdf" | "upload_image"
      budget_method: "fifty_thirty_twenty" | "zero_based" | "envelope" | "custom"
      budget_status: "draft" | "active"
      adjustment_type: "move" | "increase" | "decrease"
      goal_type: "save" | "paydown"
      goal_status: "active" | "completed" | "archived"
      contribution_source: "manual" | "auto"
      impact_metric_type: "financial_progress" | "experience_quality" | "behavioral_action"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      doc_type: ["bank_statement", "receipt", "pay_stub", "csv_export", "unknown"],
      doc_status: ["uploaded", "scanning", "extracting", "review", "confirmed", "rejected", "failed"],
      account_type: ["cash", "checking", "savings", "credit", "other"],
      tx_source: ["manual", "upload_csv", "upload_pdf", "upload_image"],
      budget_method: ["fifty_thirty_twenty", "zero_based", "envelope", "custom"],
      budget_status: ["draft", "active"],
      adjustment_type: ["move", "increase", "decrease"],
      goal_type: ["save", "paydown"],
      goal_status: ["active", "completed", "archived"],
      contribution_source: ["manual", "auto"],
      impact_metric_type: ["financial_progress", "experience_quality", "behavioral_action"],
    },
  },
} as const

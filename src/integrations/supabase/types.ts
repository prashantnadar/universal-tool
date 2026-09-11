export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: string;
          metadata: Json | null;
          target_id: string | null;
          target_type: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          target_id?: string | null;
          target_type?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          target_id?: string | null;
          target_type?: string | null;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          is_read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          subject?: string;
          message?: string;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      guest_usage: {
        Row: {
          country_code: string | null;
          created_at: string;
          guest_hash: string;
          id: string;
          idempotency_key: string | null;
          tool_slug: string;
        };
        Insert: {
          country_code?: string | null;
          created_at?: string;
          guest_hash: string;
          id?: string;
          idempotency_key?: string | null;
          tool_slug: string;
        };
        Update: {
          country_code?: string | null;
          created_at?: string;
          guest_hash?: string;
          id?: string;
          idempotency_key?: string | null;
          tool_slug?: string;
        };
        Relationships: [];
      };
      plan_limits: {
        Row: {
          daily_limit: number;
          plan: string;
        };
        Insert: {
          daily_limit: number;
          plan: string;
        };
        Update: {
          daily_limit?: number;
          plan?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          id: string;
          plan: Database["public"]["Enums"]["plan_type"];
          provider: string | null;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan?: Database["public"]["Enums"]["plan_type"];
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan?: Database["public"]["Enums"]["plan_type"];
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tool_usage: {
        Row: {
          category: string | null;
          country_code: string | null;
          created_at: string;
          id: string;
          idempotency_key: string | null;
          tool_slug: string;
          used_on: string;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          country_code?: string | null;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          tool_slug: string;
          used_on?: string;
          user_id: string;
        };
        Update: {
          category?: string | null;
          country_code?: string | null;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          tool_slug?: string;
          used_on?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_active_users: {
        Args: { _minutes?: number };
        Returns: {
          actor_key: string;
          country_code: string;
          display_name: string;
          email: string;
          kind: string;
          last_seen: string;
          last_tool_slug: string;
          plan: string;
          uses_in_window: number;
        }[];
      };
      admin_audit_search: {
        Args: {
          _action?: string;
          _actor?: string;
          _from?: string;
          _limit?: number;
          _offset?: number;
          _to?: string;
        };
        Returns: {
          action: string;
          actor_id: string;
          created_at: string;
          email: string;
          id: string;
          metadata: Json;
        }[];
      };
      admin_daily_totals: {
        Args: { _days?: number };
        Returns: {
          day: string;
          guest_uses: number;
          signed_in_uses: number;
          top_tool: string;
          unique_guests: number;
          unique_users: number;
        }[];
      };
      admin_list_users: {
        Args: { _limit?: number; _offset?: number };
        Returns: {
          created_at: string;
          display_name: string;
          email: string;
          is_admin: boolean;
          plan: string;
          usage_24h: number;
          user_id: string;
        }[];
      };
      admin_set_plan: {
        Args: {
          _plan: Database["public"]["Enums"]["plan_type"];
          _target: string;
        };
        Returns: undefined;
      };
      admin_set_role: {
        Args: {
          _grant: boolean;
          _role: Database["public"]["Enums"]["app_role"];
          _target: string;
        };
        Returns: undefined;
      };
      admin_stats: { Args: never; Returns: Json };
      admin_tool_leaderboard: {
        Args: { _days?: number };
        Returns: {
          guest: number;
          signed_in: number;
          tool_slug: string;
          total: number;
          unique_actors: number;
        }[];
      };
      admin_usage_search: {
        Args: {
          _actor?: string;
          _from?: string;
          _kind?: string;
          _limit?: number;
          _offset?: number;
          _to?: string;
          _tool?: string;
        };
        Returns: {
          actor_key: string;
          country_code: string;
          created_at: string;
          email: string;
          kind: string;
          tool_slug: string;
        }[];
      };
      admin_user_history: {
        Args: { _limit?: number; _offset?: number; _target: string };
        Returns: {
          country_code: string;
          created_at: string;
          id: string;
          tool_slug: string;
        }[];
      };
      check_and_record_usage:
        | {
            Args: {
              _guest_hash?: string;
              _idempotency_key: string;
              _tool_slug: string;
            };
            Returns: Json;
          }
        | {
            Args: {
              _country_code?: string;
              _guest_hash?: string;
              _idempotency_key: string;
              _tool_slug: string;
            };
            Returns: Json;
          };
      get_effective_plan: { Args: { _user_id: string }; Returns: string };
      get_usage_status: { Args: { _guest_hash?: string }; Returns: Json };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      prune_guest_usage: { Args: never; Returns: undefined };
      refund_usage: {
        Args: { _guest_hash?: string; _idempotency_key: string };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      plan_type: "free" | "premium" | "pro";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      plan_type: ["free", "premium", "pro"],
    },
  },
} as const;

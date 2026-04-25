export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      goals: {
        Row: {
          created_at: string
          id: string
          source: string
          target_date: string | null
          target_weight_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source?: string
          target_date?: string | null
          target_weight_kg: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          target_date?: string | null
          target_weight_kg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          created_at: string
          display_name: string | null
          height_cm: number | null
          id: string
          sex: string | null
          updated_at: string
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          display_name?: string | null
          height_cm?: number | null
          id: string
          sex?: string | null
          updated_at?: string
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          display_name?: string | null
          height_cm?: number | null
          id?: string
          sex?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      weight_entries: {
        Row: {
          ankle_cm: number | null
          biceps_cm: number | null
          body_fat_pct: number | null
          bone_pct: number | null
          calf_cm: number | null
          chest_cm: number | null
          created_at: string
          forearm_cm: number | null
          hip_cm: number | null
          id: string
          knee_cm: number | null
          muscle_pct: number | null
          note: string | null
          recorded_at: string
          shoulders_cm: number | null
          thigh_cm: number | null
          user_id: string
          waist_cm: number | null
          water_pct: number | null
          weight_kg: number
          wrist_cm: number | null
        }
        Insert: {
          ankle_cm?: number | null
          biceps_cm?: number | null
          body_fat_pct?: number | null
          bone_pct?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          forearm_cm?: number | null
          hip_cm?: number | null
          id?: string
          knee_cm?: number | null
          muscle_pct?: number | null
          note?: string | null
          recorded_at?: string
          shoulders_cm?: number | null
          thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
          water_pct?: number | null
          weight_kg: number
          wrist_cm?: number | null
        }
        Update: {
          ankle_cm?: number | null
          biceps_cm?: number | null
          body_fat_pct?: number | null
          bone_pct?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          forearm_cm?: number | null
          hip_cm?: number | null
          id?: string
          knee_cm?: number | null
          muscle_pct?: number | null
          note?: string | null
          recorded_at?: string
          shoulders_cm?: number | null
          thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          water_pct?: number | null
          weight_kg?: number
          wrist_cm?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

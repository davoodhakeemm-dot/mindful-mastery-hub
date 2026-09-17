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
      admin_key_attempts: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          success?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      course_access: {
        Row: {
          course_id: string
          created_at: string
          gmail: string
          id: string
          revoked: boolean
        }
        Insert: {
          course_id: string
          created_at?: string
          gmail: string
          id?: string
          revoked?: boolean
        }
        Update: {
          course_id?: string
          created_at?: string
          gmail?: string
          id?: string
          revoked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_path: string | null
          created_at: string
          description_en: string | null
          description_ml: string | null
          id: string
          language: string
          slug: string
          title_en: string
          title_ml: string
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          description_en?: string | null
          description_ml?: string | null
          id?: string
          language?: string
          slug: string
          title_en: string
          title_ml: string
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          description_en?: string | null
          description_ml?: string | null
          id?: string
          language?: string
          slug?: string
          title_en?: string
          title_ml?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content_en: string | null
          content_ml: string | null
          course_id: string
          created_at: string
          description_en: string | null
          description_ml: string | null
          id: string
          image_path: string | null
          lesson_number: number
          notes: string | null
          pdf_path: string | null
          title_en: string
          title_ml: string | null
          video_path: string | null
        }
        Insert: {
          content_en?: string | null
          content_ml?: string | null
          course_id: string
          created_at?: string
          description_en?: string | null
          description_ml?: string | null
          id?: string
          image_path?: string | null
          lesson_number?: number
          notes?: string | null
          pdf_path?: string | null
          title_en: string
          title_ml?: string | null
          video_path?: string | null
        }
        Update: {
          content_en?: string | null
          content_ml?: string | null
          course_id?: string
          created_at?: string
          description_en?: string | null
          description_ml?: string | null
          id?: string
          image_path?: string | null
          lesson_number?: number
          notes?: string | null
          pdf_path?: string | null
          title_en?: string
          title_ml?: string | null
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          age: number | null
          consent_accepted: boolean
          created_at: string
          full_name: string
          gmail: string
          id: string
          last_login: string | null
          phone: string | null
          photo_url: string | null
          registered_at: string
          selected_course: string | null
          status: Database["public"]["Enums"]["student_status"]
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          consent_accepted?: boolean
          created_at?: string
          full_name: string
          gmail: string
          id: string
          last_login?: string | null
          phone?: string | null
          photo_url?: string | null
          registered_at?: string
          selected_course?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          consent_accepted?: boolean
          created_at?: string
          full_name?: string
          gmail?: string
          id?: string
          last_login?: string | null
          phone?: string | null
          photo_url?: string | null
          registered_at?: string
          selected_course?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          whatsapp?: string | null
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          completed: boolean
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_course_access: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
      student_status: "pending" | "approved" | "suspended" | "removed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "student"],
      student_status: ["pending", "approved", "suspended", "removed"],
    },
  },
} as const

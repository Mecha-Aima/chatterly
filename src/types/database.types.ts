export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      badges: {
        Row: {
          awarded_at: string | null
          badge_data: Json | null
          badge_type: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          badge_data?: Json | null
          badge_type: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          badge_data?: Json | null
          badge_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      learning_turns: {
        Row: {
          created_at: string | null
          grammar_feedback_json: Json | null
          id: string
          pronunciation_feedback_json: Json | null
          sentence_meaning: string | null
          session_id: string
          target_sentence: string
          turn_completed: boolean | null
          turn_number: number
          user_transcript: string | null
        }
        Insert: {
          created_at?: string | null
          grammar_feedback_json?: Json | null
          id?: string
          pronunciation_feedback_json?: Json | null
          sentence_meaning?: string | null
          session_id: string
          target_sentence: string
          turn_completed?: boolean | null
          turn_number: number
          user_transcript?: string | null
        }
        Update: {
          created_at?: string | null
          grammar_feedback_json?: Json | null
          id?: string
          pronunciation_feedback_json?: Json | null
          sentence_meaning?: string | null
          session_id?: string
          target_sentence?: string
          turn_completed?: boolean | null
          turn_number?: number
          user_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          difficulty_level: string | null
          preferred_language: string | null
          streak_start: string | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          difficulty_level?: string | null
          preferred_language?: string | null
          streak_start?: string | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          difficulty_level?: string | null
          preferred_language?: string | null
          streak_start?: string | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sentence_bank: {
        Row: {
          category: string | null
          created_at: string | null
          difficulty_level: string
          id: string
          language: string
          meaning_english: string
          pronunciation_guide: string | null
          sentence_text: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          difficulty_level: string
          id: string
          language: string
          meaning_english: string
          pronunciation_guide?: string | null
          sentence_text: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          difficulty_level?: string
          id?: string
          language?: string
          meaning_english?: string
          pronunciation_guide?: string | null
          sentence_text?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          audio_url: string | null
          completed_turns: number | null
          created_at: string | null
          difficulty_level: string | null
          ended_at: string | null
          id: string
          overall_progress_json: Json | null
          persona_id: string | null
          session_transcript_json: Json | null
          started_at: string | null
          target_language: string
          total_turns: number | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          completed_turns?: number | null
          created_at?: string | null
          difficulty_level?: string | null
          ended_at?: string | null
          id?: string
          overall_progress_json?: Json | null
          persona_id?: string | null
          session_transcript_json?: Json | null
          started_at?: string | null
          target_language: string
          total_turns?: number | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          completed_turns?: number | null
          created_at?: string | null
          difficulty_level?: string | null
          ended_at?: string | null
          id?: string
          overall_progress_json?: Json | null
          persona_id?: string | null
          session_transcript_json?: Json | null
          started_at?: string | null
          target_language?: string
          total_turns?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          notifications_enabled: boolean | null
          onboarding_complete: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          onboarding_complete?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          onboarding_complete?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

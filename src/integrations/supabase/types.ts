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
      admin_whitelist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      agent_actions: {
        Row: {
          action_type: string
          agent_name: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          impact_metric: Json | null
          input_summary: string | null
          lesson_id: string | null
          output_summary: string | null
          session_name: string | null
          status: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          agent_name: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          impact_metric?: Json | null
          input_summary?: string | null
          lesson_id?: string | null
          output_summary?: string | null
          session_name?: string | null
          status?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          agent_name?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          impact_metric?: Json | null
          input_summary?: string | null
          lesson_id?: string | null
          output_summary?: string | null
          session_name?: string | null
          status?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      agent_context_pool: {
        Row: {
          agent_name: string
          consumed_by: string[]
          content: Json
          context_type: string
          created_at: string
          expires_at: string
          id: string
          lesson_id: string | null
          priority: number
          session_name: string | null
        }
        Insert: {
          agent_name: string
          consumed_by?: string[]
          content?: Json
          context_type: string
          created_at?: string
          expires_at?: string
          id?: string
          lesson_id?: string | null
          priority?: number
          session_name?: string | null
        }
        Update: {
          agent_name?: string
          consumed_by?: string[]
          content?: Json
          context_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          lesson_id?: string | null
          priority?: number
          session_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_context_pool_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_policies: {
        Row: {
          action_type: string
          agent_name: string
          approval_timeout_seconds: number
          auto_execute: boolean
          created_at: string
          escalation_target: string
          id: string
          requires_approval: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          agent_name: string
          approval_timeout_seconds?: number
          auto_execute?: boolean
          created_at?: string
          escalation_target?: string
          id?: string
          requires_approval?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          agent_name?: string
          approval_timeout_seconds?: number
          auto_execute?: boolean
          created_at?: string
          escalation_target?: string
          id?: string
          requires_approval?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      curriculum_documents: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          grade_level: string | null
          id: string
          subject_area: string | null
          title: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          grade_level?: string | null
          id?: string
          subject_area?: string | null
          title: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          grade_level?: string | null
          id?: string
          subject_area?: string | null
          title?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      dialect_glossary: {
        Row: {
          created_at: string
          cultural_definition: string
          id: string
          language_code: string
          sign_language_ref: string | null
          subject_area: string | null
          term: string
          updated_at: string
          usage_context: string | null
        }
        Insert: {
          created_at?: string
          cultural_definition: string
          id?: string
          language_code: string
          sign_language_ref?: string | null
          subject_area?: string | null
          term: string
          updated_at?: string
          usage_context?: string | null
        }
        Update: {
          created_at?: string
          cultural_definition?: string
          id?: string
          language_code?: string
          sign_language_ref?: string | null
          subject_area?: string | null
          term?: string
          updated_at?: string
          usage_context?: string | null
        }
        Relationships: []
      }
      dialect_variants: {
        Row: {
          confidence: number
          created_at: string
          current_version: number
          description: string | null
          id: string
          media_files: Json
          media_type: string | null
          media_url: string | null
          notation: string | null
          region: string
          status: string
          submitted_by: string | null
          universal_sign_id: string
          updated_at: string
          variant_label: string
          video_url: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          media_files?: Json
          media_type?: string | null
          media_url?: string | null
          notation?: string | null
          region: string
          status?: string
          submitted_by?: string | null
          universal_sign_id: string
          updated_at?: string
          variant_label: string
          video_url?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          media_files?: Json
          media_type?: string | null
          media_url?: string | null
          notation?: string | null
          region?: string
          status?: string
          submitted_by?: string | null
          universal_sign_id?: string
          updated_at?: string
          variant_label?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dialect_variants_universal_sign_id_fkey"
            columns: ["universal_sign_id"]
            isOneToOne: false
            referencedRelation: "universal_signs"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_access_codes: {
        Row: {
          access_code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_accessed_at: string | null
          last_viewed_at: string | null
          student_id: string
          student_name: string
          teacher_id: string
        }
        Insert: {
          access_code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          last_viewed_at?: string | null
          student_id: string
          student_name: string
          teacher_id: string
        }
        Update: {
          access_code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          last_viewed_at?: string | null
          student_id?: string
          student_name?: string
          teacher_id?: string
        }
        Relationships: []
      }
      lesson_assignments: {
        Row: {
          enrolled_at: string | null
          id: string
          lesson_id: string
          student_id: string
        }
        Insert: {
          enrolled_at?: string | null
          id?: string
          lesson_id: string
          student_id: string
        }
        Update: {
          enrolled_at?: string | null
          id?: string
          lesson_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_attendance: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          join_method: string | null
          joined_at: string
          left_at: string | null
          lesson_id: string
          session_date: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          join_method?: string | null
          joined_at?: string
          left_at?: string | null
          lesson_id: string
          session_date?: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          join_method?: string | null
          joined_at?: string
          left_at?: string | null
          lesson_id?: string
          session_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_materials: {
        Row: {
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          lesson_id: string
          link_url: string | null
          material_type: string | null
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          lesson_id: string
          link_url?: string | null
          material_type?: string | null
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          lesson_id?: string
          link_url?: string | null
          material_type?: string | null
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_summaries: {
        Row: {
          created_at: string | null
          id: string
          lesson_id: string
          student_id: string
          summary_json: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_id: string
          student_id: string
          summary_json: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_id?: string
          student_id?: string
          summary_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lesson_summaries_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          cancelled_message: string | null
          created_at: string | null
          day_of_week: number
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          is_cancelled: boolean | null
          is_recurring: boolean | null
          language: string | null
          session_name: string
          start_time: string
          teacher_id: string
          title: string
          updated_at: string | null
          video_enabled: boolean | null
        }
        Insert: {
          cancelled_message?: string | null
          created_at?: string | null
          day_of_week: number
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          is_cancelled?: boolean | null
          is_recurring?: boolean | null
          language?: string | null
          session_name: string
          start_time: string
          teacher_id: string
          title: string
          updated_at?: string | null
          video_enabled?: boolean | null
        }
        Update: {
          cancelled_message?: string | null
          created_at?: string | null
          day_of_week?: number
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          is_cancelled?: boolean | null
          is_recurring?: boolean | null
          language?: string | null
          session_name?: string
          start_time?: string
          teacher_id?: string
          title?: string
          updated_at?: string | null
          video_enabled?: boolean | null
        }
        Relationships: []
      }
      live_transcription: {
        Row: {
          id: string
          is_active: boolean | null
          language: string
          session_name: string
          transcription_text: string | null
          updated_at: string | null
          video_active: boolean | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          language?: string
          session_name?: string
          transcription_text?: string | null
          updated_at?: string | null
          video_active?: boolean | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          language?: string
          session_name?: string
          transcription_text?: string | null
          updated_at?: string | null
          video_active?: boolean | null
        }
        Relationships: []
      }
      mhandara_alerts: {
        Row: {
          action_payload: Json | null
          alert_type: string
          body: string
          created_at: string
          expires_at: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          lesson_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_payload?: Json | null
          alert_type: string
          body: string
          created_at?: string
          expires_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          lesson_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_payload?: Json | null
          alert_type?: string
          body?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          lesson_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mhandara_alerts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_lesson_briefings: {
        Row: {
          briefing_json: Json
          created_at: string
          generated_by: string | null
          id: string
          language: string | null
          lesson_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          briefing_json?: Json
          created_at?: string
          generated_by?: string | null
          id?: string
          language?: string | null
          lesson_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          briefing_json?: Json
          created_at?: string
          generated_by?: string | null
          id?: string
          language?: string | null
          lesson_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pre_registered_students: {
        Row: {
          activated_at: string | null
          batch_id: string
          created_at: string | null
          error_message: string | null
          id: string
          login_username: string
          status: string | null
          student_identifier: string
          student_name: string
          teacher_id: string
          temp_password: string | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          batch_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          login_username: string
          status?: string | null
          student_identifier: string
          student_name: string
          teacher_id: string
          temp_password?: string | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          batch_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          login_username?: string
          status?: string | null
          student_identifier?: string
          student_name?: string
          teacher_id?: string
          temp_password?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_transcripts: {
        Row: {
          id: string
          language: string | null
          saved_at: string | null
          saved_by: string
          session_name: string
          title: string
          transcript_text: string
        }
        Insert: {
          id?: string
          language?: string | null
          saved_at?: string | null
          saved_by: string
          session_name: string
          title: string
          transcript_text: string
        }
        Update: {
          id?: string
          language?: string | null
          saved_at?: string | null
          saved_by?: string
          session_name?: string
          title?: string
          transcript_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_transcripts_saved_by_fkey"
            columns: ["saved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          display_name: string
          hand_raised: boolean | null
          hand_raised_at: string | null
          id: string
          is_unmuted: boolean | null
          joined_at: string | null
          session_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          display_name: string
          hand_raised?: boolean | null
          hand_raised_at?: string | null
          id?: string
          is_unmuted?: boolean | null
          joined_at?: string | null
          session_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          display_name?: string
          hand_raised?: boolean | null
          hand_raised_at?: string | null
          id?: string
          is_unmuted?: boolean | null
          joined_at?: string | null
          session_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_achievements: {
        Row: {
          achievement_type: string
          earned_at: string | null
          id: string
          metadata: Json | null
          student_id: string
        }
        Insert: {
          achievement_type: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          student_id: string
        }
        Update: {
          achievement_type?: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          student_id?: string
        }
        Relationships: []
      }
      student_documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_confidential: boolean
          link_url: string | null
          notes: string | null
          student_id: string
          title: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_confidential?: boolean
          link_url?: string | null
          notes?: string | null
          student_id: string
          title: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_confidential?: boolean
          link_url?: string | null
          notes?: string | null
          student_id?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      student_feedback: {
        Row: {
          created_at: string
          feedback_text: string
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id: string
          lesson_id: string
          student_id: string
          teacher_acknowledged: boolean
          teacher_response: string | null
        }
        Insert: {
          created_at?: string
          feedback_text: string
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          id?: string
          lesson_id: string
          student_id: string
          teacher_acknowledged?: boolean
          teacher_response?: string | null
        }
        Update: {
          created_at?: string
          feedback_text?: string
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          id?: string
          lesson_id?: string
          student_id?: string
          teacher_acknowledged?: boolean
          teacher_response?: string | null
        }
        Relationships: []
      }
      student_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitation_token: string
          invited_email: string
          status: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_token: string
          invited_email: string
          status?: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_email?: string
          status?: string
          teacher_id?: string
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          lesson_id: string
          mark: number | null
          session_date: string
          student_id: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          mark?: number | null
          session_date?: string
          student_id: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          mark?: number | null
          session_date?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string | null
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
      student_reports: {
        Row: {
          created_at: string
          generated_by: string
          id: string
          period_end: string
          period_start: string
          report_json: Json
          shared_via_whatsapp_at: string | null
          shared_with_guardian_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          student_id: string
          teacher_narrative: string | null
          teacher_recommendations: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_by: string
          id?: string
          period_end: string
          period_start: string
          report_json?: Json
          shared_via_whatsapp_at?: string | null
          shared_with_guardian_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_id: string
          teacher_narrative?: string | null
          teacher_recommendations?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_by?: string
          id?: string
          period_end?: string
          period_start?: string
          report_json?: Json
          shared_via_whatsapp_at?: string | null
          shared_with_guardian_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_id?: string
          teacher_narrative?: string | null
          teacher_recommendations?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student_vocabulary: {
        Row: {
          created_at: string | null
          definition: string | null
          example_sentence: string | null
          id: string
          lesson_id: string | null
          mastered: boolean | null
          student_id: string
          term: string
        }
        Insert: {
          created_at?: string | null
          definition?: string | null
          example_sentence?: string | null
          id?: string
          lesson_id?: string | null
          mastered?: boolean | null
          student_id: string
          term: string
        }
        Update: {
          created_at?: string | null
          definition?: string | null
          example_sentence?: string | null
          id?: string
          lesson_id?: string | null
          mastered?: boolean | null
          student_id?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_vocabulary_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_students: {
        Row: {
          id: string
          invitation_id: string | null
          joined_at: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          id?: string
          invitation_id?: string | null
          joined_at?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          id?: string
          invitation_id?: string | null
          joined_at?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_students_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "student_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_today_state: {
        Row: {
          alert_count: number
          at_risk_count: number
          date: string
          dialect_bridge_auto_enabled: number
          id: string
          last_computed_at: string
          lessons: Json
          pre_lesson_briefings_sent: number
          suggestions: Json
          teacher_id: string
        }
        Insert: {
          alert_count?: number
          at_risk_count?: number
          date?: string
          dialect_bridge_auto_enabled?: number
          id?: string
          last_computed_at?: string
          lessons?: Json
          pre_lesson_briefings_sent?: number
          suggestions?: Json
          teacher_id: string
        }
        Update: {
          alert_count?: number
          at_risk_count?: number
          date?: string
          dialect_bridge_auto_enabled?: number
          id?: string
          last_computed_at?: string
          lessons?: Json
          pre_lesson_briefings_sent?: number
          suggestions?: Json
          teacher_id?: string
        }
        Relationships: []
      }
      universal_signs: {
        Row: {
          category: string | null
          concept_description: string
          created_at: string
          created_by: string | null
          gloss: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          concept_description: string
          created_at?: string
          created_by?: string | null
          gloss: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          concept_description?: string
          created_at?: string
          created_by?: string | null
          gloss?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validator_panel_members: {
        Row: {
          created_at: string
          id: string
          is_deaf_signer: boolean
          panel_role: string
          region: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deaf_signer?: boolean
          panel_role?: string
          region: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deaf_signer?: boolean
          panel_role?: string
          region?: string
          user_id?: string
        }
        Relationships: []
      }
      variant_reviews: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          reviewer_id: string
          variant_id: string
          version_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id: string
          variant_id: string
          version_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id?: string
          variant_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_reviews_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "dialect_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_reviews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "variant_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_versions: {
        Row: {
          change_note: string | null
          created_at: string
          description: string | null
          edited_by: string | null
          id: string
          notation: string | null
          variant_id: string
          variant_label: string
          version_number: number
          video_url: string | null
        }
        Insert: {
          change_note?: string | null
          created_at?: string
          description?: string | null
          edited_by?: string | null
          id?: string
          notation?: string | null
          variant_id: string
          variant_label: string
          version_number: number
          video_url?: string | null
        }
        Update: {
          change_note?: string | null
          created_at?: string
          description?: string | null
          edited_by?: string | null
          id?: string
          notation?: string | null
          variant_id?: string
          variant_label?: string
          version_number?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_versions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "dialect_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_lesson_teacher: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      is_validator: {
        Args: { _region: string; _user_id: string }
        Returns: boolean
      }
      switch_my_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      validate_invitation_token: { Args: { _token: string }; Returns: Json }
    }
    Enums: {
      app_role: "teacher" | "student" | "admin"
      document_type: "medical_report" | "iep" | "assessment" | "other"
      feedback_type: "challenge" | "question" | "reflection"
      report_status: "draft" | "finalised" | "shared"
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
      app_role: ["teacher", "student", "admin"],
      document_type: ["medical_report", "iep", "assessment", "other"],
      feedback_type: ["challenge", "question", "reflection"],
      report_status: ["draft", "finalised", "shared"],
    },
  },
} as const

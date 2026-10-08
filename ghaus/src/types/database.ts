export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          at: string;
          before: Json | null;
          changed_fields: string[] | null;
          client_id: string | null;
          firm_id: string;
          id: number;
          module: Database["public"]["Enums"]["app_module"] | null;
          record_id: string;
          table_name: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          changed_fields?: string[] | null;
          client_id?: string | null;
          firm_id: string;
          id?: never;
          module?: Database["public"]["Enums"]["app_module"] | null;
          record_id: string;
          table_name: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          changed_fields?: string[] | null;
          client_id?: string | null;
          firm_id?: string;
          id?: never;
          module?: Database["public"]["Enums"]["app_module"] | null;
          record_id?: string;
          table_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      appeals: {
        Row: {
          appeal_no: string | null;
          assignee_id: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          demand_amount: number;
          filed_on: string | null;
          firm_id: string;
          forum: Database["public"]["Enums"]["appeal_forum"];
          id: string;
          notes: string | null;
          notice_id: string | null;
          order_date: string | null;
          order_no: string | null;
          order_received_on: string | null;
          outcome: Database["public"]["Enums"]["appeal_outcome"];
          parent_appeal_id: string | null;
          reviewer_id: string | null;
          status: Database["public"]["Enums"]["appeal_status"];
          tax_year: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          appeal_no?: string | null;
          assignee_id?: string | null;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          demand_amount?: number;
          filed_on?: string | null;
          firm_id?: string;
          forum: Database["public"]["Enums"]["appeal_forum"];
          id?: string;
          notes?: string | null;
          notice_id?: string | null;
          order_date?: string | null;
          order_no?: string | null;
          order_received_on?: string | null;
          outcome?: Database["public"]["Enums"]["appeal_outcome"];
          parent_appeal_id?: string | null;
          reviewer_id?: string | null;
          status?: Database["public"]["Enums"]["appeal_status"];
          tax_year?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          appeal_no?: string | null;
          assignee_id?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          demand_amount?: number;
          filed_on?: string | null;
          firm_id?: string;
          forum?: Database["public"]["Enums"]["appeal_forum"];
          id?: string;
          notes?: string | null;
          notice_id?: string | null;
          order_date?: string | null;
          order_no?: string | null;
          order_received_on?: string | null;
          outcome?: Database["public"]["Enums"]["appeal_outcome"];
          parent_appeal_id?: string | null;
          reviewer_id?: string | null;
          status?: Database["public"]["Enums"]["appeal_status"];
          tax_year?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appeals_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_notice_id_fkey";
            columns: ["notice_id"];
            isOneToOne: false;
            referencedRelation: "notices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_parent_appeal_id_fkey";
            columns: ["parent_appeal_id"];
            isOneToOne: false;
            referencedRelation: "appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_parent_appeal_id_fkey";
            columns: ["parent_appeal_id"];
            isOneToOne: false;
            referencedRelation: "v_appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      client_registrations: {
        Row: {
          authority: Database["public"]["Enums"]["registration_authority"];
          client_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          firm_id: string;
          id: string;
          notes: string | null;
          registered_on: string | null;
          registration_no: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          authority: Database["public"]["Enums"]["registration_authority"];
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          notes?: string | null;
          registered_on?: string | null;
          registration_no: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          authority?: Database["public"]["Enums"]["registration_authority"];
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          notes?: string | null;
          registered_on?: string | null;
          registration_no?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_registrations_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_registrations_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      client_relations: {
        Row: {
          client_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          firm_id: string;
          id: string;
          notes: string | null;
          related_client_id: string;
          relation: Database["public"]["Enums"]["relation_type"];
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          notes?: string | null;
          related_client_id: string;
          relation: Database["public"]["Enums"]["relation_type"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          notes?: string | null;
          related_client_id?: string;
          relation?: Database["public"]["Enums"]["relation_type"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_relations_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_relations_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_relations_related_client_id_fkey";
            columns: ["related_client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_tax_years: {
        Row: {
          acknowledgment_no: string | null;
          assignee_id: string | null;
          atl_last_checked_on: string | null;
          atl_status: Database["public"]["Enums"]["atl_status"];
          client_id: string;
          closing_wealth: number;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          filed_on: string | null;
          firm_id: string;
          id: string;
          income_business: number;
          income_capital_gains: number;
          income_exempt: number;
          income_final_fixed: number;
          income_other_sources: number;
          income_property: number;
          income_salary: number;
          inflow_foreign_remittance: number;
          inflow_gifts: number;
          inflow_inheritance: number;
          inflow_loans: number;
          inflow_other: number;
          notes: string | null;
          opening_wealth: number;
          other_outflows: number;
          payable_refundable: number | null;
          personal_expenses: number;
          return_status: Database["public"]["Enums"]["return_status"];
          review_signed_off_at: string | null;
          review_signed_off_by: string | null;
          reviewer_id: string | null;
          tax_chargeable: number;
          tax_withheld_paid: number;
          tax_year: number;
          taxable_income: number;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          acknowledgment_no?: string | null;
          assignee_id?: string | null;
          atl_last_checked_on?: string | null;
          atl_status?: Database["public"]["Enums"]["atl_status"];
          client_id: string;
          closing_wealth?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          filed_on?: string | null;
          firm_id?: string;
          id?: string;
          income_business?: number;
          income_capital_gains?: number;
          income_exempt?: number;
          income_final_fixed?: number;
          income_other_sources?: number;
          income_property?: number;
          income_salary?: number;
          inflow_foreign_remittance?: number;
          inflow_gifts?: number;
          inflow_inheritance?: number;
          inflow_loans?: number;
          inflow_other?: number;
          notes?: string | null;
          opening_wealth?: number;
          other_outflows?: number;
          payable_refundable?: never;
          personal_expenses?: number;
          return_status?: Database["public"]["Enums"]["return_status"];
          review_signed_off_at?: string | null;
          review_signed_off_by?: string | null;
          reviewer_id?: string | null;
          tax_chargeable?: number;
          tax_withheld_paid?: number;
          tax_year: number;
          taxable_income?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          acknowledgment_no?: string | null;
          assignee_id?: string | null;
          atl_last_checked_on?: string | null;
          atl_status?: Database["public"]["Enums"]["atl_status"];
          client_id?: string;
          closing_wealth?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          filed_on?: string | null;
          firm_id?: string;
          id?: string;
          income_business?: number;
          income_capital_gains?: number;
          income_exempt?: number;
          income_final_fixed?: number;
          income_other_sources?: number;
          income_property?: number;
          income_salary?: number;
          inflow_foreign_remittance?: number;
          inflow_gifts?: number;
          inflow_inheritance?: number;
          inflow_loans?: number;
          inflow_other?: number;
          notes?: string | null;
          opening_wealth?: number;
          other_outflows?: number;
          payable_refundable?: never;
          personal_expenses?: number;
          return_status?: Database["public"]["Enums"]["return_status"];
          review_signed_off_at?: string | null;
          review_signed_off_by?: string | null;
          reviewer_id?: string | null;
          tax_chargeable?: number;
          tax_withheld_paid?: number;
          tax_year?: number;
          taxable_income?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_tax_years_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_tax_years_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_tax_years_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_tax_years_review_signed_off_by_fkey";
            columns: ["review_signed_off_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_tax_years_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          assignee_id: string | null;
          city: string | null;
          client_type: Database["public"]["Enums"]["client_type"];
          cnic: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          email: string | null;
          firm_id: string;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          ntn: string | null;
          phone: string | null;
          referred_by: string | null;
          reviewer_id: string | null;
          search_digits: string | null;
          strn: string | null;
          updated_at: string;
          updated_by: string | null;
          whatsapp: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          assignee_id?: string | null;
          city?: string | null;
          client_type: Database["public"]["Enums"]["client_type"];
          cnic?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email?: string | null;
          firm_id?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          ntn?: string | null;
          phone?: string | null;
          referred_by?: string | null;
          reviewer_id?: string | null;
          search_digits?: never;
          strn?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          assignee_id?: string | null;
          city?: string | null;
          client_type?: Database["public"]["Enums"]["client_type"];
          cnic?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email?: string | null;
          firm_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          ntn?: string | null;
          phone?: string | null;
          referred_by?: string | null;
          reviewer_id?: string | null;
          search_digits?: never;
          strn?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          body: string;
          client_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          entity_id: string;
          entity_type: string;
          firm_id: string;
          id: string;
          mentions: string[];
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          entity_id: string;
          entity_type: string;
          firm_id?: string;
          id?: string;
          mentions?: string[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          body?: string;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          entity_id?: string;
          entity_type?: string;
          firm_id?: string;
          id?: string;
          mentions?: string[];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      credentials: {
        Row: {
          client_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          firm_id: string;
          id: string;
          label: string | null;
          last_rotated_on: string | null;
          notes: string | null;
          portal: Database["public"]["Enums"]["portal"];
          secret_ciphertext: string;
          updated_at: string;
          updated_by: string | null;
          username: string;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          label?: string | null;
          last_rotated_on?: string | null;
          notes?: string | null;
          portal: Database["public"]["Enums"]["portal"];
          secret_ciphertext: string;
          updated_at?: string;
          updated_by?: string | null;
          username: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          label?: string | null;
          last_rotated_on?: string | null;
          notes?: string | null;
          portal?: Database["public"]["Enums"]["portal"];
          secret_ciphertext?: string;
          updated_at?: string;
          updated_by?: string | null;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credentials_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credentials_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      deadline_overrides: {
        Row: {
          client_types: Database["public"]["Enums"]["client_type"][] | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          due_date: string;
          firm_id: string;
          id: string;
          notes: string | null;
          period_start: string | null;
          reference: string;
          rule_id: string;
          tax_year: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          client_types?: Database["public"]["Enums"]["client_type"][] | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          due_date: string;
          firm_id?: string;
          id?: string;
          notes?: string | null;
          period_start?: string | null;
          reference: string;
          rule_id: string;
          tax_year?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          client_types?: Database["public"]["Enums"]["client_type"][] | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          due_date?: string;
          firm_id?: string;
          id?: string;
          notes?: string | null;
          period_start?: string | null;
          reference?: string;
          rule_id?: string;
          tax_year?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deadline_overrides_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deadline_overrides_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "deadline_rules";
            referencedColumns: ["id"];
          },
        ];
      };
      deadline_rules: {
        Row: {
          authority: string | null;
          client_types: Database["public"]["Enums"]["client_type"][] | null;
          created_at: string;
          created_by: string | null;
          days_after: number | null;
          deleted_at: string | null;
          deleted_by: string | null;
          due_day: number | null;
          due_month: number | null;
          firm_id: string;
          forum: Database["public"]["Enums"]["appeal_forum"] | null;
          id: string;
          is_active: boolean;
          key: string;
          kind: Database["public"]["Enums"]["deadline_kind"];
          month_offset: number | null;
          name: string;
          notes: string | null;
          period_months: number | null;
          updated_at: string;
          updated_by: string | null;
          year_offset: number | null;
        };
        ComputedFields: never;
        Insert: {
          authority?: string | null;
          client_types?: Database["public"]["Enums"]["client_type"][] | null;
          created_at?: string;
          created_by?: string | null;
          days_after?: number | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          due_day?: number | null;
          due_month?: number | null;
          firm_id?: string;
          forum?: Database["public"]["Enums"]["appeal_forum"] | null;
          id?: string;
          is_active?: boolean;
          key: string;
          kind: Database["public"]["Enums"]["deadline_kind"];
          month_offset?: number | null;
          name: string;
          notes?: string | null;
          period_months?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          year_offset?: number | null;
        };
        Update: {
          authority?: string | null;
          client_types?: Database["public"]["Enums"]["client_type"][] | null;
          created_at?: string;
          created_by?: string | null;
          days_after?: number | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          due_day?: number | null;
          due_month?: number | null;
          firm_id?: string;
          forum?: Database["public"]["Enums"]["appeal_forum"] | null;
          id?: string;
          is_active?: boolean;
          key?: string;
          kind?: Database["public"]["Enums"]["deadline_kind"];
          month_offset?: number | null;
          name?: string;
          notes?: string | null;
          period_months?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          year_offset?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "deadline_rules_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      document_types: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          firm_id: string;
          id: string;
          is_active: boolean;
          key: string;
          name: string;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          is_active?: boolean;
          key: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          is_active?: boolean;
          key?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_types_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          appeal_id: string | null;
          client_id: string;
          client_tax_year_id: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          document_date: string | null;
          document_type_id: string | null;
          file_name: string;
          firm_id: string;
          id: string;
          mime_type: string | null;
          notes: string | null;
          notice_id: string | null;
          size_bytes: number | null;
          storage_path: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          appeal_id?: string | null;
          client_id: string;
          client_tax_year_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          document_date?: string | null;
          document_type_id?: string | null;
          file_name: string;
          firm_id?: string;
          id?: string;
          mime_type?: string | null;
          notes?: string | null;
          notice_id?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          appeal_id?: string | null;
          client_id?: string;
          client_tax_year_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          document_date?: string | null;
          document_type_id?: string | null;
          file_name?: string;
          firm_id?: string;
          id?: string;
          mime_type?: string | null;
          notes?: string | null;
          notice_id?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_appeal_id_fkey";
            columns: ["appeal_id"];
            isOneToOne: false;
            referencedRelation: "appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_appeal_id_fkey";
            columns: ["appeal_id"];
            isOneToOne: false;
            referencedRelation: "v_appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_client_tax_year_id_fkey";
            columns: ["client_tax_year_id"];
            isOneToOne: false;
            referencedRelation: "client_tax_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_client_tax_year_id_fkey";
            columns: ["client_tax_year_id"];
            isOneToOne: false;
            referencedRelation: "v_client_tax_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_document_type_id_fkey";
            columns: ["document_type_id"];
            isOneToOne: false;
            referencedRelation: "document_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_notice_id_fkey";
            columns: ["notice_id"];
            isOneToOne: false;
            referencedRelation: "notices";
            referencedColumns: ["id"];
          },
        ];
      };
      fee_agreements: {
        Row: {
          agreed_on: string | null;
          amount: number;
          appeal_id: string | null;
          client_id: string;
          client_tax_year_id: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string;
          firm_id: string;
          id: string;
          notes: string | null;
          notice_id: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          agreed_on?: string | null;
          amount: number;
          appeal_id?: string | null;
          client_id: string;
          client_tax_year_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description: string;
          firm_id?: string;
          id?: string;
          notes?: string | null;
          notice_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          agreed_on?: string | null;
          amount?: number;
          appeal_id?: string | null;
          client_id?: string;
          client_tax_year_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string;
          firm_id?: string;
          id?: string;
          notes?: string | null;
          notice_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fee_agreements_appeal_id_fkey";
            columns: ["appeal_id"];
            isOneToOne: false;
            referencedRelation: "appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_agreements_appeal_id_fkey";
            columns: ["appeal_id"];
            isOneToOne: false;
            referencedRelation: "v_appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_agreements_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_agreements_client_tax_year_id_fkey";
            columns: ["client_tax_year_id"];
            isOneToOne: false;
            referencedRelation: "client_tax_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_agreements_client_tax_year_id_fkey";
            columns: ["client_tax_year_id"];
            isOneToOne: false;
            referencedRelation: "v_client_tax_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_agreements_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_agreements_notice_id_fkey";
            columns: ["notice_id"];
            isOneToOne: false;
            referencedRelation: "notices";
            referencedColumns: ["id"];
          },
        ];
      };
      firms: {
        Row: {
          address: string | null;
          atl_risk_days: number;
          atl_surcharge_aop: number;
          atl_surcharge_company: number;
          atl_surcharge_individual: number;
          city: string | null;
          created_at: string;
          created_by: string | null;
          default_number_format: string;
          deleted_at: string | null;
          deleted_by: string | null;
          email: string | null;
          id: string;
          name: string;
          ntn: string | null;
          phone: string | null;
          s114c_enabled: boolean;
          s114c_property_threshold: number;
          s114c_ratio: number;
          s114c_vehicle_threshold: number;
          updated_at: string;
          updated_by: string | null;
          wealth_gap_threshold: number;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          atl_risk_days?: number;
          atl_surcharge_aop?: number;
          atl_surcharge_company?: number;
          atl_surcharge_individual?: number;
          city?: string | null;
          created_at?: string;
          created_by?: string | null;
          default_number_format?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          ntn?: string | null;
          phone?: string | null;
          s114c_enabled?: boolean;
          s114c_property_threshold?: number;
          s114c_ratio?: number;
          s114c_vehicle_threshold?: number;
          updated_at?: string;
          updated_by?: string | null;
          wealth_gap_threshold?: number;
        };
        Update: {
          address?: string | null;
          atl_risk_days?: number;
          atl_surcharge_aop?: number;
          atl_surcharge_company?: number;
          atl_surcharge_individual?: number;
          city?: string | null;
          created_at?: string;
          created_by?: string | null;
          default_number_format?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          ntn?: string | null;
          phone?: string | null;
          s114c_enabled?: boolean;
          s114c_property_threshold?: number;
          s114c_ratio?: number;
          s114c_vehicle_threshold?: number;
          updated_at?: string;
          updated_by?: string | null;
          wealth_gap_threshold?: number;
        };
        Relationships: [];
      };
      hearings: {
        Row: {
          appeal_id: string | null;
          appearing_user_id: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          firm_id: string;
          forum: string | null;
          hearing_date: string;
          hearing_time: string | null;
          id: string;
          next_date: string | null;
          notes: string | null;
          notice_id: string | null;
          outcome: string | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          appeal_id?: string | null;
          appearing_user_id?: string | null;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          forum?: string | null;
          hearing_date: string;
          hearing_time?: string | null;
          id?: string;
          next_date?: string | null;
          notes?: string | null;
          notice_id?: string | null;
          outcome?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          appeal_id?: string | null;
          appearing_user_id?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          forum?: string | null;
          hearing_date?: string;
          hearing_time?: string | null;
          id?: string;
          next_date?: string | null;
          notes?: string | null;
          notice_id?: string | null;
          outcome?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hearings_appeal_id_fkey";
            columns: ["appeal_id"];
            isOneToOne: false;
            referencedRelation: "appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hearings_appeal_id_fkey";
            columns: ["appeal_id"];
            isOneToOne: false;
            referencedRelation: "v_appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hearings_appearing_user_id_fkey";
            columns: ["appearing_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hearings_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hearings_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hearings_notice_id_fkey";
            columns: ["notice_id"];
            isOneToOne: false;
            referencedRelation: "notices";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          amount: number;
          client_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          due_date: string | null;
          fee_agreement_id: string | null;
          firm_id: string;
          id: string;
          invoice_no: string;
          issue_date: string;
          notes: string | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          due_date?: string | null;
          fee_agreement_id?: string | null;
          firm_id?: string;
          id?: string;
          invoice_no: string;
          issue_date: string;
          notes?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          amount?: number;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          due_date?: string | null;
          fee_agreement_id?: string | null;
          firm_id?: string;
          id?: string;
          invoice_no?: string;
          issue_date?: string;
          notes?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_fee_agreement_id_fkey";
            columns: ["fee_agreement_id"];
            isOneToOne: false;
            referencedRelation: "fee_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      message_templates: {
        Row: {
          body: string;
          channel: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          firm_id: string;
          id: string;
          is_active: boolean;
          key: string;
          name: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          channel?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          is_active?: boolean;
          key: string;
          name: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          body?: string;
          channel?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          is_active?: boolean;
          key?: string;
          name?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "message_templates_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      notice_sections: {
        Row: {
          created_at: string;
          created_by: string | null;
          default_reply_days: number;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string | null;
          firm_id: string;
          id: string;
          is_active: boolean;
          law: Database["public"]["Enums"]["tax_law"];
          reply_template: string | null;
          section: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          default_reply_days?: number;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          firm_id?: string;
          id?: string;
          is_active?: boolean;
          law: Database["public"]["Enums"]["tax_law"];
          reply_template?: string | null;
          section: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          default_reply_days?: number;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          firm_id?: string;
          id?: string;
          is_active?: boolean;
          law?: Database["public"]["Enums"]["tax_law"];
          reply_template?: string | null;
          section?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notice_sections_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      notices: {
        Row: {
          assignee_id: string | null;
          client_id: string;
          client_tax_year_id: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          demand_amount: number;
          firm_id: string;
          id: string;
          issue_date: string | null;
          law: Database["public"]["Enums"]["tax_law"];
          notes: string | null;
          notice_no: string | null;
          officer_designation: string | null;
          officer_name: string | null;
          received_date: string | null;
          reply_due_date: string | null;
          review_signed_off_at: string | null;
          review_signed_off_by: string | null;
          reviewer_id: string | null;
          section: string;
          section_id: string | null;
          status: Database["public"]["Enums"]["notice_status"];
          submitted_on: string | null;
          summary: string | null;
          tax_office_city: string | null;
          tax_office_type: string | null;
          tax_year: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          assignee_id?: string | null;
          client_id: string;
          client_tax_year_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          demand_amount?: number;
          firm_id?: string;
          id?: string;
          issue_date?: string | null;
          law?: Database["public"]["Enums"]["tax_law"];
          notes?: string | null;
          notice_no?: string | null;
          officer_designation?: string | null;
          officer_name?: string | null;
          received_date?: string | null;
          reply_due_date?: string | null;
          review_signed_off_at?: string | null;
          review_signed_off_by?: string | null;
          reviewer_id?: string | null;
          section: string;
          section_id?: string | null;
          status?: Database["public"]["Enums"]["notice_status"];
          submitted_on?: string | null;
          summary?: string | null;
          tax_office_city?: string | null;
          tax_office_type?: string | null;
          tax_year?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          assignee_id?: string | null;
          client_id?: string;
          client_tax_year_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          demand_amount?: number;
          firm_id?: string;
          id?: string;
          issue_date?: string | null;
          law?: Database["public"]["Enums"]["tax_law"];
          notes?: string | null;
          notice_no?: string | null;
          officer_designation?: string | null;
          officer_name?: string | null;
          received_date?: string | null;
          reply_due_date?: string | null;
          review_signed_off_at?: string | null;
          review_signed_off_by?: string | null;
          reviewer_id?: string | null;
          section?: string;
          section_id?: string | null;
          status?: Database["public"]["Enums"]["notice_status"];
          submitted_on?: string | null;
          summary?: string | null;
          tax_office_city?: string | null;
          tax_office_type?: string | null;
          tax_year?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notices_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notices_client_tax_year_id_fkey";
            columns: ["client_tax_year_id"];
            isOneToOne: false;
            referencedRelation: "client_tax_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notices_client_tax_year_id_fkey";
            columns: ["client_tax_year_id"];
            isOneToOne: false;
            referencedRelation: "v_client_tax_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notices_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notices_review_signed_off_by_fkey";
            columns: ["review_signed_off_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notices_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notices_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "notice_sections";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          entity_id: string | null;
          entity_type: string | null;
          firm_id: string;
          id: string;
          kind: string;
          link: string | null;
          read_at: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          firm_id?: string;
          id?: string;
          kind: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          firm_id?: string;
          id?: string;
          kind?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          client_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          firm_id: string;
          id: string;
          invoice_id: string | null;
          method: string;
          notes: string | null;
          received_on: string;
          reference: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          invoice_id?: string | null;
          method?: string;
          notes?: string | null;
          received_on: string;
          reference?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          amount?: number;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          invoice_id?: string | null;
          method?: string;
          notes?: string | null;
          received_on?: string;
          reference?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "v_invoice_balances";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline_task_rules: {
        Row: {
          assign_to: string;
          complete_on_status: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          due_in_days: number;
          entity: Database["public"]["Enums"]["pipeline_entity"];
          firm_id: string;
          id: string;
          is_active: boolean;
          on_status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          assign_to?: string;
          complete_on_status?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          due_in_days?: number;
          entity: Database["public"]["Enums"]["pipeline_entity"];
          firm_id?: string;
          id?: string;
          is_active?: boolean;
          on_status: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          assign_to?: string;
          complete_on_status?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          due_in_days?: number;
          entity?: Database["public"]["Enums"]["pipeline_entity"];
          firm_id?: string;
          id?: string;
          is_active?: boolean;
          on_status?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_task_rules_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          can_edit: boolean;
          can_view: boolean;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          firm_id: string;
          id: string;
          module: Database["public"]["Enums"]["app_module"];
          role_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          can_edit?: boolean;
          can_view?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          module: Database["public"]["Enums"]["app_module"];
          role_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          can_edit?: boolean;
          can_view?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          module?: Database["public"]["Enums"]["app_module"];
          role_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          firm_id: string;
          id: string;
          is_system: boolean;
          key: string;
          name: string;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          is_system?: boolean;
          key: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          firm_id?: string;
          id?: string;
          is_system?: boolean;
          key?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "roles_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          appeal_id: string | null;
          assignee_id: string | null;
          auto_rule_id: string | null;
          client_id: string | null;
          client_tax_year_id: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string | null;
          due_date: string | null;
          firm_id: string;
          id: string;
          notice_id: string | null;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          appeal_id?: string | null;
          assignee_id?: string | null;
          auto_rule_id?: string | null;
          client_id?: string | null;
          client_tax_year_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          firm_id?: string;
          id?: string;
          notice_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          appeal_id?: string | null;
          assignee_id?: string | null;
          auto_rule_id?: string | null;
          client_id?: string | null;
          client_tax_year_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          firm_id?: string;
          id?: string;
          notice_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_appeal_id_fkey";
            columns: ["appeal_id"];
            isOneToOne: false;
            referencedRelation: "appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_appeal_id_fkey";
            columns: ["appeal_id"];
            isOneToOne: false;
            referencedRelation: "v_appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_auto_rule_id_fkey";
            columns: ["auto_rule_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_task_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_client_tax_year_id_fkey";
            columns: ["client_tax_year_id"];
            isOneToOne: false;
            referencedRelation: "client_tax_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_client_tax_year_id_fkey";
            columns: ["client_tax_year_id"];
            isOneToOne: false;
            referencedRelation: "v_client_tax_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_notice_id_fkey";
            columns: ["notice_id"];
            isOneToOne: false;
            referencedRelation: "notices";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          email: string;
          firm_id: string;
          full_name: string;
          id: string;
          is_active: boolean;
          number_format: string | null;
          phone: string | null;
          role_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email: string;
          firm_id?: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          number_format?: string | null;
          phone?: string | null;
          role_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email?: string;
          firm_id?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          number_format?: string | null;
          phone?: string | null;
          role_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      wealth_items: {
        Row: {
          category: Database["public"]["Enums"]["wealth_category"];
          client_id: string;
          client_tax_year_id: string;
          cost: number;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string;
          firm_id: string;
          id: string;
          is_cash_equivalent: boolean;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          category: Database["public"]["Enums"]["wealth_category"];
          client_id: string;
          client_tax_year_id: string;
          cost?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description: string;
          firm_id?: string;
          id?: string;
          is_cash_equivalent?: boolean;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          category?: Database["public"]["Enums"]["wealth_category"];
          client_id?: string;
          client_tax_year_id?: string;
          cost?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string;
          firm_id?: string;
          id?: string;
          is_cash_equivalent?: boolean;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wealth_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wealth_items_client_tax_year_id_fkey";
            columns: ["client_tax_year_id"];
            isOneToOne: false;
            referencedRelation: "client_tax_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wealth_items_client_tax_year_id_fkey";
            columns: ["client_tax_year_id"];
            isOneToOne: false;
            referencedRelation: "v_client_tax_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wealth_items_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_appeals: {
        Row: {
          appeal_no: string | null;
          assignee_id: string | null;
          client_id: string | null;
          client_name: string | null;
          created_at: string | null;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          demand_amount: number | null;
          filed_on: string | null;
          firm_id: string | null;
          forum: Database["public"]["Enums"]["appeal_forum"] | null;
          id: string | null;
          limitation_deadline: string | null;
          notes: string | null;
          notice_id: string | null;
          order_date: string | null;
          order_no: string | null;
          order_received_on: string | null;
          outcome: Database["public"]["Enums"]["appeal_outcome"] | null;
          parent_appeal_id: string | null;
          reviewer_id: string | null;
          status: Database["public"]["Enums"]["appeal_status"] | null;
          tax_year: number | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "appeals_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_notice_id_fkey";
            columns: ["notice_id"];
            isOneToOne: false;
            referencedRelation: "notices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_parent_appeal_id_fkey";
            columns: ["parent_appeal_id"];
            isOneToOne: false;
            referencedRelation: "appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_parent_appeal_id_fkey";
            columns: ["parent_appeal_id"];
            isOneToOne: false;
            referencedRelation: "v_appeals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appeals_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      v_client_tax_years: {
        Row: {
          acknowledgment_no: string | null;
          assignee_id: string | null;
          atl_last_checked_on: string | null;
          atl_status: Database["public"]["Enums"]["atl_status"] | null;
          city: string | null;
          client_id: string | null;
          client_is_active: boolean | null;
          client_name: string | null;
          client_type: Database["public"]["Enums"]["client_type"] | null;
          closing_wealth: number | null;
          cnic: string | null;
          created_at: string | null;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          effective_closing_wealth: number | null;
          expected_closing_wealth: number | null;
          filed_on: string | null;
          filing_due_date: string | null;
          firm_id: string | null;
          id: string | null;
          income_business: number | null;
          income_capital_gains: number | null;
          income_exempt: number | null;
          income_final_fixed: number | null;
          income_other_sources: number | null;
          income_property: number | null;
          income_salary: number | null;
          inflow_foreign_remittance: number | null;
          inflow_gifts: number | null;
          inflow_inheritance: number | null;
          inflow_loans: number | null;
          inflow_other: number | null;
          is_filed: boolean | null;
          notes: string | null;
          ntn: string | null;
          opening_wealth: number | null;
          other_outflows: number | null;
          payable_refundable: number | null;
          personal_expenses: number | null;
          return_status: Database["public"]["Enums"]["return_status"] | null;
          review_signed_off_at: string | null;
          review_signed_off_by: string | null;
          reviewer_id: string | null;
          tax_chargeable: number | null;
          tax_withheld_paid: number | null;
          tax_year: number | null;
          taxable_income: number | null;
          total_declared_income: number | null;
          total_other_inflows: number | null;
          updated_at: string | null;
          updated_by: string | null;
          wealth_assets: number | null;
          wealth_cash_equivalents: number | null;
          wealth_gap: number | null;
          wealth_item_count: number | null;
          wealth_liabilities: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "client_tax_years_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_tax_years_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_tax_years_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_tax_years_review_signed_off_by_fkey";
            columns: ["review_signed_off_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_tax_years_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      v_invoice_balances: {
        Row: {
          amount: number | null;
          balance: number | null;
          client_id: string | null;
          client_name: string | null;
          created_at: string | null;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          due_date: string | null;
          fee_agreement_id: string | null;
          firm_id: string | null;
          id: string | null;
          invoice_no: string | null;
          issue_date: string | null;
          notes: string | null;
          paid: number | null;
          status: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_fee_agreement_id_fkey";
            columns: ["fee_agreement_id"];
            isOneToOne: false;
            referencedRelation: "fee_agreements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_firm_id_fkey";
            columns: ["firm_id"];
            isOneToOne: false;
            referencedRelation: "firms";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      appeal_limitation_date: {
        Args: {
          p_firm_id: string;
          p_forum: Database["public"]["Enums"]["appeal_forum"];
          p_order_received_on: string;
        };
        Returns: string;
      };
      create_firm: {
        Args: { p_firm_name: string; p_full_name: string };
        Returns: string;
      };
      get_my_context: { Args: Record<PropertyKey, never>; Returns: Json };
      log_event: {
        Args: {
          p_action: string;
          p_details?: Json;
          p_record_id: string;
          p_table: string;
        };
        Returns: undefined;
      };
      return_due_date: {
        Args: {
          p_client_type: Database["public"]["Enums"]["client_type"];
          p_firm_id: string;
          p_tax_year: number;
        };
        Returns: string;
      };
    };
    Enums: {
      app_module:
        "clients" | "returns" | "notices" | "fees" | "vault" | "settings";
      appeal_forum:
        "commissioner_appeals" | "atir" | "high_court" | "supreme_court";
      appeal_outcome:
        | "pending"
        | "allowed"
        | "partly_allowed"
        | "dismissed"
        | "remanded"
        | "withdrawn";
      appeal_status: "drafting" | "filed" | "hearing" | "decided" | "withdrawn";
      atl_status: "unknown" | "active" | "inactive";
      client_type: "individual" | "aop" | "company";
      deadline_kind:
        | "annual_return"
        | "sales_tax_return"
        | "withholding_statement"
        | "appeal_limitation";
      notice_status:
        | "received"
        | "reply_drafted"
        | "under_review"
        | "submitted"
        | "hearing"
        | "order"
        | "closed"
        | "appealed";
      pipeline_entity: "return" | "notice";
      portal: "IRIS" | "PRA" | "SRB" | "KPRA" | "BRA" | "other";
      registration_authority: "PRA" | "SRB" | "KPRA" | "BRA" | "other";
      relation_type:
        | "spouse"
        | "parent"
        | "child"
        | "sibling"
        | "director"
        | "partner"
        | "member"
        | "shareholder";
      return_status:
        | "not_started"
        | "documents_requested"
        | "documents_received"
        | "in_preparation"
        | "under_review"
        | "sent_for_client_approval"
        | "approved"
        | "filed"
        | "acknowledgment_uploaded"
        | "closed";
      task_status: "open" | "in_progress" | "done" | "cancelled";
      tax_law: "ito_2001" | "sta_1990" | "provincial";
      wealth_category:
        | "immovable_property"
        | "vehicle"
        | "bank_balance"
        | "cash"
        | "gold"
        | "securities"
        | "receivables"
        | "business_capital"
        | "liabilities"
        | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
      app_module: [
        "clients",
        "returns",
        "notices",
        "fees",
        "vault",
        "settings",
      ],
      appeal_forum: [
        "commissioner_appeals",
        "atir",
        "high_court",
        "supreme_court",
      ],
      appeal_outcome: [
        "pending",
        "allowed",
        "partly_allowed",
        "dismissed",
        "remanded",
        "withdrawn",
      ],
      appeal_status: ["drafting", "filed", "hearing", "decided", "withdrawn"],
      atl_status: ["unknown", "active", "inactive"],
      client_type: ["individual", "aop", "company"],
      deadline_kind: [
        "annual_return",
        "sales_tax_return",
        "withholding_statement",
        "appeal_limitation",
      ],
      notice_status: [
        "received",
        "reply_drafted",
        "under_review",
        "submitted",
        "hearing",
        "order",
        "closed",
        "appealed",
      ],
      pipeline_entity: ["return", "notice"],
      portal: ["IRIS", "PRA", "SRB", "KPRA", "BRA", "other"],
      registration_authority: ["PRA", "SRB", "KPRA", "BRA", "other"],
      relation_type: [
        "spouse",
        "parent",
        "child",
        "sibling",
        "director",
        "partner",
        "member",
        "shareholder",
      ],
      return_status: [
        "not_started",
        "documents_requested",
        "documents_received",
        "in_preparation",
        "under_review",
        "sent_for_client_approval",
        "approved",
        "filed",
        "acknowledgment_uploaded",
        "closed",
      ],
      task_status: ["open", "in_progress", "done", "cancelled"],
      tax_law: ["ito_2001", "sta_1990", "provincial"],
      wealth_category: [
        "immovable_property",
        "vehicle",
        "bank_balance",
        "cash",
        "gold",
        "securities",
        "receivables",
        "business_capital",
        "liabilities",
        "other",
      ],
    },
  },
} as const;

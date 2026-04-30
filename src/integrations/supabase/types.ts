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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      billing_checkouts: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          metadata: Json
          password_email_sent_at: string | null
          payment_status: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          stripe_customer_id: string | null
          stripe_event_id: string
          stripe_payment_intent_id: string | null
          stripe_payment_link_id: string | null
          stripe_payment_link_url: string | null
          stripe_session_id: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          metadata?: Json
          password_email_sent_at?: string | null
          payment_status?: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          stripe_customer_id?: string | null
          stripe_event_id: string
          stripe_payment_intent_id?: string | null
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          stripe_session_id: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          metadata?: Json
          password_email_sent_at?: string | null
          payment_status?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          stripe_customer_id?: string | null
          stripe_event_id?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          stripe_session_id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_checkouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      Contatos_Whatsapp: {
        Row: {
          created_at: string
          id: number
          nome: string | null
          observação: string | null
          Observação: string | null
          Photo_perfil: string | null
          Telefone_Whatsapp: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          nome?: string | null
          observação?: string | null
          Observação?: string | null
          Photo_perfil?: string | null
          Telefone_Whatsapp?: string | null
          tenant_id?: string
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string | null
          observação?: string | null
          Observação?: string | null
          Photo_perfil?: string | null
          Telefone_Whatsapp?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Contatos_Whatsapp_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          lead_id: number | null
          nao_lidas: number
          responsavel_id: string | null
          status: string
          telefone: string
          tenant_id: string
          ultima_mensagem_at: string | null
          zapi_webhook_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: number | null
          nao_lidas?: number
          responsavel_id?: string | null
          status?: string
          telefone: string
          tenant_id?: string
          ultima_mensagem_at?: string | null
          zapi_webhook_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: number | null
          nao_lidas?: number
          responsavel_id?: string | null
          status?: string
          telefone?: string
          tenant_id?: string
          ultima_mensagem_at?: string | null
          zapi_webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "Contatos_Whatsapp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "active_user_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_zapi_webhook_id_fkey"
            columns: ["zapi_webhook_id"]
            isOneToOne: false
            referencedRelation: "zapi_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_carros: {
        Row: {
          acessorios: string | null
          active: boolean | null
          ano: number | null
          cambio: string | null
          codigo: string | null
          combustivel: string | null
          cor: string | null
          created_at: string | null
          fotos: Json | null
          km: number | null
          last_sync_id: string | null
          link: string | null
          marca: string | null
          modelo: string | null
          observacoes: string | null
          preco: number | null
          raw: Json | null
          sold_at: string | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          tenant_id: string
          title: string | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          acessorios?: string | null
          active?: boolean | null
          ano?: number | null
          cambio?: string | null
          codigo?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string | null
          fotos?: Json | null
          km?: number | null
          last_sync_id?: string | null
          link?: string | null
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          preco?: number | null
          raw?: Json | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          acessorios?: string | null
          active?: boolean | null
          ano?: number | null
          cambio?: string | null
          codigo?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string | null
          fotos?: Json | null
          km?: number | null
          last_sync_id?: string | null
          link?: string | null
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          preco?: number | null
          raw?: Json | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_carros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_sync_runs: {
        Row: {
          finished_at: string | null
          source_url: string | null
          started_at: string | null
          sync_id: string
          tenant_id: string
          total_deactivated: number | null
          total_deleted: number | null
          total_received: number | null
          total_upserted: number | null
        }
        Insert: {
          finished_at?: string | null
          source_url?: string | null
          started_at?: string | null
          sync_id?: string
          tenant_id?: string
          total_deactivated?: number | null
          total_deleted?: number | null
          total_received?: number | null
          total_upserted?: number | null
        }
        Update: {
          finished_at?: string | null
          source_url?: string | null
          started_at?: string | null
          sync_id?: string
          tenant_id?: string
          total_deactivated?: number | null
          total_deleted?: number | null
          total_received?: number | null
          total_upserted?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_sync_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instancias_whatsapp: {
        Row: {
          created_at: string
          id: number
          instancia: string | null
          tennat_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          instancia?: string | null
          tennat_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          instancia?: string | null
          tennat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instancias_whatsapp_tennat_id_fkey"
            columns: ["tennat_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "active_user_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_status: {
        Row: {
          assigned_to: string | null
          observacao: string | null
          status: string | null
          telefone: string
          tenant_id: string
          ultimo_contato_em: string | null
          updated_at: string | null
          veiculo_interesse: string | null
        }
        Insert: {
          assigned_to?: string | null
          observacao?: string | null
          status?: string | null
          telefone: string
          tenant_id?: string
          ultimo_contato_em?: string | null
          updated_at?: string | null
          veiculo_interesse?: string | null
        }
        Update: {
          assigned_to?: string | null
          observacao?: string | null
          status?: string | null
          telefone?: string
          tenant_id?: string
          ultimo_contato_em?: string | null
          updated_at?: string | null
          veiculo_interesse?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_columns_config: {
        Row: {
          color: string
          column_key: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          pipeline_key: string
          position: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          column_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          pipeline_key: string
          position?: number
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          column_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          pipeline_key?: string
          position?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_columns_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      margens_veiculos: {
        Row: {
          custo_veiculo: number
          despesas: number
          id: string
          observacao: string | null
          tenant_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          custo_veiculo?: number
          despesas?: number
          id?: string
          observacao?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          custo_veiculo?: number
          despesas?: number
          id?: string
          observacao?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "margens_veiculos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "margens_veiculos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "estoque_carros"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "margens_veiculos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_disponivel"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      mensagens_whatsapp: {
        Row: {
          created_at: string
          enviada_pelo_vendedor: string | null
          id: number
          mensagem: string | null
          nome_lead: string | null
          telefone_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          enviada_pelo_vendedor?: string | null
          id?: number
          mensagem?: string | null
          nome_lead?: string | null
          telefone_id?: string | null
          tenant_id?: string
        }
        Update: {
          created_at?: string
          enviada_pelo_vendedor?: string | null
          id?: number
          mensagem?: string | null
          nome_lead?: string | null
          telefone_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_whatsapp_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conteudo: string | null
          conversation_id: string
          created_at: string
          direcao: string
          enviada_pelo_agente: boolean
          id: string
          sender: string
          telefone: string
          tenant_id: string
          tipo: string
          tipo_midia: string | null
          url_midia: string | null
          zapi_msg_id: string | null
        }
        Insert: {
          conteudo?: string | null
          conversation_id: string
          created_at?: string
          direcao?: string
          enviada_pelo_agente?: boolean
          id?: string
          sender: string
          telefone: string
          tenant_id?: string
          tipo?: string
          tipo_midia?: string | null
          url_midia?: string | null
          zapi_msg_id?: string | null
        }
        Update: {
          conteudo?: string | null
          conversation_id?: string
          created_at?: string
          direcao?: string
          enviada_pelo_agente?: boolean
          id?: string
          sender?: string
          telefone?: string
          tenant_id?: string
          tipo?: string
          tipo_midia?: string | null
          url_midia?: string | null
          zapi_msg_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          lead_enabled: boolean
          push_enabled: boolean
          sale_enabled: boolean
          security_enabled: boolean
          system_enabled: boolean
          task_enabled: boolean
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          lead_enabled?: boolean
          push_enabled?: boolean
          sale_enabled?: boolean
          security_enabled?: boolean
          system_enabled?: boolean
          task_enabled?: boolean
          tenant_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          lead_enabled?: boolean
          push_enabled?: boolean
          sale_enabled?: boolean
          security_enabled?: boolean
          system_enabled?: boolean
          task_enabled?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          id: string
          message: string
          metadata: Json
          read_at: string | null
          source_key: string | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          read_at?: string | null
          source_key?: string | null
          tenant_id?: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          read_at?: string | null
          source_key?: string | null
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_venda_cards: {
        Row: {
          cliente_nome: string
          created_at: string
          created_by: string | null
          etapa: string
          id: string
          lead_id: number | null
          mensagem_zap: string
          metadata: Json
          ordem: number
          origem: string
          prazo_label: string
          prazo_tone: string
          proxima_acao: string
          responsavel_id: string | null
          responsavel_nome: string | null
          source_key: string
          status_resumo: string
          status_tone: string
          telefone: string
          tenant_id: string
          updated_at: string
          veiculo_nome: string
          venda_id: string | null
        }
        Insert: {
          cliente_nome: string
          created_at?: string
          created_by?: string | null
          etapa?: string
          id?: string
          lead_id?: number | null
          mensagem_zap: string
          metadata?: Json
          ordem?: number
          origem?: string
          prazo_label?: string
          prazo_tone?: string
          proxima_acao: string
          responsavel_id?: string | null
          responsavel_nome?: string | null
          source_key: string
          status_resumo?: string
          status_tone?: string
          telefone: string
          tenant_id?: string
          updated_at?: string
          veiculo_nome: string
          venda_id?: string | null
        }
        Update: {
          cliente_nome?: string
          created_at?: string
          created_by?: string | null
          etapa?: string
          id?: string
          lead_id?: number | null
          mensagem_zap?: string
          metadata?: Json
          ordem?: number
          origem?: string
          prazo_label?: string
          prazo_tone?: string
          proxima_acao?: string
          responsavel_id?: string | null
          responsavel_nome?: string | null
          source_key?: string
          status_resumo?: string
          status_tone?: string
          telefone?: string
          tenant_id?: string
          updated_at?: string
          veiculo_nome?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_venda_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "active_user_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_venda_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_venda_cards_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "Contatos_Whatsapp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_venda_cards_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "active_user_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_venda_cards_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_venda_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_venda_cards_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_venda_cards_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "view_oportunidades_pos_venda"
            referencedColumns: ["venda_id"]
          },
        ]
      }
      prevenda_contatos: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: number
          nome: string | null
          observacao: string | null
          status: string | null
          telefone_whatsapp: string | null
          tenant_id: string
          updated_at: string | null
          veiculo_ano_fab: number | null
          veiculo_ano_mod: number | null
          veiculo_cambio: string | null
          veiculo_km: number | null
          veiculo_marca: string | null
          veiculo_modelo: string | null
          veiculo_nome: string | null
          veiculo_valor: number | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: number
          nome?: string | null
          observacao?: string | null
          status?: string | null
          telefone_whatsapp?: string | null
          tenant_id?: string
          updated_at?: string | null
          veiculo_ano_fab?: number | null
          veiculo_ano_mod?: number | null
          veiculo_cambio?: string | null
          veiculo_km?: number | null
          veiculo_marca?: string | null
          veiculo_modelo?: string | null
          veiculo_nome?: string | null
          veiculo_valor?: number | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: number
          nome?: string | null
          observacao?: string | null
          status?: string | null
          telefone_whatsapp?: string | null
          tenant_id?: string
          updated_at?: string | null
          veiculo_ano_fab?: number | null
          veiculo_ano_mod?: number | null
          veiculo_cambio?: string | null
          veiculo_km?: number | null
          veiculo_marca?: string | null
          veiculo_modelo?: string | null
          veiculo_nome?: string | null
          veiculo_valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prevenda_contatos_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "active_user_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevenda_contatos_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevenda_contatos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          created_at: string
          data_vencimento: string | null
          descricao: string | null
          id: string
          lead_id: string | null
          origem: string | null
          prioridade: Database["public"]["Enums"]["task_priority"] | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          titulo: string
          updated_at: string | null
          venda_id: string | null
        }
        Insert: {
          created_at?: string
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          origem?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"] | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id?: string
          titulo: string
          updated_at?: string | null
          venda_id?: string | null
        }
        Update: {
          created_at?: string
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          origem?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"] | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id?: string
          titulo?: string
          updated_at?: string | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "active_user_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          ano_veiculo: number | null
          comprador_nome: string | null
          comprador_telefone: string | null
          created_at: string | null
          data_venda: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          historico_saude: Json
          id: string
          km_veiculo: number | null
          marca_veiculo: string | null
          modelo_veiculo: string | null
          nome_veiculo: string | null
          observacao: string | null
          preco_venda: number | null
          tenant_id: string
          updated_at: string | null
          valor_entrada: number | null
          valor_financiamento: number | null
          vehicle_id: string | null
          vendedor_id: string | null
        }
        Insert: {
          ano_veiculo?: number | null
          comprador_nome?: string | null
          comprador_telefone?: string | null
          created_at?: string | null
          data_venda?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          historico_saude?: Json
          id?: string
          km_veiculo?: number | null
          marca_veiculo?: string | null
          modelo_veiculo?: string | null
          nome_veiculo?: string | null
          observacao?: string | null
          preco_venda?: number | null
          tenant_id?: string
          updated_at?: string | null
          valor_entrada?: number | null
          valor_financiamento?: number | null
          vehicle_id?: string | null
          vendedor_id?: string | null
        }
        Update: {
          ano_veiculo?: number | null
          comprador_nome?: string | null
          comprador_telefone?: string | null
          created_at?: string | null
          data_venda?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          historico_saude?: Json
          id?: string
          km_veiculo?: number | null
          marca_veiculo?: string | null
          modelo_veiculo?: string | null
          nome_veiculo?: string | null
          observacao?: string | null
          preco_venda?: number | null
          tenant_id?: string
          updated_at?: string | null
          valor_entrada?: number | null
          valor_financiamento?: number | null
          vehicle_id?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "estoque_carros"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vendas_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "v_estoque_disponivel"
            referencedColumns: ["vehicle_id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "active_user_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zapi_webhooks: {
        Row: {
          api_host: string | null
          ativo: boolean
          created_at: string
          id: string
          nome_loja: string
          tenant_id: string
          updated_at: string
          zapi_client_token: string | null
          zapi_instance_id: string
          zapi_token: string
        }
        Insert: {
          api_host?: string | null
          ativo?: boolean
          created_at?: string
          id?: string
          nome_loja: string
          tenant_id?: string
          updated_at?: string
          zapi_client_token?: string | null
          zapi_instance_id: string
          zapi_token: string
        }
        Update: {
          api_host?: string | null
          ativo?: boolean
          created_at?: string
          id?: string
          nome_loja?: string
          tenant_id?: string
          updated_at?: string
          zapi_client_token?: string | null
          zapi_instance_id?: string
          zapi_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "zapi_webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_user_names: {
        Row: {
          full_name: string | null
          id: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
      v_estoque_disponivel: {
        Row: {
          active: boolean | null
          ano: number | null
          cambio: string | null
          codigo: string | null
          combustivel: string | null
          cor: string | null
          created_at: string | null
          fotos: Json | null
          km: number | null
          last_sync_id: string | null
          link: string | null
          marca: string | null
          modelo: string | null
          preco: number | null
          raw: Json | null
          sold_at: string | null
          title: string | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          active?: boolean | null
          ano?: number | null
          cambio?: string | null
          codigo?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string | null
          fotos?: Json | null
          km?: number | null
          last_sync_id?: string | null
          link?: string | null
          marca?: string | null
          modelo?: string | null
          preco?: number | null
          raw?: Json | null
          sold_at?: string | null
          title?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          active?: boolean | null
          ano?: number | null
          cambio?: string | null
          codigo?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string | null
          fotos?: Json | null
          km?: number | null
          last_sync_id?: string | null
          link?: string | null
          marca?: string | null
          modelo?: string | null
          preco?: number | null
          raw?: Json | null
          sold_at?: string | null
          title?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      view_oportunidades_pos_venda: {
        Row: {
          comprador_nome: string | null
          comprador_telefone: string | null
          data_venda: string | null
          dias_desde_venda: number | null
          dono_loja_id: string | null
          historico_saude: Json | null
          mensagem_sugerida: string | null
          modelo_veiculo: string | null
          nome_cliente: string | null
          oportunidade_kind: string | null
          oportunidade_label: string | null
          prazo_label: string | null
          suggested_column_id: string | null
          veiculo_nome: string | null
          venda_id: string | null
        }
        Insert: {
          comprador_nome?: string | null
          comprador_telefone?: string | null
          data_venda?: string | null
          dias_desde_venda?: never
          dono_loja_id?: string | null
          historico_saude?: never
          mensagem_sugerida?: never
          modelo_veiculo?: string | null
          nome_cliente?: never
          oportunidade_kind?: never
          oportunidade_label?: never
          prazo_label?: never
          suggested_column_id?: never
          veiculo_nome?: never
          venda_id?: string | null
        }
        Update: {
          comprador_nome?: string | null
          comprador_telefone?: string | null
          data_venda?: string | null
          dias_desde_venda?: never
          dono_loja_id?: string | null
          historico_saude?: never
          mensagem_sugerida?: never
          modelo_veiculo?: string | null
          nome_cliente?: never
          oportunidade_kind?: never
          oportunidade_label?: never
          prazo_label?: never
          suggested_column_id?: never
          veiculo_nome?: never
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_tenant_id_fkey"
            columns: ["dono_loja_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      append_historico_saude_venda: {
        Args: {
          _canal?: string
          _metadata?: Json
          _observacao: string
          _status?: string
          _tipo_contato: string
          _venda_id: string
        }
        Returns: Json
      }
      can_access_essencial_feature: { Args: never; Returns: boolean }
      can_write_lead_status: {
        Args: { _new_assigned_to: string; _telefone: string }
        Returns: boolean
      }
      create_notification_if_enabled: {
        Args: {
          _action_label?: string
          _action_url?: string
          _category?: Database["public"]["Enums"]["notification_category"]
          _message: string
          _metadata?: Json
          _source_key?: string
          _title: string
          _type?: Database["public"]["Enums"]["notification_type"]
          _user_id: string
        }
        Returns: string
      }
      current_plan_type: {
        Args: never
        Returns: Database["public"]["Enums"]["plan_type"]
      }
      current_tenant_id: { Args: never; Returns: string }
      default_tenant_id: { Args: never; Returns: string }
      fallback_tenant_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_gerente: { Args: { _user_id: string }; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { _notification_id: string }
        Returns: undefined
      }
      plan_user_limit: {
        Args: { _plan: Database["public"]["Enums"]["plan_type"] }
        Returns: number
      }
      sync_notification_automation: { Args: never; Returns: Json }
      sync_prune_inventory: {
        Args: { p_hard_delete?: boolean; p_sync_id: string }
        Returns: number
      }
      tenant_id_for_user: { Args: { _user_id: string }; Returns: string }
      tenant_plan_type: {
        Args: { _tenant_id?: string }
        Returns: Database["public"]["Enums"]["plan_type"]
      }
      validate_tenant_user_limit: {
        Args: { _tenant_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "vendedor"
      forma_pagamento: "avista" | "financiado"
      notification_category: "system" | "lead" | "task" | "sale" | "security"
      notification_type: "info" | "success" | "warning" | "error"
      plan_type: "pro" | "essencial"
      task_priority: "baixa" | "media" | "alta"
      task_status: "a_fazer" | "em_andamento" | "concluida" | "cancelada"
      vehicle_status: "disponivel" | "negociando" | "vendido"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "gerente", "vendedor"],
      forma_pagamento: ["avista", "financiado"],
      notification_category: ["system", "lead", "task", "sale", "security"],
      notification_type: ["info", "success", "warning", "error"],
      plan_type: ["pro", "essencial"],
      task_priority: ["baixa", "media", "alta"],
      task_status: ["a_fazer", "em_andamento", "concluida", "cancelada"],
      vehicle_status: ["disponivel", "negociando", "vendido"],
    },
  },
} as const

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; username: string; username_normalizzato: string; societa_id: number | null; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; username: string; username_normalizzato: string; societa_id?: number | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; username?: string; username_normalizzato?: string; societa_id?: number | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "profiles_societa_id_fkey"; columns: ["societa_id"]; isOneToOne: false; referencedRelation: "societa"; referencedColumns: ["id"] }];
      };
      profile_verification_requests: {
        Row: { id: string; profile_id: string; societa_id: number; nome: string; cognome: string; status: "pending" | "approved" | "rejected"; created_at: string; reviewed_at: string | null; reviewed_by: string | null; note_admin: string | null };
        Insert: { id?: string; profile_id: string; societa_id: number; nome: string; cognome: string; status?: "pending" | "approved" | "rejected"; created_at?: string; reviewed_at?: string | null; reviewed_by?: string | null; note_admin?: string | null };
        Update: Partial<Database["public"]["Tables"]["profile_verification_requests"]["Row"]>;
        Relationships: [];
      };
      user_emblems: {
        Row: { id: number; slug: string; nome: string; rarita: "comune" | "raro" | "epico" | "leggendario"; categoria: "fantabet" | "tifo" | "arcade" | "fedelta"; descrizione: string; asset_path: string; nascosto: boolean; ordine: number; attivo: boolean; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["user_emblems"]["Row"]> & { id: number; slug: string; nome: string; rarita: "comune" | "raro" | "epico" | "leggendario"; categoria: "fantabet" | "tifo" | "arcade" | "fedelta"; descrizione: string; asset_path: string; ordine: number };
        Update: Partial<Database["public"]["Tables"]["user_emblems"]["Row"]>;
        Relationships: [];
      };
      user_emblem_unlocks: {
        Row: { profile_id: string; emblem_id: number; unlocked_at: string; stagione_id: number | null; source_type: string; source_ref: string | null; created_at: string };
        Insert: { profile_id: string; emblem_id: number; unlocked_at: string; stagione_id?: number | null; source_type: string; source_ref?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["user_emblem_unlocks"]["Row"]>;
        Relationships: [];
      };
      reserved_usernames: {
        Row: { username_normalizzato: string; created_at: string };
        Insert: { username_normalizzato: string; created_at?: string };
        Update: { username_normalizzato?: string; created_at?: string };
        Relationships: [];
      };
      stagioni: {
        Row: { id: number; codice: string; anno_inizio: number; anno_fine: number; nome: string; attiva: boolean; data_inizio: string | null; data_fine: string | null; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["stagioni"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["stagioni"]["Row"]>;
        Relationships: [];
      };
      competizioni: {
        Row: { id: number; codice: string; nome: string; tipo: string; divisione_riferimento: string | null; livello: number | null; attiva: boolean; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["competizioni"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["competizioni"]["Row"]>;
        Relationships: [];
      };
      edizioni_competizioni: {
        Row: { id: number; competizione_id: number; stagione_id: number; nome_edizione: string; formato: string | null; numero_squadre: number | null; stato: string; data_inizio: string | null; data_fine: string | null; attiva: boolean; societa_vincitrice_id: number | null; winner_recorded_at: string | null; calendar_revision: number; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["edizioni_competizioni"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["edizioni_competizioni"]["Row"]>;
        Relationships: [{ foreignKeyName: "edizioni_competizioni_competizione_id_fkey"; columns: ["competizione_id"]; isOneToOne: false; referencedRelation: "competizioni"; referencedColumns: ["id"] }];
      };
      partite: {
        Row: { id: number; edizione_competizione_id: number; giornata_lega: number; giornata_serie_a: number | null; societa_casa_id: number; societa_trasferta_id: number; fantapunti_casa: number | null; fantapunti_trasferta: number | null; gol_casa: number | null; gol_trasferta: number | null; stato: string; fonte_importazione: string | null; import_batch_id: string | null; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["partite"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["partite"]["Row"]>;
        Relationships: [];
      };
      fantabet_rounds: {
        Row: { id: number; stagione_id: number; numero_giornata: number; opens_at: string; deadline_at: string; status: string; round_type: string; rules_version: number; required_predictions: number; perfect_multiplier: number; consistency_block_size: number; consistency_bonus_points: number; created_at: string; updated_at: string };
        Insert: { id?: number; stagione_id: number; numero_giornata: number; opens_at: string; deadline_at: string; status?: string; round_type?: string; rules_version?: number; required_predictions?: number; perfect_multiplier?: number; consistency_block_size?: number; consistency_bonus_points?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["fantabet_rounds"]["Insert"]>;
        Relationships: [{ foreignKeyName: "fantabet_rounds_stagione_id_fkey"; columns: ["stagione_id"]; isOneToOne: false; referencedRelation: "stagioni"; referencedColumns: ["id"] }];
      };
      fantabet_bets: {
        Row: { id: number; round_id: number; partita_id: number; bet_type: "1X2" | "UNDER_OVER_2_5" | "RISULTATO_ESATTO" | "FANTAPUNTEGGIO_1X2"; points_value: number; display_order: number; created_at: string };
        Insert: { id?: number; round_id: number; partita_id: number; bet_type: "1X2" | "UNDER_OVER_2_5" | "RISULTATO_ESATTO" | "FANTAPUNTEGGIO_1X2"; points_value: number; display_order: number; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["fantabet_bets"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "fantabet_bets_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantabet_rounds"; referencedColumns: ["id"] },
          { foreignKeyName: "fantabet_bets_partita_id_fkey"; columns: ["partita_id"]; isOneToOne: false; referencedRelation: "partite"; referencedColumns: ["id"] },
        ];
      };
      fantabet_predictions: {
        Row: { id: number; profile_id: string; bet_id: number; scelta: "1" | "X" | "2" | "UNDER" | "OVER" | "ESATTO"; exact_home: number | null; exact_away: number | null; created_at: string; updated_at: string };
        Insert: { id?: number; profile_id: string; bet_id: number; scelta: "1" | "X" | "2" | "UNDER" | "OVER" | "ESATTO"; exact_home?: number | null; exact_away?: number | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["fantabet_predictions"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "fantabet_predictions_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "fantabet_predictions_bet_id_fkey"; columns: ["bet_id"]; isOneToOne: false; referencedRelation: "fantabet_bets"; referencedColumns: ["id"] },
        ];
      };
      fantabet_round_submissions: {
        Row: { profile_id: string; round_id: number; submitted_at: string; updated_at: string };
        Insert: { profile_id: string; round_id: number; submitted_at?: string; updated_at?: string };
        Update: { submitted_at?: string; updated_at?: string };
        Relationships: [
          { foreignKeyName: "fantabet_round_submissions_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "fantabet_round_submissions_round_id_fkey"; columns: ["round_id"]; isOneToOne: false; referencedRelation: "fantabet_rounds"; referencedColumns: ["id"] },
        ];
      };
      profile_supports: {
        Row: { profile_id: string; stagione_id: number; societa_id: number; selected_at: string; eligible_from_giornata: number; created_at: string };
        Insert: { profile_id: string; stagione_id: number; societa_id: number; selected_at?: string; eligible_from_giornata: number; created_at?: string };
        Update: never;
        Relationships: [];
      };
      fantabet_support_match_events: {
        Row: { id: number; profile_id: string; stagione_id: number; societa_id: number; partita_id: number; punti: number; outcome: "vittoria" | "pareggio" | "sconfitta"; recognized_at: string; created_at: string };
        Insert: { id?: number; profile_id: string; stagione_id: number; societa_id: number; partita_id: number; punti: number; outcome: "vittoria" | "pareggio" | "sconfitta"; recognized_at?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      profile_support_ineligibilities: {
        Row: { profile_id: string; stagione_id: number; officialized_at: string; reason: "became_official"; created_at: string };
        Insert: { profile_id: string; stagione_id: number; officialized_at?: string; reason?: "became_official"; created_at?: string };
        Update: never;
        Relationships: [];
      };
      fantabet_support_bonus_events: {
        Row: { id: number; profile_id: string; stagione_id: number; societa_id: number; edizione_competizione_id: number; punti: number; recognized_at: string; created_at: string };
        Insert: { id?: number; profile_id: string; stagione_id: number; societa_id: number; edizione_competizione_id: number; punti: number; recognized_at?: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      societa: {
        Row: { id: number; nome_ufficiale: string; nome_personalizzato: string | null; nome_normalizzato: string; slug: string; squadra_associata: string | null; fantallenatore: string | null; nickname_instagram: string | null; stagione_ingresso: string | null; categoria: string | null; girone: string | null; logo_path: string | null; storia: string | null; storia_tifo: string | null; badge_tipo: string | null; attiva: boolean; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["societa"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["societa"]["Row"]>;
        Relationships: [];
      };
      societa_slug_aliases: {
        Row: { slug: string; societa_id: number; created_at: string };
        Insert: { slug: string; societa_id: number; created_at?: string };
        Update: { slug?: string; societa_id?: number; created_at?: string };
        Relationships: [{ foreignKeyName: "societa_slug_aliases_societa_id_fkey"; columns: ["societa_id"]; isOneToOne: false; referencedRelation: "societa"; referencedColumns: ["id"] }];
      };
      lista_attesa: {
        Row: {
          id: string | number;
          nome: string;
          cognome: string;
          data_nascita: string | null;
          instagram: string;
          motivazione: string;
          stato: string;
          maggiorenne_dichiarato: boolean;
          privacy_accettata: boolean;
          created_at: string;
        };
        Insert: {
          id?: string | number;
          nome: string;
          cognome: string;
          data_nascita?: string | null;
          instagram: string;
          motivazione: string;
          stato?: string;
          maggiorenne_dichiarato?: boolean;
          privacy_accettata: boolean;
          created_at?: string;
        };
        Update: {
          id?: string | number;
          nome?: string;
          cognome?: string;
          data_nascita?: string | null;
          instagram?: string;
          motivazione?: string;
          stato?: string;
          maggiorenne_dichiarato?: boolean;
          privacy_accettata?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      classifica_arcade: {
        Row: {
          id: string | number;
          nome_giocatore: string;
          nome_giocatore_normalizzato: string;
          societa_id: number;
          livello: number;
          metri: number;
          created_at: string;
          updated_at: string;
          player_id: string | null;
          profile_id: string | null;
        };
        Insert: {
          id?: string | number;
          nome_giocatore: string;
          nome_giocatore_normalizzato: string;
          societa_id: number;
          livello: number;
          metri: number;
          created_at?: string;
          updated_at?: string;
          player_id?: string | null;
          profile_id?: string | null;
        };
        Update: {
          id?: string | number;
          nome_giocatore?: string;
          nome_giocatore_normalizzato?: string;
          societa_id?: number;
          livello?: number;
          metri?: number;
          created_at?: string;
          updated_at?: string;
          player_id?: string | null;
          profile_id?: string | null;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          ambito: string;
          chiave_hash: string;
          finestra_inizio: string;
          tentativi: number;
        };
        Insert: {
          ambito: string;
          chiave_hash: string;
          finestra_inizio?: string;
          tentativi?: number;
        };
        Update: {
          ambito?: string;
          chiave_hash?: string;
          finestra_inizio?: string;
          tentativi?: number;
        };
        Relationships: [];
      };
      arcade_run_tokens: {
        Row: {
          nonce: string;
          nome_giocatore_normalizzato: string;
          societa_id: number;
          started_at: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
          player_id: string | null;
          profile_id: string | null;
          consumed_valid: boolean;
        };
        Insert: {
          nonce: string;
          nome_giocatore_normalizzato: string;
          societa_id: number;
          started_at: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
          player_id?: string | null;
          profile_id?: string | null;
          consumed_valid?: boolean;
        };
        Update: {
          nonce?: string;
          nome_giocatore_normalizzato?: string;
          societa_id?: number;
          started_at?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
          player_id?: string | null;
          profile_id?: string | null;
          consumed_valid?: boolean;
        };
        Relationships: [];
      };
      arcade_players: {
        Row: { player_id: string; nickname: string; nickname_normalized: string; created_at: string; updated_at: string };
        Insert: { player_id: string; nickname: string; nickname_normalized: string; created_at?: string; updated_at?: string };
        Update: { player_id?: string; nickname?: string; nickname_normalized?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_calendar_preview_state: { Args: { p_edizione_competizione_id: number }; Returns: { calendarRevision: number; matches: unknown[]; rests: unknown[] } };
      admin_publish_calendar_snapshot: { Args: { p_import_id: string; p_admin_id: string; p_expected_revision: number; p_matches: unknown[]; p_rests: unknown[] }; Returns: Array<{ inserted: number; updated: number; removed: number; unchanged: number; import_state: string; already_published: boolean }> };
      create_my_legacy_profile: {
  Args: { p_username: string };
  Returns: Database["public"]["Tables"]["profiles"]["Row"];
};
update_my_username: {
  Args: { p_username: string };
  Returns: Database["public"]["Tables"]["profiles"]["Row"];
};
request_my_profile_verification: {
        Args: { p_nome: string; p_cognome: string; p_societa_id: number };
        Returns: Database["public"]["Tables"]["profile_verification_requests"]["Row"];
      };
      public_profile_user_emblems: {
        Args: { p_profile_id: string };
        Returns: Array<{ id: number; slug: string; nome: string; rarita: string; categoria: string; descrizione: string; asset_path: string | null; nascosto: boolean; ordine: number; unlocked: boolean; unlocked_at: string | null }>;
      };
      admin_review_profile_verification_request: {
        Args: { p_request_id: string; p_decision: string; p_reviewer_id: string; p_note_admin?: string | null };
        Returns: Database["public"]["Tables"]["profile_verification_requests"]["Row"];
      };
      admin_rename_societa: {
        Args: { p_societa_id: number; p_nome_ufficiale: string; p_nome_personalizzato?: string | null };
        Returns: undefined;
      };
      fantabet_prediction_window_open: {
        Args: { p_bet_id: number };
        Returns: boolean;
      };
      fantabet_round_is_evaluable: {
        Args: { p_round_id: number };
        Returns: boolean;
      };
      admin_save_fantabet_draft: {
        Args: { p_round_id: number | null; p_expected_updated_at: string | null; p_stagione_id: number; p_numero_giornata: number; p_opens_at: string; p_deadline_at: string; p_bets: Array<{ partita_id: number; bet_type: string; points_value: number; display_order: number }> };
        Returns: Array<{ round_id: number; updated_at: string; unchanged: boolean }>;
      };
      fantabet_global_leaderboard: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{ profile_id: string; username: string; punti_pronostici: number; punti_bonus_costanza: number; punti_tifo: number; punti_bonus_tifo: number; punti_totali: number; giornate_giocate: number; pronostici_corretti: number; schedine_perfette: number; streak_attuale: number; posizione: number }>;
      };
      select_my_supported_team: {
        Args: { p_stagione_id: number; p_societa_id: number };
        Returns: Database["public"]["Tables"]["profile_supports"]["Row"];
      };
      active_supporter_counts: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{ societa_id: number; tifosi: number }>;
      };
      public_profile_competitive_positions: {
        Args: { p_profile_id: string };
        Returns: Array<{ fantabet_position: number | null; fantabet_points: number | null; arcade_position: number | null; arcade_level: number | null; arcade_meters: number | null }>;
      };
      active_supporters: {
        Args: { p_societa_id: number };
        Returns: Array<{ username: string; avatar_url: string | null; avatar_updated_at: string }>;
      };
      my_pending_societa_emblem_notifications: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{ notification_id: number; societa_id: number; emblem_key: string; audience: "official" | "supporter"; unlocked_at: string }>;
      };
      mark_my_societa_emblem_notification_seen: {
        Args: { p_notification_id: number };
        Returns: boolean;
      };
      public_societa_support_emblems: {
        Args: { p_societa_id: number };
        Returns: Array<{ emblem_key: string; stato: "Sbloccato" | "Da difendere"; unlocked_at: string; stagione: string | null }>;
      };
      public_societa_defending_emblems: {
        Args: { p_societa_id: number };
        Returns: Array<{ emblem_key: string; stato: "Da difendere"; record_value: number | null }>;
      };
      public_all_societa_defending_emblems: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{ societa_id: number; emblem_key: string; stato: "Da difendere"; record_value: number | null }>;
      };
      public_profile_support_summary: {
        Args: { p_profile_id: string };
        Returns: Array<{ stagione_id: number; societa_id: number; selected_at: string; punti_tifo: number; punti_bonus_tifo: number; trophy_types: string[]; resolved_trophy_types: string[] }>;
      };
      fantabet_round_leaderboard: {
        Args: { p_round_id: number };
        Returns: Array<{ profile_id: string; username: string; punti_pronostici: number; punti_bonus_costanza: number; punti_totali: number; pronostici_corretti: number; schedina_perfetta: boolean; posizione: number }>;
      };
      confirm_my_fantabet_round: {
        Args: { p_round_id: number };
        Returns: string;
      };
      reopen_my_fantabet_round: {
        Args: { p_round_id: number };
        Returns: undefined;
      };
      set_my_avatar_path: {
        Args: { p_avatar_path: string };
        Returns: undefined;
      };
      salva_record_arcade: {
        Args: {
          p_nome_giocatore: string;
          p_societa_id: number;
          p_livello: number;
          p_metri: number;
        };
        Returns: unknown;
      };
      salva_record_arcade_v3: {
        Args: { p_nonce: string; p_player_id: string; p_nome_giocatore: string; p_societa_id: number; p_livello: number; p_metri: number };
        Returns: unknown;
      };
      assegna_nickname_arcade: {
        Args: { p_player_id: string; p_nickname: string; p_nickname_normalized: string };
        Returns: Array<{ accepted: boolean; status: string; nickname: string | null; nickname_normalized: string | null }>;
      };
      consuma_arcade_run_token_v3: {
        Args: { p_nonce: string; p_profile_id: string; p_societa_id: number };
        Returns: Array<{ stato: string; started_at: string | null }>;
      };
      salva_record_arcade_v4: {
        Args: { p_nonce: string; p_profile_id: string; p_societa_id: number; p_livello: number; p_metri: number };
        Returns: Array<{ salvato: boolean; livello_record: number; metri_record: number }>;
      };
      consuma_rate_limit: {
        Args: {
          p_chiave_hash: string;
          p_ambito: string;
          p_limite: number;
          p_finestra_secondi: number;
        };
        Returns: boolean;
      };
      consuma_arcade_run_token: {
        Args: {
          p_nonce: string;
          p_nome_giocatore_normalizzato: string;
          p_societa_id: number;
        };
        Returns: Array<{
          stato: string;
          started_at: string | null;
        }>;
      };
      consuma_arcade_run_token_v2: {
        Args: { p_nonce: string; p_player_id: string; p_nome_giocatore_normalizzato: string; p_societa_id: number };
        Returns: Array<{ stato: string; started_at: string | null }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

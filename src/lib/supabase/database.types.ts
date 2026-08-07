export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; username: string; username_normalizzato: string; societa_id: number | null; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; username: string; username_normalizzato: string; societa_id?: number | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; username?: string; username_normalizzato?: string; societa_id?: number | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "profiles_societa_id_fkey"; columns: ["societa_id"]; isOneToOne: false; referencedRelation: "societa"; referencedColumns: ["id"] }];
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
        Row: { id: number; competizione_id: number; stagione_id: number; nome_edizione: string; formato: string | null; numero_squadre: number | null; stato: string; data_inizio: string | null; data_fine: string | null; attiva: boolean; created_at: string; updated_at: string };
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
      societa: {
        Row: { id: number; nome_ufficiale: string; nome_personalizzato: string | null; nome_normalizzato: string; squadra_associata: string | null; fantallenatore: string | null; nickname_instagram: string | null; stagione_ingresso: string | null; categoria: string | null; girone: string | null; logo_path: string | null; storia: string | null; badge_tipo: string | null; attiva: boolean; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["societa"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["societa"]["Row"]>;
        Relationships: [];
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

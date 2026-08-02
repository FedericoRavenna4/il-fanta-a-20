export type Database = {
  public: {
    Tables: {
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
        };
        Relationships: [];
      };
      arcade_players: {
        Row: { player_id: string; nickname: string; nickname_normalizzato: string; created_at: string; updated_at: string };
        Insert: { player_id: string; nickname: string; nickname_normalizzato: string; created_at?: string; updated_at?: string };
        Update: { player_id?: string; nickname?: string; nickname_normalizzato?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      salva_record_arcade: {
        Args: {
          p_nome_giocatore: string;
          p_societa_id: number;
          p_livello: number;
          p_metri: number;
        };
        Returns: unknown;
      };
      salva_record_arcade_v2: {
        Args: {
          p_nome_giocatore: string;
          p_societa_id: number;
          p_livello: number;
          p_metri: number;
        };
        Returns: unknown;
      };
      salva_record_arcade_v3: {
        Args: { p_player_id: string; p_nome_giocatore: string; p_societa_id: number; p_livello: number; p_metri: number };
        Returns: unknown;
      };
      assegna_nickname_arcade: {
        Args: { p_player_id: string; p_nome_giocatore: string };
        Returns: boolean;
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

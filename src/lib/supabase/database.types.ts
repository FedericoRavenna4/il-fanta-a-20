export type Database = {
  public: {
    Tables: {
      lista_attesa: {
        Row: {
          id: string | number;
          nome: string;
          cognome: string;
          data_nascita: string;
          instagram: string;
          motivazione: string;
          stato: string;
          privacy_accettata: boolean;
          created_at: string;
        };
        Insert: {
          id?: string | number;
          nome: string;
          cognome: string;
          data_nascita: string;
          instagram: string;
          motivazione: string;
          stato?: string;
          privacy_accettata: boolean;
          created_at?: string;
        };
        Update: {
          id?: string | number;
          nome?: string;
          cognome?: string;
          data_nascita?: string;
          instagram?: string;
          motivazione?: string;
          stato?: string;
          privacy_accettata?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

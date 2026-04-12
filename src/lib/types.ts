/** Generic JSON-compatible type (replaces Supabase's Json helper). */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

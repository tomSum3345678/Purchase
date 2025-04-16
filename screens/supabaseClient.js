import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ebvecgyezvakcxlegspv.supabase.co'; //Supabase project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidmVjZ3llenZha2N4bGVnc3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjQxMzgsImV4cCI6MjA1NTU0MDEzOH0.0-SY6Q80nuVeg4_Cqi76V7P2eWvYBOrv8q0WUp4eo_0'; // Replace with your Supabase anon key
//const supabaseAnonKey="1";
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
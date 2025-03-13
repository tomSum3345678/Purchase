import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zppoywoaiktzsinnxcco.supabase.co'; // Replace with your Supabase project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcG95d29haWt0enNpbm54Y2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgyMjc2MTYsImV4cCI6MjA0MzgwMzYxNn0.SEYkSE1oJ3YL9ReDQCG48tCvI0Aur-3NgfPmGr0zIRg'; // Replace with your Supabase anon key
//const supabaseAnonKey="1";
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
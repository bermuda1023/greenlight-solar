// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qwiefyedkmgjkcgjqhwi.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aWVmeWVka21namtjZ2pxaHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNTAzMjMsImV4cCI6MjA1MTgyNjMyM30.2wfGI2Hm0MV6WLfhawGvmWcFsg4RCtc4fvq-jvCFtFw" 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mjanyrchkxjpbyajnpqs.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qYW55cmNoa3hqcGJ5YWpucHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDYxODAsImV4cCI6MjA5MDMyMjE4MH0.WDqNZhVhKyXHi3Na9Sy2_navZP9-Oog8aePmscW80Zc"; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Use environment variables from .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://wjkvpvfvqmmhcfonqwma.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa3ZwdmZ2cW1taGNmb25xd21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2ODY2NzMsImV4cCI6MjA1NjI2MjY3M30.3EFJnf1-xoswGW1BThtpwHfwGWXOr058UdkHU4_kWPQ';

// Custom storage implementation using SecureStore
const SecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types

// Pilot
export type Pilot = {
  id: string;
  user_id: string | null;
  role: string | null;
  name: string;
  number: number;
  team_id: string | null;
  avatar_url: string | null;
  created_at: string;
  team?: Team;
};

// Team
export type Team = {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
};

// Circuit
export type Circuit = {
  id: string;
  name: string;
  location: string;
  length: number;
  turns: number;
  record_lap_time: string | null;
  record_lap_pilot: string | null;
  image_url: string | null;
  description: string | null;
  created_at: string;
};

// Race
export type Race = {
  id: string;
  name: string;
  season_id: string | null;
  circuit_id: string | null;
  date: string;
  created_at: string;
  circuit?: Circuit;
  season?: Season;
};

// RaceResult
export type RaceResult = {
  id: string;
  race_id: string;
  pilot_id: string;
  session_id: string;
  race_position: number | null;
  best_lap: string | null;
  created_at: string;
  points: number | null;
  pilot?: Pilot;
  race?: Race;
  session?: Session;
};

// LapTime
export type LapTime = {
  id: string;
  race_id: string;
  pilot_id: string;
  session_id: string;
  lap_number: number;
  time: string;
  created_at: string;
  pilot?: Pilot;
  race?: Race;
  session?: Session;
};

// Session
export type Session = {
  id: string;
  name: string;
};

// Season
export type Season = {
  id: string;
  league_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  league?: League;
};

// League
export type League = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

// PilotStanding (agregado en frontend o por función RPC/view)
export type PilotStanding = {
  pilot_id: string;
  pilot_name: string;
  pilot_number: number;
  team_name: string;
  total_points: number;
  position: number;
};

// TeamStanding (agregado en frontend o por función RPC/view)
export type TeamStanding = {
  team_id: string;
  team_name: string;
  total_points: number;
  position: number;
  pilots_list: string[];
};

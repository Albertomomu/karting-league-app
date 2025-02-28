/*
  # Initial Schema for Karting League App

  1. New Tables
    - `pilots` - Stores information about pilots
    - `teams` - Stores information about teams
    - `circuits` - Stores information about racing circuits
    - `races` - Stores information about race events
    - `race_results` - Stores race results for each pilot
    - `lap_times` - Stores individual lap times for pilots
    - `seasons` - Stores information about racing seasons

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seasons"
  ON seasons
  FOR SELECT
  USING (true);

CREATE POLICY "Only organizers can insert/update/delete seasons"
  ON seasons
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'organizer');

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teams"
  ON teams
  FOR SELECT
  USING (true);

CREATE POLICY "Only organizers can insert/update/delete teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'organizer');

-- Create pilots table
CREATE TABLE IF NOT EXISTS pilots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  name text NOT NULL,
  number text NOT NULL UNIQUE,
  team_id uuid REFERENCES teams,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pilots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pilots"
  ON pilots
  FOR SELECT
  USING (true);

CREATE POLICY "Pilots can update their own data"
  ON pilots
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Only organizers can insert/delete pilots"
  ON pilots
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'organizer');

-- Create circuits table
CREATE TABLE IF NOT EXISTS circuits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  length text NOT NULL,
  turns integer NOT NULL,
  record_lap text,
  record_holder text,
  image_url text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE circuits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view circuits"
  ON circuits
  FOR SELECT
  USING (true);

CREATE POLICY "Only organizers can insert/update/delete circuits"
  ON circuits
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'organizer');

-- Create races table
CREATE TABLE IF NOT EXISTS races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season_id uuid REFERENCES seasons,
  circuit_id uuid REFERENCES circuits,
  date date NOT NULL,
  circuit_name text,
  circuit_image text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view races"
  ON races
  FOR SELECT
  USING (true);

CREATE POLICY "Only organizers can insert/update/delete races"
  ON races
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'organizer');

-- Create race_results table
CREATE TABLE IF NOT EXISTS race_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid REFERENCES races NOT NULL,
  pilot_id uuid REFERENCES pilots NOT NULL,
  session_type text NOT NULL, -- 'practice', 'qualifying', 'race1', 'race2'
  position integer,
  points integer DEFAULT 0,
  best_lap text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view race results"
  ON race_results
  FOR SELECT
  USING (true);

CREATE POLICY "Only organizers can insert/update/delete race results"
  ON race_results
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'organizer');

-- Create lap_times table
CREATE TABLE IF NOT EXISTS lap_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid REFERENCES races NOT NULL,
  pilot_id uuid REFERENCES pilots NOT NULL,
  session_type text NOT NULL, -- 'practice', 'qualifying', 'race1', 'race2'
  lap_number integer NOT NULL,
  time text NOT NULL, -- Format: MM:SS.ms
  improvement text, -- Time improvement from previous lap
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lap_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lap times"
  ON lap_times
  FOR SELECT
  USING (true);

CREATE POLICY "Only organizers can insert/update/delete lap times"
  ON lap_times
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'organizer');

-- Create functions for calculating standings

-- Function to calculate pilot standings for a season
CREATE OR REPLACE FUNCTION get_pilot_standings(season_id uuid)
RETURNS TABLE (
  pilot_id uuid,
  pilot_name text,
  pilot_number text,
  team_name text,
  total_points bigint,
  position bigint
)
LANGUAGE SQL
AS $$
  SELECT
    p.id as pilot_id,
    p.name as pilot_name,
    p.number as pilot_number,
    t.name as team_name,
    COALESCE(SUM(rr.points), 0) as total_points,
    RANK() OVER (ORDER BY COALESCE(SUM(rr.points), 0) DESC) as position
  FROM
    pilots p
    LEFT JOIN teams t ON p.team_id = t.id
    LEFT JOIN race_results rr ON p.id = rr.pilot_id
    LEFT JOIN races r ON rr.race_id = r.id
  WHERE
    r.season_id = get_pilot_standings.season_id OR get_pilot_standings.season_id IS NULL
  GROUP BY
    p.id, p.name, p.number, t.name
  ORDER BY
    total_points DESC;
$$;

-- Function to calculate team standings for a season
CREATE OR REPLACE FUNCTION get_team_standings(season_id uuid)
RETURNS TABLE (
  team_id uuid,
  team_name text,
  total_points bigint,
  position bigint,
  pilots_list text
)
LANGUAGE SQL
AS $$
  WITH team_points AS (
    SELECT
      t.id as team_id,
      t.name as team_name,
      COALESCE(SUM(rr.points), 0) as total_points
    FROM
      teams t
      LEFT JOIN pilots p ON t.id = p.team_id
      LEFT JOIN race_results rr ON p.id = rr.pilot_id
      LEFT JOIN races r ON rr.race_id = r.id
    WHERE
      r.season_id = get_team_standings.season_id OR get_team_standings.season_id IS NULL
    GROUP BY
      t.id, t.name
  ),
  team_pilots AS (
    SELECT
      t.id as team_id,
      STRING_AGG(SUBSTRING(p.name, 1, 1) || '. ' || SPLIT_PART(p.name, ' ', 2), ', ') as pilots_list
    FROM
      teams t
      JOIN pilots p ON t.id = p.team_id
    GROUP BY
      t.id
  )
  SELECT
    tp.team_id,
    tp.team_name,
    tp.total_points,
    RANK() OVER (ORDER BY tp.total_points DESC) as position,
    COALESCE(tpl.pilots_list, '') as pilots_list
  FROM
    team_points tp
    LEFT JOIN team_pilots tpl ON tp.team_id = tpl.team_id
  ORDER BY
    tp.total_points DESC;
$$;
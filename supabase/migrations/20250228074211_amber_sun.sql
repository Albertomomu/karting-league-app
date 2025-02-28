/*
  # Seed Initial Data for Karting League App

  1. Data Seeding
    - Insert sample seasons
    - Insert sample teams
    - Insert sample pilots
    - Insert sample circuits
    - Insert sample races
    - Insert sample race results
    - Insert sample lap times
*/

-- Insert seasons
INSERT INTO seasons (name, start_date, end_date, is_active)
VALUES 
  ('Temporada 2023', '2023-01-01', '2023-12-31', false),
  ('Temporada 2024', '2024-01-01', '2024-12-31', false),
  ('Temporada 2025', '2025-01-01', '2025-12-31', true);

-- Insert teams
INSERT INTO teams (name, logo_url)
VALUES 
  ('Team Alpha', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=2070&auto=format&fit=crop'),
  ('Team Beta', 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=2070&auto=format&fit=crop'),
  ('Team Gamma', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop'),
  ('Team Delta', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=2070&auto=format&fit=crop');

-- Insert circuits
INSERT INTO circuits (name, location, length, turns, record_lap, record_holder, image_url, description)
VALUES 
  ('Karting Valencia', 'Valencia, Spain', '1.2 km', 12, '1:02.345', 'Carlos Rodríguez', 'https://images.unsplash.com/photo-1630925546089-7ac0e8028e9f?q=80&w=2070&auto=format&fit=crop', 'A technical circuit with a mix of fast straights and challenging corners. Perfect for testing driver skills.'),
  ('Circuit de la Ribera', 'Alzira, Valencia', '0.9 km', 8, '0:58.123', 'Laura Martínez', 'https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?q=80&w=2067&auto=format&fit=crop', 'A fast-paced circuit with flowing corners and a long main straight. Favors drivers with good throttle control.'),
  ('Kartodromo de Cheste', 'Cheste, Valencia', '1.5 km', 15, '1:12.789', 'Miguel Sánchez', 'https://images.unsplash.com/photo-1623274545361-ebf7e5eb6799?q=80&w=1974&auto=format&fit=crop', 'Located near the Ricardo Tormo Circuit, this challenging track features elevation changes and technical sections.'),
  ('Karting Riba-roja', 'Riba-roja de Túria, Valencia', '1.1 km', 10, '1:05.432', 'Ana López', 'https://images.unsplash.com/photo-1655108723418-484a0c2a2301?q=80&w=1974&auto=format&fit=crop', 'A balanced circuit with a mix of technical sections and fast straights. Good overtaking opportunities.');

-- Get the current season ID
DO $$
DECLARE
  current_season_id uuid;
  karting_valencia_id uuid;
  circuit_ribera_id uuid;
  kartodromo_cheste_id uuid;
  karting_ribaroja_id uuid;
BEGIN
  SELECT id INTO current_season_id FROM seasons WHERE is_active = true LIMIT 1;
  
  -- Get circuit IDs
  SELECT id INTO karting_valencia_id FROM circuits WHERE name = 'Karting Valencia';
  SELECT id INTO circuit_ribera_id FROM circuits WHERE name = 'Circuit de la Ribera';
  SELECT id INTO kartodromo_cheste_id FROM circuits WHERE name = 'Kartodromo de Cheste';
  SELECT id INTO karting_ribaroja_id FROM circuits WHERE name = 'Karting Riba-roja';

  -- Insert races
  INSERT INTO races (name, season_id, circuit_id, date, circuit_name, circuit_image)
  VALUES 
    ('Carrera 1 - Valencia', current_season_id, karting_valencia_id, '2025-02-15', 'Karting Valencia', 'https://images.unsplash.com/photo-1630925546089-7ac0e8028e9f?q=80&w=2070&auto=format&fit=crop'),
    ('Carrera 2 - Ribera', current_season_id, circuit_ribera_id, '2025-03-22', 'Circuit de la Ribera', 'https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?q=80&w=2067&auto=format&fit=crop'),
    ('Carrera 3 - Cheste', current_season_id, kartodromo_cheste_id, '2025-04-19', 'Kartodromo de Cheste', 'https://images.unsplash.com/photo-1623274545361-ebf7e5eb6799?q=80&w=1974&auto=format&fit=crop'),
    ('Carrera 4 - Riba-roja', current_season_id, karting_ribaroja_id, '2025-05-17', 'Karting Riba-roja', 'https://images.unsplash.com/photo-1655108723418-484a0c2a2301?q=80&w=1974&auto=format&fit=crop'),
    ('Carrera 5 - Valencia', current_season_id, karting_valencia_id, '2025-06-21', 'Karting Valencia', 'https://images.unsplash.com/photo-1630925546089-7ac0e8028e9f?q=80&w=2070&auto=format&fit=crop'),
    ('Carrera 6 - Ribera', current_season_id, circuit_ribera_id, '2025-07-19', 'Circuit de la Ribera', 'https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?q=80&w=2067&auto=format&fit=crop');
END $$;

-- Insert sample pilots (without user_id for now, will be linked when users register)
INSERT INTO pilots (name, number, team_id)
SELECT 'Carlos Rodríguez', '28', id FROM teams WHERE name = 'Team Alpha';

INSERT INTO pilots (name, number, team_id)
SELECT 'Laura Martínez', '14', id FROM teams WHERE name = 'Team Beta';

INSERT INTO pilots (name, number, team_id)
SELECT 'Miguel Sánchez', '07', id FROM teams WHERE name = 'Team Gamma';

INSERT INTO pilots (name, number, team_id)
SELECT 'Ana López', '42', id FROM teams WHERE name = 'Team Delta';

INSERT INTO pilots (name, number, team_id)
SELECT 'Javier García', '19', id FROM teams WHERE name = 'Team Alpha';

INSERT INTO pilots (name, number, team_id)
SELECT 'Elena Pérez', '33', id FROM teams WHERE name = 'Team Beta';

INSERT INTO pilots (name, number, team_id)
SELECT 'David Fernández', '55', id FROM teams WHERE name = 'Team Gamma';

INSERT INTO pilots (name, number, team_id)
SELECT 'Sofía Ruiz', '21', id FROM teams WHERE name = 'Team Delta';

-- Insert sample race results and lap times
DO $$
DECLARE
  race_id uuid;
  pilot_id uuid;
  session_types text[] := ARRAY['practice', 'qualifying', 'race1', 'race2'];
  session_type text;
  position_value integer;
  points_value integer;
  best_lap text;
BEGIN
  -- Get the first race ID
  SELECT id INTO race_id FROM races ORDER BY date LIMIT 1;
  
  -- For each pilot
  FOR pilot_id IN SELECT id FROM pilots LOOP
    -- For each session type
    FOREACH session_type IN ARRAY session_types LOOP
      -- Generate random position (1-8)
      position_value := floor(random() * 8) + 1;
      
      -- Calculate points based on position (25, 18, 15, 12, 10, 8, 6, 4)
      CASE position_value
        WHEN 1 THEN points_value := 25;
        WHEN 2 THEN points_value := 18;
        WHEN 3 THEN points_value := 15;
        WHEN 4 THEN points_value := 12;
        WHEN 5 THEN points_value := 10;
        WHEN 6 THEN points_value := 8;
        WHEN 7 THEN points_value := 6;
        WHEN 8 THEN points_value := 4;
        ELSE points_value := 0;
      END CASE;
      
      -- Generate random best lap time
      best_lap := '1:0' || (floor(random() * 9) + 1)::text || '.' || (floor(random() * 900) + 100)::text;
      
      -- Insert race result
      INSERT INTO race_results (race_id, pilot_id, session_type, position, points, best_lap)
      VALUES (race_id, pilot_id, session_type, position_value, 
              CASE WHEN session_type = 'race1' OR session_type = 'race2' THEN points_value ELSE 0 END, 
              best_lap);
      
      -- Insert lap times (5 laps per pilot per session)
      FOR i IN 1..5 LOOP
        INSERT INTO lap_times (race_id, pilot_id, session_type, lap_number, time, improvement)
        VALUES (
          race_id, 
          pilot_id, 
          session_type, 
          i, 
          '1:0' || (floor(random() * 9) + 1)::text || '.' || (floor(random() * 900) + 100)::text,
          '-0.' || (floor(random() * 900) + 100)::text
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
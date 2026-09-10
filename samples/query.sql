-- Glass Material Renderer Database Queries
-- PostgreSQL dialect with advanced SQL features

-- Create table for materials with constraints and types
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  material_type VARCHAR(50) NOT NULL,
  refractive_index NUMERIC(5, 4) NOT NULL CHECK (refractive_index >= 1.0),
  density FLOAT8 NOT NULL,
  transmittance NUMERIC(3, 2) NOT NULL DEFAULT 0.95,
  roughness NUMERIC(3, 2) NOT NULL DEFAULT 0.0 CHECK (roughness >= 0 AND roughness <= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_transmittance CHECK (transmittance >= 0 AND transmittance <= 1)
);

-- Create table for optical properties measurements
CREATE TABLE IF NOT EXISTS optical_properties (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  wavelength INTEGER NOT NULL CHECK (wavelength > 0),
  refraction_index NUMERIC(5, 4) NOT NULL,
  absorption NUMERIC(5, 5) NOT NULL DEFAULT 0,
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(material_id, wavelength)
);

-- Create table for rendering sessions
CREATE TABLE IF NOT EXISTS render_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id INTEGER NOT NULL REFERENCES materials(id),
  fps INTEGER CHECK (fps > 0 AND fps <= 240),
  quality_level VARCHAR(20),
  pixel_count BIGINT,
  render_time_ms NUMERIC(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample materials with RETURNING clause
INSERT INTO materials (
  name,
  material_type,
  refractive_index,
  density,
  transmittance,
  roughness
) VALUES
  ('Soda-Lime Glass', 'standard', 1.52, 2.5, 0.95, 0.1),
  ('Borosilicate Glass', 'scientific', 1.51, 2.23, 0.96, 0.08),
  ('Diamond', 'precious', 2.42, 3.52, 0.99, 0.02),
  ('Sapphire', 'precious', 1.76, 3.98, 0.97, 0.05)
ON CONFLICT (name) DO NOTHING
RETURNING id, name, refractive_index;

-- Insert optical properties for materials
INSERT INTO optical_properties (
  material_id,
  wavelength,
  refraction_index,
  absorption
) VALUES
  (1, 400, 1.536, 0.001),
  (1, 589, 1.520, 0.0),
  (1, 1000, 1.508, 0.002),
  (2, 400, 1.534, 0.0008),
  (3, 400, 2.456, 0.0),
  (3, 589, 2.417, 0.0)
ON CONFLICT (material_id, wavelength) DO UPDATE
  SET refraction_index = EXCLUDED.refraction_index
  RETURNING material_id, wavelength, refraction_index;

-- CTE: Material summary with aggregates
WITH material_stats AS (
  SELECT
    m.id,
    m.name,
    m.material_type,
    m.refractive_index,
    m.density,
    COUNT(op.id)::INTEGER AS property_count,
    AVG(op.refraction_index)::NUMERIC(5, 4) AS avg_refraction_index,
    MIN(op.wavelength)::INTEGER AS min_wavelength,
    MAX(op.wavelength)::INTEGER AS max_wavelength,
    ROUND(
      (MAX(op.refraction_index) - MIN(op.refraction_index))::NUMERIC,
      4
    ) AS dispersion
  FROM materials m
  LEFT JOIN optical_properties op ON m.id = op.material_id
  WHERE m.is_active = true
  GROUP BY m.id, m.name, m.material_type, m.refractive_index, m.density
)
SELECT
  name,
  material_type AS type,
  refractive_index::VARCHAR(10) AS "Index (n)",
  density::VARCHAR(10) AS "Density g/cm³",
  property_count,
  CASE
    WHEN dispersion IS NULL THEN 'No data'
    WHEN dispersion < 0.01 THEN 'Very Low'
    WHEN dispersion < 0.05 THEN 'Low'
    WHEN dispersion < 0.1 THEN 'Moderate'
    ELSE 'High'
  END AS dispersion_level
FROM material_stats
ORDER BY refractive_index DESC, name ASC;

-- Window functions: Render performance ranking
SELECT
  rs.session_id,
  m.name AS material,
  rs.fps,
  rs.quality_level,
  rs.pixel_count,
  rs.render_time_ms,
  /* Row numbering within quality level */
  ROW_NUMBER() OVER (
    PARTITION BY rs.quality_level
    ORDER BY rs.fps DESC
  ) AS rank_in_quality,
  /* Ranking with ties */
  RANK() OVER (
    ORDER BY rs.fps DESC
  ) AS overall_rank,
  /* Dense ranking */
  DENSE_RANK() OVER (
    PARTITION BY m.name
    ORDER BY rs.render_time_ms ASC
  ) AS speed_rank,
  /* Cumulative sum */
  SUM(rs.render_time_ms) OVER (
    PARTITION BY m.name
    ORDER BY rs.created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS cumulative_time_ms,
  /* Average within partition */
  AVG(rs.fps) OVER (PARTITION BY m.name) AS avg_fps_by_material,
  /* Lead and lag */
  LAG(rs.fps, 1, 0) OVER (ORDER BY rs.created_at) AS prev_fps,
  LEAD(rs.fps, 1, 0) OVER (ORDER BY rs.created_at) AS next_fps,
  /* Percentage of total */
  ROUND(
    100.0 * rs.render_time_ms::NUMERIC /
    SUM(rs.render_time_ms) OVER (PARTITION BY m.name),
    2
  ) AS percent_of_material_time
FROM render_sessions rs
JOIN materials m ON rs.material_id = m.id
WHERE rs.created_at >= NOW() - INTERVAL '7 days'
ORDER BY rs.created_at DESC
LIMIT 100;

-- JOIN query: Material properties analysis
SELECT
  m.id,
  m.name,
  m.refractive_index::VARCHAR(10) AS refractive_index,
  STRING_AGG(
    DISTINCT m.material_type,
    ', '
  ) AS types,
  COUNT(op.id)::INTEGER AS measurements,
  ARRAY_AGG(op.wavelength ORDER BY op.wavelength) AS wavelengths_nm,
  CASE
    WHEN COUNT(op.id) = 0 THEN 'Unmeasured'
    WHEN m.roughness < 0.05 THEN 'Smooth'
    WHEN m.roughness < 0.15 THEN 'Medium'
    ELSE 'Rough'
  END AS surface_quality,
  /* Literal hex color for visualization */
  '#' || LPAD(
    CAST(FLOOR(m.refractive_index * 1000) AS TEXT),
    6,
    '0'
  ) AS color_code,
  /* Type casting examples */
  m.transmittance::INTEGER AS transmittance_percent,
  EXTRACT(DAY FROM m.updated_at)::TEXT AS update_day,
  (m.density::NUMERIC(5, 3))::TEXT AS density_3dp
FROM materials m
LEFT JOIN optical_properties op ON m.id = op.material_id
WHERE m.is_active = true
GROUP BY
  m.id,
  m.name,
  m.refractive_index,
  m.roughness,
  m.transmittance,
  m.density,
  m.updated_at
ORDER BY m.refractive_index DESC;

-- Update materials with CASE expression
UPDATE materials
SET
  quality_level = CASE
    WHEN refractive_index > 2.0 THEN 'Premium'
    WHEN refractive_index > 1.7 THEN 'High'
    WHEN refractive_index > 1.5 THEN 'Standard'
    ELSE 'Basic'
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE is_active = true
RETURNING id, name, quality_level, updated_at;

-- Function: Calculate Fresnel coefficient
CREATE OR REPLACE FUNCTION calculate_fresnel(
  refractive_index NUMERIC,
  OUT fresnel_coefficient NUMERIC
) AS $$
BEGIN
  -- Comment with inline logic
  fresnel_coefficient := POWER(
    (refractive_index - 1) / (refractive_index + 1),
    2::NUMERIC
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Query using custom function
SELECT
  id,
  name,
  refractive_index,
  calculate_fresnel(refractive_index) AS fresnel_coeff,
  /* Numeric literal with exponent */
  (refractive_index * 1.5e2)::INTEGER AS scaled_index
FROM materials
WHERE transmittance > 0.90
ORDER BY calculate_fresnel(refractive_index) DESC;

-- Complex query: Render performance analysis with multiple CTEs
WITH hourly_stats AS (
  SELECT
    DATE_TRUNC('hour', rs.created_at)::TIMESTAMP AS hour,
    m.name AS material,
    COUNT(*)::INTEGER AS session_count,
    AVG(rs.fps)::NUMERIC(5, 1) AS avg_fps,
    MAX(rs.fps)::INTEGER AS peak_fps,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY rs.fps) AS p95_fps,
    SUM(rs.pixel_count)::BIGINT AS total_pixels
  FROM render_sessions rs
  JOIN materials m ON rs.material_id = m.id
  WHERE rs.created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY hour, m.name
),
quality_distribution AS (
  SELECT
    hour,
    material,
    session_count,
    avg_fps,
    peak_fps,
    p95_fps,
    total_pixels,
    CASE
      WHEN avg_fps >= 60 THEN 'Excellent'
      WHEN avg_fps >= 30 THEN 'Good'
      WHEN avg_fps >= 15 THEN 'Fair'
      ELSE 'Poor'
    END AS performance_tier
  FROM hourly_stats
)
SELECT
  hour,
  material,
  session_count,
  avg_fps,
  peak_fps,
  p95_fps,
  total_pixels,
  performance_tier,
  RANK() OVER (PARTITION BY hour ORDER BY avg_fps DESC) AS material_rank
FROM quality_distribution
WHERE hour IS NOT NULL
ORDER BY hour DESC, material_rank ASC;

-- Comment block: Index optimization
/* CREATE INDEX idx_render_sessions_material_date ON render_sessions(material_id, created_at DESC);
   CREATE INDEX idx_optical_properties_wavelength ON optical_properties(material_id, wavelength);
   CREATE INDEX idx_materials_active_index ON materials(is_active, refractive_index); */

COMMIT;

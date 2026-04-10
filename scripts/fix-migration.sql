-- Mark migrations 0001-0004 as applied so we can run 0005
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) 
VALUES 
  (
    (SELECT hash FROM (SELECT 1) as dummy WHERE NOT EXISTS (
      SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = '0001'
    ) LIMIT 1), 
    extract(epoch from now()) * 1000
  );

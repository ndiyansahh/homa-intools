const { Pool } = require('pg');

async function syncTrialCleaners() {
  const pool = new Pool({
    connectionString: "postgresql://handisulyansah@localhost:5432/homa_db",
  });

  try {
    console.log('Starting trial cleaner sync...');

    // Get all active mitras
    const mitras = await pool.query(`
      SELECT id, mitra_name 
      FROM mitra_db 
      WHERE status = 'Active' 
      AND is_active = true 
      AND is_deleted = false
      ORDER BY mitra_name
    `);
    console.log(`✓ Found ${mitras.rows.length} active mitras:`, mitras.rows.map(m => m.mitra_name));

    if (mitras.rows.length === 0) {
      console.log('❌ No active mitras found. Cannot assign cleaners.');
      return;
    }

    // Get all trial customers without assigned cleaners
    const trialsWithoutCleaners = await pool.query(`
      SELECT id, customer_name, city, district
      FROM customer_db 
      WHERE subscription_status IN ('Trial', 'Trial Scheduled')
      AND (is_deleted = false OR is_deleted IS NULL)
      AND assigned_mitra_id IS NULL
      ORDER BY created_at DESC
    `);
    console.log(`✓ Found ${trialsWithoutCleaners.rows.length} trials without cleaners`);

    // Also get trials that might have cleaner names in notes but no mitra_id
    const trialsWithNotesOnly = await pool.query(`
      SELECT id, customer_name, customer_notes
      FROM customer_db 
      WHERE subscription_status IN ('Trial', 'Trial Scheduled')
      AND (is_deleted = false OR is_deleted IS NULL)
      AND assigned_mitra_id IS NULL
      AND customer_notes ILIKE '%assigned%'
    `);
    console.log(`✓ Found ${trialsWithNotesOnly.rows.length} trials with cleaner in notes but no mitra_id`);

    let assignmentCount = 0;

    // Assign mitras to trials without cleaners (round-robin)
    for (let i = 0; i < trialsWithoutCleaners.rows.length; i++) {
      const trial = trialsWithoutCleaners.rows[i];
      const mitra = mitras.rows[i % mitras.rows.length]; // Round-robin assignment

      const result = await pool.query(`
        UPDATE customer_db 
        SET assigned_mitra_id = $1,
            customer_notes = COALESCE(customer_notes, '') || ' - Assigned Cleaner: ' || $2
        WHERE id = $3
        RETURNING customer_name
      `, [mitra.id, mitra.mitra_name, trial.id]);

      console.log(`✓ Assigned ${mitra.mitra_name} to ${trial.customer_name} (${trial.city})`);
      assignmentCount++;
    }

    // Try to match existing cleaner names in notes with actual mitras
    for (const trial of trialsWithNotesOnly.rows) {
      // Extract cleaner name from notes
      const cleanerMatch = trial.customer_notes.match(/assigned[^:]*:\s*([^-\n,]+)/i);
      if (cleanerMatch) {
        const cleanerName = cleanerMatch[1].trim();
        
        // Find matching mitra by name
        const matchingMitra = mitras.rows.find(m => 
          m.mitra_name.toLowerCase().includes(cleanerName.toLowerCase()) ||
          cleanerName.toLowerCase().includes(m.mitra_name.toLowerCase())
        );

        if (matchingMitra) {
          await pool.query(`
            UPDATE customer_db 
            SET assigned_mitra_id = $1
            WHERE id = $2
          `, [matchingMitra.id, trial.id]);

          console.log(`✓ Matched ${cleanerName} → ${matchingMitra.mitra_name} for ${trial.customer_name}`);
          assignmentCount++;
        } else {
          // Assign a default mitra if no match found
          const defaultMitra = mitras.rows[0];
          await pool.query(`
            UPDATE customer_db 
            SET assigned_mitra_id = $1,
                customer_notes = customer_notes || ' - Auto-assigned: ' || $2
            WHERE id = $3
          `, [defaultMitra.id, defaultMitra.mitra_name, trial.id]);

          console.log(`✓ Auto-assigned ${defaultMitra.mitra_name} to ${trial.customer_name} (no match for "${cleanerName}")`);
          assignmentCount++;
        }
      }
    }

    console.log(`\n🎉 Sync completed! Assigned cleaners to ${assignmentCount} trials`);

    // Verify the results
    const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) as total_trials,
        COUNT(assigned_mitra_id) as trials_with_cleaners
      FROM customer_db 
      WHERE subscription_status IN ('Trial', 'Trial Scheduled')
      AND (is_deleted = false OR is_deleted IS NULL)
    `);
    
    const stats = verifyResult.rows[0];
    console.log(`📊 Final stats: ${stats.trials_with_cleaners}/${stats.total_trials} trials have cleaners assigned`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await pool.end();
  }
}

syncTrialCleaners();
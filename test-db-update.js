// Test database update for debugging
const { db } = require('./src/lib/db.js');
const { customerDB } = require('./src/lib/schema.js');
const { eq } = require('drizzle-orm');

async function testUpdateNotes() {
  try {
    console.log('Testing database update...');
    
    // First, let's check the existing data
    const existing = await db
      .select()
      .from(customerDB)
      .where(eq(customerDB.id, 'b8cb4d68-e85e-4ede-a7bc-cee28e1cd9b0'))
      .limit(1);
    
    console.log('Existing data:', existing[0]);
    
    // Test update
    const result = await db
      .update(customerDB)
      .set({ notes: 'Test notes from script' })
      .where(eq(customerDB.id, 'b8cb4d68-e85e-4ede-a7bc-cee28e1cd9b0'))
      .returning();
    
    console.log('Update result:', result[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testUpdateNotes();
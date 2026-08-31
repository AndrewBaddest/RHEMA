const fs = require('fs');

const SUPABASE_URL = 'https://rmabikvmjwyupmitctbw.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtYWJpa3Ztand1eXBtaXRjdGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODE0MDIsImV4cCI6MjEwMjM1NzQwMn0.kUYIVudJKfbHuwK8aE0nnYVLQOvJR-E7sALx3l-srD4';

const bibleData = JSON.parse(fs.readFileSync('./bible-seed.json', 'utf8'));

async function seed() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/seed_bible`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({ data: bibleData })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Seeding failed:', response.status, errorText);
  } else {
    console.log('✅ Bible data seeded successfully!');
  }
}

seed();

#!/usr/bin/env node
// scripts/translate-gemini.mjs
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const INPUT_FILE = 'english-questions.json';
const OUTPUT_FILE = 'swahili-questions.json';
const BATCH_SIZE = 15; // Gemini can handle 15 at a time easily

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in .env');
  process.exit(1);
}

// We use Gemini 2.5 Flash (fast, smart, and on the free tier)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.1,
  }
});

async function translateBatch(batch) {
  const prompt = `
You are a professional Bible translator translating a Bible Quiz into Kiswahili.
Translate the "question" and "options" into natural, accurate Kiswahili.
CRITICAL RULE 1: You must translate the "correct_answer" so that it EXACTLY MATCHES one of the translated strings in the "options" array.
CRITICAL RULE 2: You must return a JSON OBJECT with a single key "questions" containing the translated array. 

Expected Output Format:
{
  "questions": [
    {
      "id": 1,
      "quiz_id": 1,
      "book": "Genesis",
      "question": "Swahili question here",
      "options": ["Chaguo A", "Chaguo B", "Chaguo C", "Chaguo D"],
      "correct_answer": "Chaguo A",
      "verse_reference": "Mwanzo 1:1"
    }
  ]
}

Input JSON:
${JSON.stringify(batch, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text);
  return parsed.questions || parsed; 
}

async function main() {
  console.log('🚀 Starting translation with Gemini...');
  
  const englishData = JSON.parse(readFileSync(INPUT_FILE, 'utf8'));
  
  let translatedData = [];
  if (existsSync(OUTPUT_FILE)) {
    translatedData = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'));
    console.log(`♻️  Resuming. Already translated: ${translatedData.length}`);
  }

  const remaining = englishData.slice(translatedData.length);
  const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);
  console.log(`📝 Questions left: ${remaining.length} (${totalBatches} batches of ${BATCH_SIZE})`);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    
    console.log(`⏳ Translating batch ${batchNum} / ${totalBatches}...`);

    try {
      const translatedBatch = await translateBatch(batch);
      
      if (Array.isArray(translatedBatch) && translatedBatch.length === batch.length) {
        translatedData = translatedData.concat(translatedBatch);
        writeFileSync(OUTPUT_FILE, JSON.stringify(translatedData, null, 2), 'utf8');
        console.log(`   ✓ Saved. Progress: ${translatedData.length}/${englishData.length}`);
      } else {
        console.error('   ⚠️ AI returned wrong array length. Skipping batch.');
      }
    } catch (err) {
      console.error('   ❌ API Error:', err.message);
      console.log('   Waiting 15 seconds before retrying (Rate Limit)...');
      await new Promise(r => setTimeout(r, 15000));
      i -= BATCH_SIZE; // Retry the exact same batch
      continue;
    }

    // Gemini free tier allows 15 requests per minute. 
    // 4.5 seconds per batch = ~13 requests per minute. Safe!
    await new Promise(r => setTimeout(r, 4500));
  }

  console.log('🎉 Translation complete! Saved to', OUTPUT_FILE);
}

main().catch(console.error);
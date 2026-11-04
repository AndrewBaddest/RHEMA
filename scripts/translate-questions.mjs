#!/usr/bin/env node
// scripts/translate-questions.mjs
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import OpenAI from 'openai';

const groq = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1' 
});

const INPUT_FILE = 'english-questions.json';
const OUTPUT_FILE = 'swahili-questions.json';
const BATCH_SIZE = 5; // 👈 Reduced to 5 for maximum AI accuracy

if (!process.env.GROQ_API_KEY) {
  console.error('❌ Missing GROQ_API_KEY in .env');
  process.exit(1);
}

async function translateBatch(batch) {
  const prompt = `
Translate the following ${batch.length} Bible Quiz questions into natural, accurate Kiswahili.

CRITICAL RULES:
1. The "correct_answer" MUST exactly match one of the translated strings in the "options" array. Do not alter it afterwards.
2. You must return a JSON OBJECT with a single key "questions" containing an array of exactly ${batch.length} objects. 

Input JSON:
${JSON.stringify(batch, null, 2)}
`;

  const response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      { 
        role: 'system', 
        content: 'You are a JSON-only API. You output ONLY valid JSON matching the exact requested schema. Never output markdown, explanations, or arrays at the root level.' 
      },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  let content = response.choices[0].message.content.trim();
  
  // Defensive parsing: strip markdown if the AI hallucinates it
  if (content.startsWith('```json')) content = content.slice(7);
  else if (content.startsWith('```')) content = content.slice(3);
  if (content.endsWith('```')) content = content.slice(0, -3);
  
  try {
    const parsed = JSON.parse(content.trim());
    const questionsArray = parsed.questions || parsed;
    
    if (!Array.isArray(questionsArray)) {
      console.error('   🐛 AI returned non-array:', JSON.stringify(questionsArray).substring(0, 100));
      return null;
    }
    
    return questionsArray;
  } catch (err) {
    console.error('   🐛 Failed to parse JSON. Raw output:', content.substring(0, 100));
    return null;
  }
}

async function main() {
  console.log('🚀 Starting translation (Safe Mode)...');
  
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
        console.error(`   ⚠️ AI returned wrong array length (Expected ${batch.length}, Got ${translatedBatch?.length}). Skipping batch.`);
      }
    } catch (err) {
      console.error('   ❌ API Error:', err.message);
      if (err.status === 413) {
        console.log('   🛑 Hit the 8,000 TPM limit. Waiting 60 seconds...');
        await new Promise(r => setTimeout(r, 60000));
      } else if (err.status === 400) {
        console.log('   🛑 Groq JSON validation failed. Waiting 10 seconds...');
        await new Promise(r => setTimeout(r, 10000));
      } else {
        console.log('   Waiting 10 seconds before retrying...');
        await new Promise(r => setTimeout(r, 10000));
      }
      i -= BATCH_SIZE; // Retry the exact same batch
      continue;
    }

    // Wait 8 seconds. Since batch size is 5, we use fewer tokens and can go slightly faster.
    await new Promise(r => setTimeout(r, 8000));
  }

  console.log('🎉 Translation complete! Saved to', OUTPUT_FILE);
}

main().catch(console.error);
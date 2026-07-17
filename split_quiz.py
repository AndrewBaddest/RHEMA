#!/usr/bin/env python3
"""
Split quiz_data.json into per‑book JSON files inside 'quiz_data/'.
Filenames match Bible-niv convention: "Genesis.json", "1 Chronicles.json", etc.
"""

import json
import os

os.makedirs('quiz_data', exist_ok=True)

with open('quiz_data.json', 'r', encoding='utf-8') as f:
    quiz_data = json.load(f)

for book, questions in quiz_data.items():
    # Use the book name as filename (with spaces, exactly as in Bible-niv)
    filename = f"quiz_data/{book}.json"
    with open(filename, 'w', encoding='utf-8') as out:
        json.dump(questions, out, ensure_ascii=False, indent=2)
    print(f"✅ Created {filename}")

print(f"\n✅ Done! Split {len(quiz_data)} books into quiz_data/ folder.")
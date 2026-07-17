import json
import glob
import os

bible_data = {}

# Process every .json file except Books.json
for filepath in glob.glob("Bible-niv/*.json"):
    if os.path.basename(filepath) == "Books.json":
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        book_obj = json.load(f)

    book_name = book_obj["book"]          # e.g., "Genesis"
    chapters = {}
    for ch in book_obj["chapters"]:
        ch_num = str(ch["chapter"])       # e.g., "1"
        verses_text = [v["text"] for v in ch["verses"]]
        chapters[ch_num] = verses_text

    bible_data[book_name] = chapters

# Write the combined file (overwrites existing bible_data.json)
with open("bible_data.json", "w", encoding="utf-8") as out:
    json.dump(bible_data, out, indent=2, ensure_ascii=False)

print(f"✅ Merged {len(bible_data)} books into bible_data.json")
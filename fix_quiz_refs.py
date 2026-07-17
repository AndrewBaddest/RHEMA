import json
import glob
import re

# Pattern to find references like "Neh 3:20", "Luke 1:1", "Gen 1:1", etc.
# Allows book name with letters, digits, spaces, periods, apostrophes, hyphens.
REF_PATTERN = re.compile(r'\(?([A-Za-z0-9.\'\- ]+?)\s+(\d+):(\d+)\)?')

for filepath in glob.glob("quiz_data/*.json"):
    with open(filepath, 'r', encoding='utf-8') as f:
        questions = json.load(f)

    modified = False
    for q in questions:
        # If the ref is already present and matches the question text, skip.
        # But we'll override with the one from the text for consistency.
        # Extract reference from the question text.
        match = REF_PATTERN.search(q['question'])
        if match:
            book = match.group(1).strip()
            chapter = int(match.group(2))
            verse = int(match.group(3))
            # Build the full ref string (e.g., "Nehemiah 3:20" or "Neh 3:20")
            # We'll use the exact book name as it appears, but we could map to full name.
            # Since getFullName handles abbreviations, we can keep as is.
            new_ref = f"{book} {chapter}:{verse}"
            if q.get('ref') != new_ref:
                print(f"Updating {filepath}: '{q.get('ref')}' -> '{new_ref}'")
                q['ref'] = new_ref
                modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        print(f"✅ Updated {filepath}")
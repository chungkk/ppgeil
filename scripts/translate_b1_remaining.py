#!/usr/bin/env python3
"""Continue translating B1 from batch 56"""

import json
import os
import time
from openai import OpenAI

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('OPENAI_API_KEY='):
                return line.strip().split('=', 1)[1]
    return None

API_KEY = load_env()
client = OpenAI(api_key=API_KEY)

def translate_batch(words, level):
    word_list = "\n".join([f"{i+1}. {w['word']}" for i, w in enumerate(words)])
    
    prompt = f"""Dịch các từ tiếng Đức cấp độ {level} sau sang tiếng Việt và tiếng Anh.
Yêu cầu:
- Dịch tự nhiên, không dịch máy
- Với danh từ, giữ nguyên article (der/die/das)
- Với động từ, dịch dạng nguyên thể
- Trả về JSON array với format: [{{"de": "từ đức", "vi": "nghĩa tiếng việt", "en": "english meaning"}}]

Danh sách từ:
{word_list}

Chỉ trả về JSON array, không có text khác."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Bạn là chuyên gia dịch thuật tiếng Đức. Dịch chính xác và tự nhiên."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=4000
        )
        
        result = response.choices[0].message.content.strip()
        if result.startswith("```json"):
            result = result[7:]
        if result.startswith("```"):
            result = result[3:]
        if result.endswith("```"):
            result = result[:-3]
        
        return json.loads(result.strip())
    except Exception as e:
        print(f"Error translating batch: {e}")
        return None

base_path = os.path.join(os.path.dirname(__file__), '..', 'lib', 'data')

# Load original B1
with open(os.path.join(base_path, 'goethe_b1_vocabulary.json'), 'r', encoding='utf-8') as f:
    vocab = json.load(f)

# Start from batch 56 (index 1650)
start_idx = 1650
batch_size = 30
translated = []

# First, add already translated items (simulate by translating from start, but we'll skip)
# Actually, let's just translate the remaining and merge later
remaining = vocab[start_idx:]

print(f"Translating remaining {len(remaining)} words (from index {start_idx})")

for i in range(0, len(remaining), batch_size):
    batch = remaining[i:i+batch_size]
    batch_num = (start_idx + i) // batch_size + 1
    print(f"Processing batch {batch_num}/60 ({start_idx+i+1}-{min(start_idx+i+batch_size, len(vocab))})")
    
    translations = translate_batch(batch, "B1")
    
    if translations:
        for j, trans in enumerate(translations):
            if j < len(batch):
                entry = batch[j].copy()
                entry['vi'] = trans.get('vi', '')
                entry['en'] = trans.get('en', '')
                translated.append(entry)
    else:
        for item in batch:
            entry = item.copy()
            entry['vi'] = ''
            entry['en'] = ''
            translated.append(entry)
    
    time.sleep(1)

# Save remaining translations
with open(os.path.join(base_path, 'goethe_b1_remaining.json'), 'w', encoding='utf-8') as f:
    json.dump(translated, f, ensure_ascii=False, indent=2)

print(f"\nSaved {len(translated)} remaining translations")
print("Now merge with existing partial translation...")

# Try to load partial B1 if exists, otherwise translate from scratch
partial_file = os.path.join(base_path, 'goethe_b1_vocabulary_translated.json')
if os.path.exists(partial_file):
    with open(partial_file, 'r', encoding='utf-8') as f:
        partial = json.load(f)
    print(f"Loaded {len(partial)} existing translations")
    
    # Merge
    full_translated = partial[:start_idx] + translated
else:
    print("No partial file found, need to translate from beginning")
    full_translated = translated

# Save full translation
with open(partial_file, 'w', encoding='utf-8') as f:
    json.dump(full_translated, f, ensure_ascii=False, indent=2)

print(f"Saved complete B1 with {len(full_translated)} words")

# Create JS file
nouns = len([v for v in full_translated if v['type'] == 'noun'])
verbs = len([v for v in full_translated if v['type'] == 'verb'])
adjs = len([v for v in full_translated if v['type'] == 'adjective/adverb'])

js_content = f"""// Goethe Institut B1 Vocabulary with translations
// Total: {len(full_translated)} words (Nouns: {nouns}, Verbs: {verbs}, Adj/Adv: {adjs})

export const goetheB1Vocabulary = {json.dumps(full_translated, ensure_ascii=False, indent=2)};

export const getB1Nouns = () => goetheB1Vocabulary.filter(v => v.type === 'noun');
export const getB1Verbs = () => goetheB1Vocabulary.filter(v => v.type === 'verb');
export const getB1Adjectives = () => goetheB1Vocabulary.filter(v => v.type === 'adjective/adverb');

export default goetheB1Vocabulary;
"""

with open(os.path.join(base_path, 'goetheB1Vocabulary.js'), 'w', encoding='utf-8') as f:
    f.write(js_content)

print("DONE!")

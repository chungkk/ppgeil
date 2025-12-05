#!/usr/bin/env python3
"""Translate B1 vocabulary with incremental saves"""

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
        print(f"Error: {e}")
        return None

base_path = os.path.join(os.path.dirname(__file__), '..', 'lib', 'data')
output_file = os.path.join(base_path, 'goethe_b1_vocabulary_translated.json')

# Load original B1
with open(os.path.join(base_path, 'goethe_b1_vocabulary.json'), 'r', encoding='utf-8') as f:
    vocab = json.load(f)

# Check for existing progress
translated = []
start_idx = 0

if os.path.exists(output_file):
    with open(output_file, 'r', encoding='utf-8') as f:
        translated = json.load(f)
    start_idx = len(translated)
    print(f"Resuming from index {start_idx}")

batch_size = 50  # Larger batches for speed
total = len(vocab)

print(f"Translating B1: {total} words, starting from {start_idx}")

for i in range(start_idx, total, batch_size):
    batch = vocab[i:i+batch_size]
    print(f"Batch {i//batch_size + 1}/{(total-1)//batch_size + 1} ({i+1}-{min(i+batch_size, total)})")
    
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
    
    # Save progress every 5 batches
    if (i // batch_size + 1) % 5 == 0:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(translated, f, ensure_ascii=False, indent=2)
        print(f"  Saved progress: {len(translated)} words")
    
    time.sleep(0.5)

# Final save
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(translated, f, ensure_ascii=False, indent=2)

# Create JS file
nouns = len([v for v in translated if v['type'] == 'noun'])
verbs = len([v for v in translated if v['type'] == 'verb'])
adjs = len([v for v in translated if v['type'] == 'adjective/adverb'])

js_content = f"""// Goethe Institut B1 Vocabulary with translations
// Total: {len(translated)} words (Nouns: {nouns}, Verbs: {verbs}, Adj/Adv: {adjs})

export const goetheB1Vocabulary = {json.dumps(translated, ensure_ascii=False, indent=2)};

export const getB1Nouns = () => goetheB1Vocabulary.filter(v => v.type === 'noun');
export const getB1Verbs = () => goetheB1Vocabulary.filter(v => v.type === 'verb');
export const getB1Adjectives = () => goetheB1Vocabulary.filter(v => v.type === 'adjective/adverb');

export default goetheB1Vocabulary;
"""

with open(os.path.join(base_path, 'goetheB1Vocabulary.js'), 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"\nDONE! Total: {len(translated)} words")

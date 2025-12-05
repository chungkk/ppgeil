#!/usr/bin/env python3
"""
Script to translate Goethe vocabulary using ChatGPT API
Translates German words to Vietnamese and English
"""

import json
import os
import time
from openai import OpenAI

# Load API key from .env.local file
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
    """Translate a batch of German words to Vietnamese and English"""
    
    # Create word list for prompt
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
        # Clean up response
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

def translate_vocabulary(input_file, output_file, level, batch_size=30):
    """Translate entire vocabulary file"""
    
    # Load vocabulary
    with open(input_file, 'r', encoding='utf-8') as f:
        vocab = json.load(f)
    
    print(f"\n{'='*50}")
    print(f"Translating {level}: {len(vocab)} words")
    print(f"{'='*50}")
    
    translated = []
    
    # Process in batches
    for i in range(0, len(vocab), batch_size):
        batch = vocab[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1}/{(len(vocab)-1)//batch_size + 1} ({i+1}-{min(i+batch_size, len(vocab))})")
        
        translations = translate_batch(batch, level)
        
        if translations:
            # Merge translations with original data
            for j, trans in enumerate(translations):
                if j < len(batch):
                    entry = batch[j].copy()
                    entry['vi'] = trans.get('vi', '')
                    entry['en'] = trans.get('en', '')
                    translated.append(entry)
        else:
            # If translation fails, keep original without translation
            for item in batch:
                entry = item.copy()
                entry['vi'] = ''
                entry['en'] = ''
                translated.append(entry)
        
        # Rate limiting
        time.sleep(1)
    
    # Save translated vocabulary
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(translated, f, ensure_ascii=False, indent=2)
    
    print(f"Saved to {output_file}")
    return translated

def create_js_file(vocab, output_file, level):
    """Create JavaScript module from translated vocabulary"""
    
    nouns = len([v for v in vocab if v['type'] == 'noun'])
    verbs = len([v for v in vocab if v['type'] == 'verb'])
    adjs = len([v for v in vocab if v['type'] == 'adjective/adverb'])
    
    js_content = f"""// Goethe Institut {level} Vocabulary with translations
// Total: {len(vocab)} words (Nouns: {nouns}, Verbs: {verbs}, Adj/Adv: {adjs})

export const goethe{level}Vocabulary = {json.dumps(vocab, ensure_ascii=False, indent=2)};

export const get{level}Nouns = () => goethe{level}Vocabulary.filter(v => v.type === 'noun');
export const get{level}Verbs = () => goethe{level}Vocabulary.filter(v => v.type === 'verb');
export const get{level}Adjectives = () => goethe{level}Vocabulary.filter(v => v.type === 'adjective/adverb');

export default goethe{level}Vocabulary;
"""
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"Saved JS to {output_file}")

if __name__ == "__main__":
    import sys
    
    base_path = os.path.join(os.path.dirname(__file__), '..', 'lib', 'data')
    
    # Get level from command line or process all
    levels = sys.argv[1:] if len(sys.argv) > 1 else ['A1', 'A2', 'B1']
    
    for level in levels:
        input_file = os.path.join(base_path, f'goethe_{level.lower()}_vocabulary.json')
        output_file = os.path.join(base_path, f'goethe_{level.lower()}_vocabulary_translated.json')
        js_file = os.path.join(base_path, f'goethe{level}Vocabulary.js')
        
        if os.path.exists(input_file):
            translated = translate_vocabulary(input_file, output_file, level)
            create_js_file(translated, js_file, level)
        else:
            print(f"File not found: {input_file}")
    
    print("\n" + "="*50)
    print("DONE!")
    print("="*50)

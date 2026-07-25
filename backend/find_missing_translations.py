import os
import json
import re

src_dir = 'g:/silal_market_pro_parking/src'
en_path = os.path.join(src_dir, 'translations', 'en.json')
ar_path = os.path.join(src_dir, 'translations', 'ar.json')

with open(en_path, 'r', encoding='utf-8') as f:
    en_data = json.load(f)

with open(ar_path, 'r', encoding='utf-8') as f:
    ar_data = json.load(f)

def flatten_dict(d, parent_key='', sep='.'):
    items = []
    for k, v in d.items():
        new_key = parent_key + sep + k if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

en_flat = flatten_dict(en_data)
ar_flat = flatten_dict(ar_data)

used_keys = set()
pattern = re.compile(r't\(\s*[\'\"`]([\w\.]+)[\'\"`]')

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
            with open(os.path.join(root, file), 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                matches = pattern.findall(content)
                used_keys.update(matches)

missing_en = sorted([k for k in used_keys if k not in en_flat])
missing_ar = sorted([k for k in used_keys if k not in ar_flat])

print(f'Total used keys found: {len(used_keys)}')
print(f'Missing in EN ({len(missing_en)}): {missing_en}')
print(f'Missing in AR ({len(missing_ar)}): {missing_ar}')

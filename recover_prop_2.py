import re
import json

transcript_path = r'C:\Users\Administrator\.gemini\antigravity\brain\c048a971-3d30-44bf-975f-06a4bf956804\.system_generated\logs\transcript_full.jsonl'
output_path = r'c:\Users\Administrator\Desktop\SND\frontend\src\pages\Properties.jsx'

with open(transcript_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in reversed(lines):
    if 'import React, { useEffect, useState, useContext } from \\"react\\";' in line and 'export default function Properties()' in line:
        data = json.loads(line)
        content = data.get('content', '')
        # extract the modified code
        match = re.search(r'The following code has been modified.*?(1: import [\s\S]*)', content)
        if match:
            code = match.group(1)
            code = re.sub(r'^\d+: ', '', code, flags=re.MULTILINE)
            print("Found Properties.jsx with", len(code), "characters.")
            with open(output_path, 'w', encoding='utf-8') as out:
                out.write(code)
            break

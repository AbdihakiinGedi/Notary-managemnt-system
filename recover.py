import re

transcript_path = r'C:\Users\Administrator\.gemini\antigravity\brain\c048a971-3d30-44bf-975f-06a4bf956804\.system_generated\logs\transcript_full.jsonl'
output_path = r'c:\Users\Administrator\Desktop\SND\frontend\src\pages\officer\Dashboard.jsx'

with open(transcript_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Find the string "Showing lines 1 to 455\nThe following code has been modified..."
match = re.search(r'Showing lines 1 to 455\\nThe following code has been modified.*?(1: import React.*?)\\n"', text)
if match:
    content = match.group(1)
    content = content.replace('\\n', '\n')
    
    clean_lines = []
    for line in content.split('\n'):
        clean_line = re.sub(r'^\d+: ', '', line)
        clean_lines.append(clean_line)
        
    with open(output_path, 'w', encoding='utf-8') as out:
        out.write('\n'.join(clean_lines))
    print("Dashboard recovered!")
else:
    print("Match not found.")

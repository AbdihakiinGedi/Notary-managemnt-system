import re
import json

transcript_path = r'C:\Users\Administrator\.gemini\antigravity\brain\c048a971-3d30-44bf-975f-06a4bf956804\.system_generated\logs\transcript_full.jsonl'
output_path = r'c:\Users\Administrator\Desktop\SND\frontend\src\pages\Properties.jsx'

with open(transcript_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Find the string "Showing lines 1 to 126\nThe following code has been modified..."
# Wait, I didn't view it earlier. Maybe it was in a multi_replace_file_content output?
# Let's just find the last time Properties.jsx was outputted in full, or maybe it wasn't.
# If it wasn't, wait... When did Properties.jsx get corrupted?
# Let me search transcript for any mention of "Properties.jsx" replacing or output.

matches = list(re.finditer(r'Properties\.jsx', text))
print(f"Found {len(matches)} mentions of Properties.jsx in transcript.")

# Let's search for "export default function Properties"
matches2 = list(re.finditer(r'export default function Properties\(\) \{([\s\S]{0,1000})', text))
if matches2:
    print("Found Properties function:")
    print(matches2[-1].group(1))
else:
    print("Properties function not found.")

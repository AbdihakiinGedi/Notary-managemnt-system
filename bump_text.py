import os
import re

directories = [
    r'c:\Users\Administrator\Desktop\SND\frontend\src\pages',
    r'c:\Users\Administrator\Desktop\SND\frontend\src\components'
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to replace text-xs with text-sm, and text-sm with text-base
    # To avoid double replacement, we can use a callback in re.sub
    
    def replacer(match):
        val = match.group(0)
        if val == 'text-xs':
            return 'text-sm'
        elif val == 'text-sm':
            return 'text-base'
        return val

    new_content = re.sub(r'\b(text-xs|text-sm)\b', replacer, content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for directory in directories:
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                process_file(os.path.join(root, file))

print("Text sizes bumped.")

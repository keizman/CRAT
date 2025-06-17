#!/usr/bin/env python3
"""
Fix Claude session file by removing messages that cause tool_use/tool_result errors
"""
import json
import sys
import os
from datetime import datetime

def fix_session_file(filename, backup=True):
    """Fix a session file by ensuring all tool_use have matching tool_result"""
    
    # Create backup if requested
    if backup:
        backup_file = f"{filename}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.rename(filename, backup_file)
        print(f"Created backup: {backup_file}")
        
        # Read from backup
        with open(backup_file, 'r') as f:
            lines = f.readlines()
    else:
        with open(filename, 'r') as f:
            lines = f.readlines()
    
    # Parse all lines
    messages = []
    for i, line in enumerate(lines):
        try:
            data = json.loads(line.strip())
            messages.append((i, data, line))
        except:
            print(f"Warning: Could not parse line {i+1}")
    
    # Find problematic tool_use messages
    fixed_messages = []
    skip_next = False
    
    for i in range(len(messages)):
        if skip_next:
            skip_next = False
            continue
            
        line_num, data, raw_line = messages[i]
        
        # Check if this is an assistant message with tool_use
        if (data.get('type') == 'assistant' and 
            'message' in data and 
            'content' in data['message'] and
            isinstance(data['message']['content'], list)):
            
            has_tool_use = False
            for item in data['message']['content']:
                if isinstance(item, dict) and item.get('type') == 'tool_use':
                    has_tool_use = True
                    tool_id = item.get('id')
                    break
            
            if has_tool_use:
                # Check if next message has matching tool_result
                has_matching_result = False
                if i + 1 < len(messages):
                    next_data = messages[i + 1][1]
                    if (next_data.get('type') == 'user' and
                        'message' in next_data and
                        'content' in next_data['message'] and
                        isinstance(next_data['message']['content'], list)):
                        
                        for item in next_data['message']['content']:
                            if (isinstance(item, dict) and 
                                item.get('type') == 'tool_result' and
                                item.get('tool_use_id') == tool_id):
                                has_matching_result = True
                                break
                
                if not has_matching_result:
                    print(f"Removing unmatched tool_use at line {line_num + 1}, tool_id: {tool_id}")
                    # Skip this message and potentially the next one if it's an error
                    if (i + 1 < len(messages) and 
                        messages[i + 1][1].get('isApiErrorMessage')):
                        skip_next = True
                    continue
        
        # Check for API error messages about tool_use/tool_result
        if data.get('isApiErrorMessage'):
            content = str(data.get('message', {}).get('content', ''))
            if 'tool_use' in content and 'tool_result' in content:
                print(f"Removing API error message at line {line_num + 1}")
                continue
        
        fixed_messages.append(raw_line)
    
    # Write fixed file
    with open(filename, 'w') as f:
        f.writelines(fixed_messages)
    
    print(f"Fixed {filename} - removed {len(lines) - len(fixed_messages)} lines")
    print(f"Original lines: {len(lines)}, Fixed lines: {len(fixed_messages)}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        filename = sys.argv[1]
    else:
        # Default to a common location - adjust as needed
        print("Usage: python3 fix_claude_session.py <path_to_session_file>")
        sys.exit(1)
    
    fix_session_file(filename)

'''

https://github.com/anthropics/claude-code/issues/473
Find your problematic session file:

grep -l "tool_use.*ids were found without.*tool_result" ~/.claude/projects/*/*.jsonl

python3 ~/fix_claude_session.py /path/to/your/problematic/session.jsonl

Continue your conversation:
claude -c


# List recent conversations
claude -r
'''
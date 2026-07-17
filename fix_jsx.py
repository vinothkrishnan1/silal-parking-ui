import re
import os

filepath = 'src/pages/VisitorSubscriptions.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove house_number and block from columns array
content = re.sub(r'visitor\.house_number,\s*visitor\.block,', '', content)

# Remove house_number and block from filter
content = re.sub(r'\|\|\s*\(visitor\.house_number.*?\)\.includes\(visitorSearch\.toLowerCase\(\)\)\s*\|\|\s*\(visitor\.block.*?\)\.includes\(visitorSearch\.toLowerCase\(\)\)', '', content)

# Remove house_number and block from card UI (main grid)
content = re.sub(r'<div className="text-xs font-bold text-gray-400 mt-1">.*?</div>', '', content, flags=re.DOTALL)

# Remove visitor_type from card UI
content = re.sub(r'<div className="text-\[10px\] font-black text-gray-400 mt-1 uppercase tracking-wider">.*?</div>', '', content, flags=re.DOTALL)

# Remove house_number and block from selected visitor UI
content = re.sub(r'<p className="text-xs text-gray-500 font-semibold mt-1">.*?</p>', '', content, flags=re.DOTALL)
content = re.sub(r'<div className="text-\[11px\] font-semibold text-gray-400 mt-0\.5">.*?</div>', '', content, flags=re.DOTALL)

# Remove from form data initialization
content = re.sub(r'house_number: visitor\.house_number \|\| \'\',\s*block: visitor\.block \|\| \'\',\s*', '', content)
content = re.sub(r'visitor_type: visitor\.visitor_type \|\| \'Visitor\'\s*', '', content)

# Remove from dropdown UI
content = re.sub(r'<div className="text-\[11px\] font-semibold text-gray-400 mt-1">.*?</div>', '', content, flags=re.DOTALL)
content = re.sub(r'<div className="text-\[10px\] px-2\.5 py-1 bg-gray-100 rounded-lg text-gray-400 font-bold uppercase">.*?</div>', '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

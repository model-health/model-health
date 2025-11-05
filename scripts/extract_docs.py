#!/usr/bin/env python3
"""
Extract documentation from Swift source files and generate markdown reference.
"""

import re
import sys
from pathlib import Path
from typing import List, Optional

class SwiftDocExtractor:
    def __init__(self, source_dir: str):
        self.source_dir = Path(source_dir)
        self.output = []
        
    def extract_doc_comment(self, lines: List[str], start_idx: int) -> Optional[str]:
        """Extract documentation comment block above a declaration."""
        doc_lines = []
        i = start_idx - 1
        
        # Look backwards for doc comments
        while i >= 0:
            line = lines[i].strip()
            if line.startswith('///'):
                doc_lines.insert(0, line[3:].strip())
            elif line.startswith('/**'):
                # Multi-line doc comment start
                break
            elif line == '' or line.startswith('//'):
                # Empty line or regular comment, continue
                pass
            else:
                # Hit non-comment line
                break
            i -= 1
        
        return '\n'.join(doc_lines) if doc_lines else None
    
    def parse_function_signature(self, line: str) -> Optional[dict]:
        """Parse a Swift function declaration."""
        # Match: public func name(...) async throws -> ReturnType
        match = re.search(r'public\s+func\s+(\w+)\((.*?)\)\s*(async)?\s*(throws)?\s*(?:->(.+?))?(?:\{|$)', line)
        if match:
            name = match.group(1)
            params = match.group(2)
            is_async = match.group(3) is not None
            throws = match.group(4) is not None
            return_type = match.group(5).strip() if match.group(5) else None
            
            return {
                'type': 'function',
                'name': name,
                'params': params,
                'async': is_async,
                'throws': throws,
                'return': return_type
            }
        return None
    
    def parse_struct_or_class(self, line: str) -> Optional[dict]:
        """Parse a Swift struct/class/enum declaration."""
        match = re.search(r'public\s+(final\s+)?(class|struct|enum)\s+(\w+)', line)
        if match:
            return {
                'type': match.group(2),
                'name': match.group(3)
            }
        return None
    
    def process_file(self, filepath: Path):
        """Process a single Swift file and extract documentation."""
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # Check for struct/class/enum
            if 'public' in stripped and any(kw in stripped for kw in ['class', 'struct', 'enum']):
                decl = self.parse_struct_or_class(stripped)
                if decl:
                    doc = self.extract_doc_comment(lines, i)
                    if doc:
                        self.output.append(f"\n## {decl['name']}\n")
                        self.output.append(f"*{decl['type'].title()}*\n\n")
                        self.output.append(f"{doc}\n")
            
            # Check for function
            elif 'public func' in stripped:
                func = self.parse_function_signature(stripped)
                if func:
                    doc = self.extract_doc_comment(lines, i)
                    if doc:
                        signature = f"`{func['name']}({func['params']})`"
                        if func['async']:
                            signature += " `async`"
                        if func['throws']:
                            signature += " `throws`"
                        if func['return']:
                            signature += f" → `{func['return']}`"
                        
                        self.output.append(f"\n### {func['name']}\n\n")
                        self.output.append(f"{signature}\n\n")
                        self.output.append(f"{doc}\n")
    
    def generate_markdown(self, output_file: str):
        """Generate the final markdown documentation."""
        header = """# ModelHealth SDK Reference

Complete API reference for the ModelHealth iOS SDK.

---

"""
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(header)
            f.write(''.join(self.output))
        
        print(f"Generated documentation: {output_file}")

def main():
    if len(sys.argv) < 3:
        print("Usage: extract_docs.py <source_dir> <output_file>")
        sys.exit(1)
    
    source_dir = sys.argv[1]
    output_file = sys.argv[2]
    
    extractor = SwiftDocExtractor(source_dir)
    
    # Process all Swift files
    for swift_file in Path(source_dir).glob('**/*.swift'):
        print(f"Processing {swift_file}...")
        extractor.process_file(swift_file)
    
    extractor.generate_markdown(output_file)

if __name__ == '__main__':
    main()

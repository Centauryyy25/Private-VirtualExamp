import re
import json
import pdfplumber
import sys
import os
from typing import List, Dict, Any

class PDFExamParser:
    def __init__(self):
        # Patterns to detect questions and options
        # Support: "Q1", "Question 1", "QUESTION 1" (no trailing char required) OR "1." (needs dot/paren)
        self.question_pattern = re.compile(r'^\s*(?:Q(?:uestion)?\.?|Question|QUESTION)\s*\d+|^\s*\d+[\.:\)]', re.IGNORECASE)
        self.option_pattern = re.compile(r'^\s*(?:[A-F][\.:\)]|\([A-F]\))\s+', re.IGNORECASE)
        self.answer_key_pattern = re.compile(r'(?:Correct Answer:|Answer:|Ans:)\s*([A-F,]+)', re.IGNORECASE)

    def extract_text_from_pdf(self, pdf_path: str) -> List[str]:
        """Extract text from PDF preserving layout as much as possible."""
        full_text = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    # Fix for inline options (e.g. "Question? A. Opt1 B. Opt2")
                    # Force newline before " A. ", " B. ", etc.
                    text = re.sub(r'\s([A-E]\.)\s', r'\n\1 ', text)
                    if not text.endswith('\n'):
                        text += '\n'
                    full_text.extend(text.split('\n'))
        return full_text

    def parse_lines(self, lines: List[str], filename: str = "Imported PDF Exam") -> Dict[str, Any]:
        """Parse text lines into structured exam data."""
        exam_data = {
            "metadata": {
                "title": os.path.splitext(os.path.basename(filename))[0].replace('_', ' '),
                "description": f"Imported from {filename}",
                "pass_percentage": 70,
                "time_limit_minutes": 90
            },
            "questions": []
        }

        current_question = None
        current_text = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Check for Answer Key marker immediately after a question
            ans_match = self.answer_key_pattern.search(line)
            if ans_match and current_question:
                answers = [a.strip() for a in ans_match.group(1).split(',')]
                current_question['correct_answers'] = [a.lower() for a in answers]
                # If the line only contained the answer, skip adding it to text
                if len(line) < 20: 
                    continue

            # New Question Detection
            if self.question_pattern.match(line):
                print(f"DEBUG: Found Question: {line[:50]}...") # Verbose debug
                # Save previous question
                if current_question:
                    self._finalize_question(current_question, current_text)
                    exam_data['questions'].append(current_question)

                # Start new question
                current_question = {
                    "id": str(len(exam_data['questions']) + 1),
                    "type": "multiple_choice",
                    "text": "",
                    "options": [],
                    "correct_answers": [] # Default empty
                }
                current_text = [line] # Start text buffer
            
            # Option Detection
            elif self.option_pattern.match(line) and current_question:
                # If we were building question text, save it now
                if current_question['text'] == "":
                    current_question['text'] = "\n".join(current_text)
                    current_text = [] # Clear buffer for processing next parts
                
                # Add option
                # Extract clean option ID (A, B, C...)
                opt_match = self.option_pattern.match(line)
                opt_id = line[0].lower() # 'A' -> 'a'
                if '(' in opt_match.group(0):
                    opt_id = opt_match.group(0).replace('(', '').replace(')', '').strip().lower()
                
                opt_text = line[opt_match.end():].strip()
                current_question['options'].append({
                    "id": opt_id,
                    "text": opt_text
                })
            
            # Continuation of text (either question or option)
            else:
                if current_question:
                    if current_question['options']:
                        # Append to last option
                        current_question['options'][-1]['text'] += " " + line
                    else:
                        # Append to question text buffer or text
                        if current_question['text'] == "":
                            current_text.append(line)
                        else:
                            current_question['text'] += " " + line

        # Save the very last question
        if current_question:
            self._finalize_question(current_question, current_text)
            exam_data['questions'].append(current_question)

        # Post-process to clean up options and text
        cleanup_pattern = re.compile(r'(?:Section: \(none\)|Explanation|Explanation/Reference:|QUESTION \d+).*$', re.IGNORECASE | re.DOTALL)
        
        for q in exam_data['questions']:
            # Strip "QUESTION X" from the beginning of text
            q['text'] = re.sub(r'^\s*QUESTION\s*\d+\s*', '', q['text'], flags=re.IGNORECASE).strip()
            
            if q['options']:
                last_opt = q['options'][-1]
                last_opt['text'] = cleanup_pattern.sub('', last_opt['text']).strip()
            else:
                # If no options (e.g. Drag Drop), clean the question text itself
                q['text'] = cleanup_pattern.sub('', q['text']).strip()
                # Mark as theory/refer-to-exhibit if no options found
                if not q['type']:
                     q['type'] = "theory"

        return exam_data

    def _finalize_question(self, question, text_buffer):
        """Helper to ensure text is saved if not already."""
        if question['text'] == "" and text_buffer:
            question['text'] = "\n".join(text_buffer)
        
        # Heuristic: If no correct answer found, assume 'a' (user must review)
        if not question['correct_answers'] and question['options']:
            # Try to find "Answer: B" at end of question text
            last_part = question['text'].split('\n')[-1]
            ans_match = self.answer_key_pattern.search(last_part)
            if ans_match:
                question['correct_answers'] = [ans_match.group(1).lower()]
                # Remove the answer line from text
                question['text'] = question['text'].replace(ans_match.group(0), "").strip()

    def parse_pdf(self, pdf_path: str, output_path: str = None):
        if not os.path.exists(pdf_path):
            print(f"Error: File not found {pdf_path}")
            return None

        print(f"[*] Parsing PDF: {pdf_path}")
        lines = self.extract_text_from_pdf(pdf_path)
        print(f"[*] Extracted {len(lines)} lines of text")
        
        # Debug: Dump raw text to file
        with open("raw_text_dump.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print("[*] Debug: Raw text dumped to 'raw_text_dump.txt'")

        exam_data = self.parse_lines(lines, pdf_path)
        
        # QUALITY CONTROL FILTER
        # 1. Filter only questions with at least 2 options (removes broken/drag-drop questions)
        valid_questions = [q for q in exam_data['questions'] if len(q['options']) >= 2]
        print(f"[*] Found {len(valid_questions)} valid MCQ questions (out of {len(exam_data['questions'])})")

        # 2. Shuffle and Limit to 100
        import random
        random.shuffle(valid_questions)
        exam_data['questions'] = valid_questions[:100]
        
        print(f"[*] Final Selection: {len(exam_data['questions'])} random questions")

        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(exam_data, f, indent=2)
            print(f"[*] Saved to {output_path}")
        
        return exam_data

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_exam_parser.py <input.pdf> [output.json]")
    else:
        parser = PDFExamParser()
        output = sys.argv[2] if len(sys.argv) > 2 else "parsed_exam.json"
        parser.parse_pdf(sys.argv[1], output)

import re
import fitz  # PyMuPDF
import logging
from typing import List, Dict, Any, BinaryIO

logger = logging.getLogger(__name__)

# Configure logging to suppress verbose PDF miner logs if any remain
logging.getLogger("fitz").setLevel(logging.WARNING)

class PDFExamParser:
    def __init__(self):
        # Patterns to detect questions and options
        self.question_pattern = re.compile(r'^\s*(?:Q(?:uestion)?\.?|Question|QUESTION)\s*\d+|^\s*\d+[\.:\)]', re.IGNORECASE)
        self.option_pattern = re.compile(r'^\s*(?:[A-F][\.:\)]|\([A-F]\))\s+', re.IGNORECASE)
        self.answer_key_pattern = re.compile(r'(?:Correct Answers?|Answers?|Ans)[:\s]\s*(?:Option\s*)?([A-F](?:[\s,]+[A-F])*)\b', re.IGNORECASE)

        # STRICT FILTER PATTERNS
        # We pre-compile these to aggressively drop content blocks
        self.exhibit_pattern = re.compile(r'refer\s+to\s+.*exhibit|see\s+exhibit|exhibit\s+.*show|examine\s+the\s+exhibit', re.IGNORECASE)
        self.drag_drop_pattern = re.compile(r'drag\s+and\s+drop|drag\s+the\s+.*into|match\s+the\s+following|place\s+the\s+options', re.IGNORECASE)

    def extract_text_from_pdf(self, file_obj: BinaryIO) -> List[str]:
        """Extract text using PyMuPDF (fitz) which is much faster than pdfplumber."""
        full_lines = []
        try:
            # Read file stream into memory
            file_bytes = file_obj.read()
            # Open with PyMuPDF
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            
            for page_num, page in enumerate(doc):
                # Use get_text("blocks") for better structure retention and speed
                # Format: (x0, y0, x1, y1, "text", block_no, block_type)
                # block_type 0 is text, 1 is image. We only want text.
                blocks = page.get_text("blocks")
                
                for block in blocks:
                    # Skip image blocks (type 1)
                    if block[6] != 0:
                        continue
                        
                    text_content = block[4]
                    
                    # PRE-FILTERING (Strict Elimination at Source)
                    # If a block contains "Refer to Exhibit" or "Drag Drop", we might be in a bad question.
                    # However, questions can span multiple blocks. 
                    # We'll rely on the line-by-line parser to assemble and filter found questions,
                    # BUT doing a quick check here could save processing if the block is isolated.
                    # For now, we collect lines to ensure we capture multi-block questions correctly.
                    
                    # Fix inline options often found in blocks (e.g., "A. Option B. Option")
                    # Force newline before " A. ", " B. " (space required to avoid matching mid-word)
                    text_content = re.sub(r'\s([A-E]\.)\s', r'\n\1 ', text_content)
                    
                    lines = text_content.split('\n')
                    for line in lines:
                        cleaned_line = line.strip()
                        if cleaned_line:
                            full_lines.append(cleaned_line)
                            
            doc.close()
        except Exception as e:
            logger.error(f"Error extracting text with PyMuPDF: {e}")
            raise
            
        return full_lines

    def parse_lines(self, lines: List[str], filename: str = "Imported PDF Exam") -> Dict[str, Any]:
        """Parse text lines into structured exam data."""
        exam_data = {
            "metadata": {
                "title": filename.replace('.pdf', '').replace('_', ' '),
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

            # Check for Answer Key
            ans_match = self.answer_key_pattern.search(line)
            if ans_match and current_question:
                raw_ans = ans_match.group(1)
                answers = [a.strip() for a in re.split(r'[\s,]+', raw_ans) if a.strip()]
                current_question['correct_answers'] = [a.lower() for a in answers]
                if len(line) < 30: 
                    continue

            # New Question Detection
            if self.question_pattern.match(line):
                # Finalize previous question
                if current_question:
                    self._finalize_and_add_question(exam_data['questions'], current_question, current_text)

                # Start new question
                current_question = {
                    "id": str(len(exam_data['questions']) + 1),
                    "type": "multiple_choice",
                    "text": "",
                    "options": [],
                    "correct_answers": []
                }
                current_text = [line]
            
            # Option Detection
            elif self.option_pattern.match(line) and current_question:
                if current_question['text'] == "":
                    current_question['text'] = "\n".join(current_text)
                    current_text = []
                
                opt_match = self.option_pattern.match(line)
                opt_id = line[0].lower()
                if '(' in opt_match.group(0):
                    opt_id = opt_match.group(0).replace('(', '').replace(')', '').strip().lower()
                
                opt_text = line[opt_match.end():].strip()
                current_question['options'].append({
                    "id": opt_id,
                    "text": opt_text
                })
            
            # Continuation
            else:
                if current_question:
                    if current_question['options']:
                        current_question['options'][-1]['text'] += " " + line
                    else:
                        if current_question['text'] == "":
                            current_text.append(line)
                        else:
                            current_question['text'] += " " + line

        # Save the last question
        if current_question:
            self._finalize_and_add_question(exam_data['questions'], current_question, current_text)

        # Apply final strict filtering on the processed list
        # This is safer than block-level filtering because text might be split across lines
        
        filtered_questions = []
        for q in exam_data['questions']:
            # 1. Clean Text
            q['text'] = re.sub(r'^\s*QUESTION\s*\d+\s*', '', q['text'], flags=re.IGNORECASE).strip()
            cleanup_pattern = re.compile(r'(?:Section: \(none\)|Explanation|Explanation/Reference:|QUESTION \d+).*$', re.IGNORECASE | re.DOTALL)
            
            if q['options']:
                q['options'][-1]['text'] = cleanup_pattern.sub('', q['options'][-1]['text']).strip()
            else:
                q['text'] = cleanup_pattern.sub('', q['text']).strip()

            # 2. "Choose X" logic (Keep this feature!)
            choose_match = re.search(r'\(Choose\s+(two|three|four|five|six)\)', q['text'], re.IGNORECASE)
            if choose_match:
                num_map = {'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6}
                q['choose_count'] = num_map.get(choose_match.group(1).lower(), 1)

            # 3. STRICT FILTERING CHECKS
            # Reject if Exhibit
            if self.exhibit_pattern.search(q['text']):
                continue
            
            # Reject if Drag and Drop
            if self.drag_drop_pattern.search(q['text']):
                continue
                
            # Reject if not enough options (unless it's a valid theory question without options, but user wanted strict)
            if len(q['options']) < 2:
                continue

            filtered_questions.append(q)

        exam_data['questions'] = filtered_questions
        return exam_data

    def _finalize_and_add_question(self, question_list, question, text_buffer):
        if question['text'] == "" and text_buffer:
            question['text'] = "\n".join(text_buffer)
        
        # Parse trailing answer key
        if not question['correct_answers'] and question['options']:
            last_part = question['text'].split('\n')[-1]
            ans_match = self.answer_key_pattern.search(last_part)
            if ans_match:
                question['correct_answers'] = [ans_match.group(1).lower()]
                question['text'] = question['text'].replace(ans_match.group(0), "").strip()
        
        question_list.append(question)

    def parse(self, file_obj: BinaryIO, filename: str) -> Dict[str, Any]:
        """Main entry point."""
        logger.info(f"Parsing PDF with PyMuPDF: {filename}")
        lines = self.extract_text_from_pdf(file_obj)
        logger.info(f"Extracted {len(lines)} lines")
        
        exam_data = self.parse_lines(lines, filename)
        
        # Limit to 100 for performance if needed, but PyMuPDF is fast enough to handle more.
        if len(exam_data['questions']) > 100:
            exam_data['questions'] = exam_data['questions'][:100]

        logger.info(f"Final valid questions: {len(exam_data['questions'])}")
        return exam_data

# Singleton
pdf_parser = PDFExamParser()

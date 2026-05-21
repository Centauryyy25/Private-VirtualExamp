"""
ISC2 CC (Certified in Cybersecurity) PDF dump parser.

The CC dump format has a unique structure:
- Answer keys appear in separate blocks: "Question: N" / "Answer: X"
- Questions start directly with text (no "Q1." prefix)
- Options are "A." through "F."
- Explanations follow "Explanation/Reference:" markers
- Noise: author names, github links, bare page numbers
"""
import re
import fitz  # PyMuPDF
import logging
from typing import List, Dict, Any, BinaryIO, Optional

logger = logging.getLogger(__name__)


class CCPDFExamParser:
    def __init__(self):
        self.option_pattern = re.compile(r'^([A-F])\.\s+(.+)', re.IGNORECASE)
        self.answer_key_answer = re.compile(r'^Answer:\s*([A-F])\s*$', re.IGNORECASE)
        self.answer_key_question = re.compile(r'^Question:\s*(\d+)\s*$', re.IGNORECASE)
        self.explanation_marker = re.compile(r'^Explanation/Reference:', re.IGNORECASE)
        self.noise_pattern = re.compile(
            r'^AYEMUN HOSSAIN|^github\.com|^\d+\s*$|^Page\s+\d+'
            r'|^QUESTION\s*&\s*ANSWERS|^Collected\s+By:'
            r'|^ISC2$|^Certi.?ed in Cybersecurity',
            re.IGNORECASE,
        )
        self.inline_answer = re.compile(r'^Answer:\s*([A-F])', re.IGNORECASE)

    def extract_text(self, file_obj: BinaryIO) -> List[str]:
        """Extract text lines from PDF using PyMuPDF."""
        file_bytes = file_obj.read()
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        lines: List[str] = []

        for page in doc:
            blocks = page.get_text("blocks")
            for block in blocks:
                if block[6] != 0:
                    continue
                text = block[4]
                text = re.sub(r'\s([A-E]\.)\s', r'\n\1 ', text)
                for line in text.split('\n'):
                    cleaned = line.strip()
                    if cleaned:
                        lines.append(cleaned)

        doc.close()
        return lines

    def _is_noise(self, line: str) -> bool:
        return bool(self.noise_pattern.match(line))

    def _is_answer_key_line(self, line: str) -> bool:
        return bool(self.answer_key_question.match(line) or self.answer_key_answer.match(line))

    def _extract_answer_keys(self, lines: List[str]) -> Dict[int, str]:
        """
        Pass 1: Extract answer-key pairs {question_number: answer_letter}.

        The PDF renders answer keys in sidebar/header blocks that get interleaved
        with content during text extraction. We collect contiguous blocks of Q/A
        tokens and process each block with these rules:
        - Q:N followed by A:X → answer_map[N] = X
        - Leading A:X before first Q:N in a block → answer for Q(N-1)
        - Standalone A:X block → answer for last unanswered question
        """
        # Build token stream with contiguous blocks
        blocks: List[List[tuple]] = []
        current_block: List[tuple] = []

        for line in lines:
            if self._is_noise(line):
                continue
            q_match = self.answer_key_question.match(line)
            a_match = self.answer_key_answer.match(line)
            if q_match:
                current_block.append(('Q', int(q_match.group(1))))
            elif a_match:
                current_block.append(('A', a_match.group(1).lower()))
            else:
                if current_block:
                    blocks.append(current_block)
                    current_block = []
        if current_block:
            blocks.append(current_block)

        answer_map: Dict[int, str] = {}
        last_declared_q: Optional[int] = None
        max_q_seen = 0  # Track highest Q for detecting out-of-order artifacts

        for block in blocks:
            # Pre-filter: remove out-of-order Q markers (PDF rendering artifacts)
            filtered_block: List[tuple] = []
            for tok in block:
                if tok[0] == 'Q' and tok[1] <= max_q_seen and tok[1] in answer_map:
                    continue  # Skip duplicate/out-of-order Q that's already answered
                filtered_block.append(tok)
                if tok[0] == 'Q':
                    max_q_seen = max(max_q_seen, tok[1])

            i = 0
            while i < len(filtered_block):
                tok_type, tok_val = filtered_block[i]

                if tok_type == 'Q':
                    if i + 1 < len(filtered_block) and filtered_block[i + 1][0] == 'A':
                        answer_map[tok_val] = filtered_block[i + 1][1]
                        last_declared_q = None
                        i += 2
                    else:
                        last_declared_q = tok_val
                        i += 1

                elif tok_type == 'A':
                    if last_declared_q is not None and last_declared_q not in answer_map:
                        answer_map[last_declared_q] = tok_val
                        last_declared_q = None
                    elif i + 1 < len(filtered_block) and filtered_block[i + 1][0] == 'Q':
                        next_q = filtered_block[i + 1][1]
                        implied_q = next_q - 1
                        if implied_q > 0 and implied_q not in answer_map:
                            answer_map[implied_q] = tok_val
                    i += 1
                else:
                    i += 1

        return answer_map

    def _clean_lines(self, lines: List[str]) -> List[str]:
        """Remove noise and answer-key lines, keeping content lines only."""
        cleaned: List[str] = []
        for line in lines:
            if self._is_noise(line):
                continue
            if self._is_answer_key_line(line):
                continue
            cleaned.append(line)
        return cleaned

    def _split_explanation_and_question_text(self, explanation_lines: List[str]) -> tuple[List[str], List[str]]:
        """
        When explanation accumulates both real explanation AND the next question text,
        split them. The question text is the trailing lines that form the new question,
        typically starting after the explanation's last sentence.
        """
        if not explanation_lines:
            return [], []

        # Find the split point: walk backwards from the end to find where
        # the "question text" begins. Question text often ends with ? or :
        # Look for the last line ending with ? or : as the end of question text
        split_idx = len(explanation_lines)

        for i in range(len(explanation_lines) - 1, -1, -1):
            line = explanation_lines[i].rstrip()
            if line.endswith('?') or line.endswith(':'):
                # This line is likely the end of question text
                # Walk further back to find the start of this question text block
                start = i
                for j in range(i - 1, -1, -1):
                    prev = explanation_lines[j].rstrip()
                    # If prev line ends with . or ) it's still explanation
                    if prev.endswith('.') or prev.endswith(')'):
                        break
                    start = j
                split_idx = start
                break

        # If no ? or : found, check if the last line looks like a question start
        # (starts with "Which", "What", "How", etc.)
        if split_idx == len(explanation_lines):
            question_starters = re.compile(
                r'^(Which|What|How|When|Where|Why|Who|The|An?|Is|Are|In|A |Select|Choose|Identify|Name)',
                re.IGNORECASE
            )
            for i in range(len(explanation_lines) - 1, -1, -1):
                if i > 0:
                    prev = explanation_lines[i - 1].rstrip()
                    if (prev.endswith('.') or prev.endswith(')')) and question_starters.match(explanation_lines[i]):
                        split_idx = i
                        break

        real_explanation = explanation_lines[:split_idx]
        question_text = explanation_lines[split_idx:]
        return real_explanation, question_text

    def _parse_questions(self, cleaned_lines: List[str]) -> List[Dict[str, Any]]:
        """
        Parse question bodies from cleaned lines.
        Uses option A. as the primary question boundary marker.
        """
        questions: List[Dict[str, Any]] = []
        current_question_text: List[str] = []
        current_options: List[Dict[str, str]] = []
        current_explanation: List[str] = []
        in_explanation = False
        inline_answer: Optional[str] = None

        def _flush_question(next_question_text: Optional[List[str]] = None):
            nonlocal current_question_text, current_options, current_explanation
            nonlocal in_explanation, inline_answer

            if current_options:
                q_text = " ".join(current_question_text).strip()
                # Clean leading artifacts
                q_text = re.sub(r'^(ISC2|Certiﬁed in Cybersecurity \(CC\))\s*', '', q_text).strip()

                if q_text:
                    question = {
                        "id": str(len(questions) + 1),
                        "type": "multiple_choice",
                        "text": q_text,
                        "options": current_options,
                        "correct_answers": [inline_answer] if inline_answer else [],
                        "explanation": " ".join(current_explanation).strip() or None,
                    }
                    questions.append(question)

            current_question_text = next_question_text or []
            current_options = []
            current_explanation = []
            in_explanation = False
            inline_answer = None

        for line in cleaned_lines:
            # Check for explanation marker
            if self.explanation_marker.match(line):
                in_explanation = True
                after = line.split(":", 1)
                if len(after) > 1 and after[1].strip():
                    current_explanation.append(after[1].strip())
                continue

            # Check for inline answer
            inline_match = self.inline_answer.match(line)
            if inline_match and current_options:
                inline_answer = inline_match.group(1).lower()
                if len(line) < 30:
                    continue

            # Check for option line
            opt_match = self.option_pattern.match(line)
            if opt_match:
                opt_id = opt_match.group(1).lower()
                opt_text = opt_match.group(2).strip()

                if opt_id == 'a':
                    if current_options:
                        # New question! Split explanation to extract question text
                        if in_explanation and current_explanation:
                            real_expl, q_text_lines = self._split_explanation_and_question_text(current_explanation)
                            current_explanation = real_expl
                            _flush_question(next_question_text=q_text_lines)
                        else:
                            _flush_question()
                    elif in_explanation:
                        # First question after some explanation (e.g., title page junk)
                        real_expl, q_text_lines = self._split_explanation_and_question_text(current_explanation)
                        current_explanation = []
                        current_question_text = q_text_lines
                        in_explanation = False

                # Skip duplicate option IDs (explanation text sometimes starts with "B." etc.)
                existing_ids = {o["id"] for o in current_options}
                if opt_id not in existing_ids:
                    current_options.append({"id": opt_id, "text": opt_text})
                in_explanation = False
                continue

            # Regular text line
            if in_explanation:
                current_explanation.append(line)
            elif current_options:
                # Continuation of last option text
                current_options[-1]["text"] += " " + line
            else:
                current_question_text.append(line)

        # Flush last question
        _flush_question()

        return questions

    def _merge_answers(
        self,
        questions: List[Dict[str, Any]],
        answer_map: Dict[int, str],
    ) -> List[Dict[str, Any]]:
        """Merge answer keys into parsed questions."""
        for i, q in enumerate(questions):
            q_num = i + 1
            if not q["correct_answers"] and q_num in answer_map:
                q["correct_answers"] = [answer_map[q_num]]
        return questions

    def parse(self, file_obj: BinaryIO, filename: str) -> Dict[str, Any]:
        """Main entry point - parse CC PDF into ExamData dict."""
        logger.info(f"Parsing CC PDF: {filename}")

        lines = self.extract_text(file_obj)
        logger.info(f"Extracted {len(lines)} lines from CC PDF")

        # Pass 1: Extract answer keys
        answer_map = self._extract_answer_keys(lines)
        logger.info(f"Found {len(answer_map)} answer keys")

        # Clean lines
        cleaned = self._clean_lines(lines)
        logger.info(f"Cleaned to {len(cleaned)} content lines")

        # Pass 2: Parse question bodies
        questions = self._parse_questions(cleaned)
        logger.info(f"Parsed {len(questions)} raw questions")

        # Merge answers
        questions = self._merge_answers(questions, answer_map)

        # Filter: must have >= 2 options and correct_answers
        valid_questions = [
            q for q in questions
            if len(q["options"]) >= 2 and q["correct_answers"]
        ]
        logger.info(f"Valid questions after filtering: {len(valid_questions)}")

        if len(valid_questions) > 100:
            valid_questions = valid_questions[:100]

        title = filename.replace('.pdf', '').replace('_', ' ').strip()
        exam_data: Dict[str, Any] = {
            "version": "1.0",
            "metadata": {
                "title": title,
                "vendor": "ISC2",
                "exam_code": "CC",
                "description": f"ISC2 Certified in Cybersecurity (CC) - Imported from {filename}",
                "pass_percentage": 70,
                "time_limit_minutes": 120,
            },
            "domains": [],
            "questions": valid_questions,
        }

        return exam_data


# Singleton
cc_parser = CCPDFExamParser()

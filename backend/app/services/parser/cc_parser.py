"""
ISC2 CC (Certified in Cybersecurity) PDF dump parser.

The CC dump format has a unique structure:
- Answer keys appear at PAGE BOUNDARIES interleaved with question bodies
- Pattern per page: [Answer:X(for prev Q), Question:N, Answer:Y(for QN), Question:N+1]
- Questions start directly with text (no "Q1." prefix)
- Options are "A." through "F."
- Explanations follow "Explanation/Reference:" markers
- Noise: author names, github links, bare page numbers

Parsing strategy:
- Pass 1: Extract answer-key pairs from Q/A marker blocks at page boundaries.
  Cross-block state (last_declared_q) carries over because a Q marker at the
  end of one block gets its answer at the START of the next block.
- Clean: Remove noise + consumed answer-key lines.
- Pass 2: Parse question bodies. Any surviving inline "Answer: X" lines
  (rare in this format) are used as primary answer source.
- Merge: Fill in questions that lack inline answers from the answer key map.
"""
import re
import fitz  # PyMuPDF
import logging
from typing import List, Dict, Any, BinaryIO, Optional, Set, Tuple

logger = logging.getLogger(__name__)


class CCPDFExamParser:
    def __init__(self):
        self.option_pattern = re.compile(r'^([A-F])\.\s+(.+)', re.IGNORECASE)
        self.answer_key_answer = re.compile(
            r'^Answer:\s*([A-F](?:\s*,\s*[A-F])*)\s*$', re.IGNORECASE
        )
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

    def _extract_answer_keys(
        self, lines: List[str]
    ) -> Tuple[Dict[int, str], Set[int]]:
        """
        Pass 1: Extract answer-key pairs {question_number: answer_letter}.

        Returns:
        - answer_map: {question_number: answer_letter}
        - consumed_lines: set of line indices belonging to answer-key blocks

        The answer key is spread across page boundaries in this pattern:
          [Answer:X (for prev Q), Question:N, Answer:Y (for QN), Question:N+1]
        Cross-block state must carry over because Q at end of block gets its
        answer at the start of the NEXT block.
        """
        # Build token stream: contiguous blocks of Q/A lines
        blocks: List[List[tuple]] = []
        current_block: List[tuple] = []

        for line_idx, line in enumerate(lines):
            if self._is_noise(line):
                continue
            q_match = self.answer_key_question.match(line)
            a_match = self.answer_key_answer.match(line)
            if q_match:
                current_block.append(('Q', int(q_match.group(1)), line_idx))
            elif a_match:
                raw = a_match.group(1)
                answers = [a.strip().lower() for a in raw.split(',')]
                current_block.append(('A', answers, line_idx))
            else:
                if current_block:
                    blocks.append(current_block)
                    current_block = []
        if current_block:
            blocks.append(current_block)

        answer_map: Dict[int, str] = {}
        consumed_lines: Set[int] = set()
        max_q_seen = 0

        # Cross-block state: Q at end of one block → A at start of next block
        last_declared_q: Optional[int] = None

        for block in blocks:
            # Only process blocks that contain at least one Q token.
            # A block with ONLY A tokens and no Q tokens is likely an inline
            # answer within a question body — skip it so those lines survive.
            has_q = any(tok[0] == 'Q' for tok in block)
            if not has_q:
                # But if last_declared_q is set and block is a single A token,
                # this is the cross-page answer for that Q
                if last_declared_q is not None and len(block) == 1 and block[0][0] == 'A':
                    tok_val = block[0][1]
                    if last_declared_q not in answer_map:
                        answer_map[last_declared_q] = tok_val[0] if len(tok_val) == 1 else ','.join(tok_val)
                        consumed_lines.add(block[0][2])
                    last_declared_q = None
                continue

            # Pre-filter: remove out-of-order Q markers (PDF rendering artifacts)
            filtered_block: List[tuple] = []
            for tok in block:
                if tok[0] == 'Q' and tok[1] <= max_q_seen and tok[1] in answer_map:
                    # Still consume the line even if we skip the token
                    consumed_lines.add(tok[2])
                    continue
                filtered_block.append(tok)
                if tok[0] == 'Q':
                    max_q_seen = max(max_q_seen, tok[1])

            # Mark all lines in this answer-key block as consumed
            for tok in filtered_block:
                consumed_lines.add(tok[2])

            i = 0
            while i < len(filtered_block):
                tok_type = filtered_block[i][0]
                tok_val = filtered_block[i][1]

                if tok_type == 'Q':
                    # Q followed by A → direct pair
                    if i + 1 < len(filtered_block) and filtered_block[i + 1][0] == 'A':
                        next_val = filtered_block[i + 1][1]
                        answer_map[tok_val] = next_val[0] if len(next_val) == 1 else ','.join(next_val)
                        # Do NOT reset last_declared_q here — it belongs to a
                        # different Q whose answer may appear in a later block
                        i += 2
                    else:
                        # Q without immediate A → remember for cross-block pairing
                        last_declared_q = tok_val
                        i += 1

                elif tok_type == 'A':
                    # A preceded by Q from previous block or earlier in this block
                    if last_declared_q is not None and last_declared_q not in answer_map:
                        answer_map[last_declared_q] = tok_val[0] if len(tok_val) == 1 else ','.join(tok_val)
                        last_declared_q = None
                    elif i + 1 < len(filtered_block) and filtered_block[i + 1][0] == 'Q':
                        # Leading A before Q:N → answer for Q(N-1)
                        next_q = filtered_block[i + 1][1]
                        implied_q = next_q - 1
                        if implied_q > 0 and implied_q not in answer_map:
                            answer_map[implied_q] = tok_val[0] if len(tok_val) == 1 else ','.join(tok_val)
                    i += 1
                else:
                    i += 1

        logger.debug(
            f"Answer key: {len(answer_map)} entries from {len(consumed_lines)} lines, "
            f"keys={sorted(answer_map.keys())}"
        )
        return answer_map, consumed_lines

    def _clean_lines(self, lines: List[str], consumed_lines: Set[int]) -> List[Tuple[str, int]]:
        """
        Remove noise + answer-key-section lines (consumed_lines).
        Non-consumed "Answer: X" lines are preserved for inline detection.
        """
        cleaned: List[Tuple[str, int]] = []
        for line_idx, line in enumerate(lines):
            if self._is_noise(line):
                continue
            if line_idx in consumed_lines:
                continue
            cleaned.append((line, line_idx))
        return cleaned

    def _split_explanation_and_question_text(self, explanation_lines: List[str]) -> tuple[List[str], List[str]]:
        """
        When explanation accumulates both real explanation AND the next question text,
        split them.
        """
        if not explanation_lines:
            return [], []

        split_idx = len(explanation_lines)

        for i in range(len(explanation_lines) - 1, -1, -1):
            line = explanation_lines[i].rstrip()
            if line.endswith('?') or line.endswith(':'):
                start = i
                for j in range(i - 1, -1, -1):
                    prev = explanation_lines[j].rstrip()
                    if prev.endswith('.') or prev.endswith(')'):
                        break
                    start = j
                split_idx = start
                break

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

    def _parse_questions(self, cleaned_lines: List[Tuple[str, int]]) -> List[Dict[str, Any]]:
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

        for line, orig_idx in cleaned_lines:
            # Check for explanation marker
            if self.explanation_marker.match(line):
                in_explanation = True
                after = line.split(":", 1)
                if len(after) > 1 and after[1].strip():
                    current_explanation.append(after[1].strip())
                continue

            # Check for inline answer — only when NOT inside explanation
            inline_match = self.inline_answer.match(line)
            if inline_match and current_options and not in_explanation:
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
                        if in_explanation and current_explanation:
                            real_expl, q_text_lines = self._split_explanation_and_question_text(current_explanation)
                            current_explanation = real_expl
                            _flush_question(next_question_text=q_text_lines)
                        else:
                            _flush_question()
                    elif in_explanation:
                        real_expl, q_text_lines = self._split_explanation_and_question_text(current_explanation)
                        current_explanation = []
                        current_question_text = q_text_lines
                        in_explanation = False

                existing_ids = {o["id"] for o in current_options}
                if opt_id not in existing_ids:
                    current_options.append({"id": opt_id, "text": opt_text})
                in_explanation = False
                continue

            # Regular text line
            if in_explanation:
                current_explanation.append(line)
            elif current_options:
                current_options[-1]["text"] += " " + line
            else:
                current_question_text.append(line)

        _flush_question()
        return questions

    def _merge_answers(
        self,
        questions: List[Dict[str, Any]],
        answer_map: Dict[int, str],
    ) -> List[Dict[str, Any]]:
        """
        Merge answer-key answers into questions.

        Strategy: direct 1:1 mapping by question number. Question at index i
        corresponds to answer_map[i+1]. Inline answers (from Pass 2) take
        priority and are never overridden.
        """
        if not answer_map:
            return questions

        applied = 0
        missing = []
        for i, q in enumerate(questions):
            q_num = i + 1
            if q["correct_answers"]:
                continue  # Already has inline answer
            if q_num in answer_map:
                ak_answers = [a.strip() for a in answer_map[q_num].split(',')]
                q["correct_answers"] = ak_answers
                applied += 1
            else:
                missing.append(q_num)

        logger.info(f"Merge: applied {applied} answers from answer key")
        if missing:
            logger.warning(f"No answer key for questions: {missing[:20]}")

        return questions

    def parse(self, file_obj: BinaryIO, filename: str) -> Dict[str, Any]:
        """Main entry point - parse CC PDF into ExamData dict."""
        logger.info(f"Parsing CC PDF: {filename}")

        lines = self.extract_text(file_obj)
        logger.info(f"Extracted {len(lines)} lines from CC PDF")

        # Pass 1: Extract answer keys
        answer_map, consumed_lines = self._extract_answer_keys(lines)
        logger.info(f"Found {len(answer_map)} answer keys")

        # Clean: remove noise + answer-key lines only
        cleaned = self._clean_lines(lines, consumed_lines)
        logger.info(f"Cleaned to {len(cleaned)} content lines")

        # Pass 2: Parse question bodies
        questions = self._parse_questions(cleaned)
        logger.info(f"Parsed {len(questions)} raw questions")

        inline_count = sum(1 for q in questions if q["correct_answers"])
        if inline_count:
            logger.info(f"Questions with inline answers: {inline_count}")

        if len(questions) != len(answer_map):
            logger.warning(
                f"Count mismatch: {len(questions)} parsed vs "
                f"{len(answer_map)} answer keys"
            )

        # Merge answers
        questions = self._merge_answers(questions, answer_map)

        # Filter: must have >= 2 options and correct_answers
        valid_questions = [
            q for q in questions
            if len(q["options"]) >= 2 and q["correct_answers"]
        ]
        logger.info(f"Valid questions after filtering: {len(valid_questions)}")

        no_answer = [q for q in questions if len(q["options"]) >= 2 and not q["correct_answers"]]
        if no_answer:
            logger.warning(
                f"{len(no_answer)} questions without answers: "
                f"Q{[q['id'] for q in no_answer[:10]]}"
            )

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

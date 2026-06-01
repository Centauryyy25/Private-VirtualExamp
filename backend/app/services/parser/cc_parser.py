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
- Pass 2: Parse question bodies sequentially (no inline answer detection).
- Merge: Map parsed bodies to answer keys, auto-detecting bodyless Q numbers
  (keys with no corresponding body) using explanation-based scoring.
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
        self.inline_answer = re.compile(
            r'^Answer:\s*([A-F](?:\s*,\s*[A-F])*)', re.IGNORECASE
        )

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

    def _is_inline_answer(self, lines: List[str], line_idx: int) -> bool:
        """
        Check if an 'Answer: X' line at line_idx is an inline answer
        (appears directly after options in a question body) rather than
        an answer-key entry at a page boundary.

        Key rule: noise (author names, page numbers, github links) between
        an option and an Answer line indicates a page boundary → NOT inline.
        """
        for i in range(line_idx - 1, max(-1, line_idx - 3), -1):
            line = lines[i].strip()
            if not line:
                continue
            # Noise between option and Answer = page boundary
            if self._is_noise(line):
                return False
            # Immediately preceded by an option → inline answer
            if self.option_pattern.match(line):
                return True
            # Anything else (Q/A markers, body text)
            return False
        return False

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
        split them.  Works on joined text to handle PDF line-wrapping correctly.
        """
        if not explanation_lines:
            return [], []

        joined = " ".join(line.rstrip() for line in explanation_lines)

        # Question-starter words
        q_starters = (
            r'(?:Which|What|How|When|Where|Why|Who|The|An?|Is|Are|In|'
            r'Select|Choose|Identify|Name|If|During|After|Before|According|'
            r'On|As|\(★\))'
        )

        # Find sentence boundary followed by a question starter.
        # Sentence boundary: period, closing paren, closing bracket, or closing quote
        pattern = re.compile(
            r'(?<=[.)\]"])\s+(' + q_starters + r'\s)',
            re.IGNORECASE
        )

        # Take the LAST match that leaves >= 20 chars of explanation
        best_split = None
        for m in pattern.finditer(joined):
            pos = m.start() + 1  # position after punctuation
            if pos >= 20:
                best_split = pos

        if best_split is not None:
            expl_text = joined[:best_split].strip()
            q_text = joined[best_split:].strip()
            return (
                [expl_text] if expl_text else [],
                [q_text] if q_text else [],
            )

        # Fallback: no clear split found
        return explanation_lines, []

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

        def _flush_question(next_question_text: Optional[List[str]] = None):
            nonlocal current_question_text, current_options, current_explanation
            nonlocal in_explanation

            if current_options:
                q_text = " ".join(current_question_text).strip()
                q_text = re.sub(r'^(ISC2|Certiﬁed in Cybersecurity \(CC\))\s*', '', q_text).strip()

                if q_text:
                    # Phantom question detection: if text looks like explanation
                    # material (has study guide refs, no question indicators),
                    # merge it into the previous question's explanation
                    has_question_mark = '?' in q_text or q_text.rstrip().endswith(':')
                    has_explanation_marker = bool(re.search(
                        r'\(see ISC2|\(see NIST|Study Guide|'
                        r'^The other types of|^The primary goal of .* is to',
                        q_text[:200], re.IGNORECASE
                    ))
                    is_phantom = has_explanation_marker and not has_question_mark

                    if is_phantom and questions:
                        prev = questions[-1]
                        prev_expl = prev.get("explanation") or ""
                        prev["explanation"] = (prev_expl + " " + q_text).strip()
                    else:
                        question = {
                            "id": str(len(questions) + 1),
                            "type": "multiple_choice",
                            "text": q_text,
                            "options": current_options,
                            "correct_answers": [],
                            "explanation": " ".join(current_explanation).strip() or None,
                        }
                        questions.append(question)

            current_question_text = next_question_text or []
            current_options = []
            current_explanation = []
            in_explanation = False

        for line, orig_idx in cleaned_lines:
            # Check for explanation marker
            if self.explanation_marker.match(line):
                in_explanation = True
                after = line.split(":", 1)
                if len(after) > 1 and after[1].strip():
                    current_explanation.append(after[1].strip())
                continue

            # Check for option line
            opt_match = self.option_pattern.match(line)
            if opt_match:
                opt_id = opt_match.group(1).lower()
                opt_text = opt_match.group(2).strip()

                # Guard: if we're in an explanation and this option ID already
                # exists, it's explanation text that happens to start with
                # "B.", "C.", etc. — not a real option.  Example:
                # "The correct answer is\nB. Confidentiality is the..."
                existing_ids = {o["id"] for o in current_options}
                if in_explanation and opt_id != 'a' and opt_id in existing_ids:
                    current_explanation.append(line)
                    continue

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

                # Recompute after potential flush (current_options may be reset)
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

        When body count < key count, some Q numbers are "bodyless" (have answer
        keys but no body text in the PDF). This method finds which Q numbers to
        skip by extracting expected-answer hints from explanations and scoring
        candidate mappings.

        Uses a greedy iterative approach: find one bodyless Q at a time using
        explanation-based scoring, then repeat for remaining gaps.
        """
        if not answer_map:
            return questions

        sorted_q_nums = sorted(answer_map.keys())
        n_bodies = len(questions)
        n_keys = len(sorted_q_nums)

        if n_bodies == n_keys:
            applied = 0
            for i, q in enumerate(questions):
                if q["correct_answers"]:
                    continue
                ak_answers = [a.strip() for a in answer_map[sorted_q_nums[i]].split(',')]
                q["correct_answers"] = ak_answers
                applied += 1
            logger.info(f"Merge: applied {applied} answers (exact count match)")
            return questions

        n_bodyless = n_keys - n_bodies
        if n_bodyless < 0:
            logger.warning(f"More bodies ({n_bodies}) than keys ({n_keys})")
            applied = 0
            for i, q in enumerate(questions):
                if q["correct_answers"]:
                    continue
                if i < n_keys:
                    ak_answers = [a.strip() for a in answer_map[sorted_q_nums[i]].split(',')]
                    q["correct_answers"] = ak_answers
                    applied += 1
            logger.info(f"Merge: applied {applied} answers (fallback)")
            return questions

        # Extract expected-answer hints from explanations
        hints = self._extract_answer_hints(questions)
        logger.info(f"Extracted {len(hints)} answer hints from explanations")

        # Find bodyless Q numbers iteratively
        skip_set: Set[int] = set()
        remaining_keys = list(sorted_q_nums)

        for _ in range(n_bodyless):
            best_skip = self._find_best_skip(
                questions, answer_map, remaining_keys, hints
            )
            skip_set.add(best_skip)
            remaining_keys = [q for q in remaining_keys if q != best_skip]

        # Apply mapping
        mapping_keys = [q for q in sorted_q_nums if q not in skip_set]
        applied = 0
        missing = []
        for i, q in enumerate(questions):
            if q["correct_answers"]:
                continue
            if i < len(mapping_keys):
                ak_answers = [a.strip() for a in answer_map[mapping_keys[i]].split(',')]
                q["correct_answers"] = ak_answers
                applied += 1
            else:
                missing.append(i + 1)

        logger.info(
            f"Merge: applied {applied} answers, skipped bodyless Q{sorted(skip_set)}"
        )
        if missing:
            logger.warning(f"No answer key for body indices: {missing[:20]}")
        return questions

    def _extract_answer_hints(
        self, questions: List[Dict[str, Any]]
    ) -> Dict[int, Tuple[str, int]]:
        """
        Extract expected correct-answer hints from explanation text.

        Returns dict mapping body index → (expected_answer, confidence).
        Confidence levels:
        - 100: explicit "correct answer is X" reference (nearly always correct)
        - 1: word-overlap prediction with clear margin (70-75% accurate)

        Uses two signals:
        1. Explicit answer reference in explanation text
        2. Word overlap: which option's key words appear most in explanation
        """
        hints: Dict[int, Tuple[str, int]] = {}

        answer_ref = re.compile(
            r'\b(?:correct\s+answer\s+is|answer\s+is)\s+([A-F])\b',
            re.IGNORECASE,
        )
        stopwords = frozenset(
            'the a an is are was were be been of in to and or for not with '
            'that this it by as on at from but if so no can has have had do '
            'does did will would should could may might shall its they them '
            'their we our you your he she his her which what when where how '
            'who whom all each every any some most more than also very such '
            'about into over after before between through up out because '
            'other these those'.split()
        )

        for i, q in enumerate(questions):
            explanation = q.get("explanation", "")
            if not explanation:
                continue

            # Signal 1: Explicit answer reference (high confidence)
            m = answer_ref.search(explanation)
            if m:
                hints[i] = (m.group(1).lower(), 100)
                continue

            # Signal 2: Word overlap between options and explanation
            if len(explanation) < 20:
                continue
            exp_words = set(re.findall(r'[a-z]+', explanation.lower())) - stopwords
            if not exp_words:
                continue

            scores: Dict[str, float] = {}
            for opt in q["options"]:
                opt_words = set(re.findall(r'[a-z]+', opt["text"].lower())) - stopwords
                if not opt_words:
                    continue
                overlap = len(opt_words & exp_words)
                scores[opt["id"]] = overlap / len(opt_words)

            if not scores:
                continue
            sorted_opts = sorted(scores.items(), key=lambda x: -x[1])
            best_id, best_score = sorted_opts[0]
            if best_score > 0.5 and len(sorted_opts) >= 2:
                margin = best_score - sorted_opts[1][1]
                if margin > 0.15:
                    hints[i] = (best_id.lower(), 1)

        return hints

    def _find_best_skip(
        self,
        questions: List[Dict[str, Any]],
        answer_map: Dict[int, str],
        remaining_keys: List[int],
        hints: Dict[int, Tuple[str, int]],
    ) -> int:
        """
        Find the single best Q number to skip from remaining_keys.

        Uses confidence-weighted hints: high-confidence mismatches are heavily
        penalized, low-confidence hints contribute only positive signal.
        """
        best_score = -9999
        best_skip = remaining_keys[-1]  # default: skip last

        for candidate in remaining_keys:
            mapping = [q for q in remaining_keys if q != candidate]
            if len(mapping) < len(questions):
                continue

            score = 0
            for body_idx, (expected, confidence) in hints.items():
                if body_idx >= len(mapping):
                    continue
                ak = answer_map[mapping[body_idx]].strip().lower().split(',')[0]
                if ak == expected:
                    score += confidence
                elif confidence >= 100:
                    score -= 500  # Absolute veto for high-confidence mismatch

            if score > best_score:
                best_score = score
                best_skip = candidate

        logger.info(f"Best skip candidate: Q{best_skip} (score={best_score})")
        return best_skip

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

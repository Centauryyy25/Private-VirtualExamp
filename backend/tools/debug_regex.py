import re

# Fixed Pattern
new_pattern = re.compile(r'(?:Correct Answers?|Answers?|Ans)[:\s]\s*(?:Option\s*)?([A-F](?:[\s,]+[A-F])*)\b', re.IGNORECASE)

test_cases = [
    "Answer: A",
    "Answer: A, B",
    "Answers: A B",
    "Correct Answer: C.",
    "Correct Answer: Option D",
    "Ans: A,C",
    "Answer: A B C",
    "Answer: A.",
    "Answer: A ",
]

print("\n--- FIXED PATTERN RESULTS ---")
for case in test_cases:
    match = new_pattern.search(case)
    if match:
        print(f"MATCH '{case}' -> '{match.group(1)}'")
    else:
        print(f"FAIL  '{case}'")

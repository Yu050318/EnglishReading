from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path

from docx import Document

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parent
DATA = PROJECT / "data"
YXQ_DOCUMENT = SOURCE / "yxq英语题库.docx"


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).lower()
    value = re.sub(r"[^\w\s]", " ", value, flags=re.UNICODE)
    return re.sub(r"\s+", " ", value).strip()


def fingerprint(question: str, options: list[dict[str, str]]) -> str:
    canonical = "|".join([normalize(question)] + [f"{o['key']}:{normalize(o['text'])}" for o in options])
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def category_for(text: str) -> str:
    lowered = text.lower()
    wild = ("mccandless", "chris ", "krakauer", "alaska", "carine", "stampede", "wilderness", "teklanika")
    news = ("news", "editorial", "op-ed", "headline", "newspaper", "journal", "media", "reporter", "byline")
    if any(word in lowered for word in wild):
        return "into_the_wild"
    if any(word in lowered for word in news):
        return "news_english"
    return "other"


def source_label(path: Path) -> str:
    if path.stem.lower().startswith("yxq"):
        return "yxq英语题库.docx"
    return path.name


def structured_documents() -> list[Path]:
    if YXQ_DOCUMENT.exists():
        return [YXQ_DOCUMENT]

    found = []
    for path in SOURCE.glob("*.docx"):
        try:
            doc = Document(path)
        except Exception:
            continue
        numbered = sum(bool(re.match(r"^\d+\.\s+", p.text.strip())) for p in doc.paragraphs)
        if numbered == 40 and not doc.inline_shapes:
            found.append(path)
    return sorted(found, key=lambda p: p.name)


def parse_document(path: Path) -> list[dict]:
    lines = [p.text.strip() for p in Document(path).paragraphs if p.text.strip()]
    starts = [i for i, line in enumerate(lines) if re.match(r"^\d+\.(?:\s+.*)?$", line)]
    records = []
    for position, start in enumerate(starts):
        end = starts[position + 1] if position + 1 < len(starts) else len(lines)
        match = re.match(r"^(\d+)\.(?:\s+(.*))?$", lines[start])
        assert match
        number = int(match.group(1))
        question_parts = [match.group(2).strip()] if match.group(2) else []
        options, marked_answer, stated_answer = [], None, None
        for line in lines[start + 1:end]:
            answer_match = re.search(r"[：:]\s*([A-DTF])\s*$", line)
            if line.startswith("正确答案") and answer_match:
                stated_answer = answer_match.group(1)
                continue
            if line.startswith("答案") and answer_match:
                stated_answer = answer_match.group(1)
                continue
            option_match = re.match(r"^(✓\s*)?([A-D])\.\s*(.+)$", line)
            if option_match:
                if option_match.group(1):
                    marked_answer = option_match.group(2)
                options.append({"key": option_match.group(2), "text": option_match.group(3).strip()})
                continue
            if not options:
                question_parts.append(line)
        answer = stated_answer or marked_answer
        question = " ".join(question_parts).strip()
        question_type = "single_choice"
        if not options and answer in {"T", "F"}:
            question_type = "true_false"
            options = [{"key": "T", "text": "正确"}, {"key": "F", "text": "错误"}]
        fp = fingerprint(question, options)
        complete = len(options) >= 2 and answer is not None and answer in {o["key"] for o in options}
        records.append({
            "id": f"q_{fp[:16]}", "type": question_type, "question": question,
            "options": options, "answer": [answer] if answer else [],
            "category": category_for(question), "source": [f"{source_label(path)}#{number}"],
            "explanation": "", "ocrConfidence": None,
            "reviewStatus": "verified" if complete else "needs_review", "fingerprint": fp,
        })
    return records


def count_ocr_pages() -> tuple[int, int]:
    files = list((SOURCE / "tmp" / "ocr").glob("*/ocr.json"))
    pages = 0
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        pages += len(re.findall(r'"index"\s*:', text))
    return len(files), pages


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    docs = structured_documents()
    records = [record for path in docs for record in parse_document(path)]
    ocr_files, ocr_pages = count_ocr_pages()
    (DATA / "questions.raw.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "extraction-meta.json").write_text(json.dumps({
        "sourceDocuments": [p.name for p in docs],
        "structuredDocuments": [p.name for p in docs], "structuredRecognized": len(records),
        "ocrFilesInspected": ocr_files, "ocrPagesInspected": ocr_pages,
        "ocrCandidatesAccepted": 0,
        "ocrPolicy": "OCR pages are retained for later manual segmentation; no ambiguous OCR candidate is promoted automatically."
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"structured": len(records), "ocr_pages": ocr_pages}, ensure_ascii=False))


if __name__ == "__main__":
    main()

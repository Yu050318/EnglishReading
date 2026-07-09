from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

from docx import Document

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parents[2] if PROJECT.parent.name == ".worktrees" else PROJECT.parent
DATA = PROJECT / "data"
YXQ_DOCUMENT = SOURCE / "yxq英语题库.docx"
HR_DOCUMENT = SOURCE / "人力期中考核总复习_修正版答案解析.docx"


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).lower()
    value = re.sub(r"[^\w\s]", " ", value, flags=re.UNICODE)
    return re.sub(r"\s+", " ", value).strip()


def fingerprint(question: str, options: list[dict[str, str]], salt: str = "") -> str:
    canonical = "|".join([salt, normalize(question)] + [f"{o['key']}:{normalize(o['text'])}" for o in options])
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def source_label(path: Path) -> str:
    name = path.name
    if path.stem.lower().startswith("yxq"):
        return "yxq英语题库.docx"
    if "人力" in name:
        return "人力期中考核总复习_修正版答案解析.docx"
    return name


def subject_for_document(path: Path) -> str:
    return "human_resources" if "人力" in source_label(path) else "english"


def category_for_document(path: Path) -> str:
    return "human_resources_review" if subject_for_document(path) == "human_resources" else "vocabulary"


def structured_documents() -> list[Path]:
    docs: list[Path] = []
    if YXQ_DOCUMENT.exists():
        docs.append(YXQ_DOCUMENT)
    if HR_DOCUMENT.exists():
        docs.append(HR_DOCUMENT)
    if docs:
        return docs

    for path in SOURCE.glob("*.docx"):
        if path.name.startswith("~$"):
            continue
        name = path.name.lower()
        if "yxq" in name or "人力" in path.name:
            docs.append(path)
    return sorted(docs, key=lambda p: p.name)


def make_record(
    *,
    path: Path,
    number: str,
    question_type: str,
    question: str,
    options: list[dict[str, str]],
    answer: list[str],
    explanation: str = "",
    answer_text: str = "",
) -> dict[str, Any]:
    subject = subject_for_document(path)
    salt = f"{subject}:{number}" if subject == "human_resources" else ""
    fp = fingerprint(question, options, salt)
    option_keys = {option["key"] for option in options}
    if question_type == "short_answer":
        complete = bool(question.strip()) and bool((answer_text or explanation).strip())
    else:
        complete = bool(question.strip()) and len(options) >= 2 and bool(answer) and all(item in option_keys for item in answer)

    record: dict[str, Any] = {
        "id": f"{'hr' if subject == 'human_resources' else 'q'}_{fp[:16]}",
        "subject": subject,
        "type": question_type,
        "question": question.strip(),
        "options": options,
        "answer": answer,
        "category": category_for_document(path),
        "source": [f"{source_label(path)}#{number}"],
        "explanation": explanation.strip(),
        "ocrConfidence": None,
        "reviewStatus": "verified" if complete else "needs_review",
        "fingerprint": fp,
    }
    if answer_text.strip():
        record["answerText"] = answer_text.strip()
    return record


def parse_answer_letters(text: str) -> list[str]:
    return [letter for letter in re.findall(r"[A-DTF]", text.upper())]


def parse_english_document(path: Path) -> list[dict[str, Any]]:
    lines = [p.text.strip() for p in Document(path).paragraphs if p.text.strip()]
    starts = [i for i, line in enumerate(lines) if re.match(r"^\d+\.(?:\s+.*)?$", line)]
    records = []
    for position, start in enumerate(starts):
        end = starts[position + 1] if position + 1 < len(starts) else len(lines)
        match = re.match(r"^(\d+)\.(?:\s+(.*))?$", lines[start])
        assert match
        number = match.group(1)
        question_parts = [match.group(2).strip()] if match.group(2) else []
        options: list[dict[str, str]] = []
        marked_answer = None
        stated_answer = None
        for line in lines[start + 1:end]:
            answer_match = re.search(r"[：:]\s*([A-DTF])\s*$", line)
            if line.startswith(("正确答案", "答案")) and answer_match:
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
        records.append(make_record(
            path=path,
            number=number,
            question_type=question_type,
            question=question,
            options=options,
            answer=[answer] if answer else [],
        ))
    return records


def option_match(line: str) -> re.Match[str] | None:
    return re.match(r"^([A-D])\.\s*(.+)$", line)


def objective_start(line: str) -> re.Match[str] | None:
    return re.match(r"^(\d+)\.\s*(.+)$", line) or re.match(r"^(案例[（(][一二三四五六七八九十]+[）)]-\d+)\.\s*(.+)$", line)


def parse_objective_block(path: Path, number: str, question: str, body: list[str], question_type: str) -> dict[str, Any]:
    options: list[dict[str, str]] = []
    answer: list[str] = []
    explanation = ""
    for line in body:
        match = option_match(line)
        if match:
            options.append({"key": match.group(1), "text": match.group(2).strip()})
            continue
        if line.startswith("答案"):
            answer = parse_answer_letters(line.split("：", 1)[-1].split(":", 1)[-1])
            continue
        if line.startswith("解析"):
            explanation = line.split("：", 1)[-1].split(":", 1)[-1].strip()
    return make_record(path=path, number=number, question_type=question_type, question=question, options=options, answer=answer, explanation=explanation)


def parse_short_block(path: Path, number: str, question: str, body: list[str]) -> dict[str, Any]:
    answer_text = ""
    explanation = ""
    for line in body:
        if line.startswith("答案") or line.startswith("参考答案"):
            answer_text = line.split("：", 1)[-1].split(":", 1)[-1].strip()
        elif line.startswith("解析"):
            explanation = line.split("：", 1)[-1].split(":", 1)[-1].strip()
        else:
            question = f"{question}\n{line}".strip()
    return make_record(path=path, number=number, question_type="short_answer", question=question, options=[], answer=[], explanation=explanation, answer_text=answer_text)


def parse_hr_document(path: Path) -> list[dict[str, Any]]:
    lines = [p.text.strip() for p in Document(path).paragraphs if p.text.strip()]
    records: list[dict[str, Any]] = []
    section = ""
    active: dict[str, Any] | None = None
    case_contexts: dict[str, str] = {}
    current_case_context = ""

    def flush() -> None:
        nonlocal active
        if not active:
            return
        if active["type"] in {"single_choice", "multiple_choice"}:
            records.append(parse_objective_block(path, active["number"], active["question"], active["body"], active["type"]))
        else:
            records.append(parse_short_block(path, active["number"], active["question"], active["body"]))
        active = None

    for line in lines:
        if line.startswith("一、"):
            flush()
            section = "single_choice"
            continue
        if line.startswith("二、"):
            flush()
            section = "multiple_choice"
            continue
        if line.startswith("三、"):
            flush()
            section = "calculation"
            current_case_context = ""
            continue
        if line.startswith("四、"):
            flush()
            section = "case_analysis"
            current_case_context = ""
            continue
        if not section:
            continue

        context_match = re.match(r"^(案例[（(][一二三四五六七八九十]+[）)]).+", line)
        start = objective_start(line)
        if section == "multiple_choice" and context_match and not start:
            case_contexts[context_match.group(1)] = line
            continue
        if section == "case_analysis" and not re.match(r"^\d+\.", line) and not line.startswith(("答案", "参考答案", "解析")):
            current_case_context = line
            continue

        if section in {"single_choice", "multiple_choice"} and start:
            flush()
            number = start.group(1)
            question = start.group(2)
            case_key_match = re.match(r"^(案例[（(][一二三四五六七八九十]+[）)])", number)
            if case_key_match and case_key_match.group(1) in case_contexts:
                question = f"{case_contexts[case_key_match.group(1)]}\n{number}. {question}"
            active = {"number": number, "question": question, "body": [], "type": section}
            continue

        short_match = re.match(r"^(\d+)\.\s*(.+)$", line)
        if section in {"calculation", "case_analysis"} and short_match:
            flush()
            question = short_match.group(2)
            if section == "case_analysis" and current_case_context:
                question = f"{current_case_context}\n{question}"
            active = {"number": f"{section}-{short_match.group(1)}", "question": question, "body": [], "type": "short_answer"}
            continue

        if active:
            active["body"].append(line)

    flush()
    return records


def parse_document(path: Path) -> list[dict[str, Any]]:
    if subject_for_document(path) == "human_resources":
        return parse_hr_document(path)
    return parse_english_document(path)


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
    subject_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}
    for record in records:
        subject_counts[record["subject"]] = subject_counts.get(record["subject"], 0) + 1
        type_counts[f"{record['subject']}:{record['type']}"] = type_counts.get(f"{record['subject']}:{record['type']}", 0) + 1
    (DATA / "questions.raw.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "extraction-meta.json").write_text(json.dumps({
        "sourceDocuments": [source_label(p) for p in docs],
        "structuredDocuments": [source_label(p) for p in docs],
        "structuredRecognized": len(records),
        "subjectCounts": subject_counts,
        "typeCounts": type_counts,
        "ocrFilesInspected": ocr_files,
        "ocrPagesInspected": ocr_pages,
        "ocrCandidatesAccepted": 0,
        "ocrPolicy": "OCR pages are retained for later manual segmentation; no ambiguous OCR candidate is promoted automatically."
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"structured": len(records), "subjects": subject_counts, "types": type_counts, "ocr_pages": ocr_pages}, ensure_ascii=False))


if __name__ == "__main__":
    main()

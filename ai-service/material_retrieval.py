"""Bounded, deterministic evidence selection across a complete extracted material.

This is lexical retrieval, not semantic search or a guarantee of model accuracy.
Source labels describe the excerpts supplied to the model, not verified answers.
"""
from collections import Counter
from dataclasses import dataclass
import math
import re
import unicodedata


EVIDENCE_BUDGET = 6000
CHUNK_SIZE = 1150
CHUNK_OVERLAP = 180
SOURCE_MARKER = re.compile(
    r"^[ \t]*(?:\[(?P<kind>Page|Slide)[ \t]+(?P<number>\d+)\]|"
    r"(?P<plain_slide>Slide)[ \t]+(?P<slide_number>\d+))[ \t]*$", re.I | re.M
)
SECTION_HEADING = re.compile(
    r"^\s*((?:topic|chapter|unit|section)\s+\d+\b[^\n]{0,150})", re.I | re.M
)
DEFINITION_QUERY = re.compile(
    r"\b(?:what\s+(?:is|are)|defin(?:e|ition)|meaning|means?|refers?\s+to)\b", re.I
)
DEFINITION_PASSAGE = re.compile(
    r"(?P<subject>(?:[^\W_]+(?:['’][^\W_]+)?\s+){1,8})"
    r"(?P<verb>is|are|means?|refers?\s+to)\b", re.I
)
STOP_WORDS = set("""
    a an and are as at be been but by can could did do does for from had has have
    how i if in into is it its me my of on or our please should so than that the
    their them there these they this those to us was were what when where which
    who why will with would you your explain tell describe discuss give about
    also again more further really just only actually not yes no covered contains
    content provided text lesson material materials module topic chapter unit
    section page slide summary summarize summarise overview whole entire document
    pdf docx ppt pptx file brief briefly concise simple terms main key point points
    it's that's there's isn't doesn't don't i'm
""".split())


@dataclass(frozen=True)
class Chunk:
    index: int
    text: str
    label: str
    section: str
    terms: frozenset


def terms(text):
    normalized = unicodedata.normalize("NFKC", text).casefold()
    result = set()
    for token in re.findall(r"[^\W_]+(?:['’][^\W_]+)?", normalized):
        if token in STOP_WORDS or token.isdecimal() or len(token) < 2:
            continue
        if token.endswith("ies") and len(token) > 5:
            token = token[:-3] + "y"
        elif token.endswith("s") and not token.endswith(("ss", "us", "is")) and len(token) > 4:
            token = token[:-1]
        if token not in STOP_WORDS:
            result.add(token)
    for kind, number in re.findall(r"\b(topic|chapter|unit|section|page|slide)\s*#?\s*(\d+)\b", normalized):
        result.add(f"{kind}:{int(number)}")
    return result


def bounded_history(history):
    if not isinstance(history, list):
        return []
    return [{"role": row["role"], "content": row["content"][:1000]}
            for row in history[-6:] if isinstance(row, dict)
            and row.get("role") in ("user", "assistant")
            and isinstance(row.get("content"), str) and row["content"].strip()]


def _pieces(text):
    """Split without silently dropping the tail of long pages or paragraphs."""
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        if end < len(text):
            boundary = max(text.rfind("\n", start + CHUNK_SIZE // 2, end),
                           text.rfind(" ", start + CHUNK_SIZE // 2, end))
            if boundary > start:
                end = boundary
        piece = text[start:end].strip()
        if piece:
            yield piece
        if end == len(text):
            break
        start = max(start + 1, end - CHUNK_OVERLAP)


def chunks_for_document(document):
    text = document.replace("\r\n", "\n").replace("\r", "\n")
    markers = list(SOURCE_MARKER.finditer(text))
    units = []
    if not markers:
        units.append(("", text))
    else:
        if text[:markers[0].start()].strip():
            units.append(("", text[:markers[0].start()]))
        for index, marker in enumerate(markers):
            end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
            kind = marker.group("kind") or marker.group("plain_slide")
            number = marker.group("number") or marker.group("slide_number")
            units.append((f"{kind.title()} {int(number)}", text[marker.end():end]))
    chunks = []
    current_section = ""
    for label, content in units:
        headings = list(SECTION_HEADING.finditer(content))
        # Some PDFs store the visual page header after every body text object.
        # A sole trailing heading (with at most a page-number footer after it)
        # therefore labels this page, not just the empty tail of its extraction.
        # Multiple headings or a heading followed by body text keep normal order.
        if label.startswith("Page ") and len(headings) == 1 and headings[0].start() > 0:
            trailing = content[headings[0].end():].strip()
            if not trailing or trailing.isdecimal():
                current_section = headings[0].group(1).strip()
                headings = []
        sections = [(0, "")] + [(heading.start(), heading.group(1).strip()) for heading in headings]
        for offset, (start, heading) in enumerate(sections):
            end = sections[offset + 1][0] if offset + 1 < len(sections) else len(content)
            if heading:
                current_section = heading
            for piece in _pieces(content[start:end]):
                index = len(chunks)
                source = label or f"Excerpt {index + 1}"
                chunks.append(Chunk(index, piece, source, current_section,
                                    frozenset(terms(piece + "\n" + current_section + "\n" + source))))
    return chunks


def _spread_indices(chunks, count):
    # Section openings keep a broad summary from becoming a summary of page one.
    selected = [0]
    seen = {chunks[0].section}
    for chunk in chunks[1:]:
        if chunk.section and chunk.section not in seen:
            selected.append(chunk.index)
            seen.add(chunk.section)
    if len(selected) > count:
        selected = [selected[round(i * (len(selected) - 1) / (count - 1))] for i in range(count)]
    anchors = [round(i * (len(chunks) - 1) / (count - 1)) for i in range(count)] if count > 1 else [0]
    # Include the end even when the section openings already fill the budget.
    if len(selected) == count and chunks[-1].index not in selected and count > 1:
        selected[-1] = chunks[-1].index
    for index in reversed(anchors):
        if index not in selected and len(selected) < count:
            selected.append(index)
    return sorted(selected)


def _definition_score(chunk, concept_terms):
    """Prefer an actual defining passage over incidental concept mentions.

    The bonus is capped per chunk, so repeating a word or sentence cannot win
    merely by frequency. It works for arbitrary concepts, not a coursebook list.
    """
    if not concept_terms:
        return 0
    best = 0
    for match in DEFINITION_PASSAGE.finditer(chunk.text):
        overlap = concept_terms & terms(match.group("subject"))
        if overlap:
            best = max(best, 64 * len(overlap) / len(concept_terms))
    for line in chunk.text.splitlines():
        label, separator, explanation = line.partition(":")
        if separator and len(label.split()) <= 8 and len(explanation.strip()) > 20:
            overlap = concept_terms & terms(label)
            if overlap:
                best = max(best, 64 * len(overlap) / len(concept_terms))
        # A short standalone concept heading is also stronger than a passing
        # mention, while preserving room for its later defining paragraph.
        if len(line.split()) <= 8 and terms(line.rstrip(":")) == concept_terms:
            best = max(best, 24)
    return best


def select_evidence(document, question, history=None, budget=EVIDENCE_BUDGET):
    chunks = chunks_for_document(document)
    query_terms = terms(question)
    summary_request = re.search(r"\b(summar(?:y|ize|ise)|overview)\b", question, re.I) or re.search(
        r"\b(explain|describe|discuss|what is)\b.*\b(lesson|module|material|pdf|document|file)\b", question, re.I)
    broad = bool(summary_request) and not query_terms
    # Corrections/follow-ups need earlier USER questions, never prior AI claims.
    follow_up = len(query_terms) < 3 and bool(re.search(
        r"\b(it|this|that|those|these|more|again|further|topic\s*\d+|why|yes)\b", question, re.I))
    previous_users = [row["content"] for row in bounded_history(history) if row["role"] == "user"][-2:]
    history_terms = set().union(*(terms(text) for text in previous_users)) if follow_up and previous_users else set()
    definition_question = ""
    if DEFINITION_QUERY.search(question):
        definition_question = question
    elif follow_up:
        definition_question = next((text for text in reversed(previous_users) if DEFINITION_QUERY.search(text)), "")
    definition_terms = {term for term in terms(definition_question)
                        if ":" not in term and term not in {"define", "definition", "meaning", "mean", "refer"}}
    if not chunks:
        return {"excerpts": [], "sources": [], "context_scope": "no_matching_evidence"}
    if broad:
        selected = [chunks[index] for index in _spread_indices(chunks, min(6, len(chunks)))]
    else:
        frequencies = Counter(term for chunk in chunks for term in chunk.terms)
        def score(chunk):
            current = sum(math.log(1 + len(chunks) / frequencies[term]) for term in query_terms & chunk.terms)
            previous = sum(math.log(1 + len(chunks) / frequencies[term]) for term in history_terms & chunk.terms)
            # An explicit page/topic selector must outweigh a prior topic.
            # A matching definition outranks inherited topic metadata: PDF text
            # order can put a visible heading after its own body paragraphs.
            selector_bonus = 12 * len({term for term in query_terms & chunk.terms if ":" in term})
            definition_bonus = _definition_score(chunk, definition_terms)
            return current + previous * 0.55 + selector_bonus + definition_bonus
        ranked = sorted(((score(chunk), chunk) for chunk in chunks), key=lambda item: (-item[0], item[1].index))
        selected = [chunk for value, chunk in ranked if value > 0][:4]
        # No lexical match is a retrieval limitation, not proof of topic absence.
        if not selected:
            return {"excerpts": [], "sources": [], "context_scope": "no_matching_evidence"}
        selected.sort(key=lambda chunk: chunk.index)
    excerpts, sources = [], []
    remaining = budget
    per_excerpt = max(1, budget // len(selected) - 180)
    for chunk in selected:
        excerpt_id = f"E{len(excerpts) + 1}"
        section = chunk.section[:150]
        overhead = len(chunk.label) + len(section) + 70
        allowance = min(per_excerpt, remaining - overhead)
        if allowance <= 0:
            break
        excerpt = {"excerpt_id": excerpt_id, "source": chunk.label,
                   "section": section, "text": chunk.text[:allowance]}
        excerpts.append(excerpt)
        sources.append({"label": chunk.label, "excerpt_id": excerpt_id})
        remaining -= len(excerpt["text"]) + overhead
    return {"excerpts": excerpts, "sources": sources, "context_scope": "selected_excerpts"}

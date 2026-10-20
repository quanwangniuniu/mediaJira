"""
Management command: run_project_rag_followup_eval.

Phase for this command today: arms A and B only.
  A -- retrieve with the raw follow-up question
  B -- retrieve with the human expected_rewrite (upper-bound reference)
Arm C (rewrite_project_question) is intentionally not run yet. Reports must
state that this phase only contrasts short follow-ups with ideal completions.

Seeds/indexes the source corpus declared in the follow-up fixture
(project_rag_eval_dataset.json 2.1.0 by default), reusing the main eval
tenant helpers and evidence scorers from run_project_rag_eval.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.services.tenant import slug_to_schema_name
from core.tenant_context import tenant_schema_context
from rag.management.commands import run_project_rag_eval as main_eval
from rag.retrieval import retrieve_chunks

_COMMAND_DIR = Path(__file__).resolve().parent
_RAG_APP_DIR = _COMMAND_DIR.parents[1]
_FIXTURES_DIR = _RAG_APP_DIR / 'tests' / 'fixtures'
DEFAULT_FOLLOWUP_FIXTURE = _FIXTURES_DIR / 'project_rag_followup_eval_dataset.json'
DEFAULT_OUTPUT_DIR = _RAG_APP_DIR / 'eval_results'

ALLOWED_CASE_KINDS = frozenset({
    'anaphoric',
    'already_complete',
    'topic_shift',
    'underspecified',
})
ALLOWED_QUESTION_TYPES = frozenset({'single-source', 'multi-source', 'no-answer'})
ALLOWED_HISTORY_ROLES = frozenset({'user', 'assistant'})
ARMS_EXECUTED = ('A', 'B')
PHASE_NOTE = (
    'This run executes arms A and B only: raw short follow-up vs human '
    'expected_rewrite. It does not call rewrite_project_question and must '
    'not be reported as proof that query rewrite works.'
)

_OUTCOME_SCORE = {'fail': 0, 'partial': 1, 'pass': 2}


def _load_json(path: Path) -> dict:
    if not path.exists():
        raise CommandError(f"Fixture not found: {path}")
    try:
        with path.open(encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as exc:
        raise CommandError(f"Fixture at {path} is not valid JSON: {exc}") from exc


def _validate_followup_fixture(data: dict, path: Path) -> None:
    questions = data.get('questions')
    if not isinstance(questions, list) or not questions:
        raise CommandError(f"Follow-up fixture {path} must declare a non-empty questions list.")

    corpus = data.get('source_corpus') or {}
    if not corpus.get('fixture'):
        raise CommandError(f"Follow-up fixture {path} must declare source_corpus.fixture.")

    case_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}
    ids: set[str] = set()

    for q in questions:
        qid = q.get('id')
        if not qid:
            raise CommandError(f"Follow-up fixture {path} has a question without id.")
        if qid in ids:
            raise CommandError(f"Follow-up fixture {path} has duplicate question id {qid!r}.")
        ids.add(qid)

        case_kind = q.get('case_kind')
        if case_kind not in ALLOWED_CASE_KINDS:
            raise CommandError(f"{qid}: invalid case_kind {case_kind!r}.")
        case_counts[case_kind] = case_counts.get(case_kind, 0) + 1

        qtype = q.get('question_type')
        if qtype not in ALLOWED_QUESTION_TYPES:
            raise CommandError(f"{qid}: invalid question_type {qtype!r}.")
        type_counts[qtype] = type_counts.get(qtype, 0) + 1

        history = q.get('history')
        if not isinstance(history, list) or not history:
            raise CommandError(f"{qid}: history must be a non-empty list of prior turns.")
        for turn in history:
            if turn.get('role') not in ALLOWED_HISTORY_ROLES:
                raise CommandError(f"{qid}: history role must be user or assistant.")
            if not isinstance(turn.get('content'), str) or not turn['content'].strip():
                raise CommandError(f"{qid}: history content must be a non-empty string.")

        if not isinstance(q.get('question'), str) or not q['question'].strip():
            raise CommandError(f"{qid}: question must be a non-empty string.")
        if not isinstance(q.get('expected_rewrite'), str) or not q['expected_rewrite'].strip():
            raise CommandError(f"{qid}: expected_rewrite must be a non-empty string.")

        expected_sources = q.get('expected_sources')
        if not isinstance(expected_sources, list):
            raise CommandError(f"{qid}: expected_sources must be a list.")
        if qtype == 'no-answer' and expected_sources:
            raise CommandError(f"{qid}: no-answer questions must have empty expected_sources.")
        if qtype != 'no-answer' and not expected_sources:
            raise CommandError(f"{qid}: {qtype} questions must declare expected_sources.")

    expected_case = data.get('expected_case_kind_counts')
    if expected_case is not None:
        normalized_case = {kind: case_counts.get(kind, 0) for kind in ALLOWED_CASE_KINDS}
        expected_case_full = {kind: int(expected_case.get(kind, 0)) for kind in ALLOWED_CASE_KINDS}
        if normalized_case != expected_case_full:
            raise CommandError(
                f"Follow-up fixture {path} case_kind counts {normalized_case} do not match "
                f"expected_case_kind_counts {expected_case_full}."
            )
    expected_types = data.get('expected_question_type_counts')
    if expected_types is not None:
        normalized_types = {qtype: type_counts.get(qtype, 0) for qtype in ALLOWED_QUESTION_TYPES}
        expected_types_full = {
            qtype: int(expected_types.get(qtype, 0)) for qtype in ALLOWED_QUESTION_TYPES
        }
        if normalized_types != expected_types_full:
            raise CommandError(
                f"Follow-up fixture {path} question_type counts {normalized_types} do not match "
                f"expected_question_type_counts {expected_types_full}."
            )


def _resolve_source_corpus_path(followup_data: dict, followup_path: Path) -> Path:
    corpus_name = followup_data['source_corpus']['fixture']
    candidate = followup_path.parent / corpus_name
    if candidate.exists():
        return candidate
    fallback = _FIXTURES_DIR / corpus_name
    if fallback.exists():
        return fallback
    raise CommandError(
        f"Source corpus fixture {corpus_name!r} not found next to {followup_path} "
        f"or under {_FIXTURES_DIR}."
    )


def _score_arm(
    question: dict,
    query: str,
    project_id: int,
    source_ref_map: dict[str, tuple[str, str]],
    top_k: int,
) -> dict[str, Any]:
    retrieved = retrieve_chunks(project_id, query, top_k=top_k, min_similarity=None)
    source_ref_map_reverse = {v: k for k, v in source_ref_map.items()}
    record: dict[str, Any] = {
        'query': query,
        'retrieved_top5': [
            main_eval._chunk_to_dict(rank, chunk, source_ref_map_reverse)
            for rank, chunk in enumerate(retrieved[:5], start=1)
        ],
    }
    qtype = question['question_type']
    if qtype == 'single-source':
        record.update(main_eval._score_single_source(question, retrieved, source_ref_map))
    elif qtype == 'multi-source':
        record.update(main_eval._score_multi_source(question, retrieved, source_ref_map))
    elif qtype == 'no-answer':
        record.update(main_eval._score_no_answer(question, retrieved, source_ref_map_reverse))
    else:
        raise CommandError(f"Unknown question_type {qtype!r} for {question['id']}")
    return record


def _compare_a_to_b(arm_a: dict, arm_b: dict) -> str:
    """Whether B looks better / worse / same than A for ranking outcomes."""
    a_out, b_out = arm_a.get('outcome'), arm_b.get('outcome')
    if a_out is None and b_out is None:
        return 'n/a'
    a_score = _OUTCOME_SCORE.get(a_out)
    b_score = _OUTCOME_SCORE.get(b_out)
    if a_score is None or b_score is None:
        return 'n/a'
    if b_score > a_score:
        return 'improve'
    if b_score < a_score:
        return 'regress'
    a_rank = arm_a.get('evidence_complete_rank')
    b_rank = arm_b.get('evidence_complete_rank')
    if a_rank is not None and b_rank is not None:
        if b_rank < a_rank:
            return 'improve'
        if b_rank > a_rank:
            return 'regress'
    return 'same'


def _run_followup_questions(
    project,
    questions: list[dict],
    source_ref_map: dict[str, tuple[str, str]],
    top_k: int,
) -> list[dict]:
    per_question = []
    for q in questions:
        arm_a = _score_arm(q, q['question'], project.id, source_ref_map, top_k)
        arm_b = _score_arm(q, q['expected_rewrite'], project.id, source_ref_map, top_k)
        per_question.append({
            'id': q['id'],
            'case_kind': q['case_kind'],
            'question_type': q['question_type'],
            'include_in_followup_metrics': q.get('include_in_followup_metrics', True),
            'history': q['history'],
            'question': q['question'],
            'expected_rewrite': q['expected_rewrite'],
            'expected_sources': q.get('expected_sources', []),
            'tags': q.get('tags', []),
            'notes': q.get('notes'),
            'derived_from': q.get('derived_from'),
            'arms': {'A': arm_a, 'B': arm_b},
            'comparison': {'A_to_B': _compare_a_to_b(arm_a, arm_b)},
        })
    return per_question


def _arm_records_for_aggregate(per_question: list[dict], arm: str) -> list[dict]:
    """Shape arm rows like main-eval per_question so _aggregate_metrics can reuse."""
    rows = []
    for q in per_question:
        if not q.get('include_in_followup_metrics', True):
            continue
        arm_row = q['arms'][arm]
        rows.append({
            'id': q['id'],
            'question_type': q['question_type'],
            'outcome': arm_row.get('outcome'),
            'evidence_complete_rank': arm_row.get('evidence_complete_rank'),
            'recall@3': arm_row.get('recall@3', 0.0),
            'recall@5': arm_row.get('recall@5', 0.0),
            'recall@10': arm_row.get('recall@10', 0.0),
            'full_coverage@3': arm_row.get('full_coverage@3', 0.0),
            'full_coverage@5': arm_row.get('full_coverage@5', 0.0),
            'full_coverage@10': arm_row.get('full_coverage@10', 0.0),
            'precision@3': arm_row.get('precision@3', 0.0),
            'precision@5': arm_row.get('precision@5', 0.0),
            'source_precision@3': arm_row.get('source_precision@3', 0.0),
            'source_precision@5': arm_row.get('source_precision@5', 0.0),
            'first_relevant_rank': arm_row.get('first_relevant_rank'),
        })
    return rows


def _summarize_comparisons(per_question: list[dict]) -> dict[str, int]:
    counts = {'improve': 0, 'regress': 0, 'same': 0, 'n/a': 0}
    for q in per_question:
        if not q.get('include_in_followup_metrics', True):
            continue
        label = q['comparison']['A_to_B']
        counts[label] = counts.get(label, 0) + 1
    return counts


class Command(BaseCommand):
    help = (
        "Seed the MED-264 source corpus used by the follow-up fixture, then score "
        "each follow-up question under arms A (raw question) and B (human "
        "expected_rewrite). This phase does not run rewrite_project_question."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--fixture',
            type=Path,
            default=DEFAULT_FOLLOWUP_FIXTURE,
            help='Path to the follow-up eval fixture JSON.',
        )
        parser.add_argument(
            '--output',
            type=Path,
            default=None,
            help='Path to write the JSON results artifact.',
        )
        parser.add_argument(
            '--top-k',
            type=int,
            default=10,
            help='top_k passed to retrieve_chunks() for this eval run only.',
        )

    def handle(self, *args, **options):
        provider = settings.RAG_EMBEDDING_PROVIDER
        if provider == 'gemini':
            embedding_model = settings.RAG_EMBEDDING_MODEL
        elif provider == 'local':
            embedding_model = settings.RAG_LOCAL_EMBEDDING_MODEL
        else:
            raise CommandError(
                f"Unknown RAG_EMBEDDING_PROVIDER {provider!r}; expected 'gemini' or 'local'."
            )
        if provider == 'gemini' and not settings.GEMINI_API_KEY:
            raise CommandError(
                "GEMINI_API_KEY is not configured. Set RAG_EMBEDDING_PROVIDER=local "
                "to use the temporary local embedding provider instead "
                "(eval/local-dev only)."
            )

        followup_path: Path = options['fixture']
        top_k: int = options['top_k']
        followup_data = _load_json(followup_path)
        _validate_followup_fixture(followup_data, followup_path)

        corpus_path = _resolve_source_corpus_path(followup_data, followup_path)
        corpus_data = _load_json(corpus_path)
        main_eval._validate_fixture_shape(corpus_data, corpus_path)

        org, user = main_eval._get_or_create_eval_tenant()
        eval_schema = slug_to_schema_name(org.slug)
        self.stdout.write(f"Eval tenant: organization={org.name!r} schema={eval_schema!r}")
        self.stdout.write(self.style.WARNING(PHASE_NOTE))

        with tenant_schema_context(eval_schema):
            project = main_eval._get_or_create_eval_project(org, user)
            self.stdout.write(f"Eval project id={project.id} name={project.name!r}")
            source_ref_map, index_outcomes = main_eval._seed_and_index(
                project, user, corpus_data['sources'],
            )
            main_eval._validate_question_refs(followup_data['questions'], source_ref_map)
            per_question = _run_followup_questions(
                project, followup_data['questions'], source_ref_map, top_k,
            )

        metrics_by_arm = {
            arm: main_eval._aggregate_metrics(_arm_records_for_aggregate(per_question, arm))
            for arm in ARMS_EXECUTED
        }
        comparison = _summarize_comparisons(per_question)

        report = {
            'run_metadata': {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'fixture_path': str(followup_path),
                'fixture_version': followup_data.get('dataset_version'),
                'source_corpus_path': str(corpus_path),
                'source_corpus_version': corpus_data.get('dataset_version'),
                'chunk_size': settings.RAG_CHUNK_SIZE,
                'chunk_overlap': settings.RAG_CHUNK_OVERLAP,
                'embedding_provider': provider,
                'embedding_model': embedding_model,
                'embedding_dimensions': settings.RAG_EMBEDDING_DIMENSIONS,
                'min_similarity': None,
                'top_k': top_k,
                'eval_org_schema': eval_schema,
                'eval_project_id': project.id,
                'arms_executed': list(ARMS_EXECUTED),
                'phase': 'A_B_only',
                'phase_note': PHASE_NOTE,
            },
            'index_outcomes': index_outcomes,
            'metrics_by_arm': metrics_by_arm,
            'comparison_A_to_B': comparison,
            'per_question': per_question,
        }

        output_path = self._write_report(report, options['output'])
        self._print_summary(report, output_path)

    def _write_report(self, report: dict, output_option: Path | None) -> Path:
        if output_option is not None:
            output_path = output_option
        else:
            DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            output_path = DEFAULT_OUTPUT_DIR / f'followup_{stamp}.json'
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open('w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, sort_keys=False)
        return output_path

    def _print_summary(self, report: dict, output_path: Path) -> None:
        meta = report['run_metadata']
        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Follow-up eval phase"))
        self.stdout.write(self.style.WARNING(meta['phase_note']))
        self.stdout.write(f"  arms_executed={meta['arms_executed']}")

        outcome_counts: dict[str, int] = {}
        for o in report['index_outcomes']:
            outcome_counts[o['outcome']] = outcome_counts.get(o['outcome'], 0) + 1
        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Indexing outcomes"))
        for outcome, count in sorted(outcome_counts.items()):
            self.stdout.write(f"  {outcome}: {count}")

        for arm in ARMS_EXECUTED:
            m = report['metrics_by_arm'][arm]
            label = 'A raw follow-up' if arm == 'A' else 'B human expected_rewrite'
            self.stdout.write("")
            self.stdout.write(self.style.MIGRATE_HEADING(f"Arm {arm} ({label})"))
            self.stdout.write(
                f"  Single-source n={m['single_source']['n']}  "
                f"Hit@1={m['single_source']['hit@1']:.3f}  "
                f"Hit@3={m['single_source']['hit@3']:.3f}  "
                f"MRR={m['single_source']['mrr']:.3f}"
            )
            self.stdout.write(
                f"  Multi-source n={m['multi_source']['n']}  "
                f"Recall@5={m['multi_source']['recall@5']:.3f}  "
                f"Full-Coverage@5={m['multi_source']['full_coverage@5']:.3f}"
            )
            self.stdout.write(f"  No-answer n={m['no_answer']['n']} (excluded from ranking metrics)")

        cmp_counts = report['comparison_A_to_B']
        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("A → B comparison (ideal completion vs raw)"))
        self.stdout.write(
            f"  improve={cmp_counts['improve']}  regress={cmp_counts['regress']}  "
            f"same={cmp_counts['same']}  n/a={cmp_counts['n/a']}"
        )
        for q in report['per_question']:
            label = q['comparison']['A_to_B']
            a_out = q['arms']['A'].get('outcome')
            b_out = q['arms']['B'].get('outcome')
            self.stdout.write(
                f"  [{label}] {q['id']} ({q['case_kind']}): A={a_out} B={b_out}"
            )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Results written to {output_path}"))

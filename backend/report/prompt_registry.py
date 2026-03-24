from __future__ import annotations

from typing import Mapping, TypedDict


class PromptTemplateDefinition(TypedDict):
    version: str
    tone: str
    section_prompts: dict[str, str]
    suggested_key_actions: list[str]


DEFAULT_PROMPT_VERSION_BY_AUDIENCE: Mapping[str, str] = {
    "client": "client_v1",
    "manager": "manager_v1",
    "internal_team": "internal_team_v1",
    "self": "self_v1",
    "other": "other_v1",
}


PROMPT_TEMPLATES: Mapping[str, PromptTemplateDefinition] = {
    "client_v1": {
        "version": "client_v1",
        "tone": "Client-facing, clear, concise, and outcome-focused. Avoid jargon unless necessary.",
        "section_prompts": {
            "context": "Briefly describe the timeframe and relevant background.",
            "key_actions": "List the key actions taken (max 6), written as short, concrete bullets.",
            "outcome_summary": "Summarize the outcome in plain language and highlight impact.",
            "narrative_explanation": "Optional: add any helpful narrative, rationale, or constraints.",
        },
        "suggested_key_actions": [
            "Reallocated budget",
            "Prioritized stability",
            "Adjusted targeting",
            "Paused weak segments",
            "Refocused strategy",
            "Simplified structure",
        ],
    },
    "manager_v1": {
        "version": "manager_v1",
        "tone": "Manager-facing, structured, and decision-oriented. Emphasize progress, risks, and next steps.",
        "section_prompts": {
            "context": "State the situation and timeframe succinctly.",
            "key_actions": "List the most important actions and decisions (max 6).",
            "outcome_summary": "Summarize results, key learnings, and any tradeoffs.",
            "narrative_explanation": "Optional: include blockers, dependencies, or follow-ups.",
        },
        "suggested_key_actions": [
            "Shifted budget focus",
            "Delayed expansion",
            "Reduced complexity",
            "Balanced risk and growth",
            "Reprioritized channels",
            "Took conservative approach",
        ],
    },
    "internal_team_v1": {
        "version": "internal_team_v1",
        "tone": "Internal team-facing, tactical, and collaborative. Include enough detail for teammates to pick up context.",
        "section_prompts": {
            "context": "Describe the scenario, scope, and constraints.",
            "key_actions": "List actions taken with enough specificity to be repeatable (max 6).",
            "outcome_summary": "Summarize outcomes and what changed.",
            "narrative_explanation": "Optional: include technical notes or rationale.",
        },
        "suggested_key_actions": [
            "Paused low performers",
            "Consolidated setup",
            "Adjusted pacing",
            "Reallocated resources",
            "Tested new direction",
            "Reduced operational load",
        ],
    },
    "self_v1": {
        "version": "self_v1",
        "tone": "Personal reflection, concise and honest. Focus on what happened and what you learned.",
        "section_prompts": {
            "context": "Capture the context and timeframe for your own reference.",
            "key_actions": "List the key actions you took (max 6).",
            "outcome_summary": "Summarize what you achieved and what remains.",
            "narrative_explanation": "Optional: add reflections and lessons learned.",
        },
        "suggested_key_actions": [
            "Chose stability",
            "Delayed experimentation",
            "Validated assumptions",
            "Reduced exposure",
            "Adjusted priorities",
            "Simplified approach",
        ],
    },
    "other_v1": {
        "version": "other_v1",
        "tone": "Neutral, clear, and adaptable. Keep language appropriate for the specified audience.",
        "section_prompts": {
            "context": "Describe the context and timeframe.",
            "key_actions": "List up to 6 key actions taken.",
            "outcome_summary": "Summarize the outcome at a high level.",
            "narrative_explanation": "Optional: add any extra narrative as needed.",
        },
        "suggested_key_actions": [
            "Adjusted strategy",
            "Reallocated focus",
            "Paused underperformance",
            "Refined approach",
            "Simplified structure",
            "Balanced experimentation",
        ],
    },
}


def get_default_prompt_version_for_audience(audience_type: str) -> str:
    try:
        return DEFAULT_PROMPT_VERSION_BY_AUDIENCE[audience_type]
    except KeyError:
        raise ValueError(f"Unknown audience_type: {audience_type}")


def get_template_definition_for_version(version: str) -> PromptTemplateDefinition:
    try:
        return PROMPT_TEMPLATES[version]
    except KeyError:
        raise ValueError(f"Unknown audience_prompt_version: {version}")

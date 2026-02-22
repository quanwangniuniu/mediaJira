import type {
  CreatePatternStepPayload,
  OperationGroup,
  PatternStep,
  PatternStepType,
  TimelineItem,
} from '@/types/patterns';
import { isOperationGroup } from '@/types/patterns';

type GroupItemPayload = {
  type: Exclude<PatternStepType, 'GROUP'>;
  params: Record<string, unknown>;
  disabled: boolean;
};

function buildStepPayload(step: PatternStep, seq: number): CreatePatternStepPayload {
  switch (step.type) {
    case 'APPLY_FORMULA':
      return { seq, type: step.type, disabled: step.disabled, params: { target: step.target, a1: step.a1, formula: step.formula } };
    case 'INSERT_ROW':
      return { seq, type: step.type, disabled: step.disabled, params: step.params } as CreatePatternStepPayload;
    case 'INSERT_COLUMN':
      return { seq, type: step.type, disabled: step.disabled, params: step.params } as CreatePatternStepPayload;
    case 'DELETE_COLUMN':
      return { seq, type: step.type, disabled: step.disabled, params: step.params } as CreatePatternStepPayload;
    case 'FILL_SERIES':
      return { seq, type: step.type, disabled: step.disabled, params: step.params } as CreatePatternStepPayload;
    case 'SET_COLUMN_NAME':
      return { seq, type: step.type, disabled: step.disabled, params: step.params } as CreatePatternStepPayload;
    case 'APPLY_HIGHLIGHT':
      return { seq, type: step.type, disabled: step.disabled, params: step.params } as CreatePatternStepPayload;
    default: {
      const _: never = step;
      return _;
    }
  }
}

/** Build CreatePatternPayload steps array from timeline items (preserves GROUP structure). */
export function timelineItemsToCreateSteps(items: TimelineItem[]): CreatePatternStepPayload[] {
  const out: CreatePatternStepPayload[] = [];
  let seq = 1;
  for (const item of items) {
    if (isOperationGroup(item)) {
      const groupItems: GroupItemPayload[] = item.items.map((s) => {
        const pl = buildStepPayload(s, 0);
        return { type: pl.type as Exclude<PatternStepType, 'GROUP'>, params: pl.params, disabled: pl.disabled };
      });
      out.push({
        seq,
        type: 'GROUP',
        disabled: false,
        params: {
          name: item.name,
          items: groupItems,
        },
      });
      seq += 1;
    } else {
      out.push(buildStepPayload(item, seq));
      seq += 1;
    }
  }
  return out;
}

/** Remove a timeline item by id (step or group). Deleting a group removes all children. */
export function deleteTimelineItemById(items: TimelineItem[], id: string): TimelineItem[] {
  const result: TimelineItem[] = [];
  for (const item of items) {
    if (item.id === id) continue;
    if (isOperationGroup(item)) {
      result.push({
        ...item,
        items: item.items.filter((s) => s.id !== id),
      });
    } else {
      result.push(item);
    }
  }
  return result;
}

/** Update a timeline item by id (step or group). For groups, updates can include name, collapsed, items. */
export function updateTimelineItemById(
  items: TimelineItem[],
  id: string,
  updates:
    | Partial<PatternStep>
    | Partial<Pick<OperationGroup, 'name' | 'collapsed' | 'items'>>
): TimelineItem[] {
  return items.map((item): TimelineItem => {
    if (item.id === id) {
      if (isOperationGroup(item)) {
        const g = updates as Partial<OperationGroup>;
        if (typeof g.name === 'string') return { ...item, name: g.name };
        if (typeof g.collapsed === 'boolean') return { ...item, collapsed: g.collapsed };
        if (Array.isArray(g.items)) return { ...item, items: g.items };
        return item;
      }
      return { ...item, ...(updates as Partial<PatternStep>) } as TimelineItem;
    }
    if (isOperationGroup(item)) {
      return {
        ...item,
        items: item.items.map((s): PatternStep =>
          s.id === id ? { ...s, ...(updates as Partial<PatternStep>) } as PatternStep : s
        ),
      };
    }
    return item;
  });
}

/** Find a step by id in timeline (root or inside a group). */
export function findStepById(items: TimelineItem[], id: string): PatternStep | null {
  for (const item of items) {
    if (isOperationGroup(item)) {
      const found = item.items.find((s) => s.id === id);
      if (found) return found;
    } else if (item.id === id) return item;
  }
  return null;
}

/** Find index of item by id in the top-level timeline list. */
export function findTimelineItemIndexById(items: TimelineItem[], id: string): number {
  return items.findIndex((item) => item.id === id);
}

/**
 * Move a step out of a group so it becomes a standalone timeline item (inserted right after the group).
 * If the group has one item left after the move, that item is also ungrouped (group is removed).
 */
export function moveStepOutOfGroup(
  items: TimelineItem[],
  groupId: string,
  step: PatternStep
): TimelineItem[] {
  const groupIdx = items.findIndex((item) => item.id === groupId);
  if (groupIdx === -1) return items;
  const group = items[groupIdx];
  if (!isOperationGroup(group)) return items;
  const remaining = group.items.filter((s) => s.id !== step.id);
  const before = items.slice(0, groupIdx);
  const after = items.slice(groupIdx + 1);
  if (remaining.length === 0) {
    return [...before, step, ...after];
  }
  if (remaining.length === 1) {
    const singleStep = remaining[0];
    return [...before, singleStep, step, ...after];
  }
  const updatedGroup: OperationGroup = {
    ...group,
    items: remaining,
  };
  return [...before, updatedGroup, step, ...after];
}

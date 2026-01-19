'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type JiraFieldCommitStrategy = 'immediate' | 'blur' | 'explicit';

export interface JiraFieldConfig {
  commit?: JiraFieldCommitStrategy;
  preserveDraftOnError?: boolean;
}

export interface JiraFieldState<TValue> {
  committedValue: TValue;
  optimisticValue?: TValue;
  draftValue?: TValue;
  isSaving: boolean;
  error: string | null;
}

export interface JiraFieldControllerOptions<TValues extends Record<string, any>> {
  initialValues: TValues;
  updateFieldApi: <TKey extends keyof TValues>(
    fieldKey: TKey,
    value: TValues[TKey]
  ) => Promise<TValues[TKey] | void>;
  fieldConfigs?: Partial<Record<keyof TValues, JiraFieldConfig>>;
}

export interface JiraFieldControllerApi<TValues extends Record<string, any>> {
  getFieldState: <TKey extends keyof TValues>(
    fieldKey: TKey
  ) => JiraFieldState<TValues[TKey]> & { value: TValues[TKey] };
  updateField: <TKey extends keyof TValues>(
    fieldKey: TKey,
    newValue: TValues[TKey]
  ) => Promise<boolean>;
  retryFieldUpdate: <TKey extends keyof TValues>(fieldKey: TKey) => Promise<boolean>;
  setFieldDraft: <TKey extends keyof TValues>(fieldKey: TKey, draftValue: TValues[TKey]) => void;
  clearFieldError: <TKey extends keyof TValues>(fieldKey: TKey) => void;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Update failed';
};

export function useJiraFieldController<TValues extends Record<string, any>>(
  options: JiraFieldControllerOptions<TValues>
): JiraFieldControllerApi<TValues> {
  const { initialValues, updateFieldApi, fieldConfigs } = options;

  const initialState = useMemo(() => {
    return Object.keys(initialValues).reduce((acc, key) => {
      const typedKey = key as keyof TValues;
      acc[typedKey] = {
        committedValue: initialValues[typedKey],
        optimisticValue: undefined,
        draftValue: undefined,
        isSaving: false,
        error: null,
      };
      return acc;
    }, {} as Record<keyof TValues, JiraFieldState<TValues[keyof TValues]>>);
  }, [initialValues]);

  const [fieldState, setFieldState] = useState(initialState);
  const fieldStateRef = useRef(fieldState);

  useEffect(() => {
    fieldStateRef.current = fieldState;
  }, [fieldState]);

  const requestIdRef = useRef<Record<keyof TValues, number>>({} as Record<keyof TValues, number>);
  const rollbackRef = useRef<Record<keyof TValues, TValues[keyof TValues]>>(
    {} as Record<keyof TValues, TValues[keyof TValues]>
  );
  const lastRequestedRef = useRef<Record<keyof TValues, TValues[keyof TValues] | undefined>>(
    {} as Record<keyof TValues, TValues[keyof TValues] | undefined>
  );

  const setFieldStateValue = useCallback(
    <TKey extends keyof TValues>(
      fieldKey: TKey,
      updater: Partial<JiraFieldState<TValues[TKey]>>
    ) => {
      setFieldState((prev) => ({
        ...prev,
        [fieldKey]: {
          ...prev[fieldKey],
          ...updater,
        },
      }));
    },
    []
  );

  const getFieldConfig = useCallback(
    <TKey extends keyof TValues>(fieldKey: TKey) => {
      return fieldConfigs?.[fieldKey] ?? {};
    },
    [fieldConfigs]
  );

  const updateField = useCallback(
    async <TKey extends keyof TValues>(fieldKey: TKey, newValue: TValues[TKey]) => {
      const config = getFieldConfig(fieldKey);
      const commitStrategy = config.commit ?? 'immediate';
      const currentState = fieldStateRef.current[fieldKey];

      const requestId = (requestIdRef.current[fieldKey] ?? 0) + 1;
      requestIdRef.current[fieldKey] = requestId;

      rollbackRef.current[fieldKey] = currentState.committedValue;
      lastRequestedRef.current[fieldKey] = newValue;

      setFieldStateValue(fieldKey, {
        // Jira-like: show immediate feedback while saving.
        optimisticValue: newValue,
        isSaving: true,
        error: null,
      });

      try {
        const result = await updateFieldApi(fieldKey, newValue);
        if (requestIdRef.current[fieldKey] !== requestId) {
          return false;
        }

        const committedValue = result ?? newValue;
        setFieldStateValue(fieldKey, {
          committedValue,
          optimisticValue: undefined,
          isSaving: false,
          error: null,
          draftValue: commitStrategy === 'explicit' ? committedValue : undefined,
        });
        return true;
      } catch (error) {
        if (requestIdRef.current[fieldKey] !== requestId) {
          return false;
        }

        const fallbackDraft = (currentState.draftValue ?? newValue) as TValues[TKey];
        setFieldStateValue(fieldKey, {
          committedValue: rollbackRef.current[fieldKey] as TValues[TKey],
          optimisticValue: undefined,
          isSaving: false,
          error: getErrorMessage(error),
          // Jira: keep draft for high-cost fields so users don't lose input.
          draftValue: config.preserveDraftOnError ? fallbackDraft : undefined,
        });
        return false;
      }
    },
    [getFieldConfig, setFieldStateValue, updateFieldApi]
  );

  const retryFieldUpdate = useCallback(
    async <TKey extends keyof TValues>(fieldKey: TKey) => {
      const lastRequested = lastRequestedRef.current[fieldKey];
      if (lastRequested === undefined) return false;
      return updateField(fieldKey, lastRequested as TValues[TKey]);
    },
    [updateField]
  );

  const setFieldDraft = useCallback(
    <TKey extends keyof TValues>(fieldKey: TKey, draftValue: TValues[TKey]) => {
      // Draft keeps UI responsive for blur-based fields (labels, etc).
      setFieldStateValue(fieldKey, { draftValue, optimisticValue: draftValue });
    },
    [setFieldStateValue]
  );

  const clearFieldError = useCallback(
    <TKey extends keyof TValues>(fieldKey: TKey) => {
      setFieldStateValue(fieldKey, { error: null });
    },
    [setFieldStateValue]
  );

  const getFieldState = useCallback(
    <TKey extends keyof TValues>(fieldKey: TKey) => {
      const state = fieldState[fieldKey] as JiraFieldState<TValues[TKey]>;
      return {
        ...state,
        value: state.optimisticValue ?? state.committedValue,
      };
    },
    [fieldState]
  );

  return {
    getFieldState,
    updateField,
    retryFieldUpdate,
    setFieldDraft,
    clearFieldError,
  };
}

"use client";

import { useState } from "react";
import { ScalingPlanForm } from "./ScalingPlanForm";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion";
import {
  OptimizationScalingAPI,
  ScalingPlan,
  ScalingStep,
} from "@/lib/api/optimizationScalingApi";

interface ScalingDetailProps {
  plan: ScalingPlan;
  loading: boolean;
  onRefresh?: () => void;
}

export default function ScalingDetail({
  plan,
  loading,
  onRefresh,
}: ScalingDetailProps) {
  // Edit state related
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [draftPlan, setDraftPlan] = useState<Partial<ScalingPlan>>(plan);
  const [savingPlan, setSavingPlan] = useState(false);
  const [creatingStep, setCreatingStep] = useState(false);
  const [newStepName, setNewStepName] = useState("");
  const [newStepPlannedChange, setNewStepPlannedChange] = useState("");
  const [newStepNotes, setNewStepNotes] = useState("");
  const [reviewSummary, setReviewSummary] = useState(plan.review_summary || "");
  const [reviewLessons, setReviewLessons] = useState(
    plan.review_lessons_learned || ""
  );
  const [reviewFuture, setReviewFuture] = useState(
    plan.review_future_actions || ""
  );
  const [savingReview, setSavingReview] = useState(false);

  const steps: ScalingStep[] = (plan as any).steps || [];

  const handleCreateStep = async () => {
    if (creatingStep) return;
    const name = newStepName.trim();
    const plannedChange = newStepPlannedChange.trim();
    const notes = newStepNotes.trim();
    if (!name && !plannedChange && !notes) return;

    try {
      setCreatingStep(true);
      const stepOrder =
        steps && steps.length > 0
          ? Math.max(...steps.map((s) => s.step_order || 0)) + 1
          : 1;

      await OptimizationScalingAPI.createScalingStep(plan.id, {
        step_order: stepOrder,
        name,
        planned_change: plannedChange,
        status: "planned",
        notes,
      });

      setNewStepName("");
      setNewStepPlannedChange("");
      setNewStepNotes("");
      onRefresh && onRefresh();
    } finally {
      setCreatingStep(false);
    }
  };

  const handleSaveReview = async () => {
    if (savingReview) return;
    try {
      setSavingReview(true);
      await OptimizationScalingAPI.updateScalingPlan(plan.id, {
        review_summary: reviewSummary,
        review_lessons_learned: reviewLessons,
        review_future_actions: reviewFuture,
        status: plan.status === "completed" ? plan.status : "completed",
      });
      onRefresh && onRefresh();
    } finally {
      setSavingReview(false);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "Not set";
    return new Date(value).toLocaleString();
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Not set";
    return new Date(value).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading scaling plan...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mr-4">
            Scaling Plan
          </h3>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-800">
            {plan.strategy} · {plan.status}
          </span>
          {/* Edit button positioned absolute at top-right, white background with gray border */}
          {!isEditingPlan && (
            <button
              type="button"
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 absolute right-4 top-4 z-10"
              onClick={() => {
                setIsEditingPlan(true);
                setDraftPlan(plan);
              }}
            >
              Edit Scaling
            </button>
          )}
        </div>
        {/* Edit mode, Jira-style field editing area */}
        {isEditingPlan ? (
          <div className="space-y-4">
            <ScalingPlanForm
              mode="edit"
              initialPlan={draftPlan}
              onChange={setDraftPlan}
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => setIsEditingPlan(false)}
                disabled={savingPlan}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-sm rounded-md text-white ${savingPlan ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700"}`}
                disabled={savingPlan}
                onClick={async () => {
                  if (!draftPlan || !plan.id) return;
                  try {
                    setSavingPlan(true);
                    await OptimizationScalingAPI.updateScalingPlan(plan.id, draftPlan);
                    setIsEditingPlan(false);
                    onRefresh && onRefresh();
                  } catch (e) {
                    // 可加toast
                  } finally {
                    setSavingPlan(false);
                  }
                }}
              >
                {savingPlan ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Scaling target
                </label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                  {plan.scaling_target || "Not specified"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max scaling limit
                </label>
                <p className="mt-1 text-gray-900">
                  {plan.max_scaling_limit || "Not specified"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stop / rollback conditions
                </label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                  {plan.stop_conditions || "Not specified"}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Risks & considerations
                </label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                  {plan.risk_considerations || "Not specified"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expected outcomes
                </label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                  {plan.expected_outcomes || "Not specified"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Started at
                  </label>
                  <p className="mt-1 text-gray-900">
                    {formatDate(plan.started_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Completed at
                  </label>
                  <p className="mt-1 text-gray-900">
                    {formatDate(plan.completed_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Accordion type="multiple" defaultValue={["steps"]}>
          <AccordionItem value="steps" className="border-none">
            <AccordionTrigger className="px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <h3 className="text-lg font-semibold text-gray-900">
                  Scaling Steps
                </h3>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  {steps.length} steps
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-0">
              {steps.length === 0 ? (
                <p className="text-gray-500 text-sm mb-4">
                  No scaling steps recorded yet.
                </p>
              ) : (
                <div className="space-y-3 mb-6">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className="border border-gray-200 rounded-md p-3 text-sm text-gray-900"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">
                          Step {step.step_order}: {step.name || "Unnamed step"}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800">
                          {step.status}
                        </span>
                      </div>
                      {step.planned_change && (
                        <div className="mt-1 text-gray-800">
                          <span className="font-semibold">Planned: </span>
                          {step.planned_change}
                        </div>
                      )}
                      {step.notes && (
                        <div className="mt-1 text-gray-800">
                          <span className="font-semibold">Notes: </span>
                          {step.notes}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-gray-500">
                        Executed at: {formatDateTime(step.executed_at)}
                      </div>
                      {step.stop_triggered && (
                        <div className="mt-1 text-xs text-red-600 font-semibold">
                          Stop conditions were triggered on this step.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new step */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Add Scaling Step
                </h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newStepName}
                    onChange={(e) => setNewStepName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Step name (e.g. Initial budget increase)"
                  />
                  <textarea
                    value={newStepPlannedChange}
                    onChange={(e) => setNewStepPlannedChange(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Planned change (e.g. increase budget from 500 to 800)"
                  />
                  <textarea
                    value={newStepNotes}
                    onChange={(e) => setNewStepNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Notes (expected metrics, risk, etc.)"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleCreateStep}
                      disabled={creatingStep}
                      className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
                        creatingStep
                          ? "bg-indigo-300 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {creatingStep ? "Adding..." : "Add Step"}
                    </button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Post-scaling review */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Post-scaling Review
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Summary
            </label>
            <textarea
              value={reviewSummary}
              onChange={(e) => setReviewSummary(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="High-level summary of scaling performance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lessons learned
            </label>
            <textarea
              value={reviewLessons}
              onChange={(e) => setReviewLessons(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="What worked well? What didn't?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Future improvements
            </label>
            <textarea
              value={reviewFuture}
              onChange={(e) => setReviewFuture(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Suggestions for future scaling tasks"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveReview}
              disabled={savingReview}
              className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
                savingReview
                  ? "bg-indigo-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {savingReview ? "Saving..." : "Save Review & Mark Completed"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

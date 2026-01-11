"use client";

import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion";
import {
  ExperimentAPI,
  Experiment,
  ExperimentProgressUpdate,
} from "@/lib/api/experimentApi";
import toast from "react-hot-toast";

interface ExperimentDetailProps {
  experiment: Experiment | null;
  loading: boolean;
  onRefresh?: () => void;
}

export default function ExperimentDetail({
  experiment,
  loading,
  onRefresh,
}: ExperimentDetailProps) {
  const [creatingUpdate, setCreatingUpdate] = useState(false);
  const [newUpdateNotes, setNewUpdateNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingOutcome, setUpdatingOutcome] = useState(false);
  const [localStatus, setLocalStatus] = useState(experiment?.status || "draft");
  const [localOutcome, setLocalOutcome] = useState(
    experiment?.experiment_outcome || ""
  );
  const [localOutcomeNotes, setLocalOutcomeNotes] = useState(
    experiment?.outcome_notes || ""
  );

  useEffect(() => {
    if (experiment) {
      setLocalStatus(experiment.status);
      setLocalOutcome(experiment.experiment_outcome || "");
      setLocalOutcomeNotes(experiment.outcome_notes || "");
    }
  }, [experiment]);

  const progressUpdates: ExperimentProgressUpdate[] =
    experiment?.progress_updates || [];

  const handleCreateProgressUpdate = async () => {
    if (creatingUpdate || !newUpdateNotes.trim() || !experiment) return;

    try {
      setCreatingUpdate(true);
      await ExperimentAPI.createProgressUpdate(experiment.id, {
        notes: newUpdateNotes.trim(),
      });
      toast.success("Progress update added successfully");
      setNewUpdateNotes("");
      onRefresh && onRefresh();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Failed to create progress update"
      );
    } finally {
      setCreatingUpdate(false);
    }
  };

  const handleUpdateStatus = async (newStatus: Experiment["status"]) => {
    if (updatingStatus || newStatus === localStatus || !experiment) return;

    try {
      setUpdatingStatus(true);
      await ExperimentAPI.updateExperiment(experiment.id, {
        status: newStatus,
      });
      setLocalStatus(newStatus);
      toast.success(`Experiment status updated to ${newStatus}`);
      onRefresh && onRefresh();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail?.status ||
          error.response?.data?.detail ||
          "Failed to update status"
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSetOutcome = async () => {
    if (updatingOutcome || localStatus !== "completed" || !experiment) return;

    try {
      setUpdatingOutcome(true);
      await ExperimentAPI.updateExperiment(experiment.id, {
        experiment_outcome: localOutcome as "win" | "lose" | "inconclusive" | null,
        outcome_notes: localOutcomeNotes || null,
      });
      toast.success("Experiment outcome saved");
      onRefresh && onRefresh();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to set experiment outcome"
      );
    } finally {
      setUpdatingOutcome(false);
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

  const formatIdList = (ids: string[] | undefined): string => {
    if (!ids || ids.length === 0) return "None";
    return ids.join(", ");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading experiment...</span>
        </div>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">No experiment found for this task.</p>
          <p className="text-gray-400 text-sm mt-2">
            The experiment may not have been created yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Experiment Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {experiment.name}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                localStatus === "running"
                  ? "bg-green-50 text-green-800"
                  : localStatus === "completed"
                  ? "bg-blue-50 text-blue-800"
                  : localStatus === "paused"
                  ? "bg-yellow-50 text-yellow-800"
                  : localStatus === "cancelled"
                  ? "bg-red-50 text-red-800"
                  : "bg-gray-50 text-gray-800"
              }`}
            >
              {localStatus}
            </span>
            {localStatus === "completed" && experiment.experiment_outcome && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  experiment.experiment_outcome === "win"
                    ? "bg-green-100 text-green-800"
                    : experiment.experiment_outcome === "lose"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {experiment.experiment_outcome}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hypothesis
              </label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                {experiment.hypothesis}
              </p>
            </div>

            {experiment.expected_outcome && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expected Outcome
                </label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                  {experiment.expected_outcome}
                </p>
              </div>
            )}

            {experiment.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                  {experiment.description}
                </p>
              </div>
            )}

            {experiment.success_metric && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Success Metric
                </label>
                <p className="mt-1 text-gray-900">{experiment.success_metric}</p>
              </div>
            )}

            {experiment.constraints && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Constraints
                </label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                  {experiment.constraints}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <p className="mt-1 text-gray-900">
                  {formatDate(experiment.start_date)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <p className="mt-1 text-gray-900">
                  {formatDate(experiment.end_date)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Started At
              </label>
              <p className="mt-1 text-gray-900">
                {formatDateTime(experiment.started_at)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={localStatus}
                onChange={(e) =>
                  handleUpdateStatus(
                    e.target.value as Experiment["status"]
                  )
                }
                disabled={updatingStatus}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="draft">Draft</option>
                <option value="running">Running</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Control & Variant Groups */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Control & Variant Groups
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Control Group
            </h4>
            {experiment.control_group &&
            ((experiment.control_group.campaigns?.length ?? 0) > 0 ||
              (experiment.control_group.ad_set_ids?.length ?? 0) > 0 ||
              (experiment.control_group.ad_ids?.length ?? 0) > 0) ? (
              <div className="space-y-2 text-sm">
                {(experiment.control_group.campaigns?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Campaigns: </span>
                    <span className="text-gray-700">
                      {formatIdList(experiment.control_group.campaigns)}
                    </span>
                  </div>
                )}
                {(experiment.control_group.ad_set_ids?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Ad Set IDs: </span>
                    <span className="text-gray-700">
                      {formatIdList(experiment.control_group.ad_set_ids)}
                    </span>
                  </div>
                )}
                {(experiment.control_group.ad_ids?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Ad IDs: </span>
                    <span className="text-gray-700">
                      {formatIdList(experiment.control_group.ad_ids)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No control group defined</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Variant Group
            </h4>
            {experiment.variant_group &&
            ((experiment.variant_group.campaigns?.length ?? 0) > 0 ||
              (experiment.variant_group.ad_set_ids?.length ?? 0) > 0 ||
              (experiment.variant_group.ad_ids?.length ?? 0) > 0) ? (
              <div className="space-y-2 text-sm">
                {(experiment.variant_group.campaigns?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Campaigns: </span>
                    <span className="text-gray-700">
                      {formatIdList(experiment.variant_group.campaigns)}
                    </span>
                  </div>
                )}
                {(experiment.variant_group.ad_set_ids?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Ad Set IDs: </span>
                    <span className="text-gray-700">
                      {formatIdList(experiment.variant_group.ad_set_ids)}
                    </span>
                  </div>
                )}
                {(experiment.variant_group.ad_ids?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Ad IDs: </span>
                    <span className="text-gray-700">
                      {formatIdList(experiment.variant_group.ad_ids)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No variant group defined</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Updates */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Accordion type="multiple" defaultValue={["updates"]}>
          <AccordionItem value="updates" className="border-none">
            <AccordionTrigger className="px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <h3 className="text-lg font-semibold text-gray-900">
                  Progress Updates
                </h3>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  {progressUpdates.length} updates
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-0">
              {progressUpdates.length === 0 ? (
                <p className="text-gray-500 text-sm mb-4">
                  No progress updates yet.
                </p>
              ) : (
                <div className="space-y-3 mb-6">
                  {progressUpdates.map((update) => (
                    <div
                      key={update.id}
                      className="border border-gray-200 rounded-md p-3 text-sm text-gray-900"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">
                          {formatDateTime(update.update_date)}
                        </div>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{update.notes}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new progress update */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Add Progress Update
                </h4>
                <div className="space-y-2">
                  <textarea
                    value={newUpdateNotes}
                    onChange={(e) => setNewUpdateNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter progress update notes..."
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleCreateProgressUpdate}
                      disabled={creatingUpdate || !newUpdateNotes.trim()}
                      className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
                        creatingUpdate || !newUpdateNotes.trim()
                          ? "bg-indigo-300 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {creatingUpdate ? "Adding..." : "Add Update"}
                    </button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Outcome Section (only when completed) */}
      {localStatus === "completed" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Experiment Outcome
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outcome
              </label>
              <select
                value={localOutcome}
                onChange={(e) => setLocalOutcome(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Not set</option>
                <option value="win">Win</option>
                <option value="lose">Lose</option>
                <option value="inconclusive">Inconclusive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outcome Notes
              </label>
              <textarea
                value={localOutcomeNotes}
                onChange={(e) => setLocalOutcomeNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Summarize learnings and conclusions from the experiment..."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSetOutcome}
                disabled={updatingOutcome || !localOutcome}
                className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
                  updatingOutcome || !localOutcome
                    ? "bg-indigo-300 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {updatingOutcome ? "Saving..." : "Save Outcome"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


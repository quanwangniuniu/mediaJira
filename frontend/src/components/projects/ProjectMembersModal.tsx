"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Mail, Trash2, Users, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  ProjectAPI,
  ProjectData,
  ProjectMemberData,
  ProjectMemberInvitePayload,
} from "@/lib/api/projectApi";

type ProjectMembersModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData | null;
  onMembersUpdated?: () => void;
};

const roleOptions: ProjectMemberInvitePayload["role"][] = [
  "member",
  "viewer",
  "owner",
];

const formatMemberLabel = (member: ProjectMemberData) => {
  const user = member.user || ({} as ProjectMemberData["user"]);
  return user.name || user.username || user.email || `User #${user.id}`;
};

export default function ProjectMembersModal({
  isOpen,
  onClose,
  project,
  onMembersUpdated,
}: ProjectMembersModalProps) {
  const [members, setMembers] = useState<ProjectMemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<ProjectMemberInvitePayload["role"]>("member");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const projectId = useMemo(() => project?.id ?? null, [project]);

  const loadMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await ProjectAPI.getProjectMembers(projectId);
      setMembers(data || []);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load project members.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isOpen) return;
    loadMembers();
  }, [isOpen, loadMembers]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    const email = inviteEmail.trim();
    if (!email) {
      toast.error("Please enter an email address.");
      return;
    }

    try {
      setInviting(true);
      const response = await ProjectAPI.inviteProjectMember(projectId, {
        email,
        role: inviteRole || "member",
      });
      if (response?.invitation || response?.user_exists === false) {
        toast.success("Invitation sent.");
      } else {
        toast.success("Member added.");
      }
      setInviteEmail("");
      setInviteRole("member");
      await loadMembers();
      onMembersUpdated?.();
    } catch (err: any) {
      const message =
        err?.response?.data?.email ||
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to invite member.";
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member: ProjectMemberData) => {
    if (!projectId) return;
    if (member.role === "owner") {
      toast.error("Project owners cannot be removed.");
      return;
    }

    const label = formatMemberLabel(member);
    if (!window.confirm(`Remove ${label} from this project?`)) {
      return;
    }

    try {
      setRemovingId(member.id);
      await ProjectAPI.removeProjectMember(projectId, member.id);
      setMembers((prev) => prev.filter((item) => item.id !== member.id));
      toast.success("Member removed.");
      onMembersUpdated?.();
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to remove member.";
      toast.error(message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Project Members
              </p>
              <p className="text-xs text-gray-500">
                {project?.name || "Project"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <form
            onSubmit={handleInvite}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <p className="text-sm font-semibold text-gray-900">
              Invite a member
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_140px_auto]">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <select
                value={inviteRole || "member"}
                onChange={(event) =>
                  setInviteRole(
                    event.target.value as ProjectMemberInvitePayload["role"]
                  )
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
                Invite
              </button>
            </div>
          </form>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                Current members
              </p>
              <button
                type="button"
                onClick={loadMembers}
                disabled={loading}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Refresh
              </button>
            </div>

            {loading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading members...
              </div>
            )}

            {!loading && error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}

            {!loading && !error && members.length === 0 && (
              <p className="mt-4 text-sm text-gray-500">
                No members found for this project.
              </p>
            )}

            {!loading && !error && members.length > 0 && (
              <div className="mt-4 space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatMemberLabel(member)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {member.user?.email || "No email on file"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        {member.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(member)}
                        disabled={removingId === member.id || member.role === "owner"}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingId === member.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        {member.role === "owner" ? "Owner" : "Remove"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import {
  Plus,
  Search,
  Filter,
  Mail,
  Users,
  BarChart3,
  Calendar,
} from "lucide-react";

// Mock data for email drafts
const mockEmailDrafts = [
  {
    id: 1,
    subject: "Welcome to Our Newsletter",
    status: "draft",
    created_at: "2024-01-15",
    updated_at: "2024-01-15",
    recipients: 0,
    template: "Welcome Template",
  },
  {
    id: 2,
    subject: "Product Launch Announcement",
    status: "scheduled",
    created_at: "2024-01-14",
    updated_at: "2024-01-14",
    recipients: 1250,
    template: "Product Launch Template",
  },
  {
    id: 3,
    subject: "Monthly Newsletter - January 2024",
    status: "sent",
    created_at: "2024-01-10",
    updated_at: "2024-01-12",
    recipients: 2500,
    template: "Newsletter Template",
  },
];

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  scheduled: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
};

export default function MailchimpPage() {
  const [emailDrafts, setEmailDrafts] = useState(mockEmailDrafts);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredDrafts = emailDrafts.filter((draft) => {
    const matchesSearch = draft.subject
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || draft.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateDraft = () => {
    // TODO: Implement create draft functionality
    console.log("Create new email draft");
  };

  const handleEditDraft = (id: number) => {
    // TODO: Implement edit draft functionality
    console.log("Edit draft:", id);
  };

  const handleDeleteDraft = (id: number) => {
    // TODO: Implement delete draft functionality
    setEmailDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Mail className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Mailchimp
                  </h1>
                  <p className="text-sm text-gray-500">
                    Email Campaign Management
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreateDraft}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Draft
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Drafts
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {emailDrafts.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Recipients
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {emailDrafts
                      .reduce((sum, draft) => sum + draft.recipients, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      emailDrafts.filter(
                        (draft) => draft.status === "scheduled"
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Sent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      emailDrafts.filter((draft) => draft.status === "sent")
                        .length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search email drafts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="sent">Sent</option>
                </select>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  More Filters
                </button>
              </div>
            </div>
          </div>

          {/* Email Drafts Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Email Drafts
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDrafts.map((draft) => (
                    <tr key={draft.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {draft.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            statusColors[
                              draft.status as keyof typeof statusColors
                            ]
                          }`}
                        >
                          {draft.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {draft.template}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {draft.recipients.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(draft.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditDraft(draft.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredDrafts.length === 0 && (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No email drafts found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Get started by creating your first email draft."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <div className="mt-6">
                  <button
                    onClick={handleCreateDraft}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Create Draft
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

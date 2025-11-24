import { useState, useEffect } from "react";

export interface EmailDraft {
  id: number;
  subject?: string; // May come from settings.subject_line
  preview_text?: string;
  from_name?: string; // May come from settings.from_name
  reply_to?: string; // May come from settings.reply_to
  status?: string; // "draft" | "scheduled" | "sent" or any other status
  created_at?: string;
  updated_at?: string;
  recipients?: number;
  send_time?: string; // Optional send time
  type?: string; // Campaign type
  template?: string;
  template_data?: {
    template: {
      name: string;
      type: string;
      content_type: string;
    };
    default_content: {
      // sections can be either array format (legacy) or object format (block ID -> HTML)
      sections?: Array<{
        content: string;
        type: string;
      }> | { [blockId: string]: string };
    };
  };
  // Also support accessing sections via settings.template.default_content path
  settings?: {
    subject_line?: string;
    preview_text?: string;
    from_name?: string;
    reply_to?: string;
    template?: {
      default_content?: {
        sections?: Array<{
          content: string;
          type: string;
        }> | { [blockId: string]: string };
      };
    };
  };
}

export interface CreateEmailDraftData {
  subject: string;
  preview_text?: string;
  from_name: string;
  reply_to: string;
  template_data?: {
    template: {
      name: string;
      type: string;
      content_type: string;
    };
    default_content: {
      // sections format: { [blockId: string]: string } - block ID mapped to HTML string
      sections: { [blockId: string]: string };
    };
  };
}

export interface UpdateEmailDraftData extends Partial<CreateEmailDraftData> {
  id: number;
}

// Mock API functions - replace with actual API calls
const mockApi = {
  // Get all email drafts
  getEmailDrafts: async (): Promise<EmailDraft[]> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        id: 1,
        subject: "Welcome to Our Newsletter",
        preview_text: "Thank you for subscribing to our newsletter",
        from_name: "Newsletter Team",
        reply_to: "newsletter@company.com",
        status: "draft",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        recipients: 0,
        template: "Welcome Template",
        template_data: {
          template: {
            name: "Welcome Template",
            type: "custom",
            content_type: "template",
          },
          default_content: {
            sections: [
              {
                content:
                  "Welcome to our newsletter! We're excited to have you on board.",
                type: "text",
              },
              {
                content:
                  "<h2>What to expect:</h2><ul><li>Weekly updates</li><li>Exclusive offers</li><li>Industry insights</li></ul>",
                type: "html",
              },
            ],
          },
        },
      },
      {
        id: 2,
        subject: "Product Launch Announcement",
        preview_text: "Exciting news about our latest product launch",
        from_name: "Product Team",
        reply_to: "product@company.com",
        status: "scheduled",
        created_at: "2024-01-14T14:30:00Z",
        updated_at: "2024-01-14T14:30:00Z",
        recipients: 1250,
        template: "Product Launch Template",
        template_data: {
          template: {
            name: "Product Launch Template",
            type: "html",
            content_type: "template",
          },
          default_content: {
            sections: [
              {
                content:
                  "<h1>🚀 New Product Launch!</h1><p>We're thrilled to announce our latest innovation...</p>",
                type: "html",
              },
            ],
          },
        },
      },
      {
        id: 3,
        subject: "Monthly Newsletter - January 2024",
        preview_text: "Your monthly dose of company updates and insights",
        from_name: "Marketing Team",
        reply_to: "marketing@company.com",
        status: "sent",
        created_at: "2024-01-10T09:00:00Z",
        updated_at: "2024-01-12T11:30:00Z",
        recipients: 2500,
        template: "Newsletter Template",
        template_data: {
          template: {
            name: "Newsletter Template",
            type: "html",
            content_type: "template",
          },
          default_content: {
            sections: [
              {
                content:
                  "<h1>January 2024 Newsletter</h1><p>Here's what happened this month...</p>",
                type: "html",
              },
            ],
          },
        },
      },
    ];
  },

  // Create new email draft
  createEmailDraft: async (data: CreateEmailDraftData): Promise<EmailDraft> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newDraft: EmailDraft = {
      id: Date.now(), // Simple ID generation for demo
      ...data,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recipients: 0,
      template: data.template_data.template.name,
    };

    return newDraft;
  },

  // Update email draft
  updateEmailDraft: async (data: UpdateEmailDraftData): Promise<EmailDraft> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const updatedDraft: EmailDraft = {
      id: data.id,
      subject: data.subject || "",
      preview_text: data.preview_text,
      from_name: data.from_name || "",
      reply_to: data.reply_to || "",
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recipients: 0,
      template: data.template_data?.template?.name,
      template_data: data.template_data,
    };

    return updatedDraft;
  },

  // Delete email draft
  deleteEmailDraft: async (id: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    // In real implementation, this would make an API call to delete the draft
  },

  // Preview email draft
  previewEmailDraft: async (id: number): Promise<EmailDraft> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // In real implementation, this would fetch the draft from the API
    const drafts = await mockApi.getEmailDrafts();
    const draft = drafts.find((d) => d.id === id);

    if (!draft) {
      throw new Error("Email draft not found");
    }

    return draft;
  },
};

export const useMailchimpData = () => {
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load email drafts
  const loadEmailDrafts = async () => {
    setLoading(true);
    setError(null);

    try {
      const drafts = await mockApi.getEmailDrafts();
      setEmailDrafts(drafts);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load email drafts"
      );
    } finally {
      setLoading(false);
    }
  };

  // Create new email draft
  const createEmailDraft = async (
    data: CreateEmailDraftData
  ): Promise<EmailDraft | null> => {
    setLoading(true);
    setError(null);

    try {
      const newDraft = await mockApi.createEmailDraft(data);
      setEmailDrafts((prev) => [newDraft, ...prev]);
      return newDraft;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create email draft"
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update email draft
  const updateEmailDraft = async (
    data: UpdateEmailDraftData
  ): Promise<EmailDraft | null> => {
    setLoading(true);
    setError(null);

    try {
      const updatedDraft = await mockApi.updateEmailDraft(data);
      setEmailDrafts((prev) =>
        prev.map((draft) => (draft.id === data.id ? updatedDraft : draft))
      );
      return updatedDraft;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update email draft"
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete email draft
  const deleteEmailDraft = async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await mockApi.deleteEmailDraft(id);
      setEmailDrafts((prev) => prev.filter((draft) => draft.id !== id));
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete email draft"
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Preview email draft
  const previewEmailDraft = async (id: number): Promise<EmailDraft | null> => {
    setLoading(true);
    setError(null);

    try {
      const draft = await mockApi.previewEmailDraft(id);
      return draft;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to preview email draft"
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load drafts on mount
  useEffect(() => {
    loadEmailDrafts();
  }, []);

  return {
    emailDrafts,
    loading,
    error,
    loadEmailDrafts,
    createEmailDraft,
    updateEmailDraft,
    deleteEmailDraft,
    previewEmailDraft,
  };
};

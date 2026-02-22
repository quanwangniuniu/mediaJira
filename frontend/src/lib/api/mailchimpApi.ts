import {
  EmailDraft,
  CreateEmailDraftData,
  UpdateEmailDraftData,
} from "@/hooks/useMailchimpData";
import {
  CanvasBlocks,
  CanvasBlock,
} from "@/components/mailchimp/email-builder/types";
import { generateSectionsHTML } from "@/components/mailchimp/email-builder/utils/htmlGenerator";
import api from "@/lib/api";

class MailchimpApiError extends Error {
  constructor(message: string, public status?: number, public response?: any) {
    super(message);
    this.name = "MailchimpApiError";
  }
}

const normalizeApiError = (error: any, fallbackMessage: string) => {
  const status = error?.response?.status;
  const errorData = error?.response?.data;
  const message =
    errorData?.error ||
    errorData?.detail ||
    error?.message ||
    fallbackMessage;
  const apiError = new MailchimpApiError(message, status);
  apiError.response = errorData;
  throw apiError;
};

/**
 * Create default canvas blocks with the specified structure
 */
const createDefaultCanvasBlocks = (): CanvasBlocks => {
  const timestamp = Date.now();

  // Header blocks - Text should come before Logo
  const headerTextBlock: CanvasBlock = {
    id: `Paragraph-${timestamp}-1`,
    type: "Paragraph",
    label: "Paragraph",
    content: "View this email in your browser",
    styles: {
      fontSize: 12,
      color: "#6b7280",
      textAlign: "center",
    },
  };

  const headerLogoBlock: CanvasBlock = {
    id: `Logo-${timestamp}-2`,
    type: "Logo",
    label: "Logo",
    content: "Logo",
  };

  // Body blocks - Heading should be first
  const bodyHeadingBlock: CanvasBlock = {
    id: `Heading-${timestamp}-3`,
    type: "Heading",
    label: "Heading",
    content: "Heading",
    styles: {
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "center",
      color: "#111827",
    },
  };

  const bodyImageBlock: CanvasBlock = {
    id: `Image-${timestamp}-4`,
    type: "Image",
    label: "Image",
    imageUrl: "",
    imageDisplayMode: "Original",
    imageLinkType: "Web",
    imageLinkValue: "",
    imageOpenInNewTab: true,
    imageAltText: "Image",
    imageScalePercent: 85,
    imageAlignment: "center",
    imageBlockStyles: {},
    imageFrameStyles: {},
  };

  const bodyButtonBlock: CanvasBlock = {
    id: `Button-${timestamp}-5`,
    type: "Button",
    label: "Button",
    content: "Button",
    buttonLinkType: "Web",
    buttonLinkValue: "",
    buttonOpenInNewTab: true,
    buttonBlockStyles: {},
    buttonShape: "Square",
    buttonAlignment: "center",
    buttonTextColor: "#ffffff",
    buttonBackgroundColor: "#111827",
    buttonSize: "Medium",
  };

  const bodyDividerBlock: CanvasBlock = {
    id: `Divider-${timestamp}-6`,
    type: "Divider",
    label: "Divider",
    dividerBlockStyles: {},
    dividerLineColor: "#e5e7eb",
    dividerStyle: "solid",
    dividerThickness: 1,
  };

  const bodySocialBlock: CanvasBlock = {
    id: `Social-${timestamp}-7`,
    type: "Social",
    label: "Social",
    content: "", // Social blocks may need content
    socialType: "Follow",
    socialLinks: [
      {
        id: `social-${timestamp}-1`,
        platform: "Facebook",
        url: "https://facebook.com/",
        label: "Facebook",
      },
      {
        id: `social-${timestamp}-2`,
        platform: "Instagram",
        url: "https://instagram.com/",
        label: "Instagram",
      },
      {
        id: `social-${timestamp}-3`,
        platform: "X",
        url: "https://x.com/",
        label: "Twitter",
      },
    ],
    socialBlockStyles: {},
    socialDisplay: "Icon only",
    socialIconStyle: "Plain",
    socialLayout: "Horizontal-bottom",
    socialIconColor: "#000000",
    socialSize: "Medium",
    socialAlignment: "center",
  };

  // Footer blocks
  const footerLogoBlock: CanvasBlock = {
    id: `Logo-${timestamp}-8`,
    type: "Logo",
    label: "Logo",
    content: "Logo",
  };

  const footerTextBlock: CanvasBlock = {
    id: `Paragraph-${timestamp}-9`,
    type: "Paragraph",
    label: "Paragraph",
    content: "Copyright (C) 2025 company. All rights reserved.",
    styles: {
      fontSize: 12,
      color: "#6b7280",
      textAlign: "center",
    },
  };

  return {
    header: [headerTextBlock, headerLogoBlock],
    body: [
      bodyHeadingBlock,
      bodyImageBlock,
      bodyButtonBlock,
      bodyDividerBlock,
      bodySocialBlock,
    ],
    footer: [footerLogoBlock, footerTextBlock],
  };
};

const createDefaultTemplateData = () => {
  const defaultBlocks = createDefaultCanvasBlocks();
  const sections = generateSectionsHTML(defaultBlocks);

  return {
    template: {
      name: "Blank Email Template",
      type: "custom",
      content_type: "template",
    },
    default_content: {
      sections,
    },
  };
};

const buildSettingsPayload = (data: Partial<CreateEmailDraftData>) => {
  const payload: Record<string, any> = {};
  if (data.subject !== undefined) {
    payload.subject_line = data.subject;
  }
  if (data.preview_text !== undefined) {
    payload.preview_text = data.preview_text;
  }
  if (data.from_name !== undefined) {
    payload.from_name = data.from_name;
  }
  if (data.reply_to !== undefined) {
    payload.reply_to = data.reply_to;
  }
  // Note: template_data is no longer supported in settings
  // Use updateEmailDraftTemplateContent for template content updates
  // template_id can still be used to change which template the campaign links to
  const resolvedTemplateId = data.templateId ?? data.template_id;
  if (resolvedTemplateId !== undefined) {
    payload.template_id = resolvedTemplateId;
  }
  return payload;
};

export interface MailchimpTemplate {
  id: number;
  name: string;
  thumbnail?: string | null;
  description?: string | null;
  category?: string | null;
  drag_and_drop?: boolean;
  responsive?: boolean;
  user?: number | null;
  default_content?: {
    sections?: { [blockId: string]: string };
  } | null;
}

export interface MailchimpDraftComment {
  id: number;
  body: string;
  status: "open" | "resolved";
  author_id: number;
  author_name: string;
  target_block_id?: string | null;
  resolved_by_id?: number | null;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const mailchimpApi = {
  // Get all email drafts
  getEmailDrafts: async (): Promise<EmailDraft[]> => {
    try {
      const response = await api.get("/api/mailchimp/email-drafts/");
      const data = response.data;
      return data?.results || data || [];
    } catch (error) {
      console.error("Failed to fetch email drafts:", error);
      normalizeApiError(error, "Failed to fetch email drafts");
      return []; // Unreachable but satisfies TypeScript
    }
  },

  // Get single email draft by ID
  getEmailDraft: async (id: number): Promise<EmailDraft> => {
    try {
      const response = await api.get(`/api/mailchimp/email-drafts/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch email draft ${id}:`, error);
      normalizeApiError(error, `Failed to fetch email draft ${id}`);
      return {} as EmailDraft; // Unreachable but satisfies TypeScript
    }
  },

  // Create new email draft
  // Note: template_id is required - the backend will clone the template
  createEmailDraft: async (data: CreateEmailDraftData): Promise<EmailDraft> => {
    try {
      const resolvedTemplateId = data.templateId ?? data.template_id;

      if (!resolvedTemplateId) {
        throw new Error("template_id is required to create an email draft");
      }

      const response = await api.post("/api/mailchimp/email-drafts/", {
        type: "regular",
        status: "draft",
        settings: {
          subject_line: data.subject,
          preview_text: data.preview_text,
          from_name: data.from_name,
          reply_to: data.reply_to,
          template_id: resolvedTemplateId,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create email draft:", error);
      normalizeApiError(error, "Failed to create email draft");
      return {} as EmailDraft; // Unreachable but satisfies TypeScript
    }
  },

  // Update email draft
  updateEmailDraft: async (
    id: number,
    data: Partial<CreateEmailDraftData>
  ): Promise<EmailDraft> => {
    try {
      const settingsPayload = buildSettingsPayload(data);
      const body: Record<string, any> = {};
      if (Object.keys(settingsPayload).length > 0) {
        body.settings = settingsPayload;
      }
      const response = await api.put(
        `/api/mailchimp/email-drafts/${id}/`,
        body
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update email draft ${id}:`, error);
      normalizeApiError(error, `Failed to update email draft ${id}`);
      return {} as EmailDraft; // Unreachable but satisfies TypeScript
    }
  },

  // Partial update email draft (only updates CampaignSettings, not template content)
  patchEmailDraft: async (
    id: number,
    data: Partial<CreateEmailDraftData>
  ): Promise<EmailDraft> => {
    try {
      const settingsPayload = buildSettingsPayload(data);
      // Remove template_data from settings - it should use updateEmailDraftTemplateContent instead
      delete settingsPayload.template_data;

      const body: Record<string, any> = {};
      if (Object.keys(settingsPayload).length > 0) {
        body.settings = settingsPayload;
      }
      const response = await api.patch(
        `/api/mailchimp/email-drafts/${id}/`,
        body
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to patch email draft ${id}:`, error);
      normalizeApiError(error, `Failed to patch email draft ${id}`);
      return {} as EmailDraft; // Unreachable but satisfies TypeScript
    }
  },

  // Update template content for a draft (only updates template, not campaign settings)
  updateEmailDraftTemplateContent: async (
    id: number,
    templateData: {
      template?: {
        name?: string;
        type?: string;
        content_type?: string;
        thumbnail?: string | null;
      };
      default_content: {
        sections: { [blockId: string]: string };
        links?: any;
      };
    }
  ): Promise<MailchimpTemplate> => {
    try {
      const response = await api.patch(
        `/api/mailchimp/email-drafts/${id}/template-content/`,
        { template_data: templateData }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Failed to update template content for draft ${id}:`,
        error
      );
      normalizeApiError(error, `Failed to update template content for draft ${id}`);
      return {} as MailchimpTemplate; // Unreachable but satisfies TypeScript
    }
  },

  // Delete email draft
  deleteEmailDraft: async (id: number): Promise<void> => {
    try {
      await api.delete(`/api/mailchimp/email-drafts/${id}/`);
    } catch (error) {
      console.error(`Failed to delete email draft ${id}:`, error);
      normalizeApiError(error, `Failed to delete email draft ${id}`);
    }
  },

  // Preview email draft
  previewEmailDraft: async (id: number): Promise<any> => {
    try {
      const response = await api.get(
        `/api/mailchimp/email-drafts/${id}/preview/`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to preview email draft ${id}:`, error);
      normalizeApiError(error, `Failed to preview email draft ${id}`);
      return null; // Unreachable but satisfies TypeScript
    }
  },

  // Get available templates (using new TemplateViewSet endpoint)
  getTemplates: async (): Promise<MailchimpTemplate[]> => {
    try {
      const response = await api.get("/api/mailchimp/templates/");
      const data = response.data;
      return data?.results || data || [];
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      normalizeApiError(error, "Failed to fetch templates");
      return []; // Unreachable but satisfies TypeScript
    }
  },

  // Template CRUD operations
  createTemplate: async (data: {
    name: string;
    type?: string;
    content_type?: string;
    active?: boolean;
    thumbnail?: string | null;
    default_content?: {
      sections: { [blockId: string]: string };
      links?: any;
    };
  }): Promise<MailchimpTemplate> => {
    try {
      const response = await api.post("/api/mailchimp/templates/", {
        name: data.name,
        type: data.type || "custom",
        content_type: data.content_type || "template",
        active: data.active !== undefined ? data.active : true,
        thumbnail: data.thumbnail,
        default_content: data.default_content,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create template:", error);
      normalizeApiError(error, "Failed to create template");
      return {} as MailchimpTemplate; // Unreachable but satisfies TypeScript
    }
  },

  updateTemplate: async (
    id: number,
    data: Partial<{
      name: string;
      type: string;
      content_type: string;
      active: boolean;
      thumbnail: string | null;
      default_content: {
        sections: { [blockId: string]: string };
        links?: any;
      };
    }>
  ): Promise<MailchimpTemplate> => {
    try {
      const response = await api.patch(
        `/api/mailchimp/templates/${id}/`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update template ${id}:`, error);
      normalizeApiError(error, `Failed to update template ${id}`);
      return {} as MailchimpTemplate; // Unreachable but satisfies TypeScript
    }
  },

  deleteTemplate: async (id: number): Promise<void> => {
    try {
      await api.delete(`/api/mailchimp/templates/${id}/`);
    } catch (error) {
      console.error(`Failed to delete template ${id}:`, error);
      normalizeApiError(error, `Failed to delete template ${id}`);
    }
  },

  getEmailDraftComments: async (
    draftId: number,
    statusFilter?: "open" | "resolved"
  ): Promise<MailchimpDraftComment[]> => {
    try {
      const query = statusFilter ? `?status=${statusFilter}` : "";
      const response = await api.get(
        `/api/mailchimp/email-drafts/${draftId}/comments/${query}`
      );
      const data = response.data;
      return data || [];
    } catch (error) {
      console.error(`Failed to fetch comments for draft ${draftId}:`, error);
      normalizeApiError(error, `Failed to fetch comments for draft ${draftId}`);
      return []; // Unreachable but satisfies TypeScript
    }
  },

  createEmailDraftComment: async (
    draftId: number,
    payload: { body: string; target_block_id?: string }
  ): Promise<MailchimpDraftComment> => {
    try {
      const response = await api.post(
        `/api/mailchimp/email-drafts/${draftId}/comments/`,
        payload
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to create comment for draft ${draftId}:`, error);
      normalizeApiError(error, `Failed to create comment for draft ${draftId}`);
      return {} as MailchimpDraftComment; // Unreachable but satisfies TypeScript
    }
  },

  updateEmailDraftComment: async (
    draftId: number,
    commentId: number,
    payload: { status: "open" | "resolved" }
  ): Promise<MailchimpDraftComment> => {
    try {
      const response = await api.patch(
        `/api/mailchimp/email-drafts/${draftId}/comments/${commentId}/`,
        payload
      );
      return response.data;
    } catch (error) {
      console.error(
        `Failed to update comment ${commentId} for draft ${draftId}:`,
        error
      );
      normalizeApiError(
        error,
        `Failed to update comment ${commentId} for draft ${draftId}`
      );
      return {} as MailchimpDraftComment; // Unreachable but satisfies TypeScript
    }
  },
};

// Export error class for use in components
export { MailchimpApiError };

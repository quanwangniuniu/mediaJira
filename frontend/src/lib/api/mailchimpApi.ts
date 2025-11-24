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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class MailchimpApiError extends Error {
  constructor(message: string, public status?: number, public response?: any) {
    super(message);
    this.name = "MailchimpApiError";
  }
}

// Helper function to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorData: any = null;

    try {
      errorData = await response.json();
      errorMessage = errorData.error || errorData.detail || errorMessage;

      // Handle authentication errors
      if (response.status === 401) {
        errorMessage = errorData.detail || "身份信息未提供或已过期，请重新登录";
      }
    } catch {
      // If response is not JSON, use the status text
      if (response.status === 401) {
        errorMessage = "身份信息未提供或已过期，请重新登录";
      }
    }

    const error = new MailchimpApiError(errorMessage, response.status);
    error.response = errorData;
    throw error;
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }
  return null;
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  let token = null;

  // Get token from Zustand auth store (same as other API files)
  if (typeof window !== "undefined") {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage);
        token = authData.state?.token;
      } catch (error) {
        console.warn("Failed to parse auth storage:", error);
      }
    }
  }

  const headers: { [key: string]: string } = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
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

export const mailchimpApi = {
  // Get all email drafts
  getEmailDrafts: async (): Promise<EmailDraft[]> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mailchimp/email-drafts/`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await handleApiResponse(response);
      return data?.results || data || [];
    } catch (error) {
      console.error("Failed to fetch email drafts:", error);
      throw error;
    }
  },

  // Get single email draft by ID
  getEmailDraft: async (id: number): Promise<EmailDraft> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mailchimp/email-drafts/${id}/`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error(`Failed to fetch email draft ${id}:`, error);
      throw error;
    }
  },

  // Create new email draft
  createEmailDraft: async (data: CreateEmailDraftData): Promise<EmailDraft> => {
    try {
      const templateData = data.template_data ?? createDefaultTemplateData();

      const response = await fetch(
        `${API_BASE_URL}/api/mailchimp/email-drafts/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            type: "regular",
            status: "draft",
            settings: {
              subject_line: data.subject,
              preview_text: data.preview_text,
              from_name: data.from_name,
              reply_to: data.reply_to,
              template_data: templateData,
            },
          }),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error("Failed to create email draft:", error);
      throw error;
    }
  },

  // Update email draft
  updateEmailDraft: async (
    id: number,
    data: Partial<CreateEmailDraftData>
  ): Promise<EmailDraft> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mailchimp/email-drafts/${id}/`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            settings: {
              subject_line: data.subject,
              preview_text: data.preview_text,
              from_name: data.from_name,
              reply_to: data.reply_to,
              template_data: data.template_data,
            },
          }),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error(`Failed to update email draft ${id}:`, error);
      throw error;
    }
  },

  // Partial update email draft
  patchEmailDraft: async (
    id: number,
    data: Partial<CreateEmailDraftData>
  ): Promise<EmailDraft> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mailchimp/email-drafts/${id}/`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            settings: {
              subject_line: data.subject,
              preview_text: data.preview_text,
              from_name: data.from_name,
              reply_to: data.reply_to,
              template_data: data.template_data,
            },
          }),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error(`Failed to patch email draft ${id}:`, error);
      throw error;
    }
  },

  // Delete email draft
  deleteEmailDraft: async (id: number): Promise<void> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mailchimp/email-drafts/${id}/`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      await handleApiResponse(response);
    } catch (error) {
      console.error(`Failed to delete email draft ${id}:`, error);
      throw error;
    }
  },

  // Preview email draft
  previewEmailDraft: async (id: number): Promise<any> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mailchimp/email-drafts/${id}/preview/`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error(`Failed to preview email draft ${id}:`, error);
      throw error;
    }
  },

  // Get available templates
  getTemplates: async (): Promise<any[]> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/mailchimp/email-drafts/templates/`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await handleApiResponse(response);
      return data?.results || data || [];
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      throw error;
    }
  },
};

// Export error class for use in components
export { MailchimpApiError };

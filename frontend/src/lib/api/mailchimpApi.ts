import {
  EmailDraft,
  CreateEmailDraftData,
  UpdateEmailDraftData,
} from "@/hooks/useMailchimpData";

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
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.detail || errorMessage;
    } catch {
      // If response is not JSON, use the status text
    }
    throw new MailchimpApiError(errorMessage, response.status);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }
  return null;
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
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
      const response = await fetch(
        `${API_BASE_URL}/api/mailchimp/email-drafts/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            type: "regular",
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

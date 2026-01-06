import {
  KlaviyoDraft,
  CreateKlaviyoDraftData,
  UpdateKlaviyoDraftData,
  ContentBlock,
} from "@/hooks/useKlaviyoData";
import {
  CanvasBlocks,
  CanvasBlock,
} from "@/components/mailchimp/email-builder/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class KlaviyoApiError extends Error {
  constructor(message: string, public status?: number, public response?: any) {
    super(message);
    this.name = "KlaviyoApiError";
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
        errorMessage = errorData.detail || "Authentication required. Please log in again.";
      }
    } catch {
      // If response is not JSON, use the status text
      if (response.status === 401) {
        errorMessage = "Authentication required. Please log in again.";
      }
    }

    const error = new KlaviyoApiError(errorMessage, response.status);
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
  };

  const bodyParagraphBlock: CanvasBlock = {
    id: `Paragraph-${timestamp}-6`,
    type: "Paragraph",
    label: "Paragraph",
    content:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    styles: {
      fontSize: 14,
      color: "#374151",
      textAlign: "left",
    },
  };

  // Footer blocks
  const footerSocialBlock: CanvasBlock = {
    id: `Social-${timestamp}-7`,
    type: "Social",
    label: "Social",
    socialLinks: [
      { id: "twitter", platform: "X", url: "", label: "X" },
      { id: "facebook", platform: "Facebook", url: "", label: "Facebook" },
      { id: "instagram", platform: "Instagram", url: "", label: "Instagram" },
    ],
    socialAlignment: "center",
  };

  const footerParagraphBlock: CanvasBlock = {
    id: `Paragraph-${timestamp}-8`,
    type: "Paragraph",
    label: "Paragraph",
    content:
      "No longer want to receive these emails? {% unsubscribe %}\nOrganization Name, Address",
    styles: {
      fontSize: 12,
      color: "#6b7280",
      textAlign: "center",
    },
  };

  const footerLogoBlock: CanvasBlock = {
    id: `Logo-${timestamp}-9`,
    type: "Logo",
    label: "Logo",
    content: "Klaviyo",
  };

  return {
    header: [headerTextBlock, headerLogoBlock],
    body: [
      bodyHeadingBlock,
      bodyImageBlock,
      bodyButtonBlock,
      bodyParagraphBlock,
    ],
    footer: [footerSocialBlock, footerParagraphBlock, footerLogoBlock],
  };
};

export const klaviyoApi = {
  // Get all email drafts
  getEmailDrafts: async (): Promise<KlaviyoDraft[]> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/klaviyo/klaviyo-drafts/`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await handleApiResponse(response);
      return data?.results || data || [];
    } catch (error) {
      console.error("Failed to fetch Klaviyo email drafts:", error);
      throw error;
    }
  },

  // Get single email draft by ID
  getEmailDraft: async (id: number): Promise<KlaviyoDraft> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/klaviyo/klaviyo-drafts/${id}/`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error(`Failed to fetch Klaviyo email draft ${id}:`, error);
      throw error;
    }
  },

  // Create new email draft
  createEmailDraft: async (data: CreateKlaviyoDraftData): Promise<KlaviyoDraft> => {
    try {
      // Build payload with only non-null values
      const payload: any = {
        subject: data.subject || "Untitled Email",
        status: data.status || "draft",
      };

      // Only include name if it's provided and not null
      if (data.name) {
        payload.name = data.name;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/klaviyo/klaviyo-drafts/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error("Failed to create Klaviyo email draft:", error);
      throw error;
    }
  },

  // Update email draft
  updateEmailDraft: async (
    id: number,
    data: UpdateKlaviyoDraftData
  ): Promise<KlaviyoDraft> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/klaviyo/klaviyo-drafts/${id}/`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error(`Failed to update Klaviyo email draft ${id}:`, error);
      throw error;
    }
  },

  // Partial update email draft (PATCH)
  patchEmailDraft: async (
    id: number,
    data: Partial<UpdateKlaviyoDraftData>
  ): Promise<KlaviyoDraft> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/klaviyo/klaviyo-drafts/${id}/`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error(`Failed to patch Klaviyo email draft ${id}:`, error);
      throw error;
    }
  },

  // Delete email draft
  deleteEmailDraft: async (id: number): Promise<void> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/klaviyo/klaviyo-drafts/${id}/`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok && response.status !== 204) {
        await handleApiResponse(response);
      }
    } catch (error) {
      console.error(`Failed to delete Klaviyo email draft ${id}:`, error);
      throw error;
    }
  },

  // Get default canvas blocks for new drafts
  getDefaultCanvasBlocks: (): CanvasBlocks => {
    return createDefaultCanvasBlocks();
  },
};

// Image upload and management API
export interface KlaviyoImageItem {
  id: number;
  name: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width?: number;
  height?: number;
  md5: string;
  preview_url: string;
  scan_status: string;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}

export interface KlaviyoImageListResponse {
  results: KlaviyoImageItem[];
  count: number;
  page: number;
  page_size: number;
}

export const klaviyoImageApi = {
  // Upload image
  uploadImage: async (
    file: File,
    onUploadProgress?: (percent: number) => void
  ): Promise<KlaviyoImageItem> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      const token = (() => {
        if (typeof window !== "undefined") {
          const authStorage = localStorage.getItem("auth-storage");
          if (authStorage) {
            try {
              const authData = JSON.parse(authStorage);
              return authData.state?.token;
            } catch (error) {
              console.warn("Failed to parse auth storage:", error);
            }
          }
        }
        return null;
      })();

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onUploadProgress) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onUploadProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error || `HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.open('POST', `${API_BASE_URL}/api/klaviyo/images/upload/`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Failed to upload Klaviyo image:", error);
      throw error;
    }
  },

  // List images
  getImages: async (params?: {
    search?: string;
    page?: number;
    page_size?: number;
    sort?: 'asc' | 'desc';
  }): Promise<KlaviyoImageListResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append('search', params.search);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params?.sort) queryParams.append('sort', params.sort);

      const url = `${API_BASE_URL}/api/klaviyo/images${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      return await handleApiResponse(response);
    } catch (error) {
      console.error("Failed to fetch Klaviyo images:", error);
      throw error;
    }
  },

  // Import image from URL
  importImageFromUrl: async (url: string, name?: string): Promise<KlaviyoImageItem> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/klaviyo/images/import-url/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url, name: name || 'Imported image' }),
        }
      );

      return await handleApiResponse(response);
    } catch (error) {
      console.error("Failed to import Klaviyo image from URL:", error);
      throw error;
    }
  },
};


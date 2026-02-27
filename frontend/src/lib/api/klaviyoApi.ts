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
import api from "@/lib/api";

class KlaviyoApiError extends Error {
  constructor(message: string, public status?: number, public response?: any) {
    super(message);
    this.name = "KlaviyoApiError";
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
  const apiError = new KlaviyoApiError(message, status);
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
      const response = await api.get("/api/klaviyo/klaviyo-drafts/");
      const data = response.data;
      return data?.results || data || [];
    } catch (error) {
      console.error("Failed to fetch Klaviyo email drafts:", error);
      normalizeApiError(error, "Failed to fetch Klaviyo email drafts");
      return []; // Unreachable but satisfies TypeScript
    }
  },

  // Get single email draft by ID
  getEmailDraft: async (id: number): Promise<KlaviyoDraft> => {
    try {
      const response = await api.get(`/api/klaviyo/klaviyo-drafts/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch Klaviyo email draft ${id}:`, error);
      normalizeApiError(error, `Failed to fetch Klaviyo email draft ${id}`);
      return {} as KlaviyoDraft; // Unreachable but satisfies TypeScript
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

      // Preserve template/canvas initialization when creating a draft
      if (Array.isArray(data.blocks)) {
        payload.blocks = data.blocks;
      }

      const response = await api.post("/api/klaviyo/klaviyo-drafts/", payload);
      const createdDraft = response.data as Partial<KlaviyoDraft>;
      if (createdDraft && typeof createdDraft.id === "number") {
        return createdDraft as KlaviyoDraft;
      }

      // Backward compatibility: some backend serializers returned create payload
      // without id. Resolve it from the latest drafts list to avoid /undefined routes.
      const draftsResponse = await api.get("/api/klaviyo/klaviyo-drafts/");
      const draftsData = draftsResponse.data;
      const drafts = (draftsData?.results || draftsData || []) as KlaviyoDraft[];
      const sortedDrafts = [...drafts].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      );
      const resolvedDraft =
        sortedDrafts.find(
          (draft) =>
            draft.subject === payload.subject &&
            (payload.name ? draft.name === payload.name : true)
        ) || sortedDrafts[0];

      if (resolvedDraft && typeof resolvedDraft.id === "number") {
        return resolvedDraft;
      }

      throw new Error("Draft created but response did not include draft id");
    } catch (error) {
      console.error("Failed to create Klaviyo email draft:", error);
      normalizeApiError(error, "Failed to create Klaviyo email draft");
      return {} as KlaviyoDraft; // Unreachable but satisfies TypeScript
    }
  },

  // Update email draft
  updateEmailDraft: async (
    id: number,
    data: UpdateKlaviyoDraftData
  ): Promise<KlaviyoDraft> => {
    try {
      const response = await api.put(`/api/klaviyo/klaviyo-drafts/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update Klaviyo email draft ${id}:`, error);
      normalizeApiError(error, `Failed to update Klaviyo email draft ${id}`);
      return {} as KlaviyoDraft; // Unreachable but satisfies TypeScript
    }
  },

  // Partial update email draft (PATCH)
  patchEmailDraft: async (
    id: number,
    data: Partial<UpdateKlaviyoDraftData>
  ): Promise<KlaviyoDraft> => {
    try {
      const response = await api.patch(
        `/api/klaviyo/klaviyo-drafts/${id}/`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to patch Klaviyo email draft ${id}:`, error);
      normalizeApiError(error, `Failed to patch Klaviyo email draft ${id}`);
      return {} as KlaviyoDraft; // Unreachable but satisfies TypeScript
    }
  },

  // Delete email draft
  deleteEmailDraft: async (id: number): Promise<void> => {
    try {
      await api.delete(`/api/klaviyo/klaviyo-drafts/${id}/`);
    } catch (error) {
      console.error(`Failed to delete Klaviyo email draft ${id}:`, error);
      normalizeApiError(error, `Failed to delete Klaviyo email draft ${id}`);
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

      const response = await api.post("/api/klaviyo/images/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event: { loaded: number; total?: number }) => {
          if (!onUploadProgress || !event.total) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          onUploadProgress(percent);
        },
      });

      return response.data;
    } catch (error) {
      console.error("Failed to upload Klaviyo image:", error);
      normalizeApiError(error, "Failed to upload Klaviyo image");
      return {} as KlaviyoImageItem; // Unreachable but satisfies TypeScript
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
      const response = await api.get("/api/klaviyo/images/", { params });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch Klaviyo images:", error);
      normalizeApiError(error, "Failed to fetch Klaviyo images");
      return { results: [], count: 0, page: 1, page_size: 0 }; // Unreachable but satisfies TypeScript
    }
  },

  // Import image from URL
  importImageFromUrl: async (url: string, name?: string): Promise<KlaviyoImageItem> => {
    try {
      const response = await api.post("/api/klaviyo/images/import-url/", {
        url,
        name: name || "Imported image",
      });
      return response.data;
    } catch (error) {
      console.error("Failed to import Klaviyo image from URL:", error);
      normalizeApiError(error, "Failed to import Klaviyo image from URL");
      return {} as KlaviyoImageItem; // Unreachable but satisfies TypeScript
    }
  },
};

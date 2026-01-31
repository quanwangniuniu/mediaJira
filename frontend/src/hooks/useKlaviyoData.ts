// Klaviyo Draft Types
export interface KlaviyoDraft {
  id: number;
  user: number | null;
  name: string | null;
  subject: string;
  status: "draft" | "scheduled" | "sent" | "archived";
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  blocks: ContentBlock[];
  recipients?: number;
}

export interface ContentBlock {
  id: number;
  email_draft: number;
  block_type: string;
  content: any;
  order: number;
}

export interface CreateKlaviyoDraftData {
  name?: string | null;
  subject: string;
  status?: "draft" | "scheduled" | "sent" | "archived";
  blocks?: Omit<ContentBlock, "id" | "email_draft">[];
}

export interface UpdateKlaviyoDraftData {
  name?: string | null;
  subject?: string;
  status?: "draft" | "scheduled" | "sent" | "archived";
  blocks?: Omit<ContentBlock, "id" | "email_draft">[];
}


import type { GoogleAd } from "@/lib/api/googleAdsApi";

export const baseGoogleAds: GoogleAd[] = [
  {
    id: 101,
    name: "Search - Brand Terms",
    type: "RESPONSIVE_SEARCH_AD",
    status: "DRAFT",
    final_urls: ["https://mediajira.com/search"],
    created_at: "2026-02-01T10:20:00Z",
    updated_at: "2026-02-02T08:10:00Z",
    responsive_search_ad: {
      headlines: [{ text: "Scale faster with MediaJira" }, { text: "Smarter campaign ops" }, { text: "AI workflow for ads" }],
      descriptions: [{ text: "Collaborate and launch faster." }, { text: "Unify ads, tasks, and approvals." }],
      path1: "solutions",
      path2: "growth",
    },
  },
  {
    id: 102,
    name: "Display - Product Promo",
    type: "RESPONSIVE_DISPLAY_AD",
    status: "PUBLISHED",
    final_urls: ["https://mediajira.com/display"],
    created_at: "2026-01-22T09:00:00Z",
    updated_at: "2026-02-03T06:30:00Z",
    responsive_display_ad: {
      business_name: "MediaJira",
      headlines: [{ text: "Run campaigns with confidence" }],
      long_headline: { text: "One platform for campaign execution and collaboration" },
      descriptions: [{ text: "Align teams and improve performance." }],
      call_to_action_text: "LEARN_MORE",
      marketing_images: [{ asset: "https://images.unsplash.com/photo-1557804506-669a67965ba0" }],
      square_marketing_images: [{ asset: "https://images.unsplash.com/photo-1460925895917-afdab827c52f" }],
      logo_images: [{ asset: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e" }],
    },
  },
  {
    id: 103,
    name: "Video - Retargeting",
    type: "VIDEO_RESPONSIVE_AD",
    status: "PAUSED",
    final_urls: ["https://mediajira.com/video"],
    created_at: "2026-01-11T11:10:00Z",
    updated_at: "2026-02-04T13:40:00Z",
    video_responsive_ad: {
      long_headlines: [{ text: "Drive high-intent actions with video ads" }],
      descriptions: [{ text: "Engage users with short-form creatives." }],
      videos: [{ id: 1, asset: "https://youtu.be/dQw4w9WgXcQ", video_id: "dQw4w9WgXcQ" }],
      call_to_actions_enabled: true,
      call_to_actions: [{ text: "SHOP_NOW" }],
    },
  },
];

export const allStatusAds: GoogleAd[] = [
  ...baseGoogleAds,
  { ...baseGoogleAds[0], id: 104, status: "PENDING_REVIEW", name: "Search - Pending Review" },
  { ...baseGoogleAds[0], id: 105, status: "APPROVED", name: "Search - Approved" },
  { ...baseGoogleAds[0], id: 106, status: "REJECTED", name: "Search - Rejected" },
];

export const tableCallbacks = {
  onView: () => {},
  onEdit: () => {},
  onDelete: () => {},
  onPause: () => {},
  onNextPage: () => {},
  onPreviousPage: () => {},
  onPageChange: () => {},
  onSort: () => {},
  onFilterChange: () => {},
  onClearFilters: () => {},
};

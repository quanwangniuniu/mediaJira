import type { AdGroupBriefInfo, TiktokMaterialItem } from "@/lib/api/tiktokApi";

export const sampleVideo: TiktokMaterialItem = {
  id: 501,
  type: "video",
  url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  previewUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
  title: "Demo product video",
  created_at: "2026-01-30T10:00:00Z",
  width: 1080,
  height: 1920,
};

export const sampleImages: TiktokMaterialItem[] = [
  {
    id: 601,
    type: "image",
    url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
    title: "Creative image 1",
    created_at: "2026-02-01T11:00:00Z",
    width: 1080,
    height: 1920,
  },
  {
    id: 602,
    type: "image",
    url: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
    title: "Creative image 2",
    created_at: "2026-02-01T11:10:00Z",
    width: 1080,
    height: 1920,
  },
];

export const sidebarGroups: AdGroupBriefInfo[] = [
  {
    id: "group-1",
    gid: "G-2026-001",
    name: "Brand Awareness Group",
    create_timestamp: Math.floor(Date.now() / 1000),
    creative_brief_info_item_list: [
      {
        id: "draft-1",
        ad_draft_id: "draft-1",
        name: "Video Draft A",
        creative_type: "SINGLE_VIDEO",
        create_timestamp: Math.floor(Date.now() / 1000),
        opt_status: 0,
      },
      {
        id: "draft-2",
        ad_draft_id: "draft-2",
        name: "Image Draft B",
        creative_type: "SINGLE_IMAGE",
        create_timestamp: Math.floor(Date.now() / 1000),
        opt_status: 1,
      },
    ],
  },
];

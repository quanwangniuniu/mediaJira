import type { AdCreative } from "@/lib/api/facebookMetaApi";

export const baseCreatives: AdCreative[] = [
  {
    id: "120001",
    name: "Spring Sale Carousel",
    status: "ACTIVE",
    call_to_action_type: "SHOP_NOW",
    object_story_spec: {
      link_data: {
        name: "Spring Collection 2026",
        link: "https://mediajira.com/spring",
        message: "Fresh arrivals with limited-time pricing.",
      },
    },
  },
  {
    id: "120002",
    name: "Webinar Lead Campaign",
    status: "IN_PROCESS",
    call_to_action_type: "SIGN_UP",
    object_story_spec: {
      link_data: {
        name: "Growth Webinar Registration",
        link: "https://mediajira.com/webinar",
        message: "Register now and reserve your seat.",
      },
    },
  },
  {
    id: "120003",
    name: "Retargeting Variant B",
    status: "WITH_ISSUES",
    call_to_action_type: "LEARN_MORE",
    object_story_spec: {
      link_data: {
        name: "Why Teams Switch to MediaJira",
        link: "https://mediajira.com/why",
        message: "Resolve approval bottlenecks faster.",
      },
    },
  },
  {
    id: "120004",
    name: "Legacy Promo Draft",
    status: "DELETED",
    call_to_action_type: "NO_BUTTON",
    object_story_spec: {
      link_data: {
        name: "Deprecated Campaign",
      },
    },
  },
];

export const manyCreatives: AdCreative[] = Array.from({ length: 18 }, (_, index) => {
  const seed = baseCreatives[index % baseCreatives.length];
  return {
    ...seed,
    id: `${130000 + index}`,
    name: `Creative ${index + 1} - ${seed.name}`,
  };
});

export const defaultTableCallbacks = {
  onView: () => {},
  onEdit: () => {},
  onDelete: () => {},
  onNextPage: () => {},
  onPreviousPage: () => {},
  onPageChange: () => {},
  onSort: () => {},
  onFilterChange: () => {},
  onClearFilters: () => {},
};

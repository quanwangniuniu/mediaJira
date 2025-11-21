export const VARIANTS: any = {
  // A
  "mobile.landscape.image-headline-logo-desc-arrow": {
    media: { ratio: "1.91:1", info: true },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["title", "", ""],
        ["logo", "desc", "cta-arrow"]
      ]
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 horizontal image"
    ]
  },

  // B
  "mobile.portrait.hero-logo-title-desc-buttons": {
    media: { ratio: "16:9", info: true },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["logo"],
        ["title"],
        ["desc"],
        ["btn-row"]
      ]
    },
    //panel: { type: "whiteCard", position: "below", slots: ["logo","title","desc","btn-row"] },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 image (portrait or landscape)"
    ]
  },

  // C
  "mobile.landscape.logo-headline-arrow": {
    media: { ratio: "1.91:1", info: true },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["logo", "title", "cta-arrow"]
      ]
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 horizontal image"
    ]
  },

  // D
  "mobile.landscape.overlay-headline-desc-business-arrow": {
    media: { ratio: "1.91:1", info: true, overlayTitle: "blackBar" },
    body: {
      cols: ["1fr", "auto"],
      rows: [
        ["desc", "cta-arrow"],
        ["biz", ""]
      ]
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 horizontal image"
    ]
  },

  // E
  "mobile.portrait.dark-hero-title-desc-biz-buttons": {
    media: { ratio: "9:16", info: true },
    panel: {
      type: "darkOverlay",
      withinMedia: true,
      slots: ["titleXL", "desc", "biz", "btn-ghost", "btn-primary"]
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 portrait image"
    ]
  },

  // G
  "mobile.sheet.logo-biz-title-desc-innerimage-ctabar": {
    media: { ratio: "9:16", info: true, close: true },
    panel: {
      type: "lightSheet",
      slots: ["info-icon","logo","biz","titleXL","desc","inner-image","cta-bar"],
      infoPosition: "top-left"
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 image"
    ]
  },

  // H (temporarily disabled)
  /*
  "mobile.landscape.centered-whitecard": {
    media: { ratio: "1:1", info: true },
    body: {
      cols: ["1fr", "auto"],
      rows: [
        ["logo"], 
        ["title"], 
        ["desc"],
        ["btn-primary"]
      ]
    },
    //panel: {
    //  type: "whiteCard",
    //  position: "center",
    //  withinMedia: true,
    //  slots: ["logo","title","desc","btn-primary"]
    //},
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 horizontal image"
    ]
  },
  */

  // I
  "mobile.landscape.title-desc-biz-textcta": {
    media: { ratio: "1.91:1", info: true },
    body: {
      cols: ["1fr", "auto"],
      rows: [
        ["title", ""],
        ["desc", ""],
        ["biz", "cta-text"]
      ]
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 horizontal image"
    ]
  },

  // J
  "mobile.landscape.image-plus-whitecard-below": {
    media: { ratio: "9:16", info: true, close: true },
    panel: {
      type: "whiteCard",
      position: "below",
      slots: ["logo", "titleXL", "desc", "biz", "dash-divider", "cta-text"]
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 image"
    ]
  },

  // K
  "mobile.portrait.dark-hero-biz-title-desc-innerimage-pillcta": {
    media: { ratio: "9:16", info: true, close: true },
    panel: {
      type: "darkOverlay",
      withinMedia: true,
      slots: ["biz", "titleXL", "desc", "inner-image", "btn-primary", "logo-float"],
      infoPosition: "bottom-left"
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 portrait image"
    ]
  },

  // L
  "mobile.landscape.logo-longheadline-biz-textcta": {
    media: { ratio: "1.91:1", info: true },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["logo", "longHeadline", ""],
        ["biz",  "",             "cta-text"]
      ]
    },
    lockHints: [
      "1 long headline",
      "1 horizontal image"
    ]
  },

  // M
  "mobile.landscape.image-logo-title-desc-biz-textcta": {
    media: { ratio: "1.91:1", info: true },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["logo", "title", ""],
        ["",    "desc",  ""],
        ["biz",    "",   "cta-text"]
      ]
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 horizontal image"
    ]
  },

  // N
  "mobile.inline.thumb-longheadline-adbiz-button": {
    media: { ratio: "none", info: true },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["thumb", "longHeadline", "btn-outline"],
        ["",      "ad-biz",       ""]
      ]
    }
  },

  // O
  "mobile.inline.thumb-title-desc-adbiz-button": {
    media: { ratio: "none", info: true },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["thumb", "title", "btn-outline"],
        ["",      "desc",  ""],
        ["",      "ad-biz",""]
      ]
    }
  },

  // P
  "mobile.inline.thumb-title-adbiz-button": {
    media: { ratio: "none", info: true },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["thumb", "title", "btn-outline"],
        ["",      "desc",  ""],
        ["",      "ad-biz",""]
      ]
    }
  },

  // Q
  "mobile.inline.header-title-thumbgrid-desc-adbiz-button": {
    media: { ratio: "none", info: true },
    header: { slots: ["title"] },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["thumb", "desc",     "btn-outline"],
        ["",      "ad-biz",   ""]
      ]
    }
  },

  // R
  "mobile.inline.header-title-thumb-desc-adbiz-button": {
    media: { ratio: "none", info: true },
    header: { slots: ["title"] },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["thumb", "desc",     "btn-outline"],
        ["",      "ad-biz",   ""]
      ]
    }
  },

  // S
  "mobile.inline.whitecard-logo-title-desc-biz-cta": {
    media: { ratio: "none", info: true },
    body: {
      cols: ["auto", "1fr"],
      rows: [
        ["logo", "title"],
        ["desc", ""],
        ["biz", ""],
        ["btn-primary", ""]
      ]
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description"
    ]
  },

  // T
  "mobile.sheet.logo-title-biz-desc-buttons": {
    media: { ratio: "none", info: true },
    panel: {
      type: "lightSheet",
      infoPosition: "bottom-left",
      slots: ["logo", "titleXL", "biz", "desc", "close", "btn-row"]
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 image"
    ]
  },

  // U
  "mobile.inline.inlinebox-title-desc-fab-footer": {
    media: { ratio: "none", info: false },
    panel: { type: "inlineBox", slots: ["titleXL", "desc", "cta-fab"] },
    body: {
      cols: ["auto","1fr","auto"],
      rows: [["info", "", "biz"]]
    }
  },

  // V
  "mobile.inline.darkcard-title-desc-fab-footer": {
    media: { ratio: "none", info: false },
    panel: { type: "darkCard", slots: ["titleXL", "desc", "cta-fab"] },
    body: {
      cols: ["auto","1fr","auto"],
      rows: [["info", "", "biz"]]
    }
  },

  // W
  "mobile.landscape.video-title-logo-desc-button": {
    media: { ratio: "1.91:1", info: true, mute: true },
    body: {
      cols: ["auto", "1fr", "auto"],
      rows: [
        ["title", "", ""],
        ["logo", "desc", "btn-primary"]
      ]
    }
  },

  // X
  "mobile.sheet.dark-logo-title-desc-videothumb-buttons": {
    media: { ratio: "9:16", info: false },
    panel: {
      type: "darkSheet",
      infoPosition: "bottom-left",
      slots: ["logo-title", "desc", "inner-video", "btn-row-check"]
    },
    lockHints: [
      "1 headline (or long headline)",
      "1 description",
      "1 image or video"
    ]
  },

  // Y
  "mobile.sheet.light-logoTitle-desc-video-cta": {
    media: { ratio: "none", info: false },
    panel: {
      type: "lightSheet",
      pattern: true,
      infoPosition: "top-right",
      slots: ["logo-title", "desc", "inner-video", "btn-primary-wide"]
    },
    lockHints: ["1 headline", "1 description", "1 image or video"]
  },

  // G1 - Gmail Promotions list row
  "gmail.promotions.row-sponsored-biz-headline-desc": {
    panel: {
      type: "gmailList",
      rowSlots: ["gmail-avatar","gmail-sponsored","gmail-biz-strong","title","desc","gmail-kebab","gmail-star"]
    },
    lockHints: [
      "1 headline",
      "1 description",
      "1 logo image"
    ]
  },

  // G2 - Gmail Promotions list row (description and headline swapped)
  "gmail.promotions.row-sponsored-biz-desc-headline": {
    panel: {
      type: "gmailList",
      rowSlots: ["gmail-avatar","gmail-sponsored","gmail-biz-strong","desc","title","gmail-kebab","gmail-star"]
    },
    lockHints: [
      "1 headline",
      "1 description",
      "1 logo image"
    ]
  },

  // G3 - Gmail Promotions list row (image instead of description, no star)
  "gmail.promotions.row-sponsored-biz-headline-image": {
    panel: {
      type: "gmailList",
      rowSlots: ["gmail-avatar","gmail-sponsored","gmail-biz-strong","title","gmail-image","desc","gmail-kebab"]
    },
    lockHints: [
      "1 headline",
      "1 description",
      "1 image",
      "1 logo image"
    ]
  },

  // Y1 - YouTube feed preview
  "youtube.feed.left-thumb-right-text": {
    panel: {
      type: "ytFeed"
    },
    lockHints: [
      "1 headline",
      "1 image",
      "1 logo image"
    ]
  },

  // Y2 - YouTube Home preview
  "youtube.home.ad-card": {
    panel: {
      type: "ytHome"
    },
    lockHints: [
      "1 headline",
      "1 description",
      "1 image"
    ]
  },

  // ========== Search Ad Variants ==========
  
  // S1: Standard 3-line search ad
  'search.mobile.standard-3line': {
    media: { ratio: 'none', info: false },
    panel: {
      type: 'searchAd',
      variant: 'standard',
      slots: ['search-url', 'search-headline', 'search-desc']
    },
    lockHints: [
      '1 headline',
      '1 description'
    ]
  },

  // ========== Video Ad Variants ==========
  
  // V1: Video feed preview (mirrors Y1)
  'video.youtube.in-stream-skippable': {
    panel: {
      type: 'ytFeed'
    },
    lockHints: [
      '1 headline',
      '1 image',
      '1 logo image'
    ]
  },

  // V2: Video home preview (mirrors Y2)
  'video.youtube.in-feed': {
    panel: {
      type: 'ytHome'
    },
    lockHints: [
      '1 headline',
      '1 description',
      '1 image'
    ]
  },
};


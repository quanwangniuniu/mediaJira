import React, { useMemo } from 'react';

// Import all preview components
import FacebookFeedPreview from './previews/FacebookFeedPreview';
import InstagramFeedPreview from './previews/InstagramFeedPreview';
import FacebookStoriesPreview from './previews/FacebookStoriesPreview';
import InstagramExplorePreview from './previews/InstagramExplorePreview';
import FacebookMarketplacePreview from './previews/FacebookMarketplacePreview';
import InstagramReelsPreview from './previews/InstagramReelsPreview';
import FacebookReelsPreview from './previews/FacebookReelsPreview';
import AdsOnFacebookReelsPreview from './previews/AdsOnFacebookReelsPreview';
import InstagramProfileFeedPreview from './previews/InstagramProfileFeedPreview';
import FacebookProfileFeedsPreview from './previews/FacebookProfileFeedsPreview';

interface MediaFile {
  id: number;
  type: 'photo' | 'video';
  url?: string;
  thumbnail?: string;
  caption?: string;
}

interface FacebookAdPreviewsProps {
  selectedMedia: MediaFile[];
  selectedContent: 'all' | string;
  primaryText?: string;
  scale?: 75 | 90 | 100;
}

const FacebookAdPreviews: React.FC<FacebookAdPreviewsProps> = ({
  selectedMedia,
  selectedContent,
  primaryText = '',
  scale = 75
}) => {
  // Generate individual random media for each preview component
  const generateRandomMediaForComponents = useMemo(() => {
    if (selectedContent !== 'all' || selectedMedia.length === 0) return {};
    
    // Generate 10 random media selections (one for each preview component)
    const randomSelections: { [key: string]: MediaFile } = {};
    const componentKeys = [
      'facebookFeed', 'instagramFeed', 'facebookStories', 'instagramExplore',
      'facebookMarketplace', 'instagramReels', 'instagramProfileFeed', 
      'facebookReels', 'adsOnFacebookReels', 'facebookProfileFeeds'
    ];
    
    componentKeys.forEach(key => {
      const randomIndex = Math.floor(Math.random() * selectedMedia.length);
      randomSelections[key] = selectedMedia[randomIndex];
    });
    
    return randomSelections;
  }, [selectedContent, selectedMedia]);

  // Determine which media to show based on selection
  const getDisplayMedia = () => {
    if (selectedContent === 'all') {
      return selectedMedia;
    }

    const [type, id] = selectedContent.split('-');
    return selectedMedia.filter(media =>
      media.type === type && media.id.toString() === id
    );
  };

  const displayMedia = getDisplayMedia();

  if (displayMedia.length === 0) {
    return null;
  }

  // For "all" selection, use individual random media for each component
  // For specific selection, use the selected media
  const getMediaForComponent = (componentKey: string) => {
    if (selectedContent === 'all') {
      return generateRandomMediaForComponents[componentKey] || selectedMedia[0];
    }
    return displayMedia[0];
  };

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-6 justify-items-center my-[-50px]">
      {/* Facebook Feed Preview */}
      <div>
        <FacebookFeedPreview 
          mediaToShow={getMediaForComponent('facebookFeed') || selectedMedia[0]} 
          primaryText={primaryText}
          showHeaderOnHover={true}
          scale={scale}
        />
      </div>

      {/* Instagram Feed Preview */}
      <div>
        <InstagramFeedPreview 
          mediaToShow={getMediaForComponent('instagramFeed') || selectedMedia[0]} 
          primaryText={primaryText}
          showHeaderOnHover={true}
          scale={scale}
        />
      </div>

      {/* Facebook Stories Preview */}
      <div className="-mt-32">
        <FacebookStoriesPreview 
          mediaToShow={getMediaForComponent('facebookStories') || selectedMedia[0]} 
          primaryText={primaryText}
          showHeaderOnHover={true}
          scale={scale}
        />
      </div>

      {/* Instagram Explore Preview */}
      <div className="-mt-32">
        <InstagramExplorePreview 
          mediaToShow={getMediaForComponent('instagramExplore') || selectedMedia[0]} 
          primaryText={primaryText}
          showHeaderOnHover={true}
          scale={scale}
        />
      </div>

      {/* Facebook Marketplace Preview */}
      <div className="-mt-32">
        <FacebookMarketplacePreview 
          mediaToShow={getMediaForComponent('facebookMarketplace') || selectedMedia[0]} 
          primaryText={primaryText}
          showHeaderOnHover={true}
          scale={scale}
        />
      </div>

      {/* Instagram Reels Preview */}
      <div className="-mt-32">
        <InstagramReelsPreview 
          mediaToShow={getMediaForComponent('instagramReels') || selectedMedia[0]} 
          primaryText={primaryText}
          showHeaderOnHover={true}
          scale={scale}
        />
      </div>

      {/* Instagram Profile Feed Preview */}
      <div className="-mt-32">
        <InstagramProfileFeedPreview 
          mediaToShow={getMediaForComponent('instagramProfileFeed') || selectedMedia[0]} 
          primaryText={primaryText}
          showHeaderOnHover={true}
          scale={scale}
        />
      </div>

      {/* Facebook Reels Preview */}
      <div className="-mt-32">
        <FacebookReelsPreview 
          mediaToShow={getMediaForComponent('facebookReels') || selectedMedia[0]} 
          primaryText={primaryText}
          showHeaderOnHover={true}
          scale={scale}
        />
      </div>

      {/* Ads on Facebook Reels Preview */}
      <div className="-mt-32">
        <AdsOnFacebookReelsPreview 
          mediaToShow={getMediaForComponent('adsOnFacebookReels') || selectedMedia[0]} 
          primaryText={primaryText}
          showHeaderOnHover={true}
          scale={scale}
        />
      </div>

      {/* Facebook Profile Feeds Preview */}
      <div className="-mt-32">
        <FacebookProfileFeedsPreview 
          mediaToShow={getMediaForComponent('facebookProfileFeeds') || selectedMedia[0]}
          showHeaderOnHover={true}
          scale={scale}
        />
      </div>
    </div>
  );
};

export default FacebookAdPreviews;

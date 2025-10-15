'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdCreative } from '@/lib/api/facebookMetaApi';
import { useFacebookMetaPreview } from '@/hooks/useFacebookMetaPreview';

interface MediaFile {
  id: number;
  type: 'photo' | 'video';
  thumbnail?: string;
  caption?: string;
  url?: string;
}
import AdNameSection from './AdNameSection';
import AdSetupSection from './AdSetupSection';
import AdCreativeSection from './AdCreativeSection';
import CreativeTestingSection from './CreativeTestingSection';
import EventDetailsSection from './EventDetailsSection';
import TrackingSection from './TrackingSection';
import CampaignScoreSection from './CampaignScoreSection';
import AdPreviewSection from './AdPreviewSection';
import BottomFooterSection from './BottomFooterSection';

interface EditAdCreativePageProps {
  adCreative: AdCreative;
}

export default function EditAdCreativePage({ adCreative }: EditAdCreativePageProps) {
  const router = useRouter();
  const [adName, setAdName] = useState(adCreative.name || '');
  const [isPublishing, setIsPublishing] = useState(false);
  const [format, setFormat] = useState<'single' | 'carousel'>('single');
  const [multiAdvertiserAds, setMultiAdvertiserAds] = useState(true);
  const [primaryText, setPrimaryText] = useState('primary text');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('http://www.example.com/page');
  const [addWebsiteUrl, setAddWebsiteUrl] = useState(true);
  const [displayLink, setDisplayLink] = useState('');
  const [callToAction, setCallToAction] = useState('Download');
  const [optimizeCreative, setOptimizeCreative] = useState(true);
  // Load initial media from adCreative
  const getInitialMedia = (): MediaFile[] => {
    const loadedMedia: MediaFile[] = [];
    
    // Load photos from object_story_spec
    if (adCreative.object_story_spec?.photo_data) {
      const photoData = Array.isArray(adCreative.object_story_spec.photo_data) 
        ? adCreative.object_story_spec.photo_data 
        : [adCreative.object_story_spec.photo_data];
      
      photoData.forEach((photo: any) => {
        if (photo) {
          const photoUrl = photo.url?.startsWith('http') 
            ? photo.url 
            : `${window.location.origin}${photo.url}`;
          
          loadedMedia.push({
            id: photo.id,
            type: 'photo',
            url: photoUrl,
            caption: photo.caption || '',
            thumbnail: photoUrl
          });
        }
      });
    }
    
    // Load videos from object_story_spec
    if (adCreative.object_story_spec?.video_data) {
      const videoData = Array.isArray(adCreative.object_story_spec.video_data)
        ? adCreative.object_story_spec.video_data
        : [adCreative.object_story_spec.video_data];
      
      videoData.forEach((video: any) => {
        if (video) {
          const videoUrl = (video.image_url || video.url)?.startsWith('http')
            ? (video.image_url || video.url)
            : `${window.location.origin}${video.image_url || video.url}`;
          
          loadedMedia.push({
            id: video.id,
            type: 'video',
            url: videoUrl,
            caption: video.title || video.message || '',
            thumbnail: videoUrl
          });
        }
      });
    }
    
    return loadedMedia;
  };

  const [selectedMedia, setSelectedMedia] = useState<MediaFile[]>(getInitialMedia());
  
  const {
    isPreviewEnabled,
    selectedFormat,
    togglePreview,
    changeFormat,
  } = useFacebookMetaPreview();

  const handleAdNameChange = (name: string) => {
    setAdName(name);
  };

  const handleCreateTemplate = () => {
    // TODO: Implement template creation logic
    console.log('Create template clicked');
  };

  const handleAdvancedPreview = () => {
    // TODO: Implement advanced preview logic
    console.log('Advanced preview clicked');
  };

  const handleShare = () => {
    // TODO: Implement share logic
    console.log('Share clicked');
  };

  const handleClose = () => {
    router.push('/facebook_meta');
  };

  const handleBack = () => {
    router.back();
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      // TODO: Implement publish logic
      console.log('Publishing ad creative:', { id: adCreative.id, name: adName });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect after successful publish
      router.push('/facebook_meta');
    } catch (error) {
      console.error('Error publishing ad creative:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-3 pb-28">
      {/* Main Content Grid */}
      <div className="flex justify-center px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[492.2px_604.9px] gap-3 w-full max-w-[1109.1px]">
          {/* Left Column */}
          <div className="space-y-3">
          {/* Ad Name Section */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 h-[104px]">
            <AdNameSection
              adName={adName}
              onAdNameChange={handleAdNameChange}
              onCreateTemplate={handleCreateTemplate}
            />
          </div>

          {/* Ad Setup Section */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <AdSetupSection
              format={format}
              onFormatChange={setFormat}
              multiAdvertiserAds={multiAdvertiserAds}
              onMultiAdvertiserAdsChange={setMultiAdvertiserAds}
            />
          </div>

          {/* Ad Creative Section */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
              <AdCreativeSection
                adCreativeId={adCreative.id}
                primaryText={primaryText}
                onPrimaryTextChange={setPrimaryText}
                headline={headline}
                onHeadlineChange={setHeadline}
                description={description}
                onDescriptionChange={setDescription}
                websiteUrl={websiteUrl}
                onWebsiteUrlChange={setWebsiteUrl}
                addWebsiteUrl={addWebsiteUrl}
                onAddWebsiteUrlChange={setAddWebsiteUrl}
                displayLink={displayLink}
                onDisplayLinkChange={setDisplayLink}
                callToAction={callToAction}
                onCallToActionChange={setCallToAction}
                optimizeCreative={optimizeCreative}
                onOptimizeCreativeChange={setOptimizeCreative}
                selectedMedia={selectedMedia}
                onSelectedMediaChange={setSelectedMedia}
              />
          </div>

          {/* Creative Testing Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <CreativeTestingSection />
          </div>

          {/* Event Details Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <EventDetailsSection />
          </div>

          {/* Tracking Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <TrackingSection />
          </div>
        </div>

        {/* Right Column (sticky including Campaign Score) */}
        <div>
          <div className="sticky top-4">
            <div className="space-y-3 overflow-visible">
              {/* Campaign Score Section */}
              <div className="bg-white p-1 rounded-lg border border-gray-200">
                <CampaignScoreSection
                  score={100}
                  recommendation="You're using our recommended setup."
                />
              </div>

              {/* Ad Preview Section */}
              <div className="bg-white rounded-lg border border-gray-200">
                <AdPreviewSection
                  isPreviewEnabled={isPreviewEnabled}
                  onPreviewToggle={togglePreview}
                  selectedFormat={selectedFormat}
                  onFormatChange={changeFormat}
                  onAdvancedPreview={handleAdvancedPreview}
                  onShare={handleShare}
                  selectedMedia={selectedMedia}
                  primaryText={primaryText}
                  adCreative={adCreative}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Bottom Footer */}
      <BottomFooterSection
        onClose={handleClose}
        onBack={handleBack}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { Ellipsis, ChevronRight, ChevronLeft, Heart, MessageCircle, Send, Bookmark, Instagram } from 'lucide-react';
import PreviewHeader from './PreviewHeader';
import PreviewExpandModal from '../PreviewExpandModal';

interface MediaFile {
  id: number;
  type: 'photo' | 'video';
  url?: string;
  thumbnail?: string;
  caption?: string;
}

interface InstagramExplorePreviewProps {
  mediaToShow: MediaFile;
  primaryText?: string;
  showHeaderOnHover?: boolean;
  scale?: 75 | 90 | 100;
}

const InstagramExplorePreviewContent: React.FC<InstagramExplorePreviewProps> = ({
  mediaToShow,
  primaryText,
}) => {
  const pageName = 'page name';
  return (
    <>
      <div className="h-[613px] w-[307px] mt-4 relative bg-gray-200 rounded-sm group flex-1 overflow-hidden flex flex-col justify-center">
        <div className="bg-white shadow-md">
          <div className="bg-gray-100 relative flex items-center justify-between py-2 px-1">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-xs text-gray-70 font-medium absolute left-1/2 -translate-x-1/2">Explore</span>
            <div className="w-5"></div>
          </div>
          <div className="flex items-center p-2">
            <div className="w-10 h-10 pr-2 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                {mediaToShow.type == 'video' ? (
                  <video
                    src={mediaToShow.url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={mediaToShow.url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">{pageName}</p>
              <p className="text-xs">Sponsored</p>
            </div>
            <div className="ml-auto">
              <Ellipsis className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between items-center px-2 pb-2">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5" />
              <MessageCircle className="w-5 h-5" />
              <Send className="w-5 h-5" />
            </div>
            <Bookmark className="w-5 h-5" />
          </div>
          {primaryText && (
            <div className="px-2">
              <p className="text-xs text-gray-900 mb-10">
                {primaryText}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const InstagramExplorePreview: React.FC<InstagramExplorePreviewProps> = ({
  mediaToShow,
  primaryText,
  showHeaderOnHover = false,
  scale = 75
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getScaleClass = () => {
    if (scale === 75) return 'scale-75';
    if (scale === 90) return 'scale-90';
    return 'scale-100';
  };

  return (
    <div
      className={`w-[307px] h-[613px] flex flex-col ${getScaleClass()}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowDropdown(false);
      }}
    >
      <PreviewHeader
        title="Instagram Explore"
        icon={<Instagram />}
        isVisible={showHeaderOnHover ? isHovered : true}
        showDropdown={showDropdown}
        onToggleDropdown={() => setShowDropdown(!showDropdown)}
        onExpand={() => setIsModalOpen(true)}
        onReportProblem={() => console.log('Report Instagram Explore problem')}
      />
      <InstagramExplorePreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      <PreviewExpandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Instagram Explore"
      >
        <InstagramExplorePreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      </PreviewExpandModal>
    </div>
  );
};

export default InstagramExplorePreview;

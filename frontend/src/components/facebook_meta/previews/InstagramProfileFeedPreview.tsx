import React, { useState } from 'react';
import { Ellipsis, ChevronRight, Heart, MessageCircle, Send, Bookmark, Instagram } from 'lucide-react';
import PreviewHeader from './PreviewHeader';
import PreviewExpandModal from '../PreviewExpandModal';

interface MediaFile {
  id: number;
  type: 'photo' | 'video';
  url?: string;
  thumbnail?: string;
  caption?: string;
}

interface InstagramProfileFeedPreviewProps {
  mediaToShow: MediaFile;
  primaryText: string;
  showHeaderOnHover?: boolean;
  scale?: 75 | 90 | 100;
}

const InstagramProfileFeedPreviewContent: React.FC<InstagramProfileFeedPreviewProps> = ({
  mediaToShow,
  primaryText,
}) => {
  const pageName = 'page name';
  return (
    <>
    <div className="h-[613px] w-[307px] mt-4 relative bg-gray-200 rounded-sm group flex-1 overflow-hidden flex flex-col justify-center">
        <div className="bg-white rounded-sm shadow-md">
          <div className="text-center">
            <div className="text-gray-400 text-xs">kaiblue</div>
            <div className="text-sm font-semibold">Posts</div>
          </div>
          <div className="flex items-center px-2 border-t border-gray-200">
            <div className="w-8 h-8 pr-2 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full overflow-hidden">
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
              <p className="text-xs text-gray-500">Sponsored</p>
            </div>
            <div className="ml-auto flex items-center space-x-1">
              <Ellipsis className="w-3 h-3" />
            </div>
          </div>
          <div>
            {mediaToShow.type === 'video' ? (
              <video
                src={mediaToShow.url || mediaToShow.thumbnail}
                className="w-full aspect-square object-cover"
                controls
              />
            ) : (
              <img
                src={mediaToShow.url || mediaToShow.thumbnail}
                alt={mediaToShow.caption || 'Ad content'}
                className="w-full aspect-square object-cover"
              />
            )}
          </div>
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs font-semibold">Download</span>
            <ChevronRight className="w-5 h-5" />
          </div>
          <div className="flex justify-between items-center pt-2 px-2 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5" />
              <MessageCircle className="w-5 h-5" />
              <Send className="w-5 h-5" />
            </div>
            <Bookmark className="w-5 h-5" />
          </div>
          {primaryText && (
            <div className="p-2">
              <p className="text-xs text-gray-900 mb-8">
                {primaryText}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};


const InstagramProfileFeedPreview: React.FC<InstagramProfileFeedPreviewProps> = ({ 
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
        title="Instagram Profile Feed"
        icon={<Instagram />}
        isVisible={showHeaderOnHover ? isHovered : true}
        showDropdown={showDropdown}
        onToggleDropdown={() => setShowDropdown(!showDropdown)}
        onExpand={() => setIsModalOpen(true)}
        onReportProblem={() => console.log('Report Instagram Profile Feed problem')}
      />
      <InstagramProfileFeedPreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      <PreviewExpandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Instagram Profile Feed"
      >
        <InstagramProfileFeedPreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      </PreviewExpandModal>
    </div>
  );
};

export default InstagramProfileFeedPreview;

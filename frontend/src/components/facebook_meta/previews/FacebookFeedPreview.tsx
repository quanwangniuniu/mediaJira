import { Earth, Ellipsis, ThumbsUp, X, MessageSquare, Forward, Facebook } from 'lucide-react';
import React, { useState } from 'react';
import PreviewHeader from './PreviewHeader';
import PreviewExpandModal from '../PreviewExpandModal';

interface MediaFile {
  id: number;
  type: 'photo' | 'video';
  url?: string;
  thumbnail?: string;
  caption?: string;
}

interface FacebookFeedPreviewProps {
  mediaToShow: MediaFile;
  primaryText?: string;
  showHeaderOnHover?: boolean;
  scale?: 75 | 90 | 100;
}

const FacebookFeedPreviewContent: React.FC<FacebookFeedPreviewProps> = ({
  mediaToShow,
  primaryText,
}) => {
  const pageName = 'page name';
  return (
    <>
      <div className="h-[613px] w-[307px] mt-4 relative bg-gray-200 rounded-sm group flex-1 overflow-hidden flex flex-col justify-center">
        <div className="bg-white rounded-sm shadow-md">
          <div className="flex items-center px-2 pt-2">
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
              <p className="text-xs text-gray-500 flex items-center justify-center">Sponsored ·&nbsp;<Earth className="inline-block w-3 h-3" /></p>
            </div>
            <div className="ml-auto flex items-center space-x-1">
              <Ellipsis className="w-5 h-5" />
              <X className="w-5 h-5" />
            </div>
          </div>
          {primaryText && <p className="text-sm px-2">{primaryText}</p>}
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
          <div className="p-3 flex items-center justify-between bg-gray-50">
            <div>
              <p className="text-xs text-gray-500">AIDS resource centre</p>
              <p className="font-semibold text-xs">{pageName}</p>
            </div>
            <button className="bg-gray-300 rounded-md text-sm h-8 px-4 font-bold cursor-default">
              Download
            </button>
          </div>
          <div className="flex justify-around border-t py-2">
            <div className="flex items-center space-x-1">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-xs font-semibold text-gray-700">Like</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs font-semibold text-gray-700">Comment</span>
            </div>
            <div className="flex items-center space-x-1">
              <Forward className="w-4 h-4" />
              <span className="text-xs font-semibold text-gray-700">Share</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const FacebookFeedPreview: React.FC<FacebookFeedPreviewProps> = ({
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
    <>
      <div
        className={`w-[307px] h-[613px] flex flex-col ${getScaleClass()}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowDropdown(false);
        }}
      >
        <PreviewHeader
          title="Facebook Feed"
          icon={<Facebook />}
          isVisible={showHeaderOnHover ? isHovered : true}
          showDropdown={showDropdown}
          onToggleDropdown={() => setShowDropdown(!showDropdown)}
          onExpand={() => setIsModalOpen(true)}
          onReportProblem={() => console.log('Report Facebook Feed problem')}
        />
        <FacebookFeedPreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      </div>
      
      <PreviewExpandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Facebook Feed Preview"
      >
        <FacebookFeedPreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      </PreviewExpandModal>
    </>
  );
};

export default FacebookFeedPreview;

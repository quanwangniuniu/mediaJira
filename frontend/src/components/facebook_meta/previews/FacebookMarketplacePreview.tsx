import React, { useState } from 'react';
import { Earth, Ellipsis, X, ChevronUp, Link, ThumbsUp, MessageSquare, Forward, Facebook } from 'lucide-react';
import PreviewHeader from './PreviewHeader';
import PreviewExpandModal from '../PreviewExpandModal';

interface MediaFile {
  id: number;
  type: 'photo' | 'video';
  url?: string;
  thumbnail?: string;
  caption?: string;
}

interface FacebookMarketplacePreviewProps {
  mediaToShow: MediaFile;
  primaryText?: string;
  showHeaderOnHover?: boolean;
  scale?: 75 | 90 | 100;
}

const FacebookMarketplacePreviewContent: React.FC<FacebookMarketplacePreviewProps> = ({
  mediaToShow,
  primaryText,
}) => {
  const pageName = 'page name';
  return (
    <>
      <div className="h-[613px] w-[307px] mt-4 relative bg-gray-200 rounded-sm group flex-1 overflow-hidden flex flex-col justify-center">
        <div className="bg-white rounded-sm shadow-md mx-6 pt-6">
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
              <p className="text-xs font-thin">Sponsored</p>
            </div>
            <div className="ml-auto flex items-center space-x-1">
              <Ellipsis className="w-5 h-5" />
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
          {primaryText && <p className="text-xs px-2 text-center font-thin mt-1 mb-16">{primaryText}</p>}
        </div>
      </div>
    </>
  );
};

const FacebookMarketplacePreview: React.FC<FacebookMarketplacePreviewProps> = ({
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
        title="Facebook Marketplace"
        icon={<Facebook />}
        isVisible={showHeaderOnHover ? isHovered : true}
        showDropdown={showDropdown}
        onToggleDropdown={() => setShowDropdown(!showDropdown)}
        onExpand={() => setIsModalOpen(true)}
        onReportProblem={() => console.log('Report Facebook Marketplace problem')}
      />

      <FacebookMarketplacePreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      <PreviewExpandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Facebook Marketplace"
      >
        <FacebookMarketplacePreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      </PreviewExpandModal>
    </div>
  );
};

export default FacebookMarketplacePreview;

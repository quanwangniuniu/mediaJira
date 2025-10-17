import React, { useState } from 'react';
import { Heart, MessageCircle, Send, MoreHorizontal, ChevronRight, Earth, ThumbsUp, Forward, Facebook } from 'lucide-react';
import PreviewHeader from './PreviewHeader';
import PreviewExpandModal from '../PreviewExpandModal';

interface MediaFile {
  id: number;
  type: 'photo' | 'video';
  url?: string;
  thumbnail?: string;
  caption?: string;
}

interface FacebookReelsPreviewProps {
  mediaToShow: MediaFile;
  primaryText?: string;
  showHeaderOnHover?: boolean;
  scale?: 75 | 90 | 100;
}

const FacebookReelsPreviewContent: React.FC<FacebookReelsPreviewProps> = ({
  mediaToShow,
  primaryText,
}) => {
  return (
    <>
      <div className="mt-4 relative rounded-sm group h-[613px] w-[307px] overflow-hidden bg-repeat bg-black">
        <div className="flex flex-col justify-between h-full">
          <div></div>
          <div className="absolute top-24 left-0 w-full h-full">
            {mediaToShow.type === 'photo' ? (
              <img
                src={mediaToShow.url}
                alt="Profile"
                className="w-full aspect-square object-cover"
              />
            ) : (
              <video
                src={mediaToShow.url}
                className="w-full aspect-square object-cover overflow-hidden"
              />
            )}
          </div>
          {/* Bottom Section */}
          <div className="py-4 px-2 flex justify-between z-[50]">
            {/* Left Content */}
            <div className="flex-1">
              {/* User Profile and Follow Button */}
              <div className="flex items-center mb-1">
                {mediaToShow.type === 'photo' ? (
                  <img
                    src={mediaToShow.url}
                    alt="Profile"
                    className="w-7 h-7 rounded-full mr-2"
                  />
                ) : (
                  <video
                    src={mediaToShow.url}
                    className="w-7 h-7 rounded-full mr-2 overflow-hidden object-cover"
                  />
                )}
                <span className="font-thin text-gray-50 text-xs">Asdda</span>
                <Earth className="w-3 h-3 text-gray-300 ml-2" />
              </div>

              {/* Download Button */}
              {primaryText && <p className="text-gray-50 text-xs pb-1">{primaryText}</p>}
              <button className="w-full bg-white text-black py-1 px-2 rounded-md flex items-center justify-center cursor-default">
                <span className="text-xs font-bold">Download</span>
              </button>

              {/* Text Content */}
              <div>
                <p className="text-gray-300 text-xs pt-1">Sponsored</p>
              </div>
            </div>

            {/* Right Interaction Icons */}
            <div className="flex flex-col justify-between ml-4">
              <ThumbsUp className="w-4 h-4 text-gray-50" />
              <MessageCircle className="w-4 h-4 text-gray-50" />
              <Forward className="w-4 h-4 text-gray-50" />
              <MoreHorizontal className="w-4 h-4 text-gray-50" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const FacebookReelsPreview: React.FC<FacebookReelsPreviewProps> = ({
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
        title="Facebook Reels"
        icon={<Facebook />}
        isVisible={showHeaderOnHover ? isHovered : true}
        showDropdown={showDropdown}
        onToggleDropdown={() => setShowDropdown(!showDropdown)}
        onExpand={() => setIsModalOpen(true)}
        onReportProblem={() => console.log('Report Facebook Reels problem')}
      />
      <FacebookReelsPreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      <PreviewExpandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Facebook Reels"
      >
        <FacebookReelsPreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      </PreviewExpandModal>
    </div>
  );
};

export default FacebookReelsPreview;

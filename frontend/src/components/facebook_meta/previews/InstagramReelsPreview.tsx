import React, { useState } from 'react';
import { Camera, Heart, MessageCircle, Send, MoreHorizontal, ChevronRight, Instagram } from 'lucide-react';
import PreviewHeader from './PreviewHeader';
import PreviewExpandModal from '../PreviewExpandModal';

interface MediaFile {
  id: number;
  type: 'photo' | 'video';
  url?: string;
  thumbnail?: string;
  caption?: string;
}

interface InstagramReelsPreviewProps {
  mediaToShow: MediaFile;
  primaryText?: string;
  showHeaderOnHover?: boolean;
  scale?: 75 | 90 | 100;
}

const InstagramReelsPreviewContent: React.FC<InstagramReelsPreviewProps> = ({
  mediaToShow,
  primaryText,
}) => {
  return (
    <>
    <div
        style={{ background: "linear-gradient(to bottom, rgb(130, 130, 130) 0%, rgb(206, 206, 206) 15%, rgb(0, 0, 0) 100%)" }}
        className="h-[613px] w-[307px] mt-4 relative rounded-sm group flex-1 overflow-hidden bg-repeat"
      >
        <div className="flex flex-col justify-between h-full">
          {/* Header */}
          <div className="mt-4 mx-2 flex items-center justify-between text-white">
            <span className="text-base font-semibold">
              Reels
            </span>
            <Camera className="w-5 h-5" />
          </div>
          
          {/* Bottom Section */}
          <div className="py-4 px-2 flex justify-between">
            {/* Left Content */}
            <div className="flex-1">
              {/* User Profile and Follow Button */}
              <div className="flex items-center mb-3">
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
                <button className="ml-2 border border-gray-50 text-gray-50 px-1 py-1 rounded-lg text-xs cursor-default">
                  Follow
                </button>
              </div>
              
              {/* Download Button */}
              <button className="w-full bg-white text-black py-1 px-2 rounded-md flex items-center justify-between cursor-default">
                <span className="text-xs font-bold">Download</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              
              {/* Text Content */}
              <div>
                {primaryText && <p className="text-gray-50 text-xs py-1">{primaryText}</p>}
                <p className="text-gray-400 text-xs pt-1">Sponsored</p>
              </div>
            </div>
            
            {/* Right Interaction Icons */}
            <div className="flex flex-col justify-between ml-4">
              <Heart className="w-4 h-4 text-gray-50" />
              <MessageCircle className="w-4 h-4 text-gray-50" />
              <Send className="w-4 h-4 text-gray-50" />
              <MoreHorizontal className="w-4 h-4 text-gray-50" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const InstagramReelsPreview: React.FC<InstagramReelsPreviewProps> = ({ 
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
        title="Instagram Reels"
        icon={<Instagram />}
        isVisible={showHeaderOnHover ? isHovered : true}
        showDropdown={showDropdown}
        onToggleDropdown={() => setShowDropdown(!showDropdown)}
        onExpand={() => setIsModalOpen(true)}
        onReportProblem={() => console.log('Report Instagram Reels problem')}
      />
      <InstagramReelsPreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      <PreviewExpandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Instagram Reels"
      >
        <InstagramReelsPreviewContent mediaToShow={mediaToShow} primaryText={primaryText} />
      </PreviewExpandModal>
    </div>
  );
};

export default InstagramReelsPreview;

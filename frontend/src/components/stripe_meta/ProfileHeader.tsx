'use client';

import { useState, useRef } from 'react';

interface ProfileHeaderProps {
  user: {
    username?: string;
    email?: string;
    avatar?: string;
    first_name?: string;
    last_name?: string;
  };
  onEditClick: () => void;
}

export default function ProfileHeader({ user, onEditClick }: ProfileHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const displayName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.username || 'User';

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Here you would typically upload the file to your backend
      console.log('Selected file:', file);
      // You can add upload logic here
    }
  };

  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200">
      <div className="flex items-center space-x-4">
          <div 
            className="relative w-20 h-20 bg-gray-100 rounded-full overflow-hidden shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105"
          onClick={handleAvatarClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <img 
            src={user?.avatar || "/profile-avatar.svg"} 
            alt={displayName}
            className="w-full h-full object-cover"
          />
          
          {/* Upload overlay */}
          <div className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div>
          <p className="text-xl font-medium">{displayName}</p>
          <p className="text-base opacity-50">{user?.email}</p>
        </div>
      </div>
      <button
        onClick={onEditClick}
        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        Edit
      </button>
    </div>
  );
}

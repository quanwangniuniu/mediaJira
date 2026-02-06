'use client';

import { useState, useRef, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { User } from '@/types/auth';

interface ProfileHeaderProps {
  user: User;
  onProfileUpdate?: (updatedUser: User) => void;
}

type EditingField = 'username' | 'first_name' | 'last_name' | null;

export default function ProfileHeader({ user, onProfileUpdate }: ProfileHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValues, setEditValues] = useState({
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  });
  const [loading, setLoading] = useState<EditingField>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRefs = {
    username: useRef<HTMLInputElement>(null),
    first_name: useRef<HTMLInputElement>(null),
    last_name: useRef<HTMLInputElement>(null),
  };

  // Update edit values when user prop changes
  useEffect(() => {
    setEditValues({
      username: user?.username || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
    });
  }, [user]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingField && inputRefs[editingField]?.current) {
      inputRefs[editingField].current?.focus();
    }
  }, [editingField]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clean up avatar preview URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const displayName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.username || 'User';

  const handleAvatarClick = () => {
    if (!uploadingAvatar) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      event.target.value = ''; // Reset input
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size must not exceed 5MB.');
      event.target.value = ''; // Reset input
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);
    setError(null);

    try {
      // Upload avatar using FormData
      const formData = new FormData();
      formData.append('avatar', file);
      const updatedUser = await authAPI.updateProfile(formData);
      setSuccess('Avatar updated successfully!');
      
      // Clean up preview URL
      URL.revokeObjectURL(previewUrl);
      setAvatarPreview(null);
      
      // Notify parent component about the update
      if (onProfileUpdate) {
        onProfileUpdate(updatedUser);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.avatar?.[0] || 
                          err.response?.data?.detail || 
                          'Failed to upload avatar';
      setError(errorMessage);
      
      // Clean up preview URL on error
      URL.revokeObjectURL(previewUrl);
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      event.target.value = ''; // Reset input for next upload
    }
  };

  const startEditing = (field: EditingField) => {
    setEditingField(field);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValues({
      username: user?.username || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
    });
    setError(null);
  };

  const saveField = async (field: EditingField) => {
    if (!field) return;

    const value = editValues[field].trim();
    const currentValue = user?.[field] || '';

    // Check if value changed
    if (value === currentValue) {
      setEditingField(null);
      return;
    }

    // Validate
    if (field === 'username' && !value) {
      setError('Username cannot be empty');
      return;
    }

    setLoading(field);
    setError(null);

    try {
      const updatedUser = await authAPI.updateProfile({
        [field]: value,
      });

      setSuccess(`${field === 'first_name' ? 'First name' : field === 'last_name' ? 'Last name' : 'Username'} updated successfully!`);
      setEditingField(null);
      
      // Notify parent component about the update
      if (onProfileUpdate) {
        onProfileUpdate(updatedUser);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.username?.[0] || 
                          err.response?.data?.detail || 
                          'Failed to update profile';
      setError(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: EditingField) => {
    if (e.key === 'Enter') {
      saveField(field);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const renderEditableField = (
    field: EditingField,
    label: string,
    placeholder: string,
    value: string,
    isEditing: boolean
  ) => {
    if (isEditing) {
      return (
        <div className="flex items-center space-x-2">
          <input
            ref={inputRefs[field!]}
            type="text"
            value={editValues[field!]}
            onChange={(e) => setEditValues({ ...editValues, [field!]: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, field)}
            placeholder={placeholder}
            disabled={loading === field}
            className="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-base disabled:opacity-50"
          />
          <button
            onClick={() => saveField(field)}
            disabled={loading === field}
            className="text-green-600 hover:text-green-700 disabled:opacity-50"
            title="Save"
          >
            {loading === field ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <button
            onClick={cancelEditing}
            disabled={loading === field}
            className="text-red-600 hover:text-red-700 disabled:opacity-50"
            title="Cancel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      );
    }

    return (
      <div 
        className="group flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition-colors"
        onClick={() => startEditing(field)}
      >
        <span className="text-base">{value || placeholder}</span>
        <svg 
          className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </div>
    );
  };

  return (
    <div className="p-6 border-b border-gray-200">
      {/* Toast notifications */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-800">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{success}</span>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center space-x-4">
        {/* Avatar with upload functionality */}
        <div 
          className="relative w-20 h-20 bg-gray-100 rounded-full overflow-hidden shadow-lg cursor-pointer group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleAvatarClick}
        >
          <img 
            src={avatarPreview || user?.avatar || "/profile-avatar.svg"} 
            alt={displayName}
            className="w-full h-full object-cover"
          />
          
          {/* Hover overlay with camera icon */}
          {!uploadingAvatar && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          )}
          
          {/* Loading spinner during upload */}
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        {/* User info with inline editing */}
        <div className="flex-1 space-y-2">
          {/* Username */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 w-24">Username:</span>
            {renderEditableField('username', 'Username', 'Enter username', user?.username || '', editingField === 'username')}
          </div>

          {/* First Name */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 w-24">First Name:</span>
            {renderEditableField('first_name', 'First Name', 'Enter first name', user?.first_name || '', editingField === 'first_name')}
          </div>

          {/* Last Name */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 w-24">Last Name:</span>
            {renderEditableField('last_name', 'Last Name', 'Enter last name', user?.last_name || '', editingField === 'last_name')}
          </div>

          {/* Email (read-only) */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 w-24">Email:</span>
            <div className="flex items-center space-x-2 px-2 py-1">
              <span className="text-base text-gray-700">{user?.email}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

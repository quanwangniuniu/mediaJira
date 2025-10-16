'use client';

import React, { useState, useEffect } from 'react';
import { AdCreativeFormData, AdCreative } from '@/lib/api/facebookMetaApi';

interface AdCreativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: AdCreativeFormData | UpdateFormData) => Promise<void>;
  submitting?: boolean;
  mode?: 'create' | 'update';
  adCreative?: AdCreative | null;
}

interface UpdateFormData {
  name?: string;
  status?: string;
  adlabels?: string[];
}

const CALL_TO_ACTION_TYPES = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'BOOK_NOW', label: 'Book Now' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'NO_BUTTON', label: 'No Button' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_PROCESS', label: 'In Process' },
  { value: 'WITH_ISSUES', label: 'With Issues' },
  { value: 'DELETED', label: 'Deleted' },
];

export default function AdCreativeModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  submitting = false,
  mode = 'create',
  adCreative = null
}: AdCreativeModalProps) {
  const [form, setForm] = useState<AdCreativeFormData>({
    name: '',
    object_story_spec: {
      page_id: '',
      link_data: {
        link: '',
        message: '',
        name: '',
        description: '',
        call_to_action: {
          type: '',
        },
      },
    },
    authorization_category: 'NONE',
  });
  
  // Update form state for update mode
  const [updateForm, setUpdateForm] = useState<UpdateFormData>({
    name: '',
    status: '',
    adlabels: [],
  });
  
  const [errors, setErrors] = useState<{
    name?: string;
    page_id?: string;
    link?: string;
    message?: string;
    link_data_name?: string;
    description?: string;
    call_to_action_type?: string;
    status?: string;
    adlabels?: string;
  }>({});

  // Populate form when in update mode
  useEffect(() => {
    if (mode === 'update' && adCreative) {
      setUpdateForm({
        name: adCreative.name || '',
        status: adCreative.status || '',
        adlabels: [], // TODO: Get ad labels from adCreative if available
      });
    }
  }, [mode, adCreative]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (mode === 'update') {
      // Handle update form fields
      setUpdateForm({ ...updateForm, [name]: value });
    } else {
      // Handle create form fields (existing logic)
      if (name === 'name' || name === 'authorization_category') {
        setForm({ ...form, [name]: value });
      } else if (name === 'page_id') {
        setForm({
          ...form,
          object_story_spec: {
            ...form.object_story_spec,
            page_id: value,
          },
        });
      } else if (name === 'call_to_action_type') {
        setForm({
          ...form,
          object_story_spec: {
            ...form.object_story_spec,
            link_data: {
              ...form.object_story_spec?.link_data,
              call_to_action: {
                type: value,
              },
            },
          },
        });
      } else if (name === 'link_data_name') {
        setForm({
          ...form,
          object_story_spec: {
            ...form.object_story_spec,
            link_data: {
              ...form.object_story_spec?.link_data,
              name: value,
            },
          },
        });
      } else {
        // Handle link_data fields
        setForm({
          ...form,
          object_story_spec: {
            ...form.object_story_spec,
            link_data: {
              ...form.object_story_spec?.link_data,
              [name]: value,
            },
          },
        });
      }
    }
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (mode === 'update') {
      // Update mode validation
      if (updateForm.name && updateForm.name.trim().length < 2) {
        newErrors.name = 'Ad creative name must be at least 2 characters';
      }
    } else {
      // Create mode validation (existing logic)
      if (!form.name || form.name.trim().length < 2) {
        newErrors.name = 'Ad creative name is required and must be at least 2 characters';
      }
      
      // Optional validation: if link is provided, it should be valid
      const link = form.object_story_spec?.link_data?.link;
      if (link && link.trim() && !isValidUrl(link)) {
        newErrors.link = 'Link URL must be a valid URL';
      }
      
      // Optional validation: if message is provided, check length
      const message = form.object_story_spec?.link_data?.message;
      if (message && message.length > 500) {
        newErrors.message = 'Message must not exceed 500 characters';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const formData = mode === 'update' ? updateForm : form;
    await onSubmit(formData);
    
    // Only reset form if submission was successful
    if (!submitting) {
      if (mode === 'update') {
        setUpdateForm({
          name: '',
          status: '',
          adlabels: [],
        });
      } else {
        setForm({
          name: '',
          object_story_spec: {
            page_id: '',
            link_data: {
              link: '',
              message: '',
              name: '',
              description: '',
              call_to_action: {
                type: '',
              },
            },
          },
          authorization_category: 'NONE',
        });
      }
      setErrors({});
    }
  };

  const handleClose = () => {
    if (!submitting) {
      if (mode === 'update') {
        setUpdateForm({
          name: '',
          status: '',
          adlabels: [],
        });
      } else {
        setForm({
          name: '',
          object_story_spec: {
            page_id: '',
            link_data: {
              link: '',
              message: '',
              name: '',
              description: '',
              call_to_action: {
                type: '',
              },
            },
          },
          authorization_category: 'NONE',
        });
      }
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-semibold text-gray-900">
            {mode === 'update' ? 'Update Facebook Ad Creative' : 'Create Facebook Ad Creative'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            disabled={submitting}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">
            {mode === 'update' ? (
              // Update mode fields
              <>
                {/* Ad Creative Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Ad Creative Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={updateForm.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 text-base border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter ad creative name"
                    disabled={submitting}
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠</span> {errors.name}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={updateForm.status}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 text-base border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white ${
                      errors.status ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={submitting}
                  >
                    <option value="">Select status</option>
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {errors.status && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠</span> {errors.status}
                    </p>
                  )}
                </div>


                {/* Ad Labels */}
                <div>
                  <label htmlFor="adlabels" className="block text-sm font-semibold text-gray-700 mb-2">
                    Ad Labels
                  </label>
                  <input
                    type="text"
                    id="adlabels"
                    name="adlabels"
                    value={updateForm.adlabels?.join(', ') || ''}
                    onChange={(e) => {
                      const labels = e.target.value.split(',').map(label => label.trim()).filter(label => label);
                      setUpdateForm({ ...updateForm, adlabels: labels });
                    }}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter labels separated by commas (e.g., label1, label2)"
                    disabled={submitting}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Separate multiple labels with commas
                  </p>
                </div>
              </>
            ) : (
              // Create mode fields (existing form)
              <>
                {/* Ad Creative Name - REQUIRED */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Ad Creative Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 text-base border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter ad creative name"
                    disabled={submitting}
                    required
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠</span> {errors.name}
                    </p>
                  )}
                </div>

            {/* Divider */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Link Data (Optional)</h3>
              <p className="text-sm text-gray-500 mb-4">Fill in these fields to create ad content</p>
            </div>

            {/* Ad Title */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Link Data Name
              </label>
              <input
                type="text"
                id="link_data_name"
                name="link_data_name"
                value={form.object_story_spec?.link_data?.name || ''}
                onChange={handleChange}
                className={`w-full px-4 py-3 text-base border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                  errors.link_data_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter ad title"
                disabled={submitting}
              />
              {errors.link_data_name && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.link_data_name}
                </p>
              )}
            </div>

            {/* Ad Message/Body */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Link Data Message
              </label>
              <textarea
                id="message"
                name="message"
                value={form.object_story_spec?.link_data?.message || ''}
                onChange={handleChange}
                rows={5}
                className={`w-full px-4 py-3 text-base border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none ${
                  errors.message ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter the main message for your ad"
                disabled={submitting}
              />
              <div className="flex justify-between items-center mt-2">
                <p className={`text-sm ${(form.object_story_spec?.link_data?.message?.length || 0) > 450 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                  {form.object_story_spec?.link_data?.message?.length || 0}/500 characters
                </p>
              </div>
              {errors.message && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.object_story_spec?.link_data?.description || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                placeholder="Enter a description"
                disabled={submitting}
              />
            </div>

            {/* Call to Action */}
            <div>
              <label htmlFor="call_to_action_type" className="block text-sm font-medium text-gray-700 mb-2">
                Call to Action
              </label>
              <select
                id="call_to_action_type"
                name="call_to_action_type"
                value={form.object_story_spec?.link_data?.call_to_action?.type || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white"
                disabled={submitting}
              >
                <option value="">Select call to action</option>
                {CALL_TO_ACTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Link URL */}
            <div>
              <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-2">
                Link URL
              </label>
              <input
                type="url"
                id="link"
                name="link"
                value={form.object_story_spec?.link_data?.link || ''}
                onChange={handleChange}
                className={`w-full px-4 py-3 text-base border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                  errors.link ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="https://example.com"
                disabled={submitting}
              />
              {errors.link && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.link}
                </p>
              )}
            </div>

            {/* Photo Data Section */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Photo Data (Optional)</h3>
              <p className="text-sm text-gray-500 mb-4">Add photo details for image-based ads</p>
              
              <div className="space-y-4">
                {/* Photo Caption */}
                <div>
                  <label htmlFor="photo_caption" className="block text-sm font-medium text-gray-700 mb-2">
                    Photo Caption
                  </label>
                  <textarea
                    id="photo_caption"
                    name="photo_caption"
                    value={form.object_story_spec?.photo_data?.caption || ''}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        object_story_spec: {
                          ...form.object_story_spec,
                          photo_data: {
                            ...form.object_story_spec?.photo_data,
                            caption: e.target.value,
                          },
                        },
                      });
                    }}
                    rows={3}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Enter photo caption"
                    disabled={submitting}
                  />
                </div>

                {/* Photo URL */}
                <div>
                  <label htmlFor="photo_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    id="photo_url"
                    name="photo_url"
                    value={form.object_story_spec?.photo_data?.url || ''}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        object_story_spec: {
                          ...form.object_story_spec,
                          photo_data: {
                            ...form.object_story_spec?.photo_data,
                            url: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="https://example.com/photo.jpg"
                    disabled={submitting}
                  />
                </div>

                {/* Photo Image Hash */}
                <div>
                  <label htmlFor="photo_image_hash" className="block text-sm font-medium text-gray-700 mb-2">
                    Image Hash
                  </label>
                  <input
                    type="text"
                    id="photo_image_hash"
                    name="photo_image_hash"
                    value={form.object_story_spec?.photo_data?.image_hash || ''}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        object_story_spec: {
                          ...form.object_story_spec,
                          photo_data: {
                            ...form.object_story_spec?.photo_data,
                            image_hash: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter image hash"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* Video Data Section */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Video Data (Optional)</h3>
              <p className="text-sm text-gray-500 mb-4">Add video details for video-based ads</p>
              
              <div className="space-y-4">
                {/* Video ID */}
                <div>
                  <label htmlFor="video_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Video ID
                  </label>
                  <input
                    type="text"
                    id="video_id"
                    name="video_id"
                    value={form.object_story_spec?.video_data?.video_id || ''}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        object_story_spec: {
                          ...form.object_story_spec,
                          video_data: {
                            ...form.object_story_spec?.video_data,
                            video_id: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter video ID"
                    disabled={submitting}
                  />
                </div>

                {/* Video Title */}
                <div>
                  <label htmlFor="video_title" className="block text-sm font-medium text-gray-700 mb-2">
                    Video Title
                  </label>
                  <input
                    type="text"
                    id="video_title"
                    name="video_title"
                    value={form.object_story_spec?.video_data?.title || ''}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        object_story_spec: {
                          ...form.object_story_spec,
                          video_data: {
                            ...form.object_story_spec?.video_data,
                            title: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter video title"
                    disabled={submitting}
                  />
                </div>

                {/* Video Message */}
                <div>
                  <label htmlFor="video_message" className="block text-sm font-medium text-gray-700 mb-2">
                    Video Message
                  </label>
                  <textarea
                    id="video_message"
                    name="video_message"
                    value={form.object_story_spec?.video_data?.message || ''}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        object_story_spec: {
                          ...form.object_story_spec,
                          video_data: {
                            ...form.object_story_spec?.video_data,
                            message: e.target.value,
                          },
                        },
                      });
                    }}
                    rows={3}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Enter video message"
                    disabled={submitting}
                  />
                </div>

                {/* Video Image URL */}
                <div>
                  <label htmlFor="video_image_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Video Thumbnail URL
                  </label>
                  <input
                    type="url"
                    id="video_image_url"
                    name="video_image_url"
                    value={form.object_story_spec?.video_data?.image_url || ''}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        object_story_spec: {
                          ...form.object_story_spec,
                          video_data: {
                            ...form.object_story_spec?.video_data,
                            image_url: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="https://example.com/thumbnail.jpg"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* Text Data Section */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Text Data (Optional)</h3>
              <p className="text-sm text-gray-500 mb-4">Add text content for text-based ads</p>
              
              <div>
                {/* Text Message */}
                <div>
                  <label htmlFor="text_message" className="block text-sm font-medium text-gray-700 mb-2">
                    Text Message
                  </label>
                  <textarea
                    id="text_message"
                    name="text_message"
                    value={form.object_story_spec?.text_data?.message || ''}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        object_story_spec: {
                          ...form.object_story_spec,
                          text_data: {
                            ...form.object_story_spec?.text_data,
                            message: e.target.value,
                          },
                        },
                      });
                    }}
                    rows={5}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Enter text message for your ad"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
              </>
            )}
          </div>

        </form>

        {/* Footer with Actions */}
        <div className="flex justify-end items-center space-x-4 px-8 py-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-3 text-base font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              const form = e.currentTarget.closest('div')?.previousElementSibling as HTMLFormElement;
              form?.requestSubmit();
            }}
            className="px-6 py-3 text-base font-medium text-white bg-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {mode === 'update' ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              mode === 'update' ? 'Update Ad Creative' : 'Create Ad Creative'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


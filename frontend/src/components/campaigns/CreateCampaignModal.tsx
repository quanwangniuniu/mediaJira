'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Button from '@/components/button/Button';
import CreateCampaignForm from './CreateCampaignForm';
import { CreateCampaignData } from '@/types/campaign';
import { useCampaignData } from '@/hooks/useCampaignData';
import toast from 'react-hot-toast';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateCampaignModal({ isOpen, onClose }: CreateCampaignModalProps) {
  const router = useRouter();
  const { createCampaign, loading } = useCampaignData();
  const [formData, setFormData] = useState<Partial<CreateCampaignData>>({
    platforms: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ platforms: [] });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (!formData.objective) {
      newErrors.objective = 'Objective is required';
    }

    if (!formData.platforms || formData.platforms.length === 0) {
      newErrors.platforms = 'At least one platform is required';
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Project is required';
    }

    if (!formData.owner_id) {
      newErrors.owner_id = 'Owner is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    // Validate end date is after start date
    if (formData.end_date && formData.start_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const campaignData: CreateCampaignData = {
        name: formData.name!,
        objective: formData.objective!,
        platforms: formData.platforms!,
        start_date: formData.start_date!,
        end_date: formData.end_date,
        owner_id: formData.owner_id!,
        project_id: formData.project_id!,
        hypothesis: formData.hypothesis,
        tags: formData.tags,
        budget_estimate: formData.budget_estimate,
      };

      const newCampaign = await createCampaign(campaignData);
      toast.success('Campaign created successfully');
      onClose();
      // Navigate to the new campaign
      router.push(`/campaigns/${newCampaign.id}`);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      
      // Handle API validation errors
      if (error.response?.data) {
        const apiErrors = error.response.data;
        const newErrors: Record<string, string> = {};
        
        // Map API errors to form fields
        Object.keys(apiErrors).forEach((key) => {
          if (Array.isArray(apiErrors[key])) {
            newErrors[key] = apiErrors[key][0];
          } else {
            newErrors[key] = apiErrors[key];
          }
        });
        
        setErrors(newErrors);
      } else {
        toast.error(error.message || 'Failed to create campaign');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Create a new campaign with minimal required information. You can add more details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <CreateCampaignForm
              formData={formData}
              onFormDataChange={setFormData}
              errors={errors}
              onFieldChange={handleFieldChange}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Create Campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


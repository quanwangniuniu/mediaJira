'use client';

import React from 'react';
import { CircleCheck, TriangleAlert } from 'lucide-react';

export default function EventDetailsSection() {
  return (
    <div className="space-y-4">
      {/* Title with checkmark icon */}
      <div className="flex items-center">
        <CircleCheck className="w-5 h-5 text-green-500 mr-2" />
        <h3 className="text-base font-bold text-gray-900">
          Event details <span className="text-gray-500 font-bold">• Optional</span>
        </h3>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700">
        Include event details for your ad. Your ad will display a title, start or end time, and a reminder button so that your audience can get reminders about the event.
      </p>

      {/* Warning box */}
      <div className="border-l-4 border-[#d47b04] rounded-md p-4 shadow-md border-t border-t-gray-100">
        <div className="flex items-start space-x-3">
          <TriangleAlert className="w-5 h-5 text-[#b35401] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-700">
              For the identity of your ad, you must select an Instagram account to include event details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

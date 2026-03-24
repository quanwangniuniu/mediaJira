'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { forwardMessagesBatch } from '@/lib/api/chatApi';
import type { ForwardBatchRequest, ForwardBatchResponse } from '@/types/chat';

export function useForwardMessages() {
  const [isForwarding, setIsForwarding] = useState(false);

  const forward = useCallback(
    async (payload: ForwardBatchRequest): Promise<ForwardBatchResponse | null> => {
      try {
        setIsForwarding(true);
        const response = await forwardMessagesBatch(payload);

        const { summary, resolved } = response;
        if (response.status === 'success') {
          toast.success(
            `Forwarded ${summary.succeeded_sends} message${summary.succeeded_sends === 1 ? '' : 's'} successfully.`
          );
        } else if (response.status === 'partial_success') {
          toast(
            `Forwarded ${summary.succeeded_sends}, failed ${summary.failed_sends}, skipped ${resolved.skipped_message_ids.length}.`,
            { icon: '⚠️' }
          );
        } else {
          toast.error('Forward failed. No messages were sent.');
        }

        return response;
      } catch (error: any) {
        const failedResponse = error?.response?.data;
        if (failedResponse?.status === 'failed' && failedResponse?.summary) {
          const failedCount = failedResponse.summary.failed_sends ?? 0;
          const skippedCount = failedResponse.resolved?.skipped_message_ids?.length ?? 0;
          toast.error(`Forward failed: failed ${failedCount}, skipped ${skippedCount}.`);
          return null;
        }

        const errorMsg =
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          'Failed to forward selected messages';
        toast.error(errorMsg);
        return null;
      } finally {
        setIsForwarding(false);
      }
    },
    []
  );

  return {
    isForwarding,
    forward,
  };
}

export default useForwardMessages;

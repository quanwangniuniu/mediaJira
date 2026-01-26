"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import AdVariationManagement from "@/components/ad-variations/AdVariationManagement";
import Layout from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function CampaignAdVariationsPage() {
  const params = useParams();
  const campaignId = useMemo(() => Number(params?.id), [params]);

  if (!campaignId) {
    return (
      <ProtectedRoute>
        <Layout showHeader={true} showSidebar={true}>
          <div className="p-6 text-sm text-gray-500">Invalid campaign id.</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout showHeader={true} showSidebar={true}>
        <div className="px-6 pb-10 pt-4">
          <AdVariationManagement campaignId={campaignId} />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

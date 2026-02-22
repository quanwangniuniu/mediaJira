import { Badge } from "@/components/ui/badge";
import { CampaignStatus } from "@/types/campaign";

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

const statusConfig: Record<CampaignStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PLANNING: { label: "Planning", variant: "secondary" },
  TESTING: { label: "Testing", variant: "default" },
  SCALING: { label: "Scaling", variant: "default" },
  OPTIMIZING: { label: "Optimizing", variant: "default" },
  PAUSED: { label: "Paused", variant: "outline" },
  COMPLETED: { label: "Completed", variant: "secondary" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

export default function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PLANNING;
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}


import type { MeetingTypeOptionValue } from '@/lib/meetings/meetingTypes';

export type NestedAgendaTemplateItem = {
  id: string;
  text: string;
  completed: boolean;
  duration: string;
};

export type NestedAgendaTemplateSection = {
  id: string;
  title: string;
  items: NestedAgendaTemplateItem[];
};

export const MEETING_TEMPLATES: Record<MeetingTypeOptionValue, NestedAgendaTemplateSection[]> = {
  Planning: [
    {
      id: 'planning-goals',
      title: 'Goals & Objectives (目标设定)',
      items: [
        {
          id: 'planning-goals-1',
          text: 'Define Sprint/Project high-level goal.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'planning-goals-2',
          text: 'List key success metrics (KPIs).',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'planning-capacity',
      title: 'Capacity & Velocity (资源评估)',
      items: [
        {
          id: 'planning-capacity-1',
          text: 'Review team availability (holidays/leaves).',
          completed: false,
          duration: '10m',
        },
        {
          id: 'planning-capacity-2',
          text: 'Calculate estimated velocity based on previous sprints.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'planning-backlog',
      title: 'Backlog Refinement (待办事项梳理)',
      items: [
        {
          id: 'planning-backlog-1',
          text: 'Select high-priority tickets from the backlog.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'planning-backlog-2',
          text: 'Review and clarify Acceptance Criteria for each task.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'planning-breakdown',
      title: 'Task Breakdown & Estimation (任务拆解与估点)',
      items: [
        {
          id: 'planning-breakdown-1',
          text: 'Break down larger features into sub-tasks.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'planning-breakdown-2',
          text: 'Conduct Story Point estimation session.',
          completed: false,
          duration: '15m',
        },
      ],
    },
    {
      id: 'planning-risks',
      title: 'Risks & Dependencies (风险与依赖)',
      items: [
        {
          id: 'planning-risks-1',
          text: 'Identify external blockers or team dependencies.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'planning-risks-2',
          text: 'Draft mitigation plans for high-risk items.',
          completed: false,
          duration: '10m',
        },
      ],
    },
  ],
  'Client Meeting': [
    {
      id: 'client-milestones',
      title: 'Milestone Review (里程碑回顾)',
      items: [
        {
          id: 'client-milestones-1',
          text: 'Demonstrate progress since the last update.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'client-milestones-2',
          text: 'Review current project timeline status.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'client-deliverables',
      title: 'Key Deliverables Demo (交付物演示)',
      items: [
        {
          id: 'client-deliverables-1',
          text: 'Live demo of new features or UI components.',
          completed: false,
          duration: '15m',
        },
        {
          id: 'client-deliverables-2',
          text: 'Gather immediate feedback on visual/functional aspects.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'client-feedback',
      title: 'Requirements & Feedback (需求与反馈)',
      items: [
        {
          id: 'client-feedback-1',
          text: 'Discuss new change requests or adjustments.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'client-feedback-2',
          text: 'Clarify specific business logic priorities.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'client-constraints',
      title: 'Technical Constraints (技术限制说明)',
      items: [
        {
          id: 'client-constraints-1',
          text: 'Explain technical limitations or architectural decisions.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'client-constraints-2',
          text: 'Address security or performance concerns raised by the client.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'client-next-steps',
      title: 'Next Steps & Deadlines (后续计划与截止日期)',
      items: [
        {
          id: 'client-next-steps-1',
          text: 'Assign action items to team and client.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'client-next-steps-2',
          text: 'Confirm date for the next review session.',
          completed: false,
          duration: '5m',
        },
      ],
    },
  ],
  'Stand-up': [
    {
      id: 'standup-progress',
      title: 'Progress Since Yesterday (昨日进展)',
      items: [
        {
          id: 'standup-progress-1',
          text: 'Individual updates on completed tasks.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'standup-progress-2',
          text: 'Link to Jira tickets closed in the last 24 hours.',
          completed: false,
          duration: '5m',
        },
      ],
    },
    {
      id: 'standup-today',
      title: "Today's Focus (今日计划)",
      items: [
        {
          id: 'standup-today-1',
          text: 'Main tasks to be initiated or continued.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'standup-today-2',
          text: 'Coordinate pair programming or review needs.',
          completed: false,
          duration: '5m',
        },
      ],
    },
    {
      id: 'standup-blockers',
      title: 'Blockers & Hurdles (障碍与困难)',
      items: [
        {
          id: 'standup-blockers-1',
          text: 'Report any technical or process-related roadblocks.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'standup-blockers-2',
          text: 'Flag dependencies waiting on other departments.',
          completed: false,
          duration: '5m',
        },
      ],
    },
    {
      id: 'standup-board',
      title: 'Board Health Check (看板状态检查)',
      items: [
        {
          id: 'standup-board-1',
          text: "Identify 'stuck' tasks in the 'In Progress' column.",
          completed: false,
          duration: '10m',
        },
        {
          id: 'standup-board-2',
          text: 'Review code review queue (PRs waiting for approval).',
          completed: false,
          duration: '5m',
        },
      ],
    },
    {
      id: 'standup-announcements',
      title: 'Quick Announcements (快速公告)',
      items: [
        {
          id: 'standup-announcements-1',
          text: 'Brief updates on environment status or meetings.',
          completed: false,
          duration: '5m',
        },
        {
          id: 'standup-announcements-2',
          text: 'Shout-outs for team achievements.',
          completed: false,
          duration: '5m',
        },
      ],
    },
  ],
  'Review & Retrospective': [
    {
      id: 'retro-done',
      title: 'Done vs. Not Done (交付情况对比)',
      items: [
        {
          id: 'retro-done-1',
          text: 'List all stories completed during the sprint.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'retro-done-2',
          text: 'Explain reasons for items carried over to the next cycle.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'retro-good',
      title: 'What Went Well (做得好的地方)',
      items: [
        {
          id: 'retro-good-1',
          text: 'Identify successful processes or teamwork moments.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'retro-good-2',
          text: 'Acknowledge effective tools or methodologies used.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'retro-improve',
      title: 'What Could Be Improved (改进点)',
      items: [
        {
          id: 'retro-improve-1',
          text: 'Analyze bottlenecks encountered during development.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'retro-improve-2',
          text: 'Address communication gaps or technical debt issues.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'retro-root-cause',
      title: 'Root Cause Analysis (根因分析)',
      items: [
        {
          id: 'retro-root-cause-1',
          text: 'Deep dive into recurring bugs or major delays.',
          completed: false,
          duration: '15m',
        },
        {
          id: 'retro-root-cause-2',
          text: 'Discuss system-wide compatibility failures.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'retro-actions',
      title: 'Action Items for Next Sprint (改进动作)',
      items: [
        {
          id: 'retro-actions-1',
          text: 'Assign specific process owners for improvement tasks.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'retro-actions-2',
          text: 'Set deadlines for implementing new workflows.',
          completed: false,
          duration: '10m',
        },
      ],
    },
  ],
  'Deployment Sync': [
    {
      id: 'deploy-build',
      title: 'Build Verification (构建验证)',
      items: [
        {
          id: 'deploy-build-1',
          text: 'Confirm CI/CD pipeline green status.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'deploy-build-2',
          text: 'Review automated test coverage results.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'deploy-env',
      title: 'Environment Readiness (环境就绪检查)',
      items: [
        {
          id: 'deploy-env-1',
          text: 'Check database migration script safety.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'deploy-env-2',
          text: 'Verify configuration secrets and environment variables.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'deploy-rollback',
      title: 'Rollback Strategy (回滚策略)',
      items: [
        {
          id: 'deploy-rollback-1',
          text: 'Define the “point of no return” for the deployment.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'deploy-rollback-2',
          text: 'Outline step-by-step rollback procedures.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'deploy-comms',
      title: 'Communication Plan (沟通计划)',
      items: [
        {
          id: 'deploy-comms-1',
          text: 'Draft system maintenance notifications.',
          completed: false,
          duration: '10m',
        },
        {
          id: 'deploy-comms-2',
          text: 'Assign an on-call rotation for immediate post-deployment support.',
          completed: false,
          duration: '10m',
        },
      ],
    },
    {
      id: 'deploy-monitoring',
      title: 'Post-Deployment Monitoring (上线后监控)',
      items: [
        {
          id: 'deploy-monitoring-1',
          text: 'Establish key logs and metrics to monitor (Error rates, Latency).',
          completed: false,
          duration: '10m',
        },
        {
          id: 'deploy-monitoring-2',
          text: 'Confirm smoke testing schedule in production.',
          completed: false,
          duration: '10m',
        },
      ],
    },
  ],
};

export function getNestedTemplateForMeetingType(meetingType: string): NestedAgendaTemplateSection[] {
  const template = MEETING_TEMPLATES[meetingType as MeetingTypeOptionValue] ?? [];
  return template.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item })),
  }));
}

export function getTemplateForMeetingType(meetingType: string): string[] {
  return getNestedTemplateForMeetingType(meetingType).flatMap((section) =>
    section.items.map((item) => item.text),
  );
}

export type DefaultWorkspaceBlockType = 'header' | 'agenda' | 'participants' | 'artifacts' | 'custom_block';

export type DefaultWorkspaceBlock = {
  id: string;
  type: DefaultWorkspaceBlockType;
  title?: string;
  content?: string;
};

export const DEFAULT_MEETING_WORKSPACE_BLOCKS: DefaultWorkspaceBlock[] = [
  { id: 'header', type: 'header' },
  { id: 'agenda', type: 'agenda' },
  { id: 'participants', type: 'participants' },
  { id: 'artifacts', type: 'artifacts' },
];

// Workflow-related type definitions

// Node Types
export type NodeType = 
  | 'start'
  | 'end'
  | 'action'
  | 'condition'
  | 'approval'
  | 'delay';

// Connection Types
export type ConnectionType = 
  | 'sequential'
  | 'conditional'
  | 'parallel'
  | 'loop';

// Node Data Structure (flexible JSON field)
export interface NodeData {
  position?: {
    x: number;
    y: number;
  };
  config?: {
    [key: string]: any;
  };
  [key: string]: any; // Allow additional fields
}

// Condition Config for Conditional and Loop Connections
export interface ConditionConfig {
  // For conditional connections
  field?: string;
  operator?: string;
  value?: any;
  label?: string;
  
  // For loop connections
  max_iterations?: number; // Required for loop connections (1-1000)
  loop_variable?: string;
  collection?: string;
  
  [key: string]: any; // Allow additional fields
}

// Workflow Model
export interface Workflow {
  id?: number;
  name: string;
  description?: string;
  project_id?: number | null;
  is_active?: boolean;
  version?: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

// WorkflowNode Model
export interface WorkflowNode {
  id?: number;
  workflow_id?: number; // Read-only from API
  node_type: NodeType;
  label: string;
  data?: NodeData;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

// WorkflowConnection Model
export interface WorkflowConnection {
  id?: number;
  workflow_id?: number; // Read-only from API
  source_node_id: number;
  target_node_id: number;
  connection_type?: ConnectionType; // Default: 'sequential'
  condition_config?: ConditionConfig;
  priority?: number; // Default: 0
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

// Create/Update Types
export interface CreateWorkflowData {
  name: string;
  description?: string;
  project_id?: number | null;
  is_active?: boolean;
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  project_id?: number | null;
  is_active?: boolean;
}

export interface CreateNodeData {
  node_type: NodeType;
  label: string;
  data?: NodeData;
}

export interface UpdateNodeData {
  node_type?: NodeType;
  label?: string;
  data?: NodeData;
}

export interface CreateConnectionData {
  source_node_id: number;
  target_node_id: number;
  connection_type?: ConnectionType;
  condition_config?: ConditionConfig;
  priority?: number;
}

export interface UpdateConnectionData {
  source_node_id?: number;
  target_node_id?: number;
  connection_type?: ConnectionType;
  condition_config?: ConditionConfig;
  priority?: number;
}

// Graph Structure
export interface WorkflowGraph {
  workflow: Workflow;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

// Validation Result
export interface ValidationError {
  code: string;
  message: string;
  node_id?: number;
  connection_id?: number;
  cycle_node_ids?: number[];
  [key: string]: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  node_id?: number;
  [key: string]: any;
}

export interface GraphValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Batch Operations
export interface BatchNodeOperation {
  create?: CreateNodeData[];
  update?: Array<UpdateNodeData & { id: number }>;
  delete?: number[];
}

export interface BatchConnectionOperation {
  create?: CreateConnectionData[];
  update?: Array<UpdateConnectionData & { id: number }>;
  delete?: number[];
}

export interface BatchNodeOperationResult {
  created: WorkflowNode[];
  updated: WorkflowNode[];
  deleted: number[];
}

export interface BatchConnectionOperationResult {
  created: WorkflowConnection[];
  updated: WorkflowConnection[];
  deleted: number[];
}

// API Query Parameters
export interface GetWorkflowsParams {
  project_id?: number;
  is_active?: boolean;
  search?: string;
  ordering?: string;
}


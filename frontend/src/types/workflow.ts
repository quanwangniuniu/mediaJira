/**
 * Workflow Graph Type Definitions
 * Defines types for workflow, nodes, connections, and graph operations
 */

// ========================================
// Core Workflow Types
// ========================================

export type WorkflowStatus = "draft" | "published" | "archived";

export interface WorkflowSummary {
  id: number;
  name: string;
  description?: string | null;
  project_id?: number | null;
  organization_id?: number | null;
  created_by_id?: number | null;
  status: WorkflowStatus;
  version: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

// ========================================
// Node Types
// ========================================

// Node types aligned with Jira Status Categories
export type NodeType = 
  | "start"  // Entry point - one per workflow, cannot be deleted
  | "to_do"
  | "in_progress"
  | "done";

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  position?: NodePosition;
  properties?: Record<string, any>;  // Custom key-value properties for the status
  [key: string]: any;
}

export interface WorkflowNode {
  id: number;
  workflow_id: number;
  node_type: NodeType;
  label: string;
  color?: string;
  data: NodeData;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface WorkflowNodeCreate {
  node_type: NodeType;
  label: string;
  color?: string;
  data?: NodeData;
}

export interface WorkflowNodeUpdate {
  id: number;
  node_type?: NodeType;
  label?: string;
  color?: string;
  data?: NodeData;
}

// ========================================
// Connection Types
// ========================================

export type ConnectionType = 
  | "sequential"
  | "conditional"
  | "parallel"
  | "loop";

export interface ConditionConfig {
  field?: string;
  operator?: string;
  value?: any;
  label?: string;
  max_iterations?: number;
  loop_variable?: string;
  collection?: string;
  [key: string]: any;
}

export type HandlePosition = 'top' | 'right' | 'bottom' | 'left';

export interface WorkflowConnection {
  id: number;
  workflow_id: number;
  source_node_id: number;
  target_node_id: number;
  connection_type: ConnectionType;
  name?: string;  // Custom name for this transition (optional, e.g., 'Start Work', 'Merge')
  condition_config?: ConditionConfig;
  priority?: number;
  source_handle?: HandlePosition;
  target_handle?: HandlePosition;
  event_type?: string;  // Event that triggers this transition (e.g., 'issue_created', 'manual_transition')
  properties?: Record<string, any>;  // Custom properties for this transition
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface WorkflowConnectionCreate {
  source_node_id: number;
  target_node_id: number;
  connection_type?: ConnectionType;
  name?: string;
  condition_config?: ConditionConfig;
  priority?: number;
  source_handle?: HandlePosition;
  target_handle?: HandlePosition;
  event_type?: string;
  properties?: Record<string, any>;
}

export interface WorkflowConnectionUpdate {
  id: number;
  source_node_id?: number;
  target_node_id?: number;
  connection_type?: ConnectionType;
  name?: string;
  condition_config?: ConditionConfig;
  priority?: number;
  source_handle?: HandlePosition;
  target_handle?: HandlePosition;
  event_type?: string;
  properties?: Record<string, any>;
}

// ========================================
// Graph Types
// ========================================

export interface WorkflowGraph {
  workflow: WorkflowSummary;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

// ========================================
// Batch Operation Types
// ========================================

export interface BatchNodeOperation {
  create?: WorkflowNodeCreate[];
  update?: WorkflowNodeUpdate[];
  delete?: number[];
}

export interface BatchNodeResult {
  created: WorkflowNode[];
  updated: WorkflowNode[];
  deleted: number[];
}

export interface BatchConnectionOperation {
  create?: WorkflowConnectionCreate[];
  update?: WorkflowConnectionUpdate[];
  delete?: number[];
}

export interface BatchConnectionResult {
  created: WorkflowConnection[];
  updated: WorkflowConnection[];
  deleted: number[];
}

// ========================================
// Validation Types
// ========================================

export interface ValidationError {
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

// ========================================
// API Response Types
// ========================================

export interface WorkflowListParams {
  search?: string;
  status?: WorkflowStatus;
  ordering?: string;
  project_id?: number;
  creator?: number;
  page?: number;
  page_size?: number;
}

export interface WorkflowListResponse {
  results: WorkflowSummary[];
  count: number;
}

// ========================================
// Workflow Rule Types
// ========================================

export type RuleType = "restrict_transition" | "validate_details" | "perform_actions";

export type RuleSubtype =
  // Restrict Transition subtypes
  | "block_until_approval"
  | "restrict_by_subtasks"
  | "restrict_from_all_users"
  | "restrict_by_field_value"
  | "restrict_by_previous_status"
  | "restrict_by_user_status_update"
  | "restrict_by_user_role"
  // Validate Details subtypes
  | "require_form_attached"
  | "require_form_submission"
  | "validate_field"
  | "validate_previous_status"
  | "validate_parent_status"
  | "validate_user_permission"
  | "show_screen"
  // Perform Actions subtypes
  | "assign_issue"
  | "copy_field_value"
  | "set_security_level"
  | "trigger_webhook"
  | "update_field";

export interface RuleTypeInfo {
  label: string;
  description: string;
  subtypes: RuleSubtypeInfo[];
}

export interface RuleSubtypeInfo {
  key: RuleSubtype;
  label: string;
  description: string;
}

export interface RuleTypesResponse {
  restrict_transition: RuleTypeInfo;
  validate_details: RuleTypeInfo;
  perform_actions: RuleTypeInfo;
}

export interface WorkflowRule {
  id: number;
  connection_id: number;
  rule_type: RuleType;
  rule_subtype: RuleSubtype;
  name?: string;
  description?: string;
  configuration: Record<string, any>;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface WorkflowRuleCreate {
  rule_type: RuleType;
  rule_subtype: RuleSubtype;
  name?: string;
  description?: string;
  configuration?: Record<string, any>;
  order?: number;
  is_active?: boolean;
}

export interface WorkflowRuleUpdate {
  id: number;
  rule_type?: RuleType;
  rule_subtype?: RuleSubtype;
  name?: string;
  description?: string;
  configuration?: Record<string, any>;
  order?: number;
  is_active?: boolean;
}

// ========================================
// Enhanced Workflow Detail Type
// ========================================

export interface WorkflowDetail extends WorkflowSummary {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}


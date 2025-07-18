'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import ModuleApproverEditor from '@/components/ui/ModuleApproverEditor';

// 1. 写死MODULES列表，使用实际的权限名称作为key
const MODULES = [
  {
    id: 'asset',
    name: 'Asset Management',
    description: 'Asset Management module approvals',
    permissionKey: 'ASSET MANAGEMENT_VIEW', // 修改：使用实际的权限名称
  },
  {
    id: 'campaign',
    name: 'Campaign Execution',
    description: 'Campaign Execution module approvals',
    permissionKey: 'CAMPAIGN EXECUTION_VIEW', // 修改：使用实际的权限名称
  },
  {
    id: 'budget',
    name: 'Budget Approval',
    description: 'Budget Approval module approvals',
    permissionKey: 'BUDGET APPROVAL_VIEW', // 修改：使用实际的权限名称
  },
];

const ApproversPage = () => {
  // 2. 页面加载时fetch /api/access_control/permissions/，建立key到数字id的映射
  const [permissionMap, setPermissionMap] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/access_control/permissions/');
        if (!res.ok) throw new Error('Failed to fetch permissions');
        const data = await res.json();
        
        // 修改：使用 name 字段作为key，id 字段作为value
        const map: { [key: string]: number } = {};
        data.forEach((p: any) => {
          if (p.name && p.id) {
            map[p.name] = p.id;
          }
        });
        
        console.log('Permission data:', data); // 调试用
        console.log('Permission map:', map); // 调试用
        setPermissionMap(map);
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  if (loading) return <Layout><div>Loading...</div></Layout>;
  if (error) return <Layout><div className="text-red-500">{error}</div></Layout>;

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Approver Management</h1>
        <div className="space-y-6">
          {/* 3. 渲染ModuleApproverEditor时查表取对应的权限id */}
          {MODULES.map(module => {
            const permissionId = permissionMap[module.permissionKey];
            
            if (!permissionId) {
              console.log(`No permission found for key: ${module.permissionKey}`); // 调试用
              console.log('Available permissions:', Object.keys(permissionMap)); // 调试用
              return null; // 没有对应权限则不渲染
            }
            
            return (
              <ModuleApproverEditor
                key={module.id}
                permissionId={permissionId}
                moduleName={module.name}
                moduleDescription={module.description}
                requiresApproval={true}
              />
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default ApproversPage;
'use client';
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import { RemovablePicker } from "@/components/ui/RemovablePicker";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useState, useEffect } from "react";
import { approverApi } from "@/lib/api/approverApi";
import { TEAM_ROLES } from "@/lib/constants/teamRoles";
import DropdownMenu from "@/components/ui/DropdownMenu";
import { ChevronDown, Users, AlertCircle } from 'lucide-react';
import TeamAPI from "@/lib/api/teamApi";
import { TeamDetailResponse } from "@/types/team";
import { useAuthStore } from "@/lib/authStore";
import Modal from "@/components/ui/Modal";



function TeamsPageContent() {
  // Auth store
  const { user, userTeams, selectedTeamId, setSelectedTeamId, getUserTeams } = useAuthStore();

  // State for team management
  const [users, setUsers] = useState<{id: number, username: string, email: string}[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newMember, setNewMember] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<number>(TEAM_ROLES.MEMBER);
  const [editingMember, setEditingMember] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
  const [errorAddMember, setErrorAddMember] = useState(false);
  const [errorRemoveMember, setErrorRemoveMember] = useState(false);
  const [errorUpdateRole, setErrorUpdateRole] = useState(false);
  
  // Edit role modal state
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [memberRoleChanges, setMemberRoleChanges] = useState<Record<number, number>>({});
  
  // State for team data
  const [teamList, setTeamList] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState<number | null>(null);
  const [teamDetails, setTeamDetails] = useState<Record<number, any>>({});

  // Handle member selection
  const handleMemberSelect = (memberId: number) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
    setEditingMember(newSelected.size > 0);
  };

  // Handle team selection for editing
  const handleTeamSelect = (teamId: number) => {
    setSelectedTeamForEdit(teamId);
    setSelectedMembers(new Set());
    setEditingMember(false);
  };

  // Check if current user is leader of the selected team
  const isCurrentUserLeader = (teamId: number): boolean => {
    if (!user?.id || !teamDetails[teamId]) return false;
    
    const currentUserMember = teamDetails[teamId].members?.find(
      (member: any) => member.user_id === user.id
    );
    
    return currentUserMember?.role_id === TEAM_ROLES.LEADER;
  };

  // Handle add member to team
  const handleAddMemberToTeam = async (teamId: number, userId: number, roleId: number) => {
    try {
      console.log('Adding member:', {
        teamId: teamId,
        userId: userId,
        role: roleId,
        roleName: roleId === TEAM_ROLES.LEADER ? 'Team Leader' : 'Member'
      });
      const response = await TeamAPI.addMemberToTeam(teamId, userId, roleId);
      console.log(`✅ Member added to team:`, response);
      setErrorAddMember(false);
      
      // Clear the form after successful addition
      setNewMember(null);
      setSelectedRole(TEAM_ROLES.MEMBER);
      
      // Refresh team details to show the new member
      if (selectedTeamForEdit) {
        try {
          const updatedTeamDetail = await TeamAPI.getTeamDetail(selectedTeamForEdit);
          setTeamDetails(prev => ({
            ...prev,
            [selectedTeamForEdit]: { id: selectedTeamForEdit, ...updatedTeamDetail }
          }));
          
          // Also update the team list
          setTeamList(prev => prev.map(team => 
            team.id === selectedTeamForEdit 
              ? { ...team, ...updatedTeamDetail }
              : team
          ));
        } catch (refreshError) {
          console.error('Failed to refresh team data:', refreshError);
        }
      }
      
      
    } catch (error) {
      console.error('Failed to add member:', error);
      setErrorAddMember(true);
    }
  };

  // Handle remove members from team
  const handleRemoveMembersFromTeam = async (teamId: number, userIds: number[]) => {
    try {
      setErrorRemoveMember(false);
      
      console.log('Removing members:', {
        teamId: teamId,
        userIds: userIds,
        count: userIds.length
      });

      // Remove each member
      const removePromises = userIds.map(userId => 
        TeamAPI.removeMemberFromTeam(teamId, userId)
      );
      
      await Promise.all(removePromises);
      console.log(`✅ ${userIds.length} member(s) removed from team`);
      
      // Clear selection
      setSelectedMembers(new Set());
      setEditingMember(false);
      
      // Refresh team details to show updated member list
      if (selectedTeamForEdit) {
        try {
          const updatedTeamDetail = await TeamAPI.getTeamDetail(selectedTeamForEdit);
          setTeamDetails(prev => ({
            ...prev,
            [selectedTeamForEdit]: { id: selectedTeamForEdit, ...updatedTeamDetail }
          }));
          
          // Also update the team list
          setTeamList(prev => prev.map(team => 
            team.id === selectedTeamForEdit 
              ? { ...team, ...updatedTeamDetail }
              : team
          ));
        } catch (refreshError) {
          console.error('Failed to refresh team data after removal:', refreshError);
        }
      }
      
    } catch (error) {
      console.error('Failed to remove members:', error);
      setErrorRemoveMember(true);
    }
  };

  // Handle remove members with confirmation
  const handleRemoveMembersWithConfirmation = (teamId: number, userIds: number[]) => {
    const memberCount = userIds.length;
    const memberText = memberCount === 1 ? 'member' : 'members';
    
    const confirmed = window.confirm(
      `Are you sure you want to remove ${memberCount} ${memberText} from the team?\n\nThis action cannot be undone.`
    );
    
    if (confirmed) {
      handleRemoveMembersFromTeam(teamId, userIds);
    }
  };

  // Handle edit role modal
  const handleEditRoleClick = () => {
    if (selectedTeamForEdit && selectedMembers.size > 0) {
      // Initialize role changes with current roles
      const initialChanges: Record<number, number> = {};
      selectedMembers.forEach(userId => {
        const member = teamDetails[selectedTeamForEdit].members?.find((m: any) => m.user_id === userId);
        if (member) {
          initialChanges[userId] = member.role_id;
        }
      });
      setMemberRoleChanges(initialChanges);
      setIsEditRoleModalOpen(true);
    }
  };

  // Handle role change in modal
  const handleRoleChange = (userId: number, newRoleId: number) => {
    setMemberRoleChanges(prev => ({
      ...prev,
      [userId]: newRoleId
    }));
  };

  // Handle save role changes
  const handleSaveRoleChanges = async () => {
    if (!selectedTeamForEdit) return;

    try {
      setErrorUpdateRole(false);
      
      const updatePromises = Object.entries(memberRoleChanges).map(([userId, roleId]) => 
        TeamAPI.updateMemberRole(selectedTeamForEdit, parseInt(userId), roleId)
      );
      
      await Promise.all(updatePromises);
      console.log(`✅ ${Object.keys(memberRoleChanges).length} member role(s) updated`);
      
      // Close modal and clear selection
      setIsEditRoleModalOpen(false);
      setMemberRoleChanges({});
      setSelectedMembers(new Set());
      setEditingMember(false);
      
      // Refresh team details
      try {
        const updatedTeamDetail = await TeamAPI.getTeamDetail(selectedTeamForEdit);
        setTeamDetails(prev => ({
          ...prev,
          [selectedTeamForEdit]: { id: selectedTeamForEdit, ...updatedTeamDetail }
        }));
        
        // Also update the team list
        setTeamList(prev => prev.map(team => 
          team.id === selectedTeamForEdit 
            ? { ...team, ...updatedTeamDetail }
            : team
        ));
      } catch (refreshError) {
        console.error('Failed to refresh team data after role update:', refreshError);
      }
      
    } catch (error) {
      console.error('Failed to update member roles:', error);
      setErrorUpdateRole(true);
    }
  };

  // Handle cancel role changes
  const handleCancelRoleChanges = () => {
    setIsEditRoleModalOpen(false);
    setMemberRoleChanges({});
  };

  // get team roles for dropdown
  const teamRoles = [
    {
      type: 'option',
      label: 'Team Leader',
      onClick: () => setSelectedRole(TEAM_ROLES.LEADER),
      className: selectedRole === TEAM_ROLES.LEADER ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
    },
    {
      type: 'option', 
      label: 'Member',
      onClick: () => setSelectedRole(TEAM_ROLES.MEMBER),
      className: selectedRole === TEAM_ROLES.MEMBER ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
    }
  ];

  // Fetch user teams on component mount
  useEffect(() => {
    const fetchUserTeams = async () => {
      try {
        setLoadingTeams(true);
        setTeamsError(null);
        
        const result = await getUserTeams();
        if (result.success) {
          // Get team details for each team
          const teamDetailsPromises = userTeams.map(async (teamId) => {
            try {
              const teamDetail = await TeamAPI.getTeamDetail(teamId);
              return { id: teamId, ...teamDetail };
            } catch (error) {
              console.error(`Failed to fetch details for team ${teamId}:`, error);
              return { id: teamId, name: `Team ${teamId}`, members: [] };
            }
          });
          
          const teamDetails = await Promise.all(teamDetailsPromises);
          setTeamList(teamDetails);
          
          // Set team details for easy access
          const detailsMap: Record<number, any> = {};
          teamDetails.forEach(team => {
            detailsMap[team.id] = team;
          });
          setTeamDetails(detailsMap);
        } else {
          setTeamsError(result.error || 'Failed to fetch teams');
        }
      } catch (error) {
        console.error('Error fetching user teams:', error);
        setTeamsError('Failed to fetch teams');
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchUserTeams();
  }, []); // Empty dependency array - only run on mount

  // Update team list when userTeams changes
  useEffect(() => {
    if (userTeams.length > 0) {
      const fetchTeamDetails = async () => {
        try {
          const teamDetailsPromises = userTeams.map(async (teamId) => {
            try {
              const teamDetail = await TeamAPI.getTeamDetail(teamId);
              return { id: teamId, ...teamDetail };
            } catch (error) {
              console.error(`Failed to fetch details for team ${teamId}:`, error);
              return { id: teamId, name: `Team ${teamId}`, members: [] };
            }
          });
          
          const teamDetails = await Promise.all(teamDetailsPromises);
          setTeamList(teamDetails);
          
          // Set team details for easy access
          const detailsMap: Record<number, any> = {};
          teamDetails.forEach(team => {
            detailsMap[team.id] = team;
          });
          setTeamDetails(detailsMap);
        } catch (error) {
          console.error('Error fetching team details:', error);
        }
      };

      fetchTeamDetails();
    } else {
      setTeamList([]);
      setTeamDetails({});
    }
  }, [userTeams]);

  // Fetch existing users for adding members
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const users = await approverApi.getAllUsers();
        setUsers(users);
      } catch (err) {
        console.error('Error fetching users:', err);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
    setErrorAddMember(false);
    setErrorRemoveMember(false);
    setErrorUpdateRole(false);
  }, []);



  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">

            {/* Page Header */}
            <div className="flex flex-col gap-4">
              <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
              <p className="text-gray-600 text-sm">
                Manage your team members and their roles.
              </p>
            </div>

            {/* Loading State */}
            {loadingTeams && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading teams...</p>
              </div>
            )}

            {/* Error State */}
            {teamsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Failed to load teams</h3>
                    <p className="text-sm text-red-600 mt-1">{teamsError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* No Teams State */}
            {!loadingTeams && !teamsError && teamList.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Found</h3>
                <p className="text-gray-600">
                  You are not currently associated with any teams. Please contact your administrator to be added to a team.
                </p>
              </div>
            )}

            {/* Teams List */}
            {!loadingTeams && !teamsError && teamList.length > 0 && (
              <div className="space-y-6">

                {/* Team Selection */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Team to Manage</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamList.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => handleTeamSelect(team.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          selectedTeamForEdit === team.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <h3 className="font-medium text-gray-900">{team.team?.name || `Team ${team.id}`}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {team.members?.length || 0} members
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Management Section */}
                {selectedTeamForEdit && teamDetails[selectedTeamForEdit] && (
                  <div className="p-6 space-y-1 bg-white rounded-lg shadow-sm border border-gray-200">
                    {/* Team Header */}
                    <div className=" py-6">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {teamDetails[selectedTeamForEdit].team?.name || `Team ${selectedTeamForEdit}`}
                      </h2>
                    </div>

                    {/* Add New Member - Only visible to team leaders */}
                    {selectedTeamForEdit && isCurrentUserLeader(selectedTeamForEdit) && (
                      <div className="py-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Member</h3>
                      <div className="flex flex-row gap-4 items-center">
                        <RemovablePicker 
                          options={users.map(user => ({ value: user.id.toString(), label: user.username }))} 
                          placeholder="Select a user" 
                          value={newMember}
                          onChange={(val) => setNewMember(val)}
                          loading={loadingUsers}
                        />

                        <p>as</p>
                        
                        <DropdownMenu
                          trigger={
                            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 cursor-pointer">
                              <span className="text-sm text-gray-700">
                                {selectedRole === TEAM_ROLES.LEADER ? 'Team Leader' : 'Member'}
                              </span>
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            </div>
                          } 
                          items={teamRoles}
                        />

                        <button 
                          className="px-4 py-2 rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                          disabled={!newMember}
                          onClick={() => {
                            if (newMember) {
                              handleAddMemberToTeam(selectedTeamForEdit, parseInt(newMember), selectedRole);
                            }
                          }}
                        >
                          Add Member
                        </button>
                      </div>
                    </div>
                    )}

                     {/* Error State - Add Member */}
                     {errorAddMember && (
                       <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                         <div className="flex items-center gap-3">
                           <AlertCircle className="h-5 w-5 text-red-500" />
                           <div>
                             <h3 className="text-sm font-medium text-red-800">Failed to add member</h3>
                             <p className="text-sm text-red-600 mt-1">
                               There was an error adding the member to the team. Please try again.
                             </p>
                           </div>
                         </div>
                       </div>
                     )}

                     {/* Error State - Remove Member */}
                     {errorRemoveMember && (
                       <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                         <div className="flex items-center gap-3">
                           <AlertCircle className="h-5 w-5 text-red-500" />
                           <div>
                             <h3 className="text-sm font-medium text-red-800">Failed to remove member(s)</h3>
                             <p className="text-sm text-red-600 mt-1">
                               There was an error removing the member(s) from the team. Please try again.
                             </p>
                           </div>
                         </div>
                       </div>
                     )}

                    {/* Team Members Table */}
                    <div className="py-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Team Members</h3>
                      <Table>  
                        <TableHeader>
                          <TableRow>
                            {selectedTeamForEdit && isCurrentUserLeader(selectedTeamForEdit) && (
                              <TableHead className="w-12">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  onChange={(e) => {
                                    const allMemberIds = teamDetails[selectedTeamForEdit].members
                                      ?.map((m: any) => m.user_id)
                                      .filter((userId: number) => userId !== user?.id) || []; // exclude the current user
                                    if (e.target.checked) {
                                      setSelectedMembers(new Set(allMemberIds));
                                      setEditingMember(true);
                                    } else {
                                      setSelectedMembers(new Set());
                                      setEditingMember(false);
                                    }
                                  }}
                                  checked={selectedMembers.size > 0 
                                    && selectedMembers.size === (teamDetails[selectedTeamForEdit].members?.filter((m: any) => m.user_id !== user?.id).length || 0)} // exclude the current user
                                />
                              </TableHead>
                            )}
                            <TableHead>User ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Team Role</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamDetails[selectedTeamForEdit].members?.map((member: any) => {
                            const isCurrentUser = member.user_id === user?.id;
                            return (
                              <TableRow key={member.user_id}>
                                {selectedTeamForEdit && isCurrentUserLeader(selectedTeamForEdit) && (
                                  <TableCell>
                                    <input 
                                      type="checkbox" 
                                      className={`rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                                        isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      checked={selectedMembers.has(member.user_id)}
                                      onChange={() => !isCurrentUser && handleMemberSelect(member.user_id)}
                                      disabled={isCurrentUser}
                                      title={isCurrentUser ? 'You cannot remove yourself from the team' : ''}
                                    />
                                  </TableCell>
                                )}
                                <TableCell>{member.user_id}</TableCell>
                                <TableCell className={isCurrentUser ? 'font-medium text-indigo-600' : ''}>
                                  {member.username || 'Unknown'}
                                  {isCurrentUser && <span className="ml-2 text-xs text-indigo-500">(You)</span>}
                                </TableCell>
                                <TableCell>{member.email || 'Unknown'}</TableCell>
                                <TableCell>{member.role_name || 'Unknown'}</TableCell>
                              </TableRow>
                            );
                          }) || (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                                No members found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Operations - Only visible to team leaders */}
                    {editingMember && selectedTeamForEdit && isCurrentUserLeader(selectedTeamForEdit) && (
                      <div className="py-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Members ({selectedMembers.size})</h3>
                        <div className="flex flex-row justify-center gap-4">
                          <button 
                            className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-yellow-600 text-white hover:bg-yellow-700"
                            onClick={handleEditRoleClick}
                          >
                            Edit Role
                          </button>
                          <button 
                            className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-red-600 text-white hover:bg-red-700"
                            onClick={() => {
                              if (selectedTeamForEdit && selectedMembers.size > 0) {
                                const userIds = Array.from(selectedMembers);
                                handleRemoveMembersWithConfirmation(selectedTeamForEdit, userIds);
                              }
                            }}
                          >
                            Remove ({selectedMembers.size})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Role Modal */}
      <Modal isOpen={isEditRoleModalOpen} onClose={handleCancelRoleChanges}>
        <div className="bg-white rounded-lg shadow-xl min-h-[75vh]">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Edit Member Roles</h3>
            <p className="text-sm text-gray-600 mt-1">
              Update roles for {selectedMembers.size} selected member(s)
            </p>
          </div>
          
          <div className="px-6 py-4 min-h-[50vh] overflow-y-auto">
            {errorUpdateRole && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Failed to update roles</h3>
                    <p className="text-sm text-red-600 mt-1">
                      There was an error updating the member roles. Please try again.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {selectedTeamForEdit && Array.from(selectedMembers).map(userId => {
                const member = teamDetails[selectedTeamForEdit]?.members?.find((m: any) => m.user_id === userId);
                if (!member) return null;
                
                const currentRoleId = memberRoleChanges[userId] || member.role_id;
                const isCurrentUser = userId === user?.id;
                
                return (
                  <div key={userId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {member.username || 'Unknown'}
                            {isCurrentUser && <span className="ml-2 text-xs text-indigo-500">(You)</span>}
                          </h4>
                          <p className="text-sm text-gray-600">{member.email || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">Current:</span>
                      <span className="text-sm font-medium text-gray-700">{member.role_name}</span>
                      <span className="text-gray-300">→</span>
                      <DropdownMenu
                        trigger={
                          <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 cursor-pointer">
                            <span className="text-sm text-gray-700">
                              {currentRoleId === TEAM_ROLES.LEADER ? 'Team Leader' : 'Member'}
                            </span>
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </div>
                        }
                        items={[
                          {
                            type: 'option',
                            label: 'Team Leader',
                            onClick: () => handleRoleChange(userId, TEAM_ROLES.LEADER),
                            className: currentRoleId === TEAM_ROLES.LEADER ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                          },
                          {
                            type: 'option',
                            label: 'Member',
                            onClick: () => handleRoleChange(userId, TEAM_ROLES.MEMBER),
                            className: currentRoleId === TEAM_ROLES.MEMBER ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                          }
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={handleCancelRoleChanges}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRoleChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  )

}

export default function TeamsPage() {
  return (
    <ProtectedRoute>
      <TeamsPageContent />
    </ProtectedRoute>
  )
}
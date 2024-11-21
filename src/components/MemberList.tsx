import React, { useState, useEffect } from 'react';
import { UserPlus, X, Search, UserMinus, Upload } from 'lucide-react';
import { useChatStore } from '../store';
import { UserProfile } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function MemberList({ groupId }: { groupId: string }) {
  const { groups, addMember, addMembers, removeMember, searchUsers, user } = useChatStore();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingBulk, setIsAddingBulk] = useState(false);
  const [error, setError] = useState('');
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  const group = groups.find(g => g.id === groupId);
  if (!group) return null;

  useEffect(() => {
    const fetchMemberProfiles = async () => {
      if (!group.memberEmails?.length) {
        setMemberProfiles([]);
        setIsLoadingProfiles(false);
        return;
      }

      try {
        const profiles = await Promise.all(
          group.memberEmails.map(async (email) => {
            const userDoc = await getDoc(doc(db, 'users', email));
            return userDoc.data() as UserProfile;
          })
        );

        setMemberProfiles(profiles.filter(Boolean));
      } catch (error) {
        console.error('Error fetching member profiles:', error);
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    setIsLoadingProfiles(true);
    fetchMemberProfiles();
  }, [group.memberEmails]);

  useEffect(() => {
    const searchMembers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        const filteredResults = results.filter(
          user => !group.memberEmails.includes(user.email)
        );
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchMembers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, group.memberEmails]);

  const handleAddMember = async (email: string) => {
    try {
      await addMember(groupId, email);
      setSearchQuery('');
      setShowAddMember(false);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkEmails.trim() || isAddingBulk) return;

    try {
      setError('');
      setIsAddingBulk(true);

      const emails = bulkEmails
        .split(/[\n,]/) // Split by newline or comma
        .map(email => email.trim())
        .filter(email => email); // Remove empty strings

      await addMembers(groupId, emails);
      setShowBulkAdd(false);
      setBulkEmails('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAddingBulk(false);
    }
  };

  return (
    <div className="w-64 border-l border-gray-200 bg-gray-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">Members</h3>
          <div className="flex space-x-1">
            <button
              onClick={() => {
                setShowBulkAdd(true);
                setError('');
                setBulkEmails('');
              }}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
              title="Bulk add members"
            >
              <Upload className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => {
                setShowAddMember(true);
                setError('');
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
              title="Add member"
            >
              <UserPlus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {isLoadingProfiles ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {memberProfiles.map((member) => (
              <div
                key={member.email}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {member.nickname.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {member.nickname}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {member.email}
                  </p>
                </div>
                {group.createdBy === member.email ? (
                  <span className="text-xs text-gray-500">Owner</span>
                ) : group.createdBy === user?.email && (
                  <button
                    onClick={() => removeMember(groupId, member.email)}
                    className="p-1 hover:bg-gray-200 rounded-full"
                  >
                    <UserMinus className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {showAddMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Add Member</h3>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setError('');
                    setSearchQuery('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email or nickname..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-[200px]">
                {isSearching ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                ) : searchQuery.trim().length < 2 ? (
                  <p className="text-center text-gray-500 mt-4">
                    Type at least 2 characters to search
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-gray-500 mt-4">
                    No users found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <button
                        key={user.email}
                        onClick={() => handleAddMember(user.email)}
                        className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {user.nickname.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">{user.nickname}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showBulkAdd && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Bulk Add Members</h3>
                <button
                  onClick={() => {
                    setShowBulkAdd(false);
                    setError('');
                    setBulkEmails('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Addresses
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Enter email addresses separated by commas or newlines
                </p>
                <textarea
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                  rows={6}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowBulkAdd(false);
                    setError('');
                    setBulkEmails('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAdd}
                  disabled={!bulkEmails.trim() || isAddingBulk}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isAddingBulk ? 'Adding...' : 'Add Members'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Group, UserProfile } from '../../types';
import { StateCreator } from 'zustand';
import { ChatState } from '../types';

export interface GroupSlice {
  groups: Group[];
  activeGroupId: string | null;
  setActiveGroup: (groupId: string | null) => void;
  addGroup: (name: string) => Promise<void>;
  addMember: (groupId: string, email: string) => Promise<void>;
  addMembers: (groupId: string, emails: string[]) => Promise<void>;
  removeMember: (groupId: string, email: string) => Promise<void>;
  searchUsers: (searchQuery: string) => Promise<UserProfile[]>;
}

export const createGroupSlice: StateCreator<ChatState, [], [], GroupSlice> = (set, get) => ({
  groups: [],
  activeGroupId: null,

  setActiveGroup: (groupId) => {
    set({ activeGroupId: groupId });
  },

  addMembers: async (groupId: string, emails: string[]) => {
    const { user } = get();
    if (!user) throw new Error('User not authenticated');

    try {
      // Validate emails
      const validEmails = emails.filter(email => 
        email && typeof email === 'string' && email.includes('@')
      );

      if (validEmails.length === 0) {
        throw new Error('No valid email addresses provided');
      }

      // Check if users exist
      const userChecks = await Promise.all(
        validEmails.map(async (email) => {
          const userDoc = await getDoc(doc(db, 'users', email));
          return {
            email,
            exists: userDoc.exists()
          };
        })
      );

      const nonExistentUsers = userChecks
        .filter(check => !check.exists)
        .map(check => check.email);

      if (nonExistentUsers.length > 0) {
        throw new Error(`Users not found: ${nonExistentUsers.join(', ')}`);
      }

      // Get current group
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      const group = groupDoc.data();

      if (!group) {
        throw new Error('Group not found');
      }

      // Filter out emails that are already members
      const newMembers = validEmails.filter(
        email => !group.memberEmails?.includes(email)
      );

      if (newMembers.length === 0) {
        throw new Error('All users are already members of this group');
      }

      // Add new members
      await updateDoc(groupRef, {
        memberEmails: arrayUnion(...newMembers)
      });

      // Update local state
      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? {
                ...g,
                memberEmails: [...(g.memberEmails || []), ...newMembers]
              }
            : g
        ),
        error: null
      }));

      return newMembers;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // ... rest of the existing methods remain the same ...
});
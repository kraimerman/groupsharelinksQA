import { create } from 'zustand';
import { ChatState } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createGroupSlice } from './slices/groupSlice';
import { createLinkSlice } from './slices/linkSlice';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export const useChatStore = create<ChatState>((set, get, api) => ({
  user: null,
  userProfile: null,
  loading: true,
  error: null,
  groups: [],
  activeGroupId: null,

  init: () => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        set({ user: null, userProfile: null, loading: false });
        return;
      }

      try {
        // Get user profile
        const userDoc = await getDoc(doc(db, 'users', user.email!));
        const userProfile = userDoc.data();

        // Get user's groups
        const groupsQuery = query(
          collection(db, 'groups'),
          where('memberEmails', 'array-contains', user.email)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        const groups = groupsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        set({ 
          user,
          userProfile,
          groups,
          loading: false,
          error: null
        });
      } catch (error) {
        set({ 
          error: (error as Error).message,
          loading: false
        });
      }
    });
  },

  ...createAuthSlice(set, get, api),
  ...createGroupSlice(set, get, api),
  ...createLinkSlice(set, get, api)
}));
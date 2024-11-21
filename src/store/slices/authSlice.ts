import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { UserProfile, Link, Group } from '../../types';
import { StateCreator } from 'zustand';
import { ChatState } from '../types';

export interface AuthSlice {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (nickname: string) => Promise<void>;
}

export const createAuthSlice: StateCreator<ChatState, [], [], AuthSlice> = (set, get) => ({
  signIn: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.email!));
      const userProfile = userDoc.data() as UserProfile;
      
      set({ 
        user: userCredential.user,
        userProfile,
        error: null 
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  signUp: async (email: string, password: string, nickname: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userProfile: UserProfile = {
        email,
        nickname: nickname.trim(),
        createdAt: Date.now(),
      };
      
      await setDoc(doc(db, 'users', email), userProfile);
      
      set({
        user: userCredential.user,
        userProfile,
        groups: [],
        error: null
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      set({ 
        user: null, 
        userProfile: null,
        groups: [],
        activeGroupId: null,
        error: null 
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateProfile: async (nickname: string) => {
    const { user, userProfile } = get();
    if (!user || !userProfile) throw new Error('User not authenticated');

    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) throw new Error('Nickname cannot be empty');
    if (trimmedNickname === userProfile.nickname) return;

    try {
      const updatedProfile = {
        ...userProfile,
        nickname: trimmedNickname
      };

      // Update user profile
      await updateDoc(doc(db, 'users', user.email!), updatedProfile);

      // Find all groups where the user is a member
      const groupsQuery = query(
        collection(db, 'groups'),
        where('memberEmails', 'array-contains', user.email)
      );
      const groupsSnapshot = await getDocs(groupsQuery);

      // Update nickname in all groups' links and comments
      const groupUpdates = groupsSnapshot.docs.map(async (groupDoc) => {
        const groupData = groupDoc.data() as Group;
        let hasChanges = false;

        const updatedLinks = (groupData.links || []).map((link: Link) => {
          let linkChanged = false;

          // Update link author nickname
          if (link.author === user.email) {
            link = {
              ...link,
              authorNickname: trimmedNickname
            };
            linkChanged = true;
          }

          // Update comment author nicknames
          const updatedComments = (link.comments || []).map(comment => {
            if (comment.author === user.email) {
              linkChanged = true;
              return { ...comment, authorNickname: trimmedNickname };
            }
            return comment;
          });

          if (linkChanged) {
            hasChanges = true;
            return { ...link, comments: updatedComments };
          }
          return link;
        });

        if (hasChanges) {
          await updateDoc(doc(db, 'groups', groupDoc.id), { links: updatedLinks });
          return {
            id: groupDoc.id,
            ...groupData,
            links: updatedLinks
          };
        }

        return {
          id: groupDoc.id,
          ...groupData
        };
      });

      const updatedGroups = await Promise.all(groupUpdates);

      // Update local state
      set(state => ({
        userProfile: updatedProfile,
        groups: updatedGroups as Group[],
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  }
});
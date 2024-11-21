import { create } from 'zustand';
import { ChatState } from './types';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, addDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export const useChatStore = create<ChatState>((set, get) => ({
  user: null,
  userProfile: null,
  loading: true,
  error: null,
  groups: [],
  activeGroupId: null,

  init: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

    return unsubscribe;
  },

  signIn: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.email!));
      const userProfile = userDoc.data();
      
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
      const userProfile = {
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

    try {
      await updateDoc(doc(db, 'users', user.email!), { nickname });
      set(state => ({
        userProfile: { ...state.userProfile!, nickname },
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  setActiveGroup: (groupId) => {
    set({ activeGroupId: groupId });
  },

  addGroup: async (name: string) => {
    const { user, userProfile } = get();
    if (!user || !userProfile) throw new Error('User not authenticated');

    try {
      const groupData = {
        name: name.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=random`,
        createdBy: user.email,
        memberEmails: [user.email],
        links: [],
        createdAt: Date.now()
      };

      const groupRef = await addDoc(collection(db, 'groups'), groupData);
      const newGroup = { id: groupRef.id, ...groupData };
      
      set(state => ({ 
        groups: [...state.groups, newGroup],
        activeGroupId: groupRef.id,
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  addMember: async (groupId: string, email: string) => {
    const { user } = get();
    if (!user) throw new Error('User not authenticated');

    try {
      const userDoc = await getDoc(doc(db, 'users', email));
      if (!userDoc.exists()) throw new Error('User not found');

      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        memberEmails: arrayUnion(email)
      });

      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? {
                ...g,
                memberEmails: [...g.memberEmails, email]
              }
            : g
        ),
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
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
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  removeMember: async (groupId: string, email: string) => {
    const { user } = get();
    if (!user) throw new Error('User not authenticated');

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      const group = groupDoc.data();

      if (!group) throw new Error('Group not found');
      if (group.createdBy !== user.email) {
        throw new Error('Only group creator can remove members');
      }
      if (email === user.email) {
        throw new Error('Cannot remove yourself');
      }

      await updateDoc(groupRef, {
        memberEmails: arrayRemove(email)
      });

      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? {
                ...g,
                memberEmails: g.memberEmails.filter(e => e !== email)
              }
            : g
        ),
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  searchUsers: async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      return [];
    }

    try {
      const usersRef = collection(db, 'users');
      const searchTerm = searchQuery.toLowerCase().trim();

      // Create queries for both email and nickname
      const emailQuery = query(
        usersRef,
        where('email', '>=', searchTerm),
        where('email', '<=', searchTerm + '\uf8ff')
      );

      const nicknameQuery = query(
        usersRef,
        where('nickname', '>=', searchTerm),
        where('nickname', '<=', searchTerm + '\uf8ff')
      );

      // Execute both queries
      const [emailResults, nicknameResults] = await Promise.all([
        getDocs(emailQuery),
        getDocs(nicknameQuery)
      ]);

      // Combine results and remove duplicates using a Map
      const resultsMap = new Map();

      [...emailResults.docs, ...nicknameResults.docs].forEach(doc => {
        const data = doc.data();
        if (!resultsMap.has(data.email)) {
          resultsMap.set(data.email, data);
        }
      });

      return Array.from(resultsMap.values());
    } catch (error) {
      console.error('Search users error:', error);
      return []; // Return empty array instead of throwing to prevent UI errors
    }
  },

  shareLink: async (groupId: string, url: string, title: string, description: string) => {
    const { user, userProfile } = get();
    if (!user || !userProfile) throw new Error('User not authenticated');

    try {
      const newLink = {
        id: crypto.randomUUID(),
        url: url.trim(),
        title: title.trim(),
        description: description.trim(),
        author: user.email!,
        authorNickname: userProfile.nickname,
        timestamp: Date.now(),
        votes: { up: [], down: [] },
        comments: []
      };

      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        links: arrayUnion(newLink)
      });

      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? { ...g, links: [...(g.links || []), newLink] }
            : g
        ),
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateLink: async (groupId: string, linkId: string, updates: Partial<Link>) => {
    const { user } = get();
    if (!user) throw new Error('User not authenticated');

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      const group = groupDoc.data();

      if (!group) throw new Error('Group not found');
      
      const links = group.links || [];
      const linkIndex = links.findIndex((l: Link) => l.id === linkId);
      if (linkIndex === -1) throw new Error('Link not found');
      
      const link = links[linkIndex];
      if (link.author !== user.email) {
        throw new Error('Only the link author can edit it');
      }

      const updatedLink = { ...link, ...updates };
      const newLinks = [...links];
      newLinks[linkIndex] = updatedLink;

      await updateDoc(groupRef, { links: newLinks });

      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? { ...g, links: newLinks }
            : g
        ),
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  toggleVote: async (groupId: string, linkId: string, voteType: 'up' | 'down') => {
    const { user } = get();
    if (!user) throw new Error('User not authenticated');

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      const group = groupDoc.data();

      if (!group) throw new Error('Group not found');
      
      const links = [...(group.links || [])];
      const linkIndex = links.findIndex((l: Link) => l.id === linkId);
      if (linkIndex === -1) throw new Error('Link not found');

      const link = { ...links[linkIndex] };
      const oppositeType = voteType === 'up' ? 'down' : 'up';
      
      // Remove from opposite vote type if exists
      if (link.votes[oppositeType].includes(user.email!)) {
        link.votes[oppositeType] = link.votes[oppositeType].filter(
          email => email !== user.email
        );
      }

      // Toggle current vote type
      if (link.votes[voteType].includes(user.email!)) {
        link.votes[voteType] = link.votes[voteType].filter(
          email => email !== user.email
        );
      } else {
        link.votes[voteType].push(user.email!);
      }

      links[linkIndex] = link;
      await updateDoc(groupRef, { links });

      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? { ...g, links }
            : g
        ),
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  addComment: async (groupId: string, linkId: string, content: string) => {
    const { user, userProfile } = get();
    if (!user || !userProfile) throw new Error('User not authenticated');

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      const group = groupDoc.data();

      if (!group) throw new Error('Group not found');
      
      const links = [...(group.links || [])];
      const linkIndex = links.findIndex((l: Link) => l.id === linkId);
      if (linkIndex === -1) throw new Error('Link not found');

      const newComment = {
        id: crypto.randomUUID(),
        content: content.trim(),
        author: user.email!,
        authorNickname: userProfile.nickname,
        timestamp: Date.now()
      };

      const link = { ...links[linkIndex] };
      link.comments = [...(link.comments || []), newComment];
      links[linkIndex] = link;

      await updateDoc(groupRef, { links });

      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? { ...g, links }
            : g
        ),
        error: null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  }
}));
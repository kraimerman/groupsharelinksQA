import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from '../../types';
import { validateLinkData } from '../../lib/validators';
import { StateCreator } from 'zustand';
import { ChatState } from '../types';

export interface LinkSlice {
  shareLink: (groupId: string, url: string, title: string, description: string) => Promise<void>;
  updateLink: (groupId: string, linkId: string, updates: Partial<Link>) => Promise<void>;
  toggleVote: (groupId: string, linkId: string, voteType: 'up' | 'down') => Promise<void>;
  addComment: (groupId: string, linkId: string, content: string) => Promise<void>;
}

export const createLinkSlice: StateCreator<ChatState, [], [], LinkSlice> = (set, get) => ({
  shareLink: async (groupId: string, url: string, title: string, description: string) => {
    const { user, userProfile } = get();
    if (!user || !userProfile) throw new Error('User not authenticated');

    try {
      const newLink: Omit<Link, 'id'> = {
        url: url.trim(),
        title: title.trim(),
        description: description.trim(),
        author: user.email!,
        authorNickname: userProfile.nickname,
        timestamp: Date.now(),
        votes: { up: [], down: [] },
        comments: []
      };

      if (!validateLinkData(newLink)) {
        throw new Error('Invalid link data');
      }

      const groupRef = doc(db, 'groups', groupId);
      const linkWithId = { ...newLink, id: crypto.randomUUID() };

      await updateDoc(groupRef, {
        links: arrayUnion(linkWithId)
      });

      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? { ...g, links: [...g.links, linkWithId] }
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
      if (!validateLinkData(updatedLink)) {
        throw new Error('Invalid link data');
      }

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
      
      const links = [...group.links];
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
      
      const links = [...group.links];
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
      link.comments = [...link.comments, newComment];
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
});
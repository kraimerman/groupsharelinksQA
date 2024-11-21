import { Group, UserProfile, Link } from '../types';

export const validateGroupData = (data: Partial<Group>): boolean => {
  if (!data) return false;

  // Check required string fields
  if (!data.name?.trim() || !data.createdBy?.trim() || !data.avatar?.trim()) {
    return false;
  }

  // Check arrays
  if (!Array.isArray(data.memberEmails) || data.memberEmails.length === 0) {
    return false;
  }

  if (!Array.isArray(data.links)) {
    return false;
  }

  // Check timestamp
  if (typeof data.createdAt !== 'number' || isNaN(data.createdAt)) {
    return false;
  }

  return true;
};

export const createGroupData = (name: string, userProfile: UserProfile): Omit<Group, 'id'> => {
  const trimmedName = name.trim();
  const groupData = {
    name: trimmedName,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmedName)}&background=random`,
    createdBy: userProfile.email,
    memberEmails: [userProfile.email],
    links: [],
    createdAt: Date.now()
  };

  if (!validateGroupData(groupData)) {
    throw new Error('Invalid group data structure');
  }

  return groupData;
};

export const validateLinkData = (data: Partial<Link>): boolean => {
  if (!data) return false;

  // Check required string fields
  if (!data.url?.trim() || !data.title?.trim() || !data.author?.trim()) {
    return false;
  }

  // Check arrays and objects
  if (!data.votes || !Array.isArray(data.votes.up) || !Array.isArray(data.votes.down)) {
    return false;
  }

  if (!Array.isArray(data.comments)) {
    return false;
  }

  // Check timestamp
  if (typeof data.timestamp !== 'number' || isNaN(data.timestamp)) {
    return false;
  }

  return true;
};
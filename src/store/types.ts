import { User } from 'firebase/auth';
import { UserProfile, Group } from '../types';
import { AuthSlice } from './slices/authSlice';
import { GroupSlice } from './slices/groupSlice';
import { LinkSlice } from './slices/linkSlice';

export interface ChatState extends AuthSlice, GroupSlice, LinkSlice {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  init: () => (() => void);
}
// User types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

// Song types
export interface SongSection {
  name: string;
  bars: number;
}

export interface Song {
  id: string;
  userId: string;
  name: string;
  bpm: number;
  timeSignature: number;
  sections?: SongSection[];
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSongDto {
  name: string;
  bpm: number;
  timeSignature: number;
  sections?: SongSection[];
  sharedWith?: string[];
}

export interface UpdateSongDto {
  name?: string;
  bpm?: number;
  timeSignature?: number;
  sections?: SongSection[];
  sharedWith?: string[];
}

// Setlist types
export interface Setlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  songs: string[];
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSetlistDto {
  name: string;
  description?: string;
  sharedWith?: string[];
}

export interface UpdateSetlistDto {
  name?: string;
  description?: string;
  songs?: string[];
  sharedWith?: string[];
}

// Friend types
export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export interface Friendship {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FriendWithUser {
  id: string;
  userId: string;
  email: string;
  name: string;
  status: FriendshipStatus;
  createdAt: string;
}

export interface SendFriendRequestDto {
  identifier: string; // email
}

// API Error types
export interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}

// Metronome types
export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  timeSignature: number;
  currentBeat: number;
}

// Live mode types
export interface LiveState {
  currentSetlist: Setlist | null;
  currentSongIndex: number;
  currentSong: Song | null;
  isPlaying: boolean;
  currentBeat: number;
  currentBar: number;
  currentSectionIndex: number;
  precountEnabled: boolean;
}

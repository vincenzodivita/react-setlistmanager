import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  AuthResponse,
  Song,
  CreateSongDto,
  UpdateSongDto,
  Setlist,
  CreateSetlistDto,
  UpdateSetlistDto,
  FriendWithUser,
  SendFriendRequestDto,
  FriendshipStatus,
  ApiError,
} from '@/types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://nestjs-googlecloud-authmicroservicees-850466837228.europe-west1.run.app');

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor per aggiungere il token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor per gestire errori 401
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  private removeToken(): void {
    localStorage.removeItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Auth endpoints
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
    });
    this.setToken(data.access_token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    this.setToken(data.access_token);
    return data;
  }

  async getProfile(): Promise<User> {
    const { data } = await this.client.get<User>('/auth/profile');
    return data;
  }

  logout(): void {
    this.removeToken();
  }

  // Songs endpoints
  async getSongs(): Promise<Song[]> {
    const { data } = await this.client.get<Song[]>('/songs');
    return data;
  }

  async getSong(id: string): Promise<Song> {
    const { data } = await this.client.get<Song>(`/songs/${id}`);
    return data;
  }

  async createSong(dto: CreateSongDto): Promise<Song> {
    const { data } = await this.client.post<Song>('/songs', dto);
    return data;
  }

  async updateSong(id: string, dto: UpdateSongDto): Promise<Song> {
    const { data } = await this.client.patch<Song>(`/songs/${id}`, dto);
    return data;
  }

  async deleteSong(id: string): Promise<void> {
    await this.client.delete(`/songs/${id}`);
  }

  async shareSong(id: string, userIds: string[]): Promise<Song> {
    const { data } = await this.client.post<Song>(`/songs/${id}/share`, { userIds });
    return data;
  }

  async unshareSong(id: string, userId: string): Promise<Song> {
    const { data } = await this.client.delete<Song>(`/songs/${id}/share/${userId}`);
    return data;
  }

  // Setlists endpoints
  async getSetlists(): Promise<Setlist[]> {
    const { data } = await this.client.get<Setlist[]>('/setlists');
    return data;
  }

  async getSetlist(id: string): Promise<Setlist> {
    const { data } = await this.client.get<Setlist>(`/setlists/${id}`);
    return data;
  }

  async createSetlist(dto: CreateSetlistDto): Promise<Setlist> {
    const { data } = await this.client.post<Setlist>('/setlists', dto);
    return data;
  }

  async updateSetlist(id: string, dto: UpdateSetlistDto): Promise<Setlist> {
    const { data } = await this.client.patch<Setlist>(`/setlists/${id}`, dto);
    return data;
  }

  async deleteSetlist(id: string): Promise<void> {
    await this.client.delete(`/setlists/${id}`);
  }

  async addSongToSetlist(setlistId: string, songId: string): Promise<Setlist> {
    const { data } = await this.client.post<Setlist>(`/setlists/${setlistId}/songs`, {
      songId,
    });
    return data;
  }

  async removeSongFromSetlist(setlistId: string, songId: string): Promise<Setlist> {
    const { data } = await this.client.delete<Setlist>(
      `/setlists/${setlistId}/songs/${songId}`
    );
    return data;
  }

  async reorderSetlist(setlistId: string, songIds: string[]): Promise<Setlist> {
    const { data } = await this.client.patch<Setlist>(`/setlists/${setlistId}/reorder`, {
      songIds,
    });
    return data;
  }

  async shareSetlist(id: string, userIds: string[]): Promise<Setlist> {
    const { data } = await this.client.post<Setlist>(`/setlists/${id}/share`, { userIds });
    return data;
  }

  async unshareSetlist(id: string, userId: string): Promise<Setlist> {
    const { data } = await this.client.delete<Setlist>(`/setlists/${id}/share/${userId}`);
    return data;
  }

  // Friends endpoints
  async sendFriendRequest(dto: SendFriendRequestDto): Promise<void> {
    await this.client.post('/friends/request', dto);
  }

  async respondToFriendRequest(
    requestId: string,
    status: FriendshipStatus
  ): Promise<void> {
    await this.client.patch(`/friends/request/${requestId}`, { status });
  }

  async getPendingRequests(): Promise<FriendWithUser[]> {
    const { data } = await this.client.get<FriendWithUser[]>('/friends/pending');
    return data;
  }

  async getFriends(): Promise<FriendWithUser[]> {
    const { data } = await this.client.get<FriendWithUser[]>('/friends');
    return data;
  }

  async removeFriend(friendshipId: string): Promise<void> {
    await this.client.delete(`/friends/${friendshipId}`);
  }
}

export const apiClient = new ApiClient();

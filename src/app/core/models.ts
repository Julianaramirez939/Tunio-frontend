// Tipos de la API. Solo lo que la web consume.

export type Role = 'ADMIN' | 'DJ';

export interface StaffVenue { venueId: string; venueName: string; role: Role }
export interface Staff { id: string; displayName: string; email: string; venues: StaffVenue[] }
export interface LoginResult { accessToken: string; expiresAt: string; staff: Staff }

export interface Venue { id: string; name: string; slug: string; isActive: boolean }
export interface QrAccess { publicToken: string; isEnabled: boolean; updatedAt: string }

export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';
export interface MusicSession {
  id: string; status: SessionStatus; eventName: string | null;
  startedAt: string; endedAt: string | null; defaultPlaylistId: string | null;
}

export interface NowPlaying {
  playbackId: string; songId: string; youtubeVideoId: string; title: string;
  artistDisplay: string; thumbnailUrl: string | null; durationSeconds: number;
  source: 'QUEUE' | 'DEFAULT_PLAYLIST'; startedAt: string; elapsedSeconds: number;
}
export interface QueueEntry {
  queueItemId: string; songId: string; youtubeVideoId: string; title: string;
  artistDisplay: string; thumbnailUrl: string | null; durationSeconds: number;
  requestedAt: string; voteCount: number; position: number;
  approxWaitSeconds: number; votedByDevice: boolean;
}
export interface QueueState {
  session: { id: string; status: SessionStatus } | null;
  nowPlaying: NowPlaying | null;
  entries: QueueEntry[];
}

export interface SearchResult {
  youtubeVideoId: string; title: string; artistDisplay: string; channelTitle: string;
  durationSeconds: number; thumbnailUrl: string | null;
}
export interface SearchResponse { results: SearchResult[]; catalogLimited: boolean }

export interface PlaylistTrack {
  trackId: string; songId: string; youtubeVideoId: string; title: string;
  artistDisplay: string; thumbnailUrl: string | null; durationSeconds: number;
  position: number; addedAt: string;
}
export interface Playlist {
  id: string; name: string; trackCount: number; totalDurationSeconds: number; tracks: PlaylistTrack[];
}

export interface Block {
  blockId: string; songId: string; title: string; artistDisplay: string;
  thumbnailUrl: string | null; reason: string | null; blockedAt: string;
  expiresAt: string; liftedAt: string | null;
}

export interface Page<T> {
  items: T[];
  meta: { totalItems: number; itemsPerPage: number; currentPage: number; totalPages: number };
}

export interface AdminAction {
  id: string; action: string; occurredAt: string;
  actor: { staffUserId: string; displayName: string; role: Role };
  sessionId: string | null; queueItemId: string | null;
  details: Record<string, unknown>;
}

export interface Genre { code: string; label: string }
export interface GenreCoverage { totalRequests: number; classifiedRequests: number; coveragePercent: number | null }
export interface UnclassifiedSong {
  songId: string; title: string; artistDisplay: string; thumbnailUrl: string | null;
  requestCount: number; lastRequestedAt: string;
}

// ── Analítica ────────────────────────────────────────────────
export interface PopularSong {
  songId: string; title: string; artistDisplay: string; thumbnailUrl: string | null;
  genre: string | null; totalVotes: number; uniqueVoters: number; firstVoteAt: string;
}
export interface AnalyticsSummary {
  sessionCount: number; songRequests: number;
  votes: { total: number; fromRequests: number; support: number };
  uniqueDevices: number; completedPlaybacks: number; unplayedRequests: number;
  waitSeconds: { measured: number; average: number | null; median: number | null };
  mostPopularSong: PopularSong | null;
}
export interface HourlyParticipation { hour: number; votes: number; uniqueDevices: number }
export interface PlaybackHistoryItem {
  playbackId: string; sessionId: string; songId: string; title: string; artistDisplay: string;
  source: 'QUEUE' | 'DEFAULT_PLAYLIST'; status: string; startedAt: string; endedAt: string | null;
}
export interface GenreBucket { genre: string | null; label: string; requests: number; percent: number }
export interface GenreDistribution { buckets: GenreBucket[]; coverage: GenreCoverage }
export interface UnplayedRequests {
  byReason: { reason: string; count: number }[];
  items: {
    queueItemId: string; sessionId: string; songId: string; title: string; artistDisplay: string;
    status: string; requestedAt: string; voteCount: number; reason: string;
  }[];
  meta: Page<unknown>['meta'];
}
export interface VoteConcentration {
  sessionId: string; eventName: string | null; status: SessionStatus; startedAt: string;
  totalVotes: number; top3Votes: number; top3SharePct: number | null; votedSongs: number; alert: boolean;
}
export type ParticipationLevel = 'LOW' | 'NORMAL' | 'INSUFFICIENT_HISTORY';
export interface LowParticipation {
  sessionId: string; eventName: string | null; startedAt: string; uniqueDevices: number;
  previousSessions: number; historicalAverage: number | null; ratioPct: number | null;
  level: ParticipationLevel;
}
export interface NightComparison {
  sessionId: string; eventName: string | null; nightDate: string; weekday: number;
  uniqueDevices: number; songRequests: number; totalVotes: number;
  completedPlaybacks: number; unplayedRequests: number;
}

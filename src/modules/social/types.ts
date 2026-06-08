export type SocialProvider = "meta";

export type SocialAccountStatus = "ACTIVE" | "TOKEN_EXPIRED" | "DISCONNECTED";

export type PostType = "feed" | "story" | "reel";

export type PostStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED";

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes: string[];
};

export type SocialAccount = {
  id: string;
  provider: SocialProvider;
  providerAccountId: string;
  username: string;
  avatarUrl?: string;
  accountType?: "facebook_page" | "instagram_business";
  status: SocialAccountStatus;
};

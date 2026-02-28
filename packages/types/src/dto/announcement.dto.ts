export interface CreateAnnouncementDto {
  siteId: string;
  title: string;
  content: string;
  isPinned?: boolean;
  scheduledAt?: string | null;
}

export interface AnnouncementDto {
  id: string;
  siteId: string;
  authorId: string;
  title: string;
  content: string;
  isPinned: boolean;
  isPublished: boolean;
  scheduledAt: string | null;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    nameMasked: string | null;
  };
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  isPinned?: boolean;
  scheduledAt?: string | null;
}

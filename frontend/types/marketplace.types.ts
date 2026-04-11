export type MarketplaceAdType = 'SELL' | 'GIVEAWAY';

export type MarketplaceCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';

export type MarketplaceStatus = 'ACTIVE' | 'TAKEN_DOWN' | 'REMOVED';

export type MarketplaceReportReason =
  | 'SPAM'
  | 'SCAM'
  | 'PROHIBITED_ITEM'
  | 'HARASSMENT'
  | 'OTHER';

export interface MarketplaceImage {
  id: string;
  url: string;
  publicId: string;
  createdAt: string;
}

export interface MarketplaceSeller {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  adType: MarketplaceAdType;
  category: string;
  itemCondition: MarketplaceCondition;
  price?: number;
  city: string;
  district: string;
  status: MarketplaceStatus;
  takedownReason?: string | null;
  reportCount: number;
  images: MarketplaceImage[];
  seller?: MarketplaceSeller;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceFilters {
  adType?: MarketplaceAdType;
  city?: string;
  district?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface CreateMarketplaceItemData {
  title: string;
  description: string;
  adType: MarketplaceAdType;
  category: string;
  itemCondition: MarketplaceCondition;
  price?: number;
  city: string;
  district: string;
}

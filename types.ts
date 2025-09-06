export enum SpaceType {
  LIVING_ROOM = 'Living Room',
  BACKYARD_PATIO = 'Backyard Patio',
  BANQUET_HALL = 'Banquet Hall',
  ROOFTOP_TERRACE = 'Rooftop Terrace',
  BEACHFRONT = 'Beachfront',
  GARDEN = 'Garden',
  INDOOR_GENERIC = 'Generic Indoor Space',
  OUTDOOR_GENERIC = 'Generic Outdoor Space',
}

export enum DecorElements {
  TEMPORARY = 'Temporary',
  PERMANENT = 'Permanent',
  BOTH = 'Both',
}

export enum FurnitureOption {
  EXISTING = 'Use Existing',
  RENT = 'Open to Rent',
}

export enum DiningSetting {
  BUFFET = 'Buffet',
  SHARED = 'Shared Tables',
  SMALL = 'Multiple Small Tables',
}

export interface DecorFormData {
  spaceType: SpaceType;
  occasion: string;
  theme: string;
  guests: number;
  area: number;
  budget: number;
  timeToPlan: number;
  colorScheme: string;
  decorElements: DecorElements;
  furniture: FurnitureOption;
  diningSetting: DiningSetting;
  activityCorner: boolean;
  ecoFriendly: boolean;
  photobooth: boolean;
  decorIntensity: number;
}

export interface GeneratedImage {
    title: string;
    url: string;
}

export interface SlideshowFrame {
    title: string;
    url: string;
    caption: string;
}

export interface DecorOutput {
  planningGuide: string;
  shoppingList: string;
  images: GeneratedImage[];
  planningSummary: string;
  shoppingSummary: string;
  videoUrl?: string;
  slideshow?: SlideshowFrame[];
}
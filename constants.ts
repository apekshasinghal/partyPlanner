import { DecorFormData, SpaceType, DecorElements, FurnitureOption, DiningSetting } from './types';

export const INITIAL_FORM_DATA: DecorFormData = {
  spaceType: SpaceType.BACKYARD_PATIO,
  occasion: 'Birthday Party',
  theme: 'Boho Chic',
  guests: 25,
  area: 500,
  budget: 1000,
  timeToPlan: 14,
  colorScheme: 'Pastel Pinks, Golds, and Cream',
  decorElements: DecorElements.TEMPORARY,
  furniture: FurnitureOption.EXISTING,
  diningSetting: DiningSetting.SHARED,
  activityCorner: true,
  ecoFriendly: false,
  photobooth: false,
  decorIntensity: 3,
};

export const OCCASION_SUGGESTIONS: string[] = [
  'Birthday Party',
  'Wedding Anniversary',
  'Baby Shower',
  'Graduation Party',
  'Holiday Gathering',
  'Dinner Party',
  'Summer Barbecue',
  'Engagement Party',
];

export const DEFAULT_THEME_SUGGESTIONS: string[] = [
  'Boho Chic',
  'Tropical Luau',
  'Rustic Farmhouse',
  'Modern Minimalist',
  'Vintage Glamour',
  'Under the Sea',
  'Superhero Academy',
  'Enchanted Forest',
  'Hollywood Red Carpet',
];

export const DEFAULT_COLOR_SCHEME_SUGGESTIONS: string[] = [
  'Pastel Pinks, Golds, and Cream',
  'Navy Blue and Rose Gold',
  'Black, White, and Gold',
  'Earthy Tones (Terracotta, Sage, Beige)',
  'Vibrant Rainbow',
  'Monochromatic Blues',
  'Sunset Hues (Orange, Yellow, Pink)',
];
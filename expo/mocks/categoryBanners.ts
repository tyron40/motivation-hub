import { ImageSourcePropType } from 'react-native';

export interface CategoryBanner {
  id: string;
  categoryId: string;
  categoryName: string;
  imageUrl: ImageSourcePropType;
  quote: string;
  author: string;
}

export const defaultCategoryBanners: CategoryBanner[] = [
  {
    id: 'banner-1',
    categoryId: '1',
    categoryName: 'Motivation',
    imageUrl: require('@/assets/images/run club.jpeg'),
    quote: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
  },
  {
    id: 'banner-2',
    categoryId: '2',
    categoryName: 'Success',
    imageUrl: { uri: 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&w=1200&q=80' },
    quote: 'Success is not the key to happiness. Happiness is the key to success.',
    author: 'Albert Schweitzer',
  },
  {
    id: 'banner-3',
    categoryId: '3',
    categoryName: 'Mindset',
    imageUrl: { uri: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80' },
    quote: 'Whether you think you can or you think you can\'t, you\'re right.',
    author: 'Henry Ford',
  },
  {
    id: 'banner-4',
    categoryId: '4',
    categoryName: 'Fitness',
    imageUrl: { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80' },
    quote: 'The body achieves what the mind believes.',
    author: 'Napoleon Hill',
  },
  {
    id: 'banner-5',
    categoryId: '5',
    categoryName: 'Study',
    imageUrl: { uri: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80' },
    quote: 'Education is the most powerful weapon you can use to change the world.',
    author: 'Nelson Mandela',
  },
  {
    id: 'banner-church',
    categoryId: 'church',
    categoryName: 'Christian Motivation',
    imageUrl: { uri: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80' },
    quote: 'I can do all things through Christ who strengthens me.',
    author: 'Philippians 4:13',
  },
  {
    id: 'banner-athlete',
    categoryId: 'athlete',
    categoryName: 'Athlete Pump Up',
    imageUrl: { uri: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80' },
    quote: 'Hard work beats talent when talent doesn\'t work hard.',
    author: 'Tim Notke',
  },
];

export function getDefaultBannerForCategory(categoryId: string, categoryName: string): CategoryBanner {
  const found = defaultCategoryBanners.find(b => b.categoryId === categoryId || b.categoryName === categoryName);
  if (found) return found;

  return {
    id: `banner-default-${categoryId}`,
    categoryId,
    categoryName,
    imageUrl: { uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80' },
    quote: 'Believe in yourself and all that you are.',
    author: 'Motivation Fuel',
  };
}

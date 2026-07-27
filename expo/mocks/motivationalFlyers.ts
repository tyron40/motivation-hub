import { ImageSourcePropType } from 'react-native';

export interface MotivationalFlyer {
  id: string;
  title: string;
  quote: string;
  imageUrl: ImageSourcePropType;
  accent: string;
}

export const motivationalFlyers: MotivationalFlyer[] = [
  {
    id: 'flyer-featured-haskle',
    title: 'Hustle & Grind',
    quote: 'Don\'t watch the clock; do what it does — keep going. Every rep, every set, every day is a step closer to who you\'re meant to be.',
    imageUrl: require('@/assets/images/haskle.jpeg'),
    accent: '#FF8A00',
  },
  {
    id: 'flyer-featured-1',
    title: 'Lead By Example',
    quote: 'Champions aren\'t made in the gym. They are made from something deep inside \u2014 a desire, a dream, a vision.',
    imageUrl: { uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wt7d475pi62gwukgsuk1b' },
    accent: '#FF8A00',
  },
  {
    id: 'flyer-featured-2',
    title: 'Stay Classy, Stay Driven',
    quote: 'Success is not about the destination. It\'s about the discipline to show up every single day.',
    imageUrl: { uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/tasxymasv4s0goloscnfc' },
    accent: '#D4AF37',
  },
  {
    id: 'flyer-featured-3',
    title: 'Speak Your Truth',
    quote: 'Your voice has the power to change a room. Use it with purpose and conviction.',
    imageUrl: { uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wiym5xw2upgg7fxh97rrb' },
    accent: '#0984E3',
  },
  {
    id: 'flyer-featured-4',
    title: 'Walk With Purpose',
    quote: 'Surround yourself with people who push you to be greater than you were yesterday.',
    imageUrl: { uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/pw5na02tdc3n5x3qkuz5h' },
    accent: '#00B894',
  },
  {
    id: 'flyer-featured-5',
    title: 'Give Him Thanks',
    quote: '',
    imageUrl: { uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/txtqp27uxh6o4vsply68l' },
    accent: '#E84393',
  },
  {
    id: 'flyer-featured-6',
    title: 'Surround Yourself With Greatness',
    quote: 'Stand among masterpieces long enough and you\'ll start creating your own. Your environment shapes your vision.',
    imageUrl: { uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/764cq2ayf85psdl5wmhkl' },
    accent: '#C0392B',
  },
  {
    id: 'flyer-featured-7',
    title: 'Iron Sharpens Iron',
    quote: 'As iron sharpens iron, so does one person sharpens another. -Proverbs 27:17',
    imageUrl: { uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/hg5aerpcv5h4lr9xks2mh' },
    accent: '#E74C3C',
  },
  {
    id: 'flyer-featured-8',
    title: 'No Easy Days',
    quote: 'Strength isn\'t given. It\'s forged in the reps nobody sees, the early mornings, and the refusal to quit.',
    imageUrl: { uri: 'https://r2-pub.rork.com/attachments/oks08iy57442gmz0y310r.png' },
    accent: '#C0392B',
  },
  {
    id: 'flyer-1',
    title: 'Discipline Over Mood',
    quote: 'You don\'t need to feel ready. You need to move anyway.',
    imageUrl: { uri: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80' },
    accent: '#FF8A00',
  },
  {
    id: 'flyer-2',
    title: 'Quiet Consistency',
    quote: 'Small steps every day build a life that looks impossible today.',
    imageUrl: { uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80' },
    accent: '#00B894',
  },
  {
    id: 'flyer-3',
    title: 'Keep Going',
    quote: 'You are closer than you think. Don\'t stop in the middle.',
    imageUrl: { uri: 'https://images.unsplash.com/photo-1470468969717-61d5d54fd036?auto=format&fit=crop&w=1200&q=80' },
    accent: '#0984E3',
  },
  {
    id: 'flyer-4',
    title: 'Built Different',
    quote: 'Pressure doesn\'t break you. It reveals what you trained for.',
    imageUrl: { uri: 'https://images.unsplash.com/photo-1571019613576-2b22c76fd955?auto=format&fit=crop&w=1200&q=80' },
    accent: '#E84393',
  },
];

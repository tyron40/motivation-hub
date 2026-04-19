export interface Scripture {
  id: string;
  verse: string;
  reference: string;
  category: string;
}

export const allScriptures: Scripture[] = [
  // Strength
  {
    id: '1',
    verse: 'I can do all things through Christ who strengthens me.',
    reference: 'Philippians 4:13',
    category: 'Strength',
  },
  {
    id: '5',
    verse: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.',
    reference: 'Isaiah 40:31',
    category: 'Strength',
  },
  {
    id: '11',
    verse: 'She is clothed with strength and dignity; she can laugh at the days to come.',
    reference: 'Proverbs 31:25',
    category: 'Strength',
  },
  {
    id: '13',
    verse: 'The Lord is my strength and my shield; my heart trusts in him, and he helps me.',
    reference: 'Psalm 28:7',
    category: 'Strength',
  },
  {
    id: '14',
    verse: 'He gives strength to the weary and increases the power of the weak.',
    reference: 'Isaiah 40:29',
    category: 'Strength',
  },
  {
    id: '15',
    verse: 'My flesh and my heart may fail, but God is the strength of my heart and my portion forever.',
    reference: 'Psalm 73:26',
    category: 'Strength',
  },
  {
    id: '16',
    verse: 'The Lord is my strength and my song; he has given me victory.',
    reference: 'Exodus 15:2',
    category: 'Strength',
  },
  {
    id: '17',
    verse: 'Be strong in the Lord and in his mighty power.',
    reference: 'Ephesians 6:10',
    category: 'Strength',
  },

  // Hope
  {
    id: '2',
    verse: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.',
    reference: 'Jeremiah 29:11',
    category: 'Hope',
  },
  {
    id: '6',
    verse: 'And we know that in all things God works for the good of those who love him.',
    reference: 'Romans 8:28',
    category: 'Hope',
  },
  {
    id: '18',
    verse: 'May the God of hope fill you with all joy and peace as you trust in him.',
    reference: 'Romans 15:13',
    category: 'Hope',
  },
  {
    id: '19',
    verse: 'For I am convinced that neither death nor life can separate us from the love of God.',
    reference: 'Romans 8:38-39',
    category: 'Hope',
  },
  {
    id: '20',
    verse: 'Weeping may stay for the night, but rejoicing comes in the morning.',
    reference: 'Psalm 30:5',
    category: 'Hope',
  },
  {
    id: '21',
    verse: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.',
    reference: 'Psalm 34:18',
    category: 'Hope',
  },
  {
    id: '22',
    verse: 'He will wipe every tear from their eyes. There will be no more death or mourning.',
    reference: 'Revelation 21:4',
    category: 'Hope',
  },

  // Courage
  {
    id: '3',
    verse: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
    reference: 'Joshua 1:9',
    category: 'Courage',
  },
  {
    id: '10',
    verse: 'Have I not commanded you? Be strong and courageous! Do not be afraid or discouraged.',
    reference: 'Joshua 1:9',
    category: 'Courage',
  },
  {
    id: '23',
    verse: 'The Lord is my light and my salvation—whom shall I fear?',
    reference: 'Psalm 27:1',
    category: 'Courage',
  },
  {
    id: '24',
    verse: 'When I am afraid, I put my trust in you.',
    reference: 'Psalm 56:3',
    category: 'Courage',
  },
  {
    id: '25',
    verse: 'For God has not given us a spirit of fear, but of power and of love and of a sound mind.',
    reference: '2 Timothy 1:7',
    category: 'Courage',
  },
  {
    id: '26',
    verse: 'Be on your guard; stand firm in the faith; be courageous; be strong.',
    reference: '1 Corinthians 16:13',
    category: 'Courage',
  },
  {
    id: '27',
    verse: 'Wait for the Lord; be strong and take heart and wait for the Lord.',
    reference: 'Psalm 27:14',
    category: 'Courage',
  },

  // Faith
  {
    id: '4',
    verse: 'Trust in the Lord with all your heart and lean not on your own understanding.',
    reference: 'Proverbs 3:5',
    category: 'Faith',
  },
  {
    id: '12',
    verse: 'Delight yourself in the Lord, and he will give you the desires of your heart.',
    reference: 'Psalm 37:4',
    category: 'Faith',
  },
  {
    id: '28',
    verse: 'Now faith is confidence in what we hope for and assurance about what we do not see.',
    reference: 'Hebrews 11:1',
    category: 'Faith',
  },
  {
    id: '29',
    verse: 'And without faith it is impossible to please God.',
    reference: 'Hebrews 11:6',
    category: 'Faith',
  },
  {
    id: '30',
    verse: 'If you have faith as small as a mustard seed, you can move mountains.',
    reference: 'Matthew 17:20',
    category: 'Faith',
  },
  {
    id: '31',
    verse: 'For we walk by faith, not by sight.',
    reference: '2 Corinthians 5:7',
    category: 'Faith',
  },
  {
    id: '32',
    verse: 'Let us fix our eyes on Jesus, the author and perfecter of our faith.',
    reference: 'Hebrews 12:2',
    category: 'Faith',
  },
  {
    id: '33',
    verse: 'Commit to the Lord whatever you do, and he will establish your plans.',
    reference: 'Proverbs 16:3',
    category: 'Faith',
  },

  // Love
  {
    id: '7',
    verse: 'The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you.',
    reference: 'Zephaniah 3:17',
    category: 'Love',
  },
  {
    id: '34',
    verse: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.',
    reference: '1 Corinthians 13:4',
    category: 'Love',
  },
  {
    id: '35',
    verse: 'Above all, love each other deeply, because love covers over a multitude of sins.',
    reference: '1 Peter 4:8',
    category: 'Love',
  },
  {
    id: '36',
    verse: 'We love because he first loved us.',
    reference: '1 John 4:19',
    category: 'Love',
  },
  {
    id: '37',
    verse: 'Greater love has no one than this: to lay down one\'s life for one\'s friends.',
    reference: 'John 15:13',
    category: 'Love',
  },
  {
    id: '38',
    verse: 'Let all that you do be done in love.',
    reference: '1 Corinthians 16:14',
    category: 'Love',
  },
  {
    id: '39',
    verse: 'Beloved, let us love one another, for love is from God.',
    reference: '1 John 4:7',
    category: 'Love',
  },

  // Peace
  {
    id: '8',
    verse: 'Cast all your anxiety on him because he cares for you.',
    reference: '1 Peter 5:7',
    category: 'Peace',
  },
  {
    id: '9',
    verse: 'The Lord is my shepherd; I shall not want. He makes me lie down in green pastures.',
    reference: 'Psalm 23:1-2',
    category: 'Peace',
  },
  {
    id: '40',
    verse: 'Peace I leave with you; my peace I give you. Do not let your hearts be troubled.',
    reference: 'John 14:27',
    category: 'Peace',
  },
  {
    id: '41',
    verse: 'And the peace of God, which transcends all understanding, will guard your hearts.',
    reference: 'Philippians 4:7',
    category: 'Peace',
  },
  {
    id: '42',
    verse: 'You will keep in perfect peace those whose minds are steadfast.',
    reference: 'Isaiah 26:3',
    category: 'Peace',
  },
  {
    id: '43',
    verse: 'Come to me, all you who are weary and burdened, and I will give you rest.',
    reference: 'Matthew 11:28',
    category: 'Peace',
  },
  {
    id: '44',
    verse: 'Be still, and know that I am God.',
    reference: 'Psalm 46:10',
    category: 'Peace',
  },
  {
    id: '45',
    verse: 'The Lord gives strength to his people; the Lord blesses his people with peace.',
    reference: 'Psalm 29:11',
    category: 'Peace',
  },

  // Wisdom
  {
    id: '46',
    verse: 'If any of you lacks wisdom, you should ask God, who gives generously.',
    reference: 'James 1:5',
    category: 'Wisdom',
  },
  {
    id: '47',
    verse: 'The fear of the Lord is the beginning of wisdom.',
    reference: 'Proverbs 9:10',
    category: 'Wisdom',
  },
  {
    id: '48',
    verse: 'For the Lord gives wisdom; from his mouth come knowledge and understanding.',
    reference: 'Proverbs 2:6',
    category: 'Wisdom',
  },
  {
    id: '49',
    verse: 'The wise in heart accept commands, but a chattering fool comes to ruin.',
    reference: 'Proverbs 10:8',
    category: 'Wisdom',
  },
  {
    id: '50',
    verse: 'Get wisdom, get understanding; do not forget my words or turn away from them.',
    reference: 'Proverbs 4:5',
    category: 'Wisdom',
  },
];
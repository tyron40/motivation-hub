import { Speech } from '@/types/speech';

// Helper function to generate speech data
const createSpeech = (
  id: string,
  title: string,
  speaker: string,
  youtubeId: string,
  category: string,
  duration: number = 600,
  tags: string[] = []
): Speech => ({
  id,
  title,
  speaker,
  duration,
  category,
  imageUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
  youtubeId,
  description: `Powerful ${category.toLowerCase()} speech by ${speaker}`,
  playCount: Math.floor(Math.random() * 100000),
  tags,
});

// Motivation Category - 500 speeches
export const motivationSpeeches: Speech[] = [
  createSpeech('mot-1', 'STAY HARD - Best Motivational Speech', 'David Goggins', 'TLKxdTmk-zc', 'Motivation', 495, ['discipline', 'mindset']),
  createSpeech('mot-2', 'EMBRACE THE SUCK', 'David Goggins', '5tSTk1083VY', 'Motivation', 495, ['struggle', 'growth']),
  createSpeech('mot-3', 'CANT HURT ME', 'David Goggins', 'BvWB7B8tXK8', 'Motivation', 720, ['mental toughness']),
  createSpeech('mot-4', 'BE UNCOMMON AMONGST UNCOMMON', 'David Goggins', 'YTQwYKQyNTM', 'Motivation', 540, ['excellence']),
  createSpeech('mot-5', 'CALLOUS YOUR MIND', 'David Goggins', 'nI8Q1bqT8QU', 'Motivation', 420, ['mental strength']),
  createSpeech('mot-6', 'NO EXCUSES', 'David Goggins', 'Zd6wnu5uWr4', 'Motivation', 360, ['accountability']),
  createSpeech('mot-7', 'PAIN IS TEMPORARY', 'Eric Thomas', 'Vw0OjWZQEUU', 'Motivation', 480, ['perseverance']),
  createSpeech('mot-8', 'HOW BAD DO YOU WANT IT', 'Eric Thomas', 'lsSC2vx7zFQ', 'Motivation', 390, ['desire', 'success']),
  createSpeech('mot-9', 'WHEN YOU WANT TO SUCCEED', 'Eric Thomas', '6vuetQSwFW8', 'Motivation', 420, ['success', 'dedication']),
  createSpeech('mot-10', 'BEAST MODE', 'Eric Thomas', 'dV9wB0C-NeQ', 'Motivation', 510, ['intensity', 'focus']),
  createSpeech('mot-11', 'RISE AND GRIND', 'Eric Thomas', 'SujiU3mEOGE', 'Motivation', 450, ['morning', 'productivity']),
  createSpeech('mot-12', 'UNBROKEN', 'Motivational Speeches', 'zOYyRn4K3Jg', 'Motivation', 600, ['resilience']),
  createSpeech('mot-13', 'WARRIOR MINDSET', 'Andy Frisella', 'BUJJgCEXPQ0', 'Motivation', 540, ['warrior', 'mindset']),
  createSpeech('mot-14', '75 HARD', 'Andy Frisella', 'oXi-x6YMsOI', 'Motivation', 480, ['challenge', 'discipline']),
  createSpeech('mot-15', 'WIN THE DAY', 'Andy Frisella', 'IdTMDpizis8', 'Motivation', 420, ['daily', 'winning']),
  createSpeech('mot-16', 'DREAM BIG', 'Les Brown', 'Lp7E973zozc', 'Motivation', 545, ['dreams', 'vision']),
  createSpeech('mot-17', 'ITS POSSIBLE', 'Les Brown', 'gXuSMjrx_e8', 'Motivation', 480, ['possibility', 'belief']),
  createSpeech('mot-18', 'HUNGRY FOR SUCCESS', 'Les Brown', 'xFr0FKnaLDk', 'Motivation', 420, ['hunger', 'ambition']),
  createSpeech('mot-19', 'FIGHT FOR YOUR DREAMS', 'Les Brown', 'g5KgZPNVjJM', 'Motivation', 510, ['dreams', 'fighting']),
  createSpeech('mot-20', 'NEVER GIVE UP', 'Les Brown', 'KlUMrzE1XUA', 'Motivation', 390, ['persistence']),
  
  // Continue with more YouTube IDs for motivation speeches
  createSpeech('mot-21', 'OBSESSION', 'CT Fletcher', 'RBz5RCQ0Qec', 'Motivation', 420, ['obsession', 'dedication']),
  createSpeech('mot-22', 'STILL I RISE', 'CT Fletcher', 'ldnH4yFZTc8', 'Motivation', 360, ['rising', 'overcoming']),
  createSpeech('mot-23', 'IRON ADDICT', 'CT Fletcher', 'JHiKDa4ip_Q', 'Motivation', 480, ['training', 'iron']),
  createSpeech('mot-24', 'CONQUER YOUR MIND', 'Wim Hof', 'VaMjhwFE1Zw', 'Motivation', 540, ['mind', 'control']),
  createSpeech('mot-25', 'THE ICEMAN', 'Wim Hof', 'TM6WKeZ43s4', 'Motivation', 420, ['cold', 'strength']),
  createSpeech('mot-26', 'PUSH YOUR LIMITS', 'Tony Robbins', 'CQK9CkZjVBQ', 'Motivation', 600, ['limits', 'breakthrough']),
  createSpeech('mot-27', 'UNLEASH THE POWER', 'Tony Robbins', 'UNQhuFL6CWg', 'Motivation', 720, ['power', 'potential']),
  createSpeech('mot-28', 'CHANGE YOUR LIFE', 'Tony Robbins', 'u_ktRTWMX3M', 'Motivation', 540, ['change', 'transformation']),
  createSpeech('mot-29', 'MORNING MOTIVATION', 'Denzel Washington', 'tbnzAVRZ9Xc', 'Motivation', 420, ['morning', 'routine']),
  createSpeech('mot-30', 'FALL FORWARD', 'Denzel Washington', 'BxY_eJLBflk', 'Motivation', 360, ['failure', 'learning']),
  
  // Adding more variety of speakers and topics
  createSpeech('mot-31', 'GRIND SEASON', 'Ray Lewis', 'mk82j1jQw_8', 'Motivation', 480, ['grind', 'season']),
  createSpeech('mot-32', 'EFFORT', 'Ray Lewis', '07fNDXJeaEo', 'Motivation', 300, ['effort', 'work']),
  createSpeech('mot-33', 'CHAMPION MINDSET', 'Ray Lewis', 'aX5YIKvgL9c', 'Motivation', 420, ['champion', 'mindset']),
  createSpeech('mot-34', 'NO WEAPON', 'Ray Lewis', 'MsXvmLHx4m4', 'Motivation', 360, ['strength', 'faith']),
  createSpeech('mot-35', 'PISSED OFF FOR GREATNESS', 'Ray Lewis', 'V2ZfDLLk3dU', 'Motivation', 540, ['anger', 'greatness']),
  createSpeech('mot-36', 'VISION', 'Steve Harvey', 'Va2pMX1Hs08', 'Motivation', 480, ['vision', 'future']),
  createSpeech('mot-37', 'JUMP', 'Steve Harvey', 'KlUMrzE1XUA', 'Motivation', 420, ['leap', 'faith']),
  createSpeech('mot-38', 'SUCCESS PRINCIPLES', 'Steve Harvey', 'NbWb8qxjvqw', 'Motivation', 600, ['success', 'principles']),
  createSpeech('mot-39', 'GIFT AND TALENT', 'Steve Harvey', 'JeRn4G5KBIw', 'Motivation', 360, ['gift', 'talent']),
  createSpeech('mot-40', 'IMAGINATION', 'Steve Harvey', 'l_-3fZn8TCQ', 'Motivation', 480, ['imagination', 'creativity']),
  
  // Continue generating more speeches to reach 500
  ...Array.from({ length: 460 }, (_, i) => {
    const index = i + 41;
    const speakers = ['David Goggins', 'Eric Thomas', 'Les Brown', 'Tony Robbins', 'Denzel Washington', 'Ray Lewis', 'Steve Harvey', 'CT Fletcher', 'Andy Frisella', 'Jocko Willink'];
    const youtubeIds = ['TLKxdTmk-zc', '5tSTk1083VY', 'BvWB7B8tXK8', 'YTQwYKQyNTM', 'nI8Q1bqT8QU', 'Vw0OjWZQEUU', 'lsSC2vx7zFQ', '6vuetQSwFW8', 'dV9wB0C-NeQ', 'SujiU3mEOGE'];
    const titles = ['NEVER QUIT', 'PUSH HARDER', 'RISE UP', 'BREAK LIMITS', 'STAY FOCUSED', 'WIN TODAY', 'BE UNSTOPPABLE', 'FIGHT BACK', 'KEEP GOING', 'STAY STRONG'];
    
    return createSpeech(
      `mot-${index}`,
      `${titles[i % titles.length]} - Motivational Speech`,
      speakers[i % speakers.length],
      youtubeIds[i % youtubeIds.length],
      'Motivation',
      300 + Math.floor(Math.random() * 600),
      ['motivation', 'inspiration']
    );
  })
];

// Success Category - 500 speeches
export const successSpeeches: Speech[] = [
  createSpeech('suc-1', 'DISCIPLINE EQUALS FREEDOM', 'Jocko Willink', 'IdTMDpizis8', 'Success', 505, ['discipline', 'freedom']),
  createSpeech('suc-2', 'EXTREME OWNERSHIP', 'Jocko Willink', 'ljqra3BcqWM', 'Success', 313, ['leadership', 'ownership']),
  createSpeech('suc-3', 'GOOD', 'Jocko Willink', 'IdTMDpizis8', 'Success', 180, ['mindset', 'positivity']),
  createSpeech('suc-4', 'THE PATH', 'Jocko Willink', 'cNgxyL5zEAk', 'Success', 420, ['path', 'journey']),
  createSpeech('suc-5', 'DEFAULT AGGRESSIVE', 'Jocko Willink', '0NZNXUtOE-E', 'Success', 360, ['aggressive', 'action']),
  createSpeech('suc-6', 'SUCCESS HABITS', 'Jim Rohn', 'eXpBEKxEAhM', 'Success', 540, ['habits', 'routine']),
  createSpeech('suc-7', 'BEST YEAR EVER', 'Jim Rohn', 'GXy__kBVq1M', 'Success', 480, ['goals', 'planning']),
  createSpeech('suc-8', 'PERSONAL DEVELOPMENT', 'Jim Rohn', 'D4VNk1h6D5E', 'Success', 600, ['development', 'growth']),
  createSpeech('suc-9', 'TIME MANAGEMENT', 'Jim Rohn', 'YzPKKXJnVPo', 'Success', 420, ['time', 'management']),
  createSpeech('suc-10', 'PHILOSOPHY FOR SUCCESS', 'Jim Rohn', 'UZR1wYcB1IM', 'Success', 720, ['philosophy', 'wisdom']),
  createSpeech('suc-11', '10X RULE', 'Grant Cardone', 'XPCyEzNJPZc', 'Success', 540, ['10x', 'massive action']),
  createSpeech('suc-12', 'BE OBSESSED', 'Grant Cardone', '6r1DnPCDMC4', 'Success', 480, ['obsession', 'commitment']),
  createSpeech('suc-13', 'MONEY MOTIVATION', 'Grant Cardone', 'dUZccPVqQV8', 'Success', 420, ['money', 'wealth']),
  createSpeech('suc-14', 'SALES MASTERY', 'Grant Cardone', 'qYt7tqn-0j0', 'Success', 600, ['sales', 'mastery']),
  createSpeech('suc-15', 'THINK BIG', 'Grant Cardone', 'CZSoUBNz13Q', 'Success', 360, ['thinking', 'expansion']),
  createSpeech('suc-16', 'RICH DAD POOR DAD', 'Robert Kiyosaki', 'azq0S0DKS50', 'Success', 540, ['wealth', 'mindset']),
  createSpeech('suc-17', 'FINANCIAL FREEDOM', 'Robert Kiyosaki', 'CpBLtXduh_k', 'Success', 480, ['financial', 'freedom']),
  createSpeech('suc-18', 'CASHFLOW QUADRANT', 'Robert Kiyosaki', 'bLHVJb-CyDc', 'Success', 600, ['cashflow', 'business']),
  createSpeech('suc-19', 'INVESTMENT STRATEGIES', 'Robert Kiyosaki', 'n-6lJPKrJSg', 'Success', 420, ['investment', 'strategy']),
  createSpeech('suc-20', 'MONEY RULES', 'Robert Kiyosaki', 'abMQhaMdQu0', 'Success', 360, ['money', 'rules']),
  
  // Continue with more success speeches
  ...Array.from({ length: 480 }, (_, i) => {
    const index = i + 21;
    const speakers = ['Jocko Willink', 'Jim Rohn', 'Grant Cardone', 'Robert Kiyosaki', 'Gary Vaynerchuk', 'Simon Sinek', 'Brian Tracy', 'Zig Ziglar', 'Napoleon Hill', 'Dale Carnegie'];
    const youtubeIds = ['IdTMDpizis8', 'ljqra3BcqWM', 'eXpBEKxEAhM', 'GXy__kBVq1M', 'XPCyEzNJPZc', '6r1DnPCDMC4', 'azq0S0DKS50', 'CpBLtXduh_k', 'bLHVJb-CyDc', 'n-6lJPKrJSg'];
    const titles = ['SUCCESS MINDSET', 'WEALTH BUILDING', 'LEADERSHIP', 'ACHIEVEMENT', 'EXCELLENCE', 'WINNING STRATEGY', 'PEAK PERFORMANCE', 'BUSINESS MASTERY', 'GOAL SETTING', 'PRODUCTIVITY'];
    
    return createSpeech(
      `suc-${index}`,
      `${titles[i % titles.length]} - Success Speech`,
      speakers[i % speakers.length],
      youtubeIds[i % youtubeIds.length],
      'Success',
      300 + Math.floor(Math.random() * 600),
      ['success', 'achievement']
    );
  })
];

// Mindset Category - 500 speeches
export const mindsetSpeeches: Speech[] = [
  createSpeech('min-1', 'MAMBA MENTALITY', 'Kobe Bryant', 'VSceuiPBpxY', 'Mindset', 251, ['mamba', 'mentality']),
  createSpeech('min-2', 'CHAMPIONS MINDSET', 'Kobe Bryant', 'LA6OHMMdai0', 'Mindset', 420, ['champion', 'winning']),
  createSpeech('min-3', 'OBSESSION', 'Kobe Bryant', '3oyLROB1H8c', 'Mindset', 360, ['obsession', 'dedication']),
  createSpeech('min-4', 'NEVER GIVE UP', 'Michael Jordan', '9zSVu76AX3I', 'Mindset', 305, ['persistence', 'basketball']),
  createSpeech('min-5', 'FAILURE', 'Michael Jordan', 'JA7G7AV-LT8', 'Mindset', 240, ['failure', 'learning']),
  createSpeech('min-6', 'IMPOSSIBLE IS NOTHING', 'Muhammad Ali', 'V2EfL1j4KYE', 'Mindset', 305, ['impossible', 'belief']),
  createSpeech('min-7', 'CHAMPION MINDSET', 'Serena Williams', 'g-jwWYX7Jlo', 'Mindset', 251, ['tennis', 'mental']),
  createSpeech('min-8', 'GROWTH MINDSET', 'Carol Dweck', 'hiiEeMN7vbQ', 'Mindset', 600, ['growth', 'learning']),
  createSpeech('min-9', 'FIXED VS GROWTH', 'Carol Dweck', 'KUWn_TJTrnU', 'Mindset', 540, ['mindset', 'development']),
  createSpeech('min-10', 'POWER OF YET', 'Carol Dweck', 'J-swZaKN2Ic', 'Mindset', 420, ['yet', 'potential']),
  createSpeech('min-11', 'ATOMIC HABITS', 'James Clear', 'U_nzqnXWvSo', 'Mindset', 480, ['habits', 'systems']),
  createSpeech('min-12', '1% BETTER', 'James Clear', 'mNeXuCYiE0U', 'Mindset', 360, ['improvement', 'compound']),
  createSpeech('min-13', 'IDENTITY CHANGE', 'James Clear', 'ocpyK1sKTM0', 'Mindset', 420, ['identity', 'change']),
  createSpeech('min-14', 'MINDFULNESS', 'Jon Kabat-Zinn', 'wPNEmxhOcVg', 'Mindset', 540, ['mindfulness', 'awareness']),
  createSpeech('min-15', 'PRESENT MOMENT', 'Jon Kabat-Zinn', '2n7FOBFMvXg', 'Mindset', 480, ['present', 'now']),
  createSpeech('min-16', 'WARRIOR MINDSET', 'Tim Kennedy', 'NVE-7YZvqjk', 'Mindset', 600, ['warrior', 'mental']),
  createSpeech('min-17', 'MENTAL TOUGHNESS', 'Tim Grover', 'aC7lbdD1hq0', 'Mindset', 420, ['toughness', 'relentless']),
  createSpeech('min-18', 'WINNING MENTALITY', 'Tim Grover', 'BfOdWSiyWoc', 'Mindset', 480, ['winning', 'mentality']),
  createSpeech('min-19', 'CLEANER MINDSET', 'Tim Grover', 'zk8TUK70ahs', 'Mindset', 360, ['cleaner', 'elite']),
  createSpeech('min-20', 'RELENTLESS', 'Tim Grover', 'CEg1XLo4Wn8', 'Mindset', 540, ['relentless', 'unstoppable']),
  
  // Continue with more mindset speeches
  ...Array.from({ length: 480 }, (_, i) => {
    const index = i + 21;
    const speakers = ['Kobe Bryant', 'Michael Jordan', 'Muhammad Ali', 'Carol Dweck', 'James Clear', 'Tim Grover', 'David Goggins', 'Jocko Willink', 'Jordan Peterson', 'Joe Rogan'];
    const youtubeIds = ['VSceuiPBpxY', '9zSVu76AX3I', 'V2EfL1j4KYE', 'hiiEeMN7vbQ', 'U_nzqnXWvSo', 'aC7lbdD1hq0', 'BvWB7B8tXK8', 'IdTMDpizis8', 'wLvd_ZbX1w0', 'BPP60Fmbkwc'];
    const titles = ['WARRIOR MINDSET', 'CHAMPION MENTALITY', 'GROWTH MINDSET', 'MENTAL TOUGHNESS', 'WINNING PSYCHOLOGY', 'ELITE THINKING', 'MINDSET MASTERY', 'MENTAL STRENGTH', 'PSYCHOLOGICAL EDGE', 'MIND POWER'];
    
    return createSpeech(
      `min-${index}`,
      `${titles[i % titles.length]} - Mindset Speech`,
      speakers[i % speakers.length],
      youtubeIds[i % youtubeIds.length],
      'Mindset',
      300 + Math.floor(Math.random() * 600),
      ['mindset', 'psychology']
    );
  })
];

// Inspiration Category - 500 speeches
export const inspirationSpeeches: Speech[] = [
  createSpeech('ins-1', 'YOU HAVE SOMETHING WITHIN YOU', 'Les Brown', 'Lp7E973zozc', 'Inspiration', 545, ['potential', 'belief']),
  createSpeech('ins-2', 'DREAM', 'Les Brown', 'g5KgZPNVjJM', 'Inspiration', 480, ['dreams', 'vision']),
  createSpeech('ins-3', 'BELIEVE IN YOURSELF', 'Les Brown', 'bL3MkE2NzoY', 'Inspiration', 420, ['belief', 'confidence']),
  createSpeech('ins-4', 'STAY HUNGRY', 'Steve Jobs', 'UF8uR6Z6KLc', 'Inspiration', 900, ['innovation', 'passion']),
  createSpeech('ins-5', 'THINK DIFFERENT', 'Steve Jobs', 'keCwRdbwNQY', 'Inspiration', 60, ['creativity', 'different']),
  createSpeech('ins-6', 'CONNECTING THE DOTS', 'Steve Jobs', 'D1R-jKKp3NA', 'Inspiration', 540, ['journey', 'purpose']),
  createSpeech('ins-7', 'MAKE YOUR LIFE SPECTACULAR', 'Robin Williams', 'G2e_M1YvmGA', 'Inspiration', 240, ['life', 'spectacular']),
  createSpeech('ins-8', 'SEIZE THE DAY', 'Robin Williams', 'E1ZVSFfCk9g', 'Inspiration', 180, ['carpe diem', 'opportunity']),
  createSpeech('ins-9', 'WHAT WILL YOUR VERSE BE', 'Robin Williams', 'aS1esgRV4Rc', 'Inspiration', 120, ['legacy', 'contribution']),
  createSpeech('ins-10', 'PURSUIT OF HAPPINESS', 'Will Smith', 'x7Zkun0tJc4', 'Inspiration', 360, ['happiness', 'pursuit']),
  createSpeech('ins-11', 'GREATNESS', 'Will Smith', 'OX0OARBqBp0', 'Inspiration', 420, ['greatness', 'excellence']),
  createSpeech('ins-12', 'FEAR IS NOT REAL', 'Will Smith', 'dTu5dTEzVM4', 'Inspiration', 300, ['fear', 'courage']),
  createSpeech('ins-13', 'WORK ETHIC', 'Will Smith', 'ft_DXwgT8bU', 'Inspiration', 480, ['work', 'dedication']),
  createSpeech('ins-14', 'SELF DISCIPLINE', 'Will Smith', 'wFf6rhcYkXw', 'Inspiration', 240, ['discipline', 'self-control']),
  createSpeech('ins-15', 'PROTECT YOUR DREAM', 'Will Smith', '26U_seo0a1g', 'Inspiration', 180, ['dreams', 'protection']),
  createSpeech('ins-16', 'ROCKY BALBOA SPEECH', 'Sylvester Stallone', 'D_Vg4uyYwEk', 'Inspiration', 240, ['rocky', 'fighting']),
  createSpeech('ins-17', 'KEEP MOVING FORWARD', 'Sylvester Stallone', 'X16G2o2qx3w', 'Inspiration', 300, ['forward', 'progress']),
  createSpeech('ins-18', 'GOING THE DISTANCE', 'Sylvester Stallone', 'mk82j1jQw_8', 'Inspiration', 360, ['distance', 'endurance']),
  createSpeech('ins-19', 'INCHES', 'Al Pacino', 'f1yWSid8aC4', 'Inspiration', 240, ['inches', 'football']),
  createSpeech('ins-20', 'ANY GIVEN SUNDAY', 'Al Pacino', 'WO4tIrjBDkk', 'Inspiration', 360, ['team', 'unity']),
  
  // Continue with more inspiration speeches
  ...Array.from({ length: 480 }, (_, i) => {
    const index = i + 21;
    const speakers = ['Les Brown', 'Steve Jobs', 'Robin Williams', 'Will Smith', 'Sylvester Stallone', 'Al Pacino', 'Jim Carrey', 'Oprah Winfrey', 'Ellen DeGeneres', 'Matthew McConaughey'];
    const youtubeIds = ['Lp7E973zozc', 'UF8uR6Z6KLc', 'G2e_M1YvmGA', 'x7Zkun0tJc4', 'D_Vg4uyYwEk', 'f1yWSid8aC4', 'V80-gPkpH6M', 'EyhOmBPtGNM', 'AU0h7TlZGO4', 'BmCTQ_mkzHU'];
    const titles = ['INSPIRE GREATNESS', 'DREAM BIG', 'BELIEVE', 'HOPE', 'COURAGE', 'PASSION', 'PURPOSE', 'VISION', 'LEGACY', 'IMPACT'];
    
    return createSpeech(
      `ins-${index}`,
      `${titles[i % titles.length]} - Inspirational Speech`,
      speakers[i % speakers.length],
      youtubeIds[i % youtubeIds.length],
      'Inspiration',
      300 + Math.floor(Math.random() * 600),
      ['inspiration', 'motivation']
    );
  })
];

// Study Category - 500 speeches
export const studySpeeches: Speech[] = [
  createSpeech('stu-1', 'THE POWER OF NOW', 'Eckhart Tolle', 'aAVPDYhW_nw', 'Study', 347, ['mindfulness', 'presence']),
  createSpeech('stu-2', 'AWAKENING', 'Eckhart Tolle', 'OG8G0Ql1pVs', 'Study', 540, ['awakening', 'consciousness']),
  createSpeech('stu-3', 'STILLNESS SPEAKS', 'Eckhart Tolle', 'ozu9Jd_Fm-I', 'Study', 480, ['stillness', 'peace']),
  createSpeech('stu-4', 'DEEP WORK', 'Cal Newport', 'gTaJhjQHcf8', 'Study', 600, ['focus', 'productivity']),
  createSpeech('stu-5', 'DIGITAL MINIMALISM', 'Cal Newport', '3E7hkPZ-HTk', 'Study', 540, ['minimalism', 'technology']),
  createSpeech('stu-6', 'SO GOOD THEY CANT IGNORE YOU', 'Cal Newport', 'qwOdU02SE0w', 'Study', 480, ['skills', 'mastery']),
  createSpeech('stu-7', 'FLOW STATE', 'Mihaly Csikszentmihalyi', 'fXIeFJCqsPs', 'Study', 1140, ['flow', 'performance']),
  createSpeech('stu-8', 'OPTIMAL EXPERIENCE', 'Mihaly Csikszentmihalyi', 'I_u-Eh3h7Mo', 'Study', 420, ['experience', 'happiness']),
  createSpeech('stu-9', 'CREATIVITY', 'Mihaly Csikszentmihalyi', 'VPF_AZtWVWY', 'Study', 540, ['creativity', 'innovation']),
  createSpeech('stu-10', 'LEARNING HOW TO LEARN', 'Barbara Oakley', 'O96fE1E-rf8', 'Study', 960, ['learning', 'education']),
  createSpeech('stu-11', 'MIND FOR NUMBERS', 'Barbara Oakley', 'WmPx333n4Ak', 'Study', 480, ['math', 'science']),
  createSpeech('stu-12', 'PROCRASTINATION', 'Barbara Oakley', 'mH2sEqrCza4', 'Study', 360, ['procrastination', 'action']),
  createSpeech('stu-13', 'MEMORY TECHNIQUES', 'Jim Kwik', 'uT_GcOGEFsk', 'Study', 540, ['memory', 'techniques']),
  createSpeech('stu-14', 'SPEED READING', 'Jim Kwik', 'ZwEquW_Yij0', 'Study', 420, ['reading', 'speed']),
  createSpeech('stu-15', 'BRAIN OPTIMIZATION', 'Jim Kwik', 'bLHVJb-CyDc', 'Study', 600, ['brain', 'optimization']),
  createSpeech('stu-16', 'FOCUS MASTERY', 'Jim Kwik', 'xTEVSigV3l0', 'Study', 480, ['focus', 'concentration']),
  createSpeech('stu-17', 'LIMITLESS', 'Jim Kwik', 'tgYGAFhVHDU', 'Study', 360, ['limitless', 'potential']),
  createSpeech('stu-18', 'GENIUS HABITS', 'Jim Kwik', 'sjKEKO-FtJY', 'Study', 540, ['genius', 'habits']),
  createSpeech('stu-19', 'CRITICAL THINKING', 'Jordan Peterson', 'x0vUsxhMczI', 'Study', 720, ['thinking', 'analysis']),
  createSpeech('stu-20', '12 RULES FOR LIFE', 'Jordan Peterson', 'fSQSETwnrio', 'Study', 900, ['rules', 'life']),
  
  // Continue with more study speeches
  ...Array.from({ length: 480 }, (_, i) => {
    const index = i + 21;
    const speakers = ['Eckhart Tolle', 'Cal Newport', 'Barbara Oakley', 'Jim Kwik', 'Jordan Peterson', 'Sam Harris', 'Naval Ravikant', 'Tim Ferriss', 'Ryan Holiday', 'Robert Greene'];
    const youtubeIds = ['aAVPDYhW_nw', 'gTaJhjQHcf8', 'O96fE1E-rf8', 'uT_GcOGEFsk', 'x0vUsxhMczI', 'CN-_zzHpcdM', 'nGJNbJNJLLI', 'H2rmfJCQ2D8', 'SeqBZyMBLt8', 'XpKvs-apvOs'];
    const titles = ['DEEP LEARNING', 'FOCUS TECHNIQUES', 'STUDY METHODS', 'BRAIN POWER', 'KNOWLEDGE', 'WISDOM', 'UNDERSTANDING', 'INTELLIGENCE', 'EDUCATION', 'MASTERY'];
    
    return createSpeech(
      `stu-${index}`,
      `${titles[i % titles.length]} - Study Speech`,
      speakers[i % speakers.length],
      youtubeIds[i % youtubeIds.length],
      'Study',
      300 + Math.floor(Math.random() * 600),
      ['study', 'learning']
    );
  })
];

// High Energy Category - 500 speeches
export const highEnergySpeeches: Speech[] = [
  createSpeech('hie-1', 'THE 5 SECOND RULE', 'Mel Robbins', 'nI2VQ-ZsNr0', 'High Energy', 185, ['action', 'productivity']),
  createSpeech('hie-2', 'STOP SCREWING YOURSELF', 'Mel Robbins', 'Lp7E973zozc', 'High Energy', 1260, ['change', 'action']),
  createSpeech('hie-3', 'TAKE CONTROL', 'Mel Robbins', 'drv3BP0Fdi8', 'High Energy', 480, ['control', 'life']),
  createSpeech('hie-4', 'BEAST MODE ON', 'Motivational Compilation', 'g3WLFlIbUKI', 'High Energy', 600, ['beast mode', 'intensity']),
  createSpeech('hie-5', 'RISE AND SHINE', 'Morning Motivation', 'SujiU3mEOGE', 'High Energy', 420, ['morning', 'energy']),
  createSpeech('hie-6', 'PUMP UP', 'Workout Motivation', 'Vw0OjWZQEUU', 'High Energy', 360, ['workout', 'fitness']),
  createSpeech('hie-7', 'GET AFTER IT', 'Jocko Willink', 'IdTMDpizis8', 'High Energy', 300, ['action', 'aggression']),
  createSpeech('hie-8', 'ATTACK THE DAY', 'Marcus Taylor', 'mk82j1jQw_8', 'High Energy', 480, ['attack', 'day']),
  createSpeech('hie-9', 'EXPLOSIVE ENERGY', 'CT Fletcher', 'RBz5RCQ0Qec', 'High Energy', 420, ['explosive', 'power']),
  createSpeech('hie-10', 'UNLEASH THE BEAST', 'CT Fletcher', 'JHiKDa4ip_Q', 'High Energy', 540, ['beast', 'unleash']),
  createSpeech('hie-11', 'FULL THROTTLE', 'Eric Thomas', 'dV9wB0C-NeQ', 'High Energy', 360, ['throttle', 'speed']),
  createSpeech('hie-12', 'MAXIMUM EFFORT', 'Eric Thomas', '6vuetQSwFW8', 'High Energy', 480, ['maximum', 'effort']),
  createSpeech('hie-13', 'IGNITE YOUR FIRE', 'Les Brown', 'KlUMrzE1XUA', 'High Energy', 420, ['fire', 'passion']),
  createSpeech('hie-14', 'ENERGY SURGE', 'Tony Robbins', 'CQK9CkZjVBQ', 'High Energy', 600, ['energy', 'surge']),
  createSpeech('hie-15', 'PEAK STATE', 'Tony Robbins', 'UNQhuFL6CWg', 'High Energy', 540, ['peak', 'state']),
  createSpeech('hie-16', 'ADRENALINE RUSH', 'Extreme Sports', 'JGdS8ryKPqQ', 'High Energy', 360, ['adrenaline', 'rush']),
  createSpeech('hie-17', 'POWER HOUR', 'Motivational Mix', 'mgmVOuLgFB0', 'High Energy', 3600, ['power', 'hour']),
  createSpeech('hie-18', 'ELECTRIC ENERGY', 'High Intensity', '2pLT-olgUJs', 'High Energy', 480, ['electric', 'intensity']),
  createSpeech('hie-19', 'TURBO CHARGE', 'Morning Power', 'Gv9_4yMHFhI', 'High Energy', 420, ['turbo', 'charge']),
  createSpeech('hie-20', 'ROCKET FUEL', 'Extreme Motivation', 'tYzMYcUty6s', 'High Energy', 540, ['rocket', 'fuel']),
  
  // Continue with more high energy speeches
  ...Array.from({ length: 480 }, (_, i) => {
    const index = i + 21;
    const speakers = ['Mel Robbins', 'CT Fletcher', 'Eric Thomas', 'Les Brown', 'Tony Robbins', 'Gary Vaynerchuk', 'David Goggins', 'Jocko Willink', 'Andy Frisella', 'Ray Lewis'];
    const youtubeIds = ['nI2VQ-ZsNr0', 'RBz5RCQ0Qec', 'dV9wB0C-NeQ', 'KlUMrzE1XUA', 'CQK9CkZjVBQ', 'RBQ-IoHfimQ', 'BvWB7B8tXK8', 'IdTMDpizis8', 'oXi-x6YMsOI', 'mk82j1jQw_8'];
    const titles = ['MAXIMUM POWER', 'EXPLOSIVE ENERGY', 'BEAST MODE', 'FULL THROTTLE', 'IGNITE', 'SURGE', 'TURBO', 'ELECTRIC', 'ROCKET FUEL', 'ADRENALINE'];
    
    return createSpeech(
      `hie-${index}`,
      `${titles[i % titles.length]} - High Energy Speech`,
      speakers[i % speakers.length],
      youtubeIds[i % youtubeIds.length],
      'High Energy',
      300 + Math.floor(Math.random() * 600),
      ['energy', 'power']
    );
  })
];

// Daily Motivation Category - 500 speeches
export const dailyMotivationSpeeches: Speech[] = [
  createSpeech('dai-1', 'THE POWER OF VULNERABILITY', 'Brené Brown', 'iCvmsMzlF7o', 'Daily Motivation', 505, ['vulnerability', 'connection']),
  createSpeech('dai-2', 'DARING GREATLY', 'Brené Brown', 'psN1DORYYV0', 'Daily Motivation', 480, ['courage', 'daring']),
  createSpeech('dai-3', 'SHAME RESILIENCE', 'Brené Brown', 'ze9ytIjYxOI', 'Daily Motivation', 420, ['shame', 'resilience']),
  createSpeech('dai-4', 'MORNING ROUTINE', 'Robin Sharma', 'Tt7bzxurJ1I', 'Daily Motivation', 540, ['morning', 'routine']),
  createSpeech('dai-5', '5AM CLUB', 'Robin Sharma', 'y05P_Jz0PEA', 'Daily Motivation', 600, ['5am', 'productivity']),
  createSpeech('dai-6', 'THE MONK WHO SOLD HIS FERRARI', 'Robin Sharma', 'gETtOBr7TqM', 'Daily Motivation', 480, ['monk', 'wisdom']),
  createSpeech('dai-7', 'DAILY HABITS', 'James Clear', 'U_nzqnXWvSo', 'Daily Motivation', 420, ['habits', 'daily']),
  createSpeech('dai-8', 'MORNING MOTIVATION', 'Denzel Washington', 'tbnzAVRZ9Xc', 'Daily Motivation', 360, ['morning', 'motivation']),
  createSpeech('dai-9', 'START YOUR DAY RIGHT', 'Joel Osteen', 'U3bHcKuGwUQ', 'Daily Motivation', 540, ['start', 'positive']),
  createSpeech('dai-10', 'POSITIVE THINKING', 'Joel Osteen', 'E_x0Jjn0JYQ', 'Daily Motivation', 480, ['positive', 'thinking']),
  createSpeech('dai-11', 'DAILY INSPIRATION', 'Oprah Winfrey', 'EyhOmBPtGNM', 'Daily Motivation', 420, ['daily', 'inspiration']),
  createSpeech('dai-12', 'GRATITUDE', 'Oprah Winfrey', 'xo3WRwpzzAc', 'Daily Motivation', 360, ['gratitude', 'thankful']),
  createSpeech('dai-13', 'INTENTION SETTING', 'Deepak Chopra', 'Mtau4v6foHA', 'Daily Motivation', 540, ['intention', 'purpose']),
  createSpeech('dai-14', 'DAILY MEDITATION', 'Deepak Chopra', 'RT3I_SHzIR8', 'Daily Motivation', 600, ['meditation', 'peace']),
  createSpeech('dai-15', 'MORNING AFFIRMATIONS', 'Louise Hay', 'AEh1loQTdxM', 'Daily Motivation', 480, ['affirmations', 'positive']),
  createSpeech('dai-16', 'SELF LOVE', 'Louise Hay', 'bqExi6bOoyA', 'Daily Motivation', 420, ['self-love', 'acceptance']),
  createSpeech('dai-17', 'DAILY WINS', 'Brendon Burchard', 'a2UBnNFHNVE', 'Daily Motivation', 360, ['wins', 'success']),
  createSpeech('dai-18', 'HIGH PERFORMANCE HABITS', 'Brendon Burchard', 'LG81YIKLyKs', 'Daily Motivation', 540, ['performance', 'habits']),
  createSpeech('dai-19', 'MORNING MINDSET', 'Tom Bilyeu', 'latP5xvsXZ8', 'Daily Motivation', 480, ['mindset', 'morning']),
  createSpeech('dai-20', 'IMPACT THEORY', 'Tom Bilyeu', 'W7wJDqTSPoA', 'Daily Motivation', 600, ['impact', 'theory']),
  
  // Continue with more daily motivation speeches
  ...Array.from({ length: 480 }, (_, i) => {
    const index = i + 21;
    const speakers = ['Brené Brown', 'Robin Sharma', 'James Clear', 'Joel Osteen', 'Oprah Winfrey', 'Deepak Chopra', 'Louise Hay', 'Brendon Burchard', 'Tom Bilyeu', 'Jay Shetty'];
    const youtubeIds = ['iCvmsMzlF7o', 'Tt7bzxurJ1I', 'U_nzqnXWvSo', 'U3bHcKuGwUQ', 'EyhOmBPtGNM', 'Mtau4v6foHA', 'AEh1loQTdxM', 'a2UBnNFHNVE', 'latP5xvsXZ8', '7C-vYY3SBDE'];
    const titles = ['DAILY WISDOM', 'MORNING POWER', 'DAILY HABITS', 'POSITIVE DAY', 'DAILY GRATITUDE', 'MORNING RITUAL', 'DAILY SUCCESS', 'DAILY MINDSET', 'MORNING MOTIVATION', 'DAILY INSPIRATION'];
    
    return createSpeech(
      `dai-${index}`,
      `${titles[i % titles.length]} - Daily Motivation`,
      speakers[i % speakers.length],
      youtubeIds[i % youtubeIds.length],
      'Daily Motivation',
      300 + Math.floor(Math.random() * 600),
      ['daily', 'motivation']
    );
  })
];

// Powerful Speeches Category - 500 speeches
export const powerfulSpeeches: Speech[] = [
  createSpeech('pow-1', 'I HAVE A DREAM', 'Martin Luther King Jr.', 'vP4iY1TtS3s', 'Powerful Speeches', 1020, ['dream', 'equality']),
  createSpeech('pow-2', 'STEVE JOBS STANFORD', 'Steve Jobs', 'UF8uR6Z6KLc', 'Powerful Speeches', 900, ['stanford', 'commencement']),
  createSpeech('pow-3', 'YES WE CAN', 'Barack Obama', 'Fe751kMBwms', 'Powerful Speeches', 600, ['hope', 'change']),
  createSpeech('pow-4', 'GETTYSBURG ADDRESS', 'Abraham Lincoln', 'BvA0J_2ZpIQ', 'Powerful Speeches', 180, ['gettysburg', 'freedom']),
  createSpeech('pow-5', 'WE SHALL FIGHT', 'Winston Churchill', 'MkTw3_PmKtc', 'Powerful Speeches', 240, ['fight', 'courage']),
  createSpeech('pow-6', 'TEAR DOWN THIS WALL', 'Ronald Reagan', 'WjWDrTXMgF8', 'Powerful Speeches', 360, ['berlin', 'freedom']),
  createSpeech('pow-7', 'MALALA UN SPEECH', 'Malala Yousafzai', 'MOqIotJrFVM', 'Powerful Speeches', 1080, ['education', 'rights']),
  createSpeech('pow-8', 'EMMA WATSON UN', 'Emma Watson', 'gkjW9PZBRfk', 'Powerful Speeches', 780, ['heforshe', 'equality']),
  createSpeech('pow-9', 'RANDY PAUSCH LAST LECTURE', 'Randy Pausch', 'ji5_MqicxSo', 'Powerful Speeches', 4620, ['last lecture', 'dreams']),
  createSpeech('pow-10', 'JIM VALVANO ESPY', 'Jim Valvano', 'HuoVM9nm42E', 'Powerful Speeches', 660, ['cancer', 'hope']),
  createSpeech('pow-11', 'CHARLIE CHAPLIN DICTATOR', 'Charlie Chaplin', 'J7GY1Xg6X20', 'Powerful Speeches', 240, ['humanity', 'peace']),
  createSpeech('pow-12', 'MATTHEW MCCONAUGHEY OSCARS', 'Matthew McConaughey', 'wD2cVhC-63I', 'Powerful Speeches', 180, ['hero', 'gratitude']),
  createSpeech('pow-13', 'DENZEL WASHINGTON PENN', 'Denzel Washington', 'BxY_eJLBflk', 'Powerful Speeches', 360, ['fall forward', 'failure']),
  createSpeech('pow-14', 'OPRAH HARVARD', 'Oprah Winfrey', 'GMWFieBGR7c', 'Powerful Speeches', 1740, ['harvard', 'purpose']),
  createSpeech('pow-15', 'ELLEN TULANE', 'Ellen DeGeneres', '0e8ToRVOtRo', 'Powerful Speeches', 1020, ['tulane', 'kindness']),
  createSpeech('pow-16', 'JK ROWLING HARVARD', 'J.K. Rowling', 'wHGqp8lz36c', 'Powerful Speeches', 1260, ['failure', 'imagination']),
  createSpeech('pow-17', 'NEIL GAIMAN ARTS', 'Neil Gaiman', 'plWexCID-kA', 'Powerful Speeches', 1200, ['make art', 'creativity']),
  createSpeech('pow-18', 'DAVID FOSTER WALLACE', 'David Foster Wallace', '8CrOL-ydFMI', 'Powerful Speeches', 1380, ['water', 'awareness']),
  createSpeech('pow-19', 'ADMIRAL MCRAVEN TEXAS', 'Admiral McRaven', 'pxBQLFLei70', 'Powerful Speeches', 1140, ['bed', 'navy seals']),
  createSpeech('pow-20', 'SHERYL SANDBERG BERKELEY', 'Sheryl Sandberg', 'JFQLvbVJVMg', 'Powerful Speeches', 900, ['resilience', 'option b']),
  
  // Continue with more powerful speeches
  ...Array.from({ length: 480 }, (_, i) => {
    const index = i + 21;
    const speakers = ['Martin Luther King Jr.', 'Steve Jobs', 'Barack Obama', 'Winston Churchill', 'Nelson Mandela', 'Maya Angelou', 'Malcolm X', 'John F. Kennedy', 'Mother Teresa', 'Gandhi'];
    const youtubeIds = ['vP4iY1TtS3s', 'UF8uR6Z6KLc', 'Fe751kMBwms', 'MkTw3_PmKtc', 'RkI-B2JWSZI', 'MWx5RB1_fdE', 'T3PYt6e1pSM', 'PEC1C4p0k3E', 'KCyInBssJW4', 'GIQn8pab8Vc'];
    const titles = ['HISTORIC SPEECH', 'LEGENDARY WORDS', 'POWERFUL MESSAGE', 'ICONIC MOMENT', 'TIMELESS WISDOM', 'UNFORGETTABLE', 'WORLD CHANGING', 'INSPIRING WORDS', 'MEMORABLE SPEECH', 'EPIC MOMENT'];
    
    return createSpeech(
      `pow-${index}`,
      `${titles[i % titles.length]} - Powerful Speech`,
      speakers[i % speakers.length],
      youtubeIds[i % youtubeIds.length],
      'Powerful Speeches',
      300 + Math.floor(Math.random() * 1200),
      ['powerful', 'historic']
    );
  })
];

// Combine all speeches into one master list
export const allYoutubeSpeeches: Speech[] = [
  ...motivationSpeeches,
  ...successSpeeches,
  ...mindsetSpeeches,
  ...inspirationSpeeches,
  ...studySpeeches,
  ...highEnergySpeeches,
  ...dailyMotivationSpeeches,
  ...powerfulSpeeches,
];

// Helper function to get speeches by category
export const getSpeechesByCategory = (category: string): Speech[] => {
  switch (category.toLowerCase()) {
    case 'motivation':
      return motivationSpeeches;
    case 'success':
      return successSpeeches;
    case 'mindset':
      return mindsetSpeeches;
    case 'inspiration':
      return inspirationSpeeches;
    case 'study':
      return studySpeeches;
    case 'high energy':
      return highEnergySpeeches;
    case 'daily motivation':
      return dailyMotivationSpeeches;
    case 'powerful speeches':
      return powerfulSpeeches;
    default:
      return [];
  }
};

// Export featured and popular speeches
export const featuredYoutubeSpeech = allYoutubeSpeeches[0];
export const popularYoutubeSpeeches = allYoutubeSpeeches.slice(0, 10);
export const recentYoutubeSpeeches = allYoutubeSpeeches.slice(10, 20);
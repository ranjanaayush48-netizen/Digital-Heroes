import { Charity, MonthlyDraw } from '../types';

export const INITIAL_CHARITIES: Charity[] = [
  {
    id: 'charity-fairway-foundation',
    name: 'Fairway Youth Horizon',
    category: 'Youth & Sports Education',
    tagline: 'Opening doors to youth through sport, athletic discipline, and educational mentorship.',
    description: 'Fairway Youth Horizon brings golf training, life mentorship, and educational opportunities to children in community sports academies and youth clinics.',
    mission: 'Empowering future leaders through athletics, character-building, and educational access.',
    imageUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    totalRaised: 0,
    supporterCount: 0,
    upcomingEvents: [
      {
        id: 'event-1',
        title: 'Youth Community Invitational Round',
        date: '2026-04-18',
        location: 'Augusta Pines Golf Club',
        description: 'Subscribers partner with junior academy students for an inspiring 18-hole charity round.'
      }
    ],
    website: 'https://fairwayyouth.org',
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },
  {
    id: 'charity-veterans-wellness',
    name: 'Veteran Greens Recovery',
    category: 'Veteran Mental Health',
    tagline: 'Outdoor rehabilitation and community camaraderie for military service veterans.',
    description: 'Veteran Greens Recovery facilitates outdoor therapy, community integration, and peer support retreats for active duty personnel and honorably discharged veterans.',
    mission: 'Honoring service members through emotional wellness, purpose, and camaraderie.',
    imageUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    totalRaised: 0,
    supporterCount: 0,
    upcomingEvents: [
      {
        id: 'event-3',
        title: 'Valor Memorial Charity Scramble',
        date: '2026-05-25',
        location: 'Silverstone Country Club',
        description: 'Annual Memorial Day scramble supporting veteran wellness initiatives.'
      }
    ],
    website: 'https://veterangreens.org',
    createdAt: '2025-01-20T00:00:00.000Z',
    updatedAt: '2026-03-05T00:00:00.000Z'
  },
  {
    id: 'charity-eco-sanctuary',
    name: 'Green Sanctuary Wildlife Initiative',
    category: 'Environmental & Biodiversity',
    tagline: 'Transforming golf landscapes into certified native flora, fauna, and wetland sanctuaries.',
    description: 'Partnering with open green spaces and courses, Green Sanctuary establishes pollinator zones, protected bird flight paths, and organic water retention systems.',
    mission: 'Bridging human sport landscapes with deep ecological stewardship and biodiversity protection.',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    totalRaised: 0,
    supporterCount: 0,
    upcomingEvents: [
      {
        id: 'event-4',
        title: 'Native Tree Planting & Earth Day Event',
        date: '2026-04-22',
        location: 'Whistling Oaks Reserve',
        description: 'Community planting of indigenous oaks and native wildflowers.'
      }
    ],
    website: 'https://greensanctuary.org',
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z'
  },
  {
    id: 'charity-pediatric-hope',
    name: 'Little Champions Pediatric Cancer Care',
    category: 'Children Healthcare',
    tagline: 'Direct assistance and clinical support for pediatric oncology patients and families.',
    description: 'Little Champions provides immediate non-medical living grants, specialized travel assistance, and emotional family support during pediatric cancer treatments.',
    mission: 'Ensuring no child or family battles illness in isolation or financial distress.',
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
    featured: false,
    totalRaised: 0,
    supporterCount: 0,
    upcomingEvents: [
      {
        id: 'event-5',
        title: 'Birdies for Hope Charity Classic',
        date: '2026-06-12',
        location: 'Torrey Pines South',
        description: 'Charity skins game with proceeds directly supporting summer patient assistance.'
      }
    ],
    website: 'https://littlechampions.org',
    createdAt: '2025-02-15T00:00:00.000Z',
    updatedAt: '2026-03-12T00:00:00.000Z'
  }
];

export const INITIAL_DRAWS: MonthlyDraw[] = [
  {
    id: 'draw-2026-02',
    month: '2026-02',
    title: 'February 2026 National Charity Draw',
    drawDate: '2026-02-28',
    status: 'published',
    drawMethod: 'algorithmic',
    winningNumbers: [14, 22, 31, 38, 42],
    activeSubscribersCount: 840,
    monthlyAllocationPerSub: 10,
    totalPrizePool: 8400,
    jackpotRolloverIn: 2500,
    jackpotRolloverOut: 5860, // Rolled over because 0 winners in 5-match tier
    tiers: {
      fiveMatch: {
        matchType: '5-number',
        poolSharePercent: 40,
        allocatedAmount: 3360,
        rolloverAmount: 2500,
        totalAvailable: 5860,
        winnersCount: 0,
        payoutPerWinner: 0,
        winners: [],
        rolledOverToNext: 5860
      },
      fourMatch: {
        matchType: '4-number',
        poolSharePercent: 35,
        allocatedAmount: 2940,
        rolloverAmount: 0,
        totalAvailable: 2940,
        winnersCount: 2,
        payoutPerWinner: 1470,
        winners: [
          {
            userId: 'sample-winner-1',
            userEmail: 'marcus.v@example.com',
            userName: 'Marcus Vance',
            matchType: '4-number',
            matchCount: 4,
            matchedNumbers: [14, 22, 31, 38],
            prizeShareAmount: 1470,
            proofStatus: 'approved',
            proofUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=800&q=80',
            paymentStatus: 'paid',
            paidAt: '2026-03-03T14:20:00.000Z'
          },
          {
            userId: 'sample-winner-2',
            userEmail: 'elena.roche@example.com',
            userName: 'Elena Roche',
            matchType: '4-number',
            matchCount: 4,
            matchedNumbers: [14, 22, 38, 42],
            prizeShareAmount: 1470,
            proofStatus: 'approved',
            proofUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?auto=format&fit=crop&w=800&q=80',
            paymentStatus: 'paid',
            paidAt: '2026-03-03T14:25:00.000Z'
          }
        ],
        rolledOverToNext: 0
      },
      threeMatch: {
        matchType: '3-number',
        poolSharePercent: 25,
        allocatedAmount: 2100,
        rolloverAmount: 0,
        totalAvailable: 2100,
        winnersCount: 7,
        payoutPerWinner: 300,
        winners: [
          {
            userId: 'sample-winner-3',
            userEmail: 'david.chen@example.com',
            userName: 'David Chen',
            matchType: '3-number',
            matchCount: 3,
            matchedNumbers: [14, 22, 31],
            prizeShareAmount: 300,
            proofStatus: 'approved',
            paymentStatus: 'paid',
            paidAt: '2026-03-04T10:00:00.000Z'
          }
        ],
        rolledOverToNext: 0
      }
    },
    publishedAt: '2026-02-28T21:00:00.000Z',
    createdAt: '2026-02-01T00:00:00.000Z'
  }
];

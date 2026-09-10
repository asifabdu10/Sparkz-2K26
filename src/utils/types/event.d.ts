export type Event = {
    id: string;
    title: string;
    imageUrl: string;
    regFinalDate: string;
    bgImageUrl?: string;
    isFeatured?: boolean;
    department?: string;
    RegCloseTime?: {
        hours: number;
        minutes: number;
    }
    regLink?: string;
    type: 'technical' | 'nonTechnical' | 'sports';
    date?: string;
    description: string;
    venue?: string;
    // eventType: string;
    memberMaxCount: number;
    memberMinCount: number;
    isOnline?: boolean;
    upi?: string[]
    gpay?: string;
    maxParticipation?: string;
    minParticipation?: string;
    totalParticipation?: string;
    eveType?: "ind" | "team"
    registrationFee: string;
    isFree?: boolean;
    registrationOpen?: boolean;
    firstPrize: string;
    secondPrize?: string;
    thirdPrize?: string;
    requiresExtraData?: boolean;
    extraFields?: { name: string; type: string }[]
    coordinators: { name: string; phone: string }[];
    rules?: string[];
};

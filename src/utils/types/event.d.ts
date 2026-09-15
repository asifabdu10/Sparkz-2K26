export type RegistrationFieldType = "text" | "number" | "date" | "email" | "tel";

export type RegistrationField = {
    name: string;
    type: RegistrationFieldType;
    required?: boolean;
};

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
    };
    regLink?: string;
    type: 'technical' | 'nonTechnical' | 'sports';
    date?: string;
    description: string;
    venue?: string;
    memberMaxCount: number;
    memberMinCount: number;
    isOnline?: boolean;
    upi?: string[];
    gpay?: string;
    maxParticipation?: string;
    minParticipation?: string;
    totalParticipation?: string;
    eveType?: "ind" | "team";
    registrationFee: string;
    isFree?: boolean;
    /** Online registration, on-site/spot registration, or informational event only. */
    registrationMode?: "online" | "spot" | "none";
    registrationOpen?: boolean;
    /** Controls whether participation/member information is shown on the public event page. */
    showParticipation?: boolean;
    firstPrize: string;
    secondPrize?: string;
    thirdPrize?: string;
    requiresExtraData?: boolean;
    extraFields?: RegistrationField[];
    teamMemberFields?: RegistrationField[];
    /** Whether team member Year/Class year should be collected. Defaults to true for legacy events. */
    showMemberYear?: boolean;
    coordinators: { name: string; phone: string }[];
    rules?: string[];
};

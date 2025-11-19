import { LandingSections } from './types';

export const defaultLandingSections: LandingSections = {
    heroTagline: 'PREMIUM FOOTBALL INTELLIGENCE',
    heroSubtitle: 'Verified bilingual analysts deliver context-rich alerts, bankroll guidance, and audited slips for every slate.',
    primaryCta: 'Get Instant Access',
    secondaryCta: 'Already have access? Log in',
    stats: [
        { label: 'Average Monthly ROI', value: '+126%', detail: 'Derived from verified member slips' },
        { label: 'Games Covered Weekly', value: '48+', detail: 'Top European & ASEAN leagues' },
        { label: 'Active Community', value: '3,500+', detail: 'Subscribers, partners, and syndicates' },
    ],
    credibility: [
        { title: 'Elite Analyst Desk', description: 'Former traders, scouts, and data scientists working together as one tactical desk.' },
        { title: 'Verified Track Record', description: 'Every pick is timestamped and auditable from inside your dashboard archive.' },
        { title: 'Concierge-Level Support', description: 'Burmese + English concierge to help with staking plans and bankroll discipline.' },
    ],
    testimonials: [
        { quote: 'The Tuesday briefings alone cover my subscription. Their reason codes are priceless.', author: 'Kelvin A.', role: 'VIP Member • Kuala Lumpur' },
        { quote: 'I finally feel confident increasing my stake sizes—the transparency is the best I have seen.', author: 'May Thu', role: 'Premium Member • Yangon' },
        { quote: 'We run a private betting club and ProTips is the only service we trust with our syndicate.', author: 'Victory Club Syndicate', role: 'Regional Partner' },
    ],
};

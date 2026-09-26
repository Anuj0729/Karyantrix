// Shared, framework-agnostic data for the Help Center. Kept out of the
// 'use client' component so the server page can reuse it for FAQPage JSON-LD
// without pulling in client-only code.

export const CATEGORIES = [
  { key: 'all', label: 'All topics' },
  { key: 'general', label: 'Getting started' },
  { key: 'customer', label: 'For customers' },
  { key: 'provider', label: 'For providers' },
  { key: 'payments', label: 'Payments & safety' },
];

export const FAQS = [
  {
    category: 'general',
    q: 'What is Karyantrix?',
    a: "Karyantrix is a service marketplace that connects customers with verified, background-checked local professionals - for home repairs, cleaning, tutoring, events, wellness and everyday tasks. Post what you need or apply as a provider, all in one place.",
  },
  {
    category: 'general',
    q: 'Is it free to use?',
    a: 'Yes. Creating an account, posting a requirement, browsing providers and sending bids are all free. You only pay for the service you book, through the platform.',
  },
  {
    category: 'general',
    q: 'How do I switch between a customer and a provider account?',
    a: "If you already have an approved provider profile, open your account menu and use \"Switch to provider\" (or \"Switch to customer\") to move between the two views without logging in again.",
  },
  {
    category: 'general',
    q: "I forgot my password. What do I do?",
    a: 'Go to the login page and select "Forgot password". Enter the phone number or email on your account and follow the OTP steps to reset it.',
  },
  {
    category: 'customer',
    q: 'How do I post a requirement?',
    a: 'From the home page, tap "Post a Requirement" and describe the work, your budget, timing and address. Verified providers in your area will start sending bids you can compare.',
    link: { href: '/?postRequirement=1', label: 'Post a requirement' },
  },
  {
    category: 'customer',
    q: 'How do I choose between the bids I receive?',
    a: 'Each bid shows the price, the provider\'s rating, reviews and portfolio. Open a profile to see verification badges and past work, then message a provider directly before you decide.',
  },
  {
    category: 'customer',
    q: 'Can I cancel a booking?',
    a: 'Yes, from your bookings page you can cancel a confirmed booking. Depending on how close it is to the scheduled time, a cancellation policy may apply - the app will show you the details before you confirm.',
    link: { href: '/bookings', label: 'View my bookings' },
  },
  {
    category: 'customer',
    q: 'What if I am not happy with the completed work?',
    a: 'Your payment stays in escrow until you mark the job as complete, so nothing is released without your confirmation. If something goes wrong, you can raise a report on the booking or open a support ticket and our team will step in.',
  },
  {
    category: 'provider',
    q: 'How do I become a provider on Karyantrix?',
    a: 'Apply from the "Become a Provider" page with your services, experience and documents (Aadhaar, bank passbook and a live photo). Our team reviews every application before you are approved to start bidding.',
    link: { href: '/become-provider', label: 'Become a provider' },
  },
  {
    category: 'provider',
    q: 'How long does verification take?',
    a: 'Most applications are reviewed within a few business days. You can track the status of your application anytime from your profile.',
  },
  {
    category: 'provider',
    q: 'How do I get more bookings?',
    a: 'Keep your profile complete with a clear photo, portfolio and accurate service radius, respond to requirements quickly, price competitively, and deliver good work - your rating and reviews are the biggest driver of future bookings.',
  },
  {
    category: 'provider',
    q: 'When and how do I get paid?',
    a: 'Customers pay upfront into escrow when they confirm a booking. Once the job is marked complete, the payment is released to your Karyantrix wallet, which you can withdraw to your bank account.',
    link: { href: '/provider/wallet', label: 'View my wallet' },
  },
  {
    category: 'payments',
    q: 'Is my payment protected?',
    a: 'Yes. All payments are held in escrow and only released to the provider once you confirm the job is done to your satisfaction.',
  },
  {
    category: 'payments',
    q: 'What payment methods are supported?',
    a: 'Karyantrix supports standard online payment methods (cards, UPI and net banking) through our payment partner at checkout.',
  },
  {
    category: 'payments',
    q: 'How are providers verified?',
    a: "Every provider's Aadhaar, bank passbook and a live, real-time photo are reviewed by our team before they are approved to bid on requirements.",
  },
  {
    category: 'payments',
    q: 'How do I report a problem with a provider or customer?',
    a: 'Open the relevant booking or profile and use the "Report" option, or raise a support ticket describing the issue. Our team reviews every report.',
    link: { href: '/support', label: 'Raise a support ticket' },
  },
];

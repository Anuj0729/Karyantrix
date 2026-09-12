require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const {
  User,
  ProviderProfile,
  Category,
  ServiceCatalog,
  Service,
  Review,
  Notification,
  Requirement,
  Bid,
  Booking,
  Conversation,
  Message,
  Report,
  WalletTransaction,
  PlatformSetting,
  SupportTicket,
} = require('../models');

const RESET = process.argv.includes('--reset');
const SEED_PASSWORD = 'Password123!';

const CATEGORY_DEFS = [
  { name: 'Home Cleaning', slug: 'home-cleaning', icon: 'sparkles', services: ['Deep Cleaning', 'Bathroom Cleaning', 'Kitchen Cleaning'] },
  { name: 'Electrician', slug: 'electrician', icon: 'zap', services: ['Wiring Repair', 'Fan Installation', 'Switchboard Fitting'] },
  { name: 'Plumbing', slug: 'plumbing', icon: 'droplet', services: ['Leak Repair', 'Pipe Fitting', 'Bathroom Fitting'] },
  { name: 'Carpentry', slug: 'carpentry', icon: 'hammer', services: ['Furniture Repair', 'Custom Wardrobe', 'Door Fitting'] },
  { name: 'Painting', slug: 'painting', icon: 'paintbrush', services: ['Interior Painting', 'Exterior Painting', 'Wall Texturing'] },
  { name: 'Appliance Repair', slug: 'appliance-repair', icon: 'wrench', services: ['AC Repair', 'Washing Machine Repair', 'Refrigerator Repair'] },
];

const CITIES = [
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const placeholderImg = (seed, w = 600, h = 400) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

async function wipe() {
  const collections = [
    User, ProviderProfile, Category, ServiceCatalog, Service, Review, Notification,
    Requirement, Bid, Booking, Conversation, Message, Report, WalletTransaction,
    PlatformSetting, SupportTicket,
  ];
  await Promise.all(collections.map((m) => m.deleteMany({})));
}

async function seed() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // ---------- Platform settings ----------
  await PlatformSetting.findOneAndUpdate(
    { key: 'global' },
    {
      key: 'global',
      commission_percent: 10,
      payout_sla_days: 3,
      customer_cancellation_fee_percent: 10,
      provider_cancellation_fee_percent: 15,
    },
    { upsert: true }
  );

  // ---------- Admin ----------
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@karyantrix.test',
    password_hash: passwordHash,
    role: 'admin',
    is_verified: true,
    avatar_url: placeholderImg('admin-avatar', 200, 200),
  });

  // ---------- Categories & catalog ----------
  const categories = [];
  const catalogByCategory = {};
  for (const def of CATEGORY_DEFS) {
    const category = await Category.create({
      name: def.name,
      slug: def.slug,
      description: `${def.name} services near you`,
      icon: def.icon,
    });
    categories.push(category);
    catalogByCategory[category.id] = [];
    for (const serviceName of def.services) {
      const catalogEntry = await ServiceCatalog.create({
        category: category._id,
        name: serviceName,
        description: `${serviceName} - professional, verified providers`,
      });
      catalogByCategory[category.id].push(catalogEntry);
    }
  }

  // ---------- Customers ----------
  const CUSTOMER_BIOS = [
    'Homeowner looking for reliable local help.',
    'Runs a small office, hires help for maintenance.',
    'Recently moved into a new apartment.',
    null,
    'Prefers weekend bookings.',
    null,
    'Landlord managing a couple of rental units.',
    null,
    'Busy parent, values punctual providers.',
    null,
  ];
  const customers = [];
  for (let i = 1; i <= 10; i += 1) {
    const city = rand(CITIES);
    const customer = await User.create({
      name: `Customer ${i}`,
      email: `customer${i}@karyantrix.test`,
      phone: `9${String(100000000 + i).slice(0, 9)}`,
      password_hash: passwordHash,
      role: 'customer',
      is_verified: true,
      location: city.name,
      bio: CUSTOMER_BIOS[i - 1],
      avatar_url: i % 3 === 0 ? null : placeholderImg(`customer-${i}`, 200, 200),
      requirement_radius_km: randInt(3, 25),
    });
    customers.push(customer);
  }

  // ---------- Providers ----------
  // Fixed application-status spread so every admin review state is represented.
  const APPLICATION_STATES = [
    'approved', 'approved', 'approved', 'approved', 'approved',
    'submitted', 'under_review', 'rejected', 'changes_required', 'draft',
  ];
  const SKILL_POOL = ['Reliable', 'On-time', 'Quality work', 'Budget friendly', 'Same-day service', 'Neat & tidy'];
  const LANGUAGE_POOL = ['English', 'Hindi', 'Marathi', 'Kannada'];

  const providers = [];
  for (let i = 1; i <= 10; i += 1) {
    const city = rand(CITIES);
    const category = categories[(i - 1) % categories.length];
    const applicationStatus = APPLICATION_STATES[i - 1];
    const isApproved = applicationStatus === 'approved';

    const user = await User.create({
      name: `Provider ${i}`,
      email: `provider${i}@karyantrix.test`,
      phone: `8${String(200000000 + i).slice(0, 9)}`,
      password_hash: passwordHash,
      role: 'provider',
      is_verified: true,
      location: city.name,
      bio: `${category.name} professional based in ${city.name}.`,
      avatar_url: placeholderImg(`provider-${i}`, 200, 200),
    });

    const profile = await ProviderProfile.create({
      user: user._id,
      bio: `Experienced ${category.name.toLowerCase()} professional with ${randInt(1, 12)} years in the field.`,
      service_area: `${city.name} and nearby areas`,
      city: city.name,
      experience_years: randInt(1, 12),
      avg_rating: isApproved ? Number(randInt(35, 50) / 10).toFixed(1) : 0,
      total_reviews: isApproved ? randInt(0, 40) : 0,
      total_jobs_completed: isApproved ? randInt(0, 60) : 0,
      is_approved: isApproved,
      is_available: i !== 2, // one approved provider marked unavailable
      professional_title: `${category.name} Specialist`,
      categories: [category._id],
      skills: [rand(SKILL_POOL), rand(SKILL_POOL), rand(SKILL_POOL)],
      languages: [LANGUAGE_POOL[0], rand(LANGUAGE_POOL.slice(1))],
      certifications: isApproved
        ? [{ title: `Certified ${category.name} Technician`, issuer: 'Skill India', year: 2019 + (i % 5) }]
        : [],
      portfolio: isApproved
        ? [
            { image_url: placeholderImg(`portfolio-${i}-a`), title: 'Recent job', description: `${category.name} work completed for a client in ${city.name}.` },
            { image_url: placeholderImg(`portfolio-${i}-b`), title: 'Before & after', description: 'Finished result after the visit.' },
          ]
        : [],
      starting_price: randInt(300, 2000),
      response_time_minutes: randInt(5, 60),
      is_online: i === 1 || i === 3,
      availability: {
        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        hours_from: '09:00',
        hours_to: '18:00',
        advance_booking_days: randInt(0, 3),
      },
      service_radius_km: randInt(5, 30),
      kyc_documents: isApproved
        ? {
            aadhar_front: placeholderImg(`kyc-front-${i}`, 400, 250),
            aadhar_back: placeholderImg(`kyc-back-${i}`, 400, 250),
            passbook_front: placeholderImg(`kyc-passbook-${i}`, 400, 250),
          }
        : {},
      verification_status: isApproved ? (i === 3 ? 'pending' : 'verified') : 'unverified',
      application_status: applicationStatus,
      application_feedback:
        applicationStatus === 'rejected'
          ? 'KYC documents were blurry and could not be verified. Please reapply with clear scans.'
          : applicationStatus === 'changes_required'
            ? 'Please add at least one certification and a clearer profile photo.'
            : null,
      repeat_customers: isApproved ? randInt(0, 8) : 0,
      response_rate: isApproved ? randInt(70, 100) : null,
      location: { text: city.name, lat: city.lat + Math.random() * 0.05, lng: city.lng + Math.random() * 0.05 },
    });

    providers.push({ user, profile, category, city });
  }

  const approvedProviders = providers.filter((p) => p.profile.is_approved);

  // ---------- Services ----------
  const services = [];
  const serviceStatuses = ['active', 'active', 'paused', 'draft'];
  for (const p of approvedProviders) {
    const catalogOptions = catalogByCategory[p.category.id];
    catalogOptions.slice(0, 2).forEach((catalogEntry, idx) => {
      services.push({ provider: p, catalogEntry, statusIdx: idx });
    });
  }
  const createdServices = [];
  for (let i = 0; i < services.length; i += 1) {
    const { provider: p, catalogEntry } = services[i];
    const service = await Service.create({
      provider: p.user._id,
      category: p.category._id,
      catalog_service: catalogEntry._id,
      title: `${catalogEntry.name} by ${p.user.name}`,
      description: `Professional ${catalogEntry.name.toLowerCase()} service. Book now for a quick, reliable job.`,
      price: randInt(300, 3000),
      price_type: rand(['fixed', 'hourly', 'estimate']),
      duration_minutes: rand([30, 45, 60, 90, 120]),
      images: [placeholderImg(`service-${i}-1`), placeholderImg(`service-${i}-2`)],
      tags: [p.category.slug, catalogEntry.name.toLowerCase().replace(/\s+/g, '-')],
      location: p.profile.city,
      status: serviceStatuses[i % serviceStatuses.length],
      avg_rating: Number(randInt(30, 50) / 10).toFixed(1),
      review_count: randInt(0, 25),
    });
    createdServices.push(service);
  }

  // ---------- Requirements + Bids ----------
  // requirementPlans: the first 6 will be converted into bookings covering every
  // booking lifecycle state; the rest stay open with live bidding, one is a
  // direct/"fixed" post targeted at a specific provider.
  const EXPERIENCE_LEVEL_SETS = [['any'], ['beginner', 'intermediate'], ['expert'], ['any']];

  async function makeRequirement({ customer, category, city, postType = 'bids', targetProvider = null, withMedia = false }) {
    const catalogNames = catalogByCategory[category.id].map((c) => c.name).slice(0, 2);
    const requirement = await Requirement.create({
      customer: customer._id,
      services: catalogNames,
      categories: [category._id],
      description: `Need help with ${category.name.toLowerCase()} at my place. Looking for a verified professional.`,
      budget: randInt(500, 5000),
      experience_levels: rand(EXPERIENCE_LEVEL_SETS),
      media: withMedia ? [{ url: placeholderImg(`requirement-${customer.id}-${Date.now()}`), type: 'image' }] : [],
      location: { text: city.name, lat: city.lat, lng: city.lng },
      post_type: postType,
      target_provider: targetProvider ? targetProvider.user._id : null,
      interested_providers: [],
    });
    return requirement;
  }

  async function bidsFor(requirement, category) {
    const eligible = approvedProviders.filter((p) => p.category.id === category.id);
    const created = [];
    for (const p of eligible) {
      const bid = await Bid.create({
        requirement: requirement._id,
        provider: p.user._id,
        amount: randInt(400, 4500),
        message: 'I can start right away and guarantee quality work.',
      });
      created.push(bid);
    }
    return created;
  }

  async function hire(requirement, bid) {
    bid.status = 'accepted';
    await bid.save();
    await Bid.updateMany({ requirement: requirement._id, _id: { $ne: bid._id } }, { status: 'rejected' });
    requirement.status = 'closed';
    requirement.hired_provider = bid.provider;
    requirement.hired_bid = bid._id;
    requirement.hired_at = new Date();
    await requirement.save();
  }

  // 1) Awaiting advance
  const req1 = await makeRequirement({ customer: customers[0], category: categories[0], city: CITIES[0] });
  const bids1 = await bidsFor(req1, categories[0]);
  await hire(req1, bids1[0]);
  const booking1 = await Booking.create({
    requirement: req1._id,
    bid: bids1[0]._id,
    customer: req1.customer,
    provider: bids1[0].provider,
    total_amount: bids1[0].amount,
    advance_percent: 30,
    advance_amount: Math.round(bids1[0].amount * 0.3),
    balance_amount: bids1[0].amount - Math.round(bids1[0].amount * 0.3),
    status: 'awaiting_advance',
  });

  // 2) In progress, with one pending and one approved progress update
  const req2 = await makeRequirement({ customer: customers[1], category: categories[1], city: CITIES[1], withMedia: true });
  const bids2 = await bidsFor(req2, categories[1]);
  await hire(req2, bids2[0]);
  const advance2 = Math.round(bids2[0].amount * 0.3);
  const booking2 = await Booking.create({
    requirement: req2._id,
    bid: bids2[0]._id,
    customer: req2.customer,
    provider: bids2[0].provider,
    total_amount: bids2[0].amount,
    advance_percent: 30,
    advance_amount: advance2,
    balance_amount: bids2[0].amount - advance2,
    status: 'in_progress',
    advance: { status: 'paid', razorpay_order_id: `order_seed_${req2.id}`, razorpay_payment_id: `pay_seed_${req2.id}`, paid_at: daysAgo(2) },
    progress_updates: [
      { note: 'Started work, replaced the main switchboard.', media: [{ url: placeholderImg(`progress-${req2.id}-1`), type: 'image' }], status: 'approved', customer_feedback: 'Looks great so far!', responded_at: daysAgo(1) },
      { note: 'Testing all connections before wrapping up.', is_final: false, status: 'pending' },
    ],
  });

  // 3) Work completed, awaiting balance payment
  const req3 = await makeRequirement({ customer: customers[2], category: categories[2], city: CITIES[2] });
  const bids3 = await bidsFor(req3, categories[2]);
  await hire(req3, bids3[0]);
  const advance3 = Math.round(bids3[0].amount * 0.3);
  const booking3 = await Booking.create({
    requirement: req3._id,
    bid: bids3[0]._id,
    customer: req3.customer,
    provider: bids3[0].provider,
    total_amount: bids3[0].amount,
    advance_percent: 30,
    advance_amount: advance3,
    balance_amount: bids3[0].amount - advance3,
    status: 'work_completed',
    advance: { status: 'paid', razorpay_order_id: `order_seed_${req3.id}`, razorpay_payment_id: `pay_seed_${req3.id}`, paid_at: daysAgo(4) },
    progress_updates: [
      { note: 'Leak fixed and pipes tested under pressure. Job complete.', media: [{ url: placeholderImg(`progress-${req3.id}-1`), type: 'image' }], is_final: true, status: 'approved', customer_feedback: 'All good, thank you!', responded_at: daysAgo(1) },
    ],
    work_completed_at: daysAgo(1),
    payout_expected_at: daysAgo(-2),
  });

  // 4) Fully completed with review + payout
  const req4 = await makeRequirement({ customer: customers[3], category: categories[3], city: CITIES[3] });
  const bids4 = await bidsFor(req4, categories[3]);
  await hire(req4, bids4[0]);
  const advance4 = Math.round(bids4[0].amount * 0.3);
  const balance4 = bids4[0].amount - advance4;
  const booking4 = await Booking.create({
    requirement: req4._id,
    bid: bids4[0]._id,
    customer: req4.customer,
    provider: bids4[0].provider,
    total_amount: bids4[0].amount,
    advance_percent: 30,
    advance_amount: advance4,
    balance_amount: balance4,
    status: 'completed',
    advance: { status: 'paid', razorpay_order_id: `order_seed_${req4.id}a`, razorpay_payment_id: `pay_seed_${req4.id}a`, paid_at: daysAgo(10) },
    balance: { status: 'paid', razorpay_order_id: `order_seed_${req4.id}b`, razorpay_payment_id: `pay_seed_${req4.id}b`, paid_at: daysAgo(7) },
    progress_updates: [
      { note: 'Custom wardrobe installed and finished with polish.', media: [{ url: placeholderImg(`progress-${req4.id}-1`), type: 'image' }], is_final: true, status: 'approved', customer_feedback: 'Excellent carpentry work.', responded_at: daysAgo(8) },
    ],
    work_completed_at: daysAgo(8),
  });
  await Review.create({
    requirement: req4._id,
    customer: req4.customer,
    provider: bids4[0].provider,
    rating: 5,
    title: 'Great work!',
    comment: 'Fast, professional, and cleaned up after the job. Highly recommend.',
    status: 'published',
    provider_response: { text: 'Thank you for the kind words, happy to help again!', responded_at: daysAgo(6) },
  });
  await WalletTransaction.create({ booking: booking4._id, customer: req4.customer, provider: bids4[0].provider, type: 'advance_received', direction: 'credit', amount: advance4, status: 'completed', method: 'razorpay', reference: `seed_${booking4._id}_adv` });
  await WalletTransaction.create({ booking: booking4._id, customer: req4.customer, provider: bids4[0].provider, type: 'balance_received', direction: 'credit', amount: balance4, status: 'completed', method: 'razorpay', reference: `seed_${booking4._id}_bal` });
  await WalletTransaction.create({ booking: booking4._id, provider: bids4[0].provider, type: 'payout', direction: 'debit', amount: Math.round(bids4[0].amount * 0.9), status: 'completed', method: 'bank_transfer', reference: `seed_${booking4._id}_payout`, recorded_by: admin._id, notes: 'Weekly payout batch.' });

  // 5) Cancelled by customer (fee charged to customer)
  const req5 = await makeRequirement({ customer: customers[4], category: categories[4], city: CITIES[0] });
  const bids5 = await bidsFor(req5, categories[4]);
  await hire(req5, bids5[0]);
  const advance5 = Math.round(bids5[0].amount * 0.3);
  const cancelFee5 = Math.round(advance5 * 0.1);
  const booking5 = await Booking.create({
    requirement: req5._id,
    bid: bids5[0]._id,
    customer: req5.customer,
    provider: bids5[0].provider,
    total_amount: bids5[0].amount,
    advance_percent: 30,
    advance_amount: advance5,
    balance_amount: bids5[0].amount - advance5,
    status: 'cancelled',
    advance: { status: 'paid', razorpay_order_id: `order_seed_${req5.id}`, razorpay_payment_id: `pay_seed_${req5.id}`, paid_at: daysAgo(5) },
    cancellation: {
      cancelled_by_role: 'customer',
      cancelled_by: req5.customer,
      reason: 'found_another_provider',
      details: 'Found someone available sooner.',
      fee_percent: 10,
      fee_amount: cancelFee5,
      fee_charged_to: 'customer',
      refund_amount: advance5 - cancelFee5,
      cancelled_at: daysAgo(4),
    },
  });
  await WalletTransaction.create({ booking: booking5._id, customer: req5.customer, type: 'cancellation_fee', direction: 'credit', amount: cancelFee5, status: 'completed', method: 'razorpay', reference: `seed_${booking5._id}_fee` });
  await WalletTransaction.create({ booking: booking5._id, customer: req5.customer, type: 'refund', direction: 'debit', amount: advance5 - cancelFee5, status: 'completed', method: 'razorpay', reference: `seed_${booking5._id}_refund` });

  // 6) Cancelled by provider (fee charged to provider, customer refunded in full)
  const req6 = await makeRequirement({ customer: customers[5], category: categories[5], city: CITIES[1] });
  const bids6 = await bidsFor(req6, categories[5]);
  let booking6 = null;
  if (bids6.length) {
    await hire(req6, bids6[0]);
    const advance6 = Math.round(bids6[0].amount * 0.3);
    booking6 = await Booking.create({
      requirement: req6._id,
      bid: bids6[0]._id,
      customer: req6.customer,
      provider: bids6[0].provider,
      total_amount: bids6[0].amount,
      advance_percent: 30,
      advance_amount: advance6,
      balance_amount: bids6[0].amount - advance6,
      status: 'cancelled',
      advance: { status: 'paid', razorpay_order_id: `order_seed_${req6.id}`, razorpay_payment_id: `pay_seed_${req6.id}`, paid_at: daysAgo(6) },
      cancellation: {
        cancelled_by_role: 'provider',
        cancelled_by: bids6[0].provider,
        reason: 'unavailable',
        details: 'Double-booked and unable to make it.',
        fee_percent: 15,
        fee_amount: Math.round(advance6 * 0.15),
        fee_charged_to: 'provider',
        refund_amount: advance6,
        cancelled_at: daysAgo(5),
      },
    });
    await WalletTransaction.create({ booking: booking6._id, customer: req6.customer, type: 'refund', direction: 'debit', amount: advance6, status: 'completed', method: 'razorpay', reference: `seed_${booking6._id}_refund` });
    await WalletTransaction.create({ booking: booking6._id, provider: bids6[0].provider, type: 'cancellation_fee', direction: 'debit', amount: Math.round(advance6 * 0.15), status: 'pending', method: 'other', reference: `seed_${booking6._id}_fee`, notes: 'To be deducted from next payout.' });
  }

  // Remaining open requirements (live bidding, no booking yet)
  const req7 = await makeRequirement({ customer: customers[6], category: categories[0], city: CITIES[2], withMedia: true });
  await bidsFor(req7, categories[0]);
  req7.interested_providers = approvedProviders
    .filter((p) => p.category.id === categories[0].id)
    .slice(0, 1)
    .map((p) => ({ provider: p.user._id, message: 'Interested, can visit tomorrow.' }));
  await req7.save();

  const req8 = await makeRequirement({ customer: customers[7], category: categories[2], city: CITIES[3] });
  await bidsFor(req8, categories[2]);

  // Direct/"fixed" requirement targeted at a specific approved provider
  const targetProvider = approvedProviders[0];
  const req9 = await makeRequirement({ customer: customers[8], category: targetProvider.category, city: CITIES[4], postType: 'fixed', targetProvider });

  const allRequirements = [req1, req2, req3, req4, req5, req6, req7, req8, req9];

  // ---------- Notifications ----------
  await Notification.create({ user: customers[0]._id, title: 'Welcome to Karyantrix', message: 'Post your first requirement to get bids from verified providers.', type: 'general' });
  await Notification.create({ user: req1.customer, title: 'New bid received', message: 'A provider placed a bid on your requirement.', type: 'bid_received', related_requirement: req1._id });
  await Notification.create({ user: bids2[0].provider, title: 'Advance payment received', message: 'The customer paid the advance for your accepted bid.', type: 'booking_update', related_requirement: req2._id });
  await Notification.create({ user: req4.customer, title: 'Review request', message: 'Your job is complete - leave a review for your provider.', type: 'review_request', related_requirement: req4._id, is_read: true });
  await Notification.create({ user: bids5[0].provider, title: 'Booking cancelled', message: 'The customer cancelled a booking with you.', type: 'booking_update', related_requirement: req5._id });
  await Notification.create({ user: customers[6]._id, title: 'Provider interested', message: 'A provider expressed interest in your requirement.', type: 'requirement_update', related_requirement: req7._id });

  // ---------- Conversations & messages ----------
  const conversation1 = await Conversation.create({
    customer: req2.customer,
    provider: bids2[0].provider,
    last_message_preview: 'Sure, I can come by tomorrow morning.',
    last_message_type: 'text',
    last_message_at: daysAgo(2),
    last_message_sender: bids2[0].provider,
    customer_unread_count: 1,
  });
  await Message.create({ conversation: conversation1._id, sender: req2.customer, type: 'text', text: 'Hi, are you available this week?' });
  await Message.create({ conversation: conversation1._id, sender: bids2[0].provider, type: 'text', text: 'Sure, I can come by tomorrow morning.' });

  const conversation2 = await Conversation.create({
    customer: req4.customer,
    provider: bids4[0].provider,
    last_message_preview: '[image]',
    last_message_type: 'image',
    last_message_at: daysAgo(8),
    last_message_sender: req4.customer,
    provider_unread_count: 1,
  });
  await Message.create({ conversation: conversation2._id, sender: req4.customer, type: 'text', text: 'Here is a photo of the wardrobe space.' });
  await Message.create({ conversation: conversation2._id, sender: req4.customer, type: 'image', media: { url: placeholderImg('chat-wardrobe'), media_type: 'image' } });
  await Message.create({ conversation: conversation2._id, sender: bids4[0].provider, type: 'text', text: 'Got it, thanks! I will bring matching finish samples.', is_edited: true, edited_at: daysAgo(7) });

  // ---------- Reports ----------
  await Report.create({
    reporter: customers[1]._id,
    reporter_role: 'customer',
    reported_user: providers[7].user._id,
    reported_role: 'provider',
    reason: 'spam_or_scam',
    description: 'Provider asked me to pay outside the platform.',
    status: 'action_taken',
    action_taken: 'warning_sent',
  });
  await Report.create({
    reporter: bids2[0].provider,
    reporter_role: 'provider',
    reported_user: req2.customer,
    reported_role: 'customer',
    reason: 'abusive_language',
    description: 'Customer was rude and threatening over chat.',
    context: { conversation: conversation1._id },
    status: 'under_review',
  });
  await Report.create({
    reporter: customers[2]._id,
    reporter_role: 'customer',
    reported_user: providers[8].user._id,
    reported_role: 'provider',
    reason: 'no_show',
    description: 'Provider never arrived for the scheduled visit.',
    context: { requirement: req8._id },
    status: 'pending',
  });
  await Report.create({
    reporter: customers[3]._id,
    reporter_role: 'customer',
    reported_user: providers[0].user._id,
    reported_role: 'provider',
    reason: 'other',
    description: 'Minor mix-up over scheduling, resolved by talking.',
    status: 'dismissed',
    action_taken: 'none',
  });

  // ---------- Support tickets ----------
  await SupportTicket.create({
    user: customers[0]._id,
    user_role: 'customer',
    category: 'payment',
    subject: 'Advance payment not reflecting',
    related_booking: booking1._id,
    status: 'open',
    priority: 'high',
    messages: [{ sender: customers[0]._id, sender_role: 'customer', message: 'I paid the advance but the booking still shows pending.' }],
  });
  await SupportTicket.create({
    user: bids4[0].provider,
    user_role: 'provider',
    category: 'payout',
    subject: 'Payout amount seems short',
    related_booking: booking4._id,
    status: 'resolved',
    priority: 'normal',
    resolved_by: admin._id,
    resolved_at: daysAgo(3),
    messages: [
      { sender: bids4[0].provider, sender_role: 'provider', message: 'The payout is less than expected after commission.' },
      { sender: admin._id, sender_role: 'admin', message: 'This matches the 10% platform commission - breakdown emailed to you.' },
    ],
  });
  await SupportTicket.create({
    user: customers[5]._id,
    user_role: 'customer',
    category: 'account',
    subject: 'Cannot update my phone number',
    status: 'in_progress',
    priority: 'low',
    messages: [
      { sender: customers[5]._id, sender_role: 'customer', message: 'The OTP for my new number never arrives.' },
      { sender: admin._id, sender_role: 'admin', message: 'Looking into this, can you confirm the number you are trying to add?' },
    ],
  });
  await SupportTicket.create({
    user: providers[9].user._id,
    user_role: 'provider',
    category: 'account',
    subject: 'Application stuck in draft',
    status: 'closed',
    priority: 'normal',
    resolved_by: admin._id,
    resolved_at: daysAgo(1),
    messages: [
      { sender: providers[9].user._id, sender_role: 'provider', message: 'My provider application will not submit.' },
      { sender: admin._id, sender_role: 'admin', message: 'You are missing KYC documents - upload them and resubmit.' },
    ],
  });

  return { allRequirements, createdServices };
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PROD !== 'true') {
    process.exit(1);
  }

  await connectDB();

  if (RESET) {
    await wipe();
  } else {
    const existing = await User.countDocuments({ email: 'admin@karyantrix.test' });
    if (existing) {
      await mongoose.disconnect();
      return;
    }
  }

  await seed();
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});

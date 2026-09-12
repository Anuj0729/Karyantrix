export const PRICE_TYPE_LABELS = {
  fixed: 'Fixed price',
  hourly: 'Per hour',
  estimate: 'Estimate',
};

export const PRICE_TYPE_SHORT_LABELS = {
  fixed: 'Fixed',
  hourly: 'Per hour',
  estimate: 'Estimate',
};

export const PRICE_TYPE_SUFFIX = {
  fixed: '',
  hourly: '/hr',
  estimate: '*',
};

export const priceTypeLabel = (type) => PRICE_TYPE_LABELS[type] || PRICE_TYPE_LABELS.fixed;
export const priceTypeShortLabel = (type) => PRICE_TYPE_SHORT_LABELS[type] || PRICE_TYPE_SHORT_LABELS.fixed;
export const priceTypeSuffix = (type) => PRICE_TYPE_SUFFIX[type] ?? '';

export default { PRICE_TYPE_LABELS, PRICE_TYPE_SHORT_LABELS, PRICE_TYPE_SUFFIX, priceTypeLabel, priceTypeShortLabel, priceTypeSuffix };

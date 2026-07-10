import {
  differenceInCalendarDays,
  endOfDay as endOfDayDate,
  format,
  intervalToDuration,
  isValid,
  parseISO,
  startOfDay as startOfDayDate
} from 'date-fns';

export const subscriptionStatusFilters = ['All', 'Active', 'Expired', 'Scheduled', 'Inactive', 'Pending Payment'];

export const getTodayInputValue = (referenceDate = new Date()) => format(referenceDate, 'yyyy-MM-dd');

export const parseSubscriptionDate = (value, { endOfDay = false } = {}) => {
  if (!value) return null;

  if (value instanceof Date) {
    return endOfDay ? endOfDayDate(value) : startOfDayDate(value);
  }

  if (typeof value === 'string') {
    const parsedIsoDate = parseISO(value);
    if (isValid(parsedIsoDate)) {
      return endOfDay ? endOfDayDate(parsedIsoDate) : startOfDayDate(parsedIsoDate);
    }
  }

  const parsed = new Date(value);
  if (!isValid(parsed)) return null;
  return endOfDay ? endOfDayDate(parsed) : startOfDayDate(parsed);
};

export const normalizeSubscriptionText = (value) => String(value || '').trim().toLowerCase();

export const normalizeStoredSubscriptionStatus = (subscription) => {
  const normalizedStatus = normalizeSubscriptionText(
    typeof subscription === 'object' ? subscription?.status : subscription
  );

  if (['active', 'inactive', 'expired'].includes(normalizedStatus)) {
    return normalizedStatus;
  }

  if (typeof subscription === 'object') {
    const normalizedLegacyFlag = normalizeSubscriptionText(subscription?.is_active);
    if (
      subscription?.is_active === true ||
      subscription?.is_active === 1 ||
      normalizedLegacyFlag === 'true' ||
      normalizedLegacyFlag === '1'
    ) {
      return 'active';
    }

    if (
      subscription?.is_active === false ||
      subscription?.is_active === 0 ||
      normalizedLegacyFlag === 'false' ||
      normalizedLegacyFlag === '0'
    ) {
      return 'inactive';
    }
  }

  return 'active';
};

export const isSubscriptionPaymentPending = (value) => {
  const normalized = normalizeSubscriptionText(value);
  if (!normalized) return true;
  return !['paid', 'completed', 'success', 'waived'].includes(normalized);
};

const formatDurationLabel = (start, end) => {
  const duration = intervalToDuration({ start, end });
  const parts = [
    duration.years ? `${duration.years} year${duration.years === 1 ? '' : 's'}` : null,
    duration.months ? `${duration.months} month${duration.months === 1 ? '' : 's'}` : null,
    duration.days ? `${duration.days} day${duration.days === 1 ? '' : 's'}` : null,
    duration.hours ? `${duration.hours} hour${duration.hours === 1 ? '' : 's'}` : null,
    duration.minutes ? `${duration.minutes} minute${duration.minutes === 1 ? '' : 's'}` : null
  ].filter(Boolean);

  return parts.slice(0, 2).join(' ') || 'less than a minute';
};

export const getSubscriptionDayDifference = (targetDate, baseDate = new Date()) => {
  const parsedTarget = parseSubscriptionDate(targetDate);
  const parsedBase = parseSubscriptionDate(baseDate);

  if (!parsedTarget || !parsedBase) return null;

  return differenceInCalendarDays(parsedTarget, parsedBase);
};

export const getSubscriptionStatusMeta = (subscription, referenceDate = new Date(), t = (s) => s) => {
  const now = referenceDate instanceof Date ? new Date(referenceDate) : new Date(referenceDate);
  const safeNow = isValid(now) ? now : new Date();
  const today = startOfDayDate(safeNow);
  const startDate = parseSubscriptionDate(subscription?.start_date);
  const endDate = parseSubscriptionDate(subscription?.end_date, { endOfDay: true });
  const startDateDay = parseSubscriptionDate(subscription?.start_date);
  const endDateDay = parseSubscriptionDate(subscription?.end_date, { endOfDay: true });
  const storedStatus = normalizeStoredSubscriptionStatus(subscription);
  const isActive = storedStatus === 'active';
  const paymentPending = isSubscriptionPaymentPending(subscription?.payment_status);
  const daysUntilStart = getSubscriptionDayDifference(startDateDay, today);
  const daysUntilExpiry = getSubscriptionDayDifference(parseSubscriptionDate(subscription?.end_date), today);

  let status = 'Inactive';

  if (storedStatus === 'inactive') {
    status = 'Inactive';
  } else if (storedStatus === 'expired' || (endDate && endDate < safeNow)) {
    status = 'Expired';
  } else if (isActive && !paymentPending && startDate && startDate > safeNow) {
    status = 'Scheduled';
  } else if (isActive && !paymentPending && startDate && endDate && startDate <= safeNow && endDate >= safeNow) {
    status = 'Active';
  }

  let expiryText = t('subscription.noEndDate');
  if (endDate) {
    if (endDate < safeNow) {
      expiryText = t('subscription.expiredAgo', { duration: formatDurationLabel(endDate, safeNow, t) });
    } else {
      expiryText = t('subscription.expiresIn', { duration: formatDurationLabel(safeNow, endDate, t) });
    }
  }

  let startText = t('subscription.noStartDate');
  if (startDate) {
    if (startDate > safeNow) {
      startText = t('subscription.startsIn', { duration: formatDurationLabel(safeNow, startDate, t) });
    } else {
      startText = t('subscription.startedAgo', { duration: formatDurationLabel(startDate, safeNow, t) });
    }
  }

  return {
    status,
    storedStatus,
    isActive,
    paymentPending,
    startDate,
    endDate,
    startDateDay,
    endDateDay,
    daysUntilStart,
    daysUntilExpiry,
    startText,
    expiryText,
    isExpired: status === 'Expired',
    isScheduled: status === 'Scheduled',
    isCurrent: status === 'Active',
    isInactive: status === 'Inactive'
  };
};

export const getSubscriptionStatus = (subscription) => getSubscriptionStatusMeta(subscription).status;

export const matchesSubscriptionFilter = (subscription, filter) => {
  if (filter === 'All') return true;
  if (filter === 'Pending Payment') return Boolean(subscription?.paymentPending);
  return subscription?.status === filter;
};

export const buildSubscriptionSummary = (subscriptions = []) =>
  subscriptions.reduce(
    (accumulator, subscription) => {
      accumulator.total += 1;
      if (subscription.status === 'Active') accumulator.active += 1;
      if (subscription.status === 'Expired') accumulator.expired += 1;
      if (subscription.status === 'Scheduled') accumulator.scheduled += 1;
      if (subscription.status === 'Inactive') accumulator.inactive += 1;
      if (subscription.paymentPending) accumulator.pending += 1;
      return accumulator;
    },
    { total: 0, active: 0, expired: 0, scheduled: 0, inactive: 0, pending: 0 }
  );

export const sortSubscriptionsNewestFirst = (subscriptions = []) =>
  [...subscriptions].sort((firstSubscription, secondSubscription) => {
    const secondTime = new Date(secondSubscription.created_at || secondSubscription.start_date || 0).getTime();
    const firstTime = new Date(firstSubscription.created_at || firstSubscription.start_date || 0).getTime();
    return secondTime - firstTime;
  });

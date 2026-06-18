export function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

export function formatTime(minutes) {
  const rounded = Math.max(1, Math.round(minutes));
  if (rounded < 60) {
    return `${rounded} minute${rounded === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  if (!remaining) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${hours} hour${hours === 1 ? '' : 's'} ${remaining} minute${remaining === 1 ? '' : 's'}`;
}

export function formatFrequency(freq: number): string {
  const percent = freq * 100;
  if (percent >= 10) return `${Math.round(percent)}%`;
  if (percent >= 1) return `${percent.toFixed(1)}%`;
  if (percent >= 0.1) return `${percent.toFixed(1)}%`;
  if (percent > 0) return '<0.1%';
  return '0%';
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return formatFrequency(value / total);
}

export function formatSiteCount(count: number, total: number): string {
  return `${formatNumber(count)}/${formatNumber(total)} sites (${formatPercentage(count, total)})`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function formatTitle(title: string, width: number = 80): string {
  const border = '='.repeat(width);
  return `${border}\n${title}\n${border}`;
}

export function formatSubtitle(subtitle: string, width: number = 60): string {
  return `\n${subtitle}\n${'-'.repeat(width)}`;
}
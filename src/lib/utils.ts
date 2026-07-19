export function daysUntil(iso?: string) {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function fmtDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function deadlineUrgencyClass(iso?: string) {
  const days = daysUntil(iso);
  if (days == null) return '';
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return 'normal';
}

export function needsFollowUp(entry: any) {
  if (!entry.status || !entry.updatedAt) return false;
  const s = entry.status.toLowerCase();
  if (s.includes('applied') || s.includes('interview') || s.includes('screen')) {
    const daysSinceUpdate = (Date.now() - new Date(entry.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate >= 7;
  }
  return false;
}

export function statusVariant(status: string) {
  const map: Record<string, string> = {
    'Offer': 'is-positive', 'Accepted': 'is-positive', 'Enrolled': 'is-positive',
    'Rejected': 'is-negative', 'Withdrawn': 'is-negative',
    'Phone Screen': 'is-pending', 'Interview': 'is-pending', 'Submitted': 'is-pending', 'Waitlisted': 'is-pending', 'Deferred': 'is-pending', 'In Progress': 'is-pending'
  };
  return map[status] || '';
}

export function ensureUrl(url?: string) {
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) return 'https://' + url;
  return url;
}

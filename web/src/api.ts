export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export interface Site {
  id: string;
  name: string;
  domain: string;
  visitors_24h?: number;
}

export interface Row {
  label: string;
  count: number;
  visitors: number;
}

export interface Live {
  live: number;
  pages: { label: string; count: number }[];
  series: { bucket: string; pageviews: number }[];
}

export interface Goal {
  id: number;
  name: string;
  event_name: string;
  conversions: number;
  converters: number;
  conversion_rate: number;
}

export interface Stats {
  totals: {
    pageviews: number;
    visitors: number;
    custom_events: number;
    sessions: number;
    bounce_rate: number;
    avg_duration: number;
  };
  series: { bucket: string; pageviews: number; visitors: number }[];
  bucket: "hour" | "day";
  pages: Row[];
  referrers: Row[];
  utmSources: Row[];
  browsers: Row[];
  oses: Row[];
  devices: Row[];
  countries: Row[];
  events: Row[];
}

// Photos come only from properly sourced spot_photos (Supabase Storage).
// Instagram links are never re-hosted or proxied: they resolve to no photo,
// and the UI shows the category illustration instead.
export function photoSrc(value?:string|null):string|null{if(!value)return null;const raw=value.split("|")[0]?.trim();if(!raw)return null;if(/instagram\.com|cdninstagram|fbcdn/i.test(raw))return null;if(!/^https?:\/\//i.test(raw))return null;return raw}

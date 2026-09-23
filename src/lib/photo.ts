// Instagram post/reel links (including the /<username>/p/<id>/ form) resolve
// through the cached /api/photo proxy; anything else is used as-is.
export function photoSrc(value?:string|null):string|null{if(!value)return null;const raw=value.split("|")[0]?.trim();if(!raw)return null;const ig=raw.match(/instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reel)\/([A-Za-z0-9_-]+)/i);if(ig)return `/api/photo?url=${encodeURIComponent(`https://www.instagram.com/${ig[1]}/${ig[2]}/`)}`;return raw}

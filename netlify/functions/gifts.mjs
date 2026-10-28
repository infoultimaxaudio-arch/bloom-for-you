import { getStore } from '@netlify/blobs';

const MAX_BYTES = 4_500_000;
const MAX_TEXT = 12_000;
const ID_PATTERN = /^[a-f0-9-]{24,40}$/i;
const STORE_NAME = 'bloom-for-you-gifts';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

function validateGift(gift) {
  if (!gift || typeof gift !== 'object' ||
      Array.isArray(gift)) {
    return 'Invalid gift payload.';
  }

  if (gift.v !== 1) return 'Unsupported gift version.';

  const allowedThemes = new Set([
    'rose', 'midnight', 'peach', 'sage'
  ]);

  if (gift.theme && !allowedThemes.has(gift.theme)) {
    return 'Invalid theme.';
  }

  for (const key of [
    'to', 'from', 'headline', 'message', 'signoff'
  ]) {
    if (typeof gift[key] !== 'string') {
      return `Invalid ${key} field.`;
    }
    if (gift[key].length > MAX_TEXT) {
      return `${key} is too long.`;
    }
  }

  if (!Array.isArray(gift.photos) ||
      gift.photos.length > 3) {
    return 'Up to 3 photos are supported.';
  }

  const validAudio = (item) => !item || (
    typeof item === 'object' &&
    typeof item.name === 'string' &&
    typeof item.data === 'string' &&
    item.data.startsWith('data:audio/') &&
    item.data.length < 1_200_000
  );

  if (!gift.photos.every(
    p => typeof p === 'string' &&
      p.startsWith('data:image/') &&
      p.length < 260_000
  )) {
    return 'A photo is invalid or too large.';
  }

  if (!validAudio(gift.music) ||
      !validAudio(gift.voice)) {
    return 'An audio file is invalid or too large.';
  }

  return null;
}

export const handler = async (event) => {
  const method = event.httpMethod || event.method || 'GET';

  if (method === 'OPTIONS') return json(204, {});

  const store = getStoreconst store = getStore(STORE_NAME, {
  siteID: process.env.BLOOM_NETLIFY_SITE_ID,
  token: process.env.NETLIFY_AUTH_TOKEN
});(STORE_NAME);

  if (method === 'POST') {
    let gift;

    try {
      if (!event.body ||
          Buffer.byteLength(event.body, 'utf8') > MAX_BYTES) {
        return json(413, {
          error: 'This gift is too large. Use smaller media files.'
        });
      }

      const body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;

      gift = JSON.parse(body);
    } catch {
      return json(400, {
        error: 'The gift data could not be read.'
      });
    }

    const error = validateGift(gift);
    if (error) return json(400, { error });

    const id = crypto.randomUUID().replaceAll('-', '');

    try {
      await store.setJSON(id, gift);
      return json(201, { id });
    } catch (err) {
      console.error('Gift save failed:', err);
      return json(500, {
        error: 'Could not save the gift right now. Please try again.'
      });
    }
  }

  if (method === 'GET') {
    const params = new URLSearchParams(
      event.rawQuery || event.rawQueryString || ''
    );

    const id = params.get('id');

    if (!id || !ID_PATTERN.test(id)) {
      return json(400, {
        error: 'A valid gift id is required.'
      });
    }

    try {
      const gift = await store.get(id, { type: 'json' });

      if (!gift) {
        return json(404, { error: 'Gift not found.' });
      }

      return json(200, { gift });
    } catch (err) {
      console.error('Gift load failed:', err);
      return json(500, {
        error: 'Could not load the gift right now.'
      });
    }
  }

  return json(405, { error: 'Method not allowed.' });
};

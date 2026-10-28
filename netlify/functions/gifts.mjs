
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'bloom-for-you-gifts';
const MAX_BODY_BYTES = 4_500_000;
const MAX_TEXT_LENGTH = 12_000;
const MAX_PHOTO_LENGTH = 260_000;
const MAX_AUDIO_LENGTH = 1_200_000;
const GIFT_ID_PATTERN = /^[a-f0-9]{32}$/i;

function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(data),
  };
}

function getGiftStore() {
  const siteID =
    process.env.BLOOM_NETLIFY_SITE_ID ||
    process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;

  if (siteID && token) {
    return getStore(STORE_NAME, { siteID, token });
  }

  return getStore(STORE_NAME);
}

function validateGift(gift) {
  if (!gift || typeof gift !== 'object' || Array.isArray(gift)) {
    return 'Invalid gift data.';
  }

  if (gift.v !== 1) return 'Unsupported gift version.';

  const allowedThemes = new Set([
    'rose', 'midnight', 'peach', 'sage'
  ]);

  if (gift.theme && !allowedThemes.has(gift.theme)) {
    return 'Invalid gift theme.';
  }

  for (const key of ['to', 'from', 'headline', 'message', 'signoff']) {
    if (typeof gift[key] !== 'string') {
      return `Invalid ${key} field.`;
    }
    if (gift[key].length > MAX_TEXT_LENGTH) {
      return `${key} is too long.`;
    }
  }

  if (!Array.isArray(gift.photos) || gift.photos.length > 3) {
    return 'Up to 3 photos are supported.';
  }

  const photosAreValid = gift.photos.every(
    (photo) =>
      typeof photo === 'string' &&
      photo.startsWith('data:image/') &&
      photo.length <= MAX_PHOTO_LENGTH
  );

  if (!photosAreValid) {
    return 'A photo is invalid or too large.';
  }

  const validAudio = (audio) =>
    audio == null ||
    (
      typeof audio === 'object' &&
      typeof audio.name === 'string' &&
      typeof audio.data === 'string' &&
      audio.data.startsWith('data:audio/') &&
      audio.data.length <= MAX_AUDIO_LENGTH
    );

  if (!validAudio(gift.music) || !validAudio(gift.voice)) {
    return 'An audio file is invalid or too large.';
  }

  return null;
}

function getGiftId(event) {
  const directId = event.queryStringParameters?.id;
  if (directId) return directId;

  const rawQuery = String(
    event.rawQueryString || event.rawQuery || ''
  ).replace(/^\?/, '');

  return new URLSearchParams(rawQuery).get('id');
}

export const handler = async (event) => {
  const method = String(
    event.httpMethod ||
    event.requestContext?.http?.method ||
    'GET'
  ).toUpperCase();

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (method === 'GET') {
    const id = getGiftId(event);

    if (!id || !GIFT_ID_PATTERN.test(id)) {
      return json(400, {
        error: 'A valid gift id is required.',
      });
    }

    try {
      const store = getGiftStore();
      const gift = await store.get(id, { type: 'json' });

      if (!gift) {
        return json(404, { error: 'Gift not found.' });
      }

      return json(200, { gift });
    } catch (error) {
      console.error('Gift load failed:', error);

      return json(500, {
        error: 'Could not load this gift. Check Netlify Blobs configuration and redeploy.',
      });
    }
  }

  if (method === 'POST') {
    if (!event.body) {
      return json(400, { error: 'Gift data is required.' });
    }

    let bodyText;

    try {
      bodyText = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
    } catch {
      return json(400, {
        error: 'The gift data could not be read.',
      });
    }

    if (Buffer.byteLength(bodyText, 'utf8') > MAX_BODY_BYTES) {
      return json(413, {
        error: 'This gift is too large. Please use smaller photo or audio files.',
      });
    }

    let gift;

    try {
      gift = JSON.parse(bodyText);
    } catch {
      return json(400, {
        error: 'The gift data is not valid JSON.',
      });
    }

    const validationError = validateGift(gift);

    if (validationError) {
      return json(400, { error: validationError });
    }

    const id = crypto.randomUUID().replaceAll('-', '');

    try {
      const store = getGiftStore();
      await store.setJSON(id, gift);

      return json(201, { id });
    } catch (error) {
      console.error('Gift save failed:', error);

      return json(500, {
        error: 'Could not save this gift. Check Netlify Blobs configuration and redeploy.',
      });
    }
  }

  return json(405, { error: 'Method not allowed.' });
};

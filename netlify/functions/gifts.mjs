
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'bloom-for-you-gifts';
const MAX_BODY_BYTES = 4_500_000;
const MAX_TEXT_LENGTH = 12_000;
const MAX_PHOTO_LENGTH = 260_000;
const MAX_AUDIO_LENGTH = 1_200_000;
const GIFT_ID_PATTERN = /^[a-f0-9]{32}$/i;

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function validateGift(gift) {
  if (!gift || typeof gift !== 'object' || Array.isArray(gift)) {
    return 'Invalid gift data.';
  }

  if (gift.v !== 1) return 'Unsupported gift version.';

  if (gift.theme && !['rose', 'midnight', 'peach', 'sage'].includes(gift.theme)) {
    return 'Invalid gift theme.';
  }

  for (const key of ['to', 'from', 'headline', 'message', 'signoff']) {
    if (typeof gift[key] !== 'string') return `Invalid ${key} field.`;
    if (gift[key].length > MAX_TEXT_LENGTH) return `${key} is too long.`;
  }

  if (!Array.isArray(gift.photos) || gift.photos.length > 3) {
    return 'Up to 3 photos are supported.';
  }

  if (!gift.photos.every(
    p => typeof p === 'string' &&
      p.startsWith('data:image/') &&
      p.length <= MAX_PHOTO_LENGTH
  )) {
    return 'A photo is invalid or too large.';
  }

  const validAudio = audio => audio == null || (
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

export default async function gifts(request, context) {
  const method = request.method.toUpperCase();

  if (method !== 'GET' && method !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  if (method === 'GET') {
    const id = new URL(request.url).searchParams.get('id');

    if (!id || !GIFT_ID_PATTERN.test(id)) {
      return json(400, { error: 'A valid gift id is required.' });
    }

    try {
      const store = getStore(STORE_NAME);
      const gift = await store.get(id, { type: 'json' });

      if (!gift) return json(404, { error: 'Gift not found.' });

      return json(200, { gift });
    } catch (error) {
      console.error('Gift load failed:', error);
      return json(500, {
        error: 'Could not load gift. Check Netlify function logs.',
      });
    }
  }

  let bodyText;

  try {
    bodyText = await request.text();
  } catch {
    return json(400, { error: 'Could not read gift data.' });
  }

  if (!bodyText) {
    return json(400, { error: 'Gift data is required.' });
  }

  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
    return json(413, {
      error: 'Gift is too large. Use smaller photo or audio files.',
    });
  }

  let gift;

  try {
    gift = JSON.parse(bodyText);
  } catch {
    return json(400, { error: 'Invalid JSON data.' });
  }

  const validationError = validateGift(gift);

  if (validationError) {
    return json(400, { error: validationError });
  }

  const id = crypto.randomUUID().replaceAll('-', '');

  try {
    const store = getStore(STORE_NAME);
    await store.setJSON(id, gift);

    return json(201, { id });
  } catch (error) {
    console.error('Gift save failed:', error);
    return json(500, {
      error: 'Could not save gift. Check Netlify function logs.',
    });
  }
}

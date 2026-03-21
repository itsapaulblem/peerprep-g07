import Redis from 'ioredis';
import { handleMatchEvent } from '../controllers/matchingController';

export function startMatchSubscriber() {
  const sub = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });

  sub.subscribe('match.events', (err) => {
    if (err) console.error('[Subscriber] Failed to subscribe to match.events:', err);
    else console.log('[Subscriber] Subscribed to match.events');
  });

  sub.on('message', (channel, message) => {
    handleMatchEvent(channel, message).catch((error) => {
      console.error('[Subscriber] Failed to handle match event:', error);
    });
  });
}

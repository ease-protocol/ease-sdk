import { logger } from '../utils/logger';
import { TransportErrorCtx, TransportObserver, TransportRequestCtx, TransportResponseCtx } from '../utils/type';

// core/telemetry.ts
const observers: TransportObserver[] = [];

export function addTransportObserver(o: TransportObserver) {
  logger.debug('Adding transport observer');
  observers.push(o);
  return () => {
    logger.debug('Removing transport observer');
    const i = observers.indexOf(o);
    if (i >= 0) observers.splice(i, 1);
  };
}

export const _notify = {
  request: (ctx: TransportRequestCtx) => observers.forEach((o) => o.onRequest?.(ctx)),
  response: (ctx: TransportResponseCtx) => observers.forEach((o) => o.onResponse?.(ctx)),
  error: (ctx: TransportErrorCtx) => observers.forEach((o) => o.onError?.(ctx)),
};

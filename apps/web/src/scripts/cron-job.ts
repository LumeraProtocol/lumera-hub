import cron from 'node-cron';

import { syncBlock } from './sync-block';
import { syncTracking } from './sync-tracking';

// sync block
cron.schedule('*/2 * * * *', () => {
  syncBlock();
});

// sync tracking
cron.schedule('*/5 * * * *', () => {
  syncTracking();
});

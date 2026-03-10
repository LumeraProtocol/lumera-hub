import SnagSolutions from '@snagsolutions/sdk';

const client = new SnagSolutions({
  apiKey: process.env.SNAG_API_KEY!,
  baseURL: process.env.SNAG_BASE_URL!,
});

export default client;

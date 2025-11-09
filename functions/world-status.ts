/**
 * World Status - Poll async world building job status
 */

import { Handler } from '@netlify/functions';
import { getUserFromRequest } from './auth-helpers';
import { getUserKV } from './storage';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify auth
    const user = await getUserFromRequest(event);
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Get jobId from query params
    const jobId = event.queryStringParameters?.jobId;
    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing jobId parameter' })
      };
    }

    // Fetch job status from KV
    const jobStatus = await getUserKV(`job:${jobId}`);

    if (!jobStatus) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Job not found' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobStatus)
    };

  } catch (error) {
    console.error('World status error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch job status' })
    };
  }
};

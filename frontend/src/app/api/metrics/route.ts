import { NextRequest } from 'next/server';
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export async function GET() {
  return new Response(await register.metrics(), {
    headers: { 'Content-Type': register.contentType },
  });
}
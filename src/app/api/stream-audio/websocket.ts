
import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as WebSocketServer } from 'ws';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export const config = {
  api: {
    bodyParser: false,
  },
};

// This is a minimal WebSocket proxy for Deepgram. For production, use a custom server.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // @ts-ignore
  if (res.socket.server.wss) {
    res.end();
    return;
  }

  // @ts-ignore
  const wss = new WebSocketServer({ server: res.socket.server });
  // @ts-ignore
  res.socket.server.wss = wss;

  wss.on('connection', (clientWs: any) => {
    let deepgramWs: any = null;
    clientWs.on('message', (msg: any) => {
      if (typeof msg === 'string' && msg === 'end') {
        deepgramWs?.close();
        clientWs.close();
        return;
      }
      if (!deepgramWs) {
        // Use the ws package for Deepgram connection
        const WebSocket = require('ws');
        deepgramWs = new WebSocket(
          `wss://api.deepgram.com/v1/listen?model=general&punctuate=true&utterances=true`,
          {
            headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
          }
        );
        deepgramWs.on('message', (data: any) => {
          clientWs.send(data);
        });
        deepgramWs.on('close', () => clientWs.close());
      }
      if (deepgramWs.readyState === 1) {
        deepgramWs.send(msg);
      }
    });
    clientWs.on('close', () => {
      deepgramWs?.close();
    });
  });
  res.end();
}

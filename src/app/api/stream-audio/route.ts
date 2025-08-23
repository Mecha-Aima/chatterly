
// This route is not implemented. Use /api/stream-audio/websocket for Deepgram streaming.
export default function handler(req: any, res: any) {
  res.status(501).json({ error: 'Not implemented. Use /api/stream-audio/websocket for Deepgram streaming.' });
}

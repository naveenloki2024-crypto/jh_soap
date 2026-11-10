// Vercel serverless entry point for the JH Soaps API.
//
// Vercel routes /api/* requests to this function (see vercel.json). The existing
// Express app already mounts every route under /api, so it is exported directly
// as the request handler instead of starting a listener. Local development keeps
// using server/index.js, which calls app.listen().
import app from '../server/app.js';

export default app;

// Routes to the right entry point based on SERVICE_ROLE so the same
// codebase can run as either the API server or the BullMQ worker on Railway.
if (process.env.SERVICE_ROLE === 'worker') {
  await import('./workers/greetingWorker.js');
} else {
  await import('./server.js');
}

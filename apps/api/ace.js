/*
|--------------------------------------------------------------------------
| JavaScript entrypoint for running ace commands
|--------------------------------------------------------------------------
*/
process.env.NODE_ENV = process.env.NODE_ENV || 'development'
await import('./bin/console.ts')
import { createWebBackendApp } from './app/web-backend-app';

export default createWebBackendApp({
    allowPrivateNetworkTargets:
        process.env['IPTVNATOR_PROXY_ALLOW_PRIVATE_NETWORKS'] === '1' ||
        process.env['IPTVNATOR_PROXY_ALLOW_PRIVATE_NETWORKS'] === 'true',
    runtimeBackendUrl: process.env['BACKEND_URL'] ?? '',
    clientOrigins: process.env['CLIENT_URL']
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
});

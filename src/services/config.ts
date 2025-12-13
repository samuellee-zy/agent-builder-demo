/**
 * @file src/services/config.ts
 * @description Global application configuration constants.
 * 
 * Note: Authentication logic (API Keys) has been moved to the backend proxy
 * (`server/index.js`) to support Application Default Credentials (ADC) and
 * enhance security by not exposing keys to the client.
 */

// Config Service

export const getAppVersion = () => '1.0.0';

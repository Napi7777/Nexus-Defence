/**
 * Supabase data layer. Grouped by domain — import from '@/lib/supabase' and let
 * this barrel resolve the module, or reach into a file directly when you only
 * need one area.
 */
export * from './auth';
export * from './client';
export * from './communities';
export * from './gamification';
export * from './meetups';
export * from './members';
export * from './messaging';
export * from './moderation';
export * from './notifications';
export * from './posts';
export * from './profiles';
export * from './progress';
export * from './push';
export * from './ratings';
export * from './sessions';

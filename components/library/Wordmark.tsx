// Re-export shim — the canonical implementation lives in
// `components/brand/Wordmark.tsx`. Existing screens can keep importing from
// `@/components/library/Wordmark` until subagents 2/3 migrate the paths.
export { Wordmark } from '@/components/brand/Wordmark';

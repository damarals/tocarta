// Re-export shim — the canonical implementation lives in
// `components/brand/BrandMark.tsx`. Existing screens can keep importing from
// `@/components/library/BrandMark` until subagents 2/3 migrate the paths.
export { BrandMark } from '@/components/brand/BrandMark';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type WordmarkProps = {
  className?: string;
};

export function Wordmark({ className }: WordmarkProps) {
  return (
    <Text className={cn('font-display text-navy900 text-3xl lowercase', className)}>
      tocarta
    </Text>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

export const MIN_VALID_YEAR = 1900;
export const MAX_VALID_YEAR = new Date().getFullYear();

type YearEditorProps = {
  initialYear: number;
  onCommit: (year: number) => Promise<void>;
};

export function YearEditor({ initialYear, onCommit }: YearEditorProps): React.ReactElement {
  const [text, setText] = useState(String(initialYear));
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  const tryCommit = async (): Promise<void> => {
    const trimmed = text.trim();
    const parsed = Number.parseInt(trimmed, 10);
    if (
      !/^\d{4}$/.test(trimmed) ||
      Number.isNaN(parsed) ||
      parsed < MIN_VALID_YEAR ||
      parsed > MAX_VALID_YEAR
    ) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setBusy(true);
    try {
      await onCommit(parsed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-row items-center gap-2">
      <TextInput
        value={text}
        onChangeText={(next) => {
          setText(next.replace(/\D/g, '').slice(0, 4));
          if (invalid) setInvalid(false);
        }}
        onSubmitEditing={() => {
          void tryCommit();
        }}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={4}
        autoFocus
        editable={!busy}
        selectTextOnFocus
        accessibilityLabel="Year"
        placeholder="YYYY"
        placeholderTextColor="rgb(168 179 199 / 0.5)"
        style={{
          color: tokens.colors.navy50,
          fontFamily: 'Fraunces_900Black',
          fontSize: 18,
          textAlign: 'center',
          width: 64,
          paddingVertical: 6,
          paddingHorizontal: 8,
        }}
        className={cn(
          'rounded-xl border-[1.5px] bg-navy900',
          invalid ? 'border-red' : 'border-lime',
        )}
      />
      <Pressable
        onPress={() => {
          void tryCommit();
        }}
        disabled={busy}
        role="button"
        accessibilityLabel="Save year"
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-xl bg-lime active:opacity-90"
        style={{
          shadowColor: tokens.colors.limeD,
          shadowOpacity: 1,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Ionicons name="checkmark" size={16} color={tokens.colors.navy900} />
      </Pressable>
    </View>
  );
}

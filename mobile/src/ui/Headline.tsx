import type { TextStyle } from 'react-native';

import type { ColorName, TypeName } from '@/theme/tokens';

import { Text } from './Text';

export type HeadlinePart = string | { em: string };

export type HeadlineProps = {
  /** e.g. ["Who do you need ", { em: "for service?" }] */
  parts: HeadlinePart[];
  variant?: TypeName;
  color?: ColorName;
  center?: boolean;
  style?: TextStyle;
};

/** Hero headline: serif with one italic phrase. Default variant 'display'. */
export function Headline({ parts, variant = 'display', color, center, style }: HeadlineProps) {
  return (
    <Text variant={variant} color={color} center={center} style={style} accessibilityRole="header">
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          p
        ) : (
          <Text key={i} variant={variant} color={color} italic>
            {p.em}
          </Text>
        ),
      )}
    </Text>
  );
}

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

interface LogoMarkProps {
  size?: number;
  style?: ViewStyle;
}

// Круглый значок с "c" — отсылка к логотипу
export const LogoMark: React.FC<LogoMarkProps> = ({ size = 48, style }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      },
      style,
    ]}
  >
    <Text
      style={{
        fontFamily: fonts.serif,
        fontSize: size * 0.52,
        color: '#ffffff',
        lineHeight: size * 0.56,
        includeFontPadding: false,
      }}
    >
      c
    </Text>
  </View>
);

interface BrandRowProps {
  size?: number;
  showTagline?: boolean;
}

export const BrandRow: React.FC<BrandRowProps> = ({ size = 40, showTagline = false }) => (
  <View style={styles.brandRow}>
    <LogoMark size={size} />
    <View style={{ marginLeft: 12 }}>
      <Text style={[styles.brandText, { fontSize: size * 0.56 }]}>
        click
      </Text>
      {showTagline ? (
        <Text style={styles.tagline}>сервис доставки · Махачкала</Text>
      ) : null}
    </View>
  </View>
);

export const Logo: React.FC<LogoMarkProps> = ({ size = 96, style }) => (
  <LogoMark size={size} style={style} />
);

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontFamily: fonts.serif,
    color: colors.primary,
    letterSpacing: -0.5,
    lineHeight: undefined,
  },
  tagline: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
});

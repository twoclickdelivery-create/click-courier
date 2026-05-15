import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusPill } from './StatusPill';
import { colors } from '../../theme/colors';
import { fonts, spacing } from '../../theme/typography';

interface Props {
  courierName: string;
  courierCode: string;
  isOnline: boolean;
  onToggleShift?: () => void;
  onMenu?: () => void;
}

export const CourierHeader: React.FC<Props> = ({
  courierName,
  courierCode,
  isOnline,
  onToggleShift,
  onMenu,
}) => (
  <View style={styles.wrap}>
    {/* brand row */}
    <View style={styles.topRow}>
      <View>
        <Text style={styles.brand}>
          <Text style={styles.brandBold}>Click</Text>
          <Text style={styles.brandDot}> · </Text>
          <Text style={styles.brandTagline}>в одно касание</Text>
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      {onMenu ? (
        <Pressable onPress={onMenu} style={styles.menuBtn} hitSlop={10}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={[styles.menuLine, { width: '50%' }]} />
        </Pressable>
      ) : null}
    </View>

    {/* greeting + shift toggle */}
    <View style={styles.subRow}>
      <View>
        <Text style={styles.greeting}>
          Привет, {courierName.split(' ')[0]} 👋
        </Text>
        <Text style={styles.subId}>ID · {courierCode}</Text>
      </View>
      <StatusPill isOnline={isOnline} onPress={onToggleShift} dark />
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: 36,
    backgroundColor: colors.bgDark,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brand: {},
  brandBold: {
    fontFamily: fonts.sansBold ?? fonts.sans,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  brandDot: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '300',
  },
  brandTagline: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '300',
  },
  menuBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  menuLine: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    width: '75%',
    borderRadius: 1,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  greeting: {
    fontFamily: fonts.sansBold ?? fonts.sans,
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subId: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 4,
  },
});

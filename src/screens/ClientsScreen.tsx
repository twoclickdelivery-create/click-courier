import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts, radii, spacing } from '../theme/typography';
import { useOrdersStore } from '../store/ordersStore';
import { useClientsStore } from '../store/clientsStore';
import { ClientProfile, ClientTag } from '../types';
import type { NavigationProp } from '@react-navigation/native';

interface Props {
  navigation: NavigationProp<any>;
}

type Filter = 'all' | 'vip' | 'frequent' | 'new' | 'returning' | 'lost';
type SortKey = 'orders' | 'spent' | 'recent';

const FILTER_LABELS: Record<Filter, string> = {
  all:       'Все',
  vip:       '⭐ VIP',
  frequent:  '🔥 Частые',
  new:       '🆕 Новые',
  returning: '↩ Вернулись',
  lost:      '💔 Потерянные',
};

const TAG_LABELS: Record<ClientTag, string> = {
  vip:       'VIP',
  frequent:  'Частый',
  new:       'Новый',
  returning: 'Вернулся',
  lost:      'Потерян',
};

const TAG_COLORS: Record<ClientTag, { bg: string; text: string }> = {
  vip:       { bg: colors.amberFaint,                text: colors.amber },
  frequent:  { bg: colors.primaryFaint,              text: colors.primary },
  new:       { bg: colors.greenFaint,                text: colors.green },
  returning: { bg: colors.blueFaint,                 text: colors.blue },
  lost:      { bg: 'rgba(148,163,184,0.12)',          text: '#64748B' },
};

const AVATAR_COLORS = [
  '#6E1222', '#2563EB', '#16A34A', '#D97706',
  '#7C3AED', '#0891B2', '#C03030', '#4B5563',
];

function avatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  const hour = Math.floor(diff / 3_600_000);
  const day = Math.floor(diff / 86_400_000);
  if (min < 60) return min < 2 ? 'только что' : `${min} мин назад`;
  if (hour < 24) return `${hour} ч назад`;
  if (day === 1) return 'вчера';
  if (day < 7) return `${day} дн назад`;
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export const ClientsScreen: React.FC<Props> = ({ navigation }) => {
  const orders = useOrdersStore((s) => s.orders);
  const { clients, stats, buildFromOrders } = useClientsStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort]     = useState<SortKey>('orders');

  // Rebuild client profiles whenever orders change
  useEffect(() => {
    buildFromOrders(orders);
  }, [orders, buildFromOrders]);

  const filtered = useMemo(() => {
    let list = [...clients];

    // Tag filter
    if (filter !== 'all') {
      list = list.filter((c) => c.tags.includes(filter as ClientTag));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.addresses.some((a) => a.address.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sort === 'orders') return b.totalOrders - a.totalOrders;
      if (sort === 'spent')  return b.totalSpent - a.totalSpent;
      return b.lastOrderAt - a.lastOrderAt; // recent
    });

    return list;
  }, [clients, filter, search, sort]);

  // Group by tag section for 'all' view
  const vipClients      = filtered.filter((c) => c.tags.includes('vip'));
  const frequentClients = filtered.filter((c) => !c.tags.includes('vip') && c.tags.includes('frequent') && !c.tags.includes('lost'));
  const lostClients     = filtered.filter((c) => c.tags.includes('lost'));
  const otherClients    = filtered.filter((c) => !c.tags.includes('vip') && !c.tags.includes('frequent') && !c.tags.includes('lost'));

  const showGrouped = filter === 'all' && !search.trim() && sort === 'orders';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerBrand}>
            Click<Text style={styles.headerBrandLight}>dispatch</Text>
          </Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <StatChip value={String(stats.total)} label="Клиентов" />
          <View style={styles.statsDivider} />
          <StatChip value={String(stats.totalOrders)} label="Всего заказов" />
          <View style={styles.statsDivider} />
          <StatChip
            value={`${Math.round(stats.repeatRate * 100)}%`}
            label="Повторных"
            accent="#4ADE80"
          />
        </View>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Имя, телефон, адрес…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
        style={styles.chipsScroll}
      >
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </Pressable>
        ))}
        <View style={styles.chipsDivider} />
        {(['orders', 'spent', 'recent'] as SortKey[]).map((s) => (
          <Pressable
            key={s}
            style={[styles.chip, sort === s && styles.chipSort]}
            onPress={() => setSort(s)}
          >
            <Text style={[styles.chipText, sort === s && styles.chipSortText]}>
              {s === 'orders' ? '↓ Заказы' : s === 'spent' ? '↓ Сумма' : '↓ Дата'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── List ── */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>Клиентов не найдено</Text>
            <Text style={styles.emptyCaption}>Попробуйте другой запрос или фильтр</Text>
          </View>
        ) : showGrouped ? (
          <>
            {vipClients.length > 0 && (
              <>
                <SectionHeader emoji="⭐" label="VIP" count={vipClients.length} color={colors.amber} />
                {vipClients.map((c) => (
                  <ClientRow key={c.phone} client={c} onPress={() =>
                    navigation.navigate('ClientDetail', { phone: c.phone })
                  } />
                ))}
              </>
            )}
            {frequentClients.length > 0 && (
              <>
                <SectionHeader emoji="🔥" label="Частые" count={frequentClients.length} color={colors.primary} />
                {frequentClients.map((c) => (
                  <ClientRow key={c.phone} client={c} onPress={() =>
                    navigation.navigate('ClientDetail', { phone: c.phone })
                  } />
                ))}
              </>
            )}
            {otherClients.length > 0 && (
              <>
                <SectionHeader emoji="👤" label="Остальные" count={otherClients.length} color={colors.textMuted} />
                {otherClients.map((c) => (
                  <ClientRow key={c.phone} client={c} onPress={() =>
                    navigation.navigate('ClientDetail', { phone: c.phone })
                  } />
                ))}
              </>
            )}
            {lostClients.length > 0 && (
              <>
                <SectionHeader emoji="💔" label="Потерянные" count={lostClients.length} color="#64748B" />
                {lostClients.map((c) => (
                  <ClientRow key={c.phone} client={c} onPress={() =>
                    navigation.navigate('ClientDetail', { phone: c.phone })
                  } />
                ))}
              </>
            )}
          </>
        ) : (
          filtered.map((c) => (
            <ClientRow key={c.phone} client={c} onPress={() =>
              navigation.navigate('ClientDetail', { phone: c.phone })
            } />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ── Sub-components ────────────────────────────────────────────────────────── */

const StatChip: React.FC<{ value: string; label: string; accent?: string }> = ({
  value, label, accent,
}) => (
  <View style={styles.statChip}>
    <Text style={[styles.statChipValue, accent ? { color: accent } : null]}>{value}</Text>
    <Text style={styles.statChipLabel}>{label}</Text>
  </View>
);

const SectionHeader: React.FC<{
  emoji: string; label: string; count: number; color: string;
}> = ({ emoji, label, count, color }) => (
  <View style={styles.sectionHdr}>
    <Text style={[styles.sectionHdrText, { color }]}>{emoji} {label.toUpperCase()}</Text>
    <View style={styles.sectionHdrLine} />
    <Text style={styles.sectionHdrCount}>{count}</Text>
  </View>
);

const ClientRow: React.FC<{ client: ClientProfile; onPress: () => void }> = React.memo(
  ({ client, onPress }) => {
    const initial = client.name.charAt(0).toUpperCase();
    const bgColor = avatarColor(client.name);

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
        onPress={onPress}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: bgColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
          {client.tags.includes('vip') && (
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>⭐</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={styles.rowBody}>
          <Text style={styles.rowName} numberOfLines={1}>{client.name}</Text>
          <Text style={styles.rowPhone}>{client.phone}</Text>
          {client.tags.length > 0 && (
            <View style={styles.rowTags}>
              {client.tags.slice(0, 2).map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: TAG_COLORS[tag].bg }]}
                >
                  <Text style={[styles.tagText, { color: TAG_COLORS[tag].text }]}>
                    {TAG_LABELS[tag]}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Right */}
        <View style={styles.rowRight}>
          <Text style={styles.rowOrders}>{client.totalOrders}</Text>
          <Text style={styles.rowOrdersLabel}>заказов</Text>
          <Text style={styles.rowDate}>{relativeDate(client.lastOrderAt)}</Text>
        </View>
      </Pressable>
    );
  }
);

/* ── Styles ── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDark },

  header: {
    backgroundColor: colors.bgDark,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerBrand: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerBrandLight: {
    fontFamily: fonts.sans,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.60)',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80',
  },
  liveText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  statChip: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statChipValue: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statChipLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
  statsDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg3,
    borderRadius: radii.lg,
    margin: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 14, opacity: 0.5 },
  searchInput: {
    flex: 1,
    height: 44,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.text,
  },
  searchClear: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },

  chipsScroll: { flexGrow: 0 },
  chipsContent: {
    paddingHorizontal: spacing.md,
    gap: 6,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.bg3,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
  },
  chipSort: {
    backgroundColor: colors.bg4,
    borderColor: colors.border2,
  },
  chipText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: { color: colors.primary },
  chipSortText: { color: colors.text },
  chipsDivider: { width: 1, backgroundColor: colors.border2, marginHorizontal: 2 },

  list: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingTop: spacing.sm },

  sectionHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 8,
  },
  sectionHdrText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  sectionHdrLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  sectionHdrCount: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    marginHorizontal: spacing.md,
    marginBottom: 6,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  avatarText: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: { fontSize: 9 },

  rowBody: { flex: 1, minWidth: 0 },
  rowName: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  rowPhone: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  rowTags: { flexDirection: 'row', gap: 4, marginTop: 5, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    fontWeight: '600',
  },

  rowRight: { alignItems: 'flex-end', flexShrink: 0 },
  rowOrders: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  rowOrdersLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },
  rowDate: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyCaption: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

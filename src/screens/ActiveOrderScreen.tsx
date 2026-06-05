import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from '../utils/imagePicker';
import * as Haptics from '../utils/haptics';
import { Button } from '../components/Button';
import { OrderMap } from '../components/OrderMap';
import { TimeBlock } from '../components/courier/TimeBlock';
import { StepFlow } from '../components/courier/StepFlow';
import { GeoStrip } from '../components/courier/GeoStrip';
import { colors } from '../theme/colors';
import { fonts, radii, spacing, typography } from '../theme/typography';
import { useOrdersStore } from '../store/ordersStore';
import { useLocationStore } from '../store/locationStore';
import {
  getNavAppLabel,
  loadPreferredNavApp,
  NavApp,
  openRoute,
} from '../utils/navigationApps';
import { CancelReason, OrderStatus } from '../types';
import type { NavigationProp, RouteProp } from '@react-navigation/native';

interface Props {
  navigation: NavigationProp<any>;
  route: RouteProp<{ ActiveOrder: { orderId: string } }, 'ActiveOrder'>;
}

const titleByStatus: Partial<Record<OrderStatus, string>> = {
  going_to_restaurant: 'Едем в ресторан',
  at_restaurant: 'Забираем заказ',
  picked_up: 'Везём клиенту',
  going_to_client: 'Везём клиенту',
  at_client: 'Доставка клиенту',
};

const buttonByStatus: Partial<Record<OrderStatus, string>> = {
  going_to_restaurant: 'Я НА МЕСТЕ',
  at_restaurant: 'ЗАБРАЛ ЗАКАЗ',
  picked_up: 'Я НА МЕСТЕ',
  going_to_client: 'Я НА МЕСТЕ',
  at_client: 'ПЕРЕДАЛ КЛИЕНТУ',
};

const stageIndex = (s: OrderStatus): number => {
  switch (s) {
    case 'accepted':
    case 'going_to_restaurant':
      return 0;
    case 'at_restaurant':
    case 'picked_up':
      return 1;
    case 'going_to_client':
    case 'at_client':
      return 2;
    case 'delivered':
      return 3;
    default:
      return 0;
  }
};

const fmtTime = (ts?: number) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export const ActiveOrderScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderId } = route.params;
  const order = useOrdersStore((s) => s.getOrderById(orderId));
  const setStatus = useOrdersStore((s) => s.setOrderStatus);
  const completeOrder = useOrdersStore((s) => s.completeOrder);
  const attachPhoto = useOrdersStore((s) => s.attachProofPhoto);
  const cancelOrder = useOrdersStore((s) => s.cancelOrder);
  const rateOrder = useOrdersStore((s) => s.rateOrder);
  const courierLocation = useLocationStore((s) => s.current);

  const [photoUri, setPhotoUri] = useState<string | undefined>(order?.proofPhotoUri);
  const [showRating, setShowRating] = useState(false);
  const [clientRating, setClientRating] = useState(5);
  const [preferredNav, setPreferredNav] = useState<NavApp | null>(null);

  useEffect(() => {
    setPhotoUri(order?.proofPhotoUri);
  }, [order?.proofPhotoUri]);

  useEffect(() => {
    let alive = true;
    loadPreferredNavApp().then((v) => {
      if (alive) setPreferredNav(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  const stage: 'to_restaurant' | 'to_client' = useMemo(() => {
    if (!order) return 'to_restaurant';
    return order.status === 'going_to_restaurant' || order.status === 'at_restaurant'
      ? 'to_restaurant'
      : 'to_client';
  }, [order?.status]);

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={typography.displayLg}>Заказ не найден</Text>
          <Button
            label="Назад"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.base }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const targetPhone = stage === 'to_restaurant' ? order.restaurant.phone : order.client.phone;
  const acceptedAt = order.acceptedAt ?? order.createdAt;
  const dueTs = acceptedAt + order.estimatedTimeMin * 60_000;
  const arrivedTs =
    stage === 'to_restaurant' && (order.status === 'at_restaurant' || order.pickedUpAt)
      ? order.pickedUpAt
      : stage === 'to_client' && order.status === 'at_client'
        ? Date.now()
        : undefined;
  const diffMinutes = arrivedTs
    ? Math.round((arrivedTs - dueTs) / 60_000)
    : undefined;

  const currentIdx = stageIndex(order.status);

  // --- Navigation coords ---
  const navCoords =
    stage === 'to_restaurant' ? order.restaurant.coordinates : order.client.coordinates;

  // --- Nav helpers ---
  // Одна кнопка «Маршрут»: при первом нажатии — выбор приложения с запоминанием,
  // потом сразу открывает выбранное. Долгое нажатие — сменить приложение.
  const openNavRoute = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    await openRoute(navCoords.latitude, navCoords.longitude);
    // Подтянуть актуальное предпочтение, чтобы подпись на кнопке обновилась
    const fresh = await loadPreferredNavApp();
    setPreferredNav(fresh);
  };

  const openNavRoutePicker = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    await openRoute(navCoords.latitude, navCoords.longitude, { forcePick: true });
    const fresh = await loadPreferredNavApp();
    setPreferredNav(fresh);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${targetPhone.replace(/\s/g, '')}`).catch(() =>
      Alert.alert('Не удалось открыть номер')
    );
  };

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Нужен доступ к камере', 'Разрешите доступ в настройках');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: false,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      attachPhoto(order.id, uri);
    }
  };

  const showRatingModal = () => {
    const navigate = () => navigation.navigate('Tabs', { screen: 'OrdersTab' });
    Alert.alert(
      'Оцените доставку',
      'Имитация оценки клиента',
      [
        { text: '⭐', onPress: () => { rateOrder(order.id, 1); navigate(); } },
        { text: '⭐⭐⭐', onPress: () => { rateOrder(order.id, 3); navigate(); } },
        { text: '⭐⭐⭐⭐⭐', onPress: () => { rateOrder(order.id, 5); navigate(); } },
      ]
    );
  };

  // ── Отмена разрешена ТОЛЬКО до получения еды из ресторана ──────────────────
  const CANCELLABLE_STATUSES: OrderStatus[] = ['going_to_restaurant', 'at_restaurant'];
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  const handleCancel = () => {
    if (!canCancel) {
      // Курьер уже взял еду — отмена заблокирована
      Alert.alert(
        '🔒 Отмена невозможна',
        'Вы уже забрали заказ из ресторана. Завершите доставку клиенту — это обязательный этап.',
        [{ text: 'Понятно', style: 'default' }]
      );
      return;
    }

    Alert.alert('Причина отмены', 'Вы ещё не забрали еду — отмена разрешена', [
      {
        text: 'Клиент не отвечает',
        onPress: () => {
          cancelOrder(order.id, 'client_not_answering' as CancelReason);
          navigation.navigate('Tabs', { screen: 'OrdersTab' });
        },
      },
      {
        text: 'Ресторан закрыт',
        onPress: () => {
          cancelOrder(order.id, 'restaurant_closed' as CancelReason);
          navigation.navigate('Tabs', { screen: 'OrdersTab' });
        },
      },
      {
        text: 'Другая причина',
        onPress: () => {
          cancelOrder(order.id, 'other' as CancelReason);
          navigation.navigate('Tabs', { screen: 'OrdersTab' });
        },
      },
      { text: 'Назад', style: 'cancel' },
    ]);
  };

  const handlePrimary = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    switch (order.status) {
      case 'going_to_restaurant':
        setStatus(order.id, 'at_restaurant');
        break;
      case 'at_restaurant':
        setStatus(order.id, 'going_to_client');
        break;
      case 'going_to_client':
      case 'picked_up':
        setStatus(order.id, 'at_client');
        break;
      case 'at_client':
        if (!photoUri) {
          Alert.alert('Нужно фото', 'Сфотографируйте подтверждение доставки');
          return;
        }
        completeOrder(order.id);
        showRatingModal();
        break;
      default:
        // Неожиданный статус — не делаем ничего, предотвращаем silent failure
        Alert.alert('Ошибка', `Неожиданный статус заказа: ${order.status}`);
        return;
    }
  };

  // --- Payment breakdown ---
  const distBonus = Math.round(order.distanceKm * 15);
  const timeBonus = 20;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.mapWrap}>
        <OrderMap
          courier={courierLocation}
          restaurant={order.restaurant.coordinates}
          client={order.client.coordinates}
          restaurantTitle={order.restaurant.name}
          restaurantSubtitle={order.restaurant.address}
          clientSubtitle={order.client.address}
        />

        {/* ← возвращает на список заказов, не закрывает заказ */}
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.navigate('Tabs', { screen: 'OrdersTab' })}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View style={styles.mapBadge}>
          <Text style={styles.mapBadgeLabel}>МАРШРУТ</Text>
          <Text style={styles.mapBadgeValue}>{order.distanceKm} км</Text>
        </View>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.orderLabel}>ЗАКАЗ</Text>
            <Text style={styles.orderNumber}>{order.number}</Text>
          </View>
          <View style={styles.stageBadge}>
            <View style={styles.stageBadgeDot} />
            <Text style={styles.stageBadgeText}>
              {titleByStatus[order.status] ?? '—'}
            </Text>
          </View>
        </View>

        <TimeBlock
          ready={fmtTime(acceptedAt)}
          due={fmtTime(dueTs)}
          arrived={arrivedTs ? fmtTime(arrivedTs) : undefined}
          diffMinutes={diffMinutes}
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {stage === 'to_restaurant' ? '🍽 РЕСТОРАН' : '📍 КЛИЕНТ'}
          </Text>
          <Text style={styles.sectionPrimary}>
            {stage === 'to_restaurant' ? order.restaurant.name : order.client.name}
          </Text>
          <Text style={styles.sectionSecondary}>
            {stage === 'to_restaurant'
              ? order.restaurant.address
              : `${order.client.address}${order.client.apartment ? ', ' + order.client.apartment : ''}`}
          </Text>

          <Pressable style={styles.callRow} onPress={handleCall}>
            <Text style={styles.callIcon}>📞</Text>
            <Text style={styles.callText}>{targetPhone}</Text>
            <Text style={styles.callBtn}>ПОЗВОНИТЬ</Text>
          </Pressable>

          <Pressable
            style={styles.routeBtn}
            onPress={openNavRoute}
            onLongPress={openNavRoutePicker}
            delayLongPress={400}
          >
            <Text style={styles.routeBtnIcon}>🧭</Text>
            <View style={styles.routeBtnTextWrap}>
              <Text style={styles.routeBtnText}>ПОСТРОИТЬ МАРШРУТ</Text>
              <Text style={styles.routeBtnHint}>
                {preferredNav
                  ? `в ${getNavAppLabel(preferredNav)} · удерж. для смены`
                  : 'выбор приложения при первом нажатии'}
              </Text>
            </View>
            <Text style={styles.routeBtnArrow}>›</Text>
          </Pressable>

          {stage === 'to_client' && order.client.comment ? (
            <View style={styles.commentBox}>
              <Text style={styles.commentLabel}>💬 КОММЕНТАРИЙ КЛИЕНТА</Text>
              <Text style={styles.commentText}>«{order.client.comment}»</Text>
            </View>
          ) : null}
        </View>

        {stage === 'to_restaurant' ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>СОСТАВ ЗАКАЗА</Text>
            {order.items.map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <Text style={styles.itemName}>{it.name}</Text>
                <Text style={styles.itemQty}>×{it.quantity}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ЭТАПЫ ДОСТАВКИ</Text>
          <View style={{ marginTop: spacing.sm }}>
            <StepFlow
              current={currentIdx}
              steps={[
                {
                  label: 'Едем в ресторан',
                  caption: order.restaurant.name,
                },
                {
                  label: 'Забираем и везём',
                  caption: `Готовность ~${order.estimatedTimeMin} мин`,
                },
                {
                  label: 'Доставка клиенту',
                  caption: order.client.address,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.sectionLabel}>ОПЛАТА КУРЬЕРУ</Text>
            <Text style={styles.metaValueGreen}>{order.payment} ₽</Text>
            <Text style={styles.paymentBreakdown}>
              базовая: 80₽ + {distBonus}₽/км
              {order.status !== 'at_client' ? ` + бонус: ${timeBonus}₽` : ''}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.sectionLabel}>ЧЕК</Text>
            <Text style={styles.metaValue}>{order.total} ₽</Text>
          </View>
        </View>

        {order.status === 'at_client' ? (
          <View style={styles.proofBox}>
            <Text style={styles.sectionLabel}>ФОТО ПОДТВЕРЖДЕНИЯ</Text>
            {photoUri ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photoUri }} style={styles.photo} />
                <Button
                  label="Перефотографировать"
                  variant="ghost"
                  onPress={handlePickPhoto}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            ) : (
              <Button
                label="📷 СФОТОГРАФИРОВАТЬ"
                variant="secondary"
                onPress={handlePickPhoto}
                style={{ marginTop: spacing.sm }}
              />
            )}
          </View>
        ) : null}

        <GeoStrip active={!!courierLocation} accuracy={undefined} />

        <Button
          label={buttonByStatus[order.status] ?? 'ГОТОВО'}
          onPress={handlePrimary}
          variant={order.status === 'at_client' ? 'success' : 'primary'}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />

        {/* Кнопка отмены — только до получения еды */}
        {canCancel ? (
          <Button
            label="Отменить заказ"
            onPress={handleCancel}
            variant="ghost"
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        ) : order.status !== 'delivered' ? (
          <View style={styles.lockNotice}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockText}>
              Отмена недоступна — еда уже у вас. Завершите доставку.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const screenH = Dimensions.get('window').height;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapWrap: {
    height: screenH * 0.36,
    backgroundColor: colors.bg2,
  },
  backBtn: {
    position: 'absolute',
    top: spacing.base,
    left: spacing.base,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border2,
  },
  backIcon: { fontSize: 22, color: colors.text },
  mapBadge: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    backgroundColor: colors.bg2,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border2,
    alignItems: 'flex-end',
  },
  mapBadgeLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  mapBadgeValue: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    marginTop: -radii.xl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sheetContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border2,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  orderLabel: {
    ...typography.tinyBold,
    color: colors.textMuted,
  },
  orderNumber: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.4,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaint,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  stageBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  stageBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  section: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 6,
  },
  sectionPrimary: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.text,
    letterSpacing: -0.3,
  },
  sectionSecondary: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  callIcon: { fontSize: 18 },
  callText: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  callBtn: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 1,
  },
  routeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.sm,
  },
  routeBtnIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  routeBtnTextWrap: {
    flex: 1,
  },
  routeBtnText: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: colors.text,
    letterSpacing: 0.6,
  },
  routeBtnHint: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  routeBtnArrow: {
    fontSize: 24,
    color: colors.primary,
    marginLeft: spacing.sm,
    lineHeight: 24,
  },
  commentBox: {
    backgroundColor: colors.amberFaint,
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  commentLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: colors.amber,
    letterSpacing: 1.5,
  },
  commentText: {
    ...typography.body,
    color: colors.text,
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  itemQty: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  metaItem: { flex: 1 },
  metaValue: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  metaValueGreen: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.green,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  paymentBreakdown: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  proofBox: {
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  photoPreview: { marginTop: spacing.sm },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
    backgroundColor: colors.bg3,
  },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  lockIcon: { fontSize: 18 },
  lockText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
});

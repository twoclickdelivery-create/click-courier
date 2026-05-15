import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { useAuthStore } from '../store/authStore';
import { TransportType } from '../types';
import { ClickIllustration } from '../components/courier/ClickIllustration';
import { supabase } from '../lib/supabase';

type Role = 'courier' | 'dispatcher';
type Step = 'phone' | 'code' | 'transport';

const transportOptions: { type: TransportType; label: string; emoji: string; desc: string }[] = [
  { type: 'foot',  label: 'Пешком',    emoji: '🚶', desc: 'Малые расстояния' },
  { type: 'bike',  label: 'Велосипед', emoji: '🚴', desc: 'Быстро по городу' },
  { type: 'car',   label: 'Авто',      emoji: '🚗', desc: 'Любые расстояния' },
];

const STEP_NUMBER: Record<Step, number> = { phone: 1, code: 2, transport: 3 };

const STEP_LABELS: Record<Step, string> = {
  phone:     'Введите номер',
  code:      'Введите SMS-код',
  transport: 'Выберите транспорт',
};

export const LoginScreen: React.FC = () => {
  const [role, setRole]           = useState<Role>('courier');
  const [phone, setPhone]         = useState('');   // только 10 цифр без +7
  const [code, setCode]           = useState('');
  const [step, setStep]           = useState<Step>('phone');
  const [transport, setTransport] = useState<TransportType>('bike');
  const [loading, setLoading]     = useState(false);
  const login = useAuthStore((s) => s.login);

  const totalSteps  = role === 'dispatcher' ? 2 : 3;
  const currentStep = STEP_NUMBER[step];

  // Возвращает номер в формате +7XXXXXXXXXX для Supabase
  const e164 = () => '+7' + phone;

  // ── ШАГ 1: отправить SMS через Supabase ───────────────────────────
  const handleSendCode = async () => {
    if (phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Введите номер телефона целиком');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164() });
    setLoading(false);

    if (error) {
      Alert.alert('Ошибка отправки', error.message);
      return;
    }
    setStep('code');
  };

  // ── ШАГ 2: проверить код из SMS ───────────────────────────────────
  const handleVerifyCode = async () => {
    if (code.length < 6) {
      Alert.alert('Введите код из SMS');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164(),
      token: code,
      type:  'sms',
    });
    setLoading(false);

    if (error || !data.user) {
      Alert.alert('Неверный код', 'Проверьте SMS и попробуйте снова');
      return;
    }

    // Сохраняем роль в профиле
    await supabase.from('profiles').update({ role }).eq('id', data.user.id);

    if (role === 'dispatcher') {
      login(e164(), 'dispatcher');
      return;
    }
    setStep('transport');
  };

  // ── ШАГ 3: выбор транспорта (только курьер) ───────────────────────
  const handleLogin = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Сохраняем транспорт в профиле
      await supabase.from('profiles')
        .update({ transport, role: 'courier' })
        .eq('id', user.id);

      // Загружаем имя из профиля если уже было
      const { data: profile } = await supabase
        .from('profiles').select('name').eq('id', user.id).single();

      login(e164(), 'courier', transport, profile?.name);
    } else {
      login(e164(), 'courier', transport);
    }
    setLoading(false);
  };

  /* ── заголовок меняется по шагу ── */
  const headerContent = {
    phone: { title: 'С возвращением!', sub: 'Войдите, чтобы начать смену' },
    code:  { title: 'Введите код',     sub: `Отправили SMS на ${phone}` },
    transport: { title: 'Ваш транспорт', sub: 'Выберите один раз — можно сменить в настройках' },
  }[step];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      {step === 'phone' ? (
        <View style={styles.heroArea}>
          <ClickIllustration />
          <View style={styles.heroCaption}>
            <Text style={styles.headline}>С возвращением!</Text>
            <Text style={styles.subline}>Войдите, чтобы начать смену</Text>
            <StepDots current={currentStep} total={totalSteps} label={STEP_LABELS[step]} />
          </View>
        </View>
      ) : (
        <View style={styles.topArea}>
          <StepDots current={currentStep} total={totalSteps} label={STEP_LABELS[step]} />
          <Text style={styles.headline}>{headerContent.title}</Text>
          <Text style={styles.subline}>{headerContent.sub}</Text>
        </View>
      )}

      {/* Белый sheet */}
      <KeyboardAvoidingView
        style={styles.sheetOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── ШАГ 1: Телефон ── */}
          {step === 'phone' && (
            <>
              <Text style={styles.fieldLabel}>Вы</Text>
              <View style={styles.roleRow}>
                <RoleTab label="Курьер"    active={role === 'courier'}    onPress={() => setRole('courier')} />
                <RoleTab label="Диспетчер" active={role === 'dispatcher'} onPress={() => setRole('dispatcher')} />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Телефон</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+7</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9XX XXX XX XX"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, (pressed || loading) && { opacity: 0.75 }]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Получить код →</Text>}
              </Pressable>
            </>
          )}

          {/* ── ШАГ 2: SMS-код ── */}
          {step === 'code' && (
            <>
              <Text style={styles.fieldLabel}>Код из SMS</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="· · · · · ·"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                autoFocus
                maxLength={6}
              />
              <Text style={styles.codeHint}>
                Код отправлен на {phone}
              </Text>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, (pressed || loading) && { opacity: 0.75 }]}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Подтвердить →</Text>}
              </Pressable>

              <Pressable
                style={styles.linkBtn}
                onPress={() => { setStep('phone'); setCode(''); }}
              >
                <Text style={styles.linkBtnText}>← Изменить номер</Text>
              </Pressable>
            </>
          )}

          {/* ── ШАГ 3: Выбор транспорта (только для курьера) ── */}
          {step === 'transport' && (
            <>
              <Text style={styles.transportHint}>
                Это нужно один раз — система подберёт подходящие заказы
              </Text>

              <View style={styles.transportList}>
                {transportOptions.map((opt) => (
                  <Pressable
                    key={opt.type}
                    style={[
                      styles.transportCard,
                      transport === opt.type && styles.transportCardActive,
                    ]}
                    onPress={() => setTransport(opt.type)}
                  >
                    <Text style={styles.transportEmoji}>{opt.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.transportLabel,
                        transport === opt.type && { color: colors.primary },
                      ]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.transportDesc}>{opt.desc}</Text>
                    </View>
                    <View style={[
                      styles.transportRadio,
                      transport === opt.type && styles.transportRadioActive,
                    ]}>
                      {transport === opt.type && <View style={styles.transportRadioDot} />}
                    </View>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { marginTop: spacing.xl }, (pressed || loading) && { opacity: 0.75 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Войти в приложение →</Text>}
              </Pressable>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ── StepDots ── */

const StepDots: React.FC<{ current: number; total: number; label: string }> = ({
  current, total, label,
}) => (
  <View style={dotSt.container}>
    <View style={dotSt.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            dotSt.dot,
            i + 1 < current && dotSt.dotDone,
            i + 1 === current && dotSt.dotActive,
          ]}
        />
      ))}
    </View>
    <Text style={dotSt.label}>{label}</Text>
  </View>
);

const dotSt = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotDone: {
    backgroundColor: 'rgba(255,255,255,0.50)',
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.2,
  },
});

/* ── RoleTab ── */

const RoleTab: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label, active, onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.roleTab, active && styles.roleTabActive]}
  >
    <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>{label}</Text>
  </Pressable>
);

/* ── Styles ── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDark },

  /* Hero (phone step) */
  heroArea: {
    backgroundColor: colors.bgDark,
    alignItems: 'center',
  },
  heroCaption: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 40,
    alignItems: 'center',
  },

  /* Compact header (code / transport steps) */
  topArea: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 48,
    backgroundColor: colors.bgDark,
    alignItems: 'center',
  },
  headline: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  subline: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 6,
    textAlign: 'center',
  },

  sheetOuter: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
  },
  sheet: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  fieldLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },

  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleTab: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTabActive: {
    backgroundColor: colors.primaryFaint,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  roleTabText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  roleTabTextActive: {
    fontFamily: fonts.sansSemiBold,
    color: colors.primary,
    fontWeight: '600',
  },

  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  phonePrefix: {
    height: 52,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonePrefixText: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
  },
  input: {
    height: 52,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.base,
    color: colors.text,
    backgroundColor: colors.bg2,
    fontFamily: fonts.mono,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeInput: {
    fontFamily: fonts.monoBold,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
  },
  codeHint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  primaryBtn: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },

  linkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  linkBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textMuted,
  },

  /* transport step */
  transportHint: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  transportList: { gap: spacing.sm },
  transportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: spacing.md,
    minHeight: 64,
  },
  transportCardActive: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
  },
  transportEmoji: { fontSize: 32, width: 40, textAlign: 'center' },
  transportLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  transportDesc: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  transportRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportRadioActive: {
    borderColor: colors.primary,
  },
  transportRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});

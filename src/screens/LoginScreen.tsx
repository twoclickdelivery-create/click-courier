import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
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
type Step = 'phone' | 'code' | 'register' | 'transport';

const transportOptions: { type: TransportType; label: string; emoji: string; desc: string }[] = [
  { type: 'foot',  label: 'Пешком',    emoji: '🚶', desc: 'Малые расстояния' },
  { type: 'bike',  label: 'Велосипед', emoji: '🚴', desc: 'Быстро по городу' },
  { type: 'car',   label: 'Авто',      emoji: '🚗', desc: 'Любые расстояния' },
];

const STEP_NUMBER: Record<Step, number> = { phone: 1, code: 2, register: 3, transport: 4 };

const STEP_LABELS: Record<Step, string> = {
  phone:     'Введите номер',
  code:      'Введите SMS-код',
  register:  'Анкета курьера',
  transport: 'Выберите транспорт',
};

export const LoginScreen: React.FC = () => {
  const [role, setRole]           = useState<Role>('courier');
  const [phone, setPhone]         = useState('');
  const [code, setCode]           = useState('');
  const [step, setStep]           = useState<Step>('phone');
  const [transport, setTransport] = useState<TransportType>('bike');
  const [loading, setLoading]     = useState(false);

  // Регистрация
  const [fullName, setFullName]           = useState('');
  const [inn, setInn]                     = useState('');
  const [selfEmployed, setSelfEmployed]   = useState(false);
  const [ofertaAccepted, setOfertaAccepted] = useState(false);
  const [showOferta, setShowOferta]       = useState(false);
  const [isNewCourier, setIsNewCourier]   = useState(false);

  const login = useAuthStore((s) => s.login);

  const totalSteps  = role === 'dispatcher' ? 2 : isNewCourier ? 4 : 3;
  const currentStep = STEP_NUMBER[step];

  const e164 = () => '+7' + phone;

  const validateInn = (v: string): boolean => {
    if (!/^\d{12}$/.test(v)) return false;
    const d = v.split('').map(Number);
    const n1 = ([7,2,4,10,3,5,9,4,6,8].reduce((s,w,i) => s + w*d[i], 0) % 11) % 10;
    const n2 = ([3,7,2,4,10,3,5,9,4,6,8].reduce((s,w,i) => s + w*d[i], 0) % 11) % 10;
    return n1 === d[10] && n2 === d[11];
  };

  // ── ШАГ 1: отправить SMS через Supabase ───────────────────────────
  const handleSendCode = async () => {
    Keyboard.dismiss();
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
    Keyboard.dismiss();
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

    await supabase.from('profiles').update({ role }).eq('id', data.user.id);

    if (role === 'dispatcher') {
      login(e164(), 'dispatcher');
      return;
    }

    // Проверяем — новый курьер или уже зарегистрирован
    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', data.user.id).single();

    if (!profile?.full_name) {
      setIsNewCourier(true);
      setStep('register');
    } else {
      setStep('transport');
    }
  };

  // ── ШАГ 3: анкета курьера (только новые) ──────────────────────────
  const handleRegister = async () => {
    Keyboard.dismiss();
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      Alert.alert('Введите полное ФИО', 'Фамилия и имя обязательны');
      return;
    }
    if (!validateInn(inn)) {
      Alert.alert('Неверный ИНН', 'Введите 12-значный ИНН физического лица');
      return;
    }
    if (!selfEmployed) {
      Alert.alert('Требуется статус самозанятого', 'Для работы курьером в CLICK необходим статус самозанятого (ФЗ № 422-ФЗ)');
      return;
    }
    if (!ofertaAccepted) {
      Alert.alert('Примите условия оферты', 'Необходимо принять условия публичной оферты для продолжения');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        full_name: fullName.trim(),
        inn,
        self_employed: true,
        oferta_accepted_at: new Date().toISOString(),
        name: nameParts[1], // имя
      }).eq('id', user.id);
    }
    setLoading(false);
    setStep('transport');
  };

  // ── ШАГ 4: выбор транспорта (только курьер) ───────────────────────
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
    phone:     { title: 'С возвращением!', sub: 'Войдите, чтобы начать смену' },
    code:      { title: 'Введите код',     sub: `Отправили SMS на ${phone}` },
    register:  { title: 'Анкета курьера',  sub: 'Заполните один раз для идентификации' },
    transport: { title: 'Ваш транспорт',   sub: 'Выберите один раз — можно сменить в настройках' },
  }[step];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                  returnKeyType="done"
                  onSubmitEditing={handleSendCode}
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
                returnKeyType="done"
                onSubmitEditing={handleVerifyCode}
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

          {/* ── ШАГ 3: Анкета (новые курьеры) ── */}
          {step === 'register' && (
            <>
              <Text style={styles.registerNote}>
                Заполните анкету один раз. Данные хранятся в соответствии с ФЗ-152 и используются только для идентификации курьера.
              </Text>

              <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>ФИО (полностью)</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Иванов Иван Иванович"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>ИНН (12 цифр)</Text>
              <TextInput
                style={styles.input}
                value={inn}
                onChangeText={(t) => setInn(t.replace(/\D/g, '').slice(0, 12))}
                placeholder="123456789012"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={12}
                returnKeyType="done"
              />
              <Text style={styles.innHint}>ИНН физлица — 12 цифр. Найти: nalog.ru или приложение «Мой налог»</Text>

              <Pressable
                style={styles.checkRow}
                onPress={() => setSelfEmployed((v) => !v)}
              >
                <View style={[styles.checkbox, selfEmployed && styles.checkboxChecked]}>
                  {selfEmployed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>Я зарегистрирован как самозанятый</Text>
              </Pressable>

              <Pressable
                style={styles.checkRow}
                onPress={() => setOfertaAccepted((v) => !v)}
              >
                <View style={[styles.checkbox, ofertaAccepted && styles.checkboxChecked]}>
                  {ofertaAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>
                  Принимаю условия{' '}
                  <Text style={styles.ofertaLink} onPress={() => setShowOferta(true)}>
                    публичной оферты
                  </Text>
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, (pressed || loading) && { opacity: 0.75 }]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Продолжить →</Text>}
              </Pressable>

              {/* Модалка с текстом оферты */}
              <Modal visible={showOferta} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
                  <View style={styles.ofertaHeader}>
                    <Text style={styles.ofertaTitle}>Публичная оферта</Text>
                    <Pressable onPress={() => setShowOferta(false)} hitSlop={12}>
                      <Text style={styles.ofertaClose}>Закрыть</Text>
                    </Pressable>
                  </View>
                  <ScrollView contentContainerStyle={styles.ofertaBody}>
                    <Text style={styles.ofertaText}>{OFERTA_TEXT}</Text>
                  </ScrollView>
                  <Pressable
                    style={[styles.primaryBtn, { margin: spacing.xl }]}
                    onPress={() => { setOfertaAccepted(true); setShowOferta(false); }}
                  >
                    <Text style={styles.primaryBtnText}>Принять и закрыть</Text>
                  </Pressable>
                </SafeAreaView>
              </Modal>
            </>
          )}

          {/* ── ШАГ 4: Выбор транспорта (только для курьера) ── */}
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
    </TouchableWithoutFeedback>
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

/* ── Текст публичной оферты ── */

const OFERTA_TEXT = `ПУБЛИЧНАЯ ОФЕРТА
ИП / ООО CLICK Delivery, Махачкала

1. ПРЕДМЕТ ДОГОВОРА
Настоящая оферта регулирует отношения между сервисом CLICK Delivery и курьером — физическим лицом, зарегистрированным в качестве плательщика налога на профессиональный доход (самозанятым) в соответствии с Федеральным законом № 422-ФЗ от 27.11.2018.

2. УСЛОВИЯ СОТРУДНИЧЕСТВА
2.1. Курьер оказывает услуги по доставке заказов самостоятельно, не являясь наёмным работником.
2.2. Вознаграждение рассчитывается за каждый выполненный заказ и выплачивается в установленные сроки.
2.3. Курьер несёт ответственность за сохранность переданного заказа в период доставки.
2.4. Курьер обязуется соблюдать стандарты сервиса и правила общения с клиентами.

3. ПЕРСОНАЛЬНЫЕ ДАННЫЕ (ФЗ-152)
3.1. Курьер даёт согласие на обработку персональных данных: ФИО, ИНН, номер телефона.
3.2. Данные используются исключительно для идентификации, расчёта вознаграждения и соблюдения налогового законодательства.
3.3. Данные не передаются третьим лицам, кроме случаев, предусмотренных законодательством РФ.
3.4. Хранение данных осуществляется в соответствии с требованиями ФЗ-152 «О персональных данных».
3.5. Курьер вправе в любой момент запросить удаление своих данных, направив заявление через приложение.

4. СТАТУС САМОЗАНЯТОГО
4.1. Курьер подтверждает наличие статуса плательщика НПД и обязуется формировать чек в приложении «Мой налог» после каждой выплаты.
4.2. Сервис не является налоговым агентом курьера.

5. АКЦЕПТ ОФЕРТЫ
Нажимая «Принять и закрыть», вы подтверждаете, что ознакомились с условиями оферты и принимаете их в полном объёме.

Версия 1.0 · ${new Date().getFullYear()} г.`;

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

  /* register step */
  registerNote: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    backgroundColor: colors.bg2,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
  },
  innHint: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    fontSize: 13,
    color: '#fff',
    fontFamily: fonts.sansBold,
  },
  checkLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  ofertaLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontFamily: fonts.sansMedium,
  },

  /* oferta modal */
  ofertaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ofertaTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    color: colors.text,
  },
  ofertaClose: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.primary,
  },
  ofertaBody: {
    padding: spacing.xl,
  },
  ofertaText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});

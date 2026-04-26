// Tipos y helpers compartidos para métodos de cobro de artistas

export type MethodType = 'bank_transfer' | 'mobile_money' | 'paypal' | 'crypto' | 'manual_other' | 'other';

export type VerificationStatus = 'pending_verification' | 'verified' | 'rejected' | 'disabled';

export type CryptoStablecoin = 'USDT' | 'USDC';
export type CryptoNetwork = 'TRC20' | 'BEP20' | 'ERC20' | 'Polygon';

export type BankTransferDetails = {
  bank_name: string;
  iban: string;
  swift?: string;
  id_document_url?: string;
  note?: string;
};

export type MobileMoneyDetails = {
  operator: string;
  phone_number: string;
  id_document_url?: string;
  note?: string;
};

export type PaypalDetails = {
  email: string;
  id_document_url?: string;
  note?: string;
};

export type CryptoDetails = {
  stablecoin: CryptoStablecoin;
  network: CryptoNetwork;
  wallet_address: string;
  note?: string;
};

export type ManualOtherDetails = {
  method_name: string;
  details: string;
  note?: string;
};

export type WithdrawalMethod = {
  id: string;
  artist_id: string;
  user_id: string;
  method_type: MethodType;
  account_holder_name: string;
  country: string | null;
  details_json: Record<string, string>;
  payment_details: Record<string, string>;
  is_default: boolean;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export const METHOD_LABELS: Record<MethodType, string> = {
  bank_transfer: 'Transferencia bancaria',
  mobile_money: 'Mobile Money',
  paypal: 'PayPal',
  crypto: 'Crypto / Stablecoins',
  manual_other: 'Otro método manual',
  other: 'Otro',
};

export const STATUS_BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
  pending_verification: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  verified: { label: 'Verificado', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  rejected: { label: 'Rechazado', cls: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
  disabled: { label: 'Deshabilitado', cls: 'bg-muted text-muted-foreground border-muted' },
};

// Enmascaramiento parcial de datos sensibles
export const maskAccount = (value: string): string => {
  if (!value) return '—';
  const v = value.replace(/\s+/g, '');
  if (v.length <= 4) return `••${v}`;
  return `••••${v.slice(-4)}`;
};

export const maskPhone = (value: string): string => {
  if (!value) return '—';
  const v = value.replace(/\s+/g, '');
  if (v.length <= 4) return `••${v}`;
  return `${v.slice(0, 3)}••••${v.slice(-2)}`;
};

export const maskEmail = (value: string): string => {
  if (!value) return '—';
  const [local, domain] = value.split('@');
  if (!domain) return '••••';
  const visible = local.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(2, local.length - 2))}@${domain}`;
};

export const maskWallet = (value: string): string => {
  if (!value) return '—';
  if (value.length <= 10) return value;
  return `${value.slice(0, 5)}…${value.slice(-4)}`;
};

// Resumen legible (enmascarado) de un método para mostrar al artista
export const formatMethodSummary = (m: { method_type: MethodType; details_json: Record<string, string>; payment_details?: Record<string, string> }): string => {
  const d = (m.details_json && Object.keys(m.details_json).length > 0) ? m.details_json : (m.payment_details ?? {});
  switch (m.method_type) {
    case 'bank_transfer':
      return `${d.bank_name ?? 'Banco'} · ${maskAccount(d.iban ?? d.account ?? '')}`;
    case 'mobile_money':
      return `${d.operator ?? 'Mobile Money'} · ${maskPhone(d.phone_number ?? d.account ?? '')}`;
    case 'paypal':
      return maskEmail(d.email ?? d.account ?? '');
    case 'crypto':
      return `${d.stablecoin ?? 'USDT'} · ${d.network ?? 'TRC20'} · ${maskWallet(d.wallet_address ?? '')}`;
    case 'manual_other':
      return d.method_name ?? 'Método manual';
    default:
      return d.account ?? '—';
  }
};

// Mensajes de error del backend
export const WITHDRAWAL_ERROR_MAP: Record<string, string> = {
  withdrawals_disabled: 'Los retiros están temporalmente desactivados.',
  amount_below_minimum: 'La cantidad es inferior al mínimo permitido.',
  invalid_method: 'Método de pago inválido.',
  method_not_verified: 'El método de cobro debe estar verificado por YUSIOP antes de usarse.',
  frequency_limit: 'Has superado la frecuencia máxima de retiros permitida.',
  insufficient_balance: 'Balance disponible insuficiente.',
  earnings_under_review: 'Tienes ingresos bajo revisión. No puedes retirar ahora.',
  not_authorized: 'No autorizado.',
  method_has_active_withdrawals: 'No puedes eliminar este método porque tiene retiros activos.',
};

// src/utils/friendlyError.ts
// Maps raw Supabase/network error text to a friendly, translated
// message instead of surfacing SDK internals ("Invalid login
// credentials", "AuthRetryableFetchError: Failed to fetch", raw
// Postgres constraint text) directly to users.

export type ErrorContext = 'login' | 'register' | 'network' | 'permission' | 'generic';

interface FriendlyErrorMessages {
  he: string;
  en: string;
}

const MESSAGES: Record<string, FriendlyErrorMessages> = {
  invalidCredentials: {
    he: 'אימייל או סיסמה שגויים.',
    en: 'Incorrect email or password.',
  },
  userAlreadyRegistered: {
    he: 'כתובת האימייל הזו כבר רשומה. נסה/י להתחבר במקום.',
    en: 'This email is already registered. Try logging in instead.',
  },
  emailNotConfirmed: {
    he: 'יש לאמת את כתובת האימייל לפני ההתחברות. בדוק/י את תיבת הדואר.',
    en: 'Please verify your email before logging in. Check your inbox.',
  },
  weakPassword: {
    he: 'הסיסמה חייבת להכיל לפחות 6 תווים.',
    en: 'Password must be at least 6 characters.',
  },
  network: {
    he: 'שגיאת רשת. בדוק/י את החיבור לאינטרנט ונסה/י שוב.',
    en: 'Network error. Check your connection and try again.',
  },
  permission: {
    he: 'אין לך הרשאה לבצע פעולה זו.',
    en: "You don't have permission to do that.",
  },
  loginFailed: {
    he: 'ההתחברות נכשלה. נסה/י שוב.',
    en: 'Login failed. Please try again.',
  },
  registerFailed: {
    he: 'ההרשמה נכשלה. נסה/י שוב.',
    en: 'Registration failed. Please try again.',
  },
  generic: {
    he: 'משהו השתבש. נסה/י שוב.',
    en: 'Something went wrong. Please try again.',
  },
};

const FALLBACK_BY_CONTEXT: Record<ErrorContext, keyof typeof MESSAGES> = {
  login: 'loginFailed',
  register: 'registerFailed',
  network: 'network',
  permission: 'permission',
  generic: 'generic',
};

// Best-effort classification of the raw Supabase/fetch error text into
// one of the known friendly messages above. Falls back to a
// context-appropriate generic message when the raw text doesn't match
// a known pattern, rather than ever showing SDK internals to the user.
export function friendlyErrorMessage(
  rawMessage: string | undefined | null,
  language: 'he' | 'en',
  context: ErrorContext = 'generic'
): string {
  const text = (rawMessage ?? '').toLowerCase();

  let key: keyof typeof MESSAGES | null = null;
  if (text.includes('invalid login credentials')) key = 'invalidCredentials';
  else if (text.includes('already registered') || text.includes('already exists')) key = 'userAlreadyRegistered';
  else if (text.includes('email not confirmed') || text.includes('email not verified')) key = 'emailNotConfirmed';
  else if (text.includes('password') && (text.includes('at least') || text.includes('should be'))) key = 'weakPassword';
  else if (text.includes('failed to fetch') || text.includes('network') || text.includes('fetch')) key = 'network';
  else if (text.includes('permission denied') || text.includes('row-level security') || text.includes('rls')) key = 'permission';

  const resolved = key ?? FALLBACK_BY_CONTEXT[context];
  return MESSAGES[resolved][language];
}

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import YAML from 'yaml';

dotenv.config();

export interface AppConfig {
  app: {
    baseUrl: string;
    loginPath: string;
    portfolioPath?: string;
  };
  account: {
    username: string;
    password: string;
    otp?: string;
  };
  portfolio: {
    expectedTotal: string;
  };
  behavior?: {
    navigationTimeoutMs?: number;
    actionTimeoutMs?: number;
  };
  selectors: {
    cookieAcceptButton?: string | string[];
    usernameInput: string | string[];
    passwordInput: string | string[];
    signInButton: string | string[];
    otpInput?: string | string[];
    otpSubmitButton?: string | string[];
    passkeyDismissButton?: string | string[];
    postLoginReady?: string | string[];
    portfolioTotal: string | string[];
  };
}

type RawConfig = AppConfig & {
  account?: AppConfig['account'] & {
    account?: AppConfig['account'];
  };
};

const ENV_PATTERN = /\$\{([A-Z0-9_]+)\}/g;

function replaceEnvTokens(input: string): string {
  return input.replace(ENV_PATTERN, (_, variableName: string) => process.env[variableName] ?? '');
}

function deepReplaceEnvTokens<T>(value: T): T {
  if (typeof value === 'string') {
    return replaceEnvTokens(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepReplaceEnvTokens(item)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      deepReplaceEnvTokens(item),
    ]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

function assertPresent(value: string | undefined, fieldName: string): asserts value is string {
  if (!value || !value.trim()) {
    throw new Error(`Missing required configuration value: ${fieldName}`);
  }
}

export function normalizeSelectors(selectorOrSelectors?: string | string[]): string[] {
  if (!selectorOrSelectors) {
    return [];
  }

  return Array.isArray(selectorOrSelectors) ? selectorOrSelectors : [selectorOrSelectors];
}

export function asArray(value?: string | string[]): string[] {
  return normalizeSelectors(value);
}

function normalizeAccount(rawAccount: RawConfig['account']): AppConfig['account'] | undefined {
  if (!rawAccount) {
    return undefined;
  }

  if (rawAccount.username || rawAccount.password || rawAccount.otp) {
    return {
      username: rawAccount.username ?? '',
      password: rawAccount.password ?? '',
      otp: rawAccount.otp,
    };
  }

  if (rawAccount.account) {
    return {
      username: rawAccount.account.username ?? '',
      password: rawAccount.account.password ?? '',
      otp: rawAccount.account.otp,
    };
  }

  return undefined;
}

export function loadConfig(): AppConfig {
  const configPath = process.env.E2E_CONFIG ?? path.join(process.cwd(), 'config', 'local.yaml');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Config file not found at ${configPath}. Set E2E_CONFIG or create config/local.yaml from config/example.yaml.`
    );
  }

  const rawText = fs.readFileSync(configPath, 'utf8');
  const parsed = YAML.parse(rawText) as RawConfig;
  const resolved = deepReplaceEnvTokens(parsed);

  const normalizedAccount = normalizeAccount(resolved.account);

  const config: AppConfig = {
    ...resolved,
    account: normalizedAccount as AppConfig['account'],
    behavior: {
      navigationTimeoutMs: resolved.behavior?.navigationTimeoutMs ?? 45_000,
      actionTimeoutMs: resolved.behavior?.actionTimeoutMs ?? 15_000,
    },
    selectors: {
      ...resolved.selectors,
      cookieAcceptButton: resolved.selectors?.cookieAcceptButton,
      usernameInput: normalizeSelectors(resolved.selectors?.usernameInput),
      passwordInput: normalizeSelectors(resolved.selectors?.passwordInput),
      signInButton: normalizeSelectors(resolved.selectors?.signInButton),
      otpInput: normalizeSelectors(resolved.selectors?.otpInput),
      otpSubmitButton: normalizeSelectors(resolved.selectors?.otpSubmitButton),
      passkeyDismissButton: normalizeSelectors(resolved.selectors?.passkeyDismissButton),
      postLoginReady: normalizeSelectors(resolved.selectors?.postLoginReady),
      portfolioTotal: normalizeSelectors(resolved.selectors?.portfolioTotal),
    },
  };

  assertPresent(config.app?.baseUrl, 'app.baseUrl');
  assertPresent(config.app?.loginPath, 'app.loginPath');
  assertPresent(config.account?.username, 'account.username');
  assertPresent(config.account?.password, 'account.password');
  assertPresent(config.portfolio?.expectedTotal, 'portfolio.expectedTotal');

  if (normalizeSelectors(config.selectors?.usernameInput).length === 0) {
    throw new Error('At least one selector is required for selectors.usernameInput');
  }

  if (normalizeSelectors(config.selectors?.passwordInput).length === 0) {
    throw new Error('At least one selector is required for selectors.passwordInput');
  }

  if (normalizeSelectors(config.selectors?.signInButton).length === 0) {
    throw new Error('At least one selector is required for selectors.signInButton');
  }

  if (normalizeSelectors(config.selectors?.portfolioTotal).length === 0) {
    throw new Error('At least one selector is required for selectors.portfolioTotal');
  }

  return config;
}
import "server-only";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }

  return value;
}

export type ServerModelConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function getServerModelConfig(): ServerModelConfig {
  return {
    apiKey: requireEnv("DEEPSEEK_API_KEY"),
    baseUrl: requireEnv("DEEPSEEK_BASE_URL"),
    model: requireEnv("DEEPSEEK_MODEL"),
  };
}

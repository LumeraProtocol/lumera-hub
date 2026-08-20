type Environment = Record<string, string | undefined>

export const isWslEnvironment = (
  environment: Environment = process.env,
): boolean =>
  Boolean(environment.WSL_DISTRO_NAME || environment.WSL_INTEROP)

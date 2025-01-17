import { LOCATION, OWNER, SERVICE, STACK_NAME, STAGE } from './constants';
import { EnvironmentConfig } from './environment';

export function InsideTags(serviceName: string, envConf: EnvironmentConfig) {
  return [
    {
      key: STACK_NAME,
      value: `${envConf.pattern}-${envConf.stage}-${serviceName}`,
    },
    { key: SERVICE, value: serviceName },
    { key: LOCATION, value: envConf.pattern },
    { key: OWNER, value: envConf.owner },
    { key: STAGE, value: envConf.stage },
  ];
}

export function TagsProp(serviceName: string, envConf: EnvironmentConfig) {
  const tags: any = {
    [STACK_NAME]: `${envConf.pattern}-simflexcloud-${envConf.stage}-${serviceName}`,
    [SERVICE]: serviceName,
    [LOCATION]: envConf.pattern,
    [OWNER]: envConf.owner,
    [STAGE]: envConf.stage,
  };

  return tags;
}

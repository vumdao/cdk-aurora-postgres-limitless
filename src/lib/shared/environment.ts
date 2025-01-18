import { Environment } from 'aws-cdk-lib';
import { CDK_DEFAULT_ACCOUNT, CDK_DEFAULT_REGION, DEV_ENV_TAG, DEV_STAGE } from './constants';

export interface EnvironmentConfig extends Environment {
  pattern: string;
  envTag: string;
  owner: string;
  region: string;
  account: string;
  stage: string;
}

export const devEnv: EnvironmentConfig = {
  pattern: 'aurora-postgres-limitless',
  envTag: DEV_ENV_TAG,
  stage: DEV_STAGE,
  account: CDK_DEFAULT_ACCOUNT,
  region: CDK_DEFAULT_REGION,
  owner: 'development',
};

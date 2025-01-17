import { App } from 'aws-cdk-lib';
import { AuroraPostgresLimitlessClusterStack } from '../lib/cluster';
import { devEnv } from '../lib/shared';

const app = new App();

new AuroraPostgresLimitlessClusterStack(app, 'AuroraPostgresLimitlessClusterStack', {
  reg: devEnv,
});

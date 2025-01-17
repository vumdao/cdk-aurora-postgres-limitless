import { awscdk, javascript } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.176.0',
  defaultReleaseBranch: 'master',
  deps: ['cdk-nag'],
  appEntrypoint: 'bin/main.ts',
  github: false,
  name: 'cdk-aurora-postgres-limitless',
  packageManager: javascript.NodePackageManager.PNPM,
  projenrcTs: true,
});
project.synth();
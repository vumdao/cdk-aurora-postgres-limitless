import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  AmazonLinuxCpuType,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  AuroraPostgresEngineVersion,
  CfnDBShardGroup,
  ClusterScailabilityType,
  Credentials,
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseSecret,
  DBClusterStorageType,
  PerformanceInsightRetention,
} from 'aws-cdk-lib/aws-rds';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './shared';

interface AuroraPostgresLimitlessClusterProps extends StackProps {
  reg: EnvironmentConfig;
}

export class AuroraPostgresLimitlessClusterStack extends Stack {
  constructor(scope: Construct, id: string, props: AuroraPostgresLimitlessClusterProps) {
    super(scope, id, props);

    const prefix = `${props.reg.pattern}-sfc-${props.reg.envTag}-aurora-postgres-limitless`;

    // Create VPC with 3 subnets (Public, Private, Isolated)
    const vpc = new Vpc(this, `${prefix}-vpc`, {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'isolated',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: SubnetType.PUBLIC,
          mapPublicIpOnLaunch: false,
        },
      ],
    });

    // Create a secret for the master user
    const masterDbSecret = new DatabaseSecret(this, `${prefix}-master-user-secret`, {
      secretName: `${prefix}-master-user`,
      username: 'adminer',
    });

    // Create Aurora Postgres limitless cluster
    const cluster = new DatabaseCluster(this, prefix, {
      engine: DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_16_4_LIMITLESS }),
      serverlessV2MaxCapacity: 2,
      serverlessV2MinCapacity: 1,
      removalPolicy: RemovalPolicy.DESTROY,
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      credentials: Credentials.fromSecret(masterDbSecret),
      storageEncrypted: true,
      clusterScailabilityType: ClusterScailabilityType.LIMITLESS,
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: RetentionDays.ONE_WEEK,
      enablePerformanceInsights: true,
      performanceInsightRetention: PerformanceInsightRetention.MONTHS_1,
      enableClusterLevelEnhancedMonitoring: true,
      monitoringInterval: Duration.minutes(1),
      storageType: DBClusterStorageType.AURORA_IOPT1,
    });

    // Create a shard group
    new CfnDBShardGroup(this, `${prefix}-shard-group`, {
      dbClusterIdentifier: cluster.clusterIdentifier,
      minAcu: 16,
      maxAcu: 64,
      tags: [
        {
          key: 'Name',
          value: prefix,
        },
      ],
    });

    // Create bastion host to access RDS cluster
    const ec2Sg = new SecurityGroup(this, `${prefix}-ec2-sg`, {
      vpc,
    });
    cluster.connections.allowFrom(ec2Sg, cluster.connections.defaultPort!);

    const role = new Role(this, `${prefix}-ec2-role`, {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
    });

    new Instance(this, `${prefix}-bastion`, {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.SMALL),
      machineImage: MachineImage.latestAmazonLinux2023({
        cpuType: AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: ec2Sg,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      role,
      requireImdsv2: true,
    });

    // Create S3 bucket to store SQL scripts
    const bucket = new Bucket(this, `${prefix}-bucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });
    bucket.grantReadWrite(role);
  }
}

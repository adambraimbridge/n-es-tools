# Next Elasticsearch Tools [![CircleCI](https://circleci.com/gh/Financial-Times/n-es-tools.svg?style=svg)](https://circleci.com/gh/Financial-Times/n-es-tools)

A useful CLI for working with Next's Elasticsearch clusters. Includes tools to snapshot and restore indexes.

## Prerequisites

- Node 6+
- [Vault CLI](https://github.com/Financial-Times/vault/wiki/Getting-Started#login-with-the-cli) (optional, see notes below)

## Installation and setup

You can install the tool from NPM by running the following command:

```
$ npm i -g @financial-times/n-es-tools
```

This will create a new folder in your home directory containing a single `config.yml` file. The tool requires several configuration settings which _must to be added to this file_ in order to use it.

**Note:** By default the tool assumes that you have the [Vault CLI](https://github.com/Financial-Times/vault/wiki/Getting-Started#login-with-the-cli) installed and are logged in. It will attempt to download and apply the required configuration settings automatically. This may be skipped using the `--skip-config` flag when running install manually.

## Usage

You can view the available commands and options by running:

```
$ n-es-tools --help
```

### Snapshotting and restoring an index

```sh
# set up a snapshot repository for both source and target clusters
$ n-es-tools repository eu
$ n-es-tools repository us

# create a snapshot of the source index (use actual name or alias)
$ n-es-tools snapshot eu --index content

# restore index to the target cluster (use actual name, not an alias)
$ n-es-tools restore us --index content_2017-09-27
```

### Finding synchronisation problems

```sh
# fetch all UUIDs from each index
$ n-es-tools uuids eu
$ n-es-tools uuids us

# find differences between them and advise what to do
$ n-es-tools diff uuids-eu.txt uuids-us.txt
```

## Development

Here's the policy attached to the `next-es-tools` user that this tool authenticates as.

### AWS IAM User

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFormationStackCreation",
            "Effect": "Allow",
            "Action": [
                "cloudformation:Create*",
                "cloudformation:Describe*",
                "cloudformation:EstimateTemplateCost",
                "cloudformation:ListStacks",
                "cloudformation:ValidateTemplate"
            ],
            "Resource": "*"
        },
        {
            "Sid": "AllowCloudFormationStackDeletion",
            "Effect": "Allow",
            "Action": [
                "cloudformation:DeleteStack"
            ],
            "Resource": [
                "arn:aws:cloudformation:::stack/next-content-*"
            ]
        },
        {
            "Sid": "AllowCloudFormationStackManagement",
            "Effect": "Allow",
            "Action": [
                "cloudformation:CancelUpdateStack",
                "cloudformation:ContinueUpdateRollback",
                "cloudformation:CreateChangeSet",
                "cloudformation:ExecuteChangeSet",
                "cloudformation:Get*",
                "cloudformation:List*",
                "cloudformation:PreviewStackUpdate",
                "cloudformation:SetStackPolicy",
                "cloudformation:SignalResource",
                "cloudformation:UpdateStack"
            ],
            "Resource": [
                "arn:aws:cloudformation:::stack/next-content-*",
                "arn:aws:cloudformation:::stack/nextcontent",
                "arn:aws:cloudformation:::stack/nextelasticdev"
            ]
        },
        {
            "Sid": "AllowNextContentElasticsearchDomainCreation",
            "Effect": "Allow",
            "Action": [
                "es:CreateElasticsearchDomain",
                "es:Describe*",
                "es:List*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "AllowNextContentElasticsearchDomainDeletion",
            "Effect": "Allow",
            "Action": [
                "es:DeleteElasticsearchDomain"
            ],
            "Resource": [
                "arn:aws:es:::domain/next-content-*",
                "arn:aws:es:::domain/nextcontent",
                "arn:aws:es:::domain/nextelasticdev"
            ]
        },
        {
            "Sid": "AllowNextContentElasticsearchDomainManagement",
            "Effect": "Allow",
            "Action": [
                "es:AddTags",
                "es:RemoveTags",
                "es:UpdateElasticsearchDomainConfig"
            ],
            "Resource": [
                "arn:aws:es:::domain/next-content-*",
                "arn:aws:es:::domain/nextcontent",
                "arn:aws:es:::domain/nextelasticdev"
            ]
        },
        {
            "Sid": "AllowPassRoleForRepositoryCreation",
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": "arn:aws:iam::027104099916:role/FTApplicationRoleFor_nextcontent"
        },
        {
            "Sid": "AllowKeyRotation",
            "Effect": "Allow",
            "Action": [
                "iam:CreateAccessKey",
                "iam:DeleteAccessKey",
                "iam:ListAccessKeys",
                "iam:UpdateAccessKey"
            ],
            "Resource": "arn:aws:iam:::user/${aws:username}"
        }
    ]
}
                "cloudformation:ValidateTemplate"
            ],
            "Resource": "*"
        },
        {
            "Sid": "AllowCloudFormationStackDeletion",
            "Effect": "Allow",
            "Action": [
                "cloudformation:DeleteStack"
            ],
            "Resource": "arn:aws:cloudformation:::stack/next-content-*"
        },
        {
            "Sid": "AllowCloudFormationStackManagement",
            "Effect": "Allow",
            "Action": [
                "cloudformation:CancelUpdateStack",
                "cloudformation:ContinueUpdateRollback",
                "cloudformation:CreateChangeSet",
                "cloudformation:ExecuteChangeSet",
                "cloudformation:Get*",
                "cloudformation:List*",
                "cloudformation:PreviewStackUpdate",
                "cloudformation:SetStackPolicy",
                "cloudformation:SignalResource",
                "cloudformation:UpdateStack"
            ],
            "Resource": [
                "arn:aws:cloudformation:::stack/next-content-*",
                "arn:aws:cloudformation:::stack/nextcontent/*"
            ]
        },
        {
            "Sid": "AllowNextContentElasticsearchDomainCreation",
            "Effect": "Allow",
            "Action": [
                "es:CreateElasticsearchDomain",
                "es:Describe*",
                "es:List*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "AllowNextContentElasticsearchDomainDeletion",
            "Effect": "Allow",
            "Action": [
                "es:DeleteElasticsearchDomain"
            ],
            "Resource": "arn:aws:es:::domain/next-content-*"
        },
        {
            "Sid": "AllowNextContentElasticsearchDomainManagement",
            "Effect": "Allow",
            "Action": [
                "es:AddTags",
                "es:RemoveTags",
                "es:UpdateElasticsearchDomainConfig"
            ],
            "Resource": [
                "arn:aws:es:::domain/next-content-*",
                "arn:aws:es:::domain/nextcontent"
            ]
        },
        {
            "Sid": "AllowNextContentIAMUserPassRole",
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": "arn:aws:iam::027104099916:role/FTApplicationRoleFor_nextcontent"
        },
        {
            "Sid": "AllowNextContentS3BucketAccess",
            "Effect": "Allow",
            "Action": [
                "s3:DeleteObject",
                "s3:GetBucketLocation",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:GetObjectVersion",
                "s3:DeleteObjectVersion",
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::nextcontent-*"
        },
        {
            "Sid": "AllowKeyRotation",
            "Effect": "Allow",
            "Action": [
                "iam:CreateAccessKey",
                "iam:DeleteAccessKey",
                "iam:ListAccessKeys",
                "iam:UpdateAccessKey"
            ],
            "Resource": "arn:aws:iam:::user/${aws:username}"
        }
    ]
}
```

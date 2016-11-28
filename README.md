# Next Elasticsearch Tools

A useful CLI for working with Next's Elasticsearch clusters. Includes tools to snapshot and restore indexes.

## Prerequisites

- Node 6+
- [Heroku Command Line Tools][heroku-cli] (optional, see notes below)

## Installation and setup

You can install the tool from NPM by running the following command:

```
$ npm i -g @financial-times/n-es-tools
```

This will create a new folder in your home directory containing a single `config.yml` file. The tool requires several configuration settings which _must to be added to this file_ in order to use it.

**Note:** By default the tool assumes that you have the [Heroku CLI][heroku-cli] installed and are logged in. It will attempt to download and apply the required configuration settings automatically. This may be skipped using the `--skip-config` flag when running install manually.

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

# create a snapshot of the source index
$ n-es-tools snapshot eu --index v3_api_v2

# restore index to the target cluster
$ n-es-tools restore us --index v3_api_v2
```

### Finding synchronisation problems

```sh
# fetch all UUIDs from each index
$ n-es-tools uuids eu
$ n-es-tools uuids us

# find differences between them and advise what to do
$ n-es-tools diff uuids-eu.txt uuids-us.txt
```

[heroku-cli]: https://devcenter.heroku.com/articles/heroku-command-line

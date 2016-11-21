# Next Elasticsearch Tools

A useful CLI for working with Next's Elasticsearch clusters. Includes tools to snapshot and restore indexes.

## Installation and setup

This tool requires **Node 6** or above. You can install it from NPM by running the following command:

```
$ npm i -g @financial-times/n-es-tools
```

To then use the tool you'll first need to create a workspace. A workspace is a folder containing configuration data and is a place to store any files created by the tool. To create a new workspace run the `workspace` task:

```
$ n-es-tools workspace path/to/my-workspace
```

This will create a new directory (if it does not already exist) containing a single `workspace.yml` file. The tools require several keys and settings which _must to be added to this file_ in order to use it.

## Usage

You can view the available commands and options by running:

```
$ n-es-tools --help
```

### Snapshotting and restoring an index

```
# set up a snapshot repository for both source and target clusters
$ n-es-tools repository eu
$ n-es-tools repository us

# create a snapshot of the source index
$ n-es-tools snapshot eu --index v3_api_v2

# restore index to the target cluster
$ n-es-tools restore us --index v3_api_v2
```

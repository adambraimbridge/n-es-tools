# Next Elasticsearch Tools

A useful CLI for working with Next's Elasticsearch clusters. Includes tools to snapshot and restore indexes.

## Installation and setup

This tool requires **Node 6** or above.

```
$ npm i -g @financial-times/next-es-tools
```

Next you'll need to create a workspace, to do so run:

```
$ next-es-tools workspace path/to/workspace
```

This will create a new directory (if it does not already exist) containing a single `.env` file. The tools require several keys and settings which _must_ to be added to this file. Any files created by the tool will also be stored here.

## Usage

You can view the available commands and options by running:

```
$ next-es-tools --help
```

### Snapshotting and restoring an index

```
# set up a snapshot repository on both clusters
$ next-es-tools repository eu
$ next-es-tools repository us

# create a snapshot of the source index
$ next-es-tools snapshot eu --index v3_api_v2

# restore index to the target cluster
$ next-es-tools restore us --index v3_api_v2
```

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

This will create a new directory (if it does not already exist) containing a single `.env` file. The tools require several keys and settings which _must_ to be added to this file.

## Usage

You can view the available commands and options by running:

```
$ next-es-tools --help
```

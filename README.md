# Next Elasticsearch Tools

## Installation and setup

```
$ npm i -g next-es-tools
```

Next you'll need to create a workspace, to do so run:

```
$ next-es-tools workspace --directory ~/path/to/my/workspace
```

This will create a new directory containing a single `.env` file. The tools require several secret keys and settings which need to be added to this file.

## Usage

Always start by moving into your workspace. This is so the tool can load the correct keys and settings.:

```
cd ~/path/to/my/workspace
```

### uuids

This will fetch and save a list of all UUIDs from the content index in the given region.

```
$ next-es-tools uuids --region eu
```

#!/bin/bash
set -e

# Base directory for combined static assets
DIST_DIR="dist"

echo "Building all workspaces..."
npm run build

echo "Preparing combined dist directory..."
rm -rf $DIST_DIR
mkdir -p $DIST_DIR

# Copy worker-app static export to root of dist
echo "Copying worker-app..."
cp -R apps/worker-app/out/* $DIST_DIR/

# Copy admin-app static export to dist/admin/
echo "Copying admin-app..."
mkdir -p $DIST_DIR/admin
cp -R apps/admin-app/out/* $DIST_DIR/admin/

echo "Combined static assets ready in $DIST_DIR/"

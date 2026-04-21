#!/bin/bash
set -e

git config --global user.email "19180457+fam007e@users.noreply.github.com"
git config --global user.name "fam007e"
git status
if [ -n "$(git status --porcelain)" ]; then
    git add .
    git commit -m "Update extensions repo"
    git push
else
    echo "No changes to commit"
fi

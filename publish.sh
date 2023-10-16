# !usr/bin/env bash

set -eux

# echo "Publishing normal package"
# npm run just:publish:lerna
#
echo "Publishing wasm package"
cd packages/blsdkg && npm run build 
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > pkg/.npmrc
cd pkg && npm publish --access=publish
rm -r .npmrc


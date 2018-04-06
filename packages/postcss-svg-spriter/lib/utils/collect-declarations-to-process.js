const path = require('path');

const Promise = require('bluebird');
const merge = require('merge-options');
const { createUrlsHelper } = require('postcss-helpers');
const { parse: parseQuery } = require('query-string');

const resolveFile = require('./resolve-file');

const BACKGROUND_DECL_NAME_REGEXP = new RegExp('^background(-image)?$', 'i');
const URL_FUNCTION_REGEXP = new RegExp('url\\\(.*?\\\)', 'ig');

function isDeclarationShouldBeProcessed(decl) {
  const shouldBeProcessed =
    BACKGROUND_DECL_NAME_REGEXP.test(decl.prop) &&
    URL_FUNCTION_REGEXP.test(decl.value);

  BACKGROUND_DECL_NAME_REGEXP.lastIndex = 0;
  URL_FUNCTION_REGEXP.lastIndex = 0;

  return shouldBeProcessed;
}

const defaultOptions = {
  resolveUrls: true
};

/**
 * @param {postcss.Root} root
 * @param {Object} [opts] {@see defaultOptions}
 * @return {Promise<Array<{path: string, original: string, query: string, decl: postcss.Declaration}>>}
 */
module.exports = function collectDeclarationsToProcess(root) {
  const from = root.source.input.file;
  const sourceContextPath = from ? path.dirname(from) : undefined;
  const entries = [];

  root.walkDecls(decl => {
    if (isDeclarationShouldBeProcessed(decl)) {
      const url = createUrlsHelper(decl.value).URIS[0]; // pick first value from url(...)
      entries.push({
        original: url.toString(),
        path: url.path(),
        query: url.query() ? parseQuery(url.query()) : undefined,
        decl
      });
    }
  });

  return Promise.map(entries, item => Promise.props({
    ...item,
    absolutePath: resolveFile(item.path, sourceContextPath)
  }));
};

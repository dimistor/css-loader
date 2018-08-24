import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

import utils from './utils';

const pluginName = 'postcss-css-loader-import';

const getArg = (nodes) =>
  nodes.length !== 0 && nodes[0].type === 'string'
    ? nodes[0].value
    : valueParser.stringify(nodes);

const getUrl = (node) => {
  if (node.type === 'function' && node.value.toLowerCase() === 'url') {
    return getArg(node.nodes);
  }

  if (node.type === 'string') {
    return node.value;
  }

  return '';
};

const parseImport = (params) => {
  const { nodes } = valueParser(params);

  if (nodes.length === 0) {
    return null;
  }

  const url = getUrl(nodes[0]);

  if (url.trim().length === 0) {
    return null;
  }

  return {
    url,
    media: valueParser.stringify(nodes.slice(1)).trim(),
  };
};

export default postcss.plugin(
  pluginName,
  () =>
    function process(css, result) {
      const imports = {};

      css.walkAtRules(/^import$/i, (atrule) => {
        // Convert only top-level @import
        if (atrule.parent.type !== 'root') {
          return;
        }

        if (atrule.nodes) {
          // eslint-disable-next-line consistent-return
          return result.warn(
            "It looks like you didn't end your @import statement correctly. " +
              'Child nodes are attached to it.',
            { node: atrule }
          );
        }

        const parsed = parseImport(atrule.params);

        if (!parsed) {
          // eslint-disable-next-line consistent-return
          return result.warn(`Unable to find uri in '${atrule.toString()}'`, {
            node: atrule,
          });
        }

        atrule.remove();

        imports[
          `'${parsed.url}'${
            parsed.media.length === 0 ? '' : ` ${parsed.media.trim()}`
          }`
        ] = {};
      });

      css.prepend(utils.createICSSImports(imports));
    }
);

/* eslint-env node */
'use strict';

const metal = require('broccoli-metal');
const Funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');
const replace = require('broccoli-string-replace');
const stew = require('broccoli-stew');
const path = require('path');

module.exports = {
  name: 'seamless-immutable',

  importEmberStuff (tree) {
    return metal(tree, (files) => {
      var startIndex, endIndex;
      Object.keys(files).forEach((key) => {
        startIndex = files[key].indexOf('addImmutabilityTag(obj)');
        if (startIndex !== -1) {
          endIndex = startIndex + 23;
          var beforeIndex = files[key].slice(0, endIndex);
          var afterIndex = files[key].slice(endIndex + 1, files[key].length - 1);
          files[key] = `${beforeIndex}\n\naddPropertyTo(obj, '__defineNonEnumerable', function(){});\n\n${afterIndex}`;
        }
      });
    });
  },

  shimAMD (tree, nameMapping) {
    return stew.map(tree, function(content, relativePath) {
      const name = nameMapping[relativePath];
      if (name) {
        return [
          '(function(define){\n',
          content,
          '\n})((function(){ function newDefine(){ var args = Array.prototype.slice.call(arguments); args.unshift("',
          name,
          '"); return define.apply(null, args); }; newDefine.amd = true; return newDefine; })());'
        ].join('');
      } else {
        return content;
      }
    });
  },

  treeForAddon (tree) {
    const seamlessPath = path.dirname(require.resolve('seamless-immutable/src/seamless-immutable.js'));
    const theTree = stew.rename(seamlessPath, function(relativePath) {
      return relativePath.replace('seamless-immutable.js', 'index.js');
    });

    const denodifiedSeamless = replace(theTree, {
      files: [ '**/*.js' ],
      patterns: [
        {
          match: /process\.env\.NODE_ENV/g,
          replacement: JSON.stringify(process.env.EMBER_ENV)
        }
      ]
    });
    let addon = this.addons.find(addon => addon.name === 'ember-cli-babel');
    let seamlessTree = addon.transpileTree(denodifiedSeamless, {
      'ember-cli-babel': {
        compileModules: false
      }
    });

    const seamlessTreeWithEmberMagic = this.importEmberStuff(seamlessTree);
    const seamlessTreeWithEmberStuff = this.shimAMD(seamlessTreeWithEmberMagic, {
      'index.js': 'seamless-immutable'
    });

    if (!tree) {
      return this._super.treeForAddon.call(this, seamlessTreeWithEmberStuff);
    }

    const trees = mergeTrees([seamlessTreeWithEmberStuff, tree], {
      overwrite: true
    });

    return this._super.treeForAddon.call(this, trees);
  }
};

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
      var startIndex, endIndex, startDefine, endDefine;
      Object.keys(files).forEach((key) => {
        // inside the makeImmutable function we tag the obj so Ember won't try to mutate it
        startIndex = files[key].indexOf('addImmutabilityTag(obj)');
        if (startIndex !== -1) {
          endIndex = startIndex + 23;
          var beforeIndex = files[key].slice(0, endIndex);
          var afterIndex = files[key].slice(endIndex + 1, files[key].length - 1);
          files[key] = `${beforeIndex}\n\naddPropertyTo(obj, '__defineNonEnumerable', function(){});\n\n${afterIndex}`;
        }
        // alter how seamless-immutable loads to play nice with ember-cli AMD like define
        startDefine = files[key].indexOf('define(function () {\n');
        if (startDefine !== -1) {
          endDefine = startDefine + 50;
          var beforeDefine = files[key].slice(0, startDefine);
          var afterDefine = files[key].slice(endDefine + 1, files[key].length);
          files[key] = `define.amd=true;${beforeDefine}\n\nexports['default'] = Immutable;return Immutable;\n\n${afterDefine}\n\n`;
        }
      });
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

    if (!tree) {
      return this._super.treeForAddon.call(this, seamlessTreeWithEmberMagic);
    }

    const trees = mergeTrees([seamlessTreeWithEmberMagic, tree], {
      overwrite: true
    });

    return this._super.treeForAddon.call(this, trees);
  }
};

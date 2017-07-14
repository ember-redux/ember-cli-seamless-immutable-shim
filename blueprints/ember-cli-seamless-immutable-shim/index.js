module.exports = {
  afterInstall: function () {
    return this.addPackagesToProject([
      {name: 'seamless-immutable', target: '7.1.2'}
    ])
  },

  normalizeEntityName: function () {
    // this prevents an error when the entityName is not specified
  }
}

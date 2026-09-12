const toJSONPlugin = (schema) => {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
  });
  schema.set('toObject', { virtuals: true });
};

module.exports = toJSONPlugin;

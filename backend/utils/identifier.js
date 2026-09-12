const isEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

const parseIdentifier = (raw) => {
  const value = (raw || '').trim();
  if (!value) return null;

  if (isEmail(value)) {
    return { method: 'email', value: value.toLowerCase() };
  }
  return { method: 'phone', value };
};

module.exports = { parseIdentifier };

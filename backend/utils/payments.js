const round2 = (n) => Math.round(n * 100) / 100;

const computeSplit = (totalAmount, advancePercent) => {
  const total = Number(totalAmount);
  const percent = Number(advancePercent);
  const advance_amount = round2((total * percent) / 100);
  const balance_amount = round2(total - advance_amount);
  return { advance_amount, balance_amount };
};

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

module.exports = { computeSplit, toPaise };

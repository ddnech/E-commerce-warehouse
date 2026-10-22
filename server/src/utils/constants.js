// Role ids match the roles seeder.
const ROLE = { SUPER_ADMIN: 1, ADMIN: 2, USER: 3 };

// Order status ids match the order statuses seeder.
const STATUS = {
  WAITING_PAYMENT: 1,
  WAITING_CONFIRMATION: 2,
  COMPLETED: 3,
  PROCESSING: 4,
  CANCELLED: 5,
  SHIPPED: 6,
  PAYMENT_REJECTED: 7,
};

const COURIERS = [
  { code: "jne", name: "JNE" },
  { code: "pos", name: "POS Indonesia" },
  { code: "tiki", name: "TIKI" },
];

module.exports = { ROLE, STATUS, COURIERS };

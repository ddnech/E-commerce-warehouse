const schedule = require("node-schedule");
const { Op } = require("sequelize");
const dayjs = require("dayjs");
const db = require("../models");
const env = require("../config/env");
const { STATUS } = require("../utils/constants");
const { cancel } = require("../services/orders");

/** Cancels orders that weren't paid in time and frees their stock. */
async function cancelUnpaid() {
  try {
    const cutoff = dayjs().subtract(env.paymentWindowHours, "hour").toDate();
    const orders = await db.Order.findAll({
      where: { order_status_id: { [Op.in]: [STATUS.WAITING_PAYMENT, STATUS.PAYMENT_REJECTED] }, createdAt: { [Op.lt]: cutoff } },
    });
    for (const order of orders) {
      await db.sequelize.transaction((transaction) => cancel(order, "Not paid in time", transaction));
    }
    if (orders.length) console.log(`[orders] Cancelled ${orders.length} unpaid order(s).`);
  } catch (error) {
    console.error("[orders] Auto-cancel failed:", error.message);
  }
}

/** Marks shipped orders as received after a while, in case the customer forgets. */
async function completeShipped() {
  try {
    const cutoff = dayjs().subtract(env.autoCompleteDays, "day").toDate();
    const [count] = await db.Order.update(
      { order_status_id: STATUS.COMPLETED, completed_at: new Date() },
      { where: { order_status_id: STATUS.SHIPPED, delivery_time: { [Op.lt]: cutoff } } }
    );
    if (count) console.log(`[orders] Marked ${count} shipped order(s) as received.`);
  } catch (error) {
    console.error("[orders] Auto-complete failed:", error.message);
  }
}

function startJobs() {
  cancelUnpaid();
  completeShipped();
  schedule.scheduleJob("*/10 * * * *", cancelUnpaid); // every 10 minutes
  schedule.scheduleJob("15 * * * *", completeShipped); // every hour
}

module.exports = { startJobs, cancelUnpaid, completeShipped };

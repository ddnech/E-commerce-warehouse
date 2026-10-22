const HttpError = require("../../utils/httpError");

/**
 * Warehouse admins only see their own warehouse. The super admin sees everything,
 * and can narrow down with ?warehouse=ID.
 * Returns a warehouse id to filter by, or null for "all".
 */
function warehouseScope(req, requested = req.query.warehouse) {
  if (!req.admin.isSuper) {
    if (!req.admin.warehouse_id) throw new HttpError(403, "Your account isn't assigned to a warehouse yet.");
    return req.admin.warehouse_id;
  }
  return requested ? Number(requested) : null;
}

/** Throws unless this admin may act on that warehouse. */
function assertWarehouse(req, warehouseId) {
  if (!req.admin.isSuper && Number(warehouseId) !== Number(req.admin.warehouse_id)) {
    throw new HttpError(403, "That belongs to another warehouse.");
  }
}

module.exports = { warehouseScope, assertWarehouse };

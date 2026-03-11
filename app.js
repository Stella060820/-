// 简单本地存储键名
const STORAGE_KEY = "warehouse_inventory_data_v1";

// 送货单固定信息（可按实际情况修改）
const FIXED_DELIVERY_INFO = {
  shipper: "发货员姓名",
  carPlate: "车牌号",
  customerOrderNo: "固定客户订单号",
};

// 页面初始化
document.addEventListener("DOMContentLoaded", () => {
  const state = loadState();

  const productTableBody = document.getElementById("product-table-body");
  const shipmentProductSelect = document.getElementById("shipment-product");
  const shipmentForm = document.getElementById("shipment-form");
  const shipmentQuantityInput = document.getElementById("shipment-quantity");
  const shipmentDateInput = document.getElementById("shipment-date");
  const shipmentCustomerInput = document.getElementById("shipment-customer");
  const shipmentProjectSelect = document.getElementById("shipment-project");
  const addProductBtn = document.getElementById("add-product-btn");
  const productModalBackdrop = document.getElementById("product-modal-backdrop");
  const productModalTitle = document.getElementById("product-modal-title");
  const productForm = document.getElementById("product-form");
  const productModelInput = document.getElementById("product-model");
  const productVendorInput = document.getElementById("product-vendor");
  const productStockInput = document.getElementById("product-stock");
  const productMinStockInput = document.getElementById("product-min-stock");
  const productCancelBtn = document.getElementById("product-cancel-btn");
  const deliveryItemsBody = document.getElementById("delivery-items-body");
  const deliveryDateDisplay = document.getElementById("delivery-date-display");
  const deliveryOrderNoSpan = document.getElementById("delivery-order-no");
  const deliveryCustomerOrderNoSpan = document.getElementById("delivery-customer-order-no");
  const deliveryCustomerNameSpan = document.getElementById("delivery-customer-name");
  const deliveryProjectSpan = document.getElementById("delivery-project");
  const deliveryShipperSpan = document.getElementById("delivery-shipper");
  const deliveryCarPlateSpan = document.getElementById("delivery-car-plate");
  const printDeliveryBtn = document.getElementById("print-delivery-btn");
  const exportDeliveryExcelBtn = document.getElementById("export-delivery-excel-btn");
  const analysisMonthInput = document.getElementById("analysis-month");
  const refreshAnalysisBtn = document.getElementById("refresh-analysis-btn");
  const alertToast = document.getElementById("alert-toast");
  const exportDataBtn = document.getElementById("export-data-btn");
  const importDataBtn = document.getElementById("import-data-btn");
  const importFileInput = document.getElementById("import-file-input");

  let editingProductId = null;
  let demandChart = null;
  let currentDeliveryDate = null;
  let currentOrderIndex = null;
  let currentOrderNo = null;
  let currentCustomerName = null;
  let currentProject = null;

  // 设置默认日期为今天
  const todayStr = new Date().toISOString().slice(0, 10);
  shipmentDateInput.value = todayStr;
  analysisMonthInput.value = todayStr.slice(0, 7);

  // 渲染函数
  function renderProducts() {
    productTableBody.innerHTML = "";
    if (state.products.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "placeholder";
      td.textContent = "暂无产品，请点击右上角“新增产品”。";
      tr.appendChild(td);
      productTableBody.appendChild(tr);
      return;
    }

    state.products.forEach((p) => {
      const tr = document.createElement("tr");

      const modelTd = document.createElement("td");
      modelTd.textContent = p.model;

      const vendorTd = document.createElement("td");
      vendorTd.textContent = p.vendor;

      const stockTd = document.createElement("td");
      stockTd.textContent = p.stock;

      const minStockTd = document.createElement("td");
      minStockTd.textContent = p.minStock;

      const statusTd = document.createElement("td");
      const pill = document.createElement("span");
      pill.classList.add("status-pill");
      const icon = document.createElement("span");
      icon.className = "status-icon";
      const isLow = p.stock <= p.minStock && p.minStock > 0;
      pill.classList.add(isLow ? "status-low" : "status-ok");
      pill.innerHTML = "";
      pill.appendChild(icon);
      const text = document.createTextNode(isLow ? "需补货" : "正常");
      pill.appendChild(text);
      statusTd.appendChild(pill);

      const actionsTd = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "编辑";
      editBtn.className = "btn ghost small";
      editBtn.addEventListener("click", () => openEditProductModal(p.id));

      const delBtn = document.createElement("button");
      delBtn.textContent = "删除";
      delBtn.className = "btn danger small";
      delBtn.addEventListener("click", () => deleteProduct(p.id));

      actionsTd.style.whiteSpace = "nowrap";
      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(document.createTextNode(" "));
      actionsTd.appendChild(delBtn);

      tr.appendChild(modelTd);
      tr.appendChild(vendorTd);
      tr.appendChild(stockTd);
      tr.appendChild(minStockTd);
      tr.appendChild(statusTd);
      tr.appendChild(actionsTd);

      productTableBody.appendChild(tr);
    });
  }

  function renderShipmentProductOptions() {
    shipmentProductSelect.innerHTML = '<option value="">请选择产品</option>';
    state.products.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.model}（${p.vendor}）`;
      shipmentProductSelect.appendChild(opt);
    });
  }

  function renderDeliveryNote(latestShipment = null) {
    deliveryItemsBody.innerHTML = "";

    const shipmentsForOrder = latestShipment
      ? state.shipments.filter(
          (s) =>
            s.date === latestShipment.date &&
            s.orderIndex === latestShipment.orderIndex
        )
      : [];

    if (!latestShipment || shipmentsForOrder.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "placeholder";
      td.textContent = "暂无送货记录";
      tr.appendChild(td);
      deliveryItemsBody.appendChild(tr);
      deliveryDateDisplay.textContent = "送货日期：—";
      deliveryOrderNoSpan.textContent = "—";
      deliveryCustomerOrderNoSpan.textContent = "—";
      deliveryCustomerNameSpan.textContent = "—";
      deliveryProjectSpan.textContent = "—";
      deliveryShipperSpan.textContent = "—";
      deliveryCarPlateSpan.textContent = "—";
      currentDeliveryDate = null;
      currentOrderIndex = null;
      currentOrderNo = null;
      currentCustomerName = null;
      currentProject = null;
      return;
    }

    const dateLabel = latestShipment.date;
    deliveryDateDisplay.textContent = `送货日期：${dateLabel}`;
    currentDeliveryDate = dateLabel;
    currentOrderIndex = latestShipment.orderIndex || null;
    currentOrderNo = latestShipment.orderNo || "";
    currentCustomerName = latestShipment.customerName || "";
    currentProject = latestShipment.project || "";

    deliveryOrderNoSpan.textContent = currentOrderNo || "—";
    deliveryCustomerOrderNoSpan.textContent = FIXED_DELIVERY_INFO.customerOrderNo;
    deliveryCustomerNameSpan.textContent = currentCustomerName || "—";
    deliveryProjectSpan.textContent = currentProject || "—";
    deliveryShipperSpan.textContent = FIXED_DELIVERY_INFO.shipper;
    deliveryCarPlateSpan.textContent = FIXED_DELIVERY_INFO.carPlate;

    shipmentsForOrder.forEach((s, index) => {
      const product = state.products.find((p) => p.id === s.productId);
      const tr = document.createElement("tr");

      const indexTd = document.createElement("td");
      indexTd.textContent = String(index + 1);

      const modelTd = document.createElement("td");
      modelTd.textContent = product ? product.model : "已删除产品";
      const qtyTd = document.createElement("td");
      qtyTd.textContent = s.quantity;
      const nameTd = document.createElement("td");
      nameTd.textContent = product ? product.vendor : "-";

      tr.appendChild(indexTd);
      tr.appendChild(modelTd);
      tr.appendChild(nameTd);
      tr.appendChild(qtyTd);
      deliveryItemsBody.appendChild(tr);
    });
  }

  function renderAnalysis() {
    const monthVal = analysisMonthInput.value;
    if (!monthVal) return;

    const [year, month] = monthVal.split("-").map((v) => parseInt(v, 10));
    const labels = [];
    const dataMap = new Map();

    state.shipments.forEach((s) => {
      const d = new Date(s.date);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return;

      const product = state.products.find((p) => p.id === s.productId);
      if (!product) return;
      const key = product.model;
      dataMap.set(key, (dataMap.get(key) || 0) + s.quantity);
    });

    const sorted = Array.from(dataMap.entries()).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([model, qty]) => {
      labels.push(model);
      dataMap.set(model, qty);
    });

    const ctx = document.getElementById("demand-chart").getContext("2d");
    const data = {
      labels,
      datasets: [
        {
          label: "当月发货数量",
          data: labels.map((l) => dataMap.get(l)),
          backgroundColor: "rgba(56, 189, 248, 0.55)",
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    };

    if (demandChart) {
      demandChart.destroy();
    }

    demandChart = new Chart(ctx, {
      type: "bar",
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: "rgba(148, 163, 184, 0.6)",
            borderWidth: 1,
            padding: 8,
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#9ca3af",
              maxRotation: 45,
              minRotation: 0,
            },
            grid: {
              display: false,
            },
          },
          y: {
            ticks: {
              color: "#9ca3af",
              precision: 0,
            },
            grid: {
              color: "rgba(30, 64, 175, 0.5)",
            },
          },
        },
      },
    });
  }

  // 状态管理
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("保存失败", e);
      showToast("本地存储失败，请检查浏览器设置。", "danger");
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          products: [],
          shipments: [],
        };
      }
      const parsed = JSON.parse(raw);
      if (!parsed.products || !parsed.shipments) {
        throw new Error("数据格式不正确");
      }
      return parsed;
    } catch (e) {
      console.warn("加载本地数据失败，将使用空数据。", e);
      return {
        products: [],
        shipments: [],
      };
    }
  }

  // 工具函数
  function generateId() {
    return "p_" + Math.random().toString(36).slice(2, 10);
  }

  let toastTimeout = null;
  function showToast(message, type = "info") {
    alertToast.classList.remove("hidden");
    alertToast.classList.toggle("danger", type === "danger");
    alertToast.innerHTML = "";
    const titleDiv = document.createElement("div");
    titleDiv.className = "toast-title";
    titleDiv.textContent = type === "danger" ? "库存提醒" : "提示";
    const msgDiv = document.createElement("div");
    msgDiv.className = "toast-message";
    msgDiv.textContent = message;
    alertToast.appendChild(titleDiv);
    alertToast.appendChild(msgDiv);

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      alertToast.classList.add("hidden");
    }, 4500);
  }

  function checkLowStock(product) {
    if (product.minStock > 0 && product.stock <= product.minStock) {
      showToast(`产品「${product.model}」库存为 ${product.stock}，已低于或等于最低库存 ${product.minStock}，请及时补货。`, "danger");
    }
  }

  // 产品增删改
  function openNewProductModal() {
    editingProductId = null;
    productModalTitle.textContent = "新增产品";
    productModelInput.value = "";
    productVendorInput.value = "";
    productStockInput.value = "0";
    productMinStockInput.value = "0";
    productModalBackdrop.classList.remove("hidden");
  }

  function openEditProductModal(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    editingProductId = id;
    productModalTitle.textContent = "编辑产品";
    productModelInput.value = p.model;
    productVendorInput.value = p.vendor;
    productStockInput.value = String(p.stock);
    productMinStockInput.value = String(p.minStock);
    productModalBackdrop.classList.remove("hidden");
  }

  function closeProductModal() {
    productModalBackdrop.classList.add("hidden");
  }

  function deleteProduct(id) {
    const product = state.products.find((p) => p.id === id);
    if (!product) return;
    if (!window.confirm(`确定要删除产品「${product.model}」吗？相关发货记录不会被删除。`)) return;
    state.products = state.products.filter((p) => p.id !== id);
    saveState();
    renderProducts();
    renderShipmentProductOptions();
    renderAnalysis();
  }

  // 发货处理
  function handleShipmentSubmit(e) {
    e.preventDefault();
    const productId = shipmentProductSelect.value;
    const quantity = Number(shipmentQuantityInput.value);
    const date = shipmentDateInput.value;
    const customerName = shipmentCustomerInput.value.trim();
    const project = shipmentProjectSelect.value;

    if (!productId || !quantity || quantity <= 0 || !date || !customerName || !project) {
      showToast("请完整填写发货信息（含客户简称和使用项目）。", "danger");
      return;
    }

    const product = state.products.find((p) => p.id === productId);
    if (!product) {
      showToast("找不到对应产品。", "danger");
      return;
    }

    if (quantity > product.stock) {
      const confirmed = window.confirm(
        `当前库存为 ${product.stock}，发货数量为 ${quantity}，库存将变为负数，是否继续？`
      );
      if (!confirmed) return;
    }

    product.stock -= quantity;

    const sameDayShipments = state.shipments.filter((s) => s.date === date);
    const maxOrderIndex = sameDayShipments.reduce(
      (max, s) => Math.max(max, s.orderIndex || 0),
      0
    );
    const orderIndex = maxOrderIndex + 1;
    const year = date.slice(2, 4);
    const mmdd = date.slice(5, 7) + date.slice(8, 10);
    const orderNo = `${year}${mmdd}${String(orderIndex).padStart(3, "0")}`;

    const shipment = {
      id: "s_" + Math.random().toString(36).slice(2, 10),
      productId,
      quantity,
      date,
      customerName,
      project,
      orderIndex,
      orderNo,
    };
    state.shipments.push(shipment);

    saveState();
    renderProducts();
    renderDeliveryNote(shipment);
    renderAnalysis();
    checkLowStock(product);

    shipmentQuantityInput.value = "";
    // 客户简称和使用项目通常多次相同，不自动清空
    showToast("发货记录已保存并生成送货单。");
  }

  function handlePrintDelivery() {
    window.print();
  }

  function handleExportDeliveryExcel() {
    try {
      if (!currentDeliveryDate || currentOrderIndex == null) {
        showToast("暂无送货记录，无法导出送货单。", "danger");
        return;
      }
      if (typeof XLSX === "undefined") {
        showToast("当前浏览器不支持 Excel 导出。", "danger");
        return;
      }

      const shipmentsForOrder = state.shipments.filter(
        (s) =>
          s.date === currentDeliveryDate &&
          s.orderIndex === currentOrderIndex
      );
      if (shipmentsForOrder.length === 0) {
        showToast("当前送货单没有明细记录。", "danger");
        return;
      }

      const rows = shipmentsForOrder.map((s, index) => {
        const product = state.products.find((p) => p.id === s.productId);
        return {
          序号: index + 1,
          客户物料号: product ? product.model : "",
          品名: product ? product.vendor : "",
          数量: s.quantity,
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([]);

      XLSX.utils.sheet_add_aoa(
        ws,
        [
          ["上海创亚纸业送货单"],
          [
            "单号",
            currentOrderNo || "",
            "客户订单号",
            FIXED_DELIVERY_INFO.customerOrderNo,
            "客户简称",
            currentCustomerName || "",
            "使用项目",
            currentProject || "",
          ],
          [
            "发货员",
            FIXED_DELIVERY_INFO.shipper,
            "车牌",
            FIXED_DELIVERY_INFO.carPlate,
            "送货日期",
            currentDeliveryDate,
          ],
          [],
        ],
        { origin: "A1" }
      );

      XLSX.utils.sheet_add_json(ws, rows, {
        origin: "A5",
        header: ["序号", "客户物料号", "品名", "数量"],
        skipHeader: false,
      });

      ws["!merges"] = ws["!merges"] || [];
      ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });

      XLSX.utils.book_append_sheet(wb, ws, "Delivery");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `delivery-${currentOrderNo || currentDeliveryDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("送货单已导出为 Excel。");
    } catch (e) {
      console.error(e);
      showToast("导出送货单失败，请稍后重试。", "danger");
    }
  }

  function handleExportData() {
    try {
      if (typeof XLSX === "undefined") {
        throw new Error("缺少 Excel 库");
      }

      const wb = XLSX.utils.book_new();

      const productRows = state.products.map((p) => ({
        id: p.id,
        model: p.model,
        vendor: p.vendor,
        stock: p.stock,
        minStock: p.minStock,
      }));
      const wsProducts = XLSX.utils.json_to_sheet(productRows);
      XLSX.utils.book_append_sheet(wb, wsProducts, "Products");

      const shipmentRows = state.shipments.map((s) => {
        const product = state.products.find((p) => p.id === s.productId);
        return {
          id: s.id,
          productId: s.productId,
          model: product ? product.model : "",
          quantity: s.quantity,
          date: s.date,
        };
      });
      const wsShipments = XLSX.utils.json_to_sheet(shipmentRows);
      XLSX.utils.book_append_sheet(wb, wsShipments, "Shipments");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `inventory-data-${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("已导出为 Excel 文件。");
    } catch (e) {
      console.error(e);
      showToast("导出失败，请检查浏览器或稍后重试。", "danger");
    }
  }

  function handleImportDataClick() {
    importFileInput.value = "";
    importFileInput.click();
  }

  function handleImportFileChange() {
    const file = importFileInput.files && importFileInput.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();

    // Excel 导入
    if (ext === "xlsx" || ext === "xls") {
      if (typeof XLSX === "undefined") {
        showToast("当前浏览器不支持 Excel 处理，请使用 JSON 导入。", "danger");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const wsProducts = workbook.Sheets["Products"];
          const wsShipments = workbook.Sheets["Shipments"];
          if (!wsProducts || !wsShipments) {
            throw new Error("缺少 Products 或 Shipments 工作表");
          }
          const productRows = XLSX.utils.sheet_to_json(wsProducts, { defval: "" });
          const shipmentRows = XLSX.utils.sheet_to_json(wsShipments, { defval: "" });

          const importedProducts = productRows.map((r) => ({
            id: r.id || generateId(),
            model: r.model || "",
            vendor: r.vendor || "",
            stock: Number(r.stock || 0),
            minStock: Number(r.minStock || 0),
          }));

          const importedShipments = shipmentRows.map((r) => {
            const quantity = Number(r.quantity || 0);
            return {
              id: r.id || "s_" + Math.random().toString(36).slice(2, 10),
              productId: r.productId || "",
              quantity: Number.isNaN(quantity) ? 0 : quantity,
              date: r.date || "",
            };
          });

          state.products = importedProducts;
          state.shipments = importedShipments;
          saveState();
          renderProducts();
          renderShipmentProductOptions();
          renderDeliveryNote();
          renderAnalysis();
          showToast("Excel 数据已成功导入。");
        } catch (err) {
          console.error(err);
          showToast("导入 Excel 失败，请检查模板是否正确。", "danger");
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // JSON 导入（兼容原有方式）
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target.result));
        if (!parsed.products || !parsed.shipments) {
          throw new Error("格式错误");
        }
        state.products = parsed.products;
        state.shipments = parsed.shipments;
        saveState();
        renderProducts();
        renderShipmentProductOptions();
        renderDeliveryNote();
        renderAnalysis();
        showToast("JSON 数据已成功导入。");
      } catch (err) {
        console.error(err);
        showToast("导入失败：文件格式不正确。", "danger");
      }
    };
    reader.readAsText(file);
  }

  // 事件绑定
  addProductBtn.addEventListener("click", openNewProductModal);
  productCancelBtn.addEventListener("click", closeProductModal);
  productModalBackdrop.addEventListener("click", (e) => {
    if (e.target === productModalBackdrop) {
      closeProductModal();
    }
  });

  productForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const model = productModelInput.value.trim();
    const vendor = productVendorInput.value.trim();
    const stock = Number(productStockInput.value);
    const minStock = Number(productMinStockInput.value);

    if (!model || !vendor || stock < 0 || minStock < 0) {
      showToast("请正确填写产品信息。", "danger");
      return;
    }

    if (editingProductId) {
      const p = state.products.find((x) => x.id === editingProductId);
      if (!p) return;
      p.model = model;
      p.vendor = vendor;
      p.stock = stock;
      p.minStock = minStock;
      checkLowStock(p);
    } else {
      const newProduct = {
        id: generateId(),
        model,
        vendor,
        stock,
        minStock,
      };
      state.products.push(newProduct);
      checkLowStock(newProduct);
    }

    saveState();
    renderProducts();
    renderShipmentProductOptions();
    renderAnalysis();
    closeProductModal();
  });

  shipmentForm.addEventListener("submit", handleShipmentSubmit);
  printDeliveryBtn.addEventListener("click", handlePrintDelivery);
  exportDeliveryExcelBtn.addEventListener("click", handleExportDeliveryExcel);
  refreshAnalysisBtn.addEventListener("click", renderAnalysis);
  analysisMonthInput.addEventListener("change", renderAnalysis);
  exportDataBtn.addEventListener("click", handleExportData);
  importDataBtn.addEventListener("click", handleImportDataClick);
  importFileInput.addEventListener("change", handleImportFileChange);

  // 初始渲染
  renderProducts();
  renderShipmentProductOptions();
  renderDeliveryNote();
  renderAnalysis();
});


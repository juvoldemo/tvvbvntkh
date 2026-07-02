(function () {
  const DATA_FILES = {
    factor: "ATPN_FACTOR_TABLE.json",
    risk: "ATPN_RISK_TABLE.json"
  };

  window.ATPN_TABLES = {
    factor: null,
    risk: null,
    error: null,
    loaded: false
  };

  window.ATPN_DATA_READY = Promise.all([
    fetch(DATA_FILES.factor, { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`Cannot load ${DATA_FILES.factor}`);
      return response.json();
    }),
    fetch(DATA_FILES.risk, { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`Cannot load ${DATA_FILES.risk}`);
      return response.json();
    })
  ])
    .then(([factor, risk]) => {
      window.ATPN_TABLES.factor = factor;
      window.ATPN_TABLES.risk = risk;
      window.ATPN_TABLES.loaded = true;
      return window.ATPN_TABLES;
    })
    .catch((error) => {
      window.ATPN_TABLES.error = error;
      console.error("ATPN_DATA_LOAD_ERROR", error);
      return window.ATPN_TABLES;
    });
})();

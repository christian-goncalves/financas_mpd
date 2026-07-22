(function initializeAuthSession() {
  "use strict";

  const TOKEN_QUERY_PARAM = "token";
  const SESSION_STORAGE_KEY = "financas_mpd_auth_token";
  const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

  let token = "";
  let status = "absent";
  let urlSanitized = true;

  function readStoredToken() {
    try {
      return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function storeToken(value) {
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, value);
    } catch {
      // O token continua disponível apenas na memória desta página.
    }
  }

  function clearStoredToken() {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Não há armazenamento de sessão disponível para limpar.
    }
  }

  function removeTokenFromVisibleUrl(url) {
    url.searchParams.delete(TOKEN_QUERY_PARAM);
    const sanitizedUrl = `${url.pathname}${url.search}${url.hash}`;

    try {
      window.history.replaceState(window.history.state, document.title, sanitizedUrl);
    } catch {
      urlSanitized = false;
    }
  }

  const currentUrl = new URL(window.location.href);

  if (currentUrl.searchParams.has(TOKEN_QUERY_PARAM)) {
    const receivedToken = currentUrl.searchParams.get(TOKEN_QUERY_PARAM) || "";

    removeTokenFromVisibleUrl(currentUrl);
    clearStoredToken();

    if (urlSanitized && TOKEN_PATTERN.test(receivedToken)) {
      token = receivedToken;
      status = "received";
      storeToken(token);
    } else {
      status = "invalid";
    }
  } else {
    const storedToken = readStoredToken();

    if (TOKEN_PATTERN.test(storedToken)) {
      token = storedToken;
      status = "restored";
    } else if (storedToken) {
      clearStoredToken();
      status = "invalid";
    }
  }

  window.FINANCAS_AUTH_SESSION = Object.freeze({
    getToken() {
      return token;
    },
    status,
    urlSanitized
  });
})();

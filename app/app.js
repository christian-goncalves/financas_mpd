// Configuração
const APP_MODE = "api"; // "demo" ou "api"
const PUBLIC_MVP_MODE = true;

const APP_CONFIG = Object.freeze({
  API_BASE_URL: "https://n8n.autamacao.shop/api",
  get AUTH_TOKEN() {
    return window.FINANCAS_AUTH_SESSION?.getToken() || "";
  }
});

const ERROR_MESSAGES = Object.freeze({
  list: "Não foi possível carregar as contas.",
  pay: "Não foi possível marcar as contas como pagas.",
  postpone: "Não foi possível adiar a conta."
});
const FEEDBACK_DURATION_MS = 3000;

// Elementos e estado da aplicação
const accountsListElement = document.querySelector("#accounts-list");
const markPaidButton = document.querySelector("#mark-paid-button");
const cancelSelectionButton = document.querySelector("#cancel-selection-button");
const feedbackElement = document.querySelector("#feedback");
const statusElement = document.querySelector("#app-status");
const filterControlsElement = document.querySelector(".filter-bar");

const summaryElements = {
  overdue: document.querySelector("#summary-overdue"),
  today: document.querySelector("#summary-today"),
  upcoming: document.querySelector("#summary-upcoming")
};

const groupDefinitions = [
  { id: "overdue", title: "Vencidas" },
  { id: "today", title: "Vencem hoje" },
  { id: "upcoming", title: "Próximas" }
];

const filterDefinitions = [
  { id: "all", groupId: null },
  { id: "overdue", groupId: "overdue" },
  { id: "today", groupId: "today" },
  { id: "upcoming", groupId: "upcoming" }
];

const visualGroupMap = Object.freeze({
  vencida: "overdue",
  hoje: "today",
  proxima: "upcoming"
});

const today = startOfDay(new Date());
const selectedAccountIds = new Set();
let accounts = [];
let activeFilter = "all";
let feedbackTimeoutId = null;
let isPaymentInProgress = false;

// Dados fictícios
const demoAccounts = [
  createDemoAccount("conta-001", "Internet Residencial", "Pessoal", "manual", -4, 42800, 168.2),
  createDemoAccount("conta-002", "Licença de Design", "Profissional", "automatic", -1, 21900, 86.1),
  createDemoAccount("conta-003", "Energia do Apartamento", "Pessoal", "manual", 0, 57350, 225.3),
  createDemoAccount("conta-004", "Armazenamento em Nuvem", "Profissional", "automatic", 0, 12600, 49.5),
  createDemoAccount("conta-005", "Seguro Residencial", "Pessoal", "automatic", 3, 35400, 139.1),
  createDemoAccount("conta-006", "Serviço de Telefonia", "Profissional", "manual", 9, 28750, 113)
];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function formatApiDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseApiDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function createDemoAccount(id, name, category, paymentType, dueOffset, arsValue, brlValue) {
  return {
    id,
    name,
    category,
    paymentType,
    originalDueDate: addDays(today, dueOffset),
    dueDate: addDays(today, dueOffset),
    arsValue,
    brlValue,
    status: "Pendente",
    visualGroup: null
  };
}

function cloneDemoAccounts() {
  return demoAccounts.map((account) => ({
    ...account,
    originalDueDate: new Date(account.originalDueDate),
    dueDate: new Date(account.dueDate)
  }));
}

// Camada de API e acesso aos dados
class AppDataError extends Error {
  constructor(message, code = "APP_DATA_ERROR") {
    super(message);
    this.name = "AppDataError";
    this.code = code;
  }
}

function assertApiConfiguration() {
  if (!APP_CONFIG.API_BASE_URL.trim()) {
    throw new AppDataError(
      "A integração com o n8n ainda não está configurada.",
      "API_NOT_CONFIGURED"
    );
  }

  if (!PUBLIC_MVP_MODE && !APP_CONFIG.AUTH_TOKEN.trim()) {
    throw new AppDataError(
      "Abra o aplicativo pelo link de acesso.",
      "AUTH_REQUIRED"
    );
  }
}

function buildApiUrl(path) {
  return `${APP_CONFIG.API_BASE_URL.replace(/\/$/, "")}${path}`;
}

async function apiRequest(path, { method = "GET", body } = {}) {
  assertApiConfiguration();

  const headers = {
    Accept: "application/json"
  };

  if (!PUBLIC_MVP_MODE) {
    headers.Authorization = `Bearer ${APP_CONFIG.AUTH_TOKEN}`;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer"
    });
  } catch {
    throw new AppDataError("Não foi possível alcançar o serviço de integração.", "NETWORK_ERROR");
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new AppDataError("O serviço retornou uma resposta inválida.", "INVALID_RESPONSE");
  }

  if (!response.ok || payload.ok !== true) {
    throw new AppDataError(
      payload?.error?.message || "A operação não pôde ser concluída.",
      payload?.error?.code || `HTTP_${response.status}`
    );
  }

  return payload.data;
}

function mapApiAccount(account) {
  const effectiveDate = account.adiada_para || account.vencimento;
  const originalDueDate = account.vencimento || effectiveDate;

  return {
    id: account.conta_id,
    name: account.nome,
    category: account.categoria === "profissional" ? "Profissional" : "Pessoal",
    paymentType: account.tipo_pagamento === "debito_automatico" ? "automatic" : "manual",
    originalDueDate: parseApiDate(originalDueDate),
    dueDate: parseApiDate(effectiveDate),
    arsValue: account.valor_original,
    brlValue: account.valor_convertido,
    status: account.status === "adiada" ? "Adiada" : "Pendente",
    visualGroup: visualGroupMap[account.grupo_visual] || null
  };
}

async function fetchAccounts() {
  if (APP_MODE === "demo") {
    return cloneDemoAccounts();
  }

  const data = await apiRequest("/accounts");
  return data.accounts.map(mapApiAccount);
}

async function payAccounts(accountIds) {
  if (APP_MODE === "api") {
    await apiRequest("/accounts/pay", {
      method: "POST",
      body: { conta_ids: accountIds }
    });
  }

  accounts = accounts.filter((account) => !accountIds.includes(account.id));
}

async function postponeAccount(accountId, newDate) {
  if (APP_MODE === "api") {
    await apiRequest("/accounts/postpone", {
      method: "POST",
      body: {
        conta_id: accountId,
        adiada_para: newDate
      }
    });
  }

  const account = accounts.find((item) => item.id === accountId);

  if (!account) {
    throw new AppDataError("Conta não encontrada.", "ACCOUNT_NOT_FOUND");
  }

  account.dueDate = parseApiDate(newDate);
  account.status = "Adiada";
  account.visualGroup = "upcoming";
  return account;
}

// Formatação e renderização da interface
function getAccountGroup(account) {
  if (account.visualGroup) {
    return account.visualGroup;
  }

  const dueDate = startOfDay(account.dueDate);

  if (dueDate < today) {
    return "overdue";
  }

  if (dueDate.getTime() === today.getTime()) {
    return "today";
  }

  return "upcoming";
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  }).format(date).replace(".", "");
}

function formatArs(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    currencyDisplay: "code",
    maximumFractionDigits: 0
  }).format(value);
}

function formatBrl(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function getActiveFilterGroup() {
  return filterDefinitions.find((filter) => filter.id === activeFilter)?.groupId || null;
}

function renderAccountCard(account, group) {
  const isSelected = selectedAccountIds.has(account.id);
  const isAutomatic = account.paymentType === "automatic";
  const paymentLabel = isAutomatic ? "Débito aut." : "Manual";
  const selectedClass = isSelected ? " account-card--selected" : "";
  const safeAccountId = escapeHtml(account.id);
  const safeAccountName = escapeHtml(account.name);
  const safeCategory = escapeHtml(account.category);
  const safePaymentLabel = escapeHtml(paymentLabel);

  return `
    <article class="account-card account-card--${group.id}${selectedClass}" data-account-id="${safeAccountId}">
      <div class="account-card__header">
        <div class="account-card__title-row">
          <h3 class="account-card__name">${safeAccountName}</h3>
          <div class="account-card__controls">
            <label class="account-select-control">
              <input
                class="account-select"
                type="checkbox"
                data-action="select"
                aria-label="Selecionar ${safeAccountName}"
                ${isSelected ? "checked" : ""}
              >
            </label>
            <button
              class="account-icon-action account-icon-action--postpone"
              type="button"
              data-action="postpone"
              aria-label="Adiar ${safeAccountName}"
              title="Adiar"
            >
              <i class="fa-solid fa-clock" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <p class="account-card__meta">
          <span>${safeCategory}</span>
          <span aria-hidden="true">·</span>
          <strong>${safePaymentLabel}</strong>
        </p>
      </div>

      <div class="account-card__details">
        <time class="account-card__due-date" datetime="${formatApiDate(account.dueDate)}">
          ${formatDate(account.dueDate)}
        </time>
        <div class="account-card__values" aria-label="${formatArs(account.arsValue)}; ${formatBrl(account.brlValue)}">
          <span class="account-card__primary-value">${formatArs(account.arsValue)}</span>
          <span class="account-card__value-separator" aria-hidden="true">·</span>
          <span class="account-card__converted">${formatBrl(account.brlValue)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderGroup(group) {
  const filterGroup = getActiveFilterGroup();

  if (filterGroup && filterGroup !== group.id) {
    return "";
  }

  const groupAccounts = accounts.filter((account) => getAccountGroup(account) === group.id);

  if (groupAccounts.length === 0) {
    return "";
  }

  return `
    <section class="account-group" aria-labelledby="group-${group.id}">
      <div class="group-heading">
        <h2 class="group-badge group-badge--${group.id}" id="group-${group.id}">
          <span>${group.title}</span>
          <span>${groupAccounts.length}</span>
        </h2>
      </div>
      <div class="group-cards">
        ${groupAccounts.map((account) => renderAccountCard(account, group)).join("")}
      </div>
    </section>
  `;
}

function renderEmptyState() {
  const hasFilter = activeFilter !== "all";
  const description = hasFilter
    ? "Nenhuma conta neste filtro."
    : (
      APP_MODE === "demo"
        ? "As alterações são apenas locais e serão desfeitas ao recarregar."
        : "Não há contas pendentes para exibir."
    );

  return `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <p class="empty-state__title">Nenhuma conta pendente</p>
      <p class="empty-state__description">${description}</p>
    </div>
  `;
}

function updateSummary() {
  const totals = { overdue: 0, today: 0, upcoming: 0 };

  accounts.forEach((account) => {
    totals[getAccountGroup(account)] += 1;
  });

  summaryElements.overdue.textContent = totals.overdue;
  summaryElements.today.textContent = totals.today;
  summaryElements.upcoming.textContent = totals.upcoming;
}

function updateFilterControls() {
  filterControlsElement?.querySelectorAll("[data-filter]").forEach((control) => {
    const isActive = control.dataset.filter === activeFilter;
    control.classList.toggle("filter-chip--active", isActive);
    control.setAttribute("aria-pressed", String(isActive));
  });
}

function updateSelectionActions() {
  const hasSelection = selectedAccountIds.size > 0;
  markPaidButton.disabled = !hasSelection || isPaymentInProgress;
  markPaidButton.textContent = isPaymentInProgress ? "Marcando..." : "Marcar como pagas";
  markPaidButton.setAttribute("aria-busy", String(isPaymentInProgress));
  cancelSelectionButton.hidden = !hasSelection;
  cancelSelectionButton.disabled = isPaymentInProgress;

  accountsListElement
    .querySelectorAll(".account-select, .account-icon-action")
    .forEach((control) => {
      control.disabled = isPaymentInProgress;
    });
}

function renderAccounts() {
  const groupsMarkup = groupDefinitions.map(renderGroup).join("");
  accountsListElement.innerHTML = groupsMarkup || renderEmptyState();
  accountsListElement.setAttribute("aria-busy", "false");
  updateSummary();
  updateFilterControls();
  updateSelectionActions();
}

function showFeedback(message) {
  if (feedbackTimeoutId) {
    window.clearTimeout(feedbackTimeoutId);
    feedbackTimeoutId = null;
  }

  feedbackElement.textContent = message;

  if (!message) {
    return;
  }

  feedbackTimeoutId = window.setTimeout(() => {
    if (feedbackElement.textContent === message) {
      feedbackElement.textContent = "";
    }

    feedbackTimeoutId = null;
  }, FEEDBACK_DURATION_MS);
}

function showOperationError(operation, error) {
  if (error?.code === "AUTH_REQUIRED") {
    const message = window.FINANCAS_AUTH_SESSION?.status === "invalid"
      ? "O link de acesso é inválido. Solicite um novo link."
      : "Abra o aplicativo pelo link de acesso.";
    showFeedback(message);
    return;
  }

  const configurationHint = error?.code === "API_NOT_CONFIGURED"
    ? " A integração com o n8n ainda não está configurada."
    : " Tente novamente.";

  showFeedback(`${ERROR_MESSAGES[operation]}${configurationHint}`);
}

function showAuthSessionFeedback() {
  if (window.FINANCAS_AUTH_SESSION?.status === "invalid") {
    showFeedback("O link de acesso é inválido. Solicite um novo link.");
  }
}

// Ações do usuário
function toggleAccountSelection(accountId, isSelected) {
  if (isSelected) {
    selectedAccountIds.add(accountId);
  } else {
    selectedAccountIds.delete(accountId);
  }

  renderAccounts();
}

function clearSelection() {
  selectedAccountIds.clear();
  renderAccounts();
}

function updateActiveFilter(filterId) {
  if (!filterDefinitions.some((filter) => filter.id === filterId) || filterId === activeFilter) {
    return;
  }

  activeFilter = filterId;
  selectedAccountIds.clear();
  renderAccounts();
}

function calculatePostponeDate(account) {
  const originalDueDate = startOfDay(account.originalDueDate || account.dueDate);
  const reminderDate = addDays(originalDueDate, -2);

  if (reminderDate > today) {
    return {
      date: reminderDate,
      usesFallback: false
    };
  }

  return {
    date: addDays(today, 7),
    usesFallback: true
  };
}

async function handleMarkSelectedAsPaid() {
  const accountIds = [...selectedAccountIds];

  if (accountIds.length === 0 || isPaymentInProgress) {
    return;
  }

  isPaymentInProgress = true;
  updateSelectionActions();

  try {
    await payAccounts(accountIds);
    selectedAccountIds.clear();
    renderAccounts();
    const localChangeLabel = APP_MODE === "demo" ? " Alteração local." : "";
    showFeedback(
      `${accountIds.length} ${accountIds.length === 1 ? "conta marcada" : "contas marcadas"} como ${accountIds.length === 1 ? "paga" : "pagas"}.${localChangeLabel}`
    );
  } catch (error) {
    showOperationError("pay", error);
  } finally {
    isPaymentInProgress = false;
    updateSelectionActions();
  }
}

async function handlePostponeAccount(accountId) {
  try {
    const currentAccount = accounts.find((account) => account.id === accountId);

    if (!currentAccount) {
      throw new AppDataError("Conta não encontrada.", "ACCOUNT_NOT_FOUND");
    }

    const postpone = calculatePostponeDate(currentAccount);
    const newDate = formatApiDate(postpone.date);
    const account = await postponeAccount(accountId, newDate);
    selectedAccountIds.delete(accountId);
    renderAccounts();
    const localChangeLabel = APP_MODE === "demo" ? " Alteração local." : "";
    const message = postpone.usesFallback
      ? `${account.name} foi adiada por 7 dias.`
      : `${account.name} foi adiada para ${formatDate(postpone.date)}.`;
    showFeedback(`${message}${localChangeLabel}`);
  } catch (error) {
    showOperationError("postpone", error);
  }
}

filterControlsElement?.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-filter]");

  if (!filterButton) {
    return;
  }

  updateActiveFilter(filterButton.dataset.filter);
});

accountsListElement.addEventListener("change", (event) => {
  const selectInput = event.target.closest('[data-action="select"]');

  if (!selectInput) {
    return;
  }

  const accountCard = selectInput.closest("[data-account-id]");
  toggleAccountSelection(accountCard.dataset.accountId, selectInput.checked);
});

accountsListElement.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button[data-action]");

  if (!actionButton) {
    return;
  }

  const accountCard = actionButton.closest("[data-account-id]");
  const accountId = accountCard.dataset.accountId;

  if (actionButton.dataset.action === "postpone") {
    void handlePostponeAccount(accountId);
  }

});

markPaidButton.addEventListener("click", () => {
  void handleMarkSelectedAsPaid();
});

cancelSelectionButton.addEventListener("click", () => {
  clearSelection();
  showFeedback("Seleção cancelada.");
});

function updateStatus(message) {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

async function registerServiceWorker() {
  const localChangeLabel = APP_MODE === "demo" ? " · alterações locais" : "";

  if (!("serviceWorker" in navigator)) {
    updateStatus(`Aplicação pronta${localChangeLabel}`);
    return;
  }

  try {
    await navigator.serviceWorker.register("./service-worker.js");
    updateStatus(`Pronta para uso offline${localChangeLabel}`);
  } catch {
    updateStatus(`Aplicação pronta${localChangeLabel}`);
  }
}

async function initializeApp() {
  accountsListElement.setAttribute("aria-busy", "true");

  try {
    accounts = await fetchAccounts();
    renderAccounts();
    showAuthSessionFeedback();
  } catch (error) {
    accounts = [];
    renderAccounts();
    showOperationError("list", error);
  }

  await registerServiceWorker();
}

void initializeApp();

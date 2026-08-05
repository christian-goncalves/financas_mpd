// Configuração
const PUBLIC_MVP_MODE = true;

const APP_CONFIG = Object.freeze({
  API_BASE_URL: "https://n8n.autamacao.shop/api",
  API_WEBHOOK_BASE_URL: "https://n8n.autamacao.shop/webhook/api",
  get AUTH_TOKEN() {
    return window.FINANCAS_AUTH_SESSION?.getToken() || "";
  }
});

const ERROR_MESSAGES = Object.freeze({
  list: "Não foi possível carregar as contas.",
  pay: "Não foi possível marcar as contas como pagas.",
  updatePattern: "Não foi possível salvar a conta."
});
const FEEDBACK_DURATION_MS = 3000;

// Elementos e estado da aplicação
const accountsListElement = document.querySelector("#accounts-list");
const selectionBarElement = document.querySelector(".selection-bar");
const markPaidButton = document.querySelector("#mark-paid-button");
const feedbackElement = document.querySelector("#feedback");
const statusElement = document.querySelector("#app-status");
const filterControlsElement = document.querySelector(".filter-bar");
const editModalElement = document.querySelector("#edit-account-modal");
const editFormElement = document.querySelector("#edit-account-form");
const editNameInput = document.querySelector("#edit-account-name");
const editDueDateInput = document.querySelector("#edit-account-due-date");
const editValueInput = document.querySelector("#edit-account-value");
const editSubmitButton = document.querySelector("#edit-account-submit");

const summaryElements = {
  overdue: document.querySelector("#summary-overdue"),
  today: document.querySelector("#summary-today"),
  upcoming: document.querySelector("#summary-upcoming")
};

const groupDefinitions = [
  { id: "overdue", title: "Não Pagas", presentation: "nao_pagas" },
  { id: "today", title: "Hoje", presentation: "hoje" },
  { id: "upcoming", title: "A Pagar", presentation: "a_pagar" }
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

const presentationGroupMap = Object.freeze({
  nao_pagas: "overdue",
  hoje: "today",
  a_pagar: "upcoming"
});

const presentationLabelMap = Object.freeze({
  overdue: "Não Pagas",
  today: "Hoje",
  upcoming: "A Pagar"
});

const today = startOfDay(new Date());
const selectedAccountIds = new Set();
let accounts = [];
let activeFilter = "all";
let feedbackTimeoutId = null;
let isPaymentInProgress = false;
let isEditInProgress = false;
let editingAccountId = null;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

function buildApiUrl(path, baseUrl = APP_CONFIG.API_BASE_URL) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function apiRequest(
  path,
  {
    method = "GET",
    body,
    contentType = "application/json",
    baseUrl = APP_CONFIG.API_BASE_URL
  } = {}
) {
  assertApiConfiguration();

  const headers = {
    Accept: "application/json"
  };

  if (!PUBLIC_MVP_MODE) {
    headers.Authorization = `Bearer ${APP_CONFIG.AUTH_TOKEN}`;
  }

  if (body) {
    headers["Content-Type"] = contentType;
  }

  let response;

  try {
    response = await fetch(buildApiUrl(path, baseUrl), {
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
    visualGroup: presentationGroupMap[account.grupo_apresentacao]
      || visualGroupMap[account.grupo_visual]
      || null,
    presentationGroup: account.grupo_apresentacao
      || groupDefinitions.find((group) => group.id === visualGroupMap[account.grupo_visual])?.presentation
      || null,
    presentationLabel: account.grupo_apresentacao_label
      || presentationLabelMap[visualGroupMap[account.grupo_visual]]
      || null
  };
}

async function fetchAccounts() {
  const data = await apiRequest("/accounts");
  return data.accounts.map(mapApiAccount);
}

async function payAccounts(accountIds) {
  await apiRequest("/accounts/pay", {
    method: "POST",
    body: { conta_ids: accountIds },
    contentType: "text/plain"
  });

  accounts = accounts.filter((account) => !accountIds.includes(account.id));
}

async function updateAccountPattern(accountId, updates) {
  return apiRequest("/accounts/update-pattern", {
    method: "POST",
    body: {
      conta_id: accountId,
      nome: updates.name,
      vencimento: updates.dueDate,
      valor_original: updates.arsValue
    },
    baseUrl: APP_CONFIG.API_WEBHOOK_BASE_URL
  });
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
              class="account-icon-action account-icon-action--edit"
              type="button"
              data-action="edit"
              aria-label="Editar ${safeAccountName}"
              title="Editar"
            >
              <span class="account-action-dots" aria-hidden="true"></span>
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
    : "Não há contas pendentes para exibir.";

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
  selectionBarElement.hidden = !hasSelection;
  markPaidButton.disabled = isPaymentInProgress;
  markPaidButton.textContent = isPaymentInProgress ? "Pagando..." : "Pagar";
  markPaidButton.setAttribute("aria-busy", String(isPaymentInProgress));

  accountsListElement
    .querySelectorAll(".account-select, .account-icon-action")
    .forEach((control) => {
      control.disabled = isPaymentInProgress || isEditInProgress;
    });
}

function setEditFormDisabled(disabled) {
  editFormElement
    ?.querySelectorAll("input, button")
    .forEach((control) => {
      control.disabled = disabled;
    });

  if (editSubmitButton) {
    editSubmitButton.textContent = disabled ? "Salvando..." : "Salvar";
    editSubmitButton.setAttribute("aria-busy", String(disabled));
  }
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
    showFeedback(
      `${accountIds.length} ${accountIds.length === 1 ? "conta marcada" : "contas marcadas"} como ${accountIds.length === 1 ? "paga" : "pagas"}.`
    );
  } catch (error) {
    showOperationError("pay", error);
  } finally {
    isPaymentInProgress = false;
    updateSelectionActions();
  }
}

function openEditModal(accountId) {
  const account = accounts.find((item) => item.id === accountId);

  if (!account || !editModalElement || !editNameInput || !editDueDateInput || !editValueInput) {
    return;
  }

  editingAccountId = accountId;
  editNameInput.value = account.name;
  editDueDateInput.value = formatApiDate(account.dueDate);
  editValueInput.value = String(Math.round(account.arsValue));
  editModalElement.hidden = false;
  editNameInput.focus();
}

function closeEditModal({ force = false } = {}) {
  if (isEditInProgress && !force) {
    return;
  }

  editingAccountId = null;

  if (editModalElement) {
    editModalElement.hidden = true;
  }

  editFormElement?.reset();
}

async function handleEditSubmit(event) {
  event.preventDefault();

  if (!editingAccountId || isEditInProgress || !editNameInput || !editDueDateInput || !editValueInput) {
    return;
  }

  const name = editNameInput.value.trim();
  const dueDate = editDueDateInput.value;
  const arsValue = Number(editValueInput.value);

  if (!name || !dueDate || !Number.isFinite(arsValue) || arsValue < 0) {
    showFeedback("Preencha nome, vencimento e valor para salvar.");
    return;
  }

  isEditInProgress = true;
  setEditFormDisabled(true);
  updateSelectionActions();

  try {
    const accountId = editingAccountId;
    await updateAccountPattern(accountId, { name, dueDate, arsValue });

    accounts = await fetchAccounts();

    selectedAccountIds.delete(accountId);
    closeEditModal({ force: true });
    renderAccounts();
    showFeedback("Conta salva como novo padrão.");
  } catch (error) {
    showOperationError("updatePattern", error);
  } finally {
    isEditInProgress = false;
    setEditFormDisabled(false);
    updateSelectionActions();
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

  if (actionButton.dataset.action === "edit") {
    openEditModal(accountId);
  }

});

markPaidButton.addEventListener("click", () => {
  void handleMarkSelectedAsPaid();
});

editFormElement?.addEventListener("submit", (event) => {
  void handleEditSubmit(event);
});

editModalElement?.addEventListener("click", (event) => {
  if (event.target === editModalElement || event.target.closest('[data-action="close-edit"]')) {
    closeEditModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && editModalElement && !editModalElement.hidden) {
    closeEditModal();
  }
});

function updateStatus(message) {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    updateStatus("Aplicação pronta");
    return;
  }

  try {
    await navigator.serviceWorker.register("./service-worker.js");
    updateStatus("Pronta para uso offline");
  } catch {
    updateStatus("Aplicação pronta");
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

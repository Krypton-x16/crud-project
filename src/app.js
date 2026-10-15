import { createTodo, deleteTodo, getTodos, updateTodo } from "./todosApi.js";
import { getUsers } from "./usersApi.js";

const elements = {
  todoCompleted: document.querySelector("#todo-completed"),
  sort: document.querySelector("#sort-select"),
  sortStatus: document.querySelector("#sort-status"),
  profile: document.querySelector("#profile-dialog"),
  profileInfo: document.querySelector("#profile-info"),
  profileList: document.querySelector("#profile-todo-list"),
  profileEmpty: document.querySelector("#profile-empty"),
  userSort: document.querySelector("#user-sort"),
  userSortStatus: document.querySelector("#user-sort-status"),
  profileSort: document.querySelector("#profile-sort"),
  profileSortStatus: document.querySelector("#profile-sort-status"),
  list: document.querySelector("#todo-list"),
  loading: document.querySelector("#loading-state"),
  loadError: document.querySelector("#load-error"),
  errorMessage: document.querySelector("#error-message"),
  retry: document.querySelector("#retry-button"),
  empty: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyDescription: document.querySelector("#empty-description"),
  emptyAdd: document.querySelector("#empty-add-button"),
  footer: document.querySelector("#list-footer"),
  dialog: document.querySelector("#todo-dialog"),
  form: document.querySelector("#todo-form"),
  dialogTitle: document.querySelector("#dialog-title"),
  todoText: document.querySelector("#todo-text"),
  todoUser: document.querySelector("#todo-user"),
  formError: document.querySelector("#form-error"),
  saveButton: document.querySelector("#save-button"),
  saveButtonLabel: document.querySelector("#save-button-label"),
  saveSpinner: document.querySelector(".button-spinner"),
  toastRegion: document.querySelector("#toast-region"),
  search: document.querySelector("#search-input"),
  totalCount: document.querySelector("#total-count"),
  pendingCount: document.querySelector("#pending-count"),
  completedCount: document.querySelector("#completed-count"),
  allFilterCount: document.querySelector("#all-filter-count"),
  visibleCount: document.querySelector("#visible-count"),
  clearList: document.querySelector("#clear-list-button"),
};

let todos = [];
let activeFilter = "all";
let searchTerm = "";
let editingId = null;
let users = new Map();
let profileUserId = null;
let profileSortOrder = "";
let profileSortRequestId = 0;
let userSortOrder = "";
let userSortRequestId = 0;
let sortOrder = "";
let sortRequestId = 0;
let nextLocalId = 1;
const busyTodos = new Set();

function setLoading(loading) {
  elements.loading.hidden = !loading;
  if (loading) {
    elements.list.hidden = true;
    elements.empty.hidden = true;
    elements.footer.hidden = true;
    elements.loadError.hidden = true;
  }
}

async function loadTodos() {
  setLoading(true);
  try {
    const [result, accounts] = await Promise.all([getTodos(sortOrder), getUsers(userSortOrder)]);
    users = new Map(accounts.map((user) => [user.id, user]));
    renderUserOptions(accounts);
    if (!Array.isArray(result.todos)) {
      throw new Error("Сервер вернул данные в неожиданном формате.");
    }
    todos = result.todos.map((todo) => ({
      id: todo.id,
      todo: todo.todo,
      completed: Boolean(todo.completed),
      userId: todo.userId,
      localOnly: false,
    }));
    nextLocalId = Math.max(0, ...todos.map((todo) => todo.id)) + 1;
    elements.loadError.hidden = true;
    render();
  } catch (error) {
    elements.errorMessage.textContent = error.message;
    elements.loadError.hidden = false;
    elements.list.hidden = true;
    elements.empty.hidden = true;
    elements.footer.hidden = true;
  } finally {
    setLoading(false);
  }
}

function getVisibleTodos() {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("ru");
  return todos.filter((todo) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "completed" ? todo.completed : !todo.completed);
    return matchesFilter && todo.todo.toLocaleLowerCase("ru").includes(normalizedSearch);
  });
}

function render() {
  // Merge local mutations into the selected API order as tasks change.
  if (sortOrder) {
    const direction = sortOrder === "asc" ? 1 : -1;
    todos.sort((a, b) => direction * a.todo.localeCompare(b.todo, "ru", { sensitivity: "base" }));
  }
  const pending = todos.filter((todo) => !todo.completed).length;
  const completed = todos.length - pending;
  const visibleTodos = getVisibleTodos();
  renderProfile();

  elements.totalCount.textContent = String(todos.length);
  elements.pendingCount.textContent = String(pending);
  elements.completedCount.textContent = String(completed);
  elements.allFilterCount.textContent = String(todos.length);
  elements.visibleCount.textContent = `${visibleTodos.length} ${pluralizeTasks(visibleTodos.length)}`;
  elements.clearList.hidden = todos.length === 0;
  elements.list.replaceChildren(...visibleTodos.map(createTodoElement));
  elements.list.hidden = visibleTodos.length === 0;
  elements.empty.hidden = visibleTodos.length !== 0;
  elements.footer.hidden = visibleTodos.length === 0;

  if (visibleTodos.length === 0) {
    const hasNoTodos = todos.length === 0;
    elements.emptyTitle.textContent = hasNoTodos ? "Пока нет задач" : "Ничего не найдено";
    elements.emptyDescription.textContent = hasNoTodos
      ? "Добавьте первую задачу, чтобы начать."
      : searchTerm.trim()
        ? "Попробуйте изменить поисковый запрос или фильтр."
        : "В этом фильтре пока нет задач.";
    elements.emptyAdd.hidden = !hasNoTodos;
  }
}

function pluralizeTasks(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "задача";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "задачи";
  return "задач";
}

function createTodoElement(todo) {
  const item = document.createElement("li");
  item.className = `todo-item${todo.completed ? " is-completed" : ""}`;
  item.dataset.id = String(todo.id);

  const checkbox = document.createElement("input");
  checkbox.className = "todo-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.setAttribute(
    "aria-label",
    `${todo.completed ? "Снять отметку выполнения" : "Отметить выполненной"}: ${todo.todo}`,
  );
  checkbox.addEventListener("change", () => toggleTodo(todo));

  const content = document.createElement("div");
  content.className = "todo-content";
  const title = document.createElement("p");
  title.className = "todo-title";
  title.textContent = todo.todo;
  title.title = todo.todo;

  const meta = document.createElement("button");
  meta.type = "button";
  meta.className = "todo-meta user-link";
  const account = users.get(todo.userId);
  const avatar = createAvatar(account, "user-avatar");
  const user = document.createElement("span");
  user.textContent = account ? `@${account.username}` : `Пользователь #${todo.userId}`;
  meta.disabled = !account;
  meta.title = account ? `Открыть профиль ${account.firstName} ${account.lastName}` : "Пользователь не найден";
  meta.setAttribute("aria-haspopup", "dialog");
  meta.addEventListener("click", () => openProfile(todo.userId));
  meta.append(avatar, user);
  content.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "todo-actions";
  actions.append(
    createActionButton("Редактировать задачу", "edit", () => openEditDialog(todo)),
    createActionButton("Удалить задачу", "delete", () => removeTodo(todo)),
  );

  const status = document.createElement("span");
  status.className = `todo-status${todo.completed ? " completed" : ""}`;
  status.textContent = todo.completed ? "Выполнено" : "В процессе";
  checkbox.disabled = busyTodos.has(todo.id);
  for (const button of actions.children) button.disabled = busyTodos.has(todo.id);
  item.append(checkbox, content, status, actions);
  return item;
}

function createAvatar(user, className) {
  const avatar = document.createElement("span");
  avatar.className = className;
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = user ? user.firstName.slice(0, 1) + user.lastName.slice(0, 1) : "?";
  if (user?.image) {
    const image = document.createElement("img");
    image.src = user.image;
    image.alt = "";
    image.loading = "lazy";
    image.addEventListener("error", () => image.remove(), { once: true });
    avatar.append(image);
  }
  return avatar;
}

function openProfile(userId) {
  profileUserId = userId;
  renderProfile();
  if (!elements.profile.open) elements.profile.showModal();
}

function renderProfile() {
  const user = users.get(profileUserId);
  if (!user) return;
  const heading = document.createElement("div");
  heading.className = "profile-identity";
  const identity = document.createElement("div");
  const name = document.createElement("h3");
  name.textContent = `${user.firstName} ${user.lastName}`;
  const username = document.createElement("p");
  username.textContent = `@${user.username} · ID ${user.id}`;
  identity.append(name, username);
  heading.append(createAvatar(user, "profile-avatar"), identity);
  const details = document.createElement("dl");
  details.className = "profile-details";
  const fields = [
    ["Email", user.email], ["Телефон", user.phone], ["Возраст", user.age],
    ["Пол", ({ male: "Мужской", female: "Женский" })[user.gender] || user.gender],
    ["Дата рождения", user.birthDate],
    ["Адрес", [user.address?.address, user.address?.city, user.address?.state, user.address?.country].filter(Boolean).join(", ")],
    ["Индекс", user.address?.postalCode], ["Компания", user.company?.name],
    ["Отдел", user.company?.department], ["Должность", user.company?.title],
    ["Университет", user.university], ["Роль", user.role],
    ["Рост / вес", `${user.height ?? "—"} см / ${user.weight ?? "—"} кг`],
    ["Группа крови", user.bloodGroup],
  ];
  for (const [label, value] of fields) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value ?? "—";
    row.append(term, description);
    details.append(row);
  }
  elements.profileInfo.replaceChildren(heading, details);
  const assigned = todos.filter((todo) => todo.userId === user.id);
  if (profileSortOrder) {
    const direction = profileSortOrder === "asc" ? 1 : -1;
    assigned.sort((a, b) => direction * a.todo.localeCompare(b.todo, "ru", { sensitivity: "base" }));
  }
  const done = assigned.filter((todo) => todo.completed).length;
  document.querySelector("#profile-tasks-title").textContent = `Задачи: ${assigned.length} · Выполнено: ${done} · В процессе: ${assigned.length - done}`;
  elements.profileList.replaceChildren(...assigned.map(createTodoElement));
  elements.profileEmpty.hidden = assigned.length > 0;
}

async function applyApiSort() {
  const requestId = ++sortRequestId;
  const requestedOrder = elements.sort.value;
  elements.sortStatus.textContent = "Сортируем…";
  try {
    const result = await getTodos(requestedOrder);
    if (requestId !== sortRequestId) return;
    if (!Array.isArray(result.todos)) throw new Error("Некорректный ответ сортировки.");
    const existing = new Map(todos.map((todo) => [todo.id, todo]));
    const ordered = result.todos.flatMap((todo) => existing.has(todo.id) ? [existing.get(todo.id)] : []);
    const local = todos.filter((todo) => todo.localOnly);
    // Keep session additions, updates and deletions: DummyJSON mutations are simulated.
    todos = [...local, ...ordered];
    sortOrder = requestedOrder;
    render();
    elements.sortStatus.textContent = "";
  } catch (error) {
    if (requestId !== sortRequestId) return;
    elements.sort.value = sortOrder;
    elements.sortStatus.textContent = "Не удалось отсортировать";
    showToast(error.message, "error");
  }
}

async function applyProfileSort() {
  const requestId = ++profileSortRequestId;
  const requestedOrder = elements.profileSort.value;
  elements.profileSortStatus.textContent = "Сортируем…";
  try {
    const result = await getTodos(requestedOrder);
    if (requestId !== profileSortRequestId) return;
    if (!Array.isArray(result.todos)) throw new Error("Некорректный ответ сортировки.");
    profileSortOrder = requestedOrder;
    renderProfile();
    elements.profileSortStatus.textContent = "";
  } catch (error) {
    if (requestId !== profileSortRequestId) return;
    elements.profileSort.value = profileSortOrder;
    elements.profileSortStatus.textContent = "Не удалось отсортировать";
    showToast(error.message, "error");
  }
}

function renderUserOptions(accounts) {
  const selectedUser = elements.todoUser.value;
  elements.todoUser.replaceChildren(...accounts.map((user) => {
    const option = document.createElement("option");
    option.value = String(user.id);
    option.textContent = `${user.firstName} ${user.lastName} (@${user.username}) · ID ${user.id}`;
    return option;
  }));
  if (accounts.some((user) => String(user.id) === selectedUser)) {
    elements.todoUser.value = selectedUser;
  }
}

async function applyUserSort() {
  const requestId = ++userSortRequestId;
  const requestedOrder = elements.userSort.value;
  elements.userSortStatus.textContent = "Сортируем…";
  try {
    const accounts = await getUsers(requestedOrder);
    if (requestId !== userSortRequestId) return;
    users = new Map(accounts.map((user) => [user.id, user]));
    renderUserOptions(accounts);
    userSortOrder = requestedOrder;
    elements.userSortStatus.textContent = "";
  } catch (error) {
    if (requestId !== userSortRequestId) return;
    elements.userSort.value = userSortOrder;
    elements.userSortStatus.textContent = "Не удалось отсортировать пользователей";
    showToast(error.message, "error");
  }
}

function createActionButton(label, action, onClick) {
  const button = document.createElement("button");
  button.className = `icon-button${action === "delete" ? " danger" : ""}`;
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML =
    action === "edit"
      ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m13.7 4.3 2 2M4 16l3.7-.8 8.6-8.6a1.4 1.4 0 0 0-2-2l-8.6 8.6L4 16Z" /></svg>'
      : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11M8 6V4h4v2m2.5 0-.6 10H6.1L5.5 6m3 3v4m3-4v4" /></svg>';
  button.addEventListener("click", onClick);
  return button;
}

function openCreateDialog() {
  editingId = null;
  elements.form.reset();
  elements.userSort.value = userSortOrder;
  elements.todoUser.selectedIndex = 0;
  if (elements.profile.open && users.has(profileUserId)) {
    elements.todoUser.value = String(profileUserId);
  }
  elements.dialogTitle.textContent = "Новая задача";
  elements.saveButtonLabel.textContent = "Создать задачу";
  elements.formError.hidden = true;
  elements.dialog.showModal();
  elements.todoText.focus();
}

function openEditDialog(todo) {
  editingId = todo.id;
  elements.form.reset();
  elements.userSort.value = userSortOrder;
  elements.todoText.value = todo.todo;
  elements.todoCompleted.checked = todo.completed;
  elements.todoUser.value = String(todo.userId);
  elements.dialogTitle.textContent = "Редактировать задачу";
  elements.saveButtonLabel.textContent = "Сохранить изменения";
  elements.formError.hidden = true;
  elements.dialog.showModal();
  elements.todoText.focus();
}

async function handleFormSubmit(event) {
  event.preventDefault();
  if (!elements.form.reportValidity()) return;

  const todoText = elements.todoText.value.trim();
  const userId = Number(elements.todoUser.value);
  const completed = elements.todoCompleted.checked;
  if (!todoText) {
    elements.formError.textContent = "Введите текст задачи.";
    elements.formError.hidden = false;
    return;
  }
  if (!users.has(userId)) {
    elements.formError.textContent = "Выберите исполнителя из списка.";
    elements.formError.hidden = false;
    return;
  }

  setFormBusy(true);
  elements.formError.hidden = true;
  try {
    if (editingId !== null) {
      const current = todos.find((todo) => todo.id === editingId);
      if (!current.localOnly) {
        await updateTodo(editingId, { todo: todoText, userId, completed });
      }
      todos = todos.map((todo) =>
        todo.id === editingId ? { ...todo, todo: todoText, userId, completed } : todo,
      );
      elements.dialog.close();
      render();
      showToast(
        current.localOnly
          ? "Задача обновлена локально — API не сохраняет демо-данные"
          : `Задача «${current.todo}» обновлена`,
        "success",
      );
    } else {
      const result = await createTodo(todoText, userId, completed);
      if (!Number.isSafeInteger(result.id)) {
        throw new Error("Сервер вернул неожиданный ответ при создании задачи.");
      }
      todos = [{ id: nextLocalId++, todo: todoText, completed, userId, localOnly: true }, ...todos];
      activeFilter = "all";
      updateFilterButtons();
      elements.search.value = "";
      searchTerm = "";
      elements.dialog.close();
      render();
      showToast("Задача создана", "success");
    }
  } catch (error) {
    elements.formError.textContent = error.message;
    elements.formError.hidden = false;
    showToast(error.message, "error");
  } finally {
    setFormBusy(false);
  }
}

function setFormBusy(busy) {
  for (const control of elements.form.elements) control.disabled = busy;
  elements.saveButton.disabled = busy;
  elements.saveSpinner.hidden = !busy;
  elements.saveButtonLabel.textContent = busy
    ? "Сохраняем..."
    : editingId === null
      ? "Создать задачу"
      : "Сохранить изменения";
}

async function toggleTodo(todo) {
  if (busyTodos.has(todo.id)) return;
  busyTodos.add(todo.id);
  const completed = !todo.completed;
  const previous = todo.completed;
  todos = todos.map((item) =>
    item.id === todo.id ? { ...item, completed } : item,
  );
  render();

  try {
    if (!todo.localOnly) {
      await updateTodo(todo.id, { completed });
    }
    showToast(
      todo.localOnly
        ? "Статус изменён локально — API не сохраняет демо-данные"
        : completed
          ? "Задача отмечена выполненной"
          : "Задача возвращена в работу",
      "success",
    );
  } catch (error) {
    todos = todos.map((item) =>
      item.id === todo.id ? { ...item, completed: previous } : item,
    );
    render();
    showToast(error.message, "error");
  } finally {
    busyTodos.delete(todo.id);
    render();
  }
}

async function removeTodo(todo) {
  if (busyTodos.has(todo.id)) return;
  if (!window.confirm(`Удалить задачу «${todo.todo}»? Это действие нельзя отменить.`)) {
    return;
  }
  busyTodos.add(todo.id);
  render();
  try {
    if (!todo.localOnly) {
      await deleteTodo(todo.id);
    }
    todos = todos.filter((item) => item.id !== todo.id);
    render();
    showToast(
      todo.localOnly ? "Задача удалена из локального списка" : "Задача удалена",
      "success",
    );
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    busyTodos.delete(todo.id);
    render();
  }
}

function clearTodoList() {
  if (todos.length === 0) return;
  const confirmed = window.confirm(
    `Убрать все ${todos.length} ${pluralizeTasks(todos.length)} из списка? DummyJSON не сохраняет удаления, поэтому после обновления страницы задачи загрузятся снова.`,
  );
  if (!confirmed) return;

  todos = [];
  activeFilter = "all";
  searchTerm = "";
  elements.search.value = "";
  updateFilterButtons();
  render();
  showToast("Список очищен. Изменение действует до обновления страницы.", "success");
}

function updateFilterButtons() {
  for (const button of document.querySelectorAll(".filter-tab")) {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}

function showToast(message, type) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = type === "success" ? "✓" : "!";
  const text = document.createElement("span");
  text.textContent = message;
  toast.append(icon, text);
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

document.querySelector("#add-todo-button").addEventListener("click", openCreateDialog);
elements.emptyAdd.addEventListener("click", openCreateDialog);
elements.retry.addEventListener("click", loadTodos);
elements.clearList.addEventListener("click", clearTodoList);
elements.form.addEventListener("submit", handleFormSubmit);
document.querySelector("#dialog-close").addEventListener("click", () => elements.dialog.close());
document.querySelector("#cancel-button").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog && !elements.saveButton.disabled) elements.dialog.close();
});
elements.search.addEventListener("input", () => {
  searchTerm = elements.search.value;
  render();
});
for (const button of document.querySelectorAll(".filter-tab")) {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    updateFilterButtons();
    render();
  });
}
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !elements.profile.open && !elements.dialog.open && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }

});

elements.dialog.addEventListener("cancel", (event) => {
  if (elements.saveButton.disabled) event.preventDefault();
});
elements.sort.addEventListener("change", applyApiSort);
elements.userSort.addEventListener("change", applyUserSort);
elements.profileSort.addEventListener("change", applyProfileSort);
document.querySelector("#profile-add-todo").addEventListener("click", openCreateDialog);
document.querySelector("#profile-close").addEventListener("click", () => elements.profile.close());
elements.profile.addEventListener("click", (event) => {
  if (event.target === elements.profile) elements.profile.close();
});

loadTodos();

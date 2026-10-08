import { createTodo, deleteTodo, getTodos, updateTodo } from "./todosApi.js";

const elements = {
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
    const result = await getTodos();
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
  const pending = todos.filter((todo) => !todo.completed).length;
  const completed = todos.length - pending;
  const visibleTodos = getVisibleTodos();

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

  const meta = document.createElement("div");
  meta.className = "todo-meta";
  const avatar = document.createElement("span");
  avatar.className = "user-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = String(todo.userId).slice(0, 2);
  const user = document.createElement("span");
  user.textContent = `Пользователь #${todo.userId}`;
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
  item.append(checkbox, content, status, actions);
  return item;
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
  elements.todoUser.value = "1";
  elements.dialogTitle.textContent = "Новая задача";
  elements.saveButtonLabel.textContent = "Создать задачу";
  elements.formError.hidden = true;
  elements.dialog.showModal();
  elements.todoText.focus();
}

function openEditDialog(todo) {
  editingId = todo.id;
  elements.form.reset();
  elements.todoText.value = todo.todo;
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
  if (!todoText) {
    elements.formError.textContent = "Введите текст задачи.";
    elements.formError.hidden = false;
    return;
  }
  if (!Number.isSafeInteger(userId) || userId < 1) {
    elements.formError.textContent = "ID пользователя должен быть целым числом больше нуля.";
    elements.formError.hidden = false;
    return;
  }

  setFormBusy(true);
  elements.formError.hidden = true;
  try {
    if (editingId !== null) {
      const current = todos.find((todo) => todo.id === editingId);
      if (!current.localOnly) {
        await updateTodo(editingId, { todo: todoText, userId });
      }
      todos = todos.map((todo) =>
        todo.id === editingId ? { ...todo, todo: todoText, userId } : todo,
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
      const result = await createTodo(todoText, userId);
      if (!Number.isSafeInteger(result.id)) {
        throw new Error("Сервер вернул неожиданный ответ при создании задачи.");
      }
      todos = [{ id: result.id, todo: todoText, completed: false, userId, localOnly: true }, ...todos];
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
  elements.saveButton.disabled = busy;
  elements.saveSpinner.hidden = !busy;
  elements.saveButtonLabel.textContent = busy
    ? "Сохраняем..."
    : editingId === null
      ? "Создать задачу"
      : "Сохранить изменения";
}

async function toggleTodo(todo) {
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
  }
}

async function removeTodo(todo) {
  if (!window.confirm(`Удалить задачу «${todo.todo}»? Это действие нельзя отменить.`)) {
    return;
  }
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
  if (event.target === elements.dialog) elements.dialog.close();
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
  if (event.key === "/" && !elements.dialog.open && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }
  if (event.key === "Escape" && elements.dialog.open) elements.dialog.close();
});

loadTodos();

const API_BASE_URL = "https://dummyjson.com/todos";

async function request(path = "", options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error("Нет подключения к серверу. Проверьте интернет и попробуйте снова.", {
      cause: error,
    });
  }

  if (!response.ok) {
    let message = `Ошибка сервера (${response.status}).`;
    try {
      const body = await response.json();
      if (body.message) message = body.message;
    } catch {
      // The response may not contain JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

export function getTodos() {
  return request("?limit=0");
}

export function createTodo(todo, userId) {
  return request("/add", {
    method: "POST",
    body: JSON.stringify({ todo, completed: false, userId }),
  });
}

export function updateTodo(id, changes) {
  return request(`/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteTodo(id) {
  return request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}

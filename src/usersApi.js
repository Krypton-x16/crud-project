export async function getUsers(order = "") {
  let response;
  try {
    const params = new URLSearchParams({ limit: "0" });
    if (order) {
      params.set("sortBy", "firstName");
      params.set("order", order);
    }
    response = await fetch(`https://dummyjson.com/users?${params}`);
  } catch {
    throw new Error("Не удалось загрузить пользователей. Проверьте подключение к интернету.");
  }
  if (!response.ok) throw new Error(`Не удалось загрузить пользователей (${response.status}).`);
  const result = await response.json();
  if (!Array.isArray(result.users)) throw new Error("Сервер вернул некорректный список пользователей.");
  return result.users;
}
